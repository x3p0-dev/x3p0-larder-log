import type { Theme } from '../lib/theme';
import { DEFAULT_PALETTE, termColorFor } from '../lib/theme';

type Props = {
	/** The currently chosen color token. */
	value: string;
	onChange: (token: string) => void;
	theme: Theme;
	/**
	 * Whether this picker is on the drawer rather than the page.
	 *
	 * It changes the well it sits in and the ring on the selected dot — never
	 * the dots themselves. See the note above.
	 */
	onDark?: boolean;
	/** Override the well, for a picker nested inside an already-recessed panel. */
	well?: string;
	/** Layout only — margins and placement. The well is this component's own. */
	class?: string;
};

/**
 * The sixteen term colors, eight across by two down.
 *
 * `onChange` emits a color *token*, never a hex — what gets stored is
 * `color-7`, so re-theming later restyles every term without touching a row.
 *
 * **The dots are the palette, and the palette follows the theme** — light bases
 * in light, dark variants in dark — at every call site, on the drawer and on a
 * card alike. A token has one appearance per theme; a picker that drew a
 * different value depending on the surface it opened over meant pressing one
 * colour and getting another (D42).
 *
 * `onDark` therefore governs the well and the selected ring only. What it used
 * to govern as well — the dots — is now `theme.dark`.
 */
export function ColorPicker({ value, onChange, theme, onDark = false, well, class: className = '' }: Props) {
	const dark = theme.dark;

	return (
		<div
			class={
				/*
				 * The gap and the gutter tighten below the dock, which is the only
				 * lever a picker whose dots are `w-full` has: eight across in a
				 * fixed column means a dot is whatever is left over. Trimming
				 * 4px of gutter and 1px from each of the seven gaps hands all
				 * eleven back to the circles — a 390 screen goes from 27.4px
				 * dots to 28.8. The well grows a little taller in exchange, so
				 * the sixteen still sit in a box rather than filling one.
				 */
				'grid grid-cols-8 gap-1.5 px-2.5 py-3 rounded-xl ' +
				'min-[1120px]:gap-[7px] min-[1120px]:px-3 min-[1120px]:py-[11px] ' +
				(onDark && ! well ? 'bg-drawer-well border border-drawer-line ' : '') +
				className
			}
			style={
				well
					? { background: well, border: `1px solid ${onDark ? theme.drawer.line : theme.border}` }
					: onDark ? undefined : { background: theme.surfaceAlt, border: `1px solid ${theme.border}` }
			}
		>
			{DEFAULT_PALETTE.map((token, i) => {
				const c = termColorFor(token);
				const swatch = ! c ? 'transparent' : dark ? c.darkDot : c.base;
				const selected = value === token;

				return (
					<button
						key={token}
						type="button"
						onClick={() => onChange(token)}
						class="w-full aspect-square rounded-full transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:scale-110"
						style={{
							background: swatch,
							boxShadow: selected
								? `inset 0 0 0 1.5px ${onDark ? '#262019' : theme.surface}, 0 0 0 2.5px ${onDark ? '#F2E9DA' : theme.textStrong}`
								: 'none',
						}}
						aria-pressed={selected}
						aria-label={c ? c.name : `Choose color ${i + 1}`}
						title={c?.name}
					/>
				);
			})}
		</div>
	);
}
