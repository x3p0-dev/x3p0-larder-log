import { ShoppingBasket } from 'lucide-preact';

import { SOURCE_KIND_ICONS } from './SourceKindMenu';
import type { Theme } from '../lib/theme';
import { PAGE_FOCUS } from '../lib/controlStyles';
import type { BandKind, RunBand } from '../../shared/runList';

/** Which tab is showing. `all` is the banded screen and the default. */
export type RunTab = 'all' | BandKind;

const LABELS: Record<BandKind, string> = { buy: 'Buy', harvest: 'Harvest', make: 'Make' };

/** The band's glyph is the source kind's glyph. One mark, three places. */
const BAND_ICONS = { buy: SOURCE_KIND_ICONS.shop, harvest: SOURCE_KIND_ICONS.grow, make: SOURCE_KIND_ICONS.make };

/**
 * Four tabs over the run list — `All`, then one per band that has something.
 *
 * **`All` is the default and that is the whole design.** It renders the banded
 * screen, so the first thing you see is every kind at once: *you're out of
 * stock, and the carrots for it are on the Publix card two bands up.* The other
 * three exist for the moments the activities actually separate — at the shop,
 * in the garden, at the stove.
 *
 * **`All` wears the basket**, and it is the one tab whose glyph is not a source
 * kind. That is a reversal: it carried no mark at first, on the drawer's `All
 * items` argument — the absence of a choice is not a member of the set. What
 * changed is that the basket became free. It is the run trigger's own glyph, it
 * already means *everything to get* rather than *the shop part of it* (which is
 * exactly why the trigger stopped being a cart), and with the trigger gone from
 * this row on desktop the mark had nowhere else to be. So the segment reads as
 * one family: the whole basket, then the three ways things get into it.
 *
 * **It is also what lets the row go glyph-only at all.** `All` used to keep its
 * word at every width, because it had nothing to fall back to; with a mark of
 * its own it drops the word exactly when the others do, and four glyphs is a
 * set where three-plus-a-word was a ragged row.
 *
 * **The active state is not the ink primary**, and that is deliberate. *Add
 * item* is still on screen in row 1 and ink is the thing you press; a second
 * ink fill would be two primaries on one screen. So the active tab is `surface`
 * on `borderStrong` — a raised tab on a sunk track — with the label at 600 and
 * the count in ink rather than meta.
 *
 * **Its counts are of the filtered set**, unlike the trigger's, which is the
 * household's. These label what each tab will show, so with a source filter on
 * they shrink and the trigger beside them does not. That pair has always been
 * allowed to disagree; the trigger answers *is there anything to get*, and
 * these answer *what is on this screen*.
 *
 * The caller decides whether to draw it at all: a household with no grow or
 * make source has one band, and one tab over one band is a control that cannot
 * do anything.
 */
export function RunSegment({ bands, total, tab, onPick, compact, iconOnly, theme }: {
	bands: RunBand[];
	/** Distinct items across every band — what `All` counts. */
	total: number;
	tab: RunTab;
	onPick: (tab: RunTab) => void;
	/**
	 * The row's touch geometry — 44px rather than 40 — and nothing else.
	 *
	 * It is row 2's own `compact`, so this stands exactly as tall as *Back to
	 * items* and the trigger either side of it. **Height and words are separate
	 * questions**: a docked drawer on a 1280 screen makes the row compact while
	 * leaving the segment ample room for its labels.
	 */
	compact: boolean;
	/**
	 * Short of room — the three bands drop their words and keep their glyphs.
	 *
	 * **`All` keeps its label at every width**, which is not an oversight. It
	 * deliberately carries no glyph — it is the absence of a choice rather than
	 * a member of the set — so there is nothing for it to fall back to, and
	 * inventing a mark for it would put an untaught glyph on the one tab that
	 * means *no filter*.
	 *
	 * The glyphs are safe to lean on here because the run list has already
	 * taught them four times over: the band headers above the cards, the source
	 * kind menu, the editing row, and first run's three checkboxes.
	 */
	iconOnly: boolean;
	theme: Theme;
}) {
	return (
		<div
			role="tablist"
			aria-label="Run list"
			class={
				'inline-flex items-center gap-[3px] p-[3px] rounded-[13px] shrink-0 ' +
				(compact ? 'h-11' : 'h-10')
			}
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<Tab
				on={tab === 'all'}
				count={total}
				onPick={() => onPick('all')}
				label={iconOnly ? `All, ${total}` : undefined}
				compact={compact}
				theme={theme}
			>
				<ShoppingBasket size={15} strokeWidth={1.7} class="shrink-0" />
				{! iconOnly && 'All'}
			</Tab>

			{bands.map((band) => {
				const Icon = BAND_ICONS[band.kind];

				return (
					<Tab
						key={band.kind}
						on={tab === band.kind}
						count={band.count}
						onPick={() => onPick(band.kind)}
						// A glyph and a number are not a name. The count is in the
						// label as well as in the markup, because `aria-label` replaces
						// everything under it rather than prefixing it.
						label={iconOnly ? `${LABELS[band.kind]}, ${band.count}` : undefined}
						compact={compact}
						theme={theme}
					>
						<Icon size={15} strokeWidth={1.7} class="shrink-0" />
						{! iconOnly && LABELS[band.kind]}
					</Tab>
				);
			})}
		</div>
	);
}

/**
 * One tab.
 *
 * At module scope rather than nested in `RunSegment`: a component declared
 * inside another gets a new function identity per render, which Preact reads as
 * a new component *type* and rebuilds the subtree for — the bug that made the
 * collapsed rail need two clicks.
 *
 * **Hover strengthens the edge and the words; it never touches the fill.** That
 * is forced rather than chosen. The selected tab is the *raised* one — a
 * `surface` fill on a `surface-alt` track — and `surface` is lighter than the
 * track in **both** themes, so "move away from the ground" (D45) means darker,
 * and there is no darker step to take: light has `border` at `#E2D5C0`, which
 * works, while dark's track is already `#221C14` with only the `#1F1912` canvas
 * beneath it — three units, invisible. A fill hover would therefore have to run
 * *toward* the selected fill, and a hovered tab that looks half-selected on a
 * control whose entire job is saying which one is selected is worse than no
 * hover at all.
 *
 * So the edge does it. An unselected tab has no edge and grows `border`; the
 * selected one deepens `borderStrong` to `textFaint` — **toward the text in
 * whichever direction the theme requires**, darker in light and brighter in
 * dark. One idea, both states, and **the selected tab gets feedback too**,
 * which matters here because pressing it is a no-op and a dead control beside
 * three live ones reads as broken rather than as current.
 *
 * **It has to go through custom properties.** The rest colours come off the
 * `theme` object at runtime, so they are inline styles — and an inline
 * `border-color` beats any `hover:` class, which is exactly how the sort
 * trigger once shipped with no hover at all. `HouseholdTile`'s `--tile` trio is
 * the same trick.
 */
function Tab({ on, count, onPick, label, compact, theme, children }: {
	on: boolean;
	count: number;
	onPick: () => void;
	/** An accessible name, for a tab whose words have gone. */
	label?: string;
	compact: boolean;
	theme: Theme;
	children: preact.ComponentChildren;
}) {
	return (
		<button
			role="tab"
			aria-selected={on}
			aria-label={label}
			title={label}
			onClick={onPick}
			class={
				'group inline-flex items-center gap-[7px] px-[13px] rounded-[10px] text-[13.5px] whitespace-nowrap ' +
				// The track's 3px of padding, top and bottom, either side of it.
				(compact ? 'h-9 ' : 'h-8 ') +
				// A bare `border` for the 1px and the style; the colour is the
				// property. The unselected tabs carry it transparent rather than
				// omitting it, or picking a tab would shift every label beside it by
				// a pixel.
				'border border-[color:var(--tab-line)] hover:border-[color:var(--tab-line-hover)] ' +
				'text-[color:var(--tab-ink)] hover:text-[color:var(--tab-ink-hover)] ' +
				`transition-colors active:translate-y-px ${PAGE_FOCUS} ` +
				(on ? 'font-semibold' : 'font-medium')
			}
			style={{
				background: on ? theme.surface : undefined,
				'--tab-line': on ? theme.borderStrong : 'transparent',
				'--tab-line-hover': on ? theme.textFaint : theme.border,
				'--tab-ink': on ? theme.textStrong : theme.text,
				'--tab-ink-hover': theme.textStrong,
				'--tab-meta': on ? theme.textStrong : theme.textMuted,
			}}
		>
			{children}
			<span class="text-[12.5px] text-[color:var(--tab-meta)] group-hover:text-[color:var(--tab-ink-hover)] transition-colors">
				{count}
			</span>
		</button>
	);
}

/** How wide each band's word draws at 13.5px medium, to the nearest pixel. */
const TAB_LABEL_PX: Record<BandKind, number> = { buy: 26, harvest: 52, make: 36 };

/**
 * Roughly how wide the segment draws, measured from its parts.
 *
 * `ROW2_FULL_PX`'s method applied to a control that has no single width: a
 * household with a garden *and* a kitchen carries four tabs, one with only a
 * garden carries three, and the row deciding whether it can also hold the
 * trigger cannot use one number for both. Pinning it at the worst case would
 * drop the trigger on the common household to make room for a Make band it does
 * not have.
 *
 * The parts are a tab's `px-[13px]` pair, its `gap-[7px]`, a count of ~17, a
 * 15px glyph, and the track's own 3px padding, 1px border and 3px gaps.
 */
export function runSegmentPx(kinds: BandKind[], iconOnly: boolean): number {
	// `All` is a band tab's geometry with a different word in it.
	const all = 26 + 15 + 7 + 17 + (iconOnly ? 0 : 23 + 7);

	const tabs = kinds.reduce((width, kind) => (
		width + 26 + 15 + 7 + 17 + (iconOnly ? 0 : TAB_LABEL_PX[kind] + 7)
	), all);

	return tabs + 8 + 3 * kinds.length;
}
