/**
 * A source carries a kind — Shop, Grow, Make.
 *
 * It is a property of the **term**, not of the item, not a fourth term group,
 * and not a mode. *The Garden* is a source of kind `grow`; *The Kitchen* is one
 * of kind `make`. Both take a term colour, both appear in the filter group, and
 * both tag an item card exactly as Costco does — so the drawer never learns
 * what a kind is, and filtering by The Garden works identically to filtering by
 * Publix.
 *
 * **Why the kind sits on the source.** A source is already a coloured, named
 * thing you filter and tag with, so one more property costs one glyph in one
 * panel. Putting it on the *item* would mean a fourth chip group, a fourth
 * colour list, and a second thing to set every time you add anything.
 *
 * **Why it exists at all**: an empty store was carrying two opposite meanings.
 * Baking Soda has no store because nobody set one — that is a gap. Frozen
 * Peaches may have none because *there isn't one*. The list drew them
 * identically, and the moment a household grows or cooks anything the two have
 * to come apart.
 *
 * In `shared/` because the server normalizes what it stores with the same
 * function the client renders from.
 */

/**
 * Shop · Grow · Make.
 *
 * `shop` is not a stored value so much as the absence of a decision: every row
 * written before this column holds `''` and nothing backfills (D44), so
 * `toSourceKind` resolves that here rather than leaving every reader to.
 */
export type SourceKind = 'shop' | 'grow' | 'make';

/** Menu order, and the order the run list's bands come in. */
export const SOURCE_KINDS: readonly SourceKind[] = ['shop', 'grow', 'make'];

/**
 * What an unset column means.
 *
 * A shop, because that is what every source in the app was until this column
 * existed — `Calfee Cattle` is a rancher rather than a shop and still stays a
 * shop, which is right: you still drive there.
 */
export const DEFAULT_SOURCE_KIND: SourceKind = 'shop';

/** The word on the kind menu's row. */
export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
	shop: 'Shop',
	grow: 'Grow',
	make: 'Make',
};

export function isSourceKind(value: unknown): value is SourceKind {
	return value === 'shop' || value === 'grow' || value === 'make';
}

/** Anything unrecognised — `''`, a typo, a kind from a future version — is a shop. */
export function toSourceKind(value: unknown): SourceKind {
	return isSourceKind(value) ? value : DEFAULT_SOURCE_KIND;
}

/**
 * The group's name follows what's in it: `Store`, or `Source`.
 *
 * **The rule is "does anything here fail to be a shop", not "how many distinct
 * kinds are there".** The design doc's prose says *one kind and it is a Store,
 * more than one and it is a Source*, which its own table then contradicts — a
 * household whose every source is a garden has exactly one kind and calling
 * that group *Store* is the precise confusion this whole feature removes. The
 * table wins.
 *
 * An empty list is `Store`, which is what a household sees before it has
 * created anything and is the word `createHousehold` seeds three of.
 *
 * **Nothing else in this app renames itself**, so this is the exception, and it
 * earns it: the alternative is calling The Garden a store. It changes only when
 * you change the *list* — adding a grow source is a deliberate act inside the
 * editing panel, and the heading directly above your hands is what moves. That
 * is what separates it from a control that renames itself while you watch.
 */
export function sourceGroupWord(sources: readonly { kind: SourceKind }[]): 'Store' | 'Source' {
	return sources.some((s) => s.kind !== 'shop') ? 'Source' : 'Store';
}

/**
 * Every kind an item's sources cover, in band order, with no repeats.
 *
 * The card draws one glyph per kind — a cart, a sprout, a pot — so an item you
 * buy at Publix *and* pick from the garden carries both, which is the honest
 * answer to a question the tags below it cannot answer. A household can call a
 * grow source anything and colour it anything, so nothing about a tag says at a
 * glance that it is something you pick.
 *
 * **In band order — shop, grow, make — not the order the ids happen to be in.**
 * Two items with the same two sources must draw the same two glyphs in the same
 * two places, or a grid of cards has no rhythm to read across.
 *
 * **An item naming no source at all gets nothing**, and that is deliberate even
 * though such an item lands on the Buy band. D58's own table splits an empty
 * source three ways, and the first of them is *not set yet* — a gap. A cart
 * there would answer a question nobody has answered yet. The glyphs mirror the
 * tags: what is on the card is what is on the item.
 *
 * A `storeId` matching no source is skipped rather than counted: `id()` is not
 * a foreign key, so nothing in the database prevents one.
 */
export function itemSourceKinds(
	storeIds: readonly string[],
	sources: readonly { id: string; kind?: SourceKind }[]
): SourceKind[] {
	const found = new Set<SourceKind>();

	for (const source of sources) {
		if (storeIds.includes(source.id)) found.add(toSourceKind(source.kind));
	}

	return SOURCE_KINDS.filter((kind) => found.has(kind));
}

/** How a screen reader names each glyph, before the status word. */
export const SOURCE_KIND_ADJECTIVES: Record<SourceKind, string> = {
	shop: 'Bought',
	grow: 'Grown',
	make: 'Made',
};
