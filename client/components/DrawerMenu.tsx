import type { ComponentChildren } from 'preact';

import type { Theme } from '../lib/theme';

/**
 * A menu that flies out over the drawer.
 *
 * Two of them exist — the role menu in the Members pane and the account menu
 * above the drawer's foot row — and they are one box: `drawer.menu` on
 * `drawer.menuLine` at radius 14, 6px of padding, and a shadow deep enough to
 * lift it off a surface it is nearly the colour of.
 *
 * **Deliberately not the sort menu's popover.** Reusing that was free and
 * already consistent, and it broke the first rule of the theming section: the
 * brightest thing on the page opening over the darkest panel in the app. What
 * shipped is this surface with the sort menu's *mechanics* — 6px padding,
 * radius 9 rows, and a crimson check rather than a fill on the current value,
 * so a hovered row still reads.
 *
 * Positioning is the caller's, because the two differ: the role menu drops
 * below its trigger and right-aligns to it, the account menu opens upward. So
 * does dismissal — see `useDismiss`, which needs a box holding the trigger too.
 */
export function DrawerMenu({
	label, role = 'menu', width, place, theme, children,
}: {
	label: string;
	role?: 'menu' | 'dialog';
	/** A CSS length, so a caller pinned near an edge can clamp it against the width it has. */
	width: string;
	/** Where it sits relative to the wrapper the caller marked `relative`. */
	place: string;
	theme: Theme;
	children: ComponentChildren;
}) {
	const d = theme.drawer;

	return (
		<div
			role={role}
			aria-label={label}
			class={`absolute z-50 p-1.5 rounded-[14px] ${place}`}
			style={{
				width,
				background: d.menu,
				border: `1px solid ${d.menuLine}`,
				boxShadow: '0 16px 40px rgba(10, 8, 5, 0.44)',
			}}
		>
			{children}
		</div>
	);
}

/** The hairline between a menu's groups. Inset, like the sort menu's. */
export function DrawerMenuRule({ theme }: { theme: Theme }) {
	return <span class="block h-px mx-1.5 my-[5px]" style={{ background: theme.drawer.line }} />;
}
