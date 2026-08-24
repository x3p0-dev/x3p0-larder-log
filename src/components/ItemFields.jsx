import { ChipPicker } from './ChipPicker.jsx';
import { STATUS_INK } from '../lib/theme.js';

/**
 * The shared field set behind both "Add item" and the inline edit panel. The
 * caller owns the surrounding container and the action buttons, since those are
 * the only things that actually differ between the two.
 */
export function ItemFields({
	value, onChange, categories, types, stores,
	onCreateCategory, onCreateType, onCreateStore,
	error, dark, theme,
}) {
	const inputStyle = { borderColor: theme.borderStrong, background: theme.surface, color: theme.text };
	const labelStyle = { color: theme.textMuted };

	const set = (patch) => onChange({ ...value, ...patch });
	const toggleIn = (field) => (name) => set({
		[field]: value[field].includes(name) ? value[field].filter((x) => x !== name) : [...value[field], name],
	});

	return (
		<>
			<input
				placeholder="Item name"
				value={value.name}
				onChange={(e) => set({ name: e.target.value })}
				className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none"
				style={{ ...inputStyle, borderColor: error ? '#C77' : theme.borderStrong }}
			/>
			{error && <p className="sm:col-span-2 text-xs -mt-2" style={{ color: STATUS_INK.low }}>{error}</p>}

			<label className="text-sm flex flex-col gap-1">
				<span className="mono text-xs" style={labelStyle}>Quantity on hand</span>
				<input
					type="number" min="0" value={value.qty}
					onChange={(e) => set({ qty: e.target.value })}
					className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle}
				/>
			</label>

			<label className="text-sm flex flex-col gap-1">
				<span className="mono text-xs" style={labelStyle}>Location</span>
				<ChipPicker
					kind="location" entities={categories} selected={value.category} multi={false}
					onSelect={(name) => set({ category: name || value.category })}
					onCreate={onCreateCategory} theme={theme} dark={dark}
				/>
			</label>

			<label className="text-sm flex flex-col gap-1 sm:col-span-2">
				<span className="mono text-xs" style={labelStyle}>Type</span>
				<ChipPicker
					kind="type" entities={types} selected={value.types} multi
					onToggle={toggleIn('types')} onCreate={onCreateType} theme={theme} dark={dark}
				/>
			</label>

			<label className="text-sm flex flex-col gap-1 sm:col-span-2">
				<span className="mono text-xs" style={labelStyle}>Store</span>
				<ChipPicker
					kind="store" entities={stores} selected={value.stores} multi
					onToggle={toggleIn('stores')} onCreate={onCreateStore} theme={theme} dark={dark}
				/>
			</label>

			<label className="text-sm flex flex-col gap-1">
				<span className="mono text-xs" style={labelStyle}>Low-stock threshold</span>
				<input
					type="number" min="0" value={value.threshold}
					onChange={(e) => set({ threshold: e.target.value })}
					className="px-3 py-2 rounded border text-sm outline-none" style={inputStyle}
				/>
			</label>
			<div />

			<textarea
				placeholder="Notes (optional)" rows={2} value={value.notes}
				onChange={(e) => set({ notes: e.target.value })}
				className="sm:col-span-2 px-3 py-2 rounded border text-sm outline-none resize-none"
				style={inputStyle}
			/>
		</>
	);
}
