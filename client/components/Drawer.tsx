import type { ComponentProps } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronRight, ChevronsUpDown, ListFilter, PanelLeftClose, Settings } from 'lucide-preact';

import { AccountMenu } from './AccountMenu';
import { AdminPane, type AdminSection } from './AdminPane';
import { DrawerAvatar } from './DrawerAvatar';
import { DrawerMenu } from './DrawerMenu';
import { FilterSection } from './DrawerFilters';
import { DrawerSettings } from './DrawerSettings';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { HouseholdTile } from './HouseholdTile';
import { useDismiss } from '../hooks/useDismiss';
import { useScrollLock } from '../hooks/useScrollLock';
import type { Theme } from '../lib/theme';
import { drawerTheme } from '../lib/theme';
import type { TermFilter } from '../lib/actions';
import { DRAWER_CHIP, DRAWER_ICON, DRAWER_ROW, DRAWER_SEGMENT_ON } from '../lib/controlStyles';
import type { SourceKind } from '../../shared/source';
import { sourceGroupWord } from '../../shared/source';
import type { HouseholdSummary, Item, Source, Term, TermKind } from '../../shared/types';

export type DrawerTab = 'filter' | 'settings';

type Props = {
	items: Item[];
	locations: Term[];
	types: Term[];
	stores: Source[];
	locationFilter: TermFilter;
	typeFilter: TermFilter;
	storeFilter: TermFilter;
	/**
	 * How many items reference a term, for the chips and the editing rows.
	 *
	 * One function rather than three maps: the count means the same thing in
	 * every section now that the trash is live on all of them (D36), and three
	 * maps invited exactly the drift where only Location had one.
	 */
	countFor: (kind: TermKind, id: string) => number;
	anyFilterActive: boolean;
	onClearAll: () => void;

	tab: DrawerTab;
	setTab: (tab: DrawerTab) => void;
	/** Mobile only: whether the slide-over is showing. */
	open: boolean;
	onClose: () => void;
	/** Desktop: whether the drawer is folded away entirely. */
	collapsed: boolean;
	/**
	 * The one dismiss control. Closes the slide-over on mobile and folds the
	 * drawer on desktop — the same button in the same place doing the thing
	 * that makes sense at that size.
	 */
	onDismiss: () => void;

	householdName: string;
	/** Every household the caller belongs to, for the switcher popover (D33). */
	households: HouseholdSummary[];
	currentHouseholdId: string;
	onSelectHousehold: (id: string) => void;
	/** The household's colour token, resolved by the server (D42). */
	householdInk: string;
	onNewHousehold: () => void;
	onJoinHousehold: (code: string) => Promise<string | null>;

	/*
	 * The account lives at the drawer's foot, not in the Settings pane — which
	 * is why these four are the drawer's own props rather than part of
	 * `settings`. There is no Account block any more: the row below is the one
	 * place you appear, and it opens a menu.
	 */
	accountName: string;
	accountEmail: string;
	/** The Gravatar image, where the account has one. */
	accountPicture?: string;
	/** Renames the account. Absent for the dev guest, who has no account row. */
	onSetDisplayName?: (name: string) => void;
	onSignOut: () => void;

	/** Everything the Settings pane needs, passed through untouched. */
	settings: Omit<ComponentProps<typeof DrawerSettings>, 'theme' | 'membersOpen' | 'setMembersOpen'>;
	/**
	 * Bumped to push the Members pane — where a blocked "last owner" dialog
	 * sends you. A counter, so twice in a row still works.
	 */
	openMembers: number;

	/*
	 * The admin console, pushed one level above the Settings tab rather than
	 * inside it. Everything here is `undefined` for the overwhelming majority
	 * of accounts, which is what keeps the console out of their menu entirely.
	 */
	/** Whether the console pane is showing, and which section it is on. */
	adminSection: AdminSection | null;
	setAdminSection: (section: AdminSection) => void;
	/** Absent unless the caller administers the space. Draws the menu's row. */
	onOpenAdmin?: () => void;
	onCloseAdmin: () => void;

	/**
	 * `sourceKind` is the store group's alone — a location and a type have no
	 * kind to compose, and pass nothing.
	 */
	onCreateTerm: (
		kind: 'location' | 'type' | 'store',
		name: string,
		ink: string,
		sourceKind?: SourceKind
	) => Promise<string | null>;
	onRenameTerm: (kind: 'location' | 'type' | 'store', id: string, name: string) => void;
	onRecolorTerm: (kind: 'location' | 'type' | 'store', id: string, token: string) => void;
	onDeleteTerm: (kind: 'location' | 'type' | 'store', id: string) => void;
	/** Shop, grow or make — the source group's own control (D58). */
	onSetSourceKind: (id: string, kind: SourceKind) => void;
	/** `taxonomy:write`. Gates the pencil and the dashed add chip (D30). */
	canEditTaxonomy: boolean;
	/** Bumped to fold every editing panel — see `FilterSection`. */
	closeEditing: number;

	theme: Theme;
};

/**
 * The one left drawer: filters and settings, docked on desktop and a slide-over
 * on mobile.
 *
 * It is the same component at both sizes, per the spec — a slide-over with a
 * scrim under `md`, 340px docked above it. Two implementations would be
 * two things to keep in sync, and the only real difference is whether it
 * participates in the page's flow.
 *
 * The drawer stays dark in both themes. It is the darkest surface on the page,
 * and in dark mode it drops *below* the content ground rather than inverting —
 * so it carries `theme.drawer` rather than the page ramp.
 */
export function Drawer({
	items, locations, types, stores,
	locationFilter, typeFilter, storeFilter,
	countFor, anyFilterActive, onClearAll,
	tab, setTab, open, onClose, collapsed, onDismiss,
	householdName, householdInk, households, currentHouseholdId,
	onSelectHousehold, onNewHousehold, onJoinHousehold,
	accountName, accountEmail, accountPicture, onSetDisplayName, onSignOut,
	settings, openMembers,
	adminSection, setAdminSection, onOpenAdmin, onCloseAdmin,
	onCreateTerm, onRenameTerm, onRecolorTerm, onDeleteTerm, onSetSourceKind, canEditTaxonomy, closeEditing,
	theme,
}: Props) {
	/*
	 * `Store` or `Source` — the heading, the dashed chip and the composer's
	 * micro-label, all from one call (D58).
	 *
	 * Computed here rather than threaded from `Pantry`, and the item sheet and
	 * the rail each call it too. It is a pure function of the same array all
	 * three already hold, so there is no way for them to disagree — and a prop
	 * would have to be passed through three components to say something each of
	 * them can already work out.
	 */
	const sourceWord = sourceGroupWord(stores);
	const d = theme.drawer;
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);

	/*
	 * Whether the Settings pane is one level down, in Members.
	 *
	 * It lives here rather than in `DrawerSettings` because the tab bar has to
	 * go while it is pushed — a second-level pane that keeps a tab bar it does
	 * not belong to is its own kind of lie — and the wordmark row is the only
	 * chrome that survives.
	 */
	const [membersOpen, setMembersOpen] = useState(false);

	/*
	 * The same two dismissals `RailFlyout` gives the rail's menus, for the same
	 * reason: a popover that only closes by choosing something traps whoever
	 * opened it to look. Each ref wraps its **trigger as well as its panel**, so
	 * a press on the trigger never reaches the handler and its own toggle does
	 * the closing — see `useDismiss`.
	 */
	const switcherRef = useDismiss<HTMLDivElement>(switcherOpen, () => setSwitcherOpen(false));
	const accountRef = useDismiss<HTMLDivElement>(accountOpen, () => setAccountOpen(false));

	/*
	 * Where the blocked "last owner" dialog sends you. Skips the first run: the
	 * pane is closed on mount and has not been asked for.
	 */
	const seenOpenMembers = useRef(openMembers);

	useEffect(() => {
		if (openMembers === seenOpenMembers.current) return;

		seenOpenMembers.current = openMembers;
		setMembersOpen(true);
	}, [openMembers]);

	/*
	 * A household switch pops the pane. The members you were looking at belong
	 * to the household you left, and the pane has no header that could say so.
	 */
	useEffect(() => { setMembersOpen(false); }, [currentHouseholdId]);

	/*
	 * The slide-over covers the column it slid over, so the column stops
	 * scrolling behind it. `open` is the mobile flag — `Pantry` clears it above
	 * the dock, where the drawer is part of the layout and the page behind it is
	 * the page you are using.
	 */
	useScrollLock(open);

	/*
	 * Only pushed while Settings is the tab showing it. The rail's *Open full
	 * filters* sets the tab from outside, and without this the Filter pane would
	 * render under a hidden tab bar — a screen with no way off it.
	 */
	const pushed = membersOpen && tab === 'settings';

	/*
	 * The console is a level **above** the tabs, not a third one beside them.
	 *
	 * Members is pushed out of Settings and belongs to it, so it is gated on
	 * `tab === 'settings'`. The console belongs to the account, arrives from the
	 * account menu, and is not about the household the tabs filter and
	 * configure — so while it is open the switcher and the tabs both go, and the
	 * Filter tab is not sitting behind it waiting to be returned to.
	 */
	const adminOpen = adminSection !== null;

	return (
		<>
			{/* Scrim: mobile only, and only while open. */}
			{open && (
				<button
					onClick={onClose}
					class="min-[1120px]:hidden fixed inset-0 z-30"
					style={{ background: 'rgba(15, 12, 8, 0.5)' }}
					aria-label="Close menu"
				/>
			)}

			<aside
				class={
					/*
					 * Docked from `xl` (1280) up, a slide-over below it. The rail is
					 * the drawer everywhere below that.
					 *
					 * 1120 is derived, not chosen. Docking spends 340px, so it must
					 * not drop the content column below what its current column count
					 * needs — otherwise widening the window *removes* a card.
					 *
					 * With a 320px card floor a track is 336, and the thresholds that
					 * survive that test are narrow: 1064–1128, then 1400–1464. No
					 * Tailwind breakpoint sits in either. `lg` (1024) costs a column
					 * 2 → 1, `xl` (1280) costs one 3 → 2, `2xl` (1536) costs one
					 * 4 → 3. 1120 is the middle of the lowest surviving band, which
					 * keeps the docked drawer available on ordinary laptops rather
					 * than pushing it out to 1400.
					 *
					 * **This number is a function of the card floor.** Change
					 * `minmax(320px,…)` in `Pantry` and it has to be re-derived.
					 */
										/*
					 * `h-dvh`, not `h-screen`. On mobile Chrome `100vh` is the *large*
					 * viewport — the one with the URL bar hidden — so a full-height
					 * fixed drawer runs ~60px past what you can actually see, and that
					 * dead band is the tail of this column's scroll port. Anything
					 * pinned to the end of the Filter list was unreachable: opening a
					 * term's colour picker on the last row put the sixteen swatches
					 * below the fold with no scroll left to give.
					 */
					'fixed min-[1120px]:sticky top-0 left-0 z-40 h-dvh shrink-0 flex flex-col ' +
					/*
					 * The slide-over is fluid and the docked drawer is not. A flat 328
					 * left 62px of page beside it on a 390 screen and the pane itself
					 * cramped — the Members pane, the invite composer and the term rows
					 * are all specced against the docked 340 and were getting less than
					 * the desktop they were drawn for. `min(360px, 100vw - 32px)` is
					 * never narrower than the old flat value (they meet exactly at 360)
					 * and gains 30px at 390. The 32px floor is what keeps it reading as
					 * a panel over the page rather than a screen of its own: some of the
					 * scrim has to stay visible, and it is also the only place left to
					 * press to dismiss.
					 */
					'w-[min(360px,calc(100vw_-_32px))] min-[1120px]:w-[340px] transition-transform duration-200 ' +
					(open ? 'translate-x-0' : '-translate-x-full min-[1120px]:translate-x-0') +
					(collapsed ? ' min-[1120px]:hidden' : '')
				}
				style={{ background: d.bg }}
			>
				<div class="flex items-center justify-between gap-3 pt-6 pl-[22px] pr-5">
					<span class="font-disp text-wordmark font-extrabold leading-[1.08] tracking-[-0.015em]" style={{ color: d.ink }}>
						Larder <span class="italic" style={{ color: '#D4636B' }}>Log</span>
					</span>
					{/*
					  * The collapsed desktop rail is not drawn in the spec, so folding
					  * hands the reopen control to the main column's menu button rather
					  * than inventing a rail to hold it.
					  */}
					<button
						onClick={onDismiss}
						class={`flex items-center justify-center w-[34px] h-[34px] rounded-[10px] shrink-0 ${DRAWER_CHIP}`}
						aria-label="Collapse menu"
					>
						<PanelLeftClose size={17} />
					</button>
				</div>

				{/*
				  * The switcher the spec draws, now that a user may belong to more
				  * than one household (D33). It stays a button with a single
				  * household too — that is where *New household* and *Join with
				  * a code or link* live, and hiding them until you already had
				  * two would mean there was no way to get the second one.
				  */}
				{! pushed && ! adminOpen && (
				<div class="relative mx-5 mt-3.5" ref={switcherRef}>
					<button
						onClick={() => setSwitcherOpen((v) => ! v)}
						class="flex items-center gap-2.5 w-full px-3 h-12 rounded-[13px] text-left transition-colors hover:bg-drawer-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset"
						style={{ background: d.raised, border: `1px solid #423728` }}
						aria-expanded={switcherOpen}
						aria-haspopup="dialog"
					>
						<HouseholdTile ink={householdInk} name={householdName} size={30} dark={theme.dark} />
						<span class="flex-1 min-w-0 flex flex-col gap-px">
							<span class="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: d.label }}>Household</span>
							<span class="text-sm truncate" style={{ color: d.ink }}>{householdName || 'Your household'}</span>
						</span>
						<ChevronsUpDown size={15} class="shrink-0" style={{ color: d.inkFaint }} />
					</button>

					{switcherOpen && (
						<div
							role="dialog"
							aria-label="Switch household"
							class="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[60vh] overflow-y-auto rounded-2xl p-2 bg-drawer-well border border-drawer-line shadow-2xl"
						>
							<HouseholdSwitcher
								households={households}
								currentId={currentHouseholdId}
								onSelect={onSelectHousehold}
								onNewHousehold={onNewHousehold}
								onJoin={onJoinHousehold}
								dark={theme.dark}
								onDone={() => setSwitcherOpen(false)}
							/>
						</div>
					)}
				</div>
				)}

				{/*
				  * The tabs go while the Members pane is pushed. Back is the only way
				  * out of a second-level pane, and leaving a tab bar over one would
				  * offer a sideways exit from somewhere nobody arrived sideways.
				  */}
				{! pushed && ! adminOpen && (
				<div class="grid grid-cols-2 gap-1 mx-5 mt-[18px] p-1 rounded-xl" style={{ background: d.well }}>
					{([['filter', 'Filter', ListFilter], ['settings', 'Settings', Settings]] as const).map(([key, label, Icon]) => (
						<button
							key={key}
							onClick={() => setTab(key)}
							class={`flex items-center justify-center gap-[7px] h-[34px] rounded-[9px] text-[13.5px] ${tab === key ? DRAWER_SEGMENT_ON : 'transition-colors text-on-dark-faint font-medium hover:text-on-dark hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset'}`}
						>
							<Icon size={14} /> {label}
						</button>
					))}
				</div>
				)}

				<div class="flex-1 min-h-0 overflow-y-auto">
					{adminOpen ? (
						<AdminPane
							section={adminSection}
							onSelect={setAdminSection}
							onBack={onCloseAdmin}
							theme={theme}
						/>
					) : tab === 'filter' ? (
						<div class="flex flex-col gap-[17px] px-5 pt-5 pb-5">
							<FilterSection
								title="Location" entities={locations}
								filter={locationFilter}
								leadingAll={{ label: 'All items', count: items.length }}
								countFor={(id) => countFor('location', id)}
								onCreate={(n, ink) => onCreateTerm('location', n, ink)}
								onRename={(id, n) => onRenameTerm('location', id, n)}
								onRecolor={(id, t) => onRecolorTerm('location', id, t)}
								onDelete={(id) => onDeleteTerm('location', id)}
								canEdit={canEditTaxonomy} closeEditing={closeEditing} theme={theme}
							/>
							<FilterSection
								title={sourceWord} entities={stores}
								filter={storeFilter}
								countFor={(id) => countFor('store', id)}
								onCreate={(n, ink, k) => onCreateTerm('store', n, ink, k)}
								onRename={(id, n) => onRenameTerm('store', id, n)}
								onRecolor={(id, t) => onRecolorTerm('store', id, t)}
								onDelete={(id) => onDeleteTerm('store', id)}
								onSetKind={onSetSourceKind}
								canEdit={canEditTaxonomy} closeEditing={closeEditing} theme={theme}
							/>
							<FilterSection
								title="Type" entities={types}
								filter={typeFilter}
								countFor={(id) => countFor('type', id)}
								onCreate={(n, ink) => onCreateTerm('type', n, ink)}
								onRename={(id, n) => onRenameTerm('type', id, n)}
								onRecolor={(id, t) => onRecolorTerm('type', id, t)}
								onDelete={(id) => onDeleteTerm('type', id)}
								canEdit={canEditTaxonomy} closeEditing={closeEditing} theme={theme}
							/>

							{anyFilterActive && (
								<button
									onClick={onClearAll}
									class={`self-start text-[13px] px-2 py-1 -ml-2 rounded-md ${DRAWER_ICON}`}
								>
									Clear all filters
								</button>
							)}
						</div>
					) : (
						<DrawerSettings {...settings} membersOpen={membersOpen} setMembersOpen={setMembersOpen} theme={theme} />
					)}
				</div>

				{/*
				  * You, at the foot of the drawer — avatar, display name, email,
				  * chevron. **It opens a menu, not a section**: the Settings pane it
				  * used to walk into has no Account block any more, because the thing
				  * that block held already had to exist for the collapsed rail. One
				  * component, two states of the drawer.
				  */}
				<div class="relative shrink-0" ref={accountRef}>
					{accountOpen && (
						<DrawerMenu
							label="Account"
							role="dialog"
							/* 292 as drawn, clamped: it does not fit inside the
							 * narrowest slide-over's gutters, and the gutter is the
							 * pane's own — the menu lines up with everything else
							 * in the column rather than with the row it opens from. */
							width="min(292px, calc(100% - 40px))"
							place="left-5 bottom-full mb-2"
							theme={theme}
						>
							<AccountMenu
								name={accountName}
								email={accountEmail}
								picture={accountPicture}
								onRename={onSetDisplayName}
								onOpenAdmin={onOpenAdmin}
								onSignOut={onSignOut}
								onDone={() => setAccountOpen(false)}
								theme={drawerTheme(theme)}
							/>
						</DrawerMenu>
					)}
					<button
						onClick={() => setAccountOpen((v) => ! v)}
						class={`flex items-center gap-[11px] w-full px-5 py-3.5 text-left ${DRAWER_ROW}`}
						style={{ borderTop: `1px solid ${d.line}` }}
						aria-haspopup="dialog"
						aria-expanded={accountOpen}
					>
						{/* The cream ring marks the avatar as what opened the menu. */}
						<DrawerAvatar name={accountName} picture={accountPicture} size={32} ring={accountOpen} />
						<span class="flex-1 min-w-0 flex flex-col gap-px">
							<span class="text-body truncate" style={{ color: d.ink }}>{accountName || 'Account'}</span>
							{/* Absent, not blank. The dev guest has no email, and an
							  * empty second line pushes the name off centre. */}
							{accountEmail && (
								<span class="text-meta truncate" style={{ color: d.label }}>{accountEmail}</span>
							)}
						</span>
						<ChevronRight size={16} class="shrink-0" style={{ color: d.inkFaint }} />
					</button>
				</div>
			</aside>
		</>
	);
}
