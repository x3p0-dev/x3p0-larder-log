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
 * Board 1 — four cards, three charts, and what needs attention.
 *
 * **Storage is not one of the four.** The boards draw `2.4 GB`; a Zero handler
 * is given `{auth, content, db, env, gravatar, log, spam}` and there is no
 * storage handle on it in either direction, so there is no figure to read and
 * no later stage that adds one.
 *
 * ***Active* takes the fourth slot, and it used to be *Live invites*.** Every
 * other figure on this screen counts something that *exists*; a space of 115
 * households created and abandoned reads identically to 115 used weekly. Live
 * invites was a small piece of state nobody acts on, and swapping it dropped a
 * whole table scan as well as a weak card. *Shopping trips* and *Sharing* are
 * the same correction in chart form — the first counts somebody standing in a
 * kitchen finishing a run, the second is the only figure here that does not
 * rise when one person makes five pantries.
 *
 * **The deltas say *new*, not `+`.** They count what arrived in the window and
 * cannot count what left. `deletions` (D71) records departures now, but as
 * space-wide rows with no household on them, so it can say *how many left* and
 * never *which of these did* — a net figure per card is still not available.
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
					label="Active"
					value={s.active}
					/* No delta, because this figure *is* a window — *N new in the
					 * last 30 days* beside a number that already means the last
					 * 30 days would be measuring the same span twice. The note
					 * says what the numeral counts instead. */
					note={`Touched in the last ${RECENT_DAYS} days`}
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
					{/* Under *New households* rather than beside it: the two are
					  * the same shape asking opposite questions — how many
					  * arrived, and how many of them came back — and stacking
					  * them puts one twelve-month axis directly above another. */}
					<div
						class="rounded-[20px] px-5 pt-[18px] pb-4"
						style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
					>
						<div class="flex items-baseline justify-between gap-3 mb-2">
							<h2
								class="font-disp text-[19px] font-semibold m-0"
								style={{ color: theme.textStrong }}
							>
								Shopping trips
							</h2>
							<span class="text-[13.5px]" style={{ color: theme.textMuted }}>
								last 12 months
							</span>
						</div>

						<MonthBars
							series={s.trips}
							lead="Completed shopping trips per month"
							one="trip" many="trips"
							theme={theme}
						/>

						{/* Stated on the card's own face, the way the deletion
						  * entry's denormalised counts are. A restock row dies
						  * with its item (D64), so a past month falls as things
						  * are removed — the bars are a floor, not a history. */}
						<p class="m-0 mt-3 text-[12.5px] leading-snug" style={{ color: theme.textMuted }}>
							A trip is one put-away, however many items it held. Past months can fall as
							items are removed.
						</p>
					</div>

					<PantrySizes buckets={s.buckets} households={s.households} theme={theme} />
				</div>

				<div class="flex flex-col gap-6 min-w-0">
					<NeedsAttention data={s} onSelect={onNeedsAttention} theme={theme} dark={dark} />
					<Sharing solo={s.solo} shared={s.shared} theme={theme} />
				</div>
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
 * A distribution of households, as labelled tracks.
 *
 * **One component, two questions.** *Pantry sizes* asks how full households are
 * and *Sharing* asks how many people are in them; they are the same shape, and
 * drawing the bars twice would be two places to keep a rounding, a track colour
 * and an `aria-label` in step. `MonthBars` already made this trade for the two
 * twelve-month series.
 *
 * **The whole distribution goes in one `aria-label` and the rows are hidden**,
 * the line chart's own rule: each visible row is a label and a numeral with
 * nothing between them, so read in sequence they are disconnected tokens rather
 * than facts.
 */
function Distribution({
	title, rows, total, noun, labelWidth, caption, theme,
}: {
	title: string;
	rows: { key: string; label: string; count: number; describe: string }[];
	total: number;
	noun: string;
	/** The label column is fixed so the tracks start on one line rather than stepping in and out with the width of `0` against `50–199`. */
	labelWidth: number;
	caption: string;
	theme: Theme;
}) {
	/*
	 * A distribution of nothing is a set of empty tracks, which reads as a
	 * broken card rather than as an empty one — so on a space with no households
	 * it is absent, and the stat cards say `0` on its behalf. That differs from
	 * the month charts deliberately: a flat line at zero is still a line, and
	 * still says *nothing has happened in twelve months*.
	 */
	if (! total) return null;

	const most = Math.max(...rows.map((r) => r.count), 0);

	return (
		<div
			class="rounded-[20px] px-5 pt-[18px] pb-5"
			style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
			role="img"
			aria-label={
				`${title}, ${total.toLocaleString()} ${total === 1 ? noun : noun + 's'} in total. ` +
				rows.map((r) => `${r.describe}: ${r.count.toLocaleString()}`).join('. ') + '.'
			}
		>
			<div class="flex items-baseline justify-between gap-3 mb-[18px]">
				<h2 class="font-disp text-[19px] font-semibold m-0" style={{ color: theme.textStrong }}>
					{title}
				</h2>
				<span class="text-[13.5px]" style={{ color: theme.textMuted }}>
					{total.toLocaleString()} {total === 1 ? noun : `${noun}s`}
				</span>
			</div>

			<div class="flex flex-col gap-3">
				{rows.map((r) => (
					<div key={r.key} class="flex items-center gap-3">
						<span
							class="shrink-0 text-right text-[12.5px] tabular-nums"
							style={{ color: theme.textMuted, width: `${labelWidth}px` }}
						>
							{r.label}
						</span>

						{/* The track is always full width and always visible, so a
						  * band holding nothing reads as an empty band rather than
						  * as a missing row. A gap in a distribution is
						  * information. */}
						<span
							class="flex-1 min-w-0 h-2.5 rounded-full overflow-hidden"
							style={{ background: theme.surfaceAlt }}
						>
							<span
								class="block h-full rounded-full"
								style={{
									width: `${most ? (r.count / most) * 100 : 0}%`,
									background: theme.textStrong,
								}}
							/>
						</span>

						<b
							class="shrink-0 w-[46px] text-right text-[13.5px] font-semibold tabular-nums"
							style={{ color: theme.textStrong }}
						>
							{r.count.toLocaleString()}
						</b>
					</div>
				))}
			</div>

			<p class="m-0 mt-[15px] text-[12.5px]" style={{ color: theme.textMuted }}>
				{caption}
			</p>
		</div>
	);
}

/** Households by how many items they hold, in D69's five bands. */
function PantrySizes({
	buckets, households, theme,
}: {
	buckets: AdminSummaryData['buckets'];
	households: number;
	theme: Theme;
}) {
	return (
		<Distribution
			title="Pantry sizes"
			total={households}
			noun="household"
			labelWidth={52}
			caption="Items held, per household."
			rows={buckets.map((b) => ({
				key: String(b.floor),
				label: b.label,
				count: b.households,
				describe: `${b.label} items`,
			}))}
			theme={theme}
		/>
	);
}

/**
 * Whether the sharing this app was built around is actually used.
 *
 * **Households, people and items all rise when one person makes five pantries.**
 * This is the only figure on Overview that does not — and it is the measure of
 * two features, D33's several-households-per-person and D66's shared claims,
 * neither of which has ever been able to report whether it landed.
 *
 * A wider label column than *Pantry sizes*: these are words rather than ranges.
 */
function Sharing({
	solo, shared, theme,
}: {
	solo: number;
	shared: number;
	theme: Theme;
}) {
	return (
		<Distribution
			title="Sharing"
			total={solo + shared}
			noun="household"
			labelWidth={66}
			caption="Households with more than one member."
			rows={[
				// Counts of people, phrased as the bands above are — *On their
				// own* is warmer and measures 12 characters against a 66px
				// column beside a 172px track, which is a wrap waiting for a
				// narrower rail.
				{ key: 'shared', label: '2 or more', count: shared, describe: 'Shared with somebody' },
				{ key: 'solo', label: 'Just one', count: solo, describe: 'One person only' },
			]}
			theme={theme}
		/>
	);
}
