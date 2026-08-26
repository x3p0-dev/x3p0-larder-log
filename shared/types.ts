/**
 * The domain vocabulary, shared by the client and the server capsule.
 *
 * These types track `.docs/data-model.md`: quantities are strings (there is no
 * numeric column), taxonomy references are **row ids** rather than names, and
 * accordion state is absent because it is UI, not data.
 *
 * The move from names to ids is what Phase 2 bought. A rename is now a
 * single-row update instead of a rewrite of every item that mentioned the term.
 */

import type { Role } from './roles';

export type TermKind = 'location' | 'type' | 'store';

/**
 * A taxonomy term. `ink` is a color *token* rather than a hex (D32) — the
 * theme table in `client/lib/palette.ts` says what it looks like.
 *
 * No `icon`. The Cellar design identifies a term by its name and its color dot,
 * so the picker and the glyph sets were cut before v1 (D34). The `icon` column
 * survives on `locations` and `types`, written as `''` — a column is additive
 * to re-populate and destructive to drop.
 */
export type Term = {
	id: string;
	name: string;
	ink: string;
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
	/**
	 * Zero's own insert stamp, ISO 8601 UTC — never written by this app (D35).
	 *
	 * Carried on the DTO so *Recently added* can be a real ordering instead of
	 * whatever order `collect()` happened to return, which was oldest-first and
	 * therefore the exact opposite of the label. It string-compares correctly,
	 * which is the only reason sorting on it is safe here (D4).
	 */
	createdAt: string;
};

/**
 * The editable subset of an item, as the add and edit forms hold it.
 *
 * `createdAt` is omitted with `id` for the same reason: both are the platform's
 * to assign, and `insert()` rejects either one outright.
 */
export type ItemDraft = Omit<Item, 'id' | 'createdAt'>;

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
 * `.docs/notes.md`.
 */
export type QueryState<T> =
	| ({ state: 'ready' } & T)
	/** Signed out. The gate normally prevents this, but the query is defensive. */
	| { state: 'guest' }
	/** Signed in, belonging to no household at all — the first-run path. */
	| { state: 'no-household' };

export type PantryData = {
	items: Item[];
	locations: Term[];
	types: Term[];
	stores: Term[];
};

export type HouseholdData = {
	household: { id: string; name: string; defaultThreshold: string; ink: string };
	me: { membershipId: string; userId: string; role: Role };
	members: Member[];
	invites: Invite[];
};

/**
 * One row of the household switcher.
 *
 * The count is items, because that is what the popover shows and what tells two
 * pantries apart at a glance. `role` is this user's role *there* — it can
 * differ in every household they belong to.
 */
export type HouseholdSummary = {
	id: string;
	name: string;
	role: Role;
	itemCount: number;
	/**
	 * The colour token the tile is drawn in, already resolved (D42).
	 *
	 * Never `''`: the server runs `householdInk()` over the stored value, so a
	 * row written before the column existed arrives with its stable default
	 * rather than leaving every reader to compute one.
	 */
	ink: string;
};

/**
 * Just the list. Which one is *current* is not answered here — the `household`
 * query already echoes back the id it resolved, and two queries answering the
 * same question is two answers to keep in agreement.
 */
export type HouseholdListData = {
	households: HouseholdSummary[];
};

export type PantryResult = QueryState<PantryData>;
export type HouseholdResult = QueryState<HouseholdData>;
export type HouseholdListResult = QueryState<HouseholdListData>;

/**
 * What an invite link says about itself, before anyone accepts it.
 *
 * The `?join=` landing is the one screen a **signed-out** visitor can reach
 * that reads the database, so this is the one query with no membership behind
 * it. The code is the authorization: whoever holds it was meant to see the
 * household's name and the role they are being offered.
 *
 * It does not follow `QueryState`, because "guest" is not a failure here — it
 * is half the audience. Loading is still the platform's absent-value signal.
 */
export type InviteHousehold = {
	name: string;
	/** The colour token the household tile is drawn in — see `client/lib/theme.ts`. */
	ink: string;
};

export type InvitePreview =
	/**
	 * Unknown, malformed, **or revoked**.
	 *
	 * Revoked collapses into this deliberately. `redeemInvite` already refuses
	 * to distinguish missing from revoked from expired, on the grounds that
	 * separating them tells a guesser which codes exist; a preview that named
	 * the household behind a revoked link would give that back. The landing
	 * renders it as the expired screen with one sentence changed.
	 */
	| { state: 'invalid' }
	/** A real code, past its 14 days. The inviter is named so it can be replaced. */
	| { state: 'expired'; household: InviteHousehold; role: Role; inviter: string }
	/**
	 * Signed in, and already in the household this code is for.
	 *
	 * The **only** variant carrying an id, so the card's *Open X* can switch to
	 * it. A non-member holding a code has no business learning one, and the
	 * other three variants do not offer a destination to switch to.
	 */
	| { state: 'member'; household: InviteHousehold; householdId: string }
	| { state: 'valid'; household: InviteHousehold; role: Role; inviter: string; expiresAt: string };

export type InvitePreviewResult = InvitePreview;
