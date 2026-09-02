import { ArrowUpRight, ChevronRight } from 'lucide-preact';

import { AdminLoading } from './AdminLoading';
import { MonthBars } from './MonthBars';
import { useAdminSummary } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import { statusInk } from '../lib/theme';
import { ADMIN_ROW } from '../lib/controlStyles';
import { RECENT_DAYS, DORMANT_DAYS } from '../../shared/admin';
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

			{/* Both charts share the wide column and *Needs attention* keeps the
			  * rail. It is a short card — three rows at worst, usually one —
			  * so stacking the second chart under it would leave the rail with
			  * a gap the width of a third of the screen. It also groups the two
			  * shapes together against the one list of things to do. */}
			<div class="grid gap-6 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div class="flex flex-col gap-6 min-w-0">
					<div
						class="rounded-[20px] px-5 pt-[18px] pb-4"
						style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
					>
						<div class="flex items-baseline justify-between gap-3 mb-2">
							<h2
								class="font-disp text-[19px] font-semibold m-0"
								style={{ color: theme.textStrong }}
							>
								New households
							</h2>
							<span class="text-[13.5px]" style={{ color: theme.textMuted }}>
								last 12 months
							</span>
						</div>

						<MonthBars
							series={s.series}
							lead="New households per month"
							one="household" many="households"
							theme={theme}
						/>
					</div>
					<PantrySizes buckets={s.buckets} households={s.households} theme={theme} />
				</div>
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

/**
 * Households by how many items they hold — five bands, horizontal bars.
 *
 * **This is the adoption measure.** Overview counts households, people and
 * items, and none of those three says whether anybody is really using the app:
 * forty households averaging six items is a very different space from four
 * holding three hundred, and the four cards read identically in both. D67 was
 * built on the premise that twenty items is a sample dataset and a real pantry
 * is two hundred; this is the only thing in the console that reports whether
 * that wall was ever cleared.
 *
 * **No SVG, and that is the point of choosing this shape.** A horizontal bar is
 * a `<div>` with a width, so it inherits none of the line chart's apparatus —
 * no `viewBox`, no `preserveAspectRatio` scale to work out, no hit-test bands,
 * no tooltip. The number is printed at the end of its own row, where a hover
 * would have had to put it.
 *
 * **The bars scale to the largest band, not to the total.** Against the total,
 * a space whose households are mostly empty draws four bands as slivers and
 * says nothing about how they compare with each other; against the max, the
 * shape is legible at any distribution and the counts carry the absolute
 * figures. The card's meta line carries the denominator, since bars scaled to
 * the max no longer reveal it.
 *
 * **Every band is neutral, including `0`.** Amber in this console means *needs
 * attention* (D62), and the empty households are already saying exactly that in
 * amber a few pixels to the right, on the same screen, about the same rows.
 * Tinting one bar here would say it twice and turn a measurement into a verdict
 * — and a distribution is a shape you read, not a judgment.
 *
 * **The bands are not controls.** Only one of the five has a filter behind it
 * (`empty`, which *Needs attention* already routes to), so four would be dead —
 * and one pressable bar in five reads as broken rather than as selective.
 * Making them all work means four new `AdminHouseholdFilter` values and four
 * new chips on the household list, invented on the way past a chart.
 */
function PantrySizes({
	buckets, households, theme,
}: {
	buckets: AdminSummaryData['buckets'];
	households: number;
	theme: Theme;
}) {
	/*
	 * A distribution of nothing is five empty tracks, which reads as a broken
	 * card rather than as an empty one — so on a space with no households it is
	 * absent, and the four stat cards say `0` on its behalf. That differs from
	 * the line chart above it, deliberately: a flat line at zero is still a
	 * line and still says *nothing has happened in twelve months*.
	 */
	if (! households) return null;

	const most = Math.max(...buckets.map((b) => b.households), 0);

	return (
		<div
			class="rounded-[20px] px-5 pt-[18px] pb-5"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
			/*
			 * The whole distribution in one sentence, and the rows hidden behind
			 * it — the line chart's own rule, for the same reason. Each visible
			 * row is a range and a numeral with nothing between them, so read in
			 * sequence they are ten disconnected tokens rather than five facts.
			 */
			role="img"
			aria-label={
				`Households by pantry size, ${households.toLocaleString()} in total. ` +
				buckets
					.map((b) => (
						`${b.label} items: ${b.households.toLocaleString()} ` +
						`${b.households === 1 ? 'household' : 'households'}`
					))
					.join('. ') + '.'
			}
		>
			<div class="flex items-baseline justify-between gap-3 mb-[18px]">
				<h2 class="font-disp text-[19px] font-semibold m-0" style={{ color: theme.textStrong }}>
					Pantry sizes
				</h2>
				<span class="text-[13.5px]" style={{ color: theme.textMuted }}>
					{households.toLocaleString()} {households === 1 ? 'household' : 'households'}
				</span>
			</div>

			<div class="flex flex-col gap-3">
				{buckets.map((b) => (
					<div key={b.floor} class="flex items-center gap-3">
						{/* A fixed label column, so five tracks start on one
						  * line rather than stepping in and out with the width
						  * of `0` against `50–199`. */}
						<span
							class="shrink-0 w-[52px] text-right text-[12.5px] tabular-nums"
							style={{ color: theme.textMuted }}
						>
							{b.label}
						</span>

						{/* The track is always full width and always visible, so
						  * a band holding nothing reads as an empty band rather
						  * than as a missing row. A gap in the middle of a
						  * distribution is information. */}
						<span
							class="flex-1 min-w-0 h-2.5 rounded-full overflow-hidden"
							style={{ background: theme.surfaceAlt }}
						>
							<span
								class="block h-full rounded-full"
								style={{
									width: `${most ? (b.households / most) * 100 : 0}%`,
									background: theme.textStrong,
								}}
							/>
						</span>

						<b
							class="shrink-0 w-[46px] text-right text-[13.5px] font-semibold tabular-nums"
							style={{ color: theme.textStrong }}
						>
							{b.households.toLocaleString()}
						</b>
					</div>
				))}
			</div>

			<p class="m-0 mt-[15px] text-[12.5px]" style={{ color: theme.textMuted }}>
				Items held, per household.
			</p>
		</div>
	);
}
