/**
 * What each color token looks like, in the Aug 2026 "Cellar" theme.
 *
 * The tokens themselves live in `shared/palette.ts` — a term stores `color-7`,
 * and this file is the only thing that decides `color-7` is a burnt orange. A
 * second theme is a second table with the same sixteen keys.
 *
 * Every value is hand-tuned rather than derived, and that is the point: each
 * tintText / tintBg pair and each darkTintText / darkTintBg pair was checked to
 * clear 4.6:1. Deriving them would quietly lose the corrections — compare
 * `color-7`, whose light tint text is deliberately darker than its base, and
 * `color-8`, darker still.
 *
 * These are inline style values, never class names. See the note at the top of
 * theme.ts for why a computed `bg-${hex}` compiles to nothing on this platform.
 */

import { COLOR_SLOTS } from '../../shared/palette';

export type TermColor = {
	/** The token, e.g. `color-7`. */
	id: string;

	/*
	 * Light. `base` is the solid fill — an active chip, a swatch, a location
	 * glyph — and is deliberately not the same value as `tintText`, which is
	 * darkened on some rows to clear contrast on `tintBg`.
	 */
	base: string;
	tintBg: string;
	tintBorder: string;
	tintText: string;

	/*
	 * Dark. A full second quad rather than a lightened first one: `darkDot` is
	 * the solid fill and the ink on the drawer, and the tint trio is what a
	 * chip uses on a dark card. These are specified, not derived.
	 */
	darkDot: string;
	darkTintBg: string;
	darkTintBorder: string;
	darkTintText: string;

	/**
	 * The dot on the drawer, which is the darkest surface in *both* themes and
	 * therefore needs its own ink — brighter than `darkDot`, which is tuned for
	 * a dark card rather than near-black.
	 *
	 * **Only eight of sixteen are specified.** The design's sample data uses
	 * eight colors, so those are the eight the mockup pins down; the rest fall
	 * back to `darkDot` and will read slightly dim on the drawer until the spec
	 * supplies them. `drawerDot()` is the only thing that should read this.
	 */
	onDrawer?: string;
};

/*
 * Order is the picker's reading order — the spec draws it 8 x 2, hues running
 * cool to warm across the top row and warm to neutral across the bottom. The
 * trailing names are the spec's own labels, kept as a comment so this table can
 * be diffed against the design doc; nothing reads them.
 */
export const TERM_COLORS: readonly TermColor[] = [
	{ id: 'color-1',  base: '#456B80', tintBg: '#E8EDEF', tintBorder: '#D0DADF', tintText: '#456B80', darkDot: '#6A92A7', darkTintBg: '#30302B', darkTintBorder: '#364041', darkTintText: '#7CA0B4', onDrawer: '#7FA3B8' }, // Slate
	{ id: 'color-2',  base: '#42618F', tintBg: '#E8EBF0', tintBorder: '#CFD6E0', tintText: '#42618F', darkDot: '#708CB5', darkTintBg: '#302F2E', darkTintBorder: '#343C47', darkTintText: '#839CC1' }, // Denim
	{ id: 'color-3',  base: '#5A548C', tintBg: '#EAE9EF', tintBorder: '#D3D2DD', tintText: '#5A548C', darkDot: '#8984B0', darkTintBg: '#332D2D', darkTintBorder: '#3D3746', darkTintText: '#9A96BD' }, // Indigo
	{ id: 'color-4',  base: '#6D4A69', tintBg: '#EEEAEE', tintBorder: '#DCD3DB', tintText: '#6D4A69', darkDot: '#A37F9F', darkTintBg: '#362B27', darkTintBorder: '#453339', darkTintText: '#AD8CAA', onDrawer: '#A17C9C' }, // Plum
	{ id: 'color-5',  base: '#8E4468', tintBg: '#F0E8EC', tintBorder: '#E0CFD7', tintText: '#8E4468', darkDot: '#B67796', darkTintBg: '#3C2A27', darkTintBorder: '#513138', darkTintText: '#C28AA5' }, // Mulberry
	{ id: 'color-6',  base: '#A03B36', tintBg: '#F1E7E7', tintBorder: '#E1CECE', tintText: '#A03B36', darkDot: '#C77773', darkTintBg: '#3F291F', darkTintBorder: '#582D25', darkTintText: '#CF8582', onDrawer: '#CB6B63' }, // Brick
	{ id: 'color-7',  base: '#A85E33', tintBg: '#F1EBE7', tintBorder: '#E1D5CE', tintText: '#9C572F', darkDot: '#BF7A52', darkTintBg: '#402E1F', darkTintBorder: '#5B3B24', darkTintText: '#CB8F6C', onDrawer: '#D08A5C' }, // Terracotta
	{ id: 'color-8',  base: '#A5791D', tintBg: '#F1EEE7', tintBorder: '#E1DBCE', tintText: '#846117', darkDot: '#AE842B', darkTintBg: '#3F321B', darkTintBorder: '#5A451C', darkTintText: '#CA972E', onDrawer: '#D0A044' }, // Ochre
	{ id: 'color-9',  base: '#8C7C22', tintBg: '#F1EFE7', tintBorder: '#E1DECE', tintText: '#7A6C1E', darkDot: '#9C8C31', darkTintBg: '#3B331C', darkTintBorder: '#50461E', darkTintText: '#B09D33' }, // Mustard
	{ id: 'color-10', base: '#5F7542', tintBg: '#ECEFE9', tintBorder: '#D8DED1', tintText: '#5B703F', darkDot: '#7A935A', darkTintBg: '#343221', darkTintBorder: '#3F432A', darkTintText: '#8AA467', onDrawer: '#93A96F' }, // Olive
	{ id: 'color-11', base: '#3F7A4C', tintBg: '#E8F0EA', tintBorder: '#D0DFD3', tintText: '#3C7549', darkDot: '#579865', darkTintBg: '#2F3323', darkTintBorder: '#33452E', darkTintText: '#64A973' }, // Fern
	{ id: 'color-12', base: '#3E6D68', tintBg: '#E9EFEE', tintBorder: '#D1DEDD', tintText: '#3E6D68', darkDot: '#5C948E', darkTintBg: '#2F3127', darkTintBorder: '#334038', darkTintText: '#6AA59F', onDrawer: '#6BA39C' }, // Teal
	{ id: 'color-13', base: '#2F6E7C', tintBg: '#E7EFF1', tintBorder: '#CEDEE1', tintText: '#2F6E7C', darkDot: '#4995A6', darkTintBg: '#2C312B', darkTintBorder: '#2D4140', darkTintText: '#51A3B5' }, // Aqua
	{ id: 'color-14', base: '#87694C', tintBg: '#EFECE9', tintBorder: '#DED7D1', tintText: '#7D6146', darkDot: '#A28467', darkTintBg: '#3B3023', darkTintBorder: '#4F3F2E', darkTintText: '#B1977D', onDrawer: '#B8977A' }, // Clay
	{ id: 'color-15', base: '#5E4A3C', tintBg: '#EEEBE9', tintBorder: '#DDD7D2', tintText: '#5E4A3C', darkDot: '#A08674', darkTintBg: '#342B20', darkTintBorder: '#3F3328', darkTintText: '#AB9281' }, // Cocoa
	{ id: 'color-16', base: '#6E6A5F', tintBg: '#EDECEB', tintBorder: '#D9D8D6', tintText: '#6A665B', darkDot: '#908C81', darkTintBg: '#373026', darkTintBorder: '#453F35', darkTintText: '#9F9B91' }, // Stone
];

/*
 * A theme that ships fewer values than there are tokens would leave terms
 * rendering as the legacy fallback with no visible cause. Fail at module load
 * instead — this is a build-time authoring mistake, not a runtime condition.
 */
if (TERM_COLORS.length !== COLOR_SLOTS.length) {
	throw new Error(
		`Theme defines ${TERM_COLORS.length} colors for ${COLOR_SLOTS.length} tokens`,
	);
}

const BY_ID = new Map(TERM_COLORS.map((c) => [c.id, c]));

/** The token order the picker draws in. */
export const DEFAULT_PALETTE: readonly string[] = TERM_COLORS.map((c) => c.id);

/**
 * The theme entry for a stored `terms.ink`, or `undefined` for a legacy hex.
 *
 * Undefined is a real case rather than a defensive branch: rows written before
 * the tokens existed hold a raw `#rrggbb`, and those still have to render.
 * Callers derive a tint instead — see `themed()`.
 */
export function termColorFor(ink: string): TermColor | undefined {
	return BY_ID.get(ink.trim());
}

/**
 * The colour a new term should start as: the first token this list is not
 * already using.
 *
 * Otherwise every new term arrives as the same default and has to be recoloured
 * one at a time. Shared so the drawer's add row and the item sheet's propose the
 * same thing — two copies of this would drift the first time either changed.
 */
export function proposeColor(used: readonly string[]): string {
	const taken = new Set(used);
	return DEFAULT_PALETTE.find((t) => ! taken.has(t)) ?? DEFAULT_PALETTE[0];
}

/**
 * The dot to paint on the drawer.
 *
 * Falls back to the dark-card dot for the eight tokens the design has not
 * specified yet — visibly dimmer than intended, but the right hue, and it
 * degrades rather than disappearing.
 */
export function drawerDot(c: TermColor): string {
	return c.onDrawer ?? c.darkDot;
}
