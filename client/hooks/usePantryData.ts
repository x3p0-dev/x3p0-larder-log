import { useCallback, useMemo, useState } from 'preact/hooks';
import { useMutation, useQuery } from '@spacefast/zero/client';

import type { Role } from '../../shared/roles';
import type {
	HouseholdData,
	HouseholdListResult,
	HouseholdResult,
	HouseholdSummary,
	ItemDraft,
	PantryData,
	PantryResult,
	TermKind,
} from '../../shared/types';

/**
 * The bridge between the capsule and the UI.
 *
 * Three live subscriptions — `households`, `pantry`, `household` — and every
 * mutation the app calls. Components below this take plain data and callbacks;
 * nothing else in `client/` imports from `@spacefast/zero/client`.
 *
 * Since D33 a caller can belong to several households, so every scoped mutation
 * names the one it is for. That id is **not** taken from the caller's argument
 * list: it is the id the `household` query says it answered for, injected here,
 * so a component can no more write to the wrong household than it can read from
 * one. The server verifies it against the caller's memberships regardless.
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
	| { state: 'ready'; pantry: PantryData; household: HouseholdData };

export type PantryApi = {
	status: PantryStatus;
	/** Every household the caller belongs to. Empty until the list arrives. */
	households: HouseholdSummary[];
	/**
	 * The household the server actually answered for, which is not always the
	 * one that was asked for — a selection left over from a household you have
	 * since left resolves to a different one. The caller reconciles against
	 * this rather than trusting what it stored.
	 */
	currentHouseholdId: string;
	/** The last mutation error, for a banner. Cleared by `dismissError`. */
	error: string | null;
	dismissError: () => void;

	/** Resolves to the new household's id, so the caller can switch to it. */
	createHousehold: (name: string) => Promise<string | null>;
	updateHousehold: (patch: { name?: string; defaultThreshold?: string }) => Promise<void>;

	addItem: (draft: ItemDraft) => Promise<string | null>;
	/** True when the server accepted the edit. False leaves the sheet open. */
	updateItem: (id: string, patch: Partial<ItemDraft>) => Promise<boolean>;
	adjustQty: (id: string, delta: number) => Promise<void>;
	/** True when the row is really gone — the undo toast is armed on this. */
	removeItem: (id: string) => Promise<boolean>;

	createTerm: (kind: TermKind, draft: { name: string; ink: string }) => Promise<string | null>;
	updateTerm: (kind: TermKind, id: string, patch: { name?: string; ink?: string }) => Promise<void>;
	/**
	 * True when the term is really gone — the undo toast is armed on this.
	 *
	 * Same reason `removeItem` reports one. Undo re-creates the term, so an undo
	 * offered for a delete the server refused would mint a duplicate.
	 */
	deleteTerm: (kind: TermKind, id: string) => Promise<boolean>;

	/** Resolves to the new code, or null when the server refused. */
	createInvite: (role: Role) => Promise<{ code: string; expiresAt: string } | null>;
	/** True when the code is dead. The plain toast only says so if it is. */
	revokeInvite: (inviteId: string) => Promise<boolean>;
	/** The joined household's id, or null when the server refused. */
	redeemInvite: (code: string) => Promise<string | null>;

	changeRole: (membershipId: string, role: Role) => Promise<void>;
	/** True when they are out. */
	removeMember: (membershipId: string) => Promise<boolean>;
	leaveHousehold: () => Promise<boolean>;
	/**
	 * Owner only, and only ever reached from the typed confirmation.
	 *
	 * Leaving a household you are the last member of would strand it, so the
	 * server refuses (D22) and this is what that case does instead — the row
	 * relabels to *Delete household* and takes this path.
	 */
	deleteHousehold: () => Promise<boolean>;
};

export function usePantryData(selectedHouseholdId: string | null): PantryApi {
	/*
	 * `''` rather than null, because the capsule's queries take a string. An
	 * empty one means "no preference" — a first load on a new device, or one
	 * whose stored selection has not been read yet — and the server answers
	 * with the caller's default household.
	 */
	const preferred = selectedHouseholdId ?? '';

	/*
	 * The list takes no argument on purpose: it is the one subscription a
	 * switch does not disturb, so the switcher keeps its rows while the pantry
	 * underneath it is still catching up.
	 */
	const listResult = useQuery<HouseholdListResult>('households');
	const pantryResult = useQuery<PantryResult>('pantry', preferred);
	const householdResult = useQuery<HouseholdResult>('household', preferred);

	const [error, setError] = useState<string | null>(null);

	const rawCreateHousehold = useMutation<[string], { householdId: string }>('createHousehold');
	const rawUpdateHousehold = useMutation<[string, { name?: string; defaultThreshold?: string }], void>('updateHousehold');
	const rawAddItem = useMutation<[string, ItemDraft], { id: string }>('addItem');
	const rawUpdateItem = useMutation<[string, string, Partial<ItemDraft>], void>('updateItem');
	const rawAdjustQty = useMutation<[string, string, number], void>('adjustQty');
	const rawRemoveItem = useMutation<[string, string], void>('removeItem');
	const rawCreateTerm = useMutation<[string, TermKind, { name: string; ink: string }], { id: string }>('createTerm');
	const rawUpdateTerm = useMutation<[string, TermKind, string, { name?: string; ink?: string }], void>('updateTerm');
	const rawDeleteTerm = useMutation<[string, TermKind, string], void>('deleteTerm');
	const rawCreateInvite = useMutation<[string, string], { code: string; expiresAt: string }>('createInvite');
	const rawRevokeInvite = useMutation<[string, string], void>('revokeInvite');
	const rawRedeemInvite = useMutation<[string], { householdId: string }>('redeemInvite');
	const rawChangeRole = useMutation<[string, string, string], void>('changeRole');
	const rawRemoveMember = useMutation<[string, string], void>('removeMember');
	const rawLeaveHousehold = useMutation<[string], void>('leaveHousehold');
	const rawDeleteHousehold = useMutation<[string], void>('deleteHousehold');

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
		}

		if (pantryResult.state !== 'ready' || householdResult.state !== 'ready') {
			return { state: 'loading' };
		}

		const { state: _p, ...pantry } = pantryResult;
		const { state: _h, ...household } = householdResult;

		return { state: 'ready', pantry, household };
	}, [pantryResult, householdResult]);

	const households = useMemo(() => (
		! isLoading(listResult) && listResult.state === 'ready' ? listResult.households : []
	), [listResult]);

	/*
	 * The household every scoped mutation below is aimed at. Empty until the
	 * query answers, which is also when the UI that calls them is still behind
	 * the loading gate — and if one slips through anyway, the server refuses a
	 * write with no household named rather than guessing at one.
	 */
	const currentHouseholdId = status.state === 'ready' ? status.household.household.id : '';

	return {
		status,
		households,
		currentHouseholdId,
		error,
		dismissError: useCallback(() => setError(null), []),

		createHousehold: useCallback(async (name) => {
			const result = await run(() => rawCreateHousehold(name));

			return result ? result.householdId : null;
		}, [run, rawCreateHousehold]),

		updateHousehold: useCallback(async (patch) => {
			await run(() => rawUpdateHousehold(currentHouseholdId, patch));
		}, [run, rawUpdateHousehold, currentHouseholdId]),

		addItem: useCallback(async (draft) => {
			const result = await run(() => rawAddItem(currentHouseholdId, draft));
			return result ? result.id : null;
		}, [run, rawAddItem, currentHouseholdId]),

		// A refusal has to be distinguishable from success: the edit sheet stays
		// open on false so the typing survives, the way `addItem` keeps its draft.
		updateItem: useCallback(async (id, patch) => (
			(await run(() => rawUpdateItem(currentHouseholdId, id, patch).then(() => true))) === true
		), [run, rawUpdateItem, currentHouseholdId]),

		adjustQty: useCallback(async (id, delta) => {
			await run(() => rawAdjustQty(currentHouseholdId, id, delta));
		}, [run, rawAdjustQty, currentHouseholdId]),

		// `void` here is what armed the undo toast for removals the server had
		// refused — and undo re-runs `addItem`, so pressing it duplicated the row.
		removeItem: useCallback(async (id) => (
			(await run(() => rawRemoveItem(currentHouseholdId, id).then(() => true))) === true
		), [run, rawRemoveItem, currentHouseholdId]),

		createTerm: useCallback(async (kind, draft) => {
			const result = await run(() => rawCreateTerm(currentHouseholdId, kind, draft));
			return result ? result.id : null;
		}, [run, rawCreateTerm, currentHouseholdId]),

		updateTerm: useCallback(async (kind, id, patch) => {
			await run(() => rawUpdateTerm(currentHouseholdId, kind, id, patch));
		}, [run, rawUpdateTerm, currentHouseholdId]),

		deleteTerm: useCallback(async (kind, id) => (
			(await run(() => rawDeleteTerm(currentHouseholdId, kind, id).then(() => true))) === true
		), [run, rawDeleteTerm, currentHouseholdId]),

		createInvite: useCallback(async (role) => (
			run(() => rawCreateInvite(currentHouseholdId, role))
		), [run, rawCreateInvite, currentHouseholdId]),

		revokeInvite: useCallback(async (inviteId) => (
			(await run(() => rawRevokeInvite(currentHouseholdId, inviteId).then(() => true))) === true
		), [run, rawRevokeInvite, currentHouseholdId]),

		// The returned id matters twice: the caller clears the stashed code on
		// success and keeps it on failure, and the household it names is the one
		// to switch to. Redemption takes no current household — the code says
		// which one it is for.
		redeemInvite: useCallback(async (code) => {
			const result = await run(() => rawRedeemInvite(code));

			return result ? result.householdId : null;
		}, [run, rawRedeemInvite]),

		changeRole: useCallback(async (membershipId, role) => {
			await run(() => rawChangeRole(currentHouseholdId, membershipId, role));
		}, [run, rawChangeRole, currentHouseholdId]),

		removeMember: useCallback(async (membershipId) => (
			(await run(() => rawRemoveMember(currentHouseholdId, membershipId).then(() => true))) === true
		), [run, rawRemoveMember, currentHouseholdId]),

		leaveHousehold: useCallback(async () => (
			(await run(() => rawLeaveHousehold(currentHouseholdId).then(() => true))) === true
		), [run, rawLeaveHousehold, currentHouseholdId]),

		deleteHousehold: useCallback(async () => (
			(await run(() => rawDeleteHousehold(currentHouseholdId).then(() => true))) === true
		), [run, rawDeleteHousehold, currentHouseholdId]),
	};
}
