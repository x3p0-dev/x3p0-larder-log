import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { MoreVertical, Share, X } from 'lucide-preact';

import { useInstall } from '../hooks/useInstall';
import type { InstallMode } from '../lib/install';
import { isHandheld } from '../lib/install';
import type { Theme } from '../lib/theme';
import { DRAWER_PANEL_X, DRAWER_PRIMARY_ON_CARD } from '../lib/controlStyles';

/**
 * The close, which is the applied chip's exit unchanged. The drop-in is 180ms
 * and lives in the class literal — Tailwind resolves a duration by scanning for
 * a static string, so it cannot be interpolated from here.
 */
const CLOSE_MS = 140;

/**
 * The strongest border in the dark palette, and the only one that reads on the
 * drawer's raised fill.
 *
 * The inline composer's panel is a recessed fill on a 1px inset hairline, and
 * on this surface that hairline is `#3B3126` on `#332B22` — **1.10:1**, which
 * is no edge at all; the fill alone is 1.31:1. `#6E5F4B` takes it to 2.25:1
 * read from outside and 2.94:1 from inside. It is what `Toast` already leans on
 * for exactly this reason, and there is nothing lighter in the ramp to invent.
 *
 * **The invite composer and the Filter tab's term composer have the same bug**
 * and are deliberately not touched here — one row should not quietly restyle
 * three components. It is one line whenever those boards are next re-rendered.
 */
const PANEL_EDGE = '#6E5F4B';

/** A run of a step's sentence. An object is the emphasised half. */
type Run = string | { b: string };

type Step = {
	/**
	 * Drawn **beside** the words, never instead of them. An icon nobody has been
	 * taught is not an instruction, and these are the only things in the app
	 * borrowed from another vendor's interface. `aria-hidden`, because the
	 * sentence already says what to look for.
	 */
	glyph?: 'share' | 'kebab';
	runs: Run[];
};

/**
 * The two steps, per platform, in that platform's own words.
 *
 * **The words are the browser's own.** *Share*, *Add to Home Screen*,
 * *Install page as app*, *Add to Dock* are what those controls actually say;
 * anything paraphrased sends people looking for a control that is not there.
 *
 * The browser menu is the exception and has to be, because it has no name — it
 * is a glyph. So the sentence describes it and the glyph shows it, which is the
 * same division of labour the iOS share mark already has.
 *
 * **These will drift**, and that is the standing cost of this table: a menu can
 * be reorganised in a release with nothing to tell us. It is the risk D47
 * declined to take for the sign-in lanes, taken here on the opposite balance —
 * a lane nobody can see is different from a menu the person is looking at while
 * they read the step.
 */
const GUIDES: Record<Exclude<InstallMode, 'none' | 'prompt'>, Step[]> = {
	ios: [
		{ glyph: 'share', runs: ['Tap ', { b: 'Share' }, ' in the browser bar'] },
		{ runs: ['Choose ', { b: 'Add to Home Screen' }] },
	],
	android: [
		{ glyph: 'kebab', runs: ['Open the browser menu'] },
		{ runs: ['Choose ', { b: 'Add to Home screen' }] },
	],
	chromium: [
		{ glyph: 'kebab', runs: ['Open the browser menu'] },
		{ runs: ['Choose ', { b: 'Cast, save, and share' }, ', then ', { b: 'Install page as app' }] },
	],
	safari: [
		{ runs: ['Open the ', { b: 'File' }, ' menu'] },
		{ runs: ['Choose ', { b: 'Add to Dock' }] },
	],
};

type Props = { theme: Theme };

/**
 * *Add to home screen*, in Settings › Preferences under Appearance.
 *
 * **There is no banner, no interstitial and no badge anywhere else in the app**,
 * and that is the design's own trade rather than an omission. A dismissible bar
 * at the top of the content column was drawn and cut: it cost about 125px on a
 * 390 screen where the top bar already takes three rows and four while
 * filtering, it needed a whole dismissal design — a stored key, and a rule
 * holding it back until the household had its first item — to be tolerable, and
 * it made the already-installed case worse, because no browser reliably tells
 * the page it is installed and a banner that keeps offering is a nuisance you
 * have to dismiss. In Settings the same fact is invisible.
 *
 * **What that costs is on the record: nobody opens Settings to see what is in
 * it.** Installing is reachable only by someone who already suspects it is
 * possible. This does not solve discovery; it declines to, and that is the first
 * thing to revisit if nobody ever installs it.
 *
 * **Scope is in the label.** *Preferences* are yours and *Pantry settings* are
 * the household's — installing is yours, and the meta line says *On this
 * device.* rather than pretending it follows you. A fourth block for one row is
 * what the add/edit sheet already argued against for its off-list checkbox.
 *
 * Owners, editors and viewers all see it. It survives the read-only cut exactly
 * as Appearance does (D30): installing is a fact about your browser, not a power
 * over the household.
 */
export function InstallRow({ theme }: Props) {
	const d = theme.drawer;
	const { mode, install } = useInstall();

	const [open, setOpen] = useState(false);
	const [shown, setShown] = useState(false);
	const pill = useRef<HTMLButtonElement>(null);

	/*
	 * Mount at `0fr`, then paint one frame later at `1fr`, or the browser has
	 * nothing to transition from and the panel simply appears.
	 */
	useEffect(() => {
		if (! open) return;

		const id = requestAnimationFrame(() => setShown(true));

		return () => cancelAnimationFrame(id);
	}, [open]);

	/* A device that stops offering steps should not be left holding them open. */
	useEffect(() => {
		if (mode === 'none' || mode === 'prompt') setOpen(false);
	}, [mode]);

	function close() {
		setShown(false);
		window.setTimeout(() => setOpen(false), CLOSE_MS);
		pill.current?.focus();
	}

	if (mode === 'none') return null;

	const guide = mode === 'prompt' ? null : GUIDES[mode];

	/*
	 * **A desktop has no home screen**, and the row must not name one. The steps
	 * below it end in *Install page as app* or *Add to Dock*, so a label saying
	 * otherwise would be the same paraphrase the steps refuse to make. This is
	 * the one place the build departs from the boards, which drew *Add to home
	 * screen* on the 1440 board — written before the row had any desktop steps
	 * to be wrong about.
	 */
	const title = isHandheld() ? 'Add to home screen' : 'Install as an app';

	const panelId = 'install-steps';
	const labelId = 'install-steps-label';

	return (
		/*
		 * Escape is caught here rather than on the panel, because opening the
		 * panel does not move focus into it — the pill keeps it, which is what
		 * lets a second press close what the first opened. A handler on the panel
		 * would only ever fire for someone who had already tabbed to the `×`.
		 */
		<div onKeyDown={(e) => { if (open && e.key === 'Escape') { e.stopPropagation(); close(); } }}>
			{/*
			  * The block's own hairline, full-bleed across the card's padding.
			  * It belongs to this row rather than to the pane: where there is no
			  * install path there is no row, and a rule under Appearance with
			  * nothing beneath it is a section divider for a section that is not
			  * there.
			  */}
			<span class="block h-px -mx-3 mb-3.5" style={{ background: d.line }} />

			<div class="flex items-center gap-3">
				<span class="flex-1 min-w-0 flex flex-col gap-0.5">
					<span class="text-[14.5px]" style={{ color: d.inkMuted }}>{title}</span>
					<span class="text-[13px]" style={{ color: d.inkMeta }}>On this device.</span>
				</span>

				{/*
				  * One control, two labels — the shopping-list trigger's rule,
				  * where the label carries the difference and the treatment does
				  * not. Same pill, same geometry, same position.
				  *
				  * **32px on desktop, 36px on mobile inside a 44px target**, which
				  * is the pane's own rule: glyphs and pills keep their drawn size
				  * and the target grows around them. The focus ring is on the
				  * target rather than the pill, which is exact on desktop — where
				  * the two are the same box — and unseen on touch, where nothing
				  * paints `:focus-visible` at all.
				  */}
				<button
					ref={pill}
					onClick={() => (guide ? (open ? close() : setOpen(true)) : install())}
					class={`shrink-0 flex items-center h-11 md:h-8 rounded-[11px] md:rounded-[10px] ${DRAWER_PRIMARY_ON_CARD}`}
					aria-expanded={guide ? open : undefined}
					aria-controls={guide && open ? panelId : undefined}
				>
					<span
						class="flex items-center h-9 md:h-8 px-[15px] md:px-3.5 rounded-[11px] md:rounded-[10px] text-[14px] md:text-[13.5px] font-semibold"
						style={{ background: d.ink, color: '#241E17' }}
					>
						{guide ? 'Show me' : 'Install'}
					</span>
				</button>
			</div>

			{/*
			  * The inline composer's panel on a fourth surface: it drops in below
			  * the row and **the row stays put**. The Filter tab's editing panel,
			  * the item sheet's term composer and the invite composer all work
			  * exactly this way — no modal, no pushed pane.
			  *
			  * `grid-template-rows` is what animates, because a panel of unknown
			  * height has no pixel value to transition to and `max-height` guesses
			  * one. `motion-reduce:transition-none` makes both instant.
			  */}
			{open && guide && (
				<div
					class={`grid transition-all ease-out motion-reduce:transition-none ${shown ? 'duration-[180ms]' : 'duration-[140ms]'}`}
					style={{ gridTemplateRows: shown ? '1fr' : '0fr', opacity: shown ? 1 : 0 }}
				>
					<div class="overflow-hidden">
						<div
							id={panelId}
							role="group"
							aria-labelledby={labelId}
							class="mt-3 p-3 rounded-[14px]"
							style={{ background: d.well, border: `1px solid ${PANEL_EDGE}` }}
						>
							<div class="flex items-center justify-between">
								<p
									id={labelId}
									class="text-label font-bold uppercase tracking-[0.15em]"
									style={{ color: d.inkMeta }}
								>
									{title}
								</p>
								<button
									onClick={close}
									class={`shrink-0 flex items-center justify-center w-[30px] h-[30px] -my-1.5 -mr-1.5 ${DRAWER_PANEL_X}`}
									aria-label="Close the steps"
								>
									<X size={15} strokeWidth={1.7} />
								</button>
							</div>

							<span class="block h-px -mx-3 mt-[11px] mb-3" style={{ background: d.line }} />

							<ol class="flex flex-col gap-2.5">
								{guide.map((step, i) => (
									<li key={i} class="flex items-center gap-[9px]">
										<span
											class="shrink-0 w-[17px] text-center text-[12px] tabular-nums"
											style={{ color: d.inkMeta }}
											aria-hidden="true"
										>
											{i + 1}
										</span>
										{step.glyph === 'share' && (
											<Share size={17} class="shrink-0" style={{ color: d.inkMuted }} aria-hidden="true" />
										)}
										{step.glyph === 'kebab' && (
											<MoreVertical size={17} class="shrink-0" style={{ color: d.inkMuted }} aria-hidden="true" />
										)}
										<span class="text-[13.5px] leading-[1.4]" style={{ color: d.inkMuted }}>
											{step.runs.map((run, j): ComponentChildren => (
												typeof run === 'string'
													? run
													: <b key={j} class="font-semibold" style={{ color: d.ink }}>{run.b}</b>
											))}
										</span>
									</li>
								))}
							</ol>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
