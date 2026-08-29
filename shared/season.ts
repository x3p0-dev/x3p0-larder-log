/**
 * When a grown thing is ready — two months, and never one (D58).
 *
 * **Months, not dates.** No year, no locale, no format: a season repeats and a
 * date does not. It is the argument the Members pane's *Expires in 12 days*
 * countdown already makes, one step further — a stored `2027-06-14` would be
 * wrong by the following summer and would need a locale to print.
 *
 * **A pair that is never half-set**, exactly as `size` and `unit` are (D52).
 * One month with no other end is not a season, so `normalizeSeason` refuses the
 * half rather than inventing the missing one. Between that and the sheet's two
 * controls there is no invalid state left to validate, which is why nothing
 * anywhere renders a season error.
 *
 * The season lives on the *item* today because the item is the only object
 * there is. It belongs on a **planting** — see D59 — and moving it is two
 * fields. Worth knowing it is on loan.
 */

/** January is 1. The stored value is this number as a string, or `''`. */
export const MONTHS: readonly string[] = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

/** `'6'` → `June`, anything else → `''`. */
export function monthName(value: unknown): string {
	const n = monthNumber(value);

	return n ? MONTHS[n - 1]! : '';
}

/**
 * A stored month as 1–12, or `0` for none.
 *
 * `0` rather than `null` so callers can test it as a falsy number without a
 * second comparison, and because a month is never legitimately zero.
 */
export function monthNumber(value: unknown): number {
	if (typeof value !== 'string' || ! /^\d{1,2}$/.test(value.trim())) return 0;

	const n = Number(value.trim());

	return n >= 1 && n <= 12 ? n : 0;
}

/**
 * The pair as it is stored: two months, or two empty strings.
 *
 * Half a season is discarded rather than completed. Completing it would mean
 * guessing — a one-month season? through to December? — and every guess is a
 * value the household never typed, which D48 has already settled once for
 * names.
 */
export function normalizeSeason(from: unknown, to: unknown): { seasonFrom: string; seasonTo: string } {
	const a = monthNumber(from);
	const b = monthNumber(to);

	return a && b
		? { seasonFrom: String(a), seasonTo: String(b) }
		: { seasonFrom: '', seasonTo: '' };
}

export function hasSeason(from: string, to: string): boolean {
	return monthNumber(from) > 0 && monthNumber(to) > 0;
}

/**
 * Is `month` inside the season?
 *
 * **An unset season is always in season**, which is what keeps this safe to ask
 * about every item: the question the run list actually asks is *should this row
 * move to `NOT YET`*, and a household that has said nothing about when its
 * basil is ready has not said it is unavailable.
 *
 * **The range wraps**, and that is the case worth having a test for. November
 * to February is a real season and reads as one on the sheet; read literally as
 * `11 <= m <= 2` it is empty, which would move an item to `NOT YET` in every
 * month of the year including the ones it is ready in.
 */
export function isInSeason(month: number, from: string, to: string): boolean {
	const a = monthNumber(from);
	const b = monthNumber(to);

	if (! a || ! b) return true;

	return a <= b
		? month >= a && month <= b
		: month >= a || month <= b;
}

/**
 * *Ready in September* — what a `NOT YET` row says where its status badge was.
 *
 * The **start** month, because that is the next thing that happens to it. It
 * says nothing about which year, for the same reason nothing else here does.
 */
export function readyPhrase(from: string, to: string): string {
	const name = monthName(from);

	return hasSeason(from, to) && name ? `Ready in ${name}` : '';
}

/**
 * The month a `Date` falls in, as 1–12.
 *
 * Taken as an argument everywhere rather than read here, so `shared/` stays a
 * pure function of what it is handed — the same arrangement `stampFrom` and
 * `resolveDemoItems` already use, and what makes a season testable without
 * waiting for September.
 */
export function monthOf(now: number): number {
	return new Date(now).getMonth() + 1;
}
