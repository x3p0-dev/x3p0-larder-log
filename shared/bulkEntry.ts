/**
 * Bulk entry — the adoption wall.
 *
 * `.claude/docs/design/bulk-entry.md`. Twenty items is a sample dataset and a
 * real pantry is two hundred, so the app needs a way in that is not the Add
 * sheet pressed two hundred times.
 *
 * **Paste and the common-items checklist are both just *sources*. The review
 * table is the destination, and nothing is written until you press Add.** That
 * is the whole structure, and it is what stops the two features being two
 * features. A checklist that committed on its own would put thirty-one items
 * into the pantry at 0 on hand — which, by the run list's own rule, is
 * thirty-one rows on your list on day one. Routing it through the review, where
 * counts default to 1, avoids that without a special case.
 *
 * Everything here is pure and lives in `shared/` for `filter.ts`'s reason: a
 * parse that reads *Butter 1 lb 2* as a name of *Butter 1* still compiles,
 * still runs, and hands back a plausible-looking table nobody can explain.
 * `npm test` is the only thing that can see it.
 */

import { GROCERY_CATALOG } from './catalog';
import type { CatalogItem } from './catalog';
import { fromInt, toInt } from './qty';
import { normalizeSize, UNITS } from './size';
import { byName } from './term';
import type { Item, ItemDraft, Term } from './types';

/**
 * The most rows one bulk write may carry.
 *
 * `RESTOCK_MAX`'s number and `RESTOCK_MAX`'s reason: a bound on a bug rather
 * than on anybody's pantry. Two hundred lines is already more than the wall
 * this was built for, and `addItems` is the app's second mutation that writes
 * an unbounded number of rows from one call.
 */
export const BULK_MAX = 200;

/** One line of a pasted list, after the parse. */
export type ParsedLine = {
	/** Never empty — a line that parses to nothing is not a line. */
	name: string;
	/** How many you have. `'1'` when the line did not say. */
	qty: string;
	/** Both halves or neither, exactly as `shared/size.ts` requires. */
	size: string;
	unit: string;
};

/**
 * A row of the review table.
 *
 * Held by the component and edited in place — the counts, the chips and the
 * ticks are all things somebody changes before pressing Add. `existing` is the
 * one field nothing can change: it is what the name already matched.
 */
export type BulkRow = ParsedLine & {
	/**
	 * Stable across an edit, and **not** the name: two lines may say *Butter*,
	 * and a key that collided would tie their two count fields together.
	 */
	key: string;
	/**
	 * The household item this row's name already names, or `null`.
	 *
	 * A duplicate is not written and has nothing to set, so the row carries the
	 * item itself rather than a boolean — the amber row draws *4 on hand · low
	 * at 6* and its real tags out of exactly this.
	 */
	existing: Item | null;
	locationId: string;
	typeIds: string[];
	storeIds: string[];
	/** Off for a duplicate, on for everything else. Nothing unticked is written. */
	checked: boolean;
};

/** Where the rows came from, which is the only thing the header band says. */
export type BulkSource = 'paste' | 'common';

/** Which taxonomy a picker is picking from. */
export type BulkGroup = 'location' | 'store' | 'type';

/**
 * Whether a row is one this screen could write — the single rule three things
 * read, so they cannot drift.
 *
 * **A duplicate is never writable, whatever its tick says.** The row has no
 * count field and no chips, so writing it would create a second *Butter* out of
 * a control nobody could see.
 *
 * It is deliberately **not** `checked`: the tick is somebody's choice and this
 * is a fact about the row. `bulkSummary` and `bulkDrafts` want both.
 *
 * **It also refused a blank name for one day**, while the review's name was an
 * editable field — the review is a table of labels again, so a name can only
 * come from the parse (which never returns an empty one) or the catalog, and a
 * guard against an unreachable state reads as though the state were reachable.
 */
export function bulkWritable(row: BulkRow): boolean {
	return ! row.existing;
}

/** The counts row 2 and the commit bar read. */
export type BulkSummary = {
	/** Every row the source produced. */
	lines: number;
	/** Rows that would become new items. */
	fresh: number;
	/** Rows whose name is already in the pantry. */
	existing: number;
	/** Ticked, and therefore about to be written. */
	selected: number;
	/** Ticked but skipped, which is what the commit bar's left half reports. */
	skipped: number;
};

/*
 * ---------------------------------------------------------------------------
 * The parse
 * ---------------------------------------------------------------------------
 */

/** Every unit's abbreviation and word, lowercased, mapped to its key. */
const UNIT_WORDS: Record<string, string> = (() => {
	const words: Record<string, string> = {};

	for (const unit of UNITS) {
		words[unit.abbr.toLowerCase()] = unit.key;
		words[unit.label.toLowerCase()] = unit.key;
		words[unit.key.toLowerCase()] = unit.key;
		// A shopper writes *2 lbs*, not *2 lb*. The plural is the same unit and
		// refusing it would move the word into the item's name.
		words[`${unit.abbr.toLowerCase()}s`] = unit.key;
		words[`${unit.label.toLowerCase()}s`] = unit.key;
	}

	// `fl oz` is two words, so the tokenizer never sees it whole. `oz` already
	// resolves to weight, which is the commoner of the two and the one a bare
	// `oz` on a shopping list nearly always means.
	words['floz'] = 'fluid-ounce';

	return words;
})();

/** The unit a word names, or `''`. Case-insensitive, and plurals resolve. */
export function unitFromWord(word: unknown): string {
	if (typeof word !== 'string') return '';

	return UNIT_WORDS[word.trim().toLowerCase().replace(/\.$/, '')] ?? '';
}

/** True for a token that is nothing but digits. */
function isNumberToken(token: string): boolean {
	return /^\d+$/.test(token);
}

/**
 * Reads one line into a name, a count and a size.
 *
 * **It works from the end**, which is the only reading that handles the four
 * shapes a shopping list really carries:
 *
 * | line | name | size | count |
 * |---|---|---|---|
 * | `Basmati Rice, 5 lb, 2` | Basmati Rice | 5 lb | 2 |
 * | `Chickpeas 15 oz, 6` | Chickpeas | 15 oz | 6 |
 * | `Sour Cream 16 oz` | Sour Cream | 16 oz | 1 |
 * | `Chicken Thighs 4` | Chicken Thighs | — | 4 |
 *
 * A bare number at the end is the count; a number followed by a unit word is
 * the size. Commas are separators and nothing more, so `Butter 1 lb 2` and
 * `Butter, 1 lb, 2` read the same — which matters, because a list typed into
 * Notes uses neither consistently.
 *
 * **It never claims the whole line.** `12` is an item called *12*, not a
 * nameless count: popping a token that would leave no name is how a parse
 * silently deletes somebody's row.
 *
 * **And it never guesses a location, a store or a type.** A paste cannot know
 * them — that is what *Set for all* on the review is for.
 */
export function parseLine(raw: string): ParsedLine | null {
	// Commas are separators, and a trailing one is a habit rather than a field.
	const tokens = raw.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);

	if (tokens.length === 0) return null;

	let qty = '';
	let size = '';
	let unit = '';

	// Two passes at most: one count and one size, each claimed once. A third
	// number is part of the name — *Ranch 3 2 1* is a product, not a form.
	for (let pass = 0; pass < 2; pass++) {
		const last = tokens[tokens.length - 1] ?? '';

		// `15oz` glued together — one token that is really two.
		const glued = /^(\d+)([a-zA-Z]+)$/.exec(last);

		if (! size && glued && unitFromWord(glued[2])) {
			if (tokens.length < 2) break;

			size = glued[1] ?? '';
			unit = unitFromWord(glued[2]);
			tokens.pop();
			continue;
		}

		if (! size && unitFromWord(last) && tokens.length >= 3 && isNumberToken(tokens[tokens.length - 2] ?? '')) {
			unit = unitFromWord(last);
			size = tokens[tokens.length - 2] ?? '';
			tokens.pop();
			tokens.pop();
			continue;
		}

		if (! qty && isNumberToken(last) && tokens.length >= 2) {
			qty = last;
			tokens.pop();
			continue;
		}

		break;
	}

	const name = tokens.join(' ').trim();

	if (! name) return null;

	// One place makes the pair whole, and it is the same one the sheet and the
	// server call: a number with an unknown unit stores neither half.
	const pair = normalizeSize(size, unit);

	return {
		name,
		// A line that named no count is one of the thing — the assumption the
		// whole review rests on, and the one that keeps a pasted list off the
		// shopping list on the day it arrives.
		qty: qty ? fromInt(toInt(qty)) : '1',
		size: pair.size,
		unit: pair.unit,
	};
}

/**
 * The whole paste.
 *
 * One item per line, blank lines dropped, capped at `BULK_MAX`. The cap is
 * silent here and reported by the caller: a parse that quietly returned 200 of
 * 240 lines would be the *no silent caps* rule broken in the one place nobody
 * would look.
 */
export function parseList(text: unknown): ParsedLine[] {
	if (typeof text !== 'string') return [];

	const lines: ParsedLine[] = [];

	for (const raw of text.split(/\r?\n/)) {
		const parsed = parseLine(raw);

		if (parsed) lines.push(parsed);
		if (lines.length >= BULK_MAX) break;
	}

	return lines;
}

/** How many lines the text holds, before the cap — what the dialog's primary counts. */
export function countLines(text: unknown): number {
	if (typeof text !== 'string') return 0;

	return text.split(/\r?\n/).filter((line) => parseLine(line) !== null).length;
}

/*
 * ---------------------------------------------------------------------------
 * The review's rows
 * ---------------------------------------------------------------------------
 */

/**
 * A name matched against the household, exactly and case-insensitively.
 *
 * **The autofill rule, deliberately** (D63): the same comparison the catalog
 * uses to fill a type. It will not catch *Butter* against *Salted Butter*, and
 * nothing on the review says so — which is on the record in `bulk-entry.md`
 * rather than solved here, because a looser match would start refusing rows
 * somebody meant.
 */
export function findExisting(name: string, items: readonly Item[]): Item | null {
	const want = name.trim().toLowerCase();

	if (! want) return null;

	return items.find((item) => item.name.trim().toLowerCase() === want) ?? null;
}

/** A term by its name — the same comparison, on a taxonomy. */
function byExactName(list: readonly Term[], name: string): Term | undefined {
	const want = name.trim().toLowerCase();

	return list.find((term) => term.name.trim().toLowerCase() === want);
}

/**
 * Parsed lines, made into review rows.
 *
 * A duplicate arrives **unchecked**: nothing is going to be written to it, and
 * a row that is both amber and ticked would be asking to be pressed. Everything
 * else arrives ticked, because the point of pasting a list is that you meant all
 * of it.
 *
 * **The table is A–Z, not paste order**, and it is sorted **once, here**, rather
 * than derived from the live rows in the component. The order is a property of
 * the batch, fixed when it arrives rather than recomputed every time a box is
 * ticked — which is also what makes two lines both saying *Butter* land next to
 * each other, where they can be seen.
 *
 * `key` stays tied to the **source** position, so the second *Butter* is still
 * `line-7` however far up the table it sorted.
 */
export function rowsFromLines(lines: readonly ParsedLine[], items: readonly Item[]): BulkRow[] {
	return byName(lines.map((line, index) => {
		const existing = findExisting(line.name, items);

		return {
			...line,
			key: `line-${index}`,
			existing,
			locationId: '',
			typeIds: [],
			storeIds: [],
			checked: existing === null,
		};
	}));
}

/**
 * Catalog names, made into review rows.
 *
 * **This route fills the type and the shelf and the paste does not**, and the
 * difference is not an inconsistency. A pasted line is a word somebody typed
 * and the app knows nothing about it; a catalog row is an entry that *carries*
 * a type and a place, and D63 already settled that picking one on the Add sheet
 * fills both. Reading them here is the same act, not a guess.
 *
 * Both are matched by name against terms that already exist, so a household
 * that renamed *Dairy* gets nothing filled rather than something wrong.
 * **Never a source**: where you buy a thing is one household's own vocabulary
 * (D40).
 */
export function rowsFromCatalog(
	entries: readonly CatalogItem[],
	items: readonly Item[],
	types: readonly Term[],
	locations: readonly Term[]
): BulkRow[] {
	// A–Z for `rowsFromLines`' reason. The checklist hands these over grouped by
	// type, which is the checklist's order and not the review's.
	return byName(entries.map((entry, index) => {
		const existing = findExisting(entry.name, items);
		const type = entry.type ? byExactName(types, entry.type) : undefined;
		const place = entry.place ? byExactName(locations, entry.place) : undefined;

		return {
			name: entry.name,
			qty: '1',
			size: '',
			unit: '',
			key: `catalog-${index}`,
			existing,
			locationId: place?.id ?? '',
			typeIds: type ? [type.id] : [],
			storeIds: [],
			checked: existing === null,
		};
	}));
}

/**
 * The rows a bulk set would touch — ticked, and writable.
 *
 * One definition, read by both halves: the thing that gets set and the thing
 * that reports what is set have to agree about *which rows*, or the header
 * band's tick describes a set nobody made.
 */
function bulkTargets(rows: readonly BulkRow[]): BulkRow[] {
	return rows.filter((row) => row.checked && bulkWritable(row));
}

/**
 * The terms **every** row a bulk set would touch already carries.
 *
 * This is what puts a check in the header band's menus, and it is a stronger
 * claim than *some row has it*: a tick beside `Dairy` says the batch is Dairy,
 * so it has to go the moment one row stops being. **Nothing is ticked when
 * nothing is ticked** — with no target rows there is no batch to describe, and
 * `every` over an empty list would otherwise claim all sixteen colours at once.
 *
 * Invisible when wrong in the way a checkmark always is: the menu still opens,
 * still lists every term and still sets correctly, and only *reports* a state
 * that is not there.
 */
export function checkedTerms(rows: readonly BulkRow[], group: BulkGroup): string[] {
	const targets = bulkTargets(rows);
	const first = targets[0];

	if (! first) return [];

	if (group === 'location') {
		const held = first.locationId;

		return held && targets.every((row) => row.locationId === held) ? [held] : [];
	}

	const field = group === 'type' ? 'typeIds' : 'storeIds';

	return first[field].filter((id) => targets.every((row) => row[field].includes(id)));
}

/**
 * One term, toggled on every row that is going to be written.
 *
 * **The menu *is* the batch's value.** After any press, every target row holds
 * exactly the terms the menu shows ticked — one press adds a term to that set or
 * takes it out, and the whole set is then written to every row. So `Dairy` then
 * `Baking` gives every row both, and pressing `Dairy` again leaves every row
 * with `Baking` alone. **Multi-select and replace at the same time**, which is
 * what the two of them together have to mean: the *set* replaces, and the set
 * can hold more than one thing.
 *
 * **It is not the toggle this used to be**, and the difference is the whole
 * point. That one added the term unless every row already carried it, in which
 * case it removed it — so a press's direction depended on a fact about twenty
 * rows that nothing on screen reported, and adding to a batch of rows with
 * *different* types left them still different. Here the direction is the tick
 * you can see, and one press makes every target row agree.
 *
 * **A location is one shelf, so its set holds one.** Same rule, arity one.
 */
export function setTermForChecked(
	rows: readonly BulkRow[],
	group: BulkGroup,
	id: string
): BulkRow[] {
	const held = checkedTerms(rows, group);
	const clearing = held.includes(id);

	// The set the menu will show after this press, and therefore the set every
	// target row is about to hold. Appending keeps `checkedTerms`' order stable,
	// so a term does not jump up the menu when a second one joins it.
	const next = clearing ? held.filter((term) => term !== id) : [...held, id];

	return rows.map((row) => {
		if (! row.checked || ! bulkWritable(row)) return row;

		if (group === 'location') return { ...row, locationId: clearing ? '' : id };

		return group === 'type'
			? { ...row, typeIds: [...next] }
			: { ...row, storeIds: [...next] };
	});
}

/** What the commit bar and row 2 report. */
export function bulkSummary(rows: readonly BulkRow[]): BulkSummary {
	let fresh = 0;
	let existing = 0;
	let selected = 0;

	for (const row of rows) {
		if (row.existing) existing++;
		else fresh++;

		if (row.checked && bulkWritable(row)) selected++;
	}

	return { lines: rows.length, fresh, existing, selected, skipped: rows.length - selected };
}

/**
 * The rows, as drafts the server can write.
 *
 * **A duplicate is never one of them**, whatever its tick says — the row has no
 * count field and no chips, so writing it would create a second *Butter* out of
 * a control nobody could see. The tick is belt and braces on top of that.
 *
 * `threshold` is the household's default rather than anything the row holds:
 * *low at* is a count rather than a property, and D63 already settled that
 * copying one from somewhere else carries the wrong number onto the wrong jar.
 */
export function bulkDrafts(
	rows: readonly BulkRow[],
	defaultThreshold: string,
	fallbackLocationId: string
): ItemDraft[] {
	return rows
		.filter((row) => row.checked && bulkWritable(row))
		.map((row) => ({
			name: row.name,
			// Every item needs a location and the review need not have been given
			// one — the household's first shelf is the only answer available, and
			// it is the same one the Add sheet's own draft falls back to.
			locationId: row.locationId || fallbackLocationId,
			typeIds: [...row.typeIds],
			storeIds: [...row.storeIds],
			qty: row.qty,
			threshold: defaultThreshold,
			size: row.size,
			unit: row.unit,
			offShoppingList: false,
			listRule: '',
			seasonFrom: '',
			seasonTo: '',
			notes: '',
		}));
}

/*
 * ---------------------------------------------------------------------------
 * The common-items checklist
 * ---------------------------------------------------------------------------
 */

/** One card of the checklist — a type, and everything the catalog files under it. */
export type CatalogGroup = {
	/** The household's own term, or `null` for the trailing group. */
	term: Term | null;
	label: string;
	entries: CatalogItem[];
};

/**
 * The catalog, grouped by the household's own types.
 *
 * **What the household already has is left out.** The checklist answers *what
 * should I add*, and offering something already on the shelf is the review's
 * amber row two steps early — thirty-one ticks and twelve of them refused is a
 * worse screen than a shorter list. A household that holds everything gets an
 * empty card, which is a true thing to say.
 *
 * A catalog row whose type this household does not have — renamed, deleted, or
 * `''` because the row is not a kind of food at all — goes to a trailing group
 * with no term and no colour. That is the run list's storeless-group rule: a
 * thing with nowhere to file is filed last, and never invented a home.
 */
export function catalogGroups(
	items: readonly Item[],
	types: readonly Term[],
	catalog: readonly CatalogItem[] = GROCERY_CATALOG
): CatalogGroup[] {
	const held = new Set(items.map((item) => item.name.trim().toLowerCase()));
	const groups: CatalogGroup[] = types.map((term) => ({ term, label: term.name, entries: [] }));
	const byName = new Map<string, CatalogGroup>();

	for (const group of groups) byName.set(group.label.trim().toLowerCase(), group);

	const rest: CatalogGroup = { term: null, label: 'Everything else', entries: [] };

	for (const entry of catalog) {
		if (held.has(entry.name.trim().toLowerCase())) continue;

		const group = entry.type ? byName.get(entry.type.trim().toLowerCase()) : undefined;

		(group ?? rest).entries.push(entry);
	}

	// A card with nothing in it is a heading over an absence. The trailing group
	// keeps its place at the end rather than sorting into the A–Z above it.
	return [...groups.filter((group) => group.entries.length > 0), ...(rest.entries.length > 0 ? [rest] : [])];
}
