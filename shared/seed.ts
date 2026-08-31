import type { SourceKind } from './source';

/**
 * The taxonomies a brand-new household starts with.
 *
 * These are seeded **server-side** by `createHousehold`, because a household
 * with no locations cannot hold an item at all: `items.locationId` is required,
 * there are no nullable fields, and D16 refuses to delete the last location
 * anything references. An empty household would be a dead end.
 *
 * Sample *items* are deliberately not seeded. Under localStorage they were free
 * — "Reset to sample data" wiped them — but in a shared database they are fake
 * inventory that someone has to delete a row at a time.
 *
 * Locations and shops are generic on purpose. The sample dataset's Meat
 * Freezer, Calfee Cattle and Publix are one household's vocabulary, not a
 * default — a new household should recognise its own shelves in these, and
 * rename them rather than delete them.
 *
 * **The sources are the one group that is answered rather than assumed**
 * (D61). Locations and types are seeded the same way for everybody, because a
 * shelf and a kind of food are the same questions in every kitchen. Where the
 * food comes from is not: the creation card asks, and `seedSourcesFor` turns
 * the three ticks into the list. Buy alone is the default and is exactly what
 * this file seeded before the question existed.
 *
 * **Types are seeded for coverage, not for taste** (D50). A location is a
 * shelf you name yourself and a store is where *you* shop, but a type is a
 * kind of food, and those are the same in every kitchen. So the list is long
 * enough that adding the first twenty items needs no new types at all: fifteen
 * that between them hold a supermarket. Renaming a type you would have worded
 * differently costs one edit; discovering mid-add that there is nowhere to put
 * canned tomatoes costs a detour through a composer.
 */

/** `ink` is a color token from `shared/palette.ts`, not a hex. */
export type SeedTerm = {
	name: string;
	ink: string;
};

export const SEED_LOCATIONS: SeedTerm[] = [
	{ name: 'Pantry', ink: 'color-10' },
	{ name: 'Refrigerator', ink: 'color-1' },
	{ name: 'Freezer', ink: 'color-12' },
];

/*
 * Fifteen, in the order they were reasoned about rather than the order they
 * render — the app sorts terms A–Z (D44), so this order is never seen.
 *
 * The test each one had to pass: *would a real household hold two or more
 * things that fit here and fit nowhere else?* That is what keeps `Oils &
 * Vinegars` (five bottles that are a stretch under *Condiments*) and drops
 * `Sweets` (cookies and candy are snacks), `Soups` (canned), `Deli`, `Baby`
 * and `Pet`.
 *
 * **`Dry Goods` is the fifteenth, added 2026-08-31**, and it is the bulk
 * shelf: dried beans and lentils, nuts and seeds bought by the bag, dried
 * fruit — the things that are neither a *grain* (rice, pasta, oats) nor a
 * *baking* ingredient (flour, sugar, leaveners) and had nowhere else to go.
 * Lentils passed D50's own test on the first pass and were put in `Grains`
 * because that was the closest thing there was. **Grains, Baking and Canned
 * Goods keep everything they already held** — this is the gap beside them, not
 * a rename of any of them, and an item can carry two types where the line is
 * genuinely blurred (a 5lb sack of rice is a grain *and* a dry good).
 *
 * `Frozen Meals` is a kind of food and not a repeat of the Freezer *location*:
 * meat, frozen vegetables and ice cream all live in a freezer and all belong
 * somewhere else on this list. What is left — pizza, burritos, dinners — has
 * nowhere else to go.
 *
 * **One token is left unused now, `color-16`** — it was two until `Dry Goods`
 * spent `color-11`, and the reason for keeping any is unchanged:
 * `proposeColor()` hands out the first unused token and falls back to
 * `color-1` once they are all spoken for, so a household whose own first type
 * arrived wearing Produce's olive would be the app's fault. **Spending the last
 * one is a decision, not a list edit** — a sixteenth seeded type takes the
 * headroom to nothing.
 */
export const SEED_TYPES: SeedTerm[] = [
	{ name: 'Produce', ink: 'color-10' },
	{ name: 'Dairy', ink: 'color-1' },
	{ name: 'Meat', ink: 'color-6' },
	{ name: 'Baked Goods', ink: 'color-15' },
	{ name: 'Grains', ink: 'color-8' },
	{ name: 'Canned Goods', ink: 'color-2' },
	{ name: 'Condiments', ink: 'color-4' },
	{ name: 'Oils & Vinegars', ink: 'color-9' },
	{ name: 'Spices', ink: 'color-5' },
	{ name: 'Baking', ink: 'color-7' },
	{ name: 'Breakfast', ink: 'color-3' },
	{ name: 'Snacks', ink: 'color-14' },
	{ name: 'Beverages', ink: 'color-12' },
	{ name: 'Frozen Meals', ink: 'color-13' },
	{ name: 'Dry Goods', ink: 'color-11' },
];

/**
 * A seeded source, which is a term plus the kind that decides its band (D58).
 *
 * The shops carry `kind: 'shop'` explicitly rather than leaning on
 * `toSourceKind`'s fallback. An absent value resolves to a shop and would work,
 * but this table is read beside `SEED_GROW` and `SEED_MAKE`, and a row that
 * states its kind next to two rows that state theirs is one less thing to
 * reason about.
 */
export type SeedSource = SeedTerm & { kind: SourceKind };

/**
 * The shops, seeded only when the household says it buys anything (D61).
 *
 * Generic on purpose, the same rule the locations follow: *Grocery*,
 * *Warehouse* and *Market* are shapes of shop rather than one household's
 * vocabulary, so a new household recognises its own in them and renames rather
 * than deletes.
 */
export const SEED_SHOPS: SeedSource[] = [
	{ name: 'Grocery', ink: 'color-2', kind: 'shop' },
	{ name: 'Warehouse', ink: 'color-9', kind: 'shop' },
	{ name: 'Market', ink: 'color-14', kind: 'shop' },
];

/*
 * The two non-shop sources, one each, and **no definite article**.
 *
 * *Garden*, not *The Garden*. Every other seeded term in this file is a bare
 * noun — Pantry, Refrigerator, Freezer, Grocery, Warehouse, Market — and a chip
 * reading *The Garden* beside one reading *Market* is one term written as a
 * phrase and the rest written as labels. It also keeps `householdLetter()`'s
 * article rule where it belongs: that exists because household names are
 * phrases people write, and a seeded term should never need it.
 *
 * Fern and mulberry are the design's own assignments, and neither collides
 * with a seeded shop. They spend nothing the types are saving: `proposeColor()`
 * walks the tokens a *group* has taken, and these are in the source group,
 * where five of sixteen leaves eleven for a household's own.
 */
export const SEED_GROW: SeedSource = { name: 'Garden', ink: 'color-11', kind: 'grow' };
export const SEED_MAKE: SeedSource = { name: 'Kitchen', ink: 'color-5', kind: 'make' };

/**
 * What the household said about where its food comes from, asked once, on the
 * creation card (D61).
 *
 * Three independent ticks rather than one choice: a household that grows
 * tomatoes still buys flour, so these are not exclusive and there is no
 * "mostly" to pick. It is the one thing about a new household the app cannot
 * infer and would otherwise never ask.
 */
export type SourceMix = {
	buy: boolean;
	grow: boolean;
	make: boolean;
};

/**
 * Buy on, grow and make off — exactly the household that existed before the
 * question did.
 *
 * That is what lets the card stay one screen: someone who reads none of the
 * three rows and presses Enter gets what they would have got anyway.
 */
export const DEFAULT_SOURCE_MIX: SourceMix = { buy: true, grow: false, make: false };

/**
 * What the server is willing to believe about a mix a client sent it.
 *
 * **An absent mix and an empty one are different answers, and the distinction
 * is load-bearing.** `undefined` is a caller that never asked the question —
 * an older client, or a code path that predates it — and takes the default.
 * `{}` and `{ buy: false, grow: false, make: false }` are somebody unticking
 * all three, which is a real answer meaning *seed no sources at all*. Treating
 * the two alike would either force shops on a household that refused them or
 * silently drop the seed for every caller that omitted the argument.
 *
 * Every field is compared against `true` rather than coerced, so a string, a
 * number or a missing key all read as *not ticked* instead of as truthy.
 */
export function toSourceMix(value: unknown): SourceMix {
	if (value === undefined || value === null) return DEFAULT_SOURCE_MIX;
	if (typeof value !== 'object') return DEFAULT_SOURCE_MIX;

	const raw = value as Record<string, unknown>;

	return {
		buy: raw.buy === true,
		grow: raw.grow === true,
		make: raw.make === true,
	};
}

/**
 * The sources a mix seeds, in band order.
 *
 * Order is not visible — the `pantry` query sorts every taxonomy A–Z (D44) —
 * so this is shop, grow, make because that is the order the run list's bands
 * come in and the order the three rows are drawn in, not because anything
 * renders it.
 *
 * **An empty answer returns an empty list, and that is allowed.** Unlike the
 * locations, a household with no sources is not a dead end: `storeId` is a
 * join table rather than a required column, so an item can name none. It is
 * the one taxonomy that can start empty.
 */
export function seedSourcesFor(mix: SourceMix): SeedSource[] {
	const sources: SeedSource[] = [];

	if (mix.buy) sources.push(...SEED_SHOPS);
	if (mix.grow) sources.push(SEED_GROW);
	if (mix.make) sources.push(SEED_MAKE);

	return sources;
}
