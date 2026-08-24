import type { TermKind } from '../../shared/types';

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
	/** Resolves to the new term's id, or null if the server refused. */
	create: (kind: TermKind, draft: { name: string; ink: string; icon?: string }) => Promise<string | null>;
	update: (kind: TermKind, id: string, patch: { name?: string; ink?: string; icon?: string }) => Promise<void>;
	remove: (kind: TermKind, id: string) => Promise<void>;
};

/**
 * Adapts `TaxonomyActions.create` to the `(name, color, icon)` shape
 * `ChipPicker` passes, for one kind.
 */
export function createTermFor(actions: TaxonomyActions, kind: TermKind) {
	return (name: string, color?: string, icon?: string) =>
		actions.create(kind, { name, ink: color ?? '', icon });
}
