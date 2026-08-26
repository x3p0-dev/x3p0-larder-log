import { Plus, Minus, ChevronDown, Pencil, Trash2 } from 'lucide-preact';

import type { Theme, ThemedColor } from '../lib/theme';
import { entityColorFor, statusFor, termNameFor } from '../lib/theme';
import type { Item, Term } from '../../shared/types';

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
	item, open, locations, types, stores, dark, theme, canEdit,
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
			<button onClick={onToggleOpen} class="w-full text-left flex items-start justify-between gap-3" aria-expanded={open}>
				<span class="font-disp text-item-sm sm:text-item font-semibold leading-[1.15] break-words min-w-0" style={{ color: theme.textStrong }}>
					{item.name}
				</span>

				<span class="flex items-center gap-2 shrink-0">
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
					<ChevronDown
						size={17}
						class="shrink-0 transition-transform"
						style={{ color: theme.textFaint, transform: open ? 'rotate(180deg)' : 'none' }}
					/>
				</span>
			</button>

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
				<div class="flex items-baseline gap-2.5 min-w-0">
					<span class="font-disp text-qty-sm sm:text-qty font-bold leading-[0.9]" style={{ color: qtyColor }}>
						{item.qty}
					</span>
					<span class="text-[12.5px] truncate" style={{ color: theme.textFaint }}>low at {item.threshold}</span>
				</div>

				{canEdit && (
					<div class="flex gap-2 shrink-0">
						<button
							onClick={() => onAdjustQty(-1)}
							class="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center"
							style={{ background: theme.surfaceAlt, color: atZero ? theme.textFaint : theme.text }}
							aria-label={`Decrease ${item.name}`}
						>
							<Minus size={17} strokeWidth={2.4} />
						</button>
						<button
							onClick={() => onAdjustQty(1)}
							class="w-[46px] h-[46px] rounded-[14px] flex items-center justify-center"
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
						<div class="flex items-center gap-2 pt-3.5">
							<button
								onClick={onStartEdit}
								class="flex items-center gap-[7px] h-9 px-3.5 rounded-[11px] text-[13.5px] font-medium"
								style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
							>
								<Pencil size={14} /> Edit
							</button>
							<button
								onClick={onRemove}
								class="flex items-center gap-[7px] h-9 px-3.5 text-[13.5px]"
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
