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
import { buildJoinUrl, readJoinCode, stripJoinParam, formatCode, JOIN_PARAM } from '../shared/joinLink';

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

console.log(fail === 0 ? `all ${total} assertions passed` : `${fail} of ${total} FAILED`);
if (fail > 0) throw new Error(`${fail} assertion(s) failed`);
