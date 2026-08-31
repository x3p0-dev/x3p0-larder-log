/**
 * Who counts as signed in.
 *
 * **Rewritten on 2026-08-30, after the v15 leak.** The old rule was *a real
 * account, or the one identity `sf dev` issues* — and the second half turned
 * out to be a hole rather than a development affordance: **the hosted runtime
 * hands an unauthenticated caller `guest:local` / `Local` / `guest` / not
 * authenticated**, byte-identical to the dev server's. So anybody with a `curl`
 * against the published space passed this function, and `POST
 * /__spacefast/zero/run` needs no credentials. See *The dev-guest identity is
 * what production hands a stranger* in `.claude/CLAUDE.md`.
 *
 * It lives in `shared/` rather than `server/` for one reason: it is the app's
 * authentication rule, and it should be unit-testable without a running
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
 * The one guest name a published space can produce, and therefore the one that
 * is **never** signed in, whatever any environment variable says.
 *
 * `currentGuestName()` in `@spacefast/zero/dist/client.js` defaults to the
 * literal `'local'`, and the hosted runtime uses the same default — so
 * `guest:local` is what a stranger arrives as. Every other guest name can only
 * come from `sf dev`, which mints `guest:<name>` from a `?guest=` parameter
 * (`namedGuestAuth` in the CLI's `zero-dev-server.js`).
 *
 * **Verified against production on 2026-08-30**, which is the only evidence
 * that counts here: `?guest=alice`, `?stattic_zero_guest=alice` and
 * `?guest=local` on the live space all returned the *same* identity, so the
 * hosted runtime ignores the parameter and cannot be made to mint a named
 * guest. That is the whole foundation of `DEV_GUEST_PREFIX` below, and it is
 * the assumption to re-test if any of this is ever revisited.
 */
export const ANON_GUEST_NAME = 'local';

const GUEST_PREFIX = 'guest:';

/** The guest name in a `guest:<name>` id, or `''` for anything else. */
export function guestName(userId: string): string {
	return userId.startsWith(GUEST_PREFIX) ? userId.slice(GUEST_PREFIX.length) : '';
}

/**
 * The environment variable naming the guests `sf dev` may sign in as.
 *
 * Comma- or whitespace-separated names, **not** ids — `justin-7f3a91c2`, not
 * `guest:justin-7f3a91c2` — because the prefix is not a choice the person
 * writing the file gets to make wrong.
 *
 * **It ships to production and that is safe by construction.** `.env.server` is
 * the only env source the platform has (there is no `.env.development`, checked
 * on 2026-08-30), so this variable is uploaded whatever we do. It cannot open
 * anything, because a published space cannot mint the identities it names —
 * and `local`, the one it *can* mint, is refused below before the list is even
 * read.
 *
 * **Use unguessable names anyway.** The exclusion of `local` is the load-
 * bearing defence; the random suffix is the second one, and it is what makes
 * this survive the platform ever starting to honour `?guest=` in production.
 * Two independent things would then have to go wrong instead of one, which is
 * exactly what the old bypass did not have.
 */
export const DEV_GUESTS_VAR = 'LARDER_DEV_GUESTS';

/**
 * The names in that variable, with `local` dropped however it is written.
 *
 * The exclusion is here rather than at the call site so there is no way to read
 * the list without it — a rule enforced in one place cannot be forgotten in a
 * second.
 */
export function parseDevGuests(raw: string | undefined | null): string[] {
	if (! raw) return [];

	return raw
		.split(/[\s,]+/)
		.map((name) => (name.startsWith(GUEST_PREFIX) ? name.slice(GUEST_PREFIX.length) : name))
		.filter((name) => name.length > 0 && name !== ANON_GUEST_NAME);
}

/**
 * A named dev guest that the environment allows to act as a person.
 *
 * **False for every identity a published space can produce.** A real account is
 * not a guest and does not come through here; `guest:local` is excluded by
 * name; and no other guest name exists in production.
 */
export function isDevGuest(auth: IdentityLike, raw: string | undefined | null): boolean {
	if (! auth.isGuest || auth.isAuthenticated) return false;

	const name = guestName(auth.userId);

	if (! name || name === ANON_GUEST_NAME) return false;

	return parseDevGuests(raw).indexOf(name) !== -1;
}

/**
 * Whether this caller may act as a person.
 *
 * **A real account is the only thing this is true of on the published space**,
 * which is the requirement: an authenticated user, then the household rules on
 * top. `isAuthenticated` and `! isGuest` are both required rather than either —
 * the runtime sets both together, and requiring both means a future identity
 * that sets only one is refused rather than admitted.
 *
 * The second branch exists so the app can be developed at all: `sf dev` ships
 * no sign-in flow, so without it nothing local is ever signed in and the whole
 * app is unreachable in the one environment anybody can click in. It is
 * narrowed to named guests that the environment lists, and it is unreachable in
 * production — see `ANON_GUEST_NAME`.
 */
export function isSignedIn(auth: IdentityLike, devGuests: string | undefined | null): boolean {
	if (! auth.userId) return false;

	if (! auth.isGuest && auth.isAuthenticated) return true;

	return isDevGuest(auth, devGuests);
}
