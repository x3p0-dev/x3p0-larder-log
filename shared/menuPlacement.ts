/**
 * Where a popover opens, given where its trigger is.
 *
 * **Pure arithmetic, no DOM.** The caller reads the trigger's box and the
 * viewport and hands both over; nothing here names a browser global, which is
 * what lets `npm test` see it. It is in `shared/` for `filter.ts`'s reason
 * rather than because the capsule wants it: a placement rule that picks the
 * wrong corner still opens a menu, still lists everything in it, and clips only
 * at one scroll position on one screen width — which is invisible in exactly the
 * way an `every` where a `some` belongs is invisible.
 *
 * **It never measures the menu**, because it does not have to: a popover's width
 * is a constant and its height has a cap, so both bounds are known before it is
 * drawn. That is the chart tooltip's rule — measuring the box would mean
 * rendering it to find its size and again to place it.
 */

/** Which corner of the trigger the panel hangs from. */
export type MenuCorner = 'down-left' | 'down-right' | 'up-left' | 'up-right';

/** A trigger's box in viewport coordinates — `getBoundingClientRect`'s four. */
export type MenuBox = { top: number; bottom: number; left: number; right: number };

export type MenuPlacement = {
	corner: MenuCorner;
	/** What the panel's height may actually be here, never more than its cap. */
	maxHeight: number;
};

/**
 * The gap kept between the panel and the edge it would otherwise touch.
 *
 * One number for both axes: an edge is an edge, and a panel that stops 12px
 * short of the fold reads as deliberate where one flush against it reads as cut.
 */
const EDGE = 12;

/**
 * The gap between a trigger and its panel — the `mt-1.5` the corner classes
 * spend, as a number, for the callers that position in pixels rather than in
 * utilities.
 */
const GAP = 6;

export function placeMenu(
	box: MenuBox,
	view: { width: number; height: number },
	size: { width: number; maxHeight: number }
): MenuPlacement {
	const below = view.height - box.bottom;
	const above = box.top;

	/*
	 * **Up only when there is not room below *and* there is more room above.**
	 * A panel that flips into an even tighter space has moved for nothing, and
	 * moved away from the thing that opened it.
	 */
	const up = below < size.maxHeight + EDGE && above > below;

	/*
	 * **Whichever side overflows less, rather than a rule about which side the
	 * trigger is on.** Both of the review's trigger groups *wrap*, so a chip can
	 * end up anywhere across the row — and a static answer was wrong in both
	 * directions: hung left it ran off the right of a phone, hung right it ran
	 * off the left as soon as the header band's triggers wrapped to the gutter.
	 * A tie goes left, which is the reading order.
	 */
	const spillRight = Math.max(0, box.left + size.width + EDGE - view.width);
	const spillLeft = Math.max(0, EDGE - (box.right - size.width));

	const corner: MenuCorner = `${up ? 'up' : 'down'}-${spillLeft < spillRight ? 'right' : 'left'}`;

	return {
		corner,
		// Never taller than the room it has. The last row of a long table opens a
		// shorter, scrolling panel rather than one running past the fold.
		maxHeight: Math.min(size.maxHeight, Math.max((up ? above : below) - EDGE, 0)),
	};
}

/**
 * Where a **fixed** panel's own top-left corner goes, in viewport coordinates.
 *
 * `placeMenu` answers *which corner of the trigger it hangs from*, which is all
 * an `absolute` panel needs — the browser does the arithmetic from `left-0` or
 * `right-0`. A panel that has to escape a clipping ancestor cannot be
 * `absolute`, so it needs the numbers.
 *
 * **The case that forces it is a dialog that scrolls.** `ModalShell`'s card is
 * `overflow-y-auto max-h-[90vh]`, because the account pre-flight is the tallest
 * dialog in the app and a short window has to be able to reach its footer. A
 * scroll container clips its absolutely-positioned descendants at its padding
 * box, so a popover inside one is cut — and unlike the review card's
 * `overflow-hidden`, this one cannot simply be removed. **A popover belongs
 * inside the viewport; that is the layer that moves.**
 *
 * The `12px` inset is `EDGE`, so a panel pushed off an edge lands where a panel
 * that chose that edge would have.
 */
export function menuOrigin(
	box: MenuBox,
	corner: MenuCorner,
	size: { width: number; height: number },
	view: { width: number; height: number }
): { top: number; left: number } {
	const up = corner.startsWith('up');
	const right = corner.endsWith('right');

	const top = up ? box.top - GAP - size.height : box.bottom + GAP;
	const left = right ? box.right - size.width : box.left;

	return {
		// Clamped to the viewport on both axes, because a corner is chosen from
		// the panel's *cap* and the panel is often shorter — and because a
		// trigger can sit closer to an edge than `EDGE` all by itself.
		top: Math.max(EDGE, Math.min(top, view.height - size.height - EDGE)),
		left: Math.max(EDGE, Math.min(left, view.width - size.width - EDGE)),
	};
}
