import type { StatusKey } from '../../shared/status';
import type { Theme } from '../lib/theme';
import { STATUS_INK, themed } from '../lib/theme';

type Props = {
	statusKey: StatusKey;
	label: string;
	count: number;
	active: boolean;
	dark: boolean;
	theme: Theme;
	onClick: () => void;
};

/** Numbered status filter chip in the header. */
export function StatusChip({ statusKey, label, count, active, dark, theme, onClick }: Props) {
	const t = themed(STATUS_INK[statusKey], dark);

	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all"
			style={{ background: active ? t.ink : t.bg, boxShadow: active ? `0 0 0 2px ${t.ring}` : 'none' }}
		>
			<span
				class="font-mono tracking-[0.02em] text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
				style={{ background: active ? theme.onInk : t.ink, color: active ? t.ink : theme.onInk }}
			>
				{count}
			</span>
			<span class="text-xs font-medium" style={{ color: active ? theme.onInk : t.ink }}>{label}</span>
		</button>
	);
}
