/**
 * Who administers the whole space, and the arithmetic the console reports.
 *
 * Two unrelated jobs in one file for one reason: both are invisible when wrong.
 * A broken admin check hands a stranger every household's name; a broken month
 * key draws a chart that is confidently off by one and looks fine.
 *
 * It lives in `shared/` because the server decides both and the client renders
 * both, and because `shared/` imports nothing — so `npm test` can assert the
 * authorization rule without a running capsule, exactly as it does for
 * `shared/identity.ts`.
 *
 * **There is no admin *role*.** Roles are per household (D33) and say what you
 * may do inside one; this says whether you may look at all of them, which is
 * not a stronger version of the same thing. Nothing in the UI grants it and
 * nothing ever should — the console can delete a household, and a console that
 * can also mint more administrators is one compromised account away from being
 * the only account.
 */

import { isSignedIn, type IdentityLike } from './identity';

/**
 * The environment variable that names the administrators.
 *
 * Read through `ctx.env`, which reaches query handlers as well as mutations and
 * endpoints — confirmed against a running capsule on 2026-08-29. `.env.server`
 * syncs to the platform as secret variables on publish, so the list is set the
 * same way `INVITE_SECRET` is and is never in the repository.
 */
export const ADMIN_IDS_VAR = 'LARDER_ADMIN_IDS';

/**
 * Whether the console's six writes are live. **They are not, deliberately.**
 *
 * Set to `false` on 2026-08-30, before the console had ever been published, so
 * the first people to open it can read every screen without a mis-press
 * deleting somebody's pantry. It covers **all six** — the two deletions, the
 * role change, the member removal, the invite revocation and the ownership
 * transfer — rather than the three that were asked for, because they are one
 * class of thing and a switch with exceptions is a switch nobody can reason
 * about at a glance.
 *
 * **Restoring it is this one line**, plus deleting the held notes the screens
 * draw beneath the controls. Nothing else was removed: every handler, dialog,
 * confirm and audit-log path is intact and still compiled, so what is being
 * tested is the real console with its writes bolted shut rather than a
 * different, smaller one.
 *
 * It lives in `shared/` for the reason `termBlock` does — the server refuses
 * and the client explains, and those two must never be able to disagree about
 * whether a thing is allowed.
 */
export const ADMIN_WRITES_HELD = true;

/**
 * Whether the hold applies to **this** caller.
 *
 * **The hold is a production hold.** Its purpose is that nothing destructive
 * happens on the live site before the console has been used in anger — and it
 * had the side effect of making the deletion flows untestable anywhere, which
 * defeats the point of being able to test locally at all.
 *
 * A dev guest is exempt, and that is exact rather than approximate: a
 * `guest:` id can only be minted by `sf dev` (see `ANON_GUEST_NAME`), so
 * "exempt from the hold" and "running locally" are the same set. `guest:local`
 * cannot reach here — `isAdminUser` refuses it before this is asked.
 *
 * So: **delete a household locally to see what happens; you cannot do it on the
 * live site.** Lifting the hold for production is `ADMIN_WRITES_HELD`.
 */
export function adminWritesHeldFor(auth: IdentityLike): boolean {
	return ADMIN_WRITES_HELD && ! auth.isGuest;
}

/**
 * What a screen says beneath a control that is present and cannot be pressed.
 *
 * D36's rule is that a disabled control cannot explain itself, and this is the
 * pre-flight's exception rather than a departure: the reason is not off-screen,
 * it is the sentence directly under the button. Every held control has one.
 */
export const ADMIN_HELD_NOTE =
	'On hold while the console is being tried out. Nothing here can be changed yet.';

/**
 * What the server says when a held write is called anyway.
 *
 * The client hides the path, so reaching this means a stale tab, a keyboard
 * route nobody predicted, or somebody at a console — and all three deserve the
 * true answer rather than the permission error, which would send an
 * administrator looking at `LARDER_ADMIN_IDS` for a problem that is not there.
 */
export const ADMIN_HELD_REFUSAL =
	'The console’s write actions are on hold right now. Nothing was changed.';


/**
 * The ids in the variable, in the order they were written.
 *
 * Commas, whitespace and newlines all separate, so a value pasted across two
 * lines behaves the way it looks. Blanks are dropped rather than kept as an
 * empty id, which matters more than it sounds: a trailing comma would otherwise
 * put `''` in the list, and an identity with no `userId` would match it.
 */
export function parseAdminIds(raw: string | undefined | null): string[] {
	if (! raw) return [];

	return raw.split(/[\s,]+/).filter((id) => id.length > 0);
}

/**
 * Whether this caller may open the console. **Fail-closed.**
 *
 * An absent variable, an empty one, and one full of ids that are not yours all
 * give the same answer, and it is no. There is no bootstrap path and no first
 * administrator: on a space with nothing set, nobody is one.
 *
 * **There is no dev-guest exception here, and there was one for a day.**
 * `isAdminUser` opened with `if (isDevGuest(auth)) return true;` so the console
 * could be clicked under `sf dev`, on the stated evidence that a probe of the
 * published space had reported `schemes ["account"]` and `anyDevGuest false`.
 *
 * **That evidence was about the wrong thing.** The probe read the *stored
 * membership rows* — who had ever signed in — and concluded something about
 * *what identity an unauthenticated request is handed*, which it never
 * measured. The hosted runtime hands an anonymous caller the SDK's own guest
 * fallback: `guest:local` / `Local` / `guest` / not authenticated, matching
 * `isDevGuest` in all four fields. So on v15, for about twenty minutes,
 * `POST /__spacefast/zero/run` with **no credentials at all** answered
 * `adminAccess` with `{admin: true}` and returned every household count in the
 * space to anyone on the internet. Found by probing the live space immediately
 * after publishing; closed in v16.
 *
 * **The rule this leaves behind: a bypass keyed on an identity is only as safe
 * as your knowledge of every identity the runtime can mint, and nothing here
 * had ever asked that question directly.** Ask it of the running space, not of
 * its data.
 *
 * A guest is therefore never an administrator, whatever the list says — which
 * is also what makes it safe for the list to contain `guest:local`, since that
 * id only ever arrives attached to `isGuest: true`. The console is unreachable
 * under `sf dev` as a result; flipping this function is a deliberate local edit,
 * not something that ships.
 */
export function isAdminUser(
	auth: IdentityLike,
	raw: string | undefined | null,
	devGuests: string | undefined | null
): boolean {
	// **Administration is signing in, plus being named.** Built on `isSignedIn`
	// rather than repeating its conditions, so there is exactly one description
	// in this codebase of who is a person — the previous arrangement had two,
	// and they disagreed about `guest:local` in the direction that mattered.
	if (! isSignedIn(auth, devGuests)) return false;

	// An identity with no id never matches, which is also what stops a
	// malformed list entry from letting one in.
	if (! auth.userId) return false;

	return parseAdminIds(raw).indexOf(auth.userId) !== -1;
}

/**
 * Whether an account is one **the environment names** — and therefore one the
 * app may not delete (D68).
 *
 * **This is about a target, not a caller, and that is the whole difference from
 * `isAdminUser`.** That function answers *may you open the console*, and refuses
 * a guest outright whatever the list says, because the hosted runtime hands an
 * anonymous caller a guest identity and v15 leaked the whole space for twenty
 * minutes on exactly that. This one answers *is this id written in
 * `LARDER_ADMIN_IDS`*, about somebody who is not necessarily in the room.
 *
 * **So it does not refuse guests, and that asymmetry is deliberate.**
 * `LARDER_ADMIN_IDS` legitimately holds `guest:justin-…` beside the real
 * `account:` id, so the local administrator has to be protected too — otherwise
 * the guard is the one thing that cannot be exercised locally. A `guest:` id
 * still can never *administer* anything, because that is `isAdminUser`'s
 * question and it is unchanged.
 *
 * **It must never be used to grant.** It says *this account is spoken for*, and
 * every caller uses it to refuse. Reading it as permission would reintroduce
 * the v15 hole by another name: an anonymous caller arrives as `guest:local`,
 * and `guest:local` in the list would then mean *everybody*.
 *
 * Fail-**open** rather than fail-closed, which is the opposite of every other
 * rule in this file and is right here: with no list, nobody is named, so nobody
 * is protected and an ordinary account deletes normally. A guard that refused
 * everything on an unset variable would make the app undeletable by accident.
 */
export function isAdminId(userId: string | undefined | null, raw: string | undefined | null): boolean {
	/*
	 * **An empty id is refused by `parseAdminIds`, not by a guard here**, and it
	 * was written both ways: a `if (! userId) return false;` in front of this
	 * survived every mutation the test suite could aim at it, because
	 * `parseAdminIds` drops blanks and *that is its stated job* — a trailing
	 * comma cannot put `''` in the list, so nothing with no id can match one.
	 * A second check would be a second place to forget the rule and no place to
	 * enforce it.
	 */
	return parseAdminIds(raw).indexOf(userId ?? '') !== -1;
}

/**
 * Why an administrator's account cannot be deleted, for the screens that say so.
 *
 * **The client renders this rather than the server's refusal**, and that is not
 * a preference: a thrown message is invisible in production — QuickJS replaces
 * it with `Exception generated by QuickJS` — so any sentence a person has to
 * read has to reach them some other way. The `account` query reports the flag
 * and the pane draws this; the throw below is the enforcement, not the
 * explanation.
 */
export const ADMIN_UNDELETABLE_NOTE =
	'This account administers Larder Log, so it can’t be deleted from in here. ' +
	'Remove its id from LARDER_ADMIN_IDS first.';

/**
 * What the server says when an account deletion names an administrator anyway.
 *
 * Reaching it means a stale tab or somebody at a console, and both deserve the
 * true answer. **The reason it refuses at all is that `LARDER_ADMIN_IDS` is set
 * out of band and nothing in the app can edit it** — so deleting the rows would
 * leave the environment still naming an account that no longer exists, and the
 * next sign-in with that identity would produce a brand-new empty account
 * holding the console. The fix for *this administrator should go* is
 * `.env.server`, which is where the trust was granted.
 */
export const ADMIN_UNDELETABLE_REFUSAL =
	'That account administers Larder Log. Remove its id from LARDER_ADMIN_IDS before deleting it.';


/**
 * How well a row answers a search, higher being better. `0` is no match.
 *
 * **It only exists while there is a query**, which is the design's own rule:
 * *Best match* means nothing on an unsearched list, and offering it there would
 * be a sort option that silently does nothing. The console's two lists both
 * make it the default the moment something is typed and drop it again when the
 * field is cleared.
 *
 * The ladder is deliberately coarse — exact, then a prefix, then anywhere in
 * the name, then the same three against whatever else is searchable, then the
 * id last. Nobody types an id hoping to sort by it, and a row that matched only
 * because its id contains `ab` should never outrank one whose name starts with
 * it.
 *
 * Every tie falls through to the caller's name comparison, so a page boundary
 * lands in the same place twice.
 */
export function matchScore(
	needle: string,
	name: string,
	secondary: readonly string[],
	id: string
): number {
	const q = needle.trim().toLowerCase();

	if (! q) return 0;

	const n = name.toLowerCase();

	if (n === q) return 100;
	if (n.startsWith(q)) return 80;
	if (n.includes(q)) return 60;

	let best = 0;

	for (const other of secondary) {
		const o = other.toLowerCase();

		if (o.startsWith(q)) best = Math.max(best, 40);
		else if (o.includes(q)) best = Math.max(best, 30);
	}

	if (best) return best;

	return id.toLowerCase().includes(q) ? 10 : 0;
}

// --- what the console counts ---

/** A household nothing has touched in this long is dormant. */
export const DORMANT_DAYS = 90;

/** The window every *vs last N days* figure on Overview is measured over. */
export const RECENT_DAYS = 30;

/** How many months the household chart covers, including the current one. */
export const SERIES_MONTHS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days between two ISO stamps, or `null` when the first is unusable.
 *
 * `null` rather than `0`, and that distinction is the whole reason this returns
 * a union: every stamp column in this app defaults to `''` and nothing
 * backfills (D44), so "no date" is a normal value and reads as *today* if it
 * collapses to zero. A household with no readable activity is not a household
 * active this morning.
 */
export function daysBetween(iso: string, nowIso: string): number | null {
	const then = Date.parse(iso);
	const now = Date.parse(nowIso);

	if (! Number.isFinite(then) || ! Number.isFinite(now)) return null;

	return Math.floor((now - then) / DAY_MS);
}

/** Whether a stamp falls inside the last `days`. An unusable stamp does not. */
export function isWithinDays(iso: string, nowIso: string, days: number): boolean {
	const age = daysBetween(iso, nowIso);

	return age !== null && age >= 0 && age < days;
}

/**
 * Whether a household counts as dormant.
 *
 * **An unknown last-active is not dormant.** Every pre-D44 row holds `''`, so
 * the alternative would flag the app's own oldest households — the ones most
 * likely to be real — as abandoned, on the strength of a column that did not
 * exist when they were written.
 */
export function isDormant(lastActiveIso: string, nowIso: string): boolean {
	const age = daysBetween(lastActiveIso, nowIso);

	return age !== null && age >= DORMANT_DAYS;
}

/** `2026-08-29T…` → `'2026-08'`. The key both the series and its labels use. */
export function monthKey(iso: string): string {
	return iso.slice(0, 7);
}

/**
 * The last `count` month keys, oldest first, ending with the one `nowIso` is in.
 *
 * Walked by subtracting from a month number rather than by stepping a `Date`
 * backwards: a month step lands on the 31st of a month with 30 days and skips
 * one, which is a bug that only appears in half the year.
 */
export function monthKeysBack(nowIso: string, count = SERIES_MONTHS): string[] {
	const year = Number(nowIso.slice(0, 4));
	const month = Number(nowIso.slice(5, 7));

	if (! Number.isFinite(year) || ! Number.isFinite(month) || count < 1) return [];

	const keys: string[] = [];

	for (let back = count - 1; back >= 0; back--) {
		// `month` is 1-based, so shift to 0-based for the modulo and back after.
		const total = year * 12 + (month - 1) - back;
		const y = Math.floor(total / 12);
		const m = (total % 12) + 1;

		keys.push(`${y}-${m < 10 ? '0' : ''}${m}`);
	}

	return keys;
}

/** `'2026-08'` → `'Aug 2026'`, and `'2026-08'` → `'Aug'` when the year repeats. */
const MONTH_NAMES = [
	'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthLabel(key: string, withYear = false): string {
	const m = Number(key.slice(5, 7));
	const name = MONTH_NAMES[m - 1] ?? key;

	return withYear ? `${name} ${key.slice(0, 4)}` : name;
}

const MONTH_FULL = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * `Mar 4, 2026` — month first, and the comma is not optional in this order.
 *
 * **US style, and the console had four copies of the other one.** The three
 * screens each carried their own `MONTHS` array and their own `4 Mar 2026`,
 * which is the day-first form; a format written down four times is a format
 * that drifts, and it had already drifted into two spellings (`Mar` on two
 * screens, `March` on a third).
 *
 * **UTC throughout**, like every other stamp this app prints. A date rendered
 * in the reader's zone would put a household's creation on the day before it
 * for anybody west of Greenwich, and the audit log — which prints the zone —
 * would then disagree with the page it was opened from.
 *
 * The fallback is a parameter rather than a constant because the callers mean
 * different things by an unreadable stamp: a member's join date is *unknown*,
 * a household's creation is *at some point*.
 */
export function usDate(iso: string, fallback = 'unknown'): string {
	return formatUs(Date.parse(iso), MONTH_NAMES, fallback);
}

/** `March 4, 2026`. The long form, for the one place a date is a whole line. */
export function usLongDate(iso: string, fallback = 'unknown'): string {
	return formatUs(Date.parse(iso), MONTH_FULL, fallback);
}

/** The audit log has already parsed its stamp, so it hands the number over. */
export function usDateFrom(t: number, fallback = 'unknown'): string {
	return formatUs(t, MONTH_NAMES, fallback);
}

function formatUs(t: number, months: readonly string[], fallback: string): string {
	if (! Number.isFinite(t)) return fallback;

	const d = new Date(t);

	return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * A running total across `months`, counting every stamp that had happened by
 * the end of each one.
 *
 * **Cumulative, not per-month**, because the chart is labelled *Households* and
 * a household that existed in March still exists in April. A per-month bar of
 * signups is a different chart with a different label, and drawing one under
 * this one's axis is how a line that only ever rises comes to dip.
 *
 * Stamps outside the window still count toward the earliest bucket — the app
 * did not begin twelve months ago, and a series that starts at zero would claim
 * it did.
 */
export function cumulativeByMonth(stamps: readonly string[], months: readonly string[]): number[] {
	return months.map((month) => stamps.filter((iso) => {
		const key = monthKey(iso);

		// `''` and anything unparseable is excluded rather than bucketed at the
		// start: a household with no stamp is not one that existed first.
		return key.length === 7 && key <= month;
	}).length);
}
