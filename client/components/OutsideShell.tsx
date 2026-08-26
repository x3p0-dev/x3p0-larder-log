import type { ComponentChildren } from 'preact';

import type { Theme } from '../lib/theme';
import { GravatarMark } from './Brand';
import { PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';

/**
 * The furniture shared by every screen before the app shell: sign-in, the
 * handoff, first run, and the `?join=` landing.
 *
 * All four are one 440px card on the ground gradient, and all four are short
 * enough to sit inside 390 x 844 without scrolling — which is the point of
 * keeping them to one decision each.
 */

/** The ground, the color scheme, and the centring. Nothing else. */
export function OutsideShell({ dark, theme, children }: {
	dark: boolean;
	theme: Theme;
	children: ComponentChildren;
}) {
	return (
		<div
			class="font-sans min-h-screen w-full flex items-center justify-center px-4 py-8"
			style={{ background: theme.pageBg, color: theme.text, colorScheme: dark ? 'dark' : 'light' }}
		>
			{children}
		</div>
	);
}

/**
 * The card itself. 440px, radius 20, and `100% − 32px` below that.
 *
 * **The border follows the confirm modal, not the item card.** At `#2C251B` on
 * `#1F1912` a card separates from the ground at 1.27:1 and the item card's
 * shadow does nothing at all, so dark takes `line strong` where light takes
 * `line`, and both take the much heavier `liftShadow`. Every card outside the
 * shell is the only object on its page and has to read as sitting above it.
 */
export function OutsideCard({ align = 'left', theme, children }: {
	/** Centred greets; left-aligned asks. The sign-in card is the only greeting. */
	align?: 'left' | 'center';
	theme: Theme;
	children: ComponentChildren;
}) {
	return (
		<div
			class={`w-full max-w-[440px] rounded-[20px] px-6 py-[30px] sm:px-8 sm:py-[34px] ${align === 'center' ? 'flex flex-col items-center text-center' : 'text-left'}`}
			style={{
				background: theme.surface,
				border: `1px solid ${theme.dark ? theme.borderStrong : theme.border}`,
				boxShadow: theme.liftShadow,
			}}
		>
			{children}
		</div>
	);
}

/** The section label that opens a card — `SIGN-IN REQUIRED`, `INVITATION`. */
export function Eyebrow({ theme, children }: { theme: Theme; children: ComponentChildren }) {
	return (
		<p class="text-label font-bold uppercase tracking-[0.15em] leading-none" style={{ color: theme.textMuted }}>
			{children}
		</p>
	);
}

/**
 * The one control on a card outside the shell.
 *
 * **Crimson is still never a button** — this is the ordinary ink/cream primary,
 * the same fill as *Add item*. Its three states are the handoff's: at rest it
 * invites, pressed it takes the disabled tokens and says where you are going,
 * and it is never the thing that reports a failure.
 */
export function GravatarButton({ label, pending, mark = true, onPress, theme, width, height }: {
	label: string;
	/** Redirecting. The mark becomes a spinner and the fill goes flat. */
	pending?: boolean;
	/** False for a button that only *goes* somewhere — *Open Larder Log*. */
	mark?: boolean;
	onPress: () => void;
	theme: Theme;
	/** Full width on a card; a fixed 268px on the marketing page. */
	width?: string;
	/** 48px on a card, 52px on the marketing page. Never both — see below. */
	height?: string;
}) {
	const flat = Boolean(pending);
	const ink = flat ? theme.disabledText : theme.inkText;

	/*
	 * Both size classes are props rather than an override appended to a default.
	 * Tailwind gives `h-12` and `h-[52px]` no reliable order against each other,
	 * so a caller "overriding" the height would get whichever the compiler
	 * happened to emit last.
	 *
	 * `px-5` is not decoration. `w-full` is only as wide as whatever box the
	 * caller put this in, and a shrink-to-fit wrapper collapses it onto the
	 * label — the padding is what keeps that from reading as a broken button.
	 */
	return (
		<button
			type="button"
			onClick={onPress}
			disabled={flat}
			class={`flex items-center justify-center gap-[9px] px-5 rounded-[13px] text-base font-semibold ${height ?? 'h-12'} ${width ?? 'w-full'} ${PAGE_BUTTON_PRIMARY}`}
			style={{ background: flat ? theme.disabledBg : theme.inkBg, color: ink }}
		>
			{pending
				? <Spinner size={20} color={ink} />
				: mark && <GravatarMark size={20} color={ink} />}
			{pending ? 'Opening Gravatar…' : label}
		</button>
	);
}

/**
 * A ring with one quarter drawn, turning.
 *
 * Deliberately the same silhouette as the Gravatar mark, so the button's
 * pressed state reads as that mark spinning rather than as a different glyph
 * swapped in. That is why the radius and stroke track the mark's: it moved from
 * 8.4 to 10 when the real Gravatar drawing replaced the placeholder, and a
 * spinner left behind would have shrunk the glyph on press.
 */
export function Spinner({ size, color }: { size: number; color: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			class="animate-spin"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" stroke={color} stroke-width="2" stroke-opacity="0.28" />
			<path d="M22 12a10 10 0 0 0-10-10" stroke={color} stroke-width="2" stroke-linecap="round" />
		</svg>
	);
}

/**
 * The icon disc a card leads with when it is reporting rather than asking.
 *
 * Which tint it takes is the whole argument: **amber is "hold on", crimson is
 * "gone", green is "already true"**. A sign-in that never finished and an
 * expired invite destroyed nothing, so neither gets the out tokens — and
 * already-a-member is not a problem at all, so it takes the third rung of the
 * same status ramp the item badges use.
 */
export function IconDisc({ tint, children }: {
	tint: { bg: string; ring: string; ink: string };
	children: ComponentChildren;
}) {
	return (
		<span
			class="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
			style={{ background: tint.bg, border: `1px solid ${tint.ring}`, color: tint.ink }}
			aria-hidden="true"
		>
			{children}
		</span>
	);
}
