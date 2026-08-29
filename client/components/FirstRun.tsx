import { useEffect, useRef, useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { proposeColor } from '../lib/theme';
import { HouseholdIdentity } from './HouseholdIdentity';
import { Eyebrow, OutsideCard } from './OutsideShell';
import { SourceMixRows } from './SourceMixRows';
import { PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';
import type { SourceMix } from '../../shared/seed';
import { DEFAULT_SOURCE_MIX } from '../../shared/seed';

/**
 * A signed-in account with no household gets one screen, not a wizard.
 *
 * Sign-in comes first — there is no anonymous mode — so by the time anyone
 * reaches this, the only thing still missing is a name to hang the pantry on.
 * One field, one button, nothing else.
 *
 * **The seeded terms are deliberately not previewed here.** An earlier draft
 * showed fifteen chips in a recessed panel, explaining what a household is
 * before you had made one. The screen asks for a name; the terms explain
 * themselves in the drawer a second later, where they are also editable.
 *
 * **One field, one button — and one question** (D61). `SourceMixRows` is the
 * exception and the distinction it turns on is preview versus question: the
 * panel that went was *explaining* something the drawer would show anyway,
 * while the three ticks *ask* the one thing the app cannot infer. Its defaults
 * are the household this screen made before it existed, so Enter still
 * finishes here.
 */
export function FirstRun({ displayName, email, picture, onCreate, onSignOut, theme }: {
	displayName: string;
	email: string;
	/** The Gravatar avatar, when the identity carries one. */
	picture?: string;
	onCreate: (name: string, ink: string, sources: SourceMix) => Promise<unknown>;
	onSignOut: () => void;
	theme: Theme;
}) {
	/*
	 * Empty, and **not** seeded from the account's name. *Justin's Household* is
	 * a name nobody chose, and a field that arrives already filled is one most
	 * people will accept — which is how a switcher ends up listing two pantries
	 * that differ only by an apostrophe. Named at creation rather than defaulted
	 * and renamed later: the schema has always been multi-household (D3), and a
	 * name is the only thing that will tell two of them apart.
	 */
	const [name, setName] = useState('');
	/*
	 * Pre-picked, so nobody has to decide something they have no opinion about
	 * (D42). Nothing is taken yet on this screen — it is reachable only with no
	 * households at all — so this is always the palette's first.
	 */
	const [ink, setInk] = useState(() => proposeColor([]));
	/*
	 * Buy on, grow and make off — and this is the one default on either name
	 * screen, which is not the contradiction of D48 it looks like. D48 forbids
	 * *prefilling a name*, because a name nobody typed is not an answer and
	 * Enter would submit it as though it were. A tick is not a name: it is a
	 * closed question whose commonest answer is knowably yes, it is legible
	 * without reading a field, and the hint under it says what it will do.
	 */
	const [sources, setSources] = useState<SourceMix>(DEFAULT_SOURCE_MIX);
	const [creating, setCreating] = useState(false);
	const field = useRef<HTMLDivElement | null>(null);

	/*
	 * Focus, once. There is nothing to select any more — the field is empty, and
	 * `HouseholdIdentity`'s own placeholder says what belongs in it.
	 */
	useEffect(() => {
		field.current?.querySelector('input')?.focus();
	}, []);

	const blocked = creating || ! name.trim();

	async function submit() {
		if (blocked) return;

		setCreating(true);
		await onCreate(name.trim(), ink, sources);
		setCreating(false);
	}

	return (
		<OutsideCard theme={theme}>
			<Eyebrow theme={theme}>New household</Eyebrow>

			<h1
				class="font-disp text-[24px] sm:text-[26px] font-semibold leading-[1.22] tracking-[-0.005em] mt-4"
				style={{ color: theme.textStrong }}
			>
				Name your household
			</h1>

			<p class="text-[15px] leading-[1.55] mt-2.5" style={{ color: theme.text }}>
				A household holds your items and the locations, sources, and types you
				sort them by. You can rename it later, and invite people once it exists.
			</p>

			<div class="mt-6" ref={field}>
				<span class="block text-label font-bold uppercase tracking-[0.15em] mb-[9px]" style={{ color: theme.textMuted }}>
					Household name and color
				</span>
				{/*
				  * The composer's row, on cream. The swatch is *part of* the field
				  * rather than a second question, which is what keeps this "one
				  * field, one button, nothing else" — Enter still finishes the
				  * screen without the picker ever opening.
				  */}
				<HouseholdIdentity
					name={name}
					ink={ink}
					onName={setName}
					onInk={setInk}
					onSubmit={() => void submit()}
					fieldHeight={44}
					fieldLine={theme.textFaint}
					theme={theme}
				/>
			</div>

			<p class="text-[12.5px] leading-[1.5] mt-[9px]" style={{ color: theme.textMuted }}>
				The color is how you will tell it apart later.
			</p>

			<SourceMixRows value={sources} onChange={setSources} theme={theme} />

			<button
				type="button"
				onClick={() => void submit()}
				disabled={blocked}
				class={`w-full h-12 mt-[26px] rounded-[13px] text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
				style={{
					background: blocked ? theme.disabledBg : theme.inkBg,
					color: blocked ? theme.disabledText : theme.inkText,
				}}
			>
				{creating ? 'Setting up…' : 'Create household'}
			</button>

			<SignedInRow
				displayName={displayName}
				email={email}
				picture={picture}
				onSignOut={onSignOut}
				theme={theme}
			/>
		</OutsideCard>
	);
}

/**
 * Who this is about to be attached to, and the way out of the wrong account.
 *
 * On first run it answers "which account am I doing this under" *before* the
 * household exists rather than after, which is the only moment the answer is
 * cheap to act on. On the invite card it answers the same question about a
 * household somebody else owns. It is the only sign-out on any screen outside
 * the shell — everywhere else it lives in the drawer.
 */
export function SignedInRow({ displayName, email, picture, onSignOut, theme }: {
	displayName: string;
	email: string;
	picture?: string;
	onSignOut: () => void;
	theme: Theme;
}) {
	return (
		<div
			class="flex items-center gap-[11px] mt-[18px] pt-[18px]"
			style={{ borderTop: `1px solid ${theme.border}` }}
		>
			<Avatar displayName={displayName} picture={picture} theme={theme} />

			<span class="flex flex-col gap-px min-w-0 flex-1">
				<span class="text-[14px] font-semibold truncate" style={{ color: theme.textStrong }}>
					{displayName}
				</span>
				{email && (
					<span class="text-[12.5px] truncate" style={{ color: theme.textMuted }}>{email}</span>
				)}
			</span>

			{/*
			  * 44px tall rather than the 18px its 13.5px text would give it. Every
			  * affordance on a card outside the shell clears the touch target,
			  * including the quiet ones — this one was the reason the rule exists.
			  */}
			<button
				type="button"
				onClick={onSignOut}
				class="shrink-0 flex items-center h-11 px-2.5 -mr-2.5 rounded-[11px] text-[13.5px] font-semibold transition-colors hover:opacity-80"
				style={{ color: theme.text }}
			>
				Sign out
			</button>
		</div>
	);
}

/** The Gravatar picture, or the initial on the sunk fill when there isn't one. */
export function Avatar({ displayName, picture, theme, size = 34 }: {
	displayName: string;
	picture?: string;
	theme: Theme;
	size?: number;
}) {
	// The URL that did not load. `DrawerAvatar` carries the same pair and the
	// same reason: the platform's avatar URL uses `d=404`, so an account without
	// a Gravatar serves nothing and this is what draws the letter instead of the
	// browser's broken-image glyph.
	const [failed, setFailed] = useState('');

	const box = { width: `${size}px`, height: `${size}px` };

	if (picture && failed !== picture) {
		return (
			<img
				src={picture}
				alt=""
				class="shrink-0 rounded-full object-cover"
				style={{ ...box, border: `1px solid ${theme.border}` }}
				onError={() => setFailed(picture)}
			/>
		);
	}

	return (
		<span
			class="shrink-0 flex items-center justify-center rounded-full font-semibold"
			style={{
				...box,
				fontSize: `${Math.round(size * 0.41)}px`,
				background: theme.surfaceAlt,
				border: `1px solid ${theme.border}`,
				color: theme.text,
			}}
			aria-hidden="true"
		>
			{(displayName || '?').charAt(0).toUpperCase()}
		</span>
	);
}
