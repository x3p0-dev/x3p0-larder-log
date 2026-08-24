import { SignInWithGoogle, signOut, useAuth } from '@spacefast/zero/client';

import { Pantry } from './Pantry';
import { useSystemTheme } from './hooks/useSystemTheme';
import { getTheme } from './lib/theme';

/**
 * Hostnames the browser can only be talking to a local `sf dev` on. A LAN
 * address is deliberately absent: `sf dev --host 0.0.0.0 --allow-network` binds
 * one, and anything reachable from another machine gets the real gate.
 */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

function isLoopback(): boolean {
	return typeof location !== 'undefined' && LOOPBACK_HOSTS.includes(location.hostname);
}

/**
 * The sign-in gate is the entire unauthenticated surface (D2).
 *
 * Zero hands every visitor a guest identity that could own rows, which would
 * make a try-before-you-sign-in mode possible. We deliberately don't: it would
 * raise the question of what happens to guest-owned rows when that visitor
 * signs in, and every answer is work that serves nobody in a two-person
 * household. Guests get this screen and nothing else.
 *
 * The gate paints itself from the same theme the app uses rather than the
 * platform kit, so the first screen already looks like the product.
 */
function SignInGate({ dark }: { dark: boolean }) {
	const theme = getTheme(dark);

	return (
		<div
			class="font-sans min-h-screen w-full flex items-center justify-center p-6"
			style={{ background: theme.pageBg, color: theme.text, colorScheme: dark ? 'dark' : 'light' }}
		>
			<div
				class="w-full max-w-sm rounded-xl p-8 text-center"
				style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
			>
				<h1 class="font-disp text-2xl font-semibold mb-2" style={{ color: theme.textStrong }}>
					Larder Log
				</h1>
				<p class="text-sm mb-6" style={{ color: theme.textMuted }}>
					What&rsquo;s in the pantry and the freezer, who&rsquo;s running low, and what to
					buy where. Sign in to open your household.
				</p>

				<SignInWithGoogle />

				<p class="font-mono text-xs uppercase tracking-widest mt-6" style={{ color: theme.textFaint }}>
					Sign-in required
				</p>
			</div>
		</div>
	);
}

/** The brief moment before Zero has resolved who the visitor is. */
function AuthLoading({ dark }: { dark: boolean }) {
	const theme = getTheme(dark);

	return (
		<div
			class="font-sans min-h-screen w-full flex items-center justify-center"
			style={{ background: theme.pageBg, colorScheme: dark ? 'dark' : 'light' }}
		>
			<p class="font-mono text-xs uppercase tracking-widest" style={{ color: theme.textFaint }}>
				Loading&hellip;
			</p>
		</div>
	);
}

/**
 * Deliberately hard to miss. The bypass below is a hole in the app's only auth
 * boundary, and the one failure mode that matters is someone believing a local
 * session is a real one — so the app says so on screen the whole time.
 */
function DevIdentityBadge() {
	return (
		<div
			role="status"
			class="fixed bottom-3 left-3 z-50 font-mono text-xs uppercase tracking-widest px-2.5 py-1 rounded-full pointer-events-none"
			style={{ background: '#96631A', color: '#FFFFFF' }}
		>
			Dev guest &middot; not signed in
		</div>
	);
}

export function App() {
	const auth = useAuth();
	const dark = useSystemTheme();

	if (auth.isLoading) return <AuthLoading dark={dark} />;

	/*
	 * `sf dev` ships no sign-in flow at all — its runtime config reports
	 * `signInPath: null` and `signInUrl: null` — so `isGuest` never goes false
	 * locally and D2's gate would hide the entire app from its own developer.
	 * On loopback only, we accept the dev guest as the working identity. It has
	 * a stable `userId`, which is all the app (and Phase 2's server-side
	 * household checks) actually needs.
	 *
	 * This can never be true on a published space: Spacefast serves those from
	 * a real hostname, so `isLoopback()` is false and the gate applies as
	 * written. Revisit if Spacefast ever ships a local sign-in stub — see
	 * docs/notes.md.
	 */
	const devGuest = auth.isGuest && Boolean(auth.userId) && isLoopback();

	if (! auth.userId || (auth.isGuest && ! devGuest)) return <SignInGate dark={dark} />;

	return (
		<>
			<Pantry
				userId={auth.userId}
				displayName={devGuest ? 'Local dev guest' : (auth.displayName || 'Signed in')}
				email={devGuest ? '' : (auth.email ?? '')}
				onSignOut={() => signOut()}
			/>
			{devGuest && <DevIdentityBadge />}
		</>
	);
}
