/**
 * The run list, as a grouping of items you already have.
 *
 * **It was the shopping list, and it grew two bands** (D58). The list groups by
 * **kind first, source second**: `Buy` for everything you shop for, `Harvest`
 * for what you pick, `Make` for what you cook. Which band a row lands in is a
 * property of its *source*, so nothing on the item changed and nothing here
 * asks the item what kind it is.
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

import { listRuleOf } from './listRule';
import { isInSeason } from './season';
import { toSourceKind } from './source';
import type { SourceKind } from './source';

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
	/**
	 * Rows in the wrong season, at the foot of the card under a `NOT YET`
	 * subhead. Only ever non-empty in the **Harvest** band.
	 *
	 * They are not `items`, and the difference is not cosmetic: they carry no
	 * checkbox (there is nothing to pick), no status badge (the count slot says
	 * *Ready in September* instead), and **they do not count** — not toward the
	 * band, and not toward the total on the trigger.
	 *
	 * **The item itself is unchanged.** An out-of-season squash still reads
	 * *out* on its card and still counts toward the three status pills, which is
	 * the one place those two numbers deliberately disagree.
	 */
	notYet: Item[];
};

/** Out first, then low. The same ordering the restock sort uses. */
const RANK: Record<StatusKey, number> = { out: 0, low: 1, ok: 2 };

/**
 * The key the storeless group collects under.
 *
 * A row id is never empty, so this cannot collide with a real store.
 */
const NO_STORE = '';

/**
 * Is this item on the list at all?
 *
 * Two questions, and the second one is authored where the first is derived: an
 * item joins the list when its count drops under its low-at, **unless somebody
 * has overridden that**. The override is a property of the item and therefore
 * the household's, like every other property of an item.
 *
 * The override reaches this function and nothing else. `statusKeyFor` is
 * untouched, so an item kept off the list still reads *running low* on its card
 * and still counts toward the top bar's status pills. Those count stock; this
 * counts shopping.
 *
 * **It gates every band, not only Buy** (D58) — an item kept off the list never
 * reaches Harvest or Make either, because what `never` says is *never remind me
 * about this*, and a harvest list is a reminder.
 *
 * **The override is a tri-state now** (D65), and `listRuleOf` is what reads it.
 * D53 wrote `offShoppingList` for "the things a household grows or brews"; D58's
 * source kinds answered that better and D60 retired the control. What was left
 * unanswered was the *other* direction — the thing you want on the list whatever
 * the count says — so the checkbox became `items.listRule`, three states, and
 * the retired column folds into `never`. The old column is kept for the reason
 * `icon` is (D34): dropping one needs `sf db migrate --drop`, filling it again
 * is additive.
 *
 * **`always` outranks the count and nothing else.** It does not outrank the
 * season: `runBands` still files an out-of-season harvest row under `NOT YET`,
 * because *whatever the count says* is a claim about wanting the thing, not
 * about whether it has grown yet.
 *
 * **The name predates the bands.** It reads *needs getting* now: a low tomato
 * from The Garden goes through this same gate and is never bought. The column
 * behind it is still `offShoppingList` and cannot be renamed without a
 * destructive migration, so renaming the function alone would only move the
 * mismatch.
 */
export function needsBuying(item: Item): boolean {
	const rule = listRuleOf(item);

	if (rule === 'never') return false;
	if (rule === 'always') return true;

	return statusKeyFor(item.qty, item.threshold) !== 'ok';
}

/**
 * Every item on the run list, by id — the trigger's count, and the set a tick
 * can belong to.
 *
 * **Read off the bands rather than filtered in parallel**, because the two
 * would otherwise have to agree about the season and would eventually not: an
 * item whose only source is a garden and whose season has not come round is on
 * no band, and a second `items.filter(...)` here would count it. One definition,
 * and the screen and the number come from it.
 */
export function runIds(
	items: Item[],
	sources: readonly (Term & { kind?: SourceKind })[],
	month: number
): Set<string> {
	const ids = new Set<string>();

	for (const band of runBands(items, sources, month)) {
		for (const group of band.groups) {
			for (const item of group.items) ids.add(item.id);
		}
	}

	return ids;
}

/** How many *items* are on the list — not how many rows it draws. */
export function runCount(
	items: Item[],
	sources: readonly (Term & { kind?: SourceKind })[],
	month: number
): number {
	return runIds(items, sources, month).size;
}

/**
 * One band of the run list.
 *
 * Three exist and each appears only when it holds something, in the order Buy ·
 * Harvest · Make — which is also the order `itemSourceKind()` breaks a tie in.
 */
export type RunBand = {
	kind: BandKind;
	/**
	 * Distinct **items** in this band, never the row count.
	 *
	 * The same rule the store cards run on: something you can buy at either of
	 * two shops draws twice and is one thing to get. It is also why the bands'
	 * counts need not add up to `runCount` — an item naming both a shop and
	 * a garden is one item on two bands, counted once by each.
	 */
	count: number;
	groups: ShoppingGroup[];
};

export type BandKind = 'buy' | 'harvest' | 'make';

/** Which band a source's kind sends its items to. */
const BAND_OF: Record<SourceKind, BandKind> = { shop: 'buy', grow: 'harvest', make: 'make' };

/** Present-when-non-empty, and always in this order. */
const BAND_ORDER: readonly BandKind[] = ['buy', 'harvest', 'make'];

/**
 * The run list: every item that needs getting, by kind then by source.
 *
 * **An item appears under every source it names**, exactly as it always has —
 * which now means it can appear in two *bands*. Tomatoes you buy at Publix in
 * February and pick from the garden in July are one item on the Buy card and
 * the Harvest card, and that is the honest answer rather than a guess about
 * which one you meant today.
 *
 * **An item naming no source at all lands in Buy**, under the storeless group,
 * and the test for that is against **every** source rather than the band's own:
 * an item that names only The Garden has a source, so it must not also turn up
 * in Buy asking to be given a shop.
 *
 * A `storeId` that resolves to nothing is skipped rather than dropping the item
 * into the storeless group. D16 refuses to delete a source while items
 * reference it, so it should be unreachable — but `id()` is not a foreign key
 * and nothing in the database enforces it.
 *
 */
export function runBands(
	items: Item[],
	sources: readonly (Term & { kind?: SourceKind })[],
	/**
	 * The month it is, 1–12, for the `NOT YET` split — `monthOf(Date.now())`.
	 *
	 * Taken rather than read so this stays a pure function of what it is handed,
	 * the arrangement `stampFrom` and `resolveDemoItems` already use, and so a
	 * season is testable without waiting for September.
	 */
	month: number
): RunBand[] {
	const byId = new Map(sources.map((s) => [s.id, s]));
	const groups = new Map<BandKind, Map<string, ShoppingGroup>>();
	// Distinct items per band, kept beside the groups because a group holds a
	// row and two groups in one band can hold the same item.
	const seen = new Map<BandKind, Set<string>>();

	for (const band of BAND_ORDER) {
		groups.set(band, new Map());
		seen.set(band, new Set());
	}

	function place(band: BandKind, key: string, source: Term | undefined, item: Item) {
		const inBand = groups.get(band)!;
		let group = inBand.get(key);

		if (! group) {
			group = {
				storeId: key === NO_STORE ? null : key,
				name: source?.name ?? '',
				ink: source?.ink ?? '',
				items: [],
				notYet: [],
			};
			inBand.set(key, group);
		}

		/*
		 * **Only a harvest row can be out of season**, and only the harvest card
		 * it landed on is affected. An item you buy at Publix *and* pick in July
		 * is still on the Buy card in February, because you can still go and buy
		 * it — the season says nothing about the shop.
		 *
		 * That is also why the count is skipped here rather than filtered later:
		 * such an item is counted once, by the band it is really on.
		 */
		if (band === 'harvest' && ! isInSeason(month, item.seasonFrom, item.seasonTo)) {
			group.notYet.push(item);
			return;
		}

		group.items.push(item);
		seen.get(band)!.add(item.id);
	}

	for (const item of items) {
		if (! needsBuying(item)) continue;

		const known = item.storeIds.filter((id) => byId.has(id));

		if (known.length === 0) {
			place('buy', NO_STORE, undefined, item);
			continue;
		}

		for (const id of known) {
			const source = byId.get(id)!;

			place(BAND_OF[toSourceKind(source.kind)], id, source, item);
		}
	}

	const bands: RunBand[] = [];

	for (const kind of BAND_ORDER) {
		// A card whose every row is out of season still draws — it is the whole
		// point of `NOT YET` that you can see what is coming.
		const inBand = [...groups.get(kind)!.values()]
			.filter((g) => g.items.length > 0 || g.notYet.length > 0);

		if (inBand.length === 0) continue;

		for (const group of inBand) {
			group.items.sort(byStatusThenName);
			// The same order, minus the status: nothing here has a badge, so out
			// before low would be sorting on something the row does not show.
			group.notYet.sort((a, b) => a.name.localeCompare(b.name));
		}

		bands.push({ kind, count: seen.get(kind)!.size, groups: inBand.sort(byNameStorelessLast) });
	}

	return bands;
}

/** Out before low, then A–Z. The *Needs restocking* sort, reused not rewritten. */
function byStatusThenName(a: Item, b: Item): number {
	return (
		RANK[statusKeyFor(a.qty, a.threshold)] - RANK[statusKeyFor(b.qty, b.threshold)]
		|| a.name.localeCompare(b.name)
	);
}

/** A–Z, with the storeless group last: it is the one you cannot walk into. */
function byNameStorelessLast(a: ShoppingGroup, b: ShoppingGroup): number {
	if (a.storeId === null) return 1;
	if (b.storeId === null) return -1;

	return a.name.localeCompare(b.name);
}
