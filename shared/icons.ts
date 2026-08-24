/**
 * Icon keys.
 *
 * Icons are a closed, curated set — never an upload. What lives here is only
 * the *keys*; the key-to-component map is `client/lib/icons.ts`, because the
 * components come from `lucide-preact` and the server may import only
 * `@spacefast/zero/server` and its own files.
 *
 * That split is the point. Without it the server has no way to reject
 * `icon: "not-a-real-icon"` — it would store the garbage and the client would
 * render a fallback box forever. With the keys here, taxonomy mutations
 * validate on write and the closed set becomes enforced rather than assumed.
 *
 * The same boundary `client/lib/theme.ts` draws for status: derivation is
 * shared, colors are not. See D23.
 */

import type { TermKind } from './types';

export const LOCATION_ICON_KEYS = [
	'snowflake',
	'refrigerator',
	'package',
	'box',
	'boxes',
	'archive',
	'warehouse',
	'basket',
	'layers',
	'home',
] as const;

export const TYPE_ICON_KEYS = [
	'beef',
	'carrot',
	'wheat',
	'milk',
	'droplet',
	'cookie',
	'popcorn',
	'coffee',
	'flame',
	'utensils',
] as const;

export type LocationIconKey = (typeof LOCATION_ICON_KEYS)[number];
export type TypeIconKey = (typeof TYPE_ICON_KEYS)[number];

export const DEFAULT_LOCATION_ICON: LocationIconKey = 'box';
export const DEFAULT_TYPE_ICON: TypeIconKey = 'utensils';

/**
 * The icon keys valid for a term kind, and the fallback.
 *
 * Stores have no icon at all — they render as outlined chips — so this returns
 * null for them rather than an empty set, keeping "no icons" distinct from "no
 * icon chosen".
 */
export function iconKeysFor(
	kind: TermKind
): { keys: readonly string[]; defaultKey: string } | null {
	if (kind === 'location') {
		return { keys: LOCATION_ICON_KEYS, defaultKey: DEFAULT_LOCATION_ICON };
	}

	if (kind === 'type') {
		return { keys: TYPE_ICON_KEYS, defaultKey: DEFAULT_TYPE_ICON };
	}

	return null;
}

/** True when `key` belongs to the icon set for `kind`. */
export function isIconKey(kind: TermKind, key: unknown): boolean {
	const set = iconKeysFor(kind);

	if (! set) return false;

	return typeof key === 'string' && set.keys.includes(key);
}

/**
 * Normalizes an icon key for storage. Unknown keys fall back to the kind's
 * default rather than throwing, so a client sending nonsense stores something
 * renderable; stores normalize to `""`, since they have no icon.
 */
export function normalizeIcon(kind: TermKind, key: unknown): string {
	const set = iconKeysFor(kind);

	if (! set) return '';

	return isIconKey(kind, key) ? (key as string) : set.defaultKey;
}
