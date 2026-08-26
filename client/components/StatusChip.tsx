import type { StatusKey } from '../../shared/status';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';

type Props = {
	statusKey: StatusKey;
	label: string;
	/** Mobile has less room; "running low" becomes "low". */
	short: string;
	count: number;
	active: boolean;
	dark: boolean;
	theme: Theme;
	onClick: () => void;
};

/**
 * The hover step, one per theme.
 *
 * Brightness rather than a second set of colors: every value on this chip comes
 * from `statusColor` at runtime, so there is nothing to write a literal hover
 * shade against — the same reason the rail's tiles use it. The *direction* has
 * to flip, though, which is why this is a pair: the tint is pale in light and
 * deep in dark, so hovering means darkening in one and lightening in the other.
 * Both are written out in full because Tailwind resolves a class by scanning
 * for a static string.
 *
 * The step is sized to match the page's neutral controls, which move about
 * twelve units between `surface` and `surface-alt`.
 */
const CHIP_HOVER = {
	light: 'hover:brightness-95',
	dark: 'hover:brightness-125',
};

/**
 * A status count, and the filter for it.
 *
 * The chip always wears its own status tint — a count of what is out should
 * look like "out" whether or not you are filtering by it. Selection is a ring
 * rather than a fill, so the tint stays readable and the row still scans as
 * three tallies rather than one selected thing and two others.
 */
export function StatusChip({ statusKey, label, short, count, active, dark, theme, onClick }: Props) {
	const c = statusColor(statusKey, dark);

	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			class={
				'flex items-center gap-[7px] md:gap-2 px-[13px] md:px-3.5 py-2 md:py-[7px] rounded-full ' +
				'text-[12.5px] md:text-[13.5px] transition-[box-shadow,filter] active:translate-y-px ' +
				CHIP_HOVER[dark ? 'dark' : 'light']
			}
			style={{
				background: c.bg,
				border: `1px solid ${c.ring}`,
				color: c.ink,
				fontWeight: active ? 600 : 400,
				boxShadow: active ? `0 0 0 2px ${theme.ground}, 0 0 0 3.5px ${c.dot}` : 'none',
			}}
		>
			<span class="w-1.5 h-1.5 md:w-[7px] md:h-[7px] rounded-full shrink-0" style={{ background: c.dot }} />
			{/*
			  * The count and its word are one flex item, not two. Flat, they each
			  * took the container's gap — so the space inside "3 low" was the same
			  * as the space after the dot, and the number read as detached from
			  * the word it counts.
			  */}
			<span class="flex items-center gap-1">
				{count}
				<span class="md:hidden">{short}</span>
				<span class="hidden md:inline">{label}</span>
			</span>
		</button>
	);
}
