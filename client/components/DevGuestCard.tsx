import type { Theme } from '../lib/theme';
import { DEV_GUESTS_VAR } from '../../shared/identity';

/**
 * Loopback, and nobody has said who they are.
 *
 * **This screen exists because the fix for the v15 leak took `sf dev`'s default
 * identity away.** `guest:local` is what the *hosted* runtime hands an
 * unauthenticated stranger, so the server refuses it everywhere — which is
 * right, and which means a local `sf dev` with no `?guest=` is now a signed-out
 * visitor with no sign-in to offer. Without this card that is a marketing page
 * on a development server, and the reason is nowhere on screen.
 *
 * It is **loopback only**, like `?demo` and `?members`: a published space never
 * reaches this branch, because its visitors are either real accounts or the
 * anonymous guest, and the anonymous guest gets the sign-in card.
 *
 * It deliberately names the environment variable rather than listing the names
 * in it. The client cannot read `.env.server`, and a card that guessed would be
 * wrong the first time somebody added a second developer.
 */
export function DevGuestCard({ theme }: { theme: Theme }) {
	return (
		<div
			class="w-full max-w-[460px] rounded-[22px] p-7 flex flex-col gap-4"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
		>
			<h1 class="font-disp text-[27px] font-semibold m-0" style={{ color: theme.textStrong }}>
				Say who you are
			</h1>
			<p class="m-0 text-[14.5px] leading-[1.55]" style={{ color: theme.text }}>
				This is a development server, and it has no sign-in. Add a{' '}
				<code class="font-mono text-[13.5px]" style={{ color: theme.textStrong }}>?guest=</code>{' '}
				parameter to the URL and the app will treat you as that person.
			</p>
			<pre
				class="m-0 px-3.5 py-3 rounded-[13px] font-mono text-[13px] overflow-x-auto"
				style={{ background: theme.surfaceAlt, color: theme.textStrong, border: `1px solid ${theme.divider}` }}
			>http://127.0.0.1:4173/?guest=your-name</pre>
			<p class="m-0 text-[13px] leading-[1.55]" style={{ color: theme.textMuted }}>
				The name has to be listed in <code class="font-mono text-[12.5px]">{DEV_GUESTS_VAR}</code>{' '}
				in <code class="font-mono text-[12.5px]">.env.server</code>, and it can be anything except{' '}
				<code class="font-mono text-[12.5px]">local</code> — that one is what a published space
				hands a stranger, so it is refused everywhere. Two different names are two different
				people, which is how invites and roles get tested without a second account.
			</p>
		</div>
	);
}
