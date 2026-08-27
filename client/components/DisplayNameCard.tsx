import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { Avatar } from './FirstRun';
import { Eyebrow, OutsideCard } from './OutsideShell';
import { PAGE_BUTTON_PRIMARY, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK } from '../lib/controlStyles';
import { MAX_DISPLAY_NAME, normalizeDisplayName } from '../../shared/profile';

/**
 * What should we call you — the first screen of a new account.
 *
 * **Its own step, before the fork** (D46). Someone accepting an invite never
 * sees *Name your household*, and they are exactly the person whose name other
 * people need to see, so this is asked once immediately after first sign-in and
 * before the path splits into create-a-household and accept-an-invite.
 *
 * The card is the one every screen outside the shell uses, left-aligned, with
 * the account it is about named at the top rather than at the bottom. That is
 * the one structural difference from `FirstRun`, and it is deliberate: this
 * screen is *about* the account, so who you are is context for the question
 * rather than a footnote under the answer.
 */
export function DisplayNameCard({ suggestion, email, picture, onSubmit, onSignOut, theme }: {
	/**
	 * The identity's own name, which is a **suggestion and not an answer** — it
	 * is whatever Gravatar or the Spacefast signup happened to carry, and half
	 * the reason this screen exists is that it is often nothing at all.
	 */
	suggestion: string;
	email: string;
	/** The Gravatar avatar, when the identity carries one. */
	picture?: string;
	/** True when the server took it. False leaves the field and its typing alone. */
	onSubmit: (name: string) => Promise<boolean>;
	onSignOut: () => void;
	theme: Theme;
}) {
	const [name, setName] = useState(() => normalizeDisplayName(suggestion));
	const [saving, setSaving] = useState(false);
	/*
	 * Tracked rather than left to CSS because the focused border is a colour,
	 * and an inline `border` cannot carry a `:focus` variant. The halo beside it
	 * is a class for the opposite reason — a box-shadow can.
	 */
	const [focused, setFocused] = useState(false);
	const field = useRef<HTMLInputElement | null>(null);

	/*
	 * Whether *Gravatar* had a name, fixed at mount. The hint below the field
	 * explains where the value came from, so it must not change into "Gravatar
	 * didn't have a name for you" the moment somebody clears the field to type
	 * their own.
	 */
	const inherited = useMemo(() => normalizeDisplayName(suggestion) !== '', [suggestion]);

	/*
	 * Focus *and select*, once — the same rule as `FirstRun`. A prefilled field
	 * with the caret parked at the end asks you to delete a name you did not
	 * choose; selecting it makes typing over it the default gesture. Selecting
	 * on every focus would instead wipe the field the first time someone clicked
	 * back in to fix a typo.
	 */
	useEffect(() => {
		field.current?.focus();
		field.current?.select();
	}, []);

	const blocked = saving || ! normalizeDisplayName(name);

	async function submit() {
		if (blocked) return;

		setSaving(true);
		await onSubmit(normalizeDisplayName(name));
		setSaving(false);
	}

	return (
		<OutsideCard theme={theme}>
			<Eyebrow theme={theme}>New account</Eyebrow>

			{/*
			  * Which account this is about to be attached to, and the way out of
			  * the wrong one. The boards draw the row without a sign-out; it is
			  * here because this screen is **required**, so without one an account
			  * signed in by mistake has no exit that is not clearing cookies. Same
			  * control, same treatment as `SignedInRow`'s.
			  */}
			<div class="flex items-center gap-3.5 mt-4">
				<Avatar displayName={name || email} picture={picture} theme={theme} size={52} />

				<span class="flex flex-col gap-0.5 min-w-0 flex-1">
					{email && (
						<span class="text-[13px] truncate" style={{ color: theme.textMuted }}>{email}</span>
					)}
					<span class="text-[12.5px] truncate" style={{ color: theme.textFaint }}>
						Signed in with Gravatar
					</span>
				</span>

				<button
					type="button"
					onClick={onSignOut}
					class="shrink-0 flex items-center h-11 px-2.5 -mr-2.5 rounded-[11px] text-[13.5px] font-semibold transition-colors hover:opacity-80"
					style={{ color: theme.text }}
				>
					Sign out
				</button>
			</div>

			<h1
				class="font-disp text-[24px] sm:text-[26px] font-semibold leading-[1.22] tracking-[-0.005em] mt-5"
				style={{ color: theme.textStrong }}
			>
				What should we call you?
			</h1>

			{/*
			  * The second sentence is doing real work: it is the answer to "do I
			  * have to do this again for the next household".
			  */}
			<p class="text-[15px] leading-[1.55] mt-2.5" style={{ color: theme.text }}>
				This is the name everyone else in your household sees — on invites, in
				Members, and beside anything you change. It belongs to your account, not
				to one household.
			</p>

			<label
				for="display-name"
				class="block text-label font-bold uppercase tracking-[0.15em] mt-6 mb-[9px]"
				style={{ color: theme.textMuted }}
			>
				Display name
			</label>

			{/*
			  * No placeholder, even empty. A greyed name in the field is a name
			  * somebody has to notice is not theirs before they can disagree with
			  * it, and the hint underneath already says what to do.
			  */}
			<input
				id="display-name"
				ref={field}
				value={name}
				onInput={(e) => setName(e.currentTarget.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onKeyDown={(e) => {
					if (e.key !== 'Enter') return;
					e.preventDefault();
					void submit();
				}}
				maxLength={MAX_DISPLAY_NAME}
				autoComplete="name"
				class={`w-full h-11 px-[13px] rounded-[11px] text-[15px] ${theme.dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
				style={{
					background: theme.surface,
					border: `1px solid ${focused ? theme.accent : theme.textFaint}`,
					color: theme.textStrong,
				}}
			/>

			<p class="text-[12.5px] leading-[1.5] mt-[9px]" style={{ color: theme.textMuted }}>
				{inherited
					? 'From your Gravatar profile. Change it if you’d rather be called something else.'
					: 'Gravatar didn’t have a name for you. Pick one — it’s the only thing the rest of your household will see.'}
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
				{saving ? 'Saving…' : 'Continue'}
			</button>
		</OutsideCard>
	);
}
