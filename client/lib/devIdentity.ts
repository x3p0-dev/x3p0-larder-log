/**
 * A real avatar for the dev guest, so the four places an account's picture is
 * drawn can be *looked at* locally.
 *
 * `sf dev` ships no sign-in flow, so its identity carries no email and no
 * `picture` (D14) — which means the `<img>` branch of `Avatar` and
 * `DrawerAvatar` never runs in the one environment anybody can click in. Every
 * local look at the drawer's foot row, the rail, the account menu and the
 * first-run card has been the initial-on-a-fill fallback, and the picture only
 * appears after a publish.
 *
 * Same shape and same fences as `?signedout` in `client/index.tsx` and
 * `?members` in `./devMembers.ts`: **loopback only**, read once per page load,
 * ignored everywhere else. It is inert in production twice over — the hostname
 * check, and the fact that `devGuest` is the only caller and can never be true
 * on a hosted space.
 *
 * Take it out with D14, alongside the other two.
 */

import { sha256Hex } from '../../shared/sha256';

/** Shared with `client/index.tsx`. See the note on `isLoopback` there. */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * The address the dev guest stands in for. Justin's, because the whole point is
 * an avatar that actually resolves — a made-up address returns nothing and
 * leaves us exactly where we started.
 *
 * Override per load with `?gravatar=<address>`, and pass `?gravatar=none` (or an
 * empty value) to preview the **initial** fallback, which is the branch a real
 * account with no Gravatar gets and is otherwise just as unreachable.
 *
 * **It is hashed and never shown.** The dev guest's `email` stays `''`, because
 * a real account's is `''` too: `auth.email` is nothing but the identity token's
 * `email` claim, and the Spacefast account token does not carry one — the SDK
 * prefers `pairwise_sub` for the user id and derives the Gravatar profile from
 * the avatar hash rather than the address, which is a deliberate privacy stance.
 * So the account row shows a name and a face in production and never an email,
 * and a dev guest that showed one would make this switch lie about the very
 * layout it exists to preview.
 */
const DEV_GRAVATAR_EMAIL = 'justintadlock@gmail.com';

function loopback(): boolean {
	return typeof location !== 'undefined' && LOOPBACK_HOSTS.includes(location.hostname);
}

/** The address to hash, or `''` for none. Loopback only, and never rendered. */
function devGravatarEmail(): string {
	if (! loopback()) return '';

	const override = new URLSearchParams(location.search).get('gravatar');

	if (override === null) return DEV_GRAVATAR_EMAIL;
	if (override === '' || override === 'none') return '';

	return override.trim();
}

/**
 * The dev guest's avatar URL, in **the platform's own shape** — the query is
 * `@spacefast/common`'s `GRAVATAR_AVATAR_QUERY` verbatim, so what renders here
 * is what `auth.picture` will render in production rather than a lookalike.
 * `d=404` included: an address with no Gravatar serves no image at all, which is
 * the behaviour the initial fallback exists for.
 *
 * Hashed with `shared/sha256.ts` rather than WebCrypto — the platform's own
 * helper is async and returns null without `crypto.subtle`, and this has to
 * resolve during the render that decides what to pass `Pantry`.
 */
export function devGuestPicture(): string | undefined {
	const email = devGravatarEmail().toLowerCase();

	if (! email) return undefined;

	return `https://gravatar.com/avatar/${sha256Hex(email)}?d=404&r=g&s=160`;
}
