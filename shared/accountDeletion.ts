/**
 * Deleting your own account, and the ownership transfer it forces (D68).
 *
 * **Account deletion is *leave household* run against every household at
 * once**, and D22's last-owner guard does not survive the trip. One blocked
 * dialog is a step; five is a wall — so every block becomes a choice, every
 * choice becomes one row, and the whole set is asked once instead of five times
 * on the way past.
 *
 * Everything in here is copy or classification, and both are invisible when
 * wrong in the same way: a household filed under the wrong fate still draws a
 * row, still reads as a sentence, and quietly deletes or spares the wrong
 * pantry. That is why `fateOf` is in `shared/` and why **the server derives
 * which decisions it requires from the same function the dialog draws from** —
 * two descriptions of *which households are a question* would disagree exactly
 * once, in production, over somebody's data.
 */

import type { Role } from './roles';
import { possessive } from './claim';

/**
 * What a person chose for one household they solely own.
 *
 * Structurally identical to the console's `AdminOwnershipDecision`, and
 * deliberately its own name: the two travel to different handlers under
 * different authority, and a shared alias would invite one of them to be
 * validated by the other's rules.
 */
export type OwnershipDecision = {
	householdId: string;
	action: 'transfer' | 'delete';
	/** Present on a transfer. The **membership** to hand it to, not the account. */
	toMembershipId?: string;
};

/** Somebody the household could be handed to — everyone else who is in it. */
export type TransferCandidate = {
	/** The membership row. What `transferOwnership` takes. */
	id: string;
	name: string;
	/** Their avatar URL, or `''`. The trigger draws a face once one is chosen. */
	picture: string;
	role: Role;
};

/**
 * One household you are in, as the pre-flight has to see it.
 *
 * The three term counts are here because a row set to *delete it* says on its
 * own face what goes with it, and a number nobody can check is the one thing
 * that screen must not print.
 */
export type AccountHousehold = {
	id: string;
	name: string;
	/** Already resolved by the server (D42) — never `''`. */
	ink: string;
	role: Role;
	members: number;
	items: number;
	locations: number;
	sources: number;
	types: number;
	/** `Store` or `Source`, per this household's own sources (D58). */
	sourceWord: 'Store' | 'Source';
	/** Everyone else in it. Empty is a real answer — you are the only member. */
	candidates: TransferCandidate[];
};

/** What the pre-flight has to know, and the confirmation reads back. */
export type AccountDeletionData = {
	/** The account's own display name — what the typed confirmation asks for. */
	name: string;
	households: AccountHousehold[];
};

/**
 * What happens to a household when its owner's account goes.
 *
 * - **`decide`** — you are its only owner and other people are in it. D22's
 *   guard, and the one case that is a question rather than a consequence.
 * - **`goes`** — you are its only member. There is nobody to hand it to, so it
 *   is destroyed with the account. **Not a question**: a screen that asked
 *   would be offering a choice with one answer.
 * - **`leave`** — somebody else can carry it. You simply stop being in it.
 *
 * **`members <= 1` is tested first, and not `role === 'owner'` with it.** A
 * household with one member who is somehow *not* an owner is a real row — the
 * console has an orphan dialog for exactly that state — and leaving it behind
 * would manufacture a pantry nobody can reach in order to avoid deleting one
 * nobody else is in.
 */
export type HouseholdFate = 'decide' | 'goes' | 'leave';

export function fateOf(role: Role, members: number, owners: number): HouseholdFate {
	if (members <= 1) return 'goes';

	if (role === 'owner' && owners <= 1) return 'decide';

	return 'leave';
}

/** The fate of a household the pre-flight is holding, from its own counts. */
export function fateOfHousehold(h: AccountHousehold): HouseholdFate {
	// Owners among the *others*, plus you when you are one. The DTO carries the
	// candidates rather than an owner count, because the menu needs the names
	// anyway and two derivations of the same number is one too many.
	const owners = (h.role === 'owner' ? 1 : 0) + h.candidates.filter((c) => c.role === 'owner').length;

	return fateOf(h.role, h.members, owners);
}

/** The three groups the pre-flight draws, in the order it draws them. */
export function preflightGroups(households: readonly AccountHousehold[]): {
	decide: AccountHousehold[];
	goes: AccountHousehold[];
	leaving: AccountHousehold[];
} {
	const decide: AccountHousehold[] = [];
	const goes: AccountHousehold[] = [];
	const leaving: AccountHousehold[] = [];

	for (const h of households) {
		const fate = fateOfHousehold(h);

		if (fate === 'decide') decide.push(h);
		else if (fate === 'goes') goes.push(h);
		else leaving.push(h);
	}

	return { decide, goes, leaving };
}

/**
 * Whether the pre-flight appears at all.
 *
 * **A screen whose only content is *nothing to decide* is the control that can
 * only disappoint**, one level up — so with nothing to answer the confirmation
 * is the whole flow.
 */
export function needsPreflight(households: readonly AccountHousehold[]): boolean {
	return preflightGroups(households).decide.length > 0;
}

/**
 * The decisions to send, given what was chosen on the screen.
 *
 * **Only the `decide` rows.** A `goes` household has one possible outcome and
 * the server can see that for itself; sending an answer for it would be the
 * client telling the server something the server is holding — the instinct that
 * makes a household id a selector rather than an authority. The server
 * recomputes the whole set regardless and refuses a decision about a household
 * that needed none, so a stale dialog cannot delete a pantry nobody chose.
 */
export function decisionsFrom(
	households: readonly AccountHousehold[],
	/** `householdId → membershipId`, or `''` meaning *delete this household*. */
	chosen: Readonly<Record<string, string>>
): OwnershipDecision[] {
	return preflightGroups(households).decide.flatMap((h): OwnershipDecision[] => {
		const value = chosen[h.id];

		if (value === undefined) return [];

		return [value
			? { householdId: h.id, action: 'transfer', toMembershipId: value }
			: { householdId: h.id, action: 'delete' }];
	});
}

/** Every row still waiting on an answer. The primary is armed on this being empty. */
export function unanswered(
	households: readonly AccountHousehold[],
	chosen: Readonly<Record<string, string>>
): AccountHousehold[] {
	return preflightGroups(households).decide.filter((h) => chosen[h.id] === undefined);
}

// --- the copy ---

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** `three`, or `12` past the point where words stop helping. */
export function word(n: number): string {
	return WORDS[n] ?? String(n);
}

/** `three households`, `one household`. */
export function countWord(n: number, noun: string): string {
	return `${word(n)} ${n === 1 ? noun : `${noun}s`}`;
}

/** `4 items`, `1 item` — a numeral, because this one is a measurement. */
export function plural(n: number, noun: string): string {
	return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

/** `A, B, and C` — the serial comma at three, because the app's copy takes it. */
export function andList(parts: readonly string[]): string {
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0];
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

	return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * The pre-flight's body — what you own, and how much of it is a question.
 *
 * Two sentences, because they answer two different things: the first places you
 * in the households you are in, and the second says how many of them stop the
 * deletion until they are answered.
 */
export function preflightLede(households: readonly AccountHousehold[]): string {
	const total = households.length;
	const owned = households.filter((h) => h.role === 'owner').length;
	const { decide } = preflightGroups(households);

	const first = owned < total
		? `You own ${word(owned)} of the ${word(total)} you’re in.`
		: total === 1
			? 'You own the one household you’re in.'
			: total === 2
				? 'You own both households you’re in.'
				: `You own all ${word(total)} of the households you’re in.`;

	/*
	 * **Absent at zero rather than counted.** The pre-flight does not open with
	 * nothing to decide, so this branch is unreachable from the app — but a
	 * sentence reading *No of them other people use* is the kind of copy that
	 * ships the day somebody makes it reachable, and dropping it costs a line.
	 */
	if (decide.length === 0) return first;

	const second = decide.length === 1
		? 'Other people use one of them, so it needs a decision before your account can go.'
		: `${cap(word(decide.length))} of them other people use, so those ${word(decide.length)} need a decision before your account can go.`;

	return `${first} ${second}`;
}

/**
 * *Only you are in it, so it goes with your account. 34 items.*
 *
 * **The count is the whole reason this is a row rather than part of the leaving
 * line.** A household being destroyed and a household being left are not the
 * same fact, and one sentence covering both flattens the first into the second.
 */
export function goesLine(h: AccountHousehold): string {
	return `Only you are in it, so it goes with your account. ${plural(h.items, 'item')}.`;
}

/** *You’ll leave both. Nothing in them changes.* */
export function leavingLine(count: number): string {
	const which = count === 1 ? 'it' : count === 2 ? 'both' : `all ${word(count)}`;

	return `You’ll leave ${which}. Nothing in ${count === 1 ? 'it' : 'them'} changes.`;
}

/**
 * *128 items, 4 locations, 6 stores, and 9 types go permanently.*
 *
 * **Four nouns, not the design's three.** The board names items, locations and
 * types; the app's own *Delete household* confirmation has always named the
 * sources too, and this is the same act reached from a different screen. The
 * group's word is the household's own (D58), so a garden household reads
 * *sources* here exactly as its drawer does.
 */
export function deleteConsequence(h: AccountHousehold): string {
	return `${andList([
		plural(h.items, 'item'),
		plural(h.locations, 'location'),
		plural(h.sources, h.sourceWord.toLowerCase()),
		plural(h.types, 'type'),
	])} go permanently.`;
}

/** *Sarah Calfee becomes the owner.* */
export function transferConsequence(name: string): string {
	return `${name || 'They'} become${name ? 's' : ''} the owner.`;
}

/** *4 members · 47 items* — a row nobody has answered yet says only what it is. */
export function householdMeta(h: AccountHousehold): string {
	return `${plural(h.members, 'member')} · ${plural(h.items, 'item')}`;
}

/**
 * The confirmation's body.
 *
 * **What the account itself loses comes first**, because it is the only part of
 * this that is unambiguously yours — everything after it is about households,
 * which the recap block below then lists one by one.
 */
export function confirmBody(households: readonly AccountHousehold[], chosen: Readonly<Record<string, string>>): string {
	const total = households.length;
	const gone = deletedHouseholds(households, chosen).length;
	const own = 'Your display name, email, and picture go permanently.';

	if (total === 0) return `${own} You’re not in any households.`;

	if (gone === 0) {
		return `${own} You leave ${countWord(total, 'household')}. Nothing in ${total === 1 ? 'it' : 'them'} changes.`;
	}

	if (gone === total) {
		return `${own} You leave ${countWord(total, 'household')}, and ${total === 1 ? 'it goes' : 'they all go'} with you.`;
	}

	return `${own} You leave ${countWord(total, 'household')}, and ${word(gone)} of them ${gone === 1 ? 'goes' : 'go'} with you.`;
}

/**
 * What one household's fate resolves to, once the screen has been answered.
 *
 * **One function, so the recap and the count cannot disagree.** They read the
 * same `chosen` and were written separately at first, which put an unanswered
 * row in the recap as *deleted* and left it out of *two of them go with you* —
 * a sentence and a list on the same dialog contradicting each other.
 *
 * An unanswered `decide` row reads as **delete**, and it is unreachable: the
 * confirmation only opens once every row has an answer, and the server refuses
 * the call anyway. Where a default is unreachable, the loudest one is the safe
 * one — a recap that under-reports what is about to go is the worse failure.
 */
export function fateFor(
	h: AccountHousehold,
	chosen: Readonly<Record<string, string>>
): 'transfer' | 'delete' | 'leave' {
	const fate = fateOfHousehold(h);

	if (fate === 'goes') return 'delete';
	if (fate === 'leave') return 'leave';

	return chosen[h.id] ? 'transfer' : 'delete';
}

/** The households this deletion destroys — the `goes` ones and the chosen ones. */
export function deletedHouseholds(
	households: readonly AccountHousehold[],
	chosen: Readonly<Record<string, string>>
): AccountHousehold[] {
	return households.filter((h) => fateFor(h, chosen) === 'delete');
}

/** One line of the confirmation's read-only recap, and of the card at the end. */
export type RecapRow =
	| { fate: 'transfer'; household: AccountHousehold; toName: string }
	| { fate: 'delete'; household: AccountHousehold }
	| { fate: 'leave'; households: AccountHousehold[] };

/**
 * The recap — the pre-flight's own rows, read-only, with the triggers gone.
 *
 * The households you merely leave collapse into **one** row with their tiles
 * stacked. They are the only fate with nothing to say per household, and a row
 * each for three of them would give the least consequential outcome the most
 * space on the screen.
 */
export function recapRows(
	households: readonly AccountHousehold[],
	chosen: Readonly<Record<string, string>>
): RecapRow[] {
	const rows: RecapRow[] = [];
	const leaving: AccountHousehold[] = [];

	for (const h of households) {
		const fate = fateFor(h, chosen);

		if (fate === 'leave') { leaving.push(h); continue; }

		if (fate === 'delete') { rows.push({ fate: 'delete', household: h }); continue; }

		rows.push({
			fate: 'transfer',
			household: h,
			toName: h.candidates.find((c) => c.id === chosen[h.id])?.name ?? '',
		});
	}

	if (leaving.length > 0) rows.push({ fate: 'leave', households: leaving });

	return rows;
}

/** What a recap row says on its right — *Sarah Calfee owns it*, *Deleted · 34 items*. */
export function recapMeta(row: RecapRow): string {
	if (row.fate === 'transfer') return row.toName ? `${row.toName} owns it` : 'Handed over';
	if (row.fate === 'delete') return `Deleted · ${plural(row.household.items, 'item')}`;

	return 'You leave';
}

/**
 * The sentences on the card you land on afterwards.
 *
 * One per transferred household, because each names a different person, then
 * one covering everything that was deleted. **The last sentence is always
 * there**: there is no hold and nothing to undo, and the card is the only place
 * left to say so.
 */
export function goneCardLines(rows: readonly RecapRow[]): string[] {
	const lines: string[] = [];

	for (const row of rows) {
		if (row.fate !== 'transfer') continue;

		lines.push(row.toName
			? `${row.household.name} is ${possessive(row.toName)} now.`
			: `${row.household.name} has a new owner.`);
	}

	const deleted = rows.flatMap((r) => (r.fate === 'delete' ? [r.household.name] : []));

	if (deleted.length > 0) {
		lines.push(`${andList(deleted)} ${deleted.length === 1 ? 'has' : 'have'} been deleted.`);
	}

	lines.push('Nothing here is recoverable.');

	return lines;
}

/**
 * What the transfer confirmation says — the one outside deletion too (D68).
 *
 * **It names every capability they gain and the one you lose**, because that
 * second half is what separates this from promoting somebody. *Only they can
 * hand it back* is the sentence that makes it final, which is why the disc is
 * crimson on a dialog that destroys nothing.
 */
export function transferBody(toName: string, householdName: string): string {
	const who = toName || 'They';
	const name = householdName || 'this household';

	return `${who}’ll be able to rename ${name}, invite people, change roles, and remove members — ` +
		`including you. You become an Editor, and only ${toName ? firstWord(toName) : 'they'} can hand it back.`;
}

/** `Make Sarah Calfee the owner?` */
export function transferTitle(toName: string): string {
	return toName ? `Make ${toName} the owner?` : 'Hand this household over?';
}

function firstWord(name: string): string {
	return name.trim().split(/\s+/)[0] ?? name;
}

function cap(value: string): string {
	return value ? value[0].toUpperCase() + value.slice(1) : value;
}
