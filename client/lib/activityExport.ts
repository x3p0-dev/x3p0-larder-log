import type { AdminActivityRow } from '../../shared/types';
import type { ExportFormat } from '../../shared/exportData';
import { csvFile, jsonFile } from '../../shared/exportData';
import type { Held } from '../../shared/activity';
import { decodeHeld, heldPhrase } from '../../shared/activity';

/**
 * The audit log as a file.
 *
 * **CSV or JSON, chosen at the press.** CSV is the deliverable — an audit
 * export exists to be opened by somebody who is not this app, and that is
 * usually a spreadsheet. JSON is the better *shape*, and this is the one export
 * where the difference is load-bearing: `held` is a set of counts, and CSV can
 * only render it as the sentence a person reads, which nothing can sort or sum.
 * So the two files are the same rows and `held` is the one field that differs —
 * a phrase in CSV, the counts themselves in JSON.
 *
 * **The escaping and the file assembly live in `shared/exportData.ts`** — three
 * copies of RFC 4180 is three chances to quote a comma differently. The
 * download itself is `client/lib/download.ts`, for the reason this file was
 * never in `shared/`: it reaches `Blob`, `URL` and `document`, three of the
 * identifiers the capsule compiler's denylist rejects outright.
 */

const COLUMNS = [
	'when', 'action', 'actor', 'actor_id', 'actor_kind',
	'target_kind', 'target', 'target_id', 'from', 'to', 'held',
] as const;

/** The row both files are built from, `held` aside. */
type ActivityFields = {
	when: string;
	action: string;
	actor: string;
	actor_id: string;
	actor_kind: string;
	target_kind: string;
	target: string;
	target_id: string;
	from: string;
	to: string;
};

function fieldsOf(r: AdminActivityRow): ActivityFields {
	return {
		// The stored stamp, not a rendering of it. An export is read by something
		// that wants to sort and compare, and `3 days ago` cannot be either — the
		// same reason the opened entry names its zone.
		when: r.at,
		action: r.action,
		actor: r.actorName,
		actor_id: r.actorId,
		actor_kind: r.actorKind,
		target_kind: r.targetKind,
		target: r.targetName,
		target_id: r.targetId,
		from: r.fromValue,
		to: r.toValue,
	};
}

export function activityCsv(rows: readonly AdminActivityRow[]): string {
	return csvFile(COLUMNS, rows.map((r) => {
		const f = fieldsOf(r);

		return [
			f.when, f.action, f.actor, f.actor_id, f.actor_kind,
			f.target_kind, f.target, f.target_id, f.from, f.to,
			// A sentence, because a cell has nowhere else to put six counts.
			heldPhrase(decodeHeld(r.held)),
		];
	}));
}

/**
 * The same rows, with `held` as the counts rather than as a sentence.
 *
 * **A deletion entry's counts are the whole reason this export exists** — they
 * are denormalised at the moment of the cascade and nothing else in the space
 * remembers them — so handing them over as `12 items · 3 types` and making the
 * reader parse an interpunct back into numbers is the export losing the one
 * thing it was keeping. An entry that held nothing gets `{}`, never `null`:
 * the key is always there and it is always an object.
 */
export function activityJson(rows: readonly AdminActivityRow[]): string {
	return jsonFile(rows.map((r): ActivityFields & { held: Held } => ({
		...fieldsOf(r),
		held: decodeHeld(r.held),
	})));
}

/** Whichever of the two was asked for. */
export function activityFile(format: ExportFormat, rows: readonly AdminActivityRow[]): string {
	return format === 'json' ? activityJson(rows) : activityCsv(rows);
}

/**
 * `larder-log-activity-2026-08-01_to_2026-09-01.csv` — the range in the name,
 * not just in it, and the format on the end.
 */
export function exportFilename(from: string, to: string, format: ExportFormat): string {
	return `larder-log-activity-${from.slice(0, 10)}_to_${to.slice(0, 10)}.${format}`;
}
