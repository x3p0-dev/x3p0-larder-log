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
 * Locations and stores are generic on purpose. The sample dataset's Meat
 * Freezer, Calfee Cattle and Publix are one household's vocabulary, not a
 * default — a new household should recognise its own shelves in these, and
 * rename them rather than delete them.
 *
 * **Types are seeded for coverage, not for taste** (D50). A location is a
 * shelf you name yourself and a store is where *you* shop, but a type is a
 * kind of food, and those are the same in every kitchen. So the list is long
 * enough that adding the first twenty items needs no new types at all: fourteen
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
 * Fourteen, in the order they were reasoned about rather than the order they
 * render — the app sorts terms A–Z (D44), so this order is never seen.
 *
 * The test each one had to pass: *would a real household hold two or more
 * things that fit here and fit nowhere else?* That is what keeps `Oils &
 * Vinegars` (five bottles that are a stretch under *Condiments*) and drops
 * `Sweets` (cookies and candy are snacks), `Soups` (canned), `Deli`, `Baby`
 * and `Pet`.
 *
 * `Frozen Meals` is a kind of food and not a repeat of the Freezer *location*:
 * meat, frozen vegetables and ice cream all live in a freezer and all belong
 * somewhere else on this list. What is left — pizza, burritos, dinners — has
 * nowhere else to go.
 *
 * Two tokens are deliberately left unused, `color-11` and `color-16`, so the
 * first two types a household adds still arrive in a colour of their own:
 * `proposeColor()` hands out the first unused token and falls back to
 * `color-1` once they are all spoken for.
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
];

export const SEED_STORES: SeedTerm[] = [
	{ name: 'Grocery', ink: 'color-2' },
	{ name: 'Warehouse', ink: 'color-9' },
	{ name: 'Market', ink: 'color-14' },
];
