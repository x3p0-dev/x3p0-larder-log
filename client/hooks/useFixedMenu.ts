import { useEffect, useLayoutEffect, useState } from 'preact/hooks';

import type { MenuBox } from '../../shared/menuPlacement';
import { menuOrigin, placeMenu } from '../../shared/menuPlacement';

/**
 * A popover that escapes the box it is drawn inside (D68).
 *
 * **A dialog that scrolls cannot hold its own popovers.** `ModalShell`'s card is
 * `overflow-y-auto max-h-[90vh]`, because the account pre-flight is the tallest
 * dialog in the app and a short window has to be able to reach its footer — and
 * a scroll container clips its absolutely-positioned descendants at its padding
 * box. Unlike the review card's `overflow-hidden` (D67) or the console Members
 * card's, this one is load-bearing and cannot be removed. **So the popover
 * moves layer instead: `position: fixed`, placed from the trigger's measured
 * box.**
 *
 * That works here and would not work inside the drawer, whose `<aside>` carries
 * a `transform` and is therefore the containing block for everything `fixed`
 * beneath it. A dialog card has no transform — `ModalShell` animates `opacity`
 * and only scales on the way in, which is finished before a menu can be opened.
 *
 * **It measures the trigger and never the panel**, which keeps it to one pass:
 * the panel's width is a constant and its height has a cap, so both bounds are
 * known before it is drawn. The chart tooltip's rule and the review's, reached
 * the same way.
 *
 * **The two reads of `window` are the whole of what is not in `shared/`.** The
 * arithmetic is `placeMenu` and `menuOrigin`, where `npm test` can see it — a
 * placement rule that picks the wrong corner still opens a menu, still lists
 * everything in it, and clips only at one scroll position on one screen width.
 *
 * `useLayoutEffect`, because a `useEffect` runs after paint and the panel would
 * be drawn once in the wrong place before moving.
 */
export function useFixedMenu(
	open: boolean,
	ref: { current: HTMLElement | null },
	size: { width: number; maxHeight: number },
	/**
	 * Closes the menu. **A fixed panel does not travel with a scrolling
	 * ancestor**, so rather than pretend otherwise it goes — which is what makes
	 * *the trigger cannot move while its own menu is open* true here rather than
	 * merely assumed.
	 *
	 * **The panel's own scrolling is the one exception**, and it has to be: the
	 * rule is about the trigger moving, and reading a list does not move it.
	 */
	onClose: () => void
): { top: number; left: number; maxHeight: number } | null {
	const [seat, setSeat] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

	useLayoutEffect(() => {
		if (! open) { setSeat(null); return; }

		const box = ref.current?.getBoundingClientRect();

		if (! box) return;

		const view = { width: window.innerWidth, height: window.innerHeight };
		const where: MenuBox = { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
		const placed = placeMenu(where, view, size);
		const origin = menuOrigin(where, placed.corner, { width: size.width, height: placed.maxHeight }, view);

		setSeat({ ...origin, maxHeight: placed.maxHeight });
		// One read per opening: the trigger cannot move while its menu is up,
		// because anything that would move it closes the menu below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (! open) return;

		/*
		 * **A scroll that starts inside the menu is the menu being read, not the
		 * page moving under it**, and closing on it makes a panel taller than its
		 * own cap impossible to reach the bottom of: the wheel fires `scroll` on
		 * the panel, the panel goes, and the list reads as cut off with no way
		 * down. That is what a capped popover with five people in it does.
		 *
		 * `capture` is both why this is needed and why it works. The listener
		 * sees every scroll in the document — which is the point, since a scroll
		 * event on an inner element does not bubble to `window` — and the panel
		 * is a DOM **descendant of the trigger's wrapper** however far `fixed`
		 * has moved it on screen, so one `contains` separates the two cases.
		 */
		function onScroll(e: Event) {
			if (e.target instanceof Node && ref.current?.contains(e.target)) return;

			onClose();
		}

		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', onClose);

		return () => {
			window.removeEventListener('scroll', onScroll, true);
			window.removeEventListener('resize', onClose);
		};
	}, [open, onClose, ref]);

	return seat;
}
