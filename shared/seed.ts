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
 */

/** `ink` is a color token from `shared/palette.ts`, not a hex. */
export type SeedTerm = {
	name: string;
	ink: string;
};

export const SEED_LOCATIONS: SeedTerm[] = [
	{ name: 'Upright Freezer', ink: 'color-1' },
	{ name: 'Chest Freezer', ink: 'color-12' },
	{ name: 'Pantry', ink: 'color-10' },
];

export const SEED_TYPES: SeedTerm[] = [
	{ name: 'Protein', ink: 'color-6' },
	{ name: 'Produce', ink: 'color-10' },
	{ name: 'Grain', ink: 'color-8' },
	{ name: 'Dairy', ink: 'color-1' },
	{ name: 'Condiment', ink: 'color-4' },
	{ name: 'Baking', ink: 'color-7' },
	{ name: 'Snack', ink: 'color-14' },
	{ name: 'Beverage', ink: 'color-12' },
	{ name: 'Spice', ink: 'color-5' },
];

export const SEED_STORES: SeedTerm[] = [
	{ name: 'Costco', ink: 'color-10' },
	{ name: 'Publix', ink: 'color-1' },
	{ name: 'Calfee Cattle', ink: 'color-6' },
];
