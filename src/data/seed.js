/**
 * Sample data the app starts from on a first run. Once anything is edited the
 * live copy lives in localStorage; "Reset to sample data" in Settings restores
 * this.
 */

export const seedCategories = [
	{ name: 'Upright Freezer', icon: 'snowflake', ink: '#2C5A6E' },
	{ name: 'Chest Freezer', icon: 'snowflake', ink: '#2C5A6E' },
	{ name: 'Pantry', icon: 'package', ink: '#5B6B3F' },
];

export const seedTypes = [
	{ name: 'Protein', ink: '#8C4A2F', icon: 'beef' },
	{ name: 'Produce', ink: '#3C6B3C', icon: 'carrot' },
	{ name: 'Grain', ink: '#96631A', icon: 'wheat' },
	{ name: 'Dairy', ink: '#2C5A6E', icon: 'milk' },
	{ name: 'Condiment', ink: '#6B5B7A', icon: 'droplet' },
	{ name: 'Baking', ink: '#7A5230', icon: 'cookie' },
	{ name: 'Snack', ink: '#8C2F6B', icon: 'popcorn' },
	{ name: 'Beverage', ink: '#2F6B8C', icon: 'coffee' },
	{ name: 'Spice', ink: '#8C2F2F', icon: 'flame' },
];

export const seedStores = [
	{ name: 'Costco', ink: '#5B6B3F' },
	{ name: 'Publix', ink: '#2F6B8C' },
	{ name: 'Calfee Cattle', ink: '#8C2F2F' },
];

export const seedItems = [
	// Pantry
	{ id: 1, name: 'Black Beans, canned', category: 'Pantry', types: ['Protein'], stores: ['Publix'], qty: 8, threshold: 3, notes: '', open: false },
	{ id: 2, name: 'Rolled Oats', category: 'Pantry', types: ['Grain'], stores: ['Costco'], qty: 1, threshold: 1, notes: 'Buy the big tub next time, cheaper per oz.', open: false },
	{ id: 3, name: 'Olive Oil', category: 'Pantry', types: ['Condiment'], stores: ['Costco'], qty: 2, threshold: 1, notes: '', open: false },
	{ id: 4, name: 'White Rice', category: 'Pantry', types: ['Grain'], stores: ['Costco'], qty: 10, threshold: 2, notes: '', open: false },
	{ id: 5, name: 'Peanut Butter', category: 'Pantry', types: ['Condiment'], stores: ['Publix'], qty: 1, threshold: 1, notes: '', open: false },
	{ id: 6, name: 'Canned Diced Tomatoes', category: 'Pantry', types: ['Produce'], stores: ['Publix'], qty: 0, threshold: 2, notes: '', open: false },
	{ id: 7, name: 'Spaghetti', category: 'Pantry', types: ['Grain'], stores: ['Publix'], qty: 5, threshold: 2, notes: '', open: false },
	{ id: 8, name: 'Shelf-Stable Milk', category: 'Pantry', types: ['Dairy'], stores: [], qty: 1, threshold: 1, notes: '', open: false },
	{ id: 9, name: 'Ground Cinnamon', category: 'Pantry', types: ['Spice', 'Baking'], stores: ['Costco'], qty: 1, threshold: 1, notes: '', open: false },
	{ id: 10, name: 'Sparkling Water, 12-pack', category: 'Pantry', types: ['Beverage'], stores: ['Costco'], qty: 2, threshold: 1, notes: '', open: false },
	// Upright Freezer
	{ id: 11, name: 'Chicken Thighs', category: 'Upright Freezer', types: ['Protein'], stores: ['Publix'], qty: 1, threshold: 2, notes: '', open: false },
	{ id: 12, name: 'Ice Cream', category: 'Upright Freezer', types: ['Snack', 'Dairy'], stores: ['Costco'], qty: 3, threshold: 1, notes: '', open: false },
	{ id: 13, name: 'Frozen Waffles', category: 'Upright Freezer', types: ['Grain'], stores: ['Costco'], qty: 2, threshold: 1, notes: '', open: false },
	{ id: 14, name: 'Shrimp, frozen bag', category: 'Upright Freezer', types: ['Protein'], stores: ['Publix'], qty: 0, threshold: 1, notes: '', open: false },
	{ id: 15, name: 'Frozen Mixed Berries', category: 'Upright Freezer', types: ['Produce'], stores: ['Costco'], qty: 4, threshold: 1, notes: '', open: false },
	{ id: 16, name: 'Breakfast Sausage', category: 'Upright Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: 2, threshold: 1, notes: '', open: false },
	{ id: 17, name: 'Frozen Pizza', category: 'Upright Freezer', types: ['Snack', 'Grain'], stores: ['Publix'], qty: 1, threshold: 1, notes: '', open: false },
	// Chest Freezer
	{ id: 18, name: 'Ground Beef (1lb pkgs)', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: 6, threshold: 2, notes: '80/20 blend, from the co-op order.', open: false },
	{ id: 19, name: 'Ribeye Steaks', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: 4, threshold: 2, notes: '', open: false },
	{ id: 20, name: 'Frozen Peas', category: 'Chest Freezer', types: ['Produce'], stores: ['Publix'], qty: 0, threshold: 1, notes: '', open: false },
	{ id: 21, name: 'Pork Chops', category: 'Chest Freezer', types: ['Protein'], stores: ['Calfee Cattle'], qty: 3, threshold: 2, notes: '', open: false },
	{ id: 22, name: 'Chicken Stock, quart bags', category: 'Chest Freezer', types: ['Condiment', 'Protein'], stores: [], qty: 2, threshold: 1, notes: '', open: false },
	{ id: 23, name: 'Ground Turkey', category: 'Chest Freezer', types: ['Protein'], stores: ['Publix'], qty: 1, threshold: 2, notes: '', open: false },
	{ id: 24, name: 'Sweet Corn, frozen', category: 'Chest Freezer', types: ['Produce'], stores: ['Costco'], qty: 5, threshold: 2, notes: '', open: false },
];

export const emptyItem = { name: '', category: '', types: [], stores: [], qty: 1, threshold: 1, notes: '' };
