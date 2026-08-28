/**
 * An account's avatar URL, as a value the app is willing to store and render.
 *
 * The source is `ctx.auth.picture`, which the platform derives from the
 * identity's Gravatar. It is not a colour token and not an id — it is a URL that
 * ends up in an `<img src>` on somebody else's screen, which is the whole reason
 * it goes through a rule instead of straight into the column.
 *
 * In `shared/` because both halves need the same answer: the server decides what
 * to write, and the client decides whether what came back is worth rendering. A
 * row written before this column existed holds `''` and always will (D44's rule
 * — nothing backfills), so *every* reader has to handle the empty case anyway.
 */

/**
 * The URL, or `''` for none.
 *
 * **`https:` only, and that is the point of the function.** The value is written
 * by a mutation and rendered as an image source, so `javascript:` and `data:`
 * are refused here rather than trusted to be impossible upstream. The platform
 * would never send either; the column is permanent and the check is one line.
 *
 * Length is capped because a string column has no ceiling of its own and a URL
 * that long is a mistake in any case. Gravatar's own form is ~90 characters.
 */
export function normalizeAvatarUrl(url: string | undefined | null): string {
	const trimmed = (url ?? '').trim();

	if (! trimmed || trimmed.length > 512) return '';

	// `startsWith` rather than a parse: the runtime has no `URL` guarantee, and
	// the only shape worth accepting is the one the platform emits.
	return trimmed.startsWith('https://') ? trimmed : '';
}
