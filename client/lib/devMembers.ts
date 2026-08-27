/**
 * `?members` — two stand-in members, so the Members panel can be *seen* locally.
 *
 * `sf dev` issues one fixed identity, so a household always has exactly one
 * member and every control that acts on somebody else — the role chips, the
 * remove button, the last-owner guard — is unreachable in the one environment
 * anybody can click in. That is how the remove button shipped with a hover that
 * was the same colour as the row underneath it.
 *
 * The same shape as `?signedout` in `client/index.tsx`, and for the same
 * reasons: **loopback only**, one page load, and ignored everywhere else. It
 * differs in one way worth naming — `?signedout` only ever *removes* access,
 * while this one adds rows — so it is fenced twice more:
 *
 * - The rows exist **only in the client's render**. Nothing writes them, and no
 *   query returns them.
 * - Every mutation that names one is refused *before* it reaches the network,
 *   by `isDevMember`. A stand-in id can never be an argument to `changeRole` or
 *   `removeMember`, so the server is never asked about an id it has no row for.
 *
 * **Two things are not testable under it**, because *Leave household* and
 * *Delete household* both read the padded list: leaving is blocked by the
 * last-owner guard, and deleting needs a member count of one. Promote a
 * stand-in to Owner and leaving becomes pressable — the server refuses it
 * anyway, against the real member list, which is the check that matters.
 *
 * Take it out with D14, alongside `?signedout` and the loopback gate itself.
 */

import type { Member } from '../../shared/types';

/** Shared with `client/index.tsx`. See the note on `isLoopback` there. */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/**
 * The prefix that marks a row as fictional.
 *
 * A real membership id is a v4 UUID under `sf dev` and a sequential integer on
 * the hosted runtime (neither can collide with this), and the guard below is
 * what makes the prefix load-bearing rather than decorative.
 */
const DEV_PREFIX = 'dev-member:';

export function devMembersEnabled(): boolean {
	if (typeof location === 'undefined') return false;
	if (! LOOPBACK_HOSTS.includes(location.hostname)) return false;

	return new URLSearchParams(location.search).has('members');
}

/**
 * An editor and a viewer, which is the pair that exercises the panel.
 *
 * Both are non-owners on purpose: with the dev guest holding the only `owner`
 * row, `wouldStrandHousehold` returns false for each of these, so the role
 * chips and the remove button are *live* rather than disabled — which is the
 * state that needed looking at. Promote one to Owner in the panel and the
 * last-owner guard on the dev guest's own row turns on, which is the other
 * state worth seeing.
 */
export const DEV_MEMBERS: readonly Member[] = [
	{ id: `${DEV_PREFIX}editor`, userId: 'dev:rowan', displayName: 'Rowan Ash', role: 'editor' },
	{ id: `${DEV_PREFIX}viewer`, userId: 'dev:sedge', displayName: 'Sedge Miller', role: 'viewer' },
];

/** Whether this membership id is one of the stand-ins, and must not be sent anywhere. */
export function isDevMember(membershipId: string): boolean {
	return membershipId.startsWith(DEV_PREFIX);
}
