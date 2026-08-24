import { useEffect, useState } from 'react';

/**
 * Tracks the OS light/dark preference and re-renders when it changes.
 */
export function useSystemTheme() {
	const [dark, setDark] = useState(
		() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
	);

	useEffect(() => {
		if (! window.matchMedia) return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const listener = (e) => setDark(e.matches);
		mq.addEventListener('change', listener);
		return () => mq.removeEventListener('change', listener);
	}, []);

	return dark;
}
