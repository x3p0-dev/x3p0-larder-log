/**
 * Validation for taxonomy terms and item fields.
 *
 * Shared so the server's rule and the client's inline feedback are the same
 * rule. A validation written client-side becomes a second copy the server has
 * to duplicate, and the two drift the first time either is edited.
 */

import { DEFAULT_INK, isColorSlot } from './palette';
import type { TermKind } from './types';

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

/**
 * Why a term cannot be deleted yet, or `null` when it can.
 *
 * A term is deletable exactly when nothing references it. The server refuses
 * on this rule and the client draws a blocked dialog from the same call, so the
 * sentence someone reads and the sentence the mutation would have thrown are
 * one string rather than two that drift.
 *
 * D16 originally guarded `location` alone, because a location is required and
 * Zero has no nullable column — deleting one in use would leave a dangling
 * reference that renders as a silent box. Types and stores are optional tags,
 * so deleting one merely dropped its join rows. That asymmetry is gone: the
 * item count now sits on every editing row, and a count that means "this will
 * be blocked" on one row and "these tags vanish" on the next is worse than no
 * count at all.
 */
export type TermBlock = {
	/** Dialog title — the instruction, not the refusal. */
	title: string;
	/** One sentence naming what holds the term, then the rule. */
	body: string;
	/** The footer action that goes where the problem is. */
	action: string;
};

/** Noun phrase for a count of items: `1 item`, `3 items`. */
function items(count: number): string {
	return `${count} ${count === 1 ? 'item' : 'items'}`;
}

export function termBlock(kind: TermKind, name: string, count: number): TermBlock | null {
	if (count <= 0) return null;

	const these = count === 1 ? 'this item' : `these ${items(count)}`;
	const action = count === 1 ? 'Show the item' : `Show the ${items(count)}`;

	// A location *holds* items and has to be emptied; a tag is *on* them and
	// has to be taken off. Using one verb for both would make one of the two
	// sentences describe something the screen does not do.
	if (kind === 'location') {
		return {
			title: `Move ${these} first`,
			body: `${name} holds ${items(count)}. A location can only be deleted once nothing is stored there.`,
			action,
		};
	}

	return {
		title: `Untag ${these} first`,
		body: `${name} is on ${items(count)}. A ${kind} can only be deleted once nothing uses it.`,
		action,
	};
}

/** How many items reference a term. The one definition both sides count with. */
export function termUsageCount(
	list: readonly { locationId: string; typeIds: readonly string[]; storeIds: readonly string[] }[],
	kind: TermKind,
	termId: string
): number {
	if (kind === 'location') return list.filter((it) => it.locationId === termId).length;
	if (kind === 'type') return list.filter((it) => it.typeIds.includes(termId)).length;

	return list.filter((it) => it.storeIds.includes(termId)).length;
}
