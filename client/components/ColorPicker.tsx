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
	 * It changes both the well it sits in and the swatches themselves: a term's
	 * light base is tuned to read on cream and goes muddy on near-black, so the
	 * dark values are what get drawn there. The token written is the same
	 * either way.
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
 */
export function ColorPicker({ value, onChange, theme, onDark = false, well, class: className = '' }: Props) {
	return (
		<div
			class={
				'grid grid-cols-8 gap-[7px] px-3 py-[11px] rounded-xl ' +
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
				const swatch = ! c ? 'transparent' : onDark ? c.darkDot : c.base;
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
						aria-label={`Choose color ${i + 1}`}
					/>
				);
			})}
		</div>
	);
}
