import { useCallback, useEffect, useMemo } from 'preact/hooks';

import { usePersistentState } from './usePersistentState';

/**
 * A trip: what you have claimed, and whether you were reading the list when you
 * last looked.
 *
 * **A check is a claim, not a write** (D64). Ticking a row says *I am getting
 * this*; the count is written once, at the put-away, on a screen you are
 * looking at while standing in front of the shelf. Nothing here touches an
 * item.
 *
 * **Claims are still local to this device, and that is the deferred half.** The
 * design makes a trip the household's, so a row someone else has claimed draws
 * their initial instead of a box you could tick twice — which is what stops the
 * double-buy and is most of why sharing them is worth doing. Until that lands,
 * two people at two shops still collide silently. What is built here is the
 * shape that survives it: a trip has an **id**, so the rows one put-away writes
 * can be seen to have arrived together, and it **ends** rather than merely
 * emptying.
 *
 * They live in `localStorage` for the reason a shopping list needs most:
 * reloading in a shop, on a phone with two bars of signal, has to come back to
 * the list with the ticks intact. That reason gets *stronger* once claims are
 * shared, not weaker — this stops being the storage and becomes the queue.
 *
 * Four rules clear a claim, and only the last one has a button:
 *
 * 1. The item leaves the list — anyone restocks it, and the claim goes with the
 *    row.
 * 2. The trip is put away. The counts are written and the trip is over.
 * 3. Twenty-four hours pass with no put-away. A shopping trip does not last a
 *    day, and a week-old claim is a lie somebody else will be reading.
 * 4. *Clear checks*, which is why that control now earns an undo.
 *
 * **Switching households no longer clears anything** (D64, replacing D41's own
 * rule 3). That rule existed because a check was a fact about a device; a trip
 * belongs to a household, so leaving one and coming back finds it where you left
 * it. Each household therefore keeps its own record, expiring on its own clock.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

type Trip = {
	/**
	 * The trip's own id, minted at the first tick and written onto every
	 * `restocks` row the put-away creates.
	 *
	 * Opaque, and deliberately not a row id: there is no trip table yet. It is
	 * the id there will be, so the events written before that exists can still
	 * be grouped afterwards — a column added later reads back empty on every row
	 * that predates it, and nothing backfills (D44).
	 */
	id: string;
	/**
	 * When a row was last ticked.
	 *
	 * The window runs from activity rather than from the first tick, so a slow
	 * shop cannot expire underneath somebody still walking it.
	 */
	at: number;
	ids: string[];
	listMode: boolean;
};

/**
 * Every household's trip, keyed by household id.
 *
 * D41 stored one record with the household *in* it, and argued against a key
 * per household on the grounds that switching away and back would hand
 * yesterday's ticks straight back. Under D64 that is the wanted behaviour and
 * the twenty-four hours are what bound it.
 */
type Trips = Record<string, Trip>;

export type TripChecks = {
	checked: ReadonlySet<string>;
	/** How many of the rows currently on the list are ticked. */
	count: number;
	/** The current trip's id, or '' when nothing is ticked. */
	tripId: string;
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
	/**
	 * The trip is over — rule 2, and the only caller is a put-away that came
	 * back from the server.
	 *
	 * It drops the whole record rather than the ids it wrote, so the **next**
	 * tick mints a new trip id. A put-away that left the record standing would
	 * file the following week's shop under the same trip as this one's.
	 */
	end: () => void;
	listMode: boolean;
	setListMode: (on: boolean) => void;
};

/**
 * Reads whatever is in storage as a map of trips.
 *
 * **It accepts D41's single-record shape as well**, adopting it under its own
 * household id, so upgrading does not throw away a trip that is halfway round a
 * shop. Anything else — a shape from the future, a hand-edited key, a string —
 * reads as no trips rather than throwing: this runs during render, and a bad
 * value here would be a blank screen rather than a lost tick.
 */
function readTrips(raw: unknown): Trips {
	if (! raw || typeof raw !== 'object') return {};

	const record = raw as Record<string, unknown>;

	// D41's shape: one trip, with the household named inside it.
	if (typeof record.householdId === 'string' && Array.isArray(record.ids)) {
		const legacy = raw as { householdId: string; at?: unknown; ids: unknown[]; listMode?: unknown };

		return {
			[legacy.householdId]: {
				// No id: it predates trips having one, and a restock row carrying
				// '' is honest about that.
				id: '',
				at: typeof legacy.at === 'number' ? legacy.at : 0,
				ids: legacy.ids.filter((id): id is string => typeof id === 'string'),
				listMode: legacy.listMode === true,
			},
		};
	}

	const trips: Trips = {};

	for (const [householdId, value] of Object.entries(record)) {
		if (! value || typeof value !== 'object') continue;

		const trip = value as Partial<Trip>;

		if (! Array.isArray(trip.ids)) continue;

		trips[householdId] = {
			id: typeof trip.id === 'string' ? trip.id : '',
			at: typeof trip.at === 'number' ? trip.at : 0,
			ids: trip.ids.filter((id): id is string => typeof id === 'string'),
			listMode: trip.listMode === true,
		};
	}

	return trips;
}

/**
 * A fresh trip id.
 *
 * Time first so the ids sort, and a random tail so two devices starting a trip
 * in the same millisecond do not file their rows together. It is never a
 * secret and never an authority — see `shared/invite.ts` for the one id in this
 * app that is both.
 */
function mintTripId(): string {
	return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** The empty map, hoisted so the initial value is not a fresh literal per render. */
const NO_TRIPS: Trips = {};

/** True while the record is this household's *and* still inside the window. */
function isLive(trip: Trip | undefined): trip is Trip {
	return Boolean(trip) && Date.now() - trip!.at <= DAY_MS;
}

/**
 * @param key         Storage key — per identity, like the theme and household ones.
 * @param householdId The list these ticks belong to; `null` until it loads.
 * @param liveIds     The ids currently on the list. Anything else has been restocked.
 */
export function useTripChecks(key: string, householdId: string | null, liveIds: ReadonlySet<string>): TripChecks {
	/*
	 * Typed as the shape it writes, read back through `readTrips` every time.
	 * The stored value can be D41's record or anything at all — a hand-edited
	 * key, a shape from a later version — and the type says nothing about that;
	 * the normalizer is the guard, and it is the only thing that ever looks at
	 * this value directly.
	 */
	const [raw, setRaw] = usePersistentState<Trips>(key, NO_TRIPS);

	const trips = useMemo(() => readTrips(raw), [raw]);

	/*
	 * Expiry is evaluated here as well as swept below, because an effect runs
	 * after paint: reading it during render is what keeps a day-old tick from
	 * showing for one frame before the sweep removes it.
	 */
	const mine = householdId ? trips[householdId] : undefined;
	const live = isLive(mine) ? mine : undefined;

	/**
	 * Rule 3, as a write, and it sweeps **every** household rather than this one.
	 *
	 * That is what stops the record growing a dead trip per pantry you have ever
	 * shopped: with a key per household nothing else would ever look at the
	 * others again.
	 */
	useEffect(() => {
		setRaw((prev) => {
			const all = readTrips(prev);
			const kept: Trips = {};

			for (const [id, trip] of Object.entries(all)) {
				if (isLive(trip)) kept[id] = trip;
			}

			return Object.keys(kept).length === Object.keys(all).length ? prev : kept;
		});
	}, [setRaw]);

	/*
	 * Rule 1, as a write. Returning `prev` unchanged is what makes this safe to
	 * run on every render — `liveIds` is a fresh Set each time, so this effect
	 * cannot depend on identity, and a no-op update would otherwise loop.
	 *
	 * **Only this household's record is pruned.** `liveIds` describes the list
	 * in front of you and says nothing whatever about a pantry you are not
	 * looking at; pruning the others against it would empty every parked trip.
	 */
	useEffect(() => {
		if (! householdId) return;

		setRaw((prev) => {
			const all = readTrips(prev);
			const trip = all[householdId];

			if (! trip) return prev;

			const kept = trip.ids.filter((id) => liveIds.has(id));

			return kept.length === trip.ids.length
				? prev
				: { ...all, [householdId]: { ...trip, ids: kept } };
		});
	}, [householdId, liveIds, setRaw]);

	const checked = useMemo(
		() => new Set((live?.ids ?? []).filter((id) => liveIds.has(id))),
		[live, liveIds]
	);

	/** This household's record, or a brand-new trip. The shape every write starts from. */
	const startFrom = useCallback((all: Trips, listMode: boolean): Trip => {
		const trip = householdId ? all[householdId] : undefined;

		return isLive(trip) ? trip : { id: mintTripId(), at: Date.now(), ids: [], listMode };
	}, [householdId]);

	const toggle = useCallback((id: string) => {
		if (! householdId) return;

		setRaw((prev) => {
			const all = readTrips(prev);
			const base = startFrom(all, true);

			return {
				...all,
				[householdId]: {
					...base,
					at: Date.now(),
					ids: base.ids.includes(id) ? base.ids.filter((x) => x !== id) : [...base.ids, id],
				},
			};
		});
	}, [householdId, setRaw, startFrom]);

	const uncheck = useCallback((ids: readonly string[]) => {
		if (! householdId || ids.length === 0) return;

		const drop = new Set(ids);

		/*
		 * No `startFrom` fallback, unlike `toggle` and `setListMode`: there is
		 * nothing to untick in a record that does not exist or has expired, and
		 * writing a fresh one would restart the 24-hour window over an empty
		 * cart — and mint a trip id for a trip nobody has begun.
		 */
		setRaw((prev) => {
			const all = readTrips(prev);
			const trip = all[householdId];

			if (! trip) return prev;

			const kept = trip.ids.filter((id) => ! drop.has(id));

			return kept.length === trip.ids.length
				? prev
				: { ...all, [householdId]: { ...trip, at: Date.now(), ids: kept } };
		});
	}, [householdId, setRaw]);

	const recheck = useCallback((ids: readonly string[]) => {
		if (! householdId || ids.length === 0) return;

		setRaw((prev) => {
			const all = readTrips(prev);
			const base = startFrom(all, true);

			// Undo runs seconds after the clear, so a row it names is normally
			// still unticked — but the same rows can be ticked by hand in the
			// meantime, and a check is a set membership, never a count.
			const back = ids.filter((id) => ! base.ids.includes(id));

			return back.length === 0
				? { ...all, [householdId]: base }
				: { ...all, [householdId]: { ...base, at: Date.now(), ids: [...base.ids, ...back] } };
		});
	}, [householdId, setRaw, startFrom]);

	const end = useCallback(() => {
		if (! householdId) return;

		setRaw((prev) => {
			const all = readTrips(prev);
			const trip = all[householdId];

			if (! trip) return prev;

			/*
			 * **List mode survives and the trip does not.** The rows it wrote are
			 * about to leave the list by arithmetic, and what is left — nothing,
			 * or the part of the run somebody else is doing — is still the screen
			 * you were on. Dropping the mode here would answer a put-away by
			 * throwing you back to the grid.
			 */
			return { ...all, [householdId]: { id: '', at: Date.now(), ids: [], listMode: trip.listMode } };
		});
	}, [householdId, setRaw]);

	const setListMode = useCallback((on: boolean) => {
		if (! householdId) return;

		setRaw((prev) => {
			const all = readTrips(prev);
			const base = startFrom(all, on);

			return { ...all, [householdId]: { ...base, listMode: on } };
		});
	}, [householdId, setRaw, startFrom]);

	return {
		checked,
		count: checked.size,
		tripId: live?.id ?? '',
		toggle,
		uncheck,
		recheck,
		end,
		listMode: live?.listMode ?? false,
		setListMode,
	};
}
