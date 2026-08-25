/**
 * Roles and capabilities.
 *
 * Zero has no row-level security, so every household boundary and every
 * permission is a hand-written check in a handler. Three roles across a dozen
 * handlers is exactly the thing that drifts when the rules are written inline,
 * so the matrix lives here once: the server enforces from it and the client
 * disables UI from it. `shared/` imports nothing, which is what lets both sides
 * read the same table instead of keeping two that agree by accident.
 *
 * See D20-D22 in `.docs/decisions.md`.
 */

export type Role = 'owner' | 'editor' | 'viewer';

export const ROLES: readonly Role[] = ['owner', 'editor', 'viewer'] as const;

/** The least privileged role, and the default for a new membership. */
export const DEFAULT_ROLE: Role = 'viewer';

export type Capability =
	| 'pantry:read'
	| 'item:write'
	| 'taxonomy:write'
	| 'household:settings'
	| 'invite:create'
	| 'invite:revoke'
	| 'member:role'
	| 'member:remove'
	| 'household:delete';

const CAPABILITIES: Record<Role, readonly Capability[]> = {
	owner: [
		'pantry:read',
		'item:write',
		'taxonomy:write',
		'household:settings',
		'invite:create',
		'invite:revoke',
		'member:role',
		'member:remove',
		'household:delete',
	],
	editor: ['pantry:read', 'item:write', 'taxonomy:write', 'invite:create', 'invite:revoke'],
	viewer: ['pantry:read'],
};

/** True when `role` is one of the three known values. */
export function isRole(value: unknown): value is Role {
	return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Reads a stored role. Anything unrecognized degrades to the least privileged
 * value rather than throwing — a corrupt row should lock someone out, never
 * hand them access they were not granted.
 */
export function toRole(value: unknown): Role {
	return isRole(value) ? value : DEFAULT_ROLE;
}

/** The permission check. Every mutation that writes calls this first. */
export function can(role: Role, capability: Capability): boolean {
	return CAPABILITIES[role].includes(capability);
}

/**
 * Roles each role may mint an invite for.
 *
 * Written as an explicit table rather than derived from a rank comparison,
 * because the rule genuinely is not "strictly below": owners may invite
 * co-owners (D22 wants more than one owner, so that a lost account never leaves
 * a household unadministered), while editors may invite viewers only. Any
 * ordering formula that produces both rows is a formula fitted to three
 * hardcoded cases, so the table says what it means.
 *
 * The consequence worth stating out loud: **the editor tier can only grow by
 * owner action.** No editor can produce another editor, by invitation or by
 * promotion (`member:role` is owner-only). See D21.
 */
const INVITABLE: Record<Role, readonly Role[]> = {
	owner: ['owner', 'editor', 'viewer'],
	editor: ['viewer'],
	viewer: [],
};

/** Roles `creator` may mint an invite for. Empty when they may not invite. */
export function invitableRoles(creator: Role): Role[] {
	return [...INVITABLE[creator]];
}

/** True when `creator` may mint an invite granting `granted`. */
export function canInviteRole(creator: Role, granted: Role): boolean {
	return invitableRoles(creator).includes(granted);
}
