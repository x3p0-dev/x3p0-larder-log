/**
 * Authorization.
 *
 * Zero has **no row-level security**, and the 2026-08-24 spike confirmed that
 * `id("table")` is not a foreign key either — a row pointing at a nonexistent
 * household inserts without complaint. So there is no backstop anywhere beneath
 * this file: if a check is missing here, nothing else catches it.
 *
 * Two rules every handler follows, from `docs/architecture.md`:
 *
 * 1. Never accept a `householdId` from the client as authority. Resolve it from
 *    `ctx.auth.userId`.
 * 2. Re-read before you write. Confirm a row's `householdId` matches the
 *    caller's before touching it.
 */

import type { AuthContext } from '@spacefast/zero/server';
import type { ReadDb, WriteDb } from './schema';
import { can, type Capability, type Role } from '../shared/roles';
import { resolveMembership, type Membership } from '../shared/membership';
import { isSignedIn } from '../shared/identity';

/**
 * Errors whose message is safe to show a user.
 *
 * The spike found that a thrown message is copied verbatim into the HTTP
 * response body (`detail` in an RFC 7807 payload), so **every string thrown
 * from a handler is user-visible**. Anything thrown deliberately says only what
 * the person needs to know and nothing about internals.
 */
export class AccessError extends Error {}

type AnyCtx = { auth: AuthContext; db: ReadDb | WriteDb };

/**
 * Re-exported so every handler imports its auth predicates from one module.
 *
 * The dev-guest bypass this rests on lives in `shared/identity.ts` — it is the
 * app's only authentication hole, so it is kept where it can be unit-tested.
 *
 * **Not yet confirmed inert in production.** D14's client-side bypass was
 * verified against the published space; this server-side one has not been. See
 * `docs/notes.md`.
 */
export { isSignedIn };


/** What a *query* gets back. Queries report; only mutations throw. */
export type MembershipState =
	| { kind: 'ok'; membership: Membership }
	| { kind: 'guest' }
	| { kind: 'none' }
	| { kind: 'blocked'; message: string };

/**
 * Resolves the caller's membership **without throwing**.
 *
 * Queries must use this. Zero's client emits `query.result` only on success —
 * there is no error path for a subscription — so a query that throws never
 * emits and `useQuery` returns its initial value forever, indistinguishable
 * from "still loading". A first-run user would sit on a blank screen with
 * nothing to route them to setup. Every expected condition is therefore a
 * value.
 */
export async function membershipState(ctx: AnyCtx): Promise<MembershipState> {
	if (! isSignedIn(ctx.auth)) return { kind: 'guest' };

	const rows = await ctx.db.memberships
		.withIndex('by_user', (range) => range.eq('userId', ctx.auth.userId))
		.collect();

	const resolved = resolveMembership(rows);

	if (resolved.kind === 'none') return { kind: 'none' };

	if (resolved.kind === 'many') {
		// D18: one household per user. More than one means the switcher shipped
		// without this check being revisited, and picking one silently would
		// land edits in an arbitrary household.
		return {
			kind: 'blocked',
			message:
				'Your account belongs to more than one household, which this version does not support.',
		};
	}

	return { kind: 'ok', membership: resolved.membership };
}

/**
 * Resolves the caller's single membership, or throws. **Mutations only.**
 *
 * Safe to throw here because a mutation's failure *does* reach the client — it
 * rejects the promise `useMutation` returned, with the message intact.
 *
 * Resolve-or-throw, not resolve-or-create: first-run household creation is its
 * own mutation, so this helper never has a write side.
 */
export async function requireMembership(ctx: AnyCtx): Promise<Membership> {
	const state = await membershipState(ctx);

	if (state.kind === 'guest') throw new AccessError('Sign in to use Larder Log.');
	if (state.kind === 'none') throw new AccessError('You are not a member of a household yet.');
	if (state.kind === 'blocked') throw new AccessError(state.message);

	return state.membership;
}

/** Resolves the caller's membership and asserts a capability on it. */
export async function requireCapability(
	ctx: AnyCtx,
	capability: Capability
): Promise<Membership> {
	const membership = await requireMembership(ctx);

	assertCan(membership.role, capability);

	return membership;
}

/** Asserts a capability against an already-resolved role. */
export function assertCan(role: Role, capability: Capability): void {
	if (! can(role, capability)) {
		throw new AccessError(deniedMessage(capability));
	}
}

/**
 * Confirms a row belongs to the caller's household before it is read or written.
 *
 * The row is passed in already fetched, so callers cannot forget the re-read.
 * A missing row and a row from another household produce the **same** message:
 * telling a stranger that an id exists but isn't theirs is a small leak with no
 * upside.
 */
export function assertInHousehold<T extends { householdId: string }>(
	row: T | null | undefined,
	membership: Membership,
	label = 'That item'
): T {
	if (! row || row.householdId !== membership.householdId) {
		throw new AccessError(`${label} no longer exists.`);
	}

	return row;
}

/** User-facing copy for a denied capability. */
function deniedMessage(capability: Capability): string {
	switch (capability) {
		case 'item:write':
			return 'You have view-only access to this pantry.';
		case 'taxonomy:write':
			return 'You have view-only access, so you cannot change locations, types, or stores.';
		case 'household:settings':
			return 'Only an owner can change household settings.';
		case 'invite:create':
			return 'You do not have permission to invite people.';
		case 'invite:revoke':
			return 'You do not have permission to manage invites.';
		case 'member:role':
			return 'Only an owner can change what someone can do.';
		case 'member:remove':
			return 'Only an owner can remove a member.';
		case 'household:delete':
			return 'Only an owner can delete a household.';
		default:
			return 'You do not have permission to do that.';
	}
}
