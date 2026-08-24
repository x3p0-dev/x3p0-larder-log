import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Plus, Search, Menu, ShoppingCart } from 'lucide-preact';

import { Sidebar } from './components/Sidebar';
import { StatusChip } from './components/StatusChip';
import { SortMenu } from './components/SortMenu';
import type { SortKey } from './components/SortMenu';
import { ItemFields } from './components/ItemFields';
import { ItemCard } from './components/ItemCard';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ShoppingListModal } from './components/ShoppingListModal';
import { UndoToast } from './components/UndoToast';

import { useSystemTheme } from './hooks/useSystemTheme';
import { usePersistentState } from './hooks/usePersistentState';

import { getTheme, statusFor } from './lib/theme';
import { DEFAULT_LOCATION_ICON, DEFAULT_TYPE_ICON } from './lib/icons';
import { makeTaxonomyActions } from './lib/taxonomy';
import type { TaxonomyActionSet } from './lib/actions';
import { newId } from './lib/id';
import { seedItems, seedCategories, seedTypes, seedStores, emptyItem } from './data/seed';

import type { StatusKey } from '../shared/status';
import type { Item, ItemDraft, Settings, Term } from '../shared/types';
import { fromInt, normalizeQty, toInt } from '../shared/qty';

const PAGE_SIZE = 20;
const UNDO_MS = 6000;

const STATUS_CHIPS: { key: StatusKey; label: string }[] = [
	{ key: 'ok', label: 'In stock' },
	{ key: 'low', label: 'Low' },
	{ key: 'out', label: 'Out' },
];

/**
 * Storage keys are namespaced by the signed-in identity, so signing out and
 * back in as someone else shows their pantry rather than the last one open on
 * this device. Versioned so a shape change (v3: string quantities, string ids,
 * accordion state lifted out of the row) starts clean rather than reviving data
 * the current code can't read.
 */
function keysFor(userId: string) {
	const prefix = `larder.v3.${userId}`;
	return {
		items: `${prefix}.items`,
		categories: `${prefix}.categories`,
		types: `${prefix}.types`,
		stores: `${prefix}.stores`,
		settings: `${prefix}.settings`,
	};
}

const DEFAULT_SETTINGS: Settings = { themeOverride: 'system', defaultThreshold: '1' };

type Props = {
	userId: string;
	displayName: string;
	email: string;
	onSignOut: () => void;
};

export function Pantry({ userId, displayName, email, onSignOut }: Props) {
	const KEYS = useMemo(() => keysFor(userId), [userId]);

	const systemDark = useSystemTheme();
	const [settings, setSettings] = usePersistentState<Settings>(KEYS.settings, DEFAULT_SETTINGS);
	const { themeOverride, defaultThreshold } = settings;
	const dark = themeOverride === 'system' ? systemDark : themeOverride === 'dark';
	const theme = getTheme(dark);

	// A first sign-in finds nothing stored and falls through to the seed, which
	// is what stands in for "create a household and seed its taxonomies" until
	// Phase 2 gives those a server to live on.
	const [items, setItems] = usePersistentState<Item[]>(KEYS.items, seedItems);
	const [categories, setCategories] = usePersistentState<Term[]>(KEYS.categories, seedCategories);
	const [types, setTypes] = usePersistentState<Term[]>(KEYS.types, seedTypes);
	const [stores, setStores] = usePersistentState<Term[]>(KEYS.stores, seedStores);

	const [activeCat, setActiveCat] = useState('All');
	const [activeType, setActiveType] = useState<string | null>(null);
	const [activeStore, setActiveStore] = useState<string | null>(null);
	const [activeStatus, setActiveStatus] = useState<StatusKey | null>(null);
	const [query, setQuery] = useState('');

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState<SortKey>('default');

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ItemDraft>({ ...emptyItem, category: seedCategories[2].name });
	const [formError, setFormError] = useState('');

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<ItemDraft | null>(null);

	// Accordion state is UI, not data — the row itself carries no `open` field.
	const [openId, setOpenId] = useState<string | null>(null);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	const [pendingRemoval, setPendingRemoval] = useState<Item | null>(null);
	const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const [shoppingListOpen, setShoppingListOpen] = useState(false);
	const [shoppingStore, setShoppingStore] = useState<string | null>(null);

	const setSetting = (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch }));

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
	const taxonomyActions: TaxonomyActionSet = {
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
		const counts: Record<StatusKey, number> = { ok: 0, low: 0, out: 0 };
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
		// Quantity sorts parse first: these are strings, and "10" sorts before
		// "2". The same rule will apply to the database in Phase 2.
		if (sortBy === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
		else if (sortBy === 'name-desc') arr.sort((a, b) => b.name.localeCompare(a.name));
		else if (sortBy === 'qty-asc') arr.sort((a, b) => toInt(a.qty) - toInt(b.qty));
		else if (sortBy === 'qty-desc') arr.sort((a, b) => toInt(b.qty) - toInt(a.qty));
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
			.sort((a, b) => (toInt(a.qty) <= 0 ? -1 : 1) - (toInt(b.qty) <= 0 ? -1 : 1));
	}, [items, shoppingStore, dark]);

	// --- Item actions ------------------------------------------------------

	function clearAllFilters() {
		setActiveCat('All'); setActiveType(null); setActiveStore(null); setActiveStatus(null); setQuery('');
	}

	function adjustQty(id: string, delta: number) {
		setItems((prev) => prev.map((it) => (
			it.id === id ? { ...it, qty: fromInt(Math.max(0, toInt(it.qty) + delta)) } : it
		)));
	}

	function toggleOpen(id: string) {
		// Accordion: opening one card closes the others.
		setOpenId((prev) => prev === id ? null : id);
		if (editingId === id) cancelEdit();
	}

	function removeItem(id: string) {
		const item = items.find((i) => i.id === id);
		if (! item) return;
		setItems((prev) => prev.filter((i) => i.id !== id));
		if (editingId === id) cancelEdit();
		if (openId === id) setOpenId(null);
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
			id: newId(),
			name: form.name.trim(),
			category: form.category || categories[0]?.name || '',
			types: form.types,
			stores: form.stores,
			qty: normalizeQty(form.qty),
			threshold: normalizeQty(form.threshold),
			notes: form.notes.trim(),
		}, ...prev]);
		setForm({ ...emptyItem, category: form.category, threshold: defaultThreshold });
		setFormError('');
		setShowForm(false);
	}

	function startEdit(item: Item) {
		setEditingId(item.id);
		setEditForm({
			name: item.name, category: item.category,
			types: [...item.types], stores: [...item.stores],
			qty: item.qty, threshold: item.threshold, notes: item.notes,
		});
	}

	function saveEdit(id: string) {
		if (! editForm || ! editForm.name.trim()) return;
		const draft = editForm;
		setItems((prev) => prev.map((it) => it.id === id ? {
			...it,
			name: draft.name.trim(),
			category: draft.category,
			types: draft.types,
			stores: draft.stores,
			qty: normalizeQty(draft.qty),
			threshold: normalizeQty(draft.threshold),
			notes: draft.notes.trim(),
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
		setOpenId(null);
		setShoppingStore(null);
		setSettingsOpen(false);
	}

	return (
		<div
			class="font-sans min-h-screen w-full transition-colors duration-200 overflow-x-hidden"
			style={{
				background: theme.pageBg,
				color: theme.text,
				colorScheme: dark ? 'dark' : 'light',
			}}
		>
			<header class="transition-colors duration-200">
				<div class="max-w-5xl mx-auto px-6 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
					<h1 class="font-disp text-lg sm:text-xl font-semibold leading-none" style={{ color: theme.textStrong }}>Larder Log</h1>
					<div class="flex items-center gap-2 flex-wrap">
						{STATUS_CHIPS.map(({ key, label }) => (
							<StatusChip
								key={key} statusKey={key} label={label} count={statusCounts[key]}
								active={activeStatus === key} dark={dark} theme={theme}
								onClick={() => setActiveStatus((prev) => prev === key ? null : key)}
							/>
						))}
						<button
							onClick={() => setSettingsOpen(true)}
							class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
							style={{ background: theme.neutralChipBg, color: theme.textFaint }}
							aria-label="Settings"
						>
							<Menu size={17} />
						</button>
					</div>
				</div>
			</header>

			<div class="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6">
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
					<div class="flex items-center gap-3 mb-4 flex-wrap">
						<div class="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[180px]" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<Search size={15} style={{ color: theme.textMuted }} />
							<input
								value={query}
								onInput={(e) => setQuery(e.currentTarget.value)}
								placeholder="Search items…"
								aria-label="Search items"
								class="text-sm outline-none flex-1 bg-transparent"
								style={{ color: theme.text }}
							/>
						</div>
						<button
							onClick={openAddForm}
							class="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5"
							style={{ background: theme.primaryBg, color: theme.primaryText }}
						>
							<Plus size={15} /> Add item
						</button>
					</div>

					{activeStore && (
						<div class="mb-4 flex items-center justify-between gap-2 px-3 py-2 rounded-md" style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}>
							<span class="text-xs" style={{ color: theme.textMuted }}>
								Filtering by <strong style={{ color: theme.text }}>{activeStore}</strong>
							</span>
							<button
								onClick={() => { setShoppingStore(activeStore); setShoppingListOpen(true); }}
								class="text-xs px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 shrink-0"
								style={{ background: theme.primaryBg, color: theme.primaryText }}
							>
								<ShoppingCart size={12} /> Shopping list
							</button>
						</div>
					)}

					{showForm && (
						<div class="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<ItemFields
								value={form} onChange={setForm} error={formError}
								categories={categories} types={types} stores={stores}
								onCreateCategory={categoryActions.create}
								onCreateType={typeActions.create}
								onCreateStore={storeActions.create}
								dark={dark} theme={theme}
							/>
							<div class="sm:col-span-2 flex gap-2 justify-end">
								<button
									type="button"
									onClick={() => { setShowForm(false); setFormError(''); }}
									class="px-3 py-2 rounded text-sm"
									style={{ color: theme.textMuted }}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={addItem}
									class="px-4 py-2 rounded text-sm font-medium"
									style={{ background: theme.inkBg, color: theme.inkText }}
								>
									Save item
								</button>
							</div>
						</div>
					)}

					<div class="flex items-center justify-between mb-2">
						<p class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textFaint }}>
							Showing {Math.min(visibleCount, sorted.length)} of {sorted.length}
						</p>
						<SortMenu open={sortMenuOpen} setOpen={setSortMenuOpen} sortBy={sortBy} setSortBy={setSortBy} theme={theme} />
					</div>

					<div class="flex flex-col gap-3">
						{sorted.length === 0 && (
							<p class="text-sm py-8 text-center" style={{ color: theme.textMuted }}>Nothing here yet.</p>
						)}

						{visibleItems.map((it) => (
							<ItemCard
								key={it.id}
								item={it} open={openId === it.id}
								categories={categories} types={types} stores={stores}
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
							<div ref={sentinelRef} class="py-4 text-center">
								<span class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textFaint }}>Loading more…</span>
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
				accountName={displayName} accountEmail={email} onSignOut={onSignOut}
				dark={dark} theme={theme}
			/>

			<ShoppingListModal
				open={shoppingListOpen} store={shoppingStore} items={shoppingItems}
				onClose={() => setShoppingListOpen(false)} dark={dark} theme={theme}
			/>
		</div>
	);
}
