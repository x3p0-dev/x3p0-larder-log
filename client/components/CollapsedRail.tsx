import { useEffect, useRef, useState } from 'preact/hooks';
import {
	ChevronRight, MapPin, Moon, PanelLeftOpen, SlidersHorizontal, Store as StoreIcon, Sun, Tag,
} from 'lucide-preact';

import { HouseholdSwitcher } from './HouseholdSwitcher';
import { RailFlyout } from './RailFlyout';
import type { Theme } from '../lib/theme';
import { drawerDot, termColorFor } from '../lib/theme';
import type { HouseholdSummary, Term, ThemeOverride } from '../../shared/types';

type Group = 'location' | 'store' | 'type';
type Menu = Group | 'household' | 'appearance' | 'account';

type Props = {
	locations: Term[];
	stores: Term[];
	types: Term[];
	activeLocation: string | null;
	setActiveLocation: (id: string | null) => void;
	activeStore: string | null;
	setActiveStore: (id: string | null) => void;
	activeType: string | null;
	setActiveType: (id: string | null) => void;
	itemCount: number;
	locationCounts: Record<string, number>;
	householdName: string;
	households: HouseholdSummary[];
	currentHouseholdId: string;
	onSelectHousehold: (id: string) => void;
	onCreateHousehold: (name: string) => Promise<string | null>;
	onJoinHousehold: (code: string) => Promise<string | null>;
	accountName: string;
	themeOverride: ThemeOverride;
	setThemeOverride: (v: ThemeOverride) => void;
	dark: boolean;
	/** Expand onto a pane. The icon pressed is the one lit on arrival. */
	onExpand: (tab: 'filter' | 'settings') => void;
	onSignOut: () => void;
	theme: Theme;
};

const THEME_OPTIONS: { key: ThemeOverride; label: string }[] = [
	{ key: 'system', label: 'Auto' },
	{ key: 'light', label: 'Light' },
	{ key: 'dark', label: 'Dark' },
];

/** 40px button, 12px radius. Rest is transparent; the lit state is cream. */
const RAIL_BTN =
	'flex items-center justify-center w-10 h-10 rounded-xl transition-colors text-on-dark-faint hover:bg-drawer-raised hover:text-on-dark-muted active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';
const RAIL_BTN_ON =
	'flex items-center justify-center w-10 h-10 rounded-xl transition-colors bg-drawer-press text-drawer-press-ink active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

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
	activeLocation, setActiveLocation, activeStore, setActiveStore, activeType, setActiveType,
	itemCount, locationCounts, householdName,
	households, currentHouseholdId, onSelectHousehold, onCreateHousehold, onJoinHousehold,
	accountName, themeOverride, setThemeOverride, dark, onExpand, onSignOut, theme,
}: Props) {
	const [menu, setMenu] = useState<Menu | null>(null);
	const [menuTop, setMenuTop] = useState(0);
	const [hovered, setHovered] = useState<string | null>(null);
	const hoverTimer = useRef<number | undefined>(undefined);
	const railRef = useRef<HTMLElement>(null);

	useEffect(() => () => clearTimeout(hoverTimer.current), []);

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
		setMenu((m) => (m === key ? null : key));
		leave();
	}

	const groups: { key: Group; label: string; Icon: typeof MapPin; terms: Term[]; active: string | null; set: (id: string | null) => void }[] = [
		{ key: 'location', label: 'Filter by location', Icon: MapPin, terms: locations, active: activeLocation, set: setActiveLocation },
		{ key: 'store', label: 'Filter by store', Icon: StoreIcon, terms: stores, active: activeStore, set: setActiveStore },
		{ key: 'type', label: 'Filter by type', Icon: Tag, terms: types, active: activeType, set: setActiveType },
	];

	const householdColor = termColorFor(locations[0]?.ink ?? '') ;

	function Tip({ id, text }: { id: string; text: string }) {
		if (hovered !== id) return null;

		return (
			<span
				role="tooltip"
				class="absolute left-[52px] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs bg-drawer-well border border-drawer-line text-on-dark-muted shadow-lg pointer-events-none"
			>
				{text}
			</span>
		);
	}

	/** One rail control, with its tooltip and optional filter badge. */
	function Control({
		id, label, on, count, onClick, children,
	}: {
		id: string; label: string; on: boolean; count?: number;
		onClick: (e: MouseEvent) => void; children: preact.ComponentChildren;
	}) {
		return (
			<span class="relative inline-flex" onMouseEnter={() => enter(id)} onMouseLeave={leave}>
				<button onClick={onClick} class={on ? RAIL_BTN_ON : RAIL_BTN} aria-label={label} aria-expanded={on}>
					{children}
				</button>
				{count ? (
					/* Collapsed is the one place crimson touches the rail, and always
					 * as a badge — never a fill. */
					<span
						class="absolute -top-[3px] -right-[3px] flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10.5px] font-bold bg-accent text-surface pointer-events-none"
						style={{ boxShadow: `0 0 0 2px ${dark ? '#0F0C07' : '#1F1A13'}` }}
					>
						{count}
					</span>
				) : null}
				<Tip id={id} text={label} />
			</span>
		);
	}

	return (
		<aside
			ref={railRef}
			class="hidden md:flex sticky top-0 h-screen w-[68px] shrink-0 flex-col items-center gap-3 py-[18px] z-40"
			style={{ background: theme.drawer.bg }}
		>
			<Control id="expand" label="Open drawer" on={false} onClick={() => onExpand('filter')}>
				<span class="flex items-center justify-center w-10 h-10 rounded-xl bg-drawer-raised text-[#C3B49C]">
					<PanelLeftOpen size={18} />
				</span>
			</Control>

			<Control
				id="household"
				label={`${householdName || 'Household'} — switch household`}
				on={menu === 'household'}
				onClick={(e) => toggle('household', e)}
			>
				<span
					class="flex items-center justify-center w-10 h-10 rounded-xl font-disp text-[17px] font-bold"
					style={{ background: householdColor?.base ?? '#A85E33', color: '#241E17' }}
				>
					{(householdName || 'H').charAt(0).toUpperCase()}
				</span>
			</Control>

			<span class="w-6 h-px bg-drawer-line" />

			{groups.map(({ key, label, Icon, active }) => (
				<Control
					key={key}
					id={key}
					label={label}
					on={menu === key}
					count={active ? 1 : 0}
					onClick={(e) => toggle(key, e)}
				>
					<Icon size={18} />
				</Control>
			))}

			<span class="w-6 h-px bg-drawer-line" />

			{/* The glyph reports what the theme currently resolves to, so it is a
			  * status indicator as well as a control. */}
			<Control id="appearance" label="Appearance" on={menu === 'appearance'} onClick={(e) => toggle('appearance', e)}>
				{dark ? <Moon size={18} /> : <Sun size={18} />}
			</Control>

			<Control id="settings" label="Settings" on={false} onClick={() => onExpand('settings')}>
				<SlidersHorizontal size={18} />
			</Control>

			<span class="flex-1" />

			<Control id="account" label={accountName || 'Account'} on={menu === 'account'} onClick={(e) => toggle('account', e)}>
				<span
					class="flex items-center justify-center w-10 h-10 rounded-full font-disp text-[15px] font-bold"
					style={{ background: '#4A3E2E', boxShadow: 'inset 0 0 0 1px #63533E', color: '#E8DCC6' }}
				>
					{(accountName || '?').charAt(0).toUpperCase()}
				</span>
			</Control>

			{menu && groups.some((g) => g.key === menu) && (() => {
				const g = groups.find((x) => x.key === menu)!;

				return (
					<RailFlyout top={menuTop} onClose={() => setMenu(null)} label={g.label} railRef={railRef}>
						<p class="px-1.5 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-label">{g.key}</p>
						<div class="flex flex-wrap gap-1.5 px-1">
							<button
								onClick={() => { g.set(null); setMenu(null); }}
								class={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] ${g.active === null ? 'bg-drawer-press text-drawer-press-ink font-semibold' : 'bg-drawer-raised text-on-dark-muted hover:bg-drawer-card-hover'}`}
							>
								All items <span class={g.active === null ? 'text-accent' : 'text-on-dark-faint'}>{itemCount}</span>
							</button>
							{g.terms.map((t) => {
								const c = termColorFor(t.ink);
								const on = g.active === t.id;
								const n = g.key === 'location' ? locationCounts[t.id] || 0 : undefined;

								return (
									<button
										key={t.id}
										onClick={() => { g.set(on ? null : t.id); setMenu(null); }}
										class={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] ${on ? 'bg-drawer-press text-drawer-press-ink font-semibold' : 'bg-drawer-raised text-on-dark-muted hover:bg-drawer-card-hover'}`}
									>
										<span class="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c ? drawerDot(c) : t.ink }} />
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
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Appearance" railRef={railRef}>
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
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Household" railRef={railRef}>
					{/* Switch, new, join — the flyout the rail spec's control table asks for. */}
					<HouseholdSwitcher
						households={households}
						currentId={currentHouseholdId}
						onSelect={onSelectHousehold}
						onCreate={onCreateHousehold}
						onJoin={onJoinHousehold}
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

			{menu === 'account' && (
				<RailFlyout top={menuTop} onClose={() => setMenu(null)} label="Account" railRef={railRef}>
					<p class="px-1.5 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-label">Account</p>
					<p class="px-2 pb-2 text-[13px] text-on-dark truncate">{accountName || 'Account'}</p>
					<button
						onClick={() => { setMenu(null); onExpand('settings'); }}
						class="flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-on-dark-muted hover:bg-drawer-raised"
					>
						Settings <ChevronRight size={14} />
					</button>
					<button
						onClick={onSignOut}
						class="flex items-center w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-[#D4636B] hover:bg-drawer-raised"
					>
						Sign out
					</button>
				</RailFlyout>
			)}
		</aside>
	);
}
