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
 * row written before this column existed reads back as **`null`**, not the
 * schema's `''` — a `.default()` applies to an insert and nothing backfills
 * (D44) — so every reader has to handle both, and the generated row type says
 * `string` either way. Reading that `null` as 'the query has not answered' is
 * what kept `syncAccountAvatar` from ever being called; see
 * `client/hooks/useAvatarSync.ts`.
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

/**
 * The dev guest's avatar hash, so `memberships.picture` is populated under
 * `sf dev` and every surface that reads that column can be *looked at* locally.
 *
 * `sf dev`'s `namedGuestAuth` returns five fields and no `picture`, so
 * `accountAvatar()` writes `''` for every local membership — which leaves the
 * drawer's foot row (drawn from the client's own `devGuestPicture()`) showing a
 * face while the Members pane, the Settings trio and all four admin surfaces
 * show letters. That reads as an intermittent bug and is a missing dev switch.
 *
 * Same fence as the other four: it can only ever apply to a **named dev guest**,
 * an identity a published space cannot mint — which is the same guarantee
 * `adminWritesHeldFor()` already relies on to keep household deletion testable
 * here and unreachable live. Take it out with D14.
 *
 * **A hash, never an address.** `client/lib/devIdentity.ts` hard-codes an email
 * and hashes it at boot; this is the finished digest of the same account, read
 * off the published space's own `auth.picture`, so nothing here needs
 * `shared/sha256.ts` and no address is compiled into the capsule. It is equal
 * to what that file hashes at boot — checked, and it has to stay that way: if
 * the two drifted, the drawer's face and the Members pane's would be different
 * images and `useAvatarSync` would write on every load instead of settling.
 *
 * It reveals rather than invents: `ctx.auth.picture` **is** populated on the
 * hosted runtime — confirmed against the live space on 2026-08-31 — so this
 * previews the value production really writes.
 */
const DEV_AVATAR_HASH =
	'8013a62d7397c006bae48b96d6832a573ea71a7d5d3597fe584210567b508c05';

/**
 * The avatar a dev guest stands in for, or `''` for everybody else.
 *
 * Only the guest whose name begins `justin` gets one, deliberately: a household
 * of five identical faces is a worse preview than the mixed row a real one is,
 * and the letter fallback is the branch an account with no Gravatar takes.
 *
 * @param name The guest's name, already stripped of its `guest:` prefix, or
 *             `''` when the caller is not a dev guest at all.
 */
export function devAvatarUrl(name: string): string {
	if (! name.startsWith('justin')) return '';

	// The platform's own query shape, so what renders locally is what
	// `auth.picture` renders live rather than a lookalike. `d=404` included:
	// it is what makes the initial fallback reachable.
	return `https://gravatar.com/avatar/${DEV_AVATAR_HASH}?d=404&r=g&s=160`;
}
