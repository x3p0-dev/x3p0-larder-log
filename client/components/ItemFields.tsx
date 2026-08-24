import { ChipPicker } from './ChipPicker';
import type { Theme } from '../lib/theme';
import { STATUS_INK } from '../lib/theme';
import type { ItemDraft, Term } from '../../shared/types';

type CreateTerm = (name: string, color?: string, icon?: string) => void;

type Props = {
	value: ItemDraft;
	onChange: (next: ItemDraft) => void;
	categories: Term[];
	types: Term[];
	stores: Term[];
	onCreateCategory: CreateTerm;
	onCreateType: CreateTerm;
	onCreateStore: CreateTerm;
	error?: string;
	dark: boolean;
	theme: Theme;
};

/**
 * The shared field set behind both "Add item" and the inline edit panel. The
 * caller owns the surrounding container and the action buttons, since those are
 * the only things that actually differ between the two.
 */
export function ItemFields({
	value, onChange, categories, types, stores,
	onCreateCategory, onCreateType, onCreateStore,
	error, dark, theme,
}: Props) {
	const inputStyle = { borderColor: theme.borderStrong, background: theme.surface, color: theme.text };
	const labelStyle = { color: theme.textMuted };

	const set = (patch: Partial<ItemDraft>) => onChange({ ...value, ...patch });
	const toggleIn = (field: 'types' | 'stores') => (name: string) => set({
		[field]: value[field].includes(name) ? value[field].filter((x) => x !== name) : [...value[field], name],
	});

	return (
		<>
			<input
				placeholder="Item name"
				value={value.name}
				onInput={(e) => set({ name: e.currentTarget.value })}
				class="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none"
				style={{ ...inputStyle, borderColor: error ? '#C77' : theme.borderStrong }}
			/>
			{error && <p class="sm:col-span-2 text-xs -mt-2" style={{ color: STATUS_INK.low }}>{error}</p>}

			<label class="text-sm flex flex-col gap-1">
				<span class="font-mono tracking-[0.02em] text-xs" style={labelStyle}>Quantity on hand</span>
				<input
					type="number" min="0" value={value.qty}
					onInput={(e) => set({ qty: e.currentTarget.value })}
					class="px-3 py-2 rounded border text-sm outline-none" style={inputStyle}
				/>
			</label>

			<label class="text-sm flex flex-col gap-1">
				<span class="font-mono tracking-[0.02em] text-xs" style={labelStyle}>Location</span>
				<ChipPicker
					kind="location" entities={categories} selected={value.category} multi={false}
					onSelect={(name) => set({ category: name || value.category })}
					onCreate={onCreateCategory} theme={theme} dark={dark}
				/>
			</label>

			<label class="text-sm flex flex-col gap-1 sm:col-span-2">
				<span class="font-mono tracking-[0.02em] text-xs" style={labelStyle}>Type</span>
				<ChipPicker
					kind="type" entities={types} selected={value.types} multi
					onToggle={toggleIn('types')} onCreate={onCreateType} theme={theme} dark={dark}
				/>
			</label>

			<label class="text-sm flex flex-col gap-1 sm:col-span-2">
				<span class="font-mono tracking-[0.02em] text-xs" style={labelStyle}>Store</span>
				<ChipPicker
					kind="store" entities={stores} selected={value.stores} multi
					onToggle={toggleIn('stores')} onCreate={onCreateStore} theme={theme} dark={dark}
				/>
			</label>

			<label class="text-sm flex flex-col gap-1">
				<span class="font-mono tracking-[0.02em] text-xs" style={labelStyle}>Low-stock threshold</span>
				<input
					type="number" min="0" value={value.threshold}
					onInput={(e) => set({ threshold: e.currentTarget.value })}
					class="px-3 py-2 rounded border text-sm outline-none" style={inputStyle}
				/>
			</label>
			<div />

			<textarea
				placeholder="Notes (optional)" rows={2} value={value.notes}
				onInput={(e) => set({ notes: e.currentTarget.value })}
				class="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none resize-none"
				style={inputStyle}
			/>
		</>
	);
}
