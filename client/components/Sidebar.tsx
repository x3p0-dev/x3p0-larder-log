import { MapPin, Store as StoreIcon, UtensilsCrossed } from 'lucide-preact';

import { FacetSection } from './FacetSection';
import type { Theme } from '../lib/theme';
import type { Item, Term } from '../../shared/types';
import type { TaxonomyActions } from '../lib/actions';
import { createTermFor } from '../lib/actions';

/**
 * Every `active*` value is a term **id**, and `null` means "not filtering".
 *
 * Phase 1 used the literal string `'All'` as the no-filter sentinel for
 * location. That works when filters are names and breaks the moment they are
 * ids — and it was always one badly-named location away from a collision.
 */
type Props = {
	items: Item[];
	locations: Term[];
	types: Term[];
	stores: Term[];
	activeLocation: string | null;
	setActiveLocation: (id: string | null) => void;
	activeType: string | null;
	setActiveType: (id: string | null) => void;
	activeStore: string | null;
	setActiveStore: (id: string | null) => void;
	locationCounts: Record<string, number>;
	anyFilterActive: boolean;
	onClearAll: () => void;
	taxonomy: TaxonomyActions;
	/** `taxonomy:write`. A viewer filters by terms but cannot mint them. */
	canCreateTerms: boolean;
	theme: Theme;
	dark: boolean;
};

export function Sidebar({
	items, locations, types, stores,
	activeLocation, setActiveLocation, activeType, setActiveType, activeStore, setActiveStore,
	locationCounts, anyFilterActive, onClearAll, taxonomy, canCreateTerms,
	theme, dark,
}: Props) {
	return (
		<aside>
			<FacetSection
				title="Location" kind="location" Icon={MapPin} entities={locations}
				active={activeLocation}
				onSelect={setActiveLocation}
				onCreate={createTermFor(taxonomy, 'location')} canCreate={canCreateTerms}
				theme={theme} dark={dark} defaultOpen clearable={false}
				leadingAll={{ label: 'All items', count: items.length, active: activeLocation === null, onClick: () => setActiveLocation(null) }}
				countFor={(id) => locationCounts[id] || 0}
			/>

			{/* Store & Type collapse by default, so the sidebar stays short when not in use. */}
			<FacetSection
				title="Store" kind="store" Icon={StoreIcon} entities={stores}
				active={activeStore} onSelect={setActiveStore} onCreate={createTermFor(taxonomy, 'store')}
				canCreate={canCreateTerms} theme={theme} dark={dark}
			/>
			<FacetSection
				title="Type" kind="type" Icon={UtensilsCrossed} entities={types}
				active={activeType} onSelect={setActiveType} onCreate={createTermFor(taxonomy, 'type')}
				canCreate={canCreateTerms} theme={theme} dark={dark}
			/>

			{anyFilterActive && (
				<button onClick={onClearAll} class="mt-5 text-xs underline" style={{ color: theme.textFaint }}>
					Clear all filters
				</button>
			)}
		</aside>
	);
}
