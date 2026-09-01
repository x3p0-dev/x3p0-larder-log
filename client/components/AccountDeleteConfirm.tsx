import { useId, useRef, useState } from 'preact/hooks';
import { Trash2 } from 'lucide-preact';

import { DialogButtons, ModalShell } from './ModalShell';
import { HouseholdTile } from './HouseholdTile';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_INPUT_CONFIRM } from '../lib/controlStyles';
import type { AccountHousehold, RecapRow } from '../../shared/accountDeletion';
import { confirmBody, recapMeta, recapRows } from '../../shared/accountDeletion';

/**
 * Deleting your account — the confirmation (D68).
 *
 * **One confirmation over the whole thing rather than a sequence of them**,
 * which is the reason the pre-flight exists at all. 520 to match it, because
 * they are one flow rather than two dialogs that happen to follow each other.
 *
 * **The app's third typed confirmation**, after deleting your own last
 * household and deleting one from the console.
 *
 * **The display name, not the email.** A typed confirmation buys a beat of
 * deliberation, not authentication — it is a rhythm-breaker, and nobody has
 * ever been stopped by one they could paste. So it takes the name a person
 * thinks of as theirs, and the one the rest of the household has been seeing.
 * The email would be more precise about *which* account and worse at the only
 * job the field has. (It is also `''` in production — D56.)
 *
 * **The body is a list, which is new.** Every other confirm's body is two lines
 * at most, because it names one thing that is lost. This one names up to five
 * households in three fates, and a sentence that tried would be the worst
 * paragraph in the app — so the sentence says what the *account* loses and the
 * recap block below it accounts for the households one by one.
 */
export function AccountDeleteConfirm({
	open, name, households, chosen, onConfirm, onCancel, busy, error, dark, theme,
}: {
	open: boolean;
	/** The account's display name — what has to be typed. */
	name: string;
	households: readonly AccountHousehold[];
	chosen: Readonly<Record<string, string>>;
	onConfirm: () => void;
	onCancel: () => void;
	/** The write is in flight. The primary goes flat and the field stops arming. */
	busy: boolean;
	/**
	 * The server's own refusal, verbatim.
	 *
	 * **It lands in the dialog rather than in a toast or a banner behind it**,
	 * for the reason the console's transfer refusal does: *Decide what happens to
	 * Granny's first.* is an instruction about the screen you are on, and an
	 * instruction must not appear somewhere you would have to close this to read.
	 * The decisions and the typing survive it.
	 */
	error: string;
	dark: boolean;
	theme: Theme;
}) {
	const titleId = useId();
	const bodyId = useId();
	const fieldRef = useRef<HTMLInputElement | null>(null);
	const [typed, setTyped] = useState('');

	const rows = recapRows(households, chosen);
	const disc = statusColor('out', dark);
	const armed = ! busy && typed.trim() === name.trim() && name.trim() !== '';

	return (
		<ModalShell
			open={open}
			role="alertdialog"
			labelledBy={titleId}
			describedBy={bodyId}
			onCancel={onCancel}
			width={520}
			/* The field, not Cancel — the disabled primary is already the guard,
			 * and landing on Cancel would mean tabbing to the one control this
			 * dialog exists to make you use. `ConfirmDialog`'s own rule. */
			initialFocus={() => { setTyped(''); fieldRef.current?.focus(); }}
			dark={dark}
			theme={theme}
		>
			<span
				class="flex items-center justify-center w-10 h-10 rounded-full"
				style={{ background: disc.bg, border: `1px solid ${disc.ring}`, color: disc.ink }}
			>
				<Trash2 size={20} strokeWidth={1.75} />
			</span>

			<h2
				id={titleId}
				class="font-disp text-[21px] font-semibold leading-[1.25] mt-3.5 mb-2"
				style={{ color: theme.textStrong }}
			>
				Delete your account?
			</h2>

			<p id={bodyId} class="m-0 text-[15px] leading-[1.5]" style={{ color: theme.text }}>
				{confirmBody(households, chosen)}
			</p>

			{/*
			  * The recap — the pre-flight's own rows, read-only, with the triggers
			  * gone. A `<ul>`, and each row's fate is in its **text** rather than
			  * only in its colour: *Deleted · 128 items* reads the same to a screen
			  * reader as it does on the screen.
			  */}
			{rows.length > 0 && (
				<ul
					class="list-none m-0 mt-3.5 px-3.5 py-0.5 rounded-[14px]"
					style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
				>
					{rows.map((row, i) => (
						<li
							key={keyOf(row)}
							class="flex items-center gap-2.5 py-2.5"
							/* A hairline between rows and none above the first — a
							 * top border rather than a drawn rule, so the block has
							 * nothing in it that is not a row. */
							style={{ borderTop: i > 0 ? `1px solid ${theme.border}` : undefined }}
						>
							<span class="flex shrink-0 gap-1">
								{tilesOf(row).map((h) => (
									<HouseholdTile key={h.id} ink={h.ink} name={h.name} size={26} dark={dark} />
								))}
							</span>
							<span class="flex-1 min-w-0 truncate text-[14px]" style={{ color: theme.text }}>
								{labelOf(row)}
							</span>
							<span
								class="shrink-0 text-meta"
								style={{ color: row.fate === 'delete' ? theme.dangerText : theme.textMuted }}
							>
								{recapMeta(row)}
							</span>
						</li>
					))}
				</ul>
			)}

			{/*
			  * Three lines, each answering something everybody will assume. The
			  * third is the whole of *there is no hold*, and it is the only place
			  * left to say it: the card that comes after is read once, afterwards.
			  */}
			<div class="flex flex-col gap-[7px] mt-3.5">
				<p class="m-0 text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
					The pantries other people keep are untouched — nothing in Larder Log records
					who added what, so there is nothing of yours in them to remove.
				</p>
				<p class="m-0 text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
					This does not touch your Spacefast account. Signing in with it created this
					one; deleting this one doesn’t reach back.
				</p>
				<p class="m-0 text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
					<strong style={{ color: theme.textStrong }}>It happens straight away.</strong>{' '}
					There’s no waiting period and nothing to undo.
				</p>
			</div>

			<label
				class="block text-[13.5px] mt-[18px] mb-1.5"
				style={{ color: theme.text }}
				for={`${titleId}-field`}
			>
				Type <strong style={{ color: theme.textStrong }}>{name}</strong> to confirm.
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

			{error && (
				<p
					role="alert"
					class="m-0 mt-3.5 px-3 py-2.5 rounded-[11px] text-[13.5px] leading-[1.5]"
					style={{
						background: theme.surfaceAlt,
						border: `1px solid ${theme.dangerText}`,
						color: theme.dangerText,
					}}
				>
					{error}
				</p>
			)}

			<DialogButtons
				onCancel={onCancel}
				onConfirm={onConfirm}
				confirmLabel={busy ? 'Deleting…' : 'Delete account'}
				armed={armed}
				dark={dark}
				theme={theme}
			/>
		</ModalShell>
	);
}

/** A recap row's key. The leaving row is one row however many it covers. */
function keyOf(row: RecapRow): string {
	return row.fate === 'leave' ? 'leaving' : row.household.id;
}

function tilesOf(row: RecapRow): AccountHousehold[] {
	return row.fate === 'leave' ? row.households : [row.household];
}

function labelOf(row: RecapRow): string {
	return row.fate === 'leave'
		? row.households.map((h) => h.name).join(', ')
		: row.household.name;
}
