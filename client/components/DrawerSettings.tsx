import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ChevronRight, LogOut, Minus, Pencil, Plus } from 'lucide-preact';

import { DrawerAvatar } from './DrawerAvatar';
import { HouseholdIdentity } from './HouseholdIdentity';
import { InstallRow } from './InstallRow';
import { MembersPane } from './MembersPane';
import { TermPanel } from './TermPanel';
import type { Theme } from '../lib/theme';
import { drawerTheme } from '../lib/theme';
import {
	DRAWER_CARD_ROW, DRAWER_CHIP_ON, DRAWER_GHOST_DANGER, DRAWER_STEPPER, DRAWER_SUNK,
} from '../lib/controlStyles';
import type { Invite, Member, ThemeOverride } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can } from '../../shared/roles';
import { fromInt, toInt } from '../../shared/qty';

const THEME_OPTIONS: { key: ThemeOverride; label: string }[] = [
	{ key: 'system', label: 'Auto' },
	{ key: 'light', label: 'Light' },
	{ key: 'dark', label: 'Dark' },
];

type Props = {
	themeOverride: ThemeOverride;
	setThemeOverride: (value: ThemeOverride) => void;
	householdName: string;
	setHouseholdName: (value: string) => void;
	/** The household's colour token, already resolved by the server (D42). */
	householdInk: string;
	setHouseholdInk: (value: string) => void;
	/** What the Household block reports in meta — the pantry's size, not a filter's. */
	itemCount: number;
	defaultThreshold: string;
	setDefaultThreshold: (value: string) => void;
	members: Member[];
	invites: Invite[];
	me: { membershipId: string; role: Role };
	onCreateInvite: (role: Role) => unknown;
	onRevokeInvite: (inviteId: string) => void;
	onChangeRole: (membershipId: string, role: Role) => void;
	onRemoveMember: (membershipId: string) => void;
	/**
	 * Asks to leave. Which of the three cases you are in — leave, blocked on
	 * being the last owner, or delete because you are the last member — is
	 * decided by `Pantry`, which owns the dialog.
	 */
	onLeaveHousehold: () => void;
	/**
	 * What the row says, so it never promises something softer than it does.
	 *
	 * *Delete household* when you are its only member: leaving would destroy it,
	 * and a row labelled *Leave* that deletes a pantry is the worst kind of lie
	 * this screen could tell.
	 */
	leaveLabel: string;
	/**
	 * Whether the Members pane is pushed. Owned by `Drawer`, because the tab bar
	 * has to go while it is — the pane is a level down, not a third tab.
	 */
	membersOpen: boolean;
	setMembersOpen: (open: boolean) => void;
	theme: Theme;
};

/**
 * A settings block: a micro-label header over content on the drawer's raised
 * fill at radius 13.
 *
 * Nothing folds any more. The pane had two collapsible sections when it held
 * six of them and Members and Invites could each run long; both of those now
 * live one level down, and what is left is three blocks that are shorter than
 * the control to fold them.
 *
 * **The Filter tab deliberately does not share this at rest.** Boxing its chip
 * groups the same way was built and reverted: a settings block holds rows of one
 * value each and earns an edge, while a filter group is a cloud of chips that
 * already has one per chip. Three cards of chips read as clutter, and
 * `drawer-raised` is what the chips are made of, so they lost their own edge to
 * the card's. A group **being edited** takes the card, and that is consistent
 * rather than contradictory: the chips are gone by then, and what is inside is
 * rows of one value each.
 */
function Block({ title, theme, children }: { title: string; theme: Theme; children: ComponentChildren }) {
	return (
		<section class="flex flex-col gap-2.5">
			<p class="text-label font-bold uppercase tracking-[0.15em] pl-1" style={{ color: theme.drawer.label }}>
				{title}
			</p>
			{children}
		</section>
	);
}

/**
 * The Settings pane, inside the drawer.
 *
 * **Redesigned 27 Aug.** It had six labelled sections and printed the same two
 * facts three times over — you in Account, again in Members, again in the row at
 * the foot; the household in the switcher and again under its own heading.
 * Three rules replaced them:
 *
 * 1. **The household tile appears once**, in the switcher. Nothing here draws it.
 * 2. **You appear once**, in the row at the foot of the drawer — which is the
 *    `Drawer`'s, not this pane's. There is no Account block, and nothing says
 *    whether you are signed in: if you are reading it, you are.
 * 3. **Scope is in the label.** *Preferences* are yours and follow you between
 *    households; *Pantry settings* belong to the household you are in.
 *
 * The threshold moved out of Preferences under rule 3. It is a fact about the
 * pantry, not about the person looking at it — two people in one household who
 * disagree about it are disagreeing about the household, which is what makes it
 * a setting rather than a preference.
 *
 * Preferences sits above Pantry settings, which leaves Household and Pantry
 * settings non-adjacent even though both are household-scoped. Ordered
 * yours-first on purpose: Appearance is the one anyone actually changes.
 *
 * There is deliberately no terms block — they live in the Filter pane — and no
 * shopping list, which is a mode of the content column reached from the top bar
 * and nowhere else (D41).
 */
export function DrawerSettings({
	themeOverride, setThemeOverride, householdName, setHouseholdName,
	householdInk, setHouseholdInk, itemCount,
	defaultThreshold, setDefaultThreshold,
	members, invites, me, onCreateInvite, onRevokeInvite, onChangeRole, onRemoveMember,
	onLeaveHousehold, leaveLabel, membersOpen, setMembersOpen, theme,
}: Props) {
	const d = theme.drawer;
	/* Panels paint from a Theme; hand them one whose surfaces are the drawer's. */
	const inner = drawerTheme(theme);
	const [editing, setEditing] = useState(false);
	const [nameDraft, setNameDraft] = useState(householdName);
	const [creatingInvite, setCreatingInvite] = useState(false);

	/* An open rename does not belong to the household you switched to. */
	useEffect(() => { setEditing(false); }, [householdName]);

	/*
	 * The household name and the default threshold are both `updateHousehold`,
	 * which the server gates on `household:settings` — owner only. Their
	 * controls are absent rather than disabled for everyone else (D30); the
	 * values themselves still show, because they are information.
	 */
	const mayEditSettings = can(me.role, 'household:settings');

	/* One in flight at a time, so a double tap cannot mint two codes. */
	async function createInvite(role: Role) {
		if (creatingInvite) return;

		setCreatingInvite(true);
		await onCreateInvite(role);
		setCreatingInvite(false);
	}

	/**
	 * *Done* closes the panel and writes the name. The colour has already been
	 * written — a swatch press is a decision, and there is nothing to type after
	 * it — so this only has the field to reconcile.
	 *
	 * An emptied field snaps back rather than being saved: the server refuses a
	 * nameless household anyway, and the refusal would arrive as a banner over a
	 * panel that had already closed.
	 */
	function commitName() {
		const next = nameDraft.trim();
		if (next && next !== householdName) setHouseholdName(next);
		setEditing(false);
	}

	/**
	 * A stepper, not a field.
	 *
	 * The field it replaced was committed on blur, because writing on every
	 * keystroke sent the empty string the moment you cleared it to retype — and
	 * `normalizeQty('')` is "0", a household whose new items all start out
	 * already low. A stepper has no empty state to have that problem in.
	 */
	function stepThreshold(by: number) {
		setDefaultThreshold(fromInt(toInt(defaultThreshold) + by));
	}

	if (membersOpen) {
		return (
			<MembersPane
				householdName={householdName}
				members={members}
				invites={invites}
				me={me}
				onBack={() => setMembersOpen(false)}
				onCreateInvite={createInvite}
				onRevokeInvite={onRevokeInvite}
				onChangeRole={onChangeRole}
				onRemoveMember={onRemoveMember}
				creatingInvite={creatingInvite}
				theme={inner}
			/>
		);
	}

	const people = members.length === 1 ? '1 person' : `${members.length} people`;
	const out = invites.length === 0
		? ''
		: invites.length === 1 ? ' · 1 invite out' : ` · ${invites.length} invites out`;

	return (
		<div class="flex flex-col gap-[18px] px-5 pt-5 pb-6">
			<Block title="Household" theme={theme}>
				<div class="flex flex-col rounded-[13px]" style={{ background: d.raised, border: `1px solid ${d.line}` }}>
					{/*
					  * Read state with a pencil, not a live field. A text input that
					  * is always armed invites an accidental rename of the one name
					  * every member sees — and the same goes for the colour beside
					  * it. The pencil flips this row into the Filter tab's editing
					  * panel, one row deep (D42): no add row and no trash, because a
					  * household is one row rather than a list.
					  *
					  * **`flush`, because the panel is inside a card rather than
					  * inside a list.** In the Filter tab it floats in a column and
					  * earns a rounded box with a ring; here that box sat inside the
					  * Household card with the colour picker's well inside *it*, and
					  * three nested outlines on one screen say nothing the innermost
					  * one does not. So the fill runs edge to edge from the card's
					  * top corners down to the hairline above Members, which is the
					  * bottom edge it already had.
					  *
					  * **No tile preview.** The spec asks for one on the grounds that
					  * the tile is somewhere else while you are in Settings. It is
					  * not: the drawer's own switcher is directly above this pane and
					  * carries it.
					  */}
					{editing && mayEditSettings ? (
						<TermPanel label="Household" mode="editing" onDone={commitName} onDark flush theme={theme}>
							<HouseholdIdentity
								name={nameDraft}
								ink={householdInk}
								onName={setNameDraft}
								onInk={setHouseholdInk}
								onSubmit={commitName}
								autoFocus
								onDark
								theme={theme}
							/>
						</TermPanel>
					) : (
						<div class="flex items-center gap-2.5 pl-3.5 pr-3 py-[11px]">
							<span class="flex-1 min-w-0 flex flex-col gap-px">
								<span class="text-body truncate" style={{ color: d.ink }}>
									{householdName || 'Your household'}
								</span>
								<span class="text-meta" style={{ color: inner.textMuted }}>
									{itemCount === 1 ? '1 item' : `${itemCount} items`}
								</span>
							</span>
							{mayEditSettings && (
								<button
									onClick={() => { setNameDraft(householdName); setEditing(true); }}
									class={`shrink-0 flex items-center justify-center w-8 h-8 rounded-[10px] ${DRAWER_SUNK}`}
									aria-label="Edit household name and color"
								>
									<Pencil size={15} />
								</button>
							)}
						</div>
					)}

					<span class="block h-px" style={{ background: d.line }} />

					{/*
					  * Members is a row that pushes a pane, not a section. The three
					  * stacked avatars are the fastest thing to read on this screen —
					  * whether anyone else is in here at all — and the count says the
					  * rest.
					  */}
					<button
						onClick={() => setMembersOpen(true)}
						class={`flex items-center gap-3 pl-3.5 pr-3 py-[11px] text-left ${DRAWER_CARD_ROW}`}
					>
						<span class="flex items-center shrink-0">
							{members.slice(0, 3).map((m, i) => (
								<span key={m.id} class="flex" style={i > 0 ? { marginLeft: '-9px' } : undefined}>
									<DrawerAvatar name={m.displayName} picture={m.picture} size={28} stackRing={d.raised} />
								</span>
							))}
						</span>
						<span class="flex-1 min-w-0 flex flex-col gap-px">
							<span class="text-body truncate" style={{ color: d.ink }}>Members</span>
							<span class="text-meta truncate" style={{ color: inner.textMuted }}>{people}{out}</span>
						</span>
						<ChevronRight size={16} class="shrink-0" style={{ color: d.inkFaint }} />
					</button>

					<span class="block h-px" style={{ background: d.line }} />

					{/*
					  * Leaving is contained by the block it belongs to, under a
					  * hairline — rather than floating between two sections as a
					  * crimson row two rows into the pane.
					  *
					  * Ghost with crimson text: this is how a destructive action is
					  * **offered**. Executing it is the dialog's ink/cream primary,
					  * and crimson is never a button (D36).
					  */}
					<button
						onClick={onLeaveHousehold}
						class={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-b-[12px] text-left text-[14.5px] ${DRAWER_GHOST_DANGER}`}
					>
						<LogOut size={15} class="shrink-0" /> {leaveLabel}
					</button>
				</div>
			</Block>

			{/*
			  * Two rows, not two blocks. Installing is yours in exactly the way
			  * Appearance is, so it lands under it behind the block's own
			  * hairline rather than taking a fourth heading for one row — which
			  * is the argument the add/edit sheet already made for its off-list
			  * checkbox.
			  *
			  * `InstallRow` renders nothing at all where no install path exists,
			  * or where the app is already the installed app, so most of the time
			  * this block is what it was: Appearance alone, and no orphan rule
			  * under it.
			  */}
			<Block title="Preferences" theme={theme}>
				<div class="flex flex-col px-3 pt-3 pb-3.5 rounded-[13px]" style={{ background: d.raised, border: `1px solid ${d.line}` }}>
					<p class="text-[14.5px] pl-0.5 mb-2.5" style={{ color: d.inkMuted }}>Appearance</p>
					<div class="grid grid-cols-3 gap-1 p-1 rounded-[13px]" style={{ background: d.well }}>
						{THEME_OPTIONS.map((opt) => (
							<button
								key={opt.key}
								onClick={() => setThemeOverride(opt.key)}
								class={`h-9 rounded-[10px] text-[14.5px] ${themeOverride === opt.key ? DRAWER_CHIP_ON : 'transition-colors text-on-dark-muted hover:text-on-dark hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset'}`}
								aria-pressed={themeOverride === opt.key}
							>
								{opt.label}
							</button>
						))}
					</div>
					{/* Owns its own hairline, because it owns whether it exists at all. */}
					<InstallRow theme={theme} />
				</div>
			</Block>

			{/* Anything pantry-wide lands here. Today that is one row. */}
			<Block title="Pantry settings" theme={theme}>
				<div class="flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-[13px]" style={{ background: d.raised, border: `1px solid ${d.line}` }}>
					<span class="flex-1 min-w-0 flex flex-col gap-px">
						<span class="text-[14.5px]" style={{ color: d.inkMuted }}>New items are low at</span>
						<span class="text-[12.5px]" style={{ color: inner.textFaint }}>Change it per item any time</span>
					</span>
					{mayEditSettings ? (
						<span class="shrink-0 flex items-center gap-1 p-[3px] rounded-[10px]" style={{ background: d.well }}>
							{/* Faint at zero and never disabled — the item card's
							  * rule. The clamp is `fromInt`'s, and a disabled
							  * control cannot explain itself (D36). */}
							<button
								onClick={() => stepThreshold(-1)}
								class={`flex items-center justify-center w-[30px] h-[30px] ${DRAWER_STEPPER} ${toInt(defaultThreshold) === 0 ? 'text-on-dark-label hover:text-on-dark-label' : ''}`}
								aria-label="Lower the default low-stock threshold"
							>
								<Minus size={14} strokeWidth={2} />
							</button>
							<span class="min-w-[22px] text-center text-body font-semibold tabular-nums" style={{ color: d.ink }}>
								{defaultThreshold}
							</span>
							<button
								onClick={() => stepThreshold(1)}
								class={`flex items-center justify-center w-[30px] h-[30px] ${DRAWER_STEPPER}`}
								aria-label="Raise the default low-stock threshold"
							>
								<Plus size={14} strokeWidth={2} />
							</button>
						</span>
					) : (
						<span class="shrink-0 text-body font-semibold tabular-nums" style={{ color: d.ink }}>
							{defaultThreshold}
						</span>
				)}
				</div>
			</Block>
		</div>
	);
}
