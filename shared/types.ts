/**
 * The domain vocabulary, shared by the client and the server capsule.
 *
 * These types track `docs/data-model.md`: quantities are strings (there is no
 * numeric column), taxonomy references are **row ids** rather than names, and
 * accordion state is absent because it is UI, not data.
 *
 * The move from names to ids is what Phase 2 bought. A rename is now a
 * single-row update instead of a rewrite of every item that mentioned the term.
 */

import type { Role } from './roles';

export type TermKind = 'location' | 'type' | 'store';

/**
 * A taxonomy term. `ink` is the single base hex every tint, ring, and chip
 * color derives from; `icon` is a key into the matching set in `shared/icons.ts`
 * and is absent for stores, which render as outlined chips with no glyph.
 */
export type Term = {
	id: string;
	name: string;
	ink: string;
	icon?: string;
};

/** An inventory row. `qty` and `threshold` are decimal strings — see D4. */
export type Item = {
	id: string;
	name: string;
	locationId: string;
	typeIds: string[];
	storeIds: string[];
	qty: string;
	threshold: string;
	notes: string;
};

/** The editable subset of an item, as the add and edit forms hold it. */
export type ItemDraft = Omit<Item, 'id'>;

export type Member = {
	id: string;
	userId: string;
	displayName: string;
	role: Role;
};

export type Invite = {
	id: string;
	code: string;
	role: Role;
	expiresAt: string;
	createdBy: string;
};

export type ThemeOverride = 'system' | 'light' | 'dark';

/**
 * Why queries report a state instead of throwing.
 *
 * Zero's client emits `query.result` **only on success** — there is no error
 * path for a subscription. A query that throws simply never emits, and
 * `useQuery` keeps returning its initial value forever, which is
 * indistinguishable from "still loading". A first-run user with no household
 * would sit on a blank screen with no way to route them to setup.
 *
 * So every expected condition is a value, and a `throw` in a query is reserved
 * for genuine bugs. Confirmed against the client bundle 2026-08-24; see
 * `docs/notes.md`.
 */
export type QueryState<T> =
	| ({ state: 'ready' } & T)
	/** Signed out. The gate normally prevents this, but the query is defensive. */
	| { state: 'guest' }
	/** Signed in, no household yet — the first-run path. */
	| { state: 'no-household' }
	/** Something the user must be told about, e.g. the D18 multi-household bug. */
	| { state: 'blocked'; message: string };

export type PantryData = {
	items: Item[];
	locations: Term[];
	types: Term[];
	stores: Term[];
};

export type HouseholdData = {
	household: { id: string; name: string; defaultThreshold: string };
	me: { membershipId: string; userId: string; role: Role };
	members: Member[];
	invites: Invite[];
};

export type PantryResult = QueryState<PantryData>;
export type HouseholdResult = QueryState<HouseholdData>;
