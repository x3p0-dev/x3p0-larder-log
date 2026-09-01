import { useMemo } from 'preact/hooks';
import { useMutation, useQuery } from '@spacefast/zero/client';

import type { AccountResult } from '../../shared/types';
import type { OwnershipDecision } from '../../shared/accountDeletion';

/**
 * The account pane's own subscription, and the two writes behind it (D68).
 *
 * **Its own hook, and mounted rather than flagged.** `useAccount` is five
 * indexed reads per household, which is nothing once and a page-load tax on
 * everybody if it sits beside `pantry` — so it is called from `AccountPane`,
 * which only exists while the pane is pushed. That is the console's own
 * arrangement: a hook cannot be called conditionally, but a component can be
 * rendered conditionally, and the second is the honest version of the first.
 *
 * `transferOwnership` lives here rather than in `usePantryData` even though the
 * Members pane calls it, because it and account deletion are one feature and
 * splitting them across two hooks would mean the transfer's refusals were
 * surfaced two different ways.
 */

/**
 * What a subscription looks like before its first result arrives.
 *
 * The same test the other two hooks use, for the same reason: `useQuery` seeds
 * its state with a hardcoded empty **array** whatever the query returns, and
 * Zero emits `query.result` on success only — so an array at the top level is
 * the one loading signal there is.
 */
function isLoading(value: unknown): boolean {
	return Array.isArray(value) || value === null || typeof value !== 'object';
}

export type AccountState =
	| { state: 'loading' }
	| { state: 'guest' }
	| { state: 'ready'; data: Extract<AccountResult, { state: 'ready' }> };

export function useAccount(): AccountState {
	const result = useQuery<AccountResult>('account');

	if (isLoading(result)) return { state: 'loading' };
	if (result.state !== 'ready') return { state: 'guest' };

	return { state: 'ready', data: result };
}

export type AccountWrites = {
	/**
	 * Hands a household over. `null` on success, the server's sentence on refusal.
	 *
	 * Owner only, and it demotes **you** to Editor — which is the half promoting
	 * somebody never did.
	 */
	transferOwnership: (householdId: string, toMembershipId: string) => Promise<string | null>;
	/**
	 * Deletes your account. `null` on success.
	 *
	 * The decisions cover only the households that are genuinely a question; the
	 * server recomputes the plan and refuses one it was not owed.
	 */
	deleteAccount: (decisions: OwnershipDecision[]) => Promise<string | null>;
};

export function useAccountWrites(): AccountWrites {
	const transferOwnership = useMutation<[string, string], void>('transferOwnership');
	const deleteAccount = useMutation<[OwnershipDecision[]], void>('deleteMyAccount');

	/**
	 * `null` on success, the server's own sentence on refusal.
	 *
	 * Every message these two handlers throw is written to be read by a person —
	 * *Decide what happens to Granny's first.* is the whole point of the
	 * validate-then-write pass — so there is nothing to translate here, and
	 * translating would only let the two drift.
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
		transferOwnership: guard(transferOwnership),
		deleteAccount: guard(deleteAccount),
	}), [transferOwnership, deleteAccount]);
}
