import { useEffect, useRef, useState } from 'preact/hooks';

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
export function DisplayNameCard({ email, picture, onSubmit, onSignOut, theme }: {
	email: string;
	/** The Gravatar avatar, when the identity carries one. */
	picture?: string;
	/** True when the server took it. False leaves the field and its typing alone. */
	onSubmit: (name: string) => Promise<boolean>;
	onSignOut: () => void;
	theme: Theme;
}) {
	/*
	 * Empty, and **not** seeded from the identity. The account's own name is a
	 * suggestion at best — an account made with an emailed code or a password
	 * has no profile behind it, and one made through WordPress.com carries a
	 * name chosen somewhere else for something else. A prefilled field asks a
	 * question it has already answered, so most people press Continue and the
	 * screen collects nothing. Typing it is the point.
	 */
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);
	/*
	 * Tracked rather than left to CSS because the focused border is a colour,
	 * and an inline `border` cannot carry a `:focus` variant. The halo beside it
	 * is a class for the opposite reason — a box-shadow can.
	 */
	const [focused, setFocused] = useState(false);
	const field = useRef<HTMLInputElement | null>(null);

	/*
	 * Focus, once. There is nothing to select any more — the field is empty and
	 * the caret is already where anyone would put it.
	 */
	useEffect(() => {
		field.current?.focus();
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
						Signed in
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
			  * No placeholder. The label names the field and the paragraph above
			  * says what the name is for; a grey word inside an empty box would
			  * only be a third statement of the same thing, and the one thing a
			  * placeholder must never be here is an example name — this screen
			  * exists because a name nobody typed is not an answer.
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
