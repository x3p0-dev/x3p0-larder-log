/**
 * The one-household-per-user rule (D18), as a pure function.
 *
 * The database read stays in the handler; the *decision* lives here so it can
 * be tested without a server and can never be quietly re-implemented as
 * `.first()` at a second call site.
 */

import { toRole, type Role } from './roles';

/** The fields of a `memberships` row this rule needs. */
export type MembershipLike = {
	id: string;
	householdId: string;
	userId: string;
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
	| { kind: 'one'; membership: Membership }
	| { kind: 'many'; count: number };

/**
 * Resolves a caller's memberships to exactly one, or says why it can't.
 *
 * Deliberately **not** `.first()`. The schema permits many memberships (D3) but
 * the app supports one (D18), so a multi-row result is a bug — and silently
 * picking a row lands the caller's edits in an arbitrary household, which is
 * the kind of failure that produces no error and no clue.
 */
export function resolveMembership(rows: readonly MembershipLike[]): MembershipResolution {
	if (rows.length === 0) return { kind: 'none' };

	if (rows.length > 1) return { kind: 'many', count: rows.length };

	const row = rows[0]!;

	return {
		kind: 'one',
		membership: {
			id: row.id,
			householdId: row.householdId,
			userId: row.userId,
			// An unrecognized stored role degrades to the least privileged value
			// rather than throwing: a corrupt row should lock someone out, never
			// hand them access they were never granted.
			role: toRole(row.role),
		},
	};
}

/**
 * True when demoting or removing `target` would leave the household with no
 * owner. Every household keeps at least one (D22).
 *
 * `members` is the household's full membership list.
 */
export function wouldStrandHousehold(
	members: readonly MembershipLike[],
	targetId: string
): boolean {
	const target = members.find((m) => m.id === targetId);

	if (! target || toRole(target.role) !== 'owner') return false;

	const otherOwners = members.filter((m) => m.id !== targetId && toRole(m.role) === 'owner');

	return otherOwners.length === 0;
}
