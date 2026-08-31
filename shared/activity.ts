/**
 * The audit log's vocabulary, and the one thing it has to encode.
 *
 * In `shared/` because the server writes every row and the client renders every
 * row, and a log whose two halves disagree about what an action is called is a
 * log that reads as corrupt. `shared/` imports nothing, so `npm test` can assert
 * the encoding without a running capsule.
 *
 * **What belongs here and what does not.** The log records **administration** —
 * things done to a household or an account from the console. Nothing a
 * household does to its own pantry appears in it: adding an item is not
 * administration, and a console that logged it would be the surveillance the
 * household page refuses to be.
 *
 * **It also does not record where you were.** No address, no device, no
 * session. An address is a location and this is a log of actions — the same
 * instinct that keeps items off the household page. If that turns out to be too
 * little during a real incident it is a decision to revisit out loud, not a
 * field to add quietly.
 */

/**
 * What happened. A stable slug, stored — never a sentence.
 *
 * D32's rule about term colours, applied to a log: what is written down must
 * survive us changing what it prints. A row that stored *"Changed Nora's role
 * to Editor"* could never be reworded, translated, or read by anything but a
 * human eye.
 */
export const ACTIONS = [
	'household.delete',
	'household.transfer',
	'member.role',
	'member.remove',
	'invite.revoke',
	'account.delete',
	/**
	 * Reserved and **not written by anything**. An administrator is named in
	 * `LARDER_ADMIN_IDS` (D62), which changes outside this app entirely — so the
	 * log is the only place a grant could ever show up, and detecting one would
	 * mean storing the last-seen list to diff against. It is in the vocabulary
	 * because the client can then render it the day something does, and because
	 * leaving it out would make the omission invisible.
	 */
	'admin.grant',
] as const;

export type ActivityAction = typeof ACTIONS[number];

export function isAction(value: string): value is ActivityAction {
	return (ACTIONS as readonly string[]).indexOf(value) !== -1;
}

/**
 * Who did it.
 *
 * **Two actors are not people**, and both are drawn with a blank disc and an
 * italic label so a row is never attributed to somebody who did not do it.
 * Neither is written yet: `automatic` waits on a deletion hold, and `system`
 * on the grant detection above. They are here so the renderer handles them from
 * the first row rather than being taught later.
 */
export const ACTOR_KINDS = ['person', 'automatic', 'system'] as const;

export type ActorKind = typeof ACTOR_KINDS[number];

export function toActorKind(value: string): ActorKind {
	return (ACTOR_KINDS as readonly string[]).indexOf(value) !== -1
		? value as ActorKind
		: 'person';
}

/** What the row is about. `household` and `account` are the only two so far. */
export const TARGET_KINDS = ['household', 'account', 'membership', 'invite'] as const;

export type TargetKind = typeof TARGET_KINDS[number];

/**
 * How long audit rows are kept, and where that number comes from.
 *
 * **It is an environment variable, and it is deliberately not a control in the
 * console.** The design makes retention the console's one real setting, paired
 * with export, on the grounds that they are one question: how long do you keep
 * this, and how do you get it out.
 *
 * Reading is not destroying, so export stays. Retention does not, and the
 * argument is D62's own, one shape along: **an administrator who can shorten
 * retention can erase the record of what administrators did.** Dropping it from
 * 24 months to one deletes twenty-three months of history, with the deletion
 * itself being the only thing the log would have to say about it. That is the
 * same failure as a console that could mint administrators — one compromised
 * account away from being the only account — and it gets the same answer: the
 * dangerous knob is set out of band, beside `LARDER_ADMIN_IDS`, and the console
 * only reports it.
 *
 * Absent, unparseable and out-of-range all fall back to the default rather than
 * refusing, because a log that stops working over a typo in an environment
 * variable is worse than one that keeps its rows a little longer than intended.
 * **Zero is a valid answer and means keep nothing**; the floor is what stops a
 * negative from reading as "keep forever" through the arithmetic below.
 */
export const RETENTION_DEFAULT_MONTHS = 24;
export const RETENTION_MAX_MONTHS = 120;
export const RETENTION_VAR = 'LARDER_RETENTION_MONTHS';

export function toRetentionMonths(raw: string | undefined | null): number {
	if (raw === undefined || raw === null || raw.trim() === '') return RETENTION_DEFAULT_MONTHS;

	const n = Number(raw.trim());

	if (! Number.isFinite(n)) return RETENTION_DEFAULT_MONTHS;

	const whole = Math.floor(n);

	if (whole < 0 || whole > RETENTION_MAX_MONTHS) return RETENTION_DEFAULT_MONTHS;

	return whole;
}

/**
 * The stamp below which a row has expired, as an ISO string.
 *
 * Months rather than days, walked by subtracting from a month number — the same
 * arithmetic `monthKeysBack` uses and for the same reason: stepping a `Date`
 * back by a month lands on the 31st of a 30-day month and skips one.
 *
 * The day-of-month is clamped, so 31 August minus one month is 31 July and
 * 31 March minus one month is 28 (or 29) February rather than 3 March. A
 * retention cutoff that overshoots by three days deletes three days of records
 * nobody asked it to.
 */
export function retentionCutoff(nowIso: string, months: number): string {
	const t = Date.parse(nowIso);

	if (! Number.isFinite(t) || months < 0) return '';

	const now = new Date(t);
	const total = now.getUTCFullYear() * 12 + now.getUTCMonth() - months;
	const year = Math.floor(total / 12);
	const month = ((total % 12) + 12) % 12;
	// Day 0 of the *next* month is the last day of this one.
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
	const day = Math.min(now.getUTCDate(), lastDay);

	return new Date(Date.UTC(
		year, month, day,
		now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()
	)).toISOString();
}

/**
 * What a deleted thing held, at the moment it went.
 *
 * **A deletion entry has to denormalise and nothing else does.** Every other
 * row can point at a household or an account that still exists; a deletion row
 * is the only surviving record of the thing it describes, so it carries its own
 * copy — the name, the colour, the id, and these counts as they stood. A
 * foreign key here would resolve to nothing.
 *
 * It is **one JSON string in one column**, and that is a platform constraint
 * rather than a preference: Zero has no array or JSON type, and no numeric type
 * either. The alternative is five string columns that only one action ever
 * fills, which is five permanent columns (D44 — a column is forever and nothing
 * backfills) bought for one row shape. One column with a documented encoding
 * and a guarded decoder is the smaller commitment.
 */
export type Held = {
	items?: number;
	locations?: number;
	stores?: number;
	types?: number;
	members?: number;
	households?: number;
};

const HELD_KEYS: (keyof Held)[] = ['items', 'locations', 'stores', 'types', 'members', 'households'];

export function encodeHeld(held: Held): string {
	const out: Record<string, number> = {};

	for (const key of HELD_KEYS) {
		const value = held[key];

		// Only real, finite, non-negative counts. A `NaN` would serialise as
		// `null` and come back as a key that exists and means nothing.
		if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
			out[key] = Math.floor(value);
		}
	}

	return Object.keys(out).length > 0 ? JSON.stringify(out) : '';
}

/**
 * Reads a stored `held` back, and **never throws**.
 *
 * A row is written once and read forever, so this has to survive `''` (every
 * non-deletion row), a value written by a future version with keys this one has
 * never heard of, and a genuinely corrupt string. It returns what it can
 * recognize and drops the rest — a log entry that renders three of its four
 * counts is worth more than one that renders a stack trace.
 */
export function decodeHeld(raw: string): Held {
	if (! raw) return {};

	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}

	if (! parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

	const source = parsed as Record<string, unknown>;
	const out: Held = {};

	for (const key of HELD_KEYS) {
		const value = source[key];

		if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
			out[key] = Math.floor(value);
		}
	}

	return out;
}

/** `41 items · 4 locations · 3 stores`. Empty when there is nothing to say. */
export function heldPhrase(held: Held): string {
	const parts: string[] = [];

	for (const key of HELD_KEYS) {
		const value = held[key];

		if (value === undefined) continue;

		parts.push(`${value.toLocaleString()} ${value === 1 ? SINGULAR[key] : key}`);
	}

	return parts.join(' · ');
}

const SINGULAR: Record<keyof Held, string> = {
	items: 'item',
	locations: 'location',
	stores: 'store',
	types: 'type',
	members: 'member',
	households: 'household',
};

/**
 * The sentence a row reads as, in the list.
 *
 * Assembled from the slug and the two names rather than stored, which is the
 * whole reason the slug is stored: this can be reworded tomorrow and every row
 * ever written reads the new way.
 *
 * The actor is **not** in it — the row draws the actor as a face and a name of
 * its own, and repeating it here would make every line start with the same
 * word.
 */
export function actionPhrase(
	action: string,
	target: string,
	from: string,
	to: string
): string {
	const name = target || 'something that is gone';

	switch (action) {
		case 'household.delete':
			return `deleted the household ${name}`;
		case 'household.transfer':
			return to
				? `handed ${name} over to ${to}`
				: `handed ${name} over`;
		case 'member.role':
			return from && to
				? `changed ${name} from ${from} to ${to}`
				: `changed ${name}’s role`;
		case 'member.remove':
			return `removed ${name} from ${to || 'a household'}`;
		case 'invite.revoke':
			return `revoked ${from ? `a ${from} invite` : 'an invite'} to ${to || 'a household'}`;
		case 'account.delete':
			return `deleted ${name}’s account`;
		case 'admin.grant':
			return `was made an administrator`;
		default:
			// An action written by a version that knew more than this one. It is
			// still a row with a time and a person on it, which is most of what a
			// log entry is for.
			return `did something this version does not recognize (${action})`;
	}
}

/** The heading over an opened entry. Short, and it names the kind of event. */
export function actionTitle(action: string): string {
	switch (action) {
		case 'household.delete': return 'Household deleted';
		case 'household.transfer': return 'Ownership transferred';
		case 'member.role': return 'Role changed';
		case 'member.remove': return 'Member removed';
		case 'invite.revoke': return 'Invite revoked';
		case 'account.delete': return 'Account deleted';
		case 'admin.grant': return 'Administrator granted';
		default: return 'Unrecognized action';
	}
}

/** Whether this row's target no longer exists, so the card says so on its face. */
export function isDestructive(action: string): boolean {
	return action === 'household.delete' || action === 'account.delete';
}
