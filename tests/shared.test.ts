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
	normalizeCode, NEVER_EXPIRES, CODE_BYTES, PENDING_CODE, codeFromSeed,
} from '../shared/invite';
import {
	normalizeName, normalizeNotes, termKey, normalizeInk, DEFAULT_INK, isInk,
	isValidName, MAX_NAME, termBlock, termUsageCount, byName,
} from '../shared/term';
import {
	ANON_GUEST_NAME, DEV_GUESTS_VAR, isDevGuest, isSignedIn, parseDevGuests,
	type IdentityLike,
} from '../shared/identity';
import {
	ADMIN_HELD_NOTE, ADMIN_HELD_REFUSAL, ADMIN_IDS_VAR, ADMIN_WRITES_HELD, adminWritesHeldFor,
	cumulativeByMonth,
	daysBetween, DORMANT_DAYS, isAdminUser, isDormant, isWithinDays, matchScore, monthKey,
	monthKeysBack, monthLabel, parseAdminIds, SERIES_MONTHS, usDate, usDateFrom, usLongDate,
} from '../shared/admin';
import { COLOR_SLOTS, COLOR_SLOT_COUNT, isColorSlot } from '../shared/palette';
import {
	ACTIONS, actionPhrase, actionTitle, decodeHeld, encodeHeld, heldPhrase,
	isAction, isDestructive, retentionCutoff, RETENTION_DEFAULT_MONTHS,
	RETENTION_MAX_MONTHS, toActorKind, toRetentionMonths,
} from '../shared/activity';
import { householdInk, householdLetter, toHouseholdInk } from '../shared/household';
import { isValidDisplayName, MAX_DISPLAY_NAME, normalizeDisplayName, pickDisplayName } from '../shared/profile';
import { devAvatarUrl, normalizeAvatarUrl } from '../shared/avatar';
import { buildJoinUrl, readJoinCode, readJoinInput, stripJoinParam, formatCode, JOIN_PARAM } from '../shared/joinLink';
import {
	DEFAULT_SOURCE_MIX, SEED_GROW, SEED_LOCATIONS, SEED_MAKE, SEED_SHOPS, SEED_TYPES,
	seedSourcesFor, toSourceMix,
} from '../shared/seed';
import { DEMO_ITEMS, resolveDemoItems } from '../shared/demoItems';
import { digitsOnly, fromInt, isQty, MAX_QTY_DIGITS, toInt } from '../shared/qty';
import { addedAtOf, changedAtOf, normalizeStamp, stampFrom } from '../shared/stamp';
import { needsBuying, runBands, runCount } from '../shared/runList';
import {
	MONTHS, hasSeason, isInSeason, monthName, monthNumber, monthOf, normalizeSeason, readyPhrase,
} from '../shared/season';
import { formatSize, hasSize, MAX_SIZE_DIGITS, normalizeSize, UNITS, unitFor } from '../shared/size';
import { STATUS_PHRASE, statusKeyFor } from '../shared/status';
import { sha256, sha256Hex } from '../shared/sha256';
import {
	countTermFilters, matchesTermFilters, NO_TERM_FILTERS, pruneTermFilter, toggleTermFilter,
} from '../shared/filter';
import {
	fillFromCatalog, fillFromItem, matchAt, matchesQuery, nameSuggestions,
	searchSuggestions, sizeSearchText, suggestionAnnouncement, SUGGEST_MIN,
} from '../shared/suggest';
import { GROCERY_CATALOG } from '../shared/catalog';
import {
	DEFAULT_SOURCE_KIND, SOURCE_KINDS, isSourceKind, itemSourceKinds, sourceGroupWord, toSourceKind,
} from '../shared/source';
import type { SourceKind } from '../shared/source';
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

// --- SHA-256, against the FIPS 180-4 vectors ---
//
// Hand-written because the hosted runtime exposes no `crypto`, so it is checked
// against the published vectors rather than trusted.

check('sha256 of the empty string', sha256Hex(''),
	'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
check('sha256 of "abc"', sha256Hex('abc'),
	'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
// 56 bytes: the length that pads into a second block.
check('sha256 of the 448-bit vector',
	sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
	'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
check('sha256 of the 896-bit vector',
	sha256Hex('abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu'),
	'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1');
// `utf8Bytes` is hand-rolled too, and a surrogate pair is the easy thing to
// get wrong.
check('sha256 of a two-byte character', sha256Hex('\u00e9'),
	'4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
check('sha256 of a surrogate pair', sha256Hex('\u{1F9C0}'),
	'82c8ceb21a7dc528fdf93bdded189c38aad7010e989ca8f55bf2244de9367b59');
check('digest is 32 bytes', sha256('anything').length, 32);

// --- deriving a code by mixing, for the runtime with no `crypto` ---
//
// Production has no `crypto` and hands out sequential integer row ids, so the
// code is a SHA-256 over a server secret plus whatever else varies. None of
// this runs under `sf dev`, where `crypto` exists and is used instead.

const SEED = ['secret', '4', '1787838900000', '0.5', '0.25'];
const seeded = codeFromSeed(SEED);

check('a seeded code is code-shaped', isCodeShaped(seeded), true);
check('seeding is deterministic', codeFromSeed(SEED), seeded);
check('a different row id gives a different code',
	codeFromSeed(['secret', '5', '1787838900000', '0.5', '0.25']) === seeded, false);
// The whole point of the secret: same row id, same clock, different secret.
check('the secret changes the code',
	codeFromSeed(['other', '4', '1787838900000', '0.5', '0.25']) === seeded, false);
check('an empty seed still yields a shaped code', isCodeShaped(codeFromSeed([''])), true);
// Joined with NUL so regrouping the same characters cannot collide.
check('parts cannot be regrouped into the same seed',
	codeFromSeed(['ab', 'c']) === codeFromSeed(['a', 'bc']), false);

// A sequential id must not produce a walkable sequence of codes once mixed.
const walk = ['1', '2', '3', '4', '5'].map((id) => codeFromSeed(['s', id, '0', '0', '0']));
check('consecutive ids give distinct codes', new Set(walk).size, 5);
check('all of them are code-shaped', walk.every(isCodeShaped), true);

// The placeholder a row carries between insert and real code must be
// unredeemable — `redeemInvite` rejects anything `isCodeShaped` refuses.
check('the pending placeholder is not code-shaped', isCodeShaped(PENDING_CODE), false);

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

// D58: the dialog names the group the way the drawer's heading does, or it
// contradicts the panel it opened from.
check(
	'a source household says source',
	termBlock('store', 'The Garden', 2, 'Source')?.body,
	'The Garden is on 2 items. A source can only be deleted once nothing uses it.'
);
check(
	'the location branch ignores the noun',
	termBlock('location', 'Pantry', 2, 'Source')?.body,
	'Pantry holds 2 items. A location can only be deleted once nothing is stored there.'
);

// --- D58: a source carries a kind ---

check('the three kinds, in band order', SOURCE_KINDS, ['shop', 'grow', 'make']);
check('an unset column is a shop', toSourceKind(''), 'shop');
check('and so is the default', DEFAULT_SOURCE_KIND, 'shop');
check('a stored kind survives', toSourceKind('grow'), 'grow');
check('so does make', toSourceKind('make'), 'make');
// A kind from a future version, a typo, or a non-string all resolve rather
// than throwing: this runs in a query, and a query that throws is invisible.
check('an unknown kind is a shop', toSourceKind('forage'), 'shop');
check('and so is a non-string', toSourceKind(null), 'shop');
check('and so is a number', toSourceKind(3), 'shop');
check('isSourceKind accepts the three', SOURCE_KINDS.every(isSourceKind), true);
check('and refuses everything else', isSourceKind('shops'), false);
check('including the empty string', isSourceKind(''), false);

// The group's word. **The rule is "does anything here fail to be a shop"**, not
// "how many distinct kinds are there" — a household whose every source is a
// garden has exactly one kind, and calling that group *Store* is the precise
// confusion the kind exists to remove.
const src = (...kinds: SourceKind[]) => kinds.map((kind) => ({ kind }));

check('no sources at all is Store', sourceGroupWord([]), 'Store');
check('every source a shop is Store', sourceGroupWord(src('shop', 'shop', 'shop')), 'Store');
check('one garden makes it Source', sourceGroupWord(src('shop', 'grow')), 'Source');
check('one kitchen makes it Source', sourceGroupWord(src('shop', 'make')), 'Source');
check('all three is Source', sourceGroupWord(src('shop', 'grow', 'make')), 'Source');
check('nothing but gardens is still Source', sourceGroupWord(src('grow')), 'Source');
check('gardens and kitchens with no shop is Source', sourceGroupWord(src('grow', 'make')), 'Source');

// The item card's one glyph. It answers *is this something other than bought*,
// so `null` — no glyph at all — is the common answer and the one worth getting
// right: a marker on every card would mark nothing.
const SOURCES = [
	{ id: 'publix', kind: 'shop' as SourceKind },
	{ id: 'garden', kind: 'grow' as SourceKind },
	{ id: 'kitchen', kind: 'make' as SourceKind },
	{ id: 'legacy', kind: undefined },
	{ id: 'aldi', kind: 'shop' as SourceKind },
];

check('a bought item wears a cart', itemSourceKinds(['publix'], SOURCES), ['shop']);
check('a grown item wears a sprout', itemSourceKinds(['garden'], SOURCES), ['grow']);
check('a made item wears a pot', itemSourceKinds(['kitchen'], SOURCES), ['make']);
// The counter-argument case the doc records: tomatoes bought in February and
// picked in July. **Both**, because both are true and the tags cannot say it.
check('grown-and-bought wears both', itemSourceKinds(['publix', 'garden'], SOURCES), ['shop', 'grow']);
check('made-and-bought wears both', itemSourceKinds(['publix', 'kitchen'], SOURCES), ['shop', 'make']);
check('all three is all three', itemSourceKinds(['publix', 'garden', 'kitchen'], SOURCES), ['shop', 'grow', 'make']);

// Band order, never id order — two cards with the same two sources have to draw
// the same two glyphs in the same two places or a grid has no rhythm.
check('band order, not id order', itemSourceKinds(['kitchen', 'garden'], SOURCES), ['grow', 'make']);
check('and the same the other way round', itemSourceKinds(['garden', 'kitchen'], SOURCES), ['grow', 'make']);

// Two sources of one kind is one glyph: the cluster says *what kinds*, and the
// tags below already say which sources.
check('two shops is one cart', itemSourceKinds(['publix', 'aldi'], SOURCES), ['shop']);

// **No source at all draws nothing**, even though the item lands on Buy. D58's
// table splits an empty source three ways and the first is *not set yet* — a
// gap, and a cart would answer a question nobody has answered.
check('no source draws nothing', itemSourceKinds([], SOURCES), []);

// A row written before the column, and a reference to nothing — `id()` is not a
// foreign key, so both are reachable.
check('an unset kind reads as a shop', itemSourceKinds(['legacy'], SOURCES), ['shop']);
check('a dangling source id is skipped', itemSourceKinds(['gone'], SOURCES), []);
check('and does not hide a real one beside it', itemSourceKinds(['gone', 'garden'], SOURCES), ['grow']);

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

// --- who counts as signed in ---
//
// **This block is the tripwire for the v15 leak.** The old rule admitted the
// exact identity `sf dev` issues, and the hosted runtime hands an
// *unauthenticated* caller that same identity — so an anonymous `curl` against
// the published space was a signed-in user. What matters here is not that a dev
// guest passes; it is that `guest:local` never does, however it is configured.
const anonGuest: IdentityLike = {
	userId: 'guest:local', displayName: 'Local', provider: 'guest',
	isGuest: true, isAuthenticated: false,
};
const namedGuest: IdentityLike = {
	userId: 'guest:justin-7f3a91c2', displayName: 'Justin 7f3a91c2', provider: 'guest',
	isGuest: true, isAuthenticated: false,
};
const realUser: IdentityLike = {
	userId: 'account:abc123', displayName: 'Justin', provider: 'gravatar',
	isGuest: false, isAuthenticated: true,
};

const DEV = 'justin-7f3a91c2, alice-2d81ee40';

check('a real account may act', isSignedIn(realUser, undefined), true);
check('and does not need the dev list', isSignedIn(realUser, ''), true);

// **The four that must never change.** `guest:local` is the only identity a
// published space can mint, so every one of these is a production caller.
check('the anonymous guest is refused', isSignedIn(anonGuest, undefined), false);
check('and stays refused when a dev list exists', isSignedIn(anonGuest, DEV), false);
check('and cannot be let in by naming it', isSignedIn(anonGuest, 'local'), false);
check('nor by naming it with the prefix', isSignedIn(anonGuest, 'guest:local'), false);
check('parsing drops it either way', parseDevGuests('local, guest:local, alice'), ['alice']);
check('the excluded name is stated once', ANON_GUEST_NAME, 'local');

// A named guest is `sf dev` only — production ignores `?guest=`, verified
// against the live space on 2026-08-30.
check('a named dev guest in the list may act', isSignedIn(namedGuest, DEV), true);
check('but not when the list is absent', isSignedIn(namedGuest, undefined), false);
check('nor when the list is empty', isSignedIn(namedGuest, ''), false);
check('nor when the list names somebody else', isSignedIn(namedGuest, 'alice-2d81ee40'), false);
check('the match is exact, not a prefix', isSignedIn(namedGuest, 'justin'), false);
check('the list accepts the prefixed spelling too', isSignedIn(namedGuest, 'guest:justin-7f3a91c2'), true);
check('the variable is named once', DEV_GUESTS_VAR, 'LARDER_DEV_GUESTS');

// A guest that claims to be authenticated is still a guest. Both flags are
// required together so a future identity setting only one is refused.
check('a guest claiming authentication is refused', isSignedIn({ ...namedGuest, isAuthenticated: true }, DEV), false);
check('an account that is not authenticated is refused', isSignedIn({ ...realUser, isAuthenticated: false }, DEV), false);
check('an id with no guest prefix is not a dev guest', isDevGuest({ ...namedGuest, userId: 'justin-7f3a91c2' }, DEV), false);

// A signed-in user with no id is not a user.
check('no userId is refused', isSignedIn({ ...realUser, userId: '' }, DEV), false);
check('and an empty guest id is refused', isSignedIn({ ...namedGuest, userId: 'guest:' }, DEV), false);

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

// --- the join field takes either form ---
//
// The sender's one-press affordance is *Copy link*, so the whole URL is what
// most often lands in the switcher's field. Both forms have to resolve, or the
// paste fails with a disabled button and nothing to explain it.
const LINK_URL = buildJoinUrl('https://larderlog.view.fast', LINK_CODE);

check('a pasted link gives the code', readJoinInput(LINK_URL), LINK_CODE);
check('a bare code gives the code', readJoinInput(LINK_CODE), LINK_CODE);
check('a spaced code gives the code', readJoinInput(formatCode(LINK_CODE)), LINK_CODE);
check('a lowercased code gives the code', readJoinInput(LINK_CODE.toLowerCase()), LINK_CODE);
check('surrounding whitespace is ignored', readJoinInput(`  ${LINK_URL}  `), LINK_CODE);

// A mail client may lowercase a whole link, and a chat app may append a
// fragment. Neither should cost the recipient the paste.
check('a lowercased link gives the code', readJoinInput(LINK_URL.toLowerCase()), LINK_CODE);
check('a fragment after the code is dropped', readJoinInput(`${LINK_URL}#x`), LINK_CODE);
check('other parameters in a link are ignored', readJoinInput(`${LINK_URL}&ref=chat`), LINK_CODE);
check('a bare query string works too', readJoinInput(`${JOIN_PARAM}=${LINK_CODE}`), LINK_CODE);

// Nothing usable is `null` rather than a guess, which is what keeps the button
// disabled instead of sending `redeemInvite` something nobody typed.
check('an empty field is nothing', readJoinInput('   '), null);
check('a truncated code is nothing', readJoinInput('ABC2 3DEF'), null);
check('a link with no join parameter is nothing', readJoinInput('https://larderlog.view.fast/'), null);
check('a link with a bad code is nothing', readJoinInput(buildJoinUrl('https://x.test', 'OOOOOOOOOO')), null);

// The link wins over the surrounding text, so a code that only *looks* shaped
// because the URL was stripped of its separators cannot be read out of one.
check(
	'the code is read from the parameter, not the URL text',
	readJoinInput('https://larderlog.view.fast/?a=1&' + JOIN_PARAM + '=' + LINK_CODE),
	LINK_CODE
);

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

// `digitsOnly` is what the quantity fields filter every keystroke through, so
// what it leaves behind has to be something `isQty` accepts — otherwise a field
// could refuse a character and still end up holding a value the app rejects.
check('digits pass through', digitsOnly('120'), '120');
check('a decimal point is dropped', digitsOnly('1.5'), '15');
check('a minus sign is dropped', digitsOnly('-3'), '3');
check('the number field\'s own escapes are dropped', digitsOnly('1e5'), '15');
check('letters and spaces are dropped', digitsOnly(' 12 apples '), '12');
check('non-ASCII digits are not digits', digitsOnly('١٢'), '');
check('a value with nothing left is empty', digitsOnly('abc'), '');
check('a non-string filters to empty', digitsOnly(null), '');

check('what survives the filter is a quantity', isQty(digitsOnly('1.5kg')), true);
check(
	'a field filled to the cap is still a safe integer',
	Number.isSafeInteger(Number('9'.repeat(MAX_QTY_DIGITS))),
	true
);

// --- the seeds a new household starts with ---
//
// A mistyped token is invisible when wrong: `themed()` falls through to the
// legacy-hex derivation and the term renders in *some* colour, so nothing
// crashes and nothing looks obviously broken. It also has to hold for every
// seed, because a household is created once and lived in afterwards.
const SEEDS = [...SEED_LOCATIONS, ...SEED_TYPES, ...SEED_SHOPS];

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
	['stores', SEED_SHOPS],
] as const) {
	check(`seeded ${label} have distinct keys`, new Set(group.map((t) => termKey(t.name))).size, group.length);

	// Two seeds sharing a colour inside one group renders as two chips a person
	// has to read to tell apart, in the one place they are drawn side by side.
	check(`seeded ${label} have distinct colours`, new Set(group.map((t) => t.ink)).size, group.length);
}

// D50: the seeded types are meant to cover a supermarket, but not to spend the
// whole palette doing it — `proposeColor()` hands out the first unused token and
// falls back to `color-1` once every one is taken, so a household that added a
// type would get a colour already on screen.
check('seeded types leave colours for a household to claim', SEED_TYPES.length < COLOR_SLOT_COUNT, true);

// --- D61: where your food comes from, asked once on the creation card ---
//
// Every rule here is invisible when wrong. A mix that resolves the wrong way
// seeds a household that looks plausible — three shops, or none — and nobody
// can tell it was the question rather than the answer that failed.

// The two seeded non-shop sources are real terms with real tokens, and neither
// may collide with a seeded shop: they are drawn in one chip list.
const SEED_SOURCES = [...SEED_SHOPS, SEED_GROW, SEED_MAKE];

check('every seeded source carries a defined colour token', SEED_SOURCES.filter((t) => ! isColorSlot(t.ink)), []);
check('every seeded source carries a usable name', SEED_SOURCES.filter((t) => ! isValidName(t.name)), []);
check('seeded sources have distinct keys', new Set(SEED_SOURCES.map((t) => termKey(t.name))).size, SEED_SOURCES.length);
check('seeded sources have distinct colours', new Set(SEED_SOURCES.map((t) => t.ink)).size, SEED_SOURCES.length);
check('seeded sources leave colours for a household to claim', SEED_SOURCES.length < COLOR_SLOT_COUNT, true);

// The kinds are what put a row on a band. A shop seeded as `grow` would file
// Grocery under Harvest, which is the whole feature backwards.
check('the seeded shops are all shops', SEED_SHOPS.every((s) => s.kind === 'shop'), true);
check('the grow seed grows', SEED_GROW.kind, 'grow');
check('the make seed makes', SEED_MAKE.kind, 'make');

// No definite article: every other seeded term in the file is a bare noun, and
// `The Garden` beside `Market` is one term written as a phrase.
check('no seeded source starts with an article', SEED_SOURCES.filter((t) => /^(the|a|an)\s/i.test(t.name)), []);

// The default is the household that existed before the question did, which is
// what lets Enter still finish the card.
check('the default mix is buy alone', DEFAULT_SOURCE_MIX, { buy: true, grow: false, make: false });
check('the default mix seeds exactly the shops', seedSourcesFor(DEFAULT_SOURCE_MIX), SEED_SHOPS);

// **Absent and empty are different answers**, and this is the pair worth the
// test: `undefined` is a caller that never asked and takes the default, while
// an explicit all-false is somebody unticking all three and means *no sources*.
// Collapsing them either forces shops on a household that refused them or
// drops the seed for every caller that omitted the argument.
check('an absent mix is the default', toSourceMix(undefined), DEFAULT_SOURCE_MIX);
check('a null mix is the default', toSourceMix(null), DEFAULT_SOURCE_MIX);
check('a non-object mix is the default', toSourceMix('buy'), DEFAULT_SOURCE_MIX);
check('an empty object is not the default', toSourceMix({}), { buy: false, grow: false, make: false });
check('an all-false mix survives', toSourceMix({ buy: false, grow: false, make: false }), { buy: false, grow: false, make: false });
check('an all-false mix seeds nothing', seedSourcesFor({ buy: false, grow: false, make: false }), []);

// Truthiness is not a tick. A string or a number in the payload reads as *not
// ticked* rather than as yes.
check('a truthy non-boolean is not a tick', toSourceMix({ buy: 'yes', grow: 1, make: {} }), { buy: false, grow: false, make: false });

// The three ticks, and the order they seed in — shop, grow, make, which is the
// run list's band order.
check('buy and grow seeds the shops and the garden', seedSourcesFor({ buy: true, grow: true, make: false }), [...SEED_SHOPS, SEED_GROW]);
check('all three seeds everything in band order', seedSourcesFor({ buy: true, grow: true, make: true }), [...SEED_SHOPS, SEED_GROW, SEED_MAKE]);
check('grow alone seeds only the garden', seedSourcesFor({ buy: false, grow: true, make: false }), [SEED_GROW]);
check('make alone seeds only the kitchen', seedSourcesFor({ buy: false, grow: false, make: true }), [SEED_MAKE]);

// The group word follows the seed, so a household is a `SOURCE` household
// before it holds a single item — the line D61 retires from the design doc.
check('buy alone seeds a Store household', sourceGroupWord(seedSourcesFor(DEFAULT_SOURCE_MIX)), 'Store');
check('ticking grow seeds a Source household', sourceGroupWord(seedSourcesFor({ buy: true, grow: true, make: false })), 'Source');
check('ticking make seeds a Source household', sourceGroupWord(seedSourcesFor({ buy: true, grow: false, make: true })), 'Source');
check('seeding nothing leaves a Store household', sourceGroupWord(seedSourcesFor({ buy: false, grow: false, make: false })), 'Store');

// --- the shopping list, which is a view of the items rather than a table ---
//
// Every rule here is invisible when wrong: a mis-ordered group still renders, a
// dropped item still leaves a plausible-looking list, and nobody notices until
// they are standing in the shop without the thing they came for.

function term(id: string, name: string, ink: string): Term {
	return { id, name, ink, createdAt: '', addedAt: '', changedAt: '' };
}

const STORES: Term[] = [
	term('s-costco', 'Costco', 'color-10'),
	term('s-aldi', 'Aldi', 'color-14'),
];

function item(
	name: string, qty: string, threshold: string, storeIds: string[],
	offShoppingList = false, season: [string, string] = ['', '']
): Item {
	return {
		id: `i-${name}`, name, locationId: 'l-1', typeIds: [], storeIds,
		qty, threshold, size: '', unit: '', offShoppingList,
		seasonFrom: season[0], seasonTo: season[1], notes: '',
		createdAt: '2026-08-26T00:00:00.000Z', addedAt: '', changedAt: '',
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

// A month to run the bands in. Arbitrary and stated, so a season test can
// choose one either side of it rather than depending on today.
const JUNE = 6;

check('an item at its threshold is on the list', needsBuying(item('x', '4', '4', [])), true);
check('an item above its threshold is not', needsBuying(item('x', '5', '4', [])), false);

// The count is *items*, not rows: Coffee draws twice and is one thing to buy.
check('the count is items, not rows', runCount(BASKET, STORES, JUNE), 5);

// Every source here is a shop, so there is exactly one band and the screen is
// today's shopping list byte for byte — no segment, no headers.
const shopsOnly = runBands(BASKET, STORES, JUNE);
check('all shops is one band', shopsOnly.map((b) => b.kind), ['buy']);

const groups = shopsOnly[0].groups;

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
	runBands([item('Ghost', '0', '1', ['s-gone'])], STORES, JUNE)[0].groups.map((g) => g.storeId),
	[null]
);

check('a fully stocked pantry produces no bands at all', runBands([item('Rice', '9', '2', ['s-costco'])], STORES, JUNE), []);

// --- D58: the bands ---

const SOURCED: (Term & { kind?: SourceKind })[] = [
	term('s-costco', 'Costco', 'color-10'),
	term('s-aldi', 'Aldi', 'color-14'),
	{ ...term('s-garden', 'The Garden', 'color-3'), kind: 'grow' as SourceKind },
	{ ...term('s-kitchen', 'The Kitchen', 'color-5'), kind: 'make' as SourceKind },
];

const RUN: Item[] = [
	...BASKET,
	item('Tomatoes', '1', '4', ['s-garden']),        // low, grown
	item('Basil', '0', '1', ['s-garden']),           // out, grown
	item('Chicken Stock', '1', '4', ['s-kitchen']),  // low, made
];

const bands = runBands(RUN, SOURCED, JUNE);

// Always Buy · Harvest · Make, and only the ones holding something.
check('bands come in order', bands.map((b) => b.kind), ['buy', 'harvest', 'make']);
check('the buy band keeps its five', bands[0].count, 5);
check('harvest holds two', bands[1].count, 2);
check('make holds one', bands[2].count, 1);

// A band groups by source exactly as the whole list used to.
check('harvest draws one card', bands[1].groups.map((g) => g.name), ['The Garden']);
check('and sorts it out-before-low', bands[1].groups[0].items.map((i) => i.name), ['Basil', 'Tomatoes']);

// The storeless group is Buy's, and the test for it is against **every**
// source: an item naming only The Garden has a source, so it must not also
// turn up in Buy asking to be given a shop.
check('the storeless card is on Buy', bands[0].groups.map((g) => g.storeId).includes(null), true);
check('and harvest has no storeless card', bands[1].groups.some((g) => g.storeId === null), false);

// One item, two kinds — the counter-argument case: bought in February, picked
// in July. It draws on both bands and each counts it once, which is why the
// bands need not add up to the total.
const BOTH = [item('Tomatoes', '1', '4', ['s-costco', 's-garden'])];
const split = runBands(BOTH, SOURCED, JUNE);
check('an item with two kinds is on both bands', split.map((b) => b.kind), ['buy', 'harvest']);
check('counted once by each', split.map((b) => b.count), [1, 1]);
check('and once in total', runCount(BOTH, SOURCED, JUNE), 1);

// A grow source with nothing low produces no Harvest band, which is what keeps
// the segment away from a household that has one and never runs out.
check(
	'a band with nothing in it does not appear',
	runBands([item('Basil', '9', '1', ['s-garden'])], SOURCED, JUNE),
	[]
);

// The exclusion gates every band, not only Buy: what the checkbox says is
// *never remind me about this*, and a harvest list is a reminder.
check(
	'an excluded grown item never reaches Harvest',
	runBands([item('Basil', '0', '1', ['s-garden'], true)], SOURCED, JUNE),
	[]
);

// A source written before the column resolves to a shop, so its items stay on
// Buy rather than vanishing into a band that does not exist.
check(
	'an unset kind lands on Buy',
	runBands([item('Bacon', '0', '2', ['s-costco'])], SOURCED, JUNE).map((b) => b.kind),
	['buy']
);

// --- D58: seasons ---
//
// Months, not dates: a season repeats and a date does not, so there is no year,
// no locale and no format here to get wrong.

check('twelve months', MONTHS.length, 12);
check('one-indexed', monthName('1'), 'January');
check('and September is nine', monthName('9'), 'September');
check('a number out of range is nothing', monthName('13'), '');
check('zero is nothing', monthNumber('0'), 0);
check('and so is a word', monthNumber('June'), 0);
check('and a non-string', monthNumber(6), 0);
check('whitespace is trimmed', monthNumber(' 6 '), 6);

// A pair that is never half-set, exactly as `size` and `unit` are (D52). Half a
// season is discarded rather than completed — completing it would mean guessing
// a value the household never typed.
check('a whole pair survives', normalizeSeason('6', '9'), { seasonFrom: '6', seasonTo: '9' });
check('a start with no end is neither', normalizeSeason('6', ''), { seasonFrom: '', seasonTo: '' });
check('an end with no start is neither', normalizeSeason('', '9'), { seasonFrom: '', seasonTo: '' });
check('and rubbish is neither', normalizeSeason('June', '99'), { seasonFrom: '', seasonTo: '' });
check('a one-month season is legal', normalizeSeason('7', '7'), { seasonFrom: '7', seasonTo: '7' });
check('hasSeason wants both', hasSeason('6', ''), false);
check('and is happy with both', hasSeason('6', '9'), true);

// **An unset season is always in season.** The question the run list asks is
// *should this row move to NOT YET*, and a household that has said nothing
// about when its basil is ready has not said it is unavailable.
check('no season is always in season', isInSeason(1, '', ''), true);
check('half a season is too', isInSeason(1, '6', ''), true);

check('June is inside June to September', isInSeason(6, '6', '9'), true);
check('and so is September', isInSeason(9, '6', '9'), true);
check('May is not', isInSeason(5, '6', '9'), false);
check('nor is October', isInSeason(10, '6', '9'), false);

// **The range wraps, and this is the case worth having a test for.** Read
// literally as `11 <= m <= 2`, November to February is empty — which would move
// an item to NOT YET in every month of the year, including the ones it is ready
// in.
check('December is inside November to February', isInSeason(12, '11', '2'), true);
check('so is January', isInSeason(1, '11', '2'), true);
check('and November itself', isInSeason(11, '11', '2'), true);
check('and February itself', isInSeason(2, '11', '2'), true);
check('June is not', isInSeason(6, '11', '2'), false);

// A one-month season is exactly one month.
check('July only, in July', isInSeason(7, '7', '7'), true);
check('July only, in August', isInSeason(8, '7', '7'), false);

// The row says what happens next, which is the start month.
check('the phrase names the start', readyPhrase('9', '11'), 'Ready in September');
check('and says nothing without a whole pair', readyPhrase('9', ''), '');

// `monthOf` is what the client hands in, so it has to agree with the stored
// numbering rather than with `Date`'s zero-indexed one.
check('monthOf is one-indexed', monthOf(Date.UTC(2026, 0, 15, 12)), 1);
check('and December is twelve', monthOf(Date.UTC(2026, 11, 15, 12)), 12);

// --- D58: NOT YET ---
//
// An out-of-season row leaves the count and the checkboxes, and nothing else
// about the item moves.

const SQUASH = item('Butternut Squash', '0', '2', ['s-garden'], false, ['9', '11']);
const seasonBands = runBands([...RUN, SQUASH], SOURCED, JUNE);
const gardenCard = seasonBands[1].groups[0];

check('the harvest card still draws', seasonBands[1].kind, 'harvest');
check('the out-of-season row is not among its items', gardenCard.items.map((i) => i.name), ['Basil', 'Tomatoes']);
check('it is in notYet instead', gardenCard.notYet.map((i) => i.name), ['Butternut Squash']);
check('and it does not count', seasonBands[1].count, 2);
check('nor toward the total', runCount([...RUN, SQUASH], SOURCED, JUNE), runCount(RUN, SOURCED, JUNE));

// But it is still out, which is the one place the pills and the run list
// deliberately disagree.
check('the item is still out', statusKeyFor(SQUASH.qty, SQUASH.threshold), 'out');
check('and still needs getting', needsBuying(SQUASH), true);

// In September it is an ordinary harvest row again.
check(
	'come September it is an ordinary row',
	runBands([SQUASH], SOURCED, 9)[0].groups[0].items.map((i) => i.name),
	['Butternut Squash']
);
check('with nothing left in notYet', runBands([SQUASH], SOURCED, 9)[0].groups[0].notYet, []);

// **Only the harvest card is affected.** An item you buy at Publix and pick in
// July is still on the Buy card in February — the season says nothing about the
// shop, and it is counted once, by the band it is really on.
const BOUGHT_AND_GROWN = item('Tomatoes', '1', '4', ['s-costco', 's-garden'], false, ['7', '9']);
const winter = runBands([BOUGHT_AND_GROWN], SOURCED, 2);

check('the buy card keeps it out of season', winter[0].groups[0].items.map((i) => i.name), ['Tomatoes']);
check('the harvest card holds it back', winter[1].groups[0].notYet.map((i) => i.name), ['Tomatoes']);
check('buy counts it', winter[0].count, 1);
check('harvest does not', winter[1].count, 0);
check('and the total counts it once', runCount([BOUGHT_AND_GROWN], SOURCED, 2), 1);

// A card whose every row is out of season still draws: seeing what is coming is
// the whole point of the group.
const allNotYet = runBands([SQUASH], SOURCED, JUNE);
check('a card of nothing but notYet still draws', allNotYet[0].groups[0].notYet.length, 1);
check('with an empty item list', allNotYet[0].groups[0].items, []);
check('and a band count of zero', allNotYet[0].count, 0);

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

// --- when an item entered the pantry, which outlives its row (D17) ---
//
// The whole point is undo: `removeItem` really deletes and undo re-inserts, so
// the restored row's `createdAt` is *now* and sorting on it threw the item to
// the top of *Recently added* instead of putting it back. Zero refuses an
// app-set `createdAt`, so this stamp is the only thing that can carry across.

const STAMP_NOW = Date.parse('2026-08-01T12:00:00.000Z');

check('an ordinary add is stamped now', normalizeStamp(undefined, STAMP_NOW), '2026-08-01T12:00:00.000Z');
check('and so is an empty string', normalizeStamp('', STAMP_NOW), '2026-08-01T12:00:00.000Z');

// The undo path: the removed row's own stamp, handed back and honoured.
check('undo carries the old stamp across', normalizeStamp('2026-07-04T09:30:00.000Z', STAMP_NOW), '2026-07-04T09:30:00.000Z');

// Both guards keep a bad value from doing the exact thing this fixes — pinning
// a row to the top of the list, permanently.
check('an unparseable stamp falls back to now', normalizeStamp('last tuesday', STAMP_NOW), '2026-08-01T12:00:00.000Z');
check('a future stamp is clamped to now', normalizeStamp('2030-01-01T00:00:00.000Z', STAMP_NOW), '2026-08-01T12:00:00.000Z');
check('the boundary is inclusive', normalizeStamp('2026-08-01T12:00:00.000Z', STAMP_NOW), '2026-08-01T12:00:00.000Z');

// Anything stored is re-encoded, so a row can never hold a string that sorts
// differently than it reads — the only reason comparing these is safe (D4).
check('a non-UTC stamp is normalized to UTC', normalizeStamp('2026-07-04T09:30:00+02:00', STAMP_NOW), '2026-07-04T07:30:00.000Z');
check('stampFrom round-trips', stampFrom(Date.parse('2026-07-04T09:30:00.000Z')), '2026-07-04T09:30:00.000Z');

// `addedAt` defaults to '' and nothing backfills it, so this fallback is the
// sort key for every row added before the column — not a transitional case.
check(
	'a row from before the column sorts on createdAt',
	addedAtOf({ addedAt: '', createdAt: '2026-06-01T00:00:00.000Z' }),
	'2026-06-01T00:00:00.000Z'
);
check(
	'a row that has one sorts on that',
	addedAtOf({ addedAt: '2026-05-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z' }),
	'2026-05-01T00:00:00.000Z'
);

// The bug, as an assertion. A restored row is newer than everything by
// `createdAt` and must still fall between its neighbours by `addedAt`.
const restored = { addedAt: '2026-06-15T00:00:00.000Z', createdAt: '2026-08-27T00:00:00.000Z' };
const older = { addedAt: '', createdAt: '2026-06-01T00:00:00.000Z' };
const newer = { addedAt: '', createdAt: '2026-07-01T00:00:00.000Z' };
check(
	'an undone removal sorts back into place, not to the top',
	[newer, restored, older].sort((a, b) => addedAtOf(b).localeCompare(addedAtOf(a))).map((r) => r.createdAt),
	['2026-07-01T00:00:00.000Z', '2026-08-27T00:00:00.000Z', '2026-06-01T00:00:00.000Z']
);

// The modified stamp, and its two fallbacks. A row is never changed before it
// exists, so `addedAt` is the right second choice — `createdAt` is only reached
// when neither of ours was ever written.
check(
	'changedAt wins when it is set',
	changedAtOf({ changedAt: '2026-08-10T00:00:00.000Z', addedAt: '2026-08-01T00:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z' }),
	'2026-08-10T00:00:00.000Z'
);
check(
	'an unmodified row falls back to addedAt',
	changedAtOf({ changedAt: '', addedAt: '2026-08-01T00:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z' }),
	'2026-08-01T00:00:00.000Z'
);
check(
	'a row from before both columns falls back to createdAt',
	changedAtOf({ changedAt: '', addedAt: '', createdAt: '2026-07-01T00:00:00.000Z' }),
	'2026-07-01T00:00:00.000Z'
);

// --- terms are A–Z, and that is the only order any of them appear in ---
//
// They were rendered in `collect()` order, which is seed order for a new
// household and creation order after that — an order nothing about the list
// tells a reader to expect.

const UNSORTED: Term[] = [
	term('t-3', 'Refrigerator', 'color-1'),
	term('t-1', 'Pantry', 'color-10'),
	term('t-2', 'Freezer', 'color-12'),
];

check('terms come back A–Z', byName(UNSORTED).map((t) => t.name), ['Freezer', 'Pantry', 'Refrigerator']);
// The seeds are deliberately *not* alphabetical (D40), so this is the case
// that would have gone unnoticed: sorting has to be someone's job.
check('the input is not mutated', UNSORTED.map((t) => t.name), ['Refrigerator', 'Pantry', 'Freezer']);
check('an empty list is fine', byName([]), []);

// --- term filters: OR inside a group, AND across groups (D45) ---
//
// The rule nothing on screen states and everything depends on. An `every` where
// a `some` belongs still compiles, still runs, and hands back an empty grid.

function filterable(id: string, locationId: string, typeIds: string[], storeIds: string[]): Item {
	return {
		id, name: id, locationId, typeIds, storeIds,
		qty: '1', threshold: '1', size: '', unit: '', offShoppingList: false,
		seasonFrom: '', seasonTo: '', notes: '',
		createdAt: '', addedAt: '', changedAt: '',
	};
}

const PANTRY_GRAIN = filterable('a', 'l-pantry', ['t-grain'], ['s-aldi']);
const FREEZER_MEAT = filterable('b', 'l-freezer', ['t-protein'], ['s-costco']);
const PANTRY_MULTI = filterable('c', 'l-pantry', ['t-grain', 't-protein'], ['s-aldi', 's-costco']);

check('no filters matches everything', matchesTermFilters(FREEZER_MEAT, NO_TERM_FILTERS), true);

// OR inside a group: a second location *widens*.
check(
	'one location excludes the others',
	[PANTRY_GRAIN, FREEZER_MEAT].map((i) => matchesTermFilters(i, { ...NO_TERM_FILTERS, locations: ['l-pantry'] })),
	[true, false]
);
check(
	'two locations admit both',
	[PANTRY_GRAIN, FREEZER_MEAT].map((i) => matchesTermFilters(i, { ...NO_TERM_FILTERS, locations: ['l-pantry', 'l-freezer'] })),
	[true, true]
);
check(
	'two types admit an item carrying either',
	matchesTermFilters(PANTRY_GRAIN, { ...NO_TERM_FILTERS, types: ['t-grain', 't-dairy'] }),
	true
);

// AND across groups: a type *narrows* what a location admitted.
check(
	'location AND type both have to hold',
	matchesTermFilters(PANTRY_GRAIN, { locations: ['l-pantry'], types: ['t-protein'], stores: [] }),
	false
);
check(
	'an item carrying both types survives both groups',
	matchesTermFilters(PANTRY_MULTI, { locations: ['l-pantry'], types: ['t-protein'], stores: ['s-aldi'] }),
	true
);
// The case that separates OR-across from AND-across: two groups whose union
// would admit it and whose intersection does not.
check(
	'a wide OR in one group cannot rescue a failed group',
	matchesTermFilters(FREEZER_MEAT, { locations: ['l-pantry'], types: ['t-protein', 't-grain'], stores: [] }),
	false
);

// --- toggling, counting, pruning ---
check('toggle adds an absent id', toggleTermFilter(['a'], 'b'), ['a', 'b']);
check('toggle removes a present id', toggleTermFilter(['a', 'b'], 'a'), ['b']);
check('toggle does not mutate its input', (() => { const ids = ['a']; toggleTermFilter(ids, 'b'); return ids; })(), ['a']);
check('count spans all three groups', countTermFilters({ locations: ['a'], types: ['b', 'c'], stores: [] }), 3);
check('nothing selected counts zero', countTermFilters(NO_TERM_FILTERS), 0);

// A filter pointing at a term another device just deleted hides every item, so
// the prune returns the *same reference* when nothing went — that is what lets
// the caller use it as a setState guard without looping forever.
const LIVE = ['a', 'b'];
check('prune keeps the reference when nothing is stale', pruneTermFilter(LIVE, () => true) === LIVE, true);
check('prune drops a vanished term', pruneTermFilter(LIVE, (id) => id !== 'b'), ['a']);

// --- D46: the account's display name ---
check('a name is trimmed and collapsed', normalizeDisplayName('  Justin   Tadlock '), 'Justin Tadlock');
check('whitespace alone is not a name', normalizeDisplayName('   \t \n '), '');
check('a non-string is not a name', normalizeDisplayName(undefined), '');
check('a long name is truncated, not refused', normalizeDisplayName('x'.repeat(200)).length, MAX_DISPLAY_NAME);
check('a real name is valid', isValidDisplayName(' Rowan '), true);
check('a blank name is not', isValidDisplayName('  '), false);

// The fallback chain: profile, then a membership's snapshot, then the identity.
// It is what grandfathers an account that predates the `profiles` table, and
// what leaves a genuinely nameless one detectable.
check('the profile wins', pickDisplayName('Justin', 'Old Name', 'Gravatar Name'), 'Justin');
check('a membership answers when the profile has not', pickDisplayName('', 'Old Name', 'Gravatar Name'), 'Old Name');
check('the identity is the last link', pickDisplayName('', '', 'Gravatar Name'), 'Gravatar Name');
check('a blank link is skipped, not returned', pickDisplayName('', '   ', 'Gravatar Name'), 'Gravatar Name');
// The case the first-run screen exists for, and the one `needsName` keys on.
check('nothing anywhere is empty, not a placeholder', pickDisplayName('', '', ''), '');
check('no candidates at all is empty', pickDisplayName(), '');
check('the chain normalizes what it picks', pickDisplayName('  Sedge   Miller  '), 'Sedge Miller');

// --- the size, and the pair that is never half-set ---
//
// Two rules and no invalid state between them, which is the whole reason this
// lives in `shared/` — the sheet enforces them at the field and the server
// enforces the same two on the way in, for a client that never came through it.

check('a unit with no number becomes one of it', normalizeSize('', 'quart'), { size: '1', unit: 'quart' });
check('a number with no unit is not a size', normalizeSize('12', ''), { size: '', unit: '' });
check('an unknown unit clears both halves', normalizeSize('12', 'furlong'), { size: '', unit: '' });
check('a whole pair survives', normalizeSize('12', 'ounce'), { size: '12', unit: 'ounce' });
// "0 quart" is the same statement as an empty field, and both mean one.
check('a zeroed number is not a size either', normalizeSize('0', 'pint'), { size: '1', unit: 'pint' });
check('junk in the number is stripped', normalizeSize('1.5kg', 'kilogram'), { size: '15', unit: 'kilogram' });
check('leading zeros go', normalizeSize('007', 'gram'), { size: '7', unit: 'gram' });
check('the number is capped, not refused', normalizeSize('123456', 'gram').size.length, MAX_SIZE_DIGITS);

check('an unset pair has no size', hasSize('', ''), false);
check('a number alone is not a size', hasSize('12', ''), false);
check('a whole pair has one', hasSize('12', 'ounce'), true);

// The abbreviation is what prints, and it never pluralises — nothing has to
// decide between "2 dz" and "2 dzs".
check('one prints its abbreviation', formatSize('1', 'quart'), '1 qt');
check('two print the same abbreviation', formatSize('2', 'dozen'), '2 dz');
check('an unset pair prints nothing', formatSize('', ''), '');
check('a number with no unit prints nothing', formatSize('12', ''), '');

// The one row where the word and the abbreviation disagree on purpose: `1 ½ pt`
// reads as one and a half pints, and `cup` is what the carton itself says.
check('half a pint prints as a cup', formatSize('1', 'half-pint'), '1 cup');

// The keys are slugs so that what a household stores survives us changing what
// it prints — the same reasoning D32 gives for term colours.
check('a unit key is a slug, not its abbreviation', unitFor('qt'), undefined);
check('the slug resolves', unitFor('quart')?.abbr, 'qt');
check('there are fourteen of them', UNITS.length, 14);
check('no two units share a key', new Set(UNITS.map((u) => u.key)).size, UNITS.length);
check('no two units share an abbreviation', new Set(UNITS.map((u) => u.abbr)).size, UNITS.length);
// Grouped in menu order, so the menu can draw a hairline on every change.
check('the groups run in one block each', UNITS.map((u) => u.group).join(' ').replace(/(\b\w+\b)( \1)+/g, '$1'), 'count weight volume');
// `1 each` is not a size, it is the absence of one — which `No size` says.
check('there is no "each"', UNITS.some((u) => u.key === 'each'), false);

// --- keeping an item off the shopping list ---
//
// It hides an item from one *view* and changes nothing about what is true of
// it. The split between these two functions is the whole idea, and it is
// invisible when wrong: the list quietly loses a row and the pills still count
// it, or the pills quietly lose one too.

const KEPT_OFF = item('Black Beans', '0', '2', ['s-costco'], true);

check('an excluded item never joins the list', needsBuying(KEPT_OFF), false);
check('but it is still out', statusKeyFor(KEPT_OFF.qty, KEPT_OFF.threshold), 'out');
check('an ordinary out item still joins', needsBuying(item('Bacon', '0', '2', ['s-costco'])), true);
check('the count drops with it', runCount([...BASKET, KEPT_OFF], STORES, JUNE), 5);
check('and so does its store card', runBands([...BASKET, KEPT_OFF], STORES, JUNE)[0].groups.map((g) => g.items.length), [2, 3, 1]);

// --- the threshold boundary, said out loud ---
//
// `low at 2` reads as "it is low when you are down to 2". Nothing in the app
// stated this until the sheet grew a line that reports it while you move the
// numbers.
check('equal is low, not stocked', statusKeyFor('2', '2'), 'low');
check('one above is stocked', statusKeyFor('3', '2'), 'ok');
check('zero is out, whatever the threshold', statusKeyFor('0', '0'), 'out');
check('the sheet says the pills\u2019 three words', [STATUS_PHRASE.out, STATUS_PHRASE.low, STATUS_PHRASE.ok], ['Out', 'Running low', 'In stock']);

// --- a member's avatar URL ---
//
// The value is written by a mutation and rendered into somebody else's
// `<img src>`, which is why it goes through a rule rather than straight into
// the column. The platform would never send anything but its own Gravatar URL;
// the column is permanent and the check is one line.
const GRAVATAR = 'https://gravatar.com/avatar/8013a62d?d=404&r=g&s=160';

check('the platform\u2019s own URL survives', normalizeAvatarUrl(GRAVATAR), GRAVATAR);
check('absent is no picture', normalizeAvatarUrl(undefined), '');
check('null is no picture', normalizeAvatarUrl(null), '');
check('whitespace alone is no picture', normalizeAvatarUrl('   '), '');
check('it is trimmed', normalizeAvatarUrl(`  ${GRAVATAR} `), GRAVATAR);
check('http is refused, not upgraded', normalizeAvatarUrl('http://gravatar.com/avatar/x'), '');
check('a script URL is refused', normalizeAvatarUrl('javascript:alert(1)'), '');
check('a data URL is refused', normalizeAvatarUrl('data:image/png;base64,AAAA'), '');
check('a protocol-relative URL is refused', normalizeAvatarUrl('//gravatar.com/avatar/x'), '');
check('an absurd length is refused', normalizeAvatarUrl(`https://x/${'a'.repeat(600)}`), '');

/*
 * The dev guest's stand-in avatar. `sf dev` issues no `picture`, so without it
 * every local membership row holds '' and only the surfaces drawn from the
 * client's own identity show a face — which reads as an intermittent bug.
 *
 * The assertions that matter are the two negative ones: this must never answer
 * for a name that is not a dev guest's, and what it returns must survive
 * `normalizeAvatarUrl`, since that is what actually writes the column.
 */
check('the dev guest gets a face', devAvatarUrl('justin-9bfb4160').startsWith('https://gravatar.com/avatar/'), true);
check('and it survives normalization', normalizeAvatarUrl(devAvatarUrl('justin-9bfb4160')), devAvatarUrl('justin-9bfb4160'));
check('it carries d=404, so the letter stays reachable', devAvatarUrl('justin-1').includes('d=404'), true);
check('another dev guest gets the letter', devAvatarUrl('alice-a9a293b4'), '');
check('an empty name gets nothing', devAvatarUrl(''), '');
check('a name that merely contains it is refused', devAvatarUrl('notjustin'), '');


// --- ?demo's fixture and its resolution (client/lib/devItems.ts) ---
//
// The fixture is only worth having if its *distribution* holds: the reason for
// sixty rows is to make the collection behaviour visible, and a fixture that
// drifts to all-stocked or drops a type silently stops doing that while still
// looking fine on screen. These are the claims its own header comment makes.
//
// The resolver is here rather than in `client/lib/` for the ordinary reason —
// it is pure, and `npm test` only compiles `shared/`.

const demoStatus = (i: { qty: string; threshold: string }) => {
	const q = toInt(i.qty);
	return q <= 0 ? 'out' : q <= toInt(i.threshold) ? 'low' : 'ok';
};
const demoCount = (k: string) => DEMO_ITEMS.filter((i) => demoStatus(i) === k).length;

check('the fixture is sixty rows', DEMO_ITEMS.length, 60);
check('no two rows share a name', new Set(DEMO_ITEMS.map((i) => i.name)).size, 60);
check('eight are out', demoCount('out'), 8);
check('thirteen are low', demoCount('low'), 13);
check('thirty-nine are stocked', demoCount('ok'), 39);

// Every seeded type must appear, or a chip in the Type filter is dead and the
// filter looks broken rather than empty.
check(
	'every seeded type is used',
	SEED_TYPES.every((t) => DEMO_ITEMS.some((i) => i.typeNames.includes(t.name))),
	true
);
check(
	'every row names a seeded location',
	DEMO_ITEMS.every((i) => SEED_LOCATIONS.some((l) => l.name === i.locationName)),
	true
);
check(
	'every store named is a seeded store',
	DEMO_ITEMS.every((i) => i.storeNames.every((s) => SEED_SHOPS.some((x) => x.name === s))),
	true
);

// D52: the size pair is never half-set. The fixture goes through `addItem`,
// which would normalize a half-set pair away — so a broken row here would
// vanish silently rather than fail.
check(
	'no row is half-sized',
	DEMO_ITEMS.every((i) => (i.size === undefined) === (i.unit === undefined)),
	true
);
check(
	'every unit named is a real unit key',
	DEMO_ITEMS.every((i) => i.unit === undefined || UNITS.some((u) => u.key === i.unit)),
	true
);

// D41's storeless group has never had anything in it locally, and D53's split
// is only legible if something is low *and* off the list.
check(
	'one storeless row is on the shopping list',
	DEMO_ITEMS.filter((i) => i.storeNames.length === 0 && ! i.offShoppingList).length,
	1
);
check(
	'two off-list rows are low, so the pills lead the list by two',
	DEMO_ITEMS.filter((i) => i.offShoppingList && demoStatus(i) !== 'ok').length,
	2
);

// D35/D44: sixty rows stamped in one second sort by nothing, so *Recently
// added* would render in id order and look like it was applying no sort — the
// exact bug D35 fixed. The ties that remain are deliberate: seven rows share a
// day with another, because a real pantry arrives in shopping trips.
const demoDays = DEMO_ITEMS.map((i) => i.daysAgo);
check('addedAt spans two months', Math.max(...demoDays) - Math.min(...demoDays), 59);
check('and is distinct enough to order by', new Set(demoDays).size, 53);

const demoTerm = (id: string, name: string): Term =>
	({ id, name, ink: 'color-1', createdAt: '', addedAt: '', changedAt: '' });

const DEMO_LOCS = SEED_LOCATIONS.map((l, n) => demoTerm(`loc${n}`, l.name));
const DEMO_TYPES = SEED_TYPES.map((t, n) => demoTerm(`type${n}`, t.name));
const DEMO_STORES = SEED_SHOPS.map((s, n) => demoTerm(`store${n}`, s.name));
const NOW = Date.parse('2026-08-28T12:00:00.000Z');

const full = resolveDemoItems(DEMO_LOCS, DEMO_TYPES, DEMO_STORES, NOW);

check('a full taxonomy resolves every row', full.drafts.length, 60);
check('and skips none', full.skipped.length, 0);
check('term names become ids', full.drafts[0].locationId.startsWith('loc'), true);
check(
	'both stamps match, since nothing has edited these',
	full.drafts.every((d) => d.addedAt === d.changedAt),
	true
);
check(
	'daysAgo becomes a date that far back',
	full.drafts.find((d) => d.name === 'Sourdough Loaf')?.addedAt,
	new Date(NOW - 86_400_000).toISOString()
);
check(
	'an absent size resolves to the empty pair, not undefined',
	full.drafts.find((d) => d.name === 'Lemons')?.size === '' &&
		full.drafts.find((d) => d.name === 'Lemons')?.unit === '',
	true
);

// Case-insensitive, because a household's terms are whatever somebody typed.
const lowered = resolveDemoItems(
	SEED_LOCATIONS.map((l, n) => demoTerm(`loc${n}`, l.name.toLowerCase())),
	DEMO_TYPES, DEMO_STORES, NOW
);
check('a renamed-case location still matches', lowered.drafts.length, 60);

// A missing *location* drops the row: `id()` is not a foreign key, so nothing
// downstream would catch a bogus reference.
const noFreezer = resolveDemoItems(
	DEMO_LOCS.filter((l) => l.name !== 'Freezer'), DEMO_TYPES, DEMO_STORES, NOW
);
check('a missing location drops its rows', noFreezer.drafts.length, 47);
check('and names them', noFreezer.skipped.length, 13);
check(
	'nothing resolves to a location that is gone',
	noFreezer.drafts.every((d) => d.locationId !== ''),
	true
);

// A missing *type* or *store* is only a missing tag, so the row survives it.
const noTypes = resolveDemoItems(DEMO_LOCS, [], DEMO_STORES, NOW);
check('a missing taxonomy keeps every row', noTypes.drafts.length, 60);
check('with no types on any of them', noTypes.drafts.every((d) => d.typeIds.length === 0), true);
check('and its stores intact', noTypes.drafts.some((d) => d.storeIds.length > 0), true);

// --- the admin console (shared/admin.ts) ---
//
// The authorization half is the app's second security test after
// `shared/identity.ts`, and it is fail-closed in every direction: an unset
// variable, an empty one and a list that does not name you all answer no.

check('an absent admin list parses to nothing', parseAdminIds(undefined), []);
check('and so does an empty one', parseAdminIds(''), []);
check('and so does one that is only separators', parseAdminIds(' , ,\n'), []);
check('commas separate', parseAdminIds('a,b,c'), ['a', 'b', 'c']);
check('so does whitespace', parseAdminIds('a b\tc'), ['a', 'b', 'c']);
check('so do both together, with padding', parseAdminIds(' a , b\n c '), ['a', 'b', 'c']);
// A trailing comma would otherwise put '' in the list, which an identity with
// no userId would match. That is the whole reason blanks are dropped.
check('a trailing comma leaves no blank id', parseAdminIds('a,b,'), ['a', 'b']);
check('the variable is named once', ADMIN_IDS_VAR, 'LARDER_ADMIN_IDS');

const account = (userId: string): IdentityLike => ({
	userId, displayName: 'Someone', provider: 'gravatar', isGuest: false, isAuthenticated: true,
});
// The identity a published space hands a stranger. Every assertion naming it
// below is a production caller, not a local one.
const anonAdminGuest: IdentityLike = {
	userId: 'guest:local', displayName: 'Local', provider: 'guest',
	isGuest: true, isAuthenticated: false,
};
const namedAdminGuest: IdentityLike = {
	userId: 'guest:justin-7f3a91c2', displayName: 'Justin 7f3a91c2', provider: 'guest',
	isGuest: true, isAuthenticated: false,
};

check('nobody is an administrator on a space with nothing set', isAdminUser(account('a'), undefined, undefined), false);
check('nor on one with an empty list', isAdminUser(account('a'), '', ''), false);
check('an id in the list is', isAdminUser(account('a'), 'a,b', undefined), true);
check('an id that is not is not', isAdminUser(account('c'), 'a,b', undefined), false);
check('the match is exact, not a prefix', isAdminUser(account('a'), 'abc', undefined), false);
check('and not a suffix either', isAdminUser(account('bc'), 'abc', undefined), false);

// **The regression test for the v15 leak.** `isAdminUser` used to open with a
// dev-guest bypass, and the hosted runtime hands an *unauthenticated* caller
// that exact identity — so on the live space `adminAccess` answered
// `{admin: true}` to anybody with a curl. These are what stop it coming back,
// and the third is the important one: naming `guest:local` in **both** lists,
// which is the worst thing somebody could write in `.env.server`, still fails.
check('the anonymous guest does not administer', isAdminUser(anonAdminGuest, undefined, undefined), false);
check('nor when the admin list names it', isAdminUser(anonAdminGuest, 'guest:local', undefined), false);
check('nor when both lists name it', isAdminUser(anonAdminGuest, 'guest:local', 'local'), false);

// Administration is signing in plus being named, so a dev guest needs both.
check('a named dev guest in both lists administers', isAdminUser(namedAdminGuest, 'guest:justin-7f3a91c2', 'justin-7f3a91c2'), true);
check('but not on the admin list alone', isAdminUser(namedAdminGuest, 'guest:justin-7f3a91c2', undefined), false);
check('and not on the dev list alone', isAdminUser(namedAdminGuest, undefined, 'justin-7f3a91c2'), false);

check('an identity with no id never matches', isAdminUser(account(''), '', undefined), false);
check('and cannot be let in by a blank list entry', isAdminUser(account(''), 'a,,b', undefined), false);

// --- the arithmetic ---

const NOW_A = '2026-08-29T12:00:00.000Z';

check('a blank stamp has no age', daysBetween('', NOW_A), null);
check('and neither has a bogus one', daysBetween('not a date', NOW_A), null);
check('today is zero days ago', daysBetween('2026-08-29T01:00:00.000Z', NOW_A), 0);
check('yesterday is one', daysBetween('2026-08-28T01:00:00.000Z', NOW_A), 1);

check('a stamp inside the window counts', isWithinDays('2026-08-20T00:00:00.000Z', NOW_A, 30), true);
check('one outside it does not', isWithinDays('2026-06-20T00:00:00.000Z', NOW_A, 30), false);
check('a blank stamp is never inside it', isWithinDays('', NOW_A, 30), false);
// A future stamp is not "new" — it is broken data, and counting it would let
// one bad row inflate every delta on Overview for as long as it exists.
check('and neither is a future one', isWithinDays('2027-01-01T00:00:00.000Z', NOW_A, 30), false);

check('90 days idle is dormant', isDormant('2026-05-01T00:00:00.000Z', NOW_A), true);
check('89 is not', isDormant(daysAgoIso(NOW_A, DORMANT_DAYS - 1), NOW_A), false);
check('exactly 90 is', isDormant(daysAgoIso(NOW_A, DORMANT_DAYS), NOW_A), true);
// The load-bearing one. Every stamp column defaults to '' and nothing
// backfills (D44), so treating "no date" as "very old" would flag the app's
// oldest households — the ones most likely to be real — as abandoned.
check('an unknown last-active is not dormant', isDormant('', NOW_A), false);

// D62's dates are US style — month, day, comma, year — and the console had four
// copies of the day-first form before they were consolidated here. These are
// what stops a fifth copy drifting back: the comma is not optional in this
// order, and the month name comes first.
check('a short date is month first', usDate('2026-03-04T00:00:00.000Z'), 'Mar 4, 2026');
check('the long form spells the month', usLongDate('2026-03-04T00:00:00.000Z'), 'March 4, 2026');
check('a two-digit day keeps the comma', usDate('2026-12-25T00:00:00.000Z'), 'Dec 25, 2026');
// UTC, not the reader's zone. A stamp late on the 4th in London is still the
// 4th here, and the audit log — which prints `UTC` beside the time — would
// otherwise contradict the page it was opened from.
check('a late stamp does not roll over', usDate('2026-03-04T23:59:59.000Z'), 'Mar 4, 2026');
check('an unreadable stamp is the fallback', usDate('not a date'), 'unknown');
check('and the fallback is the caller\u2019s', usLongDate('', 'at some point'), 'at some point');
check('the number form agrees with the string form', usDateFrom(Date.parse('2026-03-04T00:00:00.000Z')), 'Mar 4, 2026');
check('and NaN falls back too', usDateFrom(Number.NaN), 'unknown');

// The hold (2026-08-30). Asserted rather than assumed because the flag is the
// only thing standing between a first look at the console and a deleted
// household, and because flipping it back is meant to be one line: if that line
// moves, this is what says so.
check('the console\u2019s writes are held', ADMIN_WRITES_HELD, true);
// The hold is a **production** hold: a real account is refused, and a dev guest
// is exempt so the deletion flows can be exercised at all. `guest:` ids only
// exist under `sf dev`, so "exempt" and "local" are the same set.
check('a real account is held', adminWritesHeldFor(account('a')), true);
check('a dev guest is not', adminWritesHeldFor(namedAdminGuest), false);
check('the held note says nothing can change', ADMIN_HELD_NOTE.includes('Nothing here can be changed'), true);
check('and the refusal says nothing did', ADMIN_HELD_REFUSAL.includes('Nothing was changed'), true);
// The refusal must not be the permission message — an administrator reading
// that one would go looking at `LARDER_ADMIN_IDS` for a problem that is not
// there. `tsc` proves it outright: the two are literal types with no overlap,
// so a comparison here is a compile error rather than an assertion.

check('a month key is the first seven characters', monthKey('2026-08-29T12:00:00.000Z'), '2026-08');
check('a label is the short month', monthLabel('2026-08'), 'Aug');
check('and takes a year when asked', monthLabel('2026-08', true), 'Aug 2026');

const months = monthKeysBack(NOW_A);
check('the series is twelve months long', months.length, SERIES_MONTHS);
check('and ends on the current one', months[11], '2026-08');
// Stepping a Date backwards by a month lands on the 31st of a 30-day month and
// skips one. Walking a month *number* cannot, which is why it is written that
// way — and this is the assertion that would catch it coming back.
check('and starts eleven back, across the year boundary', months[0], '2025-09');
check('a January now walks back into the previous year', monthKeysBack('2026-01-15T00:00:00.000Z', 3), ['2025-11', '2025-12', '2026-01']);
check('a 31st does not skip February', monthKeysBack('2026-03-31T00:00:00.000Z', 2), ['2026-02', '2026-03']);
check('an unparseable now gives no series at all', monthKeysBack('nonsense'), []);

// Cumulative, not per-month: a household that existed in March still exists in
// April, and a line labelled *Households* that dips would be a different chart.
const stamps = ['2026-06-02T00:00:00.000Z', '2026-07-11T00:00:00.000Z', '2026-07-30T00:00:00.000Z'];
check(
	'the series is a running total',
	cumulativeByMonth(stamps, ['2026-05', '2026-06', '2026-07', '2026-08']),
	[0, 1, 3, 3]
);
// Anything older than the window still counts toward the first bucket — the app
// did not begin twelve months ago, and a series starting at zero would say so.
check(
	'a stamp older than the window counts from the start',
	cumulativeByMonth(['2024-01-01T00:00:00.000Z'], ['2026-07', '2026-08']),
	[1, 1]
);
check(
	'a blank stamp counts nowhere',
	cumulativeByMonth(['', 'nonsense'], ['2026-07', '2026-08']),
	[0, 0]
);

/** N whole days before an ISO stamp, for the dormancy boundaries above. */
function daysAgoIso(nowIso: string, days: number): string {
	return new Date(Date.parse(nowIso) - days * 24 * 60 * 60 * 1000).toISOString();
}

// --- the audit log (shared/activity.ts) ---
//
// The encoding is the part that is invisible when wrong: a row is written once
// and read forever, so the decoder has to survive '', a value written by a
// later version, and a genuinely corrupt string — and never throw on a screen
// whose whole job is being readable during an incident.

check('a known action is recognized', isAction('household.delete'), true);
check('an unknown one is not', isAction('household.explode'), false);
check('the vocabulary is closed', ACTIONS.length, 7);

check('an unknown actor kind falls back to a person', toActorKind('wat'), 'person');
check('and so does an empty one', toActorKind(''), 'person');
check('a known one survives', toActorKind('automatic'), 'automatic');

check('counts round-trip', decodeHeld(encodeHeld({ items: 41, members: 2 })), { items: 41, members: 2 });
check('nothing encodes to nothing', encodeHeld({}), '');
check('and an empty string decodes to nothing', decodeHeld(''), {});
// Every non-deletion row holds '', so this is the common path, not the edge.
check('a corrupt string decodes to nothing', decodeHeld('{items:'), {});
check('a JSON array decodes to nothing', decodeHeld('[1,2]'), {});
check('a JSON scalar decodes to nothing', decodeHeld('7'), {});
check('null decodes to nothing', decodeHeld('null'), {});
// A row written by a later version that learned a sixth count.
check('an unknown key is dropped, the rest survive', decodeHeld('{"items":3,"jars":9}'), { items: 3 });
check('a non-numeric count is dropped', decodeHeld('{"items":"three","types":2}'), { types: 2 });
check('a negative count is dropped', decodeHeld('{"items":-1,"types":2}'), { types: 2 });
check('NaN never survives encoding', encodeHeld({ items: NaN }), '');
check('Infinity never survives encoding', encodeHeld({ items: Infinity }), '');
check('a fractional count is floored', decodeHeld(encodeHeld({ items: 4.9 })), { items: 4 });
check('zero is a real count and is kept', decodeHeld(encodeHeld({ items: 0 })), { items: 0 });

check('the phrase reads in order', heldPhrase({ types: 6, items: 41 }), '41 items · 6 types');
check('and singularises', heldPhrase({ items: 1, members: 1 }), '1 item · 1 member');
check('nothing held says nothing', heldPhrase({}), '');

// The sentence is assembled, never stored — which is the whole reason the slug
// is what goes in the column.
check(
	'a deletion names the household',
	actionPhrase('household.delete', 'Riverside Kitchen', '', ''),
	'deleted the household Riverside Kitchen'
);
check(
	'a role change names both ends',
	actionPhrase('member.role', 'Nora Vance', 'editor', 'viewer'),
	'changed Nora Vance from editor to viewer'
);
check(
	'a role change with no ends still reads',
	actionPhrase('member.role', 'Nora Vance', '', ''),
	'changed Nora Vance’s role'
);
check(
	'a transfer names who got it',
	actionPhrase('household.transfer', 'The Lake Cabin', 'Sarah', 'Justin'),
	'handed The Lake Cabin over to Justin'
);
// A row whose target was never named — the account with no name anywhere.
check(
	'a nameless target does not print an id',
	actionPhrase('household.delete', '', '', ''),
	'deleted the household something that is gone'
);
// A row written by a version that knew more actions than this one. It is still
// a time and a person, which is most of what a log entry is for.
check(
	'an unrecognized action still reads as something',
	actionPhrase('household.teleport', 'X', '', ''),
	'did something this version does not recognize (household.teleport)'
);
check('and has a title', actionTitle('household.teleport'), 'Unrecognized action');
check('a known action has its own', actionTitle('account.delete'), 'Account deleted');

check('a household deletion is destructive', isDestructive('household.delete'), true);
check('an account deletion is too', isDestructive('account.delete'), true);
check('a role change is not', isDestructive('member.role'), false);

// --- retention (shared/activity.ts) ---
//
// Every branch falls back to the default rather than refusing: a log that stops
// working over a typo in an environment variable is worse than one that keeps
// its rows a little longer than intended.

check('an absent retention is the default', toRetentionMonths(undefined), RETENTION_DEFAULT_MONTHS);
check('and so is an empty one', toRetentionMonths('   '), RETENTION_DEFAULT_MONTHS);
check('and so is a word', toRetentionMonths('forever'), RETENTION_DEFAULT_MONTHS);
check('a number is read', toRetentionMonths('6'), 6);
check('with padding', toRetentionMonths(' 6 '), 6);
check('a fraction is floored', toRetentionMonths('6.9'), 6);
// Zero is a real answer and means keep nothing. A negative is not, and must not
// read as "keep forever" through the arithmetic below.
check('zero is a real answer', toRetentionMonths('0'), 0);
check('a negative falls back', toRetentionMonths('-1'), RETENTION_DEFAULT_MONTHS);
check('and so does an absurd one', toRetentionMonths(String(RETENTION_MAX_MONTHS + 1)), RETENTION_DEFAULT_MONTHS);
check('the ceiling itself is allowed', toRetentionMonths(String(RETENTION_MAX_MONTHS)), RETENTION_MAX_MONTHS);

// The cutoff walks a month number, not a Date, for the reason `monthKeysBack`
// does — and clamps the day, which is the case that would silently delete three
// extra days of records every 31st.
check(
	'a month back is a month back',
	retentionCutoff('2026-08-29T12:00:00.000Z', 1).slice(0, 10),
	'2026-07-29'
);
check(
	'the 31st clamps rather than overshooting',
	retentionCutoff('2026-08-31T12:00:00.000Z', 1).slice(0, 10),
	'2026-07-31'
);
check(
	'and clamps into February',
	retentionCutoff('2026-03-31T12:00:00.000Z', 1).slice(0, 10),
	'2026-02-28'
);
check(
	'a year and a half crosses the boundary',
	retentionCutoff('2026-08-29T12:00:00.000Z', 18).slice(0, 10),
	'2025-02-28'
);
// Zero months means the cutoff is now, so everything already written expires.
check('zero months cuts off at now', retentionCutoff('2026-08-29T12:00:00.000Z', 0).slice(0, 10), '2026-08-29');
check('an unparseable now yields no cutoff', retentionCutoff('nonsense', 12), '');

// --- the relevance ladder (shared/admin.ts) ---
//
// It only exists while there is a query, and the ladder is what stops a row
// that matched on its id from outranking one whose name starts with the term.

check('no query scores nothing', matchScore('', 'Riverside Kitchen', [], 'hh_1'), 0);
check('and neither does whitespace', matchScore('   ', 'Riverside Kitchen', [], 'hh_1'), 0);
check('an exact name wins outright', matchScore('riverside kitchen', 'Riverside Kitchen', [], 'x'), 100);
check('a prefix beats a substring', matchScore('river', 'Riverside Kitchen', [], 'x') > matchScore('side', 'Riverside Kitchen', [], 'x'), true);
check('a name beats a member name', matchScore('nora', 'Nora’s Place', [], 'x') > matchScore('nora', 'Somewhere', ['Nora Vance'], 'x'), true);
check('a member name beats an id', matchScore('nora', 'Somewhere', ['Nora Vance'], 'x') > matchScore('ab', 'Somewhere', [], 'hh_ab12'), true);
check('an id match still counts', matchScore('ab12', 'Somewhere', [], 'hh_ab12'), 10);
check('nothing anywhere scores zero', matchScore('zzz', 'Somewhere', ['Nora'], 'hh_1'), 0);
check('matching is case-insensitive', matchScore('RIVER', 'Riverside Kitchen', [], 'x'), 80);
check('the best of several secondaries wins', matchScore('nora', 'X', ['A Nora B', 'Nora Vance'], 'y'), 40);

// --- the suggestion menus (shared/suggest.ts) ---
//
// The matching rule is never written on screen — the matched characters going
// to 700 is the whole explanation of it — so it is exactly the kind of thing
// that stays wrong for months without anybody being able to say why the list
// looks odd. A substring where a word prefix belongs still compiles, still
// runs, and still returns a plausible list.

check('a prefix of the first word matches at 0', matchAt('Beets', 'be'), 0);
check('a prefix of a later word matches inside', matchAt('Ground Beef', 'be'), 7);
check('a substring inside a word does not match', matchAt('Ground Beef', 'eef'), -1);
check('matching is case-insensitive', matchAt('GROUND BEEF', 'be'), 7);
check('and the index is into the original text', 'Ground Beef'.slice(7, 9), 'Be');
check('a hyphen starts a word', matchAt('All-Purpose Flour', 'pur'), 4);
check('an ampersand starts a word', matchAt('Oils & Vinegars', 'vin'), 7);
check('a digit is matchable', matchAt('12 oz', '12'), 0);
check('an empty query has nowhere to highlight', matchAt('Beets', ''), -1);
check('and neither does whitespace', matchAt('Beets', '   '), -1);
check('a non-string has no match', matchAt(undefined, 'be'), -1);

// The grid asks the other question, and with nothing typed every row survives.
// Answering -1 to both is what emptied the whole grid the first time.
check('an empty query matches everything', matchesQuery('Beets', ''), true);
check('a whitespace query matches everything', matchesQuery('Beets', '  '), true);
check('a real query still discriminates', matchesQuery('Beets', 'ee'), false);

// A size is searchable by what the card prints *and* by the unit's own word,
// because D52 stores neither — it stores a slug.
check('a size is searchable as printed', sizeSearchText('12', 'ounce'), '12 oz Ounce');
check('typing the unit word finds it', matchesQuery(sizeSearchText('1', 'pint'), 'pint'), true);
check('typing the abbreviation finds it too', matchesQuery(sizeSearchText('12', 'ounce'), 'oz'), true);
check('an unset size is not searchable', sizeSearchText('', ''), '');

function sized(name: string, size: string, unit: string, storeIds: string[] = []): Item {
	return { ...item(name, '3', '2', storeIds), size, unit };
}

const SHELF: Item[] = [
	sized('Coffee', '12', 'ounce', ['s-costco']),
	sized('Frozen Corn', '12', 'ounce', ['s-aldi']),
	sized('Heavy Cream', '1', 'pint', ['s-costco']),
	item('Beets', '2', '4', []),
];

// --- the name field: two groups, names only ---

check('two characters is the minimum', SUGGEST_MIN, 2);
check(
	'nothing opens below it',
	nameSuggestions('c', SHELF).pantry.length + nameSuggestions('c', SHELF).catalog.length,
	0
);
check(
	'a pantry match is offered',
	nameSuggestions('co', SHELF).pantry.map((h) => h.item.name),
	['Coffee', 'Frozen Corn']
);
check('a first-word match leads', nameSuggestions('co', SHELF).pantry[0]?.at, 0);
check('and the later match keeps its own offset', nameSuggestions('co', SHELF).pantry[1]?.at, 7);
check(
	'the item being edited stays out of its own menu',
	nameSuggestions('co', SHELF, 'i-Coffee').pantry.map((h) => h.item.name),
	['Frozen Corn']
);
// The design's own trio for `be` was Beets · Bell Peppers · Berries, and the
// grown catalog answers Beef Broth · Beef Roast · Beets instead — the cap
// binds harder the longer the list gets, which is the cost of growing it and is
// why the ranking has to be by match position and then A–Z rather than by
// file order.
check(
	'the catalog answers with the words nothing holds',
	nameSuggestions('be', []).catalog.map((h) => h.entry.name),
	['Beef Broth', 'Beef Roast', 'Beets']
);
check('the catalog is capped at three', nameSuggestions('be', []).catalog.length, 3);
check(
	'a catalog word already in the pantry is dropped',
	nameSuggestions('be', SHELF).catalog.some((h) => h.entry.name === 'Beets'),
	false
);
check(
	'and the pantry row is what answers instead',
	nameSuggestions('be', SHELF).pantry.map((h) => h.item.name),
	['Beets']
);
check('a size never opens the name field’s menu', nameSuggestions('pint', SHELF).pantry.length, 0);
check('the catalog carries no duplicate names', new Set(GROCERY_CATALOG.map((c) => c.name)).size, GROCERY_CATALOG.length);

// A catalog row is only useful if the type and shelf it names are ones a
// seeded household actually has — `fillFromCatalog` matches by name and fills
// nothing when it misses, so a typo here is invisible rather than loud.
check(
	'every catalog type names a seeded type',
	GROCERY_CATALOG.filter((c) => c.type && ! SEED_TYPES.some((t) => t.name === c.type)).map((c) => c.name),
	[]
);
check(
	'every catalog shelf names a seeded location',
	GROCERY_CATALOG.filter((c) => c.place && ! SEED_LOCATIONS.some((l) => l.name === c.place)).map((c) => c.name),
	[]
);
// --- the beans, which are the one place the catalog carries a pair ---
//
// A bean is sold two ways and is therefore two rows: the bare name is the can,
// `<Bean>, Dry` is the bag. Half a pair is invisible when wrong — the menu
// still opens and still answers, it just never offers the form you buy.

const BEANS = [
	'Black Beans', 'Black-Eyed Peas', 'Butter Beans', 'Cannellini Beans', 'Chickpeas',
	'Fava Beans', 'Garbanzo Beans', 'Great Northern Beans', 'Kidney Beans', 'Lima Beans',
	'Navy Beans', 'Pinto Beans', 'Red Beans',
];
const catalogNames = new Set(GROCERY_CATALOG.map((c) => c.name));

check(
	'every common bean is in the catalog prepared',
	BEANS.filter((b) => ! catalogNames.has(b)),
	[]
);
check(
	'and every one of them has a dry twin',
	BEANS.filter((b) => ! catalogNames.has(`${b}, Dry`)),
	[]
);
check(
	'a dry row is the bulk shelf, never the can',
	GROCERY_CATALOG.filter((c) => c.name.endsWith(', Dry') && (c.type !== 'Dry Goods' || c.place !== 'Pantry')),
	[]
);
check(
	'and nothing is a dry twin without a prepared row to be a twin of',
	GROCERY_CATALOG.filter((c) => c.name.endsWith(', Dry') && ! catalogNames.has(c.name.slice(0, -', Dry'.length))).map((c) => c.name),
	[]
);

// The comma is a word separator, which is what makes the suffix work at all:
// typing `dry` lists the bulk shelf and typing the bean finds both forms.
check('typing the bean finds both forms', nameSuggestions('kidney', []).catalog.map((h) => h.entry.name), ['Kidney Beans', 'Kidney Beans, Dry']);
check('and `dry` reaches the suffix', matchAt('Kidney Beans, Dry', 'dry'), 14);

check('the catalog is A–Z, so a duplicate is obvious while editing it',
	GROCERY_CATALOG.map((c) => c.name).join('|'),
	[...GROCERY_CATALOG.map((c) => c.name)].sort((a, b) => a.localeCompare(b)).join('|'));

// --- what a catalog row fills, and what it refuses to ---

const CAT_TYPES = [term('t-dairy', 'Dairy', 'color-1'), term('t-produce', 'Produce', 'color-10')];
const CAT_PLACES = [term('l-fridge', 'Refrigerator', 'color-1'), term('l-pantry', 'Pantry', 'color-10')];
const HALF = GROCERY_CATALOG.find((c) => c.name === 'Half and Half')!;

check('Half and Half knows it is Dairy', HALF.type, 'Dairy');
check('and that it lives in the refrigerator', HALF.place, 'Refrigerator');
check('a catalog pick fills the type', fillFromCatalog(HALF, CAT_TYPES, CAT_PLACES).typeIds, ['t-dairy']);
check('and the shelf', fillFromCatalog(HALF, CAT_TYPES, CAT_PLACES).locationId, 'l-fridge');
check('and never a source', Object.keys(fillFromCatalog(HALF, CAT_TYPES, CAT_PLACES)).includes('storeIds'), false);
check('nor a count', Object.keys(fillFromCatalog(HALF, CAT_TYPES, CAT_PLACES)).includes('qty'), false);
check('matching a term is case-insensitive', fillFromCatalog(HALF, [term('t-d', 'dairy', 'color-1')], []).typeIds, ['t-d']);
check(
	'a renamed term fills nothing rather than the wrong thing',
	fillFromCatalog(HALF, [term('t-d', 'Dairy & Eggs', 'color-1')], CAT_PLACES).typeIds,
	undefined
);
check(
	'and a household missing the term still gets the name',
	fillFromCatalog(HALF, [], []),
	{ name: 'Half and Half' }
);
check(
	'an entry with no type of its own fills none',
	fillFromCatalog({ name: 'Ice', type: '', place: 'Freezer' }, CAT_TYPES, CAT_PLACES).typeIds,
	undefined
);

// --- picking: the name, the size and the chips, never a count ---

const SOURCE_ROW: Item = { ...sized('Coffee', '12', 'ounce', ['s-costco']), typeIds: ['t-1'], qty: '9', threshold: '5' };
const PICKED = fillFromItem(SOURCE_ROW);

check('a pick carries the name', PICKED.name, 'Coffee');
check('and the size pair whole', [PICKED.size, PICKED.unit], ['12', 'ounce']);
check('and the location', PICKED.locationId, 'l-1');
check('and the stores', PICKED.storeIds, ['s-costco']);
check('and the types', PICKED.typeIds, ['t-1']);
check('it carries no count at all', Object.keys(PICKED).includes('qty'), false);
check('and no threshold — the household default is what a new item starts from', Object.keys(PICKED).includes('threshold'), false);
check('nor the retired off-list flag (D60)', Object.keys(PICKED).includes('offShoppingList'), false);
check('the arrays are copies, never the item’s own', PICKED.storeIds !== SOURCE_ROW.storeIds, true);

// --- search: items, sizes and terms ---

const TERM_GROUPS = [
	{ kind: 'location' as const, terms: [term('l-1', 'Pantry', 'color-1'), term('l-2', 'Chest Freezer', 'color-2')] },
	{ kind: 'store' as const, terms: STORES },
	{ kind: 'type' as const, terms: [term('t-1', 'Condiments', 'color-3')] },
];

check('search opens at the same two characters', searchSuggestions('c', SHELF, TERM_GROUPS).items.length, 0);
check(
	'search finds the items called co-something',
	searchSuggestions('co', SHELF, TERM_GROUPS).items.map((h) => h.item.name),
	['Coffee', 'Frozen Corn']
);
check(
	'and offers Costco as a term rather than folding its six items in',
	searchSuggestions('co', SHELF, TERM_GROUPS).terms.map((h) => h.term.name),
	['Condiments', 'Costco']
);
check(
	'a term row carries how many items name it',
	searchSuggestions('costco', SHELF, TERM_GROUPS).terms[0]?.count,
	2
);
check(
	'a size-only match still reaches the list',
	searchSuggestions('pint', SHELF, TERM_GROUPS).items.map((h) => h.item.name),
	['Heavy Cream']
);
check('with nothing bolded in the name', searchSuggestions('pint', SHELF, TERM_GROUPS).items[0]?.at, -1);
check(
	'and nothing in the size either — the word that matched is not on the row',
	searchSuggestions('pint', SHELF, TERM_GROUPS).items[0]?.sizeAt,
	-1
);
check('but an abbreviation the row prints does highlight', searchSuggestions('oz', SHELF, TERM_GROUPS).items[0]?.sizeAt, 3);
check(
	'a name match sorts above a size-only one',
	searchSuggestions('pint', [sized('Pint Glass Cleaner', '1', 'ounce'), sized('Heavy Cream', '1', 'pint')], []).items.map((h) => h.item.name),
	['Pint Glass Cleaner', 'Heavy Cream']
);
check(
	'a term already applied is not offered again',
	searchSuggestions('co', SHELF, TERM_GROUPS, ['store:s-costco']).terms.map((h) => h.term.name),
	['Condiments']
);
check(
	'and the kind is part of that key, since ids repeat across tables',
	searchSuggestions('co', SHELF, TERM_GROUPS, ['location:s-costco']).terms.map((h) => h.term.name),
	['Condiments', 'Costco']
);
check(
	'notes are never searched',
	searchSuggestions('co', [{ ...item('Milk', '1', '2', []), notes: 'costco run' }], []).items.length,
	0
);

// Announced only when the number moves, and never for an absence: nothing
// opens when nothing matches, so there is no count to report.
check('one suggestion is singular', suggestionAnnouncement(1), '1 suggestion.');
check('more than one is plural', suggestionAnnouncement(6), '6 suggestions.');
check('nothing is announced for nothing', suggestionAnnouncement(0), '');


console.log(fail === 0 ? `all ${total} assertions passed` : `${fail} of ${total} FAILED`);
if (fail > 0) throw new Error(`${fail} assertion(s) failed`);
