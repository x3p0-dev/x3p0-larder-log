import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ChipPicker } from './ChipPicker.jsx';

/**
 * Collapsible sidebar wrapper around ChipPicker: adds the header, open/close,
 * and a Clear link. Sidebar filters are always single-select, even for
 * Type/Store where the item fields themselves are multi-select.
 */
export function FacetSection({
	title, kind, Icon, entities, active, onSelect, onCreate,
	theme, dark, defaultOpen = false, clearable = true, leadingAll, countFor,
}) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<div className="mt-5 first:mt-0">
			<div
				className="flex items-center justify-between py-1 gap-2 cursor-pointer"
				onClick={() => setOpen((v) => ! v)}
				role="button"
				tabIndex={0}
				aria-expanded={open}
				onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((v) => ! v))}
			>
				<span className="flex items-center gap-1.5 mono text-xs uppercase tracking-widest min-w-0" style={{ color: theme.textMuted }}>
					<Icon size={12} className="shrink-0" />
					<span className="truncate">{title}</span>
					{active && <span className="mono normal-case shrink-0" style={{ color: theme.textFaint }}>· {active}</span>}
				</span>
				<div className="flex items-center gap-2 shrink-0">
					{clearable && active && (
						<button
							onClick={(e) => { e.stopPropagation(); onSelect(null); }}
							className="text-xs underline"
							style={{ color: theme.textFaint }}
						>
							Clear
						</button>
					)}
					<ChevronDown
						size={13}
						style={{ color: theme.textFaint, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
					/>
				</div>
			</div>

			{open && (
				<div className="mt-2">
					<ChipPicker
						kind={kind} entities={entities} selected={active} multi={false}
						onSelect={onSelect} onCreate={onCreate} theme={theme} dark={dark}
						leadingAll={leadingAll} countFor={countFor}
					/>
				</div>
			)}
		</div>
	);
}
