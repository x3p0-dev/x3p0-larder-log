/**
 * The domain vocabulary, shared by the client and the server capsule.
 *
 * These types deliberately track the shape in `docs/data-model.md` rather than
 * the prototype's: quantities are strings (there is no numeric column), and
 * accordion state is absent because it is UI, not data. What they do *not* yet
 * track is the move from name references to `id()` references — Phase 1 still
 * joins taxonomy terms by name, which Phase 2 replaces with real row ids.
 */

export type TermKind = 'location' | 'type' | 'store';

/**
 * A taxonomy term. `ink` is the single base hex every tint, ring, and chip
 * color derives from; `icon` is a key into the matching icon set and is absent
 * for stores, which render as outlined chips with no glyph.
 */
export type Term = {
	name: string;
	ink: string;
	icon?: string;
};

/** An inventory row. `qty` and `threshold` are decimal strings — see D4. */
export type Item = {
	id: string;
	name: string;
	category: string;
	types: string[];
	stores: string[];
	qty: string;
	threshold: string;
	notes: string;
};

/** The editable subset of an item, as the add and edit forms hold it. */
export type ItemDraft = Omit<Item, 'id'>;

export type ThemeOverride = 'system' | 'light' | 'dark';

/**
 * `themeOverride` is per-device and stays in localStorage even after the data
 * layer moves to the server. `defaultThreshold` is per-household and will
 * follow the household row in Phase 2.
 */
export type Settings = {
	themeOverride: ThemeOverride;
	defaultThreshold: string;
};
