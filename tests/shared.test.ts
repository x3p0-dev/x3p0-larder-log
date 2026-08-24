/**
 * Unit tests for `shared/`.
 *
 * `shared/` imports nothing, so it can be compiled and run directly — no test
 * runner, no dependencies. Run with `npm test`.
 *
 * What earns a test here is logic that is either invisible when wrong or
 * expensive when wrong: the authorization matrix, the one-household rule, the
 * last-owner guard, and invite expiry. Zero has no row-level security and its
 * `id()` columns are not foreign keys, so these functions are the only thing
 * enforcing several of the app's rules.
 */

import { can, invitableRoles, canInviteRole, toRole, isRole, ROLES, DEFAULT_ROLE } from '../shared/roles';
import { normalizeIcon, isIconKey, iconKeysFor } from '../shared/icons';
import { resolveMembership, wouldStrandHousehold } from '../shared/membership';
import {
	expiryFrom, isExpired, daysUntilExpiry, codeFromBytes, isCodeShaped,
	normalizeCode, NEVER_EXPIRES, CODE_BYTES,
} from '../shared/invite';
import {
	normalizeName, normalizeNotes, termKey, normalizeInk, DEFAULT_INK,
	isValidName, MAX_NAME,
} from '../shared/term';
import { isSignedIn, isDevGuest, type IdentityLike } from '../shared/identity';

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

// --- D23: icons ---
check('valid location icon kept', normalizeIcon('location', 'snowflake'), 'snowflake');
check('junk location icon -> default', normalizeIcon('location', 'not-real'), 'box');
check('type icon from wrong set rejected', normalizeIcon('type', 'snowflake'), 'utensils');
check('store has no icon', normalizeIcon('store', 'snowflake'), '');
check('store icon set is null', iconKeysFor('store'), null);
check('isIconKey cross-set', isIconKey('location', 'beef'), false);




// --- D18: membership resolution never silently picks ---
const m = (id: string, role: string) => ({ id, householdId: 'h1', userId: 'u' + id, role });

check('no rows', resolveMembership([]).kind, 'none');
check('one row', resolveMembership([m('a', 'owner')]).kind, 'one');
check('two rows is a bug, not a pick', resolveMembership([m('a','owner'), m('b','editor')]).kind, 'many');

const one = resolveMembership([m('a', 'owner')]);
check('role parsed', one.kind === 'one' && one.membership.role, 'owner');
const junk = resolveMembership([m('a', 'superuser')]);
check('junk role degrades to viewer', junk.kind === 'one' && junk.membership.role, 'viewer');

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
check('ink normalizes to lowercase', normalizeInk('#AABBCC'), '#aabbcc');
check('bad ink falls back', normalizeInk('red'), DEFAULT_INK);
check('shorthand hex rejected', normalizeInk('#abc'), DEFAULT_INK);
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

console.log(fail === 0 ? `all ${total} assertions passed` : `${fail} of ${total} FAILED`);
if (fail > 0) throw new Error(`${fail} assertion(s) failed`);
