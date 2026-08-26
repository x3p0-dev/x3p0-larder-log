/**
 * A household's identity: the colour its tile is drawn in, and the letter on it.
 *
 * Both rules live here rather than in `client/lib/` because the server answers
 * them too — `invitePreview` hands a guest a colour, and a fallback computed
 * one way on the server and another on the client would draw two different
 * tiles for the same household (D42).
 *
 * What the colour *looks like* is still not here. `households.ink` holds a
 * token, exactly as `terms.ink` does (D32), and `client/lib/palette.ts` remains
 * the only file that knows `color-7` is a terracotta.
 */

import { COLOR_SLOTS, isColorSlot } from './palette';

/**
 * Words that are skipped when picking the letter.
 *
 * Only articles. Prepositions and conjunctions were considered and rejected:
 * *Under the Stairs* should give U, and a list of stopwords long enough to be
 * "correct" starts making the letter unpredictable from the name.
 */
const ARTICLES = new Set(['the', 'a', 'an']);

/**
 * The letter on the tile — the first letter of the first word that is not an
 * article.
 *
 * *The Tadlock House* gives T, *The Lake Cabin* gives L. Taking the literal
 * first character would make every household beginning "The" a T, which is
 * precisely the case the colour and the letter exist to disambiguate.
 *
 * Empty when there is no name yet: the New household dialog draws the colour
 * alone until you have typed something, rather than a placeholder letter that
 * changes under you on the first keystroke.
 */
export function householdLetter(name: string): string {
	const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);

	// Every word an article — "The" on its own — falls back to the first, since
	// something has to be drawn and it is what was typed.
	const word = words.find((w) => ! ARTICLES.has(strip(w).toLowerCase())) ?? words[0];

	return word ? (strip(word)[0] ?? word[0]!).toUpperCase() : '';
}

/** Leading punctuation only — "'s" and "4B" keep their own first character. */
function strip(word: string): string {
	return word.replace(/^[^\p{L}\p{N}]+/u, '');
}

/**
 * The colour token a household's tile takes: its own, or a stable default.
 *
 * `households.ink` is additive (D42), so every row written before it existed
 * holds `''` — and the tile has to draw *something* for those, forever, since
 * nothing backfills them. Hashing the **id** rather than the name keeps that
 * default fixed across a rename; hashing the name would move the colour the
 * moment someone fixed a typo, which is the opposite of what the tile is for.
 *
 * Spread over all sixteen rather than pinned to one neutral: the whole point is
 * telling several households apart, and a shared default would fail exactly the
 * users who never set a colour.
 */
export function householdInk(ink: unknown, id: string): string {
	if (isColorSlot(ink)) return ink.trim();

	return COLOR_SLOTS[hashStr(id) % COLOR_SLOTS.length]!;
}

/**
 * What to write to `households.ink`.
 *
 * A token, or `''` meaning "no choice recorded" — which `householdInk()` then
 * resolves to the id-derived default. Unlike `normalizeInk()` for terms this
 * refuses a legacy hex outright: households never had one, and storing a value
 * `householdInk()` would reject is how the stored colour and the drawn colour
 * come apart.
 */
export function toHouseholdInk(value: unknown): string {
	return isColorSlot(value) ? value.trim() : '';
}

/** FNV-ish 31x rolling hash. Deterministic, and that is all it has to be. */
export function hashStr(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}
