/**
 * Authorization.
 *
 * Zero has **no row-level security**, and the 2026-08-24 spike confirmed that
 * `id("table")` is not a foreign key either — a row pointing at a nonexistent
 * household inserts without complaint. So there is no backstop anywhere beneath
 * this file: if a check is missing here, nothing else catches it.
 *
 * Two rules every handler follows, from `.docs/architecture.md`:
 *
 * 1. A `householdId` from the client is a **selector, never an authority**.
 *    Since D33 a caller may belong to several households, so one has to be
 *    named — but naming it proves nothing. Every handler looks the id up among
 *    the caller's own memberships (`ctx.auth.userId`) and works from the row it
 *    finds, or refuses. An id the caller is not a member of resolves to
 *    nothing, which is exactly what an id belonging to a stranger does.
 * 2. Re-read before you write. Confirm a row's `householdId` matches the
 *    caller's before touching it.
 */

import type { AuthContext } from '@spacefast/zero/server';
import type { ReadDb, WriteDb } from './schema';
import { can, type Capability, type Role } from '../shared/roles';
import { findMembership, selectMembership, type Membership } from '../shared/membership';
import { DEV_GUESTS_VAR, isSignedIn } from '../shared/identity';
import { ADMIN_HELD_REFUSAL, ADMIN_IDS_VAR, adminWritesHeldFor, isAdminUser } from '../shared/admin';

/**
 * Errors whose message is safe to show a user.
 *
 * The spike found that a thrown message is copied verbatim into the HTTP
 * response body (`detail` in an RFC 7807 payload), so **every string thrown
 * from a handler is user-visible**. Anything thrown deliberately says only what
 * the person needs to know and nothing about internals.
 */
export class AccessError extends Error {}

type AnyCtx = { auth: AuthContext; db: ReadDb | WriteDb; env: Record<string, string | undefined> };

/**
 * Re-exported so every handler imports its auth predicates from one module.
 *
 * The rule this rests on lives in `shared/identity.ts` — it is the app's
 * authentication decision, so it is kept where it can be unit-tested.
 *
 * **`signedIn(ctx)` is what handlers call, not `isSignedIn(auth)`.** The rule
 * needs the environment now — the dev-guest allowance is a list in
 * `LARDER_DEV_GUESTS` — and threading `ctx.env` through fifty call sites by
 * hand is how one of them ends up passing the wrong thing. One helper, one
 * reader of the variable.
 */
export { isSignedIn };

/** The signed-in check every handler uses. Reads the allowance from `ctx.env`. */
export function signedIn(ctx: { auth: AuthContext; env: Record<string, string | undefined> }): boolean {
	return isSignedIn(ctx.auth, ctx.env[DEV_GUESTS_VAR]);
}


/**
 * Asserts the caller administers the whole space. **Mutations only.**
 *
 * The console's read side answers `{ state: 'denied' }` instead, because a
 * query that throws never emits and is indistinguishable from loading. A
 * mutation's rejection does reach the client, message intact, so this throws.
 *
 * **It is the only authorization in the capsule that is not about a
 * membership.** Every other check in this file resolves the caller's own row in
 * the household they named and works from what it finds — an id is a selector,
 * never an authority. An administrator has no row in the household they are
 * acting on and usually never will, so there is nothing to resolve: the whole
 * check is *are you on the list*, and the list is `LARDER_ADMIN_IDS` in the
 * server environment (D62).
 *
 * That makes this the single most load-bearing line in `server/`. Everything
 * behind it reaches into households belonging to people who are not in the
 * room, so `shared/admin.ts` is fail-closed in every direction and is unit
 * tested for each of them.
 *
 * The message names no console. Someone who reaches a console mutation without
 * the flag either guessed the name or is holding a stale client, and neither is
 * owed confirmation that the surface exists — the same instinct that makes a
 * revoked invite and an unknown one the same screen (D39).
 */
export function requireAdmin(ctx: { auth: AuthContext; env: Record<string, string | undefined> }): void {
	if (! administers(ctx)) {
		throw new AccessError('You do not have permission to do that.');
	}
}

/**
 * The administrator check every handler uses — `signedIn`'s twin.
 *
 * Both variables are read here and nowhere else, for the same reason: a rule
 * that needs two environment lookups is a rule that gets one of them wrong at
 * the eighth call site.
 */
export function administers(ctx: { auth: AuthContext; env: Record<string, string | undefined> }): boolean {
	return isAdminUser(ctx.auth, ctx.env[ADMIN_IDS_VAR], ctx.env[DEV_GUESTS_VAR]);
}

/**
 * The same check, plus *and writes are switched on* — what all six console
 * mutations call.
 *
 * **A separate function rather than a line inside `requireAdmin`**, because the
 * two refusals are different facts and must not share a sentence: one says you
 * are not an administrator, the other says nobody is writing anything today.
 * Collapsing them would send an administrator to `LARDER_ADMIN_IDS` looking for
 * a problem that is not there.
 *
 * **The order matters and is the fail-closed one.** Admin first, so a stranger
 * poking at mutation names learns only that they lack permission — telling them
 * the console's writes are *temporarily* on hold would confirm the console
 * exists, which is exactly what `requireAdmin`'s own message is careful not to
 * do (D39's instinct again).
 *
 * This is the whole server half of the hold. There is no per-mutation flag,
 * because `requireAdmin` is already the one line every console write begins
 * with and a second list of six would be a list that goes stale.
 */
export function requireAdminWrite(ctx: { auth: AuthContext; env: Record<string, string | undefined> }): void {
	requireAdmin(ctx);

	if (adminWritesHeldFor(ctx.auth)) throw new AccessError(ADMIN_HELD_REFUSAL);
}

/** What a *query* gets back. Queries report; only mutations throw. */
export type MembershipState =
	| { kind: 'ok'; membership: Membership }
	| { kind: 'guest' }
	| { kind: 'none' };

/** Every membership the caller holds. The one database read both paths share. */
async function membershipsOf(ctx: AnyCtx) {
	return ctx.db.memberships
		.withIndex('by_user', (range) => range.eq('userId', ctx.auth.userId))
		.collect();
}

/**
 * Resolves the household a query should answer for, **without throwing**.
 *
 * Queries must use this. Zero's client emits `query.result` only on success —
 * there is no error path for a subscription — so a query that throws never
 * emits and `useQuery` returns its initial value forever, indistinguishable
 * from "still loading". A first-run user would sit on a blank screen with
 * nothing to route them to setup. Every expected condition is therefore a
 * value.
 *
 * `preferredHouseholdId` is the household the client believes it is showing. It
 * is honored only if the caller is a member of it, and quietly replaced with a
 * default otherwise — see `selectMembership` for why a read heals here where a
 * write refuses.
 */
export async function membershipState(
	ctx: AnyCtx,
	preferredHouseholdId?: string | null
): Promise<MembershipState> {
	if (! signedIn(ctx)) return { kind: 'guest' };

	const resolved = selectMembership(await membershipsOf(ctx), preferredHouseholdId);

	if (resolved.kind === 'none') return { kind: 'none' };

	return { kind: 'ok', membership: resolved.membership };
}

/**
 * Resolves the caller's membership **in the household they named**, or throws.
 * **Mutations only.**
 *
 * Safe to throw here because a mutation's failure *does* reach the client — it
 * rejects the promise `useMutation` returned, with the message intact.
 *
 * Resolve-or-throw, not resolve-or-create: first-run household creation is its
 * own mutation, so this helper never has a write side.
 */
export async function requireMembership(
	ctx: AnyCtx,
	householdId: string
): Promise<Membership> {
	if (! signedIn(ctx)) throw new AccessError('Sign in to use Larder Log.');

	const rows = await membershipsOf(ctx);

	if (rows.length === 0) throw new AccessError('You are not a member of a household yet.');

	if (! householdId) throw new AccessError('No household was named for that change.');

	const membership = findMembership(rows, householdId);

	// One message whether the household is gone, was never theirs, or is one
	// they were just removed from. Which of the three it is would tell a
	// stranger something about ids they do not own.
	if (! membership) throw new AccessError('You are no longer a member of that household.');

	return membership;
}

/** Resolves the caller's membership in a household and asserts a capability. */
export async function requireCapability(
	ctx: AnyCtx,
	householdId: string,
	capability: Capability
): Promise<Membership> {
	const membership = await requireMembership(ctx, householdId);

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
