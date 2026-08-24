import { MapPin, Store as StoreIcon, UtensilsCrossed } from 'lucide-react';
import { FacetSection } from './FacetSection.jsx';

export function Sidebar({
	items, categories, types, stores,
	activeCat, setActiveCat, activeType, setActiveType, activeStore, setActiveStore,
	catCounts, anyFilterActive, onClearAll,
	onCreateCategory, onCreateType, onCreateStore,
	theme, dark,
}) {
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
				<button onClick={onClearAll} className="mt-5 text-xs underline" style={{ color: theme.textFaint }}>
					Clear all filters
				</button>
			)}
		</aside>
	);
}
