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
 * rename them rather than delete them. Types keep the assignments from the
 * spec's *Term colours* table, which were already generic.
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

export const SEED_TYPES: SeedTerm[] = [
	{ name: 'Produce', ink: 'color-10' },
	{ name: 'Dairy', ink: 'color-1' },
	{ name: 'Protein', ink: 'color-6' },
	{ name: 'Grain', ink: 'color-8' },
	{ name: 'Condiment', ink: 'color-4' },
	{ name: 'Beverage', ink: 'color-12' },
	{ name: 'Snack', ink: 'color-14' },
	{ name: 'Baking', ink: 'color-7' },
	{ name: 'Spice', ink: 'color-5' },
];

export const SEED_STORES: SeedTerm[] = [
	{ name: 'Grocery', ink: 'color-2' },
	{ name: 'Warehouse', ink: 'color-9' },
	{ name: 'Market', ink: 'color-14' },
];
