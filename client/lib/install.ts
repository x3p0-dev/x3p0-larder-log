/**
 * Whether this device can install the app, and how.
 *
 * The app has been a PWA since the manifest landed and nothing in it has ever
 * said so. This is the whole of the browser side of saying so: one question —
 * *is there a path to install, and are we not already installed?* — answered
 * for the one row in Settings that offers it.
 *
 * **Two rules, and everything follows from them.** Nothing offers to install
 * what is already open, and the row appears only where a path actually exists.
 * A control that can only disappoint is the thing the sort trigger and the
 * shopping-list trigger already refuse to be.
 *
 * **The event is captured at boot, not when Settings opens.** `beforeinstallprompt`
 * fires once, early, and a page that has not registered a listener by then never
 * hears it — so `watchInstall()` runs from the entry beside `installFonts()` and
 * `installAppIcon()`, and the saved event is held until something presses the
 * pill. Waiting for the drawer would mean the row could only ever appear on a
 * reload after the one that mattered.
 */

/**
 * What the row should offer on this device.
 *
 * **Amended 28 Aug**, and the amendment is the important part. The first cut
 * had three modes and treated `beforeinstallprompt` as the proxy for *a path
 * exists* — which is wrong, and wrong in the direction that hides the row from
 * people who can install perfectly well. Chrome offers *Install page as app* on
 * **any** page from its own menu, with no manifest and no prompt involved, and
 * **the page is never told about it**: there is no API to ask, and
 * `getInstalledRelatedApps()` answers a different question on one platform.
 *
 * So a prompt is one path among several rather than the definition of one, and
 * the four `steps` modes below are the paths a page can describe but not fire.
 * Each is a different menu with different words, which is why they are four
 * modes and not one.
 */
export type InstallMode =
	/** No path we can name, or we are already the installed app. No row. */
	| 'none'
	/** A real prompt exists and is held. The pill fires it. */
	| 'prompt'
	/** iOS and iPadOS — Share ▸ Add to Home Screen. */
	| 'ios'
	/** Chromium on Android — ⋮ ▸ Add to Home screen. */
	| 'android'
	/** Chrome on the desktop — ⋮ ▸ Cast, save, and share ▸ Install page as app. */
	| 'chromium'
	/** Safari on macOS — File ▸ Add to Dock. */
	| 'safari';

/**
 * The Chromium event. It is not in `lib.dom`, and the two members below are the
 * only ones this app touches.
 */
type InstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let saved: InstallPromptEvent | null = null;
let watching = false;

const listeners = new Set<() => void>();

function emit(): void {
	for (const fn of listeners) fn();
}

/** Registers the two listeners. Idempotent, and a no-op off a browser. */
export function watchInstall(): void {
	if (watching || typeof window === 'undefined') return;

	watching = true;

	window.addEventListener('beforeinstallprompt', (e) => {
		/*
		 * Without this the browser draws its own mini-infobar, which is the
		 * interruption the banner was cut for. Preventing it is what hands the
		 * event over to be fired from Settings instead.
		 */
		e.preventDefault();
		saved = e as InstallPromptEvent;
		emit();
	});

	/*
	 * The saved event is spent whether or not this fires, but a page that is
	 * still open after an install should stop offering one.
	 */
	window.addEventListener('appinstalled', () => {
		saved = null;
		emit();
	});
}

/** Subscribe to changes in what `installMode()` would answer. */
export function subscribeInstall(fn: () => void): () => void {
	listeners.add(fn);

	return () => { listeners.delete(fn); };
}

/**
 * Whether the page is running as the installed app rather than in a tab.
 *
 * Four display modes count as installed — `browser` is the only one that is
 * not — and `navigator.standalone` is iOS's own answer, which is the only one
 * there is on a home-screen Safari.
 */
export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;

	const installed = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

	if (window.matchMedia) {
		for (const mode of installed) {
			if (window.matchMedia(`(display-mode: ${mode})`).matches) return true;
		}
	}

	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * iOS or iPadOS, where no install prompt exists in any browser.
 *
 * **iPadOS 13+ reports itself as a Mac**, so the user agent alone answers
 * *iPad* with *Macintosh*; a touch count is what separates the two, since no
 * Mac reports more than one.
 */
export function isIos(): boolean {
	if (typeof navigator === 'undefined') return false;

	const ua = navigator.userAgent;

	if (/iPad|iPhone|iPod/.test(ua)) return true;

	return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** Chromium on Android. */
function isAndroid(): boolean {
	return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

/**
 * Chrome or plain Chromium, and **not** the other engines built on it.
 *
 * Edge, Opera, Samsung Internet and Vivaldi all carry `Chrome/` in the user
 * agent and all put the install command somewhere else under different words.
 * Claiming them would print instructions for a menu that is not there, which is
 * the one thing the steps must never do — so they fall through to `none` and
 * stay quiet. Deliberate, not a gap to fill in later without checking each.
 */
function isChrome(): boolean {
	if (typeof navigator === 'undefined') return false;

	const ua = navigator.userAgent;

	if (/Edg\/|OPR\/|SamsungBrowser|Vivaldi|YaBrowser/.test(ua)) return false;

	return /Chrome\/|Chromium\//.test(ua);
}

/** Safari on macOS. Checked after `isIos`, which claims an iPad first. */
function isMacSafari(): boolean {
	if (typeof navigator === 'undefined') return false;

	const ua = navigator.userAgent;

	return /Macintosh/.test(ua) && /Safari\//.test(ua) && ! /Chrome\/|Chromium\/|Edg\//.test(ua);
}

/**
 * Whether the thing being installed lands on a home screen or in an app list.
 *
 * The row's own label reads *Add to home screen* on a phone and *Install as an
 * app* on a desktop, because a desktop has no home screen to add anything to —
 * the same rule that keeps the steps in each browser's own words.
 */
export function isHandheld(): boolean {
	return isIos() || isAndroid();
}

/**
 * What the row should offer, if anything.
 *
 * **A held prompt wins over every set of steps**, because it is one press
 * against two, and it is the only path that ends inside the app rather than in
 * a menu. Everything below it is a path we can describe but not fire.
 *
 * Anything unrecognised answers `none`, which is D54's rule intact: a control
 * that can only disappoint is worse than no control. What changed is which
 * cases count as disappointing — a browser with a real menu and no prompt is
 * not one of them.
 */
export function installMode(): InstallMode {
	if (isStandalone()) return 'none';
	if (saved) return 'prompt';
	if (isIos()) return 'ios';
	if (isAndroid()) return isChrome() ? 'android' : 'none';
	if (isMacSafari()) return 'safari';
	if (isChrome()) return 'chromium';

	return 'none';
}

/**
 * Fires the held prompt.
 *
 * **The event is dropped before the dialog opens**, not after. It can only be
 * prompted once — a second press would throw — and a pill that fires nothing is
 * the worst version of this row. So the row goes the moment it is spent, and
 * comes back if the browser offers another event on a later load. Dismissing
 * the dialog does not bring it back in this page's lifetime, which is what the
 * spec says a spent event means.
 */
export async function promptInstall(): Promise<void> {
	const event = saved;

	if (! event) return;

	saved = null;
	emit();

	await event.prompt();
}
