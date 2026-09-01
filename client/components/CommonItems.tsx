import { useMemo, useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { themed } from '../lib/theme';
import { CheckBox } from './CheckBox';
import { EmptyState } from './EmptyState';
import { LIST_GHOST, LIST_ROW, LIST_TARGET, PAGE_BUTTON_PRIMARY } from '../lib/controlStyles';
import { BULK_MAX, catalogGroups } from '../../shared/bulkEntry';
import type { CatalogItem } from '../../shared/catalog';
import type { Item, Term } from '../../shared/types';

/**
 * Start from common items — the phone-shaped way past the adoption wall (D67).
 *
 * **The same review surface, seeded from the catalog instead of from a paste.**
 * Ticking here writes nothing: the primary reads *Review 31 items*, not *Add*,
 * and that is the whole reason the screen is drawn this way. Adding thirty-one
 * items straight from a tick means thirty-one items at 0 on hand — which, by
 * the run list's own rule, is thirty-one rows on your list on day one. Routing
 * through the review, where counts default to 1, avoids it without a special
 * case.
 *
 * **Nobody pastes two hundred lines one-handed; ticking boxes is exactly what a
 * thumb is for.** So this is the route that matters on a phone, and it is drawn
 * as one column of type cards there.
 *
 * **Zero new components.** One card per type in the run list's own grid, the
 * store card's construction with a type tag in the header band, and the app's
 * 22px checkbox on a 48px row.
 */
type Props = {
	items: readonly Item[];
	types: readonly Term[];
	/** Hands the ticked entries to the review. Nothing is written here. */
	onReview: (entries: CatalogItem[]) => void;
	onBack: () => void;
	dark: boolean;
	theme: Theme;
};

/**
 * How many rows a card shows before its *N more*.
 *
 * Six, which is the six-row cap the suggestion menu already holds people to —
 * and the point of the fold is that fifteen cards fully open is a page nobody
 * scans. A card opens on a press and stays open.
 */
const CARD_ROWS = 6;

export function CommonItems({ items, types, onReview, onBack, dark, theme }: Props) {
	const groups = useMemo(() => catalogGroups(items, types), [items, types]);

	/** Ticked names, not indexes: the grouping is derived and can re-order. */
	const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());

	const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
	const atCap = ticked.size >= BULK_MAX;

	function toggle(name: string) {
		setTicked((prev) => {
			const next = new Set(prev);

			if (next.has(name)) next.delete(name);
			// **A silent cap is the one thing this must not do.** The bar says so
			// beside the count rather than the tick quietly failing.
			else if (next.size < BULK_MAX) next.add(name);

			return next;
		});
	}

	function review() {
		const picked: CatalogItem[] = [];

		for (const group of groups) {
			for (const entry of group.entries) {
				if (ticked.has(entry.name)) picked.push(entry);
			}
		}

		onReview(picked);
	}

	if (total === 0) {
		return (
			<div class="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))] items-start">
				<EmptyState
					title="Your larder is ahead of the list."
					body="Everything on the common-items list is already in this pantry. Paste a list or add an item to go past it."
					action={{ label: 'Back to items', onClick: onBack }}
					theme={theme}
				/>
			</div>
		);
	}

	return (
		<div>
			<div class="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))] items-start">
				{groups.map((group) => {
					/*
					 * The store card's header, with a type tag in it — the term's own
					 * tint fill, its border along the bottom, its dot. The trailing
					 * group has no term, so it takes the sunk fill and **no dot**: no
					 * term means no colour, and it reads quieter by having no hue at
					 * all rather than by being dimmer.
					 */
					const term = group.term ? themed(group.term.ink, dark) : null;
					const open = opened.has(group.label);
					const shown = open ? group.entries : group.entries.slice(0, CARD_ROWS);
					const chosen = group.entries.filter((entry) => ticked.has(entry.name)).length;
					const headingId = `common-${group.label.replace(/\s+/g, '-').toLowerCase()}`;

					return (
						<section
							key={group.label}
							aria-labelledby={headingId}
							class="rounded-[20px] overflow-hidden"
							style={{
								background: theme.surface,
								border: `1px solid ${dark ? theme.borderStrong : theme.border}`,
							}}
						>
							<div
								class="flex items-center gap-2.5 h-11 px-[18px]"
								style={{
									background: term ? term.bg : theme.surfaceAlt,
									borderBottom: `1px solid ${term ? term.ring : theme.border}`,
								}}
							>
								{term && <span class="w-2 h-2 rounded-full shrink-0" style={{ background: term.dot }} />}
								<h3
									id={headingId}
									class="font-semibold text-xs uppercase tracking-[0.12em] truncate"
									style={{ color: term ? term.ink : theme.textMuted }}
								>
									{group.label}
								</h3>
								<span class="flex-1" />
								<span class="font-semibold text-[12.5px]" style={{ color: term ? term.ink : theme.textMuted }}>
									{chosen} of {group.entries.length}
								</span>
							</div>

							<ul class="list-none m-0 p-0">
								{shown.map((entry, index) => {
									const on = ticked.has(entry.name);

									return (
										<li key={entry.name}>
											<button
												onClick={() => toggle(entry.name)}
												/* The whole row is the checkbox — the run list's
												  * rule, and the mistake this app corrected once
												  * already: a 22px box is not a hit area. */
												class={`flex items-center gap-3.5 w-full h-12 px-[18px] text-left ${LIST_ROW} ${LIST_TARGET}`}
												style={index === 0 ? undefined : { borderTop: `1px solid ${theme.divider}` }}
												aria-pressed={on}
												// Nothing is disabled at the cap. A control that
												// cannot explain itself is worse than one that
												// refuses with a sentence beside it (D36).
											>
												<CheckBox checked={on} theme={theme} />
												<span
													class="flex-1 min-w-0 truncate font-disp text-[17px] font-semibold tracking-[-0.01em]"
													style={{ color: on ? theme.textStrong : theme.text }}
												>
													{entry.name}
												</span>
											</button>
										</li>
									);
								})}
							</ul>

							{group.entries.length > CARD_ROWS && ! open && (
								<button
									onClick={() => setOpened((prev) => new Set(prev).add(group.label))}
									/* The card's own row treatment, not `PAGE_ICON`: this sits
									  * on `surface`, and `PAGE_ICON` offsets its ring against
									  * the canvas — which draws the gap in a colour that is
									  * not behind it (D45). */
									class={`flex items-center justify-center w-full h-10 text-[13.5px] font-semibold ${LIST_ROW} ${LIST_TARGET}`}
									style={{ borderTop: `1px solid ${theme.divider}`, color: theme.textMuted }}
								>
									{`${group.entries.length - CARD_ROWS} more`}
								</button>
							)}
						</section>
					);
				})}
			</div>

			{/*
			  * The trip bar's construction, doing the trip bar's job one screen
			  * over: sunk fill, `line` border, radius 15, and the mode's terminal
			  * action on the right. **The left half says what ticking has not
			  * done** — this is the one screen in the app where a checkbox writes
			  * nothing, and saying so is cheaper than finding out.
			  */}
			<div
				class="flex items-center gap-3 min-h-14 md:min-h-[52px] px-3 md:px-[18px] py-2 mt-6 rounded-[15px] flex-wrap"
				style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
			>
				<span class="text-[12.5px] leading-[1.45] min-w-0" style={{ color: theme.textMuted }}>
					<span class="hidden md:inline">
						{atCap
							? `That is the most one list can carry — ${BULK_MAX}.`
							: 'Ticking adds nothing yet — the next screen is where you set counts'}
					</span>
					<span class="md:hidden">{atCap ? `${BULK_MAX} is the most` : 'Counts come next'}</span>
				</span>

				<span class="flex-1" />

				{/* `LIST_GHOST`, which lifts to `surface`: the bar *is* `surface-alt`,
				  * so the page's usual sinking ghost would hover to exactly the
				  * colour it is already on and have no hover at all (D45). */}
				<button
					onClick={onBack}
					class={`shrink-0 h-11 md:h-[38px] px-3 md:px-4 rounded-[13px] text-[15px] font-semibold ${LIST_GHOST}`}
				>
					Cancel
				</button>

				<button
					onClick={review}
					disabled={ticked.size === 0}
					class={`inline-flex items-center shrink-0 h-[46px] md:h-[38px] px-4 md:px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
					style={{ background: theme.inkBg, color: theme.inkText }}
				>
					<span class="hidden md:inline">Review {ticked.size} items</span>
					<span class="md:hidden">Review {ticked.size}</span>
				</button>
			</div>
		</div>
	);
}
