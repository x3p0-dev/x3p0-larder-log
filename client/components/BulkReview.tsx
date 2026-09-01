import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Check, ChevronDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { entityColorFor, statusColor, themed } from '../lib/theme';
import { CheckBox } from './CheckBox';
import {
	CARD_CHECK_TARGET, CARD_CHIP_ADD, CARD_CHIP_ON, LIST_GHOST,
	PAGE_BUTTON_PRIMARY_ON_SUNK, PAGE_BUTTON_QUIET_ON_SUNK, PAGE_BUTTON_QUIET_SUNK,
	PAGE_FOCUS_ON_SUNK, PAGE_MENU, PAGE_MENU_ROW,
} from '../lib/controlStyles';
import { bulkSummary, checkedTerms, setTermForChecked } from '../../shared/bulkEntry';
import type { BulkGroup, BulkRow, BulkSource } from '../../shared/bulkEntry';
import { formatSize } from '../../shared/size';
import { Stepper } from './Stepper';
import { sourceGroupWord } from '../../shared/source';
import { placeMenu } from '../../shared/menuPlacement';
import type { MenuCorner } from '../../shared/menuPlacement';
import type { Item, Source, Term } from '../../shared/types';

/**
 * The review — where a pasted list and a ticked checklist both land (D67).
 *
 * **A mode that replaces the content column, exactly as the run list is a
 * mode.** Row 1 does not change; row 2 becomes `‹ Back to items` and the
 * counts, in the slot the trip clause holds in list mode. A modal would have
 * been wrong for the same reason it is wrong for the run list: this is a
 * reference you work through, not a question you dismiss to continue.
 *
 * **Nothing is saved until you press Add**, and the commit bar says so on its
 * own face. That sentence is the whole contract of the screen: it is why a
 * checklist can tick thirty-one things without putting thirty-one rows on your
 * shopping list, and why `addItems` resolves every draft before it writes any.
 *
 * **`Set for checked` is the part that decides whether this works.** Bulk entry
 * that leaves you assigning three chips per row two hundred times has not
 * solved the wall it was built for. It was labelled *Set for all* and only ever
 * touched the ticked rows — the label is the behaviour now, rather than a
 * promise the function quietly declined to keep.
 *
 * **Each of its menus *is* the batch's value.** Every ticked row is a term every
 * row it would write already carries, and a press adds one to that set or takes
 * it out — after which every target row holds exactly what the menu shows. So
 * `Dairy` then `Baking` gives the batch both, and a location's set holds one
 * because a shelf is one. `setTermForChecked` and `checkedTerms` are the pair,
 * both in `shared/` because a checkmark that is one row's truth rather than the
 * batch's still draws.
 *
 * **The name is not editable here**, and that is a decision rather than an
 * omission: it was built and taken out on 2026-09-01. The review answers *which
 * of these, and with what tags* — correcting a word belongs to the Add sheet,
 * which is one screen away and is the surface that already asks it. It also
 * kept `existing` the one field on a row that nothing can change, which is what
 * lets the amber row be read once rather than re-derived on every keystroke.
 */
type Props = {
	source: BulkSource;
	rows: BulkRow[];
	setRows: (next: BulkRow[]) => void;
	locations: Term[];
	types: Term[];
	stores: Source[];
	saving: boolean;
	onCommit: () => void;
	onBack: () => void;
	dark: boolean;
	theme: Theme;
};

export function BulkReview({
	source, rows, setRows, locations, types, stores,
	saving, onCommit, onBack, dark, theme,
}: Props) {
	const summary = bulkSummary(rows);
	const sourceWord = sourceGroupWord(stores);

	function patch(key: string, next: Partial<BulkRow>) {
		setRows(rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
	}

	/**
	 * One term, set on every row that is going to be written.
	 *
	 * The rule is `setTermForChecked`; this is the two lines around it. **It is
	 * not a record and gets neither a toast nor a confirm** — *undo what comes
	 * back, confirm what doesn't* (D36) is about rows in a database and there is
	 * nothing here yet, and the chips are visibly on twenty-two rows a moment
	 * after the press, which is the most legible confirmation available.
	 */
	function setForChecked(group: BulkGroup, id: string) {
		setRows(setTermForChecked(rows, group, id));
	}

	const bandLabel = source === 'paste'
		? `Pasted list · ${summary.lines} ${summary.lines === 1 ? 'line' : 'lines'}`
		: `Common items · ${summary.lines}`;

	return (
		<div>
			{/*
			  * **The card does not clip, and that is what the pickers need.**
			  * `overflow-hidden` was here to keep the header band's fill inside the
			  * radius, and it cropped every menu opened from the band and from every
			  * row — at the card's own edge, which is the console Members card's bug
			  * exactly. The price is the console's price too: anything full-bleed in
			  * here rounds its own corners, which is what the band now does.
			  */}
			<section
				aria-label="Review"
				class="rounded-[20px]"
				style={{
					background: theme.surface,
					border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
				}}
			>
				{/*
				  * The header band carries what this is on the left and the one
				  * control that makes the screen work on the right. It wraps rather
				  * than truncating: three triggers and a label do not fit 358px, and
				  * a *Set for checked* that scrolled out of view is the control nobody
				  * finds.
				  *
				  * `rounded-t-[19px]` is the card's own 20 less its 1px border —
				  * where the inner edge actually is — because the card no longer
				  * clips this fill for it.
				  */}
				<div
					class="flex items-center gap-3 flex-wrap px-[18px] py-2.5 min-h-11 rounded-t-[19px]"
					style={{ background: theme.surfaceAlt, borderBottom: `1px solid ${theme.border}` }}
				>
					<h2
						class="font-semibold text-xs uppercase tracking-[0.12em] truncate"
						style={{ color: theme.textMuted }}
					>
						{bandLabel}
					</h2>

					<span class="flex-1" />

					<div class="flex items-center gap-1.5 flex-wrap">
						<span class="text-[12.5px] font-semibold mr-0.5" style={{ color: theme.textMuted }}>
							Set for checked
						</span>
						{/*
						  * Each menu ticks what the whole batch already carries, so a run
						  * of presses can be read back rather than remembered — and
						  * `single` is the row chip's own rule: a shelf is one answer and
						  * closes the menu, types and sources are a set you keep building.
						  */}
						<SetForChecked
							label="Location" terms={locations} single
							selected={checkedTerms(rows, 'location')}
							onPick={(id) => setForChecked('location', id)}
							dark={dark} theme={theme}
						/>
						<SetForChecked
							label={sourceWord} terms={stores}
							selected={checkedTerms(rows, 'store')}
							onPick={(id) => setForChecked('store', id)}
							dark={dark} theme={theme}
						/>
						<SetForChecked
							label="Type" terms={types}
							selected={checkedTerms(rows, 'type')}
							onPick={(id) => setForChecked('type', id)}
							dark={dark} theme={theme}
						/>
					</div>
				</div>

				<ul class="list-none m-0 p-0">
					{rows.map((row, index) => (
						<ReviewRow
							key={row.key}
							row={row}
							first={index === 0}
							locations={locations}
							types={types}
							stores={stores}
							sourceWord={sourceWord}
							onPatch={(next) => patch(row.key, next)}
							dark={dark}
							theme={theme}
						/>
					))}
				</ul>
			</section>

			{/*
			  * The trip bar's construction — sunk fill, `line` border, radius 15 —
			  * doing the same job one screen over: the terminal action of a whole
			  * mode, on its own surface below the thing it acts on.
			  */}
			<div
				class="flex items-center gap-3 min-h-14 md:min-h-[56px] px-3 md:px-[18px] py-2 mt-6 rounded-[15px] flex-wrap"
				style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
			>
				<span class="text-[12.5px] leading-[1.45] min-w-0" style={{ color: theme.textMuted }}>
					<span class="hidden md:inline">
						{summary.skipped > 0 && `${summary.skipped} ${summary.skipped === 1 ? 'line' : 'lines'} skipped · `}
						Nothing is saved until you press Add
					</span>
					<span class="md:hidden">
						{summary.skipped > 0 ? `${summary.skipped} skipped` : 'Nothing saved yet'}
					</span>
				</span>

				<span class="flex-1" />

				<button
					onClick={onBack}
					class={`shrink-0 h-11 md:h-[38px] px-3 md:px-4 rounded-[13px] text-[15px] font-semibold ${LIST_GHOST}`}
				>
					Cancel
				</button>

				<button
					onClick={onCommit}
					disabled={saving || summary.selected === 0}
					class={`inline-flex items-center shrink-0 h-[46px] md:h-[38px] px-4 md:px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY_ON_SUNK}`}
					style={{ background: theme.inkBg, color: theme.inkText }}
				>
					{saving ? 'Adding…' : `Add ${summary.selected} ${summary.selected === 1 ? 'item' : 'items'}`}
				</button>
			</div>
		</div>
	);
}

/**
 * One row of the table.
 *
 * **A duplicate arrives unchecked, in amber, showing what you already have.**
 * *In Pantry* beside its name, *4 on hand · low at 6* under it, its real
 * tags rather than dashed chips, and no count field — nothing is going to be
 * written to it, so there is nothing on the row to set. **Amber because amber is
 * "hold on" and crimson is "gone"**, and nothing here is being destroyed.
 *
 * **There is no `New` badge and there was one on every other row.** *New* is
 * what a row on this screen is unless it says otherwise, so a marker for it was
 * on twenty rows to distinguish them from two — and it cost a 120px column that
 * every row reserved. A marker earns its place by being the exception.
 *
 * **Below `lg` the row stacks two-deep** — the name and its count above, the
 * chips below. That is the same shape that made *put the review inside the 480
 * sheet* unworkable on desktop; at 358 there is no other shape available, so on
 * a phone it stops being a compromise and is simply the row. **It moved from
 * `md` to `lg` when the count became a stepper**: 132px where a bare field was
 * 76, and at 768 with the rail beside it the fixed columns left the name about
 * 90px of a column it has to be readable in.
 *
 * **The count stays on the name's line at every width**, right-aligned against
 * it — which is the put-away sheet's row exactly, and it is the same question
 * asked on the two screens at either end of a trip. The stepper gives back 16px
 * of width below `lg` to pay for the line it now shares.
 *
 * **The tick is a gutter and every line hangs off it.** A wrapped line used to
 * begin under the checkbox, which reads as belonging to the row above — a
 * checkbox is a column, not the first word of a paragraph.
 *
 * **The count is the app's stepper**, wearing the Add sheet's own field
 * treatment because that is what a `Stepper` is made of. It was the one number
 * in the app you could not press.
 */
function ReviewRow({
	row, first, locations, types, stores, sourceWord, onPatch, dark, theme,
}: {
	row: BulkRow;
	first: boolean;
	locations: Term[];
	types: Term[];
	stores: Source[];
	sourceWord: string;
	onPatch: (next: Partial<BulkRow>) => void;
	dark: boolean;
	theme: Theme;
}) {
	const here = row.existing;
	/*
	 * **Amber, and only on a duplicate.** There was a green `New` on every other
	 * row and it said nothing: *new* is what a row on this screen is unless it
	 * says otherwise, so the badge was on twenty rows to distinguish them from
	 * two. A marker earns its place by being the exception.
	 */
	const badge = statusColor('low', dark);
	const size = formatSize(row.size, row.unit);

	return (
		<li
			/*
			 * **The tick is a gutter, and everything else lives beside it.** The row
			 * used to be one flex line that wrapped, so the second line — the count
			 * and the chips at a narrow width, and any chip that wrapped at a wide
			 * one — began under the checkbox rather than under the name. A checkbox
			 * is a column, not the first word of a paragraph: a wrapped line that
			 * runs back under it reads as belonging to the row above.
			 *
			 * `min-h` rather than a fixed 62: the stepper is 44 and a duplicate
			 * carries a line under its name. A fixed height clipped the taller of the
			 * two shapes, and only the shape that has something extra to say.
			 */
			class="flex items-start gap-3 px-[18px] py-3 lg:py-2.5 lg:min-h-[62px]"
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
		>
			{/*
			  * **One offset, derived rather than eyeballed** — (44 − 22) / 2, the
			  * stepper's height less the tick's. Wherever the name shares its line
			  * with a stepper the line is 44 tall and the name is centred in it, so
			  * the tick takes the same 11 to land level with the word it is about.
			  *
			  * **A duplicate is the exception below `lg`**, and only there: it has
			  * no stepper, so its first line is the name's own 22 and the tick sits
			  * at the top of it.
			  */}
			<span class={`shrink-0 w-[22px] ${here ? 'lg:mt-[11px]' : 'mt-[11px]'}`}>
				{here ? (
					/*
					 * **The gutter holds its width and stands empty**, which is the
					 * run list's `NOT YET` rule: the rows above have a box there and
					 * a row that loses one must not slide its name 36px left. There
					 * is nothing to press, so there is no control here to disable.
					 */
					<span class="block w-[22px]" aria-hidden="true" />
				) : (
					<button
						onClick={() => onPatch({ checked: ! row.checked })}
						class={`-m-1 p-1 rounded-[9px] ${CARD_CHECK_TARGET}`}
						aria-pressed={row.checked}
						aria-label={row.checked ? `Skip ${row.name}` : `Add ${row.name}`}
					>
						<CheckBox checked={row.checked} theme={theme} />
					</button>
				)}
			</span>

			{/*
			  * Everything the row says, in one column beside the gutter. It stacks
			  * two-deep until `lg` and is one line above it — **`lg`, not `md`**,
			  * because the stepper is 132 where the bare field was 76: at 768 with
			  * the rail beside it, the fixed columns left the name about 90px, which
			  * is a field you cannot read a name in.
			  */}
			<div class="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-3.5">
				{/*
				  * **The name and the count are one line at every width, and below
				  * `lg` that is the whole of this wrapper's job.** They were stacked
				  * — name, then a second line holding the count and the chips — which
				  * spent a whole line on a control 116px wide and put the number a
				  * line away from the thing it counts. Beside the name it is the
				  * **put-away sheet's row**, which is the same question asked on the
				  * screen at the other end of the same trip.
				  *
				  * Above `lg` it is `contents`, so the name and the stepper are
				  * direct children of the row again and take their own columns.
				  */}
				<div class="flex items-center gap-3 min-w-0 lg:contents">
					{/*
					  * **The name takes the slack, which is what pushes everything else
					  * right.** `flex-1` on the one left-aligned thing is the whole of the
					  * alignment: the stepper and the chips are fixed-width columns after
					  * it, so their edges line up down the table without any of them
					  * knowing what the others measure.
					  */}
					<div class="flex-1 min-w-0">
						{/*
						  * `min-h-[22px]` is what makes the duplicate row's zero offset
						  * exact: with no stepper beside it the line is a tick's height
						  * whatever the name, the size and the badge measure, so the two sit
						  * level without either knowing the other's metrics.
						  */}
						<div class="flex items-baseline gap-2 min-w-0 min-h-[22px]">
							<span
								class="font-disp text-[17px] font-semibold tracking-[-0.01em] truncate"
								style={{ color: theme.textStrong }}
							>
								{row.name}
							</span>
							{/* The size rides with the name — at the shelf *Butter, 1 lb* is one phrase (D52). */}
							{! here && size && (
								<span class="text-[12.5px] whitespace-nowrap shrink-0" style={{ color: theme.textMuted }}>
									{size}
								</span>
							)}

							{/*
							  * **Beside the name, because it is about the name.** It sat in a
							  * column at the row's far end, which put the answer to *have I
							  * got this already* a whole row's width from the word it answers
							  * about — and made every other row spend 120px reserving space
							  * for it.
							  *
							  * **It says where, not merely that.** *Already here* is true of
							  * the row you are looking at as much as of the pantry; naming
							  * the pantry is what makes it an answer rather than a label —
							  * and *In Pantry* says it in two words, which is what a pill
							  * beside a truncating name can afford.
							  */}
							{here && (
								<span
									class="shrink-0 inline-flex items-center h-[22px] px-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap"
									style={{ background: badge.bg, color: badge.ink, border: `1px solid ${badge.ring}` }}
								>
									In Pantry
								</span>
							)}
						</div>

						{/*
						  * **What you already have**, which is the one thing this row exists
						  * to say. It replaces the size line rather than joining it: the
						  * pasted size is about a thing that is not going to be written, and
						  * the stored counts are about the row that is already on the shelf.
						  */}
						{here && (
							<span class="block text-[12.5px] truncate pt-1" style={{ color: theme.textMuted }}>
								{here.qty} on hand &middot; low at {here.threshold}
							</span>
						)}
					</div>

					{here ? (
						/*
						 * A duplicate is not written, so it has no count to set — and
						 * above `lg` the column still has to be reserved or the chips
						 * of a duplicate row would slide 132px left of every other
						 * row's. Below `lg` there is no column to hold open.
						 */
						<span class="hidden lg:block w-[132px] shrink-0" aria-hidden="true" />
					) : (
						/*
						 * **The count is the app's stepper**, in the row form it was
						 * extracted for (D64): every row here has a name to read and
						 * there are twenty of them, so the control is a peer of its row
						 * rather than the point of it. It replaced a bare digit field —
						 * which was the one number in the app you could not press.
						 */
						<Stepper
							value={row.qty}
							onValue={(next) => onPatch({ qty: next })}
							label={`How many ${row.name}`}
							compact
							dark={dark}
							theme={theme}
						/>
					)}
				</div>

				{/*
				  * **Right-aligned above `lg`**, so the chips end at the row's edge
				  * and the column reads as a column rather than as three ragged
				  * ones. Below `lg` they are the row's second line and left is the
				  * reading order, with nothing to line up with. The freed 120px of
				  * the old badge column went to the name.
				  */}
				<div class="flex items-center gap-1.5 flex-wrap min-w-0 lg:justify-end lg:w-[340px] xl:w-[380px] lg:shrink-0">
					{here ? (
						/*
						 * A duplicate shows **its real tags**, not dashed chips: the
						 * row already has a shelf and a shop, and offering to set one
						 * would be offering to change an item this screen does not
						 * write to.
						 */
						<HeldTags item={here} locations={locations} types={types} stores={stores} dark={dark} theme={theme} />
					) : (
						<>
							<RowChip
								group="location" label="Location" terms={locations}
								selected={row.locationId ? [row.locationId] : []}
								onPick={(id) => onPatch({ locationId: row.locationId === id ? '' : id })}
								dark={dark} theme={theme}
							/>
							<RowChip
								group="store" label={sourceWord} terms={stores}
								selected={row.storeIds}
								onPick={(id) => onPatch({
									storeIds: row.storeIds.includes(id)
										? row.storeIds.filter((held) => held !== id)
										: [...row.storeIds, id],
								})}
								dark={dark} theme={theme}
							/>
							<RowChip
								group="type" label="Type" terms={types}
								selected={row.typeIds}
								onPick={(id) => onPatch({
									typeIds: row.typeIds.includes(id)
										? row.typeIds.filter((held) => held !== id)
										: [...row.typeIds, id],
								})}
								dark={dark} theme={theme}
							/>
						</>
					)}
				</div>
			</div>
		</li>
	);
}

/** A duplicate's own tags, read straight off the row it matched. */
function HeldTags({ item, locations, types, stores, dark, theme }: {
	item: Item;
	locations: Term[];
	types: Term[];
	stores: Source[];
	dark: boolean;
	theme: Theme;
}) {
	const tags: { id: string; name: string; color: ReturnType<typeof themed> }[] = [];

	const place = locations.find((t) => t.id === item.locationId);
	if (place) tags.push({ id: place.id, name: place.name, color: themed(place.ink, dark) });

	for (const id of item.storeIds) {
		const store = stores.find((s) => s.id === id);
		if (store) tags.push({ id: store.id, name: store.name, color: themed(store.ink, dark) });
	}

	for (const id of item.typeIds) {
		const type = types.find((t) => t.id === id);
		if (type) tags.push({ id: type.id, name: type.name, color: themed(type.ink, dark) });
	}

	if (tags.length === 0) {
		return <span class="text-[12.5px]" style={{ color: theme.textFaint }}>No tags</span>;
	}

	return (
		<>
			{tags.map((tag) => (
				<span
					key={tag.id}
					class="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[12.5px] whitespace-nowrap"
					style={{ background: tag.color.bg, color: tag.color.ink, border: `1px solid ${tag.color.ring}` }}
				>
					<span class="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tag.color.dot }} />
					{tag.name}
				</span>
			))}
		</>
	);
}

/**
 * One row's chip for one taxonomy — dashed where nothing is set, the term's own
 * colour where something is.
 *
 * It opens the same picker the header band's *Set for all* opens, scoped to one
 * row. One popover written once rather than two that drift: the question is
 * identical, only the answer's reach differs.
 */
function RowChip({ group, label, terms, selected, onPick, dark, theme }: {
	group: BulkGroup;
	label: string;
	terms: Term[];
	selected: string[];
	onPick: (id: string) => void;
	dark: boolean;
	theme: Theme;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useDismiss(open, () => setOpen(false), ref);

	const placement = useMenuPlacement(open, ref);

	const color = entityColorFor(selected[0] ?? '', terms, dark);

	// The group closes after one pick when it holds one answer, and stays open
	// when it holds several — the rail's quick-filter rule, for its own reason:
	// an item names one shelf and any number of types.
	const single = group === 'location';

	return (
		<div class="relative" ref={ref}>
			{selected.length === 0 ? (
				<button
					onClick={() => setOpen((o) => ! o)}
					class={`inline-flex items-center h-[26px] px-2.5 rounded-full text-[12.5px] whitespace-nowrap ${CARD_CHIP_ADD}`}
					aria-haspopup="menu"
					aria-expanded={open}
				>
					+ {label}
				</button>
			) : (
				<button
					onClick={() => setOpen((o) => ! o)}
					class={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full text-[12.5px] whitespace-nowrap ${CARD_CHIP_ON}`}
					style={{ background: color.bg, color: color.ink, border: `1px solid ${color.ring}` }}
					aria-haspopup="menu"
					aria-expanded={open}
				>
					<span class="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color.dot }} />
					{terms.find((t) => t.id === selected[0])?.name ?? label}
					{/* The chip names the first and counts the rest: three type names
					  * across a 340px column is where every row in the table starts
					  * wrapping to two lines. */}
					{selected.length > 1 && <span class="font-semibold">+{selected.length - 1}</span>}
				</button>
			)}

			{open && (
				<TermMenu
					terms={terms}
					selected={selected}
					onPick={(id) => { onPick(id); if (single) setOpen(false); }}
					placement={placement}
					dark={dark}
					theme={theme}
				/>
			)}
		</div>
	);
}

/** The header band's trigger — quiet, and it holds an open state like the sort's. */
function SetForChecked({ label, terms, selected, single, onPick, dark, theme }: {
	label: string;
	terms: Term[];
	/** What every row this would touch already carries — the menu's checkmarks. */
	selected: string[];
	/** One answer, so the menu closes on a pick. Location alone. */
	single?: boolean;
	onPick: (id: string) => void;
	dark: boolean;
	theme: Theme;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useDismiss(open, () => setOpen(false), ref);

	const placement = useMenuPlacement(open, ref);

	return (
		<div class="relative" ref={ref}>
			<button
				onClick={() => setOpen((o) => ! o)}
				/*
				 * `PAGE_BUTTON_QUIET_SUNK` brings resting colours only — the style's
				 * own comment names the four things a caller has to supply, and the
				 * console shipped four triggers that brought one of them.
				 *
				 * **The `_SUNK` pair, because the header band is `surface-alt`.** The
				 * plain one hovers to `surface-alt` and opens to `surface-alt`, so on
				 * this band all three triggers had a hover you could not see and an
				 * open state only a screen reader could hear.
				 */
				class={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[9px] text-[12.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS_ON_SUNK} ${open ? PAGE_BUTTON_QUIET_ON_SUNK : PAGE_BUTTON_QUIET_SUNK}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`Set ${label.toLowerCase()} on every checked item`}
			>
				{label}
				<ChevronDown
					size={13}
					style={{ color: theme.textFaint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
				/>
			</button>

			{/*
			  * **It closes after one pick when it holds one answer, and stays open
			  * when it holds a set** — the rail's quick-filter rule, and the row
			  * chip's, for the reason both have it: a batch names one shelf and any
			  * number of types, so building the second means pressing twice and a
			  * menu that shut in between would have to be reopened for each one.
			  */}
			{open && (
				<TermMenu
					terms={terms}
					selected={selected}
					onPick={(id) => { onPick(id); if (single) setOpen(false); }}
					placement={placement}
					dark={dark}
					theme={theme}
				/>
			)}
		</div>
	);
}

/** The picker's own width and its height cap — the two numbers placement needs. */
const MENU_W_PX = 220;
const MENU_MAX_PX = 320;

/**
 * The four corners a picker can hang from, as **complete literals**.
 *
 * Tailwind resolves a class by scanning source for a static string, so these
 * cannot be assembled from parts — and appending an override to a base would be
 * the coin toss the console sweep warns about, since `left-0 right-0` on one
 * element is settled by sheet order rather than by the order they are written.
 *
 * **The literals live here and the rule lives in `shared/`.** `placeMenu` names
 * a corner and nothing else, so no class string is ever written in a file
 * Tailwind is not scanning for one.
 */
const MENU_AT: Record<MenuCorner, string> = {
	'down-left': 'left-0 top-full mt-1.5',
	'down-right': 'right-0 top-full mt-1.5',
	'up-left': 'left-0 bottom-full mb-1.5',
	'up-right': 'right-0 bottom-full mb-1.5',
};

type Placement = { at: string; max: number };

const BELOW_LEFT: Placement = { at: MENU_AT['down-left'], max: MENU_MAX_PX };

/**
 * Where a picker opens — measured against the viewport, once, when it opens.
 *
 * **The alignment used to be a static breakpoint rule and it was wrong in both
 * directions.** A row's chips and the band's three triggers both *wrap*, so
 * where a trigger sits is decided by the content beside it rather than by the
 * window: at 390 the chips end up in the right half of the row and a left-hung
 * menu ran off the screen, while a right-hung one ran off the other side as soon
 * as the band's triggers wrapped to the left gutter. **A position that depends
 * on content cannot be derived from a breakpoint** — which is the opposite of
 * the run list's segment, whose widths really are arithmetic.
 *
 * **It measures the trigger and never the menu**, which is what keeps it to one
 * pass. The menu's width is a constant and its height has a cap, so both bounds
 * are known before it is drawn — the chart tooltip's rule, reached the same way:
 * measuring the box would mean rendering it to find its size and again to place
 * it.
 *
 * **The two reads of `window` are the whole of what is not in `shared/`.** The
 * arithmetic is `placeMenu`, where `npm test` can see it.
 *
 * **It also caps the height to the room it actually has**, so the last row of a
 * long table opens a shorter, scrolling menu rather than one running off the
 * bottom of the screen. The cap is an inline style on purpose: it beats the
 * class, so there is no second `max-h-*` to lose a coin toss to.
 *
 * `useLayoutEffect`, because a `useEffect` runs after paint and the menu would
 * be drawn once in the wrong corner before moving.
 */
function useMenuPlacement(open: boolean, ref: { current: HTMLElement | null }): Placement {
	const [placement, setPlacement] = useState<Placement>(BELOW_LEFT);

	useLayoutEffect(() => {
		if (! open) return;

		/*
		 * The wrapper's box *is* the trigger's: the panel inside it is absolutely
		 * positioned and so contributes nothing to it.
		 */
		const box = ref.current?.getBoundingClientRect();

		if (! box) return;

		const seat = placeMenu(
			box,
			{ width: window.innerWidth, height: window.innerHeight },
			{ width: MENU_W_PX, maxHeight: MENU_MAX_PX }
		);

		setPlacement({ at: MENU_AT[seat.corner], max: seat.maxHeight });
		// The trigger cannot move while its own menu is open, so one read per
		// opening is the whole of it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	return placement;
}

/**
 * The picker both triggers open — the sort menu's construction with a term dot
 * on each row.
 *
 * **The check means *this is already carried*, not *this is the current
 * value***, which is why it can coexist with a hover fill rather than needing
 * one of them to mean *selected*. From a row it means that row holds the term;
 * from the header band it means **every** row the band would touch holds it,
 * which is a stronger claim and the reason `checkedTerms` is not just an
 * `includes`.
 */
function TermMenu({ terms, selected, onPick, placement, dark, theme }: {
	terms: readonly Term[];
	selected: readonly string[];
	onPick: (id: string) => void;
	placement: Placement;
	dark: boolean;
	theme: Theme;
}) {
	if (terms.length === 0) {
		return (
			<div
				class={`${PAGE_MENU} ${placement.at} w-[220px]`}
				style={{ boxShadow: '0 14px 30px rgba(36, 30, 23, 0.20)' }}
			>
				<p class="px-2.5 py-2 text-[12.5px] leading-[1.45]" style={{ color: theme.textMuted }}>
					None yet. Make one in the Filter tab.
				</p>
			</div>
		);
	}

	return (
		<div
			role="menu"
			/*
			 * `max-h` and a scroll, for the unit menu's reason: fifteen types is
			 * 593px of menu, and this one can open from the last row of a long
			 * table. The class is the ceiling; the inline value is the room this
			 * particular opening really has.
			 */
			class={`${PAGE_MENU} ${placement.at} w-[220px] max-h-[320px] overflow-y-auto`}
			style={{ boxShadow: '0 14px 30px rgba(36, 30, 23, 0.20)', maxHeight: `${placement.max}px` }}
		>
			{terms.map((term) => {
				const on = selected.includes(term.id);
				const color = themed(term.ink, dark);

				return (
					<button
						key={term.id}
						role="menuitemcheckbox"
						aria-checked={on}
						onClick={() => onPick(term.id)}
						class={PAGE_MENU_ROW}
						style={{ color: on ? theme.textStrong : theme.text, fontWeight: on ? 600 : 400 }}
					>
						<span class="w-2 h-2 rounded-full shrink-0" style={{ background: color.dot }} />
						<span class="flex-1 min-w-0 truncate">{term.name}</span>
						{on && <Check size={15} strokeWidth={2.4} style={{ color: '#BE3346' }} />}
					</button>
				);
			})}
		</div>
	);
}

/**
 * Escape and an outside press, on a ref that wraps the trigger as well as the
 * panel.
 *
 * `useDismiss` proper takes a `useRef` object and a different shape of caller;
 * this is the same two listeners with the same rule — a handler that exempts
 * only the panel closes on `pointerdown` and lets the trigger reopen on the
 * `click`, which is the bug the rail needed a `dismissed` ref for.
 */
function useDismiss(open: boolean, close: () => void, ref: { current: HTMLElement | null }) {
	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
		function onDown(e: PointerEvent) {
			if (! ref.current?.contains(e.target as Node)) close();
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);
}
