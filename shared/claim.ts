/**
 * Claims — *I am getting this*, and who *I* is.
 *
 * **A check is a claim, not a write** (D64). What D66 adds is that it is
 * **shared**, and saying whose is the whole of it.
 *
 * D41 rejected sharing for what looked like a good reason: *a tick that means
 * "in my cart" cannot be read by someone else without saying whose.* So it says
 * whose — and the collision that rule was avoiding turns out to be the feature,
 * because **it is what stops the double-buy.** Two people at two shops was the
 * failure mode; it is now the case the screen is for.
 *
 * It lives in `shared/` for the reason `filter.ts` does: *is this mine* is a
 * question that still compiles when answered backwards, and hands back a screen
 * that looks right and lets you buy the butter twice.
 */

/**
 * Whoever holds a claim, as the row draws them.
 *
 * A name **and a picture**, because a person in this app has a face wherever
 * one exists (D55). The picture is `''` for an account with no Gravatar, which
 * is a real answer and not a missing one.
 */
export type ClaimOwner = {
	name: string;
	/** The Gravatar URL, or `''`. Never an address — see D55. */
	picture: string;
};

/** One person's intent to get one item, as the client receives it. */
export type Claim = {
	itemId: string;
	/** Whose. Resolved to a name and a face against the household's members. */
	userId: string;
	/** The trip it belongs to — what a put-away ends. */
	tripId: string;
};

/**
 * Who has claimed what, and whether it was you.
 *
 * A map rather than a list because every consumer asks *about this row*, and a
 * list would have every row scan every claim.
 */
export type ClaimIndex = {
	/** Item ids **you** have claimed — what the checkbox reads. */
	mine: ReadonlySet<string>;
	/** Item id to the `userId` of whoever else claimed it. */
	theirs: ReadonlyMap<string, string>;
};

/** An index with nothing in it, for the loading and viewer paths. */
export const NO_CLAIMS: ClaimIndex = { mine: new Set(), theirs: new Map() };

/**
 * Splits the household's live claims into yours and everybody else's.
 *
 * **The split is the load-bearing part**, not a convenience. `Hide N checked`,
 * `Put N away` and row 2's cart count are all **yours only**: somebody else's
 * rows stay visible because they are still on the list until she buys them, and
 * **you cannot put away something you do not have**.
 *
 * @param me `''` until the household query answers, which reads as *nothing is
 *           mine* — the safe direction, since the alternative is briefly
 *           offering to put away somebody else's shopping.
 */
export function indexClaims(claims: readonly Claim[], me: string): ClaimIndex {
	const mine = new Set<string>();
	const theirs = new Map<string, string>();

	for (const claim of claims) {
		if (me && claim.userId === me) mine.add(claim.itemId);
		// First writer wins, and there can only be one: the server refuses a
		// claim on a row somebody else holds.
		else if (! theirs.has(claim.itemId)) theirs.set(claim.itemId, claim.userId);
	}

	return { mine, theirs };
}

/**
 * The name the sentence uses — **the first one only**.
 *
 * A display name is whatever somebody typed, and in a real household it is
 * usually a full one: *In Justin Tadlock's cart* is twenty-four characters in a
 * slot that otherwise holds `have 0 · low at 4`, and it is clumsy to hear as
 * well as to fit. *In Justin's cart* is neither, and it is the design's own
 * sample row.
 *
 * Two members sharing a first name is the cost, and it is small: the tick
 * column has already said *somebody has this and it is not you*, which is the
 * half that stops a double-buy.
 */
export function firstName(name: string): string {
	return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * *In Sarah's cart* — what a claimed row says where its counts would be.
 *
 * **A possessive, because the row is about a person.** *Claimed by Sarah* is the
 * database's sentence; this is the one you would say in a kitchen.
 *
 * **It is the whole of the right-hand slot**, seen and heard: one span rather
 * than a visible name with a spoken twin beside it, because the words on screen
 * *are* the sentence a screen reader should hear. The row's accessible name ends
 * with the claim by simply reading what is there.
 *
 * **It only fits because the face moved.** With the avatar in the tick column
 * this slot holds words alone, and reduced to a first name the sentence is two
 * characters longer than a bare full name and some twenty-five pixels narrower
 * than the avatar-and-name pair it replaces.
 *
 * **No cart glyph, and that is a near miss worth recording.** The obvious way to
 * shorten the visible half was a face and a trolley — but the cart is already
 * the **shop kind's** glyph in this app (the band header, the segment tab, the
 * item card), so a third meaning would collide on the very screen that teaches
 * the first two. On a **Harvest** card it would be plainly wrong: she is
 * picking, not shopping.
 *
 * The fallback is deliberately not a name. A claim can outlive the moment its
 * owner's membership is readable — she leaves the household, or the query
 * answers in a different order — and *In someone's cart* is still true and still
 * stops the double-buy, which is the entire job. Inventing a name would not.
 */
export function claimPhrase(name: string): string {
	const first = firstName(name);

	return first ? `In ${possessive(first)} cart` : 'In someone else’s cart';
}

/**
 * `Sarah` → `Sarah’s`, `Chris` → `Chris’`.
 *
 * A curly apostrophe, matching every other possessive in the app. The `s`-ending
 * case is the one worth having: display names are whatever somebody typed, and
 * *Chris's* beside the app's own *Sarah’s* would read as two different hands.
 */
export function possessive(name: string): string {
	return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

/**
 * The initial on a claimed row's 18px avatar.
 *
 * The first letter of the first word that is one — `householdLetter`'s rule, and
 * for its reason: a leading emoji or a stray space should not become somebody's
 * face. `?` rather than an empty circle when there is nothing to take, because
 * the circle is what says *a person has this* and it has to draw either way.
 */
export function claimInitial(name: string): string {
	for (const word of name.trim().split(/\s+/)) {
		const letter = [...word].find((c) => /\p{L}/u.test(c));

		if (letter) return letter.toUpperCase();
	}

	return '?';
}
