import { useCallback, useEffect, useMemo } from 'preact/hooks';

import { usePersistentState } from './usePersistentState';

/**
 * What is in the cart, and whether you were reading the list when you last
 * looked.
 *
 * **Checks are local and they are not shared.** Two people at two different
 * stores would collide on the same rows, and a tick that means "in *my* cart"
 * cannot be read by someone else without saying whose. Sharing them is a real
 * feature and it belongs with restocking, not before it — see the trip bar's
 * reserved half.
 *
 * They live in `localStorage` for the reason a shopping list needs most:
 * reloading in a shop, on a phone with two bars of signal, has to come back to
 * the list with the ticks intact.
 *
 * Three rules clear a check without a button, and *Clear checks* on the trip
 * bar is the fourth — the one case none of them covers, which is coming back to
 * a list you ticked half of and wanting to start it again:
 *
 * 1. The item leaves the list — anyone restocks it, and the check goes with the
 *    row.
 * 2. Twenty-four hours pass. A shopping trip does not last a day.
 * 3. The household is switched. Checks belong to a list, not to you.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

type Trip = {
	/**
	 * Which list these ticks belong to.
	 *
	 * Stored *in* the record rather than used as the storage key, because rule 3
	 * says switching clears rather than parks: a key per household would hand
	 * yesterday's ticks back when you switched away and returned.
	 */
	householdId: string;
	/**
	 * When a row was last ticked.
	 *
	 * The window runs from activity rather than from the first tick, so a slow
	 * shop cannot expire underneath someone still walking it.
	 */
	at: number;
	ids: string[];
	listMode: boolean;
};

export type TripChecks = {
	checked: ReadonlySet<string>;
	/** How many of the rows currently on the list are ticked. */
	count: number;
	toggle: (id: string) => void;
	/**
	 * Untick a set of rows at once — what *Clear checks* takes off the screen.
	 *
	 * It takes ids rather than emptying the record, because the caller knows
	 * which rows are on screen and this hook does not: with a Store filter on,
	 * the trip holds ticks for rows nobody can see, and a control sitting beside
	 * `Hide 3 checked` must not quietly clear seven.
	 */
	uncheck: (ids: readonly string[]) => void;
	/** Puts exactly those ticks back — the toast's Undo, and nothing else. */
	recheck: (ids: readonly string[]) => void;
	listMode: boolean;
	setListMode: (on: boolean) => void;
};

/**
 * @param key         Storage key — per identity, like the theme and household ones.
 * @param householdId The list these ticks would belong to; `null` until it loads.
 * @param liveIds     The ids currently on the list. Anything else has been bought.
 */
export function useTripChecks(key: string, householdId: string | null, liveIds: ReadonlySet<string>): TripChecks {
	const [trip, setTrip] = usePersistentState<Trip | null>(key, null);

	/*
	 * Expiry is evaluated here as well as swept below, because an effect runs
	 * after paint: reading it during render is what keeps a day-old tick from
	 * showing for one frame before the sweep removes it.
	 */
	const live = trip && trip.householdId === householdId && Date.now() - trip.at <= DAY_MS
		? trip
		: null;

	// Rules 2 and 3, as a write. Rule 1 is the filter below.
	useEffect(() => {
		setTrip((prev) => (
			prev && (prev.householdId !== householdId || Date.now() - prev.at > DAY_MS) ? null : prev
		));
	}, [householdId, setTrip]);

	/*
	 * Rule 1, as a write. Returning `prev` unchanged is what makes this safe to
	 * run on every render — `liveIds` is a fresh Set each time, so this effect
	 * cannot depend on identity, and a no-op update would otherwise loop.
	 */
	useEffect(() => {
		setTrip((prev) => {
			if (! prev) return prev;

			const kept = prev.ids.filter((id) => liveIds.has(id));

			return kept.length === prev.ids.length ? prev : { ...prev, ids: kept };
		});
	}, [liveIds, setTrip]);

	const checked = useMemo(
		() => new Set((live?.ids ?? []).filter((id) => liveIds.has(id))),
		[live, liveIds]
	);

	const toggle = useCallback((id: string) => {
		if (! householdId) return;

		setTrip((prev) => {
			const base = prev && prev.householdId === householdId && Date.now() - prev.at <= DAY_MS
				? prev
				: { householdId, at: Date.now(), ids: [], listMode: true };

			return {
				...base,
				at: Date.now(),
				ids: base.ids.includes(id) ? base.ids.filter((x) => x !== id) : [...base.ids, id],
			};
		});
	}, [householdId, setTrip]);

	const uncheck = useCallback((ids: readonly string[]) => {
		if (! householdId || ids.length === 0) return;

		const drop = new Set(ids);

		/*
		 * No `base` fallback, unlike `toggle` and `setListMode`: there is
		 * nothing to untick in a record that does not exist or has expired, and
		 * writing a fresh one would restart the 24-hour window over an empty
		 * cart.
		 */
		setTrip((prev) => {
			if (! prev || prev.householdId !== householdId) return prev;

			const kept = prev.ids.filter((id) => ! drop.has(id));

			return kept.length === prev.ids.length ? prev : { ...prev, at: Date.now(), ids: kept };
		});
	}, [householdId, setTrip]);

	const recheck = useCallback((ids: readonly string[]) => {
		if (! householdId || ids.length === 0) return;

		setTrip((prev) => {
			const base = prev && prev.householdId === householdId && Date.now() - prev.at <= DAY_MS
				? prev
				: { householdId, at: Date.now(), ids: [], listMode: true };

			// Undo runs seconds after the clear, so a row it names is normally
			// still unticked — but the same rows can be ticked by hand in the
			// meantime, and a check is a set membership, never a count.
			const back = ids.filter((id) => ! base.ids.includes(id));

			return back.length === 0 ? base : { ...base, at: Date.now(), ids: [...base.ids, ...back] };
		});
	}, [householdId, setTrip]);

	const setListMode = useCallback((on: boolean) => {
		if (! householdId) return;

		setTrip((prev) => {
			const base = prev && prev.householdId === householdId && Date.now() - prev.at <= DAY_MS
				? prev
				: { householdId, at: Date.now(), ids: [], listMode: on };

			return { ...base, listMode: on };
		});
	}, [householdId, setTrip]);

	return { checked, count: checked.size, toggle, uncheck, recheck, listMode: live?.listMode ?? false, setListMode };
}
