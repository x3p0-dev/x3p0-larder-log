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
 * **`All` carries no glyph**, because it is the absence of a choice rather than
 * a member of the set. That is the drawer's `All items` chip's argument,
 * reused.
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
export function RunSegment({ bands, total, tab, onPick, theme }: {
	bands: RunBand[];
	/** Distinct items across every band — what `All` counts. */
	total: number;
	tab: RunTab;
	onPick: (tab: RunTab) => void;
	theme: Theme;
}) {
	return (
		<div
			role="tablist"
			aria-label="Run list"
			class="inline-flex items-center gap-[3px] h-10 p-[3px] rounded-[13px] shrink-0"
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<Tab on={tab === 'all'} count={total} onPick={() => onPick('all')} theme={theme}>All</Tab>

			{bands.map((band) => {
				const Icon = BAND_ICONS[band.kind];

				return (
					<Tab
						key={band.kind}
						on={tab === band.kind}
						count={band.count}
						onPick={() => onPick(band.kind)}
						theme={theme}
					>
						<Icon size={15} strokeWidth={1.7} class="shrink-0" />
						{LABELS[band.kind]}
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
 */
function Tab({ on, count, onPick, theme, children }: {
	on: boolean;
	count: number;
	onPick: () => void;
	theme: Theme;
	children: preact.ComponentChildren;
}) {
	return (
		<button
			role="tab"
			aria-selected={on}
			onClick={onPick}
			class={
				'inline-flex items-center gap-[7px] h-8 px-[13px] rounded-[10px] text-[13.5px] whitespace-nowrap ' +
				`transition-colors active:translate-y-px ${PAGE_FOCUS} ` +
				(on ? 'font-semibold' : 'font-medium')
			}
			style={on
				? { background: theme.surface, border: `1px solid ${theme.borderStrong}`, color: theme.textStrong }
				// The inactive tabs sit on the track with no box of their own, so
				// they need the 1px the active one spends on its border back — or
				// picking a tab would shift every label beside it by a pixel.
				: { border: '1px solid transparent', color: theme.text }}
		>
			{children}
			<span class="text-[12.5px]" style={{ color: on ? theme.textStrong : theme.textMuted }}>
				{count}
			</span>
		</button>
	);
}
