import {
	Snowflake, Refrigerator, Package, Box, Boxes,
	Archive, Warehouse, ShoppingBasket, Layers, Home,
	Beef, Carrot, Wheat, Milk, Droplet, Cookie, Popcorn, Coffee, Flame, UtensilsCrossed,
} from 'lucide-preact';

import type { TermKind } from '../../shared/types';

/**
 * `lucide-preact` rather than `lucide-react`: it is the Preact build the Zero
 * runtime already ships, so it costs nothing in the client bundle.
 */
export type IconComponent = typeof Snowflake;

export type IconOption = {
	key: string;
	Icon: IconComponent;
};

export const LOCATION_ICONS: IconOption[] = [
	{ key: 'snowflake', Icon: Snowflake },
	{ key: 'refrigerator', Icon: Refrigerator },
	{ key: 'package', Icon: Package },
	{ key: 'box', Icon: Box },
	{ key: 'boxes', Icon: Boxes },
	{ key: 'archive', Icon: Archive },
	{ key: 'warehouse', Icon: Warehouse },
	{ key: 'basket', Icon: ShoppingBasket },
	{ key: 'layers', Icon: Layers },
	{ key: 'home', Icon: Home },
];

export const TYPE_ICONS: IconOption[] = [
	{ key: 'beef', Icon: Beef },
	{ key: 'carrot', Icon: Carrot },
	{ key: 'wheat', Icon: Wheat },
	{ key: 'milk', Icon: Milk },
	{ key: 'droplet', Icon: Droplet },
	{ key: 'cookie', Icon: Cookie },
	{ key: 'popcorn', Icon: Popcorn },
	{ key: 'coffee', Icon: Coffee },
	{ key: 'flame', Icon: Flame },
	{ key: 'utensils', Icon: UtensilsCrossed },
];

export const DEFAULT_LOCATION_ICON = 'box';
export const DEFAULT_TYPE_ICON = 'utensils';

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
	if (kind === 'location') return { options: LOCATION_ICONS, defaultKey: DEFAULT_LOCATION_ICON };
	if (kind === 'type') return { options: TYPE_ICONS, defaultKey: DEFAULT_TYPE_ICON };
	return null;
}
