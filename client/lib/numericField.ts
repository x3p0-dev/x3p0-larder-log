/**
 * Quantity fields take 0–9 and nothing else, and they refuse the rest at the
 * keystroke rather than at save time.
 *
 * `type="number"` is not the answer. It keeps its own invalid state, so a field
 * holding `1e5`, `--` or `1.2.3` reads back as `''` — indistinguishable from
 * empty — and it still accepts `e`, `+`, `-` and `.` on the way in. A text
 * field filtered here stays exactly what the app stores: a decimal string
 * (D4), which `toInt` can always parse.
 *
 * `beforeinput` carries the text about to be inserted — typing, pasting,
 * dropping and autocorrect alike — so refusing it there means the character
 * never lands and the caret never moves. `input` is the net underneath, for
 * the paths that describe no data (an IME commit, some drops): it strips what
 * arrived and puts the caret back where the user left it.
 */

import type { JSX } from 'preact';
import { digitsOnly, MAX_QTY_DIGITS } from '../../shared/qty';

type Field = JSX.TargetedInputEvent<HTMLInputElement>;

/**
 * Props for a text input that only ever holds digits. Spread it in place of
 * `onInput` — `value` stays the caller's, so the field is still controlled.
 *
 * `maxDigits` is a *field* cap, not a storage rule. The sheet's steppers stop
 * at four because a five-digit numeral overflows an 85px cell at 390 and a
 * pantry does not hold 10,000 of anything; the storage ceiling stays where
 * `toInt` can still parse it.
 */
export function digitField(onValue: (next: string) => void, maxDigits: number = MAX_QTY_DIGITS) {
	return {
		inputMode: 'numeric' as const,
		autocomplete: 'off',
		maxLength: maxDigits,

		onBeforeInput: (e: Field) => {
			const data = e.data;

			// Deletions and the like report no data; those are always allowed.
			if (typeof data === 'string' && digitsOnly(data) !== data) {
				e.preventDefault();
			}
		},

		onInput: (e: Field) => {
			const el = e.currentTarget;
			const clean = digitsOnly(el.value).slice(0, maxDigits);

			if (clean !== el.value) {
				// Count the digits the user had already passed, so the caret
				// lands after the same character it was after before.
				const caret = digitsOnly(
					el.value.slice(0, el.selectionStart ?? el.value.length)
				).length;

				el.value = clean;
				el.setSelectionRange(caret, caret);
			}

			onValue(clean);
		},
	};
}
