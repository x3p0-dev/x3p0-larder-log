/**
 * A count that lives in a column, and therefore a count that is a string.
 *
 * Zero has no numeric type — every column is `string()`, `boolean()` or
 * `id(table)` — so a maintained count is stored as text. Text sorts
 * lexicographically, which means `'10' < '2'` and an unpadded count column
 * produces an order that is wrong in a way that looks plausible: a list of
 * pantries sorted "biggest first" leads with the one holding 9.
 *
 * **So a count that is sorted or range-queried is zero-padded to a fixed
 * width.** Padded, `'000000000009' < '000000000010'` and the database's own
 * index order *is* numeric order — which is the whole point, because it is what
 * lets the console ask for the biggest pantries, or the households in one size
 * band, without reading every row to find out.
 *
 * **The width is permanent.** It is a storage format, not a display choice:
 * change it and every row written under the old width sorts into the wrong
 * place, with no error and no migration short of rewriting the table (D27).
 * Twelve digits is 999,999,999,999 — far past anything this app can reach, and
 * still only twelve bytes.
 */
export const COUNT_WIDTH = 12;

/** The stored form. A negative or unreal count is clamped to zero rather than refused: a counter that has drifted below zero is a bug to repair, not a reason to make the row unreadable. */
export function padCount(value: number): string {
	const n = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

	return String(n).padStart(COUNT_WIDTH, '0');
}

/**
 * The number back out, tolerant of every row that predates the column.
 *
 * An unmaintained or pre-column row reads `''` — and, because a column added
 * after rows exist reads back as `null` while the generated row type still says
 * `string`, it may read `null` too. Both mean *nobody has counted this yet*,
 * which is `0` rather than an error: the caller cannot tell them apart and
 * should not have to.
 */
export function readCount(stored: string | null | undefined): number {
	if (! stored) return 0;

	const n = Number(stored);

	return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Whether anything has ever counted this row.
 *
 * **`readCount` deliberately cannot answer this and must not be made to.** It
 * collapses *nobody has counted this* into `0` because its callers are
 * rendering a number and cannot act on the difference. A *writer* can and must:
 * bumping an uncounted column by one would store `1` for a household holding
 * forty, and every later bump would carry that lie forward.
 *
 * So the two questions get two functions. `''` and `null` are both uncounted —
 * a column added after rows exist reads back `null` while the generated row
 * type still says `string`, which is the finding that left `useAvatarSync`
 * inert for as long as `memberships.picture` has existed.
 */
export function isCounted(stored: string | null | undefined): boolean {
	return typeof stored === 'string' && stored !== '';
}
