import { Minus, Plus } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { PAGE_FIELD, PAGE_FIELD_HALO_WITHIN, PAGE_FIELD_HALO_WITHIN_DARK, PAGE_STEPPER_CELL } from '../lib/controlStyles';
import { digitField } from '../lib/numericField';
import { useHoldRepeat } from '../hooks/useHoldRepeat';
import { toInt } from '../../shared/qty';

/**
 * How many digits a count field takes.
 *
 * Four, because a five-digit numeral overflows an 85px cell at 390 and a pantry
 * does not hold ten thousand of anything. It is a *field* cap and not a storage
 * rule — `toInt` parses far more than this.
 */
export const MAX_COUNT_DIGITS = 4;

/**
 * A count you can press or type — the app's one stepper, at two sizes.
 *
 * Symmetric and neutral: `−` and `+` as equal cells inside the field, hairlines
 * between the three. **Neither cell carries the ink fill the item card's plus
 * does** — the card has no primary at all so its plus has to be one, while
 * every surface this appears on already has exactly one ink control and it is
 * the thing that saves.
 *
 * **The numeral is a text field.** Stepping a low-at from 2 to 15 is thirteen
 * taps and typing is one gesture; press-and-hold repeats for anybody who does
 * not find that, and the *first* step still comes from `onClick` so a tap fires
 * once through the path that already works for a thumb, a mouse and the
 * keyboard alike.
 *
 * It was written inside `ItemSheet` and extracted when the put-away sheet
 * became a second caller (D64), for the reason `CheckBox` was: the rhyme is the
 * point. The number you set while adding a thing and the number you set while
 * unpacking it are the same number, asked the same way.
 */
export function Stepper({ value, onValue, label, compact, dark, theme }: {
	value: string;
	onValue: (next: string) => void;
	/** Announced as the field's name — *On hand*, or an item's name and size. */
	label: string;
	/**
	 * The row form: 132 × 44 at radius 11, against the sheet's own full-width 56.
	 *
	 * **One size down, and the reason generalises.** On the Add / Edit sheet the
	 * two steppers are the heroes of their section. On the put-away sheet every
	 * row has a name to read and there are several of them, so the stepper is a
	 * peer of its row rather than the point of it.
	 *
	 * **116 below `lg`, and only the width moves.** On a phone the row form
	 * shares its line with a name that has to stay readable, so the control
	 * gives back what it can — 16px of it, from the two cells. **The 44 does not
	 * move**: it is the touch floor, which is the whole of why *a little
	 * smaller* is a width and not a scale.
	 */
	compact?: boolean;
	dark: boolean;
	theme: Theme;
}) {
	const n = toInt(value);

	function step(by: number) {
		onValue(String(Math.max(0, toInt(value) + by)));
	}

	const down = useHoldRepeat(() => step(-1));
	const up = useHoldRepeat(() => step(1));

	const cell = `flex items-center justify-center shrink-0 ${compact ? 'w-[38px] lg:w-[42px]' : 'w-11'} ${PAGE_STEPPER_CELL}`;

	/*
	 * Two complete literals rather than a `dark:` variant. Tailwind's `dark:`
	 * follows `prefers-color-scheme`, and this app's theme stops being the OS's
	 * the moment a device overrides it (D25) — so the variant would paint the
	 * selection the wrong colour for exactly the people who chose one.
	 */
	const selection = dark
		? 'selection:bg-[rgba(212,99,107,0.22)]'
		: 'selection:bg-[rgba(190,51,70,0.18)]';

	return (
		<div
			role="group"
			aria-label={label}
			class={
				'flex items-stretch overflow-hidden '
				+ (compact ? 'w-[116px] lg:w-[132px] h-11 rounded-[11px] shrink-0 ' : 'h-14 rounded-[13px] ')
				+ `${PAGE_FIELD} ${dark ? PAGE_FIELD_HALO_WITHIN_DARK : PAGE_FIELD_HALO_WITHIN}`
			}
		>
			{/*
			  * At zero the minus stays faint and live, never disabled — the item
			  * card's rule, and D36's reason: a disabled control cannot explain
			  * itself. It just stops promising a change it will not make.
			  */}
			<button
				type="button"
				onClick={() => step(-1)}
				{...down}
				class={`${cell} ${n <= 0 ? 'text-ink-faint' : 'text-ink-body hover:text-ink'}`}
				style={{ borderRight: `1px solid ${theme.divider}` }}
				aria-label="Remove one"
			>
				<Minus size={compact ? 14 : 16} strokeWidth={2.2} />
			</button>

			<input
				value={value}
				{...digitField(onValue, MAX_COUNT_DIGITS)}
				role="spinbutton"
				aria-valuenow={n}
				aria-valuemin={0}
				aria-label={label}
				class={
					'flex-1 min-w-0 bg-transparent text-center font-disp font-bold outline-none '
					+ (compact ? 'text-[20px] ' : 'text-[26px] md:text-[28px] ')
					+ selection
				}
				style={{ color: theme.textStrong }}
			/>

			<button
				type="button"
				onClick={() => step(1)}
				{...up}
				class={`${cell} text-ink-body hover:text-ink`}
				style={{ borderLeft: `1px solid ${theme.divider}` }}
				aria-label="Add one"
			>
				<Plus size={compact ? 14 : 16} strokeWidth={2.2} />
			</button>
		</div>
	);
}
