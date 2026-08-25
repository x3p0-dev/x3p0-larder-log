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
	icon?: string;
};

export const SEED_LOCATIONS: SeedTerm[] = [
	{ name: 'Upright Freezer', icon: 'snowflake', ink: 'color-1' },
	{ name: 'Chest Freezer', icon: 'snowflake', ink: 'color-12' },
	{ name: 'Pantry', icon: 'package', ink: 'color-10' },
];

export const SEED_TYPES: SeedTerm[] = [
	{ name: 'Protein', icon: 'beef', ink: 'color-6' },
	{ name: 'Produce', icon: 'carrot', ink: 'color-10' },
	{ name: 'Grain', icon: 'wheat', ink: 'color-8' },
	{ name: 'Dairy', icon: 'milk', ink: 'color-1' },
	{ name: 'Condiment', icon: 'droplet', ink: 'color-4' },
	{ name: 'Baking', icon: 'cookie', ink: 'color-7' },
	{ name: 'Snack', icon: 'popcorn', ink: 'color-14' },
	{ name: 'Beverage', icon: 'coffee', ink: 'color-12' },
	{ name: 'Spice', icon: 'flame', ink: 'color-5' },
];

export const SEED_STORES: SeedTerm[] = [
	{ name: 'Costco', ink: 'color-10' },
	{ name: 'Publix', ink: 'color-1' },
	{ name: 'Calfee Cattle', ink: 'color-6' },
];
