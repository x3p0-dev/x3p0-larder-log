import type { TaxonomyActions } from './taxonomy';

/**
 * The three taxonomies' CRUD, flattened into one object.
 *
 * Components that let a user create or manage terms (the item forms, the
 * settings drawer) need all three sets at once, and threading three separate
 * objects through every level was worse than naming the twelve callbacks.
 */
export type TaxonomyActionSet = {
	createCategory: TaxonomyActions['create'];
	renameCategory: TaxonomyActions['rename'];
	recolorCategory: TaxonomyActions['recolor'];
	deleteCategory: TaxonomyActions['remove'];

	createType: TaxonomyActions['create'];
	renameType: TaxonomyActions['rename'];
	recolorType: TaxonomyActions['recolor'];
	deleteType: TaxonomyActions['remove'];

	createStore: TaxonomyActions['create'];
	renameStore: TaxonomyActions['rename'];
	recolorStore: TaxonomyActions['recolor'];
	deleteStore: TaxonomyActions['remove'];
};
