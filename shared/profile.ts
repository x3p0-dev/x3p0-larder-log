/**
 * The account's own name.
 *
 * Gravatar is the identity provider, but a lot of accounts arrive through the
 * my.spacefast.com signup carrying no profile name at all — and the ones that
 * do carry a name did not choose it here. So Larder Log collects its own
 * **display name**, once, and stores it on the account rather than on a
 * household: it is the single thing the rest of a household sees, and asking
 * for it again per pantry would be asking the same question twice.
 *
 * In `shared/` because both halves need the same rule. The server refuses a
 * blank one and the client disables *Continue* on the same normalization, so
 * "what counts as a name" is written down once.
 */

/**
 * Longest a display name may be, matching `MAX_NAME` for terms and items.
 *
 * Deliberately the same number rather than a shorter one: every place this
 * renders — the Members row, the drawer's account row, the invite card's
 * inviter line — already truncates, and a person's name is not the app's to
 * shorten more aggressively than the things they name.
 */
export const MAX_DISPLAY_NAME = 60;

/**
 * Trims and collapses whitespace, then truncates.
 *
 * Returns `''` for anything unusable, which is how every caller detects a name
 * that is not a name — the server throws on it and the client keeps *Continue*
 * disabled.
 */
export function normalizeDisplayName(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.trim().replace(/\s+/g, ' ').slice(0, MAX_DISPLAY_NAME);
}

/** A display name is usable when it survives normalization. */
export function isValidDisplayName(value: unknown): boolean {
	return normalizeDisplayName(value).length > 0;
}

/**
 * The first candidate that is actually a name.
 *
 * The fallback chain has three links and both halves of the app walk it, in the
 * same order and for the same reason:
 *
 * - the **profile** row, which is the answer whenever it exists;
 * - a **membership**, whose `displayName` is a snapshot of the Gravatar name the
 *   account joined under — the only thing an account predating this table has,
 *   and why those accounts are never sent through the first-run screen;
 * - the **identity**, which is what a brand-new account has and nothing else.
 *
 * Returns `''` when every link is empty, which is a real state: an account can
 * reach the app with no name anywhere, and that is exactly the case the
 * first-run screen exists for.
 */
export function pickDisplayName(...candidates: unknown[]): string {
	for (const candidate of candidates) {
		const name = normalizeDisplayName(candidate);

		if (name) return name;
	}

	return '';
}
