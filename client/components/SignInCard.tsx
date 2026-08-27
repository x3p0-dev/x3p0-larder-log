import { Clock } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import { AppTile, Wordmark } from './Brand';
import { Eyebrow, IconDisc, OutsideCard, SignInButton, Spinner } from './OutsideShell';

/**
 * The sign-in card, and the three states of the handoff behind it.
 *
 * **One button, and it names nothing.** The account is a Spacefast one and its
 * sign-in screen offers WordPress.com, an emailed code, or a password — so the
 * button says the act rather than a provider, and the lanes stay the next
 * screen's business. Nothing here is a credential field: no sign-up form, no
 * forgot-password, no reset and no strength rules — four screens that never
 * have to exist. The footnote says the first sign-in creates the account out
 * loud, because a single-button auth page with no visible *Sign up* reads as
 * broken otherwise.
 *
 * This card is not the front door. `/` is a marketing page; this is what any
 * *other* URL shows a signed-out visitor, and the eyebrow says which of the two
 * you are looking at.
 */
export function SignInCard({ pending, onSignIn, theme }: {
	/** The redirect is in flight. Nothing on the card moves except the button. */
	pending: boolean;
	onSignIn: () => void;
	theme: Theme;
}) {
	return (
		// Centred text, which no other surface in the app uses. This is the one
		// screen that greets rather than asks.
		<OutsideCard align="center" theme={theme}>
			<Eyebrow theme={theme}>Sign-in required</Eyebrow>

			<div class="mt-5">
				<AppTile size={56} radius={12} />
			</div>

			<h1 class="mt-5">
				<Wordmark size="text-wordmark-md sm:text-wordmark-lg" theme={theme} />
			</h1>

			<p class="text-[15.5px] leading-[1.55] mt-3.5" style={{ color: theme.text }}>
				What&rsquo;s in the pantry and the freezer, who&rsquo;s running low, and what to buy where.
			</p>

			<p class="text-[13px] sm:text-[13.5px] leading-[1.5] mt-2" style={{ color: theme.textMuted }}>
				Sign in to open your household.
			</p>

			<div class="w-full mt-[26px]">
				<SignInButton
					label="Sign in"
					pending={pending}
					onPress={onSignIn}
					theme={theme}
				/>
			</div>

			<p class="text-[13px] leading-[1.5] mt-4" style={{ color: theme.textMuted }}>
				New here? Signing in creates your account.
			</p>
		</OutsideCard>
	);
}

/**
 * Back from the sign-in screen, waiting on Zero to say who arrived.
 *
 * The card's *contents* are replaced rather than the card — same width, same
 * position, so nothing jumps between pressing the button and landing in the
 * pantry.
 */
export function SigningInCard({ theme }: { theme: Theme }) {
	return (
		<OutsideCard align="center" theme={theme}>
			<div class="flex flex-col items-center py-3.5">
				<span
					class="flex items-center justify-center w-11 h-11 rounded-full"
					style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
				>
					<Spinner size={22} color={theme.textMuted} />
				</span>

				<h1
					class="font-disp text-[21px] font-semibold leading-[1.22] tracking-[-0.005em] mt-[18px]"
					style={{ color: theme.textStrong }}
				>
					Signing you in&hellip;
				</h1>

				<p class="text-[13.5px] leading-[1.5] mt-2" style={{ color: theme.textMuted }}>
					One moment — bringing your household across.
				</p>
			</div>
		</OutsideCard>
	);
}

/**
 * The visitor came back from the sign-in screen still signed out.
 *
 * **Amber, not crimson** — the same rule the blocked dialog runs on: amber is
 * "hold on", crimson is "gone". An abandoned sign-in destroyed nothing, so it
 * does not get the *out* tokens. It also isn't a modal, because there is
 * nothing underneath it to go back to.
 *
 * Left-aligned where the sign-in card is centred: this is a message with a body
 * to read, and the confirm modal's icon → title → body → action order already
 * exists for exactly that shape.
 */
export function SignInFailedCard({ pending, onRetry, theme }: {
	pending: boolean;
	onRetry: () => void;
	theme: Theme;
}) {
	const amber = statusColor('low', theme.dark);

	return (
		<OutsideCard theme={theme}>
			<IconDisc tint={{ bg: amber.bg, ring: amber.ring, ink: amber.ink }}>
				<Clock size={21} strokeWidth={1.8} />
			</IconDisc>

			<h1
				class="font-disp text-[21px] font-semibold leading-[1.22] tracking-[-0.005em] mt-[18px]"
				style={{ color: theme.textStrong }}
			>
				Sign-in didn&rsquo;t finish
			</h1>

			<p class="text-[15px] leading-[1.55] mt-2.5 mb-6" style={{ color: theme.text }}>
				The sign-in page closed before it came back. Nothing was changed,
				and nothing was shared.
			</p>

			<SignInButton label="Try again" pending={pending} onPress={onRetry} theme={theme} />
		</OutsideCard>
	);
}
