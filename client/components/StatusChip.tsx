import type { StatusKey } from '../../shared/status';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { PAGE_TINT_HOVER } from '../lib/controlStyles';

type Props = {
	statusKey: StatusKey;
	label: string;
	/** The tighter phrasing — "low" for "running low". Used when `compact`. */
	short: string;
	count: number;
	active: boolean;
	/**
	 * Whether the row this sits in is short of space.
	 *
	 * Measured from the content column rather than the viewport, so a docked
	 * drawer on a 1280 screen gets the same treatment a phone does. See
	 * `ROW2_FULL_PX` in `Pantry`.
	 */
	compact: boolean;
	dark: boolean;
	theme: Theme;
	onClick: () => void;
};

/*
 * Two complete class strings, because Tailwind resolves a class by scanning
 * source for a static literal and a computed one emits no CSS at all.
 *
 * The compact pill tightens rather than truncating: at full padding the three
 * of them measure 368px against the 358 a 390 screen leaves, and they wrap onto
 * two lines each, which reads as broken rather than tight.
 */
const PILL = 'gap-[9px] px-4 text-sm';
const PILL_COMPACT = 'gap-[7px] px-[13px] text-[13.5px]';

/**
 * A status count, and the filter for it.
 *
 * The chip always wears its own status tint — a count of what is out should
 * look like "out" whether or not you are filtering by it. Selection is a ring
 * rather than a fill, so the tint stays readable and the row still scans as
 * three tallies rather than one selected thing and two others.
 */
export function StatusChip({ statusKey, label, short, count, active, compact, dark, theme, onClick }: Props) {
	const c = statusColor(statusKey, dark);

	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			class={
				'flex items-center h-10 rounded-full shrink-0 font-semibold ' +
				'transition-[box-shadow,filter] active:translate-y-px ' +
				(compact ? PILL_COMPACT : PILL) + ' ' +
				PAGE_TINT_HOVER[dark ? 'dark' : 'light']
			}
			style={{
				background: c.bg,
				border: `1px solid ${c.ring}`,
				color: c.ink,
				boxShadow: active ? `0 0 0 2px ${theme.ground}, 0 0 0 3.5px ${c.dot}` : 'none',
			}}
		>
			<span class="w-2 h-2 rounded-full shrink-0" style={{ background: c.dot }} />
			{/*
			  * The count and its word are one flex item, not two. Flat, they each
			  * took the container's gap — so the space inside "3 low" was the same
			  * as the space after the dot, and the number read as detached from
			  * the word it counts.
			  */}
			{/*
			  * The count and its word are one flex item, not two. Flat, they each
			  * took the container's gap — so the space inside "3 low" was the same
			  * as the space after the dot, and the number read as detached from
			  * the word it counts.
			  */}
			<span class="flex items-center gap-1">
				{count}
				{/*
				  * The word has to be its own element. Left as a bare expression it
				  * sits next to `{count}` as a second text node, and adjacent text in
				  * a flex container collapses into **one** anonymous flex item — so
				  * `gap-1` had nothing between to apply to and the chip read "9low".
				  */}
				<span>{compact ? short : label}</span>
			</span>
		</button>
	);
}
