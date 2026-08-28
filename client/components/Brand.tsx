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

/**
 * `BETA` in a pill, beside the wordmark on the marketing page.
 *
 * **The front door only** — the nav and the footer, and nowhere inside the app.
 * The first cut welded it to the wordmark everywhere on the reasoning that a
 * marker appearing on some screens and not others stops being a disclosure and
 * becomes decoration. That is a good rule about *disclosure* and the wrong
 * answer here: the app shell is for someone who has already decided, and a
 * permanent pill in the drawer header and above the item grid is a caveat they
 * are made to read on every load. The page that has to say it is the page that
 * asks for the account.
 *
 * **It is not a control.** No press state, no tooltip, no link, no 44px target,
 * not focusable. It is the tag component — read-only, bounded, sitting beside a
 * thing it labels — with no dot. Nothing new, and no new token.
 *
 * The markup says `Beta` and the caps are CSS, so a screen reader is handed a
 * word rather than four letters to consider spelling out. It is deliberately
 * *not* `aria-hidden`: the nav should announce *Larder Log Beta*, which is what
 * a sighted reader gets and the whole point of the disclosure.
 *
 * **It scales off the wordmark's set size** rather than off a table, the same
 * way the household tile derives its radius and letter — so a third call site
 * is a number here rather than a new entry. `size` is the wordmark's font size
 * in px.
 *
 * The floor is on the input, not on the label. The 18px footer wordmark asks
 * for an 8px label, which is below the smallest type anywhere in the app (the
 * `OUT` / `LOW` badges at 9.5) and below where the tracking stops separating
 * letters and starts dissolving them. Clamping the *input* at 24 is what the
 * spec's "the footer takes Small unchanged and sits fractionally large"
 * amounts to, in one expression rather than a cascade of clamps.
 */
export function BetaBadge({ size, theme }: { size: number; theme: Theme }) {
	const set = Math.max(24, size);
	const height = Math.round(set * 0.66);

	/*
	 * A fill one step off the ground, a `meta` edge, a `body` label.
	 *
	 * **The fill does none of the separating** — 1.10:1 against the light ground
	 * and 1.45:1 against the dark one. The pill is invisible without its border
	 * in both themes, so the edge is the whole component. Drop it to a hairline
	 * "because it looked heavy" and the badge stops existing.
	 *
	 * `border` for the fill is the applied-filter finding reused: an object on
	 * the ground moves *away* from the ground, darker on the cream and lighter
	 * on the dark, and `border` is the one token that does both from a single
	 * name. `surfaceAlt` would be the ground gradient's own middle stop.
	 *
	 * The `meta` edge is the shopping list checkbox's finding reused — a text
	 * token, because the strongest border in the palette falls under 3:1 on the
	 * surface it actually sits on.
	 *
	 * Every value is read off the theme, so a surface that is not the page
	 * ground needs its own trio rather than these. The drawer's, if the badge is
	 * ever wanted there, is `drawer.raised` / `drawer.inkMeta` /
	 * `drawer.inkMuted` — measured, and drawn on the boards.
	 */
	return (
		<span
			class={
				'relative -top-px shrink-0 inline-flex items-center rounded-full border ' +
				'font-sans font-bold uppercase leading-none tracking-[0.12em]'
			}
			style={{
				/*
				 * The gap belongs to the badge so a caller cannot get it wrong,
				 * and it is measured from the wordmark's advance width. It will
				 * read wider than it measures — *Larder Log* ends on an italic
				 * `g` whose rightmost ink is below the x-height, so the space
				 * beside the pill is largely empty at cap level. Do not tighten
				 * it to compensate: that collides the moment the wordmark is
				 * ever set roman.
				 */
				marginLeft: `${Math.round(set * 0.37)}px`,
				height: `${height}px`,
				padding: `0 ${Math.round(height * 0.39)}px`,
				fontSize: `${Math.round(height * 0.55)}px`,
				background: theme.border,
				borderColor: theme.textMuted,
				color: theme.text,
			}}
		>
			Beta
		</span>
	);
}
