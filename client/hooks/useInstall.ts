import { useEffect, useState } from 'preact/hooks';

import type { InstallMode } from '../lib/install';
import { installMode, promptInstall, subscribeInstall } from '../lib/install';

/**
 * What the install row should offer on this device, kept current.
 *
 * `beforeinstallprompt` arrives on the browser's own schedule — usually after
 * first paint, sometimes seconds in — so this cannot be read once at mount. The
 * store in `client/lib/install.ts` holds the event from boot and this
 * subscribes to it.
 */
export function useInstall(): { mode: InstallMode; install: () => void } {
	const [mode, setMode] = useState<InstallMode>(installMode);

	useEffect(() => subscribeInstall(() => setMode(installMode())), []);

	return { mode, install: () => { void promptInstall(); } };
}
