import { useEffect } from 'preact/hooks';

/**
 * Freezes the document behind a panel that covers it.
 *
 * A `fixed` scrim swallows presses but **not** scroll: a drag over it still
 * finds the nearest scrollable ancestor, which here is the document, so the
 * item grid slid around underneath the open drawer on a phone.
 *
 * The body is pinned with `position: fixed` and offset by the scroll it had,
 * rather than given `overflow: hidden`. Both work on Android; only this one
 * works on iOS Safari, which treats `overflow` on the body as advice. The
 * offset is what keeps the page visually still — it is `fixed` at the exact
 * position it was already painted at — and the teardown scrolls back to it,
 * since pinning the body reports the document to the top.
 *
 * Panels that sit *inside* the frozen body scroll normally: `position: fixed`
 * on an ancestor does not reach a descendant that is itself fixed, and the
 * drawer is.
 */
export function useScrollLock(locked: boolean) {
	useEffect(() => {
		if (! locked) return;

		const { body } = document;
		const y = window.scrollY;
		const prev = {
			position: body.style.position,
			top: body.style.top,
			left: body.style.left,
			right: body.style.right,
			width: body.style.width,
		};

		body.style.position = 'fixed';
		body.style.top = `-${y}px`;
		body.style.left = '0';
		body.style.right = '0';
		body.style.width = '100%';

		return () => {
			body.style.position = prev.position;
			body.style.top = prev.top;
			body.style.left = prev.left;
			body.style.right = prev.right;
			body.style.width = prev.width;

			window.scrollTo(0, y);
		};
	}, [locked]);
}
