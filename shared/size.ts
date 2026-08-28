/**
 * An item's **size** — how big one of the thing is, which is a different
 * question from how many you have.
 *
 * You own three of them and each one is a quart: `qty` answers the first half,
 * this answers the second. The two are deliberately separate fields and neither
 * is derivable from the other.
 *
 * It is stored as a pair — a decimal string and a **unit key** — and the pair is
 * never half-set. A bare `20` means nothing and a bare `quart` is not a size, so
 * `normalizeSize` is the one place the pair is made whole and both the sheet and
 * the server go through it. Between it and the sheet's two rules (picking a unit
 * against an empty number fills the number with 1; *No size* clears both) there
 * is no invalid state left to validate or explain.
 *
 * **The key is a slug, not the abbreviation.** `quart`, never `qt` — the same
 * reasoning D32 gives for term colours: what a household stores must survive us
 * changing what it prints. `Half pint` printing as `cup` is exactly the case
 * that would otherwise be unfixable.
 */

export type UnitGroup = 'count' | 'weight' | 'volume';

export type Unit = {
	/** The stored value. A stable slug — see the note above. */
	key: string;
	/** What the menu says. Sentence case: it is a row in a list of words. */
	label: string;
	/**
	 * What the card and the shopping list print. A unit *symbol*, so its casing
	 * is not ours to change — `mL` is wrong here only because the design table
	 * settled on `ml`, and `L` is capital because a litre's symbol is.
	 */
	abbr: string;
	group: UnitGroup;
};

/**
 * Fourteen units in three groups, in menu order.
 *
 * Each one earns its row against *would a household buy this thing in this
 * unit?* — which is why there is no `each`: **`1 each` is not a size, it is the
 * absence of one**, and clearing the pair already says that.
 *
 * Metric and imperial are both here rather than behind a household setting. A
 * setting would halve the list and cost a household that buys both.
 */
export const UNITS: Unit[] = [
	{ key: 'pack', label: 'Pack', abbr: 'pack', group: 'count' },
	{ key: 'dozen', label: 'Dozen', abbr: 'dz', group: 'count' },
	{ key: 'count', label: 'Count', abbr: 'ct', group: 'count' },

	{ key: 'ounce', label: 'Ounce', abbr: 'oz', group: 'weight' },
	{ key: 'pound', label: 'Pound', abbr: 'lb', group: 'weight' },
	{ key: 'gram', label: 'Gram', abbr: 'g', group: 'weight' },
	{ key: 'kilogram', label: 'Kilogram', abbr: 'kg', group: 'weight' },

	{ key: 'fluid-ounce', label: 'Fluid ounce', abbr: 'fl oz', group: 'volume' },
	/*
	 * The one row where the word and the abbreviation disagree on purpose.
	 *
	 * A US half-pint carton is the common size and *half pint* is what anybody
	 * would look for in the list — but `1 ½ pt` reads as one and a half pints,
	 * which is a different quantity and the commonest case of this unit. `cup`
	 * is the same measure, it is what the carton itself says, and it cannot be
	 * misread. The menu shows the abbreviation before you pick it, so nothing
	 * about it is a surprise.
	 */
	{ key: 'half-pint', label: 'Half pint', abbr: 'cup', group: 'volume' },
	{ key: 'pint', label: 'Pint', abbr: 'pt', group: 'volume' },
	{ key: 'quart', label: 'Quart', abbr: 'qt', group: 'volume' },
	{ key: 'gallon', label: 'Gallon', abbr: 'gal', group: 'volume' },
	{ key: 'millilitre', label: 'Millilitre', abbr: 'ml', group: 'volume' },
	{ key: 'litre', label: 'Litre', abbr: 'L', group: 'volume' },
];

/**
 * The widest a size number may get.
 *
 * Four, for the same reason the sheet's steppers stop there: the field is 76px
 * and nobody buys a 12,000-ounce anything. It is a field cap, not a storage
 * rule — `normalizeSize` clamps rather than refusing, so a longer value written
 * by some other path still resolves to something the app can draw.
 */
export const MAX_SIZE_DIGITS = 4;

/** The unit a key names, or `undefined` for anything else — including `''`. */
export function unitFor(key: unknown): Unit | undefined {
	if (typeof key !== 'string') return undefined;

	return UNITS.find((u) => u.key === key);
}

/**
 * The pair, made whole.
 *
 * Both halves or neither, and the three ways in are all handled here rather
 * than in the two places that call it:
 *
 * - an unknown unit clears both, so a key we later retire does not leave a
 *   dangling number behind it;
 * - a known unit with no number gets `1`, which is what makes *1 pint* a single
 *   tap and the commonest size there is;
 * - a number with no unit clears both, because a bare count is what `qty`
 *   already is.
 */
export function normalizeSize(size: unknown, unit: unknown): { size: string; unit: string } {
	const found = unitFor(unit);
	if (! found) return { size: '', unit: '' };

	const digits = typeof size === 'string' || typeof size === 'number'
		? String(size).replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_SIZE_DIGITS)
		: '';

	// "0 quart" is not a size either — an empty field and a zeroed one mean the
	// same thing here, and the sheet's blur returns both to 1.
	return { size: digits && digits !== '0' ? digits : '1', unit: found.key };
}

/** True when the pair is set at all. Cheaper than formatting to find out. */
export function hasSize(size: unknown, unit: unknown): boolean {
	return Boolean(unitFor(unit)) && typeof size === 'string' && size.trim() !== '';
}

/**
 * What the card and the shopping list print: `1 qt`, `12 oz`, `10 ct`.
 *
 * **Abbreviations never pluralise** — *2 lb*, *2 qt*, *6 pack* — so nothing has
 * to decide whether two dozen is `2 dz` or `2 dzs`. Returns `''` for a pair
 * that is not set, which is what every caller checks rather than rendering an
 * empty line.
 */
export function formatSize(size: unknown, unit: unknown): string {
	const found = unitFor(unit);
	if (! found) return '';

	const digits = typeof size === 'string' ? size.trim() : '';
	if (! digits) return '';

	return `${digits} ${found.abbr}`;
}
