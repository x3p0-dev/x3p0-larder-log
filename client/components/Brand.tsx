import type { Theme } from '../lib/theme';

/**
 * The marks every surface outside the app shell repeats: the Oat tile and the
 * wordmark.
 *
 * They existed inline in three places before this file — the drawer, the mobile
 * header, and the old sign-in gate — and the flows outside the shell add six
 * more at four sizes. One component each, sized by prop.
 */

/**
 * The app icon, at whatever size the surface calls for.
 *
 * Oat ground, ink L, Playfair **roman** 800. It does not vary by theme: the
 * original crimson italic on the drawer gradient was a 3.4:1 pairing carried by
 * the thinnest strokes in a Didone, and dark-on-light at 66% cap height is what
 * fixed it. Same drawing as `favicon.ico`, so a tab and a card agree.
 *
 * The glyph is ~62% of the tile and nudged a pixel down — Playfair's L sits
 * optically high in its em box, and centring it by metrics leaves it floating.
 */
export function AppTile({ size, radius }: { size: number; radius?: number }) {
	return (
		<span
			class="flex items-center justify-center shrink-0"
			style={{
				width: `${size}px`,
				height: `${size}px`,
				borderRadius: `${radius ?? Math.round(size * 0.21)}px`,
				background: '#E2D5C0',
			}}
			aria-hidden="true"
		>
			<span
				class="font-disp font-extrabold leading-none"
				style={{ fontSize: `${Math.round(size * 0.62)}px`, color: '#241E17', transform: 'translateY(1px)' }}
			>
				L
			</span>
		</span>
	);
}

/**
 * "Larder *Log*" — Playfair 800, with *Log* in crimson italic.
 *
 * The weight is one setting across both words; *Log* changes color and slant
 * only, so the two halves stay the same size and the mark reads as one phrase.
 *
 * `size` is a font-size class rather than a number because Tailwind resolves a
 * class by scanning for a static string; the ramp tokens are `text-wordmark`,
 * `text-wordmark-md` and `text-wordmark-lg`, and the caller picks one.
 */
export function Wordmark({ size, theme }: { size: string; theme: Theme }) {
	return (
		<span
			class={`font-disp ${size} font-extrabold leading-[1.06] tracking-[-0.01em]`}
			style={{ color: theme.textStrong }}
		>
			Larder <span class="italic" style={{ color: theme.accent }}>Log</span>
		</span>
	);
}
