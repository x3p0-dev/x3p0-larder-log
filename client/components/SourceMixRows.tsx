import type { ComponentChildren } from 'preact';

import type { Theme } from '../lib/theme';
import { CheckBox } from './CheckBox';
import { SOURCE_KIND_ICONS } from './SourceKindMenu';
import { CARD_CHECKBOX_ROW } from '../lib/controlStyles';
import type { SourceKind } from '../../shared/source';
import type { SourceMix } from '../../shared/seed';
import { SEED_GROW, SEED_MAKE } from '../../shared/seed';

/**
 * *Where your food comes from* — the one question a new household is asked
 * (D61).
 *
 * Three ticks under the name field on both creation surfaces: the first-run
 * card and the *New household* dialog. What they seed is
 * `seedSourcesFor` in `shared/seed.ts`, which the server calls — nothing here
 * decides anything, it only collects the answer.
 *
 * **It looks like it breaks first run's own rule — *one field, one button,
 * nothing else* — and does not.** That rule was written against a *preview*: a
 * recessed panel showing fifteen seeded chips, explaining what a household is
 * to somebody who had not made one yet. It went because the drawer explains
 * itself a second later and better. This is a **question**, not an
 * explanation, and it asks the one thing the app cannot infer and would
 * otherwise never ask — the answer changes what gets *written*, not what gets
 * shown.
 *
 * **The test it has to pass is that Enter still finishes the screen**, and it
 * does: buy on with grow and make off is exactly the household you would have
 * got before the question existed. Someone who ignores all three rows loses
 * nothing. Someone who reads them skips a trip into a drawer they do not yet
 * know is there, to find a kind menu they do not yet know exists.
 *
 * **Nothing is required and nothing is disabled.** Untick all three and the
 * card's primary stays live — you get the locations and types and no sources at
 * all, which is not a dead end the way no locations would be: `itemStores` is a
 * join table, so an item can name none. A disabled button could not explain
 * itself here any more than the editing row's trash could (D36).
 *
 * A **second step** was drawn and lost — `NEW HOUSEHOLD · STEP 2 OF 2`, *How do
 * you stock it?* It reads better, because a question with its own screen gets a
 * title, a subtitle and all the room it wants. It costs *one screen, not a
 * wizard*: it has to grow a *Back* and a step count, and the moment there are
 * two steps there is an argument for a third.
 */

type Row = {
	key: keyof SourceMix;
	kind: SourceKind;
	label: string;
	description: string;
};

/*
 * In band order — shop, grow, make — which is the run list's order and the
 * order `seedSourcesFor` returns. The glyph beside each label is the run list's
 * own, so this is the **fourth** place the sprout and the pot are taught (band
 * headers, segment tabs and the drawer's kind menu are the others) before an
 * item card ever draws one.
 */
const ROWS: Row[] = [
	{
		key: 'buy',
		kind: 'shop',
		label: 'We buy it',
		description: 'Groceries, the warehouse, the farm stand.',
	},
	{
		key: 'grow',
		kind: 'grow',
		label: 'We grow some of it',
		description: 'A garden, a plot, a few pots on the step.',
	},
	{
		key: 'make',
		kind: 'make',
		label: 'We make some of it',
		description: 'Stock, bread, jam — things you’d otherwise buy.',
	},
];

export function SourceMixRows({ value, onChange, theme }: {
	value: SourceMix;
	onChange: (next: SourceMix) => void;
	theme: Theme;
}) {
	return (
		<>
			<span class="block h-px mt-5" style={{ background: theme.divider }} />

			<span
				class="block text-label font-bold uppercase tracking-[0.15em] mt-5 mb-[9px]"
				style={{ color: theme.textMuted }}
			>
				Where your food comes from
			</span>

			{ROWS.map((row) => {
				const on = value[row.key];
				const Glyph = SOURCE_KIND_ICONS[row.kind];

				return (
					<button
						key={row.key}
						type="button"
						role="checkbox"
						aria-checked={on}
						onClick={() => onChange({ ...value, [row.key]: ! on })}
						class={`flex items-start gap-3 -mx-2 px-2 py-[9px] ${CARD_CHECKBOX_ROW}`}
					>
						<span class="pt-px shrink-0"><CheckBox checked={on} theme={theme} /></span>

						<span class="min-w-0">
							{/*
							  * The label carries the weight of its own answer — 600 on
							  * `textStrong` when ticked, 500 on `text` when not. It is
							  * the only thing on the card that does, and it is what
							  * lets the block be read at a glance rather than by
							  * inspecting three 22px boxes.
							  */}
							<span
								class="flex items-center gap-2 text-[15px]"
								style={on
									? { color: theme.textStrong, fontWeight: 600 }
									: { color: theme.text, fontWeight: 500 }}
							>
								<Glyph size={15} strokeWidth={1.7} class="shrink-0" style={{ color: theme.textMuted }} aria-hidden="true" />
								{row.label}
							</span>

							<span class="block text-[13px] leading-[1.5] pt-[3px]" style={{ color: theme.textMuted }}>
								{row.description}
							</span>
						</span>
					</button>
				);
			})}

			<p class="text-[12.5px] leading-[1.55] mt-2" style={{ color: theme.textMuted }}>
				<HintFor mix={value} theme={theme} />
			</p>
		</>
	);
}

/**
 * The one line that answers back, and the only thing on the block that moves.
 *
 * Four states rather than the three the design's table names: it also has to
 * answer *nothing ticked*, which the table treats as an aside and which is a
 * real answer here. The two branches that name a source name it in **bold**,
 * because the word is about to become a chip the household will look for.
 */
function HintFor({ mix, theme }: { mix: SourceMix; theme: Theme }) {
	const named = (name: string) => (
		<b style={{ color: theme.textStrong, fontWeight: 600 }}>{name}</b>
	);

	let body: ComponentChildren;

	if (! mix.buy && ! mix.grow && ! mix.make) {
		body = 'You’ll get your locations and types, and no sources at all. You can add one any time.';
	} else if (! mix.grow && ! mix.make) {
		body = 'Most larders are stocked at a shop, so that is all we will set up. Tick anything else and you get a source for it.';
	} else if (mix.grow && mix.make) {
		body = (
			<>
				We will add {named(SEED_GROW.name)} and {named(SEED_MAKE.name)} to your
				sources. Rename them to whatever you call yours.
			</>
		);
	} else {
		body = (
			<>
				We will add {named(mix.grow ? SEED_GROW.name : SEED_MAKE.name)} to your
				sources. Rename it to whatever you call yours.
			</>
		);
	}

	return <>{body}</>;
}
