import type { ComponentChildren } from 'preact';
import type { LucideIcon } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';

export type EmptyAction = {
	label: string;
	onClick: () => void;
	icon?: LucideIcon;
};

type Props = {
	/** Playfair italic. One sentence, and it names *this* screen. */
	title: string;
	body: string;
	/**
	 * The one way out.
	 *
	 * Optional, because not every empty screen has one worth drawing: a status
	 * filter that matches nothing is escaped by the chip you just pressed, which
	 * is still on screen a few pixels up and now reads `0`. A button repeating
	 * that would be a second control for a job the first one is still doing.
	 */
	action?: EmptyAction;
	/** Anything that stands in for the action — the viewer's "View only" chip. */
	children?: ComponentChildren;
	theme: Theme;
};

/**
 * The app's one empty screen, drawn from the first-run board.
 *
 * Every emptiness in the content column goes through here so they read as one
 * thing said several ways: Playfair italic at 27px, a 420px body, and at most
 * one action. Before this the household-with-nothing-in-it had the full
 * treatment and every other empty result got `Nothing here yet.` in 14px grey,
 * which looked like a rendering failure rather than an answer.
 *
 * **The copy is the component's whole job.** A title that says which screen you
 * are on — *Nothing in Pantry.*, *Nothing's out.* — answers the question the
 * blank space asks; a generic one just repeats that the space is blank.
 */
export function EmptyState({ title, body, action, children, theme }: Props) {
	const Icon = action?.icon;

	return (
		<div class="col-span-full flex flex-col items-center justify-center text-center gap-3.5 py-16 md:py-24 px-4 md:px-16">
			<p class="font-disp italic text-[27px] font-medium leading-[1.3]" style={{ color: theme.textStrong }}>
				{title}
			</p>

			<p class="text-[14.5px] leading-[1.5] max-w-[420px]" style={{ color: theme.textMuted }}>
				{body}
			</p>

			{action && (
				<button
					onClick={action.onClick}
					class={`flex items-center justify-center gap-2.5 min-w-[158px] h-11 px-5 mt-1.5 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
					style={{ background: theme.inkBg, color: theme.inkText }}
				>
					{Icon && <Icon size={18} strokeWidth={2.2} />}
					{action.label}
				</button>
			)}

			{children}
		</div>
	);
}
