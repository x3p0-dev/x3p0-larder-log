/**
 * The term color tokens.
 *
 * A term stores a *token*, not a color. `terms.ink` holds `color-7`, and what
 * `color-7` looks like is decided by the active theme in `client/lib/palette.ts`
 * — so a future theme can restyle every location, type, and store in the app by
 * shipping sixteen new values, without touching a single row.
 *
 * Storing the hex instead would pin the palette into the data: re-theming would
 * mean rewriting every term in every household, and any row missed would keep
 * the old look forever.
 *
 * Only the token *names* live here. Their appearance does not — `shared/`
 * imports nothing and is compiled into the capsule, and the server has no
 * business knowing what a color looks like. Same split as status: the
 * derivation is shared, the colors are not.
 */

/** How many color tokens the palette defines. The picker draws these 8 x 2. */
export const COLOR_SLOT_COUNT = 16;

/** Every valid token, in picker order. */
export const COLOR_SLOTS: readonly string[] = Array.from(
	{ length: COLOR_SLOT_COUNT },
	(_, i) => `color-${i + 1}`,
);

/**
 * The token a term falls back to when its stored value is unusable.
 *
 * The last slot is the palette's neutral, which is the right thing to show for
 * a term whose color is missing: visible, unobtrusive, and obviously not a
 * deliberate choice.
 */
export const DEFAULT_INK = `color-${COLOR_SLOT_COUNT}`;

const SLOT = /^color-([1-9][0-9]?)$/;

/** True when `value` is one of the defined color tokens. */
export function isColorSlot(value: unknown): value is string {
	if (typeof value !== 'string') return false;

	const m = SLOT.exec(value.trim());
	if (! m) return false;

	const n = Number(m[1]);
	return n >= 1 && n <= COLOR_SLOT_COUNT;
}
