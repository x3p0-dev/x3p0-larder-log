import { useState } from 'preact/hooks';
import { Check, Clock } from 'lucide-preact';

import type { InvitePreview } from '../../shared/types';
import type { Role } from '../../shared/roles';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { HouseholdTile } from './HouseholdTile';
import { Eyebrow, GravatarButton, IconDisc, OutsideCard, Spinner } from './OutsideShell';
import { SignedInRow } from './FirstRun';
import { PAGE_BUTTON_DIALOG, PAGE_BUTTON_GHOST } from '../lib/controlStyles';

/**
 * The `?join=` landing. Four cases, one card.
 *
 * A live invite leads with the household — tile, then *Join X*, then who asked
 * and what they are offering. A dead one leads with the **status disc** and
 * drops the household header entirely: at that point the screen is a message
 * about a link, not an introduction to a pantry.
 *
 * **Signing in is the accept.** A signed-out visitor on a valid invite presses
 * one button; the code is already stashed in `sessionStorage`, and the join
 * applies on return rather than showing this card a second time.
 */

type Props = {
	preview: InvitePreview | null;
	/** True once Zero has named the visitor and they are not a guest. */
	signedIn: boolean;
	displayName: string;
	email: string;
	picture?: string;
	/** Signed out: press to sign in, which accepts. Signed in: unused. */
	onSignIn: () => void;
	/** Signed in and holding a live code. Resolves when the membership exists. */
	onJoin: () => Promise<void>;
	/**
	 * *Not now*, *Open Larder Log*, *Open X* — drops the code and continues.
	 *
	 * The id arrives only from the already-a-member case, which is the one
	 * screen with a household to land in rather than merely to leave.
	 */
	onDismiss: (householdId?: string) => void;
	onSignOut: () => void;
	pending: boolean;
	theme: Theme;
};

/**
 * Who invited you, as what, and what that lets you do.
 *
 * The role is a **bold word in the sentence, not a pill**. A role is not a
 * term, and the tag component means "term" everywhere else in the app —
 * borrowing it here would make *Editor* look like something you could filter
 * by.
 */
function RoleSentence({ inviter, role, theme }: { inviter: string; role: Role; theme: Theme }) {
	const what = role === 'owner'
		? 'add items, edit them, manage locations, stores and types, and invite other people'
		: role === 'editor'
			? 'add items, edit them, and manage locations, stores and types'
			: 'see everything, and nothing you do changes it';

	// "an Owner", "an Editor", "a Viewer" — the only three the roles table has.
	const article = role === 'viewer' ? 'a' : 'an';
	const label = role.charAt(0).toUpperCase() + role.slice(1);

	return (
		<p class="text-[15px] leading-[1.55]" style={{ color: theme.text }}>
			{inviter} invited you as {article}{' '}
			<span class="font-semibold" style={{ color: theme.textStrong }}>{label}</span>
			{' '}— you&rsquo;ll be able to {what}.
		</p>
	);
}

/** `2026-09-09T…` → `9 September`. The card says a date, not a countdown. */
function expiryLabel(iso: string): string {
	const at = Date.parse(iso);

	if (Number.isNaN(at)) return '';

	return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export function InviteLanding({
	preview, signedIn, displayName, email, picture,
	onSignIn, onJoin, onDismiss, onSignOut, pending, theme,
}: Props) {
	const [joining, setJoining] = useState(false);

	if (! preview) {
		return (
			<OutsideCard align="center" theme={theme}>
				<div class="flex flex-col items-center gap-4 py-6">
					<Spinner size={22} color={theme.textMuted} />
					<p class="text-[13.5px]" style={{ color: theme.textMuted }}>Checking your invitation&hellip;</p>
				</div>
			</OutsideCard>
		);
	}

	/*
	 * Already in. **Green, not amber** — the third rung of the same status ramp
	 * the item badges use. Nothing is wrong, nothing is pending, the thing you
	 * wanted is already true, and amber would ask someone to fix a problem they
	 * do not have.
	 */
	if (preview.state === 'member') {
		const ok = statusColor('ok', theme.dark);

		return (
			<OutsideCard theme={theme}>
				<IconDisc tint={{ bg: ok.bg, ring: ok.ring, ink: ok.ink }}>
					<Check size={21} strokeWidth={2} />
				</IconDisc>

				<h1
					class="font-disp text-[22px] font-semibold leading-[1.22] tracking-[-0.005em] mt-[18px]"
					style={{ color: theme.textStrong }}
				>
					You&rsquo;re already in {preview.household.name}
				</h1>

				<p class="text-[15px] leading-[1.55] mt-2.5 mb-6" style={{ color: theme.text }}>
					This invite is for a household you&rsquo;re already a member of, so there&rsquo;s
					nothing to accept.
				</p>

				<button
					type="button"
					onClick={() => onDismiss(preview.householdId)}
					class={`w-full h-12 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_DIALOG}`}
					style={{ background: theme.inkBg, color: theme.inkText }}
				>
					Open {preview.household.name}
				</button>
			</OutsideCard>
		);
	}

	/*
	 * Dead, one way or another. **Amber, not crimson**: an invite that ran out
	 * destroyed nothing, and the visitor is being asked to wait for a new link
	 * rather than told something is gone.
	 *
	 * No eyebrow and no household tile. A live invite introduces a pantry; this
	 * one is a message about a link, and leading with the household would offer
	 * something the card then takes away.
	 *
	 * Revoked arrives here as `invalid` and shares the screen with one sentence
	 * changed — from outside the household, a revoked link and an expired one
	 * are the same event, and telling them apart would say something about the
	 * household to somebody who is not in it.
	 */
	if (preview.state === 'expired' || preview.state === 'invalid') {
		const amber = statusColor('low', theme.dark);
		const expired = preview.state === 'expired';

		return (
			<OutsideCard theme={theme}>
				<IconDisc tint={{ bg: amber.bg, ring: amber.ring, ink: amber.ink }}>
					<Clock size={21} strokeWidth={1.8} />
				</IconDisc>

				<h1
					class="font-disp text-[22px] font-semibold leading-[1.22] tracking-[-0.005em] mt-[18px]"
					style={{ color: theme.textStrong }}
				>
					{expired ? 'This invite has expired' : 'This invite is no longer valid'}
				</h1>

				<p class="text-[15px] leading-[1.55] mt-2.5 mb-6" style={{ color: theme.text }}>
					{expired
						? `Invites last 14 days. Ask ${preview.inviter} for a new link — the old one won’t start working again.`
						: 'Ask whoever sent it for a new link. Invites last 14 days, and one that has been withdrawn won’t start working again.'}
				</p>

				{signedIn ? (
					<button
						type="button"
						onClick={() => onDismiss()}
						class={`w-full h-12 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_DIALOG}`}
						style={{ background: theme.inkBg, color: theme.inkText }}
					>
						Open Larder Log
					</button>
				) : (
					<GravatarButton
						label="Sign in with Gravatar"
						pending={pending}
						onPress={onSignIn}
						theme={theme}
					/>
				)}
			</OutsideCard>
		);
	}

	/* Live. The only case with two ways out. */
	const expires = expiryLabel(preview.expiresAt);

	async function join() {
		if (joining) return;

		setJoining(true);
		await onJoin();
		setJoining(false);
	}

	return (
		<OutsideCard theme={theme}>
			<Eyebrow theme={theme}>Invitation</Eyebrow>

			<div class="mt-[18px]">
				<HouseholdTile ink={preview.household.ink} name={preview.household.name} size={44} dark={theme.dark} />
			</div>

			<h1
				class="font-disp text-[23px] sm:text-[24px] font-semibold leading-[1.22] tracking-[-0.005em] mt-4"
				style={{ color: theme.textStrong }}
			>
				Join {preview.household.name}
			</h1>

			<div class="mt-2.5">
				<RoleSentence inviter={preview.inviter} role={preview.role} theme={theme} />
			</div>

			{expires && (
				<p class="text-[13px] leading-[1.5] mt-2.5" style={{ color: theme.textMuted }}>
					This invite expires {expires}.
				</p>
			)}

			{signedIn ? (
				<>
					<SignedInRow
						displayName={displayName}
						email={email}
						picture={picture}
						onSignOut={onSignOut}
						theme={theme}
					/>

					{/*
					  * A right-aligned pair, the confirm dialog's footer. The ghost
					  * is the only non-committing thing here, and *Join household*
					  * is the ordinary ink primary — nothing on this card is
					  * destructive, so nothing on it is crimson.
					  */}
					<div class="flex items-center justify-end gap-2.5 mt-[22px]">
						<button
							type="button"
							onClick={() => onDismiss()}
							class={`flex items-center h-12 sm:h-10 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_GHOST}`}
						>
							Not now
						</button>
						<button
							type="button"
							onClick={() => void join()}
							disabled={joining}
							class={`flex items-center justify-center w-[172px] h-12 sm:h-11 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_DIALOG}`}
							style={{
								background: joining ? theme.disabledBg : theme.inkBg,
								color: joining ? theme.disabledText : theme.inkText,
							}}
						>
							{joining ? 'Joining…' : 'Join household'}
						</button>
					</div>
				</>
			) : (
				<div class="mt-6">
					<GravatarButton
						label="Sign in with Gravatar to join"
						pending={pending}
						onPress={onSignIn}
						theme={theme}
					/>
				</div>
			)}
		</OutsideCard>
	);
}
