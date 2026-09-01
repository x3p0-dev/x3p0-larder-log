import type { AdminActivityRow } from '../../shared/types';
import { csvFile } from '../../shared/exportData';
import { decodeHeld, heldPhrase } from '../../shared/activity';

/**
 * The audit log as CSV.
 *
 * CSV rather than JSON because an audit export exists to be opened by somebody
 * who is not this app. JSON is the better shape and the worse deliverable.
 *
 * **The escaping and the file assembly moved to `shared/exportData.ts`** when
 * the account and the pantry grew exports of their own (D68) — three copies of
 * RFC 4180 is three chances to quote a comma differently. The download itself
 * is `client/lib/download.ts`, for the reason it was always here rather than in
 * `shared/`: it reaches `Blob`, `URL` and `document`, three of the identifiers
 * the capsule compiler's denylist rejects outright.
 */

const COLUMNS = [
	'when', 'action', 'actor', 'actor_id', 'actor_kind',
	'target_kind', 'target', 'target_id', 'from', 'to', 'held',
];

export function activityCsv(rows: readonly AdminActivityRow[]): string {
	return csvFile(COLUMNS, rows.map((r) => [
		// The stored stamp, not a rendering of it. An export is read by something
		// that wants to sort and compare, and `3 days ago` cannot be either — the
		// same reason the opened entry names its zone.
		r.at,
		r.action,
		r.actorName,
		r.actorId,
		r.actorKind,
		r.targetKind,
		r.targetName,
		r.targetId,
		r.fromValue,
		r.toValue,
		heldPhrase(decodeHeld(r.held)),
	]));
}

/** `larder-log-activity-2026-08.csv` — the range in the name, not just in it. */
export function exportFilename(from: string, to: string): string {
	return `larder-log-activity-${from.slice(0, 10)}_to_${to.slice(0, 10)}.csv`;
}
