/**
 * Quantities are decimal strings, not numbers.
 *
 * Zero's schema types are `string()`, `boolean()`, and `id(table)` — there is
 * no numeric column. `qty` and `threshold` are therefore stored as decimal
 * strings everywhere, and every read parses through `toInt` while every write
 * serializes through `fromInt`. The discipline lands here, ahead of the real
 * schema, so the data layer in Phase 2 has nothing left to convert.
 *
 * Two rules ride along with the encoding:
 *
 * 1. Never `parseInt` inline. A stray `parseInt('')` is `NaN`, and `NaN`
 *    silently poisons every comparison it touches.
 * 2. Never sort by these values in the database. String ordering puts "10"
 *    before "2", so quantity sorting happens client-side, after parsing.
 */

/** Parses a stored quantity. Anything unparseable reads as 0. */
export function toInt(value: unknown): number {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
	}

	if (typeof value !== 'string') return 0;

	const trimmed = value.trim();

	// Reject "12abc", "1.5", "-3", and "" up front rather than letting
	// parseInt's prefix matching accept them.
	if (! /^\d+$/.test(trimmed)) return 0;

	const parsed = Number(trimmed);

	return Number.isSafeInteger(parsed) ? parsed : 0;
}

/** Serializes a quantity for storage. */
export function fromInt(value: number): string {
	if (! Number.isFinite(value)) return '0';

	return String(Math.max(0, Math.trunc(value)));
}

/**
 * Normalizes arbitrary input (a form field, a client argument) to a storable
 * quantity string. This is the one function a server mutation needs to call
 * before writing, so a client that sends "abc" stores "0" rather than "abc".
 */
export function normalizeQty(value: unknown): string {
	return fromInt(toInt(value));
}

/**
 * True when the value is already a well-formed quantity string. Used to tell a
 * user their input was rejected, rather than silently clamping it.
 */
export function isQty(value: unknown): value is string {
	return typeof value === 'string' && /^\d+$/.test(value.trim());
}

/**
 * The longest a quantity field may get. Fifteen digits is the widest run that
 * is always a safe integer, so a field capped here can never hold a number
 * `toInt` gives up on and reads as 0.
 */
export const MAX_QTY_DIGITS = 15;

/**
 * Strips a value down to the characters a quantity is made of. The form fields
 * filter keystrokes through this, so it has to agree with `isQty` above —
 * anything this leaves behind must be something that function accepts.
 */
export function digitsOnly(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.replace(/[^0-9]/g, '');
}
