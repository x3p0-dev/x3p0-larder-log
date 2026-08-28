import { useCallback, useEffect, useRef } from 'preact/hooks';

/** How long a press has to be held before it starts repeating. */
const DELAY = 400;

/** The first repeat interval, and the floor it accelerates down to. */
const FIRST = 140;
const FLOOR = 45;

/** How much each repeat shortens the next one. */
const EASE = 0.86;

/**
 * Press-and-hold on a stepper button: one step, then a run.
 *
 * **The first step is not this hook's.** It comes from the button's ordinary
 * `onClick`, and the repeat only begins once the press has outlasted 400ms — so
 * a tap fires exactly once, through the path that already works for a mouse, a
 * thumb and the keyboard alike. A hook that fired on `pointerdown` would have
 * to suppress the click that follows it, and would leave Enter and Space with
 * no path at all.
 *
 * Stepping a low-at from 2 to 15 is thirteen taps otherwise. The sheet's
 * typeable numeral is the better answer to that and this is the one for anybody
 * who does not find it.
 */
export function useHoldRepeat(fire: () => void) {
	const fireRef = useRef(fire);
	fireRef.current = fire;

	const timer = useRef<number | null>(null);

	const stop = useCallback(() => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);

	// A press that ends with the component gone — the sheet closing under a held
	// thumb — would otherwise leave a timer running against a dead callback.
	useEffect(() => stop, [stop]);

	const start = useCallback((e: PointerEvent) => {
		// Secondary buttons do not repeat, and neither does a press that the
		// browser is about to turn into a scroll or a context menu.
		if (e.button !== 0) return;

		stop();

		let wait = FIRST;

		function tick() {
			fireRef.current();
			wait = Math.max(FLOOR, wait * EASE);
			timer.current = setTimeout(tick, wait) as unknown as number;
		}

		timer.current = setTimeout(tick, DELAY) as unknown as number;
	}, [stop]);

	return {
		onPointerDown: start,
		onPointerUp: stop,
		onPointerLeave: stop,
		onPointerCancel: stop,
		// A hold long enough to repeat is long enough that the browser offers to
		// select the label under it; on a phone that ends the run mid-press.
		onContextMenu: (e: Event) => e.preventDefault(),
	};
}
