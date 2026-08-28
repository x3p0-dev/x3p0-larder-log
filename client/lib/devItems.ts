/**
 * `?demo` — fill the current household with `shared/demoItems.ts`.
 *
 * `sf dev` starts with an empty database on every run, so the app has only ever
 * been looked at holding whatever was typed in to check one thing. Everything
 * that is only wrong *at scale* — the filters, the sorts, the shopping list's
 * grouping, `Showing X of Y`, the grid's wrapping — has therefore never been
 * looked at at all. Sixty rows is what makes those visible.
 *
 * **The rows are real, and that is the whole design.** `?members` fakes its two
 * stand-ins in the client and refuses to let them near the network, because a
 * panel only has to be *seen*. Items are the opposite: the point is to exercise
 * `pantry`, `shared/filter.ts` and `shared/shoppingList.ts` against a real
 * collection, and a client-side fake would mean the thing under test is not the
 * thing that runs. So this writes through `addItem` — the same mutation the add
 * sheet calls, with the same validation and the same normalisation.
 *
 * Which is also why the fence here is the **gate**, not a guard on the rows.
 * There is no `isDevItem`, because there is nothing to refuse: a demo row is an
 * ordinary item the moment it lands, editable and removable like any other.
 * Three things keep it honest:
 *
 * - **Loopback only**, read once per page load, ignored everywhere else —
 *   the same shape as `?signedout` and `?members`.
 * - **It refuses a household that already holds items**, so it cannot be run
 *   twice and cannot bury a real pantry under sixty fixtures.
 * - **It writes nothing the UI could not have written.** Every field goes
 *   through the handler; nothing here reaches the database directly.
 *
 * Take it out with D14, alongside `?signedout`, `?members` and `?gravatar`.
 *
 * **`--state-backend sqlite` is what makes it worth having.** With the default
 * in-memory backend the sixty rows die with the dev server and this has to be
 * re-run every restart; with sqlite it is a one-time cost. `npm run dev` passes
 * the flag.
 */

import { resolveDemoItems } from '../../shared/demoItems';
import type { DemoSeedResult } from '../../shared/demoItems';
import type { ItemDraft, Stamps, Term } from '../../shared/types';

export type { DemoSeedResult };

/** Shared with `client/index.tsx`. See the note on `isLoopback` there. */
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

export function devItemsEnabled(): boolean {
	if (typeof location === 'undefined') return false;
	if (! LOOPBACK_HOSTS.includes(location.hostname)) return false;

	return new URLSearchParams(location.search).has('demo');
}

/**
 * Write the demo pantry, one `addItem` at a time.
 *
 * **Sequential rather than `Promise.all`**, for two reasons. Sixty concurrent
 * mutations against the dev server's in-memory store is a thundering herd for
 * no gain, and each one invalidates `pantry` — so the parallel version spends
 * its time refetching a query sixty times over. Sequential also lets the grid
 * fill in as it goes, which is a progress bar nobody had to build.
 *
 * Stops on the first refusal. A failure here is a bug in the fixture or a
 * household that is not yours, and grinding through fifty-nine more of the same
 * error helps nobody.
 */
export async function runDemoSeed(
	api: {
		items: readonly { id: string }[];
		locations: readonly Term[];
		types: readonly Term[];
		stores: readonly Term[];
		addItem: (draft: ItemDraft, stamps?: Stamps) => Promise<string | null>;
	},
	onProgress?: (done: number, total: number) => void
): Promise<DemoSeedResult> {
	// Refusing a non-empty household is the one guard that matters: it makes
	// the switch idempotent-ish, and it is what stops a stray `?demo` on a
	// household somebody is actually using from burying it.
	if (api.items.length > 0) return { added: 0, skipped: [] };

	const { drafts, skipped } = resolveDemoItems(api.locations, api.types, api.stores, Date.now());

	let added = 0;

	for (const draft of drafts) {
		const { addedAt, changedAt, ...rest } = draft;

		if (! await api.addItem(rest, { addedAt, changedAt })) break;

		added += 1;
		onProgress?.(added, drafts.length);
	}

	return { added, skipped };
}
