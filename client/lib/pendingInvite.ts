/**
 * The invite code, held across the sign-in round trip.
 *
 * Someone who follows an invite link is, almost by definition, signed out. The
 * hosted sign-in navigates away and comes back, and nothing guarantees it
 * returns to the same query string — so the code is captured on first load,
 * put in `sessionStorage`, and stripped from the address bar.
 *
 * `sessionStorage` rather than `localStorage` on purpose: this is a bearer
 * credential with a job that ends the moment it is redeemed, and it should not
 * outlive the tab that received it. It is also the one exception to D25 that
 * isn't the theme override — but it stores a pending *action*, not app data,
 * which is why it is a stash and not state.
 */

import { readJoinCode, stripJoinParam } from '../../shared/joinLink';

const KEY = 'larder.pendingInvite';

/**
 * Captures a `?join=` code from the current URL into the stash.
 *
 * Called once from the client entry, before the sign-in gate decides anything,
 * so the code survives whatever the gate does next. Safe to call repeatedly:
 * with no code in the URL it leaves an existing stash alone.
 */
export function capturePendingInvite(): void {
	if (typeof location === 'undefined') return;

	const code = readJoinCode(location.search);

	if (! code) return;

	try {
		sessionStorage.setItem(KEY, code);
	} catch {
		// Private-mode storage refusal. The code is still readable from the URL
		// below until the visitor navigates, and the paste box remains.
	}

	// Drop the credential out of the address bar, the history entry, and any
	// screenshot taken after this point.
	const search = stripJoinParam(location.search);

	history.replaceState(null, '', `${location.pathname}${search}${location.hash}`);
}

/** The stashed code, or the one still in the URL if storage refused us. */
export function pendingInvite(): string | null {
	try {
		const stored = sessionStorage.getItem(KEY);

		if (stored) return stored;
	} catch {
		// Fall through to the URL.
	}

	return typeof location === 'undefined' ? null : readJoinCode(location.search);
}

/** Forgets the stash — after a redemption, or when the visitor declines. */
export function clearPendingInvite(): void {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// Nothing to clear.
	}
}
