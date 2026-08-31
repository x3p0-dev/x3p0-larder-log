/**
 * `?admin` — the console's deep link.
 *
 * **It is a query parameter and not a path, and that is forced.** The published
 * space serves nothing at an unknown path: `sf publish --dry-run` reports
 * `SPA false`, which is the same fact that made an invite link `/?join=<code>`
 * rather than `/join/<code>` (D28). So `/admin` never reaches the app at all —
 * the edge answers it before we are asked.
 *
 * That is a better answer than the one the design draws. Board 8 asks for the
 * app's own 404 at `/admin` on the grounds that a 403 would confirm the console
 * exists and that there is a flag worth getting; an edge 404 for a path that is
 * not routed says even less, and says it identically to everybody — including
 * to an administrator who typed it. Nothing here is a decision we get to make
 * wrong.
 *
 * **This is not a gate.** It reads a URL, and a URL is not authorization. Every
 * console query re-checks `isAdminUser` server-side, so arriving here with the
 * parameter set and no flag opens a pane whose sections answer `denied` and
 * draw nothing. The account menu's row is the honest way in; this exists so a
 * reload lands where you were and so the console can be reached from a
 * bookmark.
 *
 * The parameter is read **once per page load** and never written — the app has
 * no router and pushes no history, and a console that rewrote the address bar
 * on every section change would be inventing one.
 */
const PARAM = 'admin';

export function adminDeepLink(): boolean {
	if (typeof location === 'undefined') return false;

	try {
		return new URLSearchParams(location.search).has(PARAM);
	} catch {
		// A malformed query string is not a reason to fail to render the app.
		return false;
	}
}
