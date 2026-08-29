import { useId, useState } from 'preact/hooks';

import { DialogButtons, ModalShell } from './ModalShell';
import { HouseholdIdentity } from './HouseholdIdentity';
import { HouseholdTile } from './HouseholdTile';
import { SourceMixRows } from './SourceMixRows';
import type { Theme } from '../lib/theme';
import { proposeColor } from '../lib/theme';
import type { SourceMix } from '../../shared/seed';
import { DEFAULT_SOURCE_MIX } from '../../shared/seed';

/**
 * *New household*, from the switcher and from the rail's household flyout.
 *
 * It is the confirm shell with a form in it (D42) — 420px, radius 18, ghost
 * plus the ink/cream primary right-aligned, Escape and scrim both cancel. It
 * replaced an inline form that grew inside the switcher popover, which could
 * not hold a colour picker without pushing the household list off the bottom of
 * a 264px flyout.
 *
 * **Its header tile is the live preview**, so it needs no separate preview row
 * the way the Settings panel does: the thing being named is already at the top
 * of the card you are typing into.
 *
 * **It asks first run's question too** (D61), which the design doc does not
 * draw — the board is the first-run card. It goes here because the two are one
 * screen with two frames around it: the second household somebody makes is as
 * likely to be the one with the garden as the first, and asking on only one of
 * them would leave the other seeding three shops and pointing at a kind menu
 * two levels into a drawer. The dialog grows by three rows and a line, which is
 * what the 420px card has the room for.
 */
export function NewHouseholdDialog({ open, taken, onCreate, onCancel, dark, theme }: {
	open: boolean;
	/** The colours already in use, so the default can be one that is not. */
	taken: readonly string[];
	/** Resolves to the new household's id, or null when the server refused. */
	onCreate: (name: string, ink: string, sources: SourceMix) => Promise<string | null>;
	onCancel: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const [name, setName] = useState('');
	/*
	 * The first colour unused across the households you are in, walking the
	 * sixteen in order. Nobody has to decide something they have no opinion
	 * about, and two of your own households never land on the same colour by
	 * default — though nothing stops you choosing one that has.
	 */
	const [ink, setInk] = useState(() => proposeColor(taken));
	const [sources, setSources] = useState<SourceMix>(DEFAULT_SOURCE_MIX);
	const [busy, setBusy] = useState(false);

	const titleId = useId();
	const bodyId = useId();

	const armed = ! busy && name.trim().length > 0;

	async function create() {
		if (! armed) return;

		setBusy(true);
		const id = await onCreate(name.trim(), ink, sources);
		setBusy(false);

		// A refusal is already in the error banner. Keep the card and the typing.
		if (! id) return;

		onCancel();
	}

	/** Re-armed on every open: the dialog outlives one use of it. */
	function focusFirst() {
		setName('');
		setInk(proposeColor(taken));
		setSources(DEFAULT_SOURCE_MIX);
		document.getElementById(`${titleId}-name`)?.focus();
	}

	return (
		<ModalShell
			open={open}
			labelledBy={titleId}
			describedBy={bodyId}
			onCancel={onCancel}
			initialFocus={focusFirst}
			dark={dark}
			theme={theme}
		>
			<div class="flex items-center gap-3">
				<HouseholdTile ink={ink} name={name} size={40} dark={dark} />
				<span class="flex flex-col gap-px min-w-0">
					<span id={titleId} class="font-disp text-[21px] font-semibold leading-[1.15]" style={{ color: theme.textStrong }}>
						New household
					</span>
					<span id={bodyId} class="text-[13px]" style={{ color: theme.textMuted }}>
						You will be its owner.
					</span>
				</span>
			</div>

			<span class="block text-label font-bold uppercase tracking-[0.15em] mt-[18px] mb-[9px]" style={{ color: theme.textMuted }}>
				Household name and color
			</span>

			<HouseholdIdentity
				name={name}
				ink={ink}
				onName={setName}
				onInk={setInk}
				onSubmit={() => void create()}
				fieldHeight={44}
				fieldLine={theme.textFaint}
				fieldId={`${titleId}-name`}
				theme={theme}
			/>

			<SourceMixRows value={sources} onChange={setSources} theme={theme} />

			<DialogButtons
				onCancel={onCancel}
				onConfirm={() => void create()}
				confirmLabel={busy ? 'Creating…' : 'Create household'}
				armed={armed}
				dark={dark}
				theme={theme}
			/>
		</ModalShell>
	);
}
