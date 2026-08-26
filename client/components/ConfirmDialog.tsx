import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { LucideIcon } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_BUTTON_DIALOG, PAGE_BUTTON_GHOST, PAGE_INPUT_CONFIRM } from '../lib/controlStyles';

/**
 * The confirm modal, and its blocked and typed variants.
 *
 * **Crimson is never a button here.** The primary is the ordinary ink/cream
 * fill; destructiveness is carried by three things that cost nothing — the
 * title asks the question, the body names what is lost, and the button says the
 * verb (*Revoke invite*, *Leave household*), never *Confirm* or *OK*. Crimson
 * appears once, as the icon tint, which is the tag treatment applied to a glyph
 * and comes free from the out tokens.
 *
 * A **blocked** dialog is the same shell with the destructive half removed:
 * icon, title, body, and Cancel plus a button that goes where the problem is.
 * It never has a destructive action, because there is nothing to decide — so
 * its disc takes the **low** tokens instead. Amber is "hold on", crimson is
 * "gone", and a blocked dialog is the first. Both come off the same status ramp
 * as the item badges, which is why neither needs a new colour.
 */

/** `danger` takes the out tokens, `blocked` the low ones. */
export type ConfirmTone = 'danger' | 'blocked';

const SCRIM_MS = 160;
const ENTER_MS = 180;
const EXIT_MS = 120;

function prefersReducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

type Props = {
	open: boolean;
	tone: ConfirmTone;
	/** Lucide glyph for the disc. One per action, tinted by the tone. */
	icon: LucideIcon;
	title: string;
	body: string;
	/** The verb, never *Confirm*. On a blocked dialog, where to go instead. */
	confirmLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
	/**
	 * Turns this into the typed confirmation: the exact string that has to be
	 * entered before the primary enables.
	 *
	 * The **only** one in the app. It earns the exception by being the only
	 * action that destroys data belonging to more than one screen; anywhere else
	 * it would be theatre.
	 */
	requireText?: string;
	dark: boolean;
	theme: Theme;
};

export function ConfirmDialog({
	open, tone, icon: Icon, title, body, confirmLabel,
	onConfirm, onCancel, requireText, dark, theme,
}: Props) {
	const [rendered, setRendered] = useState(open);
	const [entered, setEntered] = useState(false);
	const [typed, setTyped] = useState('');

	const cardRef = useRef<HTMLDivElement | null>(null);
	const cancelRef = useRef<HTMLButtonElement | null>(null);
	const fieldRef = useRef<HTMLInputElement | null>(null);
	/** Whatever had focus when this opened, so it can be handed back. */
	const opener = useRef<HTMLElement | null>(null);

	const titleId = useId();
	const bodyId = useId();

	const reduced = prefersReducedMotion();
	const disc = statusColor(tone === 'danger' ? 'out' : 'low', dark);
	const armed = requireText === undefined || typed.trim() === requireText.trim();

	// Open and close are separate passes: the exit fade needs the card still
	// mounted, so `rendered` trails `open` by the length of it.
	useEffect(() => {
		if (open) {
			opener.current = document.activeElement as HTMLElement | null;
			setTyped('');
			setRendered(true);
			const frame = requestAnimationFrame(() => setEntered(true));

			return () => cancelAnimationFrame(frame);
		}

		setEntered(false);

		const timer = setTimeout(() => setRendered(false), reduced ? 0 : EXIT_MS);

		return () => clearTimeout(timer);
	}, [open, reduced]);

	/*
	 * Initial focus is **Cancel**, so the first thing under the return key is
	 * the harmless one. The typed variant focuses the field instead — the
	 * disabled primary is already the guard there, and landing on Cancel would
	 * mean tabbing to the one control the dialog exists to make you use.
	 */
	useEffect(() => {
		if (! entered) return;

		(requireText === undefined ? cancelRef.current : fieldRef.current)?.focus();
	}, [entered, requireText]);

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
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={bodyId}
				class="relative w-full max-w-[420px] p-[22px] rounded-[18px]"
				style={{
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
				<div
					class="flex items-center justify-center w-10 h-10 rounded-full"
					style={{ background: disc.bg, border: `1px solid ${disc.ring}`, color: disc.ink }}
				>
					<Icon size={20} strokeWidth={1.75} />
				</div>

				<h3
					id={titleId}
					class="font-disp text-item font-semibold leading-[1.25] mt-3.5"
					style={{ color: theme.textStrong }}
				>
					{title}
				</h3>

				<p id={bodyId} class="text-[15px] leading-[1.5] mt-2" style={{ color: theme.text }}>
					{body}
				</p>

				{requireText !== undefined && (
					<>
						<label class="block text-[13px] mt-[18px] mb-1.5" style={{ color: theme.textMuted }} for={`${titleId}-field`}>
							Type {requireText} to confirm
						</label>
						<input
							ref={fieldRef}
							id={`${titleId}-field`}
							value={typed}
							onInput={(e) => setTyped(e.currentTarget.value)}
							onKeyDown={(e) => {
								if (e.key !== 'Enter' || ! armed) return;
								e.preventDefault();
								onConfirm();
							}}
							placeholder="Type here"
							autoComplete="off"
							class={`w-full h-10 px-3 rounded-[11px] text-[15px] ${PAGE_INPUT_CONFIRM}`}
							style={{ borderColor: dark ? '#6E5F4B' : '#9B8B75' }}
						/>
					</>
				)}

				{/* Cancel first, then the action — the harmless one is nearer the body. */}
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
			</div>
		</div>
	);
}
