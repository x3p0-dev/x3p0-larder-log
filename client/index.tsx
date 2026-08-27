import { useEffect, useState } from 'preact/hooks';
/*
 * `signInWithGoogle` **is** the Gravatar flow. The name is Lakebed source
 * compatibility — `@spacefast/zero/client` exports the same function under both
 * names internally and only this one publicly. Aliased so no call site below
 * has to claim the app has a Google button.
 */
import { signInWithGoogle as signInWithGravatar, signOut, useAuth } from '@spacefast/zero/client';

import { Pantry } from './Pantry';
import { useSystemTheme } from './hooks/useSystemTheme';
import { useInvitePreview } from './hooks/usePantryData';
import type { Theme } from './lib/theme';
import { getTheme } from './lib/theme';
import { installAppIcon } from './lib/appIcon';
import { installFonts } from './lib/fonts';
import { capturePendingInvite, markInviteAccepted, pendingInvite } from './lib/pendingInvite';
import { clearSignInAttempt, markSignInAttempt, signInAttemptPending } from './lib/signInAttempt';
import { InviteLanding } from './components/InviteLanding';
import { MarketingPage } from './components/MarketingPage';
import { OutsideShell } from './components/OutsideShell';
import { SignInCard, SignInFailedCard, SigningInCard } from './components/SignInCard';

/*
 * Before anything renders, and before the gate decides who this is.
 *
 * An invite link is followed by someone who is signed out by definition, and
 * signing in navigates away and back. Capturing the code here — into
 * `sessionStorage`, out of the address bar — is what carries it across that
 * round trip. See D28 for why the code rides in `?join=` rather than a path.
 */
capturePendingInvite();

/*
 * Zero ships no webfont mechanism, so the app installs its own `@font-face`
 * rules before anything paints. See client/lib/fonts.ts.
 */
installFonts();
installAppIcon();

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
 * `?signedout` — the only way to see the signed-out surface on `sf dev`.
 *
 * D14's loopback hole makes every local visitor a signed-in dev guest, so the
 * marketing page, the sign-in card and the invite landing are unreachable in
 * the one environment anybody can click them in. This switches the hole off for
 * one page load.
 *
 * It is not a bypass and cannot become one: it only ever **removes** access,
 * and it is ignored anywhere but loopback, where the hole it disables does not
 * exist in the first place. Take it out with D14 itself.
 */
function forcedSignedOut(): boolean {
	if (typeof location === 'undefined' || ! isLoopback()) return false;

	return new URLSearchParams(location.search).has('signedout');
}

/**
 * Whether this is the front door or a bounce.
 *
 * **The signed-out surface is two pages, not one.** `/` is a marketing page for
 * someone who has never heard of Larder Log; any *other* URL hit while signed
 * out belongs to somebody who was going somewhere, and they get the sign-in
 * card with an eyebrow saying why. Collapsing the two would make the front door
 * either a wall for visitors or a sales pitch for someone who only wanted their
 * pantry.
 *
 * In production the bounce is rarer than it sounds — the published space serves
 * nothing at an unknown path (D28) — but a sign-out or an expired session can
 * land on one, and `sf dev` answers the SPA shell everywhere.
 */
function isFrontDoor(): boolean {
	return typeof location === 'undefined' || location.pathname === '/' || location.pathname === '';
}

/** The brief moment before Zero has resolved who the visitor is. */
function AuthLoading({ dark, theme }: { dark: boolean; theme: Theme }) {
	return (
		<div
			class="font-sans min-h-screen w-full flex items-center justify-center"
			style={{ background: theme.pageBg, colorScheme: dark ? 'dark' : 'light' }}
		>
			<p class="text-[13.5px]" style={{ color: theme.textFaint }}>Loading&hellip;</p>
		</div>
	);
}

/**
 * The `?join=` landing for someone who is not signed in.
 *
 * Its own component so the preview subscription only exists on the one screen
 * that reads it. Rolled into `App`, the hook would have to run for every
 * signed-in visitor too, since a hook cannot be called conditionally.
 *
 * Signing in from here **is** the accept: the code is already in the stash, the
 * consent is recorded beside it, and `Pantry` redeems on arrival rather than
 * showing this card a second time.
 */
function SignedOutInvite({ code, pending, onSignIn, onDismiss, dark, theme }: {
	code: string;
	pending: boolean;
	onSignIn: () => void;
	onDismiss: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const preview = useInvitePreview(code);

	return (
		<OutsideShell dark={dark} theme={theme}>
			<InviteLanding
				preview={preview}
				signedIn={false}
				displayName="" email=""
				onSignIn={onSignIn}
				onJoin={async () => {}}
				onDismiss={onDismiss}
				onSignOut={() => signOut()}
				pending={pending}
				theme={theme}
			/>
		</OutsideShell>
	);
}

export function App() {
	const auth = useAuth();
	const dark = useSystemTheme();
	const theme = getTheme(dark);

	/*
	 * The redirect is in flight. Zero's sign-in tears the page down rather than
	 * opening a window, so this only lives as long as the config fetch in front
	 * of `location.assign` — but that is the difference between a control that
	 * acknowledges a press and one that appears not to work.
	 */
	const [pending, setPending] = useState(false);

	/** A code from an invite link. The stash is what survived the sign-in trip. */
	const [code, setCode] = useState<string | null>(() => pendingInvite());

	const devGuest = auth.isGuest && Boolean(auth.userId) && isLoopback() && ! forcedSignedOut();
	const signedIn = Boolean(auth.userId) && (! auth.isGuest || devGuest);

	// Whatever brought them here, they arrived. A marker left behind would turn
	// the next reload of this tab into an error card.
	useEffect(() => {
		if (signedIn) clearSignInAttempt();
	}, [signedIn]);

	function startSignIn(accepting = false) {
		if (pending) return;

		setPending(true);
		markSignInAttempt();

		// Consent is recorded *before* the redirect, because the button that
		// grants it does not survive the navigation.
		if (accepting) markInviteAccepted();

		/*
		 * The only failure this call can report is "there is no sign-in on this
		 * runtime" — which is exactly what `sf dev` is. Everything else ends in
		 * `location.assign`, and a promise that resolves after the page has been
		 * torn down settles nothing. So the catch releases the button rather
		 * than routing anywhere: the redirect never started, and there is no
		 * abandoned attempt to report.
		 */
		void signInWithGravatar().catch(() => {
			clearSignInAttempt();
			setPending(false);
		});
	}

	if (auth.isLoading) {
		// Coming back from Gravatar looks exactly like a first paint from the
		// auth value alone. The attempt marker is the only thing that tells them
		// apart, and it is why the handoff can say "bringing your household
		// across" rather than showing a bare spinner.
		return signInAttemptPending()
			? <OutsideShell dark={dark} theme={theme}><SigningInCard theme={theme} /></OutsideShell>
			: <AuthLoading dark={dark} theme={theme} />;
	}

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
	 * .docs/notes.md.
	 */
	if (signedIn) {
		return (
			<Pantry
				userId={auth.userId as string}
				/*
				 * The identity's name, raw — **no `|| 'Signed in'` fallback here
				 * any more**. That fallback made the name look present when it was
				 * absent, which is precisely the case D46's first-run screen
				 * exists to catch: it would have prefilled the field with
				 * "Signed in" and told the visitor Gravatar had a name for them.
				 * `Pantry` resolves the account's real name and falls back for
				 * display there instead.
				 */
				displayName={devGuest ? 'Local dev guest' : (auth.displayName ?? '')}
				email={devGuest ? '' : (auth.email ?? '')}
				picture={devGuest ? undefined : auth.picture}
				onSignOut={() => signOut()}
			/>
		);
	}

	/*
	 * Signed out, in the order the visitor's own reason for being here runs: an
	 * invitation is the most specific, an abandoned sign-in the next, and only
	 * after both does which page they landed on matter at all.
	 */
	if (code) {
		return (
			<SignedOutInvite
				code={code}
				pending={pending}
				onSignIn={() => startSignIn(true)}
				onDismiss={() => setCode(null)}
				dark={dark}
				theme={theme}
			/>
		);
	}

	if (signInAttemptPending()) {
		return (
			<OutsideShell dark={dark} theme={theme}>
				<SignInFailedCard
					pending={pending}
					onRetry={() => { clearSignInAttempt(); startSignIn(); }}
					theme={theme}
				/>
			</OutsideShell>
		);
	}

	if (isFrontDoor()) {
		return <MarketingPage dark={dark} theme={theme} pending={pending} onSignIn={() => startSignIn()} />;
	}

	return (
		<OutsideShell dark={dark} theme={theme}>
			<SignInCard pending={pending} onSignIn={() => startSignIn()} theme={theme} />
		</OutsideShell>
	);
}
