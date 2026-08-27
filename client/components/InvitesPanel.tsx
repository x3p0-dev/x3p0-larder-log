import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, Copy, Plus, X } from 'lucide-preact';

import { ROLE_BLURBS, ROLE_LABELS } from './RoleMenu';
import { panelSkin } from './TermPanel';
import type { Theme } from '../lib/theme';
import {
	DRAWER_CARD_ROW, DRAWER_CHIP_ADD, DRAWER_CHIP_ON, DRAWER_CHIP_OUTLINE,
	DRAWER_GHOST_DANGER, DRAWER_ICON, DRAWER_PRIMARY,
} from '../lib/controlStyles';
import type { Invite } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can, invitableRoles } from '../../shared/roles';
import { daysUntilExpiry, INVITE_TTL_DAYS } from '../../shared/invite';
import { buildJoinUrl } from '../../shared/joinLink';

/**
 * Minting and revoking invite codes, at the foot of the Members pane.
 *
 * A code is a bearer credential: anyone holding it joins the household as the
 * role it carries (D21), so the role is the card's own heading and revoking is
 * one press away. Expiry is D24's 14 days, computed from the same
 * `shared/invite.ts` the server enforces with.
 *
 * **Expiry is a countdown, not a date** — *Expires in 12 days*. It answers the
 * question the date was standing in for, and needs no year, no locale and no
 * format. The `?join=` landing still spells a date, deliberately: on a link
 * someone opens cold, a date may be the thing they can act on.
 *
 * Members and invites share the pane because they are one subject. That is what
 * finally gave the link a full-width field to sit in — it was cramped at 340px
 * for as long as it lived in a section of the Settings pane.
 */

/** How the countdown reads inside a day of expiring, where "in 0 days" would not. */
function expiryLabel(days: number | null): string {
	if (days === null) return 'Never expires';
	if (days === 0) return 'Expires today';
	if (days === 1) return 'Expires tomorrow';

	return `Expires in ${days} days`;
}

type Props = {
	invites: Invite[];
	/** The viewer's own role — what they may mint, and whether they may revoke. */
	myRole: Role;
	onCreate: (role: Role) => unknown;
	onRevoke: (inviteId: string) => void;
	/** Set while a code is being minted, so *Create* can't be double-fired. */
	creating: boolean;
	theme: Theme;
};

export function InvitesPanel({ invites, myRole, onCreate, onRevoke, creating, theme }: Props) {
	const d = theme.drawer;
	/*
	 * The composer is the term composer, so it paints from the term composer's
	 * skin rather than from a second set of values that happen to look similar.
	 * It had the drawer *well* and the section label's dim brown, which put it a
	 * shade away from the panel Settings › Household flips into and made two
	 * instances of one component look like two components.
	 */
	const panel = panelSkin(theme, true);
	const [copied, setCopied] = useState<string | null>(null);
	const [composing, setComposing] = useState(false);

	/*
	 * *Editor* is preselected because it is the ordinary case — and because a
	 * composer with nothing chosen would make the sentence underneath it
	 * describe nothing.
	 */
	const [draftRole, setDraftRole] = useState<Role>('editor');

	/*
	 * A card collapses to its header once it is not the newest. Four live
	 * invites is otherwise four link fields stacked in a 340px pane, and the
	 * only one you are about to copy is the one you just made.
	 *
	 * "Just made" is worked out by watching for an id that was not here a moment
	 * ago rather than threading it back from `onCreate`, which resolves to
	 * nothing — and this way a code minted in another tab opens here too, which
	 * is the same intent.
	 */
	const [openId, setOpenId] = useState<string | null>(null);
	const seen = useRef<Set<string> | null>(null);

	useEffect(() => {
		const ids = new Set(invites.map((i) => i.id));

		if (seen.current === null) {
			seen.current = ids;
			return;
		}

		const fresh = invites.find((i) => ! seen.current?.has(i.id));
		seen.current = ids;
		if (fresh) setOpenId(fresh.id);
	}, [invites]);

	const offerable = invitableRoles(myRole);
	const mayRevoke = can(myRole, 'invite:revoke');
	const now = Date.now();

	/*
	 * A viewer gets no Invites block at all — not a label over a list of live
	 * codes they can neither mint nor revoke. Absent rather than disabled (D30),
	 * and it is the only role this hides from: an editor may still mint viewer
	 * invites and revoke any of them.
	 */
	if (offerable.length === 0 && ! mayRevoke) return null;

	// `location` is always present in the browser; the guard is for the type,
	// and for the day this component gets rendered somewhere that isn't one.
	const origin = typeof location === 'undefined' ? '' : location.origin;

	async function copyLink(invite: Invite) {
		try {
			await navigator.clipboard.writeText(buildJoinUrl(origin, invite.code));
			setCopied(invite.id);
			setTimeout(() => setCopied((id) => (id === invite.id ? null : id)), 2000);
		} catch {
			// Clipboard access is refused outside a secure context and on some
			// mobile browsers. The link is on screen and selectable either way,
			// which is why it is rendered rather than hidden behind this button.
		}
	}

	/*
	 * The composer closes on create rather than on the row appearing. The new
	 * invite is a round trip away and the panel would otherwise sit open over
	 * the thing it just made — and `openId` puts that row's link on screen the
	 * moment it arrives, which is the confirmation. No toast: you have to stay
	 * on this screen to copy the link anyway.
	 */
	async function create() {
		if (creating) return;

		await onCreate(draftRole);
		setComposing(false);
	}

	return (
		<section class="flex flex-col gap-2.5">
			<p class="text-label font-bold uppercase tracking-[0.15em] px-1 pb-0.5" style={{ color: d.label }}>
				Invites
			</p>

			{invites.map((invite) => {
				const open = openId === invite.id;
				const link = buildJoinUrl(origin, invite.code);

				return (
					<div
						key={invite.id}
						class="flex flex-col rounded-[13px] overflow-hidden"
						style={{ background: d.raised, border: `1px solid ${d.line}` }}
					>
						{/*
						  * The header is the toggle, and the whole of a collapsed
						  * card. The role leads because it is the one thing about an
						  * invite that has a consequence — and it is the card's own
						  * heading rather than *Joins as Editor*: the card is about
						  * one invite, so the sentence has nothing to disambiguate.
						  */}
						<button
							onClick={() => setOpenId((id) => (id === invite.id ? null : invite.id))}
							aria-expanded={open}
							class={`flex items-baseline justify-between gap-3 px-3.5 py-[13px] text-left ${DRAWER_CARD_ROW}`}
						>
							<span class="text-body font-semibold truncate" style={{ color: d.ink }}>
								{ROLE_LABELS[invite.role]}
							</span>
							<span class="shrink-0 text-meta" style={{ color: theme.textFaint }}>
								{expiryLabel(daysUntilExpiry(invite.expiresAt, now))}
							</span>
						</button>

						{/*
						  * A hairline when the card is open, because the header is a
						  * hover target: without one its fill ran straight into the
						  * top of the link field with nothing between them. It is
						  * also the construction every other card in this drawer uses
						  * — a row, a rule, then what the row opened.
						  */}
						{open && (
							<>
							<span class="block h-px" style={{ background: d.line }} />
							<div class="flex flex-col gap-3 px-3.5 pt-3 pb-3.5">
								{/*
								  * Readonly and selectable rather than copy-only: the
								  * clipboard API is refused outside a secure context,
								  * and a link nobody can select is a dead end there.
								  */}
								<input
									readOnly
									value={link}
									onFocus={(e) => e.currentTarget.select()}
									aria-label="Invite link"
									class="h-10 px-3 rounded-[11px] text-meta font-mono truncate outline-none"
									style={{ background: d.well, border: `1px solid ${d.line}`, color: d.inkFaint }}
								/>
								<div class="flex gap-2">
									<button
										onClick={() => void copyLink(invite)}
										class={`flex-1 flex items-center justify-center gap-2 h-9 rounded-[11px] text-sm font-semibold ${DRAWER_PRIMARY}`}
										style={{ background: d.ink, color: '#241E17' }}
									>
										{copied === invite.id ? <Check size={14} /> : <Copy size={14} />}
										{copied === invite.id ? 'Copied' : 'Copy link'}
									</button>
									{mayRevoke && (
										<button
											onClick={() => onRevoke(invite.id)}
											class={`shrink-0 flex items-center h-9 px-4 rounded-[11px] text-sm ${DRAWER_GHOST_DANGER}`}
										>
											Revoke
										</button>
									)}
								</div>
							</div>
							</>
						)}
					</div>
				);
			})}

			{offerable.length > 0 && (
				<>
					{/*
					  * The dashed row **stays put** and drops the composer in below
					  * itself — the Filter tab's term composer at drawer scale, so
					  * this is a component that already exists rather than a new
					  * interaction. No modal.
					  */}
					<button
						onClick={() => {
							setDraftRole(offerable.includes('editor') ? 'editor' : offerable[0]!);
							setComposing(true);
						}}
						disabled={composing}
						class={`flex items-center justify-center gap-2 h-11 rounded-[13px] text-sm ${DRAWER_CHIP_ADD} disabled:opacity-50 disabled:pointer-events-none`}
					>
						<Plus size={15} /> New invite
					</button>

					{composing && (
						<div
							class="flex flex-col rounded-[14px]"
							style={{ background: panel.panel, boxShadow: `inset 0 0 0 1px ${panel.hairline}` }}
						>
							{/*
							  * Header, then a hairline — which is what puts the panel
							  * at the same rhythm as the cards above it.
							  */}
							<div class="flex items-center justify-between gap-2.5 pl-4 pr-2.5 py-2.5">
								<span class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: panel.label }}>
									New invite
								</span>
								<span class="flex items-center gap-1.5">
									<button
										onClick={() => void create()}
										disabled={creating}
										class={`flex items-center h-[30px] px-[15px] rounded-[10px] text-[13.5px] font-semibold ${DRAWER_PRIMARY}`}
										style={{ background: panel.doneBg, color: panel.doneInk }}
									>
										Create
									</button>
									<button
										onClick={() => setComposing(false)}
										class={`flex items-center justify-center w-[30px] h-[30px] rounded-[10px] ${DRAWER_ICON}`}
										aria-label="Cancel"
									>
										<X size={14} />
									</button>
								</span>
							</div>

							<span class="block h-px" style={{ background: panel.hairline }} />

							<div class="flex flex-col gap-3.5 p-4">
								{/*
								  * The chip component with no dot. A role is not a term,
								  * so there is nothing for a dot to identify — but three
								  * mutually exclusive options with an on-state is exactly
								  * what a chip is, and inside the drawer the on-state is
								  * the cream one.
								  */}
								<div class="flex flex-wrap gap-2">
									{offerable.map((role) => (
										<button
											key={role}
											onClick={() => setDraftRole(role)}
											aria-pressed={role === draftRole}
											class={`flex items-center h-[34px] px-[15px] rounded-full text-[13.5px] ${role === draftRole ? DRAWER_CHIP_ON : DRAWER_CHIP_OUTLINE}`}
										>
											{ROLE_LABELS[role]}
										</button>
									))}
								</div>

								<div class="flex flex-col gap-[7px]">
									<p class="text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
										{ROLE_BLURBS[draftRole]}
									</p>
									{/*
									  * **A code is a bearer credential** (D21), and
									  * `redeemInvite` neither consumes nor revokes it —
									  * so the link works for everyone who has it, not
									  * once. The first copy here said *"It works once
									  * and expires in two weeks"*, which was wrong
									  * twice; saying only that it lasts 14 days fixed
									  * half of it. The number comes from
									  * `INVITE_TTL_DAYS` rather than being typed, so
									  * the sentence cannot drift from the rule the
									  * server enforces.
									  */}
									<p class="text-[12.5px] leading-[1.45]" style={{ color: theme.textFaint }}>
										Anyone with the link can join for the next {INVITE_TTL_DAYS} days, unless you revoke it.
									</p>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</section>
	);
}
