/**
 * Invite codes and their expiry.
 *
 * Pure so the server can enforce and the client can render the same rules —
 * "expires in 3 days" in the UI and the redemption check must never disagree.
 *
 * Timestamps here are ISO 8601 UTC, matching the encoding Zero uses for the
 * built-in `createdAt` / `updatedAt` (confirmed 2026-08-24). That is the one
 * date format that compares correctly as a plain string, which matters because
 * a string comparison is all we have — see D4 and D24.
 */

import { sha256 } from './sha256';

/** How long a freshly minted code stays valid. */
export const INVITE_TTL_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/** The sentinel `expiresAt` for a code that never expires. Nothing mints one today. */
export const NEVER_EXPIRES = '';

/**
 * The `expiresAt` for a code minted at `now`.
 *
 * `now` is passed in rather than read here so the function stays pure and
 * testable; handlers supply `Date.now()`.
 */
export function expiryFrom(nowMs: number): string {
	return new Date(nowMs + INVITE_TTL_DAYS * MS_PER_DAY).toISOString();
}

/**
 * True when a code is past its expiry.
 *
 * An unparseable `expiresAt` counts as **expired**. A credential whose validity
 * we cannot determine is one we refuse — the safe direction for a bearer token.
 */
export function isExpired(expiresAt: string, nowMs: number): boolean {
	if (expiresAt === NEVER_EXPIRES) return false;

	const parsed = Date.parse(expiresAt);

	if (Number.isNaN(parsed)) return true;

	return parsed <= nowMs;
}

/** Whole days remaining, floored at 0. `null` when the code never expires. */
export function daysUntilExpiry(expiresAt: string, nowMs: number): number | null {
	if (expiresAt === NEVER_EXPIRES) return null;

	const parsed = Date.parse(expiresAt);

	if (Number.isNaN(parsed)) return 0;

	return Math.max(0, Math.ceil((parsed - nowMs) / MS_PER_DAY));
}

/**
 * Codes are URL-safe and unambiguous when read aloud or retyped: no `0`/`O`,
 * no `1`/`l`/`I`. An invite is likely to be dictated across a kitchen.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;

/**
 * Generates a code from a caller-supplied randomness source.
 *
 * The source is injected so this stays pure and deterministic under test.
 * Handlers pass `crypto.getRandomValues`-backed bytes.
 */
export function codeFromBytes(bytes: Uint8Array): string {
	let out = '';

	for (let i = 0; i < CODE_LENGTH; i++) {
		// Modulo bias is irrelevant here: the alphabet is 31 characters and the
		// code is a lookup key, not a secret that resists offline attack.
		out += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
	}

	return out;
}

/** Bytes needed by `codeFromBytes`. */
export const CODE_BYTES = CODE_LENGTH;

/**
 * The `code` an invite row carries between its insert and its real code.
 *
 * Deliberately **not** code-shaped. `redeemInvite` rejects anything
 * `isCodeShaped` refuses before it ever reaches the `by_code` index, so a row
 * caught mid-mint cannot be redeemed by anybody — including by someone who
 * guesses the placeholder, because there is nothing to guess.
 */
export const PENDING_CODE = '';

/**
 * A code derived by mixing everything unpredictable the caller can reach.
 *
 * The hosted runtime has no `crypto` and its row ids are **sequential
 * integers** — both confirmed in production on 2026-08-27 — so there is no
 * entropy to draw on directly and the id is worth nothing on its own. Mixing
 * through SHA-256 means the code cannot be walked back to its inputs, and a
 * server-side secret among those inputs is what makes it unguessable even to
 * someone who knows the row id and roughly when it was minted.
 *
 * Parts are joined with NUL so that `['ab', 'c']` and `['a', 'bc']` cannot
 * collide.
 */
export function codeFromSeed(parts: readonly string[]): string {
	return codeFromBytes(sha256(parts.join('\u0000')).slice(0, CODE_BYTES));
}

/** True when a string could be one of our codes. Cheap reject before a DB read. */
export function isCodeShaped(value: unknown): value is string {
	if (typeof value !== 'string' || value.length !== CODE_LENGTH) return false;

	return [...value].every((char) => CODE_ALPHABET.includes(char));
}

/** Normalizes user-typed input — codes are uppercase, and people paste spaces. */
export function normalizeCode(value: string): string {
	return value.trim().replace(/[\s-]/g, '').toUpperCase();
}
