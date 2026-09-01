import { Check } from 'lucide-preact';

import { Eyebrow, OutsideCard } from './OutsideShell';
import type { Theme } from '../lib/theme';
import { PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';
import type { RecapRow } from '../../shared/accountDeletion';
import { goneCardLines } from '../../shared/accountDeletion';

/**
 * Where deleting your account leaves you (D68).
 *
 * **The app's first screen that is neither signed out nor signed in.** The
 * session is still live — deleting an account removes this app's rows and
 * cannot reach the Spacefast identity behind them — but there is no household,
 * no profile and nothing to come back to, so neither the shell nor the
 * signed-out surface is the right answer. It takes the 440 card every screen
 * before the shell takes, and it is the only one that reports rather than asks.
 *
 * **A neutral disc**, and it is the second in the app to carry one: sunk fill,
 * `line` ring, a meta glyph. The console's 404 settled the rule — a disc takes
 * no status colour when it is making no claim. Crimson would say something went
 * wrong and green would congratulate somebody on deleting their account, and
 * both are the app having an opinion it was not asked for.
 *
 * **No toast.** There is no app left to show one in; the card *is* the
 * confirmation, and it is the fifth settled case of what gets one.
 *
 * **The button signs out.** The identity is still held, so a bare link to `/`
 * would land straight back on the first-run screen offering to name a household
 * — the app forgetting, ten seconds later, what it had just been told.
 */
export function AccountGoneCard({ rows, onLeave, theme }: {
	/** The recap the confirmation showed, so the card names what actually happened. */
	rows: readonly RecapRow[];
	onLeave: () => void;
	theme: Theme;
}) {
	const lines = goneCardLines(rows);

	return (
		<OutsideCard theme={theme}>
			<Eyebrow theme={theme}>Account deleted</Eyebrow>

			<span
				class="flex items-center justify-center w-11 h-11 rounded-full mt-3.5"
				style={{
					background: theme.surfaceAlt,
					border: `1px solid ${theme.border}`,
					color: theme.textMuted,
				}}
				aria-hidden="true"
			>
				<Check size={21} strokeWidth={1.9} />
			</span>

			<h1
				class="font-disp text-[26px] font-semibold leading-[1.2] mt-3.5 mb-3"
				style={{ color: theme.textStrong }}
			>
				Your account is gone
			</h1>

			{lines.map((line) => (
				<p key={line} class="m-0 mb-3 text-[15px] leading-[1.55]" style={{ color: theme.text }}>
					{line}
				</p>
			))}

			<p class="m-0 mb-5 text-[15px] leading-[1.55]" style={{ color: theme.text }}>
				Signing in again would start a new account, with nothing in it.
			</p>

			<button
				onClick={onLeave}
				class={`flex items-center justify-center w-full h-12 px-5 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
				style={{ background: theme.inkBg, color: theme.inkText }}
			>
				Back to Larder Log
			</button>
		</OutsideCard>
	);
}
