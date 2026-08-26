/*
 * Zero has no way to declare a webfont, so the app declares its own.
 *
 * This is normally one line of HTML or one line of CSS. Zero gives you
 * neither file: `theme.json`'s `fontFace` block is discarded by the compiler
 * without a warning, the `index.html` is generated from a fixed template with
 * no head hook, and there is no CSS entry point (`@plugin` / `@config` are
 * rejected). What the compiler *does* emit is the token:
 *
 *   --font-disp: var(--wp--preset--font-family--disp, Fraunces, ui-serif, …);
 *
 * That is a complete `font-family` stack already — the browser just has
 * nowhere to find "Fraunces". A stylesheet link is a DOM node, and nothing in
 * the compile pipeline touches those, so we append one at boot and the
 * existing `font-disp` / `font-sans` / `font-mono` utilities light up.
 *
 * Served by Google rather than self-hosted from `fonts/`, because `sf dev`
 * does not serve project static files at all — it answers every unrecognized
 * path with the SPA shell, so a self-hosted face is invisible in local
 * development and only appears in production. A remote URL behaves the same in
 * both. See D31.
 */

/*
 * **The full variable axis of both display and body faces, roman and italic.**
 *
 * `400..900` is Playfair Display's entire range — it has no lighter cut — and
 * asking for the range rather than a list of stops is what makes Google serve
 * the *variable* font: one file per subset covering every weight in between,
 * rather than one file per stop. So `font-weight: 537` is as available as 700,
 * which is what makes weight worth experimenting with in a browser at all.
 *
 * Italic is not optional here. The design uses Playfair italic for the
 * wordmark's second half and for the empty state's prose, so a
 * browser-synthesised slant — which is what a roman-only request would get you
 * — would be visibly wrong on a Didone, where the italic is a different
 * drawing rather than a sheared one.
 *
 * IBM Plex Mono is **interim**. The Cellar spec has no monospace at all — its
 * role (uppercase section labels, 10.5px / 0.15em) belongs to Karla now. The
 * reskin took `font-mono` from 35 sites to ten, the flows outside the shell
 * took it to four, and the shopping list took it to **two**: `ShoppingListModal`
 * is deleted. What is left is the switcher's invite-code field and one loading
 * string in `Pantry`. The code field is arguably a real monospace use and may
 * survive on merit; the loading string comes out with the surface it is on.
 *
 * `display=swap` because the fallbacks are a generic serif and a generic sans;
 * a first visit that quietly kept them would not look like this app.
 *
 * The family names must keep matching the `theme.json` literals exactly. That
 * is the entire contract between these two files.
 */
const HREF =
	'https://fonts.googleapis.com/css2' +
	'?family=IBM+Plex+Mono:wght@400;600' +
	'&family=Karla:ital,wght@0,200..800;1,200..800' +
	'&family=Playfair+Display:ital,wght@0,400..900;1,400..900' +
	'&display=swap';

/*
 * Two hosts, warmed differently, and the difference is not cosmetic.
 *
 * The stylesheet lives on `fonts.googleapis.com`; every `src` inside it points
 * at `fonts.gstatic.com`. That is a serial chain — the browser cannot even
 * learn the font URLs until the CSS has landed — so both connections are worth
 * opening at once.
 *
 * **`crossorigin` on the second only.** A font fetch is CORS-mode even when it
 * looks same-origin, so a preconnect without the attribute opens a connection
 * it cannot reuse. The stylesheet is an ordinary CSS request, and adding
 * `crossorigin` there would open a *second* connection for the same reason,
 * inverted. Getting either one wrong costs a whole round trip and looks like
 * nothing at all.
 */
const PRECONNECT: { href: string; cors: boolean }[] = [
	{ href: 'https://fonts.googleapis.com', cors: false },
	{ href: 'https://fonts.gstatic.com', cors: true },
];

const LINK_ID = 'larder-log-fonts';

/**
 * Install the app's webfonts. Call once, before the first render.
 *
 * Idempotent by id, so a reload that re-runs the entry module does not stack a
 * second copy of the link.
 */
export function installFonts(): void {
	if (typeof document === 'undefined') return;
	if (document.getElementById(LINK_ID)) return;

	for (const { href, cors } of PRECONNECT) {
		const warm = document.createElement('link');
		warm.rel = 'preconnect';
		warm.href = href;

		if (cors) warm.crossOrigin = '';

		document.head.appendChild(warm);
	}

	const sheet = document.createElement('link');
	sheet.id = LINK_ID;
	sheet.rel = 'stylesheet';
	sheet.href = HREF;
	document.head.appendChild(sheet);
}
