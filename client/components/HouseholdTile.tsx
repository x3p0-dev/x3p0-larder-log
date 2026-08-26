import { householdLetter } from '../../shared/household';
import { mixHex, termColorFor } from '../lib/theme';

/**
 * The household's colour, with its letter on it (D42).
 *
 * **One shape at every size.** 68 is the rail's control box, 44 the invite card
 * and the switcher header, 40 the rail's own tile and the New household
 * dialog's, 34 a switcher row, 26 the composer swatch. Radius is 30% of the
 * side and the letter is Playfair 700 at 42%, both derived rather than tabled —
 * a fifth size is a number, not an entry.
 *
 * The fill follows the **theme**, not the surface it lands on: the light `base`
 * carries a cream letter, the dark variant a near-black one. That is the same
 * rule a filled term chip follows, and it is why the tile on the drawer — dark
 * in both themes — still changes when you flip the app to dark.
 *
 * Decorative by default: everywhere it appears, the household's name is beside
 * it in text. Hosts that use it as the *only* label pass their own accessible
 * name on the control around it.
 */
export function HouseholdTile({ ink, name, size, dark, ring, interactive = false, class: className = '' }: {
	ink: string;
	name: string;
	size: number;
	dark: boolean;
	/** An outer ring marking this tile as the source of something open. */
	ring?: string;
	/**
	 * Take hover and pressed fills from the enclosing `group`.
	 *
	 * Both are *derived* — 10% toward white, 9% toward black — so all sixteen
	 * colours behave the same and none needs a hand-picked pair. They ride CSS
	 * custom properties because a `:hover` cannot be an inline style, and the
	 * class strings have to stay literal for Tailwind to find them at all.
	 */
	interactive?: boolean;
	class?: string;
}) {
	const c = termColorFor(ink);
	const fill = (dark ? c?.darkDot : c?.base) ?? (dark ? '#BF7A52' : '#A85E33');

	const shape = {
		width: `${size}px`,
		height: `${size}px`,
		borderRadius: `${Math.round(size * 0.3)}px`,
		fontSize: `${Math.round(size * 0.42)}px`,
		color: dark ? '#17130D' : '#FDFAF4',
		boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
	};

	if (! interactive) {
		return (
			<span
				class={`shrink-0 flex items-center justify-center font-disp font-bold ${className}`}
				style={{ ...shape, background: fill }}
				aria-hidden="true"
			>
				{householdLetter(name)}
			</span>
		);
	}

	return (
		<span
			class={
				'shrink-0 flex items-center justify-center font-disp font-bold transition-colors ' +
				'bg-[var(--tile)] group-hover:bg-[var(--tile-hover)] group-active:bg-[var(--tile-press)] ' +
				className
			}
			style={{
				...shape,
				'--tile': fill,
				'--tile-hover': mixHex(fill, '#ffffff', 0.10),
				'--tile-press': mixHex(fill, '#000000', 0.09),
			}}
			aria-hidden="true"
		>
			{householdLetter(name)}
		</span>
	);
}
