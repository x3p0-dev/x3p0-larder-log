/**
 * Color + theme helpers.
 *
 * Every location, type, store, and status is described by a single base "ink"
 * hex. The helpers below derive a matching background tint and ring from that
 * one value so a new color only ever has to be picked once.
 *
 * These are all *inline style* values, not Tailwind classes, and that is load
 * bearing on this platform: Zero compiles utility classes by scanning source
 * for static strings, so a computed `bg-${hex}` would emit no CSS at all. A
 * user-picked hex can never be a class name here.
 */

import type { StatusKey } from '../../shared/status';
import { STATUS_LABEL, statusKeyFor } from '../../shared/status';
import type { Term } from '../../shared/types';

export type ThemedColor = {
	ink: string;
	bg: string;
	ring: string;
};

export type Status = ThemedColor & {
	key: StatusKey;
	label: string;
};

export type ChipVariant = 'fill' | 'ring';

export const DEFAULT_PALETTE = [
	'#8C4A2F', '#3C6B3C', '#96631A', '#2C5A6E', '#6B5B7A',
	'#7A5230', '#8C2F6B', '#2F6B8C', '#5B6B3F', '#8C2F2F',
];

export const STATUS_INK: Record<StatusKey, string> = {
	out: '#8C2F2F',
	low: '#96631A',
	ok: '#3C6B3C',
};

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

export function themed(inkHex: string, dark: boolean): ThemedColor {
	return dark
		? { ink: lighten(inkHex, 0.55), bg: withAlpha(inkHex, 0.22), ring: withAlpha(inkHex, 0.45) }
		: { ink: inkHex, bg: lighten(inkHex, 0.88), ring: lighten(inkHex, 0.72) };
}

export function hashStr(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
	return h;
}

export function fallbackInk(name: string): string {
	return DEFAULT_PALETTE[hashStr(name) % DEFAULT_PALETTE.length];
}

/**
 * Resolves any named taxonomy term (location, type, or store) to its themed
 * colors, falling back to a stable hashed color for terms that no longer exist.
 */
export function entityColorFor(name: string, list: Term[], dark: boolean): ThemedColor {
	const found = list.find((e) => e.name === name);
	return themed(found?.ink || fallbackInk(name), dark);
}

/** Derives the status *and* its colors. The derivation itself lives in shared/. */
export function statusFor(qty: unknown, threshold: unknown, dark: boolean): Status {
	const key = statusKeyFor(qty, threshold);
	return { key, label: STATUS_LABEL[key], ...themed(STATUS_INK[key], dark) };
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
		background: active ? tc.ink : tc.bg,
		color: active ? theme.onInk : tc.ink,
		border: '1px solid transparent',
	};
}

export type Theme = {
	pageBg: string; surface: string; surfaceAlt: string;
	border: string; borderStrong: string;
	text: string; textStrong: string; textMuted: string; textFaint: string;
	neutralChipBg: string; neutralChipText: string;
	primaryBg: string; primaryText: string;
	inkBg: string; inkText: string;
	dangerText: string;
	onInk: string;
};

export function getTheme(dark: boolean): Theme {
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
