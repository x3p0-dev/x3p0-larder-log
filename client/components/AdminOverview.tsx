import { useRef, useState } from 'preact/hooks';
import { lineChartLayout } from '@spacefast/zero/charts';
import { ArrowUpRight, ChevronRight } from 'lucide-preact';

import { AdminLoading } from './AdminLoading';
import { useAdminSummary } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import { ADMIN_ROW } from '../lib/controlStyles';
import { RECENT_DAYS, DORMANT_DAYS, monthLabel } from '../../shared/admin';
import type { AdminHouseholdFilter, AdminSummaryData } from '../../shared/types';

/**
 * Board 1 — four cards, twelve months, and what needs attention.
 *
 * **Storage is not one of the four.** The boards draw `2.4 GB`; a Zero handler
 * is given `{auth, content, db, env, gravatar, log, spam}` and there is no
 * storage handle on it in either direction, so there is no figure to read and
 * no later stage that adds one. *Live invites* takes the fourth slot — real,
 * administrative, and it keeps the row four across rather than leaving a gap
 * that reads as a bug.
 *
 * **The deltas say *new*, not `+`.** They count what arrived in the window and
 * cannot count what left, because nothing records a deletion until the Activity
 * log exists. `+34` would be a claim about the net; `34 new` is what is true.
 */
export function AdminOverview({
	onNeedsAttention, theme, dark,
}: {
	/** A *Needs attention* row goes to the list, already filtered. */
	onNeedsAttention: (filter: AdminHouseholdFilter) => void;
	theme: Theme;
	dark: boolean;
}) {
	const summary = useAdminSummary();

	if (summary.state !== 'ready') {
		/* Denied paints nothing at all: every console query re-checks the
		 * flag server-side, and a screen that explained the refusal would
		 * be the 403 the app decided against showing anybody. */
		return summary.state === 'denied' ? null : <AdminLoading theme={theme} />;
	}

	const s = summary.data;

	return (
		<div class="flex flex-col gap-[22px]">
			<div class="grid gap-5 grid-cols-2 xl:grid-cols-4">
				<StatCard label="Households" value={s.households} delta={s.newHouseholds} theme={theme} />
				<StatCard label="People" value={s.people} delta={s.newPeople} theme={theme} />
				<StatCard label="Items tracked" value={s.items} delta={s.newItems} theme={theme} />
				<StatCard
					label="Live invites"
					value={s.invites}
					/* No delta: an invite that expired did not go anywhere, it just
					 * stopped counting, so *N new* would be measuring the wrong
					 * edge of a number that falls on its own. */
					note="Neither revoked nor expired"
					theme={theme}
				/>
			</div>

			<div class="grid gap-6 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
				<HouseholdChart series={s.series} theme={theme} />
				<NeedsAttention data={s} onSelect={onNeedsAttention} theme={theme} dark={dark} />
			</div>
		</div>
	);
}

/**
 * One stat card. The numeral is the point, so it takes the display face.
 *
 * `toLocaleString` rather than the platform's `formatCompactValue`: `38.2K`
 * saves eleven pixels and loses the count. This app has never abbreviated a
 * number anywhere, and an administrator reading *Items tracked* wants the item
 * count and not a rounding of it.
 */
function StatCard({
	label, value, delta, note, theme,
}: {
	label: string;
	value: number;
	delta?: number;
	note?: string;
	theme: Theme;
}) {
	return (
		<div
			class="rounded-[18px] px-[18px] pt-4 pb-[15px]"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
		>
			<div class="text-sm" style={{ color: theme.textMuted }}>{label}</div>
			<div
				class="font-disp font-bold text-[34px] leading-[1.15] my-[5px] tabular-nums"
				style={{ color: theme.textStrong }}
			>
				{value.toLocaleString()}
			</div>
			<div class="flex items-center gap-[5px] text-[12.5px]" style={{ color: theme.textMuted }}>
				{note ? note : (
					<>
						{/* The arrow is absent at zero rather than pointing at
						  * nothing — an up arrow beside *0 new* reads as a rise. */}
						{(delta ?? 0) > 0 && (
							<ArrowUpRight size={12} strokeWidth={2.2} style={{ color: theme.textStrong }} />
						)}
						<b class="font-semibold" style={{ color: theme.textStrong }}>
							{(delta ?? 0).toLocaleString()} new
						</b>
						<span>· last {RECENT_DAYS} days</span>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * Households over twelve months, cumulative.
 *
 * The geometry comes from `@spacefast/zero/charts` — a platform module, so it
 * costs nothing against the client bundle — and every colour is overridden,
 * because `lineChartLayout` hands back its own categorical palette and the slot
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
 * between the stat cards and *Needs attention*. So the label carries the whole
 * series and the tooltip is `aria-hidden`: it says nothing a screen reader is
 * not already told.
 */
function HouseholdChart({
	series, theme,
}: {
	series: AdminSummaryData['series'];
	theme: Theme;
}) {
	const height = 200;
	const boxRef = useRef<HTMLDivElement | null>(null);
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [hovered, setHovered] = useState<Hovered | null>(null);
	const layout = lineChartLayout({
		data: series.map((p) => ({ label: p.label, households: p.value })),
		x: 'label',
		series: ['households'],
		height,
	});
	const line = layout.series[0];
	const points = line?.points ?? [];
	const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
	const floor = layout.plot.y + layout.plot.height;
	// The area is the line closed down to the axis. Drawn under the stroke so
	// the stroke keeps its full weight where the two meet.
	const area = points.length
		? `${path} L${points[points.length - 1].x} ${floor} L${points[0].x} ${floor} Z`
		: '';
	const latest = series[series.length - 1];

	/*
	 * **A band, not a dot.** The points are ~50 viewBox units apart and the
	 * marker is 4 across, so hit-testing the dot would mean aiming at the one
	 * part of the chart that moves as the data does. Each band runs from the
	 * midpoint behind its point to the midpoint ahead of it, full plot height,
	 * and the two on the ends run out to the plot's own edges — the whole
	 * plot is covered and there is no gap between months where nothing happens.
	 *
	 * It is the rule the whole row is the checkbox already states, applied to
	 * a chart.
	 */
	const bands = points.map((p, i) => {
		const before = points[i - 1];
		const after = points[i + 1];
		const left = before ? (before.x + p.x) / 2 : layout.plot.x;
		const right = after ? (p.x + after.x) / 2 : layout.plot.x + layout.plot.width;

		return { left, width: Math.max(0, right - left) };
	});

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
			// clamp and the position come from one measurement of one moment.
			width: b.width,
		};
	}

	return (
		<div
			ref={boxRef}
			class="relative rounded-[20px] px-5 pt-[18px] pb-3.5"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
		>
			<div class="flex items-baseline gap-2.5 mb-1.5">
				<h2 class="font-disp text-[19px] font-semibold m-0" style={{ color: theme.textStrong }}>
					Households
				</h2>
				<span class="text-[13.5px]" style={{ color: theme.textMuted }}>last 12 months</span>
			</div>

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
					`Households over the last twelve months, ending at ` +
					`${latest ? latest.value.toLocaleString() : 0}. ` +
					series
						.map((p) => `${monthLabel(p.month, true)}, ${p.value.toLocaleString()}`)
						.join('. ') + '.'
				}
				onPointerLeave={() => setHovered(null)}
			>
				{layout.ticks.map((t) => (
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

				{area && <path d={area} fill={theme.surfaceAlt} />}
				{path && (
					<path d={path} stroke={theme.textStrong} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
				)}

				{/* Five labels, not twelve: the axis reads `Sep 2025 · Dec · Mar ·
				  * Jun · Aug 2026` on the boards, and twelve months of text
				  * collides well before a 1440 column narrows. */}
				{layout.xLabels.map((l, i) => (
					(i % 3 === 0 || i === layout.xLabels.length - 1) && (
						<text
							key={l.text + i}
							x={l.x} y={height + 16}
							text-anchor={i === 0 ? 'start' : i === layout.xLabels.length - 1 ? 'end' : 'middle'}
							font-size="10.5" fill={theme.textFaint}
						>
							{l.text}
						</text>
					)
				))}

				{/*
				  * The rule and the dot, drawn **before** the bands so the bands
				  * stay the only thing the pointer can reach.
				  *
				  * They are why the tooltip is allowed to be clamped away from
				  * its month near the card's edges: the box says what the value
				  * is and these two say which month it belongs to, so the one
				  * that cannot always point is not the one carrying the answer.
				  */}
				{hovered && points[hovered.index] && (
					<g aria-hidden="true" pointer-events="none">
						<line
							x1={points[hovered.index].x} y1={layout.plot.y}
							x2={points[hovered.index].x} y2={floor}
							stroke={theme.border} stroke-width="1"
						/>
						{/* A ring in the card's own fill, so the dot reads against
						  * the area under it rather than dissolving into it. */}
						<circle
							cx={points[hovered.index].x} cy={points[hovered.index].y}
							r="4.5" fill={theme.textStrong}
							stroke={theme.surface} stroke-width="2"
						/>
					</g>
				)}

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
							const at = place(points[i].x, points[i].y);

							if (at) setHovered({ index: i, ...at });
						}}
					/>
				))}
			</svg>

			{hovered && series[hovered.index] && (
				<ChartTip
					label={monthLabel(series[hovered.index].month, true)}
					value={series[hovered.index].value}
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
	label, value, left, top, width,
}: {
	label: string;
	value: number;
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
				{value.toLocaleString()} {value === 1 ? 'household' : 'households'}
			</span>
		</div>
	);
}

/**
 * What needs attention, and nothing else.
 *
 * Each row is a link into the household list with its chip already on, which is
 * what the board's chevron promises. A row is **absent when its count is zero**
 * rather than reading `0 households have no owner` — this is a list of things
 * to do, and an empty one has a sentence of its own.
 *
 * The amber is `statusInk('low')`, the same value the boards hard-code as
 * `#C4901F`. That is not the rule the 404 disc follows, and the two are
 * different questions: the disc refuses a status colour because *nothing is
 * wrong* on that screen, while these rows exist precisely to say something is.
 * Dormancy stays neutral — it is a fact about a household, not a fault in one.
 */
function NeedsAttention({
	data, onSelect, theme, dark,
}: {
	data: AdminSummaryData;
	onSelect: (filter: AdminHouseholdFilter) => void;
	theme: Theme;
	dark: boolean;
}) {
	type Row = { key: AdminHouseholdFilter; n: number; noun: string; tail: string; dot: string };

	const rows: Row[] = ([
		{
			key: 'no-owner', n: data.noOwner, noun: 'household', tail: 'with no owner',
			dot: statusInk('low', dark),
		},
		{
			key: 'dormant', n: data.dormant, noun: 'household',
			tail: `dormant over ${DORMANT_DAYS} days`, dot: theme.textFaint,
		},
		{
			key: 'empty', n: data.empty, noun: 'household', tail: 'holding nothing',
			dot: theme.textFaint,
		},
	] as Row[]).filter((r) => r.n > 0);

	return (
		<div
			class="rounded-[20px] overflow-hidden"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
		>
			<h2
				class="font-disp text-[19px] font-semibold m-0 px-5 pt-[18px] pb-3.5"
				style={{ color: theme.textStrong }}
			>
				Needs attention
			</h2>

			{rows.map((r) => (
				<button
					key={r.key}
					onClick={() => onSelect(r.key)}
					class={`flex items-center gap-[11px] w-full px-5 py-[15px] text-left ${ADMIN_ROW}`}
					style={{ borderTop: `1px solid ${theme.divider}` }}
				>
					<span class="shrink-0 w-2 h-2 rounded-full" style={{ background: r.dot }} />
					<span class="flex-1 min-w-0 text-[14.5px]" style={{ color: theme.text }}>
						<b class="font-semibold" style={{ color: theme.textStrong }}>
							{r.n.toLocaleString()} {r.n === 1 ? r.noun : `${r.noun}s`}
						</b>{' '}
						{r.tail}
					</span>
					<ChevronRight size={15} class="shrink-0" style={{ color: theme.textFaint }} />
				</button>
			))}

			<div
				class="px-5 py-[15px] text-sm"
				style={{ borderTop: `1px solid ${theme.divider}`, background: theme.surfaceAlt, color: theme.textMuted }}
			>
				{rows.length ? 'Nothing else needs you.' : 'Nothing needs you.'}
			</div>
		</div>
	);
}
