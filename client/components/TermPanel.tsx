import { useState } from 'preact/hooks';
import { Trash2, X } from 'lucide-preact';

import { ColorPicker } from './ColorPicker';
import { SourceKindMenu } from './SourceKindMenu';
import type { Theme } from '../lib/theme';
import { themed } from '../lib/theme';
import { DRAWER_TRASH, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK } from '../lib/controlStyles';
import type { SourceKind } from '../../shared/source';

type Skin = {
	panel: string;
	hairline: string;
	label: string;
	field: string;
	fieldLine: string;
	ink: string;
	ghost: string;
	doneBg: string;
	doneInk: string;
	/** The field's focus halo, as a class — `:focus` cannot be an inline style. */
	halo: string;
	/** The picker sits on a further-recessed sub-panel inside the panel. */
	well: string;
};

/**
 * The two surfaces this panel appears on.
 *
 * One construction, re-skinned — creating a term from a sheet is *the Filter
 * tab's editing panel on cream*, not a second interaction that happens to look
 * similar.
 */
export function panelSkin(theme: Theme, onDark: boolean): Skin {
	return onDark
		? {
			panel: '#262019', hairline: theme.drawer.line, label: '#C3B49C',
			field: theme.drawer.well, fieldLine: theme.drawer.line, ink: theme.drawer.ink,
			ghost: '#6E5F4B', doneBg: theme.drawer.ink, doneInk: '#241E17',
			halo: PANEL_FIELD_HALO_DARK,
			well: theme.drawer.bg,
		}
		: {
			panel: theme.surfaceAlt, hairline: theme.border, label: theme.textMuted,
			field: theme.surface, fieldLine: theme.border, ink: theme.textStrong,
			ghost: theme.textMuted, doneBg: theme.inkBg, doneInk: theme.inkText,
			halo: theme.dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO,
			well: theme.ground,
		};
}

/**
 * A recessed panel with a micro-label header and a pill on the right.
 *
 * `LOCATION · NEW` with a *Done* pill on the sheet, `STORE · EDITING` with the
 * same pill in the filter tab.
 *
 * **It used to bleed 10px past its column on both sides**, a `-mx-2.5` meant to
 * read as a tray opening rather than a card floating inside a list. It read as
 * neither: it read as a box that missed. On the item sheet it hung outside the
 * fields, the micro-labels and the season and make panels either side of it; in
 * the Filter tab it hung outside the chips it drops under **and outside the
 * `EDITING` card**, which is the same panel one state along and has always sat
 * on the pane's own gutter. A composer that lines up with nothing it opens
 * beside is not a different kind of surface, and the tray reading was never
 * worth an edge that disagreed with every other edge in the column.
 *
 * So there is one geometry now: the panel's edges are its column's, on both
 * surfaces, with `px-3.5` inside — the sheet's season panel and the drawer's
 * editing card both already use that padding.
 *
 * `flush` is for the callers that open **inside a card rather than inside a
 * list** — Settings › Household, and the Filter tab's `EDITING` panel, which
 * becomes a card of its own once the chips it replaces are gone. There the
 * panel is the top of the card it drops into, so it takes the card's own top
 * corners, drops its ring, and lets whatever is under it be its bottom edge —
 * the hairline above Members in the first case, the card's clipped radius in
 * the second. Rounding a box inside a box inside a card stacked three nested
 * outlines on one screen, and the innermost one — the colour picker's well —
 * is the only one carrying information.
 */
export function TermPanel({
	label, mode, onDone, onDark = false, flush = false, theme, children,
}: {
	label: string;
	mode: 'new' | 'editing';
	onDone: () => void;
	onDark?: boolean;
	/** Fill the card this drops into, from its top corners, rather than float inside it. */
	flush?: boolean;
	theme: Theme;
	children: preact.ComponentChildren;
}) {
	const s = panelSkin(theme, onDark);

	return (
		<div
			class={
				'flex flex-col gap-2.5 pt-3 pb-3.5 ' +
				/* 12, not 13: the card's radius less its 1px border, so the fill
				 * follows the inside of the corner rather than cutting across it. */
				/* 14 either way, so the row inside lands where the season panel's
				 * own `p-3.5` puts its months and where the editing card's
				 * `pl-3.5` puts its names. The `flush` form trims 2px off the
				 * right for the trash, which carries its own. */
				(flush ? 'pl-3.5 pr-3 rounded-t-[12px]' : 'px-3.5 rounded-[14px]')
			}
			style={{
				background: s.panel,
				boxShadow: flush ? undefined : `inset 0 0 0 1px ${s.hairline}`,
			}}
		>
			<div class="flex items-center justify-between gap-2">
				<span class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: s.label }}>
					{label} &middot; {mode}
				</span>
				<button
					onClick={onDone}
					class="flex items-center h-7 px-3 rounded-full text-[12.5px] font-semibold transition-opacity hover:opacity-90 active:translate-y-px"
					style={{ background: s.doneBg, color: s.doneInk }}
				>
					Done
				</button>
			</div>
			{children}
		</div>
	);
}

/**
 * One row inside the panel: swatch, name, and a trailing ghost action.
 *
 * The swatch opens the sixteen **inline**, on a further-recessed sub-panel that
 * pushes the panel taller — nothing floats over the surface behind it. Both the
 * swatch and those sixteen are the theme's palette, not the surface's (D42).
 */
export function TermRow({
	name, ink, placeholder, autoFocus, kind, onKind, onName, onColor, onAction, action, onDark = false, theme,
}: {
	name: string;
	ink: string;
	placeholder?: string;
	autoFocus?: boolean;
	/**
	 * A source's kind, and the glyph that changes it (D58). Stores only —
	 * locations and types have no kind, and pass neither.
	 *
	 * **A row being composed carries it too**, which is new: D58 shipped with
	 * *a new source is always a shop*, on the reasoning that the kind is a
	 * property you settle afterwards from the editing row. It is not — you know
	 * whether you are adding a shop or a garden as you type its name, and
	 * making one meant naming it, pressing *Done*, re-opening the panel with
	 * the pencil and finding the row again. Same glyph, same menu, same slot.
	 *
	 * **This is what replaced the item count.** D36 put the count here so the
	 * trash's outcome was predictable before the press; at 340px the row was
	 * already swatch · field · count · trash, and a fifth slot left the field
	 * around 150px, which is where *Calfee Cattle* starts truncating. A source
	 * you cannot read is worse than a delete whose outcome you discover one
	 * press later — and the blocked dialog still names the number and still
	 * offers to show you the items. The chips above keep their counts, where
	 * the number says what pressing the chip will do.
	 */
	kind?: SourceKind;
	onKind?: (kind: SourceKind) => void;
	onName: (next: string) => void;
	onColor: (token: string) => void;
	onAction: () => void;
	/** `delete` in the filter tab, `abandon` on a row being composed. */
	action: 'delete' | 'abandon';
	onDark?: boolean;
	theme: Theme;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [kindOpen, setKindOpen] = useState(false);
	const s = panelSkin(theme, onDark);
	/*
	 * `themed()`, **not** `termColorFor()`.
	 *
	 * A term's ink is a colour token *or* a legacy `#rrggbb` — `normalizeInk`
	 * deliberately stores both (D32) — and `termColorFor` resolves only the
	 * token half. On a household seeded before D32 it returned `undefined` and
	 * this swatch fell back to `transparent`, which is invisible three times
	 * over: no fill, an inset ring already painted in the panel's own colour,
	 * and an outer ring in the colour that had just gone transparent. It read
	 * as **blank space that grows a light ring when pressed**, because the open
	 * state's ring is the only one with a colour of its own.
	 *
	 * `themed()` is the function with the legacy branch — the same one
	 * `entityColorFor` calls, which is why every chip on the page rendered
	 * these terms correctly the whole time. It still follows the theme rather
	 * than the surface (D42).
	 */
	const swatch = themed(ink, theme.dark).dot;
	const Action = action === 'delete' ? Trash2 : X;

	return (
		<div class="flex flex-col gap-2.5">
			<div class="flex items-center gap-2.5">
				<button
					type="button"
					onClick={() => setPickerOpen((v) => ! v)}
					class="shrink-0 w-[26px] h-[26px] rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none"
					style={{
						background: swatch,
						boxShadow: pickerOpen
							? `inset 0 0 0 1.5px ${s.panel}, 0 0 0 2.5px ${s.doneBg}`
							: `inset 0 0 0 1.5px ${s.panel}, 0 0 0 1.5px ${swatch}`,
					}}
					aria-label="Change color"
					aria-expanded={pickerOpen}
				/>

				<input
					value={name}
					onInput={(e) => onName(e.currentTarget.value)}
					placeholder={placeholder}
					autoFocus={autoFocus}
					class={`flex-1 min-w-0 h-10 px-3 rounded-[11px] text-sm ${s.halo}`}
					style={{ background: s.field, border: `1px solid ${s.fieldLine}`, color: s.ink }}
					aria-label={placeholder ?? 'Term name'}
				/>

				{kind !== undefined && onKind && (
					<SourceKindMenu
						open={kindOpen}
						setOpen={setKindOpen}
						name={name}
						kind={kind}
						onChange={onKind}
						onDark={onDark}
						theme={theme}
					/>
				)}

				{/*
				  * Neutral, not crimson, and never disabled — see D36. Crimson is
				  * how a destructive action is *offered* elsewhere, but this row
				  * already carries the count that says what will happen, and a
				  * disabled trash could not explain itself to anyone on touch or
				  * a screen reader.
				  */}
				<button
					type="button"
					onClick={onAction}
					class={
						'shrink-0 flex items-center justify-center w-[30px] h-[30px] ' +
						(action === 'delete' ? DRAWER_TRASH : 'rounded-[9px] transition-colors hover:opacity-80')
					}
					style={action === 'delete' ? undefined : { color: s.ghost }}
					aria-label={action === 'delete' ? `Delete ${name || 'term'}` : 'Cancel'}
				>
					<Action size={15} />
				</button>
			</div>

			{/*
			  * The picker stays open after a choice. It closes on the swatch, and
			  * nothing else: recolouring is comparison — you pick one, look at the
			  * dot against the name, and pick again — and snapping shut meant
			  * re-opening the sixteen for every second guess.
			  */}
			{pickerOpen && (
				<ColorPicker
					value={ink}
					onChange={onColor}
					theme={theme}
					onDark={onDark}
					well={s.well}
				/>
			)}
		</div>
	);
}
