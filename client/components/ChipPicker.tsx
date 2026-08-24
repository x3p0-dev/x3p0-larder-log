import { useState } from 'preact/hooks';
import { Plus } from 'lucide-preact';

import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import type { Theme } from '../lib/theme';
import { DEFAULT_PALETTE, chipStyle, entityColorFor } from '../lib/theme';
import { iconSetFor } from '../lib/icons';
import type { Term, TermKind } from '../../shared/types';

const KIND_LABEL: Record<TermKind, string> = { location: 'Location', type: 'Type', store: 'Store' };

type LeadingAll = {
	label: string;
	count: number;
	active: boolean;
	onClick: () => void;
};

type CommonProps = {
	kind: TermKind;
	entities: Term[];
	onCreate: (name: string, color?: string, icon?: string) => void;
	theme: Theme;
	dark: boolean;
	leadingAll?: LeadingAll;
	countFor?: (name: string) => number;
};

type Props =
	| (CommonProps & { multi: true; selected: string[]; onToggle: (name: string) => void; onSelect?: undefined })
	| (CommonProps & { multi: false; selected: string | null; onSelect: (name: string | null) => void; onToggle?: undefined });

/**
 * Unified chip picker: used both for sidebar filters (always single-select) and
 * for the item add/edit forms (Location single-select, Type/Store multi-select).
 * New entries are created via a trailing dashed "+" chip that expands into a
 * small color (and, for locations and types, icon) picker — the same
 * interaction everywhere, rather than a separate always-open text field.
 */
export function ChipPicker(props: Props) {
	const { kind, entities, onCreate, theme, dark, leadingAll, countFor } = props;

	const iconSet = iconSetFor(kind);
	const label = KIND_LABEL[kind];
	// Whole literals, not an interpolated fragment: Zero compiles the classes it
	// can find as static strings in the source.
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
		if (props.multi) {
			if (! props.selected.includes(trimmed)) props.onToggle(trimmed);
		} else {
			props.onSelect(trimmed);
		}
		resetDraft();
	}

	return (
		<div>
			<div class="flex flex-wrap gap-1.5 items-center">
				{leadingAll && (
					<button
						type="button"
						onClick={leadingAll.onClick}
						class={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
						style={{
							background: leadingAll.active ? theme.inkBg : theme.neutralChipBg,
							color: leadingAll.active ? theme.inkText : theme.neutralChipText,
						}}
					>
						{leadingAll.label} <span class="opacity-60">{leadingAll.count}</span>
					</button>
				)}

				{entities.map((e) => {
					const isActive = props.multi ? props.selected.includes(e.name) : props.selected === e.name;
					const tc = entityColorFor(e.name, entities, dark);
					return (
						<button
							key={e.name}
							type="button"
							onClick={() => (props.multi ? props.onToggle(e.name) : props.onSelect(isActive ? null : e.name))}
							aria-pressed={isActive}
							class={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
							style={chipStyle(tc, isActive, theme, variant)}
						>
							{e.name}{countFor && <span class="opacity-60"> {countFor(e.name)}</span>}
						</button>
					);
				})}

				<button
					type="button"
					onClick={() => (adding ? resetDraft() : setAdding(true))}
					aria-expanded={adding}
					class={`px-2.5 py-1 ${shapeClass} text-xs font-medium flex items-center gap-1 border border-dashed`}
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
				<div class="mt-2 p-2.5 rounded-md" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
					<ColorPicker value={color} onChange={setColor} theme={theme} />

					{iconSet && (
						<IconPicker options={iconSet.options} value={icon} onChange={setIcon} activeColor={color} theme={theme} />
					)}

					<div class="flex gap-1">
						<input
							autoFocus
							value={name}
							onInput={(e) => setName(e.currentTarget.value)}
							onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())}
							placeholder={`${label} name`}
							class="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
							style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
						/>
						<button type="button" onClick={submit} class="px-2 rounded text-xs font-medium" style={{ background: theme.inkBg, color: theme.inkText }}>
							Add
						</button>
						<button type="button" onClick={resetDraft} class="px-2 rounded text-xs" style={{ color: theme.textFaint }}>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
