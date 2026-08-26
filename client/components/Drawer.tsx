import type { ComponentProps } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronRight, ChevronsUpDown, ListFilter, PanelLeftClose, Settings } from 'lucide-preact';

import { FilterSection } from './DrawerFilters';
import { DrawerSettings } from './DrawerSettings';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { HouseholdTile } from './HouseholdTile';
import type { Theme } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_CHIP_ON, DRAWER_ICON, DRAWER_ROW } from '../lib/controlStyles';
import type { HouseholdSummary, Item, Term, TermKind } from '../../shared/types';

export type DrawerTab = 'filter' | 'settings';

type Props = {
	items: Item[];
	locations: Term[];
	types: Term[];
	stores: Term[];
	activeLocation: string | null;
	setActiveLocation: (id: string | null) => void;
	activeType: string | null;
	setActiveType: (id: string | null) => void;
	activeStore: string | null;
	setActiveStore: (id: string | null) => void;
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
	accountName: string;
	/** Everything the Settings pane needs, passed through untouched. */
	settings: Omit<ComponentProps<typeof DrawerSettings>, 'theme'>;

	onCreateTerm: (kind: 'location' | 'type' | 'store', name: string, ink: string) => Promise<string | null>;
	onRenameTerm: (kind: 'location' | 'type' | 'store', id: string, name: string) => void;
	onRecolorTerm: (kind: 'location' | 'type' | 'store', id: string, token: string) => void;
	onDeleteTerm: (kind: 'location' | 'type' | 'store', id: string) => void;
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
 * It is the same component at both sizes, per the spec — a 328px slide-over
 * with a scrim under `md`, 340px docked above it. Two implementations would be
 * two things to keep in sync, and the only real difference is whether it
 * participates in the page's flow.
 *
 * The drawer stays dark in both themes. It is the darkest surface on the page,
 * and in dark mode it drops *below* the content ground rather than inverting —
 * so it carries `theme.drawer` rather than the page ramp.
 */
export function Drawer({
	items, locations, types, stores,
	activeLocation, setActiveLocation, activeType, setActiveType, activeStore, setActiveStore,
	countFor, anyFilterActive, onClearAll,
	tab, setTab, open, onClose, collapsed, onDismiss,
	householdName, householdInk, households, currentHouseholdId,
	onSelectHousehold, onNewHousehold, onJoinHousehold,
	accountName, settings,
	onCreateTerm, onRenameTerm, onRecolorTerm, onDeleteTerm, canEditTaxonomy, closeEditing,
	theme,
}: Props) {
	const d = theme.drawer;
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const switcherRef = useRef<HTMLDivElement>(null);

	/*
	 * The same two dismissals `RailFlyout` gives the rail's menus, for the same
	 * reason: a popover that only closes by choosing something traps whoever
	 * opened it to look. `pointerdown` rather than `click` so a drag that starts
	 * inside and ends outside — selecting the name in the create field — does
	 * not close it mid-gesture.
	 */
	useEffect(() => {
		if (! switcherOpen) return;

		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') { e.stopPropagation(); setSwitcherOpen(false); }
		}

		function onDown(e: PointerEvent) {
			if (switcherRef.current?.contains(e.target as Node)) return;
			setSwitcherOpen(false);
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [switcherOpen]);

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
					'fixed min-[1120px]:sticky top-0 left-0 z-40 h-screen shrink-0 flex flex-col ' +
					'w-[328px] min-[1120px]:w-[340px] transition-transform duration-200 ' +
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
				  * household too — that is where *New household* and *Join with a
				  * link* live, and hiding them until you already have two would
				  * mean there was no way to get the second one.
				  */}
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

				<div class="grid grid-cols-2 gap-1 mx-5 mt-[18px] p-1 rounded-xl" style={{ background: d.well }}>
					{([['filter', 'Filter', ListFilter], ['settings', 'Settings', Settings]] as const).map(([key, label, Icon]) => (
						<button
							key={key}
							onClick={() => setTab(key)}
							class={`flex items-center justify-center gap-[7px] h-[34px] rounded-[9px] text-[13.5px] ${tab === key ? DRAWER_CHIP_ON : 'transition-colors text-on-dark-faint font-medium hover:text-on-dark hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset'}`}
						>
							<Icon size={14} /> {label}
						</button>
					))}
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto">
					{tab === 'filter' ? (
						<div class="flex flex-col gap-[17px] px-5 pt-5 pb-5">
							<FilterSection
								title="Location" entities={locations}
								active={activeLocation} onSelect={setActiveLocation}
								leadingAll={{ label: 'All items', count: items.length }}
								countFor={(id) => countFor('location', id)}
								onCreate={(n, ink) => onCreateTerm('location', n, ink)}
								onRename={(id, n) => onRenameTerm('location', id, n)}
								onRecolor={(id, t) => onRecolorTerm('location', id, t)}
								onDelete={(id) => onDeleteTerm('location', id)}
								canEdit={canEditTaxonomy} closeEditing={closeEditing} theme={theme}
							/>
							<FilterSection
								title="Store" entities={stores}
								active={activeStore} onSelect={setActiveStore}
								countFor={(id) => countFor('store', id)}
								onCreate={(n, ink) => onCreateTerm('store', n, ink)}
								onRename={(id, n) => onRenameTerm('store', id, n)}
								onRecolor={(id, t) => onRecolorTerm('store', id, t)}
								onDelete={(id) => onDeleteTerm('store', id)}
								canEdit={canEditTaxonomy} closeEditing={closeEditing} theme={theme}
							/>
							<FilterSection
								title="Type" entities={types}
								active={activeType} onSelect={setActiveType}
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
						<DrawerSettings {...settings} theme={theme} />
					)}
				</div>

				<button
					onClick={() => setTab('settings')}
					class={`flex items-center gap-2.5 px-5 py-4 shrink-0 text-left ${DRAWER_ROW}`}
					style={{ borderTop: `1px solid ${d.line}` }}
				>
					<span class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold" style={{ background: '#4A3E2E', color: d.inkMuted }}>
						{(accountName || '?').charAt(0).toUpperCase()}
					</span>
					<span class="flex-1 min-w-0 text-sm truncate" style={{ color: d.inkMuted }}>{accountName || 'Account'}</span>
					<ChevronRight size={16} style={{ color: d.inkFaint }} />
				</button>
			</aside>
		</>
	);
}
