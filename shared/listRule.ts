/**
 * Whether an item joins the run list at all — automatic, always, or never.
 *
 * *Low at* is the sentence **put this on the list when I'm down to N**, and both
 * overrides amend that sentence rather than replacing it. That is why the
 * control sits under the two steppers in the sheet's `COUNT` section, and why
 * this module sits beside `runList.ts`: it is a rule about the list, not about
 * the item's stock.
 *
 * **It changes one view and nothing that is true.** A `never` item that is low
 * still reads *Low* on its card and still counts toward the three status pills,
 * because the pills count stock and the list counts shopping (D53's split, and
 * the reason the muted-pantry worry closes itself).
 *
 * It lives in `shared/` because the server writes it and the client renders it,
 * and because reading the legacy column wrong is invisible: a row would simply
 * come back onto a list its owner took it off, months after they last thought
 * about it.
 */

import { SOURCE_KINDS } from './source';
import type { SourceKind } from './source';
import { statusKeyFor } from './status';

/**
 * The two overrides. Automatic is the **absence** of one, stored as `''`, so
 * there is no third literal to keep in step with the schema's default.
 */
export type ListRule = 'always' | 'never';

/** In the order the segment draws them, after Automatic. */
export const LIST_RULES: readonly ListRule[] = ['always', 'never'];

/**
 * Reads a stored value as a rule.
 *
 * Anything unrecognised — `''`, a typo, a value from a later version — is
 * automatic, which is the behaviour the app had before the column existed.
 * **Nothing here throws**: this is reached from a query, and a query that
 * throws is invisible to the client.
 */
export function toListRule(value: unknown): ListRule | '' {
	return value === 'always' || value === 'never' ? value : '';
}

/** The two fields that between them answer the question. */
type Ruled = { listRule?: unknown; offShoppingList?: unknown };

/**
 * The rule actually in force, **folding the retired column in**.
 *
 * `offShoppingList` (D53, retired by D60) said exactly what `never` says, and
 * the rows that carry it were written before this column existed. This is the
 * one place the two are reconciled — the arrangement `changedAtOf` already uses
 * for its own fallback chain — so nothing else has to remember that a second
 * spelling exists.
 *
 * **The new column wins**, which is what lets the segment drain the old one: an
 * edit through it writes `listRule` and clears `offShoppingList` in the same
 * patch, so a legacy row stops being legacy the first time anybody looks at it.
 */
export function listRuleOf(item: Ruled): ListRule | '' {
	const rule = toListRule(item.listRule);

	if (rule) return rule;

	return item.offShoppingList === true ? 'never' : '';
}

/**
 * On the list with nothing wrong with it — a row forced on by `always`.
 *
 * Its status badge has nothing to report, which is what frees the slot for the
 * neutral `EXTRA` badge that says why it is there. **A row that is genuinely
 * low or out is not extra**, however it got on the list: the status is the more
 * useful of the two facts and it keeps the slot.
 */
export function isExtra(item: Ruled & { qty: unknown; threshold: unknown }): boolean {
	return listRuleOf(item) === 'always' && statusKeyFor(item.qty, item.threshold) === 'ok';
}

/** The word each kind of source contributes to the name of its list. */
const LIST_WORDS: Record<SourceKind, string> = {
	shop: 'shopping',
	grow: 'harvest',
	make: 'make',
};

/**
 * Which list this item would actually join — *your shopping list*, *your
 * harvest list*, or both.
 *
 * **The run list has had three bands since D58 and the copy never caught up.**
 * *On the list until you buy it* is simply false for a tomato you pick, and
 * *the list* names nothing a person can point at. What the segment governs is
 * the band this item lands on, and the band follows its **sources** — so the
 * sentence follows them too, and changes under you as you pick source chips on
 * the sheet.
 *
 * **An item naming no source at all gets *shopping list***, because the
 * storeless group is Buy's (`runList.ts`). That is the same answer D58 gives
 * everywhere else an empty source has to mean something on this screen.
 *
 * Two kinds make it plural — *your shopping and harvest lists* — because such an
 * item really is on both cards, counted once by each.
 */
export function listNameFor(kinds: readonly SourceKind[]): string {
	// `itemSourceKinds` already returns them in `SOURCE_KINDS` order, which is
	// the run list's own band order. Filtering here keeps that true for a caller
	// that assembled the array some other way.
	const words = SOURCE_KINDS.filter((kind) => kinds.includes(kind)).map((kind) => LIST_WORDS[kind]);

	if (words.length === 0) return 'shopping list';
	if (words.length === 1) return `${words[0]} list`;

	// The serial comma, which only a three-kind item ever reaches.
	const last = words[words.length - 1];
	const rest = words.slice(0, -1);

	return `${rest.join(', ')}${rest.length > 1 ? ',' : ''} and ${last} lists`;
}

/**
 * What the hint under the segment says, which is the whole of how the choice
 * explains itself.
 *
 * **It names the list rather than saying *the list***, and it names the right
 * one — see `listNameFor`. A person reading this is deciding whether to pin a
 * thing, and *which list* is half of what they are deciding.
 *
 * **It says *stock*, never *count*.** The sheet is covered in counts — two
 * steppers, a size, a status line — and every one of them is a number. What
 * this sentence is about is the shelf, and *stock* is the word the status pills
 * and the badges already use for it.
 *
 * **Automatic reads the live threshold**, the way the sheet's status line reads
 * the live quantity — so stepping *Low at* while the hint is on screen moves the
 * number in it. The caller supplies the threshold rather than the item, because
 * on the sheet the number being described is the one in the field, not the one
 * in the database.
 */
export function listRuleHint(rule: ListRule | '', threshold: number, listName: string): string {
	/*
	 * **`always` means always, and the sentence can now say so plainly.**
	 *
	 * It was a one-shot pin for one round — the put-away cleared it, on D64's
	 * reasoning about claims and purchases — and the copy had to carry an *until
	 * you put it away* clause to stay honest. Both are gone: a control labelled
	 * **Always** that stops after one trip makes the word lie, so the behaviour
	 * moved to match the label rather than the sentence stretching to excuse it.
	 *
	 * The symmetry with `never` is the tell that this is the right shape. Two
	 * standing preferences, one sentence each, neither with a caveat.
	 */
	if (rule === 'always') {
		return `Always on your ${listName}, however much stock you have.`;
	}

	if (rule === 'never') {
		return `Never on your ${listName}. It still shows as low or out on its card.`;
	}

	return `On your ${listName} when your stock is down to ${threshold}.`;
}

/**
 * The segment's own sub-label — *Shopping list*, *Harvest list*.
 *
 * The two steppers beside it each name their field, and the segment had none:
 * three words under a stepper with nothing saying what question they answer.
 * **This is the fix for *it isn't clear what it does***, and the hint below is
 * the rest of it.
 */
export function listRuleLabel(listName: string): string {
	return listName.charAt(0).toUpperCase() + listName.slice(1);
}

/** The segment's three labels, Automatic first. */
export const LIST_RULE_LABELS: Record<ListRule | '', string> = {
	'': 'Automatic',
	always: 'Always',
	never: 'Never',
};
