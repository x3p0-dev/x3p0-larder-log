import { useEffect } from 'preact/hooks';

import { NO_TERM_FILTERS, type TermFilters } from '../../shared/filter';
import type { StatusKey } from '../../shared/status';
import type { DrawerTab } from '../components/Drawer';

/**
 * Where you were when you last closed the app.
 *
 * The fourth thing in `localStorage`, after the theme (D25), the household
 * (D33) and the shopping trip's ticks (D41), and it belongs there for the same
 * reason all three do: this is a property of *this device*, not of the account.
 * Two people in one household filter to different shelves, and the phone in the
 * kitchen is not looking at what the desktop was.
 *
 * **What is deliberately not here:**
 *
 * - **`drawerOpen`** — the mobile slide-over. Every other flag in this record
 *   describes a layout you return to; that one describes a panel covering the
 *   thing you opened the app to see. Restoring it would also cash in the exact
 *   hazard `Pantry`'s dock effect exists to prevent, since the flag means
 *   nothing above the dock and everything below it.
 * - **The search text.** *Clear filters* does not take it either (D45): search
 *   has its own `×` and you can see it working. A field that refills itself on
 *   load reads as a bug rather than as a filter.
 * - **The sort.** Not asked for, and one line to add here if it should be.
 *
 * Nothing in here is trusted on the way back in. It is a string a person can
 * edit, and a shape from a version of the app that no longer exists — a
 * non-array where `locations` belongs would throw inside `.includes` on the
 * first render, which is a blank screen rather than a lost filter.
 */
export type ViewState = {
	/** Desktop: the drawer folded down to the 68px rail. */
	drawerCollapsed: boolean;
	drawerTab: DrawerTab;
	status: StatusKey | null;
	filters: TermFilters;
};

export const NO_VIEW: ViewState = {
	drawerCollapsed: false,
	drawerTab: 'filter',
	status: null,
	filters: NO_TERM_FILTERS,
};

/**
 * The stored view, or the defaults.
 *
 * A plain function rather than a hook **because of where it has to run**: it
 * seeds the `useState` initialisers in `Pantry`, so it has to answer before the
 * first render rather than after it. Restoring in an effect would paint the
 * unfiltered grid for a frame and then snap it — worst on the slow phone this
 * is most needed on.
 *
 * The term ids are not checked against anything here, and cannot be: the
 * household has not loaded yet. `Pantry`'s prune effect is what settles them
 * once it has, which is the same mechanism that already handles a term someone
 * else deleted mid-session — one rule for stale ids rather than two.
 */
export function readViewState(key: string): ViewState {
	try {
		const raw = window.localStorage.getItem(key);
		if (! raw) return NO_VIEW;

		const stored = JSON.parse(raw) as Record<string, unknown>;
		const filters = (stored.filters ?? {}) as Record<string, unknown>;

		return {
			drawerCollapsed: stored.drawerCollapsed === true,
			drawerTab: stored.drawerTab === 'settings' ? 'settings' : 'filter',
			status: isStatus(stored.status) ? stored.status : null,
			filters: {
				locations: ids(filters.locations),
				types: ids(filters.types),
				stores: ids(filters.stores),
			},
		};
	} catch {
		// Unparseable, or storage blocked entirely. The app opens on its
		// defaults, which is what a first visit gets.
		return NO_VIEW;
	}
}

/** Mirrors the current view back into storage as it changes. */
export function usePersistedView(key: string, view: ViewState) {
	/*
	 * Serialized here rather than in the effect so it can *be* the dependency:
	 * `view` is a fresh literal on every render, and depending on it would
	 * rewrite the same bytes on every keystroke in the search field.
	 */
	const json = JSON.stringify(view);

	useEffect(() => {
		try {
			window.localStorage.setItem(key, json);
		} catch {
			// Storage full or blocked; this session still works, it just won't
			// be the one that comes back.
		}
	}, [key, json]);
}

function ids(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function isStatus(value: unknown): value is StatusKey {
	return value === 'ok' || value === 'low' || value === 'out';
}
