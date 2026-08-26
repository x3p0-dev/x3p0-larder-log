import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren, RefObject } from 'preact';

/** Breathing room kept between the flyout and either edge of the viewport. */
const MARGIN = 8;

type Props = {
	/**
	 * Where the panel *wants* to sit, so it lines up with its button.
	 *
	 * A request, not the final position — see `place()`. The account control is
	 * the last thing on a full-height rail, so its preferred top is within a
	 * button's height of the bottom of the screen and the panel would hang off
	 * it entirely.
	 */
	top: number;
	onClose: () => void;
	label: string;
	/**
	 * The panel's own box, owned by the rail.
	 *
	 * Dismissal is the rail's job, not this component's — it is the thing that
	 * knows which menu is open, and it has to dismiss on presses *inside* the
	 * rail too, which a handler living here could only do by fighting the
	 * buttons' own toggle. All this component owes it is a handle on the box, so
	 * a press that starts inside the panel is not mistaken for one outside it.
	 */
	panelRef: RefObject<HTMLDivElement>;
	children: ComponentChildren;
};

/**
 * A menu beside the rail.
 *
 * The rail does not move for these — that is the whole distinction in the
 * spec: a pane expands the drawer, a menu flies out. Escape and an outside
 * click both close it, and focus moves inside on open so the keyboard can
 * reach the contents at all.
 */
export function RailFlyout({ top, onClose, label, panelRef, children }: Props) {
	const ref = panelRef;
	const [offset, setOffset] = useState(top);

	/*
	 * Slide the panel up until it fits, rather than clipping it.
	 *
	 * `useLayoutEffect` so the correction lands before paint — measuring in a
	 * plain effect shows the panel in the wrong place for a frame first.
	 *
	 * A `ResizeObserver` because the height is not fixed: the household menu
	 * grows a row per household and the appearance menu is a different size
	 * again, and both mount at their own height *after* this first runs. The
	 * panel keeps its own `max-h-[70vh]` for the case where nothing fits.
	 */
	useLayoutEffect(() => {
		const el = ref.current;

		if (! el) return;

		function place() {
			const room = window.innerHeight - el!.offsetHeight - MARGIN;

			setOffset((prev) => {
				const next = Math.max(MARGIN, Math.min(top, room));
				// Guarded, because the observer fires on every correction and an
				// unguarded set would loop.
				return prev === next ? prev : next;
			});
		}

		place();

		const observer = new ResizeObserver(place);
		observer.observe(el);
		window.addEventListener('resize', place);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', place);
		};
	}, [top]);

	// Escape and initial focus only. Outside-press dismissal is the rail's.
	useEffect(() => {
		ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus();

		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
		}

		document.addEventListener('keydown', onKey);

		return () => document.removeEventListener('keydown', onKey);
	}, [onClose, ref]);

	return (
		<div
			ref={ref}
			role="dialog"
			aria-label={label}
			class="fixed left-[68px] z-50 w-[264px] max-h-[70vh] overflow-y-auto rounded-r-2xl rounded-bl-2xl p-2 bg-drawer-well border border-drawer-line shadow-2xl"
			style={{ top: `${offset}px` }}
		>
			{children}
		</div>
	);
}
