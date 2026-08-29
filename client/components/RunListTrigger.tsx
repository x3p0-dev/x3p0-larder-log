import { ShoppingBasket, ShoppingCart } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_BUTTON_SECONDARY, PAGE_FOCUS, PAGE_TINT_HOVER } from '../lib/controlStyles';

type Props = {
	/** Whether the list is the mode you are in. */
	active: boolean;
	/** Everything low or out in the household — never the filtered count. */
	count: number;
	onToggle: () => void;
	/**
	 * Short of room — stand 44px rather than 40. **Geometry only.**
	 *
	 * The label used to go with it; there is no label any more. Measured from
	 * the content column rather than the viewport, so a docked drawer on a 1280
	 * screen gets the same treatment a phone does, and every control on row 2
	 * reads the same flag so the row has one height.
	 */
	compact: boolean;
	/**
	 * Whether the household sources anything it does not buy.
	 *
	 * **A basket rather than a cart, and it is the cart that forced it.** The
	 * cart is the *Buy* band's glyph now — on the band header, on the segment's
	 * tab, on an item card — so a household with a garden had one mark meaning
	 * *the whole run* sitting a gap away from the same mark meaning *the shop
	 * part of it*. The basket is the one thing in the same family that is not
	 * already spoken for.
	 *
	 * **The test is `sourceGroupWord`'s**, not "has grow *and* make": the
	 * collision is with the cart, and one garden creates it exactly as well as a
	 * garden and a kitchen do. So the trigger is a basket precisely when the
	 * drawer's group is called *Source* rather than *Store* — one rule, already
	 * written down, and the two surfaces change together.
	 *
	 * It follows the **household's** sources rather than the filtered set's
	 * bands, which is the same thing its count does: a glyph that changed when
	 * you ticked a filter would be reporting on the screen instead of on the
	 * pantry.
	 */
	basket: boolean;
	dark: boolean;
	theme: Theme;
};

/**
 * The way into the run list, and the light that says you are in it.
 *
 * **It is a glyph and a count at every width**, and it sits at the row's right
 * end beside the sort trigger — the two controls that are chrome rather than
 * content, grouped. It used to sit immediately after the status pills, on the
 * argument that the eye crossing `9 in stock · 6 running low · 5 out` lands on
 * the thing to do about it; that on-ramp is what is given up, and what is bought
 * is a row whose left is the state of the pantry and whose right is what you can
 * do about looking at it.
 *
 * **On desktop it is the way in and nothing else.** Row 2 drops it in list mode:
 * *Back to items* is the way out and says so, a second exit whose count is the
 * household's would be arguing with a screen that counts the filtered set, and
 * the 135px is what the segment wears its labels with. **Below `md` it is the
 * whole toggle**, sitting in the mobile header in both modes, wearing its active
 * fill, never moving — which is the one arrangement D41's amendment was really
 * protecting, since the pair it replaced put the way in and the way out in
 * *different rows* on a phone.
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
export function RunListTrigger({ active, count, onToggle, compact, basket, dark, theme }: Props) {
	const low = statusColor('low', dark);

	return (
		<button
			onClick={onToggle}
			aria-pressed={active}
			aria-label={`To get, ${count} across every kind`}
			class={
				'inline-flex items-center gap-2 pl-3 pr-[11px] rounded-[13px] text-sm font-semibold shrink-0 ' +
				(compact ? 'h-11 ' : 'h-10 ') +
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
			  * **A glyph and a count, at every width.** It wore the words *To get*
			  * with room and fell back to the mark on a phone; now it is the mark
			  * everywhere. Three things make the label the right thing to spend:
			  * the count pill already says how much, the glyph says what kind, and
			  * the control now sits beside the sort trigger rather than after the
			  * status pills — a group of two chrome controls at the row's end,
			  * where a word would be the odd one out.
			  *
			  * The words survive where they are load-bearing: `aria-label` reads
			  * *To get, 17 across every kind*, which is the whole sentence and not
			  * just the missing word.
			  *
			  * **The glyph is a cart until the household grows or makes something,
			  * and then it is a basket.** A cart is what this control has always
			  * been and is what most households will only ever use it for — but the
			  * cart is also the *Buy* band's own mark, so the moment there is a
			  * second band the same glyph is saying two different sizes of the same
			  * thing a gap apart. The basket is near enough to still mean *the
			  * things to get* and far enough to not be the Buy tab.
			  *
			  * It is still a shopping mark for a list that is partly picking and
			  * partly cooking, which is the compromise the collapsed rail's
			  * storefront makes too. Recorded rather than solved.
			  *
			  * The glyph does not change with the state. It names the thing you are
			  * looking at either way, and a control that renames itself on press is
			  * a second thing to read at the moment the whole screen has changed.
			  */}
			{basket
				? <ShoppingBasket size={20} strokeWidth={1.8} />
				: <ShoppingCart size={20} strokeWidth={1.8} />}

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
