/**
 * Handing a file to the browser.
 *
 * A blob URL and a synthetic `<a download>`, which is what the audit log's
 * export established and what the two account exports reuse (D68). **In
 * `client/lib/`, not `shared/`**, and that is the boundary this project already
 * draws: the *shape* of a file is domain logic, and turning one into a download
 * reaches `Blob`, `URL` and `document` — three of the identifiers the capsule
 * compiler's denylist rejects outright in anything `server/` might import.
 */
export function downloadFile(filename: string, contents: string, mime: string): void {
	const blob = new Blob([contents], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');

	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	// Revoked on the next tick rather than immediately: Safari has historically
	// needed the URL to still resolve when the click is dispatched, and a leaked
	// URL for one frame costs nothing.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadCsv(filename: string, csv: string): void {
	downloadFile(filename, csv, 'text/csv;charset=utf-8');
}

export function downloadJson(filename: string, json: string): void {
	downloadFile(filename, json, 'application/json;charset=utf-8');
}
