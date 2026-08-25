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
			class="flex items-center gap-[7px] md:gap-2 px-[13px] md:px-3.5 py-2 md:py-[7px] rounded-full text-[12.5px] md:text-[13.5px] transition-shadow"
			style={{
				background: c.bg,
				border: `1px solid ${c.ring}`,
				color: c.ink,
				fontWeight: active ? 600 : 400,
				boxShadow: active ? `0 0 0 2px ${theme.ground}, 0 0 0 3.5px ${c.dot}` : 'none',
			}}
		>
			<span class="w-1.5 h-1.5 md:w-[7px] md:h-[7px] rounded-full shrink-0" style={{ background: c.dot }} />
			{count} <span class="md:hidden">{short}</span><span class="hidden md:inline">{label}</span>
		</button>
	);
}
