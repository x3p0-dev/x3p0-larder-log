import { useState } from 'preact/hooks';
import { ChevronLeft, ChevronRight, EyeOff, Shield, Trash2, X } from 'lucide-preact';

import { AccountDeleteDialog } from './AccountDeleteDialog';
import { AdminHeldNotice } from './AdminHeldNotice';
import { AdminLoading } from './AdminLoading';
import { DrawerAvatar } from './DrawerAvatar';
import { EmptyState } from './EmptyState';
import { HouseholdTile } from './HouseholdTile';
import { ROLE_LABELS } from './RoleMenu';
import { useAdminAccount, useAdminWrites, useAdminWritesHeld } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import {
	ADMIN_ROW, PAGE_BANNER_X, PAGE_BUTTON_QUIET, PAGE_FOCUS,
	PAGE_GHOST_DANGER_SUNK, PAGE_HELD,
} from '../lib/controlStyles';
import type { Role } from '../../shared/roles';
import { ADMIN_UNDELETABLE_NOTE, usDate } from '../../shared/admin';
import type { AdminPersonHousehold } from '../../shared/types';

/**
 * Board 5 — one account: where somebody is a member, and what they can do
 * there.
 *
 * **What those households hold stays behind the same line the household page
 * draws.** A member count and an item count are counts; there is no route from
 * here to anything inside one, and the card at the foot says so in the same
 * words the household page uses.
 *
 * Three of the board's fields are absent and none is a later stage: the
 * **email** under the name (D56 — a Spacefast account carries no `email` claim
 * and a handler is only told about its caller), **Last seen** (nothing records
 * a session), and **Signs in with** (`auth.provider` describes the caller, and
 * D47 settled that this app does not name lanes anyway).
 */
export function AdminAccount({
	userId, onBack, onOpenHousehold, theme, dark,
}: {
	userId: string;
	onBack: () => void;
	onOpenHousehold: (householdId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const result = useAdminAccount(userId);
	const writes = useAdminWrites();
	const held = useAdminWritesHeld();

	const [error, setError] = useState('');
	const [deleting, setDeleting] = useState(false);

	if (result.state === 'denied') return null;

	if (result.state === 'loading') return <AdminLoading theme={theme} />;

	if (result.state === 'missing') {
		return (
			<EmptyState
				title="That account is gone"
				body="It was deleted, or the address names one that never existed. Either way there is nothing left here to show."
				action={{ label: 'Back to people', onClick: onBack }}
				theme={theme}
			/>
		);
	}

	const { person, households, invitesIssued, isSelf } = result.data;
	const owned = households.filter((h) => h.role === 'owner').length;

	return (
		<div class="flex flex-col gap-[22px]">
			{error && (
				<div
					role="alert"
					class="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-[13px] text-sm"
					style={{
						background: theme.surfaceAlt,
						color: theme.dangerText,
						border: `1px solid ${theme.dangerText}`,
					}}
				>
					<span>{error}</span>
					{/*
					  * The one control in the console that shipped with no
					  * states at all — `shrink-0` and nothing else, so it had no
					  * hover, no press and no ring of its own on a page where
					  * every other control has all three.
					  */}
					<button
						onClick={() => setError('')}
						aria-label="Dismiss"
						class={`shrink-0 flex items-center justify-center w-6 h-6 -mr-1 -my-0.5 ${PAGE_BANNER_X}`}
					>
						<X size={15} />
					</button>
				</div>
			)}

			{/* This page has exactly one write on it, and it is the largest one
			  * in the app. The notice is what lets its button be asleep and still
			  * mean something (D36).
			  *
			  * **Not on an administrator's page**, where that button is absent
			  * rather than asleep (D68) — a notice above a screen you could only
			  * ever read would be an apology for nothing, which is the same rule
			  * that keeps it off Overview and the two lists. */}
			{held && ! person.admin && <AdminHeldNotice theme={theme} />}

			<button
				onClick={onBack}
				/* The shell the style's own comment asks every caller for.
				  * Shipped with `border` alone, so the console's two back
				  * buttons had a hover and nothing else. */
				class={`self-start flex items-center gap-1.5 -ml-2 h-9 px-2 rounded-[10px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${PAGE_BUTTON_QUIET}`}
			>
				<ChevronLeft size={15} /> People
			</button>

			<div class="flex items-center gap-4">
				<DrawerAvatar name={person.name} picture={person.picture} size={44} />
				<div class="min-w-0">
					<h1 class="font-disp text-[26px] font-semibold m-0 truncate" style={{ color: theme.textStrong }}>
						{person.name || 'Someone'}
					</h1>
					<div class="mt-1 text-[13px] truncate" style={{ color: theme.textMuted }}>
						{person.userId} · joined {usDate(person.joinedAt)}
					</div>
				</div>
				{person.admin && (
					<span
						class="ml-auto shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-[0.09em]"
						style={{
							color: statusInk('low', dark),
							border: `1px solid ${statusInk('low', dark)}`,
							background: theme.surfaceAlt,
						}}
					>
						<Shield size={10} strokeWidth={2.6} /> Administrator
					</span>
				)}
			</div>

			<div class="grid gap-6 items-start grid-cols-1 xl:grid-cols-[minmax(0,1.58fr)_minmax(0,1fr)]">
				<div class="flex flex-col gap-[22px]">
					<Card theme={theme}>
						<Label theme={theme}>Households · {households.length}</Label>
						{households.length === 0 ? (
							<Blank theme={theme}>
								Not a member of anything. Their display name is all this app still holds.
							</Blank>
						) : (
							households.map((h, i) => (
								<HouseholdRow
									key={h.id}
									household={h}
									first={i === 0}
									onOpen={() => onOpenHousehold(h.id)}
									theme={theme}
									dark={dark}
								/>
							))
						)}
					</Card>

					<div
						class="flex items-start gap-3.5 rounded-[20px] p-5"
						style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
					>
						<span
							class="shrink-0 flex items-center justify-center w-9 h-9 rounded-full"
							style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted }}
						>
							<EyeOff size={17} />
						</span>
						<p class="m-0 text-[14px] leading-[1.5]" style={{ color: theme.textMuted }}>
							You can see where someone is a member and what they can do there. What
							those households hold stays behind the same line the household page
							draws.
						</p>
					</div>
				</div>

				<Card theme={theme}>
					<Label theme={theme}>Account</Label>

					<Row label="Joined" value={usDate(person.joinedAt)} theme={theme} />
					<Row
						label="Households"
						value={households.length.toLocaleString()}
						theme={theme}
					/>
					<Row label="Households owned" value={owned.toLocaleString()} theme={theme} />
					<Row label="Live invites issued" value={invitesIssued.toLocaleString()} theme={theme} />

					<div
						class="flex flex-col gap-1.5 px-5 py-3.5"
						style={{ borderTop: `1px solid ${theme.divider}`, background: theme.surfaceAlt }}
					>
						{/*
						  * **An administrator's account is not the console's to
						  * delete either** (D68), and this is the sharper half of the
						  * guard: one administrator removing a peer's rows would
						  * leave `LARDER_ADMIN_IDS` still naming an account that no
						  * longer exists, and the next sign-in with that identity
						  * would mint an empty one holding the console.
						  *
						  * **Absent rather than disabled**, unlike the hold beside
						  * it — and the two differ for a stated reason. The hold is
						  * *temporary* and its control comes back, so it stays on
						  * screen wearing `PAGE_HELD`. This is not a hold: it is what
						  * this account **is**, for as long as the environment says
						  * so, and a permanently dead button is a worse thing to look
						  * at than a sentence saying where the switch really is.
						  *
						  * `person.admin` is the console's own flag, already on every
						  * row of the People list — so this reads the same fact the
						  * list filters on rather than a second one.
						  */}
						{! person.admin && (
						<button
							onClick={() => setDeleting(true)}
							disabled={held}
							/* The sunk twin: this strip is `surface-alt`, so the card
							  * form's hover would land on the colour it is already on. */
							class={`inline-flex self-start items-center gap-2 h-11 md:h-[34px] -ml-2 px-2 rounded-[10px] text-[15px] font-semibold ${PAGE_GHOST_DANGER_SUNK} ${PAGE_HELD}`}
						>
							<Trash2 size={16} /> Delete account
						</button>
						)}
						<span class="text-[12.5px] leading-[1.45]" style={{ color: theme.textMuted }}>
							{/*
							  * The sentence changes with the situation, because the
							  * only interesting version of it is the one that names a
							  * decision waiting. A flat *this is permanent* would be
							  * true and would say nothing the button does not.
							  */}
							{person.admin
								? ADMIN_UNDELETABLE_NOTE
								: person.soleOwnerOf > 0
									? `${isSelf ? 'You are' : 'They are'} the only owner of ` +
										`${person.soleOwnerOf} ${person.soleOwnerOf === 1 ? 'household' : 'households'} ` +
										`other people use. Deleting asks what happens to ` +
										`${person.soleOwnerOf === 1 ? 'it' : 'each'} before it goes ahead.`
									: 'Removes every membership and the display name. It cannot remove the Spacefast account itself, and the audit log keeps its record of what they did.'}
						</span>
					</div>
				</Card>
			</div>

			<AccountDeleteDialog
				open={deleting}
				name={person.name || 'this account'}
				households={households}
				isSelf={isSelf}
				onConfirm={(decisions) => {
					setDeleting(false);
					void writes.deleteAccount(person.userId, decisions).then((message) => {
						setError(message ?? '');
						// The page is gone with the account, so the list is the
						// only place left to be. A refusal keeps you here.
						if (! message) onBack();
					});
				}}
				onCancel={() => setDeleting(false)}
				dark={dark}
				theme={theme}
			/>
		</div>
	);
}

/**
 * One household beside a person: where they are, and what they can do there.
 *
 * The row opens the household's own page. That seam runs both ways now: a
 * member row on a household opens the account behind it.
 */
function HouseholdRow({
	household, first, onOpen, theme, dark,
}: {
	household: AdminPersonHousehold;
	first: boolean;
	onOpen: () => void;
	theme: Theme;
	dark: boolean;
}) {
	return (
		<button
			onClick={onOpen}
			class={`flex items-center gap-3 w-full text-left px-5 py-3 ${ADMIN_ROW}`}
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
			aria-label={`${household.name} — ${ROLE_LABELS[household.role as Role] ?? household.role}`}
		>
			<HouseholdTile ink={household.ink} name={household.name} size={34} dark={dark} />
			<span class="flex-1 min-w-0 flex flex-col gap-px">
				<span class="truncate text-[15px] font-semibold" style={{ color: theme.textStrong }}>
					{household.name}
				</span>
				<span class="truncate text-meta" style={{ color: theme.textMuted }}>
					{household.members} {household.members === 1 ? 'member' : 'members'}
					{household.soleOwner ? ' · the only owner' : ''}
				</span>
			</span>
			<span
				class="shrink-0 px-2.5 h-[26px] inline-flex items-center rounded-full text-[12.5px] font-medium"
				style={{ background: theme.neutralChipBg, color: theme.neutralChipText }}
			>
				{ROLE_LABELS[household.role as Role] ?? household.role}
			</span>
			<ChevronRight size={15} class="shrink-0" style={{ color: theme.textFaint }} />
		</button>
	);
}

function Card({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		<div
			class="rounded-[20px] overflow-hidden"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
		>
			{children}
		</div>
	);
}

function Label({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		<div
			class="px-5 pt-4 pb-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em]"
			style={{ color: theme.textMuted }}
		>
			{children}
		</div>
	);
}

/** A key and a value, the board's `.frow` — a 132px key column and the rest. */
function Row({ label, value, theme }: { label: string; value: string; theme: Theme }) {
	return (
		<div
			class="flex flex-col sm:flex-row sm:gap-[18px] gap-0.5 px-5 py-3"
			style={{ borderTop: `1px solid ${theme.divider}` }}
		>
			<span
				class="sm:w-[132px] shrink-0 sm:pt-[3px] text-[10.5px] font-bold uppercase tracking-[0.12em]"
				style={{ color: theme.textMuted }}
			>
				{label}
			</span>
			<span class="flex-1 min-w-0 text-[15px] tabular-nums" style={{ color: theme.textStrong }}>
				{value}
			</span>
		</div>
	);
}

function Blank({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		<div
			class="px-5 py-[15px] text-sm"
			style={{ borderTop: `1px solid ${theme.divider}`, color: theme.textMuted }}
		>
			{children}
		</div>
	);
}
