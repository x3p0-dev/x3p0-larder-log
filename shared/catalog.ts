/**
 * The built-in grocery catalog — the `COMMON ITEMS` group under the name field.
 *
 * **A word, a type and a shelf.** A catalog row used to be a bare string, and
 * picking one filled the name and left you to answer two questions the app
 * could already answer for you: *Half and Half* is Dairy and it goes in the
 * refrigerator, in every household there has ever been. Those two are the same
 * everywhere for the same reason D50 gives for seeding types at all — a kind of
 * food and a cold shelf are not one household's vocabulary.
 *
 * **There is deliberately no source.** Where you buy a thing *is* one
 * household's vocabulary (D40), the seeded shops are shapes rather than shops,
 * and a household that ticked *grow* on the creation card may not buy it at
 * all. Guessing there would be the app inventing an answer, which is what D48
 * settled about names.
 *
 * **Both are matched by name, exactly and case-insensitively, against the
 * household's own terms.** A household that renamed *Dairy* to *Dairy & Eggs*
 * gets no type filled rather than a wrong one — absent rather than wrong, which
 * is D30's instinct applied to a value instead of a control. Nothing here
 * creates a term: a catalog pick can only ever select one that already exists.
 *
 * Four things about the list are open and are written down in `autofill.md`
 * rather than solved here, because each is a decision rather than a list edit:
 *
 * - **Where it comes from.** This is hand-written. There is no source, no
 *   licence and no update path.
 * - **Locale.** It is US-centric — *Cilantro*, *Graham Crackers*, *Half and
 *   Half* — and a US list in a household that shops elsewhere is worse than no
 *   list at all.
 * - **Plurals.** Written as a shopper would say them, so *Eggs* and *Butter*
 *   sit in one list under two different rules.
 * - **It does not learn.** Adding *Gochujang* three times never puts it here,
 *   and every household starts from the same words. Making it learn makes it
 *   household data, which is a schema change and a different design.
 * - **Nothing here is a synonym of anything else, except where it is.**
 *   *Garbanzo Beans* and *Chickpeas* are one bean under the two names US cans
 *   actually print, so both are rows — somebody typing either has to find
 *   something. The cost is that picking one and picking the other produce two
 *   different items, which is the same hazard as picking *Berries* versus
 *   typing *berries*. It is on the record rather than solved: a real answer
 *   needs the catalog to carry aliases that resolve to one entry, and that is a
 *   shape change rather than a list edit.
 *
 * **A bean is sold two ways, so it is two rows.** The bare name is the prepared
 * one — a can, which is what most households buy — and `<Bean>, Dry` is the bag
 * on the bulk shelf. They are genuinely different things to keep: one is
 * `Canned Goods` in the cupboard and the other is `Dry Goods`, they run out
 * independently, and the sizes are not comparable. **The suffix is not
 * decoration** — the comma is a word separator to `matchAt`, so typing `dry`
 * lists the bulk shelf and typing `kidney` finds both forms of the bean.
 *
 * A–Z, because the suggestion ranking sorts by where the match lands and then
 * by name — so this file's own order is only ever a tie-break, and alphabetical
 * is the order that makes a duplicate obvious while editing it.
 */

/** A row of the catalog. `type` and `place` are seeded **names**, or `''`. */
export type CatalogItem = {
	name: string;
	/**
	 * A seeded type's name from `SEED_TYPES`, or `''` where nothing fits.
	 *
	 * `''` is a real answer and not a gap — *Ice* is a thing households track
	 * and is not a kind of food.
	 */
	type: string;
	/**
	 * A seeded location's name from `SEED_LOCATIONS`, or `''`.
	 *
	 * Only the cold shelves are worth asserting. **Everything shelf-stable is
	 * `Pantry`**, which is the seeded name for *the cupboard* — a household that
	 * renamed it to *Larder* gets nothing filled, which is the intended failure.
	 */
	place: string;
};

const P = 'Pantry';
const R = 'Refrigerator';
const F = 'Freezer';

export const GROCERY_CATALOG: readonly CatalogItem[] = [
	{ name: 'All-Purpose Flour', type: 'Baking', place: P },
	{ name: 'Almond Butter', type: 'Condiments', place: P },
	{ name: 'Almond Milk', type: 'Dairy', place: R },
	{ name: 'Almonds', type: 'Dry Goods', place: P },
	{ name: 'Aluminum Foil', type: '', place: P },
	{ name: 'Apple Cider Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Apple Juice', type: 'Beverages', place: P },
	{ name: 'Apples', type: 'Produce', place: R },
	{ name: 'Applesauce', type: 'Canned Goods', place: P },
	{ name: 'Apricots', type: 'Produce', place: R },
	{ name: 'Artichoke Hearts', type: 'Canned Goods', place: P },
	{ name: 'Arugula', type: 'Produce', place: R },
	{ name: 'Asparagus', type: 'Produce', place: R },
	{ name: 'Avocados', type: 'Produce', place: R },
	{ name: 'Bacon', type: 'Meat', place: R },
	{ name: 'Bagels', type: 'Baked Goods', place: P },
	{ name: 'Baguette', type: 'Baked Goods', place: P },
	{ name: 'Baking Powder', type: 'Baking', place: P },
	{ name: 'Baking Soda', type: 'Baking', place: P },
	{ name: 'Balsamic Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Bananas', type: 'Produce', place: P },
	{ name: 'Barbecue Sauce', type: 'Condiments', place: P },
	{ name: 'Barley', type: 'Grains', place: P },
	{ name: 'Basil', type: 'Produce', place: R },
	{ name: 'Basmati Rice', type: 'Grains', place: P },
	{ name: 'Bay Leaves', type: 'Spices', place: P },
	{ name: 'Beef Broth', type: 'Canned Goods', place: P },
	{ name: 'Beef Roast', type: 'Meat', place: F },
	{ name: 'Beets', type: 'Produce', place: R },
	{ name: 'Bell Peppers', type: 'Produce', place: R },
	{ name: 'Berries', type: 'Produce', place: R },
	{ name: 'Black Beans', type: 'Canned Goods', place: P },
	{ name: 'Black Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Black Pepper', type: 'Spices', place: P },
	{ name: 'Black Tea', type: 'Beverages', place: P },
	{ name: 'Black-Eyed Peas', type: 'Canned Goods', place: P },
	{ name: 'Black-Eyed Peas, Dry', type: 'Dry Goods', place: P },
	{ name: 'Blueberries', type: 'Produce', place: R },
	{ name: 'Bread', type: 'Baked Goods', place: P },
	{ name: 'Bread Crumbs', type: 'Baking', place: P },
	{ name: 'Broccoli', type: 'Produce', place: R },
	{ name: 'Brown Rice', type: 'Grains', place: P },
	{ name: 'Brown Sugar', type: 'Baking', place: P },
	{ name: 'Brussels Sprouts', type: 'Produce', place: R },
	{ name: 'Buns', type: 'Baked Goods', place: P },
	{ name: 'Butter', type: 'Dairy', place: R },
	{ name: 'Butter Beans', type: 'Canned Goods', place: P },
	{ name: 'Butter Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Buttermilk', type: 'Dairy', place: R },
	{ name: 'Cabbage', type: 'Produce', place: R },
	{ name: 'Canned Chicken', type: 'Canned Goods', place: P },
	{ name: 'Canned Corn', type: 'Canned Goods', place: P },
	{ name: 'Canned Peaches', type: 'Canned Goods', place: P },
	{ name: 'Canned Tomatoes', type: 'Canned Goods', place: P },
	{ name: 'Cannellini Beans', type: 'Canned Goods', place: P },
	{ name: 'Cannellini Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Canola Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Cantaloupe', type: 'Produce', place: R },
	{ name: 'Capers', type: 'Condiments', place: P },
	{ name: 'Carrots', type: 'Produce', place: R },
	{ name: 'Cashews', type: 'Dry Goods', place: P },
	{ name: 'Cauliflower', type: 'Produce', place: R },
	{ name: 'Cayenne Pepper', type: 'Spices', place: P },
	{ name: 'Celery', type: 'Produce', place: R },
	{ name: 'Cereal', type: 'Breakfast', place: P },
	{ name: 'Cheddar Cheese', type: 'Dairy', place: R },
	{ name: 'Cherries', type: 'Produce', place: R },
	{ name: 'Chia Seeds', type: 'Dry Goods', place: P },
	{ name: 'Chicken Breast', type: 'Meat', place: F },
	{ name: 'Chicken Broth', type: 'Canned Goods', place: P },
	{ name: 'Chicken Thighs', type: 'Meat', place: F },
	{ name: 'Chickpeas', type: 'Canned Goods', place: P },
	{ name: 'Chickpeas, Dry', type: 'Dry Goods', place: P },
	{ name: 'Chili Powder', type: 'Spices', place: P },
	{ name: 'Chocolate Chips', type: 'Baking', place: P },
	{ name: 'Cilantro', type: 'Produce', place: R },
	{ name: 'Cinnamon', type: 'Spices', place: P },
	{ name: 'Cocoa Powder', type: 'Baking', place: P },
	{ name: 'Coconut Milk', type: 'Canned Goods', place: P },
	{ name: 'Coconut Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Coffee', type: 'Beverages', place: P },
	{ name: 'Coffee Creamer', type: 'Dairy', place: R },
	{ name: 'Cooking Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Cooking Spray', type: 'Oils & Vinegars', place: P },
	{ name: 'Corn Tortillas', type: 'Baked Goods', place: P },
	{ name: 'Cornmeal', type: 'Baking', place: P },
	{ name: 'Cornstarch', type: 'Baking', place: P },
	{ name: 'Cottage Cheese', type: 'Dairy', place: R },
	{ name: 'Couscous', type: 'Grains', place: P },
	{ name: 'Crackers', type: 'Snacks', place: P },
	{ name: 'Cranberries', type: 'Produce', place: R },
	{ name: 'Cream Cheese', type: 'Dairy', place: R },
	{ name: 'Croutons', type: 'Snacks', place: P },
	{ name: 'Cucumbers', type: 'Produce', place: R },
	{ name: 'Cumin', type: 'Spices', place: P },
	{ name: 'Dates', type: 'Dry Goods', place: P },
	{ name: 'Deli Turkey', type: 'Meat', place: R },
	{ name: 'Dijon Mustard', type: 'Condiments', place: R },
	{ name: 'Dish Soap', type: '', place: P },
	{ name: 'Dried Cranberries', type: 'Dry Goods', place: P },
	{ name: 'Dried Oregano', type: 'Spices', place: P },
	{ name: 'Egg Noodles', type: 'Grains', place: P },
	{ name: 'Eggplant', type: 'Produce', place: R },
	{ name: 'Eggs', type: 'Dairy', place: R },
	{ name: 'English Muffins', type: 'Baked Goods', place: P },
	{ name: 'Espresso Beans', type: 'Beverages', place: P },
	{ name: 'Fava Beans', type: 'Canned Goods', place: P },
	{ name: 'Fava Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Feta Cheese', type: 'Dairy', place: R },
	{ name: 'Fish Sticks', type: 'Frozen Meals', place: F },
	{ name: 'Flour Tortillas', type: 'Baked Goods', place: P },
	{ name: 'Frozen Berries', type: 'Produce', place: F },
	{ name: 'Frozen Broccoli', type: 'Produce', place: F },
	{ name: 'Frozen Burritos', type: 'Frozen Meals', place: F },
	{ name: 'Frozen Corn', type: 'Produce', place: F },
	{ name: 'Frozen Peas', type: 'Produce', place: F },
	{ name: 'Frozen Pizza', type: 'Frozen Meals', place: F },
	{ name: 'Frozen Waffles', type: 'Breakfast', place: F },
	{ name: 'Garbanzo Beans', type: 'Canned Goods', place: P },
	{ name: 'Garbanzo Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Garlic', type: 'Produce', place: P },
	{ name: 'Garlic Powder', type: 'Spices', place: P },
	{ name: 'Ginger', type: 'Produce', place: R },
	{ name: 'Goldfish Crackers', type: 'Snacks', place: P },
	{ name: 'Graham Crackers', type: 'Snacks', place: P },
	{ name: 'Granola', type: 'Breakfast', place: P },
	{ name: 'Granola Bars', type: 'Snacks', place: P },
	{ name: 'Grape Jelly', type: 'Condiments', place: P },
	{ name: 'Grapefruit', type: 'Produce', place: R },
	{ name: 'Grapes', type: 'Produce', place: R },
	{ name: 'Great Northern Beans', type: 'Canned Goods', place: P },
	{ name: 'Great Northern Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Greek Yogurt', type: 'Dairy', place: R },
	{ name: 'Green Beans', type: 'Produce', place: R },
	{ name: 'Green Onions', type: 'Produce', place: R },
	{ name: 'Green Tea', type: 'Beverages', place: P },
	{ name: 'Ground Beef', type: 'Meat', place: F },
	{ name: 'Ground Pork', type: 'Meat', place: F },
	{ name: 'Ground Turkey', type: 'Meat', place: F },
	{ name: 'Half and Half', type: 'Dairy', place: R },
	{ name: 'Ham', type: 'Meat', place: R },
	{ name: 'Hamburger Buns', type: 'Baked Goods', place: P },
	{ name: 'Hash Browns', type: 'Breakfast', place: F },
	{ name: 'Heavy Cream', type: 'Dairy', place: R },
	{ name: 'Honey', type: 'Condiments', place: P },
	{ name: 'Hot Dogs', type: 'Meat', place: R },
	{ name: 'Hot Sauce', type: 'Condiments', place: P },
	{ name: 'Hummus', type: 'Condiments', place: R },
	{ name: 'Ice', type: '', place: F },
	{ name: 'Ice Cream', type: 'Frozen Meals', place: F },
	{ name: 'Italian Sausage', type: 'Meat', place: F },
	{ name: 'Jam', type: 'Condiments', place: P },
	{ name: 'Jasmine Rice', type: 'Grains', place: P },
	{ name: 'Ketchup', type: 'Condiments', place: R },
	{ name: 'Kidney Beans', type: 'Canned Goods', place: P },
	{ name: 'Kidney Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Kosher Salt', type: 'Spices', place: P },
	{ name: 'Lemons', type: 'Produce', place: R },
	{ name: 'Lentils', type: 'Dry Goods', place: P },
	{ name: 'Lettuce', type: 'Produce', place: R },
	{ name: 'Lima Beans', type: 'Canned Goods', place: P },
	{ name: 'Lima Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Limes', type: 'Produce', place: R },
	{ name: 'Macaroni', type: 'Grains', place: P },
	{ name: 'Maple Syrup', type: 'Condiments', place: P },
	{ name: 'Marinara Sauce', type: 'Canned Goods', place: P },
	{ name: 'Marshmallows', type: 'Baking', place: P },
	{ name: 'Mayonnaise', type: 'Condiments', place: R },
	{ name: 'Milk', type: 'Dairy', place: R },
	{ name: 'Mixed Nuts', type: 'Dry Goods', place: P },
	{ name: 'Mozzarella', type: 'Dairy', place: R },
	{ name: 'Muffins', type: 'Baked Goods', place: P },
	{ name: 'Mushrooms', type: 'Produce', place: R },
	{ name: 'Mustard', type: 'Condiments', place: R },
	{ name: 'Napkins', type: '', place: P },
	{ name: 'Navy Beans', type: 'Canned Goods', place: P },
	{ name: 'Navy Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Oat Milk', type: 'Dairy', place: R },
	{ name: 'Oatmeal', type: 'Breakfast', place: P },
	{ name: 'Olive Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Olives', type: 'Canned Goods', place: P },
	{ name: 'Onion Powder', type: 'Spices', place: P },
	{ name: 'Onions', type: 'Produce', place: P },
	{ name: 'Orange Juice', type: 'Beverages', place: R },
	{ name: 'Oranges', type: 'Produce', place: R },
	{ name: 'Oregano', type: 'Spices', place: P },
	{ name: 'Pancake Mix', type: 'Breakfast', place: P },
	{ name: 'Paper Towels', type: '', place: P },
	{ name: 'Paprika', type: 'Spices', place: P },
	{ name: 'Parmesan', type: 'Dairy', place: R },
	{ name: 'Parsley', type: 'Produce', place: R },
	{ name: 'Pasta', type: 'Grains', place: P },
	{ name: 'Pasta Sauce', type: 'Canned Goods', place: P },
	{ name: 'Peanut Butter', type: 'Condiments', place: P },
	{ name: 'Peanuts', type: 'Dry Goods', place: P },
	{ name: 'Pears', type: 'Produce', place: R },
	{ name: 'Pecans', type: 'Dry Goods', place: P },
	{ name: 'Pepperoni', type: 'Meat', place: R },
	{ name: 'Pickles', type: 'Condiments', place: R },
	{ name: 'Pine Nuts', type: 'Dry Goods', place: P },
	{ name: 'Pineapple', type: 'Produce', place: R },
	{ name: 'Pinto Beans', type: 'Canned Goods', place: P },
	{ name: 'Pinto Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Pita Bread', type: 'Baked Goods', place: P },
	{ name: 'Popcorn', type: 'Snacks', place: P },
	{ name: 'Pork Chops', type: 'Meat', place: F },
	{ name: 'Potato Chips', type: 'Snacks', place: P },
	{ name: 'Potatoes', type: 'Produce', place: P },
	{ name: 'Powdered Sugar', type: 'Baking', place: P },
	{ name: 'Pretzels', type: 'Snacks', place: P },
	{ name: 'Prosciutto', type: 'Meat', place: R },
	{ name: 'Pumpkin Puree', type: 'Canned Goods', place: P },
	{ name: 'Pumpkin Seeds', type: 'Dry Goods', place: P },
	{ name: 'Quinoa', type: 'Grains', place: P },
	{ name: 'Radishes', type: 'Produce', place: R },
	{ name: 'Raisins', type: 'Dry Goods', place: P },
	{ name: 'Ramen', type: 'Grains', place: P },
	{ name: 'Ranch Dressing', type: 'Condiments', place: R },
	{ name: 'Raspberries', type: 'Produce', place: R },
	{ name: 'Red Beans', type: 'Canned Goods', place: P },
	{ name: 'Red Beans, Dry', type: 'Dry Goods', place: P },
	{ name: 'Red Onions', type: 'Produce', place: P },
	{ name: 'Red Pepper Flakes', type: 'Spices', place: P },
	{ name: 'Red Wine Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Refried Beans', type: 'Canned Goods', place: P },
	{ name: 'Rice', type: 'Grains', place: P },
	{ name: 'Rice Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Ricotta', type: 'Dairy', place: R },
	{ name: 'Rolled Oats', type: 'Breakfast', place: P },
	{ name: 'Rosemary', type: 'Spices', place: P },
	{ name: 'Salami', type: 'Meat', place: R },
	{ name: 'Salmon', type: 'Meat', place: F },
	{ name: 'Salsa', type: 'Condiments', place: R },
	{ name: 'Salt', type: 'Spices', place: P },
	{ name: 'Sandwich Bread', type: 'Baked Goods', place: P },
	{ name: 'Sausage', type: 'Meat', place: F },
	{ name: 'Sesame Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Sesame Seeds', type: 'Dry Goods', place: P },
	{ name: 'Shredded Cheese', type: 'Dairy', place: R },
	{ name: 'Shrimp', type: 'Meat', place: F },
	{ name: 'Sliced Cheese', type: 'Dairy', place: R },
	{ name: 'Sour Cream', type: 'Dairy', place: R },
	{ name: 'Soy Sauce', type: 'Condiments', place: P },
	{ name: 'Spaghetti', type: 'Grains', place: P },
	{ name: 'Sparkling Water', type: 'Beverages', place: P },
	{ name: 'Spinach', type: 'Produce', place: R },
	{ name: 'Split Peas', type: 'Dry Goods', place: P },
	{ name: 'Sprinkles', type: 'Baking', place: P },
	{ name: 'Squash', type: 'Produce', place: P },
	{ name: 'Sriracha', type: 'Condiments', place: R },
	{ name: 'Steak', type: 'Meat', place: F },
	{ name: 'Steel-Cut Oats', type: 'Breakfast', place: P },
	{ name: 'Strawberries', type: 'Produce', place: R },
	{ name: 'Sugar', type: 'Baking', place: P },
	{ name: 'Sunflower Seeds', type: 'Dry Goods', place: P },
	{ name: 'Sweet Potatoes', type: 'Produce', place: P },
	{ name: 'Taco Seasoning', type: 'Spices', place: P },
	{ name: 'Tahini', type: 'Condiments', place: P },
	{ name: 'Tea', type: 'Beverages', place: P },
	{ name: 'Thyme', type: 'Spices', place: P },
	{ name: 'Toaster Pastries', type: 'Breakfast', place: P },
	{ name: 'Tofu', type: 'Meat', place: R },
	{ name: 'Tomato Paste', type: 'Canned Goods', place: P },
	{ name: 'Tomatoes', type: 'Produce', place: P },
	{ name: 'Tortilla Chips', type: 'Snacks', place: P },
	{ name: 'Trail Mix', type: 'Snacks', place: P },
	{ name: 'Trash Bags', type: '', place: P },
	{ name: 'Tuna', type: 'Canned Goods', place: P },
	{ name: 'Vanilla Extract', type: 'Baking', place: P },
	{ name: 'Vegetable Broth', type: 'Canned Goods', place: P },
	{ name: 'Vegetable Oil', type: 'Oils & Vinegars', place: P },
	{ name: 'Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Walnuts', type: 'Dry Goods', place: P },
	{ name: 'Whipped Cream', type: 'Dairy', place: R },
	{ name: 'White Rice', type: 'Grains', place: P },
	{ name: 'White Vinegar', type: 'Oils & Vinegars', place: P },
	{ name: 'Whole Wheat Bread', type: 'Baked Goods', place: P },
	{ name: 'Worcestershire Sauce', type: 'Condiments', place: P },
	{ name: 'Yeast', type: 'Baking', place: R },
	{ name: 'Yogurt', type: 'Dairy', place: R },
	{ name: 'Zucchini', type: 'Produce', place: R },
];
