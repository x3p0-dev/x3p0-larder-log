/**
 * A person, on the drawer.
 *
 * The fallback is an initial on the **neutral avatar fill** — `#4A3E2E` with an
 * inset hairline — and not a term colour, deliberately: term colours mean
 * *term* everywhere else in this app, and a person is not a term. It is the
 * same argument that keeps a role out of a tag, and the reason a household gets
 * a colour where an account does not.
 *
 * Theme-independent, because the drawer is dark in both themes.
 *
 * Separate from `FirstRun`'s `Avatar`, which paints from a `Theme` and is drawn
 * for the cream cards outside the shell. Handing that one `drawerTheme()` gets
 * the well's near-black rather than the fill the boards name.
 */
export function DrawerAvatar({
	name, picture, size, ring, stackRing,
}: {
	name: string;
	/** The Gravatar image, where the account has one. Renders instead of the initial. */
	picture?: string;
	size: number;
	/**
	 * A 2px cream ring, marking this avatar as the thing that opened the menu
	 * you are looking at. On the circle rather than behind it, so it follows the
	 * shape instead of boxing it.
	 */
	ring?: boolean;
	/**
	 * A 2px ring in the surface behind, for the overlapping trio on the Members
	 * row. It is what separates three circles sitting 9px into each other.
	 */
	stackRing?: string;
}) {
	const rings = [
		stackRing ? `0 0 0 2px ${stackRing}` : '',
		ring ? '0 0 0 2px #F2E9DA' : '',
		'inset 0 0 0 1px #63533E',
	].filter(Boolean).join(', ');

	const box = { width: `${size}px`, height: `${size}px`, boxShadow: rings };

	if (picture) {
		return <img src={picture} alt="" class="shrink-0 rounded-full object-cover" style={box} />;
	}

	return (
		<span
			class="shrink-0 flex items-center justify-center rounded-full font-semibold"
			style={{
				...box,
				background: '#4A3E2E',
				color: '#DCD0BA',
				// 0.44 of the side, so a fifth size is a number rather than a
				// table entry — the rule `HouseholdTile` already follows.
				fontSize: `${Math.round(size * 0.44)}px`,
			}}
			aria-hidden="true"
		>
			{(name || '?').charAt(0).toUpperCase()}
		</span>
	);
}
