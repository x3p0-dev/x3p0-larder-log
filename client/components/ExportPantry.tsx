import { useEffect, useRef } from 'preact/hooks';

import { usePantryOf } from '../hooks/usePantryData';
import type { ExportFormat } from '../../shared/exportData';
import { pantryFile, pantryFilename } from '../../shared/exportData';
import { downloadExport } from '../lib/download';

/**
 * Takes a copy of a household you are not currently in, then gets out of the
 * way (D68).
 *
 * **The pre-flight's *Export it first* is about a household the app is not
 * showing** — a row set to *delete it* may be one nobody has opened in a month
 * — so its rows cannot come from the `pantry` subscription the shell is already
 * holding. Zero's client has subscriptions and no one-shot read, so a component
 * that mounts, subscribes, downloads once and asks to be unmounted **is** the
 * one-shot read: `usePantryOf` opens while this exists and closes when the
 * caller clears it.
 *
 * It renders nothing. There is no spinner and no card, because the browser's
 * own download is the feedback and the wait is one round trip — and a control
 * that flashed a panel and vanished would read as a glitch, which is the
 * argument `AdminLoading` already makes for its own first half-second.
 *
 * **The download fires exactly once**, guarded by a ref rather than by the
 * effect's dependencies: a live query re-emits whenever anything in that
 * household changes, and an unguarded effect would hand somebody a second file
 * because a member ticked a row while they were reading the dialog.
 */
export function ExportPantry({ householdId, householdName, format, onDone }: {
	householdId: string;
	/** For the filename. The pantry query does not carry the household's name. */
	householdName: string;
	/** Which file — chosen at the press, and fixed for the life of this mount. */
	format: ExportFormat;
	/** Fired once the file is handed over, so the caller can unmount this. */
	onDone: () => void;
}) {
	const pantry = usePantryOf(householdId);
	const sent = useRef(false);

	useEffect(() => {
		if (! pantry || sent.current) return;

		sent.current = true;

		downloadExport(
			pantryFilename(householdName, new Date().toISOString(), format),
			pantryFile(format, pantry.items, pantry.locations, pantry.stores, pantry.types),
			format
		);

		onDone();
	}, [pantry, householdName, format, onDone]);

	return null;
}
