import { useCallback, useMemo, useState } from 'preact/hooks';
import { useMutation, useQuery } from '@spacefast/zero/client';

import type {
	AdminAccessResult,
	AdminHouseholdFilter,
	AdminHouseholdSort,
	AdminHouseholdsData,
	AdminHouseholdDetailData,
	AdminHouseholdDetailResult,
	AdminHouseholdsResult,
	AdminSummaryData,
	AdminAccountData,
	AdminAccountResult,
	AdminOwnershipDecision,
	AdminPeopleData,
	AdminPeopleFilter,
	AdminPeopleResult,
	AdminPeopleSort,
	AdminActivityData,
	AdminActivityExportData,
	AdminActivityExportResult,
	AdminActivityResult,
	AdminSummaryResult,
} from '../../shared/types';
import type { Role } from '../../shared/roles';

/**
 * The console's subscriptions.
 *
 * Separate from `usePantryData` on purpose: that hook is three live queries and
 * nineteen mutations that every signed-in person opens, and these are queries
 * that scan the whole space for the handful of people who may. Folding them
 * together would put a full-database pass one prop away from the pantry.
 *
 * **The two heavy ones are gated by mounting, not by a flag.** Each is called
 * from the section that draws it, and a section only mounts while the console
 * is open on it — so an ordinary load opens neither subscription, and switching
 * sections closes the one you left. That is why there is no `enabled` argument
 * anywhere here: a hook cannot be called conditionally, but a component can be
 * rendered conditionally, and the second is the honest version of the first.
 */

/**
 * What a subscription looks like before its first result arrives.
 *
 * The same test `usePantryData` uses and for the same reason: `useQuery` seeds
 * its state with a hardcoded empty **array** whatever the query returns, and
 * Zero emits `query.result` on success only — so an array at the top level is
 * the one loading signal there is.
 */
function isLoading(value: unknown): boolean {
	return Array.isArray(value) || value === null || typeof value !== 'object';
}

/**
 * Whether this account administers the space.
 *
 * The one console query that runs on every load, because it is what the account
 * menu reads to decide whether to draw its *Admin* row. It is a single boolean
 * over no scan at all.
 *
 * It answers `false` while loading, which is the right default for the thing it
 * drives: a row that flickers into a menu after it opens is worse than one that
 * appears on the next load. In practice every subscription starts in the same
 * tick, so it has resolved long before anybody reaches the account row.
 */
export function useAdminAccess(): boolean {
	const result = useQuery<AdminAccessResult>('adminAccess');

	return ! isLoading(result) && result.admin === true;
}

/**
 * Whether this caller's console writes are on hold.
 *
 * Read from the server's own answer rather than from `ADMIN_WRITES_HELD`
 * directly: the rule depends on who is asking (a dev guest is exempt), and the
 * client must not hold a second copy of a security decision.
 *
 * **It defaults to held while the query is in flight**, which is the safe way
 * round: a control that is briefly asleep and then wakes is a beat of nothing
 * happening, where the reverse is a live *Delete household* on a page that was
 * about to disable it.
 */
export function useAdminWritesHeld(): boolean {
	const result = useQuery<AdminAccessResult>('adminAccess');

	return isLoading(result) || result.writesHeld !== false;
}

export type AdminSummaryState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'ready'; data: AdminSummaryData };

/** Overview's four cards, its twelve months, and its *Needs attention* list. */
export function useAdminSummary(): AdminSummaryState {
	const result = useQuery<AdminSummaryResult>('adminSummary');

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };

	return { state: 'ready', data: result };
}

export type AdminHouseholdsQuery = {
	search: string;
	filter: AdminHouseholdFilter;
	sort: AdminHouseholdSort;
	offset: number;
};

export type AdminHouseholdsState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'ready'; data: AdminHouseholdsData };

/**
 * The household list, re-subscribed on every change to the query.
 *
 * The search, chip, sort and offset are **arguments, not client-side work**,
 * because three of the four cannot be done here: the chip counts, the matching
 * total and the two derived sorts all need every household, and the client is
 * only ever handed a page. One subscription per distinct argument tuple is what
 * Zero is for.
 */
export function useAdminHouseholds(q: AdminHouseholdsQuery): AdminHouseholdsState {
	const result = useQuery<AdminHouseholdsResult>('adminHouseholds', {
		search: q.search,
		filter: q.filter,
		sort: q.sort,
		offset: q.offset,
	});

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };

	return { state: 'ready', data: result };
}

export type AdminHouseholdDetailState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'missing' }
	| { state: 'ready'; data: AdminHouseholdDetailData };

/**
 * One household's metadata page.
 *
 * `missing` is a real answer and not an error: a household can be deleted while
 * somebody has its page open, and an id can be wrong. It reaches the client as
 * a value for the reason every other condition here does — a query that throws
 * never emits at all, so a throw would be indistinguishable from loading.
 */
export function useAdminHousehold(householdId: string): AdminHouseholdDetailState {
	const result = useQuery<AdminHouseholdDetailResult>('adminHousehold', householdId);

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };
	if (result.state === 'missing') return { state: 'missing' };

	return { state: 'ready', data: result };
}

/**
 * The console's four writes.
 *
 * Every one of them reaches a household the caller is not a member of, so every
 * one names its household explicitly — there is no membership to inject the id
 * from, which is the arrangement `usePantryData` uses and cannot be reused
 * here. The server re-checks `requireAdmin` and the household's own row
 * regardless; the id in these calls is a selector, exactly as it is everywhere
 * else in this app.
 *
 * They return the thrown message rather than a boolean, because every one of
 * them can be refused for a reason worth reading — *this household needs at
 * least one owner* is not a failure, it is an instruction.
 */
export type AdminPeopleQuery = {
	search: string;
	filter: AdminPeopleFilter;
	sort: AdminPeopleSort;
	offset: number;
};

export type AdminPeopleState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'ready'; data: AdminPeopleData };

/** Board 4. Searched, chipped, sorted and paged server-side, as the list is. */
export function useAdminPeople(q: AdminPeopleQuery): AdminPeopleState {
	const result = useQuery<AdminPeopleResult>('adminPeople', {
		search: q.search,
		filter: q.filter,
		sort: q.sort,
		offset: q.offset,
	});

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };

	return { state: 'ready', data: result };
}

export type AdminAccountState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'missing' }
	| { state: 'ready'; data: AdminAccountData };

/** Board 5. `missing` for an id that names nobody — a real answer, not an error. */
export function useAdminAccount(userId: string): AdminAccountState {
	const result = useQuery<AdminAccountResult>('adminAccount', userId);

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };
	if (result.state === 'missing') return { state: 'missing' };

	return { state: 'ready', data: result };
}

export type AdminActivityState =
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'ready'; data: AdminActivityData };

/** Board 9. Newest first, paged — the only console query that reads one table. */
export function useAdminActivity(offset: number): AdminActivityState {
	const result = useQuery<AdminActivityResult>('adminActivity', { offset });

	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };

	return { state: 'ready', data: result };
}

export type AdminExportState =
	| { state: 'idle' }
	| { state: 'loading' }
	| { state: 'denied' }
	| { state: 'ready'; data: AdminActivityExportData };

/**
 * A range of the log, for export.
 *
 * `from` empty means *not asked yet* — the subscription is opened with bounds
 * the server rejects into an empty range, which costs one idle subscription
 * rather than the whole table. A hook cannot be called conditionally, and
 * unmounting is not available here because the control that triggers the export
 * stays on screen.
 */
export function useAdminActivityExport(from: string, to: string): AdminExportState {
	const result = useQuery<AdminActivityExportResult>('adminActivityExport', from, to);

	if (! from || ! to) return { state: 'idle' };
	if (isLoading(result) || ! ('state' in result)) return { state: 'loading' };
	if (result.state === 'denied') return { state: 'denied' };

	return { state: 'ready', data: result };
}

export type AdminWrites = {
	setRole: (householdId: string, membershipId: string, role: Role) => Promise<string | null>;
	removeMember: (householdId: string, membershipId: string) => Promise<string | null>;
	revokeInvite: (householdId: string, inviteId: string) => Promise<string | null>;
	deleteHousehold: (householdId: string) => Promise<string | null>;
	transferOwnership: (householdId: string, toMembershipId: string) => Promise<string | null>;
	deleteAccount: (userId: string, decisions: AdminOwnershipDecision[]) => Promise<string | null>;
};

/**
 * Recompute the rollup columns for every household that has none.
 *
 * **This is a write the hold does not cover, deliberately** (D76). It destroys
 * nothing, and `ADMIN_WRITES_HELD` exists so that the first look at the console
 * cannot delete somebody's pantry — holding this one would mean the console's
 * own numbers could not be made true until the hold came off, which is backwards
 * when reading correct numbers is the whole of what the hold leaves you able to
 * do. So it goes through `useMutation` like any other and is **not** part of
 * `useAdminWrites`, whose six are the held ones.
 *
 * **The loop is here rather than in the handler**, because the handler is one
 * page and hands its cursor back: a mutation that walked a million households in
 * one request is the failure the whole rollup exists to avoid. The client is the
 * only place that can hold the loop, and it is bounded by the space rather than
 * unbounded — `RUNAWAY_PAGES` is the backstop for a cursor that stops advancing,
 * which `collectAll` guards against on the read side for the same reason.
 *
 * There is no toast. Every figure on Overview is invalidated by the last call
 * and simply appears, which is the most visible confirmation this app has and
 * the reason four other triggers already refuse one.
 */
const RUNAWAY_PAGES = 500;

export type RepairState = {
	run: () => void;
	/** Whether a walk is in flight — the control says so and cannot be pressed twice. */
	busy: boolean;
	/** The server's own sentence, or '' */
	error: string;
};

export function useRepairCounts(): RepairState {
	const repair = useMutation<
		[{ cursor?: string | null; pageSize?: number }],
		{ checked: number; repaired: number; cursor: string | null; done: boolean }
	>('adminRepairCounts');

	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const run = useCallback(() => {
		if (busy) return;

		setBusy(true);
		setError('');

		(async () => {
			try {
				let cursor: string | null = null;

				for (let page = 0; page < RUNAWAY_PAGES; page++) {
					const result = await repair({ cursor });

					if (result.done) break;

					// A cursor that has stopped advancing would otherwise walk the
					// same page until the backstop, reporting progress and making
					// none.
					if (! result.cursor || result.cursor === cursor) break;

					cursor = result.cursor;
				}
			} catch (err) {
				setError(err instanceof Error && err.message ? err.message : 'That did not work. Try again.');
			} finally {
				setBusy(false);
			}
		})();
	}, [busy, repair]);

	return { run, busy, error };
}

export function useAdminWrites(): AdminWrites {
	const setRole = useMutation<[string, string, Role], void>('adminSetRole');
	const removeMember = useMutation<[string, string], void>('adminRemoveMember');
	const revokeInvite = useMutation<[string, string], void>('adminRevokeInvite');
	const deleteHousehold = useMutation<[string], void>('adminDeleteHousehold');
	const transferOwnership = useMutation<[string, string], void>('adminTransferOwnership');
	const deleteAccount = useMutation<[string, AdminOwnershipDecision[]], void>('adminDeleteAccount');

	/**
	 * `null` on success, the server's own sentence on refusal.
	 *
	 * Every message a handler throws is written to be read by a person — the
	 * spike found a thrown message is copied verbatim into the response body —
	 * so there is nothing to translate here and translating would only let the
	 * two drift.
	 */
	function guard<TArgs extends unknown[]>(run: (...args: TArgs) => Promise<unknown>) {
		return async (...args: TArgs): Promise<string | null> => {
			try {
				await run(...args);

				return null;
			} catch (err) {
				return err instanceof Error && err.message
					? err.message
					: 'That did not work. Try again.';
			}
		};
	}

	return useMemo(() => ({
		setRole: guard(setRole),
		removeMember: guard(removeMember),
		revokeInvite: guard(revokeInvite),
		deleteHousehold: guard(deleteHousehold),
		transferOwnership: guard(transferOwnership),
		deleteAccount: guard(deleteAccount),
	}), [setRole, removeMember, revokeInvite, deleteHousehold, transferOwnership, deleteAccount]);
}
