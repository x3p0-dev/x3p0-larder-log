import { fallbackInk } from './theme.js';

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
export function makeTaxonomyActions({ setList, setItems, field, multi, defaultIcon, onTermRenamed, onTermDeleted }) {
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
				if (multi) {
					return it[field].includes(oldName)
						? { ...it, [field]: it[field].map((n) => n === oldName ? newName : n) }
						: it;
				}
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
			if (multi) {
				setItems((prev) => prev.map((it) => (
					it[field].includes(name) ? { ...it, [field]: it[field].filter((n) => n !== name) } : it
				)));
			}
			onTermDeleted?.(name);
		},
	};
}
