import { capsule, query, mutation, endpoint, text, table, string, boolean, id } from '@spacefast/zero/server';

import type { WriteDb } from './schema';
import { AccessError, assertInHousehold, isSignedIn, membershipState, requireCapability, requireMembership } from './auth';

import { toRole, canInviteRole } from '../shared/roles';
import { wouldStrandHousehold } from '../shared/membership';
import { normalizeQty, toInt, fromInt } from '../shared/qty';
import { normalizeIcon } from '../shared/icons';
import { normalizeInk, normalizeName, normalizeNotes, termKey, isValidName } from '../shared/term';
import { CODE_BYTES, codeFromBytes, expiryFrom, isExpired, isCodeShaped, normalizeCode } from '../shared/invite';
import type { HouseholdResult, PantryResult, TermKind } from '../shared/types';
import { SEED_LOCATIONS, SEED_TYPES, SEED_STORES } from '../shared/seed';

/**
 * The Larder Log capsule.
 *
 * Every mutation follows the same shape, and the order matters:
 *
 *   1. resolve the caller's membership and assert a capability (`server/auth.ts`)
 *   2. re-read any row it is about to touch and confirm the household matches
 *   3. normalize input through `shared/` — never trust what arrived
 *   4. write, cleaning up dependents itself (Zero has no cascading deletes)
 *   5. `invalidate()` what it touched
 *
 * Step 5 is not optional. Live queries **refetch rather than diff**, and a
 * mutation that declares nothing refreshes every subscription on the page — so
 * an item edit would drag the member list along with it. See D26.
 */

// Keys are quoted deliberately. `sf dev` rejects a server source that
// "references unsupported server global location", and its scanner counts a
// bare `location:` object key as a reference to the browser global. Quoting is
// the whole fix; the name itself is fine.
const TERM_TABLES = { 'location': 'locations', 'type': 'types', 'store': 'stores' } as const;

function termTable(kind: TermKind): 'locations' | 'types' | 'stores' {
	if (kind === 'location' || kind === 'type' || kind === 'store') return TERM_TABLES[kind];

	throw new AccessError('Unknown term kind.');
}

/** Human label for a term kind, for error copy. */
function termLabel(kind: TermKind): string {
	return kind === 'location' ? 'That location' : kind === 'type' ? 'That type' : 'That store';
}

/**
 * The database schema, as specified in `.docs/data-model.md`.
 *
 * **It has to be declared in this file, and it has to be a literal.** The
 * capsule compiler does not execute the capsule to learn its schema — it runs a
 * regex over the source of the server *entry* only, and never follows an
 * import. A schema defined in `server/schema.ts` and imported here typechecks,
 * compiles, and publishes an artifact with **zero tables and zero migrations**,
 * with no warning anywhere. It cost us a blocked Phase 2 publish; see
 * `.claude/docs/spacefast.md`.
 *
 * Consequences for editing it:
 *
 * - Keep every table a plain literal entry. A helper that returns a table, a
 *   spread, or a computed key is invisible to the compiler.
 * - No nested braces inside a `table({ ... })` body — the extractor's match is
 *   non-greedy and stops at the first `}`.
 * - After any change here, run `npx sf publish --dry-run` and confirm the table
 *   shows up in `.spacefast/zero/artifact.json`. Typecheck cannot see this.
 *
 * Two platform facts confirmed against `sf dev` on 2026-08-24 that this schema
 * leans on:
 *
 * - `id("table")` is a **type hint, not a foreign key**. A row whose `id()`
 *   field points at nothing inserts happily. Every referential rule in this app
 *   is enforced in a handler or not at all.
 * - The built-in `createdAt` / `updatedAt` are ISO 8601 UTC strings and so
 *   compare correctly as plain strings. `invites.expiresAt` uses the same
 *   encoding on purpose (D24).
 */
export const schema = {

	households: table({
		name: string(),
		// Provenance only. Ownership is memberships.role — see D22.
		createdBy: string(),
		defaultThreshold: string().default('1'),
	}),

	memberships: table({
		householdId: id('households'),
		userId: string(),
		displayName: string(),
		role: string().default('viewer'),
	})
		.index('by_user', ['userId'])
		.index('by_household', ['householdId']),

	// by_creator exists because demoting a member has to revoke the invites
	// they created (D21).
	invites: table({
		householdId: id('households'),
		code: string(),
		role: string(),
		// ISO 8601 UTC, written at mint time as now + 14 days. "" means never.
		expiresAt: string(),
		createdBy: string(),
		revoked: boolean().default(false),
	})
		.index('by_code', ['code'])
		.index('by_household', ['householdId'])
		.index('by_creator', ['createdBy']),

	locations: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
		icon: string(),
	}).index('by_household', ['householdId']),

	types: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
		icon: string(),
	}).index('by_household', ['householdId']),

	// Stores render as outlined chips, so they carry no icon.
	stores: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
	}).index('by_household', ['householdId']),

	items: table({
		householdId: id('households'),
		name: string(),
		locationId: id('locations'),
		qty: string(),
		threshold: string(),
		notes: string().default(''),
	}).index('by_household', ['householdId']),

	itemTypes: table({
		itemId: id('items'),
		typeId: id('types'),
		householdId: id('households'),
	})
		.index('by_item', ['itemId'])
		.index('by_type', ['typeId'])
		.index('by_household', ['householdId']),

	itemStores: table({
		itemId: id('items'),
		storeId: id('stores'),
		householdId: id('households'),
	})
		.index('by_item', ['itemId'])
		.index('by_store', ['storeId'])
		.index('by_household', ['householdId']),
};

export default capsule({
	name: 'Larder Log',
	schema,

	queries: {
		/**
		 * The caller's household, its members, and its live invites.
		 *
		 * Separate from `pantry` so an item edit does not refetch the member
		 * list — the one split `invalidate()` actually makes worthwhile (D26).
		 */
		household: query(async (ctx): Promise<HouseholdResult> => {
			const state = await membershipState(ctx);

			// Queries report rather than throw — a thrown query never reaches the
			// client at all. See `QueryState` in `shared/types.ts`.
			if (state.kind === 'guest') return { state: 'guest' };
			if (state.kind === 'none') return { state: 'no-household' };
			if (state.kind === 'blocked') return { state: 'blocked', message: state.message };

			const { membership } = state;

			const household = await ctx.db.households.get(membership.householdId);

			// The membership row outlived its household. Recoverable from the
			// client's point of view: offer to start a new one.
			if (! household) return { state: 'no-household' };

			const members = await ctx.db.memberships
				.withIndex('by_household', (range) => range.eq('householdId', membership.householdId))
				.collect();

			const invites = await ctx.db.invites
				.withIndex('by_household', (range) => range.eq('householdId', membership.householdId))
				.collect();

			const now = Date.now();

			return {
				state: 'ready',
				household: {
					id: household.id,
					name: household.name,
					defaultThreshold: household.defaultThreshold,
				},
				me: { membershipId: membership.id, userId: membership.userId, role: membership.role },
				members: members.map((m) => ({
					id: m.id,
					userId: m.userId,
					displayName: m.displayName,
					role: toRole(m.role),
				})),
				// Live codes only. A revoked or expired invite is noise in the UI,
				// and a code is a credential we needn't keep handing back out.
				invites: invites
					.filter((i) => ! i.revoked && ! isExpired(i.expiresAt, now))
					.map((i) => ({
						id: i.id,
						code: i.code,
						role: toRole(i.role),
						expiresAt: i.expiresAt,
						createdBy: i.createdBy,
					})),
			};
		}),

		/**
		 * The whole pantry in one payload: items, their join rows, and all three
		 * taxonomies.
		 *
		 * One query rather than several is deliberate (D26). Zero re-runs a live
		 * query whole or not at all, so splitting this would trade real
		 * complexity for savings that round to zero — the join rows dominate the
		 * payload and they refetch with the items however it is carved up.
		 */
		pantry: query(async (ctx): Promise<PantryResult> => {
			const state = await membershipState(ctx);

			if (state.kind === 'guest') return { state: 'guest' };
			if (state.kind === 'none') return { state: 'no-household' };
			if (state.kind === 'blocked') return { state: 'blocked', message: state.message };

			const { householdId } = state.membership;

			const [items, itemTypes, itemStores, locations, types, stores] = await Promise.all([
				ctx.db.items.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
				ctx.db.itemTypes.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
				ctx.db.itemStores.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
				ctx.db.locations.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
				ctx.db.types.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
				ctx.db.stores.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
			]);

			// Joined here rather than in the client so the payload is
			// self-describing, and because the client would otherwise rebuild
			// these maps on every refetch — and refetches are the common case.
			const typesByItem = new Map<string, string[]>();
			for (const row of itemTypes) {
				const list = typesByItem.get(row.itemId) ?? [];
				list.push(row.typeId);
				typesByItem.set(row.itemId, list);
			}

			const storesByItem = new Map<string, string[]>();
			for (const row of itemStores) {
				const list = storesByItem.get(row.itemId) ?? [];
				list.push(row.storeId);
				storesByItem.set(row.itemId, list);
			}

			return {
				state: 'ready',
				items: items.map((item) => ({
					id: item.id,
					name: item.name,
					locationId: item.locationId,
					qty: item.qty,
					threshold: item.threshold,
					notes: item.notes,
					typeIds: typesByItem.get(item.id) ?? [],
					storeIds: storesByItem.get(item.id) ?? [],
				})),
				locations: locations.map((l) => ({ id: l.id, name: l.name, ink: l.ink, icon: l.icon })),
				types: types.map((t) => ({ id: t.id, name: t.name, ink: t.ink, icon: t.icon })),
				stores: stores.map((s) => ({ id: s.id, name: s.name, ink: s.ink })),
			};
		}),
	},

	mutations: {
		/**
		 * First run: a signed-in identity with no membership gets a household and
		 * an owner membership.
		 *
		 * Kept out of `requireMembership()` so that helper stays resolve-or-throw
		 * and remains usable from a read-only query context.
		 */
		createHousehold: mutation(async (ctx, name: string) => {
			if (! isSignedIn(ctx.auth)) throw new AccessError('Sign in to use Larder Log.');

			const existing = await ctx.db.memberships
				.withIndex('by_user', (range) => range.eq('userId', ctx.auth.userId))
				.collect();

			if (existing.length > 0) throw new AccessError('You already belong to a household.');

			const household = await ctx.db.households.insert({
				name: normalizeName(name) || 'My Pantry',
				createdBy: ctx.auth.userId,
				defaultThreshold: '1',
			});

			await ctx.db.memberships.insert({
				householdId: household.id,
				userId: ctx.auth.userId,
				displayName: ctx.auth.displayName,
				role: 'owner',
			});

			// Seed the taxonomies. Without at least one location the household
			// cannot hold an item at all — `locationId` is required and there
			// are no nullable fields — so a bare household is a dead end.
			for (const seed of SEED_LOCATIONS) {
				await ctx.db.locations.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
					icon: normalizeIcon('location', seed.icon),
				});
			}

			for (const seed of SEED_TYPES) {
				await ctx.db.types.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
					icon: normalizeIcon('type', seed.icon),
				});
			}

			for (const seed of SEED_STORES) {
				await ctx.db.stores.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
				});
			}

			ctx.invalidate('household', 'pantry');

			return { householdId: household.id };
		}),

		updateHousehold: mutation(async (ctx, patch: { name?: string; defaultThreshold?: string }) => {
			const membership = await requireCapability(ctx, 'household:settings');

			const next: { name?: string; defaultThreshold?: string } = {};

			if (patch.name !== undefined) {
				if (! isValidName(patch.name)) throw new AccessError('A household needs a name.');
				next.name = normalizeName(patch.name);
			}

			if (patch.defaultThreshold !== undefined) {
				next.defaultThreshold = normalizeQty(patch.defaultThreshold);
			}

			await ctx.db.households.update(membership.householdId, next);

			ctx.invalidate('household');
		}),

		// --- items ---

		addItem: mutation(
			async (
				ctx,
				draft: {
					name: string;
					locationId: string;
					qty: string;
					threshold: string;
					notes?: string;
					typeIds?: string[];
					storeIds?: string[];
				}
			) => {
				const membership = await requireCapability(ctx, 'item:write');

				if (! isValidName(draft.name)) throw new AccessError('An item needs a name.');

				// The location must be one of ours. `id()` is not a foreign key,
				// so nothing beneath this line would catch a bogus reference.
				assertInHousehold(await ctx.db.locations.get(draft.locationId), membership, 'That location');

				const item = await ctx.db.items.insert({
					householdId: membership.householdId,
					name: normalizeName(draft.name),
					locationId: draft.locationId,
					qty: normalizeQty(draft.qty),
					threshold: normalizeQty(draft.threshold),
					notes: normalizeNotes(draft.notes),
				});

				await syncJoins(ctx.db, membership.householdId, item.id, draft.typeIds ?? [], draft.storeIds ?? []);

				ctx.invalidate('pantry');

				return { id: item.id };
			}
		),

		updateItem: mutation(
			async (
				ctx,
				itemId: string,
				patch: {
					name?: string;
					locationId?: string;
					qty?: string;
					threshold?: string;
					notes?: string;
					typeIds?: string[];
					storeIds?: string[];
				}
			) => {
				const membership = await requireCapability(ctx, 'item:write');

				const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

				const next: Record<string, string> = {};

				if (patch.name !== undefined) {
					if (! isValidName(patch.name)) throw new AccessError('An item needs a name.');
					next.name = normalizeName(patch.name);
				}

				if (patch.locationId !== undefined) {
					assertInHousehold(await ctx.db.locations.get(patch.locationId), membership, 'That location');
					next.locationId = patch.locationId;
				}

				if (patch.qty !== undefined) next.qty = normalizeQty(patch.qty);
				if (patch.threshold !== undefined) next.threshold = normalizeQty(patch.threshold);
				if (patch.notes !== undefined) next.notes = normalizeNotes(patch.notes);

				await ctx.db.items.update(item.id, next);

				if (patch.typeIds !== undefined || patch.storeIds !== undefined) {
					await syncJoins(ctx.db, membership.householdId, item.id, patch.typeIds, patch.storeIds);
				}

				ctx.invalidate('pantry');
			}
		),

		/** The hottest path: `+1` / `-1`, clamped at zero by `fromInt`. */
		adjustQty: mutation(async (ctx, itemId: string, delta: number) => {
			const membership = await requireCapability(ctx, 'item:write');

			const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

			// Only ever one step. A client asking for -999 is a bug or an attack,
			// and neither deserves to be honored.
			const step = delta < 0 ? -1 : 1;

			await ctx.db.items.update(item.id, { qty: fromInt(toInt(item.qty) + step) });

			ctx.invalidate('pantry');
		}),

		/**
		 * A hard delete. Undo is a client-held tombstone that re-runs `addItem`
		 * (D17), so there is no `deletedAt` and nothing filters on one.
		 */
		removeItem: mutation(async (ctx, itemId: string) => {
			const membership = await requireCapability(ctx, 'item:write');

			const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

			await clearJoinsForItem(ctx.db, item.id);
			await ctx.db.items.delete(item.id);

			ctx.invalidate('pantry');
		}),

		// --- taxonomy ---

		createTerm: mutation(
			async (ctx, kind: TermKind, draft: { name: string; ink: string; icon?: string }) => {
				const membership = await requireCapability(ctx, 'taxonomy:write');
				const tableName = termTable(kind);

				if (! isValidName(draft.name)) throw new AccessError('A name is required.');

				const existing = await ctx.db[tableName]
					.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
					.collect();

				const key = termKey(draft.name);

				if (existing.some((t) => termKey(t.name) === key)) {
					throw new AccessError(`"${normalizeName(draft.name)}" already exists.`);
				}

				const name = normalizeName(draft.name);
				const ink = normalizeInk(draft.ink);
				const householdId = membership.householdId;

				// Stores render as outlined chips and have no icon column at all.
				const row =
					tableName === 'stores'
						? await ctx.db.stores.insert({ householdId, name, ink })
						: await ctx.db[tableName].insert({
								householdId,
								name,
								ink,
								icon: normalizeIcon(kind, draft.icon),
							});

				ctx.invalidate('pantry');

				return { id: row.id };
			}
		),

		updateTerm: mutation(
			async (
				ctx,
				kind: TermKind,
				termId: string,
				patch: { name?: string; ink?: string; icon?: string }
			) => {
				const membership = await requireCapability(ctx, 'taxonomy:write');
				const tableName = termTable(kind);

				const term = assertInHousehold(
					await ctx.db[tableName].get(termId),
					membership,
					termLabel(kind)
				);

				const next: Record<string, string> = {};

				if (patch.name !== undefined) {
					if (! isValidName(patch.name)) throw new AccessError('A name is required.');

					const siblings = await ctx.db[tableName]
						.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
						.collect();

					const key = termKey(patch.name);

					if (siblings.some((t) => t.id !== termId && termKey(t.name) === key)) {
						throw new AccessError(`"${normalizeName(patch.name)}" already exists.`);
					}

					// A rename is now a single-row update. Under the Phase 1
					// name-joined model this had to rewrite every item that
					// referenced the term.
					next.name = normalizeName(patch.name);
				}

				if (patch.ink !== undefined) next.ink = normalizeInk(patch.ink);

				if (patch.icon !== undefined && tableName !== 'stores') {
					next.icon = normalizeIcon(kind, patch.icon);
				}

				await ctx.db[tableName].update(term.id, next);

				ctx.invalidate('pantry');
			}
		),

		deleteTerm: mutation(async (ctx, kind: TermKind, termId: string) => {
			const membership = await requireCapability(ctx, 'taxonomy:write');
			const tableName = termTable(kind);

			const term = assertInHousehold(
				await ctx.db[tableName].get(termId),
				membership,
				termLabel(kind)
			);

			if (kind === 'location') {
				// D16: refuse while items live here. Zero has no nullable fields,
				// so there is no "no location" to fall back to — and since `id()`
				// is not a foreign key, this check is the only thing between a
				// delete and a dangling reference that renders as a silent box.
				const items = await ctx.db.items
					.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
					.collect();

				const stranded = items.filter((i) => i.locationId === termId).length;

				if (stranded > 0) {
					throw new AccessError(
						`${stranded} ${stranded === 1 ? 'item is' : 'items are'} stored in "${term.name}". Move them somewhere else first.`
					);
				}
			}

			if (kind === 'type') {
				const joins = await ctx.db.itemTypes
					.withIndex('by_type', (r) => r.eq('typeId', termId))
					.collect();

				for (const join of joins) await ctx.db.itemTypes.delete(join.id);
			}

			if (kind === 'store') {
				const joins = await ctx.db.itemStores
					.withIndex('by_store', (r) => r.eq('storeId', termId))
					.collect();

				for (const join of joins) await ctx.db.itemStores.delete(join.id);
			}

			await ctx.db[tableName].delete(term.id);

			ctx.invalidate('pantry');
		}),

		// --- invites and membership ---

		createInvite: mutation(async (ctx, grantedRole: string) => {
			const membership = await requireCapability(ctx, 'invite:create');

			const granted = toRole(grantedRole);

			// D21. Owners mint any level, editors mint viewer only. The editor
			// tier can only grow by owner action, and this is half of why —
			// `changeRole` below is the other half.
			if (! canInviteRole(membership.role, granted)) {
				throw new AccessError(`You cannot invite someone as ${granted}.`);
			}

			const invite = await ctx.db.invites.insert({
				householdId: membership.householdId,
				code: codeFromBytes(crypto.getRandomValues(new Uint8Array(CODE_BYTES))),
				role: granted,
				expiresAt: expiryFrom(Date.now()),
				createdBy: membership.userId,
				revoked: false,
			});

			ctx.invalidate('household');

			return { code: invite.code, expiresAt: invite.expiresAt };
		}),

		revokeInvite: mutation(async (ctx, inviteId: string) => {
			const membership = await requireCapability(ctx, 'invite:revoke');

			const invite = assertInHousehold(
				await ctx.db.invites.get(inviteId),
				membership,
				'That invite'
			);

			await ctx.db.invites.update(invite.id, { revoked: true });

			ctx.invalidate('household');
		}),

		redeemInvite: mutation(async (ctx, rawCode: string) => {
			if (! isSignedIn(ctx.auth)) throw new AccessError('Sign in to join a household.');

			const code = normalizeCode(rawCode);

			if (! isCodeShaped(code)) throw new AccessError('That invite code is not valid.');

			// D18: one household per user, so redemption refuses rather than
			// creating a second membership. This is also what stops a code from
			// ever changing a current member's role in either direction.
			const existing = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			if (existing.length > 0) {
				throw new AccessError('You already belong to a household. Leave it before joining another.');
			}

			const invite = await ctx.db.invites
				.withIndex('by_code', (r) => r.eq('code', code))
				.first();

			// One message for missing, revoked, and expired alike — a code is a
			// bearer credential, and separating the cases tells a guesser which
			// codes exist.
			if (! invite || invite.revoked || isExpired(invite.expiresAt, Date.now())) {
				throw new AccessError('That invite is no longer valid.');
			}

			await ctx.db.memberships.insert({
				householdId: invite.householdId,
				userId: ctx.auth.userId,
				displayName: ctx.auth.displayName,
				role: toRole(invite.role),
			});

			ctx.invalidate('household', 'pantry');

			return { householdId: invite.householdId };
		}),

		changeRole: mutation(async (ctx, membershipId: string, nextRole: string) => {
			const membership = await requireCapability(ctx, 'member:role');

			const members = await ctx.db.memberships
				.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
				.collect();

			const target = members.find((m) => m.id === membershipId);

			if (! target) throw new AccessError('That member is no longer in this household.');

			const role = toRole(nextRole);

			// D22: a household always keeps an owner. Demoting the last one
			// leaves it unadministrable — how these systems strand people.
			if (role !== 'owner' && wouldStrandHousehold(members, membershipId)) {
				throw new AccessError(
					'This household needs at least one owner. Make someone else an owner first.'
				);
			}

			await ctx.db.memberships.update(target.id, { role });

			// D21: a demotion must not leave the invites they minted working —
			// an owner dropped to editor would otherwise keep minting editors.
			await revokeInvitesBy(ctx.db, membership.householdId, target.userId);

			ctx.invalidate('household');
		}),

		removeMember: mutation(async (ctx, membershipId: string) => {
			const membership = await requireCapability(ctx, 'member:remove');

			const members = await ctx.db.memberships
				.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
				.collect();

			const target = members.find((m) => m.id === membershipId);

			if (! target) throw new AccessError('That member is no longer in this household.');

			if (wouldStrandHousehold(members, membershipId)) {
				throw new AccessError(
					'This household needs at least one owner. Make someone else an owner first.'
				);
			}

			await revokeInvitesBy(ctx.db, membership.householdId, target.userId);
			await ctx.db.memberships.delete(target.id);

			ctx.invalidate('household');
		}),

		leaveHousehold: mutation(async (ctx) => {
			const membership = await requireMembership(ctx);

			const members = await ctx.db.memberships
				.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
				.collect();

			if (wouldStrandHousehold(members, membership.id)) {
				throw new AccessError(
					'You are the only owner. Make someone else an owner, or delete the household.'
				);
			}

			await revokeInvitesBy(ctx.db, membership.householdId, membership.userId);
			await ctx.db.memberships.delete(membership.id);

			ctx.invalidate('household', 'pantry');
		}),

		/** Owner only. Deletes every row scoped to the household, children first. */
		deleteHousehold: mutation(async (ctx) => {
			const membership = await requireCapability(ctx, 'household:delete');
			const { householdId } = membership;

			// Order matters: join rows, then what they point at, then the
			// household itself. Zero has no cascading deletes.
			for (const name of [
				'itemTypes',
				'itemStores',
				'items',
				'locations',
				'types',
				'stores',
				'invites',
				'memberships',
			] as const) {
				const rows = await ctx.db[name]
					.withIndex('by_household', (r) => r.eq('householdId', householdId))
					.collect();

				for (const row of rows) await ctx.db[name].delete(row.id);
			}

			await ctx.db.households.delete(householdId);

			ctx.invalidate('household', 'pantry');
		}),
	},

	endpoints: {
		status: endpoint({ method: 'GET', path: '/api/status' }, () => text('ok')),
	},
});

// --- helpers ---

/**
 * Reconciles an item's type and store join rows to exactly the given ids.
 *
 * `undefined` means "leave this side alone"; an empty array means "clear it".
 * Every id is checked against the household first — `id()` is not a foreign
 * key, so an unchecked id would happily join an item to another household's
 * term, which is the one way a household boundary could leak through a join.
 */
async function syncJoins(
	db: WriteDb,
	householdId: string,
	itemId: string,
	typeIds: string[] | undefined,
	storeIds: string[] | undefined
): Promise<void> {
	if (typeIds !== undefined) {
		const valid = await keepOwned(db.types, householdId, typeIds);

		const existing = await db.itemTypes.withIndex('by_item', (r) => r.eq('itemId', itemId)).collect();

		for (const row of existing) {
			if (! valid.has(row.typeId)) await db.itemTypes.delete(row.id);
		}

		const have = new Set(existing.map((r) => r.typeId));

		for (const typeId of valid) {
			if (! have.has(typeId)) await db.itemTypes.insert({ itemId, typeId, householdId });
		}
	}

	if (storeIds !== undefined) {
		const valid = await keepOwned(db.stores, householdId, storeIds);

		const existing = await db.itemStores.withIndex('by_item', (r) => r.eq('itemId', itemId)).collect();

		for (const row of existing) {
			if (! valid.has(row.storeId)) await db.itemStores.delete(row.id);
		}

		const have = new Set(existing.map((r) => r.storeId));

		for (const storeId of valid) {
			if (! have.has(storeId)) await db.itemStores.insert({ itemId, storeId, householdId });
		}
	}
}

/** Narrows a client-supplied id list to the ones actually in this household. */
async function keepOwned(
	tableApi: { get(id: string): Promise<{ householdId: string } | null> },
	householdId: string,
	ids: string[]
): Promise<Set<string>> {
	const kept = new Set<string>();

	for (const id of new Set(ids)) {
		const row = await tableApi.get(id);
		if (row && row.householdId === householdId) kept.add(id);
	}

	return kept;
}

/** Deletes every join row belonging to an item. */
async function clearJoinsForItem(db: WriteDb, itemId: string): Promise<void> {
	const types = await db.itemTypes.withIndex('by_item', (r) => r.eq('itemId', itemId)).collect();

	for (const row of types) await db.itemTypes.delete(row.id);

	const stores = await db.itemStores.withIndex('by_item', (r) => r.eq('itemId', itemId)).collect();

	for (const row of stores) await db.itemStores.delete(row.id);
}

/**
 * Revokes every live invite a user minted in a household.
 *
 * Invite roles are validated at creation, not at redemption, so this is the
 * only thing stopping a demoted member's outstanding codes from continuing to
 * grant the level they just lost (D21).
 */
async function revokeInvitesBy(db: WriteDb, householdId: string, userId: string): Promise<void> {
	const minted = await db.invites.withIndex('by_creator', (r) => r.eq('createdBy', userId)).collect();

	for (const invite of minted) {
		if (invite.householdId === householdId && ! invite.revoked) {
			await db.invites.update(invite.id, { revoked: true });
		}
	}
}
