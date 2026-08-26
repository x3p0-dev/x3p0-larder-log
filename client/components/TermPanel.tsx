import { useState } from 'preact/hooks';
import { Trash2, X } from 'lucide-preact';

import { ColorPicker } from './ColorPicker';
import type { Theme } from '../lib/theme';
import { drawerDot, termColorFor } from '../lib/theme';
import { DRAWER_TRASH } from '../lib/controlStyles';

type Skin = {
	panel: string;
	hairline: string;
	label: string;
	field: string;
	fieldLine: string;
	ink: string;
	ghost: string;
	/** The item count beside the trash — quiet, and the same on both grounds. */
	count: string;
	doneBg: string;
	doneInk: string;
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
			ghost: '#6E5F4B', count: '#9E8C74', doneBg: theme.drawer.ink, doneInk: '#241E17',
			well: theme.drawer.bg,
		}
		: {
			panel: theme.surfaceAlt, hairline: theme.border, label: theme.textMuted,
			field: theme.surface, fieldLine: theme.border, ink: theme.textStrong,
			ghost: theme.textMuted, count: theme.textFaint, doneBg: theme.inkBg, doneInk: theme.inkText,
			well: theme.ground,
		};
}

/**
 * A recessed panel with a micro-label header and a pill on the right.
 *
 * `LOCATION · NEW` with a *Done* pill on the sheet, `STORE · EDITING` with the
 * same pill in the filter tab. The negative margin lets it bleed to the edge of
 * whatever column it drops into, so it reads as a tray opening rather than a
 * card floating inside the list.
 */
export function TermPanel({
	label, mode, onDone, onDark = false, theme, children,
}: {
	label: string;
	mode: 'new' | 'editing';
	onDone: () => void;
	onDark?: boolean;
	theme: Theme;
	children: preact.ComponentChildren;
}) {
	const s = panelSkin(theme, onDark);

	return (
		<div
			class="flex flex-col gap-2.5 -mx-2.5 px-2.5 pt-3 pb-3.5 rounded-[14px]"
			style={{ background: s.panel, boxShadow: `inset 0 0 0 1px ${s.hairline}` }}
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
 * pushes the panel taller — nothing floats over the surface behind it.
 */
export function TermRow({
	name, ink, placeholder, autoFocus, count, onName, onColor, onAction, action, onDark = false, theme,
}: {
	name: string;
	ink: string;
	placeholder?: string;
	autoFocus?: boolean;
	/**
	 * How many items reference this term, shown between the field and the trash.
	 *
	 * The trash is live on every row (D36), so this is what makes the outcome
	 * predictable *before* the press: a non-zero count means the blocked dialog,
	 * a zero means the term goes with an undo toast holding it. Absent on a row
	 * being composed, which references nothing yet.
	 */
	count?: number;
	onName: (next: string) => void;
	onColor: (token: string) => void;
	onAction: () => void;
	/** `delete` in the filter tab, `abandon` on a row being composed. */
	action: 'delete' | 'abandon';
	onDark?: boolean;
	theme: Theme;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const s = panelSkin(theme, onDark);
	const c = termColorFor(ink);
	const swatch = ! c ? 'transparent' : onDark ? drawerDot(c) : c.base;
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
					aria-label="Change colour"
					aria-expanded={pickerOpen}
				/>

				<input
					value={name}
					onInput={(e) => onName(e.currentTarget.value)}
					placeholder={placeholder}
					autoFocus={autoFocus}
					class="flex-1 min-w-0 h-10 px-3 rounded-[11px] text-sm outline-none"
					style={{ background: s.field, border: `1px solid ${s.fieldLine}`, color: s.ink }}
					aria-label={placeholder ?? 'Term name'}
				/>

				{count !== undefined && (
					<span class="shrink-0 min-w-[20px] text-right text-[13px] tabular-nums" style={{ color: s.count }}>
						{count}
					</span>
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

			{pickerOpen && (
				<ColorPicker
					value={ink}
					onChange={(token) => { onColor(token); setPickerOpen(false); }}
					theme={theme}
					onDark={onDark}
					well={s.well}
				/>
			)}
		</div>
	);
}
