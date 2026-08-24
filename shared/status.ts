/**
 * Stock status is derived, never stored.
 *
 * A stored status becomes a second source of truth the moment someone edits a
 * threshold, so `out` / `low` / `ok` is computed wherever it is displayed. The
 * colors that go with each status live client-side in `client/lib/theme.ts`;
 * this module stays pure so the server can use it too.
 */

import { toInt } from './qty';

export type StatusKey = 'out' | 'low' | 'ok';

export const STATUS_LABEL: Record<StatusKey, string> = {
	out: 'Out',
	low: 'Low',
	ok: 'In stock',
};

/** Derives status from the stored (string) quantity and threshold. */
export function statusKeyFor(qty: unknown, threshold: unknown): StatusKey {
	const onHand = toInt(qty);

	if (onHand <= 0) return 'out';
	if (onHand <= toInt(threshold)) return 'low';

	return 'ok';
}
