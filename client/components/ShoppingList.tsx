import { useMemo, useState } from 'preact/hooks';
import { Check, Eye, EyeOff, RotateCcw } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor, statusFor, themed } from '../lib/theme';
import { LIST_GHOST, LIST_GHOST_ON_CARD, LIST_ROW, LIST_TARGET } from '../lib/controlStyles';

import type { ShoppingGroup } from '../../shared/shoppingList';
import type { Item } from '../../shared/types';
import { toInt } from '../../shared/qty';

/**
 * Visually hidden, but read.
 *
 * An inline style rather than a utility class: this is the one thing on the
 * screen whose failure mode is silence, and a class that did not compile would
 * look identical to one that did.
 */
const SR_ONLY = {
	position: 'absolute', width: '1px', height: '1px',
	overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
} as const;

type Props = {
	groups: ShoppingGroup[];
	/** Item ids currently in the cart. Local to this device — see `useTripChecks`. */
	checked: ReadonlySet<string>;
	/** Absent for a viewer, who gets no checkboxes. */
	onToggle?: (id: string) => void;
	/**
	 * Untick everything on screen. Takes the ids rather than a bare signal, so
	 * the caller's toast can offer exactly those back — and so a Store filter
	 * cannot clear rows that are not in front of you.
	 */
	onClearChecks?: (ids: string[]) => void;
	/** The store filter's name, when one is on. The empty state names it. */
	storeFilterName: string | null;
	/** What the *rest* of the household still has to buy, for that same screen. */
	elsewhereCount: number;
	onClearStoreFilter: () => void;
	onClearFilters: () => void;
	dark: boolean;
	theme: Theme;
};

/**
 * The shopping list — a mode, not a surface.
 *
 * It replaces the content column rather than covering it, because a shopping
 * list is a reference you read while doing something else, not a question you
 * dismiss to continue. That is the whole argument against the modal this
 * replaces: a modal had nowhere to put a checkbox, and no way to change store,
 * fix a wrong count, or reach the item without closing first.
 *
 * One card per store, `auto-fill` rather than `auto-fit`: with a single store
 * card left after a filter, `auto-fit` would stretch it across the whole
 * screen. The 460px floor is measured rather than chosen — below it a long name
 * and its badge crowd the counts on the right, and the row wraps.
 */
export function ShoppingList(props: Props) {
	const { groups, checked, onToggle, onClearChecks, dark, theme } = props;

	const [hideChecked, setHideChecked] = useState(false);

	/** Rows on screen, after *Hide checked*. Cards that empty out go with them. */
	const shown = useMemo(() => (
		hideChecked
			? groups
				.map((g) => ({ ...g, items: g.items.filter((i) => ! checked.has(i.id)) }))
				.filter((g) => g.items.length > 0)
			: groups
	), [groups, checked, hideChecked]);

	/*
	 * Items, not rows: something you can buy at either of two shops draws twice
	 * and is one thing to buy.
	 *
	 * And **counted within this view**, not across the household. A tick lives
	 * on the item, so filtering to one store leaves ticks on rows that are no
	 * longer here — counting those would offer to hide rows nobody can see and,
	 * worse, could declare the trip finished while unchecked rows are on screen.
	 */
	const here = useMemo(() => new Set(groups.flatMap((g) => g.items.map((i) => i.id))), [groups]);
	const total = here.size;
	const checkedHere = useMemo(() => [...checked].filter((id) => here.has(id)), [checked, here]);
	const checkedCount = checkedHere.length;
	const allChecked = total > 0 && checkedCount >= total;

	/** `undefined` rather than a no-op, so the bars render no control for a viewer. */
	const clear = onClearChecks && (() => onClearChecks(checkedHere));

	const announcement = groups.length === 0
		? 'Shopping list, nothing to buy'
		: `Shopping list, ${plural(total, 'item')} to buy across ${plural(groups.length, 'store')}`
			+ (checkedCount > 0 ? `, ${checkedCount} in the cart` : '');

	return (
		<div>
			<span role="status" aria-live="polite" style={SR_ONLY}>{announcement}</span>

			{/*
			  * Mobile is a single column at its own gutters; from `md` the tracks
			  * fill rather than fit, and `items-start` lets each card keep its
			  * natural height so the bottoms run ragged. Both class strings are
			  * complete literals — Tailwind resolves a class by scanning source.
			  */}
			<div class="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))] items-start">
				{groups.length === 0
					? (
						<ListEmpty
							storeFilterName={props.storeFilterName}
							elsewhereCount={props.elsewhereCount}
							onClearStoreFilter={props.onClearStoreFilter}
							onClearFilters={props.onClearFilters}
							dark={dark}
							theme={theme}
						/>
					)
					: shown.map((group) => (
						<StoreCard
							key={group.storeId ?? ''}
							group={group}
							checked={checked}
							onToggle={onToggle}
							dark={dark}
							theme={theme}
						/>
					))}
			</div>

			{/*
			  * The trip bar is a fact about the *trip*, not about Costco, which is
			  * why it sits below the whole grid rather than in a card. A copy in
			  * each card would be five controls doing one job.
			  */}
			{checkedCount > 0 && (
				allChecked
					? <TripDone onClear={clear} dark={dark} theme={theme} />
					: (
						<TripBar
							count={checkedCount}
							hidden={hideChecked}
							onToggle={() => setHideChecked((prev) => ! prev)}
							onClear={clear}
							theme={theme}
						/>
					)
			)}
		</div>
	);
}

/** `1 item` / `4 stores`. */
function plural(count: number, noun: string): string {
	return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

type CardProps = {
	group: ShoppingGroup;
	checked: ReadonlySet<string>;
	onToggle?: (id: string) => void;
	dark: boolean;
	theme: Theme;
};

/**
 * One store's card.
 *
 * **The header is the tag component stretched to the card's width** — term tint
 * fill, term border along the bottom, term dot, term text. This is the one place
 * a term's colour has ever filled a whole band, and it earns it: the store is
 * the organising fact of the entire screen.
 *
 * The storeless group takes the sunk fill and has **no dot**: no term means no
 * colour, so it reads quieter by having no hue at all rather than by being
 * dimmer.
 */
function StoreCard({ group, checked, onToggle, dark, theme }: CardProps) {
	const term = group.storeId ? themed(group.ink, dark) : null;
	const headingId = `shopping-${group.storeId ?? 'none'}`;

	return (
		<section
			aria-labelledby={headingId}
			class="rounded-[20px] overflow-hidden"
			style={{
				background: theme.surface,
				// The card fill separates from the dark ground at 1.27:1, so in
				// dark the border is the edge and has to be the strong one.
				border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
			}}
		>
			<div
				class="flex items-center gap-2.5 h-11 px-[18px]"
				style={{
					background: term ? term.bg : theme.surfaceAlt,
					borderBottom: `1px solid ${term ? term.ring : theme.border}`,
				}}
			>
				{term && <span class="w-2 h-2 rounded-full shrink-0" style={{ background: term.dot }} />}
				<h3
					id={headingId}
					class="font-semibold text-xs uppercase tracking-[0.12em] truncate"
					style={{ color: term ? term.ink : theme.textMuted }}
				>
					{group.storeId ? group.name : 'No store'}
				</h3>
				<span class="flex-1" />
				<span class="font-semibold text-[12.5px]" style={{ color: term ? term.ink : theme.textMuted }}>
					{group.items.length}
				</span>
			</div>

			<ul class="list-none m-0 p-0">
				{group.items.map((item, index) => (
					<ListRow
						key={item.id}
						item={item}
						first={index === 0}
						checked={checked.has(item.id)}
						onToggle={onToggle}
						dark={dark}
						theme={theme}
					/>
				))}
			</ul>
		</section>
	);
}

type RowProps = {
	item: Item;
	/** The header's own border does the job of a rule above the first row. */
	first: boolean;
	checked: boolean;
	onToggle?: (id: string) => void;
	dark: boolean;
	theme: Theme;
};

/**
 * The whole row is the checkbox.
 *
 * It was two targets — the left column ticked, the name and the counts opened
 * the Edit sheet — on the reasoning that both were over 44px and neither could
 * be hit by accident. In a shop that is the wrong split: every press on this
 * screen means *got it*, and the one that opened a sheet did so over exactly
 * the words you were aiming at. There is no way to edit an item from the list
 * now, and nothing is lost — the grid is one press away and it is where
 * editing lives.
 *
 * A checked row does not move. Strike the name, hold the badge at 55%, fill the
 * box: reordering a list under someone's thumb is the same failure the undo
 * rule names. And it drops to `textMuted`, never to `textFaint` — "did I
 * already get the butter?" is a question you ask *about* the checked rows, and
 * the filled box has already said it is done.
 */
function ListRow({ item, first, checked, onToggle, dark, theme }: RowProps) {
	const status = statusFor(item.qty, item.threshold, dark);
	const counts = `have ${toInt(item.qty)} · low at ${toInt(item.threshold)}`;

	const name = (
		<span
			class="font-disp font-semibold text-[17px] whitespace-nowrap truncate"
			style={{
				color: checked ? theme.textMuted : theme.textStrong,
				textDecoration: checked ? 'line-through' : 'none',
				textDecorationThickness: '1.5px',
			}}
		>
			{item.name}
		</span>
	);

	/*
	 * `top-px` is an optical correction, not a layout one.
	 *
	 * Playfair's ascent is tall enough that a 17px line box centres about a
	 * pixel above the middle of the letterforms themselves, so a badge centred
	 * on the box reads as sitting high beside the name. Everything else in the
	 * row is centred on the box and looks right; only the thing sitting *next
	 * to* display type needs the nudge.
	 */
	const badge = (
		<span
			class="relative top-px inline-flex items-center h-[18px] px-[7px] rounded-full font-bold text-[9.5px] uppercase tracking-[0.1em] shrink-0"
			style={{
				background: status.bg,
				border: `1px solid ${status.ring}`,
				color: status.ink,
				opacity: checked ? 0.55 : 1,
			}}
		>
			{status.label}
		</span>
	);

	const meta = (
		<span
			class="text-[13px] whitespace-nowrap md:pr-5"
			style={{ color: theme.textMuted }}
		>
			{counts}
		</span>
	);

	/*
	 * One line where one line fits, and only then two.
	 *
	 * This was `flex-col md:flex-row` — a stack below `md` whatever the widths
	 * were, which broke twice over. The counts dropped to a second line on a
	 * phone even when there was room beside the name, and a column inside a
	 * `self-stretch` target starts at the top, so the name butted against the
	 * row's upper edge with the whole 64px sitting empty underneath it.
	 *
	 * A wrapping row fixes both. The name group holds a 10rem floor and grows
	 * past it, so the counts stay on the line while they fit and wrap beneath
	 * only once the name would be squeezed under a readable width — which is
	 * the collision the stack was guarding against, now detected rather than
	 * assumed. `content-center` centres the line box, one line or two.
	 */
	const body = (
		<>
			<span class="flex items-center gap-2 md:gap-2.5 min-w-0 grow shrink-0 basis-[10rem]">{name}{badge}</span>
			{meta}
		</>
	);

	const bodyClass = 'flex-1 min-w-0 flex flex-wrap items-center content-center gap-x-2.5 gap-y-0.5';

	/*
	 * The box and the words, in that order, in one target or none.
	 *
	 * A viewer gets no `onToggle` and therefore no button — the same row,
	 * rendered as plain spans, which is what keeps a control that does nothing
	 * off a read-only screen (D30).
	 */
	const inner = (
		<>
			<span class="w-[52px] md:w-14 shrink-0 flex items-center justify-center self-stretch">
				<Box checked={checked} theme={theme} />
			</span>
			<span class={`${bodyClass} pr-4 md:pr-0`}>{body}</span>
		</>
	);

	return (
		<li
			class={`flex items-center h-16 md:h-14 ${onToggle ? LIST_ROW : ''}`}
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
		>
			{onToggle ? (
				/*
				 * No `aria-label`: the row's own text names the checkbox, so it
				 * announces as *Butter, OUT, have 0 · low at 2, checkbox, not
				 * checked*. A label would have replaced all of that with the name.
				 */
				<button
					role="checkbox"
					aria-checked={checked}
					onClick={() => onToggle(item.id)}
					class={`flex items-center w-full h-full text-left rounded-[10px] ${LIST_TARGET}`}
				>
					{inner}
				</button>
			) : inner}
		</li>
	);
}

/**
 * The box itself — the chip rule at 22px.
 *
 * Off is the surface on a 2px `textMuted` border; on is the inversion every
 * selected control in this app uses. `textMuted` rather than the composer
 * field's border is a contrast finding: `#6E5F4B` is the strongest border in
 * the dark palette, but it was measured on the *ground*. On the card surface it
 * falls to 2.45:1 — under the 3:1 a control outline needs — and an unchecked
 * box you cannot see is the worst possible failure in this component.
 */
function Box({ checked, theme }: { checked: boolean; theme: Theme }) {
	return (
		<span
			class="flex items-center justify-center w-[22px] h-[22px] rounded-[7px] shrink-0"
			style={checked
				? { background: theme.inkBg }
				: { background: theme.surface, border: `2px solid ${theme.textMuted}` }}
		>
			{checked && <Check size={13} strokeWidth={3.2} style={{ color: theme.inkText }} />}
		</span>
	);
}

/**
 * The trip bar.
 *
 * Controls radius rather than card radius — it is a bar, the same argument the
 * toast makes. **Its right half is deliberately empty, and it is reserved for
 * restocking**: checking a row means "it's in the cart", and the honest end of
 * that sentence is setting the count when you unpack. That is a write to the
 * item, which makes it shared, which is a different design. The bar exists now
 * so that flow has somewhere to land instead of arriving as a new surface.
 */
function TripBar({ count, hidden, onToggle, onClear, theme }: {
	count: number; hidden: boolean; onToggle: () => void; onClear?: () => void; theme: Theme;
}) {
	return (
		<div
			class="flex items-center h-14 md:h-[52px] px-2 mt-6 rounded-[15px]"
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<button
				onClick={onToggle}
				class={`inline-flex items-center gap-1.5 h-11 md:h-[34px] px-3 rounded-[11px] text-sm font-semibold ${LIST_GHOST}`}
			>
				{hidden
					? <Eye size={15} strokeWidth={2.2} />
					: <EyeOff size={15} strokeWidth={2.2} />}
				{hidden ? 'Show' : 'Hide'} {count} checked
			</button>
			<span class="flex-1" />
			{/*
			  * The reset, and it wears the same box as the hide — two views of the
			  * trip, neither of them the thing to do next. **It is not crimson and
			  * it does not confirm**: nothing here is a record, the toast hands
			  * the ticks straight back (D36), and a dialog in front of a phone in
			  * a shop is worse than the mistake it guards.
			  */}
			{onClear && (
				<button
					onClick={onClear}
					class={`inline-flex items-center gap-1.5 h-11 md:h-[34px] px-3 rounded-[11px] text-sm font-semibold shrink-0 ${LIST_GHOST}`}
				>
					<RotateCcw size={15} strokeWidth={2.2} />
					Clear checks
				</button>
			)}
		</div>
	);
}

/**
 * The same bar, once everything is checked.
 *
 * Green because nothing is wrong and nothing is pending — the third rung of the
 * same ramp the item badges use.
 */
function TripDone({ onClear, dark, theme }: {
	onClear?: () => void; dark: boolean; theme: Theme;
}) {
	const ok = statusColor('ok', dark);

	/*
	 * It wraps, and `min-h` replaces the fixed 70.
	 *
	 * Two sentences and a control do not always fit one line at 390 — the words
	 * alone are most of it — so the button drops to a second line and the bar
	 * grows. The old `h-[70px]` would have let it overflow instead, which is the
	 * same bar with its bottom cut off.
	 *
	 * **One control is what makes the wrap read.** With two of them the wrapped
	 * line was a pair pinned right under a sentence that starts 47px in — two
	 * ragged edges, neither shared — and filling the line to fix that turned a
	 * pair of ghosts into centred prose. There is only *Clear checks* now, and a
	 * single trailing action hanging off `ml-auto` is the same shape as the
	 * trip bar above it in either arrangement.
	 */
	return (
		<div
			class="flex flex-wrap items-center gap-[13px] min-h-[70px] py-3 pl-[18px] pr-3 mt-6 rounded-[15px]"
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<span
				class="flex items-center justify-center w-[34px] h-[34px] rounded-full shrink-0"
				style={{ background: ok.bg, border: `1px solid ${ok.ring}` }}
			>
				<Check size={16} strokeWidth={2.6} style={{ color: ok.ink }} />
			</span>
			<span class="flex flex-col gap-0.5 min-w-0 flex-1 basis-[200px]">
				<span class="font-semibold text-[14.5px]" style={{ color: theme.textStrong }}>
					Everything&rsquo;s checked off.
				</span>
				<span class="text-[13px]" style={{ color: theme.textMuted }}>
					Update your counts when you unpack.
				</span>
			</span>
			{/*
			  * *Clear checks*, and it is the bar's only control.
			  *
			  * **There is no exit here.** A *Back to items* sat in this slot and
			  * was a third way out of a mode that already has two — row 2's own
			  * quiet chevron, and the trigger it shares the row with, which is
			  * tinted and pressed while the list is on. Neither of those is on
			  * screen at the foot of a long list, which was the argument for
			  * repeating it here; but the answer to that is a scroll, and the
			  * cost was a second control competing with the one thing this state
			  * is actually for.
			  */}
			{onClear && (
				<button
					onClick={onClear}
					class={`inline-flex items-center gap-1.5 ml-auto shrink-0 h-11 md:h-[34px] px-3 rounded-[11px] text-sm font-semibold ${LIST_GHOST}`}
				>
					<RotateCcw size={15} strokeWidth={2.2} />
					Clear checks
				</button>
			)}
		</div>
	);
}

/**
 * Nothing to buy — which is only ever reachable through a filter.
 *
 * With no filter on, an empty list cannot be reached at all: the trigger is
 * hidden when nothing is low or out. So both variants are green, never amber.
 * Amber is "hold on", and nothing here is being asked of anyone.
 *
 * One card at 520px, sitting in the grid's first track: an empty state stretched
 * across a 1036px column would be absurd.
 */
function ListEmpty({ storeFilterName, elsewhereCount, onClearStoreFilter, onClearFilters, dark, theme }: {
	storeFilterName: string | null;
	elsewhereCount: number;
	onClearStoreFilter: () => void;
	onClearFilters: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const ok = statusColor('ok', dark);
	const scoped = Boolean(storeFilterName);

	return (
		<div
			class="max-w-[520px] flex flex-col items-center gap-3 py-[54px] px-6 rounded-[20px] text-center"
			style={{ background: theme.surface, border: `1px solid ${dark ? theme.borderStrong : theme.border}` }}
		>
			<span
				class="flex items-center justify-center w-11 h-11 rounded-full shrink-0"
				style={{ background: ok.bg, border: `1px solid ${ok.ring}` }}
			>
				<Check size={20} strokeWidth={2.6} style={{ color: ok.ink }} />
			</span>

			<p class="font-disp font-semibold text-[21px]" style={{ color: theme.textStrong }}>
				{scoped ? `Nothing to buy at ${storeFilterName}.` : 'Nothing to buy in this filter.'}
			</p>

			{scoped && elsewhereCount > 0 && (
				<p class="text-sm" style={{ color: theme.textMuted }}>
					Other stores have {plural(elsewhereCount, 'item')} to buy.
				</p>
			)}

			<button
				onClick={scoped ? onClearStoreFilter : onClearFilters}
				class={`inline-flex items-center h-11 md:h-[34px] px-3 mt-0.5 rounded-[11px] text-sm font-semibold ${LIST_GHOST_ON_CARD}`}
			>
				{scoped ? 'Clear the store filter' : 'Clear all filters'}
			</button>
		</div>
	);
}
