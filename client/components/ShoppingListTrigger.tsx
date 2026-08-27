import { ShoppingCart } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_BUTTON_SECONDARY, PAGE_FOCUS, PAGE_TINT_HOVER } from '../lib/controlStyles';

type Props = {
	/** Whether the list is the mode you are in. The control stays put either way. */
	active: boolean;
	/** Everything low or out in the household — never the filtered count. */
	count: number;
	onToggle: () => void;
	/**
	 * Short of room — drop the words for the cart glyph.
	 *
	 * Measured from the content column rather than the viewport, so a docked
	 * drawer on a 1280 screen gets the same treatment a phone does.
	 */
	compact: boolean;
	dark: boolean;
	theme: Theme;
};

/**
 * The way into the shopping list, and the light that says you are in it.
 *
 * **It does not move.** Row 2's left slot keeps its width in list mode — the
 * status pills go `invisible` rather than unmounting — so this sits at the same
 * x in both modes, and below `md` it stays in the mobile header. It was a pair
 * once, `Shopping list` trading places with `‹ Back to items`, and below `md`
 * the two lived in *different rows*: a press made the thing under your finger
 * vanish and put its replacement somewhere else. The exit is still there and
 * still says its words — it is the quiet control at the row's left now, where
 * the pills were.
 *
 * **Placement is doing the work that colour does elsewhere,** at rest. It sits
 * immediately after the three status pills, so the eye crosses `9 in stock ·
 * 6 running low · 5 out` and lands on the thing to do about it. That on-ramp is
 * why the control does not need a colour of its own to be *found*.
 *
 * **Active is the low tint**, straight off the boards: `low.bg` filled,
 * `low.ink` for the border and the label, and the count pill inverted onto it.
 * Amber was built and rejected *at rest*, because it landed a gap away from
 * `6 running low` — already amber and meaning something else. That objection
 * is exactly void here: in list mode the pills are not on screen, so the only
 * amber in the row is this, and what it means is *you are shopping*.
 *
 * The border is the low **text** colour rather than the border token, which is
 * not a detail. These tints were drawn to sit on a card: out on the page ground
 * the low fill reads 1.03:1 and the low border 1.16:1, while `low.ink` is 5.08
 * light and 9.33 dark. Anything that wants to be amber out here has to borrow
 * the text colour for its edge.
 *
 * Its count is the **unfiltered** total, always. Scope to a store with nothing
 * to buy and the meta line reads `0 to buy at Costco` while this still holds
 * 11: the trigger answers *is there shopping to do*, which is a fact about the
 * household, and the meta line answers *what is on this screen*.
 */
export function ShoppingListTrigger({ active, count, onToggle, compact, dark, theme }: Props) {
	const low = statusColor('low', dark);

	return (
		<button
			onClick={onToggle}
			aria-pressed={active}
			aria-label={`Shopping list, ${count} to buy`}
			class={
				'inline-flex items-center rounded-[13px] text-sm font-semibold shrink-0 ' +
				(compact ? 'gap-2 h-11 pl-3 pr-[11px] ' : 'gap-[9px] h-10 pl-[15px] pr-3 ') +
				// A runtime fill has no literal hover shade to write against, so the
				// active state borrows the status chips' brightness step — and the
				// direction has to flip with the theme, since a tint is pale in light
				// and deep in dark. The border stays 1px in both states: the boards
				// draw the tinted one at 1.5, and half a pixel of edge is not worth a
				// control that changes width when you press it.
				(active
					? `border transition-[filter] active:translate-y-px ${PAGE_TINT_HOVER[dark ? 'dark' : 'light']} ${PAGE_FOCUS}`
					: PAGE_BUTTON_SECONDARY)
			}
			style={active
				? { background: low.bg, borderColor: low.ink, color: low.ink }
				: undefined}
		>
			{/*
			  * The label goes when space is short and the cart carries it. This is
			  * the only element on that row with a fixed cost — 165px against 74 —
			  * and *Shopping list* is the most expendable phrase on the screen once
			  * the pill says 11 and the glyph says what kind of 11.
			  *
			  * The label does not change with the state. *Shopping list* names the
			  * thing you are looking at either way, and a control that renames
			  * itself on press is a second thing to read at the moment the whole
			  * screen has already changed.
			  */}
			{compact ? <ShoppingCart size={20} strokeWidth={1.8} /> : 'Shopping list'}

			{/*
			  * The pill inverts with the button rather than keeping its own
			  * colours: the ink fill on an amber ground is a bruise, and the low
			  * pair read the other way round is what the boards draw.
			  */}
			<span
				class="inline-flex items-center justify-center min-w-[21px] h-[21px] px-1.5 rounded-full text-xs font-bold"
				style={active
					? { background: low.ink, color: low.bg }
					: { background: theme.inkBg, color: theme.inkText }}
			>
				{count}
			</span>
		</button>
	);
}
