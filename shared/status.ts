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

/**
 * The same three states as a sentence, for the item sheet's live status line.
 *
 * `STATUS_LABEL` is the badge word — short, because it sits in a 19px pill on a
 * card. This is the phrasing the top bar's status pills use, sentence-cased
 * because here it is a line of its own rather than half of `6 running low`.
 */
export const STATUS_PHRASE: Record<StatusKey, string> = {
	out: 'Out',
	low: 'Running low',
	ok: 'In stock',
};

/**
 * Derives status from the stored (string) quantity and threshold.
 *
 * **Equal is low.** `low at 2` reads as "it is low when you are down to 2", so
 * the comparison is `<=` rather than `<`. Nothing in the app said this out loud
 * until the sheet grew a line that reports it while you move the numbers.
 */
export function statusKeyFor(qty: unknown, threshold: unknown): StatusKey {
	const onHand = toInt(qty);

	if (onHand <= 0) return 'out';
	if (onHand <= toInt(threshold)) return 'low';

	return 'ok';
}
