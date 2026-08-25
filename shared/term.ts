/**
 * Validation for taxonomy terms and item fields.
 *
 * Shared so the server's rule and the client's inline feedback are the same
 * rule. A validation written client-side becomes a second copy the server has
 * to duplicate, and the two drift the first time either is edited.
 */

import { DEFAULT_INK, isColorSlot } from './palette';

export { DEFAULT_INK };

/** Longest a term or item name may be. Long enough for "Chunky peanut butter". */
export const MAX_NAME = 60;

/** Longest an item's notes may be. */
export const MAX_NOTES = 500;

/**
 * Trims and collapses whitespace, then truncates.
 *
 * Returns `""` for anything that isn't a usable string — callers decide whether
 * empty is an error, since it is for a name and fine for notes.
 */
export function normalizeName(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
}

/** Trims and truncates free text, preserving internal line breaks. */
export function normalizeNotes(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.trim().slice(0, MAX_NOTES);
}

/** A term or item name is usable when it survives normalization. */
export function isValidName(value: unknown): boolean {
	return normalizeName(value).length > 0;
}

/**
 * Case- and whitespace-insensitive key for duplicate detection.
 *
 * "Deep freezer" and "deep  Freezer" are the same term to a person, so they are
 * the same term here.
 */
export function termKey(name: string): string {
	return normalizeName(name).toLowerCase();
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A term's color is stored as a token (`color-7`), never as a hex — see
 * `shared/palette.ts` for why.
 *
 * Raw hex is still *accepted*, because rows written before the tokens existed
 * hold one. Those keep rendering through the legacy path in `themed()`; nothing
 * new should ever produce one.
 */
export function isInk(value: unknown): value is string {
	return isColorSlot(value) || (typeof value === 'string' && HEX.test(value.trim()));
}

/**
 * Normalizes a color for storage: a color token, a legacy lowercase
 * `#rrggbb`, or the default token.
 *
 * Shorthand (`#abc`) is deliberately not expanded — the pickers only ever emit
 * full tokens, so accepting shorthand would widen the stored format for no
 * caller.
 */
export function normalizeInk(value: unknown): string {
	if (isColorSlot(value)) return value.trim();

	return typeof value === 'string' && HEX.test(value.trim())
		? value.trim().toLowerCase()
		: DEFAULT_INK;
}
