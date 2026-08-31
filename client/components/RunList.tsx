import { useEffect, useMemo, useState } from 'preact/hooks';
import { Check, Eye, EyeOff, RotateCcw } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor, statusFor, themed } from '../lib/theme';
import { LIST_GHOST, LIST_GHOST_ON_CARD, LIST_ROW, LIST_TARGET, PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';
import { CheckBox } from './CheckBox';

import { SOURCE_KIND_ICONS } from './SourceKindMenu';
import type { BandKind, RunBand, ShoppingGroup } from '../../shared/runList';
import type { Item } from '../../shared/types';
import { isExtra } from '../../shared/listRule';
import { toInt } from '../../shared/qty';
import { formatSize } from '../../shared/size';
import { readyPhrase } from '../../shared/season';

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
	/**
	 * The bands to draw, already filtered to the chosen tab by the caller.
	 *
	 * A list rather than a map so the order is the model's — Buy · Harvest ·
	 * Make — and so a band with nothing in it simply is not here.
	 */
	bands: RunBand[];
	/** False while one tab is showing: one band needs no header naming it. */
	banded: boolean;
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
	/**
	 * Open the put-away on exactly these rows — the trip bar's one filled
	 * control, and the only thing on this screen that writes.
	 *
	 * It takes the ids for the reason `onClearChecks` does: what is on screen is
	 * what the bar is counting, and a control beside `Hide 3 checked` must not
	 * act on seven.
	 */
	onPutAway?: (ids: string[]) => void;
	/**
	 * How many counts the last put-away wrote, or `null`.
	 *
	 * The caller sets it only while the trip really did empty the list, so this
	 * screen never has to ask whether a filter is what emptied it.
	 */
	putAwayCount: number | null;
	/** Leaves the mode — the only control on the after-the-trip card. */
	onBackToItems: () => void;
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
 * The run list — a mode, not a surface.
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
export function RunList(props: Props) {
	const { bands, banded, checked, onToggle, onClearChecks, onPutAway, dark, theme } = props;

	const [hideChecked, setHideChecked] = useState(false);

	/**
	 * Rows on screen, after *Hide checked*.
	 *
	 * Cards that empty out go with them, and **so do bands** — a `HARVEST · 0`
	 * header over nothing is a heading for an empty room.
	 */
	const shown = useMemo(() => (
		hideChecked
			? bands
				.map((b) => ({
					...b,
					groups: b.groups
						.map((g) => ({ ...g, items: g.items.filter((i) => ! checked.has(i.id)) }))
						// A card kept for its `NOT YET` rows alone: hiding what is
						// checked is about the trip, and nothing down there is on it.
						.filter((g) => g.items.length > 0 || g.notYet.length > 0),
				}))
				.filter((b) => b.groups.length > 0)
			: bands
	), [bands, checked, hideChecked]);

	const groups = useMemo(() => bands.flatMap((b) => b.groups), [bands]);

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

	/** `undefined` rather than a no-op, so the bar renders no control for a viewer. */
	const clear = onClearChecks && (() => onClearChecks(checkedHere));
	const putAway = onPutAway && (() => onPutAway(checkedHere));

	/*
	 * *Run list, 17 to get across three kinds* — the doc's own sentence, and
	 * `kinds` rather than `stores` because that is what the bands are. It falls
	 * back to naming the sources when there is only one band, which is what a
	 * household with nothing but shops hears and is the sentence this screen has
	 * always announced.
	 */
	const announcement = groups.length === 0
		? 'Run list, nothing to get'
		: `Run list, ${plural(total, 'item')} to get across `
			+ (banded ? plural(bands.length, 'kind') : plural(groups.length, 'source'))
			+ (checkedCount > 0 ? `, ${checkedCount} in the cart` : '');

	return (
		<div>
			<span role="status" aria-live="polite" style={SR_ONLY}>{announcement}</span>

			{groups.length === 0
				? (
					<div class="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))] items-start">
						{/*
						  * **The trip finished, or a filter did.** Two empty screens that
						  * look alike and mean opposite things: one says you are done, the
						  * other says you are looking at the wrong slice of the list. The
						  * caller sets `putAwayCount` only while the household's whole list
						  * really is empty, so nothing here has to work out which it was.
						  */}
						{props.putAwayCount !== null ? (
							<PutAwayDone
								count={props.putAwayCount}
								onBack={props.onBackToItems}
								dark={dark}
								theme={theme}
							/>
						) : (
							<ListEmpty
								storeFilterName={props.storeFilterName}
								elsewhereCount={props.elsewhereCount}
								onClearStoreFilter={props.onClearStoreFilter}
								onClearFilters={props.onClearFilters}
								dark={dark}
								theme={theme}
							/>
						)}
					</div>
				)
				: (
					/*
					 * 34px between bands, and nothing between a header and its
					 * grid but the header's own 12.
					 */
					<div class="flex flex-col gap-[34px]">
						{shown.map((band) => (
							<section key={band.kind} aria-label={banded ? BAND_LABELS[band.kind] : undefined}>
								{banded && <BandHeader kind={band.kind} count={band.count} theme={theme} />}

								{/*
								  * Mobile is a single column at its own gutters; from `md`
								  * the tracks fill rather than fit, and `items-start` lets
								  * each card keep its natural height so the bottoms run
								  * ragged. Both class strings are complete literals —
								  * Tailwind resolves a class by scanning source.
								  *
								  * **`auto-fill` earns its keep twice over now.** It was
								  * chosen so one store card left after a filter would not
								  * stretch across the screen; the Harvest and Make bands
								  * usually hold exactly one card each, so they get that
								  * behaviour for free.
								  */}
								<div class="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))] items-start">
									{band.groups.map((group) => (
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
							</section>
						))}
					</div>
				)}

			{/*
			  * The trip bar is a fact about the *trip*, not about Costco, which is
			  * why it sits below the whole grid rather than in a card. A copy in
			  * each card would be five controls doing one job.
			  *
			  * **One shape at every count** (D64). It used to grow to 70px and a green
			  * disc once every row was ticked — *Everything's checked off. / Update
			  * your counts when you unpack.* — which was green for something that was
			  * still pending, and whose second line was a description of the button
			  * now standing beside it. The disc moved to the screen *after* the
			  * put-away, where nothing is pending and the claim is true.
			  */}
			{checkedCount > 0 && (
				<TripBar
					count={checkedCount}
					hidden={hideChecked}
					onToggle={() => setHideChecked((prev) => ! prev)}
					onClear={clear}
					onPutAway={putAway}
					theme={theme}
				/>
			)}
		</div>
	);
}

const BAND_LABELS: Record<BandKind, string> = { buy: 'Buy', harvest: 'Harvest', make: 'Make' };

/** The band's glyph is its source kind's glyph. One mark, three places. */
const BAND_ICONS = { buy: SOURCE_KIND_ICONS.shop, harvest: SOURCE_KIND_ICONS.grow, make: SOURCE_KIND_ICONS.make };

/**
 * A band's header: glyph, `BUY · 12`, then a rule filling the rest.
 *
 * A **micro-label**, which is the app's own word for a heading that names a
 * region without competing with anything in it — the same treatment the item
 * sheet's four sections and the drawer's groups take. The rule is what makes it
 * a band rather than a label floating above a grid, and it is `line` rather
 * than `line strong` because it separates nothing: there is a 34px gap doing
 * that already.
 *
 * The count is the band's own — distinct items, never rows.
 */
function BandHeader({ kind, count, theme }: { kind: BandKind; count: number; theme: Theme }) {
	const Icon = BAND_ICONS[kind];

	return (
		<div class="flex items-center gap-2.5 mb-3" style={{ color: theme.textMuted }}>
			<Icon size={15} strokeWidth={1.7} class="shrink-0" />
			<span class="font-bold text-label uppercase tracking-[0.15em] whitespace-nowrap">
				{BAND_LABELS[kind]} &middot; {count}
			</span>
			<span class="flex-1 h-px" style={{ background: theme.border }} />
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

				{/*
				  * **`NOT YET` — what is coming, not what to do.**
				  *
				  * A sub-group at the foot of a harvest card for the things whose
				  * season has not come round. Its rows keep the 56px height and
				  * lose exactly two things: **the checkbox**, because there is
				  * nothing to pick, and **the status badge**, because the slot says
				  * *Ready in September* instead — which is the one fact that is
				  * actually news here.
				  *
				  * The subhead is inset to the checkbox column's own 56px, so the
				  * label starts where the names do and the empty gutter reads as
				  * the missing checkboxes rather than as a stray indent.
				  *
				  * **The item is unchanged.** An out-of-season squash still reads
				  * *out* on its card and still counts toward the three status
				  * pills; it is only this screen that moves it. That is the one
				  * place the pills and the run list's total deliberately disagree.
				  */}
				{group.notYet.length > 0 && (
					<>
						<li
							class="flex items-center h-[34px] pl-[52px] md:pl-14 pr-4 font-bold text-[10px] uppercase tracking-[0.15em]"
							style={{
								background: theme.surfaceAlt,
								borderTop: `1px solid ${theme.divider}`,
								color: theme.textMuted,
							}}
						>
							Not yet
						</li>
						{group.notYet.map((item) => (
							<NotYetRow key={item.id} item={item} theme={theme} />
						))}
					</>
				)}
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
	const extra = isExtra(item);
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
	/*
	 * **`EXTRA` is what an `always` row says instead of a status** (D65).
	 *
	 * A row forced onto the list while nothing is wrong with it has no status to
	 * report — that is precisely what frees the slot — so it says *why it is
	 * here* instead. **Quiet by having no hue at all**, which is the argument
	 * `NO STORE` already runs on: the three status colours mean something on this
	 * screen, and a fourth tint would have to mean a fourth thing.
	 *
	 * A row that is genuinely low or out keeps its status however it got here.
	 * The status is the more useful of the two facts, and *extra* would be
	 * answering a question nobody asked about a thing that has run out.
	 */
	const badge = (
		<span
			class="relative top-px self-center inline-flex items-center h-[18px] px-[7px] rounded-full font-bold text-[9.5px] uppercase tracking-[0.1em] shrink-0"
			style={{
				background: extra ? theme.surfaceAlt : status.bg,
				border: `1px solid ${extra ? theme.border : status.ring}`,
				color: extra ? theme.textMuted : status.ink,
				opacity: checked ? 0.55 : 1,
			}}
		>
			{extra ? 'Extra' : status.label}
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
	/*
	 * The size rides **with the name**, before the badge — at the shelf
	 * *"Butter, 1 lb"* is one phrase, and moving it across the row to sit with
	 * `have 2 · low at 4` would take that phrase apart to save a measurement.
	 * It is `shrink-0`: the name truncates inside the `min-width: 0` flex and
	 * the size does not, because half a unit is worse than no unit.
	 */
	const size = formatSize(item.size, item.unit);

	const sizeLabel = size && (
		<span
			class="text-[13px] whitespace-nowrap shrink-0"
			style={{ color: theme.textMuted, opacity: checked ? 0.55 : 1 }}
		>
			{size}
		</span>
	);

	const body = (
		<>
			<span class="flex items-baseline gap-2 md:gap-2.5 min-w-0 grow shrink-0 basis-[10rem]">{name}{sizeLabel}{badge}</span>
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
				<CheckBox checked={checked} theme={theme} />
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
 * One `NOT YET` row: a name in meta, and when it will be ready.
 *
 * **Not a button and not in the tab order.** There is nothing to press — no
 * checkbox, and the whole-row target the rows above have exists to tick them.
 * A focusable row that does nothing is worse than a row that says so.
 *
 * The name drops to `textMuted`, which is the same step the checked rows take,
 * and for a related reason: this is a row you are being told about rather than
 * asked about.
 */
function NotYetRow({ item, theme }: { item: Item; theme: Theme }) {
	const size = formatSize(item.size, item.unit);
	const ready = readyPhrase(item.seasonFrom, item.seasonTo);

	return (
		<li
			class="flex items-center h-16 md:h-14"
			style={{ borderTop: `1px solid ${theme.divider}` }}
		>
			{/* The empty gutter is what says these have no checkbox. */}
			<span class="w-[52px] md:w-14 shrink-0" />
			<span class="flex-1 min-w-0 flex flex-wrap items-center content-center gap-x-2.5 gap-y-0.5 pr-4">
				<span class="flex items-baseline gap-2 md:gap-2.5 min-w-0 grow shrink-0 basis-[10rem]">
					<span
						class="font-disp font-semibold text-[17px] whitespace-nowrap truncate"
						style={{ color: theme.textMuted }}
					>
						{item.name}
					</span>
					{size && (
						<span class="text-[13px] whitespace-nowrap shrink-0" style={{ color: theme.textMuted }}>
							{size}
						</span>
					)}
				</span>
				<span class="text-[13px] whitespace-nowrap md:pr-5" style={{ color: theme.textMuted }}>
					{ready}
				</span>
			</span>
		</li>
	);
}

/**
 * The trip bar — one shape at every count.
 *
 * Controls radius rather than card radius: it is a bar, the same argument the
 * toast makes. **Its right half is no longer reserved** (D64) — the whole
 * design has been waiting for the honest end of *it's in the cart*, which is
 * setting the count when you unpack, and that is what *Put N away* is.
 *
 * **Trip management groups left; the trip's one action sits right.** *Hide* and
 * *Clear checks* are both ghosts and both about the ticks — one subject, so
 * they are one group. The only filled control on the bar is the one that
 * writes, and the separation is carried by that fill rather than by a divider:
 * two ghosts and a primary is already three weights, and a hairline between the
 * ghosts would be a fourth statement about a bar 52px tall.
 *
 * **Two ink controls on one screen, and it earns it.** *Add item* holds the only
 * ink fill in row 1. The rule this bar follows is the sheet's — one primary per
 * surface, and a bar below the grid is its own surface the way a sheet's footer
 * is. It is also most of a screen away from row 1 and it is the terminal action
 * of the entire mode.
 */
function TripBar({ count, hidden, onToggle, onClear, onPutAway, theme }: {
	count: number;
	hidden: boolean;
	onToggle: () => void;
	onClear?: () => void;
	onPutAway?: () => void;
	theme: Theme;
}) {
	const hideLabel = `${hidden ? 'Show' : 'Hide'} ${count} checked`;

	/**
	 * **It fades in; it does not slide.** The bar appears under a grid that is
	 * already reflowing to make room for it, and two things moving at once reads
	 * as the page settling rather than as a control arriving.
	 *
	 * A flag flipped in an effect rather than a CSS animation, because the app
	 * has no stylesheet to hold `@keyframes` — an effect runs after the first
	 * paint, so `opacity-0` is what lands and the flip is what transitions.
	 *
	 * **The fade survives `prefers-reduced-motion`**, which is the applied-filter
	 * chip's own rule: what that setting asks for is no *movement*, and a control
	 * that blinks into existence gives no sign anything happened. There is no
	 * movement here to drop.
	 */
	const [shown, setShown] = useState(false);

	useEffect(() => { setShown(true); }, []);

	/*
	 * **At 390 the two ghosts drop to glyph-only 44px squares**, which is what the
	 * glyphs are actually for: they are not decoration on a desktop, they are the
	 * thing that survives at the width where this bar matters most. Three labels
	 * do not fit — 44 + 6 + 44 + the primary leaves room and three sets of words
	 * do not.
	 *
	 * The words survive in `aria-label`, so a screen reader hears the same two
	 * controls at both widths.
	 */
	const ghost = `inline-flex items-center justify-center gap-2 shrink-0 w-11 md:w-auto h-11 md:h-[34px] md:px-3 rounded-[11px] text-sm font-semibold ${LIST_GHOST}`;

	return (
		<div
			role="group"
			aria-label="This trip"
			class={
				'flex items-center gap-1.5 h-14 md:h-[52px] px-2 md:px-3 mt-6 rounded-[15px] '
				+ `transition-opacity duration-[160ms] ease-out ${shown ? 'opacity-100' : 'opacity-0'}`
			}
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<button onClick={onToggle} class={ghost} aria-label={hideLabel}>
				{hidden
					? <Eye size={16} strokeWidth={2.2} />
					: <EyeOff size={16} strokeWidth={2.2} />}
				<span class="hidden md:inline">{hideLabel}</span>
			</button>

			{/*
			  * *Clear checks* moved here from the bar's right half (D64), because
			  * the right half is where the write goes and these two are one
			  * subject: what to do about the ticks.
			  *
			  * **It is not crimson and it does not confirm.** Nothing here is a
			  * record, the toast hands the ticks straight back (D36), and a dialog
			  * in front of a phone in a shop costs more than the mistake. It does
			  * now earn that toast, which it did not before: a check used to be
			  * local, free and cheap, and under restock it is a claim — re-ticking
			  * a shop's worth of rows is not one tap.
			  */}
			{onClear && (
				<button onClick={onClear} class={ghost} aria-label="Clear checks">
					<RotateCcw size={16} strokeWidth={2.2} />
					<span class="hidden md:inline">Clear checks</span>
				</button>
			)}

			<span class="flex-1" />

			{/*
			  * The write. Absent for a viewer, who has no checkboxes to have got
			  * here with — the list stays a pure read surface for them (D30).
			  */}
			{onPutAway && (
				<button
					onClick={onPutAway}
					class={`inline-flex items-center shrink-0 h-[46px] md:h-[38px] px-4 md:px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
					style={{ background: theme.inkBg, color: theme.inkText }}
				>
					Put {count} away
				</button>
			)}
		</div>
	);
}

/**
 * The screen after the trip — where the green went.
 *
 * **A finished trip empties the list by arithmetic**: every row was put away to
 * a count that clears its threshold, so there is nothing left to draw. This is
 * where the old 70px completion note's disc belongs. On the bar it was claiming
 * nothing was pending while the counts still were; here nothing is pending and
 * the sentence is simply true.
 *
 * It takes `ListEmpty`'s construction — the app's one shape for this slot, one
 * card in the grid's first track, at most one action. **That is a knowing
 * departure from the board**, which draws it left-aligned at 440: the two states
 * appear in the same place and a second alignment would read as a second kind of
 * screen.
 *
 * **The numbers are numerals.** The board's copy spells them — *Seven counts
 * updated.* — and every other count in this app is a digit, including the toast
 * this screen's sibling arms (*Cleared 3 checks.*).
 */
function PutAwayDone({ count, onBack, dark, theme }: {
	count: number;
	onBack: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const ok = statusColor('ok', dark);

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
				Everything&rsquo;s put away.
			</p>

			<p class="text-sm" style={{ color: theme.textMuted }}>
				{plural(count, 'count')} updated. Nothing is low or out.
			</p>

			<button
				onClick={onBack}
				class={`inline-flex items-center h-11 md:h-[34px] px-3 mt-0.5 rounded-[11px] text-sm font-semibold ${LIST_GHOST_ON_CARD}`}
			>
				Back to items
			</button>
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
