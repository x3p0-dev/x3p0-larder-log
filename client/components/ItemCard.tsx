import { Plus, Minus, ChevronDown, CookingPot, ListX, Pencil, ShoppingCart, Sprout, Trash2 } from 'lucide-preact';

import type { Theme, ThemedColor } from '../lib/theme';
import { entityColorFor, statusFor, termNameFor } from '../lib/theme';
import type { SourceKind } from '../../shared/source';
import { SOURCE_KIND_ADJECTIVES, itemSourceKinds } from '../../shared/source';
import type { Item, Term } from '../../shared/types';
import { formatSize } from '../../shared/size';
import { listRuleOf } from '../../shared/listRule';
import {
	CARD_ACTION, CARD_ACTION_GHOST, CARD_CHEVRON, CARD_HEADER, CARD_STEPPER, CARD_STEPPER_PRIMARY,
} from '../lib/controlStyles';

type Props = {
	item: Item;
	open: boolean;
	locations: Term[];
	types: Term[];
	/**
	 * Sources, which carry a kind (D58) — but typed to accept a plain `Term`,
	 * because the marketing hero passes two mock shops and has no business
	 * inventing a column. An absent kind is a shop, so the hero draws no glyph,
	 * which is exactly right for Grocery and Warehouse.
	 */
	stores: readonly (Term & { kind?: SourceKind })[];
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

/** The kind glyphs, and the one place the three are named in pictures. */
const KIND_GLYPHS = { shop: ShoppingCart, grow: Sprout, make: CookingPot };

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

	/** One glyph per kind the item's sources cover, in band order. */
	const kinds = itemSourceKinds(item.storeIds, stores);

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
				  * What kind of thing this is, leftmost in the cluster (D58):
				  * **glyph · dot · chevron** — what it is, what state it is in,
				  * then the control. A bought item carries nothing here, and the
				  * absence is the point: most of a pantry is bought, so the two
				  * kinds that are not are the ones worth spotting across a grid.
				  *
				  * **Meta grey, never the term's colour.** The status dot stays the
				  * only coloured thing in this corner, because colour is what
				  * status is for. A term's hue is whatever the household picked, so
				  * tinting by it would imply the hue says something about the kind.
				  *
				  * It does not break the card's *no icons beside the name* rule —
				  * that rule is about the name, and this corner already carries
				  * two things. And unlike the struck cart below it, this glyph is
				  * **taught three times before a card ever shows it**: the run
				  * list's band headers, the segment tabs, and the source editing
				  * row all draw the same two marks.
				  *
				  * A make item kept off the list draws both this and the cart, and
				  * that pairing will be common — the things you make are often the
				  * things you never shop for. Worth watching on a real grid.
				  */}
				{kinds.map((kind) => {
					const Glyph = KIND_GLYPHS[kind];

					return (
						<span
							key={kind}
							role="img"
							aria-label={SOURCE_KIND_ADJECTIVES[kind]}
							title={SOURCE_KIND_ADJECTIVES[kind]}
							class="inline-flex shrink-0"
							style={{ color: theme.textMuted }}
						>
							<Glyph size={15} strokeWidth={1.7} />
						</span>
					);
				})}
				{/*
				  * Kept off the list, right of the kinds and left of the status.
				  * **The status itself does not change** — the card still says
				  * running low, because it is. Without something here, "why isn't
				  * the olive oil on my list" has no answer anywhere in the grid.
				  *
				  * **It is a legacy marker now** (D60). Nothing sets the flag any
				  * more — a source's kind says what it said — so this draws only for
				  * rows that were ticked before the control was retired, which is
				  * exactly when the question it answers still gets asked. It goes
				  * on its own when the last such row is cleared.
				  *
				  * **It was a struck cart and it cannot stay one** (D58), for two
				  * reasons that arrived together. A cart is now the *shop* kind's
				  * own glyph, and drawing a cart and a struck cart a gap apart in
				  * one cluster is the worst pair of marks on the screen. And the
				  * strike would be claiming the wrong thing anyway: `needsBuying`
				  * gates every band, so this keeps an item off Harvest and Make as
				  * well — it means *off the list*, not *never bought*.
				  *
				  * `ListX` says exactly that and collides with nothing. It is
				  * fainter than the kind glyphs on purpose: the kinds are facts
				  * about the item, this is a rule somebody set about it.
				  *
				  * **It follows the rule in force, not the retired column** (D65),
				  * so a row set to `never` through the tri-state draws it and a
				  * legacy `offShoppingList` row keeps drawing it. **`always` gets
				  * no marker at all**, which is the cheap give the design names:
				  * an `always` item is visible on the list, which is where you go
				  * looking for it — and a second mark here would make this corner
				  * four things wide.
				  */}
				{listRuleOf(item) === 'never' && (
					<span
						role="img"
						aria-label="Kept off the list"
						title="Kept off the list"
						class="inline-flex shrink-0"
						style={{ color: theme.textFaint }}
					>
						<ListX size={15} strokeWidth={1.7} />
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
					<span class={CARD_CHEVRON} aria-hidden="true">
						<ChevronDown
							size={17}
							class="transition-transform"
							style={{ transform: open ? 'rotate(180deg)' : 'none' }}
						/>
					</span>
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
		 *
		 * **The floor is the whole mechanism, so anything that grows the ordinary
		 * card breaks the row.** The chevron's hover well did exactly that for one
		 * round — 26px in flow where the glyph was 17 — and it now paints its
		 * circle out of negative margins so it costs the layout nothing. See
		 * `CARD_CHEVRON`.
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
