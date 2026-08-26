import { ChevronLeft, ShoppingCart } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { PAGE_BUTTON_SECONDARY } from '../lib/controlStyles';

type Props = {
	/** Which way the control points: into the list, or back out of it. */
	listMode: boolean;
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
	theme: Theme;
};

/**
 * The one way in and out of the shopping list.
 *
 * **Placement is doing the work that colour used to do.** It sits immediately
 * after the three status pills, so the eye crosses `9 in stock · 6 running low
 * · 5 out` and lands on the thing to do about it. That on-ramp only exists
 * because row 2 already summarises status, and it is why the control does not
 * need a colour of its own.
 *
 * An earlier draft made it amber, wearing the low tokens. It was drawn against
 * a top bar that had a title and no status pills — an invention — and against
 * the real one it lands a gap away from `6 running low`, which is already amber
 * and means something else. **Two amber controls side by side saying different
 * things is worse than neither.** It is secondary now, and *Add item* keeps the
 * only ink fill on screen.
 *
 * Its count is the **unfiltered** total, always. Scope to a store with nothing
 * to buy and the meta line reads `0 to buy at Costco` while this still holds
 * 11: the trigger answers *is there shopping to do*, which is a fact about the
 * household, and the meta line answers *what is on this screen*.
 */
export function ShoppingListTrigger({ listMode, count, onToggle, compact, theme }: Props) {
	if (listMode) {
		return (
			<button
				onClick={onToggle}
				class={`inline-flex items-center gap-[5px] ${compact ? 'h-11' : 'h-10'} pl-2.5 pr-3.5 rounded-[13px] text-sm font-semibold shrink-0 ${PAGE_BUTTON_SECONDARY}`}
			>
				<ChevronLeft size={17} strokeWidth={2.2} />
				Back to items
			</button>
		);
	}

	return (
		<button
			onClick={onToggle}
			aria-label={`Shopping list, ${count} to buy`}
			class={
				'inline-flex items-center rounded-[13px] text-sm font-semibold shrink-0 ' +
				(compact ? 'gap-2 h-11 pl-3 pr-[11px] ' : 'gap-[9px] h-10 pl-[15px] pr-3 ') +
				PAGE_BUTTON_SECONDARY
			}
		>
			{/*
			  * The label goes when space is short and the cart carries it. This is
			  * the only element on that row with a fixed cost — 165px against 74 —
			  * and *Shopping list* is the most expendable phrase on the screen once
			  * the pill says 11 and the glyph says what kind of 11.
			  *
			  * The exit keeps its words at every width: it is the way out of a
			  * screen with no title, and an unlabelled back arrow there is a guess.
			  */}
			{compact ? <ShoppingCart size={20} strokeWidth={1.8} /> : 'Shopping list'}

			<span
				class="inline-flex items-center justify-center min-w-[21px] h-[21px] px-1.5 rounded-full text-xs font-bold"
				style={{ background: theme.inkBg, color: theme.inkText }}
			>
				{count}
			</span>
		</button>
	);
}
