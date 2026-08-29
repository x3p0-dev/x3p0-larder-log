import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, Minus, Plus, Trash2, X } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { entityColorFor, proposeColor, statusFor } from '../lib/theme';
import { CheckBox } from './CheckBox';
import { TermPanel, TermRow } from './TermPanel';
import { MonthMenu } from './MonthMenu';
import { panelSkin } from './TermPanel';
import { UnitMenu } from './UnitMenu';
import { digitField } from '../lib/numericField';
import { useHoldRepeat } from '../hooks/useHoldRepeat';
import type { SourceKind } from '../../shared/source';
import { itemSourceKinds, sourceGroupWord } from '../../shared/source';
import type { ItemDraft, Source, Term } from '../../shared/types';
import type { TaxonomyActions } from '../lib/actions';
import { toInt } from '../../shared/qty';
import { formatSize, MAX_SIZE_DIGITS } from '../../shared/size';
import { STATUS_PHRASE } from '../../shared/status';
import {
	PAGE_BUTTON_PRIMARY, PAGE_CHECKBOX_ROW, PAGE_CHIP, PAGE_CHIP_ADD, PAGE_CHIP_ON,
	PAGE_FIELD, PAGE_FIELD_HALO_WITHIN, PAGE_FIELD_HALO_WITHIN_DARK, PAGE_ICON,
	PAGE_STEPPER_CELL, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';

/** Four digits, for the reason `MAX_SIZE_DIGITS` gives: an 85px cell at 390. */
const MAX_COUNT_DIGITS = 4;

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
	stores: Source[];
	taxonomy: TaxonomyActions;
	canCreateTerms: boolean;
	/** The household's low-stock default, for the *Low at* note. See below. */
	defaultThreshold: string;
	saving: boolean;
	onSave: () => void;
	onClose: () => void;
	dark: boolean;
	theme: Theme;
};

/** The micro-label over each section. */
function Label({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		<p class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textMuted }}>{children}</p>
	);
}

/**
 * The full-width hairline between sections.
 *
 * **The grouping is done with labels and rules, never with a fill.** The
 * Settings pane groups with a raised fill on the drawer and the obvious move was
 * to borrow it — but on this sheet a recessed panel already *means* "you are
 * editing something": it is the inline composer, which drops in below a `+ …`
 * chip. A second recessed thing that only grouped would make the composer stop
 * meaning anything.
 */
function Rule({ theme }: { theme: Theme }) {
	return <span class="block h-px mt-[18px] mb-[18px] md:mt-[22px] md:mb-5" style={{ background: theme.divider }} />;
}

/** A hint under its own control — the size row's one line, and only that. */
function Hint({ children, theme }: { children: preact.ComponentChildren; theme: Theme }) {
	return (
		/* Meta, never faint: faint measures 3.18:1 light and 3.07:1 dark here. */
		<p class="text-[12.5px] leading-[1.45] pt-1.5" style={{ color: theme.textMuted }}>{children}</p>
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
	terms, selected, onToggle, onAdd, canAdd, kindable, label, dark, theme,
}: {
	terms: Term[];
	selected: string[];
	onToggle: (id: string) => void;
	onAdd: (name: string, ink: string, kind?: SourceKind) => void;
	canAdd: boolean;
	/**
	 * Whether a term made here carries a kind — the source group, and nothing
	 * else. It is the same flag `onSetKind` is in the drawer, and it decides
	 * one thing: whether the composed row gets the glyph.
	 */
	kindable?: boolean;
	label: string;
	dark: boolean;
	theme: Theme;
}) {
	const [composing, setComposing] = useState(false);
	const [draft, setDraft] = useState('');
	const [color, setColor] = useState<string | null>(null);
	/*
	 * A shop by default, which is both the common case and what the column's
	 * own fallback resolves an empty string to — but composable, because you
	 * know whether you are adding Publix or the garden while you are typing it.
	 */
	const [kind, setKind] = useState<SourceKind>('shop');

	const proposed = color ?? proposeColor(terms.map((t) => t.ink));

	function open() {
		setDraft('');
		setColor(null);
		setKind('shop');
		setComposing(true);
	}

	function commit() {
		const name = draft.trim();
		if (name) onAdd(name, proposed, kindable ? kind : undefined);
		setComposing(false);
	}

	return (
		<div class="flex flex-col gap-2.5">
			<div class="flex flex-wrap gap-2">
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
							class={`flex items-center gap-[7px] h-11 md:h-8 px-3.5 rounded-full text-[13.5px] font-medium ${on ? PAGE_CHIP_ON : PAGE_CHIP}`}
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
						class={`flex items-center gap-1.5 h-11 md:h-8 px-3.5 rounded-full text-[13.5px] font-medium ${PAGE_CHIP_ADD}`}
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
						kind={kindable ? kind : undefined}
						onKind={kindable ? setKind : undefined}
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
 * One of the two matched steppers.
 *
 * **`Low at` is a peer of `On hand`, not a footnote hanging off it.** It used to
 * sit inside the on-hand control as a `default 2` caption, which is most of why
 * changing a threshold was the hardest thing on the sheet.
 *
 * Both are symmetric and neutral — `−` and `+` as equal cells inside the field,
 * hairlines between the three. **The numeral is a text field**: stepping a
 * low-at from 2 to 15 is thirteen taps and typing is one gesture. Press-and-hold
 * repeats for anyone who does not find that.
 */
function Stepper({ label, value, onValue, note, dark, theme }: {
	label: string;
	value: string;
	onValue: (next: string) => void;
	/**
	 * A qualifier on the sub-label rather than a line under the field.
	 *
	 * *Household default* is about the number the field arrived holding, so it
	 * belongs beside the field's name — and a line of its own under one of two
	 * side-by-side steppers made them unequal heights for a sentence that is
	 * true of neither of them for long.
	 */
	note?: string;
	dark: boolean;
	theme: Theme;
}) {
	const n = toInt(value);

	function step(by: number) {
		onValue(String(Math.max(0, toInt(value) + by)));
	}

	const down = useHoldRepeat(() => step(-1));
	const up = useHoldRepeat(() => step(1));

	const cell = 'flex items-center justify-center w-11 shrink-0 ' + PAGE_STEPPER_CELL;

	/*
	 * Two complete literals rather than a `dark:` variant. Tailwind's `dark:`
	 * follows `prefers-color-scheme`, and this app's theme stops being the OS's
	 * the moment a device overrides it (D25) — so the variant would paint the
	 * selection the wrong colour for exactly the people who chose one.
	 */
	const selection = dark
		? 'selection:bg-[rgba(212,99,107,0.22)]'
		: 'selection:bg-[rgba(190,51,70,0.18)]';

	return (
		<div class="flex-1 min-w-0 flex flex-col gap-1.5">
			<span class="flex items-baseline gap-1.5 text-[13px] min-w-0" style={{ color: theme.textMuted }}>
				<span class="shrink-0">{label}</span>
				{/* Truncates rather than wraps: at 390 the pair is 156px inside 173. */}
				{note && <span class="truncate">· {note}</span>}
			</span>

			<div
				role="group"
				aria-label={label}
				class={`flex items-stretch h-14 rounded-[13px] overflow-hidden ${PAGE_FIELD} ${dark ? PAGE_FIELD_HALO_WITHIN_DARK : PAGE_FIELD_HALO_WITHIN}`}
			>
				{/*
				  * At zero the minus stays faint and live, never disabled — the item
				  * card's rule, and D36's reason: a disabled control cannot explain
				  * itself. It just stops promising a change it will not make.
				  */}
				<button
					type="button"
					onClick={() => step(-1)}
					{...down}
					class={`${cell} ${n <= 0 ? 'text-ink-faint' : 'text-ink-body hover:text-ink'}`}
					style={{ borderRight: `1px solid ${theme.divider}` }}
					aria-label="Remove one"
				>
					<Minus size={16} strokeWidth={2.2} />
				</button>

				<input
					value={value}
					{...digitField(onValue, MAX_COUNT_DIGITS)}
					role="spinbutton"
					aria-valuenow={n}
					aria-valuemin={0}
					aria-label={label}
					class={`flex-1 min-w-0 bg-transparent text-center font-disp text-[26px] md:text-[28px] font-bold outline-none ${selection}`}
					style={{ color: theme.textStrong }}
				/>

				<button
					type="button"
					onClick={() => step(1)}
					{...up}
					class={`${cell} text-ink-body hover:text-ink`}
					style={{ borderLeft: `1px solid ${theme.divider}` }}
					aria-label="Add one"
				>
					<Plus size={16} strokeWidth={2.2} />
				</button>
			</div>

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
 *
 * **It reads as four sections rather than one stack** — Item, Count, the three
 * taxonomies, Notes — each a micro-label over its content, separated by a
 * full-width hairline. The old flat run gave every field the same weight, and
 * adding a fifth would only have made that worse. Location, Store (or Source —
 * see D58) and Type are
 * three labelled groups under *one* rule and not three sections: they are one
 * question — where and what — asked three times.
 */
export function ItemSheet({
	open, mode, title, onRemove,
	value, onChange, error, locations, types, stores, taxonomy, canCreateTerms,
	defaultThreshold, saving, onSave, onClose, dark, theme,
}: Props) {
	const editing = mode === 'edit';
	/*
	 * `Store` or `Source` — the group's label here follows the drawer's heading
	 * exactly (D58). Four places move together or the app contradicts itself in
	 * the space of one screen, and two of them are on this sheet: the label, and
	 * the dashed chip `ChipRow` builds from it.
	 */
	const sourceWord = sourceGroupWord(stores);

	/*
	 * What the item's chosen sources make it, which is what decides whether the
	 * two sections below the chips exist at all. **They appear because of the
	 * source, not beside it** (D58): pick a grow source and the season panel is
	 * there, pick a shop and it never existed.
	 */
	const kinds = itemSourceKinds(value.storeIds, stores);
	const grown = kinds.includes('grow');
	const made = kinds.includes('make');

	/*
	 * The season panel's fill and edge come from `panelSkin`, not from the two
	 * hexes the boards name. It **is** the inline composer on this sheet — the
	 * same surface a `+ Source` drops in on, a few pixels from it — so borrowing
	 * two literals would mean a panel that stopped matching its neighbour the
	 * first time either was re-themed.
	 */
	const season = panelSkin(theme, false);
	const nameRef = useRef<HTMLInputElement>(null);
	const sheetRef = useRef<HTMLElement>(null);

	const [unitOpen, setUnitOpen] = useState(false);
	const [fromOpen, setFromOpen] = useState(false);
	const [toOpen, setToOpen] = useState(false);

	/*
	 * The unit menu owns Escape while it is open. Read through a ref rather than
	 * a dependency so the listener is not torn down and rebuilt every time the
	 * menu opens — and because the sheet's own handler already has one
	 * re-registration too many.
	 */
	const unitOpenRef = useRef(false);
	unitOpenRef.current = unitOpen;

	/*
	 * Focus is an *opening* effect and nothing else. Folded in with the Escape
	 * listener it depended on `onClose`, which the parent rebuilds every render
	 * — so every keystroke, every chip, every stepper press re-ran it and threw
	 * the caret back into the name field mid-edit.
	 *
	 * **Only adding lands in the name field.** An add sheet has exactly one
	 * next step and the field is empty, so the caret is doing what you already
	 * came to do. Editing is the opposite: the sheet opens on a whole item and
	 * nothing here knows which part of it you came to change — a caret in the
	 * name says *rename this*, and on a phone it also throws the keyboard up
	 * over the fields you were probably reaching for.
	 *
	 * Focus still has to *enter* the dialog, or Tab would walk the pantry
	 * behind it, so editing focuses the sheet itself. It is `tabIndex={-1}`:
	 * programmatically focusable, never a tab stop of its own.
	 */
	useEffect(() => {
		if (! open) return;

		setUnitOpen(false);

		if (editing) sheetRef.current?.focus();
		else nameRef.current?.focus();
	}, [open, editing]);

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			// The menu closes to its own trigger first. Two document-level
			// listeners on the same node both run whatever either one stops, so
			// this is a guard rather than a `stopPropagation` on the other side.
			if (e.key === 'Escape' && ! unitOpenRef.current) onClose();
		}
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (! open) return null;

	const status = statusFor(value.qty, value.threshold, dark);
	const sizePreview = formatSize(value.size, value.unit);

	async function addTerm(
		kind: 'location' | 'type' | 'store',
		name: string,
		ink: string,
		sourceKind?: SourceKind
	) {
		const id = await taxonomy.create(kind, { name, ink, kind: sourceKind });
		if (! id) return;

		if (kind === 'location') onChange({ ...value, locationId: id });
		else if (kind === 'type') onChange({ ...value, typeIds: [...value.typeIds, id] });
		else onChange({ ...value, storeIds: [...value.storeIds, id] });
	}

	/**
	 * The size is a pair, and this is where it is kept whole.
	 *
	 * *No size* clears both halves — which is why the row carries no separate
	 * `×`, one control already does it — and picking a unit against an empty
	 * number fills the number with 1, so *1 pint* is a single tap and that is the
	 * commonest size there is. `shared/size.ts` enforces the same two rules on
	 * the way into the database, for a client that never came through here.
	 */
	function setUnit(key: string) {
		if (! key) onChange({ ...value, size: '', unit: '' });
		else onChange({ ...value, size: value.size || '1', unit: key });
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
				ref={sheetRef}
				tabIndex={-1}
				role="dialog"
				aria-label={editing ? `Edit ${title ?? 'item'}` : 'Add an item'}
				class={
					/* `outline-none` because the sheet is only focusable to catch the keyboard on an edit — a ring around a 480px panel says nothing the panel itself does not. */
					'fixed z-50 flex flex-col outline-none ' +
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
				<span class="md:hidden mx-auto mt-2 mb-1 w-9 h-1 rounded-full shrink-0" style={{ background: theme.border }} />

				<div
					class="flex items-center justify-between gap-3 shrink-0 h-[58px] md:h-[68px] px-4 md:px-5"
					style={{ borderBottom: `1px solid ${theme.divider}` }}
				>
					{/*
					  * Editing puts the item's name here, and the size beside it —
					  * so there is no doubt which row you opened, and the size you
					  * are setting is visible while you are two sections below it.
					  * The name is the *stored* one; only the size previews live.
					  */}
					<div class="flex items-baseline gap-2.5 min-w-0">
						<span class="font-disp text-[21px] font-semibold tracking-[-0.01em] truncate" style={{ color: theme.textStrong }}>
							{editing ? (title || 'Item') : 'Add an item'}
						</span>
						{sizePreview && (
							<span class="text-[13px] whitespace-nowrap shrink-0" style={{ color: theme.textMuted }}>{sizePreview}</span>
						)}
					</div>
					<button
						onClick={onClose}
						class={`flex items-center justify-center w-11 h-11 -mr-2.5 shrink-0 ${PAGE_ICON}`}
						aria-label="Close"
					>
						<X size={19} />
					</button>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto p-4 md:p-5">
					{/* ---------- Item ---------- */}
					<Label theme={theme}>Item</Label>

					<input
						ref={nameRef}
						value={value.name}
						onInput={(e) => onChange({ ...value, name: e.currentTarget.value })}
						placeholder="Sourdough starter"
						class={`w-full h-12 px-3.5 mt-2.5 rounded-[11px] text-[15.5px] ${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
						style={error ? { borderColor: theme.dangerText } : undefined}
						aria-label="Item name"
					/>
					{error && <p class="text-[13px] pt-1.5" style={{ color: theme.dangerText }}>{error}</p>}

					{/*
					  * The size of **one** of the thing, which is what makes it
					  * different from the count: you have three of them and each one
					  * is a quart.
					  */}
					<div class="flex gap-2 pt-2">
						<input
							value={value.size}
							{...digitField((size) => onChange({ ...value, size }), MAX_SIZE_DIGITS)}
							onBlur={() => {
								// Emptying the number while a unit is set returns it to
								// 1 rather than leaving half a size behind.
								if (value.unit && ! value.size) onChange({ ...value, size: '1' });
							}}
							placeholder="1"
							class={`w-[76px] h-[46px] md:h-11 px-3.5 rounded-[11px] text-[15.5px] shrink-0 ${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
							aria-label="Size"
						/>
						<UnitMenu value={value.unit} onChange={setUnit} open={unitOpen} setOpen={setUnitOpen} dark={dark} theme={theme} />
					</div>

					{/* *With*, not *beside*: it sits beneath the name on a card and beside it in the list. */}
					<Hint theme={theme}>Optional — it shows with the name on cards and on the run list.</Hint>

					<Rule theme={theme} />

					{/* ---------- Count ---------- */}
					<div class="flex items-center justify-between gap-3">
						<Label theme={theme}>Count</Label>

						{/*
						  * The live status, right of the label and updating as either
						  * stepper moves. **This is what makes the threshold easy
						  * rather than merely bigger**: a threshold is an abstraction
						  * until you can watch what it does to the item in front of
						  * you. It costs no vertical space — the label row was half
						  * empty.
						  */}
						<span class="flex items-center gap-[7px]" aria-live="polite" aria-atomic="true">
							<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: status.dot }} />
							<span class="text-[13px] font-medium" style={{ color: status.ink }}>{STATUS_PHRASE[status.key]}</span>
						</span>
					</div>

					<div class="flex gap-3 pt-3">
						<Stepper
							label="On hand"
							value={value.qty}
							onValue={(qty) => onChange({ ...value, qty })}
							dark={dark} theme={theme}
						/>
						<Stepper
							label="Low at"
							value={value.threshold}
							onValue={(threshold) => onChange({ ...value, threshold })}
							/*
							 * **A statement about the number, not about whether you have
							 * touched it.** It answers the question the number raises —
							 * *why 2, and did somebody choose that?* — so it is true
							 * exactly while the number is still the household's, and it
							 * comes back if you step or type your way back to it. A
							 * one-way "touched" flag was built first and is the wrong
							 * shape: it left the sheet saying nothing about a value that
							 * *was* the default, which is the only thing the line is for.
							 *
							 * Compared through `toInt` so an empty field and a leading
							 * zero read as the numbers they are. Add sheet only: on an
							 * edit the number is the item's, whatever it happens to equal.
							 */
							note={! editing && toInt(value.threshold) === toInt(defaultThreshold) ? 'Household default' : undefined}
							dark={dark} theme={theme}
						/>
					</div>

					{/*
					  * **Retired, and this is the way out rather than the way in**
					  * (D60). It appears only on an item that *already* carries the
					  * flag, so it can be cleared and never set — and once cleared the
					  * row unmounts and cannot come back.
					  *
					  * The checkbox existed to answer *some things are never shopped
					  * for* (D53), and **a source's kind answers that better**: you
					  * grow it, you make it, or you buy it, and the first two go to
					  * their own bands without anyone ticking anything. A control
					  * whose whole job has been taken over is a second way to say one
					  * thing, and this one says it worse — it hides an item from the
					  * list without saying where it went.
					  *
					  * **The column stays**, because dropping one needs
					  * `sf db migrate --drop` while filling it again is additive — the
					  * same trade D34 made for `icon`. `needsBuying` still reads it, so
					  * a row that was ticked before today keeps behaving exactly as it
					  * did, and putting the control back is deleting one condition.
					  *
					  * **Absent rather than disabled** where it would create a new
					  * one, present where it is the only way out of an old one. A
					  * legacy row with no control at all would be stuck off every
					  * band for good, which is a worse thing to ship than a control
					  * that only subtracts.
					  */}
					{value.offShoppingList && (
						<button
							type="button"
							role="checkbox"
							aria-checked
							onClick={() => onChange({ ...value, offShoppingList: false })}
							class={`flex items-start gap-[11px] mt-3.5 -mx-2 px-2 py-2 ${PAGE_CHECKBOX_ROW}`}
						>
							<span class="pt-px shrink-0"><CheckBox checked theme={theme} /></span>
							<span class="min-w-0">
								<span class="block text-[15px]" style={{ color: theme.text }}>Keep off the list</span>
								<span class="block text-[12.5px] leading-[1.45] pt-[3px]" style={{ color: theme.textMuted }}>
									It still shows as low or out on its card — it just never joins the list.
									Clearing this is permanent: what you grow or make gets its own band now.
								</span>
							</span>
						</button>
					)}

					<Rule theme={theme} />

					{/* ---------- Location / Store / Type ---------- */}
					<Label theme={theme}>Location</Label>
					<div class="pt-2.5">
						<ChipRow
							terms={locations}
							selected={value.locationId ? [value.locationId] : []}
							onToggle={(id) => onChange({ ...value, locationId: id })}
							onAdd={(n, ink) => void addTerm('location', n, ink)}
							canAdd={canCreateTerms} label="Location" dark={dark} theme={theme}
						/>
					</div>

					<div class="pt-4">
						<Label theme={theme}>{sourceWord}</Label>
					</div>
					<div class="pt-2.5">
						<ChipRow
							terms={stores}
							selected={value.storeIds}
							onToggle={(id) => onChange({
								...value,
								storeIds: value.storeIds.includes(id)
									? value.storeIds.filter((s) => s !== id)
									: [...value.storeIds, id],
							})}
							onAdd={(n, ink, k) => void addTerm('store', n, ink, k)}
							canAdd={canCreateTerms} kindable label={sourceWord} dark={dark} theme={theme}
						/>
					</div>

					{/*
					  * ---------- In season, on a grow item ----------
					  *
					  * **The inline composer's construction, on a cream sheet.** It is
					  * a recessed panel because it is a thing that has dropped in —
					  * the same shape the term composer takes when a `+ Source` opens
					  * one — and it drops in *below the source chips* because the
					  * source is why it is here.
					  *
					  * **Months, not dates.** No year, no locale, no format: a season
					  * repeats and a date does not. That is the Members pane's
					  * *Expires in 12 days* argument, one step further.
					  *
					  * **Deselecting the grow source does not clear the season.** The
					  * panel goes and the two stored months stay, so putting the
					  * source back brings them with it. Discarding what somebody
					  * typed because they touched a different control would be a
					  * silent write, and the value is inert until a harvest card asks
					  * for it — `runBands` reads it in the harvest band and nowhere
					  * else.
					  */}
					{grown && (
						<div
							class="mt-[18px] p-3.5 rounded-[14px]"
							style={{ background: season.panel, boxShadow: `inset 0 0 0 1px ${season.hairline}` }}
						>
							<Label theme={theme}>In season</Label>
							<div class="flex items-center gap-2.5 pt-2.5">
								<MonthMenu
									value={value.seasonFrom}
									onChange={(m) => onChange({ ...value, seasonFrom: m, seasonTo: value.seasonTo || m })}
									label="In season from"
									open={fromOpen} setOpen={setFromOpen} dark={dark} theme={theme}
								/>
								<span class="text-[13.5px] shrink-0" style={{ color: theme.textMuted }}>to</span>
								<MonthMenu
									value={value.seasonTo}
									onChange={(m) => onChange({ ...value, seasonTo: m, seasonFrom: value.seasonFrom || m })}
									label="In season to"
									open={toOpen} setOpen={setToOpen} dark={dark} theme={theme}
								/>
							</div>
							<Hint theme={theme}>
								Only asked because the {sourceWord.toLowerCase()} you picked is one you grow. Out of
								season the item still reads <i>low</i> or <i>out</i> on its card — it just moves to
								<i> Not yet</i> on the harvest list.
							</Hint>
						</div>
					)}

					{/*
					  * ---------- Made, not bought, on a make item ----------
					  *
					  * **The season panel's twin, and deliberately so.** Same place —
					  * below the source chips, because the source is why it is here —
					  * same recessed `panelSkin` surface, same radius, padding and
					  * micro-label. The two are one question answered two ways: what
					  * does picking this kind of source mean for this item. An item
					  * naming both a garden and a kitchen gets both panels, in the run
					  * list's own band order.
					  *
					  * **A statement, not an empty state and not a disabled control.**
					  * Nothing is wrong and nothing is pending on the reader, so there
					  * is no icon, no amber and nothing to press — *a disabled control
					  * cannot explain itself* (D36) is what rules out the alternative.
					  *
					  * **There are no ingredients on an item sheet and there never
					  * will be** (D59). A pantry item answers one question — *do we
					  * need more* — from its own count and its own low-at. Ingredients
					  * belong to a recipe, and a recipe points at the item rather than
					  * the other way round.
					  *
					  * So the panel **promises nothing**. It said *Recipes are coming*
					  * for one round, which is a roadmap on a form: it dated the sheet
					  * against a feature D59 does not commit to, and it read as an
					  * apology for a panel that is already doing its whole job. What
					  * is here now is only what is true today — what the kind changed
					  * about this item — which is also why the label states the fact
					  * rather than heading a list of ingredients the way the boards'
					  * `MADE BY` does.
					  */}
					{made && (
						<div
							class="mt-[18px] p-3.5 rounded-[14px]"
							style={{ background: season.panel, boxShadow: `inset 0 0 0 1px ${season.hairline}` }}
						>
							<Label theme={theme}>Made, not bought</Label>
							<p class="text-[13px] leading-[1.55] pt-2.5" style={{ color: theme.text }}>
								The {sourceWord.toLowerCase()} you picked is one you make, so running low puts
								{' '}{value.name.trim() || 'this'} on the{' '}
								<b class="font-semibold" style={{ color: theme.textStrong }}>Make</b> band of the run
								list rather than on a shopping card.
							</p>
						</div>
					)}

					<div class="pt-4">
						<Label theme={theme}>Type</Label>
					</div>
					<div class="pt-2.5">
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

					<Rule theme={theme} />

					{/* ---------- Notes ---------- */}
					<Label theme={theme}>
						Notes <span class="font-normal normal-case tracking-normal" style={{ color: theme.textMuted }}>optional</span>
					</Label>
					<textarea
						value={value.notes}
						onInput={(e) => onChange({ ...value, notes: e.currentTarget.value })}
						placeholder="Fed on Sundays. Discard goes in the pancakes."
						class={`w-full h-[88px] px-3.5 py-3 mt-2.5 rounded-[11px] text-[15px] resize-none ${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
						aria-label="Notes"
					/>
				</div>

				{/* Sticky: the sheet scrolls, the decision does not. */}
				<div
					class="mt-auto shrink-0 flex items-center justify-between gap-3 h-20 md:h-[76px] px-4 md:px-5"
					style={{ borderTop: `1px solid ${theme.divider}` }}
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
							class={`flex items-center gap-2 h-11 px-3 rounded-[13px] text-[15px] font-semibold ${PAGE_ICON}`}
							style={{ color: theme.dangerText }}
						>
							<Trash2 size={16} /> Remove item
						</button>
					) : <span />}

					<div class="flex items-center gap-2.5">
						<button onClick={onClose} class={`h-11 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_ICON}`}>Cancel</button>
						<button
							onClick={onSave}
							disabled={saving}
							class={`flex items-center gap-2.5 h-11 px-5 rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
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
