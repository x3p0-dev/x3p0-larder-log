import { capsule, query, mutation, endpoint, text, table, string, boolean, id } from '@spacefast/zero/server';

import type { AuthContext, LogContext } from '@spacefast/zero/server';
import type { ReadDb, WriteDb } from './schema';
import { AccessError, administers, assertInHousehold, membershipState, requireAdminWrite, requireCapability, requireMembership, signedIn } from './auth';

import { toRole, canInviteRole } from '../shared/roles';
import { wouldStrandHousehold } from '../shared/membership';
import { normalizeQty, toInt, fromInt } from '../shared/qty';
import { isSourceKind, sourceGroupWord, toSourceKind } from '../shared/source';
import { normalizeSeason } from '../shared/season';
import { normalizeSize } from '../shared/size';
import { addedAtOf, changedAtOf, normalizeStamp, stampFrom } from '../shared/stamp';
import {
	ADMIN_IDS_VAR, adminWritesHeldFor, cumulativeByMonth, isDormant, isWithinDays,
	matchScore, monthKeysBack, monthLabel, parseAdminIds, RECENT_DAYS,
} from '../shared/admin';
import {
	encodeHeld, retentionCutoff, RETENTION_VAR, toRetentionMonths,
} from '../shared/activity';
import type { ActivityAction, Held, TargetKind } from '../shared/activity';
import { byName, normalizeInk, normalizeName, normalizeNotes, termBlock, termKey, isValidName } from '../shared/term';
import { CODE_BYTES, PENDING_CODE, codeFromBytes, codeFromSeed, expiryFrom, isExpired, isCodeShaped, normalizeCode } from '../shared/invite';
import type {
	AdminAccessResult,
	AdminAccountResult,
	AdminActivityExportResult,
	AdminActivityResult,
	AdminHouseholdDetailResult,
	AdminHouseholdFilter,
	AdminHouseholdRow,
	AdminHouseholdSort,
	AdminHouseholdsResult,
	AdminOwnershipDecision,
	AdminPeopleFilter,
	AdminPeopleResult,
	AdminPeopleSort,
	AdminPersonRow,
	AdminSummaryResult,
	HouseholdListResult,
	HouseholdResult,
	HouseholdSummary,
	InvitePreviewResult,
	PantryResult,
	ProfileResult,
	TermKind,
} from '../shared/types';
import { SEED_LOCATIONS, SEED_TYPES, seedSourcesFor, toSourceMix } from '../shared/seed';
import { householdInk, toHouseholdInk } from '../shared/household';
import { normalizeDisplayName, pickDisplayName } from '../shared/profile';
import { normalizeAvatarUrl } from '../shared/avatar';

/**
 * The Larder Log capsule.
 *
 * Every mutation follows the same shape, and the order matters:
 *
 *   1. resolve the caller's membership **in the household it names** and assert
 *      a capability (`server/auth.ts`) — the id is a selector, never authority
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
 * The name to stamp on a membership row this caller is about to be given.
 *
 * `memberships.displayName` is a **denormalized copy** of the account's name,
 * not a second name — it is what the member list and the invite card read, so
 * they never have to join a profile row per member on a live query. Every path
 * that writes one goes through here, and `setDisplayName` writes back through
 * all of them, which is what keeps the copy honest.
 *
 * The chain is the one `pickDisplayName` documents: the profile, then whatever
 * name the account already joined somewhere under, then the identity. The last
 * link is what an account created before this table has, and the reason a
 * membership minted for one is not blank.
 */
async function accountName(ctx: { auth: AuthContext; db: ReadDb | WriteDb }): Promise<string> {
	const profile = await ctx.db.profiles
		.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
		.first();

	if (profile) return pickDisplayName(profile.displayName, ctx.auth.displayName);

	const memberships = await ctx.db.memberships
		.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
		.collect();

	return pickDisplayName(...memberships.map((m) => m.displayName), ctx.auth.displayName);
}

/**
 * The avatar to stamp on a membership row, from the identity that is asking.
 *
 * Deliberately **not** the chain `accountName()` walks. A name has a fallback
 * worth reaching for — an unnamed row in Members is worse than a stale one — but
 * an avatar's fallback is the initial the component already draws, so an absent
 * picture is an answer rather than a gap to paper over. `''` is the whole
 * absent case: no Gravatar, or an identity that carries no claim.
 *
 * `ctx.auth.picture` is the only route to this at all. The platform tells a
 * handler about its **caller** and never about a third party, so the two moments
 * a membership row is written are the two moments the value is in reach —
 * which is why `syncAccountAvatar` exists for every moment after them.
 */
function accountAvatar(ctx: { auth: AuthContext }): string {
	return normalizeAvatarUrl(ctx.auth.picture);
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

	// The account's own name (D46), keyed by `ctx.auth.userId` rather than by a
	// row id — an identity is not a row this app creates, so `by_user` is the
	// only way in and every read goes through it. One row per account at most:
	// `setDisplayName` looks before it inserts, because Zero has no unique
	// constraint to lean on any more than it has a foreign key.
	//
	// Stamped from birth on purpose. Nothing orders profiles by time today, but
	// D44's own note is that a column is permanent and a row written without one
	// never gets one — and this table has no rows yet, so the stamps cost
	// nothing here and could not be added for free later.
	profiles: table({
		userId: string(),
		displayName: string(),
		addedAt: string().default(''),
		changedAt: string().default(''),
	}).index('by_user', ['userId']),

	// `ink` is the household's colour token (D42) — the tile on the rail, in the
	// switcher and on the invite card. Added after the fact, so a row from before
	// it holds '' and `householdInk()` resolves that to a stable default.
	households: table({
		name: string(),
		// Provenance only. Ownership is memberships.role — see D22.
		createdBy: string(),
		defaultThreshold: string().default('1'),
		ink: string().default(''),
		// No `changedAt` here, deliberately (D44): nothing orders households by
		// recency, and a rename is not an event anything in the app reacts to.
		addedAt: string().default(''),
	}),

	memberships: table({
		householdId: id('households'),
		userId: string(),
		displayName: string(),
		// A denormalized copy of the account's avatar URL, for the same reason
		// `displayName` is one: the member list is a live query and must not join
		// a row per member to draw a face. '' means none — an account with no
		// Gravatar, and every row written before this column existed.
		picture: string().default(''),
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

	// `icon` is written as `''` and read by nothing: the glyph sets were cut
	// before v1 (D34) and the column is kept because dropping one needs
	// `sf db migrate --drop`, while filling it again later is additive.
	locations: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
		icon: string(),
		// D44's pair. `addedAt` is ours because the platform's `createdAt` cannot
		// be set by app code and so cannot survive an undo's re-insert; `changedAt`
		// is ours for the same reason `updatedAt` is not used. Both default to ''
		// and nothing backfills, so `addedAtOf()` / `changedAtOf()` fall back.
		addedAt: string().default(''),
		changedAt: string().default(''),
	}).index('by_household', ['householdId']),

	// Same as `locations`: reserved, not read. See D34.
	types: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
		icon: string(),
		// D44's pair. `addedAt` is ours because the platform's `createdAt` cannot
		// be set by app code and so cannot survive an undo's re-insert; `changedAt`
		// is ours for the same reason `updatedAt` is not used. Both default to ''
		// and nothing backfills, so `addedAtOf()` / `changedAtOf()` fall back.
		addedAt: string().default(''),
		changedAt: string().default(''),
	}).index('by_household', ['householdId']),

	// Stores never had the `icon` column at all.
	//
	// `kind` is what makes a store a *source* (D58) — `shop`, `grow` or `make`,
	// and `''` for every row written before it, which `toSourceKind()` resolves
	// to `shop`. That default is not a placeholder: every source in the app was
	// a shop until this column existed, so an unset value is the right answer
	// rather than a missing one.
	stores: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
		kind: string().default(''),
		// D44's pair. `addedAt` is ours because the platform's `createdAt` cannot
		// be set by app code and so cannot survive an undo's re-insert; `changedAt`
		// is ours for the same reason `updatedAt` is not used. Both default to ''
		// and nothing backfills, so `addedAtOf()` / `changedAtOf()` fall back.
		addedAt: string().default(''),
		changedAt: string().default(''),
	}).index('by_household', ['householdId']),

	// `addedAt` is when the *item* entered the pantry, which outlives the row it
	// is on: undo re-inserts (D17), so a restored item is a new row with a new
	// `createdAt`, and this is what carries its place in *Recently added* across
	// that. Zero refuses an app-set `createdAt` outright, so the stamp has to be
	// ours, and `changedAt` is ours for the same reason. Both were added after
	// the fact, so a row from before them holds '' and the fallbacks in
	// `shared/stamp.ts` answer for it.
	items: table({
		householdId: id('households'),
		name: string(),
		locationId: id('locations'),
		qty: string(),
		threshold: string(),
		// How big *one* of the thing is, and in what unit — a pair that is never
		// half-set (`shared/size.ts`). `unit` holds a slug, never an
		// abbreviation, for the reason D32 gives about term colours: what is
		// stored must survive us changing what it prints.
		size: string().default(''),
		unit: string().default(''),
		// Never joins the run list, however low it gets. **Retired (D60)**: a
		// source's kind says what this said, and better, so nothing writes `true`
		// any more. Kept because dropping a column needs `sf db migrate --drop`
		// while filling it again is additive (D34), and because the rows that
		// already hold it must keep behaving as they did. See `needsBuying`.
		offShoppingList: boolean().default(false),
		// When a grown thing is ready, as two month numbers — `'6'` to `'9'`, and
		// `''` for no season at all (D58). A pair that is never half-set, the way
		// `size` and `unit` are, and `shared/season.ts` owns that rule.
		//
		// **Months, not dates**: a season repeats and a date does not, so there is
		// no year, no locale and no format to store. `seasonFrom` above
		// `seasonTo` wraps the turn of the year — November to February is a real
		// season and reads as one.
		seasonFrom: string().default(''),
		seasonTo: string().default(''),
		notes: string().default(''),
		addedAt: string().default(''),
		changedAt: string().default(''),
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

	// The admin console's audit log (D62). **The eleventh table, and the first
	// new one since `profiles`.**
	//
	// Two things about its shape are forced by the platform and worth reading
	// before editing it.
	//
	// **Every field is a string, including the counts**, because there is no
	// numeric type — the same constraint `qty` lives under. Nothing sorts on
	// them, so nothing is at risk from "10" < "2" here.
	//
	// **`held` is JSON in a string**, and that is the smaller of two bad
	// options. Zero has no array or JSON type; the alternative is five columns
	// that only a deletion row ever fills, and a column is permanent with
	// nothing to backfill it (D44). `shared/activity.ts` owns the encoding and
	// its decoder never throws, because a row is written once and read forever.
	//
	// **The denormalisation is deliberate and it is only here.** A deletion row
	// is the only surviving record of the thing it describes, so it carries its
	// own copy — `targetName`, `targetInk`, `targetId` and `held` — and an
	// `id()` pointing at a deleted household would resolve to nothing. Every
	// other row could join, and denormalises anyway so that one read answers.
	//
	// No `changedAt`: an audit row is never edited. `at` is ours rather than the
	// platform's `createdAt` for D44's reason — a stamp this app sorts by is a
	// stamp this app writes.
	activity: table({
		at: string(),
		// '' for an actor that is not a person. See `ACTOR_KINDS`.
		actorId: string().default(''),
		actorName: string().default(''),
		actorKind: string().default('person'),
		action: string(),
		targetKind: string().default(''),
		targetId: string().default(''),
		targetName: string().default(''),
		// A household's colour token, so a deleted household's tile still draws
		// in the log. '' for every other target.
		targetInk: string().default(''),
		// A role, a name — whatever the action moved between. Both '' when the
		// action moved nothing.
		fromValue: string().default(''),
		toValue: string().default(''),
		held: string().default(''),
	}).index('by_at', ['at']),
};

export default capsule({
	name: 'Larder Log',
	schema,

	queries: {
		/**
		 * Who the caller is, by the only name anyone else in a household sees.
		 *
		 * The first thing the client asks, and the one query that can answer
		 * before there is a household to answer about — which is the point.
		 * Someone accepting an invite never sees *Name your household*, and they
		 * are exactly the person whose name other people need, so the name is
		 * collected before the path forks (D46).
		 *
		 * **`needsName` is not "has no profile row".** An account that predates
		 * this table carries the identity name it joined under on every
		 * membership it holds; sending it through a screen it has effectively
		 * already answered would be a wall in front of people who were using the
		 * app yesterday. So an inherited name grandfathers the account, and only
		 * an account with no name *anywhere* is stopped.
		 *
		 * Nothing here is the identity's own `displayName`. The client has that
		 * already and uses it to prefill the field — a suggestion is not an
		 * answer, and reporting one as `displayName` would make `needsName`
		 * disagree with the value beside it.
		 */
		profile: query(async (ctx): Promise<ProfileResult> => {
			if (! signedIn(ctx)) return { state: 'guest' };

			const row = await ctx.db.profiles
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.first();

			if (row) return { state: 'ready', displayName: row.displayName, needsName: false };

			const memberships = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			const inherited = pickDisplayName(...memberships.map((m) => m.displayName));

			return { state: 'ready', displayName: inherited, needsName: inherited === '' };
		}),

		/**
		 * Every household the caller belongs to, for the switcher.
		 *
		 * Deliberately thin: a name, this caller's role *there*, and an item
		 * count. Anything more would be a second copy of `household`, refetched
		 * every time any of them changed.
		 *
		 * Takes no argument, so it is the one subscription that survives a
		 * switch untouched — which is what lets the switcher stay on screen and
		 * keep its checkmark honest while the other two queries re-run.
		 */
		households: query(async (ctx): Promise<HouseholdListResult> => {
			if (! signedIn(ctx)) return { state: 'guest' };

			const rows = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			if (rows.length === 0) return { state: 'no-household' };

			const summaries: HouseholdSummary[] = [];

			for (const row of rows) {
				const household = await ctx.db.households.get(row.householdId);

				// A membership whose household is gone is skipped rather than
				// reported: there is nothing to switch to and nothing to fix.
				if (! household) continue;

				const items = await ctx.db.items
					.withIndex('by_household', (r) => r.eq('householdId', row.householdId))
					.collect();

				summaries.push({
					id: household.id,
					name: household.name,
					role: toRole(row.role),
					itemCount: items.length,
					// Resolved here, once, so the switcher and the rail never have
					// to decide what an unset colour looks like.
					ink: householdInk(household.ink, household.id),
				});
			}

			if (summaries.length === 0) return { state: 'no-household' };

			// Same ordering `selectMembership` defaults by, so the list's first
			// row is the one an unset selection lands on.
			summaries.sort((a, b) => a.id.localeCompare(b.id));

			return { state: 'ready', households: summaries };
		}),

		/**
		 * The named household, its members, and its live invites.
		 *
		 * Separate from `pantry` so an item edit does not refetch the member
		 * list — the one split `invalidate()` actually makes worthwhile (D26).
		 */
		household: query(async (ctx, householdId: string): Promise<HouseholdResult> => {
			const state = await membershipState(ctx, householdId);

			// Queries report rather than throw — a thrown query never reaches the
			// client at all. See `QueryState` in `shared/types.ts`.
			if (state.kind === 'guest') return { state: 'guest' };
			if (state.kind === 'none') return { state: 'no-household' };

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
				// The id is the reconciliation point: the client stores a
				// selection per device, and this is the household the server
				// actually answered for (D33).
				household: {
					id: household.id,
					name: household.name,
					defaultThreshold: household.defaultThreshold,
					ink: householdInk(household.ink, household.id),
				},
				me: { membershipId: membership.id, userId: membership.userId, role: membership.role },
				members: members.map((m) => ({
					id: m.id,
					userId: m.userId,
					displayName: m.displayName,
					picture: m.picture,
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
		pantry: query(async (ctx, householdId: string): Promise<PantryResult> => {
			const state = await membershipState(ctx, householdId);

			if (state.kind === 'guest') return { state: 'guest' };
			if (state.kind === 'none') return { state: 'no-household' };

			// Not necessarily the id that was asked for: `membershipState` falls
			// back when the caller is no longer a member of the one they named.
			const resolvedId = state.membership.householdId;

			const [items, itemTypes, itemStores, locations, types, stores] = await Promise.all([
				ctx.db.items.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
				ctx.db.itemTypes.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
				ctx.db.itemStores.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
				ctx.db.locations.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
				ctx.db.types.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
				ctx.db.stores.withIndex('by_household', (r) => r.eq('householdId', resolvedId)).collect(),
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
					size: item.size,
					unit: item.unit,
					offShoppingList: item.offShoppingList,
					seasonFrom: item.seasonFrom,
					seasonTo: item.seasonTo,
					notes: item.notes,
					typeIds: typesByItem.get(item.id) ?? [],
					storeIds: storesByItem.get(item.id) ?? [],
					// Zero's own stamp (D35). Nothing writes it, and nothing can.
					createdAt: item.createdAt,
					// Ours, and the ones every ordering in the app actually uses —
					// see `shared/stamp.ts`. Both are `''` on a row written before
					// the columns, which is what the fallbacks are for.
					addedAt: item.addedAt,
					changedAt: item.changedAt,
				})),
				// A–Z, once and here, so the drawer's filters, the item sheet's
				// chips and the shopping list's cards cannot disagree about the
				// order of the same three lists.
				locations: byName(locations).map(termDto),
				types: byName(types).map(termDto),
				stores: byName(stores).map(sourceDto),
			};
		}),

		/**
		 * What an invite link says about itself, to whoever is holding it.
		 *
		 * **The one query that answers a guest.** Every other read resolves a
		 * membership first; this one cannot, because the whole point of the
		 * `?join=` landing is to tell a signed-out stranger which household they
		 * have been asked into and by whom. The code is the authorization.
		 *
		 * What it will not do is confirm that a code *existed*. Unknown,
		 * malformed and **revoked** all return the same bare `invalid`, matching
		 * `redeemInvite`'s refusal to distinguish them — naming the household
		 * behind a dead link would tell a stranger something about it. Expiry is
		 * the exception the design asks for: an expired code is one someone was
		 * genuinely given, and the screen exists to say who to ask for another.
		 */
		invitePreview: query(async (ctx, rawCode: string): Promise<InvitePreviewResult> => {
			const code = normalizeCode(rawCode);

			if (! isCodeShaped(code)) return { state: 'invalid' };

			const invite = await ctx.db.invites
				.withIndex('by_code', (r) => r.eq('code', code))
				.first();

			if (! invite || invite.revoked) return { state: 'invalid' };

			const row = await ctx.db.households.get(invite.householdId);

			// The invite outlived its household. Nothing to join and nothing to
			// explain, so it is the same dead link as a revoked one.
			if (! row) return { state: 'invalid' };

			const members = await ctx.db.memberships
				.withIndex('by_household', (r) => r.eq('householdId', invite.householdId))
				.collect();

			// The household's own colour now, not its first location's — which is
			// what this stood in for until `households.ink` existed (D42). The
			// card and the rail still agree the moment you land inside, and they
			// agree on something somebody chose.
			const household = { name: row.name, ink: householdInk(row.ink, row.id) };

			// Checked before expiry: someone who is already in is already in, and
			// telling them a link they cannot use has also run out would be two
			// pieces of bad news for one non-problem.
			if (signedIn(ctx) && members.some((m) => m.userId === ctx.auth.userId)) {
				return { state: 'member', household, householdId: invite.householdId };
			}

			const inviter = members.find((m) => m.userId === invite.createdBy)?.displayName ?? 'an owner';
			const role = toRole(invite.role);

			if (isExpired(invite.expiresAt, Date.now())) {
				return { state: 'expired', household, role, inviter };
			}

			return { state: 'valid', household, role, inviter, expiresAt: invite.expiresAt };
		}),

		/**
		 * Whether the caller administers the space.
		 *
		 * The one console query that is cheap enough to run on every load, and
		 * the only one anybody who is not an administrator ever calls: the
		 * account menu subscribes to it to decide whether to draw its *Admin*
		 * row, and everything else in the console is behind that row.
		 *
		 * It answers `false` rather than refusing, because it *is* the refusal —
		 * the two console queries below use `denied`, and this one is what stops
		 * a non-administrator from reaching them in the first place.
		 */
		adminAccess: query(async (ctx): Promise<AdminAccessResult> => {
			/*
			 * `writesHeld` rides along rather than being a second query or a
			 * constant the client reads for itself. The rule depends on *who is
			 * asking* now — a dev guest is exempt — and a client that worked that
			 * out from its own identity would be a second copy of a security
			 * rule, which is the arrangement `termBlock` exists to avoid.
			 */
			// A non-administrator is told `true`, which is the safe direction: it
			// is not a permission (`requireAdminWrite` re-checks everything), it
			// is what the client would render if it ever asked.
			return {
				admin: administers(ctx),
				writesHeld: ! administers(ctx) || adminWritesHeldFor(ctx.auth),
			};
		}),

		/**
		 * Overview — four cards, twelve months, and what needs attention.
		 *
		 * **This scans the whole space, six tables of it**, and there is no
		 * cheaper way: Zero's query builder is `collect` / `take` / `first` /
		 * `paginate` with no aggregate at all, so a count is a scan and there is
		 * nothing to push down. `by_creation` is what makes it possible without
		 * a schema change — every table has one, including `households`, which
		 * declares no index of its own.
		 *
		 * The cost is linear in the whole database and it is fine at the size
		 * this app is: a few households, a few hundred items. **It stops being
		 * fine somewhere in the low thousands**, and the fix when it does is a
		 * denormalized counts row per household maintained by the mutations that
		 * already invalidate, not a smarter query — there is no smarter query to
		 * write. Recorded here rather than discovered later.
		 */
		adminSummary: query(async (ctx): Promise<AdminSummaryResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			const nowIso = new Date().toISOString();
			const [households, memberships, items, invites] = await Promise.all([
				ctx.db.households.withIndex('by_creation').collect(),
				ctx.db.memberships.withIndex('by_creation').collect(),
				ctx.db.items.withIndex('by_creation').collect(),
				ctx.db.invites.withIndex('by_creation').collect(),
			]);

			// One pass each, keyed by household, so the per-household questions
			// below are lookups rather than a filter per household.
			const owners = new Set<string>();
			const people = new Set<string>();
			const memberFirstSeen = new Map<string, string>();

			for (const m of memberships) {
				if (toRole(m.role) === 'owner') owners.add(m.householdId);

				people.add(m.userId);

				// The earliest membership an account holds is the closest thing
				// to when it joined — there is no accounts table to ask.
				const seen = memberFirstSeen.get(m.userId);

				if (! seen || m.createdAt < seen) memberFirstSeen.set(m.userId, m.createdAt);
			}

			const itemCount = new Map<string, number>();

			for (const it of items) {
				itemCount.set(it.householdId, (itemCount.get(it.householdId) ?? 0) + 1);
			}

			const lastActive = await lastActiveByHousehold(ctx.db, items);

			let noOwner = 0, dormant = 0, empty = 0;

			for (const h of households) {
				if (! owners.has(h.id)) noOwner++;
				if (isDormant(lastActive.get(h.id) ?? '', nowIso)) dormant++;
				if (! itemCount.get(h.id)) empty++;
			}

			const months = monthKeysBack(nowIso);
			const series = cumulativeByMonth(
				households.map((h) => addedAtOf(h)),
				months
			).map((value, i) => ({
				month: months[i],
				// The year rides the ends only, which is what the board draws:
				// `Sep 2025 · Dec · Mar · Jun · Aug 2026`.
				label: monthLabel(months[i], i === 0 || i === months.length - 1),
				value,
			}));

			return {
				state: 'ready',
				households: households.length,
				people: people.size,
				items: items.length,
				// Live means neither revoked nor expired — the number an
				// administrator could act on, not the number of rows.
				invites: invites.filter((i) => ! i.revoked && ! isExpired(i.expiresAt, Date.now())).length,
				newHouseholds: households.filter((h) => isWithinDays(addedAtOf(h), nowIso, RECENT_DAYS)).length,
				newPeople: [...memberFirstSeen.values()]
					.filter((iso) => isWithinDays(iso, nowIso, RECENT_DAYS)).length,
				newItems: items.filter((i) => isWithinDays(addedAtOf(i), nowIso, RECENT_DAYS)).length,
				noOwner,
				dormant,
				empty,
				series,
			};
		}),

		/**
		 * The household list — searched, filtered by one chip, sorted, and paged.
		 *
		 * **Every one of those four happens here, over the whole scan**, and
		 * that is deliberate rather than lazy. `paginate()` exists and would
		 * page the raw table cheaply, but it cannot answer *matching* or the
		 * three chip counts without reading the rest anyway, and it cannot sort
		 * by a derived column at all — items and last-active are computed, not
		 * stored. Slicing a list we already hold is the honest version of what
		 * the boards draw. The scaling note on `adminSummary` applies here too.
		 *
		 * **Search covers the name and the id, and nothing else.** The boards say
		 * *"Search by name, member or email"*; there are no emails to search
		 * (D56 — a Spacefast account carries no `email` claim and a handler is
		 * only ever told about its caller), so the placeholder says what is true.
		 * Member names are searched, because those the app does hold.
		 */
		adminHouseholds: query(async (
			ctx,
			args: {
				search?: string;
				filter?: AdminHouseholdFilter;
				sort?: AdminHouseholdSort;
				offset?: number;
				pageSize?: number;
			} = {}
		): Promise<AdminHouseholdsResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			const nowIso = new Date().toISOString();
			const [households, memberships, items] = await Promise.all([
				ctx.db.households.withIndex('by_creation').collect(),
				ctx.db.memberships.withIndex('by_creation').collect(),
				ctx.db.items.withIndex('by_creation').collect(),
			]);

			const byHousehold = new Map<string, typeof memberships>();

			for (const m of memberships) {
				const list = byHousehold.get(m.householdId);

				if (list) list.push(m); else byHousehold.set(m.householdId, [m]);
			}

			const itemCount = new Map<string, number>();

			for (const it of items) {
				itemCount.set(it.householdId, (itemCount.get(it.householdId) ?? 0) + 1);
			}

			const lastActive = await lastActiveByHousehold(ctx.db, items);

			const rows: AdminHouseholdRow[] = households.map((h) => {
				const members = byHousehold.get(h.id) ?? [];
				const active = lastActive.get(h.id) ?? '';
				const count = itemCount.get(h.id) ?? 0;

				return {
					id: h.id,
					name: h.name,
					// Resolved here for the reason `HouseholdSummary.ink` is:
					// every row written before D42 holds '' and one resolver
					// beats a `householdInk()` at every render site.
					ink: householdInk(h.ink, h.id),
					// Three faces then a count — the stacked trio's existing cap
					// (D55), applied before the DTO leaves rather than after.
					faces: members.slice(0, 3).map((m) => ({ name: m.displayName, picture: m.picture })),
					members: members.length,
					items: count,
					lastActive: active,
					noOwner: ! members.some((m) => toRole(m.role) === 'owner'),
					dormant: isDormant(active, nowIso),
					empty: count === 0,
				};
			});

			const counts = {
				noOwner: rows.filter((r) => r.noOwner).length,
				dormant: rows.filter((r) => r.dormant).length,
				empty: rows.filter((r) => r.empty).length,
			};

			const filter = args.filter ?? 'all';
			const chipped = rows.filter((r) => (
				filter === 'no-owner' ? r.noOwner
					: filter === 'dormant' ? r.dormant
					: filter === 'empty' ? r.empty
					: true
			));

			const needle = (args.search ?? '').trim().toLowerCase();
			const searched = needle
				? chipped.filter((r) => (
					r.name.toLowerCase().includes(needle) ||
					r.id.toLowerCase().includes(needle) ||
					(byHousehold.get(r.id) ?? []).some((m) => m.displayName.toLowerCase().includes(needle))
				))
				: chipped;

			const sort = args.sort ?? 'name';

			searched.sort((a, b) => {
				// A tie always falls back to the name, so a page boundary lands
				// in the same place twice. Row ids are sequential integers on the
				// hosted runtime and would sort as strings, which is not an order
				// anybody could predict.
				//
				// `relevance` is only reachable while `needle` is set — the client
				// drops it the moment the field is cleared — but it is checked
				// against the needle here too, because a stale argument must not
				// leave every row scoring zero and the list in id order.
				if (sort === 'relevance' && needle) {
					const sa = matchScore(needle, a.name, memberNames(byHousehold, a.id), a.id);
					const sb = matchScore(needle, b.name, memberNames(byHousehold, b.id), b.id);

					return sb - sa || a.name.localeCompare(b.name);
				}

				if (sort === 'items') return b.items - a.items || a.name.localeCompare(b.name);
				if (sort === 'members') return b.members - a.members || a.name.localeCompare(b.name);
				if (sort === 'recent') {
					// '' sorts last rather than first: a household with nothing
					// readable is not the most recently active one.
					if (a.lastActive !== b.lastActive) {
						if (! a.lastActive) return 1;
						if (! b.lastActive) return -1;

						return a.lastActive < b.lastActive ? 1 : -1;
					}

					return a.name.localeCompare(b.name);
				}

				return a.name.localeCompare(b.name);
			});

			const pageSize = Math.min(Math.max(Math.floor(args.pageSize ?? ADMIN_PAGE_SIZE), 1), 100);
			// Clamped against the *filtered* length, so narrowing the chip while
			// on page 4 lands on the last page rather than on nothing.
			const offset = Math.max(0, Math.min(Math.floor(args.offset ?? 0), Math.max(0, searched.length - 1)));

			return {
				state: 'ready',
				rows: searched.slice(offset, offset + pageSize),
				matching: searched.length,
				total: rows.length,
				counts,
				offset,
				pageSize,
			};
		}),

		/**
		 * One household — board 3, the page the metadata-only rule is about.
		 *
		 * **Everything it returns is a count, a name, or a date.** That is not an
		 * observation about what happens to be here; it is the rule, and this
		 * handler is where it is enforceable. There is no route from it to an
		 * item, a note, a quantity or a term name, and adding one would need this
		 * comment deleted first.
		 *
		 * Unlike the two above, it reads through `by_household` rather than
		 * scanning: it is about one row, so the indexes the app already declares
		 * are exactly right and there is nothing to bucket.
		 */
		adminHousehold: query(async (
			ctx,
			householdId: string
		): Promise<AdminHouseholdDetailResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			const household = householdId ? await ctx.db.households.get(householdId) : null;

			// A household deleted while the page was open, or an id typed wrong.
			// It is a state rather than a throw for the reason every query here is
			// (see `QueryState`) — a query that throws never emits at all.
			if (! household) return { state: 'missing' };

			const id = household.id;
			const [memberships, items, locations, types, stores, invites] = await Promise.all([
				ctx.db.memberships.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
				ctx.db.items.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
				ctx.db.locations.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
				ctx.db.types.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
				ctx.db.stores.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
				ctx.db.invites.withIndex('by_household', (r) => r.eq('householdId', id)).collect(),
			]);

			const nowIso = new Date().toISOString();
			const now = Date.now();

			// The same rule `lastActiveByHousehold` applies across the space, on
			// one household's own rows: the newest stamp on anything it owns.
			let lastActive = '';

			for (const row of [...items, ...locations, ...types, ...stores]) {
				const iso = changedAtOf(row);

				if (iso && iso > lastActive) lastActive = iso;
			}

			// Who minted each invite, by name. `createdBy` is a userId and the
			// membership rows are the only place this app can turn one into a
			// name — an account that has since left the household resolves to ''
			// and the client says *someone who has left* rather than an id.
			const nameOf = new Map<string, string>();

			for (const m of memberships) nameOf.set(m.userId, m.displayName);

			const owned = memberships.some((m) => toRole(m.role) === 'owner');

			return {
				state: 'ready',
				createdAt: addedAtOf(household) || household.createdAt,
				household: {
					id,
					name: household.name,
					ink: householdInk(household.ink, id),
					faces: memberships.slice(0, 3).map((m) => ({ name: m.displayName, picture: m.picture })),
					members: memberships.length,
					items: items.length,
					lastActive,
					noOwner: ! owned,
					dormant: isDormant(lastActive, nowIso),
					empty: items.length === 0,
				},
				holds: {
					items: items.length,
					locations: locations.length,
					stores: stores.length,
					types: types.length,
				},
				members: memberships.map((m) => ({
					id: m.id,
					userId: m.userId,
					name: m.displayName,
					picture: m.picture,
					role: toRole(m.role),
					joinedAt: m.createdAt,
				})),
				// Live only. A revoked or expired invite is not a fact about the
				// household any more, and a list that kept them would grow forever
				// while saying less each time.
				invites: invites
					.filter((i) => ! i.revoked && ! isExpired(i.expiresAt, now))
					.map((i) => ({
						id: i.id,
						role: toRole(i.role),
						expiresAt: i.expiresAt,
						issuedAt: i.createdAt,
						issuedBy: nameOf.get(i.createdBy) ?? '',
						// **No `code`.** See `AdminInvite` — a code is the
						// authorization, so putting one here would hand every
						// administrator a quiet way into any pantry, which is the
						// one thing this page's own refusal card promises not to do.
					})),
			};
		}),

		/**
		 * Board 4 — every person in the space.
		 *
		 * **A person is not a row.** There is no accounts table, so this is the
		 * union of `profiles` and the distinct `userId`s across `memberships`,
		 * and both halves are needed: a profile with no memberships is somebody
		 * who named themselves and left everywhere, and a membership with no
		 * profile is an account that predates D46.
		 *
		 * **There is no `LAST SEEN` column and the boards' one cannot be built.**
		 * Nothing records a session. The nearest derivable value — the newest
		 * activity across the households they belong to — is activity by *anyone*
		 * in them, so it would attribute another member's edit to this person and
		 * be confidently wrong on the exact screen an administrator would trust
		 * it. `JOINED` takes the column instead, which is a date this app really
		 * holds.
		 *
		 * The same scan caveat as `adminSummary` applies, and more so: this reads
		 * five tables end to end.
		 */
		adminPeople: query(async (
			ctx,
			args: {
				search?: string;
				filter?: AdminPeopleFilter;
				sort?: AdminPeopleSort;
				offset?: number;
				pageSize?: number;
			} = {}
		): Promise<AdminPeopleResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			const adminIds = parseAdminIds(ctx.env[ADMIN_IDS_VAR]);
			const [households, memberships, profiles] = await Promise.all([
				ctx.db.households.withIndex('by_creation').collect(),
				ctx.db.memberships.withIndex('by_creation').collect(),
				ctx.db.profiles.withIndex('by_creation').collect(),
			]);

			const rows = buildPeople(households, memberships, profiles, adminIds, ctx.auth);

			const counts = {
				admins: rows.filter((r) => r.admin).length,
				noHousehold: rows.filter((r) => r.households === 0).length,
				soleOwner: rows.filter((r) => r.soleOwnerOf > 0).length,
			};

			const filter = args.filter ?? 'all';
			const chipped = rows.filter((r) => (
				filter === 'admins' ? r.admin
					: filter === 'no-household' ? r.households === 0
					: filter === 'sole-owner' ? r.soleOwnerOf > 0
					: true
			));

			const needle = (args.search ?? '').trim().toLowerCase();
			const searched = needle
				? chipped.filter((r) => (
					r.name.toLowerCase().includes(needle) ||
					r.userId.toLowerCase().includes(needle) ||
					r.tiles.some((t) => t.name.toLowerCase().includes(needle))
				))
				: chipped;

			const sort = args.sort ?? 'name';

			searched.sort((a, b) => {
				if (sort === 'relevance' && needle) {
					const sa = matchScore(needle, a.name, a.tiles.map((t) => t.name), a.userId);
					const sb = matchScore(needle, b.name, b.tiles.map((t) => t.name), b.userId);

					return sb - sa || a.name.localeCompare(b.name);
				}

				if (sort === 'households') return b.households - a.households || a.name.localeCompare(b.name);
				if (sort === 'joined') {
					if (a.joinedAt !== b.joinedAt) {
						if (! a.joinedAt) return 1;
						if (! b.joinedAt) return -1;

						return a.joinedAt < b.joinedAt ? 1 : -1;
					}

					return a.name.localeCompare(b.name);
				}

				return a.name.localeCompare(b.name);
			});

			const pageSize = Math.min(Math.max(Math.floor(args.pageSize ?? ADMIN_PAGE_SIZE), 1), 100);
			const offset = Math.max(0, Math.min(Math.floor(args.offset ?? 0), Math.max(0, searched.length - 1)));

			return {
				state: 'ready',
				rows: searched.slice(offset, offset + pageSize),
				matching: searched.length,
				total: rows.length,
				counts,
				offset,
				pageSize,
			};
		}),

		/**
		 * Board 5 — one account: where they are a member, and what they can do
		 * there.
		 *
		 * **What those households hold stays behind the same line the household
		 * page draws.** A member count and an item count are counts; there is no
		 * route from here to anything inside one.
		 *
		 * `soleOwner` on each household is the whole reason this query exists in
		 * the shape it does — it is what the pre-flight has to ask about, and
		 * computing it client-side would mean shipping every membership in the
		 * space to work out one person's.
		 */
		adminAccount: query(async (ctx, userId: string): Promise<AdminAccountResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			if (! userId) return { state: 'missing' };

			const adminIds = parseAdminIds(ctx.env[ADMIN_IDS_VAR]);
			const [households, memberships, profiles, invites] = await Promise.all([
				ctx.db.households.withIndex('by_creation').collect(),
				ctx.db.memberships.withIndex('by_creation').collect(),
				ctx.db.profiles.withIndex('by_creation').collect(),
				ctx.db.invites.withIndex('by_creator', (r) => r.eq('createdBy', userId)).collect(),
			]);

			const person = buildPeople(households, memberships, profiles, adminIds, ctx.auth)
				.find((p) => p.userId === userId);

			// An id that names nobody. It is a state and not a throw for the
			// reason every query here is — a throw never emits at all.
			if (! person) return { state: 'missing' };

			const items = await ctx.db.items.withIndex('by_creation').collect();
			const itemCount = new Map<string, number>();

			for (const it of items) {
				itemCount.set(it.householdId, (itemCount.get(it.householdId) ?? 0) + 1);
			}

			const byId = new Map(households.map((h) => [h.id, h]));
			const mine = memberships.filter((m) => m.userId === userId);

			return {
				state: 'ready',
				person,
				households: mine.flatMap((m) => {
					const household = byId.get(m.householdId);

					// A membership pointing at a household that is gone. `id()` is
					// not a foreign key, so this is a real state rather than a
					// defensive flourish — and a row nobody can reach is not a
					// household this person is in.
					if (! household) return [];

					const siblings = memberships.filter((x) => x.householdId === m.householdId);
					const owners = siblings.filter((x) => toRole(x.role) === 'owner');
					const soleOwner = toRole(m.role) === 'owner' && owners.length === 1;

					return [{
						id: household.id,
						name: household.name,
						ink: householdInk(household.ink, household.id),
						role: toRole(m.role),
						members: siblings.length,
						items: itemCount.get(household.id) ?? 0,
						soleOwner,
						// Only where the pre-flight will ask. A list of names per
						// household per person is the whole membership table
						// arriving to answer a question almost nobody asks.
						candidates: soleOwner
							? siblings
								.filter((x) => x.userId !== userId)
								.map((x) => ({ id: x.id, name: x.displayName || 'Someone' }))
							: [],
					}];
				}),
				invitesIssued: invites.filter((i) => ! i.revoked && ! isExpired(i.expiresAt, Date.now())).length,
				isSelf: userId === ctx.auth.userId,
			};
		}),

		/**
		 * Board 9 — the audit log, newest first.
		 *
		 * **This is the one place in Larder Log where an observed timestamp is
		 * the point.** The item sheet deliberately shows no timestamps anywhere;
		 * that rule is about items, and a log whose rows cannot be placed in time
		 * is not a log.
		 *
		 * It is the console's only query that reads **one** table, and the only
		 * one that pages with `by_at` rather than by slicing a scan — an audit
		 * log is append-only and ordered by the column it is indexed on, which is
		 * the shape `paginate()` was built for. It is still `collect()`d here for
		 * the total, which is the same scan caveat as everywhere else and the
		 * first thing to change when the table has real rows in it.
		 *
		 * `targetGone` is resolved per row because only the server can look, and
		 * it is what lets an opened entry say on its own face that the thing it
		 * describes no longer exists.
		 */
		adminActivity: query(async (
			ctx,
			args: { offset?: number; pageSize?: number } = {}
		): Promise<AdminActivityResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			const all = await ctx.db.activity.withIndex('by_at').order('desc').collect();
			const pageSize = Math.min(Math.max(Math.floor(args.pageSize ?? ADMIN_PAGE_SIZE), 1), 100);
			const offset = Math.max(0, Math.min(Math.floor(args.offset ?? 0), Math.max(0, all.length - 1)));
			const page = all.slice(offset, offset + pageSize);

			// One lookup per row on the page, not per row in the table.
			const rows = await Promise.all(page.map(async (r) => {
				let targetGone = false;

				if (r.targetKind === 'household' && r.targetId) {
					targetGone = ! (await ctx.db.households.get(r.targetId));
				} else if (r.targetKind === 'account' && r.targetId) {
					const still = await ctx.db.memberships
						.withIndex('by_user', (q) => q.eq('userId', r.targetId))
						.first();
					const profile = await ctx.db.profiles
						.withIndex('by_user', (q) => q.eq('userId', r.targetId))
						.first();

					targetGone = ! still && ! profile;
				}

				return {
					id: r.id,
					at: r.at || r.createdAt,
					actorId: r.actorId,
					actorName: r.actorName,
					actorKind: r.actorKind,
					action: r.action,
					targetKind: r.targetKind,
					targetId: r.targetId,
					targetName: r.targetName,
					targetInk: r.targetInk,
					fromValue: r.fromValue,
					toValue: r.toValue,
					held: r.held,
					targetGone,
				};
			}));

			return {
				state: 'ready',
				rows,
				total: all.length,
				offset,
				pageSize,
				retentionMonths: toRetentionMonths(ctx.env[RETENTION_VAR]),
			};
		}),

		/**
		 * A slice of the log, for export.
		 *
		 * **A range, not everything.** A button that hands over every row invites
		 * the habit of handing over every row, and an audit export is the one
		 * thing in this console that leaves it entirely.
		 *
		 * The bounds are inclusive of `from` and exclusive of `to`, which is what
		 * makes "one month" composable — the next month's `from` is this month's
		 * `to`, and no row is counted twice or missed at the boundary.
		 *
		 * It is capped, and it **says** when the cap bit. A truncated audit
		 * export that looks complete is worse than no export at all, so the flag
		 * rides the result rather than being inferred from the row count.
		 */
		adminActivityExport: query(async (
			ctx,
			from: string,
			to: string
		): Promise<AdminActivityExportResult> => {
			if (! administers(ctx)) return { state: 'denied' };

			// Bad bounds return an empty range rather than the whole table. The
			// failure mode of the opposite default is handing over everything.
			const lower = Number.isFinite(Date.parse(from)) ? from : '';
			const upper = Number.isFinite(Date.parse(to)) ? to : '';

			if (! lower || ! upper || lower >= upper) {
				return { state: 'ready', rows: [], from: lower, to: upper, capped: false, limit: EXPORT_LIMIT };
			}

			const page = await ctx.db.activity
				.withIndex('by_at', (r) => r.gte('at', lower).lt('at', upper))
				.order('desc')
				.take(EXPORT_LIMIT + 1);

			const capped = page.length > EXPORT_LIMIT;
			const rows = (capped ? page.slice(0, EXPORT_LIMIT) : page).map((r) => ({
				id: r.id,
				at: r.at || r.createdAt,
				actorId: r.actorId,
				actorName: r.actorName,
				actorKind: r.actorKind,
				action: r.action,
				targetKind: r.targetKind,
				targetId: r.targetId,
				targetName: r.targetName,
				targetInk: r.targetInk,
				fromValue: r.fromValue,
				toValue: r.toValue,
				held: r.held,
				// Not resolved here. An export is a record of what the log says,
				// and a column that means "true when you asked" is not a fact
				// about the event — it would read as data and age into a lie.
				targetGone: false,
			}));

			return { state: 'ready', rows, from: lower, to: upper, capped, limit: EXPORT_LIMIT };
		}),
	},

	mutations: {
		/**
		 * The account's name, set on first run and changed from Settings later.
		 *
		 * Two writes, and the second is the one to be careful about: the profile
		 * row is the record, and every membership this account holds carries a
		 * **copy** of the name so the member list and the invite card can be read
		 * without a join. A rename that skipped the copies would show the new
		 * name to the person who typed it and the old one to everybody else,
		 * which is the failure mode that makes a denormalized column worse than
		 * no column at all.
		 *
		 * Not scoped to a household, alone among the writes: an account is not
		 * inside one, and this is reachable before any exists.
		 */
		setDisplayName: mutation(async (ctx, rawName: string) => {
			if (! signedIn(ctx)) throw new AccessError('Sign in to use Larder Log.');

			const displayName = normalizeDisplayName(rawName);

			// Required, not skippable — the alternatives are an unnamed row in
			// Members or an email address, which is not a name and exposes one.
			if (! displayName) throw new AccessError('Enter the name you want the rest of your household to see.');

			const now = stampFrom(Date.now());

			const existing = await ctx.db.profiles
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.first();

			if (existing) {
				await ctx.db.profiles.update(existing.id, { displayName, changedAt: now });
			} else {
				await ctx.db.profiles.insert({
					userId: ctx.auth.userId,
					displayName,
					addedAt: now,
					changedAt: now,
				});
			}

			const memberships = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			for (const row of memberships) {
				// Skipped rather than rewritten when it already agrees: a rename
				// across five households should not be five writes when it is one.
				if (row.displayName === displayName) continue;

				await ctx.db.memberships.update(row.id, { displayName });
			}

			// `invitePreview` names the inviter, and it is read by someone who is
			// not signed in and cannot refresh anything themselves.
			ctx.invalidate('profile', 'household', 'invitePreview');
		}),

		/**
		 * Bring the caller's own avatar copy up to date, everywhere they belong.
		 *
		 * **Without this the column would be write-once at join time**, which is
		 * the wrong shape for the commonest case there is: somebody joins, then
		 * sets up their Gravatar afterwards. It is also the only thing that can
		 * reach a row written *before* the column existed — nothing backfills
		 * (D44), so every membership on the published space today holds `''` and
		 * would hold it forever.
		 *
		 * Deliberately not folded into `setDisplayName`, which is the other
		 * write-through: that one fires on a rename, and a picture changing has
		 * nothing to do with a name changing.
		 *
		 * Safe to call on every load, and the client does. It reads the caller's
		 * own rows and writes only the ones that disagree, so the steady state is
		 * a handful of index reads and no writes at all — and it can only ever
		 * write `ctx.auth.picture` onto rows keyed by `ctx.auth.userId`, which is
		 * why it needs no household argument and has nothing to authorize beyond
		 * being signed in.
		 */
		syncAccountAvatar: mutation(async (ctx) => {
			if (! signedIn(ctx)) throw new AccessError('Sign in to use Larder Log.');

			const picture = accountAvatar(ctx);

			const memberships = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			let changed = false;

			for (const row of memberships) {
				if (row.picture === picture) continue;

				await ctx.db.memberships.update(row.id, { picture });
				changed = true;
			}

			// Nothing moved on screen if nothing was written, and this runs on
			// every load — an unconditional invalidate would refetch the household
			// for every member of it on each other member's page load.
			if (changed) ctx.invalidate('household');
		}),

		/**
		 * A new household, owned by the caller — their first, or their fifth.
		 *
		 * D18 refused this to anyone who already belonged somewhere. D33 dropped
		 * that: the seeding below is what makes a second household usable the
		 * moment it is created, and the client switches to the id returned.
		 *
		 * Kept out of `requireMembership()` so that helper stays resolve-or-throw
		 * and remains usable from a read-only query context.
		 */
		createHousehold: mutation(async (ctx, name: string, ink?: string, sources?: unknown) => {
			if (! signedIn(ctx)) throw new AccessError('Sign in to use Larder Log.');

			const now = Date.now();

			const household = await ctx.db.households.insert({
				name: normalizeName(name) || 'My Pantry',
				createdBy: ctx.auth.userId,
				defaultThreshold: '1',
				addedAt: stampFrom(now),
				// Both creation surfaces arrive with one already picked — the first
				// colour unused across the caller's households. An absent or bogus
				// one stores '' and takes the id-derived default rather than
				// pinning every such household to one shared token.
				ink: toHouseholdInk(ink),
			});

			await ctx.db.memberships.insert({
				householdId: household.id,
				userId: ctx.auth.userId,
				// The account's name, not the identity's (D46). The two differ for
				// anyone who changed theirs, and this row is what the member list
				// renders.
				displayName: await accountName(ctx),
				picture: accountAvatar(ctx),
				role: 'owner',
			});

			// Seed the taxonomies. Without at least one location the household
			// cannot hold an item at all — `locationId` is required and there
			// are no nullable fields — so a bare household is a dead end.
			//
			// These go in through `insert` rather than `createTerm`, so they are
			// the one path that could leave a term unstamped. `stamps` is the
			// same object for every one of them: they arrive together, and
			// staggering them by a millisecond each would imply an order that
			// isn't real.
			const stamps = { addedAt: stampFrom(now), changedAt: stampFrom(now) };

			for (const seed of SEED_LOCATIONS) {
				await ctx.db.locations.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
					icon: '',
					...stamps,
				});
			}

			for (const seed of SEED_TYPES) {
				await ctx.db.types.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
					icon: '',
					...stamps,
				});
			}

			// The one taxonomy the caller has a say in (D61). `toSourceMix`
			// separates *never asked* from *asked and answered none*: an absent
			// argument takes the buy-only default, an explicit all-false seeds
			// nothing. A household with no sources is not a dead end the way one
			// with no locations would be — `itemStores` is a join table, so an
			// item can name none.
			//
			// Normalized here rather than trusted: the client is not an
			// authority on anything, and `kind` reaches a column that decides
			// which band a row lands in.
			for (const seed of seedSourcesFor(toSourceMix(sources))) {
				await ctx.db.stores.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
					kind: toSourceKind(seed.kind),
					...stamps,
				});
			}

			ctx.invalidate('households', 'household', 'pantry');

			return { householdId: household.id };
		}),

		updateHousehold: mutation(async (ctx, householdId: string, patch: { name?: string; defaultThreshold?: string; ink?: string }) => {
			const membership = await requireCapability(ctx, householdId, 'household:settings');

			const next: { name?: string; defaultThreshold?: string; ink?: string } = {};

			if (patch.name !== undefined) {
				if (! isValidName(patch.name)) throw new AccessError('A household needs a name.');
				next.name = normalizeName(patch.name);
			}

			if (patch.defaultThreshold !== undefined) {
				next.defaultThreshold = normalizeQty(patch.defaultThreshold);
			}

			// Colour rides the same capability as the name: both are the one look
			// every member of the household sees, so both are the owner's.
			if (patch.ink !== undefined) next.ink = toHouseholdInk(patch.ink);

			await ctx.db.households.update(membership.householdId, next);

			ctx.invalidate('households', 'household');
		}),

		// --- items ---

		addItem: mutation(
			async (
				ctx,
				householdId: string,
				draft: {
					name: string;
					locationId: string;
					qty: string;
					threshold: string;
					size?: string;
					unit?: string;
					offShoppingList?: boolean;
					// Both, or neither — `normalizeSeason` discards a half rather
					// than completing it. Only a grow item ever carries one, and
					// undo carries it back with the rest of the row.
					seasonFrom?: string;
					seasonTo?: string;
					notes?: string;
					typeIds?: string[];
					storeIds?: string[];
					/**
					 * The removed row's own stamps, on the undo path only (D17).
					 *
					 * Absent on an ordinary add, where both are now. Supplied, each
					 * is still validated and clamped — see `normalizeStamp`. Undo
					 * carries both so a restored item is indistinguishable from the
					 * one that was removed, which is what undo is supposed to mean.
					 */
					addedAt?: string;
					changedAt?: string;
				}
			) => {
				const membership = await requireCapability(ctx, householdId, 'item:write');

				if (! isValidName(draft.name)) throw new AccessError('An item needs a name.');

				// One clock read for both stamps: two calls can straddle a
				// millisecond, and an item whose `changedAt` predates its `addedAt`
				// is a row that was modified before it existed.
				const now = Date.now();

				// The location must be one of ours. `id()` is not a foreign key,
				// so nothing beneath this line would catch a bogus reference.
				assertInHousehold(await ctx.db.locations.get(draft.locationId), membership, 'That location');

				// One place makes the pair whole, and it is the same one the sheet
				// calls — a client that sends a number with no unit stores neither.
				const size = normalizeSize(draft.size, draft.unit);
				const season = normalizeSeason(draft.seasonFrom, draft.seasonTo);

				const item = await ctx.db.items.insert({
					householdId: membership.householdId,
					name: normalizeName(draft.name),
					locationId: draft.locationId,
					qty: normalizeQty(draft.qty),
					threshold: normalizeQty(draft.threshold),
					size: size.size,
					unit: size.unit,
					offShoppingList: draft.offShoppingList === true,
					seasonFrom: season.seasonFrom,
					seasonTo: season.seasonTo,
					notes: normalizeNotes(draft.notes),
					addedAt: normalizeStamp(draft.addedAt, now),
					changedAt: normalizeStamp(draft.changedAt, now),
				});

				await syncJoins(ctx.db, membership.householdId, item.id, draft.typeIds ?? [], draft.storeIds ?? []);

				// The switcher shows an item count, so adding or removing a row
				// changes the list. `adjustQty` and `updateItem` do not, which is
				// why they leave `households` alone — the hot path stays cheap.
				ctx.invalidate('pantry', 'households');

				return { id: item.id };
			}
		),

		updateItem: mutation(
			async (
				ctx,
				householdId: string,
				itemId: string,
				patch: {
					name?: string;
					locationId?: string;
					qty?: string;
					threshold?: string;
					size?: string;
					unit?: string;
					offShoppingList?: boolean;
					seasonFrom?: string;
					seasonTo?: string;
					notes?: string;
					typeIds?: string[];
					storeIds?: string[];
				}
			) => {
				const membership = await requireCapability(ctx, householdId, 'item:write');

				const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

				// Unconditional: this mutation is only reached by someone pressing
				// Save, and the join rows below can change without a single column
				// in `next` doing so.
				const next: Record<string, string | boolean> = { changedAt: stampFrom(Date.now()) };

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
				if (patch.offShoppingList !== undefined) next.offShoppingList = patch.offShoppingList === true;

				// The two halves move together or not at all. A patch naming only
				// one of them could otherwise leave the pair half-set, which is the
				// single state `shared/size.ts` exists to prevent — so the other
				// half is read off the stored row and the two are normalized
				// together.
				if (patch.size !== undefined || patch.unit !== undefined) {
					const size = normalizeSize(
						patch.size !== undefined ? patch.size : item.size,
						patch.unit !== undefined ? patch.unit : item.unit
					);
					next.size = size.size;
					next.unit = size.unit;
				}

				// The season's two halves move together for exactly the reason the
				// size's do, and through the same shape of guard: one month with no
				// other end is not a season, so a patch naming one reads the other
				// off the row and normalizes the pair.
				if (patch.seasonFrom !== undefined || patch.seasonTo !== undefined) {
					const season = normalizeSeason(
						patch.seasonFrom !== undefined ? patch.seasonFrom : item.seasonFrom,
						patch.seasonTo !== undefined ? patch.seasonTo : item.seasonTo
					);
					next.seasonFrom = season.seasonFrom;
					next.seasonTo = season.seasonTo;
				}

				await ctx.db.items.update(item.id, next);

				if (patch.typeIds !== undefined || patch.storeIds !== undefined) {
					await syncJoins(ctx.db, membership.householdId, item.id, patch.typeIds, patch.storeIds);
				}

				ctx.invalidate('pantry');
			}
		),

		/** The hottest path: `+1` / `-1`, clamped at zero by `fromInt`. */
		adjustQty: mutation(async (ctx, householdId: string, itemId: string, delta: number) => {
			const membership = await requireCapability(ctx, householdId, 'item:write');

			const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

			// Only ever one step. A client asking for -999 is a bug or an attack,
			// and neither deserves to be honored.
			const step = delta < 0 ? -1 : 1;

			// The hot path is not exempt: a quantity is information about the item,
			// so `-1` on a card is a change like any other (D44).
			await ctx.db.items.update(item.id, {
				qty: fromInt(toInt(item.qty) + step),
				changedAt: stampFrom(Date.now()),
			});

			ctx.invalidate('pantry');
		}),

		/**
		 * A hard delete. Undo is a client-held tombstone that re-runs `addItem`
		 * (D17), so there is no `deletedAt` and nothing filters on one.
		 */
		removeItem: mutation(async (ctx, householdId: string, itemId: string) => {
			const membership = await requireCapability(ctx, householdId, 'item:write');

			const item = assertInHousehold(await ctx.db.items.get(itemId), membership);

			await clearJoinsForItem(ctx.db, item.id);
			await ctx.db.items.delete(item.id);

			ctx.invalidate('pantry', 'households');
		}),

		// --- taxonomy ---

		createTerm: mutation(
			async (
				ctx,
				householdId: string,
				kind: TermKind,
				draft: {
					name: string;
					ink: string;
					/**
					 * A source's kind, from either of the two callers that have
					 * one.
					 *
					 * **Composing one is the ordinary path now.** All three of the
					 * app's draft rows carry the glyph, so a garden is a garden
					 * from the moment it is named — D58 shipped without that and
					 * made you name the source, press *Done*, re-open the panel
					 * with the pencil and find the row again to say what it was.
					 *
					 * Undo is the other caller and is why this argument existed
					 * first: undo re-inserts (D17), the same trade the stamps
					 * below make, so without it a restored garden would come back
					 * a shop.
					 *
					 * Unvalidated on purpose — `toSourceKind` resolves anything it
					 * does not recognise to `shop`, so a client sending nonsense
					 * gets the default rather than an error.
					 *
					 * Ignored for `location` and `type`, which have no column.
					 */
					kind?: string;
					/** The deleted term's own stamps, on the undo path only. See `addItem`. */
					addedAt?: string;
					changedAt?: string;
				}
			) => {
				const membership = await requireCapability(ctx, householdId, 'taxonomy:write');
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
				const owner = membership.householdId;
				const now = Date.now();
				const stamps = {
					addedAt: normalizeStamp(draft.addedAt, now),
					changedAt: normalizeStamp(draft.changedAt, now),
				};

				// `stores` has no `icon` column; the other two get the empty string
				// the reserved column holds (D34).
				const row =
					tableName === 'stores'
						? await ctx.db.stores.insert({
							householdId: owner, name, ink, kind: toSourceKind(draft.kind), ...stamps,
						})
						: await ctx.db[tableName].insert({ householdId: owner, name, ink, icon: '', ...stamps });

				ctx.invalidate('pantry');

				return { id: row.id };
			}
		),

		updateTerm: mutation(
			async (
				ctx,
				householdId: string,
				kind: TermKind,
				termId: string,
				patch: { name?: string; ink?: string }
			) => {
				const membership = await requireCapability(ctx, householdId, 'taxonomy:write');
				const tableName = termTable(kind);

				const term = assertInHousehold(
					await ctx.db[tableName].get(termId),
					membership,
					termLabel(kind)
				);

				const next: Record<string, string> = { changedAt: stampFrom(Date.now()) };

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

				await ctx.db[tableName].update(term.id, next);

				ctx.invalidate('pantry');
			}
		),

		/**
		 * What you do to get things from this source — shop, grow or make (D58).
		 *
		 * Its own mutation rather than a `kind` on `updateTerm`'s patch, because
		 * that handler's second argument is *already* called `kind` and means the
		 * taxonomy. `updateTerm(id, 'store', x, { kind: 'grow' })` reads as a
		 * contradiction and would be one to maintain.
		 *
		 * Stores only, and there is no `TermKind` parameter for the same reason:
		 * `locations` and `types` have no column, so a caller naming one is asking
		 * for something that cannot exist rather than something it may not do.
		 */
		setSourceKind: mutation(async (ctx, householdId: string, storeId: string, kind: string) => {
			const membership = await requireCapability(ctx, householdId, 'taxonomy:write');

			if (! isSourceKind(kind)) throw new AccessError('Unknown source kind.');

			const store = assertInHousehold(
				await ctx.db.stores.get(storeId),
				membership,
				termLabel('store')
			);

			// A no-op still costs a refetch of every subscriber's pantry, and the
			// menu is a radio group where pressing the current row is the ordinary
			// way to close it.
			if (toSourceKind(store.kind) === kind) return;

			await ctx.db.stores.update(store.id, { kind, changedAt: stampFrom(Date.now()) });

			ctx.invalidate('pantry');
		}),

		deleteTerm: mutation(async (ctx, householdId: string, kind: TermKind, termId: string) => {
			const membership = await requireCapability(ctx, householdId, 'taxonomy:write');
			const tableName = termTable(kind);

			const term = assertInHousehold(
				await ctx.db[tableName].get(termId),
				membership,
				termLabel(kind)
			);

			/*
			 * A term is deletable only once nothing references it — every kind,
			 * not just `location`.
			 *
			 * D16 guarded locations because they are *required*: Zero has no
			 * nullable column, so deleting one in use leaves a dangling id that
			 * renders as a silent box. Types and stores are optional tags, and
			 * this handler used to delete their join rows and carry on.
			 *
			 * That asymmetry is what changed. The editing row now shows an item
			 * count beside a trash that is live in every case, and the count is
			 * there to make the outcome predictable *before* the press. A count
			 * that means "blocked" on the Location rows and "these tags are
			 * about to vanish" on the Type rows teaches nothing.
			 *
			 * Counted off the join indexes rather than by scanning items, which
			 * is what `by_type` and `by_store` are for. Locations have no join
			 * table — the id is a column on the item — so that one still scans.
			 */
			const used = kind === 'location'
				? (await ctx.db.items
					.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
					.collect()
				).filter((i) => i.locationId === termId).length
				: kind === 'type'
					? (await ctx.db.itemTypes.withIndex('by_type', (r) => r.eq('typeId', termId)).collect()).length
					: (await ctx.db.itemStores.withIndex('by_store', (r) => r.eq('storeId', termId)).collect()).length;

			/*
			 * The client draws its blocked dialog from this same call, so the
			 * refusal and the explanation can never disagree — including the
			 * group's own word, which is `Source` rather than `Store` in a
			 * household that grows or cooks anything (D58). That costs one extra
			 * `collect()` on a delete that is about to be refused, which is the
			 * rarest path in the handler.
			 */
			const sources = kind === 'store'
				? await ctx.db.stores
					.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
					.collect()
				: [];

			const blocked = termBlock(
				kind,
				term.name,
				used,
				kind === 'store'
					? sourceGroupWord(sources.map((r) => ({ kind: toSourceKind(r.kind) })))
					: kind
			);

			if (blocked) throw new AccessError(blocked.body);

			await ctx.db[tableName].delete(term.id);

			ctx.invalidate('pantry');
		}),

		// --- invites and membership ---

		createInvite: mutation(async (ctx, householdId: string, grantedRole: string) => {
			const membership = await requireCapability(ctx, householdId, 'invite:create');

			const granted = toRole(grantedRole);

			// D21. Owners mint any level, editors mint viewer only. The editor
			// tier can only grow by owner action, and this is half of why —
			// `changeRole` below is the other half.
			if (! canInviteRole(membership.role, granted)) {
				throw new AccessError(`You cannot invite someone as ${granted}.`);
			}

			// Two writes, because the fallback entropy source *is* the row id and
			// so cannot be known before the insert. The transaction means a
			// caller never observes the placeholder.
			const minted = await ctx.transaction(async () => {
				const invite = await ctx.db.invites.insert({
					householdId: membership.householdId,
					code: PENDING_CODE,
					role: granted,
					expiresAt: expiryFrom(Date.now()),
					createdBy: membership.userId,
					// `revoked` is deliberately omitted rather than written as `false`.
					// It is the schema's only boolean column and this is its only
					// insert, which makes it the prime suspect for the hosted runtime's
					// 500; `.default(false)` produces the identical row either way.
				});

				const code = inviteCode(ctx.log, ctx.env, invite.id);

				await ctx.db.invites.update(invite.id, { code });

				return { code, expiresAt: invite.expiresAt };
			});

			ctx.invalidate('household');

			return minted;
		}),

		revokeInvite: mutation(async (ctx, householdId: string, inviteId: string) => {
			const membership = await requireCapability(ctx, householdId, 'invite:revoke');

			const invite = assertInHousehold(
				await ctx.db.invites.get(inviteId),
				membership,
				'That invite'
			);

			await ctx.db.invites.update(invite.id, { revoked: true });

			// `invitePreview` too: a stranger may be sitting on the landing card
			// this link opened, and revoking is meant to reach them.
			ctx.invalidate('household', 'invitePreview');
		}),

		redeemInvite: mutation(async (ctx, rawCode: string) => {
			if (! signedIn(ctx)) throw new AccessError('Sign in to join a household.');

			const code = normalizeCode(rawCode);

			if (! isCodeShaped(code)) throw new AccessError('That invite code is not valid.');

			const invite = await ctx.db.invites
				.withIndex('by_code', (r) => r.eq('code', code))
				.first();

			// One message for missing, revoked, and expired alike — a code is a
			// bearer credential, and separating the cases tells a guesser which
			// codes exist.
			if (! invite || invite.revoked || isExpired(invite.expiresAt, Date.now())) {
				throw new AccessError('That invite is no longer valid.');
			}

			// D18 refused a second membership anywhere; D33 narrows that to the
			// household the code is for. The check has to stay in some form: a
			// code must never change a current member's role, in either
			// direction, and a duplicate row would do exactly that.
			const existing = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', ctx.auth.userId))
				.collect();

			if (existing.some((row) => row.householdId === invite.householdId)) {
				throw new AccessError('You are already a member of that household.');
			}

			await ctx.db.memberships.insert({
				householdId: invite.householdId,
				userId: ctx.auth.userId,
				// The account's name, not the identity's (D46) — and this is the
				// path that most needs it: someone arriving on an invite is the
				// person the rest of the household is about to see a name for.
				displayName: await accountName(ctx),
				picture: accountAvatar(ctx),
				role: toRole(invite.role),
			});

			ctx.invalidate('households', 'household', 'pantry', 'invitePreview');

			return { householdId: invite.householdId };
		}),

		changeRole: mutation(async (ctx, householdId: string, membershipId: string, nextRole: string) => {
			const membership = await requireCapability(ctx, householdId, 'member:role');

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

		removeMember: mutation(async (ctx, householdId: string, membershipId: string) => {
			const membership = await requireCapability(ctx, householdId, 'member:remove');

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

			ctx.invalidate('households', 'household');
		}),

		leaveHousehold: mutation(async (ctx, householdId: string) => {
			const membership = await requireMembership(ctx, householdId);

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

			// The list is what the client falls back through: losing this row is
			// how it learns to show one of the others, or the first-run screen.
			ctx.invalidate('households', 'household', 'pantry');
		}),

		/** Owner only. Deletes every row scoped to the household, children first. */
		deleteHousehold: mutation(async (ctx, householdId: string) => {
			const membership = await requireCapability(ctx, householdId, 'household:delete');

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
					.withIndex('by_household', (r) => r.eq('householdId', membership.householdId))
					.collect();

				for (const row of rows) await ctx.db[name].delete(row.id);
			}

			await ctx.db.households.delete(membership.householdId);

			ctx.invalidate('households', 'household', 'pantry');
		}),

		/*
		 * --- the admin console's writes (D62) ---
		 *
		 * Six mutations that reach into a household the caller is **not** a
		 * member of, which is a thing nothing else in this capsule does. Every
		 * one of them starts with `requireAdminWrite` and there is no second line
		 * of defence anywhere beneath it — Zero has no row-level security, and an
		 * administrator has no membership row to resolve against.
		 *
		 * **All six are switched off right now.** `requireAdminWrite` is
		 * `requireAdmin` plus `ADMIN_WRITES_HELD`, and that flag is `true` while
		 * the console is being read rather than used. The handlers below are
		 * whole and unmodified on purpose: what is being tried out is the real
		 * console, and turning it back on is one constant in `shared/admin.ts`.
		 *
		 * Three rules are carried over deliberately rather than reimplemented,
		 * because an administrator is not exempt from any of them:
		 *
		 * - **D22's last-owner guard.** An admin cannot demote or remove a
		 *   household's only owner. That is not a limitation, it is the flow: the
		 *   fix for an ownerless household is to *promote* somebody, and a
		 *   console that could strand one would be manufacturing the very state
		 *   Overview flags as needing attention.
		 * - **D21's invite revocation.** A demotion or a removal kills the
		 *   invites that person minted, or an owner dropped to editor keeps
		 *   minting editors through a link already in the wild.
		 * - **The delete cascade**, children first, because Zero has none.
		 *
		 * Each invalidates the three console queries **and** the app's own, since
		 * the people affected are elsewhere with the app open and the whole point
		 * is that what they see changes.
		 */

		/** The household this admin write names, or a refusal. Never a membership. */
		adminSetRole: mutation(async (
			ctx,
			householdId: string,
			membershipId: string,
			nextRole: string
		) => {
			requireAdminWrite(ctx);

			const members = await adminMembersOf(ctx.db, householdId);
			const target = members.find((m) => m.id === membershipId);

			if (! target) throw new AccessError('That member is no longer in this household.');

			const role = toRole(nextRole);

			// D22, and it is what makes the ownerless case fixable rather than
			// creatable: promoting is always allowed, demoting the last owner
			// never is.
			if (role !== 'owner' && wouldStrandHousehold(members, membershipId)) {
				throw new AccessError(
					'This household needs at least one owner. Make someone else an owner first.'
				);
			}

			// Nothing to do, and saying so beats a write plus a refresh for
			// every subscriber — the same short-circuit `setSourceKind` makes,
			// and the reason a role menu's current row is a safe place to press.
			if (toRole(target.role) === role) return;

			const before = toRole(target.role);

			await ctx.db.memberships.update(target.id, { role });
			await revokeInvitesBy(ctx.db, householdId, target.userId);

			await logActivity(ctx, {
				action: 'member.role',
				targetKind: 'membership',
				targetId: target.id,
				targetName: target.displayName,
				fromValue: before,
				toValue: role,
			});

			ctx.invalidate(
				'adminHousehold', 'adminSummary', 'adminHouseholds', 'adminActivity',
				'household', 'pantry'
			);
		}),

		adminRemoveMember: mutation(async (ctx, householdId: string, membershipId: string) => {
			requireAdminWrite(ctx);

			const members = await adminMembersOf(ctx.db, householdId);
			const target = members.find((m) => m.id === membershipId);

			if (! target) throw new AccessError('That member is no longer in this household.');

			if (wouldStrandHousehold(members, membershipId)) {
				throw new AccessError(
					'This household needs at least one owner. Make someone else an owner first.'
				);
			}

			const household = await ctx.db.households.get(householdId);

			await revokeInvitesBy(ctx.db, householdId, target.userId);
			await ctx.db.memberships.delete(target.id);

			await logActivity(ctx, {
				action: 'member.remove',
				targetKind: 'membership',
				targetId: target.id,
				targetName: target.displayName,
				toValue: household?.name ?? '',
			});

			ctx.invalidate(
				'adminHousehold', 'adminSummary', 'adminHouseholds', 'adminActivity',
				'households', 'household', 'pantry'
			);
		}),

		adminRevokeInvite: mutation(async (ctx, householdId: string, inviteId: string) => {
			requireAdminWrite(ctx);

			const household = await ctx.db.households.get(householdId);

			if (! household) throw new AccessError('That household no longer exists.');

			const invite = await ctx.db.invites.get(inviteId);

			// The household id is checked against the row rather than trusted,
			// even though an administrator could name any household anyway. It
			// costs one comparison and it means a mismatched pair is a refusal
			// instead of a revocation somewhere nobody was looking.
			if (! invite || invite.householdId !== household.id) {
				throw new AccessError('That invite no longer exists.');
			}

			if (invite.revoked) return;

			await ctx.db.invites.update(invite.id, { revoked: true });

			await logActivity(ctx, {
				action: 'invite.revoke',
				targetKind: 'invite',
				targetId: invite.id,
				// The invite's own name is the household it lets you into — a code
				// is the one thing that must never reach this table.
				targetName: household.name,
				fromValue: toRole(invite.role),
				toValue: household.name,
			});

			// `invitePreview` too: a stranger may be sitting on the landing card
			// this link opened, and revoking is meant to reach them.
			ctx.invalidate(
				'adminHousehold', 'adminSummary', 'adminActivity', 'household', 'invitePreview'
			);
		}),

		/**
		 * Deletes a household and everything in it, on behalf of nobody in it.
		 *
		 * **The app's second typed confirmation, and it earns it.** The first —
		 * deleting your own last household — earned the exception by destroying
		 * data belonging to more than one screen. This destroys data belonging to
		 * people who are not in the room, and the typing happens client-side
		 * because the server has no way to tell a deliberate call from a careless
		 * one and should not pretend otherwise.
		 *
		 * The cascade is `deleteHousehold`'s, verbatim and for the same reason:
		 * join rows, then what they point at, then the household. Zero has no
		 * cascading deletes, so a table missed here is rows that outlive every
		 * route to them.
		 */
		adminDeleteHousehold: mutation(async (ctx, householdId: string) => {
			requireAdminWrite(ctx);

			const household = await ctx.db.households.get(householdId);

			if (! household) throw new AccessError('That household no longer exists.');

			// Counted **before** the cascade, because after it there is nothing
			// left to count and this row is the only surviving record of what was
			// there. That is the whole reason a deletion entry denormalises.
			const held = await countHousehold(ctx.db, household.id);

			await deleteHouseholdRows(ctx.db, household.id);

			await logActivity(ctx, {
				action: 'household.delete',
				targetKind: 'household',
				targetId: household.id,
				targetName: household.name,
				targetInk: householdInk(household.ink, household.id),
				held,
			});

			ctx.invalidate(
				'adminHousehold', 'adminSummary', 'adminHouseholds', 'adminActivity',
				'households', 'household', 'pantry'
			);
		}),

		/**
		 * Hands a household over: one member becomes its owner, and everyone who
		 * was an owner stops being one.
		 *
		 * **This is the capability the app did not have**, and it is not what the
		 * role menu does. Promoting somebody adds an owner; transferring *moves*
		 * ownership, which is two writes that have to happen together or the
		 * household briefly has two owners and might keep them. Deletion is what
		 * forced it to exist — and now that it does, the orphan case has
		 * something to call.
		 *
		 * A household with **no** owner is the case this is really for, and it
		 * needs no `from`: there is nobody to demote, so the transfer is the
		 * promotion. That is why the demotion is derived from the row rather than
		 * named by the caller — a client that had to say who the current owner
		 * was would be a client that could get it wrong.
		 */
		adminTransferOwnership: mutation(async (
			ctx,
			householdId: string,
			toMembershipId: string
		) => {
			requireAdminWrite(ctx);

			const members = await adminMembersOf(ctx.db, householdId);
			const target = members.find((m) => m.id === toMembershipId);

			if (! target) throw new AccessError('That member is no longer in this household.');

			// The promotion first, so there is never an instant with no owner —
			// which is the state this exists to get a household *out* of.
			if (toRole(target.role) !== 'owner') {
				await ctx.db.memberships.update(target.id, { role: 'owner' });
			}

			const previousOwners: string[] = [];

			for (const m of members) {
				if (m.id === target.id || toRole(m.role) !== 'owner') continue;

				previousOwners.push(m.displayName);
				await ctx.db.memberships.update(m.id, { role: 'editor' });
				// D21: a demoted owner's invites stop working, or somebody who
				// has just been handed a household finds the previous owner still
				// minting editors through a link already out.
				await revokeInvitesBy(ctx.db, householdId, m.userId);
			}

			const household = await ctx.db.households.get(householdId);

			await logActivity(ctx, {
				action: 'household.transfer',
				targetKind: 'household',
				targetId: householdId,
				targetName: household?.name ?? '',
				targetInk: household ? householdInk(household.ink, household.id) : '',
				fromValue: previousOwners.join(', '),
				toValue: target.displayName,
			});

			ctx.invalidate(
				'adminHousehold', 'adminAccount', 'adminPeople', 'adminHouseholds',
				'adminActivity', 'household', 'pantry'
			);
		}),

		/**
		 * Deletes an account: every membership it holds, and its profile row.
		 *
		 * **It does not delete the identity, and it cannot.** A Spacefast account
		 * lives on the platform; what this app owns is the rows keyed to its
		 * `userId`. So this removes the person from Larder Log completely, and
		 * signing in again would produce a stranger with the same id and no
		 * history — which is the honest description and belongs in the copy.
		 *
		 * **The pre-flight is what makes it reachable at all.** D22 blocks a sole
		 * owner from leaving a household; run that rule against every household
		 * at once and deleting an account becomes a wall for exactly the people
		 * most likely to want it. `decisions` turns each block into a choice, and
		 * the handler refuses rather than guessing when one is missing.
		 *
		 * Order matters and it is the reverse of what reads naturally: every
		 * decision is **validated before anything is written**, because a
		 * half-applied deletion leaves a household transferred to somebody and an
		 * account still present, with no record of either. Zero gives a mutation
		 * one transaction, but a thrown error partway through is still the worst
		 * possible moment to discover the third row was malformed.
		 */
		adminDeleteAccount: mutation(async (
			ctx,
			userId: string,
			decisions: AdminOwnershipDecision[] = []
		) => {
			requireAdminWrite(ctx);

			if (! userId) throw new AccessError('That account no longer exists.');

			const mine = await ctx.db.memberships
				.withIndex('by_user', (r) => r.eq('userId', userId))
				.collect();

			const profile = await ctx.db.profiles
				.withIndex('by_user', (r) => r.eq('userId', userId))
				.first();

			if (mine.length === 0 && ! profile) {
				throw new AccessError('That account no longer exists.');
			}

			// Which households this account solely owns — the ones a decision is
			// required for, recomputed here rather than trusted from the client.
			const needed: { householdId: string; membershipId: string }[] = [];

			for (const m of mine) {
				const members = await ctx.db.memberships
					.withIndex('by_household', (r) => r.eq('householdId', m.householdId))
					.collect();

				const owners = members.filter((x) => toRole(x.role) === 'owner');

				if (toRole(m.role) === 'owner' && owners.length === 1) {
					needed.push({ householdId: m.householdId, membershipId: m.id });
				}
			}

			// --- validate everything, then write ---

			const answered = new Map<string, AdminOwnershipDecision>();

			for (const d of decisions) {
				const need = needed.find((n) => n.householdId === d.householdId);

				// A decision about a household that needed none means the client
				// and the server disagree about the state. Dropping it quietly
				// would let a stale dialog delete a household nobody chose.
				if (! need) {
					throw new AccessError('Something changed while you were deciding. Open this again.');
				}

				if (answered.has(d.householdId)) {
					throw new AccessError('Something changed while you were deciding. Open this again.');
				}

				if (d.action === 'transfer') {
					const members = await ctx.db.memberships
						.withIndex('by_household', (r) => r.eq('householdId', d.householdId))
						.collect();

					const target = members.find((x) => x.id === d.toMembershipId);

					if (! target || target.userId === userId) {
						throw new AccessError('Choose someone else in that household to hand it to.');
					}
				} else if (d.action !== 'delete') {
					throw new AccessError('Something changed while you were deciding. Open this again.');
				}

				answered.set(d.householdId, d);
			}

			const unanswered = needed.filter((n) => ! answered.has(n.householdId));

			if (unanswered.length > 0) {
				const household = await ctx.db.households.get(unanswered[0].householdId);

				throw new AccessError(
					household
						? `Decide what happens to ${household.name} first.`
						: 'Something changed while you were deciding. Open this again.'
				);
			}

			// --- write ---

			// The account's own name, captured before its profile goes. After the
			// deletion there is nothing left to resolve it from, and this row is
			// the only surviving record that the account existed.
			const goingName = await accountNameOf(ctx.db, userId, ctx.auth);

			for (const [householdId, decision] of answered) {
				const household = await ctx.db.households.get(householdId);

				if (decision.action === 'delete') {
					// Counted before the cascade, and logged as its own entry: a
					// household deleted this way is as gone as one deleted from its
					// own page, and the log must not make the two look different.
					const held = await countHousehold(ctx.db, householdId);

					await deleteHouseholdRows(ctx.db, householdId);

					await logActivity(ctx, {
						action: 'household.delete',
						targetKind: 'household',
						targetId: householdId,
						targetName: household?.name ?? '',
						targetInk: household ? householdInk(household.ink, household.id) : '',
						held,
					});

					continue;
				}

				const members = await ctx.db.memberships
					.withIndex('by_household', (r) => r.eq('householdId', householdId))
					.collect();

				const target = members.find((x) => x.id === decision.toMembershipId);

				// Re-found rather than carried from the validation pass: the same
				// re-read-before-you-write rule every other handler follows.
				if (target) {
					await ctx.db.memberships.update(target.id, { role: 'owner' });

					await logActivity(ctx, {
						action: 'household.transfer',
						targetKind: 'household',
						targetId: householdId,
						targetName: household?.name ?? '',
						targetInk: household ? householdInk(household.ink, household.id) : '',
						fromValue: goingName,
						toValue: target.displayName,
					});
				}
			}

			// Everything that is left. A household that was deleted above has had
			// its memberships removed with it, so this skips rows that are gone.
			for (const m of mine) {
				const still = await ctx.db.memberships.get(m.id);

				if (! still) continue;

				await revokeInvitesBy(ctx.db, m.householdId, userId);
				await ctx.db.memberships.delete(m.id);
			}

			if (profile) await ctx.db.profiles.delete(profile.id);

			await logActivity(ctx, {
				action: 'account.delete',
				targetKind: 'account',
				targetId: userId,
				targetName: goingName,
				held: { households: mine.length },
			});

			ctx.invalidate(
				'adminAccount', 'adminPeople', 'adminSummary', 'adminHouseholds', 'adminHousehold',
				'adminActivity', 'households', 'household', 'pantry', 'profile'
			);
		}),
	},

	endpoints: {
		status: endpoint({ method: 'GET', path: '/api/status' }, () => text('ok')),
	},
});

// --- helpers ---

/**
 * A household's members, for an admin write, or a refusal if it is gone.
 *
 * The console's equivalent of `requireCapability`'s return value: the app's
 * mutations get a `membership` back and read `membership.householdId` from it,
 * which is what makes an id a selector rather than an authority. An
 * administrator has no membership, so this is the only re-read there is — and
 * it doubles as the existence check, since a household with no row has no
 * members and every caller here needs the list anyway.
 */
async function adminMembersOf(db: WriteDb, householdId: string) {
	const household = householdId ? await db.households.get(householdId) : null;

	if (! household) throw new AccessError('That household no longer exists.');

	return db.memberships
		.withIndex('by_household', (r) => r.eq('householdId', household.id))
		.collect();
}

/**
 * The last stamp this isolate handed to an audit row.
 *
 * **An audit log's one job is order, and millisecond stamps are not enough.**
 * `adminDeleteAccount` writes a `household.transfer` and then an
 * `account.delete`, and both landed on the same millisecond in testing — at
 * which point `by_at` descending put the transfer *above* the deletion that
 * caused it, so the log read as though a household had been handed over after
 * the account was already gone. Caught by driving the real handler; nothing
 * short of reading the rows back would have shown it.
 *
 * So a stamp is never reused: if the clock has not moved, the next row takes
 * the previous stamp plus a millisecond. That makes `at` strictly increasing
 * within an isolate, which is what `by_at` needs to be a true order.
 *
 * **It is per-isolate, not global**, and that is the honest limit: two
 * concurrent requests on separate isolates can still tie. At this scale nothing
 * writes concurrently, and the alternative is a sequence row and a write per
 * write. Worth revisiting if the log ever becomes busy.
 */
let lastActivityStamp = 0;

/**
 * Writes one audit row (D62).
 *
 * **Every administrative write calls this, and nothing else does.** The log
 * records administration — things done to a household or an account from the
 * console — and nothing a household does to its own pantry. `addItem` must
 * never appear here; a console that logged it would be the surveillance the
 * household page refuses to be.
 *
 * The actor is resolved through `accountName()`, the same chain the member list
 * uses, so a log row and a member row never print the same person differently.
 * It is **denormalised on purpose**: an audit row that stops naming its actor
 * once that account is deleted is an audit log you can erase by deleting
 * yourself. That is a real erasure question and the design flags it for a
 * lawyer's read; it is not a thing to decide by leaving the column joinable.
 *
 * It never throws. A write that succeeded and a log row that did not is bad; a
 * write rolled back because the *log* failed is worse, and a log is not the
 * thing the caller asked for.
 */
async function logActivity(
	ctx: {
		auth: AuthContext;
		db: WriteDb;
		env: Record<string, string | undefined>;
		log: LogContext;
	},
	entry: {
		action: ActivityAction;
		targetKind?: TargetKind;
		targetId?: string;
		targetName?: string;
		targetInk?: string;
		fromValue?: string;
		toValue?: string;
		held?: Held;
	}
): Promise<void> {
	const now = Date.now();
	// Strictly increasing. See `lastActivityStamp`.
	const at = now > lastActivityStamp ? now : lastActivityStamp + 1;

	lastActivityStamp = at;

	try {
		await ctx.db.activity.insert({
			at: stampFrom(at),
			actorId: ctx.auth.userId,
			actorName: await accountName(ctx),
			actorKind: 'person',
			action: entry.action,
			targetKind: entry.targetKind ?? '',
			targetId: entry.targetId ?? '',
			targetName: entry.targetName ?? '',
			targetInk: entry.targetInk ?? '',
			fromValue: entry.fromValue ?? '',
			toValue: entry.toValue ?? '',
			held: entry.held ? encodeHeld(entry.held) : '',
		});
	} catch (err) {
		// `ctx.log` is the only way anything is heard from the hosted runtime —
		// an uncaught handler exception logs nothing at all. A missing audit row
		// is exactly the kind of silence worth breaking.
		ctx.log.error('activity log write failed', { action: entry.action, err: String(err) });
	}

	await pruneActivity(ctx);
}

/**
 * Deletes expired audit rows, a few at a time.
 *
 * Called after every append, which is the only moment this app is guaranteed to
 * be running code with a write handle — there is no scheduler. See
 * `PRUNE_PER_WRITE` for what that costs.
 *
 * `by_at` ascending with `take()` is exactly the read this wants: the oldest
 * rows first, bounded, and the index is already there for the log's own order.
 *
 * It never throws, for `logActivity`'s reason and one more: a failed prune must
 * not roll back the row it was pruning *for*. An audit entry that was not
 * written because the housekeeping after it failed is the worst possible trade.
 */
async function pruneActivity(ctx: { db: WriteDb; env: Record<string, string | undefined>; log: LogContext }): Promise<void> {
	try {
		const months = toRetentionMonths(ctx.env[RETENTION_VAR]);
		const cutoff = retentionCutoff(new Date().toISOString(), months);

		if (! cutoff) return;

		const expired = await ctx.db.activity
			.withIndex('by_at', (r) => r.lt('at', cutoff))
			.order('asc')
			.take(PRUNE_PER_WRITE);

		for (const row of expired) await ctx.db.activity.delete(row.id);
	} catch (err) {
		ctx.log.error('activity prune failed', { err: String(err) });
	}
}

/**
 * A **third party's** name, for a log row about them.
 *
 * `accountName()` answers for the *caller* and walks their identity as the last
 * link; this cannot, because the platform tells a handler about its caller and
 * never about anybody else. So the chain is one link shorter — the profile,
 * then any membership — with the caller's own identity used only when the
 * account being named happens to be theirs, which is the self-deletion case.
 *
 * It resolves to `''` rather than to an id when there is nothing: a log row
 * reading *deleted `account:7f3a…`'s account* says less than one that admits it
 * never knew the name, and the client renders the absence.
 */
async function accountNameOf(db: WriteDb, userId: string, auth: AuthContext): Promise<string> {
	const profile = await db.profiles
		.withIndex('by_user', (r) => r.eq('userId', userId))
		.first();

	const memberships = await db.memberships
		.withIndex('by_user', (r) => r.eq('userId', userId))
		.collect();

	return pickDisplayName(
		profile?.displayName ?? '',
		...memberships.map((m) => m.displayName),
		userId === auth.userId ? auth.displayName : ''
	);
}

/**
 * What a household holds, for a deletion entry's own copy of it.
 *
 * Called **before** the cascade, because afterwards there is nothing left to
 * count — which is the whole reason a deletion row denormalises rather than
 * pointing at something.
 */
async function countHousehold(db: WriteDb, householdId: string): Promise<Held> {
	const [items, locations, stores, types, members] = await Promise.all([
		db.items.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
		db.locations.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
		db.stores.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
		db.types.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
		db.memberships.withIndex('by_household', (r) => r.eq('householdId', householdId)).collect(),
	]);

	return {
		items: items.length,
		locations: locations.length,
		stores: stores.length,
		types: types.length,
		members: members.length,
	};
}

/**
 * Every row a household owns, then the household — children first.
 *
 * Zero has **no cascading deletes**, so this list is the only thing standing
 * between a deleted household and rows that outlive every route to them. It is
 * `deleteHousehold`'s own order, extracted when the account pre-flight became a
 * second caller: two copies of a cascade is one copy that will be missed the
 * next time a table is added.
 */
async function deleteHouseholdRows(db: WriteDb, householdId: string): Promise<void> {
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
		const rows = await db[name]
			.withIndex('by_household', (r) => r.eq('householdId', householdId))
			.collect();

		for (const row of rows) await db[name].delete(row.id);
	}

	await db.households.delete(householdId);
}

/**
 * Every person in the space, from the two tables that between them define one.
 *
 * Shared by `adminPeople` and `adminAccount` so the list and the page cannot
 * disagree about who somebody is — the account page reads one row out of the
 * same array the list pages, rather than recomputing a person from the same
 * tables by a second route.
 *
 * The name walks `pickDisplayName`'s chain, one link short: the profile, then
 * any membership. There is no identity to fall back to, because the platform
 * tells a handler about its **caller** and never a third party — so an account
 * that has neither is rendered as *Someone* by the client rather than as a bare
 * id here.
 */
function buildPeople(
	households: readonly { id: string; name: string; ink: string }[],
	memberships: readonly {
		id: string; userId: string; householdId: string;
		displayName: string; picture: string; role: string; createdAt: string;
	}[],
	profiles: readonly { userId: string; displayName: string; addedAt: string; createdAt: string }[],
	adminIds: readonly string[],
	auth: AuthContext
): AdminPersonRow[] {
	const householdById = new Map(households.map((h) => [h.id, h]));
	const owners = new Map<string, number>();

	for (const m of memberships) {
		if (toRole(m.role) === 'owner') {
			owners.set(m.householdId, (owners.get(m.householdId) ?? 0) + 1);
		}
	}

	const byUser = new Map<string, typeof memberships[number][]>();

	for (const m of memberships) {
		const list = byUser.get(m.userId);

		if (list) list.push(m); else byUser.set(m.userId, [m]);
	}

	const profileOf = new Map(profiles.map((p) => [p.userId, p]));
	// The union, and it has to be a union: either table can hold a person the
	// other does not.
	const userIds = new Set<string>([...byUser.keys(), ...profileOf.keys()]);

	return [...userIds].map((userId) => {
		const mine = byUser.get(userId) ?? [];
		const profile = profileOf.get(userId);
		const tiles = mine.flatMap((m) => {
			const household = householdById.get(m.householdId);

			return household
				? [{ id: household.id, name: household.name, ink: householdInk(household.ink, household.id) }]
				: [];
		});

		// The earliest thing this app knows about the account. A profile row is
		// stamped from birth (D46); a membership only has the platform's
		// `createdAt`, which is enough because a membership is never re-inserted.
		let joinedAt = profile ? (profile.addedAt || profile.createdAt) : '';

		for (const m of mine) {
			if (! joinedAt || (m.createdAt && m.createdAt < joinedAt)) joinedAt = m.createdAt;
		}

		return {
			userId,
			name: pickDisplayName(
				profile?.displayName ?? '',
				...mine.map((m) => m.displayName),
				// The caller's own identity name, and only theirs — it is the one
				// third-party name this runtime will never hand out.
				userId === auth.userId ? auth.displayName : ''
			),
			picture: mine.find((m) => m.picture)?.picture ?? '',
			tiles: tiles.slice(0, 3),
			households: mine.length,
			owned: mine.filter((m) => toRole(m.role) === 'owner').length,
			soleOwnerOf: mine.filter(
				(m) => toRole(m.role) === 'owner' && (owners.get(m.householdId) ?? 0) === 1
			).length,
			/*
			 * Named in `LARDER_ADMIN_IDS`, and nothing else.
			 *
			 * It used to carry a second clause — *or the caller, when the caller
			 * administers by some other route* — which existed solely because
			 * `sf dev`'s guest administered by **bypass** rather than by being
			 * named. There is no such route any more: a dev guest that
			 * administers is in this list like anybody else, under its own
			 * `guest:<name>` id. One rule, and the row now says the same thing
			 * the gate does.
			 */
			admin: adminIds.indexOf(userId) !== -1,
			joinedAt,
		};
	});
}

/** A household's member names, for the relevance ladder's second rung. */
function memberNames(
	byHousehold: Map<string, { displayName: string }[]>,
	householdId: string
): string[] {
	return (byHousehold.get(householdId) ?? []).map((m) => m.displayName);
}

/** The console's page size. The boards' *Showing 1–25 of 412*. */
const ADMIN_PAGE_SIZE = 25;

/**
 * How many expired audit rows one write may clear.
 *
 * **The log prunes itself as it grows**, because this app has no schedule to
 * sweep with: `logActivity` deletes what has expired immediately after it
 * appends. That is the whole enforcement mechanism, and it has one consequence
 * worth stating — a log that stops being written to stops being pruned, so the
 * last rows before a quiet period outlive their retention until something else
 * happens. Acceptable: the alternative is a cron this platform has not been
 * asked for, and rows nobody is adding to are rows nobody is reading either.
 *
 * The cap is what keeps a write bounded. A retention change that suddenly
 * expires ten thousand rows must not turn the next role change into a ten
 * thousand row delete; it takes a few each time and catches up.
 */
const PRUNE_PER_WRITE = 20;

/**
 * The most rows one export may carry.
 *
 * A live query's result crosses a websocket and is held in memory on both
 * sides, so this is a real ceiling rather than a policy. When it bites, the
 * answer is a narrower range — which is the shape the export already has.
 */
const EXPORT_LIMIT = 2000;

/**
 * When each household was last touched, as an ISO stamp.
 *
 * **There is no such column and there should not be one.** D44 gave `households`
 * an `addedAt` and deliberately no `changedAt`, on the grounds that nothing
 * orders households by recency and a rename is not an event anything reacts to.
 * That is still true of the *app*; the console is the first thing that wants an
 * answer, and it can compute one rather than make every mutation in the capsule
 * maintain a column for a screen almost nobody opens.
 *
 * So it is the newest stamp across everything the household owns: its items,
 * and its three taxonomies. `changedAtOf()` falls back through `addedAt` to the
 * platform's `createdAt`, which is what makes a pre-D44 row answer at all — and
 * why a household with rows always reports *something*, while an empty one
 * falls back to when it was created.
 *
 * `items` is passed in because both callers have already scanned it. The three
 * taxonomies are scanned here, once, for the same reason the items are: three
 * `by_creation` passes beat one indexed read per household.
 */
async function lastActiveByHousehold(
	db: ReadDb,
	items: readonly { householdId: string; addedAt: string; changedAt: string; createdAt: string }[]
): Promise<Map<string, string>> {
	const newest = new Map<string, string>();

	function note(householdId: string, iso: string) {
		if (! iso) return;

		const seen = newest.get(householdId);

		if (! seen || iso > seen) newest.set(householdId, iso);
	}

	for (const it of items) note(it.householdId, changedAtOf(it));

	const [locations, types, stores] = await Promise.all([
		db.locations.withIndex('by_creation').collect(),
		db.types.withIndex('by_creation').collect(),
		db.stores.withIndex('by_creation').collect(),
	]);

	for (const row of [...locations, ...types, ...stores]) note(row.householdId, changedAtOf(row));

	return newest;
}

/**
 * One term row as the client sees it.
 *
 * The three taxonomies are the same shape and always have been; this is the one
 * place that says so, rather than three near-identical `map` bodies that have
 * to be kept in step every time a column joins the DTO.
 */
function termDto(t: { id: string; name: string; ink: string; addedAt: string; changedAt: string; createdAt: string }) {
	return {
		id: t.id,
		name: t.name,
		ink: t.ink,
		createdAt: t.createdAt,
		addedAt: t.addedAt,
		changedAt: t.changedAt,
	};
}

/**
 * A store row as the client sees it: a term, plus its kind (D58).
 *
 * The kind is resolved here rather than in the client, for the reason
 * `HouseholdSummary.ink` is: `''` is what every row written before the column
 * holds, and one resolver server-side beats a `toSourceKind()` at every render
 * site that would each have to remember to call it.
 */
function sourceDto(t: {
	id: string; name: string; ink: string; kind: string;
	addedAt: string; changedAt: string; createdAt: string;
}) {
	return { ...termDto(t), kind: toSourceKind(t.kind) };
}

/**
 * An invite code, from the best entropy this runtime offers.
 *
 * Three things about the hosted runtime, all confirmed in production on
 * 2026-08-27 and none of them true under `sf dev`:
 *
 * 1. `crypto` is `undefined`, so there is no random source to call.
 * 2. Row ids are **sequential integers** (`"4"`), not the UUIDs `sf dev` mints,
 *    so the id carries no entropy on its own.
 * 3. `ctx` offers nothing random either — `auth`, `db`, `env`, `gravatar`,
 *    `log`, `spam`.
 *
 * So the code is a SHA-256 over everything that varies, and the part that makes
 * it genuinely unguessable is `INVITE_SECRET` from the server environment: an
 * attacker who knows the row id is sequential and can guess the minute it was
 * minted still cannot produce the code without it. `Math.random()` and the
 * clock are mixed in as well, but neither is load-bearing on its own — QuickJS
 * seeds its PRNG per context and nothing documents how.
 *
 * The `typeof` guard on `crypto` is load-bearing twice over: `lib.dom` types it
 * as always present when the runtime does not define it at all, and a bare
 * reference to a missing binding throws `ReferenceError` rather than yielding
 * `undefined`. It cannot be written as a property of the global object either:
 * the capsule compiler's denylist rejects that identifier outright.
 */
function inviteCode(log: LogContext, env: Record<string, string | undefined>, rowId: string): string {
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		return codeFromBytes(crypto.getRandomValues(new Uint8Array(CODE_BYTES)));
	}

	const secret = env.INVITE_SECRET ?? '';

	// Loud, because without it the codes rest on `Math.random()` and a clock,
	// and `sf logs runtime` is the only place this can be read.
	if (! secret) {
		log.warn('INVITE_SECRET is not set: invite codes are falling back to Math.random and the clock');
	}

	return codeFromSeed([
		secret,
		rowId,
		String(Date.now()),
		String(Math.random()),
		String(Math.random()),
	]);
}

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
