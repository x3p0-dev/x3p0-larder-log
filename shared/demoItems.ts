import type { ItemDraft, Stamps, Term } from './types';

/**
 * A pantry with sixty things in it, for `?demo` under `sf dev`.
 *
 * `sf dev` starts empty every time, so every look at this app has been at a
 * household holding two or three items typed in to see one thing. That is
 * enough to check a card and useless for everything the app actually does with
 * a collection: the filters, the three sorts, the shopping list's grouping, the
 * status pills, `Showing X of Y`, search, and the grid's own wrapping. All of
 * those are only wrong at scale.
 *
 * **This is not a seed and must never become one.** `shared/seed.ts` says why
 * sample items are deliberately absent from a real household — in a shared
 * database they are fake inventory somebody deletes a row at a time — and that
 * stands. Nothing here is reachable off loopback; the gate is in
 * `client/lib/devItems.ts`, the same shape as `?members` and `?signedout`.
 *
 * **Terms are named, not identified.** A demo row says `Refrigerator`, and the
 * runner resolves it against the household's own locations at write time. Ids
 * are per household and, on the hosted runtime, small integers — a table of
 * literal ids would be wrong the first time anybody ran it anywhere else.
 * Anything naming a term the household does not have is skipped rather than
 * invented, so a household that has renamed *Meat* back to *Protein* loses a
 * few rows instead of growing a taxonomy nobody asked for.
 *
 * **`daysAgo` is relative for the same reason.** `addItem` takes `addedAt` on
 * the undo path (D17, D44) and validates whatever it is handed, so the runner
 * can spread these across two months and make *Recently added* mean something.
 * Sixty rows written in one second sort by nothing at all, which is exactly the
 * bug D35 existed to fix and would hide it again.
 */

/** A demo row. Term fields hold **names**, resolved against the household. */
export type DemoItem = {
	name: string;
	/**
	 * A location **name**. The row is skipped if the household has none by it.
	 *
	 * Not `location`: the capsule compiler text-matches `location` as a browser
	 * global in anything `server/` might import, and `shared/` is scanned as if
	 * it will be. It reads better beside the draft’s `locationId` anyway.
	 */
	locationName: string;
	/** Type **names**. Unknown ones are dropped; an empty list is legal. */
	typeNames: string[];
	/**
	 * Store **names**, and **empty is a case worth having**: an item naming no
	 * store lands in the shopping list's storeless group, which sorts last (D41)
	 * and has never had anything in it locally.
	 */
	storeNames: string[];
	/** Decimal strings, like the column (D4). `qty <= threshold` is low. */
	qty: string;
	threshold: string;
	/** Half of a pair that is never half-set (D52). Both omitted, or both given. */
	size?: string;
	/** A unit **key** from `shared/size.ts` — `quart`, never `qt`. */
	unit?: string;
	/** D53. The card still reads *Out*; the shopping list drops the row. */
	offShoppingList?: boolean;
	notes?: string;
	/** How long ago this entered the household, in days. Spreads `addedAt`. */
	daysAgo: number;
};

/*
 * Sixty rows, and the distribution is the point rather than the count.
 *
 * - **8 out, 13 low, 39 stocked**, across 16 refrigerator / 13 freezer / 31
 *   pantry. A real pantry is mostly fine, which is what makes the two pills
 *   that are not `ok` worth looking at.
 * - **The pills and the shopping list disagree by exactly two, on purpose.**
 *   21 rows are out or low; the list holds 19. The missing pair is `Sourdough
 *   Starter` and `Honey`, both low and both off the list — which is D53's whole
 *   split (the pills count stock, the list counts shopping) made countable.
 * - **19 rows across three store cards** — 11 · 5 · 3 — enough to wrap a card,
 *   sort within one, and stack at 390.
 * - **All fourteen types appear**, so no chip in the Type filter is dead.
 * - **Eight items name two stores**, which is the rule that the shopping list's
 *   count is of items and never of rows — the same item shows under both cards.
 * - **Four name none.** Three of those are also off the list; the fourth,
 *   `Baking Soda`, is out and on it, which is the only way the storeless group
 *   ever renders.
 * - **Thirteen carry two types**, for OR-inside-a-group against AND-across (D45).
 * - **Four carry no size at all**, which is ordinary for anything counted.
 * - **Eleven of the fourteen units are used**, spanning all three groups —
 *   including one `half-pint`, the unit whose abbreviation is `cup` and the
 *   case D52 says is otherwise unfixable. The three metric weights are left
 *   out because no US pantry would carry them, not because they don't work.
 * - **`Whole Peeled San Marzano Tomatoes`** is long on purpose: it is what the
 *   card's name wrap and the list row's 460px collision want looking at.
 */
export const DEMO_ITEMS: readonly DemoItem[] = [
	// --- Refrigerator (16) ---
	{ name: 'Whole Milk', locationName: 'Refrigerator', typeNames: ['Dairy'], storeNames: ['Grocery'], qty: '1', threshold: '1', size: '1', unit: 'gallon', daysAgo: 3 },
	{ name: 'Eggs', locationName: 'Refrigerator', typeNames: ['Dairy'], storeNames: ['Grocery', 'Market'], qty: '2', threshold: '1', size: '1', unit: 'dozen', daysAgo: 5 },
	{ name: 'Unsalted Butter', locationName: 'Refrigerator', typeNames: ['Dairy', 'Baking'], storeNames: ['Grocery', 'Warehouse'], qty: '3', threshold: '2', size: '1', unit: 'pound', daysAgo: 12 },
	{ name: 'Sharp Cheddar', locationName: 'Refrigerator', typeNames: ['Dairy'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '8', unit: 'ounce', daysAgo: 9 },
	{ name: 'Greek Yogurt', locationName: 'Refrigerator', typeNames: ['Dairy', 'Breakfast'], storeNames: ['Warehouse'], qty: '6', threshold: '4', size: '5.3', unit: 'ounce', daysAgo: 4 },
	{ name: 'Heavy Cream', locationName: 'Refrigerator', typeNames: ['Dairy', 'Baking'], storeNames: ['Grocery'], qty: '0', threshold: '1', size: '1', unit: 'half-pint', notes: 'The small carton — the pint always goes off first.', daysAgo: 21 },
	{ name: 'Half & Half', locationName: 'Refrigerator', typeNames: ['Dairy'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '1', unit: 'pint', daysAgo: 7 },
	{ name: 'Baby Spinach', locationName: 'Refrigerator', typeNames: ['Produce'], storeNames: ['Market'], qty: '1', threshold: '1', size: '5', unit: 'ounce', daysAgo: 2 },
	{ name: 'Carrots', locationName: 'Refrigerator', typeNames: ['Produce'], storeNames: ['Grocery', 'Market'], qty: '2', threshold: '1', size: '2', unit: 'pound', daysAgo: 6 },
	{ name: 'Lemons', locationName: 'Refrigerator', typeNames: ['Produce'], storeNames: ['Market'], qty: '4', threshold: '2', daysAgo: 3 },
	{ name: 'Chicken Thighs', locationName: 'Refrigerator', typeNames: ['Meat'], storeNames: ['Grocery'], qty: '2', threshold: '2', size: '1.5', unit: 'pound', daysAgo: 8 },
	{ name: 'Bacon', locationName: 'Refrigerator', typeNames: ['Meat', 'Breakfast'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '12', unit: 'ounce', daysAgo: 11 },
	{ name: 'Orange Juice', locationName: 'Refrigerator', typeNames: ['Beverages', 'Breakfast'], storeNames: ['Grocery'], qty: '1', threshold: '1', size: '2', unit: 'quart', daysAgo: 5 },
	{ name: 'Dijon Mustard', locationName: 'Refrigerator', typeNames: ['Condiments'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '8', unit: 'ounce', daysAgo: 45 },
	{ name: 'Mayonnaise', locationName: 'Refrigerator', typeNames: ['Condiments'], storeNames: ['Warehouse'], qty: '2', threshold: '1', size: '30', unit: 'fluid-ounce', daysAgo: 30 },
	{ name: 'Sourdough Starter', locationName: 'Refrigerator', typeNames: ['Baking'], storeNames: [], qty: '1', threshold: '1', offShoppingList: true, notes: 'Feed Fridays. Never buy this.', daysAgo: 60 },

	// --- Freezer (13) ---
	{ name: 'Ground Beef', locationName: 'Freezer', typeNames: ['Meat'], storeNames: ['Warehouse'], qty: '3', threshold: '2', size: '1', unit: 'pound', daysAgo: 14 },
	{ name: 'Chicken Breasts', locationName: 'Freezer', typeNames: ['Meat'], storeNames: ['Warehouse'], qty: '4', threshold: '2', size: '2', unit: 'pound', daysAgo: 18 },
	{ name: 'Salmon Fillets', locationName: 'Freezer', typeNames: ['Meat'], storeNames: ['Market'], qty: '2', threshold: '1', size: '12', unit: 'ounce', daysAgo: 9 },
	{ name: 'Breakfast Sausage', locationName: 'Freezer', typeNames: ['Meat', 'Breakfast'], storeNames: ['Grocery'], qty: '0', threshold: '1', size: '1', unit: 'pound', daysAgo: 19 },
	{ name: 'Frozen Peas', locationName: 'Freezer', typeNames: ['Produce'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '16', unit: 'ounce', daysAgo: 22 },
	{ name: 'Frozen Blueberries', locationName: 'Freezer', typeNames: ['Produce', 'Breakfast'], storeNames: ['Warehouse'], qty: '2', threshold: '1', size: '2', unit: 'pound', daysAgo: 27 },
	{ name: 'Sweet Corn', locationName: 'Freezer', typeNames: ['Produce'], storeNames: ['Grocery', 'Warehouse'], qty: '3', threshold: '1', size: '12', unit: 'ounce', daysAgo: 24 },
	{ name: 'Garden Tomatoes', locationName: 'Freezer', typeNames: ['Produce'], storeNames: [], qty: '6', threshold: '0', offShoppingList: true, notes: 'Last summer’s. Roast them before they turn.', daysAgo: 52 },
	{ name: 'Pepperoni Pizza', locationName: 'Freezer', typeNames: ['Frozen Meals'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '1', unit: 'pack', daysAgo: 10 },
	{ name: 'Bean & Cheese Burritos', locationName: 'Freezer', typeNames: ['Frozen Meals'], storeNames: ['Warehouse'], qty: '0', threshold: '2', size: '8', unit: 'pack', daysAgo: 33 },
	{ name: 'Vanilla Ice Cream', locationName: 'Freezer', typeNames: ['Snacks'], storeNames: ['Grocery'], qty: '1', threshold: '1', size: '1.5', unit: 'quart', daysAgo: 16 },
	{ name: 'Puff Pastry', locationName: 'Freezer', typeNames: ['Baking'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '17.3', unit: 'ounce', daysAgo: 40 },
	{ name: 'Chicken Stock', locationName: 'Freezer', typeNames: ['Canned Goods'], storeNames: ['Grocery'], qty: '2', threshold: '2', size: '1', unit: 'quart', daysAgo: 35 },

	// --- Pantry (31) ---
	{ name: 'All-Purpose Flour', locationName: 'Pantry', typeNames: ['Baking', 'Grains'], storeNames: ['Grocery', 'Warehouse'], qty: '1', threshold: '1', size: '5', unit: 'pound', daysAgo: 29 },
	{ name: 'Granulated Sugar', locationName: 'Pantry', typeNames: ['Baking'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '4', unit: 'pound', daysAgo: 41 },
	{ name: 'Brown Sugar', locationName: 'Pantry', typeNames: ['Baking'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '2', unit: 'pound', daysAgo: 44 },
	{ name: 'Baking Soda', locationName: 'Pantry', typeNames: ['Baking'], storeNames: [], qty: '0', threshold: '1', size: '16', unit: 'ounce', notes: 'Whoever is out first.', daysAgo: 59 },
	{ name: 'Vanilla Extract', locationName: 'Pantry', typeNames: ['Baking'], storeNames: ['Market'], qty: '2', threshold: '1', size: '4', unit: 'fluid-ounce', daysAgo: 54 },
	{ name: 'Kosher Salt', locationName: 'Pantry', typeNames: ['Spices'], storeNames: ['Warehouse'], qty: '2', threshold: '1', size: '3', unit: 'pound', daysAgo: 58 },
	{ name: 'Black Peppercorns', locationName: 'Pantry', typeNames: ['Spices'], storeNames: ['Market'], qty: '2', threshold: '1', size: '4', unit: 'ounce', daysAgo: 47 },
	{ name: 'Ground Cinnamon', locationName: 'Pantry', typeNames: ['Spices', 'Baking'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '2.37', unit: 'ounce', daysAgo: 46 },
	{ name: 'Extra Virgin Olive Oil', locationName: 'Pantry', typeNames: ['Oils & Vinegars'], storeNames: ['Warehouse'], qty: '1', threshold: '1', size: '1', unit: 'litre', daysAgo: 26 },
	{ name: 'Canola Oil', locationName: 'Pantry', typeNames: ['Oils & Vinegars'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '48', unit: 'fluid-ounce', daysAgo: 38 },
	{ name: 'Apple Cider Vinegar', locationName: 'Pantry', typeNames: ['Oils & Vinegars'], storeNames: ['Grocery'], qty: '0', threshold: '1', size: '32', unit: 'fluid-ounce', daysAgo: 37 },
	{ name: 'Spaghetti', locationName: 'Pantry', typeNames: ['Grains'], storeNames: ['Grocery', 'Warehouse'], qty: '4', threshold: '2', size: '1', unit: 'pound', daysAgo: 20 },
	{ name: 'Long-Grain White Rice', locationName: 'Pantry', typeNames: ['Grains'], storeNames: ['Warehouse'], qty: '1', threshold: '1', size: '5', unit: 'pound', daysAgo: 31 },
	{ name: 'Rolled Oats', locationName: 'Pantry', typeNames: ['Grains', 'Breakfast'], storeNames: ['Warehouse'], qty: '2', threshold: '1', size: '42', unit: 'ounce', daysAgo: 28 },
	{ name: 'Diced Tomatoes', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Grocery', 'Warehouse'], qty: '6', threshold: '3', size: '28', unit: 'ounce', daysAgo: 23 },
	{ name: 'Whole Peeled San Marzano Tomatoes', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Market'], qty: '2', threshold: '1', size: '28', unit: 'ounce', notes: 'For sauce. Not interchangeable with the diced.', daysAgo: 30 },
	{ name: 'Black Beans', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Grocery'], qty: '4', threshold: '2', size: '15', unit: 'ounce', daysAgo: 17 },
	{ name: 'Chickpeas', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Grocery'], qty: '4', threshold: '2', size: '15', unit: 'ounce', daysAgo: 34 },
	{ name: 'Tuna in Olive Oil', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Market'], qty: '3', threshold: '2', size: '5', unit: 'ounce', daysAgo: 39 },
	{ name: 'Coconut Milk', locationName: 'Pantry', typeNames: ['Canned Goods'], storeNames: ['Market'], qty: '0', threshold: '2', size: '13.5', unit: 'ounce', daysAgo: 42 },
	{ name: 'Peanut Butter', locationName: 'Pantry', typeNames: ['Condiments', 'Breakfast'], storeNames: ['Warehouse'], qty: '2', threshold: '1', size: '40', unit: 'ounce', daysAgo: 15 },
	{ name: 'Strawberry Jam', locationName: 'Pantry', typeNames: ['Condiments', 'Breakfast'], storeNames: ['Market'], qty: '2', threshold: '1', size: '12', unit: 'ounce', daysAgo: 48 },
	{ name: 'Soy Sauce', locationName: 'Pantry', typeNames: ['Condiments'], storeNames: ['Grocery'], qty: '1', threshold: '0', size: '15', unit: 'fluid-ounce', daysAgo: 51 },
	{ name: 'Honey', locationName: 'Pantry', typeNames: ['Condiments'], storeNames: [], qty: '1', threshold: '1', size: '1', unit: 'pint', offShoppingList: true, notes: 'From Dale’s hives. Ask, don’t buy.', daysAgo: 57 },
	{ name: 'Sourdough Loaf', locationName: 'Pantry', typeNames: ['Baked Goods'], storeNames: ['Market'], qty: '1', threshold: '1', daysAgo: 1 },
	{ name: 'Flour Tortillas', locationName: 'Pantry', typeNames: ['Baked Goods'], storeNames: ['Grocery'], qty: '2', threshold: '1', size: '10', unit: 'count', daysAgo: 6 },
	{ name: 'Hamburger Buns', locationName: 'Pantry', typeNames: ['Baked Goods'], storeNames: ['Grocery'], qty: '0', threshold: '1', size: '8', unit: 'pack', daysAgo: 13 },
	{ name: 'Tortilla Chips', locationName: 'Pantry', typeNames: ['Snacks'], storeNames: ['Grocery', 'Warehouse'], qty: '2', threshold: '1', size: '13', unit: 'ounce', daysAgo: 7 },
	{ name: 'Ground Coffee', locationName: 'Pantry', typeNames: ['Beverages', 'Breakfast'], storeNames: ['Market'], qty: '2', threshold: '1', size: '12', unit: 'ounce', daysAgo: 4 },
	{ name: 'Black Tea Bags', locationName: 'Pantry', typeNames: ['Beverages'], storeNames: ['Grocery'], qty: '1', threshold: '1', size: '100', unit: 'count', daysAgo: 53 },
	{ name: 'Sparkling Water', locationName: 'Pantry', typeNames: ['Beverages'], storeNames: ['Warehouse'], qty: '0', threshold: '2', size: '12', unit: 'pack', daysAgo: 32 },
];

/** What the runner reports back, so a caller can say what happened. */
export type DemoSeedResult = {
	added: number;
	/** Rows dropped because the household has no location by that name. */
	skipped: string[];
};

/**
 * Resolve a term name to its id, case-insensitively.
 *
 * Case-insensitive because the household's own terms are whatever somebody
 * typed, and a demo table that only matched `Refrigerator` exactly would
 * silently drop half its rows against a household that says `refrigerator`.
 */
function idsByName(terms: readonly Term[]): Map<string, string> {
	const map = new Map<string, string>();

	// First writer wins, so a household with two terms of the same name keeps
	// the one the A–Z order (D44) shows first rather than an arbitrary one.
	for (const term of terms) {
		const key = term.name.trim().toLowerCase();

		if (! map.has(key)) map.set(key, term.id);
	}

	return map;
}

/**
 * Turn the demo table into drafts against one household's terms.
 *
 * Exported for the test: the resolution rules are the part with decisions in
 * them, and they are pure. The writing half is not, and needs a server.
 */
export function resolveDemoItems(
	locations: readonly Term[],
	types: readonly Term[],
	stores: readonly Term[],
	now: number
): { drafts: (ItemDraft & Stamps)[]; skipped: string[] } {
	const locationIds = idsByName(locations);
	const typeIds = idsByName(types);
	const storeIds = idsByName(stores);

	const drafts: (ItemDraft & Stamps)[] = [];
	const skipped: string[] = [];

	for (const demo of DEMO_ITEMS) {
		const locationId = locationIds.get(demo.locationName.trim().toLowerCase());

		// A location is required and `id()` is not a foreign key, so a missing
		// one has to drop the row here — the handler would accept a bogus id
		// from anything less careful, and D16 would then refuse to delete the
		// location that nothing can see.
		if (! locationId) {
			skipped.push(demo.name);
			continue;
		}

		// A missing type or store is only a missing *tag*, so the row still
		// earns its place without it. `.filter(Boolean)` would not narrow the
		// type, hence the explicit accumulate.
		const resolvedTypes: string[] = [];
		for (const name of demo.typeNames) {
			const id = typeIds.get(name.trim().toLowerCase());
			if (id) resolvedTypes.push(id);
		}

		const resolvedStores: string[] = [];
		for (const name of demo.storeNames) {
			const id = storeIds.get(name.trim().toLowerCase());
			if (id) resolvedStores.push(id);
		}

		/*
		 * `addedAt` is what makes *Recently added* mean anything (D35, D44).
		 * Sixty rows stamped in the same second sort by nothing, which is the
		 * exact bug that sort was written to fix.
		 *
		 * `changedAt` is deliberately the same value rather than now: nothing
		 * has edited these, and a row whose `changedAt` postdates its `addedAt`
		 * is a row that claims an edit that never happened.
		 */
		const stamp = new Date(now - demo.daysAgo * 86_400_000).toISOString();

		drafts.push({
			name: demo.name,
			locationId,
			typeIds: resolvedTypes,
			storeIds: resolvedStores,
			qty: demo.qty,
			threshold: demo.threshold,
			size: demo.size ?? '',
			unit: demo.unit ?? '',
			offShoppingList: demo.offShoppingList ?? false,
			notes: demo.notes ?? '',
			addedAt: stamp,
			changedAt: stamp,
		});
	}

	return { drafts, skipped };
}
