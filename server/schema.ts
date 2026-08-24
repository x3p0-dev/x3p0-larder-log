import { table, string, boolean, id } from '@spacefast/zero/server';
import type { ReadDatabaseOf, WriteDatabaseOf } from '@spacefast/zero/server';

/**
 * The database schema, as specified in `docs/data-model.md`.
 *
 * It lives apart from the capsule so the handlers can derive their `ctx.db`
 * types from it (see `ReadDb` / `WriteDb` below) without duplicating a single
 * row shape by hand.
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
		// Demoting a member has to revoke the invites they created (D21).
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

/** `ctx.db` inside a query — reads only. */
export type ReadDb = ReadDatabaseOf<{ schema: typeof schema }>;

/** `ctx.db` inside a mutation — reads and writes. */
export type WriteDb = WriteDatabaseOf<{ schema: typeof schema }>;
