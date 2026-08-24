/**
 * Who counts as signed in.
 *
 * This is the server's half of D14. `sf dev` ships no sign-in flow, so
 * `isGuest` is permanently true locally; a strict guest check locks the app out
 * of its own development environment exactly the way D2's gate did on the
 * client before D14 opened a loopback hole in it.
 *
 * It lives in `shared/` rather than `server/` for one reason: it is the app's
 * only authentication bypass, and it should be unit-testable without a running
 * capsule. `shared/` imports nothing, so the tests are plain assertions.
 */

/** The subset of Zero's `AuthContext` this decision needs. */
export type IdentityLike = {
	userId: string;
	displayName: string;
	provider: string;
	isGuest: boolean;
	isAuthenticated: boolean;
};

/**
 * The exact identity `sf dev` hands every request.
 *
 * Safe to key on because it is **dev tooling, not the runtime**: the value is
 * produced by `zeroGuestAuth()` in the `spacefast` CLI's dev server and by the
 * client's own no-auth fallback. A published space's runtime supplies real
 * identities.
 *
 * Every field is matched, not just the id, so a coincidental `guest:local`
 * arriving from anywhere else still fails the check.
 */
export function isDevGuest(auth: IdentityLike): boolean {
	return (
		auth.isGuest &&
		auth.userId === 'guest:local' &&
		auth.provider === 'guest' &&
		auth.displayName === 'Local' &&
		! auth.isAuthenticated
	);
}

/**
 * Whether this caller may act as a person.
 *
 * The single place guest-ness is decided, so the bypass has one home rather
 * than a condition copied into every handler.
 */
export function isSignedIn(auth: IdentityLike): boolean {
	return Boolean(auth.userId) && (! auth.isGuest || isDevGuest(auth));
}
