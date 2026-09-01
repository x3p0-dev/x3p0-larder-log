import { useEffect, useRef, useState } from 'preact/hooks';
import {
	ArrowLeft, ChevronRight, History, Home, LayoutDashboard, MapPin, Moon, PanelLeftOpen,
	SlidersHorizontal, Store as StoreIcon, Sun, Tag, Users,
} from 'lucide-preact';

import { AccountMenu } from './AccountMenu';
import { DrawerAvatar } from './DrawerAvatar';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { HouseholdTile } from './HouseholdTile';
import { RailFlyout } from './RailFlyout';
import type { AdminSection } from './AdminPane';
import type { Theme } from '../lib/theme';
import type { TermFilter } from '../lib/actions';
import { chipDot, drawerTheme } from '../lib/theme';
import { sourceGroupWord } from '../../shared/source';
import type { HouseholdSummary, Source, Term, ThemeOverride } from '../../shared/types';

type Group = 'location' | 'store' | 'type';
type Menu = Group | 'household' | 'appearance' | 'account';

type Props = {
	locations: Term[];
	stores: Source[];
	types: Term[];
	locationFilter: TermFilter;
	storeFilter: TermFilter;
	typeFilter: TermFilter;
	/**
	 * True while the drawer is only *auto*-collapsed by width, not by choice.
	 *
	 * The rail is the drawer below 1120 whatever anyone picked, so it renders at
	 * `md` unconditionally and stops again above that unless the collapse was
	 * deliberate. Doing it in CSS rather than a resize listener keeps the two
	 * halves from disagreeing for a frame on load.
	 *
	 * That "stops" is a **bounded range**, `md:max-[1120px]:flex`, and not
	 * `md:flex min-[1120px]:hidden` — which is what it was, and which showed the
	 * rail beside the open drawer. Tailwind emits arbitrary `min-[…]` variants
	 * *before* the named breakpoints, so at 1120 both queries match and `md:flex`
	 * wins on source order. Two rules that overlap cannot be ordered here; one
	 * rule that covers exactly its band needs no ordering at all.
	 */
	autoOnly: boolean;
	itemCount: number;
	locationCounts: Record<string, number>;
	householdName: string;
	/** The household's colour token, resolved by the server (D42). */
	householdInk: string;
	households: HouseholdSummary[];
	currentHouseholdId: string;
	onSelectHousehold: (id: string) => void;
	onNewHousehold: () => void;
	onJoinHousehold: (code: string) => Promise<string | null>;
	accountName: string;
	accountEmail: string;
	/** The Gravatar image, where the account has one. */
	accountPicture?: string;
	/** Renames the account. Absent for the dev guest, who has no account row. */
	onSetDisplayName?: (name: string) => void;
	/**
	 * Opens the admin console (D62). Absent unless the caller administers the
	 * space, which is almost everybody.
	 *
	 * **`AccountMenu` is one component in two places** — the drawer's foot row
	 * and this flyout — so anything the drawer hands it has to be handed here
	 * too, or the same menu is two different menus depending on whether the
	 * drawer happens to be collapsed. It was, for one round: the row existed in
	 * the drawer and not on the rail.
	 */
	onOpenAdmin?: () => void;
	/*
	 * The console's own rail state (D62). `adminSection` is `null` whenever the
	 * console is closed, which is every ordinary load.
	 *
	 * **While it is open the rail is the console's, not the pantry's.** The
	 * household switcher, the three filter groups and Settings all go: every one
	 * of them is a control over *a* household, and the console is not about
	 * being in one. What survives is what is not — expand, appearance, and you.
	 */
	adminSection: AdminSection | null;
	onAdminSection: (section: AdminSection) => void;
	onCloseAdmin: () => void;
	themeOverride: ThemeOverride;
	setThemeOverride: (v: ThemeOverride) => void;
	dark: boolean;
	/** Expand onto a pane. The icon pressed is the one lit on arrival. */
	onExpand: (tab: 'filter' | 'settings') => void;
	onSignOut: () => void;
	theme: Theme;
};

/** The console's nav, as the rail draws it. Same order and glyphs as `AdminPane`. */
const ADMIN_SECTIONS: { key: AdminSection; label: string; Icon: typeof Home }[] = [
	{ key: 'overview', label: 'Overview', Icon: LayoutDashboard },
	{ key: 'households', label: 'Households', Icon: Home },
	{ key: 'people', label: 'People', Icon: Users },
	{ key: 'activity', label: 'Activity', Icon: History },
];

const THEME_OPTIONS: { key: ThemeOverride; label: string }[] = [
	{ key: 'system', label: 'Auto' },
	{ key: 'light', label: 'Light' },
	{ key: 'dark', label: 'Dark' },
];

/*
 * 40px button, 12px radius. Rest is transparent; the lit state is cream.
 *
 * The focus ring is `focus-dark`, not `accent`. The rail is dark in both themes,
 * and `accent` follows the page — so in light mode it resolved to `#BE3346`
 * against a near-black slab. The spec names the dark crimson for exactly this,
 * and the toast already uses the same token.
 */
const RAIL_BTN =
	'group flex items-center justify-center w-10 h-10 rounded-xl transition-colors text-on-dark-faint hover:bg-drawer-raised hover:text-on-dark-muted active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';
const RAIL_BTN_ON =
	'group flex items-center justify-center w-10 h-10 rounded-xl transition-colors bg-drawer-press text-drawer-press-ink active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/**
 * The button under a control that carries its **own** fill — the household tile
 * and the account avatar.
 *
 * These get no background of their own at any state. The icon buttons light up
 * cream when their menu is open, and doing that behind a tile paints a cream
 * square that the tile then only partly covers: the avatar is a circle inside a
 * 12px-radius button, so the corners leaked and the open state grew a pale
 * halo. The spec asks for "fill + 2px cream ring" on these two, which is a ring
 * *on the tile*, not a slab behind it.
 *
 * Hover and press therefore move the tile's own colour, through `group-*`.
 */
const RAIL_TILE =
	'group flex items-center justify-center w-10 h-10 rounded-xl transition-transform active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/**
 * Everything a `Control` needs from the rail that is not about the control
 * itself. One prop rather than four, because seven call sites repeat it.
 */
type RailChrome = {
	hovered: string | null;
	dark: boolean;
	onEnter: (key: string) => void;
	onLeave: () => void;
};

function Tip({ show, text }: { show: boolean; text: string }) {
	if (! show) return null;

	return (
		<span
			role="tooltip"
			class="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs bg-drawer-well border border-drawer-line text-on-dark-muted shadow-lg pointer-events-none"
		>
			{text}
		</span>
	);
}

/**
 * One rail control, with its tooltip and optional filter badge.
 *
 * **Declared at module scope, and it has to stay there.** Both this and `Tip`
 * used to live inside `CollapsedRail`, which gave them a fresh function
 * identity on every render — so Preact saw a new component *type* each time and
 * tore down and rebuilt every button in the rail. Any re-render between a
 * `pointerdown` and its `click` replaced the element mid-gesture and the click
 * was simply lost. The 400ms tooltip timer fires exactly there, which is why it
 * presented as "sometimes I have to click twice".
 *
 * It is also what makes dismiss-on-pointerdown viable below: that closes the
 * menu before the click lands, and an inline component would have eaten the
 * click every single time rather than intermittently.
 */
function Control({
	id, label, on, count, tile = false, chrome, onClick, children,
}: {
	id: string; label: string; on: boolean; count?: number;
	/** The child carries its own fill, so the button must not paint one. */
	tile?: boolean;
	chrome: RailChrome;
	onClick: (e: MouseEvent) => void; children: preact.ComponentChildren;
}) {
	return (
		<span class="relative inline-flex" onMouseEnter={() => chrome.onEnter(id)} onMouseLeave={chrome.onLeave}>
			<button
				onClick={onClick}
				class={tile ? RAIL_TILE : on ? RAIL_BTN_ON : RAIL_BTN}
				aria-label={label}
				aria-expanded={on}
			>
				{children}
			</button>
			{count ? (
				/* Collapsed is the one place crimson touches the rail, and always
				 * as a badge — never a fill. */
				<span
					class="absolute -top-[3px] -right-[3px] flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10.5px] font-bold bg-accent text-surface pointer-events-none"
					style={{ boxShadow: `0 0 0 2px ${chrome.dark ? '#0F0C07' : '#1F1A13'}` }}
				>
					{count}
				</span>
			) : null}
			<Tip show={chrome.hovered === id} text={label} />
		</span>
	);
}

/**
 * The collapsed drawer: a 68px rail of eight controls in three groups.
 *
 * The rule the spec sets is that **a pane expands the drawer and a menu flies
 * out**. Settings expands; household, appearance, account and the three filter
 * groups are menus, so the rail stays put and the button that opened one takes
 * the lit treatment to mark itself as the source.
 *
 * A quick filter is deliberately not the full pane: one term list, no pencil,
 * no add, no clearing across groups. It ends with *Open full filters*, which is
 * how you get the real thing.
 */
export function CollapsedRail({
	locations, stores, types,
	locationFilter, storeFilter, typeFilter,
	autoOnly, itemCount, locationCounts, householdName, householdInk,
	households, currentHouseholdId, onSelectHousehold, onNewHousehold, onJoinHousehold,
	accountName, accountEmail, accountPicture, onSetDisplayName, onOpenAdmin,
	adminSection, onAdminSection, onCloseAdmin,
	themeOverride, setThemeOverride, dark, onExpand, onSignOut, theme,
}: Props) {
	const [menu, setMenu] = useState<Menu | null>(null);
	const [menuTop, setMenuTop] = useState(0);
	const [hovered, setHovered] = useState<string | null>(null);
	const hoverTimer = useRef<number | undefined>(undefined);
	/** The open flyout's own box. Pointer events inside it are not a dismissal. */
	const panelRef = useRef<HTMLDivElement>(null);

	/**
	 * Which menu the gesture in progress just dismissed, if any.
	 *
	 * A press anywhere outside the panel closes the menu on `pointerdown`, which
	 * lands *before* the `click` that a rail button would act on. Without this,
	 * pressing the already-open button would close it and then its own toggle
	 * would immediately reopen it, because by then nothing is open.
	 *
	 * Refreshed on every press, including presses that close nothing, so it can
	 * never go stale between gestures.
	 */
	const dismissed = useRef<Menu | null>(null);

	useEffect(() => () => clearTimeout(hoverTimer.current), []);

	/*
	 * Dismissal lives here rather than in `RailFlyout` because the rail owns
	 * which menu is open, so it should own what closes one. It also has to run
	 * for presses *on the rail itself* — pressing a second icon, or bare rail
	 * between two icons, closes what is open. The flyout could not do that: it
	 * had to exempt the rail wholesale to keep the toggle from fighting it, and
	 * that exemption is what left a menu open behind an unrelated click.
	 */
	useEffect(() => {
		function onDown(e: PointerEvent) {
			// A press that starts inside the panel is a drag or a selection —
			// selecting an invite link is the case that made this `pointerdown`
			// rather than `click` in the first place.
			if (panelRef.current?.contains(e.target as Node)) return;

			dismissed.current = menu;

			if (menu) setMenu(null);
		}

		document.addEventListener('pointerdown', onDown);

		return () => document.removeEventListener('pointerdown', onDown);
	}, [menu]);

	/* ~400ms before a tooltip appears, per the spec — long enough that sweeping
	 * across the rail does not strobe six labels on the way past. */
	function enter(key: string) {
		clearTimeout(hoverTimer.current);
		hoverTimer.current = setTimeout(() => setHovered(key), 400) as unknown as number;
	}
	function leave() {
		clearTimeout(hoverTimer.current);
		setHovered(null);
	}

	function toggle(key: Menu, e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		setMenuTop(Math.max(8, rect.top - 8));

		// `dismissed`, not the current menu: the press that produced this click
		// has already closed whatever was open, so `menu` is null by now and
		// comparing against it would reopen the button you just pressed shut.
		setMenu(dismissed.current === key ? null : key);
		dismissed.current = null;
		leave();
	}

	const chrome: RailChrome = { hovered, dark, onEnter: enter, onLeave: leave };

	const sourceWord = sourceGroupWord(stores);

	const groups: { key: Group; label: string; Icon: typeof MapPin; terms: Term[]; filter: TermFilter }[] = [
		{ key: 'location', label: 'Filter by location', Icon: MapPin, terms: locations, filter: locationFilter },
		/*
		 * The label follows the group's own word (D58); **the glyph does not**.
		 * A storefront means *shop*, which is wrong the moment a household grows
		 * anything — but the neutral mark that would replace it has not been
		 * drawn, and inventing one here would put a glyph nobody has been taught
		 * on the one surface that is nothing but glyphs. Recorded rather than
		 * guessed at.
		 */
		{ key: 'store', label: `Filter by ${sourceWord.toLowerCase()}`, Icon: StoreIcon, terms: stores, filter: storeFilter },
		{ key: 'type', label: 'Filter by type', Icon: Tag, terms: types, filter: typeFilter },
	];

	return (
		<aside
			class={
				'sticky top-0 h-dvh w-[68px] shrink-0 flex-col items-center gap-3 py-[18px] z-40 ' +
				(autoOnly ? 'hidden md:max-[1120px]:flex' : 'hidden md:flex')
			}
			style={{ background: theme.drawer.bg }}
		>
			<Control id="expand" label="Open drawer" on={false} tile chrome={chrome} onClick={() => onExpand('filter')}>
				<span
					/*
					 * Brightness, for the same reason the household tile below uses
					 * it: the fill is a token that differs by theme, so a literal
					 * hover shade would only be right in one of them. This is the
					 * one rail control with a fill at rest, and it covered the
					 * button's own `hover:bg-drawer-raised` completely — so it had
					 * no hover at all while every button under it did.
					 */
					class="flex items-center justify-center w-10 h-10 rounded-xl bg-drawer-raised text-[#C3B49C] transition-[filter] group-hover:brightness-125 group-active:brightness-90"
				>
					<PanelLeftOpen size={18} />
				</span>
			</Control>

			{/*
			  * **Back to the pantry takes slot 2** — where the household switcher
			  * sits, and for the same reason the design gives: it is the control
			  * that says which thing you are looking at. It wears the expand
			  * control's raised square rather than a bare glyph, because the two
			  * of them are the only chrome in this column and they are a pair.
			  */}
			{adminSection !== null ? (
				<Control id="back-to-app" label="Back to the pantry" on={false} tile chrome={chrome} onClick={onCloseAdmin}>
					<span class="flex items-center justify-center w-10 h-10 rounded-xl bg-drawer-raised text-[#C3B49C] transition-[filter] group-hover:brightness-125 group-active:brightness-90">
						<ArrowLeft size={18} />
					</span>
				</Control>
			) : (
			<Control
				id="household"
				label={`${householdName || 'Household'} — switch household`}
				on={menu === 'household'}
				tile
				chrome={chrome}
				onClick={(e) => toggle('household', e)}
			>
				{/*
				  * The 40px tile, and on the rail it is the **only** thing naming
				  * which household you are in — which is the whole reason a
				  * household has a colour at all (D42). Hover and press come off
				  * the chosen colour rather than a hard-coded triple; the rail
				  * shipped once with one household's terracotta written down as
				  * though it were a token.
				  */}
				<HouseholdTile
					ink={householdInk}
					name={householdName}
					size={40}
					dark={dark}
					ring={menu === 'household' ? '#F2E9DA' : undefined}
					interactive
				/>
			</Control>
			)}

			<span class="w-6 h-px bg-drawer-line" />

			{/*
			  * The console's four sections, or the pantry's three filter groups.
			  * Never both — a rail offering to filter a pantry beside a list of
			  * every household in the space is two apps in one column.
			  */}
			{adminSection !== null ? ADMIN_SECTIONS.map(({ key, label, Icon }) => (
				<Control
					key={key}
					id={`admin-${key}`}
					label={label}
					on={adminSection === key}
					chrome={chrome}
					onClick={() => onAdminSection(key)}
				>
					<Icon size={18} />
				</Control>
			)) : groups.map(({ key, label, Icon, filter }) => (
				<Control
					key={key}
					id={key}
					label={label}
					on={menu === key}
					chrome={chrome}
					count={filter.ids.length}
					onClick={(e) => toggle(key, e)}
				>
					<Icon size={18} />
				</Control>
			))}

			<span class="w-6 h-px bg-drawer-line" />

			{/* The glyph reports what the theme currently resolves to, so it is a
			  * status indicator as well as a control. */}
			<Control id="appearance" label="Appearance" on={menu === 'appearance'} chrome={chrome} onClick={(e) => toggle('appearance', e)}>
				{dark ? <Moon size={18} /> : <Sun size={18} />}
			</Control>

			{/* Settings is the household's, so it goes with the rest of them. */}
			{adminSection === null && (
				<Control id="settings" label="Settings" on={false} chrome={chrome} onClick={() => onExpand('settings')}>
					<SlidersHorizontal size={18} />
				</Control>
			)}

			<span class="flex-1" />

			<Control id="account" label={accountName || 'Account'} on={menu === 'account'} tile chrome={chrome} onClick={(e) => toggle('account', e)}>
				{/*
				  * The open ring is on the circle, so it follows the avatar's shape
				  * instead of boxing it — and hover moves the avatar's own fill
				  * through `group-*`, because the button under a control that
				  * carries its own fill paints none.
				  */}
				<span class="flex transition-[filter] group-hover:brightness-125 group-active:brightness-90">
					<DrawerAvatar
						name={accountName}
						picture={accountPicture}
						size={40}
						ring={menu === 'account'}
					/>
				</span>
			</Control>

			{menu && groups.some((g) => g.key === menu) && (() => {
				const g = groups.find((x) => x.key === menu)!;

				return (
					<RailFlyout top={menuTop} onClose={() => setMenu(null)} label={g.label} panelRef={panelRef}>
						<p class="px-1.5 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-label">{g.key}</p>
						<div class="flex flex-wrap gap-1.5 px-1">
							{/*
							  * The flyout **stays open** on a pick, unlike every other
							  * menu on the rail. A group holds several terms now, and
							  * closing after each one would mean reopening the same
							  * panel to add the second — the panel is a list you work
							  * through, not a choice you make once. Escape, an outside
							  * press, or the rail button itself still closes it.
							  */}
							<button
								onClick={g.filter.clear}
								class={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] ${g.filter.ids.length === 0 ? 'bg-drawer-press text-drawer-press-ink font-semibold' : 'bg-drawer-raised text-on-dark-muted hover:bg-drawer-card-hover'}`}
							>
								All items <span class={g.filter.ids.length === 0 ? 'text-accent' : 'text-on-dark-faint'}>{itemCount}</span>
							</button>
							{g.terms.map((t) => {
								const on = g.filter.ids.includes(t.id);
								const n = g.key === 'location' ? locationCounts[t.id] || 0 : undefined;

								return (
									<button
										key={t.id}
										onClick={() => g.filter.toggle(t.id)}
										aria-pressed={on}
										class={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] ${on ? 'bg-drawer-press text-drawer-press-ink font-semibold' : 'bg-drawer-raised text-on-dark-muted hover:bg-drawer-card-hover'}`}
									>
										{/* Cream-filled when selected, so the dot swaps to the light base. */}
										<span class="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: chipDot(t.ink, on) }} />
										{t.name}
										{n !== undefined && <span class={on ? 'text-accent' : 'text-on-dark-faint'}>{n}</span>}
									</button>
								);
							})}
						</div>
						<span class="block h-px mx-1.5 my-2 bg-drawer-raised" />
						<button
							onClick={() => { setMenu(null); onExpand('filter'); }}
							class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-[#C3B49C] hover:bg-drawer-raised"
						>
							Open full filters <ChevronRight size={14} />
						</button>
					</RailFlyout>
				);
			})()}

			{menu === 'appearance' && (
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Appearance" panelRef={panelRef}>
					<p class="px-1.5 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-label">Appearance</p>
					<div class="flex flex-col gap-1 px-1 pb-1">
						{THEME_OPTIONS.map((o) => (
							<button
								key={o.key}
								onClick={() => { setThemeOverride(o.key); setMenu(null); }}
								class={`flex items-center h-9 px-3 rounded-[9px] text-[13px] ${themeOverride === o.key ? 'bg-drawer-press text-drawer-press-ink font-semibold' : 'text-on-dark-muted hover:bg-drawer-raised'}`}
							>
								{o.label}
							</button>
						))}
					</div>
				</RailFlyout>
			)}

			{menu === 'household' && (
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Household" panelRef={panelRef}>
					{/* Switch, new, join — the flyout the rail spec's control table asks for. */}
					<HouseholdSwitcher
						households={households}
						currentId={currentHouseholdId}
						onSelect={onSelectHousehold}
						onNewHousehold={onNewHousehold}
						onJoin={onJoinHousehold}
						dark={dark}
						onDone={() => setMenu(null)}
					/>
					<span class="block h-px mx-1.5 my-2 bg-drawer-raised" />
					<button
						onClick={() => { setMenu(null); onExpand('settings'); }}
						class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-[#C3B49C] hover:bg-drawer-raised"
					>
						Household settings <ChevronRight size={14} />
					</button>
				</RailFlyout>
			)}

			{/*
			  * **The same menu the drawer's foot row opens**, which is why the
			  * Settings pane no longer needs an Account section at all: the thing
			  * that section held already had to exist for the rail.
			  *
			  * One deliberate difference from the boards. The panel keeps the
			  * rail's own flyout surface rather than the drawer menu's, because
			  * the household and appearance menus a few pixels above it are on
			  * that surface, and one flyout in three wearing a different fill
			  * reads as a different kind of thing. Only the width moves, to the
			  * 292 the boards give it.
			  */}
			{menu === 'account' && (
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Account" width={292} panelRef={panelRef}>
					<AccountMenu
						name={accountName}
						email={accountEmail}
						picture={accountPicture}
						onRename={onSetDisplayName}
						onOpenAdmin={onOpenAdmin}
						adminOpen={adminSection !== null}
						onCloseAdmin={onCloseAdmin}
						onSignOut={onSignOut}
						onDone={() => setMenu(null)}
						theme={drawerTheme(theme)}
					/>
				</RailFlyout>
			)}
		</aside>
	);
}
