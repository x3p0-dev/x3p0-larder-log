import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Menu, ShoppingCart } from 'lucide-react';

import { Sidebar } from './components/Sidebar.jsx';
import { StatusChip } from './components/StatusChip.jsx';
import { SortMenu } from './components/SortMenu.jsx';
import { ItemFields } from './components/ItemFields.jsx';
import { ItemCard } from './components/ItemCard.jsx';
import { SettingsDrawer } from './components/SettingsDrawer.jsx';
import { ShoppingListModal } from './components/ShoppingListModal.jsx';
import { UndoToast } from './components/UndoToast.jsx';

import { useSystemTheme } from './hooks/useSystemTheme.js';
import { usePersistentState } from './hooks/usePersistentState.js';

import { getTheme, statusFor } from './lib/theme.js';
import { DEFAULT_LOCATION_ICON, DEFAULT_TYPE_ICON } from './lib/icons.js';
import { makeTaxonomyActions } from './lib/taxonomy.js';
import { seedItems, seedCategories, seedTypes, seedStores, emptyItem } from './data/seed.js';

const PAGE_SIZE = 20;
const UNDO_MS = 6000;

// Versioned so a schema change (e.g. tags -> types + stores) starts clean
// rather than reviving data the current code can't read.
const KEYS = {
	items: 'larder.v2.items',
	categories: 'larder.v2.categories',
	types: 'larder.v2.types',
	stores: 'larder.v2.stores',
	settings: 'larder.v2.settings',
};

export default function App() {
	const systemDark = useSystemTheme();
	const [settings, setSettings] = usePersistentState(KEYS.settings, { themeOverride: 'system', defaultThreshold: 1 });
	const { themeOverride, defaultThreshold } = settings;
	const dark = themeOverride === 'system' ? systemDark : themeOverride === 'dark';
	const theme = getTheme(dark);

	const [items, setItems] = usePersistentState(KEYS.items, seedItems);
	const [categories, setCategories] = usePersistentState(KEYS.categories, seedCategories);
	const [types, setTypes] = usePersistentState(KEYS.types, seedTypes);
	const [stores, setStores] = usePersistentState(KEYS.stores, seedStores);

	const [activeCat, setActiveCat] = useState('All');
	const [activeType, setActiveType] = useState(null);
	const [activeStore, setActiveStore] = useState(null);
	const [activeStatus, setActiveStatus] = useState(null);
	const [query, setQuery] = useState('');

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState('default');

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ ...emptyItem, category: seedCategories[2].name });
	const [formError, setFormError] = useState('');

	const [editingId, setEditingId] = useState(null);
	const [editForm, setEditForm] = useState(null);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef(null);

	const [pendingRemoval, setPendingRemoval] = useState(null);
	const undoTimeoutRef = useRef(null);

	const [shoppingListOpen, setShoppingListOpen] = useState(false);
	const [shoppingStore, setShoppingStore] = useState(null);

	const setSetting = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

	// --- Taxonomy CRUD -----------------------------------------------------

	const categoryActions = makeTaxonomyActions({
		setList: setCategories, setItems,
		field: 'category', multi: false, defaultIcon: DEFAULT_LOCATION_ICON,
		onTermRenamed: (oldName, newName) => {
			setForm((f) => f.category === oldName ? { ...f, category: newName } : f);
			if (activeCat === oldName) setActiveCat(newName);
		},
		onTermDeleted: (name) => { if (activeCat === name) setActiveCat('All'); },
	});

	const typeActions = makeTaxonomyActions({
		setList: setTypes, setItems,
		field: 'types', multi: true, defaultIcon: DEFAULT_TYPE_ICON,
		onTermRenamed: (oldName, newName) => { if (activeType === oldName) setActiveType(newName); },
		onTermDeleted: (name) => { if (activeType === name) setActiveType(null); },
	});

	const storeActions = makeTaxonomyActions({
		setList: setStores, setItems,
		field: 'stores', multi: true,
		onTermRenamed: (oldName, newName) => {
			if (activeStore === oldName) setActiveStore(newName);
			if (shoppingStore === oldName) setShoppingStore(newName);
		},
		onTermDeleted: (name) => {
			if (activeStore === name) setActiveStore(null);
			if (shoppingStore === name) setShoppingStore(null);
		},
	});

	// Flattened for the components that need to create or manage terms.
	const taxonomyActions = {
		createCategory: categoryActions.create, renameCategory: categoryActions.rename,
		recolorCategory: categoryActions.recolor, deleteCategory: categoryActions.remove,
		createType: typeActions.create, renameType: typeActions.rename,
		recolorType: typeActions.recolor, deleteType: typeActions.remove,
		createStore: storeActions.create, renameStore: storeActions.rename,
		recolorStore: storeActions.recolor, deleteStore: storeActions.remove,
	};

	// --- Filtering / sorting -----------------------------------------------

	// Location/type/store/search only — the status chips count against this set
	// so their numbers don't collapse to zero once a status is picked.
	const preStatusFiltered = useMemo(() => items.filter((it) => {
		const matchesCat = activeCat === 'All' || it.category === activeCat;
		const matchesType = ! activeType || it.types.includes(activeType);
		const matchesStore = ! activeStore || it.stores.includes(activeStore);
		const matchesQuery = it.name.toLowerCase().includes(query.toLowerCase());
		return matchesCat && matchesType && matchesStore && matchesQuery;
	}), [items, activeCat, activeType, activeStore, query]);

	const statusCounts = useMemo(() => {
		const counts = { ok: 0, low: 0, out: 0 };
		preStatusFiltered.forEach((it) => { counts[statusFor(it.qty, it.threshold, dark).key]++; });
		return counts;
	}, [preStatusFiltered, dark]);

	const filtered = useMemo(() => (
		activeStatus
			? preStatusFiltered.filter((it) => statusFor(it.qty, it.threshold, dark).key === activeStatus)
			: preStatusFiltered
	), [preStatusFiltered, activeStatus, dark]);

	const sorted = useMemo(() => {
		const arr = [...filtered];
		if (sortBy === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
		else if (sortBy === 'name-desc') arr.sort((a, b) => b.name.localeCompare(a.name));
		else if (sortBy === 'qty-asc') arr.sort((a, b) => a.qty - b.qty);
		else if (sortBy === 'qty-desc') arr.sort((a, b) => b.qty - a.qty);
		return arr;
	}, [filtered, sortBy]);

	const visibleItems = sorted.slice(0, visibleCount);

	const catCounts = useMemo(() => Object.fromEntries(
		categories.map((cat) => [cat.name, items.filter((i) => i.category === cat.name).length])
	), [items, categories]);

	const anyFilterActive = Boolean(
		activeCat !== 'All' || activeType || activeStore || activeStatus || query.trim()
	);

	// Reset pagination whenever the active filter set changes.
	useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCat, activeType, activeStore, activeStatus, query]);

	// Infinite scroll: grow visibleCount when the sentinel enters the viewport.
	useEffect(() => {
		const el = sentinelRef.current;
		if (! el) return;
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length));
			}
		}, { rootMargin: '200px' });
		observer.observe(el);
		return () => observer.disconnect();
	}, [sorted.length, visibleCount]);

	// Don't leave the undo timer running after unmount.
	useEffect(() => () => clearTimeout(undoTimeoutRef.current), []);

	const shoppingItems = useMemo(() => {
		if (! shoppingStore) return [];
		return items
			.filter((it) => it.stores.includes(shoppingStore) && statusFor(it.qty, it.threshold, dark).key !== 'ok')
			.sort((a, b) => (a.qty <= 0 ? -1 : 1) - (b.qty <= 0 ? -1 : 1));
	}, [items, shoppingStore, dark]);

	// --- Item actions ------------------------------------------------------

	function clearAllFilters() {
		setActiveCat('All'); setActiveType(null); setActiveStore(null); setActiveStatus(null); setQuery('');
	}

	function adjustQty(id, delta) {
		setItems((prev) => prev.map((it) => it.id === id ? { ...it, qty: Math.max(0, it.qty + delta) } : it));
	}

	function toggleOpen(id) {
		// Accordion: opening one card closes the others.
		setItems((prev) => prev.map((it) => it.id === id ? { ...it, open: ! it.open } : { ...it, open: false }));
		if (editingId === id) cancelEdit();
	}

	function removeItem(id) {
		const item = items.find((i) => i.id === id);
		if (! item) return;
		setItems((prev) => prev.filter((i) => i.id !== id));
		if (editingId === id) cancelEdit();
		clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(item);
		undoTimeoutRef.current = setTimeout(() => setPendingRemoval(null), UNDO_MS);
	}

	function undoRemove() {
		if (! pendingRemoval) return;
		setItems((prev) => [pendingRemoval, ...prev]);
		clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(null);
	}

	function openAddForm() {
		if (! showForm) setForm((f) => ({ ...f, threshold: defaultThreshold }));
		setShowForm((s) => ! s);
	}

	function addItem() {
		if (! form.name.trim()) {
			setFormError('Give the item a name first.');
			return;
		}
		setItems((prev) => [{
			id: Date.now(),
			name: form.name.trim(),
			category: form.category || categories[0]?.name || '',
			types: form.types,
			stores: form.stores,
			qty: Number(form.qty) || 0,
			threshold: Number(form.threshold) || 0,
			notes: form.notes.trim(),
			open: false,
		}, ...prev]);
		setForm({ ...emptyItem, category: form.category, threshold: defaultThreshold });
		setFormError('');
		setShowForm(false);
	}

	function startEdit(item) {
		setEditingId(item.id);
		setEditForm({
			name: item.name, category: item.category,
			types: [...item.types], stores: [...item.stores],
			qty: item.qty, threshold: item.threshold, notes: item.notes,
		});
	}

	function saveEdit(id) {
		if (! editForm.name.trim()) return;
		setItems((prev) => prev.map((it) => it.id === id ? {
			...it,
			name: editForm.name.trim(),
			category: editForm.category,
			types: editForm.types,
			stores: editForm.stores,
			qty: Number(editForm.qty) || 0,
			threshold: Number(editForm.threshold) || 0,
			notes: editForm.notes.trim(),
		} : it));
		cancelEdit();
	}

	function cancelEdit() {
		setEditingId(null);
		setEditForm(null);
	}

	function resetToSampleData() {
		setItems(seedItems);
		setCategories(seedCategories);
		setTypes(seedTypes);
		setStores(seedStores);
		clearAllFilters();
		cancelEdit();
		setShoppingStore(null);
		setSettingsOpen(false);
	}

	return (
		<div
			className="min-h-screen w-full transition-colors duration-200 overflow-x-hidden"
			style={{
				background: theme.pageBg,
				fontFamily: "'Inter', system-ui, sans-serif",
				color: theme.text,
				colorScheme: dark ? 'dark' : 'light',
			}}
		>
			<header className="transition-colors duration-200">
				<div className="max-w-5xl mx-auto px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
					<h1 className="disp text-lg sm:text-xl font-semibold leading-none" style={{ color: theme.textStrong }}>Larder Log</h1>
					<div className="flex items-center gap-2 flex-wrap">
						{[
							{ key: 'ok', label: 'In stock' },
							{ key: 'low', label: 'Low' },
							{ key: 'out', label: 'Out' },
						].map(({ key, label }) => (
							<StatusChip
								key={key} statusKey={key} label={label} count={statusCounts[key]}
								active={activeStatus === key} dark={dark} theme={theme}
								onClick={() => setActiveStatus((prev) => prev === key ? null : key)}
							/>
						))}
						<button
							onClick={() => setSettingsOpen(true)}
							className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
							style={{ background: theme.neutralChipBg, color: theme.textFaint }}
							aria-label="Settings"
						>
							<Menu size={17} />
						</button>
					</div>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6">
				<Sidebar
					items={items} categories={categories} types={types} stores={stores}
					activeCat={activeCat} setActiveCat={setActiveCat}
					activeType={activeType} setActiveType={setActiveType}
					activeStore={activeStore} setActiveStore={setActiveStore}
					catCounts={catCounts} anyFilterActive={anyFilterActive} onClearAll={clearAllFilters}
					onCreateCategory={categoryActions.create}
					onCreateType={typeActions.create}
					onCreateStore={storeActions.create}
					theme={theme} dark={dark}
				/>

				<main>
					<div className="flex items-center gap-3 mb-4 flex-wrap">
						<div className="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[180px]" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<Search size={15} style={{ color: theme.textMuted }} />
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search items…"
								aria-label="Search items"
								className="text-sm outline-none flex-1 bg-transparent"
								style={{ color: theme.text }}
							/>
						</div>
						<button
							onClick={openAddForm}
							className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5"
							style={{ background: theme.primaryBg, color: theme.primaryText }}
						>
							<Plus size={15} /> Add item
						</button>
					</div>

					{activeStore && (
						<div className="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-md" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
							<span className="text-xs" style={{ color: theme.textMuted }}>
								Filtering by <strong style={{ color: theme.text }}>{activeStore}</strong>
							</span>
							<button
								onClick={() => { setShoppingStore(activeStore); setShoppingListOpen(true); }}
								className="text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 shrink-0"
								style={{ background: theme.primaryBg, color: theme.primaryText }}
							>
								<ShoppingCart size={12} /> Shopping list
							</button>
						</div>
					)}

					{showForm && (
						<div className="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<ItemFields
								value={form} onChange={setForm} error={formError}
								categories={categories} types={types} stores={stores}
								onCreateCategory={categoryActions.create}
								onCreateType={typeActions.create}
								onCreateStore={storeActions.create}
								dark={dark} theme={theme}
							/>
							<div className="sm:col-span-2 flex gap-2 justify-end">
								<button
									type="button"
									onClick={() => { setShowForm(false); setFormError(''); }}
									className="px-3 py-2 rounded text-sm"
									style={{ color: theme.textMuted }}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={addItem}
									className="px-4 py-2 rounded text-sm font-medium"
									style={{ background: theme.inkBg, color: theme.inkText }}
								>
									Save item
								</button>
							</div>
						</div>
					)}

					<div className="flex items-center justify-between mb-2">
						<p className="mono text-xs" style={{ color: theme.textFaint }}>
							Showing {Math.min(visibleCount, sorted.length)} of {sorted.length}
						</p>
						<SortMenu open={sortMenuOpen} setOpen={setSortMenuOpen} sortBy={sortBy} setSortBy={setSortBy} theme={theme} />
					</div>

					<div className="flex flex-col gap-3">
						{sorted.length === 0 && (
							<p className="text-sm py-8 text-center" style={{ color: theme.textMuted }}>Nothing here yet.</p>
						)}

						{visibleItems.map((it) => (
							<ItemCard
								key={it.id}
								item={it} categories={categories} types={types} stores={stores}
								dark={dark} theme={theme} taxonomyActions={taxonomyActions}
								editForm={editingId === it.id ? editForm : null}
								onEditFormChange={setEditForm}
								onToggleOpen={() => toggleOpen(it.id)}
								onAdjustQty={(delta) => adjustQty(it.id, delta)}
								onRemove={() => removeItem(it.id)}
								onStartEdit={() => startEdit(it)}
								onSaveEdit={() => saveEdit(it.id)}
								onCancelEdit={cancelEdit}
							/>
						))}

						{visibleCount < sorted.length && (
							<div ref={sentinelRef} className="py-4 text-center">
								<span className="mono text-xs" style={{ color: theme.textFaint }}>Loading more…</span>
							</div>
						)}
					</div>
				</main>
			</div>

			<UndoToast item={pendingRemoval} onUndo={undoRemove} theme={theme} />

			<SettingsDrawer
				open={settingsOpen} onClose={() => setSettingsOpen(false)}
				themeOverride={themeOverride} setThemeOverride={(v) => setSetting({ themeOverride: v })}
				defaultThreshold={defaultThreshold} setDefaultThreshold={(v) => setSetting({ defaultThreshold: v })}
				categories={categories} types={types} stores={stores} taxonomyActions={taxonomyActions}
				shoppingStore={shoppingStore} setShoppingStore={setShoppingStore}
				onViewShoppingList={() => { setShoppingListOpen(true); setSettingsOpen(false); }}
				onResetSampleData={resetToSampleData}
				dark={dark} theme={theme}
			/>

			<ShoppingListModal
				open={shoppingListOpen} store={shoppingStore} items={shoppingItems}
				onClose={() => setShoppingListOpen(false)} dark={dark} theme={theme}
			/>
		</div>
	);
}
