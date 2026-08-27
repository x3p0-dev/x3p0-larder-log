import { useEffect, useState } from 'preact/hooks';

/**
 * useState that mirrors its value into localStorage, so a page reload picks up
 * where the last one left off.
 *
 * Phase 2 moved every other call site to `useQuery` / `useMutation`, and what
 * is left here is deliberate: the theme override (D25), which household this
 * device is pointed at (D33) and the shopping trip (D41). Each is a property of
 * *this device* rather than of the account — a dark-mode choice made on a phone
 * should not follow you to a desktop. **Check any new call site against that
 * before adding it**, and check that it is not data.
 *
 * D51's view state is the one thing that deliberately does not use this hook.
 * It has to seed `useState` initialisers rather than own the state itself, so
 * that a restored filter is applied by the first render instead of a frame
 * later — see `useViewState.ts`.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
	const [value, setValue] = useState<T>(() => read(key, initial));

	// The key is part of the identity of this state: signing in as a different
	// identity has to load that identity's data, not keep showing the old one.
	useEffect(() => {
		setValue(read(key, initial));
		// `initial` is a fresh literal on most renders, so depending on it here
		// would reset the state on every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage full or blocked; the app still works for this session.
		}
	}, [key, value]);

	return [value, setValue];
}

function read<T>(key: string, initial: T): T {
	try {
		const stored = window.localStorage.getItem(key);
		return stored ? JSON.parse(stored) as T : initial;
	} catch {
		return initial;
	}
}
