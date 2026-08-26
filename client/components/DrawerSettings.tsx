import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ChevronUp, LogOut, Pencil } from 'lucide-preact';

import { HouseholdIdentity } from './HouseholdIdentity';
import { HouseholdTile } from './HouseholdTile';
import { MembersPanel } from './MembersPanel';
import { TermPanel } from './TermPanel';
import { InvitesPanel } from './InvitesPanel';
import type { Theme } from '../lib/theme';
import { drawerTheme } from '../lib/theme';
import { DRAWER_BUTTON, DRAWER_CHIP, DRAWER_CHIP_ON, DRAWER_GHOST_DANGER, DRAWER_ICON, DRAWER_INPUT } from '../lib/controlStyles';
import type { Invite, Member, ThemeOverride } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can } from '../../shared/roles';
import { isQty } from '../../shared/qty';

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
	defaultThreshold: string;
	setDefaultThreshold: (value: string) => void;
	accountName: string;
	accountEmail: string;
	onSignOut: () => void;
	members: Member[];
	invites: Invite[];
	me: { membershipId: string; role: Role };
	onCreateInvite: (role: Role) => void;
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
	/** Bumped to unfold Members — where a blocked "last owner" dialog sends you. */
	openMembers: number;
	theme: Theme;
};

/**
 * A settings section: the label treatment the filter pane uses, and the same
 * chevron.
 *
 * `collapsible` is opt-in. Account and Household are two lines each and folding
 * them would hide less than the control to unfold them; Members and Invites can
 * both run long, so those fold.
 */
function Section({
	title, theme, collapsible = false, defaultOpen = true, openSignal, children,
}: {
	title: string;
	theme: Theme;
	collapsible?: boolean;
	defaultOpen?: boolean;
	/** Bumped to force this section open. A counter, so twice in a row still works. */
	openSignal?: number;
	children: ComponentChildren;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const d = theme.drawer;

	// Skips the first run — a section that is already open does not need
	// unfolding, and `defaultOpen` has had its say by then.
	const seen = useRef(openSignal);

	useEffect(() => {
		if (openSignal === seen.current) return;

		seen.current = openSignal;
		setOpen(true);
	}, [openSignal]);
	const shown = ! collapsible || open;

	return (
		<section class="flex flex-col gap-2.5">
			<div class="flex items-center justify-between">
				<p class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: d.label }}>{title}</p>
				{collapsible && (
					<button
						onClick={() => setOpen((v) => ! v)}
						class={`flex items-center justify-center w-7 h-7 ${DRAWER_ICON}`}
						aria-expanded={open}
						aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
					>
						<ChevronUp
							size={14}
							style={{ color: '#6E5F4B', transform: open ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }}
						/>
					</button>
				)}
			</div>
			{shown && children}
		</section>
	);
}

/**
 * The Settings pane, inside the drawer.
 *
 * Order is fixed by the spec — Account, Household, Members, Appearance, Default
 * threshold, **Invites last** — because inviting someone is the one action here
 * that reaches another person, and it should not sit above the things you
 * change every week.
 *
 * There is deliberately no terms block (they live in the Filter pane now) and
 * no shopping list — it is a mode of the content column, reached from the top
 * bar and nowhere else (D41).
 */
export function DrawerSettings({
	themeOverride, setThemeOverride, householdName, setHouseholdName,
	householdInk, setHouseholdInk,
	defaultThreshold, setDefaultThreshold,
	accountName, accountEmail, onSignOut,
	members, invites, me, onCreateInvite, onRevokeInvite, onChangeRole, onRemoveMember,
	onLeaveHousehold, leaveLabel, openMembers, theme,
}: Props) {
	const d = theme.drawer;
	/* Panels paint from a Theme; hand them one whose surfaces are the drawer's. */
	const inner = drawerTheme(theme);
	const [editing, setEditing] = useState(false);
	const [nameDraft, setNameDraft] = useState(householdName);
	const [creatingInvite, setCreatingInvite] = useState(false);

	/*
	 * A draft, committed on blur — the same treatment the name gets, and for a
	 * sharper reason. Writing on every keystroke sent the empty string the
	 * moment you cleared the field to retype, and `normalizeQty('')` is "0": a
	 * household whose new items all start out already low.
	 */
	const [thresholdDraft, setThresholdDraft] = useState(defaultThreshold);

	useEffect(() => { setThresholdDraft(defaultThreshold); }, [defaultThreshold]);

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

	/** Anything that isn't a quantity snaps back rather than being clamped to 0. */
	function commitThreshold() {
		const next = thresholdDraft.trim();

		if (! isQty(next)) {
			setThresholdDraft(defaultThreshold);
			return;
		}

		if (next !== defaultThreshold) setDefaultThreshold(next);
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

	return (
		<div class="flex flex-col gap-[26px] px-5 pt-6 pb-6">
			<Section title="Account" theme={theme}>
				<div class="flex items-center gap-3">
					<span
						class="flex items-center justify-center w-[46px] h-[46px] rounded-full font-disp text-[19px] font-bold shrink-0"
						style={{ background: '#4A3E2E', boxShadow: 'inset 0 0 0 1px #63533E', color: '#E8DCC6' }}
					>
						{(accountName || '?').charAt(0).toUpperCase()}
					</span>
					<span class="flex-1 min-w-0 flex flex-col gap-px">
						<span class="font-disp text-[18px] font-semibold truncate" style={{ color: d.ink }}>{accountName || 'Account'}</span>
						<span class="text-xs truncate" style={{ color: d.inkFaint }}>{accountEmail || 'Not signed in'}</span>
					</span>
				</div>
				<button
					onClick={onSignOut}
					class={`self-start flex items-center gap-2 h-[38px] px-[15px] rounded-[11px] text-[13.5px] font-medium ${DRAWER_BUTTON}`}
				>
					<LogOut size={15} /> Sign out
				</button>
			</Section>

			<Section title="Household" theme={theme}>
				{/*
				  * Read state with a pencil, not a live field. A text input that is
				  * always armed invites an accidental rename of the one name every
				  * member sees — and the same goes for the colour beside it.
				  *
				  * The pencil already existed and had nothing to edit but the name.
				  * It now flips the section into the Filter tab's editing panel,
				  * one row deep (D42): no add row and no trash, because a household
				  * is one row rather than a list, and leaving is a different verb
				  * with its own control below.
				  *
				  * **No tile preview.** The spec asks for one on the grounds that
				  * the tile is somewhere else while you are in Settings. It is not:
				  * the drawer's own household row is directly above this panel and
				  * carries the tile, so a preview would be a second copy of a thing
				  * already on screen.
				  */}
				{editing && mayEditSettings ? (
					<TermPanel label="Household" mode="editing" onDone={commitName} onDark theme={theme}>
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
					<div class="flex items-center gap-2.5 pl-0.5 pr-1">
						<HouseholdTile ink={householdInk} name={householdName} size={34} dark={theme.dark} />
						<span class="flex-1 min-w-0 font-disp text-[19px] font-semibold truncate" style={{ color: d.ink }}>
							{householdName || 'Your household'}
						</span>
						{mayEditSettings && (
							<button
								onClick={() => { setNameDraft(householdName); setEditing(true); }}
								class={`shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-[10px] ${DRAWER_CHIP}`}
								title="Edit name and colour"
							>
								<Pencil size={15} />
							</button>
						)}
					</div>
				)}

				{/*
				  * Leaving lives here, at the foot of Household — not in a block of
				  * its own after Invites, which would break *Invites last*.
				  *
				  * Ghost with crimson text: this is how a destructive action is
				  * **offered**. Executing it is the dialog's ink/cream primary, and
				  * crimson is never a button.
				  */}
				<button
					onClick={onLeaveHousehold}
					class={`self-start flex items-center gap-2 h-[38px] px-[15px] -ml-[15px] rounded-[11px] text-[13.5px] font-medium ${DRAWER_GHOST_DANGER}`}
				>
					<LogOut size={15} /> {leaveLabel}
				</button>
			</Section>

			<Section title="Members" theme={theme} collapsible openSignal={openMembers}>
				<MembersPanel
					members={members} me={me}
					onChangeRole={onChangeRole} onRemoveMember={onRemoveMember}
					theme={inner}
				/>
			</Section>

			<Section title="Appearance" theme={theme}>
				<div class="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: d.well }}>
					{THEME_OPTIONS.map((opt) => (
						<button
							key={opt.key}
							onClick={() => setThemeOverride(opt.key)}
							class={`h-[34px] rounded-[9px] text-[13.5px] ${themeOverride === opt.key ? DRAWER_CHIP_ON : 'transition-colors text-on-dark-faint font-medium hover:text-on-dark hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset'}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			</Section>

			<Section title="Default low-stock threshold" theme={theme}>
				{mayEditSettings ? (
					<input
						value={thresholdDraft}
						onInput={(e) => setThresholdDraft(e.currentTarget.value)}
						onBlur={commitThreshold}
						onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						inputMode="decimal"
						class={`h-10 px-3 rounded-[10px] text-[15px] w-24 ${DRAWER_INPUT}`}
						aria-label="Default low-stock threshold"
					/>
				) : (
					<span class="font-disp text-[19px] font-semibold" style={{ color: d.ink }}>{defaultThreshold}</span>
				)}
				<p class="text-[12.5px] leading-[1.45]" style={{ color: d.label }}>
					What a new item starts at, until you change it on the item itself.
				</p>
			</Section>

			{/* Invites last: the only thing here that reaches another person. */}
			<Section title="Invites" theme={theme} collapsible>
				<InvitesPanel
					invites={invites} myRole={me.role}
					onCreate={createInvite} onRevoke={onRevokeInvite} creating={creatingInvite}
					theme={inner}
				/>
			</Section>
		</div>
	);
}
