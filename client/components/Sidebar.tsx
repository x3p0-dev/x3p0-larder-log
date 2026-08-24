import { MapPin, Store as StoreIcon, UtensilsCrossed } from 'lucide-preact';

import { FacetSection } from './FacetSection';
import type { Theme } from '../lib/theme';
import type { Item, Term } from '../../shared/types';

type CreateTerm = (name: string, color?: string, icon?: string) => void;

type Props = {
	items: Item[];
	categories: Term[];
	types: Term[];
	stores: Term[];
	activeCat: string;
	setActiveCat: (name: string) => void;
	activeType: string | null;
	setActiveType: (name: string | null) => void;
	activeStore: string | null;
	setActiveStore: (name: string | null) => void;
	catCounts: Record<string, number>;
	anyFilterActive: boolean;
	onClearAll: () => void;
	onCreateCategory: CreateTerm;
	onCreateType: CreateTerm;
	onCreateStore: CreateTerm;
	theme: Theme;
	dark: boolean;
};

export function Sidebar({
	items, categories, types, stores,
	activeCat, setActiveCat, activeType, setActiveType, activeStore, setActiveStore,
	catCounts, anyFilterActive, onClearAll,
	onCreateCategory, onCreateType, onCreateStore,
	theme, dark,
}: Props) {
	return (
		<aside>
			<FacetSection
				title="Location" kind="location" Icon={MapPin} entities={categories}
				active={activeCat === 'All' ? null : activeCat}
				onSelect={(name) => setActiveCat(name || 'All')}
				onCreate={onCreateCategory}
				theme={theme} dark={dark} defaultOpen clearable={false}
				leadingAll={{ label: 'All items', count: items.length, active: activeCat === 'All', onClick: () => setActiveCat('All') }}
				countFor={(name) => catCounts[name] || 0}
			/>

			{/* Store & Type collapse by default, so the sidebar stays short when not in use. */}
			<FacetSection
				title="Store" kind="store" Icon={StoreIcon} entities={stores}
				active={activeStore} onSelect={setActiveStore} onCreate={onCreateStore}
				theme={theme} dark={dark}
			/>
			<FacetSection
				title="Type" kind="type" Icon={UtensilsCrossed} entities={types}
				active={activeType} onSelect={setActiveType} onCreate={onCreateType}
				theme={theme} dark={dark}
			/>

			{anyFilterActive && (
				<button onClick={onClearAll} class="mt-5 text-xs underline" style={{ color: theme.textFaint }}>
					Clear all filters
				</button>
			)}
		</aside>
	);
}
