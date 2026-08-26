import { useId, useRef, useState } from 'preact/hooks';
import type { LucideIcon } from 'lucide-preact';

import { DialogButtons, ModalShell } from './ModalShell';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_INPUT_CONFIRM } from '../lib/controlStyles';

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
 * The box itself — 420px, radius 18, the scrim, the focus trap — is
 * `ModalShell`, shared with *New household* (D42). Only the contents are here.
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
	const [typed, setTyped] = useState('');

	const cancelRef = useRef<HTMLButtonElement | null>(null);
	const fieldRef = useRef<HTMLInputElement | null>(null);

	const titleId = useId();
	const bodyId = useId();

	const disc = statusColor(tone === 'danger' ? 'out' : 'low', dark);
	const armed = requireText === undefined || typed.trim() === requireText.trim();

	/*
	 * Initial focus is **Cancel**, so the first thing under the return key is
	 * the harmless one. The typed variant focuses the field instead — the
	 * disabled primary is already the guard there, and landing on Cancel would
	 * mean tabbing to the one control the dialog exists to make you use.
	 */
	function focusFirst() {
		setTyped('');
		(requireText === undefined ? cancelRef.current : fieldRef.current)?.focus();
	}

	return (
		<ModalShell
			open={open}
			role="alertdialog"
			labelledBy={titleId}
			describedBy={bodyId}
			onCancel={onCancel}
			initialFocus={focusFirst}
			dark={dark}
			theme={theme}
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

			<DialogButtons
				cancelRef={cancelRef}
				onCancel={onCancel}
				onConfirm={onConfirm}
				confirmLabel={confirmLabel}
				armed={armed}
				dark={dark}
				theme={theme}
			/>
		</ModalShell>
	);
}
