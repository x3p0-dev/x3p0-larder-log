import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren, RefObject } from 'preact';

type Props = {
	/** Vertical offset from the top of the rail, so the panel lines up with its button. */
	top: number;
	onClose: () => void;
	label: string;
	/**
	 * The rail. Pointer events landing inside it are not "outside".
	 *
	 * Without this, pressing a second rail icon closes the open flyout on
	 * `pointerdown` and the button's own toggle then reopens... the one that was
	 * just closed, because both fire in the same gesture. Letting the buttons
	 * own the switch keeps it to a single decision.
	 */
	railRef: RefObject<HTMLElement>;
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
export function RailFlyout({ top, onClose, label, railRef, children }: Props) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus();

		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
		}
		/*
		 * `pointerdown` rather than `click`: a click that starts inside the
		 * flyout and ends outside would otherwise close it mid-drag, which is
		 * exactly what selecting an invite link does.
		 */
		function onDown(e: PointerEvent) {
			const t = e.target as Node;
			if (ref.current?.contains(t) || railRef.current?.contains(t)) return;
			onClose();
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [onClose, railRef]);

	return (
		<div
			ref={ref}
			role="dialog"
			aria-label={label}
			class="fixed left-[68px] z-50 w-[264px] max-h-[70vh] overflow-y-auto rounded-r-2xl rounded-bl-2xl p-2 bg-drawer-well border border-drawer-line shadow-2xl"
			style={{ top: `${top}px` }}
		>
			{children}
		</div>
	);
}
