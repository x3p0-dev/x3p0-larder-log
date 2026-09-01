import { useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { claimInitial } from '../../shared/claim';

/**
 * A person's face, on a cream surface.
 *
 * **A real Gravatar wherever there is one** (D55) — a person in this app has a
 * face on the Members pane, in the Settings trio, on the drawer's foot row and
 * across the admin console, and the two callers here are no different. The
 * claimed row was drawn as a letter first, on the argument that 18px is too
 * small for a photograph; that is a reason to accept a smudge, not a reason to
 * invent a rule the rest of the app does not follow.
 *
 * **`onError` is load-bearing and not defensive**, exactly as `DrawerAvatar`'s
 * is. The platform's URL carries `d=404` deliberately, so an account *without* a
 * Gravatar serves no image at all and the consumer draws its own initial —
 * without this, that account gets the browser's broken-image glyph, which is the
 * one outcome worse than the letter. It holds the URL that **failed** rather
 * than a boolean, so a changed picture retries with no effect to reset a flag.
 *
 * It cannot reuse `DrawerAvatar`, which is theme-independent because the drawer
 * is dark in both themes and hard-codes that palette. This sits on cream.
 *
 * The fallback fill is neutral rather than a term colour: term colours mean
 * *term* everywhere else, and a person is not a term — `DrawerAvatar`'s own
 * argument, one surface over.
 *
 * **The letter is 0.44 of the side**, which is `DrawerAvatar`'s rule and the
 * reason a third size is a number rather than a table entry.
 */
export function PersonAvatar({ name, picture, size = 22, theme }: {
	name: string;
	/** The Gravatar image, where the account has one. `''` draws the initial. */
	picture: string;
	/**
	 * 22 on the run list, **matching the checkbox it stands in for** — not the
	 * 18 D66's design gave it, which was a number for the count slot beside 13px
	 * text. There it shares a column with `CheckBox`, and a circle four pixels
	 * shy of the boxes above it reads as floating rather than as the same answer
	 * in a different state.
	 *
	 * 18 on the pre-flight's transfer trigger, where it sits inside a 30px pill
	 * beside 13.5px text and the checkbox argument does not apply.
	 */
	size?: number;
	theme: Theme;
}) {
	const [failed, setFailed] = useState('');

	const box = {
		width: `${size}px`,
		height: `${size}px`,
		border: `1px solid ${theme.borderStrong}`,
	};

	if (picture && failed !== picture) {
		return (
			<img
				src={picture}
				alt=""
				aria-hidden="true"
				class="rounded-full shrink-0 object-cover"
				style={box}
				onError={() => setFailed(picture)}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			class="inline-flex items-center justify-center rounded-full shrink-0 font-semibold"
			style={{
				...box,
				background: theme.surfaceAlt,
				color: theme.textMuted,
				fontSize: `${Math.round(size * 0.44)}px`,
			}}
		>
			{claimInitial(name)}
		</span>
	);
}
