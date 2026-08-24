/**
 * Sample data a household starts from on its first sign-in. Once anything is
 * edited the live copy lives in localStorage; "Reset to sample data" in
 * Settings restores this.
 *
 * Quantities are strings here for the same reason they are strings everywhere
 * else: Zero has no numeric column type. See `shared/qty.ts`.
 */

import type { Item, ItemDraft, Term } from '../../shared/types';

export const seedCategories: Term[] = [
	{ name: 'Upright Freezer', icon: 'snowflake', ink: '#2C5A6E' },
	{ name: 'Chest Freezer', icon: 'snowflake', ink: '#2C5A6E' },
	{ name: 'Pantry', icon: 'package', ink: '#5B6B3F' },
];

export const seedTypes: Term[] = [
	{ name: 'Protein', icon: 'beef', ink: '#8C4A2F' },
	{ name: 'Produce', icon: 'carrot', ink: '#3C6B3C' },
	{ name: 'Grain', icon: 'wheat', ink: '#96631A' },
	{ name: 'Dairy', icon: 'milk', ink: '#2C5A6E' },
	{ name: 'Condiment', icon: 'droplet', ink: '#6B5B7A' },
	{ name: 'Baking', icon: 'cookie', ink: '#7A5230' },
	{ name: 'Snack', icon: 'popcorn', ink: '#8C2F6B' },
	{ name: 'Beverage', icon: 'coffee', ink: '#2F6B8C' },
	{ name: 'Spice', icon: 'flame', ink: '#8C2F2F' },
];

export const seedStores: Term[] = [
	{ name: 'Costco', ink: '#5B6B3F' },
	{ name: 'Publix', ink: '#2F6B8C' },
	{ name: 'Calfee Cattle', ink: '#8C2F2F' },
];

export const seedItems: Item[] = [
	// Pantry
	{ id: '1', name: 'Black Beans, canned', category: 'Pantry', types: ['Protein'], stores: ['Publix'], qty: '8', threshold: '3', notes: '' },
	{ id: '2', name: 'Rolled Oats', category: 'Pantry', types: ['Grain'], stores: ['Costco'], qty: '1', threshold: '1', notes: 'Buy the big tub next time, cheaper per oz.' },
	{ id: '3', name: 'Olive Oil', category: 'Pantry', types: ['Condiment'], stores: ['Costco'], qty: '2', threshold: '1', notes: '' },
	{ id: '4', name: 'White Rice', category: 'Pantry', types: ['Grain'], stores: ['Costco'], qty: '10', threshold: '2', notes: '' },
	{ id: '5', name: 'Peanut Butter', category: 'Pantry', types: ['Condiment'], stores: ['Publix'], qty: '1', threshold: '1', notes: '' },
	{ id: '6', name: 'Canned Diced Tomatoes', category: 'Pantry', types: ['Produce'], stores: ['Publix'], qty: '0', threshold: '2', notes: '' },
	{ id: '7', name: 'Spaghetti', category: 'Pantry', types: ['Grain'], stores: ['Publix'], qty: '5', threshold: '2', notes: '' },
	{ id: '8', name: 'Shelf-Stable Milk', category: 'Pantry', types: ['Dairy'], stores: [], qty: '1', threshold: '1', notes: '' },
	{ id: '9', name: 'Ground Cinnamon', category: 'Pantry', types: ['Spice', 'Baking'], stores: ['Costco'], qty: '1', threshold: '1', notes: '' },
	{ id: '10', name: 'Sparkling Water, 12-pack', category: 'Pantry', types: ['Beverage'], stores: ['Costco'], qty: '2', threshold: '1', notes: '' },
	// Upright Freezer
	{ id: '11', name: 'Chicken Thighs', category: 'Upright Freezer', types: ['Protein'], stores: ['Publix'], qty: '1', threshold: '2', notes: '' },
	{ id: '12', name: 'Ice Cream', category: 'Upright Freezer', types: ['Snack', 'Dairy'], stores: ['Costco'], qty: '3', threshold: '1', notes: '' },
	{ id: '13', name: 'Frozen Waffles', category: 'Upright Freezer', types: ['Grain'], stores: ['Costco'], qty: '2', threshold: '1', notes: '' },
	{ id: '14', name: 'Shrimp, frozen bag', category: 'Upright Freezer', types: ['Protein'], stores: ['Publix'], qty: '0', threshold: '1', notes: '' },
	{ id: '15', name: 'Frozen Mixed Berries', category: 'Upright Freezer', types: ['Produce'], stores: ['Costco'], qty: '4', threshold: '1', notes: '' },
	{ id: '16', name: 'Breakfast Sausage', category: 'Upright Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: '2', threshold: '1', notes: '' },
	{ id: '17', name: 'Frozen Pizza', category: 'Upright Freezer', types: ['Snack', 'Grain'], stores: ['Publix'], qty: '1', threshold: '1', notes: '' },
	// Chest Freezer
	{ id: '18', name: 'Ground Beef (1lb pkgs)', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: '6', threshold: '2', notes: '80/20 blend, from the co-op order.' },
	{ id: '19', name: 'Ribeye Steaks', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: '4', threshold: '2', notes: '' },
	{ id: '20', name: 'Frozen Peas', category: 'Chest Freezer', types: ['Produce'], stores: ['Publix'], qty: '0', threshold: '1', notes: '' },
	{ id: '21', name: 'Pork Chops', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: '3', threshold: '2', notes: '' },
	{ id: '22', name: 'Chicken Stock, quart bags', category: 'Chest Freezer', types: ['Condiment', 'Protein'], stores: [], qty: '2', threshold: '1', notes: '' },
	{ id: '23', name: 'Ground Turkey', category: 'Chest Freezer', types: ['Protein'], stores: ['Publix'], qty: '1', threshold: '2', notes: '' },
	{ id: '24', name: 'Sweet Corn, frozen', category: 'Chest Freezer', types: ['Produce'], stores: ['Costco'], qty: '5', threshold: '2', notes: '' },
];

export const emptyItem: ItemDraft = {
	name: '', category: '', types: [], stores: [], qty: '1', threshold: '1', notes: '',
};
