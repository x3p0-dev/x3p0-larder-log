import type { AdminActivityRow } from '../../shared/types';
import { decodeHeld, heldPhrase } from '../../shared/activity';

/**
 * The audit log as CSV, and the download that hands it over.
 *
 * **In `client/lib/`, not `shared/`**, and that is the boundary this project
 * already draws: the *shape* of a log row is shared because both halves speak
 * it, but turning one into a file is a browser job — this reaches `Blob`,
 * `URL` and `document`, three of the identifiers the capsule compiler's
 * denylist rejects outright in anything `server/` might import.
 *
 * CSV rather than JSON because an audit export exists to be opened by somebody
 * who is not this app. JSON is the better shape and the worse deliverable.
 */

/** RFC 4180: quote everything, and double an embedded quote. */
function cell(value: string): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

const COLUMNS = [
	'when', 'action', 'actor', 'actor_id', 'actor_kind',
	'target_kind', 'target', 'target_id', 'from', 'to', 'held',
];

export function activityCsv(rows: readonly AdminActivityRow[]): string {
	const lines = [COLUMNS.join(',')];

	for (const r of rows) {
		lines.push([
			// The stored stamp, not a rendering of it. An export is read by
			// something that wants to sort and compare, and `3 days ago` cannot
			// be either — the same reason the opened entry names its zone.
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
		].map(cell).join(','));
	}

	// A trailing newline, because a file whose last line has none is a file some
	// tools read as one row short.
	return `${lines.join('\n')}\n`;
}

/**
 * Hands the file to the browser.
 *
 * A blob URL and a synthetic `<a download>` — the app's first download of any
 * kind. The object URL is revoked on the next tick rather than immediately:
 * Safari has historically needed the URL to still resolve when the click is
 * dispatched, and a leaked URL for one frame costs nothing.
 */
export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');

	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `larder-log-activity-2026-08.csv` — the range in the name, not just in it. */
export function exportFilename(from: string, to: string): string {
	return `larder-log-activity-${from.slice(0, 10)}_to_${to.slice(0, 10)}.csv`;
}
