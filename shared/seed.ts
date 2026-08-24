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

export type SeedTerm = {
	name: string;
	ink: string;
	icon?: string;
};

export const SEED_LOCATIONS: SeedTerm[] = [
	{ name: 'Upright Freezer', icon: 'snowflake', ink: '#2c5a6e' },
	{ name: 'Chest Freezer', icon: 'snowflake', ink: '#2c5a6e' },
	{ name: 'Pantry', icon: 'package', ink: '#5b6b3f' },
];

export const SEED_TYPES: SeedTerm[] = [
	{ name: 'Protein', icon: 'beef', ink: '#8c4a2f' },
	{ name: 'Produce', icon: 'carrot', ink: '#3c6b3c' },
	{ name: 'Grain', icon: 'wheat', ink: '#96631a' },
	{ name: 'Dairy', icon: 'milk', ink: '#2c5a6e' },
	{ name: 'Condiment', icon: 'droplet', ink: '#6b5b7a' },
	{ name: 'Baking', icon: 'cookie', ink: '#7a5230' },
	{ name: 'Snack', icon: 'popcorn', ink: '#8c2f6b' },
	{ name: 'Beverage', icon: 'coffee', ink: '#2f6b8c' },
	{ name: 'Spice', icon: 'flame', ink: '#8c2f2f' },
];

export const SEED_STORES: SeedTerm[] = [
	{ name: 'Costco', ink: '#5b6b3f' },
	{ name: 'Publix', ink: '#2f6b8c' },
	{ name: 'Calfee Cattle', ink: '#8c2f2f' },
];
