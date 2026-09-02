import { useRef, useState } from 'preact/hooks';
import { barChartLayout } from '@spacefast/zero/charts';

import type { Theme } from '../lib/theme';
import { monthLabel } from '../../shared/admin';
import type { AdminSeriesPoint } from '../../shared/types';

/**
 * Twelve months of a per-month count, as bars.
 *
 * **One component, two hosts** — Overview's *New households* and a household
 * page's *Items added*. They ask the same question of different rows, and a
 * chart written twice is a chart that gets fixed once; the console already paid
 * for that lesson with a missing *Admin* row.
 *
 * **Per month rather than a running total, and that is the whole reason this
 * shape exists.** A cumulative line only ever rises, so the reading both hosts
 * actually want — *is this still happening* — arrives as a change in slope,
 * which is the least legible thing a chart can be asked to say. Twelve columns
 * say it outright: a quiet stretch is a row of empty months and there is
 * nothing to interpret.
 *
 * **So the bars do not sum to the figure beside them.** `countByMonth` counts
 * what arrived inside the window, while a total starts from everything that
 * already existed. Neither host claims otherwise.
 *
 * **It owns the plot and not the card.** The two hosts frame it differently —
 * Overview draws its own heading, the household page uses that page's `Card`
 * and `Label` — so this returns a positioned box holding the `<svg>` and the
 * tooltip, and the caller wraps it in whatever surface it has.
 *
 * The geometry comes from `@spacefast/zero/charts` — a platform module, so it
 * costs nothing against the client bundle — and every colour is overridden,
 * because `barChartLayout` hands back its own categorical palette and the slot
 * blue is the one colour in this app that belongs to nothing.
 *
 * It scales by `viewBox` rather than re-laying out on resize. The alternative
 * is a `ResizeObserver` and a recompute per frame — and the observer is the
 * exact mechanism that shipped inert on row 2 for a month. **The tooltip did
 * not change that**: it measures the `<svg>` once per band the pointer enters,
 * which is at most twelve measurements and never one per frame.
 *
 * **The twelve values are in the `aria-label`, not behind the pointer.** The
 * tooltip is a convenience over data that has to be readable without one, and
 * the alternative — twelve focusable months — would put twelve tab stops
 * between the chart and whatever follows it. So the label carries the whole
 * series and the tooltip is `aria-hidden`: it says nothing a screen reader is
 * not already told.
 */
export function MonthBars({
	series, lead, one, many, height = 200, theme,
}: {
	series: AdminSeriesPoint[];
	/** Opens the accessible sentence — `New households per month`. */
	lead: string;
	/** The tooltip's noun, singular and plural. */
	one: string;
	many: string;
	height?: number;
	theme: Theme;
}) {
	const boxRef = useRef<HTMLDivElement | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [hovered, setHovered] = useState<Hovered | null>(null);
	const layout = barChartLayout({
		data: series.map((p) => ({ label: p.label, added: p.value })),
		x: 'label',
		series: ['added'],
		height,
	});
	const floor = layout.plot.y + layout.plot.height;
	const arrived = series.reduce((a, p) => a + p.value, 0);

	/*
	 * **Whole numbers only, and never the same one twice.** `niceTicks` divides
	 * the range into five and a household is not divisible: a space whose
	 * busiest month added one draws an axis reading `0 · 0.25 · 0.5 · 0.75 · 1`,
	 * which is the ordinary case here rather than an edge — the cumulative line
	 * this replaced was rarely near a max of 1, and a per-month count usually
	 * is.
	 *
	 * The dedupe is the other half, and it is what a completely quiet twelve
	 * months needs: with nothing to scale against, the helper hands back five
	 * ticks all valued `0` with a `null` `y` on each, so they collapse onto the
	 * top of the plot and take a duplicate key with them. One tick at the
	 * floor is what that should look like.
	 */
	const seen = new Set<number>();
	const ticks = layout.ticks
		.filter((t) => Number.isInteger(t.value) && ! seen.has(t.value) && (seen.add(t.value), true))
		.map((t) => ({ value: t.value, y: Number.isFinite(t.y) ? t.y : floor }));

	/*
	 * **A band, not a bar.** A month with nothing in it draws a bar of zero
	 * height, so hit-testing the bars would leave the quiet months — the ones
	 * this chart exists to make visible — with nothing to point at. Each band is
	 * the full column, full plot height, and they tile the plot exactly:
	 * `barChartLayout` centres each group in a slot of `plot.width / months`,
	 * so half a slot either side of the centre meets its neighbour with no gap.
	 *
	 * It is the rule the whole row is the checkbox already states, applied to
	 * a chart.
	 */
	const slot = layout.plot.width / Math.max(1, series.length);
	const bands = layout.groups.map((g) => ({ left: g.x - slot / 2, width: slot }));

	/**
	 * Where a viewBox point sits inside the card, in pixels.
	 *
	 * **The scale has to be worked out rather than assumed**, and that is the
	 * whole reason this function exists. The `<svg>` is `width: 100%` with a
	 * fixed height, so its box and its `viewBox` rarely share an aspect ratio —
	 * and the default `xMidYMid meet` then renders the chart at the *smaller*
	 * of the two scales and centres the slack. A wide card leaves it centred
	 * horizontally at natural size; a narrow one shrinks it and centres it
	 * vertically. Treating either as "x over 640 of the width" puts the tooltip
	 * beside the month it names.
	 *
	 * Measured on `pointerenter` and nowhere else, so a resize costs one stale
	 * frame and never an observer.
	 */
	function place(x: number, y: number): Omit<Hovered, 'index'> | null {
		const svg = svgRef.current;
		const box = boxRef.current;

		if (! svg || ! box) return null;

		const s = svg.getBoundingClientRect();
		const b = box.getBoundingClientRect();
		const scale = Math.min(s.width / layout.width, s.height / (height + 24));

		return {
			left: s.left - b.left + (s.width - layout.width * scale) / 2 + x * scale,
			top: s.top - b.top + (s.height - (height + 24) * scale) / 2 + y * scale,
			// Taken here rather than read off the ref at render time, so the
			// clamp below measures the box the pointer actually entered.
			width: b.width,
		};
	}

	return (
		<div ref={boxRef} class="relative">
			<svg
				ref={svgRef}
				viewBox={`0 0 ${layout.width} ${height + 24}`}
				width="100%"
				height={height + 24}
				fill="none"
				role="img"
				/* The whole series, because the tooltip is `aria-hidden` and this
				 * is where the twelve numbers have to be. `label` alone reads
				 * `Mar` in the middle of the range, so the month key is spelled
				 * out with its year — the same thing the tooltip shows, for the
				 * same reason. */
				aria-label={
					`${lead} over the last twelve months, ` +
					`${arrived.toLocaleString()} in that window. ` +
					series
						.map((p) => `${monthLabel(p.month, true)}, ${p.value.toLocaleString()}`)
						.join('. ') + '.'
				}
				onPointerLeave={() => setHovered(null)}
			>
				{/* The hovered column, washed **under** everything, so a month
				  * with no bar still shows which one the pointer is on. It is
				  * why the bars need no hover colour of their own: the column
				  * says where you are and the bar keeps one fill in every
				  * state. */}
				{hovered && bands[hovered.index] && (
					<rect
						aria-hidden="true" pointer-events="none"
						x={bands[hovered.index].left} y={layout.plot.y}
						width={bands[hovered.index].width} height={layout.plot.height}
						fill={theme.surfaceAlt}
					/>
				)}

				{ticks.map((t) => (
					<g key={t.value}>
						<line
							x1={layout.plot.x} y1={t.y}
							x2={layout.plot.x + layout.plot.width} y2={t.y}
							stroke={t.value === 0 ? theme.border : theme.divider}
							stroke-width="1"
						/>
						<text
							x={layout.plot.x - 8} y={t.y + 3}
							text-anchor="end" font-size="10" fill={theme.textFaint}
						>
							{t.value.toLocaleString()}
						</text>
					</g>
				))}

				{/* A month with nothing in it draws no bar at all, and the zero
				  * rule is what carries it: an empty column standing on a
				  * visible axis reads as zero, where a one-pixel stub would say
				  * a little of something happened. */}
				{layout.groups.map((g, i) => g.bars.map((bar) => (
					/* A positive finite height is the one condition, and it
					 * covers both degenerate cases at once: a month with nothing
					 * in it has a height of `0`, and a twelve months with
					 * nothing in them has a height of `NaN`, since the helper
					 * divides by a top tick of zero. Neither draws. */
					bar.height > 0 && (
						<rect
							key={series[i].month}
							x={bar.x} y={bar.y} width={bar.width} height={bar.height}
							rx={Math.min(3, bar.width / 2)}
							fill={theme.textStrong}
						/>
					)
				)))}

				{/* Five labels, not twelve: the axis reads `Sep 2025 · Dec · Mar ·
				  * Jun · Aug 2026` on the boards, and twelve months of text
				  * collides well before a 1440 column narrows. */}
				{layout.groups.map((g, i) => (
					(i % 3 === 0 || i === layout.groups.length - 1) && (
						<text
							key={`x${series[i].month}`}
							x={g.x} y={height + 16}
							text-anchor={i === 0 ? 'start' : i === layout.groups.length - 1 ? 'end' : 'middle'}
							font-size="10.5" fill={theme.textFaint}
						>
							{g.label}
						</text>
					)
				))}

				{/*
				  * A backdrop that clears, **under** the bands.
				  *
				  * `pointerleave` on the `<svg>` alone is not enough: the axis
				  * strip below the plot is inside the element, and so is the
				  * slack `xMidYMid meet` leaves when the card and the `viewBox`
				  * disagree about aspect — which on a narrow card is tens of
				  * pixels above and below the chart. Moving off a band into any
				  * of that would have left the last month's tooltip up until the
				  * pointer left the chart entirely.
				  *
				  * Siblings, not ancestors, so entering a band *leaves* this and
				  * entering this leaves the band. One state change either way,
				  * which is what a pair of `onPointerLeave`s on the bands could
				  * not give — leave and enter are separate dispatches, so that
				  * version renders a null between two months and flickers.
				  */}
				<rect
					x="0" y="0" width={layout.width} height={height + 24}
					fill="transparent"
					onPointerEnter={() => setHovered(null)}
				/>

				{bands.map((b, i) => (
					<rect
						key={series[i].month}
						x={b.left} y={layout.plot.y}
						width={b.width} height={layout.plot.height}
						fill="transparent"
						/* `pointerenter` rather than a single `pointermove`
						 * handler over the plot: it fires once per band the
						 * pointer crosses, so the measurement in `place` runs at
						 * most twelve times instead of once a frame. */
						onPointerEnter={() => {
							// Anchored to the top of the bar, so the box rides
							// the column it names. A month with nothing in it
							// anchors on the axis, which is where its bar would
							// have started.
							const bar = layout.groups[i]?.bars[0];
							const at = place(layout.groups[i].x, bar ? bar.y : floor);

							if (at) setHovered({ index: i, ...at });
						}}
					/>
				))}
			</svg>

			{hovered && series[hovered.index] && (
				<ChartTip
					label={monthLabel(series[hovered.index].month, true)}
					value={series[hovered.index].value}
					one={one}
					many={many}
					left={hovered.left}
					top={hovered.top}
					width={hovered.width}
				/>
			)}
		</div>
	);
}

/** Which month the pointer is over, and where that month sits in the card. */
type Hovered = { index: number; left: number; top: number; width: number };

/**
 * The chart's tooltip.
 *
 * **It is the rail's `Tip` with two lines in it**, and that is the whole of the
 * surface decision — the app already had a tooltip, and it already borrows the
 * drawer's darkest layer. The design doc asks for exactly that and gives the
 * reason: transient chrome takes the drawer map, so this stays a near-black box
 * with cream text in **both** themes rather than inverting into a cream card
 * sitting on a dark chart. It is the toast's argument, one component over.
 *
 * **It is `aria-hidden` and `pointer-events-none`.** The twelve values are in
 * the `<svg>`'s own label, so announcing them again here would read the series
 * twice; and a tooltip that can be hovered is a tooltip that can be chased off
 * the band that opened it.
 *
 * **No transition.** Twelve bands a pointer sweeps across would restart a fade
 * on each one, which turns a steady read into a flicker — and the box is not
 * appearing and disappearing so much as moving between months.
 */
function ChartTip({
	label, value, one, many, left, top, width,
}: {
	label: string;
	value: number;
	one: string;
	many: string;
	left: number;
	top: number;
	/** The card's inner width, for the clamp. */
	width: number;
}) {
	/*
	 * **Clamped against an assumed half-width, and the marker is what makes
	 * that honest.** Measuring the box would mean rendering it once to find out
	 * how wide it is and again to place it; `Live invites` at four digits is
	 * the widest this ever gets and it does not reach 130. When the clamp does
	 * bite, the tooltip stops sitting over its own dot — and the vertical rule
	 * and the marker are still on the month, which is the half of the answer
	 * that has to be exact.
	 */
	const HALF = 65;
	const x = width > HALF * 2 ? Math.min(Math.max(left, HALF), width - HALF) : left;
	/*
	 * Above the point, unless that would put the box outside the card — the
	 * threshold is its own height plus its gap.
	 *
	 * Defensive rather than routine: the series is cumulative, so the highest
	 * point is always the **last** one, and the last one is at the far right
	 * where the header is not. It fires if the plot ever starts nearer the top
	 * of the card than the box is tall.
	 */
	const below = top < 58;

	return (
		<div
			role="tooltip"
			aria-hidden="true"
			class="absolute z-30 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-drawer-well border border-drawer-line shadow-lg pointer-events-none"
			style={{
				left: `${x}px`,
				top: `${below ? top + 14 : top - 14}px`,
				transform: below
					? 'translateX(-50%)'
					: 'translateX(-50%) translateY(-100%)',
			}}
		>
			<span class="block text-[10.5px] uppercase tracking-[0.1em] text-on-dark-faint">
				{label}
			</span>
			<span class="block text-[13.5px] font-semibold tabular-nums text-on-dark">
				{value.toLocaleString()} {value === 1 ? one : many}
			</span>
		</div>
	);
}
