import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';

/**
 * Escape and an outside press close an open popover.
 *
 * Returns a ref for the box that holds **both the trigger and the panel**. That
 * is the whole trick: a press on the trigger is inside the box, so it never
 * reaches this handler and the trigger's own `onClick` toggles normally. A
 * handler that exempted only the panel would close on `pointerdown` and let the
 * trigger reopen on the `click` that follows — which is the bug the rail solved
 * with a `dismissed` ref, and only had to because it dismisses presses on
 * itself.
 *
 * `pointerdown` rather than `click` so a drag that starts inside and ends
 * outside — selecting an invite link, or text in the rename field — does not
 * close the panel mid-gesture.
 *
 * Escape stops propagating: these open inside the drawer, and inside a modal
 * they would otherwise close the dialog behind them too.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void): RefObject<T> {
	const ref = useRef<T>(null);

	/*
	 * The listeners read the latest `onClose` through a ref rather than being
	 * torn down and rebuilt whenever the caller passes a fresh closure — which
	 * every caller does, since these are written inline.
	 */
	const close = useRef(onClose);
	close.current = onClose;

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;

			e.stopPropagation();
			close.current();
		}

		function onDown(e: PointerEvent) {
			if (ref.current?.contains(e.target as Node)) return;

			close.current();
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [open]);

	return ref;
}
