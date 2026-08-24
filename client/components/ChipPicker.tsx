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
	/** Creates a term and resolves to its new id, or null if the server refused. */
	onCreate: (name: string, color?: string, icon?: string) => Promise<string | null>;
	theme: Theme;
	dark: boolean;
	leadingAll?: LeadingAll;
	countFor?: (id: string) => number;
};

/** `selected` and every callback speak **term ids**, never names. */
type Props =
	| (CommonProps & { multi: true; selected: string[]; onToggle: (id: string) => void; onSelect?: undefined })
	| (CommonProps & { multi: false; selected: string | null; onSelect: (id: string | null) => void; onToggle?: undefined });

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

	const [saving, setSaving] = useState(false);

	/**
	 * Creating a term is now a round trip, so selecting the result has to wait
	 * for the id the server assigns. An existing term with the same name is
	 * selected directly rather than sending a create the server would reject as
	 * a duplicate.
	 */
	async function submit() {
		const trimmed = name.trim();
		if (! trimmed || saving) return;

		const existing = entities.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());

		let id = existing?.id ?? null;

		if (! id) {
			setSaving(true);
			id = await onCreate(trimmed, color, iconSet ? icon : undefined);
			setSaving(false);

			// The server refused — a duplicate, or view-only access. It has
			// already surfaced why, so leave the draft open rather than
			// silently discarding what was typed.
			if (! id) return;
		}

		if (props.multi) {
			if (! props.selected.includes(id)) props.onToggle(id);
		} else {
			props.onSelect(id);
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
					const isActive = props.multi ? props.selected.includes(e.id) : props.selected === e.id;
					const tc = entityColorFor(e.id, entities, dark);
					return (
						<button
							key={e.id}
							type="button"
							onClick={() => (props.multi ? props.onToggle(e.id) : props.onSelect(isActive ? null : e.id))}
							aria-pressed={isActive}
							class={`px-2.5 py-1 ${shapeClass} text-xs font-medium`}
							style={chipStyle(tc, isActive, theme, variant)}
						>
							{e.name}{countFor && <span class="opacity-60"> {countFor(e.id)}</span>}
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
							onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
							placeholder={`${label} name`}
							class="flex-1 min-w-0 text-sm px-2 py-1 rounded border outline-none"
							style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
						/>
						<button
							type="button"
							onClick={submit}
							disabled={saving}
							class="px-2 rounded text-xs font-medium disabled:opacity-50"
							style={{ background: theme.inkBg, color: theme.inkText }}
						>
							{saving ? 'Adding…' : 'Add'}
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
