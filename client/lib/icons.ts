import {
	Snowflake, Refrigerator, Package, Box, Boxes,
	Archive, Warehouse, ShoppingBasket, Layers, Home,
	Beef, Carrot, Wheat, Milk, Droplet, Cookie, Popcorn, Coffee, Flame, UtensilsCrossed,
} from 'lucide-preact';

import type { TermKind } from '../../shared/types';
import {
	LOCATION_ICON_KEYS,
	TYPE_ICON_KEYS,
	DEFAULT_LOCATION_ICON,
	DEFAULT_TYPE_ICON,
	iconKeysFor,
	type LocationIconKey,
	type TypeIconKey,
} from '../../shared/icons';

/**
 * `lucide-preact` rather than `lucide-react`: it is the Preact build the Zero
 * runtime already ships, so it costs nothing in the client bundle.
 */
export type IconComponent = typeof Snowflake;

export type IconOption = {
	key: string;
	Icon: IconComponent;
};

/**
 * The key-to-component half of the icon set. The keys themselves live in
 * `shared/icons.ts` so the server can validate against them (D23) — these maps
 * are typed by those keys, so adding a key there without a glyph here is a
 * compile error rather than a box that silently renders as a fallback.
 */
const LOCATION_ICON_MAP: Record<LocationIconKey, IconComponent> = {
	snowflake: Snowflake,
	refrigerator: Refrigerator,
	package: Package,
	box: Box,
	boxes: Boxes,
	archive: Archive,
	warehouse: Warehouse,
	basket: ShoppingBasket,
	layers: Layers,
	home: Home,
};

const TYPE_ICON_MAP: Record<TypeIconKey, IconComponent> = {
	beef: Beef,
	carrot: Carrot,
	wheat: Wheat,
	milk: Milk,
	droplet: Droplet,
	cookie: Cookie,
	popcorn: Popcorn,
	coffee: Coffee,
	flame: Flame,
	utensils: UtensilsCrossed,
};

// Ordering follows the shared key lists, so the picker matches the canonical set.
export const LOCATION_ICONS: IconOption[] = LOCATION_ICON_KEYS.map((key) => ({
	key,
	Icon: LOCATION_ICON_MAP[key],
}));

export const TYPE_ICONS: IconOption[] = TYPE_ICON_KEYS.map((key) => ({
	key,
	Icon: TYPE_ICON_MAP[key],
}));

export { DEFAULT_LOCATION_ICON, DEFAULT_TYPE_ICON };

function pick(options: IconOption[], key: string | undefined, fallbackKey: string): IconComponent {
	const match = options.find((o) => o.key === key) ?? options.find((o) => o.key === fallbackKey);
	// The fallback key is a literal from this module, so it always resolves.
	return match!.Icon;
}

export function locationIconFor(key?: string): IconComponent {
	return pick(LOCATION_ICONS, key, DEFAULT_LOCATION_ICON);
}

export function typeIconFor(key?: string): IconComponent {
	return pick(TYPE_ICONS, key, DEFAULT_TYPE_ICON);
}

/** Icon set and default for a given ChipPicker `kind`. Stores have no icons. */
export function iconSetFor(kind: TermKind): { options: IconOption[]; defaultKey: string } | null {
	const keys = iconKeysFor(kind);

	if (! keys) return null;

	const options = kind === 'location' ? LOCATION_ICONS : TYPE_ICONS;

	return { options, defaultKey: keys.defaultKey };
}
