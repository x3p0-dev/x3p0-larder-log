/**
 * Keep the copy of your avatar that the *rest of your household* sees in step
 * with the one your identity actually carries.
 *
 * `memberships.picture` is a denormalized copy, for the reason `displayName` is
 * one: the member list is a live query and must not join a row per member to
 * draw a face. The cost of that is the copy going stale, and there are two ways
 * it starts out stale that matter more than any later drift:
 *
 * - **Somebody sets up their Gravatar after joining**, which is the ordinary
 *   case rather than an edge one.
 * - **Every row written before the column existed holds `''`**, and nothing
 *   backfills (D44). Without this hook the feature would be invisible to
 *   everybody already using the app, which is very nearly the same thing as not
 *   shipping it.
 *
 * So it reconciles on load, and only ever when the two disagree — the steady
 * state is a comparison and no network call at all.
 */

import { useEffect, useRef } from 'preact/hooks';
import { useMutation } from '@spacefast/zero/client';

/**
 * @param picture The identity's own avatar URL, or `''` for none.
 * @param stored  What the caller's membership row holds, or `null` while the
 *                household query has not answered. The `null` is load-bearing:
 *                `''` is a real value meaning *no picture*, and treating an
 *                unanswered query as one would fire a write on every cold load
 *                for anyone who has no Gravatar.
 */
export function useAvatarSync(picture: string, stored: string | null): void {
	const sync = useMutation<[], void>('syncAccountAvatar');

	/**
	 * The value already sent this session. One attempt per value, failures
	 * included — a background convenience that cannot be retried into a loop,
	 * and whose failure mode is the initial, which is a perfectly good avatar.
	 */
	const sent = useRef<string | null>(null);

	useEffect(() => {
		if (stored === null || stored === picture) return;
		if (sent.current === picture) return;

		sent.current = picture;

		// Swallowed deliberately. Nothing on screen is waiting for this, and a
		// banner reading "we could not update your picture" over a household
		// that is working fine is worse than the letter it falls back to.
		void sync().catch(() => {});
	}, [picture, stored, sync]);
}
