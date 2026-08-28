import { Plus, Minus, ChevronDown, Pencil, ShoppingCart, Slash, Trash2 } from 'lucide-preact';

import type { Theme, ThemedColor } from '../lib/theme';
import { entityColorFor, statusFor, termNameFor } from '../lib/theme';
import type { Item, Term } from '../../shared/types';
import { formatSize } from '../../shared/size';
import {
	CARD_ACTION, CARD_ACTION_GHOST, CARD_HEADER, CARD_STEPPER, CARD_STEPPER_PRIMARY,
} from '../lib/controlStyles';

type Props = {
	item: Item;
	open: boolean;
	locations: Term[];
	types: Term[];
	stores: Term[];
	dark: boolean;
	theme: Theme;
	/** `item:write`. False strips the steppers, edit, and remove — see D30. */
	canEdit: boolean;
	/**
	 * False drops the chevron and the header's button semantics.
	 *
	 * For the marketing page's hero, where the steppers are live but there is
	 * no *Edit* or *Remove* behind the accordion to reveal. A chevron that
	 * expands nothing, sitting beside a stepper that works, reads as broken —
	 * and a public page is the worst place to ship a dead control.
	 */
	canExpand?: boolean;
	onToggleOpen: () => void;
	onAdjustQty: (delta: number) => void;
	onRemove: () => void;
	onStartEdit: () => void;
};

/**
 * One taxonomy chip: a dot in the term's own color, then its name.
 *
 * The design dropped the icon-circles the card used to carry — a location and
 * a type were two glyphs you had to hover to identify. A named chip says what
 * it is, and the dot is what carries the color.
 */
function TermChip({ name, color }: { name: string; color: ThemedColor }) {
	return (
		<span
			class="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-xs"
			style={{ background: color.bg, border: `1px solid ${color.ring}`, color: color.ink }}
		>
			<span class="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color.dot }} />
			{name}
		</span>
	);
}

export function ItemCard({
	item, open, locations, types, stores, dark, theme, canEdit, canExpand = true,
	onToggleOpen, onAdjustQty, onRemove, onStartEdit,
}: Props) {
	const s = statusFor(item.qty, item.threshold, dark);
	const atZero = Number(item.qty) <= 0;

	/*
	 * The card's edge carries the status, so a shelf of cards reads as a
	 * distribution before you read a single name. "In stock" is the neutral
	 * line rather than a green one — only a problem is worth an outline.
	 */
	const edge = s.key === 'ok' ? theme.border : s.ring;

	/*
	 * The numeral takes the status text, except when out, where it takes the
	 * dot — crimson. Low's dot is too pale to read at 42px on cream; out's is
	 * the brand color and is meant to shout.
	 */
	const qtyColor = s.key === 'ok' ? theme.textStrong : s.key === 'out' ? s.dot : s.ink;

	const size = formatSize(item.size, item.unit);

	const header = (
		<>
			{/*
			  * The size sits **beneath** the name, not beside it. Names are long,
			  * and the shopping list's own name-and-badge collision at 460 is
			  * already on record; under the name is safe at every card width.
			  */}
			<span class="flex flex-col min-w-0">
				<span class="font-disp text-item-sm sm:text-item font-semibold leading-[1.15] break-words" style={{ color: theme.textStrong }}>
					{item.name}
				</span>
				{/* Meta, not faint — the boards' own value, and the one that clears 4.5:1. */}
				{size && <span class="text-[13px] pt-0.5" style={{ color: theme.textMuted }}>{size}</span>}
			</span>

			{/*
			  * Centred on the name's *first line*, not on the row.
			  *
			  * The row is `items-start` because a name can wrap and the status
			  * belongs beside its first line rather than halfway down two — but
			  * `start` aligned the cluster to the top of that line's box, and a
			  * 17px chevron against a 21px line reads as riding high. The floor
			  * is the line box (18.5px and 21px at `leading-[1.15]`), so the
			  * cluster centres inside exactly the band the first line occupies
			  * and still sits at the top when the name runs to two.
			  *
			  * `top-px` on top of that is optical: Playfair's ascent puts the
			  * middle of the letterforms about a pixel below the middle of the
			  * box that holds them, so geometric centring still reads high.
			  */}
			<span class="relative top-px flex items-center gap-2 shrink-0 min-h-[21px] sm:min-h-[24px]">
				{/*
				  * A struck cart, left of the status, when the item is kept off the
				  * shopping list. **The status itself does not change** — the card
				  * still says running low, because it is. Without something here,
				  * "why isn't the olive oil on my list" has no answer anywhere in
				  * the grid.
				  *
				  * It is a glyph nobody has been taught, on a card that otherwise
				  * carries no icons beside the name, so it is the first thing to
				  * challenge if this reads as clutter.
				  */}
				{item.offShoppingList && (
					<span
						role="img"
						aria-label="Kept off the shopping list"
						title="Kept off the shopping list"
						class="relative inline-flex shrink-0"
						style={{ color: theme.textFaint }}
					>
						<ShoppingCart size={14} strokeWidth={1.9} />
						<Slash size={14} strokeWidth={1.9} class="absolute inset-0" />
					</span>
				)}
				{/*
				  * In stock is a dot; low and out get the word. A badge on every
				  * card would make the healthy majority as loud as the problems.
				  */}
				{s.key === 'ok' ? (
					<span class="w-2 h-2 rounded-full" style={{ background: s.dot }} aria-label={s.label} />
				) : (
					<span
						class="px-[11px] py-1 rounded-full text-[11.5px] font-bold uppercase tracking-[0.04em]"
						style={{ background: s.bg, color: s.ink }}
					>
						{s.label}
					</span>
				)}
				{canExpand && (
					<ChevronDown
						size={17}
						class="shrink-0 transition-[transform,color] text-ink-faint group-hover:text-ink-muted"
						style={{ transform: open ? 'rotate(180deg)' : 'none' }}
					/>
				)}
			</span>
		</>
	);

	return (
		/*
		 * Collapsed cards share a height; an expanded one grows on its own.
		 *
		 * The obvious route — `align-items: stretch` on the grid — gives true
		 * per-row equality and cannot be used here. A grid row is sized by its
		 * tallest item's *content*, and `align-self: start` on that item changes
		 * only where it sits in the row, not how tall the row is. So an open card
		 * would drag every sibling in its row down with it, which is exactly what
		 * the grid's `items-start` exists to prevent.
		 *
		 * Equality therefore has to come from a floor on the card itself. 188px is
		 * the natural height of a card with a one-line name and two rows of chips,
		 * which covers the ordinary item; `mt-auto` on the quantity row pins it to
		 * the bottom edge so the padding lands as breathing room under the chips
		 * rather than as a gap in the middle.
		 *
		 * A card with more chips than that still comes out taller. Clamping the
		 * rows would fix it and is not worth it — the chips are what the card is
		 * for, and hiding one to square off a grid is the wrong trade.
		 */
		<div
			class="flex flex-col min-h-[188px] p-5 rounded-[20px]"
			style={{ background: theme.surface, border: `1px solid ${edge}`, boxShadow: theme.cardShadow }}
		>
			{/*
			  * The same row either way; only the element around it changes. A
			  * card that cannot expand is not a button, and giving it
			  * `aria-expanded` would promise an accordion that isn't there.
			  */}
			{canExpand ? (
				<button
					onClick={onToggleOpen}
					class={`w-full text-left flex items-start justify-between gap-3 ${CARD_HEADER}`}
					aria-expanded={open}
				>
					{header}
				</button>
			) : (
				<div class="w-full flex items-start justify-between gap-3">{header}</div>
			)}

			<div class="flex flex-wrap gap-1.5 pt-2.5">
				<TermChip name={termNameFor(item.locationId, locations)} color={entityColorFor(item.locationId, locations, dark)} />
				{item.storeIds.map((id) => (
					<TermChip key={id} name={termNameFor(id, stores)} color={entityColorFor(id, stores, dark)} />
				))}
				{item.typeIds.map((id) => (
					<TermChip key={id} name={termNameFor(id, types)} color={entityColorFor(id, types, dark)} />
				))}
			</div>

			{/*
			  * The quantity is information, so it stays for everyone; only the two
			  * controls go. A viewer sees "4 · low at 2" rather than a pair of dead
			  * buttons on every card in the pantry (D30).
			  */}
			<div class="flex items-center justify-between gap-3.5 mt-auto pt-3.5">
				{/*
				  * Baseline-aligned, then lifted a quarter of its own em.
				  *
				  * Centring was tried and is wrong here: Playfair's figures sit
				  * low in their box, so a threshold centred on the numeral's box
				  * reads as floating above the digits it describes. The baseline
				  * is the honest anchor — it just puts the two on the same rule,
				  * which for 12.5px against 42px reads as the small text having
				  * fallen to the bottom. The lift is `em`, so it tracks the
				  * threshold at either of the numeral's sizes without a
				  * breakpoint.
				  */}
				<div class="flex items-baseline gap-2.5 min-w-0">
					<span class="font-disp text-qty-sm sm:text-qty font-bold leading-[0.9]" style={{ color: qtyColor }}>
						{item.qty}
					</span>
					<span class="relative bottom-[0.25em] text-[12.5px] truncate" style={{ color: theme.textFaint }}>low at {item.threshold}</span>
				</div>

				{canEdit && (
					<div class="flex gap-2 shrink-0">
						{/*
						  * The fill and the ink are classes, not inline styles. An
						  * inline `background` outranks `hover:bg-line`, so this
						  * pair shipped looking pressable and answering to nothing
						  * — the same mistake the drawer made before
						  * `controlStyles.ts` existed.
						  *
						  * At zero the minus stays faint and does **not** brighten
						  * on hover. It is still live, because the clamp is the
						  * server's and a disabled control cannot explain itself
						  * (D36) — but nothing about it should promise a change it
						  * will not make.
						  */}
						<button
							onClick={() => onAdjustQty(-1)}
							class={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center ${CARD_STEPPER} ${atZero ? 'text-ink-faint' : 'text-ink-body hover:text-ink'}`}
							aria-label={`Decrease ${item.name}`}
						>
							<Minus size={17} strokeWidth={2.4} />
						</button>
						<button
							onClick={() => onAdjustQty(1)}
							class={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center ${CARD_STEPPER_PRIMARY}`}
							style={{ background: theme.inkBg, color: theme.inkText }}
							aria-label={`Increase ${item.name}`}
						>
							<Plus size={17} strokeWidth={2.4} />
						</button>
					</div>
				)}
			</div>

			{open && (
				<div class="mt-4 pt-[15px]" style={{ borderTop: `1px solid ${theme.border}` }}>
					<p class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textFaint }}>Notes</p>
					<p class="pt-[5px] text-sm" style={{ color: theme.text }}>
						{item.notes || <span style={{ color: theme.textFaint }}>No notes yet.</span>}
					</p>

					{canEdit && (
						/*
						  * Remove sits a card's width away from Edit, the same
						  * separation the item sheet's footer gives it. Two buttons a
						  * gap apart is a slip away from the destructive one, and the
						  * gap is the only thing that stops it — a card is a small
						  * target on a phone. `gap-2` survives as the floor for a
						  * narrow card.
						  */
						<div class="flex items-center justify-between gap-2 pt-3.5">
							<button
								onClick={onStartEdit}
								class={`flex items-center gap-[7px] h-9 px-3.5 rounded-[11px] text-[13.5px] font-medium border border-line text-ink-body hover:text-ink ${CARD_ACTION}`}
							>
								<Pencil size={14} /> Edit
							</button>
							<button
								onClick={onRemove}
								class={`flex items-center gap-[7px] h-9 px-3.5 rounded-[11px] text-[13.5px] ${CARD_ACTION_GHOST}`}
								style={{ color: theme.dangerText }}
							>
								<Trash2 size={14} /> Remove
							</button>
						</div>
					)}
				</div>
			)}

		</div>
	);
}
