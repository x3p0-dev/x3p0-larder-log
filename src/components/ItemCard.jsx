import { Plus, Minus, ChevronDown, Pencil, Check, Store as StoreIcon } from 'lucide-react';
import { ItemFields } from './ItemFields.jsx';
import { entityColorFor, statusFor } from '../lib/theme.js';
import { locationIconFor, typeIconFor } from '../lib/icons.js';

export function ItemCard({
	item, categories, types, stores, dark, theme,
	editForm, onEditFormChange, taxonomyActions,
	onToggleOpen, onAdjustQty, onRemove, onStartEdit, onSaveEdit, onCancelEdit,
}) {
	const c = entityColorFor(item.category, categories, dark);
	const s = statusFor(item.qty, item.threshold, dark);
	const category = categories.find((cat) => cat.name === item.category);
	const LocationIcon = locationIconFor(category?.icon);
	const isEditing = Boolean(editForm);

	return (
		<div
			className="rounded-xl overflow-hidden transition-shadow"
			style={{
				background: theme.surface,
				border: `1px solid ${item.open ? c.ink : c.ring}`,
				boxShadow: item.open ? `0 2px 10px -4px ${c.ring}` : 'none',
			}}
		>
			<button onClick={onToggleOpen} className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3" aria-expanded={item.open}>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="disp text-base sm:text-lg font-semibold leading-snug break-words flex-1 min-w-0" style={{ color: theme.textStrong }}>
							{item.name}
						</p>
						<span className="mono text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.ink }}>
							{s.label}
						</span>
						<ChevronDown
							size={16}
							className="shrink-0 transition-transform"
							style={{ color: theme.textFaint, transform: item.open ? 'rotate(180deg)' : 'none' }}
						/>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap mt-1.5">
						<span title={item.category} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.ink }}>
							<LocationIcon size={13} />
						</span>

						{item.types.map((name) => {
							const tc = entityColorFor(name, types, dark);
							const TypeIcon = typeIconFor(types.find((t) => t.name === name)?.icon);
							return (
								<span key={name} title={name} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: tc.bg, color: tc.ink }}>
									<TypeIcon size={13} />
								</span>
							);
						})}

						{item.stores.map((name) => {
							const sc = entityColorFor(name, stores, dark);
							return (
								<span
									key={name}
									className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 border"
									style={{ borderColor: sc.ring, color: sc.ink, background: 'transparent' }}
								>
									<StoreIcon size={9} />{name}
								</span>
							);
						})}
					</div>
				</div>
			</button>

			<div className="flex items-center gap-2 px-4 pb-3.5">
				<button
					onClick={() => onAdjustQty(-1)}
					className="w-8 h-8 rounded-md flex items-center justify-center"
					style={{ background: theme.neutralChipBg, color: theme.text }}
					aria-label={`Decrease ${item.name}`}
				>
					<Minus size={14} />
				</button>
				<span className="mono text-base w-7 text-center font-semibold">{item.qty}</span>
				<button
					onClick={() => onAdjustQty(1)}
					className="w-8 h-8 rounded-md flex items-center justify-center"
					style={{ background: theme.neutralChipBg, color: theme.text }}
					aria-label={`Increase ${item.name}`}
				>
					<Plus size={14} />
				</button>
				<span className="mono text-xs" style={{ color: theme.textFaint }}>low at {item.threshold}</span>
			</div>

			{item.open && ! isEditing && (
				<div className="px-4 py-3 text-sm" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ring}`, color: theme.text }}>
					<p className="mono text-xs uppercase tracking-widest mb-1" style={{ color: theme.textFaint }}>Notes</p>
					<div className="flex items-start justify-between gap-3">
						<p className="flex-1 min-w-0">{item.notes || <span style={{ color: theme.textFaint }}>No notes yet.</span>}</p>
						<div className="flex flex-col items-end gap-2.5 shrink-0">
							<button onClick={onStartEdit} className="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ color: c.ink, background: c.bg }}>
								<Pencil size={12} /> Edit
							</button>
							<button
								onClick={onRemove}
								className="text-xs px-0.5"
								style={{ color: theme.dangerText, textDecoration: 'underline', textDecorationThickness: '2px', textUnderlineOffset: '3px' }}
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			{item.open && isEditing && (
				<div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ink}` }}>
					<ItemFields
						value={editForm} onChange={onEditFormChange}
						categories={categories} types={types} stores={stores}
						onCreateCategory={taxonomyActions.createCategory}
						onCreateType={taxonomyActions.createType}
						onCreateStore={taxonomyActions.createStore}
						dark={dark} theme={theme}
					/>
					<div className="sm:col-span-2 flex gap-2 justify-end">
						<button onClick={onCancelEdit} className="px-3 py-2 rounded text-sm" style={{ color: theme.textMuted }}>Cancel</button>
						<button
							onClick={onSaveEdit}
							className="px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5"
							style={{ background: theme.inkBg, color: theme.inkText }}
						>
							<Check size={14} /> Save changes
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
