import { useState } from 'preact/hooks';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-preact';

import { AdminLoading } from './AdminLoading';
import { DrawerAvatar } from './DrawerAvatar';
import { EmptyState } from './EmptyState';
import { HouseholdTile } from './HouseholdTile';
import { useAdminHouseholds } from '../hooks/useAdminData';
import { useDismiss } from '../hooks/useDismiss';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import {
	ADMIN_ROW, PAGE_BUTTON_OUTLINE, PAGE_BUTTON_QUIET, PAGE_BUTTON_QUIET_ON,
	PAGE_CHIP, PAGE_CHIP_ON, PAGE_FOCUS, PAGE_ICON_IN_FIELD, PAGE_INPUT, PAGE_MENU,
	PAGE_MENU_ROW, ADMIN_CHIP_SCROLLER,
} from '../lib/controlStyles';
import { daysBetween, DORMANT_DAYS } from '../../shared/admin';
import type {
	AdminHouseholdFilter, AdminHouseholdRow, AdminHouseholdSort,
} from '../../shared/types';

const BEST_MATCH = { key: 'relevance' as const, label: 'Best match', short: 'Best' };

const SORTS: { key: AdminHouseholdSort; label: string; short: string }[] = [
	{ key: 'name', label: 'Name · A to Z', short: 'Name' },
	{ key: 'recent', label: 'Recently active', short: 'Recent' },
	{ key: 'items', label: 'Most items', short: 'Items' },
	{ key: 'members', label: 'Most members', short: 'Members' },
];

/**
 * Board 2 — every household, searched, filtered by one chip, sorted and paged.
 *
 * **The four columns are a count, a name and a date, which is the console's own
 * rule.** Nothing on this screen says what a household holds, only how much,
 * and there is no route from here to an item — the household page (a later
 * stage) draws the same line and says so out loud.
 *
 * The search placeholder is **not** the board's *"Search by name, member or
 * email"*. There are no emails to search: `auth.email` is empty on a Spacefast
 * account and a handler is only ever told about its caller (D56), so no part of
 * this app has ever held another person's address. Names and ids are what there
 * is, and the placeholder says so rather than promising a field that does not
 * exist.
 */
export function AdminHouseholds({
	filter, onFilter, onOpen, theme, dark,
}: {
	/** Owned by the console so a *Needs attention* row can arrive with it set. */
	filter: AdminHouseholdFilter;
	onFilter: (filter: AdminHouseholdFilter) => void;
	onOpen: (householdId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<AdminHouseholdSort>('name');
	const [offset, setOffset] = useState(0);
	const [sortOpen, setSortOpen] = useState(false);
	/** What to go back to when the search is cleared. See `typeSearch`. */
	const [sortBeforeSearch, setSortBeforeSearch] = useState<typeof SORTS[number]['key']>('name');
	const sortRef = useDismiss<HTMLDivElement>(sortOpen, () => setSortOpen(false));

	const result = useAdminHouseholds({ search, filter, sort, offset });

	if (result.state !== 'ready') {
		/* Denied paints nothing at all: every console query re-checks the
		 * flag server-side, and a screen that explained the refusal would
		 * be the 403 the app decided against showing anybody. */
		return result.state === 'denied' ? null : <AdminLoading theme={theme} />;
	}

	const { rows, matching, total, counts, pageSize } = result.data;
	const from = matching === 0 ? 0 : result.data.offset + 1;
	const to = Math.min(result.data.offset + pageSize, matching);
	const searching = search.trim().length > 0;
	/*
	 * **Searching adds a sort option and takes the chips away**, which is the
	 * design's own rule. *Best match* means nothing without a query, so it is
	 * offered only while there is one — and the sort the list had before comes
	 * back the moment the field is cleared, rather than leaving it on an option
	 * that has stopped existing.
	 */
	const sorts = searching ? [BEST_MATCH, ...SORTS] : SORTS;

	function typeSearch(next: string) {
		const nowSearching = next.trim().length > 0;

		if (nowSearching && ! searching) {
			// Remember where the list was, so clearing the field restores it.
			setSortBeforeSearch(sort);
			setSort('relevance');
		} else if (! nowSearching && searching) {
			setSort(sortBeforeSearch);
		}

		setSearch(next);
	}

	/*
	 * Any change to what is being asked for goes back to page one. Staying on
	 * page 4 while the chip narrows to eleven rows is the classic version of
	 * this bug — the server clamps rather than emptying, so it presents as the
	 * pager quietly disagreeing with the buttons instead of as a blank screen.
	 */
	function ask(next: () => void) {
		setOffset(0);
		next();
	}

	/*
	 * **Day one has no button and no search or chips.** The console cannot
	 * create a household, so the empty state points at the thing that can — a
	 * person signing in — rather than surrounding it with three controls over
	 * nothing. Same argument as the pantry's own empty household, where the top
	 * bar goes entirely and the empty state owns the screen.
	 *
	 * It is `total === 0`, **not** `matching === 0`: a filter that rules
	 * everything out is a different screen and keeps its controls, because the
	 * controls are how you get back.
	 */
	if (total === 0) {
		return (
			<EmptyState
				title="No households yet"
				body="Nothing to administer until somebody signs in and makes one. The console can look at households and it cannot create them."
				theme={theme}
			/>
		);
	}

	const chips: { key: AdminHouseholdFilter; label: string; count: number }[] = [
		{ key: 'all', label: 'All', count: total },
		{ key: 'no-owner', label: 'No owner', count: counts.noOwner },
		{ key: 'dormant', label: 'Dormant', count: counts.dormant },
		{ key: 'empty', label: 'Empty', count: counts.empty },
	];

	return (
		<div class="flex flex-col gap-[18px]">
			<div class="relative">
				<Search
					size={17}
					class="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
					style={{ color: theme.textFaint }}
				/>
				<input
					value={search}
					onInput={(e) => ask(() => typeSearch(e.currentTarget.value))}
					placeholder="Search by household name, member, or id"
					aria-label="Search households"
					class={`w-full h-11 pl-11 pr-11 rounded-[13px] text-sm ${PAGE_INPUT}`}
				/>
				{searching && (
					<button
						onClick={() => ask(() => typeSearch(''))}
						class={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 ${PAGE_ICON_IN_FIELD}`}
						aria-label="Clear the search"
					>
						<X size={15} />
					</button>
				)}
			</div>

			<div class="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-2">
				{/*
				  * **The chips go while a search is running.** A status chip
				  * narrowing a result set answers a question nobody asked, and its
				  * counts would be the space's rather than the result's — two
				  * numbers about different things, side by side. The count line
				  * takes the slot instead, which is the board's own move.
				  */}
				{/*
				  * **The chips scroll at 390 and wrap above `md`, and nothing is
				  * pinned.** The applied-filter row pins its clear because that
				  * row is a set you are dismantling; these are one status filter
				  * with one value on at a time, so there is nothing to keep in
				  * reach while you scroll past the rest.
				  */}
				{! searching && (
				<div class={ADMIN_CHIP_SCROLLER}>
				{chips.map((c) => {
					const on = filter === c.key;

					return (
						<button
							key={c.key}
							onClick={() => ask(() => onFilter(c.key))}
							aria-pressed={on}
							class={`flex items-center gap-[7px] shrink-0 h-11 md:h-[34px] px-3.5 rounded-full text-[13.5px] font-medium ${on ? PAGE_CHIP_ON : PAGE_CHIP}`}
							style={on ? { background: theme.inkBg, color: theme.inkText } : undefined}
						>
							{c.label}
							<span
								class="text-[12.5px] tabular-nums"
								/*
								 * Read off the theme rather than inherited, because the
								 * chip's fill inverts and a muted grey does not. That
								 * is the exact failure the dark boards record: a count
								 * that was a map *value* stayed put while the fill
								 * under it swapped, at 2.47:1.
								 */
								style={{ color: on ? theme.inkText : theme.textMuted, opacity: on ? 0.72 : 1 }}
							>
								{c.count.toLocaleString()}
							</span>
						</button>
					);
				})}
				</div>
				)}

				<div class="flex items-center gap-3 md:ml-auto">
					<span class="text-[13.5px] tabular-nums" style={{ color: theme.textMuted }}>
						{matching === 0
							? 'No matches'
							: searching
								? `${matching.toLocaleString()} ${matching === 1 ? 'match' : 'matches'}`
								: `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${matching.toLocaleString()}`}
					</span>

					<div class="relative" ref={sortRef}>
						<button
							onClick={() => setSortOpen((v) => ! v)}
							aria-haspopup="menu"
							aria-expanded={sortOpen}
							/* The caller brings the box: `PAGE_BUTTON_QUIET` is
							  * resting colours only, and the console's two sort
							  * triggers shipped without the shell the app's own
							  * one has always carried — no transition, no press
							  * nudge, no focus ring, and no open state at all.
							  *
							  * The inline `color` went with them. It was
							  * `theme.text`, which is `ink-body` to the byte in
							  * both themes, so it changed nothing at rest and did
							  * exactly one thing: beat `hover:text-ink`. */
							class={`shrink-0 flex items-center gap-1.5 h-11 md:h-[34px] px-3 rounded-[10px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${sortOpen ? PAGE_BUTTON_QUIET_ON : PAGE_BUTTON_QUIET}`}
						>
							{sorts.find((s) => s.key === sort)?.short ?? 'Sort'}
							<ChevronDown
								size={14}
								style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
							/>
						</button>

						{sortOpen && (
							<div
								role="menu"
								class={`absolute right-0 top-full mt-1.5 z-40 w-[210px] p-1.5 rounded-2xl ${PAGE_MENU}`}
							>
								{sorts.map((s) => (
									<button
										key={s.key}
										role="menuitemradio"
										aria-checked={sort === s.key}
										onClick={() => { ask(() => setSort(s.key)); setSortOpen(false); }}
										class={`flex items-center gap-2.5 w-full h-9 px-2.5 rounded-[9px] text-sm text-left ${PAGE_MENU_ROW}`}
										style={{ color: theme.text, fontWeight: sort === s.key ? 600 : 400 }}
									>
										{/* Selection is a check, not a fill — the sort
										  * menu's rule, and this *is* a sort menu. */}
										<span class="shrink-0 w-4">
											{sort === s.key && <Check size={15} style={{ color: theme.accent }} />}
										</span>
										{s.label}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{rows.length === 0 ? (
				<EmptyStateFor
					searching={searching}
					filter={filter}
					onClear={() => ask(() => { typeSearch(''); onFilter('all'); })}
					theme={theme}
				/>
			) : (
				<div
					class="rounded-[20px] overflow-hidden"
					style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
				>
					{/* The column heads. Hidden below `lg`, where the row stops being
					  * a table — see `HouseholdRow`. */}
					<div
						class="hidden lg:grid grid-cols-[minmax(0,1fr)_150px_90px_140px] gap-4 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.12em]"
						style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.divider}` }}
					>
						<span>Household</span>
						<span>Members</span>
						<span class="text-right">Items</span>
						<span class="text-right">Last active</span>
					</div>

					{rows.map((r, i) => (
						<HouseholdRow key={r.id} row={r} first={i === 0} onOpen={onOpen} theme={theme} dark={dark} />
					))}
				</div>
			)}

			{matching > pageSize && (
				<div class="flex items-center gap-2.5">
					<Pager
						label="Previous"
						disabled={result.data.offset === 0}
						onClick={() => setOffset(Math.max(0, result.data.offset - pageSize))}
					>
						<ChevronLeft size={15} />
					</Pager>
					<Pager
						label="Next"
						trailing
						disabled={to >= matching}
						onClick={() => setOffset(result.data.offset + pageSize)}
					>
						<ChevronRight size={15} />
					</Pager>
					<span class="text-[13px] tabular-nums" style={{ color: theme.textMuted }}>
						Page {Math.floor(result.data.offset / pageSize) + 1} of {Math.ceil(matching / pageSize)}
					</span>
				</div>
			)}
		</div>
	);
}

/**
 * One household, and the way to its page.
 *
 * **The whole row is the target**, which is the shopping list's rule and the
 * applied chip's: a chevron on the end would be a second hit area inside a
 * control that is already one, and at 1440 the name and the date are 900px
 * apart with nothing between them that is not part of the same answer.
 *
 * The focus ring offsets against `surface` rather than the ground, because the
 * rows sit inside a card — a ring offset against the canvas draws its gap in
 * the wrong colour and reads as a halo.
 *
 * Below `lg` the table stops being a table: four columns become the name and
 * one meta line — members, items, last active, in the order the desktop columns
 * run, separated by middots. Nothing is dropped, because all three are short.
 * The status flag stays on the name line, where it qualifies the thing it is
 * about.
 */
function HouseholdRow({
	row, first, onOpen, theme, dark,
}: {
	row: AdminHouseholdRow;
	first: boolean;
	onOpen: (householdId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const meta = [
		`${row.members.toLocaleString()} ${row.members === 1 ? 'member' : 'members'}`,
		`${row.items.toLocaleString()} ${row.items === 1 ? 'item' : 'items'}`,
		lastActiveWords(row.lastActive),
	].join(' · ');

	return (
		<button
			onClick={() => onOpen(row.id)}
			aria-label={`${row.name} — ${meta}`}
			class={`block w-full text-left lg:grid lg:grid-cols-[minmax(0,1fr)_150px_90px_140px] lg:items-center gap-4 px-5 py-3.5 min-h-[78px] lg:min-h-0 ${ADMIN_ROW}`}
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
		>
			<div class="flex items-center gap-3 min-w-0">
				<HouseholdTile ink={row.ink} name={row.name} size={34} dark={dark} />
				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="flex items-center gap-2 min-w-0">
						<span class="truncate text-[15px] font-medium" style={{ color: theme.textStrong }}>
							{row.name}
						</span>
						{row.noOwner && <Flag label="No owner" tint={statusInk('low', dark)} theme={theme} />}
						{! row.noOwner && row.dormant && <Flag label="Dormant" tint={theme.textFaint} theme={theme} />}
					</span>
					{/* The meta line is the whole row below `lg`, and redundant
					  * above it — so it goes rather than repeating three columns. */}
					<span class="lg:hidden text-meta truncate" style={{ color: theme.textMuted }}>{meta}</span>
				</span>
			</div>

			<div class="hidden lg:flex items-center">
				{/* Three faces then a count — the members panel's cap (D55), and no
				  * "+2" bubble: a fourth circle that is not a person is a worse
				  * thing to overlap than a person. */}
				<span class="flex -space-x-2">
					{row.faces.map((f, i) => (
						<span key={i} class="rounded-full" style={{ boxShadow: `0 0 0 2px ${theme.surface}` }}>
							<DrawerAvatar name={f.name} picture={f.picture} size={26} />
						</span>
					))}
				</span>
				{row.members > row.faces.length && (
					<span class="ml-2 text-[13px] tabular-nums" style={{ color: theme.textMuted }}>
						+{row.members - row.faces.length}
					</span>
				)}
			</div>

			<div class="hidden lg:block text-right text-sm tabular-nums" style={{ color: theme.text }}>
				{row.items.toLocaleString()}
			</div>

			<div class="hidden lg:block text-right text-sm" style={{ color: theme.textMuted }}>
				{lastActiveWords(row.lastActive)}
			</div>
		</button>
	);
}

/** A small uppercase flag beside a name. Not a status pill — it takes no ramp. */
function Flag({ label, tint, theme }: { label: string; tint: string; theme: Theme }) {
	return (
		<span
			class="shrink-0 px-1.5 py-px rounded-md text-[9.5px] font-bold uppercase tracking-[0.09em]"
			style={{ color: tint, border: `1px solid ${tint}`, background: theme.surfaceAlt }}
		>
			{label}
		</span>
	);
}

/**
 * `Today` · `Yesterday` · `3 weeks ago` · `Never`.
 *
 * `Never` rather than a blank, and it is the honest word for what it means:
 * nothing this household owns carries a readable stamp. That is normal for a
 * row written before D44 and is not the same as a household nobody has touched
 * — which is why the *dormant* flag is computed from the same value and refuses
 * to fire on it.
 */
function lastActiveWords(iso: string): string {
	const days = daysBetween(iso, new Date().toISOString());

	if (days === null) return 'Never';
	if (days <= 0) return 'Today';
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 30) {
		const w = Math.floor(days / 7);

		return `${w} ${w === 1 ? 'week' : 'weeks'} ago`;
	}
	if (days < 365) {
		const m = Math.floor(days / 30);

		return `${m} ${m === 1 ? 'month' : 'months'} ago`;
	}

	const y = Math.floor(days / 365);

	return `${y} ${y === 1 ? 'year' : 'years'} ago`;
}

/**
 * Nothing matched.
 *
 * **Day one never reaches here** — an empty space returns the bare empty state
 * above, before the search and chips are drawn at all. This is the other case:
 * something is being asked for and nothing answers, so the one secondary the
 * empty state allows is the way back out of the question.
 */
function EmptyStateFor({
	searching, filter, onClear, theme,
}: {
	searching: boolean;
	filter: AdminHouseholdFilter;
	onClear: () => void;
	theme: Theme;
}) {
	return (
		<EmptyState
			title="No matches"
			body={
				searching
					? 'Search covers a household’s name, its members’ names, and its id. It does not cover what a household holds, and it never will.'
					: `Nothing in this space is ${filter === 'no-owner' ? 'without an owner' : filter === 'dormant' ? `dormant over ${DORMANT_DAYS} days` : 'empty'}.`
			}
			action={{ label: searching ? 'Clear the search' : 'Show every household', onClick: onClear }}
			theme={theme}
		/>
	);
}

/** One end of the pager. The disabled half stays visible and says nothing. */
function Pager({
	label, disabled, onClick, trailing, children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	trailing?: boolean;
	children: preact.ComponentChildren;
}) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			/* No inline `color`. `theme.text` is `ink-body` to the byte in both
			  * themes, so the one thing it did was beat the style's own
			  * `hover:text-ink` — the pager had a fill hover and a border hover
			  * and no label hover, which reads as a control that only half
			  * responds. */
			class={`flex items-center gap-[7px] h-11 md:h-[38px] px-3.5 rounded-[11px] text-[13.5px] font-semibold ${PAGE_BUTTON_OUTLINE} disabled:opacity-50 disabled:pointer-events-none`}
		>
			{! trailing && children}
			{label}
			{trailing && children}
		</button>
	);
}
