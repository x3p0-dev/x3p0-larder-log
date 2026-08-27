/**
 * What the term filters mean.
 *
 * **OR inside a group, AND across groups.** *Pantry* and *Freezer* together
 * widen — anything in either — while *Pantry* and *Protein* together narrow.
 * That is the only reading under which selecting a second location can add
 * items to the screen and selecting a type can never do so, which is what the
 * two lists are for: one names where a thing lives, the others name what it is.
 *
 * In `shared/` because the rule is the kind of thing that is invisible when it
 * is wrong — an `every` where a `some` belongs still compiles, still runs, and
 * quietly returns an empty grid — and `shared/` is what `npm test` can reach.
 */

import type { Item } from './types';

/** The selected term ids, per group. An empty group filters nothing. */
export type TermFilters = {
	locations: readonly string[];
	types: readonly string[];
	stores: readonly string[];
};

export const NO_TERM_FILTERS: TermFilters = { locations: [], types: [], stores: [] };

/**
 * An id added if it is absent, removed if it is present.
 *
 * Returns a new array either way: these arrays are state, and mutating one in
 * place is a re-render that never happens.
 */
export function toggleTermFilter(ids: readonly string[], id: string): string[] {
	return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** How many terms are narrowing the grid, across all three groups. */
export function countTermFilters(f: TermFilters): number {
	return f.locations.length + f.types.length + f.stores.length;
}

/**
 * Whether one item survives the term filters.
 *
 * An item has exactly one location and any number of types and stores, so the
 * location test is an equality and the other two are intersections — but all
 * three are the same rule: *does this item name any of the terms this group
 * asked for*.
 */
export function matchesTermFilters(item: Item, f: TermFilters): boolean {
	if (f.locations.length && ! f.locations.includes(item.locationId)) return false;
	if (f.types.length && ! f.types.some((id) => item.typeIds.includes(id))) return false;
	if (f.stores.length && ! f.stores.some((id) => item.storeIds.includes(id))) return false;

	return true;
}

/**
 * The ids that still name a term that exists.
 *
 * Live queries make a filter pointing at a term someone else just deleted a
 * real race rather than a hypothetical, and a stale id silently hides every
 * item. Returns the same array reference when nothing was dropped, so a caller
 * can use it as a `setState` guard without looping.
 */
export function pruneTermFilter(ids: readonly string[], exists: (id: string) => boolean): readonly string[] {
	const kept = ids.filter(exists);

	return kept.length === ids.length ? ids : kept;
}
