/**
 * Which household a request is about, as pure functions.
 *
 * D18 gave every user exactly one household and this file enforced it. D33
 * replaced that: a user may belong to several, so *choosing* one is now a real
 * decision with two different answers depending on who is asking.
 *
 * - A **query** is a read, and a stale selection should heal rather than dead-
 *   end, so `selectMembership` falls back to a deterministic default.
 * - A **mutation** is a write, and a write must never land in a household the
 *   caller did not name, so `findMembership` matches exactly or returns null.
 *
 * The database read stays in the handler; the decision lives here so it can be
 * tested without a server and can never be quietly re-implemented as `.first()`
 * at a second call site.
 */

import { toRole, type Role } from './roles';

/** The fields of a `memberships` row this rule needs. */
export type MembershipLike = {
	id: string;
	householdId: string;
	userId: string;
	role: string;
};

/**
 * The narrower shape the last-owner rule needs — no household id, no user id.
 *
 * Kept separate so the *client* can ask the same question of the member list
 * the `household` query hands it, which carries no `householdId` per row (it is
 * one household by construction). A rule the client re-implements to grey out a
 * button is a rule that drifts from the one the server enforces.
 */
export type RoleBearing = {
	id: string;
	role: string;
};

export type Membership = {
	id: string;
	householdId: string;
	userId: string;
	role: Role;
};

export type MembershipResolution =
	| { kind: 'none' }
	| { kind: 'one'; membership: Membership };

/**
 * Widens a stored row into a `Membership`.
 *
 * An unrecognized stored role degrades to the least privileged value rather
 * than throwing: a corrupt row should lock someone out, never hand them access
 * they were never granted.
 */
function toMembership(row: MembershipLike): Membership {
	return {
		id: row.id,
		householdId: row.householdId,
		userId: row.userId,
		role: toRole(row.role),
	};
}

/**
 * The household a **query** should answer for: the one asked for, or a stable
 * default when the request names none — or names one the caller has since been
 * removed from.
 *
 * The fallback is what makes a stale device selection self-healing. The client
 * stores the id it last looked at (per device, D33); memberships change from
 * other devices and other people. Blocking on a mismatch would strand someone
 * who was simply removed from one of their households, so the query answers for
 * a household they *are* in and echoes its id back, and the client re-points at
 * what it was actually shown.
 *
 * Ordering by id rather than by insertion is arbitrary but *deterministic*,
 * which is the property that matters: two queries in the same render must not
 * disagree about which household is being shown.
 */
export function selectMembership(
	rows: readonly MembershipLike[],
	preferredHouseholdId?: string | null
): MembershipResolution {
	if (rows.length === 0) return { kind: 'none' };

	if (preferredHouseholdId) {
		const preferred = rows.find((row) => row.householdId === preferredHouseholdId);

		if (preferred) return { kind: 'one', membership: toMembership(preferred) };
	}

	const sorted = [...rows].sort((a, b) => a.householdId.localeCompare(b.householdId));

	return { kind: 'one', membership: toMembership(sorted[0]!) };
}

/**
 * The household a **mutation** may write to: exactly the one named, or nothing.
 *
 * No fallback, deliberately. `selectMembership`'s healing behavior is right for
 * a read and dangerous for a write — an edit quietly redirected into a
 * different household is the failure that produces no error and no clue, which
 * is what D18's refusal was originally guarding against.
 */
export function findMembership(
	rows: readonly MembershipLike[],
	householdId: string
): Membership | null {
	const row = rows.find((candidate) => candidate.householdId === householdId);

	return row ? toMembership(row) : null;
}

/**
 * True when demoting or removing `target` would leave the household with no
 * owner. Every household keeps at least one (D22).
 *
 * `members` is the household's full membership list.
 */
export function wouldStrandHousehold(
	members: readonly RoleBearing[],
	targetId: string
): boolean {
	const target = members.find((m) => m.id === targetId);

	if (! target || toRole(target.role) !== 'owner') return false;

	const otherOwners = members.filter((m) => m.id !== targetId && toRole(m.role) === 'owner');

	return otherOwners.length === 0;
}
