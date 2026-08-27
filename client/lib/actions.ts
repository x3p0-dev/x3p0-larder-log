import type { Stamps, TermDraft, TermKind } from '../../shared/types';

/**
 * Taxonomy CRUD, as the components below `Pantry` receive it.
 *
 * Phase 1 flattened this into twelve callbacks — `createCategory`,
 * `renameType`, `recolorStore`, and so on — because each taxonomy kept its own
 * client-side list and its own mutation closure. Now all three are the same
 * three server mutations parameterized by kind, so the twelve collapse to
 * three and the `kind` travels as an argument.
 */
export type TaxonomyActions = {
	/**
	 * Resolves to the new term's id, or null if the server refused.
	 *
	 * `stamps` is supplied by **undo only**, carrying the deleted term's own
	 * `addedAt` / `changedAt` so the restored row is not a brand-new one wearing
	 * the same name (D44). Everything else omits it and the server stamps now.
	 */
	create: (kind: TermKind, draft: TermDraft, stamps?: Stamps) => Promise<string | null>;
	update: (kind: TermKind, id: string, patch: { name?: string; ink?: string }) => Promise<void>;
	/** True when the term is really gone — what arms its undo toast. */
	remove: (kind: TermKind, id: string) => Promise<boolean>;
};


/**
 * One taxonomy's filter, as the drawer and the rail receive it.
 *
 * Three props rather than the six a `value` / `setValue` pair per group would
 * cost, and it names the two things a filter surface can actually do: toggle
 * one term, or drop the group. **There is no "set to exactly this"** — that is
 * a third verb neither surface needs and the one that would quietly reintroduce
 * single-select.
 */
export type TermFilter = {
	/** Selected term ids. Empty means this group filters nothing. */
	ids: readonly string[];
	/** Adds the term if it is off, removes it if it is on. */
	toggle: (id: string) => void;
	/** Drops every term in this group — what the *All items* chip does. */
	clear: () => void;
};
