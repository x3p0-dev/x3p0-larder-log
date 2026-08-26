import { useEffect, useRef, useState } from 'preact/hooks';
import { X } from 'lucide-preact';

import type { Toast } from '../hooks/useToasts';
import type { Theme } from '../lib/theme';
import { TOAST_DISMISS, TOAST_UNDO } from '../lib/controlStyles';

/**
 * The undo toast, and its plain twin.
 *
 * The toast is the **drawer surface in both themes** — transient chrome
 * borrowing the app's darkest layer. That keeps the reskin's first rule intact,
 * separates it hard from the cream ground, and costs no new colour. In dark
 * mode it therefore sits *below* the ground rather than above it, exactly as
 * the drawer does.
 *
 * Two variants, one component. An **actionable** toast carries a name, an Undo
 * pill and a dismiss; a **plain** one is a finished sentence and carries
 * neither, because there is nothing to decide. Which one you get is decided by
 * `onUndo`, not by a flag that could disagree with it.
 */

/** Actionable holds long enough to notice and reach; plain only long enough to read. */
const ACTIONABLE_MS = 6000;
const PLAIN_MS = 3500;

/** How often the timer bar redraws. 2px of bar does not need a frame each. */
const TICK_MS = 50;

/** Matches `EXIT_MS` in `useToasts`. */
const EXIT_MS = 140;

function prefersReducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type RowProps = {
	toast: Toast;
	onUndo: (id: number) => void;
	onClose: (id: number) => void;
	dark: boolean;
	theme: Theme;
};

function ToastRow({ toast, onUndo, onClose, dark, theme }: RowProps) {
	const actionable = Boolean(toast.onUndo);
	const total = actionable ? ACTIONABLE_MS : PLAIN_MS;

	const [left, setLeft] = useState(total);
	const [entered, setEntered] = useState(false);
	const [paused, setPaused] = useState(false);
	const rowRef = useRef<HTMLDivElement | null>(null);

	// Mount at the offset, then flip on the next frame so the transition has two
	// values to move between. Setting both in one paint animates nothing.
	useEffect(() => {
		const frame = requestAnimationFrame(() => setEntered(true));
		return () => cancelAnimationFrame(frame);
	}, []);

	/*
	 * The countdown lives here rather than in the stack so that pausing one row
	 * pauses only that row. It also means the bar and the expiry can never
	 * disagree: they are the same number.
	 */
	useEffect(() => {
		if (paused || toast.leaving) return;

		const timer = setInterval(() => setLeft((ms) => Math.max(0, ms - TICK_MS)), TICK_MS);

		return () => clearInterval(timer);
	}, [paused, toast.leaving]);

	// Expiry is its own effect rather than a call inside the updater above: an
	// updater may run more than once for one update, and closing twice would
	// take the toast that replaced this one with it.
	useEffect(() => {
		if (left > 0 || toast.leaving) return;

		onClose(toast.id);
	}, [left, toast.leaving, toast.id, onClose]);

	const reduced = prefersReducedMotion();
	const hidden = ! entered || toast.leaving;

	/*
	 * The dark hairline is the heaviest in the app, and deliberately so. In
	 * light the fill separates from the ground at 14.5:1 and the shadow is a
	 * nicety; in dark the same fill separates at 1.18:1 and a shadow of black on
	 * near-black does nothing. `#6E5F4B` is the strongest border the dark
	 * palette already has, and the top highlight covers the rest.
	 */
	const hairline = dark ? '#6E5F4B' : theme.drawer.line;

	return (
		<div
			ref={rowRef}
			// `status` + polite: a removal someone just performed should be
			// announced, never interrupt. Focus is never stolen.
			role="status"
			aria-live="polite"
			aria-atomic="true"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocusCapture={() => setPaused(true)}
			onBlurCapture={(e) => {
				// Only unpause when focus actually left the toast, not when it
				// moved from the Undo pill to the dismiss.
				if (! rowRef.current?.contains(e.relatedTarget as Node | null)) setPaused(false);
			}}
			onKeyDown={(e) => {
				if (e.key !== 'Escape') return;
				e.stopPropagation();
				onClose(toast.id);
			}}
			class="pointer-events-auto relative flex items-center gap-3 w-full min-w-[280px] max-w-[460px] h-[56px] md:h-[52px] pl-[18px] pr-[14px] rounded-[15px] overflow-hidden"
			style={{
				background: theme.drawer.bg,
				border: `1px solid ${hairline}`,
				boxShadow: dark
					? '0 16px 40px rgba(0,0,0,.55), inset 0 1px 0 rgba(242,233,218,.07)'
					: '0 16px 40px rgba(36,30,23,.30)',
				opacity: hidden ? 0 : 1,
				// Reduced motion keeps the fade and drops the rise; the timer bar
				// stays either way, because it is information, not decoration.
				transform: reduced || ! hidden ? 'none' : 'translateY(12px)',
				transition: hidden && toast.leaving
					? `opacity ${EXIT_MS}ms ease-out`
					: 'opacity 180ms ease-out, transform 180ms ease-out',
			}}
		>
			{/* One line. The name truncates; the sentence does not. */}
			<span class="flex-1 min-w-0 text-[15px] leading-[1.3] truncate" style={{ color: theme.drawer.ink }}>
				{toast.name ? (
					<>{toast.lead} <span class="font-semibold">{toast.name}</span>.</>
				) : (
					toast.lead
				)}
			</span>

			{actionable && (
				<>
					<button
						onClick={() => onUndo(toast.id)}
						class={`shrink-0 h-[34px] px-3.5 rounded-[11px] text-sm font-semibold ${TOAST_UNDO}`}
					>
						Undo
					</button>

					{/* Dismissing **commits** — it is the only way off screen early. */}
					<button
						onClick={() => onClose(toast.id)}
						class={`shrink-0 flex items-center justify-center w-[30px] h-[30px] ${TOAST_DISMISS}`}
						aria-label="Dismiss"
					>
						<X size={16} strokeWidth={2} />
					</button>
				</>
			)}

			{/* Answers "how long do I have" instead of asking anyone to guess. */}
			<span
				class="absolute left-0 right-0 bottom-0 h-0.5"
				style={{ background: dark ? '#2C2419' : theme.drawer.line }}
				aria-hidden="true"
			>
				<span
					class="block h-full"
					style={{
						width: `${Math.max(0, (left / total) * 100)}%`,
						background: dark ? '#7E6E58' : '#9E8C74',
						transition: `width ${TICK_MS}ms linear`,
					}}
				/>
			</span>
		</div>
	);
}

type Props = {
	toasts: Toast[];
	onUndo: (id: number) => void;
	onClose: (id: number) => void;
	/**
	 * Where the stack sits. Passed in because it tracks the content column,
	 * which reflows when the drawer docks, collapses, or goes off-canvas — and a
	 * toast must never come to rest over the drawer.
	 */
	positionClass: string;
	dark: boolean;
	theme: Theme;
};

export function ToastStack({ toasts, onUndo, onClose, positionClass, dark, theme }: Props) {
	/*
	 * Cmd/Ctrl+Z from anywhere undoes the newest live toast — the path most
	 * people will actually reach for, and the reason the stack is in the tab
	 * order at all rather than stealing focus.
	 *
	 * Held back while a field has focus: someone mid-rename in the Filter pane
	 * means "undo my typing", and the browser's own undo is the right one.
	 */
	const live = useRef(toasts);
	live.current = toasts;

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== 'z' && e.key !== 'Z') return;
			if (! (e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;

			const el = document.activeElement;
			const tag = el?.tagName;

			if (tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement | null)?.isContentEditable) return;

			const newest = [...live.current].reverse().find((t) => ! t.leaving && t.onUndo);

			if (! newest) return;

			e.preventDefault();
			onUndo(newest.id);
		}

		addEventListener('keydown', onKeyDown);

		return () => removeEventListener('keydown', onKeyDown);
	}, [onUndo]);

	if (toasts.length === 0) return null;

	return (
		// `pointer-events-none` on the rail so the column underneath stays
		// clickable everywhere the toasts themselves are not.
		<div class={`flex flex-col items-center gap-2 px-4 pointer-events-none ${positionClass}`}>
			{toasts.map((toast) => (
				<ToastRow
					key={toast.id}
					toast={toast}
					onUndo={onUndo}
					onClose={onClose}
					dark={dark}
					theme={theme}
				/>
			))}
		</div>
	);
}
