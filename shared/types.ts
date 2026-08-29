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
import type { SourceKind } from './source';

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
	/**
	 * Zero's own insert stamp, ISO 8601 UTC — never written by this app, and it
	 * cannot be (D35, D44). Kept only as the last fallback for rows written
	 * before the two below existed.
	 */
	createdAt: string;

	/** When this entered the household, as this app stamps it. See `shared/stamp.ts`. */
	addedAt: string;

	/** When it was last edited. Bumped by every mutation that writes a visible field. */
	changedAt: string;
};

/**
 * The editable subset of a term, as the composer holds it.
 *
 * The stamps are omitted for the same reason `ItemDraft` omits them: no form
 * holds one, and the single caller that supplies a value is undo, which passes
 * them beside the draft.
 */
export type TermDraft = Omit<Term, 'id' | 'createdAt' | 'addedAt' | 'changedAt'>;

/**
 * A store, plus the one thing that makes it a *source*: what you do to get
 * things from it (D58).
 *
 * A separate type rather than a `kind` on `Term`, because the column is only on
 * `stores` and a field that is meaningfully `''` on two taxonomies out of three
 * is a field every reader has to remember not to trust. `Source` is a `Term`
 * everywhere a `Term` is wanted — the filter chips, the item sheet's chip row
 * and the applied-filter bar all take it unchanged, which is the whole point of
 * putting the kind on the term rather than on the item.
 */
export type Source = Term & { kind: SourceKind };

/**
 * A row's stamps, as undo hands them back to a create mutation.
 *
 * Both optional: a create with neither is stamped now, which is every path
 * except a restore.
 */
export type Stamps = { addedAt?: string; changedAt?: string };

/** An inventory row. `qty` and `threshold` are decimal strings — see D4. */
export type Item = {
	id: string;
	name: string;
	locationId: string;
	typeIds: string[];
	storeIds: string[];
	qty: string;
	threshold: string;
	/**
	 * How big *one* of the thing is — a quart of milk, a 12 oz bag of coffee.
	 *
	 * A decimal string like `qty`, and half of a pair that is never half-set:
	 * `shared/size.ts` owns the rule, and both halves are `''` when there is no
	 * size at all, which is the ordinary case for anything counted rather than
	 * packaged.
	 */
	size: string;
	/** The size's unit **key** — a slug (`quart`), never its abbreviation (`qt`). */
	unit: string;
	/**
	 * Keep this item off the run list, however low it gets.
	 *
	 * **Retired (D60), and kept only for the rows that already hold it.** It was
	 * written for the things a household grows or brews and never shops for; a
	 * source's kind answers that better and says which, so nothing sets this any
	 * more. `needsBuying` still reads it, the sheet still offers to *clear* it,
	 * and the column stays for the reason `icon` does (D34).
	 *
	 * It hides the item from one *view* and changes nothing about what is true
	 * of it: the card still reads *running low*, and the three status pills —
	 * which count stock, not shopping — do not move.
	 */
	offShoppingList: boolean;
	/**
	 * When a grown thing is ready — two month numbers as strings, `''` for none.
	 *
	 * A pair that is never half-set (`shared/season.ts`), and asked for only
	 * when the item names a source you **grow** (D58). It moves a row between
	 * groups on the harvest card and changes nothing about the item: an
	 * out-of-season tomato still reads *out* on its card and still counts toward
	 * the three status pills.
	 *
	 * It is on the item because the item is the only object there is. It belongs
	 * on a planting — D59.
	 */
	seasonFrom: string;
	seasonTo: string;
	notes: string;
	/**
	 * Zero's own insert stamp, ISO 8601 UTC — never written by this app, and it
	 * cannot be (D35, D44). Kept only as the last fallback for rows written
	 * before the two below existed.
	 */
	createdAt: string;

	/** When this entered the household, as this app stamps it. See `shared/stamp.ts`. */
	addedAt: string;

	/** When it was last edited. Bumped by every mutation that writes a visible field. */
	changedAt: string;
};

/**
 * The editable subset of an item, as the add and edit forms hold it.
 *
 * `createdAt` is omitted with `id` for the same reason: both are the platform's
 * to assign, and `insert()` rejects either one outright. `addedAt` and
 * `changedAt` are omitted because no form holds one — the server stamps them,
 * and the single caller that supplies values is undo, which passes them beside
 * the draft rather than in it.
 */
export type ItemDraft = Omit<Item, 'id' | 'createdAt' | 'addedAt' | 'changedAt'>;

export type Member = {
	id: string;
	userId: string;
	displayName: string;
	/** The account's avatar URL, or '' for none. See shared/avatar.ts. */
	picture: string;
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
	/** Stores carry a kind, and are the only taxonomy that does — see `Source`. */
	stores: Source[];
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

/**
 * The signed-in account's own name, and whether it has one yet.
 *
 * Like `InvitePreview` and unlike everything else, this does **not** follow
 * `QueryState`: `no-household` is not one of its answers. The whole point of
 * the display name is that it is asked *before* the path forks into
 * create-a-household and accept-an-invite, so a caller with no household is
 * the most ordinary case this query has.
 *
 * `needsName` is the gate, and it is narrower than "has no profile row". An
 * account that predates the `profiles` table has an identity name recorded on
 * every membership it holds, which is a name it effectively already answered
 * with — so it is grandfathered and `displayName` carries that name instead.
 * Only an account with no name anywhere is stopped.
 */
export type ProfileResult =
	| { state: 'guest' }
	| { state: 'ready'; displayName: string; needsName: boolean };
