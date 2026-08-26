/**
 * Color + theme helpers.
 *
 * A location, type, or store stores a color *token* (`color-7`); this module
 * turns it into the ink, tint, and ring it renders as, by way of the active
 * theme in `./palette`. Status is not a term and does not use the tokens — it
 * has three fixed roles the design names outright.
 *
 * These are all *inline style* values, not Tailwind classes, and that is load
 * bearing on this platform: Zero compiles utility classes by scanning source
 * for static strings, so a computed `bg-${hex}` would emit no CSS at all. A
 * term's color can never be a class name here.
 */

import type { StatusKey } from '../../shared/status';
import { STATUS_LABEL, statusKeyFor } from '../../shared/status';
import type { Term } from '../../shared/types';
import { drawerDot, TERM_COLORS, termColorFor } from './palette';

export { DEFAULT_PALETTE, TERM_COLORS, termColorFor, drawerDot, proposeColor } from './palette';
export type { TermColor } from './palette';

export type ThemedColor = {
	/** Text on `bg`. */
	ink: string;
	/** The tint a chip or badge sits on. */
	bg: string;
	/** The tint's border. */
	ring: string;
	/**
	 * The solid fill — an active chip, a swatch, a status dot.
	 *
	 * Separate from `ink` because the two diverge: a fill has to read against
	 * the page, and the text has to read against `bg`. In the light theme they
	 * were close enough to share one value; in dark they are not.
	 */
	dot: string;
};

export type Status = ThemedColor & {
	key: StatusKey;
	label: string;
};

export type ChipVariant = 'fill' | 'ring';

/*
 * Status is not a term, so it does not go through the color tokens — these are
 * fixed roles the design names directly. Each carries its own tint and text
 * rather than deriving them, for the same contrast reason as the term table.
 */
const STATUS_COLOR: Record<StatusKey, { light: ThemedColor; dark: ThemedColor }> = {
	out: {
		light: { ink: '#9A2E3B', bg: '#F6E2DD', ring: '#EBCFC5', dot: '#BE3346' },
		dark: { ink: '#E5878D', bg: '#31201E', ring: '#4E2E2C', dot: '#D4636B' },
	},
	low: {
		light: { ink: '#855A0F', bg: '#F7EEDA', ring: '#E9DAB9', dot: '#C4901F' },
		dark: { ink: '#E2B85E', bg: '#2E2614', ring: '#4B3E1E', dot: '#D8A63F' },
	},
	ok: {
		light: { ink: '#47592F', bg: '#EDEFE1', ring: '#DCE0CB', dot: '#5F7546' },
		dark: { ink: '#A9C486', bg: '#232A1B', ring: '#39482C', dot: '#8FAE6D' },
	},
};

/** A status's colors, without needing a quantity to derive the status from. */
export function statusColor(key: StatusKey, dark: boolean): ThemedColor {
	return STATUS_COLOR[key][dark ? 'dark' : 'light'];
}

/** The solid dot beside a status, brighter than its text. Theme-aware. */
export function statusInk(key: StatusKey, dark: boolean): string {
	return STATUS_COLOR[key][dark ? 'dark' : 'light'].dot;
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex.replace('#', ''), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lighten(hex: string, amt: number): string {
	const [r, g, b] = hexToRgb(hex);
	const mix = (c: number) => Math.round(c + (255 - c) * amt);
	return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function withAlpha(hex: string, a: number): string {
	const [r, g, b] = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Resolves a stored `terms.ink` to the colors it renders as.
 *
 * The token path is a lookup, because the theme's tints are hand-corrected for
 * contrast and deriving them would lose that. The derivation below is the
 * legacy path only: rows written before the tokens existed hold a raw hex, and
 * they still have to render. Nothing new writes one.
 *
 * Dark still derives the tint and ring. The theme specifies an `onDark` ink for
 * every token — that part is real — but no dark tint pairs, so those stay
 * generated until the dark palette is designed.
 */
export function themed(ink: string, dark: boolean): ThemedColor {
	const c = termColorFor(ink);

	if (c) {
		return dark
			? { ink: c.darkTintText, bg: c.darkTintBg, ring: c.darkTintBorder, dot: c.darkDot }
			: { ink: c.tintText, bg: c.tintBg, ring: c.tintBorder, dot: c.base };
	}

	return dark
		? { ink: lighten(ink, 0.55), bg: withAlpha(ink, 0.22), ring: withAlpha(ink, 0.45), dot: lighten(ink, 0.55) }
		: { ink, bg: lighten(ink, 0.88), ring: lighten(ink, 0.72), dot: ink };
}

/**
 * The dot on a chip inside the drawer.
 *
 * The drawer is dark in both themes, so at rest a term's dot takes the bright
 * on-drawer ink. **A selected chip is cream-filled**, though — it takes the
 * drawer's primary treatment, the same as the *Done* pill and the toast's
 * *Undo* — and the on-drawer inks are tuned against near-black, so they wash
 * out on cream. The light `base` is the value that was drawn for a light
 * surface, and that is what a selected chip sits on.
 *
 * The dot stays in both states. It is the only thing on the chip carrying the
 * term's colour, and a chip that drops it on selection stops saying which term
 * it is at the moment you have picked it.
 *
 * Falls through to the stored value for a legacy raw hex, which resolves to no
 * token — the same path `themed()` takes.
 */
export function chipDot(ink: string, selected: boolean): string {
	const c = termColorFor(ink);

	if (! c) return ink;

	return selected ? c.base : drawerDot(c);
}

export function hashStr(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

/** The token an unresolvable term falls back to. Deterministic, so it is stable. */
export function fallbackInk(name: string): string {
	return TERM_COLORS[hashStr(name) % TERM_COLORS.length].id;
}

/**
 * Resolves a taxonomy term to its themed colors.
 *
 * Terms are matched by **id** now, not by name — a rename no longer changes a
 * term's identity, so its color no longer jumps when someone fixes a typo.
 *
 * The hashed fallback stays for ids that resolve to nothing. That should be
 * unreachable: D16 refuses to delete a location while items reference it. But
 * `id()` is not a foreign key, so nothing in the database enforces it, and a
 * bug in `deleteTerm` would land here rather than crashing.
 */
export function entityColorFor(id: string, list: Term[], dark: boolean): ThemedColor {
	const found = list.find((e) => e.id === id);
	return themed(found?.ink || fallbackInk(id), dark);
}

/** The display name for a term id, or a visible marker if it resolves to nothing. */
export function termNameFor(id: string, list: Term[]): string {
	return list.find((e) => e.id === id)?.name ?? 'Unknown';
}

/** Derives the status *and* its colors. The derivation itself lives in shared/. */
export function statusFor(qty: unknown, threshold: unknown, dark: boolean): Status {
	const key = statusKeyFor(qty, threshold);

	return { key, label: STATUS_LABEL[key], ...STATUS_COLOR[key][dark ? 'dark' : 'light'] };
}

/**
 * "fill" chips (Location, Type) invert to a solid background when active.
 * "ring" chips (Store) always stay outlined and just get a heavier border and a
 * light tint when active.
 */
export function chipStyle(tc: ThemedColor, active: boolean, theme: Theme, variant?: ChipVariant) {
	if (variant === 'ring') {
		return {
			background: active ? tc.bg : 'transparent',
			color: tc.ink,
			border: `${active ? 2 : 1}px solid ${active ? tc.ink : tc.ring}`,
		};
	}
	return {
		background: active ? tc.dot : tc.bg,
		color: active ? theme.onInk : tc.ink,
		border: '1px solid transparent',
	};
}

export type Theme = {
	/**
	 * Which of the two tables this is.
	 *
	 * Carried on the theme so a component that only needs to pick between two
	 * static class strings — a focus halo, a shadow — does not have to take a
	 * second `dark` prop alongside the theme it already has.
	 */
	dark: boolean;
	pageBg: string; surface: string; surfaceAlt: string;
	border: string; borderStrong: string;
	/**
	 * A hairline *inside* a card, between rows of one list.
	 *
	 * Softer than `border` in light and identical to it in dark, and that
	 * asymmetry is the whole reason it exists: at `#E2D5C0` a rule every 56px
	 * stripes a shopping-list card into a ladder, because the border is doing
	 * edge work and cannot also do interior work. Dark has the opposite problem
	 * — anything softer than `#3E3527` disappears at that fill.
	 */
	divider: string;
	text: string; textStrong: string; textMuted: string; textFaint: string;
	neutralChipBg: string; neutralChipText: string;
	primaryBg: string; primaryText: string;
	inkBg: string; inkText: string;
	dangerText: string;
	/**
	 * Crimson — the brand mark and the *out* status, and nothing else.
	 *
	 * Never a fill you press: D36's rule is that crimson names a consequence
	 * and the ink/cream primary carries the commit. It is theme-aware because
	 * the light value is unreadable on the dark ground.
	 */
	accent: string;
	/**
	 * A primary that is on screen but cannot be pressed — the composer's *Add*
	 * pill with an empty field, the sign-in button mid-redirect.
	 *
	 * A flat fill rather than the ink primary at reduced opacity: opacity would
	 * let the ground through and make the control look like a rendering
	 * artefact, and the spec names the light pair outright.
	 */
	disabledBg: string;
	disabledText: string;
	onInk: string;
	/** The card lift. Barely visible in light and needs real alpha in dark. */
	cardShadow: string;
	/**
	 * The lift on a card that is alone on the ground.
	 *
	 * An order of magnitude past `cardShadow`, and deliberately so: an item card
	 * is one of twenty in a grid and only needs to separate from its neighbours,
	 * while a card outside the shell is the only object on the page and has to
	 * read as sitting *above* it. Every screen before the app uses this one.
	 */
	liftShadow: string;
	/**
	 * The ground as a flat color.
	 *
	 * `pageBg` is a gradient, which a ring offset or a border cannot use. This
	 * is the same ground reduced to one value for those callers.
	 */
	ground: string;
	/**
	 * The drawer is the darkest surface in *both* themes — in dark it drops
	 * below the content ground rather than inverting — so it carries its own
	 * ramp rather than reusing the page's. The four ink values are
	 * theme-independent for the same reason: the surface under them barely
	 * moves.
	 */
	drawer: {
		bg: string;
		raised: string;
		well: string;
		line: string;
		dashed: string;
		ink: string;
		inkMuted: string;
		inkFaint: string;
		label: string;
	};
};

const DRAWER_INK = {
	ink: '#F2E9DA',
	inkMuted: '#D8CBB6',
	inkFaint: '#9E8C74',
	label: '#8A7860',
};

export function getTheme(dark: boolean): Theme {
	/*
	 * Three rules hold across both themes, from the spec:
	 *
	 * 1. The drawer is the darkest surface. In dark it drops *below* the
	 *    content ground rather than inverting.
	 * 2. Cards sit one step above the ground.
	 * 3. Near-black ink is the only thing you press — and in dark that flips to
	 *    cream with ink text, still the single lightest control on screen.
	 *    Crimson is brand-and-out, never a button.
	 *
	 * Type, spacing, radii and layout are identical in both. Only these change,
	 * which is why the dark artboards were generated from the light ones by a
	 * hex-for-hex map: any visual difference is a token difference.
	 */
	return dark
		? {
			dark: true,
			pageBg: 'radial-gradient(135% 105% at 10% -12%, #241E16 0%, #1F1912 45%, #191410 100%)',
			surface: '#2C251B', surfaceAlt: '#221C14',
			border: '#3E3527', borderStrong: '#544737', divider: '#3E3527',
			text: '#DCD0BA', textStrong: '#F2E9DA', textMuted: '#A5937A', textFaint: '#7E6E58',
			neutralChipBg: '#221C14', neutralChipText: '#DCD0BA',
			primaryBg: '#EFE3CE', primaryText: '#241E17',
			inkBg: '#EFE3CE', inkText: '#241E17',
			dangerText: '#E5878D',
			accent: '#D4636B',
			disabledBg: '#3E3527', disabledText: '#7E6E58',
			onInk: '#241E17',
			cardShadow: '0 2px 3px rgba(0, 0, 0, 0.28)',
			liftShadow: '0 24px 60px rgba(0, 0, 0, 0.60)',
			ground: '#1F1912',
			drawer: {
				bg: 'linear-gradient(180deg, #15110B 0%, #0F0C07 100%)',
				raised: '#231D15', well: '#0A0805', line: '#2C2419', dashed: '#3A3025',
				...DRAWER_INK,
			},
		}
		: {
			dark: false,
			pageBg: 'radial-gradient(135% 105% at 10% -12%, #F9F3E9 0%, #F3EADC 45%, #EADFCD 100%)',
			surface: '#FDFAF4', surfaceAlt: '#F2EADC',
			border: '#E2D5C0', borderStrong: '#CFBEA3', divider: '#EEE4D2',
			text: '#4C4237', textStrong: '#241E17', textMuted: '#6F6049', textFaint: '#9B8B75',
			neutralChipBg: '#F2EADC', neutralChipText: '#4C4237',
			primaryBg: '#241E17', primaryText: '#F2E9DA',
			inkBg: '#241E17', inkText: '#F2E9DA',
			dangerText: '#9A2E3B',
			accent: '#BE3346',
			disabledBg: '#EBE1D0', disabledText: '#B0A088',
			onInk: '#FDFAF4',
			cardShadow: '0 2px 3px rgba(36, 30, 23, 0.03)',
			liftShadow: '0 24px 60px rgba(36, 30, 23, 0.28)',
			ground: '#EADFCD',
			drawer: {
				bg: 'linear-gradient(180deg, #2B2419 0%, #1F1A13 100%)',
				raised: '#332B22', well: '#191510', line: '#3B3126', dashed: '#4A4031',
				...DRAWER_INK,
			},
		};
}

/**
 * The page theme remapped onto the drawer's ramp.
 *
 * The drawer is dark in both themes, so anything rendered inside it needs a
 * different set of surfaces than the page — but every panel already takes a
 * `Theme` and paints from its fields. Handing them this instead of a second
 * set of props keeps `MembersPanel` and `InvitesPanel` unaware that they are on
 * a dark slab at all.
 */
export function drawerTheme(theme: Theme): Theme {
	const d = theme.drawer;

	return {
		...theme,
		pageBg: d.bg,
		surface: d.raised,
		surfaceAlt: d.well,
		border: d.line,
		borderStrong: '#4A3E2E',
		divider: d.line,
		text: d.inkMuted,
		textStrong: d.ink,
		textMuted: d.inkFaint,
		textFaint: d.label,
		neutralChipBg: d.raised,
		neutralChipText: d.inkMuted,
		primaryBg: d.ink,
		primaryText: '#241E17',
		inkBg: d.ink,
		inkText: '#241E17',
		dangerText: '#D4636B',
		accent: '#D4636B',
		disabledBg: '#332B22', disabledText: '#8A7860',
		onInk: '#241E17',
		cardShadow: 'none',
		liftShadow: 'none',
	};
}
