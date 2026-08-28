import { capsule, query, mutation, endpoint, text, table, string, boolean, id } from '@spacefast/zero/server';

import type { AuthContext, LogContext } from '@spacefast/zero/server';
import type { ReadDb, WriteDb } from './schema';
import { AccessError, assertInHousehold, isSignedIn, membershipState, requireCapability, requireMembership } from './auth';

import { toRole, canInviteRole } from '../shared/roles';
import { wouldStrandHousehold } from '../shared/membership';
import { normalizeQty, toInt, fromInt } from '../shared/qty';
import { normalizeSize } from '../shared/size';
import { normalizeStamp, stampFrom } from '../shared/stamp';
import { byName, normalizeInk, normalizeName, normalizeNotes, termBlock, termKey, isValidName } from '../shared/term';
import { CODE_BYTES, PENDING_CODE, codeFromBytes, codeFromSeed, expiryFrom, isExpired, isCodeShaped, normalizeCode } from '../shared/invite';
import type {
	HouseholdListResult,
	HouseholdResult,
	HouseholdSummary,
	InvitePreviewResult,
	PantryResult,
	ProfileResult,
	TermKind,
} from '../shared/types';
import { SEED_LOCATIONS, SEED_TYPES, SEED_STORES } from '../shared/seed';
import { householdInk, toHouseholdInk } from '../shared/household';
import { normalizeDisplayName, pickDisplayName } from '../shared/profile';

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

	// Stores never had the column at all.
	stores: table({
		householdId: id('households'),
		name: string(),
		ink: string(),
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
		// Never joins the shopping list, however low it gets — the things a
		// household grows rather than buys. It hides an item from one view and
		// changes nothing about its status; see `needsBuying`.
		offShoppingList: boolean().default(false),
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
			if (! isSignedIn(ctx.auth)) return { state: 'guest' };

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
			if (! isSignedIn(ctx.auth)) return { state: 'guest' };

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
				stores: byName(stores).map(termDto),
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
			if (isSignedIn(ctx.auth) && members.some((m) => m.userId === ctx.auth.userId)) {
				return { state: 'member', household, householdId: invite.householdId };
			}

			const inviter = members.find((m) => m.userId === invite.createdBy)?.displayName ?? 'an owner';
			const role = toRole(invite.role);

			if (isExpired(invite.expiresAt, Date.now())) {
				return { state: 'expired', household, role, inviter };
			}

			return { state: 'valid', household, role, inviter, expiresAt: invite.expiresAt };
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
			if (! isSignedIn(ctx.auth)) throw new AccessError('Sign in to use Larder Log.');

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
		 * A new household, owned by the caller — their first, or their fifth.
		 *
		 * D18 refused this to anyone who already belonged somewhere. D33 dropped
		 * that: the seeding below is what makes a second household usable the
		 * moment it is created, and the client switches to the id returned.
		 *
		 * Kept out of `requireMembership()` so that helper stays resolve-or-throw
		 * and remains usable from a read-only query context.
		 */
		createHousehold: mutation(async (ctx, name: string, ink?: string) => {
			if (! isSignedIn(ctx.auth)) throw new AccessError('Sign in to use Larder Log.');

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

			for (const seed of SEED_STORES) {
				await ctx.db.stores.insert({
					householdId: household.id,
					name: seed.name,
					ink: normalizeInk(seed.ink),
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

				const item = await ctx.db.items.insert({
					householdId: membership.householdId,
					name: normalizeName(draft.name),
					locationId: draft.locationId,
					qty: normalizeQty(draft.qty),
					threshold: normalizeQty(draft.threshold),
					size: size.size,
					unit: size.unit,
					offShoppingList: draft.offShoppingList === true,
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
						? await ctx.db.stores.insert({ householdId: owner, name, ink, ...stamps })
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

			// The client draws its blocked dialog from this same call, so the
			// refusal and the explanation can never disagree.
			const blocked = termBlock(kind, term.name, used);

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
			if (! isSignedIn(ctx.auth)) throw new AccessError('Sign in to join a household.');

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
	},

	endpoints: {
		status: endpoint({ method: 'GET', path: '/api/status' }, () => text('ok')),
	},
});

// --- helpers ---

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
