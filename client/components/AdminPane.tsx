import { ChevronLeft, History, Home, LayoutDashboard, Users } from 'lucide-preact';

import { useAdminSummary } from '../hooks/useAdminData';
import type { Theme } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_NAV_ROW, DRAWER_NAV_ROW_ON } from '../lib/controlStyles';

/**
 * Which section of the console is showing.
 *
 * `activity` is declared and its row is drawn disabled, because the fourth nav
 * row is a promise the design makes and hiding it would quietly unmake it. The
 * log is a later stage — it needs a table and a write from every administrative
 * mutation — and a row that says *soon* is more honest than three rows that
 * imply the console is finished.
 */
export type AdminSection = 'overview' | 'households' | 'people' | 'activity';

/**
 * Administration, pushed into the app drawer exactly as Members is.
 *
 * **There is no admin shell.** The console is the app with one more pane in it:
 * the same 36px back button on `drawer-raised`, the same Playfair 600 21
 * heading with its scope in the meta beneath, and the same account row still at
 * the foot. So the way out is the gesture the app already teaches, and collapse,
 * the rail and the account menu all come for free.
 *
 * What it replaces while it is open is the household switcher and the
 * Filter / Settings tabs — the same subtraction the Members pane makes, and for
 * the same reason. A switcher over a console that lists every household would
 * be asking which one you are *in* on a screen that is not about being in one.
 */
export function AdminPane({
	section, onSelect, onBack, theme,
}: {
	section: AdminSection;
	onSelect: (section: AdminSection) => void;
	onBack: () => void;
	theme: Theme;
}) {
	const d = theme.drawer;

	/*
	 * The scope line and the two nav counts, subscribed here rather than passed
	 * down — the one place a component below `Pantry` reads a query directly.
	 *
	 * It is a deliberate exception to *components take plain data*, and it is
	 * cheap for two reasons. This pane mounts only while the console is open, so
	 * an ordinary load opens no subscription at all. And `useQuery` is keyed by
	 * name and arguments, so the section on the right subscribing to the same
	 * summary shares this one — two readers, one query, one scan.
	 *
	 * The alternative was threading an `AdminSummaryState` from `Pantry` through
	 * `Drawer` to get here, which would have meant `Pantry` holding a
	 * console-shaped subscription open behind every pantry it ever draws.
	 */
	const summary = useAdminSummary();
	const households = summary.state === 'ready' ? summary.data.households : null;
	const people = summary.state === 'ready' ? summary.data.people : null;

	/*
	 * Overview and Activity carry no count on purpose — one is a summary and the
	 * other is a log, and a number on either would be a number nobody asked for.
	 */
	const rows = [
		{ key: 'overview' as const, label: 'Overview', Icon: LayoutDashboard, count: null },
		{ key: 'households' as const, label: 'Households', Icon: Home, count: households },
		{ key: 'people' as const, label: 'People', Icon: Users, count: people },
		{ key: 'activity' as const, label: 'Activity', Icon: History, count: null },
	];

	return (
		<div class="flex flex-col gap-[18px] px-5 pt-5 pb-6">
			<div class="flex items-center gap-3">
				<button
					onClick={onBack}
					class={`shrink-0 flex items-center justify-center w-9 h-9 rounded-[11px] ${DRAWER_CHIP}`}
					style={{ border: `1px solid ${d.line}` }}
					aria-label="Back to the pantry"
				>
					<ChevronLeft size={16} />
				</button>
				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="font-disp text-[21px] font-semibold leading-tight" style={{ color: d.ink }}>
						Administration
					</span>
					{/*
					  * The scope, not a subtitle. It is the one line that says how
					  * much this pane is looking at, and it is absent rather than
					  * zeroed while the summary is in flight — `0 households` is a
					  * claim, and it would be a wrong one for a moment on every load.
					  */}
					{households !== null && people !== null && (
						<span class="text-meta truncate" style={{ color: d.inkMeta }}>
							{plural(households, 'household')} · {plural(people, 'person', 'people')}
						</span>
					)}
				</span>
			</div>

			<div class="flex flex-col gap-2.5">
				<span
					class="px-1 text-[10.5px] font-bold uppercase tracking-[0.15em]"
					style={{ color: d.label }}
				>
					Manage
				</span>

				{/* One raised block at radius 13, rows at 10 inside it — the
				  * Settings pane's card geometry, holding nav instead of settings. */}
				<div class="flex flex-col gap-0.5 p-1.5 rounded-[13px]" style={{ background: d.raised }}>
					{rows.map(({ key, label, Icon, count }) => {
						const on = section === key;
						/*
						 * Every row is wired now. The flag stays because the next
						 * thing added to this block will want it, and because the
						 * rule it encodes is worth keeping written down: a section
						 * that does not exist **yet** is drawn, disabled and says
						 * so, which is deliberately the opposite of D30. That rule
						 * is about a permission you do not have, where a disabled
						 * control cannot explain itself and its absence is the
						 * honest answer; hiding a promised section would quietly
						 * unmake a promise this nav block makes.
						 */
						const soon = false;

						/*
						 * **The three resting colours are classes, not inline
						 * styles, and that is what makes the row respond at all.**
						 * They were `d.inkMuted` / `d.inkFaint` / `d.label` set
						 * inline — each byte-identical to the token beside it, and
						 * each beating a `hover:` rule, so `DRAWER_NAV_ROW`'s
						 * `hover:text-on-dark` never fired on any of the four
						 * rows. It is the mistake `PAGE_BUTTON_OUTLINE`'s own
						 * comment records, one surface over.
						 *
						 * The label goes muted → ink and the glyph and the count
						 * each move one step with it, on `group-hover` — the run
						 * segment's rule, where a tab's count follows its word
						 * rather than sitting still while everything around it
						 * brightens.
						 */
						return (
							<button
								key={key}
								onClick={() => { if (! soon) onSelect(key); }}
								disabled={soon}
								aria-current={on ? 'page' : undefined}
								class={
									'group flex items-center gap-3 h-[46px] px-3 rounded-[10px] text-left text-[15px] ' +
									(on
										? DRAWER_NAV_ROW_ON
										: soon
											? 'text-on-dark-muted opacity-45 cursor-default'
											: `text-on-dark-muted ${DRAWER_NAV_ROW}`)
								}
							>
								<Icon
									size={18}
									class={
										'shrink-0 ' +
										(on ? '' : 'text-on-dark-faint transition-colors group-hover:text-on-dark-muted')
									}
								/>
								<span class="flex-1 min-w-0 truncate">{label}</span>
								{soon ? (
									<span class="shrink-0 text-[11px] uppercase tracking-[0.12em] text-on-dark-label">
										Soon
									</span>
								) : count !== null ? (
									<span
										class={
											'shrink-0 text-[13px] tabular-nums ' +
											(on ? '' : 'text-on-dark-label transition-colors group-hover:text-on-dark-faint')
										}
										/* The selected row's fill is cream, so its
										 * count is a value on an inverted ground and
										 * has to be read off the light ramp by hand —
										 * the dark boards' own recorded failure. */
										style={on ? { color: '#6F6049' } : undefined}
									>
										{count.toLocaleString()}
									</span>
								) : null}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

/** `1 household` / `2 households`, with an explicit plural where -s will not do. */
function plural(n: number, one: string, many = `${one}s`): string {
	return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
