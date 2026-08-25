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
 * Weight axes, not just the defaults: Fraunces and Inter are variable, so one
 * request covers `font-semibold` too. IBM Plex Mono has no variable build, so
 * 400 and 600 are named explicitly — the two weights the mono utilities pair
 * with. `display=swap` because the fallbacks are a generic serif and a generic
 * monospace; a first visit that quietly kept them would not look like this app.
 *
 * The family names must keep matching the `theme.json` literals exactly. That
 * is the entire contract between these two files.
 */
const HREF =
	'https://fonts.googleapis.com/css2' +
	'?family=Fraunces:opsz,wght@9..144,100..900' +
	'&family=IBM+Plex+Mono:wght@400;600' +
	'&family=Inter:opsz,wght@14..32,100..900' +
	'&display=swap';

/*
 * The stylesheet lives on `fonts.googleapis.com` but every `src` inside it
 * points at `fonts.gstatic.com`, so the second host is worth warming while the
 * first is still being fetched. Font requests are CORS-mode even when they
 * look same-origin, hence `crossorigin` — a preconnect without it opens a
 * connection the font fetch cannot reuse.
 */
const PRECONNECT = 'https://fonts.gstatic.com';

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

	const warm = document.createElement('link');
	warm.rel = 'preconnect';
	warm.href = PRECONNECT;
	warm.crossOrigin = '';
	document.head.appendChild(warm);

	const sheet = document.createElement('link');
	sheet.id = LINK_ID;
	sheet.rel = 'stylesheet';
	sheet.href = HREF;
	document.head.appendChild(sheet);
}
