/**
 * The app's identity in the browser chrome: title, icon, theme colour.
 *
 * Zero generates `index.html` from a fixed template that carries a title and
 * nothing else — no head hook, the same wall the webfonts hit (D31). So the
 * links go in the way the font stylesheet does: appended to `document.head` at
 * boot, which nothing in the compile pipeline can strip.
 *
 * The icons are **inlined as data URIs** rather than fetched from `/icons/`.
 * They total a few KB, which is cheaper than three requests, and it is the one
 * form that also works under `sf dev` — which serves no project static files at
 * all, so a favicon pointing at `/icons/…` would be a broken image locally and
 * correct only after a publish.
 *
 * **The SVG favicon is deliberately not linked.** A browser that accepts one
 * prefers it at every size including 16px, which is exactly the case
 * `favicon-16.png` exists for: Playfair's arm antialiases to grey below about
 * 20px, so that file is a separate hand-cut drawing snapped to whole pixels.
 * Linking the PNGs with explicit sizes lets the hand-cut 16 win where it should
 * and the rendered 32 take over above it.
 *
 * The title is set here too. The built shell takes it from `sf.jsonc#meta.title`
 * and gets it right, but `sf dev` serves its own shell with a hardcoded
 * "Spacefast Zero dev" and ignores that config — so the tab is wrong in the one
 * place we look at it all day.
 *
 * **To regenerate after an icon change**, from the project root:
 *
 * ```sh
 * python3 -c "import base64,sys; [print(f, len(base64.b64encode(open(f,'rb').read()))) for f in sys.argv[1:]]" \
 *   icons/favicon-16.png icons/favicon-32.png icons/apple-touch-icon.png
 * ```
 *
 * then paste each as `data:image/png;base64,<...>` below.
 */

/** Hand-cut at whole pixels — see the note above. */
const FAVICON_16 =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAb0lEQVR4nNSSwQmAMAxFv6FruIBLCN6cwBmdwJvoEDqADhILhRJqS1N66jsUAu+TksQwM4D3PpGjH0b7ktL2WvdcB0owspjmRZb7tv4DlDKidtih+EutBNzo/AzqOsg9BDuJBzTUnYYGckerxMofAAAA//8Xhc9dAAAABklEQVQDAAO6HSCoHPOSAAAAAElFTkSuQmCC';

/** Rendered from the outline; takes over from 20px up. */
const FAVICON_32 =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAACD0lEQVR4nOxWy0sbQRye2Z2kI3UjTdpLUq1QQtKKtKWth15Keyq0l/ZQ6KH/jhePikfBg1cVHxAQlBB84EHxHRXBN6LuZs3DrOts1p9Gg+xulqxuDoLfYZn9fjPfx2+G3fmIruvoCnpBSx/vqEpGVbIFpiLn4IjXS2u9NYIv8BJzpEjiooGSS4l7ybvpmsETrz8YobX+awMlmzrankdu40VDM3hwBY2J+0lUBUj7qyBOcicHbu2MARpTT9OHBB7m2sJScmZ2odzKpqbopw/NqAKAODnLWxi8jYYppe2dXYvLq7f5b1+//P/3OxQMosqgnMqcdn5mLvA8H37d+PPHdwP/98+vxlcNHg9BlQHE7ab6fIKBqasTkEPYGUAfBgZjjFw0cAWPBo8GD8CAczQbI+sPTZRkWT5xwUBHuiXfPxhLrm24YFCug9m5xRr6xLLk7AwsO9jc2l5eWUdlflPODCw76O7ptVliZ1BKNDaIJ6biiUkYMKY5NshkcwaGMXb7dSw+3trWURyrqvXFTjjeU9DOzQVJkgeHRwzkUGy05eO74jgxMd03ECuV8nnFLALi+HBzDlKXoWB/6Vui5fP7N5GwgaRPn+HUwUZG3EHVgRCo5wR/sJQj3QXIgjjsEg2EIqgKCISiIH4TfrMSJD3NpYgHMRvU4QBQKV2jy/jO0uKumr93fKeC73k95q4TyQUAAAD///A13LYAAAAGSURBVAMAl9nRQPpSCQIAAAAASUVORK5CYII=';

/** 180, full bleed. iOS applies its own rounding. */
const APPLE_TOUCH =
	'data:image/png;base64,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';

/** The oat ground the icon sits on — what a browser tints its chrome with. */
const THEME_COLOR = '#E2D5C0';

const TITLE = 'Larder Log';

const MARK = 'larder-log-icons';

function link(rel: string, href: string, extra?: Record<string, string>): HTMLLinkElement {
	const el = document.createElement('link');
	el.rel = rel;
	el.href = href;
	for (const [k, v] of Object.entries(extra ?? {})) el.setAttribute(k, v);
	return el;
}

/**
 * Install the title, icon links, and theme colour. Call once, before render.
 *
 * Idempotent by marker, so a hot reload does not stack a second set.
 */
export function installAppIcon(): void {
	if (typeof document === 'undefined') return;

	document.title = TITLE;

	if (document.querySelector(`[data-${MARK}]`)) return;

	const nodes: HTMLElement[] = [
		link('icon', FAVICON_16, { sizes: '16x16', type: 'image/png' }),
		link('icon', FAVICON_32, { sizes: '32x32', type: 'image/png' }),
		link('apple-touch-icon', APPLE_TOUCH),
	];

	const themeColor = document.createElement('meta');
	themeColor.name = 'theme-color';
	themeColor.content = THEME_COLOR;
	nodes.push(themeColor);

	/*
	 * **The page has to say it handles both schemes, at the document level.**
	 *
	 * Android Chrome's *Auto dark theme for web contents* rewrites colours on
	 * any page that has not opted in — and it is enabled per device, by a
	 * setting and by field trials, which is why two phones on the same Chrome
	 * build render this app differently. What it rewrites is `background-color`;
	 * what it leaves alone is `box-shadow`. That is exactly the shape of the
	 * colour-picker bug: sixteen swatches that occupy space, take a press and
	 * show their selection ring, with no fill.
	 *
	 * The app sets `color-scheme` on its own containers already, which is what
	 * resolves `light-dark()` in `theme.json`. That is **not** the same thing —
	 * the opt-out is read from the document, so an inline style on a `<div>`
	 * three levels down does not switch auto-darkening off. `light dark` here
	 * rather than the active theme: this declares which schemes the page
	 * *supports*, and the containers still decide which one is showing.
	 *
	 * Belongs with the icons because it is the same wall — Zero's shell has no
	 * head hook (D31), so anything in `<head>` is appended at boot or absent.
	 */
	const colorScheme = document.createElement('meta');
	colorScheme.name = 'color-scheme';
	colorScheme.content = 'light dark';
	nodes.push(colorScheme);

	for (const n of nodes) {
		n.setAttribute(`data-${MARK}`, '');
		document.head.appendChild(n);
	}
}
