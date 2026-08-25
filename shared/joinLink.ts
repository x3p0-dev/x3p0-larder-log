/**
 * Invite links.
 *
 * The code travels in a **query parameter on the root path**, not in a path
 * segment. Spacefast serves one client entry at `/` and has no SPA fallback: a
 * deep link like `/join/ABC23DEFGH` is answered by the platform's own 404 page
 * before `client.js` is ever fetched, so Zero's `Router` can only route paths
 * the visitor is already on. `/?join=ABC23DEFGH` returns the app. See D28.
 *
 * Pure, so the same parse runs in the client entry (before sign-in, to stash
 * the code) and in tests. Nothing here touches `location` or storage — the
 * caller supplies the strings.
 */

import { isCodeShaped, normalizeCode } from './invite';

/** The query parameter an invite link carries. */
export const JOIN_PARAM = 'join';

/**
 * The link an owner shares.
 *
 * `origin` comes from the browser rather than a constant so the same code works
 * on `localhost:4173` and on the published space, and so a custom domain needs
 * no edit here (Phase 5).
 */
export function buildJoinUrl(origin: string, code: string): string {
	return `${origin.replace(/\/+$/, '')}/?${JOIN_PARAM}=${encodeURIComponent(code)}`;
}

/**
 * Reads a code out of a query string, or `null`.
 *
 * Accepts `?join=…` with or without the leading `?`. A value that isn't
 * code-shaped is treated as absent rather than passed along: an invalid code
 * reaching `redeemInvite` would only produce an error message about something
 * the visitor never typed.
 */
export function readJoinCode(search: string): string | null {
	const query = search.startsWith('?') ? search.slice(1) : search;

	for (const pair of query.split('&')) {
		if (! pair) continue;

		const eq = pair.indexOf('=');
		const key = eq === -1 ? pair : pair.slice(0, eq);

		if (decodeURIComponent(key) !== JOIN_PARAM) continue;

		const raw = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
		const code = normalizeCode(raw);

		return isCodeShaped(code) ? code : null;
	}

	return null;
}

/**
 * The same query string with the join parameter removed.
 *
 * The client rewrites the address bar with this once the code is stashed, so a
 * reload or a shared screenshot doesn't carry a live credential around. Returns
 * `''` when nothing is left, which is what `history.replaceState` wants.
 */
export function stripJoinParam(search: string): string {
	const query = search.startsWith('?') ? search.slice(1) : search;

	const kept = query
		.split('&')
		.filter((pair) => {
			if (! pair) return false;

			const eq = pair.indexOf('=');
			const key = eq === -1 ? pair : pair.slice(0, eq);

			return decodeURIComponent(key) !== JOIN_PARAM;
		});

	return kept.length ? `?${kept.join('&')}` : '';
}

/**
 * How an invite code is shown to a person: `ABC2 3DEF GH`.
 *
 * Grouped for reading aloud and retyping, which is the case the alphabet in
 * `invite.ts` was chosen for. `normalizeCode` strips the spaces back out, so
 * the grouped form can be pasted straight back in.
 */
export function formatCode(code: string): string {
	return (code.match(/.{1,4}/g) ?? []).join(' ');
}
