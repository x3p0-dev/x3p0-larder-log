import { Check } from 'lucide-preact';

import type { Theme } from '../lib/theme';

/**
 * The app's checkbox — the chip rule at 22px.
 *
 * Off is the surface on a 2px `textMuted` border; on is the inversion every
 * selected control in this app uses. **`textMuted` rather than the composer
 * field's old border is a contrast finding**: `#6E5F4B` is the strongest border
 * in the dark palette, but it was measured on the *ground*. On a card surface
 * it falls to 2.45:1 — under the 3:1 a control outline needs — and an unchecked
 * box you cannot see is the worst failure either of its two users can have.
 *
 * Two of them, and the rhyme is deliberate: the box that takes a row off the
 * list you are shopping, and the box that keeps an item off every list.
 */
export function CheckBox({ checked, theme }: { checked: boolean; theme: Theme }) {
	return (
		<span
			class="flex items-center justify-center w-[22px] h-[22px] rounded-[7px] shrink-0"
			style={checked
				? { background: theme.inkBg }
				: { background: theme.surface, border: `2px solid ${theme.textMuted}` }}
		>
			{checked && <Check size={13} strokeWidth={3.2} style={{ color: theme.inkText }} />}
		</span>
	);
}
