import { useEffect, useRef, useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { Eyebrow, OutsideCard } from './OutsideShell';
import { PAGE_BUTTON_PRIMARY, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK } from '../lib/controlStyles';

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
 */
export function FirstRun({ displayName, email, picture, onCreate, onSignOut, theme }: {
	displayName: string;
	email: string;
	/** The Gravatar avatar, when the identity carries one. */
	picture?: string;
	onCreate: (name: string) => Promise<unknown>;
	onSignOut: () => void;
	theme: Theme;
}) {
	/*
	 * Prefilled from the Gravatar name and selected on arrival, so Enter alone
	 * finishes the screen. Named at creation rather than defaulted and renamed
	 * later: the schema has always been multi-household (D3), and a name is the
	 * only thing that will tell two pantries apart in the switcher.
	 */
	const [name, setName] = useState(() => `${displayName.trim() || 'My'}’s Household`);
	const [creating, setCreating] = useState(false);
	const field = useRef<HTMLInputElement | null>(null);

	/*
	 * Focus *and select*, once. `autoFocus` alone would leave the caret at the
	 * end of a name nobody chose, and selecting on every focus would wipe the
	 * field the first time someone clicked back into it to fix a typo.
	 */
	useEffect(() => {
		field.current?.focus();
		field.current?.select();
	}, []);

	const blocked = creating || ! name.trim();

	async function submit() {
		if (blocked) return;

		setCreating(true);
		await onCreate(name.trim());
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
				A household holds your items and the locations, stores and types you sort
				them by. You can rename it later, and invite people once it exists.
			</p>

			<label class="block mt-6">
				<span class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textMuted }}>
					Household name
				</span>
				{/*
				  * The composer's field, and the composer's focus treatment — a
				  * crimson border under a crimson halo. It is the only control on
				  * the card, so it arrives focused and stays that way.
				  */}
				<input
					ref={field}
					value={name}
					onInput={(e) => setName(e.currentTarget.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
					aria-label="Household name"
					class={`w-full h-12 sm:h-11 mt-[9px] px-[13px] rounded-[11px] text-[15px] border focus:border-accent ${theme.dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
					style={{ background: theme.surface, borderColor: theme.textFaint, color: theme.textStrong }}
				/>
			</label>

			<p class="text-[12.5px] leading-[1.5] mt-[9px]" style={{ color: theme.textMuted }}>
				Taken from your Gravatar name — change it to whatever you call the place.
			</p>

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
	const box = { width: `${size}px`, height: `${size}px` };

	if (picture) {
		return (
			<img
				src={picture}
				alt=""
				class="shrink-0 rounded-full object-cover"
				style={{ ...box, border: `1px solid ${theme.border}` }}
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
