import { fallbackInk } from './theme';
import type { Item, Term } from '../../shared/types';

/** Minimal shape of a `useState` setter, so this module needn't import Preact. */
type Updater<T> = (next: T | ((prev: T) => T)) => void;

/** The item fields that hold a list of term names. */
type MultiField = 'types' | 'stores';

/** The item field that holds exactly one term name. */
type SingleField = 'category';

export type TaxonomyActions = {
	create(name: string, color?: string, icon?: string): void;
	rename(oldName: string, newName: string): void;
	recolor(name: string, color: string): void;
	remove(name: string): void;
};

type CommonOptions = {
	setList: Updater<Term[]>;
	setItems: Updater<Item[]>;
	defaultIcon?: string;
	onTermRenamed?: (oldName: string, newName: string) => void;
	onTermDeleted?: (name: string) => void;
};

type Options =
	| (CommonOptions & { field: MultiField; multi: true })
	| (CommonOptions & { field: SingleField; multi: false });

/**
 * Builds the create/rename/recolor/delete action set for one taxonomy
 * (locations, types, or stores). The three differ only in which item field they
 * write to and whether that field holds a single value or a list, so the CRUD
 * itself is shared.
 *
 * `field`  - the item property this taxonomy tags ('category', 'types', 'stores').
 * `multi`  - true when that property is an array of names.
 * `onTermRenamed` / `onTermDeleted` - extra bookkeeping the caller needs, e.g.
 *            keeping the active filter or the shopping-list choice in sync.
 */
export function makeTaxonomyActions(options: Options): TaxonomyActions {
	const { setList, setItems, defaultIcon, onTermRenamed, onTermDeleted } = options;

	return {
		create(name, color, icon) {
			if (! name) return;
			// The duplicate guard has to run against the latest list, not the
			// one captured when this action set was built.
			setList((prev) => prev.some((e) => e.name === name) ? prev : [...prev, {
				name,
				ink: color || fallbackInk(name),
				...(defaultIcon ? { icon: icon || defaultIcon } : {}),
			}]);
		},

		rename(oldName, newName) {
			if (! newName || newName === oldName) return;
			setList((prev) => prev.map((e) => e.name === oldName ? { ...e, name: newName } : e));
			setItems((prev) => prev.map((it) => {
				if (options.multi) {
					const field = options.field;
					return it[field].includes(oldName)
						? { ...it, [field]: it[field].map((n) => n === oldName ? newName : n) }
						: it;
				}
				const field = options.field;
				return it[field] === oldName ? { ...it, [field]: newName } : it;
			}));
			onTermRenamed?.(oldName, newName);
		},

		recolor(name, color) {
			setList((prev) => prev.map((e) => e.name === name ? { ...e, ink: color } : e));
		},

		remove(name) {
			setList((prev) => prev.filter((e) => e.name !== name));
			// Deleting a term never deletes items. Multi-value fields drop the
			// name; a single-value field keeps it, so the item still shows where
			// it lives even though the term is gone.
			if (options.multi) {
				const field = options.field;
				setItems((prev) => prev.map((it) => (
					it[field].includes(name) ? { ...it, [field]: it[field].filter((n) => n !== name) } : it
				)));
			}
			onTermDeleted?.(name);
		},
	};
}
