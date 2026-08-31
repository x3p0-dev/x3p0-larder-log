import { useEffect, useState } from 'preact/hooks';
import { RotateCcw } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { PAGE_BUTTON_OUTLINE } from '../lib/controlStyles';

/** Long enough that a query which arrives in the same tick never paints. */
const QUIET_MS = 500;

/**
 * Long enough that it is not a slow answer any more.
 *
 * Six of the eight console queries scan whole tables, so a genuinely slow one
 * is possible here in a way it is not on the pantry — but not for ten seconds
 * at this size, and not on the second load of a screen whose subscription is
 * already open.
 */
const STUCK_MS = 10_000;

/**
 * What a console screen looks like before its query answers, and after it is
 * clear that it is not going to.
 *
 * **The escalation is the reason this exists, and it is forced by the
 * platform.** Zero emits `query.result` on success only — there is no error
 * path at all — so a query that throws leaves its subscription on the initial
 * value **forever**, byte-identical to one that is still in flight. The console
 * cannot tell those apart and neither can anybody reading it.
 *
 * Every screen shipped with `Loading…` and nothing else, which makes the
 * failure case a word that never changes on a screen that never fills. Time is
 * the only signal available, so time is what this spends: past `STUCK_MS` the
 * copy stops claiming to be loading and offers the one recovery there is.
 *
 * **A reload really is the only one.** `useQuery` hands back no refetch handle,
 * and there is nothing to retry — the subscription is open and quiet. So the
 * control says *Reload* rather than *Try again*, because it names what it does.
 *
 * **And nothing paints for the first half-second.** Every subscription on a
 * console screen opens in the same tick as the pane, so the ordinary case
 * resolves before this would draw. A word that flashes and vanishes on a fast
 * screen reads as a glitch; the pane's own scope line makes the same argument
 * for staying absent rather than saying `0 households` for a beat.
 */
export function AdminLoading({ theme }: { theme: Theme }) {
	const [phase, setPhase] = useState<'quiet' | 'loading' | 'stuck'>('quiet');

	useEffect(() => {
		const a = setTimeout(() => setPhase('loading'), QUIET_MS);
		const b = setTimeout(() => setPhase('stuck'), STUCK_MS);

		return () => { clearTimeout(a); clearTimeout(b); };
	}, []);

	if (phase === 'quiet') return null;

	if (phase === 'loading') {
		return (
			<p role="status" class="text-sm" style={{ color: theme.textMuted }}>
				Loading&hellip;
			</p>
		);
	}

	return (
		<div role="status" class="flex flex-col items-start gap-2.5 max-w-[420px]">
			<p class="text-[14.5px] leading-[1.5]" style={{ color: theme.textStrong }}>
				This should have arrived by now.
			</p>
			{/*
			  * It says *probably* because it cannot know. The console is looking
			  * at an open subscription that has said nothing, which is what a
			  * slow answer and a thrown handler look like from here — and
			  * claiming the one it cannot distinguish would be the console
			  * telling somebody something it does not know.
			  */}
			<p class="text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
				Something went wrong fetching this, probably. Reloading is the only
				way to ask again.
			</p>
			<button
				onClick={() => window.location.reload()}
				class={`flex items-center gap-[7px] h-11 md:h-[38px] px-3.5 mt-0.5 rounded-[11px] text-[13.5px] font-semibold ${PAGE_BUTTON_OUTLINE}`}
			>
				<RotateCcw size={14} /> Reload
			</button>
		</div>
	);
}
