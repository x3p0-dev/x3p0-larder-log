import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ColorPicker } from './ColorPicker.jsx';
import { IconPicker } from './IconPicker.jsx';
import { DEFAULT_PALETTE, chipStyle, entityColorFor } from '../lib/theme.js';
import { iconSetFor } from '../lib/icons.js';

const KIND_LABEL = { location: 'Location', type: 'Type', store: 'Store' };

/**
 * Unified chip picker: used both for sidebar filters (always single-select) and
 * for the item add/edit forms (Location single-select, Type/Store multi-select).
 * New entries are created via a trailing dashed "+" chip that expands into a
 * small color (and, for locations and types, icon) picker — the same
 * interaction everywhere, rather than a separate always-open text field.
 */
export function ChipPicker({ kind, entities, selected, multi, onSelect, onToggle, onCreate, theme, dark, leadingAll, countFor }) {
	const iconSet = iconSetFor(kind);
	const label = KIND_LABEL[kind];
	const shapeClass = kind === 'location' ? 'rounded-md' : 'rounded-full';
	const variant = kind === 'store' ? 'ring' : 'fill';

	const [adding, setAdding] = useState(false);
	const [name, setName] = useState('');
	const [color, setColor] = useState(DEFAULT_PALETTE[0]);
	const [icon, setIcon] = useState(iconSet?.defaultKey);

	function resetDraft() {
		setName('');
		setColor(DEFAULT_PALETTE[0]);
		setIcon(iconSet?.defaultKey);
		setAdding(false);
	}

	function submit() {
		const trimmed = name.trim();
		if (! trimmed) return;
		if (! entities.some((e) => e.name === trimmed)) onCreate(trimmed, color, iconSet ? icon : undefined);
		if (multi) {
			if (! selected.includes(trimmed)) onToggle(trimmed);
		} else {
			onSelect(trimmed);
		}
		resetDraft();
	}

	return (
		<div>
			<div className="flex flex-wrap gap-1.5 items-center">
				{leadingAll && (
					<button
						type="button"
						onClick={leadingAll.onClick}
						className={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
						style={{
							background: leadingAll.active ? theme.inkBg : theme.neutralChipBg,
							color: leadingAll.active ? theme.inkText : theme.neutralChipText,
						}}
					>
						{leadingAll.label} <span className="opacity-60">{leadingAll.count}</span>
					</button>
				)}

				{entities.map((e) => {
					const isActive = multi ? selected.includes(e.name) : selected === e.name;
					const tc = entityColorFor(e.name, entities, dark);
					return (
						<button
							key={e.name}
							type="button"
							onClick={() => (multi ? onToggle(e.name) : onSelect(isActive ? null : e.name))}
							aria-pressed={isActive}
							className={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
							style={chipStyle(tc, isActive, theme, variant)}
						>
							{e.name}{countFor && <span className="opacity-60"> {countFor(e.name)}</span>}
						</button>
					);
				})}

				<button
					type="button"
					onClick={() => (adding ? resetDraft() : setAdding(true))}
					aria-expanded={adding}
					className={`px-2.5 py-1 ${shapeClass} text-xs font-medium flex items-center gap-1 border border-dashed`}
					style={{
						borderColor: adding ? theme.inkBg : theme.borderStrong,
						color: adding ? theme.text : theme.textMuted,
						background: 'transparent',
					}}
				>
					<Plus size={11} /> {label}
				</button>
			</div>

			{adding && (
				<div className="mt-2 p-2.5 rounded-md" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
					<ColorPicker value={color} onChange={setColor} theme={theme} />

					{iconSet && (
						<IconPicker options={iconSet.options} value={icon} onChange={setIcon} activeColor={color} theme={theme} />
					)}

					<div className="flex gap-1">
						<input
							autoFocus
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())}
							placeholder={`${label} name`}
							className="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
							style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
						/>
						<button type="button" onClick={submit} className="px-2 rounded text-xs font-medium" style={{ background: theme.inkBg, color: theme.inkText }}>
							Add
						</button>
						<button type="button" onClick={resetDraft} className="px-2 rounded text-xs" style={{ color: theme.textFaint }}>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
