import { Lock } from 'lucide-preact';

import { ADMIN_HELD_NOTE } from '../../shared/admin';
import type { Theme } from '../lib/theme';

/**
 * The line that makes every disabled control on the screen legible.
 *
 * **It is what earns the exception to D36.** *A disabled control cannot explain
 * itself* is a rule about a reason that is off-screen; this puts the reason on
 * the screen, once, above the three controls it applies to — the delete strip,
 * the role triggers and *Revoke*. Delete this and the greyed-out buttons become
 * exactly the thing that rule forbids.
 *
 * **Neutral, not amber.** Amber in this console means *needs attention* — a
 * household with no owner, a household holding nothing — and it is on the same
 * page as the real ones. Nothing here needs fixing: a stated condition wearing
 * the colour of a problem would send somebody looking for one.
 *
 * It draws only where writes actually exist, which is the household page and
 * one account. Overview and the two lists have no controls to explain, and a
 * notice above a screen you can only read would be an apology for nothing.
 */
export function AdminHeldNotice({ theme }: { theme: Theme }) {
	return (
		<div
			class="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[13px] text-[13px] leading-[1.5]"
			style={{
				background: theme.surfaceAlt,
				color: theme.textMuted,
				border: `1px solid ${theme.border}`,
			}}
		>
			<Lock size={14} class="shrink-0 mt-[3px]" style={{ color: theme.textFaint }} />
			<span>{ADMIN_HELD_NOTE}</span>
		</div>
	);
}
