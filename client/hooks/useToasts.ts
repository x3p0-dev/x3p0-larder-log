import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

/**
 * The toast stack.
 *
 * Holds what is on screen; it does not hold timers. Each row counts itself down
 * so that hovering one pauses only that one — a stack driven from here would
 * either pause together or need three timers reaching back up, and both were
 * tried before this.
 *
 * The stack is *transient chrome over a write that already happened*, not a
 * pending write. Removal reaches the server immediately and undo re-inserts
 * (D17), so a toast that expires, is dismissed, or is lost to a reload all mean
 * the same thing: nothing further to do.
 */

export type Toast = {
	id: number;
	/** The verb and its object — `Removed`, `Deleted`. Rendered before `name`. */
	lead: string;
	/**
	 * The object's name, set at 600 so the row is identifiable at a glance.
	 *
	 * Absent on a **plain** toast, which is a whole sentence in `lead` with no
	 * undo and no dismiss: there is nothing to decide, so there is no control.
	 */
	name?: string;
	/** Present on an **actionable** toast only. Its absence is what makes one plain. */
	onUndo?: () => void;
	/** Set for the length of the exit fade, so the row can animate out before it goes. */
	leaving?: boolean;
};

/** Newest at the bottom. A fourth arrival commits the oldest immediately. */
const MAX_VISIBLE = 3;

/** Matches the exit transition in `Toast.tsx`; the row is unmounted after it. */
const EXIT_MS = 140;

export type ToastApi = {
	toasts: Toast[];
	/** Returns the new toast's id, for a caller that wants to close it early. */
	push: (spec: Omit<Toast, 'id' | 'leaving'>) => number;
	/** Runs the toast's undo, if it has one, and closes it either way. */
	undo: (id: number) => void;
	/** Commits: the row goes and the removal stands. */
	close: (id: number) => void;
};

export function useToasts(): ToastApi {
	const [toasts, setToasts] = useState<Toast[]>([]);
	const nextId = useRef(1);

	/*
	 * Exit timers, cleared on unmount. Signing out or switching household
	 * unmounts the stack mid-fade, and a stray timer would set state on a
	 * component that is gone.
	 */
	const exits = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

	useEffect(() => () => {
		for (const t of exits.current) clearTimeout(t);
		exits.current.clear();
	}, []);

	const close = useCallback((id: number) => {
		setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));

		const timer = setTimeout(() => {
			exits.current.delete(timer);
			setToasts((list) => list.filter((t) => t.id !== id));
		}, EXIT_MS);

		exits.current.add(timer);
	}, []);

	const push = useCallback((spec: Omit<Toast, 'id' | 'leaving'>) => {
		const id = nextId.current++;

		setToasts((list) => {
			// Rows already fading are not part of the count — they are on their
			// way out, and letting them push a live toast off the top would
			// commit a removal someone could still see the undo for.
			const live = list.filter((t) => ! t.leaving);

			return [...live, { ...spec, id }].slice(-MAX_VISIBLE);
		});

		return id;
	}, []);

	/*
	 * Read through a ref rather than inside a `setToasts` updater. An updater is
	 * allowed to run more than once for one update, and running `onUndo` twice
	 * would re-insert the item twice — which is exactly the duplicate D17's
	 * tombstone was designed to avoid.
	 */
	const live = useRef(toasts);
	live.current = toasts;

	const undo = useCallback((id: number) => {
		const toast = live.current.find((t) => t.id === id);

		// A row already fading has had its say; a second Enter on it is a
		// double-press, not a second undo.
		if (! toast || toast.leaving) return;

		toast.onUndo?.();
		close(id);
	}, [close]);

	return { toasts, push, undo, close };
}
