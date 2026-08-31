import { useRef, useState } from 'preact/hooks';
import { ChevronLeft, ChevronRight, EyeOff, KeyRound, Trash2, UserPlus, X } from 'lucide-preact';

import { AdminHeldNotice } from './AdminHeldNotice';
import { AdminLoading } from './AdminLoading';
import { ConfirmDialog } from './ConfirmDialog';
import { DrawerAvatar } from './DrawerAvatar';
import { EmptyState } from './EmptyState';
import { HouseholdTile } from './HouseholdTile';
import { RoleMenu } from './RoleMenu';
import { useAdminHousehold, useAdminWrites, useAdminWritesHeld } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import {
	ADMIN_ROW, PAGE_BANNER_X, PAGE_BUTTON_QUIET, PAGE_FOCUS, PAGE_GHOST_DANGER,
	PAGE_GHOST_DANGER_SUNK, PAGE_HELD,
} from '../lib/controlStyles';
import {
	daysBetween, DORMANT_DAYS, usDate, usLongDate,
} from '../../shared/admin';
import { ROLE_LABELS } from './RoleMenu';
import type { Role } from '../../shared/roles';
import type { AdminInvite, AdminMember } from '../../shared/types';

/**
 * Board 3 — one household, and nothing it holds.
 *
 * **Everything on this page is a count, a name, or a date.** It is stated on the
 * page rather than merely observed by not drawing items, because a rule anybody
 * can check is worth more than a habit: the moment a field here is not one of
 * those three, the console has stopped being metadata-only and the card in the
 * left column has started lying.
 *
 * **The three write controls are here now**, and every one of them reaches into
 * a household the caller is not a member of — the role menu, *Revoke* on a live
 * invite, and *Delete household* under the counts. Each is refused server-side
 * by `requireAdmin` and by the guards an administrator is **not** exempt from:
 * D22's last owner, D21's invite revocation, and the delete cascade.
 *
 * **Deleting is the app's second typed confirmation and it earns it.** The
 * first — deleting your own last household — earned the exception by destroying
 * data belonging to more than one screen. This destroys data belonging to
 * people who are not in the room, and it is the only place in Larder Log where
 * that is possible at all.
 *
 * A refusal lands in a banner at the top of the page rather than a toast: the
 * one that matters says *make someone else an owner first*, which is an
 * instruction about a control 200px below it, and a message that dismisses
 * itself after six seconds is the wrong shape for an instruction.
 */
export function AdminHousehold({
	householdId, onBack, onOpenPerson, theme, dark,
}: {
	householdId: string;
	onBack: () => void;
	/** A member row opens that person's account page — the console's other seam. */
	onOpenPerson: (userId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const result = useAdminHousehold(householdId);
	const writes = useAdminWrites();
	// Server-decided, and it depends on who is asking — a dev guest is exempt.
	const held = useAdminWritesHeld();

	const [error, setError] = useState('');
	const [roleOpen, setRoleOpen] = useState('');
	/*
	 * One `pending` rather than three booleans. Each of the three confirms is a
	 * different dialog over the same page, and only one can ever be open — a
	 * union makes that structural instead of a rule three `useState`s have to
	 * keep between them.
	 */
	const [pending, setPending] = useState<Pending | null>(null);

	/*
	 * The orphan dialog, once per household per visit.
	 *
	 * It opens **on arrival** rather than behind a control, which is what the
	 * board draws and the only arrangement that works: an ownerless household is
	 * stuck in a way nobody looking at it would otherwise notice, and the whole
	 * point of Overview flagging it is that somebody arrives here to fix it. It
	 * is dismissed by household id, so leaving and coming back to a *different*
	 * broken one still asks.
	 */
	const [orphanSeen, setOrphanSeen] = useState('');
	const membersRef = useRef<HTMLDivElement | null>(null);

	async function run(action: Promise<string | null>) {
		const message = await action;

		setError(message ?? '');
	}

	if (result.state === 'denied') return null;

	if (result.state === 'loading') return <AdminLoading theme={theme} />;

	if (result.state === 'missing') {
		return (
			<EmptyState
				title="That household is gone"
				body="It was deleted, or the address names one that never existed. Either way there is nothing left here to show."
				action={{ label: 'Back to households', onClick: onBack }}
				theme={theme}
			/>
		);
	}

	const { household: h, holds, members, invites, createdAt } = result.data;
	// Amber, not crimson: nothing is gone, a household is stuck (D36's rule).
	const orphaned = h.noOwner && orphanSeen !== h.id;

	return (
		<div class="flex flex-col gap-[22px]">
			{/*
			  * A refusal, at the top of the page and not in a toast. The one that
			  * matters — *make someone else an owner first* — is an instruction
			  * about a control further down, and an instruction that dismisses
			  * itself after six seconds is the wrong shape.
			  */}
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

			{/* Above the back button on purpose: it is about the whole page, and
			  * the three controls it explains are spread down two columns. */}
			{held && <AdminHeldNotice theme={theme} />}

			{/*
			  * Back is a control on this page as well as a pane in the drawer.
			  * The drawer's *Households* row goes to the list too, and on a phone
			  * the drawer is a slide-over — so leaving this page would otherwise
			  * cost opening a panel over the thing you were trying to leave.
			  */}
			<button
				onClick={onBack}
				/* The shell the style's own comment asks every caller for.
				  * Shipped with `border` alone, so the console's two back
				  * buttons had a hover and nothing else. */
				class={`self-start flex items-center gap-1.5 -ml-2 h-9 px-2 rounded-[10px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${PAGE_BUTTON_QUIET}`}
			>
				<ChevronLeft size={15} /> Households
			</button>

			<div class="flex items-center gap-4">
				<HouseholdTile ink={h.ink} name={h.name} size={44} dark={dark} />
				<div class="min-w-0">
					<h1 class="font-disp text-[26px] font-semibold m-0 truncate" style={{ color: theme.textStrong }}>
						{h.name}
					</h1>
					<div class="mt-1 text-[13px] truncate" style={{ color: theme.textMuted }}>
						{[
							`Created ${usLongDate(createdAt, 'at some point')}`,
							h.id,
							`last active ${lastActiveWords(h.lastActive)}`,
						].join(' · ')}
					</div>
				</div>
				{h.noOwner && (
					<span class="ml-auto shrink-0">
						<Flag label="No owner" tint={statusInk('low', dark)} theme={theme} />
					</span>
				)}
				{! h.noOwner && h.dormant && (
					<span class="ml-auto shrink-0">
						<Flag label="Dormant" tint={theme.textFaint} theme={theme} />
					</span>
				)}
			</div>

			{/* 1.58 / 1, as drawn. Both columns stack below `xl`, where 360px of
			  * member rows beside four numerals stops being two columns. */}
			<div class="grid gap-6 items-start grid-cols-1 xl:grid-cols-[minmax(0,1.58fr)_minmax(0,1fr)]">
				<div class="flex flex-col gap-[22px]">
					<Card theme={theme}>
						<Label theme={theme}>What it holds</Label>

						<div class="grid grid-cols-2 sm:grid-cols-4 gap-y-4 px-5 pb-4">
							{[
								['Items', holds.items],
								['Locations', holds.locations],
								['Stores', holds.stores],
								['Types', holds.types],
							].map(([label, n]) => (
								<div key={label as string}>
									<div
										class="font-disp font-bold text-[29px] leading-[1.15] tabular-nums"
										style={{ color: theme.textStrong }}
									>
										{(n as number).toLocaleString()}
									</div>
									<div class="text-sm" style={{ color: theme.textMuted }}>{label}</div>
								</div>
							))}
						</div>

						{/*
						  * Three facts, not the board's four. **Storage is absent
						  * and is not a later stage** — a Zero handler is given no
						  * storage handle in either direction, so `1.1 MB` is a
						  * number nothing in this runtime can produce.
						  */}
						<div
							class="flex flex-wrap gap-x-[26px] gap-y-1.5 px-5 py-3.5 text-[13.5px]"
							style={{
								borderTop: `1px solid ${theme.divider}`,
								background: theme.surfaceAlt,
								color: theme.textMuted,
							}}
						>
							<Fact label="Members" value={members.length.toLocaleString()} theme={theme} />
							<Fact label="Invites out" value={invites.length.toLocaleString()} theme={theme} />
							<Fact label="Created" value={usDate(createdAt)} theme={theme} />
						</div>

						{/*
						  * **Crimson text on nothing**, which is how this app offers a
						  * destructive action — the confirm behind it takes the
						  * ordinary ink primary (D36). The sentence beside it says
						  * what the press costs *before* the dialog does, so the
						  * dialog is a second look rather than the first warning.
						  */}
						<div
							class="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"
							style={{ borderTop: `1px solid ${theme.divider}`, background: theme.surfaceAlt }}
						>
							<button
								onClick={() => setPending({ kind: 'delete' })}
								disabled={held}
								/* The sunk twin: this strip is `surface-alt`, so the
								  * card form's hover would land on the colour it is
								  * already on. */
								class={`inline-flex items-center gap-2 h-11 md:h-[34px] -ml-2 px-2 rounded-[10px] text-[15px] font-semibold ${PAGE_GHOST_DANGER_SUNK} ${PAGE_HELD}`}
							>
								<Trash2 size={16} /> Delete household
							</button>
							<span class="text-[12.5px]" style={{ color: theme.textMuted }}>
								{/* Still describes the button rather than the hold —
								  * the notice at the top of the page says that once,
								  * and repeating it under every asleep control would
								  * be the page apologising three times. */}
								Permanent. Asks you to type the name.
							</span>
						</div>
					</Card>

					<Boundary theme={theme} />
				</div>

				<div class="flex flex-col gap-[22px]">
					<Card clip={false} ref={membersRef} theme={theme}>
						<Label theme={theme}>Members · {members.length}</Label>
						{members.length === 0 ? (
							<Blank theme={theme}>
								Nobody is in this household. Its rows are still here and nothing can reach them.
							</Blank>
						) : (
							members.map((m) => (
								<MemberRow
									key={m.id}
									member={m}
									held={held}
									menuOpen={roleOpen === m.id}
									setMenuOpen={(open) => setRoleOpen(open ? m.id : '')}
									onOpen={() => onOpenPerson(m.userId)}
									onChangeRole={(role) => void run(writes.setRole(h.id, m.id, role))}
									onRemove={() => setPending({ kind: 'remove', id: m.id, name: m.name })}
									theme={theme}
								/>
							))
						)}
					</Card>

					<Card theme={theme}>
						<Label theme={theme}>Invites out · {invites.length}</Label>
						{invites.length === 0 ? (
							<Blank theme={theme}>No live invites.</Blank>
						) : (
							invites.map((i) => (
								<InviteRow
									key={i.id}
									invite={i}
									held={held}
									onRevoke={() => setPending({ kind: 'revoke', id: i.id, role: i.role })}
									theme={theme}
								/>
							))
						)}
					</Card>
				</div>
			</div>

			{/*
			  * One dialog element per kind rather than one driven by the union.
			  * `ConfirmDialog` animates its own open/close and resets its typed
			  * field on open, so a single instance whose `title` and `requireText`
			  * swapped underneath it would cross-fade one question into another.
			  */}
			<ConfirmDialog
				open={pending?.kind === 'remove'}
				tone="danger"
				icon={UserPlus}
				title="Remove this member?"
				body={
					pending?.kind === 'remove'
						? `${pending.name} loses access to ${h.name}, and any invites they made stop working. Nothing they added is removed.`
						: ''
				}
				confirmLabel="Remove member"
				onConfirm={() => {
					if (pending?.kind === 'remove') void run(writes.removeMember(h.id, pending.id));
					setPending(null);
				}}
				onCancel={() => setPending(null)}
				dark={dark}
				theme={theme}
			/>

			<ConfirmDialog
				open={pending?.kind === 'revoke'}
				tone="danger"
				icon={X}
				title="Revoke this invite?"
				body={
					pending?.kind === 'revoke'
						? `The link stops working immediately. Anyone holding it sees the same screen a made-up code gets, and whoever issued it can make another.`
						: ''
				}
				confirmLabel="Revoke invite"
				onConfirm={() => {
					if (pending?.kind === 'revoke') void run(writes.revokeInvite(h.id, pending.id));
					setPending(null);
				}}
				onCancel={() => setPending(null)}
				dark={dark}
				theme={theme}
			/>

			{/*
			  * **The orphan — amber, because nothing is gone yet.**
			  *
			  * A household whose last owner left is stuck, not destroyed: until
			  * somebody is promoted nobody can rename it, invite anyone, or manage
			  * its locations and sources. Amber is *hold on* and crimson is
			  * *gone*, which is the blocked dialog's existing rule — and the
			  * primary goes where the problem is, exactly as *Open Members*
			  * already does, rather than doing anything itself.
			  *
			  * It is **the reason `adminTransferOwnership` exists**: promoting
			  * somebody here is the transfer, because there is nobody to demote.
			  */}
			<ConfirmDialog
				open={orphaned}
				tone="blocked"
				icon={KeyRound}
				title={`${h.name} has no owner`}
				body={
					members.length === 0
						? 'Nobody is left in it at all. Its rows are still here and nothing can reach them — the only thing left to decide is whether to delete it.'
							+ (held ? ' That decision is on hold for now.' : '')
						: 'Its last owner left or was removed. Until someone is promoted, nobody can rename it, invite anyone, or manage its locations and sources.'
							+ (held ? ' Promoting somebody is on hold for now.' : '')
				}
				/*
				  * **Both primaries change while writes are held**, and neither
				  * is merely disabled: this dialog opens by itself on arrival, so
				  * a dead button in it would be a thing nobody chose to press
				  * offering something it cannot do. *Close* is honest, and the
				  * body above it already says what is wrong with the household.
				  *
				  * The members branch is the one that survives unchanged when the
				  * hold lifts — it only ever scrolled to the role menus.
				  */
				confirmLabel={held && members.length === 0 ? 'Close'
					: members.length === 0 ? 'Delete household'
					: 'Make someone an owner'}
				onConfirm={() => {
					setOrphanSeen(h.id);

					if (members.length === 0) {
						if (! held) setPending({ kind: 'delete' });

						return;
					}

					// Where the problem is. The role menu is on every row and the
					// card is off-screen on a narrow window, so this scrolls to it
					// rather than opening a menu on a member nobody chose.
					membersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}}
				onCancel={() => setOrphanSeen(h.id)}
				dark={dark}
				theme={theme}
			/>

			{/*
			  * The typed one. `requireText` is the household's **name**, which is
			  * what the person deleting it can see on the screen behind the
			  * dialog — a name is the only string in this app that identifies a
			  * household to a human, and asking for its id would be asking
			  * somebody to copy a value rather than read one.
			  */}
			<ConfirmDialog
				open={pending?.kind === 'delete'}
				tone="danger"
				icon={Trash2}
				title="Delete this household?"
				body={
					`${h.name} and everything in it — ${holds.items} ${holds.items === 1 ? 'item' : 'items'}, ` +
					`its locations, sources, and types — are deleted for ` +
					`${members.length === 1 ? 'its one member' : `all ${members.length} of its members`}. ` +
					`This cannot be undone. Type the household’s name to confirm.`
				}
				confirmLabel="Delete household"
				requireText={h.name}
				onConfirm={() => {
					setPending(null);
					void run(writes.deleteHousehold(h.id).then((message) => {
						// Its page is gone with it, so the list is the only place
						// left to be. A refusal keeps you here to read it.
						if (! message) onBack();

						return message;
					}));
				}}
				onCancel={() => setPending(null)}
				dark={dark}
				theme={theme}
			/>
		</div>
	);
}

/** The one confirm that can be open. A union, so two never can be. */
type Pending =
	| { kind: 'remove'; id: string; name: string }
	| { kind: 'revoke'; id: string; role: string }
	| { kind: 'delete' };

/**
 * `overflow` is a prop because one card cannot afford to clip.
 *
 * Every card here rounds its corners with `overflow-hidden`, which is what
 * makes a full-width row inside it stop at the radius. The Members card holds
 * the role menu, and a popover inside a clipped box is cropped at the card's
 * edge — the boards mark that card `menuhost { overflow:visible }` for exactly
 * this reason. It costs the clip on that one card, whose rows are inset anyway.
 */
function Card({
	children, clip = true, ref, theme,
}: {
	children: preact.ComponentChildren;
	clip?: boolean;
	/** Only the Members card takes one — the orphan dialog scrolls to it. */
	ref?: { current: HTMLDivElement | null };
	theme: Theme;
}) {
	return (
		<div
			ref={ref}
			class={`rounded-[20px] ${clip ? 'overflow-hidden' : 'overflow-visible'}`}
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

function Fact({ label, value, theme }: { label: string; value: string; theme: Theme }) {
	return (
		<span>
			{label}{' '}
			<b class="font-semibold ml-[5px]" style={{ color: theme.textStrong }}>{value}</b>
		</span>
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

/**
 * The line the console will not cross, said out loud on the page it governs.
 *
 * **Not an empty state and not a warning.** It takes no status colour and no
 * amber: nothing is wrong, and amber would ask somebody to fix a problem they
 * do not have. It is the same argument the 404 disc makes one board along.
 */
function Boundary({ theme }: { theme: Theme }) {
	return (
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
			<div class="min-w-0 flex flex-col gap-2.5">
				<span class="text-[15px] font-semibold" style={{ color: theme.textStrong }}>
					Items aren’t visible here
				</span>
				<p class="m-0 text-[14px] leading-[1.5]" style={{ color: theme.textMuted }}>
					The console shows how much a household holds, never what. If someone needs
					help with their pantry they need a person inside the household — support is
					not a reason to read someone’s shelves.
				</p>
				<p
					class="m-0 pt-2.5 text-[13.5px] leading-[1.5]"
					style={{ borderTop: `1px solid ${theme.divider}`, color: theme.textMuted }}
				>
					Everything on this page is a count, a name, or a date. If a field ever
					isn’t one of those three, it doesn’t belong here.
				</p>
			</div>
		</div>
	);
}

/**
 * One member: a face, a name, a role and a date.
 *
 * **No email, and there is none to show.** The boards put one under every name;
 * a Spacefast account carries no `email` claim and a handler is only ever told
 * about its caller (D56), so no part of this app has ever held another person's
 * address. The join date takes the line instead, which is a date and therefore
 * something this page is allowed to say.
 *
 * **The role word is the trigger**, the same component the drawer's Members pane
 * uses, re-skinned for cream by its own `onDark` — the one component in the
 * console that changes surface, and the existing rule picked which.
 *
 * It appears on **every** row, including an owner's, which the app's own copy of
 * this menu never does: there it is hidden on your own row because you cannot
 * change your own role, and the person you are looking at is therefore never the
 * last owner. An administrator is in neither position, so the last-owner case is
 * reachable here for the first time — and it is refused server-side with a
 * sentence rather than hidden behind a disabled row (D36).
 */
function MemberRow({
	member, menuOpen, setMenuOpen, onOpen, onChangeRole, onRemove, held, theme,
}: {
	member: AdminMember;
	held: boolean;
	menuOpen: boolean;
	setMenuOpen: (open: boolean) => void;
	onOpen: () => void;
	onChangeRole: (role: Role) => void;
	onRemove: () => void;
	theme: Theme;
}) {
	return (
		<div
			class="flex items-center"
			style={{ borderTop: `1px solid ${theme.divider}` }}
		>
			{/*
			  * The row is two controls, not one, and that is forced rather than
			  * chosen: the role trigger is a button, so the whole-row form the
			  * account page's household rows take would nest one button inside
			  * another. The left part opens the person and carries the padding,
			  * the fill and the chevron; the trigger keeps its own hit area
			  * outside it, which is also what stops a press on *Owner* from
			  * navigating away from the menu it just opened.
			  */}
			<button
				onClick={onOpen}
				class={`flex-1 min-w-0 flex items-center gap-3 text-left px-5 py-3 ${ADMIN_ROW}`}
				aria-label={`${member.name || 'Someone'} — open this account`}
			>
				<DrawerAvatar name={member.name} picture={member.picture} size={34} />
				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="truncate text-[15px] font-semibold" style={{ color: theme.textStrong }}>
						{member.name || 'Someone'}
					</span>
					<span class="truncate text-meta" style={{ color: theme.textMuted }}>
						Joined {usDate(member.joinedAt)}
					</span>
				</span>
				<ChevronRight size={15} class="shrink-0" style={{ color: theme.textFaint }} />
			</button>
			<span class="shrink-0 pl-3 pr-5">
				<RoleMenu
					open={menuOpen}
					setOpen={setMenuOpen}
					memberName={member.name || 'this member'}
					role={member.role as Role}
					onChangeRole={onChangeRole}
					onRemove={onRemove}
					onDark={false}
					/* Both writes behind this menu — the role change and *Remove
					  * from household* — are held, and they share one trigger. */
					held={held}
					theme={theme}
				/>
			</span>
		</div>
	);
}

/**
 * One live invite: a role, two dates and who issued it.
 *
 * **The code is not here and will not be.** The boards print
 * `larderlog.app/?join=k3f9d2a7b1c8…` on this card. A code *is* the
 * authorization (D39) — whoever holds one can join — so showing it would hand
 * every administrator a silent route into any pantry in the space, which is the
 * exact thing the card in the other column promises the console does not do.
 * Deleting a household is loud, recorded and irreversible; quietly joining one
 * is none of those, which is what makes it the worse power to hand out.
 */
function InviteRow({
	invite, onRevoke, held, theme,
}: {
	invite: AdminInvite;
	held: boolean;
	onRevoke: () => void;
	theme: Theme;
}) {
	const days = invite.expiresAt
		? daysBetween(new Date().toISOString(), invite.expiresAt)
		: null;

	return (
		<div
			class="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 px-5 py-3"
			style={{ borderTop: `1px solid ${theme.divider}` }}
		>
			<span class="flex-1 min-w-[160px] flex flex-col gap-px">
				<span class="truncate text-[15px] font-semibold" style={{ color: theme.textStrong }}>
					{ROLE_LABELS[invite.role as Role] ?? invite.role}
				</span>
				<span class="truncate text-meta" style={{ color: theme.textMuted }}>
					{/* A member who has left resolves to no name at all, and the row
					  * says so rather than printing a bare user id. */}
					Issued {usDate(invite.issuedAt)} by {invite.issuedBy || 'someone who has left'}
				</span>
			</span>
			<span class="shrink-0 text-[13px] text-right" style={{ color: theme.textMuted }}>
				{/* A countdown inside the console, the way the app's own invite
				  * cards read it — the `?join=` landing keeps its date, because
				  * that screen is the one being handed to a stranger. */}
				{! invite.expiresAt ? 'Never expires'
					: days === null ? 'Expiry unknown'
					: days <= 0 ? 'Expires today'
					: `Expires in ${days} ${days === 1 ? 'day' : 'days'}`}
			</span>

			{/*
			  * Crimson text on nothing, again — the app's one way of *offering*
			  * something destructive. Revoking reaches a link somebody else is
			  * holding, so it asks (D36): it is not an undo, and there is nothing
			  * to bring back.
			  */}
			<button
				onClick={onRevoke}
				disabled={held}
				class={`shrink-0 h-11 md:h-8 px-2 -mr-2 rounded-[9px] text-[13.5px] font-semibold ${PAGE_GHOST_DANGER} ${PAGE_HELD}`}
				aria-label={`Revoke the ${invite.role} invite issued ${usDate(invite.issuedAt)}`}
			>
				Revoke
			</button>
		</div>
	);
}

function Flag({ label, tint, theme }: { label: string; tint: string; theme: Theme }) {
	return (
		<span
			class="px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-[0.09em]"
			style={{ color: tint, border: `1px solid ${tint}`, background: theme.surfaceAlt }}
		>
			{label}
		</span>
	);
}

/** Shared with the list. See the note there — `Never` is honest, not a blank. */
function lastActiveWords(iso: string): string {
	const days = daysBetween(iso, new Date().toISOString());

	if (days === null) return 'never';
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;
	if (days >= DORMANT_DAYS) return `${Math.floor(days / 30)} months ago`;

	return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'} ago`;
}
