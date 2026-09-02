/**
 * Putting a trip away — the one moment the app writes a count it did not guess.
 *
 * **A check is a claim, not a write.** Ticking a row on the run list says *I am
 * getting this*; it cannot say how many, because the app has no way to know
 * whether you came home with a four-pack or a single. Every design that makes a
 * tick write a count is guessing at that number. So the tick claims, and the
 * write happens once, deliberately, on a screen you are looking at while
 * standing in front of the shelf.
 *
 * That is also what makes it **the only self-correcting moment in the product**.
 * Counts drift and nobody opens a pantry app to audit a shelf; the one time you
 * are guaranteed to be looking at both is when you are unpacking. The flow that
 * ends the trip is therefore the flow that fixes the drift, which is worth more
 * than the trip itself.
 *
 * It lives in `shared/` for the reason `runList.ts` does: the ordering is the
 * list's own ordering and the prefill is a rule, not a presentation choice. A
 * second copy of either client-side would be a second thing to get wrong, and
 * both are invisible when wrong — a prefill one out is still a plausible number.
 */

import { toInt } from './qty';
import type { RunBand } from './runList';
import type { SourceKind } from './source';
import type { Item } from './types';

/**
 * The count a put-away row opens on — **the smallest thing that is certainly
 * true**.
 *
 * Two things are certainly true the moment you get home: you have at least one
 * more than you had, and you are no longer low. The prefill is whichever of
 * those is larger and nothing else is inferred, because nothing else can be.
 *
 * **`low at + 1` rather than `low at`**, because *on hand == low at* is low
 * (`statusKeyFor`). A default that left the row on the list would be a default
 * that undid the trip it is ending.
 *
 * **And `on hand + 1` is not the redundant half.** An item forced onto the list
 * while already above its threshold — something bought because it was nearly
 * gone rather than because the arithmetic said so — would otherwise prefill to
 * a step *down* from what is on the shelf.
 */
export function restockPrefill(qty: unknown, threshold: unknown): number {
	return Math.max(toInt(threshold) + 1, toInt(qty) + 1);
}

/**
 * One row of the put-away sheet: an item, where it came from, and what its
 * count is about to become.
 *
 * The source is carried rather than looked up again because the *band* decided
 * it — see `putAwayRows` — and a second resolution here could disagree with the
 * card the row was ticked on.
 */
export type PutAwayRow = {
	item: Item;
	/** `null` for the storeless group, which has no term and therefore no dot. */
	sourceId: string | null;
	/** '' for the storeless group; the sheet prints only what it has. */
	sourceName: string;
	/** A colour token, for the row's 7px dot. '' when there is no source. */
	sourceInk: string;
	/**
	 * What kind of getting this was — shop, grow or make.
	 *
	 * `null` for the storeless group, which is filed under Buy but names nothing
	 * that could carry a kind. It is stored on the restock row, so a later
	 * reader can tell a shop from a harvest without asking whether the source
	 * still exists or still has the kind it had.
	 */
	kind: SourceKind | null;
	/** The count before the trip, for the row's `was N` clause. */
	was: number;
	lowAt: number;
};

/** Which source kind each band files its rows under. `runList`'s map, inverted. */
const KIND_OF: Record<RunBand['kind'], SourceKind> = { buy: 'shop', harvest: 'grow', make: 'make' };

/**
 * The checked rows of a run list, as the sheet draws them.
 *
 * **Ordered exactly as the list orders them** — kind, then source, then A–Z —
 * by walking the bands rather than sorting again. The sheet is the screen you
 * just ticked read back to you, and a different order would make you find each
 * row twice. It inherits D74 rather than restating it, which is the whole point
 * of walking the bands.
 *
 * **One row per item, never per list row.** An item you buy at either of two
 * shops draws twice on the list and is one thing to put away, so the first band
 * and group to claim it is the one that names it. That is not arbitrary: bands
 * run Buy · Harvest · Make and groups run A–Z, so the row is filed under the
 * first place you would have found it.
 *
 * @param bands   The bands the list is drawing, already narrowed to the chosen
 *                tab — so a sheet opened from the Harvest tab holds the harvest.
 * @param checked The ids to put away. The caller passes what is *on screen*, for
 *                the reason `Clear checks` does: a control beside `Hide 3
 *                checked` must not act on seven.
 */
export function putAwayRows(bands: readonly RunBand[], checked: ReadonlySet<string>): PutAwayRow[] {
	const rows: PutAwayRow[] = [];
	const taken = new Set<string>();

	for (const band of bands) {
		for (const group of band.groups) {
			for (const item of group.items) {
				if (! checked.has(item.id) || taken.has(item.id)) continue;

				taken.add(item.id);

				rows.push({
					item,
					sourceId: group.storeId,
					sourceName: group.storeId ? group.name : '',
					sourceInk: group.storeId ? group.ink : '',
					kind: group.storeId ? KIND_OF[band.kind] : null,
					was: toInt(item.qty),
					lowAt: toInt(item.threshold),
				});
			}
		}
	}

	return rows;
}

/**
 * One row of a put-away, as it crosses the wire.
 *
 * In `shared/` so the sheet and the handler describe the same thing: `qty` is
 * **what is on the shelf now**, never what was added, and a client that meant
 * the other one would compile perfectly and halve somebody's pantry.
 */
export type RestockEntry = {
	itemId: string;
	/** The count as it now stands, as a decimal string (D4). */
	qty: string;
	/** The source kind the row was filed under; '' for a row that named none. */
	kind: SourceKind | '';
};

/** What the sheet sends, from the rows it drew and the numbers somebody typed. */
export function restockEntry(row: PutAwayRow, qty: string): RestockEntry {
	return { itemId: row.item.id, qty, kind: row.kind ?? '' };
}

/**
 * `Publix · was 0 · low at 4` — the row's second line.
 *
 * The source leads because it is the thing that changes between rows; the two
 * counts are the same sentence every time and are there to be checked against,
 * not read. A storeless row simply starts at `was`.
 */
export function putAwayMeta(row: PutAwayRow): string {
	const counts = `was ${row.was} · low at ${row.lowAt}`;

	return row.sourceName ? `${row.sourceName} · ${counts}` : counts;
}
