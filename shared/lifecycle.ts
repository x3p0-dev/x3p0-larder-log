/**
 * What is recorded when something is destroyed, and why it is so little.
 *
 * **You can see how many households exist. Without this you can never see how
 * many left.** `deleteHousehold` and `deleteMyAccount` remove their rows and
 * write nothing, deliberately: D62 draws the line that the audit log records
 * *administration* and never what a person does to their own things. That rule
 * is right and it has a cost — net growth is the only growth anybody can
 * measure, so 500 households next month could be 500 arrivals or 900 arrivals
 * and 400 departures, and nothing distinguishes them.
 *
 * A deletion row is the smallest thing that closes that gap without breaking
 * the rule: **no id, no name, no household, no account, nothing that can be
 * joined back to a person.** What survives is that a thing of some kind ended,
 * when, and how old it was. An export of this table is a list of dates.
 *
 * **Append-only, and that is a deliberate choice over a counter.** A monthly
 * counter would be one row and O(1) to read, but incrementing it is a
 * read-modify-write, and whether that survives concurrency on this platform is
 * an open question (see `.claude/docs/design/scale.md`). An insert has no such
 * question. Deletions are rare enough that the row count stays small, and rows
 * can be rolled up into counters later — the reverse is not possible, which is
 * the usual argument for keeping the finer grain while it is cheap.
 */
export type DeletionKind = 'household' | 'account';

/** Anything unrecognised is refused rather than coerced: an unreadable row is worse than a missing one, and every caller is internal. */
export function isDeletionKind(value: unknown): value is DeletionKind {
	return value === 'household' || value === 'account';
}

/**
 * How old the thing was, in whole days, as a plain decimal string.
 *
 * **This is the half a bare count cannot answer.** *Forty households left this
 * month* is a number; *and half of them were under a week old* is a finding —
 * the difference between people trying the app and bouncing, and people using
 * it for a year and moving on. It is derivable only at the moment of deletion,
 * because the row that carries the birth date is the row about to be removed.
 *
 * An unparseable or missing birth stamp gives `''` rather than `0`: every
 * household created before D44 holds no `addedAt`, and calling those zero days
 * old would put a spike on day zero that is really just the app's own history.
 */
export function ageInDays(bornIso: string, nowMs: number): string {
	if (! bornIso) return '';

	const born = Date.parse(bornIso);

	if (Number.isNaN(born)) return '';

	return String(Math.max(0, Math.floor((nowMs - born) / 86400000)));
}
