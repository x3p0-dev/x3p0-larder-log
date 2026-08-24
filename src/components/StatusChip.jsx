import { STATUS_INK, themed } from '../lib/theme.js';

/** Numbered status filter chip in the header. */
export function StatusChip({ statusKey, label, count, active, dark, theme, onClick }) {
	const t = themed(STATUS_INK[statusKey], dark);

	return (
		<button
			onClick={onClick}
			aria-pressed={active}
			className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all"
			style={{ background: active ? t.ink : t.bg, boxShadow: active ? `0 0 0 2px ${t.ring}` : 'none' }}
		>
			<span
				className="mono text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
				style={{ background: active ? theme.onInk : t.ink, color: active ? t.ink : theme.onInk }}
			>
				{count}
			</span>
			<span className="text-xs font-medium" style={{ color: active ? theme.onInk : t.ink }}>{label}</span>
		</button>
	);
}
