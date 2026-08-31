/**
 * What the two suggestion menus offer, and how a query matches.
 *
 * One rule set, two questions. The name field on the Add / Edit sheet asks
 * *what is this item called*; the top bar's search field asks *what are you
 * looking for*. Both open the same menu, and the difference is entirely in
 * which groups they build — see `autofill.md`.
 *
 * In `shared/` for the reason `filter.ts` is: a matching rule is invisible when
 * it is wrong. A substring where a word prefix belongs still compiles, still
 * runs, and quietly hands back a list nobody can explain — and `shared/` is
 * what `npm test` can reach.
 */

import { GROCERY_CATALOG } from './catalog';
import type { CatalogItem } from './catalog';
import { formatSize, unitFor } from './size';
import type { Item, Term, TermKind } from './types';

/**
 * How many characters open the menu.
 *
 * **Two, and never on focus.** An empty name field offering six common
 * groceries is the app guessing at what you came to do.
 */
export const SUGGEST_MIN = 2;

/** The name field's caps — three of each, so six rows and no scroll. */
export const NAME_GROUP_CAP = 3;

/**
 * Search's caps.
 *
 * Five and three rather than three and three: it draws from the whole household
 * rather than from a word list, and it has one group to share the space with
 * instead of two.
 */
export const SEARCH_ITEM_CAP = 5;
export const SEARCH_TERM_CAP = 3;

/**
 * What ends a word.
 *
 * Written out rather than expressed as "not a letter or a digit", because the
 * negative form needs `\p{L}` to be right about accented names and the capsule
 * compiler is one runtime this file has to survive. Everything here appears in
 * a real grocery name — *Half and Half*, *Oils & Vinegars*, *12 oz*.
 */
const SEPARATOR = /[\s\-–—/(),.&+'"’]/;

/**
 * Where a query matches inside a piece of text, or `-1`.
 *
 * **A match is a prefix of any word**, not a substring anywhere: `be` finds
 * Ground **Be**ef and Black **Be**ans, and `eef` finds nothing. That rule is
 * never written on screen — the matched characters going to 700 is the whole
 * explanation of it, which is why the index matters and not just the boolean.
 *
 * Case-insensitive, and the index is into the original text, so a caller can
 * slice the un-lowercased string with it.
 */
export function matchAt(text: unknown, query: string): number {
	const q = query.trim().toLowerCase();
	if (! q || typeof text !== 'string') return -1;

	const hay = text.toLowerCase();

	for (let i = 0; i < hay.length; i++) {
		// A word starts at the head of the string, or after a separator.
		if (i > 0 && ! SEPARATOR.test(hay[i - 1])) continue;
		if (hay.startsWith(q, i)) return i;
	}

	return -1;
}

/**
 * The same question asked for its answer alone.
 *
 * **An empty query matches everything**, which `matchAt` cannot say: it answers
 * *where does the highlight go*, and the answer with nothing typed is nowhere.
 * The grid asks the other question — *does this row survive the search* — and
 * with an empty field every row does.
 */
export function matchesQuery(text: unknown, query: string): boolean {
	if (! query.trim()) return true;

	return matchAt(text, query) >= 0;
}

/**
 * What a size is searchable as.
 *
 * Both the printed form and the unit's own word, because *pint* is what
 * somebody types and `pt` is what the card shows — and D52 stores neither, it
 * stores the slug. Typing `pint` finding your pints is what the size section
 * asked for.
 */
export function sizeSearchText(size: unknown, unit: unknown): string {
	const printed = formatSize(size, unit);
	if (! printed) return '';

	const found = unitFor(unit);

	return found ? `${printed} ${found.label}` : printed;
}

/** One item row: the item, and where the query landed in its name and its size. */
export type ItemHit = {
	item: Item;
	/** Into `item.name`, or `-1` when the row is here for its size alone. */
	at: number;
	/** Into `formatSize(item)`, or `-1`. Search only — the name field never reads it. */
	sizeAt: number;
};

/** One catalog row — the entry and where the query landed in its name. */
export type CatalogHit = { entry: CatalogItem; at: number };

/** One term row. Search only — the name field cut this group on 31 Aug. */
export type TermHit = { term: Term; kind: TermKind; count: number; at: number };

/**
 * Rank by where the match landed, then A–Z.
 *
 * A row whose *first* word starts with the query is the more likely answer than
 * one that matched three words in, and a size-only match — which has no
 * highlight in the name at all — sorts below both. Alphabetical breaks the tie
 * so the list is stable while you type rather than reshuffling on every
 * keystroke.
 */
function byMatchThenName<T>(at: (row: T) => number, name: (row: T) => string) {
	return (a: T, b: T) => {
		const pa = at(a) < 0 ? Number.MAX_SAFE_INTEGER : at(a);
		const pb = at(b) < 0 ? Number.MAX_SAFE_INTEGER : at(b);

		if (pa !== pb) return pa - pb;

		return name(a).localeCompare(name(b));
	};
}

/**
 * The name field's two groups — what you already have, then the catalog.
 *
 * **Names only.** The field is labelled `ITEM` and answers one question, which
 * is the whole reason the terms group came out of this menu on 31 Aug; sizes
 * are a search idea and belong to the field that asks what you are looking for.
 *
 * `excludeId` keeps the item you are editing out of its own menu.
 */
export function nameSuggestions(
	query: string,
	items: readonly Item[],
	excludeId?: string | null,
	catalog: readonly CatalogItem[] = GROCERY_CATALOG
): { pantry: ItemHit[]; catalog: CatalogHit[] } {
	if (query.trim().length < SUGGEST_MIN) return { pantry: [], catalog: [] };

	const pantry: ItemHit[] = [];

	for (const item of items) {
		if (excludeId && item.id === excludeId) continue;

		const at = matchAt(item.name, query);
		if (at >= 0) pantry.push({ item, at, sizeAt: -1 });
	}

	pantry.sort(byMatchThenName((h) => h.at, (h) => h.item.name));

	/*
	 * A catalog word that names something already on the pantry list would draw
	 * the same word twice in one menu, one row apart, doing two different
	 * things. The pantry row is the more useful of the two, so the word drops
	 * out of the catalog rather than out of the group that leads.
	 */
	const taken = new Set(items.map((it) => it.name.trim().toLowerCase()));
	const words: CatalogHit[] = [];

	for (const entry of catalog) {
		if (taken.has(entry.name.toLowerCase())) continue;

		const at = matchAt(entry.name, query);
		if (at >= 0) words.push({ entry, at });
	}

	words.sort(byMatchThenName((h) => h.at, (h) => h.entry.name));

	return {
		pantry: pantry.slice(0, NAME_GROUP_CAP),
		catalog: words.slice(0, NAME_GROUP_CAP),
	};
}

/**
 * Search's two groups — what you have, then the terms you could filter to.
 *
 * **Names, sizes and term names. Never notes.** A row in the list for a reason
 * that is invisible in the row is worse than a shorter list.
 *
 * **Matching is name-shaped, and that is why there are two groups.** Typing
 * `co` does not return Costco's six items — it returns the things *called*
 * co-something, and offers **Costco** as a term beside them. Pressing that row
 * is how you get the six, and the grid behind obeys the same rule, so what the
 * menu lists and what the grid shows never disagree.
 */
export function searchSuggestions(
	query: string,
	items: readonly Item[],
	groups: readonly { kind: TermKind; terms: readonly Term[] }[],
	/**
	 * Terms already narrowing the grid, as `kind:id` — the key `AppliedFilters`
	 * uses, because a row id is unique only within its own table.
	 *
	 * They are dropped rather than marked. **Nothing in either menu is ever
	 * *selected***, which is what frees the fill to mean highlight; a term
	 * already on is one you can see in the applied-filter row, and offering to
	 * press it again would give this group a second verb. Dropping it is also
	 * what "a set you work through" looks like — the list shortens as you go.
	 */
	applied: readonly string[] = []
): { items: ItemHit[]; terms: TermHit[] } {
	if (query.trim().length < SUGGEST_MIN) return { items: [], terms: [] };

	const hits: ItemHit[] = [];

	for (const item of items) {
		const at = matchAt(item.name, query);
		/*
		 * A row is *found* by the fuller text — `1 pt Pint` — and *highlighted*
		 * in the printed form alone, because `1 pt` is what the row draws.
		 * Typing `pint` therefore turns up your pints with nothing bolded, which
		 * is the honest answer: the word that matched is not on the row.
		 */
		const found = matchesQuery(sizeSearchText(item.size, item.unit), query);
		const sizeAt = found ? matchAt(formatSize(item.size, item.unit), query) : -1;

		if (at >= 0 || found) hits.push({ item, at, sizeAt });
	}

	hits.sort(byMatchThenName((h) => h.at, (h) => h.item.name));

	const terms: TermHit[] = [];

	const on = new Set(applied);

	for (const group of groups) {
		for (const term of group.terms) {
			if (on.has(`${group.kind}:${term.id}`)) continue;

			const at = matchAt(term.name, query);
			if (at < 0) continue;

			terms.push({ term, kind: group.kind, count: usageCount(items, group.kind, term.id), at });
		}
	}

	terms.sort(byMatchThenName((h) => h.at, (h) => h.term.name));

	return {
		items: hits.slice(0, SEARCH_ITEM_CAP),
		terms: terms.slice(0, SEARCH_TERM_CAP),
	};
}

/**
 * How many items name a term.
 *
 * `termUsageCount` says the same thing and takes the three fields structurally;
 * this is it inlined so the loop above walks the item list once per term rather
 * than importing a second module for one filter.
 */
function usageCount(items: readonly Item[], kind: TermKind, id: string): number {
	if (kind === 'location') return items.filter((it) => it.locationId === id).length;
	if (kind === 'type') return items.filter((it) => it.typeIds.includes(id)).length;

	return items.filter((it) => it.storeIds.includes(id)).length;
}

/**
 * What a pantry row hands the sheet when it is pressed.
 *
 * **The name, the size, and the three term chips. Never a count.** *Low at* is
 * a count, not a property — copying it would carry Ground Beef's 15 onto a jar
 * of anything, and the household default is the number a new item should start
 * from. The caller keeps its own `qty`, `threshold` and everything else.
 *
 * `offShoppingList` is deliberately not carried either: it is retired (D60) and
 * nothing may create a new one.
 */
export function fillFromItem(item: Item): Pick<Item, 'name' | 'size' | 'unit' | 'locationId' | 'typeIds' | 'storeIds'> {
	return {
		name: item.name,
		size: item.size,
		unit: item.unit,
		locationId: item.locationId,
		typeIds: [...item.typeIds],
		storeIds: [...item.storeIds],
	};
}

/**
 * What a catalog row hands the sheet.
 *
 * **The name, plus the type and the shelf the catalog knows about it.** *Half
 * and Half* is Dairy and it goes in the refrigerator in every household there
 * has ever been, and asking somebody to say so is the app declining to use what
 * it already knows. **No source, ever** — where you buy a thing is one
 * household's own vocabulary (D40), and guessing there would be the app
 * inventing an answer.
 *
 * **Matched by name, exactly, against terms that already exist.** A household
 * that renamed *Dairy* gets `''` back rather than a wrong id, and nothing here
 * creates a term: absent rather than wrong. Returns only the fields it could
 * fill, so a caller spreads it over a draft and everything else stays put.
 */
export function fillFromCatalog(
	entry: CatalogItem,
	types: readonly Term[],
	locations: readonly Term[]
): { name: string; typeIds?: string[]; locationId?: string } {
	const filled: { name: string; typeIds?: string[]; locationId?: string } = { name: entry.name };

	const type = entry.type ? byExactName(types, entry.type) : undefined;
	if (type) filled.typeIds = [type.id];

	const place = entry.place ? byExactName(locations, entry.place) : undefined;
	if (place) filled.locationId = place.id;

	return filled;
}

/** A term by its name — trimmed and case-insensitive, and nothing looser. */
function byExactName(list: readonly Term[], name: string): Term | undefined {
	const want = name.trim().toLowerCase();

	return list.find((t) => t.name.trim().toLowerCase() === want);
}

/**
 * The politely-announced count.
 *
 * Singular at one, and `''` at zero — nothing opens when nothing matches, so
 * there is no count to report and an announcement would be describing an
 * absence nobody asked about.
 */
export function suggestionAnnouncement(count: number): string {
	if (count <= 0) return '';

	return count === 1 ? '1 suggestion.' : `${count} suggestions.`;
}
