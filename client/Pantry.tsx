import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Plus, Search, Menu, ShoppingCart, X } from 'lucide-preact';

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
import { usePantryData } from './hooks/usePantryData';

import { getTheme, statusFor, termNameFor } from './lib/theme';
import type { TaxonomyActions } from './lib/actions';

import type { StatusKey } from '../shared/status';
import type { Item, ItemDraft, ThemeOverride } from '../shared/types';
import { toInt } from '../shared/qty';

const PAGE_SIZE = 20;
const UNDO_MS = 6000;

const STATUS_CHIPS: { key: StatusKey; label: string }[] = [
	{ key: 'ok', label: 'In stock' },
	{ key: 'low', label: 'Low' },
	{ key: 'out', label: 'Out' },
];

/**
 * The theme override is the **only** thing still in localStorage, and
 * deliberately so: a dark-mode choice made on a phone should not follow you to
 * a desktop. Everything else now lives in the database (D25).
 *
 * Namespaced per identity so signing in as someone else picks up their choice.
 */
function themeKeyFor(userId: string) {
	return `larder.v4.${userId}.theme`;
}

type Props = {
	userId: string;
	displayName: string;
	email: string;
	onSignOut: () => void;
};

export function Pantry({ userId, displayName, email, onSignOut }: Props) {
	const systemDark = useSystemTheme();
	const themeKey = useMemo(() => themeKeyFor(userId), [userId]);
	const [themeOverride, setThemeOverride] = usePersistentState<ThemeOverride>(themeKey, 'system');

	const dark = themeOverride === 'system' ? systemDark : themeOverride === 'dark';
	const theme = getTheme(dark);

	const api = usePantryData();

	// Filters and view state are all client-side; none of it is data.
	const [activeLocation, setActiveLocation] = useState<string | null>(null);
	const [activeType, setActiveType] = useState<string | null>(null);
	const [activeStore, setActiveStore] = useState<string | null>(null);
	const [activeStatus, setActiveStatus] = useState<StatusKey | null>(null);
	const [search, setSearch] = useState('');

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState<SortKey>('default');

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ItemDraft | null>(null);
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<ItemDraft | null>(null);

	// Accordion state is UI, not data — the row itself carries no `open` field.
	const [openId, setOpenId] = useState<string | null>(null);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	/**
	 * D17: undo is a client-held tombstone, not a soft delete.
	 *
	 * The removed row is kept here for the length of the window and re-inserted
	 * by re-running `addItem`. That means undo produces a **new row id** and
	 * does not survive a reload — both accepted, because the alternative is a
	 * `deletedAt` column every query in the app would have to filter forever.
	 */
	const [pendingRemoval, setPendingRemoval] = useState<Item | null>(null);
	const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const [shoppingListOpen, setShoppingListOpen] = useState(false);
	const [shoppingStore, setShoppingStore] = useState<string | null>(null);

	const ready = api.status.state === 'ready' ? api.status : null;
	const pantry = ready?.pantry;
	const household = ready?.household;

	const items = pantry?.items ?? [];
	const locations = pantry?.locations ?? [];
	const types = pantry?.types ?? [];
	const stores = pantry?.stores ?? [];
	const defaultThreshold = household?.household.defaultThreshold ?? '1';
	const householdName = household?.household.name ?? '';

	const taxonomy: TaxonomyActions = useMemo(() => ({
		create: api.createTerm,
		update: api.updateTerm,
		remove: api.deleteTerm,
	}), [api.createTerm, api.updateTerm, api.deleteTerm]);

	// --- Filtering / sorting -----------------------------------------------

	// Location/type/store/search only — the status chips count against this set
	// so their numbers don't collapse to zero once a status is picked.
	const preStatusFiltered = useMemo(() => items.filter((it) => {
		const matchesLocation = ! activeLocation || it.locationId === activeLocation;
		const matchesType = ! activeType || it.typeIds.includes(activeType);
		const matchesStore = ! activeStore || it.storeIds.includes(activeStore);
		const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase());
		return matchesLocation && matchesType && matchesStore && matchesSearch;
	}), [items, activeLocation, activeType, activeStore, search]);

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
		// "2". The database can't sort them either, for the same reason (D4).
		if (sortBy === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
		else if (sortBy === 'name-desc') arr.sort((a, b) => b.name.localeCompare(a.name));
		else if (sortBy === 'qty-asc') arr.sort((a, b) => toInt(a.qty) - toInt(b.qty));
		else if (sortBy === 'qty-desc') arr.sort((a, b) => toInt(b.qty) - toInt(a.qty));
		return arr;
	}, [filtered, sortBy]);

	const visibleItems = sorted.slice(0, visibleCount);

	const locationCounts = useMemo(() => Object.fromEntries(
		locations.map((loc) => [loc.id, items.filter((i) => i.locationId === loc.id).length])
	), [items, locations]);

	const anyFilterActive = Boolean(
		activeLocation || activeType || activeStore || activeStatus || search.trim()
	);

	// Reset pagination whenever the active filter set changes.
	useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeLocation, activeType, activeStore, activeStatus, search]);

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

	/**
	 * A filter pointing at a term someone else just deleted would silently hide
	 * every item. Live queries make that a real race, not a hypothetical.
	 */
	useEffect(() => {
		if (activeLocation && ! locations.some((l) => l.id === activeLocation)) setActiveLocation(null);
		if (activeType && ! types.some((t) => t.id === activeType)) setActiveType(null);
		if (activeStore && ! stores.some((s) => s.id === activeStore)) setActiveStore(null);
		if (shoppingStore && ! stores.some((s) => s.id === shoppingStore)) setShoppingStore(null);
	}, [locations, types, stores, activeLocation, activeType, activeStore, shoppingStore]);

	const shoppingItems = useMemo(() => {
		if (! shoppingStore) return [];
		return items
			.filter((it) => it.storeIds.includes(shoppingStore) && statusFor(it.qty, it.threshold, dark).key !== 'ok')
			.sort((a, b) => (toInt(a.qty) <= 0 ? -1 : 1) - (toInt(b.qty) <= 0 ? -1 : 1));
	}, [items, shoppingStore, dark]);

	// --- Item actions ------------------------------------------------------

	function clearAllFilters() {
		setActiveLocation(null); setActiveType(null); setActiveStore(null);
		setActiveStatus(null); setSearch('');
	}

	function toggleOpen(id: string) {
		// Accordion: opening one card closes the others.
		setOpenId((prev) => prev === id ? null : id);
		if (editingId === id) cancelEdit();
	}

	async function removeItem(id: string) {
		const item = items.find((i) => i.id === id);
		if (! item) return;

		if (editingId === id) cancelEdit();
		if (openId === id) setOpenId(null);

		await api.removeItem(id);

		clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(item);
		undoTimeoutRef.current = setTimeout(() => setPendingRemoval(null), UNDO_MS);
	}

	async function undoRemove() {
		if (! pendingRemoval) return;

		const restore = pendingRemoval;
		clearTimeout(undoTimeoutRef.current);
		setPendingRemoval(null);

		// Re-insert rather than un-delete. The row comes back with a new id
		// (D17), which nothing references.
		await api.addItem({
			name: restore.name,
			locationId: restore.locationId,
			typeIds: restore.typeIds,
			storeIds: restore.storeIds,
			qty: restore.qty,
			threshold: restore.threshold,
			notes: restore.notes,
		});
	}

	function emptyDraft(): ItemDraft {
		return {
			name: '',
			locationId: activeLocation ?? locations[0]?.id ?? '',
			typeIds: [],
			storeIds: [],
			qty: '1',
			threshold: defaultThreshold,
			notes: '',
		};
	}

	function openAddForm() {
		if (! showForm) {
			setForm(emptyDraft());
			setFormError('');
		}
		setShowForm((s) => ! s);
	}

	async function addItem() {
		if (! form) return;

		if (! form.name.trim()) {
			setFormError('Give the item a name first.');
			return;
		}

		if (! form.locationId) {
			setFormError('Pick a location first.');
			return;
		}

		setSaving(true);
		const id = await api.addItem(form);
		setSaving(false);

		// The server refused. `api.error` already says why, so keep the draft
		// rather than discarding what was typed.
		if (! id) return;

		setForm(emptyDraft());
		setFormError('');
		setShowForm(false);
	}

	function startEdit(item: Item) {
		setEditingId(item.id);
		setEditForm({
			name: item.name,
			locationId: item.locationId,
			typeIds: [...item.typeIds],
			storeIds: [...item.storeIds],
			qty: item.qty,
			threshold: item.threshold,
			notes: item.notes,
		});
	}

	async function saveEdit(id: string) {
		if (! editForm || ! editForm.name.trim()) return;

		await api.updateItem(id, editForm);
		cancelEdit();
	}

	function cancelEdit() {
		setEditingId(null);
		setEditForm(null);
	}

	// --- Non-ready states ---------------------------------------------------

	if (api.status.state !== 'ready') {
		return (
			<Gate
				status={api.status}
				dark={dark}
				onCreateHousehold={api.createHousehold}
				onSignOut={onSignOut}
			/>
		);
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
					{/*
					  * The household name sits under the app name rather than
					  * replacing it. The schema has always been multi-household
					  * (D3), so once a switcher exists this line is what tells
					  * two of them apart — it needs a home before then.
					  */}
					<div class="min-w-0">
						<h1 class="font-disp text-lg sm:text-xl font-semibold leading-none" style={{ color: theme.textStrong }}>Larder Log</h1>
						{householdName && (
							<p class="font-mono tracking-[0.02em] text-xs mt-1 truncate" style={{ color: theme.textFaint }}>
								{householdName}
							</p>
						)}
					</div>
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

			{/*
			  * Mutation failures are the only server errors that reach the client
			  * at all — a query that fails never emits — and every message a
			  * handler throws is written to be read by a person.
			  */}
			{api.error && (
				<div class="max-w-5xl mx-auto px-6">
					<div
						role="alert"
						class="flex items-start justify-between gap-3 px-3 py-2 rounded-md text-sm mb-1"
						style={{
							background: theme.surfaceAlt,
							color: theme.dangerText,
							border: `1px solid ${theme.dangerText}`,
						}}
					>
						<span>{api.error}</span>
						<button onClick={api.dismissError} aria-label="Dismiss" class="shrink-0">
							<X size={15} />
						</button>
					</div>
				</div>
			)}

			<div class="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6">
				<Sidebar
					items={items} locations={locations} types={types} stores={stores}
					activeLocation={activeLocation} setActiveLocation={setActiveLocation}
					activeType={activeType} setActiveType={setActiveType}
					activeStore={activeStore} setActiveStore={setActiveStore}
					locationCounts={locationCounts} anyFilterActive={anyFilterActive} onClearAll={clearAllFilters}
					taxonomy={taxonomy}
					theme={theme} dark={dark}
				/>

				<main>
					<div class="flex items-center gap-3 mb-4 flex-wrap">
						<div class="flex items-center gap-2 px-3 py-2 rounded-md flex-1 min-w-[180px]" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<Search size={15} style={{ color: theme.textMuted }} />
							<input
								value={search}
								onInput={(e) => setSearch(e.currentTarget.value)}
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
								Filtering by <strong style={{ color: theme.text }}>{termNameFor(activeStore, stores)}</strong>
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

					{showForm && form && (
						<div class="mb-5 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
							<ItemFields
								value={form} onChange={setForm} error={formError}
								locations={locations} types={types} stores={stores}
								taxonomy={taxonomy}
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
									disabled={saving}
									class="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
									style={{ background: theme.inkBg, color: theme.inkText }}
								>
									{saving ? 'Saving…' : 'Save item'}
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
								locations={locations} types={types} stores={stores}
								dark={dark} theme={theme} taxonomy={taxonomy}
								editForm={editingId === it.id ? editForm : null}
								onEditFormChange={setEditForm}
								onToggleOpen={() => toggleOpen(it.id)}
								onAdjustQty={(delta) => void api.adjustQty(it.id, delta)}
								onRemove={() => void removeItem(it.id)}
								onStartEdit={() => startEdit(it)}
								onSaveEdit={() => void saveEdit(it.id)}
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

			<UndoToast item={pendingRemoval} onUndo={() => void undoRemove()} theme={theme} />

			<SettingsDrawer
				open={settingsOpen} onClose={() => setSettingsOpen(false)}
				themeOverride={themeOverride} setThemeOverride={setThemeOverride}
				householdName={householdName}
				setHouseholdName={(v) => void api.updateHousehold({ name: v })}
				defaultThreshold={defaultThreshold}
				setDefaultThreshold={(v) => void api.updateHousehold({ defaultThreshold: v })}
				locations={locations} types={types} stores={stores} taxonomy={taxonomy}
				shoppingStore={shoppingStore} setShoppingStore={setShoppingStore}
				onViewShoppingList={() => { setShoppingListOpen(true); setSettingsOpen(false); }}
				accountName={displayName} accountEmail={email} onSignOut={onSignOut}
				dark={dark} theme={theme}
			/>

			<ShoppingListModal
				open={shoppingListOpen}
				store={shoppingStore ? termNameFor(shoppingStore, stores) : null}
				items={shoppingItems}
				onClose={() => setShoppingListOpen(false)} dark={dark} theme={theme}
			/>
		</div>
	);
}

/**
 * Everything that isn't a working pantry: loading, first run, and the states a
 * query reports instead of throwing.
 *
 * These have to be values rather than exceptions because Zero never delivers a
 * failed query to the client — it simply never emits, leaving `useQuery` on its
 * initial value forever. Without an explicit `no-household` state a first-run
 * user would stare at a blank screen. See `QueryState` in `shared/types.ts`.
 */
function Gate({
	status,
	dark,
	onCreateHousehold,
	onSignOut,
}: {
	status: ReturnType<typeof usePantryData>['status'];
	dark: boolean;
	onCreateHousehold: (name: string) => Promise<void>;
	onSignOut: () => void;
}) {
	const theme = getTheme(dark);

	// Named at creation rather than assigned a default and renamed later. The
	// schema has always been multi-household (D3), so a household's name is the
	// thing that will tell two of them apart once a switcher exists.
	const [name, setName] = useState('My Pantry');
	const [creating, setCreating] = useState(false);

	const frame = (children: preact.ComponentChildren) => (
		<div
			class="font-sans min-h-screen w-full flex items-center justify-center px-6"
			style={{ background: theme.pageBg, color: theme.text, colorScheme: dark ? 'dark' : 'light' }}
		>
			<div class="max-w-sm w-full text-center">{children}</div>
		</div>
	);

	if (status.state === 'loading') {
		return frame(
			<p class="font-mono text-xs uppercase tracking-widest" style={{ color: theme.textFaint }}>
				Loading&hellip;
			</p>
		);
	}

	if (status.state === 'no-household') {
		const submit = async () => {
			if (creating) return;
			setCreating(true);
			await onCreateHousehold(name);
			setCreating(false);
		};

		return frame(
			<>
				<h1 class="font-disp text-2xl font-semibold mb-2" style={{ color: theme.textStrong }}>
					Welcome to Larder Log
				</h1>
				<p class="text-sm mb-5" style={{ color: theme.textMuted }}>
					Name your household to start tracking what&rsquo;s in the pantry and the freezer.
					You&rsquo;ll get a starter set of locations, types, and stores to edit.
				</p>

				<label class="block text-left mb-4">
					<span class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textMuted }}>
						Household name
					</span>
					<input
						value={name}
						onInput={(e) => setName(e.currentTarget.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
						placeholder="My Pantry"
						aria-label="Household name"
						class="mt-1 w-full px-3 py-2 rounded border text-sm outline-none"
						style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
					/>
				</label>

				<button
					onClick={() => void submit()}
					disabled={creating || ! name.trim()}
					class="w-full px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
					style={{ background: theme.primaryBg, color: theme.primaryText }}
				>
					{creating ? 'Setting up…' : 'Create household'}
				</button>
			</>
		);
	}

	if (status.state === 'blocked') {
		return frame(
			<>
				<p class="text-sm mb-4" style={{ color: theme.text }}>{status.message}</p>
				<button onClick={onSignOut} class="text-xs underline" style={{ color: theme.textFaint }}>
					Sign out
				</button>
			</>
		);
	}

	// 'guest' — the gate in index.tsx normally catches this first.
	return frame(
		<p class="text-sm" style={{ color: theme.textMuted }}>Sign in to use Larder Log.</p>
	);
}
