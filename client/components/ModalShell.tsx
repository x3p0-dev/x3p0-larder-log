import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

import type { Theme } from '../lib/theme';
import { PAGE_BUTTON_DIALOG, PAGE_BUTTON_GHOST } from '../lib/controlStyles';

/**
 * The centred card every modal in the app is built on: scrim, focus trap,
 * Escape, and the fade the confirm dialog established.
 *
 * Extracted from `ConfirmDialog` when *New household* needed the same shell
 * around a form (D42). The spec calls that dialog "the confirm shell" in so
 * many words, and reproducing 420px / radius 18 / ghost-then-primary a second
 * time is how two dialogs drift apart.
 *
 * What it does **not** own is the contents — no icon disc, no title, no
 * buttons. A confirm asks a question; the household dialog asks for a name and
 * a colour. Only the box is shared.
 */

const SCRIM_MS = 160;
const ENTER_MS = 180;
const EXIT_MS = 120;

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function prefersReducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ModalShell({
	open, role = 'dialog', labelledBy, describedBy, onCancel,
	initialFocus, width = 420, dark, theme, children,
}: {
	open: boolean;
	/** `alertdialog` for a confirm; the plain one for a form. */
	role?: 'dialog' | 'alertdialog';
	labelledBy: string;
	describedBy?: string;
	/** Escape, the scrim and Cancel are the same non-destructive exit. */
	onCancel: () => void;
	/**
	 * What takes focus once the card has entered, run on every open.
	 *
	 * A callback rather than a ref because which control it is depends on the
	 * dialog: a confirm lands on *Cancel* so the harmless thing is under the
	 * return key, a typed confirm on its field, this one on its name field.
	 */
	initialFocus?: () => void;
	/**
	 * The card's max width in pixels. 420 everywhere but one.
	 *
	 * **A confirm asks one question and 420 is right for it; a pre-flight asks
	 * two and has to show you what you are answering about.** The admin
	 * console's account deletion is the only caller that widens, to 520, and
	 * the design doc names it as its single deliberate deviation from the
	 * confirm shell.
	 *
	 * It is a number rather than a class because Tailwind resolves a class by
	 * scanning for a static string, so `max-w-[${width}px]` would compile to
	 * nothing — the same constraint that makes `min-[1120px]:` a literal in
	 * three places.
	 */
	width?: number;
	dark: boolean;
	theme: Theme;
	children: ComponentChildren;
}) {
	const [rendered, setRendered] = useState(open);
	const [entered, setEntered] = useState(false);

	const cardRef = useRef<HTMLDivElement | null>(null);
	/** Whatever had focus when this opened, so it can be handed back. */
	const opener = useRef<HTMLElement | null>(null);

	const reduced = prefersReducedMotion();

	// Open and close are separate passes: the exit fade needs the card still
	// mounted, so `rendered` trails `open` by the length of it.
	useEffect(() => {
		if (open) {
			opener.current = document.activeElement as HTMLElement | null;
			setRendered(true);
			const frame = requestAnimationFrame(() => setEntered(true));

			return () => cancelAnimationFrame(frame);
		}

		setEntered(false);

		const timer = setTimeout(() => setRendered(false), reduced ? 0 : EXIT_MS);

		return () => clearTimeout(timer);
	}, [open, reduced]);

	useEffect(() => {
		if (! entered) return;

		initialFocus?.();
		// `initialFocus` is a fresh closure every render; depending on it would
		// re-run the focus move on each keystroke inside the dialog.
		// eslint-disable-next-line
	}, [entered]);

	// Focus returns to whatever opened this, once it is really gone.
	useEffect(() => {
		if (rendered || ! opener.current) return;

		opener.current.focus?.();
		opener.current = null;
	}, [rendered]);

	if (! rendered) return null;

	const shown = open && entered;

	function trapFocus(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
			return;
		}

		if (e.key !== 'Tab') return;

		const nodes = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

		if (nodes.length === 0) return;

		const first = nodes[0]!;
		const last = nodes[nodes.length - 1]!;
		const active = document.activeElement;

		// Only the two edges need handling; everything between them is the
		// browser's own order, which is already right.
		if (e.shiftKey && active === first) {
			e.preventDefault();
			last.focus();
		}
		else if (! e.shiftKey && active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	return (
		<div class="fixed inset-0 z-[60] flex items-center justify-center p-4" onKeyDown={trapFocus}>
			{/*
			  * Scrim, Escape and Cancel are identical and all non-destructive —
			  * there is no way to commit by getting out of the way.
			  */}
			<button
				type="button"
				onClick={onCancel}
				aria-label="Cancel"
				tabIndex={-1}
				class="absolute inset-0 cursor-default"
				style={{
					background: dark ? 'rgba(10,8,5,.64)' : 'rgba(36,30,23,.44)',
					opacity: shown ? 1 : 0,
					transition: `opacity ${SCRIM_MS}ms ease-out`,
				}}
			/>

			{/*
			  * Centred on mobile too, not a bottom sheet: a confirm is a question,
			  * and centring keeps it clear of the thumb zone the Add sheet owns.
			  */}
			<div
				ref={cardRef}
				role={role}
				aria-modal="true"
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				class="relative w-full max-h-[90vh] overflow-y-auto p-[22px] rounded-[18px]"
				style={{
					maxWidth: `${width}px`,
					background: theme.surface,
					/*
					 * In dark the scrim cannot lift this — deepening it moves the
					 * card's separation from 1.27:1 only to 1.30:1, because both
					 * sides are already near-black. The border carries the edge
					 * instead, one step stronger than a card would normally take.
					 */
					border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
					boxShadow: dark ? '0 24px 60px rgba(0,0,0,.60)' : '0 24px 60px rgba(36,30,23,.28)',
					opacity: shown ? 1 : 0,
					transform: reduced || shown ? 'none' : 'scale(.96)',
					transition: shown
						? `opacity ${ENTER_MS}ms ease-out, transform ${ENTER_MS}ms ease-out`
						: `opacity ${EXIT_MS}ms ease-out`,
				}}
			>
				{children}
			</div>
		</div>
	);
}

/**
 * Cancel then the action, right-aligned — the harmless one nearer the body.
 *
 * **Crimson is never the primary**, even when the action destroys something:
 * the fill is the ordinary ink/cream, and the verb on it does the work. That
 * rule belongs to the pair of buttons rather than to either dialog, which is
 * why it lives beside the shell.
 */
export function DialogButtons({
	cancelRef, onCancel, onConfirm, confirmLabel, armed, dark, theme,
}: {
	cancelRef?: { current: HTMLButtonElement | null };
	onCancel: () => void;
	onConfirm: () => void;
	confirmLabel: string;
	armed: boolean;
	dark: boolean;
	theme: Theme;
}) {
	return (
		<div class="flex justify-end gap-2.5 mt-5">
			<button
				ref={cancelRef}
				onClick={onCancel}
				class={`h-11 md:h-10 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_GHOST}`}
			>
				Cancel
			</button>
			<button
				onClick={onConfirm}
				disabled={! armed}
				class={`h-11 md:h-10 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_DIALOG}`}
				style={
					armed
						? { background: theme.primaryBg, color: theme.primaryText }
						: {
							background: dark ? '#3E3527' : '#EBE1D0',
							color: dark ? '#7E6E58' : '#B0A088',
							cursor: 'not-allowed',
						}
				}
			>
				{confirmLabel}
			</button>
		</div>
	);
}
