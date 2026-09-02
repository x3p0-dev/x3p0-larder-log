/**
 * When an item entered the pantry — which is not the same thing as when its row
 * was born.
 *
 * D17 makes undo a re-insert: `removeItem` really deletes, and undo re-runs
 * `addItem`, so a restored item is a genuinely new row with a new `id` and a
 * new `createdAt`. That was accepted as a trade-off, and *Recently added*
 * sorting on `createdAt` (D35) is what made the cost visible — undoing a
 * removal shot the item to the top of the list instead of putting it back.
 *
 * `items.addedAt` is the fix and the reason the platform's stamp cannot be:
 * `createdAt` is reserved, and an insert that sets it is refused outright —
 * *"Zero manages items.createdAt; app code cannot set it directly"*, confirmed
 * against a running capsule on 2026-08-27. So the app keeps its own stamp, and
 * undo carries the old one across.
 *
 * The two are the same value for any item that has never been removed. They
 * diverge exactly once per undo, which is the whole point.
 *
 * **Every table this app orders by time carries its own pair** — `addedAt` and
 * `changedAt` on `items`, `locations`, `types` and `stores`, `addedAt` alone on
 * `households`, which nothing modifies in a way worth stamping, and `joinedAt`
 * alone on `memberships`, where the one moment worth recording is the join. The
 * platform's `createdAt` survives only as the fallback for rows written before
 * the columns existed, and `updatedAt` is not used at all: it is managed the
 * same way `createdAt` is, so it cannot survive an undo either.
 */

/** ISO 8601 UTC, the one encoding in this app that string-compares correctly (D4). */
export function stampFrom(nowMs: number): string {
	return new Date(nowMs).toISOString();
}

/**
 * The stamp to store for an item being inserted.
 *
 * `undefined` is the ordinary add — there is nothing to carry over, so it is
 * now. A supplied value is an **undo** carrying the removed row's own stamp
 * back, so it is honoured, but only if it parses and is not in the future: a
 * stamp ahead of now would pin the row to the top of *Recently added*
 * permanently, which is the bug this exists to fix rather than a new way to
 * cause it.
 */
export function normalizeStamp(value: string | undefined, nowMs: number): string {
	if (! value) return stampFrom(nowMs);

	const parsed = Date.parse(value);

	if (Number.isNaN(parsed) || parsed > nowMs) return stampFrom(nowMs);

	return stampFrom(parsed);
}

/**
 * The sort key for *Recently added*, tolerant of rows written before the column.
 *
 * `addedAt` defaults to `''` and an existing row keeps that until something
 * rewrites it, so the fallback is not a transitional nicety — it is the value
 * for every item added before this shipped, forever. Both sides are ISO 8601
 * UTC on the same scale, so a list mixing the two still orders correctly.
 */
export function addedAtOf(row: { addedAt: string; createdAt: string }): string {
	return row.addedAt || row.createdAt;
}

/**
 * The sort key for *last changed*: the app's stamp, then the two fallbacks.
 *
 * A row is never modified before it exists, so `addedAt` is the right second
 * choice — it is what `changedAt` would have held. Every mutation that writes a
 * field a person can see bumps it, `adjustQty` included: a quantity is
 * information about the item, and the hot path is not exempt.
 */
export function changedAtOf(row: { changedAt: string; addedAt: string; createdAt: string }): string {
	return row.changedAt || addedAtOf(row);
}

/**
 * When an account joined a household, tolerant of rows written before the column.
 *
 * D44 gave `memberships` no stamp at all, on the grounds that nothing ordered
 * them by time and a membership is never re-inserted by an undo. **The first
 * half stopped being true when the console shipped**: *Recently joined* is one
 * of `adminPeople`'s four sorts, and an account page and every member row print
 * this date — so it is a key this app orders by, which by D44's own rule is a
 * key this app has to write.
 *
 * The fallback is `createdAt` and it is permanent, not transitional: every
 * membership on the published space today holds no `joinedAt` and nothing
 * backfills. Both sides are ISO 8601 UTC on the same scale, so a list mixing
 * the two still orders correctly — and for a row that has never been rewritten
 * they are the same instant anyway.
 *
 * **`||` rather than `??`, and that is load-bearing.** A column added after
 * rows exist reads back as `null` rather than the declared `''`, and the
 * generated row type says `string` either way, so `typecheck` cannot see it —
 * the finding that disabled `useAvatarSync` for as long as `memberships.picture`
 * has existed. `||` catches `null`, `undefined` and `''` alike.
 */
export function joinedAtOf(row: { joinedAt: string; createdAt: string }): string {
	return row.joinedAt || row.createdAt;
}
