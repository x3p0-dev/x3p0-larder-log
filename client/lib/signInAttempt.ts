/**
 * A note that this tab sent someone to the sign-in screen and is waiting for
 * them back.
 *
 * Zero's sign-in is a **full-page redirect**, not a popup: `hostedSignIn`
 * calls `location.assign` and the app is torn down. So there is no promise to
 * await and no error to catch — the only two things that can happen are that
 * the page comes back signed in, or that it comes back a guest, and nothing in
 * the auth value distinguishes the second from a visitor who never pressed
 * anything.
 *
 * This is what distinguishes them, and it is the whole reason the handoff can
 * have a third state at all. `sessionStorage` for the same reason as the
 * pending invite: it belongs to the tab that started the attempt and has no
 * business outliving it.
 */

const KEY = 'larder.signInAttempt';

/**
 * How long a marker stays meaningful.
 *
 * Without a window, a tab left open through an abandoned attempt would greet
 * its next reload with the failure card instead of the marketing page. Fifteen
 * minutes is longer than any real sign-in round trip and shorter than anyone's
 * patience with a screen they didn't ask for.
 */
const MAX_AGE_MS = 15 * 60 * 1000;

/** Called immediately before the redirect, so the return trip can be read. */
export function markSignInAttempt(): void {
	try {
		sessionStorage.setItem(KEY, String(Date.now()));
	} catch {
		// Private-mode refusal. The handoff still works; only the failure
		// state is lost, and it degrades to the marketing page.
	}
}

/** True when this tab is waiting on a sign-in it started recently. */
export function signInAttemptPending(): boolean {
	try {
		const at = Number(sessionStorage.getItem(KEY));

		return Number.isFinite(at) && at > 0 && Date.now() - at < MAX_AGE_MS;
	} catch {
		return false;
	}
}

/** Forgets the attempt — on arrival signed in, or when the visitor retries. */
export function clearSignInAttempt(): void {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// Nothing to clear.
	}
}
