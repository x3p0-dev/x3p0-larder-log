import { Plus, Minus, ChevronDown, Pencil, Check, Store as StoreIcon } from 'lucide-preact';

import { ItemFields } from './ItemFields';
import type { Theme } from '../lib/theme';
import { entityColorFor, statusFor, termNameFor } from '../lib/theme';
import { locationIconFor, typeIconFor } from '../lib/icons';
import type { Item, ItemDraft, Term } from '../../shared/types';
import type { TaxonomyActions } from '../lib/actions';

type Props = {
	item: Item;
	open: boolean;
	locations: Term[];
	types: Term[];
	stores: Term[];
	dark: boolean;
	theme: Theme;
	editForm: ItemDraft | null;
	onEditFormChange: (next: ItemDraft) => void;
	taxonomy: TaxonomyActions;
	/** `item:write`. False strips the steppers, edit, and remove — see D30. */
	canEdit: boolean;
	/** `taxonomy:write`, for the "+" chip inside the edit form. */
	canCreateTerms: boolean;
	onToggleOpen: () => void;
	onAdjustQty: (delta: number) => void;
	onRemove: () => void;
	onStartEdit: () => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
};

export function ItemCard({
	item, open, locations, types, stores, dark, theme,
	editForm, onEditFormChange, taxonomy, canEdit, canCreateTerms,
	onToggleOpen, onAdjustQty, onRemove, onStartEdit, onSaveEdit, onCancelEdit,
}: Props) {
	const c = entityColorFor(item.locationId, locations, dark);
	const s = statusFor(item.qty, item.threshold, dark);
	const location = locations.find((l) => l.id === item.locationId);
	const locationName = termNameFor(item.locationId, locations);
	const LocationIcon = locationIconFor(location?.icon);
	const isEditing = canEdit && Boolean(editForm);

	return (
		<div
			class="rounded-xl overflow-hidden transition-shadow"
			style={{
				background: theme.surface,
				border: `1px solid ${open ? c.ink : c.ring}`,
				boxShadow: open ? `0 2px 10px -4px ${c.ring}` : 'none',
			}}
		>
			<button onClick={onToggleOpen} class="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3" aria-expanded={open}>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<p class="font-disp text-base sm:text-lg font-semibold leading-snug break-words flex-1 min-w-0" style={{ color: theme.textStrong }}>
							{item.name}
						</p>
						<span class="font-mono tracking-[0.02em] text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.ink }}>
							{s.label}
						</span>
						<ChevronDown
							size={16}
							class="shrink-0 transition-transform"
							style={{ color: theme.textFaint, transform: open ? 'rotate(180deg)' : 'none' }}
						/>
					</div>

					<div class="flex items-center gap-1.5 flex-wrap mt-1.5">
						<span title={locationName} class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg, color: c.ink }}>
							<LocationIcon size={13} />
						</span>

						{item.typeIds.map((id) => {
							const tc = entityColorFor(id, types, dark);
							const TypeIcon = typeIconFor(types.find((t) => t.id === id)?.icon);
							return (
								<span key={id} title={termNameFor(id, types)} class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: tc.bg, color: tc.ink }}>
									<TypeIcon size={13} />
								</span>
							);
						})}

						{item.storeIds.map((id) => {
							const sc = entityColorFor(id, stores, dark);
							return (
								<span
									key={id}
									class="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 border"
									style={{ borderColor: sc.ring, color: sc.ink, background: 'transparent' }}
								>
									<StoreIcon size={9} />{termNameFor(id, stores)}
								</span>
							);
						})}
					</div>
				</div>
			</button>

			{/*
			  * The quantity is information, so it stays for everyone; only the
			  * two controls go. A viewer sees "4 · low at 2" rather than a pair
			  * of dead buttons on every card in the pantry (D30).
			  */}
			<div class="flex items-center gap-2 px-4 pb-3.5">
				{canEdit && (
					<button
						onClick={() => onAdjustQty(-1)}
						class="w-8 h-8 rounded-md flex items-center justify-center"
						style={{ background: theme.neutralChipBg, color: theme.text }}
						aria-label={`Decrease ${item.name}`}
					>
						<Minus size={14} />
					</button>
				)}
				<span class="font-mono tracking-[0.02em] text-base w-7 text-center font-semibold">{item.qty}</span>
				{canEdit && (
					<button
						onClick={() => onAdjustQty(1)}
						class="w-8 h-8 rounded-md flex items-center justify-center"
						style={{ background: theme.neutralChipBg, color: theme.text }}
						aria-label={`Increase ${item.name}`}
					>
						<Plus size={14} />
					</button>
				)}
				<span class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textFaint }}>low at {item.threshold}</span>
			</div>

			{open && ! isEditing && (
				<div class="px-4 py-3 text-sm" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ring}`, color: theme.text }}>
					<p class="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: theme.textFaint }}>Notes</p>
					<div class="flex items-start justify-between gap-3">
						<p class="flex-1 min-w-0">{item.notes || <span style={{ color: theme.textFaint }}>No notes yet.</span>}</p>
						{canEdit && (
							<div class="flex flex-col items-end gap-2.5 shrink-0">
								<button onClick={onStartEdit} class="flex items-center gap-1 text-xs px-2 py-1 rounded-md" style={{ color: c.ink, background: c.bg }}>
									<Pencil size={12} /> Edit
								</button>
								<button
									onClick={onRemove}
									class="text-xs px-0.5"
									style={{ color: theme.dangerText, textDecoration: 'underline', textDecorationThickness: '2px', textUnderlineOffset: '3px' }}
								>
									Remove
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{open && isEditing && editForm && (
				<div class="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surfaceAlt, borderTop: `1px solid ${c.ink}` }}>
					<ItemFields
						value={editForm} onChange={onEditFormChange}
						locations={locations} types={types} stores={stores}
						taxonomy={taxonomy} canCreateTerms={canCreateTerms}
						dark={dark} theme={theme}
					/>
					<div class="sm:col-span-2 flex gap-2 justify-end">
						<button onClick={onCancelEdit} class="px-3 py-2 rounded text-sm" style={{ color: theme.textMuted }}>Cancel</button>
						<button
							onClick={onSaveEdit}
							class="px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5"
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
