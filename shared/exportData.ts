/**
 * Taking a copy of something with you (D68).
 *
 * **Export is two features, and drawing it against the deletion rules is what
 * split it.** The pantry is the one thing account deletion has already
 * established *is not yours* — it belongs to the household and survives you —
 * so *Download your data* and *Export the pantry* are different exports, in
 * different places, answering different questions:
 *
 * | | Where | What it is |
 * |---|---|---|
 * | **Your data** | The account pane | Four fields, because there is nothing else. A legal obligation, not a feature |
 * | **The pantry** | Settings → Pantry settings | The household's rows as CSV. The one anybody wants |
 *
 * **Neither is a backup, because nothing imports one back.** Saying so is
 * cheap; the alternative is somebody deleting a household they thought they had
 * saved.
 *
 * The *shape* of a file is domain logic and lives here. Handing one to a
 * browser is not — that reaches `Blob`, `URL` and `document`, three of the
 * identifiers the capsule compiler's denylist rejects outright — so the
 * download itself stays in `client/lib/activityCsv.ts` beside the app's first
 * one.
 */

import type { Item, Source, Term } from './types';
import { formatSize } from './size';

/** RFC 4180: quote everything, and double an embedded quote. */
export function csvCell(value: string): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * A whole CSV, header included, ending in a newline.
 *
 * The trailing newline is not decoration: a file whose last line has none is a
 * file some tools read as one row short.
 */
export function csvFile(columns: readonly string[], rows: readonly (readonly string[])[]): string {
	const lines = [columns.join(',')];

	for (const row of rows) lines.push(row.map(csvCell).join(','));

	return `${lines.join('\n')}\n`;
}

/**
 * The pantry's columns.
 *
 * **Names, never ids**, so the file is readable on its own — and an item's
 * missing source is an empty cell, exactly as `NO STORE` is a real state rather
 * than a gap to apologise for.
 *
 * `sources` and `types` are plural and semicolon-joined because both are
 * many-to-many (there are no array columns — D4), and a comma inside a CSV cell
 * is a quoting problem nobody reading the file should have to think about.
 */
export const PANTRY_COLUMNS = [
	'name', 'size', 'on_hand', 'low_at', 'location', 'sources', 'types', 'notes',
] as const;

const JOIN = '; ';

export function pantryCsv(
	items: readonly Item[],
	locations: readonly Term[],
	sources: readonly Source[],
	types: readonly Term[]
): string {
	const nameOf = new Map<string, string>();

	for (const t of [...locations, ...sources, ...types]) nameOf.set(t.id, t.name);

	/*
	 * A–Z, and sorted here rather than taken in whatever order the query
	 * collected them. An export is opened by something that is not this app, and
	 * the order a row happens to have been inserted in is not an order.
	 */
	const rows = [...items]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((item) => [
			item.name,
			formatSize(item.size, item.unit),
			item.qty,
			item.threshold,
			nameOf.get(item.locationId) ?? '',
			item.storeIds.map((id) => nameOf.get(id) ?? '').filter(Boolean).join(JOIN),
			item.typeIds.map((id) => nameOf.get(id) ?? '').filter(Boolean).join(JOIN),
			item.notes,
		]);

	return csvFile(PANTRY_COLUMNS, rows);
}

/** `calfee-household-2026-09-01.csv` — the household and the day it was taken. */
export function pantryFilename(householdName: string, isoDay: string): string {
	return `${slug(householdName) || 'pantry'}-${isoDay.slice(0, 10)}.csv`;
}

/**
 * Everything this app holds that is the *account's* rather than a household's.
 *
 * **Four fields, because there is nothing else.** No per-item authorship
 * anywhere in Larder Log means an account has almost no data to hand back — and
 * that is the same fact the deletion copy leans on when it says the pantries
 * other people keep are untouched. The shortness of this file is the argument
 * made in a different form.
 *
 * **No invite codes**, which is the one place this departs from the design's
 * `invites_issued[]`. A code *is* the authorization (D39); a live one sitting
 * in a file on disk is a worse place for it than the app it was minted in, and
 * the export exists to describe what is held about you rather than to hand out
 * working keys. What it names instead is the household, the role and when the
 * link dies — which is everything about the invite except the way in.
 *
 * **No join date**, and that is an omission rather than a choice: `memberships`
 * carries no stamp at all. D44 stamped five tables and deliberately skipped
 * this one, because a column is permanent and nothing ordered memberships by
 * time. Adding one now is a schema change and the first thing to do if this
 * file ever has to be complete.
 */
export type AccountData = {
	display_name: string;
	email: string;
	member_of: { household: string; role: string }[];
	invites_issued: { household: string; role: string; expires_at: string; live: boolean }[];
};

export function accountDataJson(data: AccountData): string {
	// Two-space indent and a trailing newline: this one is read by a person as
	// often as by anything else, and it is four fields long.
	return `${JSON.stringify(data, null, 2)}\n`;
}

/** `larder-log-account-2026-09-01.json`. */
export function accountDataFilename(isoDay: string): string {
	return `larder-log-account-${isoDay.slice(0, 10)}.json`;
}

/** `Calfee Household` → `calfee-household`. */
function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
