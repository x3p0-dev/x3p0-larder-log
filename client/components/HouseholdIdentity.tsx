import { useState } from 'preact/hooks';

import { ColorPicker } from './ColorPicker';
import { panelSkin } from './TermPanel';
import { TERM_SWATCH } from '../lib/controlStyles';
import type { Theme } from '../lib/theme';
import { termColorFor } from '../lib/theme';

/**
 * The household's name and colour as **one row**: swatch, field, and the same
 * 8 × 2 picker opening inline underneath (D42).
 *
 * It is the term composer, not a new component. A household is a coloured,
 * named thing in a list, which is exactly what every location, store and type
 * already is — so `TermRow`'s geometry is reused wholesale: the same swatch
 * ringed in its own colour, a 40–44px field at radius 11, and a picker that
 * pushes the panel taller rather than floating over it.
 *
 * It is *not* `TermRow` itself. That row carries a usage count and a trash,
 * both of which are list furniture: a household is one row, and leaving it is a
 * different verb with its own control elsewhere.
 */
export function HouseholdIdentity({
	name, ink, onName, onInk, onSubmit,
	fieldHeight = 40, fieldLine, fieldId, autoFocus = false, onDark = false, theme,
}: {
	name: string;
	ink: string;
	onName: (next: string) => void;
	onInk: (token: string) => void;
	/** Enter in the field, where the surrounding screen has a primary to run. */
	onSubmit?: () => void;
	fieldHeight?: number;
	/**
	 * The field's border, when the surface wants one stronger than the panel's.
	 *
	 * A card outside the shell draws it at `textFaint` rather than `border` — a
	 * hairline that reads as an edge inside a recessed panel disappears on the
	 * flat cream of the sign-in cards.
	 */
	fieldLine?: string;
	/** So a host that focuses the field on open has something to reach it by. */
	fieldId?: string;
	autoFocus?: boolean;
	onDark?: boolean;
	theme: Theme;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const s = panelSkin(theme, onDark);
	const c = termColorFor(ink);

	/* The palette, following the theme rather than the surface — the same rule
	 * the term composer's swatch and every picker now take (D42). */
	const swatch = (theme.dark ? c?.darkDot : c?.base) ?? 'transparent';

	return (
		<div class="flex flex-col gap-2.5">
			<div class="flex items-center gap-2.5">
				<button
					type="button"
					onClick={() => setPickerOpen((v) => ! v)}
					class={`shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none ${TERM_SWATCH}`}
					style={{
						background: swatch,
						boxShadow: pickerOpen
							? `inset 0 0 0 1.5px ${s.panel}, 0 0 0 2.5px ${s.doneBg}`
							: `inset 0 0 0 1.5px ${s.panel}, 0 0 0 1.5px ${swatch}`,
					}}
					aria-label={c ? `Household color — ${c.name}` : 'Household color'}
					aria-expanded={pickerOpen}
				/>

				<input
					id={fieldId}
					value={name}
					onInput={(e) => onName(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key !== 'Enter' || ! onSubmit) return;
						e.preventDefault();
						onSubmit();
					}}
					placeholder="Household name"
					autoFocus={autoFocus}
					class={`flex-1 min-w-0 px-3 rounded-[11px] text-sm ${s.halo}`}
					style={{
						height: `${fieldHeight}px`,
						background: s.field,
						border: `1px solid ${fieldLine ?? s.fieldLine}`,
						color: s.ink,
					}}
					aria-label="Household name"
				/>
			</div>

			{/*
			  * No caption under the sixteen. It named the colour and said when
			  * another of your households already wore it — but a collision is
			  * *allowed*, so the line described an absence of a rule rather than
			  * a rule, and the swatch and the dots already say which one is
			  * chosen. The names survive as the dots' `aria-label` and `title`,
			  * where they do real work: sixteen unlabelled circles otherwise
			  * announce as "Choose color 7".
			  */}
			{pickerOpen && (
				<ColorPicker
					value={ink}
					onChange={onInk}
					theme={theme}
					onDark={onDark}
					well={s.well}
				/>
			)}
		</div>
	);
}
