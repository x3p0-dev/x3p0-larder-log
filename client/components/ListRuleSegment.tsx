import type { Theme } from '../lib/theme';
import { PAGE_FOCUS } from '../lib/controlStyles';
import { LIST_RULES, LIST_RULE_LABELS } from '../../shared/listRule';
import type { ListRule } from '../../shared/listRule';

/**
 * Automatic · Always · Never — the item's list override (D65).
 *
 * **It sits in the sheet's `COUNT` section, under the two steppers**, because
 * *low at* is the sentence *put this on the list when I'm down to N* and both
 * overrides amend that sentence. It goes where the sentence is set.
 *
 * **It is the run list's segment, not a new component** — the same track, the
 * same raised-tab-on-a-sunk-track construction, the same custom-property trick
 * for the hover. What differs is that these are radio buttons rather than tabs,
 * so the roles change and there is no count on a row.
 *
 * **The active item is not the ink fill**, and that is the third time this
 * answer has been reached for the same reason: the sheet already has exactly one
 * ink control and it is *Save*. `surface` on `borderStrong` — a raised item on a
 * sunk track — with the label at 600.
 *
 * The hover has to go through custom properties because the rest colours come
 * off the `theme` object at runtime, and **an inline `border-color` beats any
 * `hover:` class**. That is exactly how the sort trigger once shipped with no
 * hover at all.
 */
export function ListRuleSegment({ value, onChange, theme }: {
	value: ListRule | '';
	onChange: (next: ListRule | '') => void;
	theme: Theme;
}) {
	return (
		<div
			role="radiogroup"
			aria-label="When this joins the list"
			class="flex items-center gap-[3px] p-[3px] h-11 md:h-10 rounded-[13px]"
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			{(['', ...LIST_RULES] as const).map((rule) => (
				<Item
					key={rule || 'auto'}
					on={value === rule}
					label={LIST_RULE_LABELS[rule]}
					onPick={() => onChange(rule)}
					theme={theme}
				/>
			))}
		</div>
	);
}

/**
 * One of the three.
 *
 * **`flex-1` rather than the run segment's content width**, which is the one
 * place the two differ and it is forced: the run list's tabs carry counts that
 * change under them, so they size to their contents, while these three are a
 * fixed set filling a 480px sheet and a ragged row of three would read as three
 * unrelated controls.
 *
 * A `radio` and not a `tab`: pressing one does not reveal a panel, it answers a
 * question. **Nothing is ever disabled** — every one of the three is always a
 * legal answer.
 */
function Item({ on, label, onPick, theme }: {
	on: boolean;
	label: string;
	onPick: () => void;
	theme: Theme;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={on}
			onClick={onPick}
			class={
				'flex-1 min-w-0 inline-flex items-center justify-center h-full px-[13px] rounded-[10px] '
				+ 'text-[13.5px] whitespace-nowrap truncate '
				// A bare `border` for the 1px and the style; the colour is the
				// property. The unselected items carry it transparent rather than
				// omitting it, or picking one would shift its neighbours by a pixel.
				+ 'border border-[color:var(--seg-line)] hover:border-[color:var(--seg-line-hover)] '
				+ 'text-[color:var(--seg-ink)] hover:text-[color:var(--seg-ink-hover)] '
				+ `transition-colors active:translate-y-px ${PAGE_FOCUS} `
				+ (on ? 'font-semibold' : 'font-medium')
			}
			style={{
				background: on ? theme.surface : undefined,
				'--seg-line': on ? theme.borderStrong : 'transparent',
				'--seg-line-hover': on ? theme.textFaint : theme.border,
				'--seg-ink': on ? theme.textStrong : theme.text,
				'--seg-ink-hover': theme.textStrong,
			}}
		>
			{label}
		</button>
	);
}
