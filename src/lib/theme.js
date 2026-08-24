/**
 * Color + theme helpers.
 *
 * Every location, type, store, and status is described by a single base "ink"
 * hex. The helpers below derive a matching background tint and ring from that
 * one value so a new color only ever has to be picked once.
 */

export const DEFAULT_PALETTE = [
	'#8C4A2F', '#3C6B3C', '#96631A', '#2C5A6E', '#6B5B7A',
	'#7A5230', '#8C2F6B', '#2F6B8C', '#5B6B3F', '#8C2F2F',
];

export const STATUS_INK = { out: '#8C2F2F', low: '#96631A', ok: '#3C6B3C' };

function hexToRgb(hex) {
	const n = parseInt(hex.replace('#', ''), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lighten(hex, amt) {
	const [r, g, b] = hexToRgb(hex);
	const mix = (c) => Math.round(c + (255 - c) * amt);
	return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function withAlpha(hex, a) {
	const [r, g, b] = hexToRgb(hex);
	return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function themed(inkHex, dark) {
	return dark
		? { ink: lighten(inkHex, 0.55), bg: withAlpha(inkHex, 0.22), ring: withAlpha(inkHex, 0.45) }
		: { ink: inkHex, bg: lighten(inkHex, 0.88), ring: lighten(inkHex, 0.72) };
}

export function hashStr(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

export function fallbackInk(name) {
	return DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length];
}

/**
 * Resolves any named taxonomy term (location, type, or store) to its themed
 * colors, falling back to a stable hashed color for terms that no longer exist.
 */
export function entityColorFor(name, list, dark) {
	const found = list.find((e) => e.name === name);
	return themed(found?.ink || fallbackInk(name), dark);
}

export function statusFor(qty, threshold, dark) {
	if (qty <= 0) return { key: 'out', label: 'Out', ...themed(STATUS_INK.out, dark) };
	if (qty <= threshold) return { key: 'low', label: 'Low', ...themed(STATUS_INK.low, dark) };
	return { key: 'ok', label: 'In stock', ...themed(STATUS_INK.ok, dark) };
}

/**
 * "fill" chips (Location, Type) invert to a solid background when active.
 * "ring" chips (Store) always stay outlined and just get a heavier border and a
 * light tint when active.
 */
export function chipStyle(tc, active, theme, variant) {
	if (variant === 'ring') {
		return {
			background: active ? tc.bg : 'transparent',
			color: tc.ink,
			border: `${active ? 2 : 1}px solid ${active ? tc.ink : tc.ring}`,
		};
	}
	return {
		background: active ? tc.ink : tc.bg,
		color: active ? theme.onInk : tc.ink,
		border: '1px solid transparent',
	};
}

export function getTheme(dark) {
	return dark
		? {
			pageBg: '#1B1D16', surface: '#242620', surfaceAlt: '#1F211B',
			border: '#33352A', borderStrong: '#454736',
			text: '#EDE9DB', textStrong: '#F5F2E8', textMuted: '#9C9680', textFaint: '#726C5A',
			neutralChipBg: '#2F3126', neutralChipText: '#C9C3AE',
			primaryBg: '#5C7A4A', primaryText: '#F5F2E8',
			inkBg: '#EDE9DB', inkText: '#1B1D16',
			dangerText: '#D69999',
			onInk: '#1B1D16',
		}
		: {
			pageBg: '#F5F2EA', surface: '#FFFFFF', surfaceAlt: '#FAF8F2',
			border: '#DED6C3', borderStrong: '#CFC6AC',
			text: '#20241E', textStrong: '#1E2A1E', textMuted: '#8A8265', textFaint: '#A9A38A',
			neutralChipBg: '#F5F2EA', neutralChipText: '#20241E',
			primaryBg: '#3C4A32', primaryText: '#F5F2EA',
			inkBg: '#20241E', inkText: '#F5F2EA',
			dangerText: '#B08787',
			onInk: '#FFFFFF',
		};
}
