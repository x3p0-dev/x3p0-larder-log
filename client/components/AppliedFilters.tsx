import { useEffect, useRef, useState } from 'preact/hooks';
import { X } from 'lucide-preact';

import { PAGE_BUTTON_CLEAR, PAGE_CHIP_APPLIED, PAGE_CHIP_APPLIED_X } from '../lib/controlStyles';
import type { TermKind } from '../../shared/types';

/** One term currently narrowing the grid, with its colour already resolved. */
export type AppliedFilter = {
	kind: TermKind;
	id: string;
	name: string;
	/**
	 * The term's solid fill for the active theme.
	 *
	 * Resolved by the caller rather than here, because turning a stored `ink`
	 * into a colour has two branches — a token *or* a legacy `#rrggbb` — and
	 * every screen that forgets the second one renders a term as blank space.
	 */
	dot: string;
};

/**
 * Ids are only unique within a table, so a chip's key has to name the table.
 *
 * On the hosted runtime row ids are sequential integers rather than UUIDs, so a
 * location and a store both holding `"4"` is not a hypothetical — it is the
 * normal state of a freshly seeded household.
 */
function keyOf(f: AppliedFilter): string {
	return `${f.kind}:${f.id}`;
}

/** How long a chip takes to leave. Matched by the transition on the chip. */
const REMOVE_MS = 140;

type Props = {
	/** In the drawer's own order — location, store, type. */
	filters: AppliedFilter[];
	onRemove: (kind: TermKind, id: string) => void;
	/** Clears every term *and* the status pill. Never the search field. */
	onClear: () => void;
};

/**
 * Row 3 of the top bar — the filters currently on, and the way out of them.
 *
 * **A filter you cannot see is a filter you cannot remove.** With the drawer
 * closed the applied set was invisible on mobile and merely countable on the
 * collapsed rail: the badges said *1* and *2* without saying which of the
 * sixteen terms they meant, and nothing cleared across groups from out there.
 *
 * It is **not conditional on the drawer**. The applied set is a fact about the
 * content column, not about the drawer, so appearing on collapse would reflow
 * the grid for a reason unrelated to what was pressed. With the drawer open it
 * is redundant with the Filter tab, and harmless.
 *
 * **`Clear filters` leads and the chips follow.** Reading order puts the escape
 * before the list, and on mobile — where the chips scroll and it does not —
 * that is also what keeps the clear from scrolling away.
 */
export function AppliedFilters({ filters, onRemove, onClear }: Props) {
	/*
	 * Chips mid-exit. The parent still holds the filter for these 140ms, which
	 * is what keeps the row from collapsing out from under the animation.
	 */
	const [going, setGoing] = useState<string[]>([]);
	const timers = useRef<number[]>([]);
	const clearRef = useRef<HTMLButtonElement>(null);

	useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); }, []);

	function remove(f: AppliedFilter) {
		const key = keyOf(f);

		if (going.includes(key)) return;

		/*
		 * Whether the bar outlives this chip. Read now rather than in the
		 * timeout: the parent still holds every filter during the animation, so
		 * 140ms later this count would be exactly as stale but harder to reason
		 * about.
		 */
		const survives = filters.length > 1;

		setGoing((prev) => [...prev, key]);
		timers.current.push(window.setTimeout(() => {
			setGoing((prev) => prev.filter((k) => k !== key));
			onRemove(f.kind, f.id);

			/*
			 * Focus lands on *Clear filters*, because the element that had it is
			 * gone — and focus falling to the body means a keyboard user starts
			 * tabbing from the top of the document again. The clear is the one
			 * control in the row guaranteed to still be there.
			 *
			 * It does not paint a ring after a mouse press: a programmatic
			 * `focus()` only matches `:focus-visible` when the interaction that
			 * led to it was itself keyboard-driven. So the ring appears exactly
			 * when someone is looking for it.
			 */
			if (survives) clearRef.current?.focus();
		}, REMOVE_MS));
	}

	if (filters.length === 0) return null;

	return (
		<div
			role="group"
			aria-label="Applied filters"
			class="flex items-start gap-1 pl-0.5 pb-4"
		>
			{/*
			  * Pinned at 390 by being the one thing outside the scroller, which is
			  * the whole reason the two are separate elements.
			  *
			  * **Its padding is symmetric at every width.** It was drawn with 2px
			  * on the left so the label would sit flush with the column edge, and
			  * on a phone — where the hover fill is the only press feedback there
			  * is — that put the fill hard against the "C". The 12px it has now
			  * lines the label up with the status pills' labels one row above,
			  * which is the alignment that was actually wanted.
			  */}
			<button
				ref={clearRef}
				onClick={onClear}
				class={`shrink-0 inline-flex items-center h-11 px-3 rounded-[13px] text-[14.5px] font-semibold md:h-[30px] md:mr-2 md:text-[13.5px] ${PAGE_BUTTON_CLEAR}`}
			>
				Clear filters
			</button>

			{/*
			  * **Desktop wraps; mobile scrolls**, and the split is `md:` rather
			  * than the measured column that row 2 uses. Row 2's question is
			  * whether its labels fit, which a docked drawer changes without the
			  * viewport moving. This row's question is whether there is a scroll
			  * gesture at all — a mouse has none, so a docked drawer on a 1280
			  * screen must still wrap even though its column is as narrow as a
			  * phone's. Different question, different axis.
			  *
			  * `pr` / `-mr` is the bleed: the chips run past the column's own
			  * gutter with no gap on that side, which is what says there is more.
			  * The pair cancels, so the wrapped desktop row is unaffected by it.
			  *
			  * `py-1 -my-1` and `pl-1` give the focus ring room inside the scroll
			  * port. `overflow-x-auto` clips on **both** axes, and the ring is a
			  * 2px outline at a 2px offset — drawn without the padding it is
			  * shaved off the top and bottom of every chip and off the left of the
			  * first one. The left padding is **not** cancelled by a negative
			  * margin, unlike the vertical pair: those 4px are half the gap to
			  * *Clear filters*, which had none at all when the two boxes touched.
			  */}
			<div class="min-w-0 flex flex-nowrap items-center gap-2 overflow-x-auto py-1 -my-1 pl-1 pr-[18px] -mr-[18px] md:flex-wrap md:overflow-visible">
				{filters.map((f) => {
					const key = keyOf(f);
					const leaving = going.includes(key);

					return (
						<button
							key={key}
							onClick={() => remove(f)}
							aria-label={`Remove filter ${f.name}`}
							/*
							  * **One action, so one target.** The `×` is a glyph, not a
							  * second hit area: the whole chip removes its term, which
							  * is the only thing it does.
							  */
							class={
								'shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full h-11 pl-[13px] pr-[11px] text-[14.5px] font-medium md:h-[30px] md:pl-[11px] md:pr-[9px] md:text-[13.5px] ' +
								PAGE_CHIP_APPLIED + ' ' +
								/*
								  * The exit: a fade plus a 4px rise. Under
								  * `prefers-reduced-motion` the rise drops and the
								  * fade stays — a chip that simply blinks out of
								  * existence gives no clue that pressing it did
								  * anything, which is the one thing the motion is
								  * there for.
								  */
								(leaving ? 'opacity-0 motion-safe:-translate-y-1 pointer-events-none' : '')
							}
						>
							<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: f.dot }} />
							{f.name}
							<span class={PAGE_CHIP_APPLIED_X}>
								<X size={12} strokeWidth={2.4} />
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
