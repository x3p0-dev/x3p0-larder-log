/**
 * The shopping list, as a grouping of items you already have.
 *
 * Nothing is authored into a shopping list and nothing is authored out of it:
 * an item arrives when its count drops under its low-at and leaves when someone
 * puts the count back up. That is why this is a pure function of the items
 * rather than a table — there is no way for the list and the pantry to
 * disagree, because they are the same rows read twice.
 *
 * It lives in `shared/` because the ordering rules are domain rules, not
 * presentation: out before low is the same sentence the *Needs restocking* sort
 * says, and a second copy of it client-side would be a second thing to get
 * wrong.
 */

import { statusKeyFor } from './status';
import type { StatusKey } from './status';
import type { Item, Term } from './types';

/**
 * One store's worth of shopping.
 *
 * `storeId` is `null` for the group of items that name no store at all — which
 * is a real group, not an error state. Opening one of its rows is how someone
 * gives it a store.
 */
export type ShoppingGroup = {
	storeId: string | null;
	/** The store's name; empty for the storeless group, which the UI labels. */
	name: string;
	/**
	 * The store's colour token, carried so the card's header does not have to
	 * look the term up a second time and risk disagreeing with the grouping.
	 * Empty for the storeless group: no term means no colour.
	 */
	ink: string;
	items: Item[];
};

/** Out first, then low. The same ordering the restock sort uses. */
const RANK: Record<StatusKey, number> = { out: 0, low: 1, ok: 2 };

/**
 * The key the storeless group collects under.
 *
 * A row id is never empty, so this cannot collide with a real store.
 */
const NO_STORE = '';

/** Is this item on the list at all? */
export function needsBuying(item: Item): boolean {
	return statusKeyFor(item.qty, item.threshold) !== 'ok';
}

/** How many *items* are to buy — not how many rows the list draws. */
export function shoppingCount(items: Item[]): number {
	return items.filter(needsBuying).length;
}

/**
 * Groups the low and out items by where you would buy them.
 *
 * An item may name several stores, and it appears under every one of them: you
 * can buy it at either, and a list that picked one for you would be guessing.
 * That is why `shoppingCount` counts items rather than summing the groups.
 *
 * A store id that resolves to nothing falls into the storeless group rather
 * than drawing a card with no name. D16 refuses to delete a store while items
 * reference it, so this should be unreachable — but `id()` is not a foreign key
 * and nothing in the database enforces it.
 */
export function shoppingGroups(items: Item[], stores: Term[]): ShoppingGroup[] {
	const byId = new Map(stores.map((s) => [s.id, s]));
	const groups = new Map<string, ShoppingGroup>();

	for (const item of items) {
		if (! needsBuying(item)) continue;

		const known = item.storeIds.filter((id) => byId.has(id));

		for (const key of known.length ? known : [NO_STORE]) {
			let group = groups.get(key);

			if (! group) {
				const store = byId.get(key);

				group = {
					storeId: key === NO_STORE ? null : key,
					name: store?.name ?? '',
					ink: store?.ink ?? '',
					items: [],
				};
				groups.set(key, group);
			}

			group.items.push(item);
		}
	}

	for (const group of groups.values()) {
		group.items.sort((a, b) => (
			RANK[statusKeyFor(a.qty, a.threshold)] - RANK[statusKeyFor(b.qty, b.threshold)]
			|| a.name.localeCompare(b.name)
		));
	}

	// A–Z, with the storeless group last: it is the one you cannot walk into.
	return [...groups.values()].sort((a, b) => {
		if (a.storeId === null) return 1;
		if (b.storeId === null) return -1;

		return a.name.localeCompare(b.name);
	});
}
