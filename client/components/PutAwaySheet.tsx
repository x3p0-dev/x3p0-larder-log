import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, X } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { themed } from '../lib/theme';
import { PAGE_BUTTON_PRIMARY, PAGE_ICON } from '../lib/controlStyles';
import { Stepper } from './Stepper';

import type { PutAwayRow } from '../../shared/restock';
import { putAwayMeta, restockPrefill } from '../../shared/restock';
import { formatSize } from '../../shared/size';

/**
 * Putting the trip away — the one screen in the app that writes a count nobody
 * guessed.
 *
 * **A check claims and this writes** (D64). Ticking a row on the run list says
 * *I am getting this*, and it cannot say how many: the app has no way to know
 * whether you came home with a four-pack or a single. So the number is set once,
 * deliberately, here — which is also **the only self-correcting moment in the
 * product**, because it is the one time somebody is guaranteed to be looking at
 * the shelf and the app together.
 *
 * **It is the Add / Edit sheet in a different job**, which is most of why it
 * costs so little: the same scrim, the same geometry, the same motion, the same
 * stepper one size down. Nothing new is drawn.
 *
 * **The stepper asks *how many do you have now*** — the question every other
 * stepper in the app asks. An *added* quantity would be a second mental model
 * for one control and the sheet would have to say which it meant.
 */
type Props = {
	open: boolean;
	/**
	 * The rows to put away, snapshotted when the sheet opened.
	 *
	 * Held by the caller rather than recomputed here, because the list underneath
	 * is live: somebody else restocking a row mid-put-away would otherwise pull
	 * it out from under a number you had already typed.
	 */
	rows: PutAwayRow[];
	saving: boolean;
	/** Resolves true when the counts landed. False leaves the sheet open with them. */
	onCommit: (counts: Record<string, string>) => void;
	onClose: () => void;
	dark: boolean;
	theme: Theme;
};

export function PutAwaySheet({ open, rows, saving, onCommit, onClose, dark, theme }: Props) {
	const sheetRef = useRef<HTMLElement>(null);

	/**
	 * What each row's stepper is holding, keyed by item id.
	 *
	 * Seeded from the prefill when the sheet opens and **not** re-seeded while it
	 * is up: the whole point of the screen is the numbers somebody corrects, and
	 * a live re-seed would take them back.
	 */
	const [counts, setCounts] = useState<Record<string, string>>({});

	useEffect(() => {
		if (! open) return;

		const seeded: Record<string, string> = {};

		for (const row of rows) seeded[row.item.id] = String(restockPrefill(row.item.qty, row.item.threshold));

		setCounts(seeded);

		/*
		 * Focus enters the dialog and lands on nothing in particular, the way the
		 * *edit* sheet's does: this screen opens on several rows and nothing knows
		 * which one you came to correct. A caret in the first stepper would say
		 * *this one is wrong*, and on a phone it would throw the keyboard over the
		 * rest of them.
		 */
		sheetRef.current?.focus();

		// `rows` is the snapshot the caller took at open, so the identity is
		// stable for as long as the sheet is up; depending on it would re-seed on
		// nothing more than the parent re-rendering.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			// Escape closes and nothing is written — the composer's own bargain,
			// and the reason the header's `×` needs no confirmation beside it.
			if (e.key === 'Escape') onClose();
		}

		document.addEventListener('keydown', onKey);

		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (! open || rows.length === 0) return null;

	return (
		<>
			<button
				onClick={onClose}
				class="fixed inset-0 z-40"
				style={{ background: 'rgba(36, 30, 23, 0.34)' }}
				aria-label="Close"
			/>

			<aside
				ref={sheetRef}
				tabIndex={-1}
				role="dialog"
				aria-label="Put away"
				class={
					/* The Add / Edit sheet's geometry exactly, for the reason its own comment gives: `dvh`, because `vh` is the URL-bar-hidden viewport and the footer is the decision. */
					'fixed z-50 flex flex-col outline-none '
					+ 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl '
					+ 'md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:max-h-none md:rounded-none'
				}
				style={{
					background: dark
						? 'radial-gradient(120% 60% at 100% 0%, #2E271C 0%, #241E16 100%)'
						: 'radial-gradient(120% 60% at 100% 0%, #FBF6EC 0%, #F5EDDF 100%)',
					borderLeft: `1px solid ${theme.borderStrong}`,
					boxShadow: '-20px 0 50px rgba(36, 30, 23, 0.22)',
				}}
			>
				{/* Mobile grabber. On desktop the sheet has an edge and does not need one. */}
				<span class="md:hidden mx-auto mt-2 mb-1 w-9 h-1 rounded-full shrink-0" style={{ background: theme.border }} />

				<div
					class="flex items-center justify-between gap-3 shrink-0 h-[62px] md:h-[68px] px-4 md:px-5"
					style={{ borderBottom: `1px solid ${theme.divider}` }}
				>
					<div class="flex flex-col gap-[3px] min-w-0">
						<span class="font-disp text-[21px] font-semibold tracking-[-0.01em]" style={{ color: theme.textStrong }}>
							Put away
						</span>
						<span class="text-[13px]" style={{ color: theme.textMuted }}>
							{rows.length} from this trip
						</span>
					</div>
					<button
						onClick={onClose}
						class={`flex items-center justify-center w-11 h-11 -mr-2.5 shrink-0 ${PAGE_ICON}`}
						aria-label="Close"
					>
						<X size={19} />
					</button>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto px-4 md:px-5 py-4">
					{/*
					  * **What the numbers are, in one sentence.** The prefill is a
					  * floor that saves you the ordinary rows and it is not a claim to
					  * know what you did — a garden glut is not a number anybody could
					  * have guessed. Saying so is what makes correcting one feel like
					  * the expected move rather than a correction.
					  */}
					<p class="text-[12.5px] leading-relaxed mb-3" style={{ color: theme.textMuted }}>
						Each one starts at the smallest count that clears its threshold.
						Correct anything that&rsquo;s wrong &mdash; this is the one moment
						you&rsquo;re standing in front of the shelf.
					</p>

					<ul class="list-none m-0 p-0">
						{rows.map((row, index) => (
							<PutAwayItem
								key={row.item.id}
								row={row}
								first={index === 0}
								value={counts[row.item.id] ?? ''}
								onValue={(next) => setCounts((prev) => ({ ...prev, [row.item.id]: next }))}
								dark={dark}
								theme={theme}
							/>
						))}
					</ul>
				</div>

				{/* Sticky: the sheet scrolls, the decision does not. */}
				<div
					class="mt-auto shrink-0 flex items-center justify-end gap-2.5 h-20 md:h-[76px] px-4 md:px-5"
					style={{ borderTop: `1px solid ${theme.divider}` }}
				>
					<button onClick={onClose} class={`h-11 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_ICON}`}>
						Cancel
					</button>
					{/*
					  * **The verb and the number**, because the button commits several
					  * writes at once and *Save* would undersell it — and because the
					  * count is the one thing somebody might want to check before
					  * pressing.
					  */}
					<button
						onClick={() => onCommit(counts)}
						disabled={saving}
						class={`flex items-center gap-2.5 h-11 px-5 rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
						style={{ background: theme.inkBg, color: theme.inkText }}
					>
						<Check size={17} strokeWidth={2.4} />
						{saving
							? 'Updating…'
							: `Update ${rows.length} ${rows.length === 1 ? 'count' : 'counts'}`}
					</button>
				</div>
			</aside>
		</>
	);
}

/**
 * One row: what it is, where it came from, and what it is about to become.
 *
 * Two lines and a stepper. The **name and the size are one phrase** — *"Butter,
 * 1 lb"* — which is the run list's own rule and the reason the size does not
 * move across to sit with the counts. The second line leads with the source
 * because that is the part that changes between rows; `was 0 · low at 4` is the
 * same sentence every time and is there to be checked against rather than read.
 */
function PutAwayItem({ row, first, value, onValue, dark, theme }: {
	row: PutAwayRow;
	/** The list's own edge does the job of a rule above the first row. */
	first: boolean;
	value: string;
	onValue: (next: string) => void;
	dark: boolean;
	theme: Theme;
}) {
	const size = formatSize(row.item.size, row.item.unit);

	/*
	 * The dot is the *source's* colour, resolved through `themed()` rather than
	 * `termColorFor()`: an ink is either a colour token or a legacy hex, and only
	 * `themed()` handles both. Getting that wrong renders nothing at all and
	 * looks exactly like a row with no source.
	 */
	const dot = row.sourceInk ? themed(row.sourceInk, dark).dot : null;

	/*
	 * The group is labelled by **name and size**, because two items can share a
	 * name and the stepper inside it is otherwise announced as a bare number.
	 */
	const label = size ? `${row.item.name}, ${size}` : row.item.name;

	return (
		<li
			class="flex items-center gap-3 py-[13px]"
			style={first ? undefined : { borderTop: `1px solid ${theme.divider}` }}
		>
			<div class="flex-1 min-w-0 flex flex-col gap-[5px]">
				<span class="flex items-baseline gap-2 min-w-0">
					<span
						class="font-disp font-semibold text-[17px] truncate"
						style={{ color: theme.textStrong }}
					>
						{row.item.name}
					</span>
					{size && (
						<span class="text-[13px] whitespace-nowrap shrink-0" style={{ color: theme.textMuted }}>
							{size}
						</span>
					)}
				</span>
				<span class="flex items-center gap-[7px] min-w-0">
					{dot && <span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: dot }} />}
					<span class="text-[13px] truncate" style={{ color: theme.textMuted }}>
						{putAwayMeta(row)}
					</span>
				</span>
			</div>

			<Stepper label={label} value={value} onValue={onValue} compact dark={dark} theme={theme} />
		</li>
	);
}
