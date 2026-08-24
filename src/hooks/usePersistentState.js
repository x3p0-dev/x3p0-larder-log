import { useEffect, useState } from 'react';

/**
 * useState that mirrors its value into localStorage, so a page reload picks up
 * where the last one left off. Stands in for a real back end for now.
 */
export function usePersistentState(key, initial) {
	const [value, setValue] = useState(() => {
		try {
			const stored = window.localStorage.getItem(key);
			return stored ? JSON.parse(stored) : initial;
		} catch {
			return initial;
		}
	});

	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Storage full or blocked; the app still works for this session.
		}
	}, [key, value]);

	return [value, setValue];
}
