import { useCallback, useMemo, useState } from 'preact/hooks';
import { useMutation, useQuery } from '@spacefast/zero/client';

import type {
	HouseholdData,
	HouseholdResult,
	ItemDraft,
	PantryData,
	PantryResult,
	TermKind,
} from '../../shared/types';

/**
 * The bridge between the capsule and the UI.
 *
 * Two live subscriptions (`pantry`, `household`) and every mutation the app
 * calls. Components below this take plain data and callbacks; nothing else in
 * `client/` imports from `@spacefast/zero/client`.
 */

/**
 * What a subscription looks like before its first result arrives.
 *
 * `useQuery` seeds its state with `getQueryValue(...) ?? []` — a hardcoded
 * empty **array**, whatever the query's real return shape is. Our queries
 * return objects, so an array at the top level can only mean "no result yet".
 * That is the loading signal; there is no other one, because Zero emits
 * `query.result` on success only and never reports a query failure to the
 * client at all.
 */
function isLoading(value: unknown): boolean {
	return Array.isArray(value) || value === null || typeof value !== 'object';
}

export type PantryStatus =
	| { state: 'loading' }
	| { state: 'guest' }
	| { state: 'no-household' }
	| { state: 'blocked'; message: string }
	| { state: 'ready'; pantry: PantryData; household: HouseholdData };

export type PantryApi = {
	status: PantryStatus;
	/** The last mutation error, for a banner. Cleared by `dismissError`. */
	error: string | null;
	dismissError: () => void;

	createHousehold: (name: string) => Promise<void>;
	updateHousehold: (patch: { name?: string; defaultThreshold?: string }) => Promise<void>;

	addItem: (draft: ItemDraft) => Promise<string | null>;
	updateItem: (id: string, patch: Partial<ItemDraft>) => Promise<void>;
	adjustQty: (id: string, delta: number) => Promise<void>;
	removeItem: (id: string) => Promise<void>;

	createTerm: (kind: TermKind, draft: { name: string; ink: string; icon?: string }) => Promise<string | null>;
	updateTerm: (kind: TermKind, id: string, patch: { name?: string; ink?: string; icon?: string }) => Promise<void>;
	deleteTerm: (kind: TermKind, id: string) => Promise<void>;
};

export function usePantryData(): PantryApi {
	const pantryResult = useQuery<PantryResult>('pantry');
	const householdResult = useQuery<HouseholdResult>('household');

	const [error, setError] = useState<string | null>(null);

	const rawCreateHousehold = useMutation<[string], { householdId: string }>('createHousehold');
	const rawUpdateHousehold = useMutation<[{ name?: string; defaultThreshold?: string }], void>('updateHousehold');
	const rawAddItem = useMutation<[ItemDraft], { id: string }>('addItem');
	const rawUpdateItem = useMutation<[string, Partial<ItemDraft>], void>('updateItem');
	const rawAdjustQty = useMutation<[string, number], void>('adjustQty');
	const rawRemoveItem = useMutation<[string], void>('removeItem');
	const rawCreateTerm = useMutation<[TermKind, { name: string; ink: string; icon?: string }], { id: string }>('createTerm');
	const rawUpdateTerm = useMutation<[TermKind, string, { name?: string; ink?: string; icon?: string }], void>('updateTerm');
	const rawDeleteTerm = useMutation<[TermKind, string], void>('deleteTerm');

	/**
	 * Runs a mutation and surfaces its failure.
	 *
	 * A mutation rejection *does* reach the client — unlike a query's — carrying
	 * the server's message verbatim. Every message a handler throws is written
	 * to be shown to a person, so this displays it rather than a generic string:
	 * "3 items are stored in Freezer" is the whole point of D16's refusal.
	 */
	const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T | null> => {
		try {
			const result = await work();
			setError(null);
			return result;
		} catch (thrown) {
			setError(thrown instanceof Error ? thrown.message : 'Something went wrong.');
			return null;
		}
	}, []);

	const status: PantryStatus = useMemo(() => {
		if (isLoading(pantryResult) || isLoading(householdResult)) return { state: 'loading' };

		// Both queries resolve the same membership, so they agree on everything
		// but timing. Whichever reports a non-ready state first is the answer.
		for (const result of [householdResult, pantryResult]) {
			if (result.state === 'guest') return { state: 'guest' };
			if (result.state === 'no-household') return { state: 'no-household' };
			if (result.state === 'blocked') return { state: 'blocked', message: result.message };
		}

		if (pantryResult.state !== 'ready' || householdResult.state !== 'ready') {
			return { state: 'loading' };
		}

		const { state: _p, ...pantry } = pantryResult;
		const { state: _h, ...household } = householdResult;

		return { state: 'ready', pantry, household };
	}, [pantryResult, householdResult]);

	return {
		status,
		error,
		dismissError: useCallback(() => setError(null), []),

		createHousehold: useCallback(async (name) => {
			await run(() => rawCreateHousehold(name));
		}, [run, rawCreateHousehold]),

		updateHousehold: useCallback(async (patch) => {
			await run(() => rawUpdateHousehold(patch));
		}, [run, rawUpdateHousehold]),

		addItem: useCallback(async (draft) => {
			const result = await run(() => rawAddItem(draft));
			return result ? result.id : null;
		}, [run, rawAddItem]),

		updateItem: useCallback(async (id, patch) => {
			await run(() => rawUpdateItem(id, patch));
		}, [run, rawUpdateItem]),

		adjustQty: useCallback(async (id, delta) => {
			await run(() => rawAdjustQty(id, delta));
		}, [run, rawAdjustQty]),

		removeItem: useCallback(async (id) => {
			await run(() => rawRemoveItem(id));
		}, [run, rawRemoveItem]),

		createTerm: useCallback(async (kind, draft) => {
			const result = await run(() => rawCreateTerm(kind, draft));
			return result ? result.id : null;
		}, [run, rawCreateTerm]),

		updateTerm: useCallback(async (kind, id, patch) => {
			await run(() => rawUpdateTerm(kind, id, patch));
		}, [run, rawUpdateTerm]),

		deleteTerm: useCallback(async (kind, id) => {
			await run(() => rawDeleteTerm(kind, id));
		}, [run, rawDeleteTerm]),
	};
}
