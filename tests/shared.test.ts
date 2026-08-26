/**
 * Unit tests for `shared/`.
 *
 * `shared/` imports nothing, so it can be compiled and run directly — no test
 * runner, no dependencies. Run with `npm test`.
 *
 * What earns a test here is logic that is either invisible when wrong or
 * expensive when wrong: the authorization matrix, which household a request
 * resolves to, the last-owner guard, and invite expiry. Zero has no row-level security and its
 * `id()` columns are not foreign keys, so these functions are the only thing
 * enforcing several of the app's rules.
 */

import { can, invitableRoles, canInviteRole, toRole, isRole, ROLES, DEFAULT_ROLE } from '../shared/roles';
import { findMembership, selectMembership, wouldStrandHousehold } from '../shared/membership';
import {
	expiryFrom, isExpired, daysUntilExpiry, codeFromBytes, isCodeShaped,
	normalizeCode, NEVER_EXPIRES, CODE_BYTES,
} from '../shared/invite';
import {
	normalizeName, normalizeNotes, termKey, normalizeInk, DEFAULT_INK, isInk,
	isValidName, MAX_NAME, termBlock, termUsageCount,
} from '../shared/term';
import { isSignedIn, isDevGuest, type IdentityLike } from '../shared/identity';
import { COLOR_SLOTS, COLOR_SLOT_COUNT, isColorSlot } from '../shared/palette';
import { householdInk, householdLetter, toHouseholdInk } from '../shared/household';
import { buildJoinUrl, readJoinCode, stripJoinParam, formatCode, JOIN_PARAM } from '../shared/joinLink';
import { SEED_LOCATIONS, SEED_STORES, SEED_TYPES } from '../shared/seed';
import { fromInt, toInt } from '../shared/qty';
import { needsBuying, shoppingCount, shoppingGroups } from '../shared/shoppingList';
import type { Item, Term } from '../shared/types';

let fail = 0;
let total = 0;
function check(label: string, actual: unknown, expected: unknown) {
	total++;
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if (a !== e) { console.log(`FAIL ${label}: got ${a}, want ${e}`); fail++; }
}

// --- D20: the capability matrix ---
check('owner deletes household', can('owner', 'household:delete'), true);
check('editor cannot delete household', can('editor', 'household:delete'), false);
check('editor writes items', can('editor', 'item:write'), true);
check('viewer cannot write items', can('viewer', 'item:write'), false);
check('viewer reads pantry', can('viewer', 'pantry:read'), true);
check('editor cannot change roles', can('editor', 'member:role'), false);
check('viewer cannot change roles', can('viewer', 'member:role'), false);
check('editor cannot edit household settings', can('editor', 'household:settings'), false);

// --- D21: who may mint what ---
check('owner invites all three', invitableRoles('owner'), ['owner', 'editor', 'viewer']);
check('editor invites viewer only', invitableRoles('editor'), ['viewer']);
check('viewer invites nobody', invitableRoles('viewer'), []);

// The load-bearing property: editors cannot produce editors, by any route.
check('editor cannot invite editor', canInviteRole('editor', 'editor'), false);
check('editor cannot invite owner', canInviteRole('editor', 'owner'), false);
check('owner CAN invite co-owner (D22)', canInviteRole('owner', 'owner'), true);
check('owner can invite editor', canInviteRole('owner', 'editor'), true);

// No role may mint above itself, and only owners reach the editor tier.
for (const creator of ROLES) {
	for (const granted of ROLES) {
		if (granted !== 'viewer' && canInviteRole(creator, granted)) {
			check(`only owner mints ${granted} (creator=${creator})`, creator, 'owner');
		}
	}
}

// --- degradation ---
check('unknown role degrades to viewer', toRole('superuser'), DEFAULT_ROLE);
check('degraded role is least privileged', can(toRole('superuser'), 'item:write'), false);
check('null degrades', toRole(null), 'viewer');
check('isRole rejects junk', isRole('admin'), false);



// --- D33: which household a request resolves to ---
//
// A read heals and a write refuses, and the two must not drift into each other:
// `selectMembership` falling through to a default is only safe *because*
// `findMembership` never does.
const m = (id: string, role: string) => ({ id, householdId: 'h1', userId: 'u' + id, role });
/** A membership in a named household, for the multi-household cases. */
const mh = (id: string, householdId: string, role = 'owner') => ({ id, householdId, userId: 'u1', role });

check('no rows', selectMembership([]).kind, 'none');
check('no rows, even with a preference', selectMembership([], 'h1').kind, 'none');

const one = selectMembership([m('a', 'owner')]);
check('role parsed', one.kind === 'one' && one.membership.role, 'owner');
const junk = selectMembership([m('a', 'superuser')]);
check('junk role degrades to viewer', junk.kind === 'one' && junk.membership.role, 'viewer');

const many = [mh('a', 'h-zebra'), mh('b', 'h-apple'), mh('c', 'h-mango')];

const picked = selectMembership(many, 'h-mango');
check('a query gets the household it asked for', picked.kind === 'one' && picked.membership.householdId, 'h-mango');

const fallback = selectMembership(many, 'h-gone');
check('a stale selection heals rather than dead-ends', fallback.kind === 'one' && fallback.membership.householdId, 'h-apple');
const unset = selectMembership(many);
check('no preference lands on the same default', unset.kind === 'one' && unset.membership.householdId, 'h-apple');
const reversed = selectMembership([...many].reverse());
check('the default does not depend on row order', reversed.kind === 'one' && reversed.membership.householdId, 'h-apple');

// The write half: exact or nothing. A mutation that silently retargeted would
// land an edit in a household the caller never named.
check('a write gets the household it named', findMembership(many, 'h-zebra')?.householdId, 'h-zebra');
check('a write never falls back', findMembership(many, 'h-gone'), null);
check('a write on an empty list', findMembership([], 'h-apple'), null);
check('a write with no household named', findMembership(many, ''), null);
check('roles degrade on the write path too', findMembership([mh('a', 'h1', 'superuser')], 'h1')?.role, 'viewer');

// --- D22: last-owner protection ---
const solo = [m('a', 'owner')];
const twoOwners = [m('a', 'owner'), m('b', 'owner')];
const ownerPlusEditor = [m('a', 'owner'), m('b', 'editor')];

check('cannot strand: sole owner', wouldStrandHousehold(solo, 'a'), true);
check('cannot strand: owner among editors', wouldStrandHousehold(ownerPlusEditor, 'a'), true);
check('safe: one of two owners', wouldStrandHousehold(twoOwners, 'a'), false);
check('safe: removing an editor', wouldStrandHousehold(ownerPlusEditor, 'b'), false);
check('unknown member is a no-op', wouldStrandHousehold(ownerPlusEditor, 'zzz'), false);
check('corrupt role is not an owner', wouldStrandHousehold([m('a','junk'), m('b','owner')], 'a'), false);

// --- D24: expiry ---
const T0 = Date.parse('2026-08-24T12:00:00.000Z');
const DAY = 86_400_000;
check('expiry is 14 days out', expiryFrom(T0), '2026-09-07T12:00:00.000Z');
check('expiry is ISO', /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(expiryFrom(T0)), true);
check('fresh code is live', isExpired(expiryFrom(T0), T0), false);
check('day 13 still live', isExpired(expiryFrom(T0), T0 + 13 * DAY), false);
check('day 14 exactly is expired', isExpired(expiryFrom(T0), T0 + 14 * DAY), true);
check('day 15 expired', isExpired(expiryFrom(T0), T0 + 15 * DAY), true);
check('never-expires sentinel', isExpired(NEVER_EXPIRES, T0), false);
// A credential we cannot evaluate must be refused, not trusted.
check('garbage expiry is treated as expired', isExpired('not-a-date', T0), true);

check('days remaining', daysUntilExpiry(expiryFrom(T0), T0), 14);
check('days remaining mid-life', daysUntilExpiry(expiryFrom(T0), T0 + 10 * DAY), 4);
check('never floors to null', daysUntilExpiry(NEVER_EXPIRES, T0), null);
check('past never goes negative', daysUntilExpiry(expiryFrom(T0), T0 + 99 * DAY), 0);

// --- invite codes ---
const bytes = new Uint8Array(CODE_BYTES).fill(0);
const code = codeFromBytes(bytes);
check('code length', code.length, 10);
check('generated code is code-shaped', isCodeShaped(code), true);
check('no ambiguous glyphs', /[01OIl]/.test(codeFromBytes(new Uint8Array(CODE_BYTES).map((_, i) => i * 7))), false);
check('rejects wrong length', isCodeShaped('ABC'), false);
check('rejects lowercase', isCodeShaped('abcdefghjk'), false);
check('rejects ambiguous char', isCodeShaped('ABCDEFGHJ0'), false);
check('normalize strips spaces and dashes', normalizeCode(' abcd-efgh jk '), 'ABCDEFGHJK');

// --- term validation ---
check('collapses whitespace', normalizeName('  Deep   Freezer '), 'Deep Freezer');
check('truncates', normalizeName('x'.repeat(200)).length, MAX_NAME);
check('non-string is empty', normalizeName(null), '');
check('empty name invalid', isValidName('   '), false);
check('dupe key is case-insensitive', termKey('Deep  FREEZER'), termKey('deep freezer'));

// --- deleting a term: the precondition, and the sentence explaining it ---
//
// The server refuses on `termBlock` and the client draws its blocked dialog
// from the same call, so these assertions cover both at once. The rule now
// applies to every kind: D16 guarded locations alone, which left a trash that
// blocked on one row and silently dropped tags on the next.
const shelf = { locationId: 'loc1', typeIds: ['t1', 't2'], storeIds: ['s1'] };
const tin = { locationId: 'loc2', typeIds: ['t1'], storeIds: [] };
const pantryItems = [shelf, tin];

check('counts a location', termUsageCount(pantryItems, 'location', 'loc1'), 1);
check('counts a type across items', termUsageCount(pantryItems, 'type', 't1'), 2);
check('counts a store', termUsageCount(pantryItems, 'store', 's1'), 1);
check('an unreferenced term counts zero', termUsageCount(pantryItems, 'type', 'nope'), 0);

check('an unused term is deletable', termBlock('location', 'Pantry', 0), null);
check('a negative count is deletable', termBlock('type', 'Condiment', -1), null);

// Every kind blocks now — the whole point of the change.
check('a used location blocks', termBlock('location', 'Pantry', 3)?.title, 'Move these 3 items first');
check('a used type blocks', termBlock('type', 'Condiment', 6)?.title, 'Untag these 6 items first');
check('a used store blocks', termBlock('store', 'Costco', 4)?.title, 'Untag these 4 items first');

// A location holds items; a tag is on them. One verb for both would describe
// something the screen does not do.
check(
	'a location says stored',
	termBlock('location', 'Pantry', 3)?.body,
	'Pantry holds 3 items. A location can only be deleted once nothing is stored there.'
);
check(
	'a type says used',
	termBlock('type', 'Condiment', 6)?.body,
	'Condiment is on 6 items. A type can only be deleted once nothing uses it.'
);
check(
	'a store names its own kind',
	termBlock('store', 'Costco', 2)?.body,
	'Costco is on 2 items. A store can only be deleted once nothing uses it.'
);

// One item is the case that reads wrong if nobody checks it.
check('one item is singular in the title', termBlock('location', 'Pantry', 1)?.title, 'Move this item first');
check('one item is singular in the body', termBlock('type', 'Condiment', 1)?.body, 'Condiment is on 1 item. A type can only be deleted once nothing uses it.');
check('one item drops the count from the action', termBlock('store', 'Costco', 1)?.action, 'Show the item');
check('several items keep it', termBlock('store', 'Costco', 4)?.action, 'Show the 4 items');

// --- color tokens ---
//
// A term stores `color-7`, never a hex, so re-theming does not mean rewriting
// every row. Two things have to hold: a token survives storage unchanged, and
// the legacy hexes written before the tokens existed still round-trip, because
// those rows still have to render.
check('a token survives normalization', normalizeInk('color-7'), 'color-7');
check('the first token is valid', normalizeInk('color-1'), 'color-1');
check('the last token is valid', normalizeInk(`color-${COLOR_SLOT_COUNT}`), `color-${COLOR_SLOT_COUNT}`);
check('one past the last is not', normalizeInk(`color-${COLOR_SLOT_COUNT + 1}`), DEFAULT_INK);
check('color-0 is not a token', normalizeInk('color-0'), DEFAULT_INK);
check('a bare number is not a token', normalizeInk('7'), DEFAULT_INK);
check('no zero padding', normalizeInk('color-07'), DEFAULT_INK);
check('the default is itself a token', isColorSlot(DEFAULT_INK), true);
check('every declared slot validates', COLOR_SLOTS.every(isColorSlot), true);
check('slot count matches the list', COLOR_SLOTS.length, COLOR_SLOT_COUNT);

// Legacy: rows predating the tokens hold a raw hex and must keep working.
check('legacy hex normalizes to lowercase', normalizeInk('#AABBCC'), '#aabbcc');
check('bad ink falls back', normalizeInk('red'), DEFAULT_INK);
check('shorthand hex rejected', normalizeInk('#abc'), DEFAULT_INK);
check('legacy hex is still accepted', isInk('#8c2f2f'), true);
check('notes keep newlines', normalizeNotes('a\nb'), 'a\nb');

// --- the dev-guest bypass (D14's server half) ---
//
// This is the app's only authentication hole. What matters is not that the dev
// identity passes, but that nothing else does.
const devGuest: IdentityLike = {
	userId: 'guest:local', displayName: 'Local', provider: 'guest',
	isGuest: true, isAuthenticated: false,
};
const realUser: IdentityLike = {
	userId: 'gravatar:abc123', displayName: 'Justin', provider: 'gravatar',
	isGuest: false, isAuthenticated: true,
};

check('dev guest is recognized', isDevGuest(devGuest), true);
check('dev guest may act', isSignedIn(devGuest), true);
check('real user may act', isSignedIn(realUser), true);
check('real user is not a dev guest', isDevGuest(realUser), false);

// Each field must be load-bearing: a production guest that matches only some of
// the dev identity must still be refused.
for (const [label, override] of [
	['different userId', { userId: 'guest:a1b2c3' }],
	['empty userId', { userId: '' }],
	['gravatar provider', { provider: 'gravatar' }],
	['different displayName', { displayName: 'Anonymous' }],
	['claims authenticated', { isAuthenticated: true }],
] as [string, Partial<IdentityLike>][]) {
	const impostor: IdentityLike = { ...devGuest, ...override };
	check(`guest with ${label} is refused`, isSignedIn(impostor), false);
	check(`guest with ${label} is not a dev guest`, isDevGuest(impostor), false);
}

// A signed-in user with no id is not a user.
check('no userId is refused', isSignedIn({ ...realUser, userId: '' }), false);

// --- D28: invite links ride in a query parameter ---

// A code the rest of the suite can reuse. Shaped, so `readJoinCode` accepts it.
const LINK_CODE = codeFromBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

check('the code is shaped', isCodeShaped(LINK_CODE), true);
check(
	'link is the root path with a join parameter',
	buildJoinUrl('https://larderlog.view.fast', LINK_CODE),
	`https://larderlog.view.fast/?${JOIN_PARAM}=${LINK_CODE}`
);
check(
	'a trailing slash on the origin does not double up',
	buildJoinUrl('https://larderlog.view.fast/', LINK_CODE),
	`https://larderlog.view.fast/?${JOIN_PARAM}=${LINK_CODE}`
);
check('the link round-trips', readJoinCode(`?${JOIN_PARAM}=${LINK_CODE}`), LINK_CODE);
check('a leading ? is optional', readJoinCode(`${JOIN_PARAM}=${LINK_CODE}`), LINK_CODE);
check('other parameters are ignored', readJoinCode(`?a=1&${JOIN_PARAM}=${LINK_CODE}&b=2`), LINK_CODE);
check('no parameter is no code', readJoinCode('?a=1'), null);
check('an empty query is no code', readJoinCode(''), null);

// A mistyped or truncated code is treated as absent rather than handed to
// `redeemInvite`, which would fail with a message about something nobody typed.
check('a short code is refused', readJoinCode(`?${JOIN_PARAM}=ABC`), null);
check('a code with excluded letters is refused', readJoinCode(`?${JOIN_PARAM}=OOOOOOOOOO`), null);
check('an empty value is refused', readJoinCode(`?${JOIN_PARAM}=`), null);

// People paste the spaced form out of a message, and mail clients lowercase
// links. Both normalize back to the stored code.
check(
	'a spaced code is normalized',
	readJoinCode(`?${JOIN_PARAM}=${encodeURIComponent(formatCode(LINK_CODE))}`),
	LINK_CODE
);
check('a lowercased code is normalized', readJoinCode(`?${JOIN_PARAM}=${LINK_CODE.toLowerCase()}`), LINK_CODE);

// The address bar is rewritten once the code is stashed, so a reload or a
// screenshot doesn't carry a live credential.
check('stripping leaves nothing behind', stripJoinParam(`?${JOIN_PARAM}=${LINK_CODE}`), '');
check('stripping keeps other parameters', stripJoinParam(`?a=1&${JOIN_PARAM}=${LINK_CODE}`), '?a=1');
check('stripping a clean query is a no-op', stripJoinParam('?a=1&b=2'), '?a=1&b=2');
check('the stripped result has no code left', readJoinCode(stripJoinParam(`?${JOIN_PARAM}=${LINK_CODE}`)), null);

// The grouped form is for reading aloud; it must survive the round trip back.
check('codes group in fours', formatCode('ABCDEFGHJK'), 'ABCD EFGH JK');
check('the grouped form normalizes back', normalizeCode(formatCode(LINK_CODE)), LINK_CODE);

// --- the stepper's one step ---
//
// `fromInt(toInt(qty) + step)` is the whole of `adjustQty`, and since the
// marketing hero's cards became live it is also the first thing a stranger
// touches. The bottom of the range is the case that matters: the *Out* card
// starts at 0 and the obvious first press is minus, so a missing clamp would
// put "-1" on a public page.
const step = (qty: string, delta: number) => fromInt(toInt(qty) + (delta < 0 ? -1 : 1));

check('minus at zero stays at zero', step('0', -1), '0');
check('minus at one reaches zero', step('1', -1), '0');
check('plus at zero reaches one', step('0', 1), '1');
check('a step is one however big the delta claims', step('4', -999), '3');

// A row written before the column was disciplined, or by a client that lied.
// It reads as 0 rather than poisoning every comparison downstream with NaN.
check('an unparseable quantity steps up from zero', step('abc', 1), '1');
check('a decimal quantity steps up from zero', step('1.5', 1), '1');

// --- the seeds a new household starts with ---
//
// A mistyped token is invisible when wrong: `themed()` falls through to the
// legacy-hex derivation and the term renders in *some* colour, so nothing
// crashes and nothing looks obviously broken. It also has to hold for every
// seed, because a household is created once and lived in afterwards.
const SEEDS = [...SEED_LOCATIONS, ...SEED_TYPES, ...SEED_STORES];

check('every seed carries a defined colour token', SEEDS.filter((t) => ! isColorSlot(t.ink)), []);
check('every seed carries a usable name', SEEDS.filter((t) => ! isValidName(t.name)), []);

// A household cannot hold an item without a location, and D16 refuses to
// delete the last one anything references — so an empty seed set is a dead end
// rather than a blank slate.
check('locations are seeded', SEED_LOCATIONS.length > 0, true);

// Names are unique *within* a group only. `termKey` is what `createTerm`
// dedupes on, and two seeds colliding there would leave a household one term
// short with no error anywhere.
for (const [label, group] of [
	['locations', SEED_LOCATIONS],
	['types', SEED_TYPES],
	['stores', SEED_STORES],
] as const) {
	check(`seeded ${label} have distinct keys`, new Set(group.map((t) => termKey(t.name))).size, group.length);
}

// --- the shopping list, which is a view of the items rather than a table ---
//
// Every rule here is invisible when wrong: a mis-ordered group still renders, a
// dropped item still leaves a plausible-looking list, and nobody notices until
// they are standing in the shop without the thing they came for.

const STORES: Term[] = [
	{ id: 's-costco', name: 'Costco', ink: 'color-10' },
	{ id: 's-aldi', name: 'Aldi', ink: 'color-14' },
];

function item(name: string, qty: string, threshold: string, storeIds: string[]): Item {
	return {
		id: `i-${name}`, name, locationId: 'l-1', typeIds: [], storeIds,
		qty, threshold, notes: '', createdAt: '2026-08-26T00:00:00.000Z',
	};
}

const BASKET: Item[] = [
	item('Butter', '2', '4', ['s-costco']),          // low
	item('Bacon', '0', '2', ['s-costco']),           // out
	item('Rice', '9', '2', ['s-costco']),            // stocked — not on the list
	item('Frozen Corn', '2', '4', ['s-aldi']),       // low
	item('Baking Soda', '0', '1', []),               // out, no store
	item('Coffee', '1', '2', ['s-aldi', 's-costco']), // low, two stores
];

check('an item at its threshold is on the list', needsBuying(item('x', '4', '4', [])), true);
check('an item above its threshold is not', needsBuying(item('x', '5', '4', [])), false);

// The count is *items*, not rows: Coffee draws twice and is one thing to buy.
check('the count is items, not rows', shoppingCount(BASKET), 5);

const groups = shoppingGroups(BASKET, STORES);

// A–Z with the storeless group last — it is the one you cannot walk into.
check('groups run A-Z with no-store last', groups.map((g) => g.name), ['Aldi', 'Costco', '']);
check('the storeless group is identified by a null id', groups[2].storeId, null);

// Out before low, then A–Z. The same sentence the restock sort says.
check('rows run out first, then A-Z', groups[1].items.map((i) => i.name), ['Bacon', 'Butter', 'Coffee']);

// An item you can buy at either shop belongs on both lists; picking one would
// be guessing.
check('an item with two stores appears under both', groups[0].items.map((i) => i.name), ['Coffee', 'Frozen Corn']);

// D16 refuses to delete a store while items reference it, but `id()` is not a
// foreign key — a dangling reference lands in the storeless group rather than
// drawing a card with no name.
check(
	'an unresolvable store falls into the storeless group',
	shoppingGroups([item('Ghost', '0', '1', ['s-gone'])], STORES).map((g) => g.storeId),
	[null]
);

check('a fully stocked pantry produces no groups', shoppingGroups([item('Rice', '9', '2', ['s-costco'])], STORES), []);

// --- household identity (D42) ---
//
// The letter is what a 68px rail shows and nothing else, so "every household
// beginning The is a T" is the failure the rule exists to prevent.

check('the letter skips a leading article', householdLetter('The Tadlock House'), 'T');
check('and takes the next word, not the first character', householdLetter('The Lake Cabin'), 'L');
check('a name with no article keeps its first letter', householdLetter("Mom's Pantry"), 'M');
check('a digit-bearing name is not special', householdLetter('Apartment 4B'), 'A');
check('leading punctuation is skipped', householdLetter('  “Nan’s” larder '), 'N');
check('an article alone still draws something', householdLetter('The'), 'T');
check('no name yet draws no letter', householdLetter('   '), '');

// `households.ink` is additive, so '' is a real stored value forever. Both
// halves of the app resolve it the same way or the rail and the invite card
// disagree about the same household.
check('a stored token is used as-is', householdInk('color-7', 'h1'), 'color-7');
check('an unset colour resolves to a token', isColorSlot(householdInk('', 'h1')), true);
check('and resolves to the same one every time', householdInk('', 'h1'), householdInk('', 'h1'));
check('a legacy hex is not a household colour', isColorSlot(householdInk('#a85e33', 'h1')), true);

// Hashing the id rather than the name is what keeps the default fixed across a
// rename — the one thing a household's colour must not do.
check(
	'two households get different defaults',
	householdInk('', 'h-zebra') !== householdInk('', 'h-apple'),
	true
);

check('only a token is stored', toHouseholdInk('color-3'), 'color-3');
check('a hex is refused rather than stored', toHouseholdInk('#a85e33'), '');
check('and so is nothing at all', toHouseholdInk(undefined), '');

console.log(fail === 0 ? `all ${total} assertions passed` : `${fail} of ${total} FAILED`);
if (fail > 0) throw new Error(`${fail} assertion(s) failed`);
