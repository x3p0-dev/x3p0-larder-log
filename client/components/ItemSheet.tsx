import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, Minus, Plus, Trash2, X } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { entityColorFor, proposeColor } from '../lib/theme';
import { TermPanel, TermRow } from './TermPanel';
import type { ItemDraft, Term } from '../../shared/types';
import type { TaxonomyActions } from '../lib/actions';
import {
	PAGE_BUTTON, PAGE_BUTTON_PRIMARY, PAGE_CHIP, PAGE_CHIP_ADD, PAGE_CHIP_ON, PAGE_ICON, PAGE_INPUT,
} from '../lib/controlStyles';

type Props = {
	open: boolean;
	/** `edit` prefills and swaps the header, the save label, and adds Remove. */
	mode: 'add' | 'edit';
	/** The item's name, for the edit header. Unused when adding. */
	title?: string;
	onRemove?: () => void;
	value: ItemDraft;
	onChange: (next: ItemDraft) => void;
	error: string;
	locations: Term[];
	types: Term[];
	stores: Term[];
	taxonomy: TaxonomyActions;
	canCreateTerms: boolean;
	defaultThreshold: string;
	saving: boolean;
	onSave: () => void;
	onClose: () => void;
	dark: boolean;
	theme: Theme;
};

/** The section label used throughout the sheet. */
function Label({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		<p class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textFaint }}>{children}</p>
	);
}

/**
 * One taxonomy row: chips in their own colours, plus a dashed add.
 *
 * Selected fills with the term's own colour and takes light ink; unselected is
 * neutral with a coloured dot. Single-select for location, multi for the rest,
 * matching what the item actually holds.
 */
function ChipRow({
	terms, selected, onToggle, onAdd, canAdd, label, dark, theme,
}: {
	terms: Term[];
	selected: string[];
	onToggle: (id: string) => void;
	onAdd: (name: string, ink: string) => void;
	canAdd: boolean;
	label: string;
	dark: boolean;
	theme: Theme;
}) {
	const [composing, setComposing] = useState(false);
	const [draft, setDraft] = useState('');
	const [color, setColor] = useState<string | null>(null);

	const proposed = color ?? proposeColor(terms.map((t) => t.ink));

	function open() {
		setDraft('');
		setColor(null);
		setComposing(true);
	}

	function commit() {
		const name = draft.trim();
		if (name) onAdd(name, proposed);
		setComposing(false);
	}

	return (
		<div class="flex flex-col gap-2.5">
			<div class="flex flex-wrap gap-[7px]">
				{terms.map((t) => {
					const on = selected.includes(t.id);
					/*
					 * **The dot is read against the chip, not against the sheet.**
					 * A selected chip is filled with `inkBg`, which is the page's
					 * inverse — near-black in light, cream in dark — so the dot on
					 * one takes the *other* theme's value: the bright variant on
					 * the dark fill, the saturated base on the cream one. Passing
					 * `dark` straight through drew a light base on near-black.
					 */
					const c = entityColorFor(t.id, terms, on ? ! dark : dark);

					return (
						<button
							key={t.id}
							type="button"
							onClick={() => onToggle(t.id)}
							aria-pressed={on}
							class={`flex items-center gap-[7px] h-9 px-3.5 rounded-full text-[13.5px] ${on ? PAGE_CHIP_ON : PAGE_CHIP}`}
							style={on ? { background: theme.inkBg, color: theme.inkText, fontWeight: 600, border: '1px solid transparent' } : undefined}
						>
							{/*
							  * The dot stays when the chip is on — the same rule the
							  * drawer's filter chips follow. It is the only thing
							  * carrying the term's own colour, and dropping it on
							  * selection stops the chip saying *which* term it is at
							  * the exact moment you have picked it.
							  */}
							<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c.dot }} />
							{t.name}
						</button>
					);
				})}

				{/* A third, deliberately weaker form: an affordance, not a term. */}
				{canAdd && ! composing && (
					<button
						type="button"
						onClick={open}
						class={`flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13.5px] ${PAGE_CHIP_ADD}`}
					>
						<Plus size={13} strokeWidth={2.4} /> {label}
					</button>
				)}
			</div>

			{/* The panel drops in below the group; the chip stays where it is. */}
			{canAdd && composing && (
				<TermPanel label={label} mode="new" onDone={commit} theme={theme}>
					<TermRow
						name={draft} ink={proposed} placeholder={`New ${label.toLowerCase()}…`} autoFocus
						onName={setDraft} onColor={setColor}
						onAction={() => setComposing(false)} action="abandon"
						theme={theme}
					/>
				</TermPanel>
			)}
		</div>
	);
}

/**
 * Adding *and editing* an item is a sheet, not a form wedged into the page.
 *
 * One component at both sizes: 480px in from the right on desktop, a
 * near-full-height bottom sheet with a grabber below `md`. The old inline form
 * pushed the whole pantry down the page every time you reached for it, which
 * made adding two things in a row feel like the list was running away.
 */
export function ItemSheet({
	open, mode, title, onRemove,
	value, onChange, error, locations, types, stores, taxonomy, canCreateTerms,
	defaultThreshold, saving, onSave, onClose, dark, theme,
}: Props) {
	const editing = mode === 'edit';
	const nameRef = useRef<HTMLInputElement>(null);

	/*
	 * Focus is an *opening* effect and nothing else. Folded in with the Escape
	 * listener it depended on `onClose`, which the parent rebuilds every render
	 * — so every keystroke, every chip, every stepper press re-ran it and threw
	 * the caret back into the name field mid-edit.
	 */
	useEffect(() => {
		if (open) nameRef.current?.focus();
	}, [open]);

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose();
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (! open) return null;

	const qty = Number(value.qty) || 0;

	function step(by: number) {
		onChange({ ...value, qty: String(Math.max(0, qty + by)) });
	}

	async function addTerm(kind: 'location' | 'type' | 'store', name: string, ink: string) {
		const id = await taxonomy.create(kind, { name, ink });
		if (! id) return;

		if (kind === 'location') onChange({ ...value, locationId: id });
		else if (kind === 'type') onChange({ ...value, typeIds: [...value.typeIds, id] });
		else onChange({ ...value, storeIds: [...value.storeIds, id] });
	}

	return (
		<>
			<button
				onClick={onClose}
				class="fixed inset-0 z-40"
				style={{ background: 'rgba(36, 30, 23, 0.34)' }}
				aria-label="Close"
			/>

			<aside
				role="dialog"
				aria-label={editing ? `Edit ${title ?? 'item'}` : 'Add an item'}
				class={
					'fixed z-50 flex flex-col ' +
					/* `dvh` for the same reason the drawer takes it: `vh` is the URL-bar-hidden viewport, so the sheet's foot — Save — sat under the browser chrome. */
					'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl ' +
					'md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:max-h-none md:rounded-none'
				}
				style={{
					background: dark
						? 'radial-gradient(120% 60% at 100% 0%, #2E271C 0%, #241E16 100%)'
						: 'radial-gradient(120% 60% at 100% 0%, #FBF6EC 0%, #F5EDDF 100%)',
					borderLeft: `1px solid ${theme.borderStrong}`,
					boxShadow: '-20px 0 50px rgba(36, 30, 23, 0.22)',
				}}
			>
				{/* Mobile grabber. On desktop the sheet has an edge and does not need one. */}
				<span class="md:hidden mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full shrink-0" style={{ background: theme.borderStrong }} />

				<div class="flex items-start justify-between gap-4 px-[26px] pt-5 md:pt-[26px]">
					{/*
					  * Editing puts the item's name here, at the one size nothing else
					  * uses — so there is no doubt which row you opened.
					  */}
					<div class="flex flex-col gap-0.5 min-w-0">
						<Label theme={theme}>{editing ? 'Edit' : 'New'}</Label>
						<span class="font-disp text-[27px] font-bold leading-[1.1] truncate" style={{ color: theme.textStrong }}>
							{editing ? (title || 'Item') : 'Add an item'}
						</span>
					</div>
					<button
						onClick={onClose}
						class={`flex items-center justify-center w-10 h-10 -mt-0.5 -mr-1 ${PAGE_ICON}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 px-[26px] pt-[22px] pb-6">
					<div class="flex flex-col gap-2.5">
						<Label theme={theme}>Item</Label>
						<input
							ref={nameRef}
							value={value.name}
							onInput={(e) => onChange({ ...value, name: e.currentTarget.value })}
							placeholder="Sourdough starter"
							class={`h-[54px] px-4 rounded-[14px] font-disp text-xl font-semibold border-line-strong ${PAGE_INPUT}`}
							style={error ? { borderColor: theme.dangerText } : undefined}
							aria-label="Item name"
						/>
						{error && <p class="text-[13px]" style={{ color: theme.dangerText }}>{error}</p>}
					</div>

					<div class="grid grid-cols-2 gap-3.5">
						<div class="flex flex-col gap-2.5">
							<Label theme={theme}>On hand</Label>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onClick={() => step(-1)}
									class={`flex items-center justify-center w-11 h-12 rounded-[13px] shrink-0 ${PAGE_BUTTON}`}
									style={qty <= 0 ? { color: theme.textFaint } : undefined}
									aria-label="Decrease"
								>
									<Minus size={17} strokeWidth={2.4} />
								</button>
								<input
									value={value.qty}
									onInput={(e) => onChange({ ...value, qty: e.currentTarget.value })}
									inputMode="decimal"
									class={`flex-1 min-w-0 h-12 rounded-[13px] text-center font-disp text-[22px] font-bold ${PAGE_INPUT}`}
									aria-label="Quantity on hand"
								/>
								<button
									type="button"
									onClick={() => step(1)}
									class={`flex items-center justify-center w-11 h-12 rounded-[13px] shrink-0 ${PAGE_BUTTON_PRIMARY}`}
									style={{ background: theme.inkBg, color: theme.inkText }}
									aria-label="Increase"
								>
									<Plus size={17} strokeWidth={2.4} />
								</button>
							</div>
						</div>

						<div class="flex flex-col gap-2.5">
							<Label theme={theme}>Low at</Label>
							<div class={`flex items-center justify-between h-12 px-4 rounded-[13px] ${PAGE_INPUT} focus-within:border-ink-muted`}>
								<input
									value={value.threshold}
									onInput={(e) => onChange({ ...value, threshold: e.currentTarget.value })}
									inputMode="decimal"
									class="min-w-0 flex-1 bg-transparent font-disp text-[22px] font-bold outline-none"
									style={{ color: theme.textStrong }}
									aria-label="Low-stock threshold"
								/>
								<span class="text-xs shrink-0 pl-2" style={{ color: theme.textFaint }}>default {defaultThreshold}</span>
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-2.5">
						<Label theme={theme}>Location</Label>
						<ChipRow
							terms={locations}
							selected={value.locationId ? [value.locationId] : []}
							onToggle={(id) => onChange({ ...value, locationId: id })}
							onAdd={(n, ink) => void addTerm('location', n, ink)}
							canAdd={canCreateTerms} label="Location" dark={dark} theme={theme}
						/>
					</div>

					<div class="flex flex-col gap-2.5">
						<Label theme={theme}>Type</Label>
						<ChipRow
							terms={types}
							selected={value.typeIds}
							onToggle={(id) => onChange({
								...value,
								typeIds: value.typeIds.includes(id)
									? value.typeIds.filter((t) => t !== id)
									: [...value.typeIds, id],
							})}
							onAdd={(n, ink) => void addTerm('type', n, ink)}
							canAdd={canCreateTerms} label="Type" dark={dark} theme={theme}
						/>
					</div>

					<div class="flex flex-col gap-2.5">
						<Label theme={theme}>Store</Label>
						<ChipRow
							terms={stores}
							selected={value.storeIds}
							onToggle={(id) => onChange({
								...value,
								storeIds: value.storeIds.includes(id)
									? value.storeIds.filter((s) => s !== id)
									: [...value.storeIds, id],
							})}
							onAdd={(n, ink) => void addTerm('store', n, ink)}
							canAdd={canCreateTerms} label="Store" dark={dark} theme={theme}
						/>
					</div>

					<div class="flex flex-col gap-2.5">
						<Label theme={theme}>
							Notes <span class="font-normal normal-case tracking-normal" style={{ color: theme.textFaint }}>optional</span>
						</Label>
						<textarea
							value={value.notes}
							onInput={(e) => onChange({ ...value, notes: e.currentTarget.value })}
							placeholder="Fed on Sundays. Discard goes in the pancakes."
							class={`h-[84px] px-4 py-[13px] rounded-[14px] text-[14.5px] resize-none ${PAGE_INPUT}`}
							aria-label="Notes"
						/>
					</div>
				</div>

				{/* Sticky: the sheet scrolls, the decision does not. */}
				<div
					class="mt-auto shrink-0 flex items-center justify-between gap-3 pl-4 pr-5 py-3.5"
					style={{ borderTop: `1px solid ${theme.border}`, background: theme.surfaceAlt }}
				>
					{/*
					  * Remove sits the width of the footer away from Save, reachable
					  * without scrolling. Ghost with crimson text — crimson is
					  * brand-and-out, never a fill on a control. Removal is undoable
					  * rather than confirmed: the sheet closes, a toast holds it.
					  */}
					{editing && onRemove ? (
						<button
							onClick={onRemove}
							class={`flex items-center gap-2 h-11 px-3.5 rounded-xl text-sm ${PAGE_ICON}`}
							style={{ color: theme.dangerText }}
						>
							<Trash2 size={16} /> Remove item
						</button>
					) : <span />}

					<div class="flex items-center gap-2.5">
						<button onClick={onClose} class={`h-[46px] px-[18px] rounded-[14px] text-[15px] ${PAGE_ICON}`}>Cancel</button>
						<button
							onClick={onSave}
							disabled={saving}
							class={`flex items-center gap-2.5 h-[46px] px-5 rounded-[14px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
							style={{ background: theme.inkBg, color: theme.inkText }}
						>
							<Check size={17} strokeWidth={2.4} /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Save item'}
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}
