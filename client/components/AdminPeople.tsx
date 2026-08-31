import { useState } from 'preact/hooks';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, Shield, X } from 'lucide-preact';

import { AdminLoading } from './AdminLoading';
import { DrawerAvatar } from './DrawerAvatar';
import { EmptyState } from './EmptyState';
import { HouseholdTile } from './HouseholdTile';
import { useAdminPeople } from '../hooks/useAdminData';
import { useDismiss } from '../hooks/useDismiss';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import {
	ADMIN_ROW, PAGE_BUTTON_OUTLINE, PAGE_BUTTON_QUIET, PAGE_BUTTON_QUIET_ON,
	PAGE_CHIP, PAGE_CHIP_ON, PAGE_FOCUS, PAGE_ICON_IN_FIELD, PAGE_INPUT, PAGE_MENU,
	PAGE_MENU_ROW, ADMIN_CHIP_SCROLLER,
} from '../lib/controlStyles';
import { usDate } from '../../shared/admin';
import type { AdminPeopleFilter, AdminPeopleSort, AdminPersonRow } from '../../shared/types';

const BEST_MATCH = { key: 'relevance' as const, label: 'Best match', short: 'Best' };

const SORTS: { key: AdminPeopleSort; label: string; short: string }[] = [
	{ key: 'name', label: 'Name · A to Z', short: 'Name' },
	{ key: 'joined', label: 'Recently joined', short: 'Joined' },
	{ key: 'households', label: 'Most households', short: 'Households' },
];

/**
 * Board 4 — every person in the space.
 *
 * **There is no *Last seen* column and the board's one cannot be built.**
 * Nothing in this app records a session. The nearest derivable value — the
 * newest activity across the households somebody belongs to — is activity by
 * *anyone* in them, so it would attribute another member's edit to this person
 * and be confidently wrong on exactly the screen an administrator would trust.
 * *Joined* takes the column instead, which is a date the app really holds.
 *
 * **And no email**, for the third time in this console: a Spacefast account
 * carries no `email` claim and a handler is only ever told about its caller
 * (D56). The search says what it really covers.
 *
 * The board's fourth chip is *Awaiting deletion*, which needs a deletion hold —
 * a column, and therefore a schema change nothing else wants yet. *Sole owner*
 * takes its place and is the more useful of the two anyway: it is exactly the
 * set of people whose account cannot be deleted without answering a question
 * first.
 */
export function AdminPeople({
	filter, onFilter, onOpen, theme, dark,
}: {
	filter: AdminPeopleFilter;
	onFilter: (filter: AdminPeopleFilter) => void;
	onOpen: (userId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState<AdminPeopleSort>('name');
	const [offset, setOffset] = useState(0);
	const [sortOpen, setSortOpen] = useState(false);
	/** What to go back to when the search is cleared. See `typeSearch`. */
	const [sortBeforeSearch, setSortBeforeSearch] = useState<typeof SORTS[number]['key']>('name');
	const sortRef = useDismiss<HTMLDivElement>(sortOpen, () => setSortOpen(false));

	const result = useAdminPeople({ search, filter, sort, offset });

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

	/** Any change to the question goes back to page one. See the household list. */
	function ask(next: () => void) {
		setOffset(0);
		next();
	}

	/*
	 * Day one, and the same rule as the household list: no search, no chips, no
	 * button. The console cannot create an account either.
	 */
	if (total === 0) {
		return (
			<EmptyState
				title="Nobody yet"
				body="Nothing to administer until somebody signs in. The console can look at accounts and it cannot create them."
				theme={theme}
			/>
		);
	}

	const chips: { key: AdminPeopleFilter; label: string; count: number }[] = [
		{ key: 'all', label: 'All', count: total },
		{ key: 'admins', label: 'Administrators', count: counts.admins },
		{ key: 'sole-owner', label: 'Sole owner', count: counts.soleOwner },
		{ key: 'no-household', label: 'No household', count: counts.noHousehold },
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
					placeholder="Search by name, household, or account id"
					aria-label="Search people"
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
										class={PAGE_MENU_ROW}
										style={{ color: theme.text, fontWeight: sort === s.key ? 600 : 400 }}
									>
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
				<EmptyState
					title="No matches"
					body={
						searching
							? 'Search covers a person’s name, the names of their households, and their account id. There are no email addresses to search — a Spacefast account carries none.'
							: 'Nobody in this space is in that group.'
					}
					action={{
						label: searching ? 'Clear the search' : 'Show everybody',
						onClick: () => ask(() => { typeSearch(''); onFilter('all'); }),
					}}
					theme={theme}
				/>
			) : (
				<div
					class="rounded-[20px] overflow-hidden"
					style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
				>
					<div
						class="hidden lg:grid grid-cols-[minmax(0,1fr)_170px_140px] gap-4 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.12em]"
						style={{ color: theme.textMuted, borderBottom: `1px solid ${theme.divider}` }}
					>
						<span>Person</span>
						<span>Households</span>
						<span class="text-right">Joined</span>
					</div>

					{rows.map((r, i) => (
						<PersonRow key={r.userId} row={r} first={i === 0} onOpen={onOpen} theme={theme} dark={dark} />
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
 * One person, and the way to their account page.
 *
 * The **Admin** flag is the only one the console can actually see, and it is
 * worth seeing: it is the difference between an account that can read every
 * household in the space and one that cannot, and nothing in the app grants it
 * — so this row is the one place it is visible at all.
 *
 * *Sole owner* is the flag the pre-flight cares about. It sits in the meta line
 * rather than beside the name because it is a fact about a decision somebody
 * may have to make later, not about who this person is.
 */
function PersonRow({
	row, first, onOpen, theme, dark,
}: {
	row: AdminPersonRow;
	first: boolean;
	onOpen: (userId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	const meta = [
		row.households === 0
			? 'No household'
			: `${row.households} ${row.households === 1 ? 'household' : 'households'}`,
		row.soleOwnerOf > 0
			? `sole owner of ${row.soleOwnerOf}`
			: '',
		`joined ${usDate(row.joinedAt)}`,
	].filter(Boolean).join(' · ');

	return (
		<button
			onClick={() => onOpen(row.userId)}
			aria-label={`${row.name || 'Someone'} — ${meta}`}
			class={`block w-full text-left lg:grid lg:grid-cols-[minmax(0,1fr)_170px_140px] lg:items-center gap-4 px-5 py-3.5 min-h-[78px] lg:min-h-0 ${ADMIN_ROW}`}
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
		>
			<div class="flex items-center gap-3 min-w-0">
				<DrawerAvatar name={row.name} picture={row.picture} size={34} />
				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="flex items-center gap-2 min-w-0">
						<span class="truncate text-[15px] font-medium" style={{ color: theme.textStrong }}>
							{row.name || 'Someone'}
						</span>
						{row.admin && (
							<span
								class="shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9.5px] font-bold uppercase tracking-[0.09em]"
								style={{
									color: statusInk('low', dark),
									border: `1px solid ${statusInk('low', dark)}`,
									background: theme.surfaceAlt,
								}}
							>
								<Shield size={9} strokeWidth={2.6} /> Admin
							</span>
						)}
					</span>
					<span class="text-meta truncate" style={{ color: theme.textMuted }}>
						{/* Above `lg` the households and the date have columns, so
						  * the meta line keeps only what has none. */}
						<span class="lg:hidden">{meta}</span>
						<span class="hidden lg:inline">
							{row.soleOwnerOf > 0
								? `Sole owner of ${row.soleOwnerOf} ${row.soleOwnerOf === 1 ? 'household' : 'households'}`
								: row.userId}
						</span>
					</span>
				</span>
			</div>

			<div class="hidden lg:flex items-center">
				<span class="flex -space-x-1.5">
					{row.tiles.map((t) => (
						<span key={t.id} class="rounded-[9px]" style={{ boxShadow: `0 0 0 2px ${theme.surface}` }}>
							<HouseholdTile ink={t.ink} name={t.name} size={26} dark={dark} />
						</span>
					))}
				</span>
				{row.households > row.tiles.length && (
					<span class="ml-2 text-[13px] tabular-nums" style={{ color: theme.textMuted }}>
						+{row.households - row.tiles.length}
					</span>
				)}
				{row.households === 0 && (
					<span class="text-[13px]" style={{ color: theme.textFaint }}>None</span>
				)}
			</div>

			<div class="hidden lg:block text-right text-sm" style={{ color: theme.textMuted }}>
				{usDate(row.joinedAt)}
			</div>
		</button>
	);
}

/** One end of the pager. Shared shape with the household list's. */
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
