import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Plus, Search, Menu, ShoppingCart, X } from 'lucide-preact';

import { CollapsedRail } from './components/CollapsedRail';
import { Drawer } from './components/Drawer';
import type { DrawerTab } from './components/Drawer';
import { StatusChip } from './components/StatusChip';
import { SortMenu } from './components/SortMenu';
import type { SortKey } from './components/SortMenu';
import { ItemSheet } from './components/ItemSheet';
import { PAGE_BUTTON, PAGE_BUTTON_PRIMARY, PAGE_CHIP_ADD, PAGE_INPUT } from './lib/controlStyles';
import { ItemCard } from './components/ItemCard';
import { JoinBox } from './components/JoinBox';
import { ShoppingListModal } from './components/ShoppingListModal';
import { UndoToast } from './components/UndoToast';

import { useSystemTheme } from './hooks/useSystemTheme';
import { usePersistentState } from './hooks/usePersistentState';
import { usePantryData } from './hooks/usePantryData';

import { entityColorFor, getTheme, statusFor, termNameFor } from './lib/theme';
import { clearPendingInvite, pendingInvite } from './lib/pendingInvite';
import type { TaxonomyActions } from './lib/actions';

import { normalizeCode } from '../shared/invite';
import type { StatusKey } from '../shared/status';
import { statusKeyFor } from '../shared/status';
import type { Item, ItemDraft, ThemeOverride } from '../shared/types';
import { DEFAULT_ROLE, can } from '../shared/roles';
import { toInt } from '../shared/qty';

const PAGE_SIZE = 20;
const UNDO_MS = 6000;

/** What "needs restocking" means as an ordering. */
const RESTOCK_RANK: Record<StatusKey, number> = { out: 0, low: 1, ok: 2 };

const STATUS_CHIPS: { key: StatusKey; label: string; short: string }[] = [
	{ key: 'ok', label: 'in stock', short: 'stocked' },
	{ key: 'low', label: 'running low', short: 'low' },
	{ key: 'out', label: 'out', short: 'out' },
];

/**
 * The two things still in localStorage, and both for the same reason: they are
 * properties of *this device*, not of the account (D25, D33).
 *
 * A dark-mode choice made on a phone should not follow you to a desktop, and
 * neither should which household you were last looking at — the phone in the
 * kitchen is pointed at the kitchen. Everything that is actually data lives in
 * the database.
 *
 * Namespaced per identity so signing in as someone else picks up their choice.
 */
function themeKeyFor(userId: string) {
	return `larder.v4.${userId}.theme`;
}

function householdKeyFor(userId: string) {
	return `larder.v4.${userId}.household`;
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

	/*
	 * The household this device is pointed at. A *request*, not an authority:
	 * the server answers with a household the caller is actually a member of,
	 * which is what makes a selection left over from one you have since left
	 * heal itself rather than dead-end.
	 */
	const householdKey = useMemo(() => householdKeyFor(userId), [userId]);
	const [selectedHousehold, setSelectedHousehold] = usePersistentState<string | null>(householdKey, null);

	const api = usePantryData(selectedHousehold);

	/*
	 * Adopt the server's answer, but only when our own selection is not a real
	 * one.
	 *
	 * The test is membership in the list, **not** whether the queries currently
	 * agree with the selection. `useQuery` keeps the previous result until the
	 * new subscription's first emit, so for a moment after a switch the pantry
	 * still reports the household we just left — and "correcting" the selection
	 * to match would cancel every switch the instant it was made.
	 *
	 * The list is what makes this safe: it takes no argument, so it is not part
	 * of the switch and answers the only question that matters here — is this a
	 * household we still belong to at all?
	 */
	useEffect(() => {
		if (! api.households.length || ! api.currentHouseholdId) return;

		const known = api.households.some((h) => h.id === selectedHousehold);

		if (! known) setSelectedHousehold(api.currentHouseholdId);
	}, [api.households, api.currentHouseholdId, selectedHousehold, setSelectedHousehold]);

	// Filters and view state are all client-side; none of it is data.
	const [activeLocation, setActiveLocation] = useState<string | null>(null);
	const [activeType, setActiveType] = useState<string | null>(null);
	const [activeStore, setActiveStore] = useState<string | null>(null);
	const [activeStatus, setActiveStatus] = useState<StatusKey | null>(null);
	const [search, setSearch] = useState('');

	const [drawerTab, setDrawerTab] = useState<DrawerTab>('filter');
	/* Mobile only — the drawer is docked and always present from `md` up. */
	const [drawerOpen, setDrawerOpen] = useState(false);
	/* Desktop only — folded away, with the header's menu button to bring it back. */
	const [drawerCollapsed, setDrawerCollapsed] = useState(false);
	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState<SortKey>('default');

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ItemDraft | null>(null);
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<ItemDraft | null>(null);
	const [editError, setEditError] = useState('');

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

	/**
	 * A code from an invite link, captured in the entry before sign-in.
	 *
	 * Held in state as well as the stash so redeeming it re-renders; the stash
	 * is what survived the sign-in round trip, and this is what the screen reads.
	 */
	const [pendingCode, setPendingCode] = useState<string | null>(() => pendingInvite());

	/**
	 * Redeems a code and lands on what it opened.
	 *
	 * Switching is the point: an invite is someone handing you a *particular*
	 * pantry, so arriving in the one you already had would read as the link not
	 * working.
	 */
	async function joinWithCode(code: string): Promise<string | null> {
		const householdId = await api.redeemInvite(code);

		// Only a redemption that actually created the membership consumes the
		// code. A refusal — expired, revoked, already a member there — leaves it
		// in place so the message on screen still has something to refer to.
		if (! householdId) return null;

		if (pendingCode && normalizeCode(pendingCode) === normalizeCode(code)) dismissInvite();

		setSelectedHousehold(householdId);

		return householdId;
	}

	/** First run and the switcher both create; both then switch to what they made. */
	async function createHousehold(name: string): Promise<string | null> {
		const householdId = await api.createHousehold(name);

		if (householdId) setSelectedHousehold(householdId);

		return householdId;
	}

	function dismissInvite() {
		clearPendingInvite();
		setPendingCode(null);
	}

	const ready = api.status.state === 'ready' ? api.status : null;
	const pantry = ready?.pantry;
	const household = ready?.household;

	const items = pantry?.items ?? [];
	const locations = pantry?.locations ?? [];
	const types = pantry?.types ?? [];
	const stores = pantry?.stores ?? [];
	const defaultThreshold = household?.household.defaultThreshold ?? '1';
	const householdName = household?.household.name ?? '';
	const members = household?.members ?? [];
	const invites = household?.invites ?? [];
	// The least privileged role until the query says otherwise, so a control is
	// never enabled on the strength of data that hasn't arrived.
	const myRole = household?.me.role ?? DEFAULT_ROLE;
	const myMembershipId = household?.me.membershipId ?? '';

	/**
	 * D20's matrix, read once and threaded down as plain booleans.
	 *
	 * The components below take `canEdit` rather than a role, so no component
	 * has to know what a role *is* — and the rule stays in `shared/roles.ts`,
	 * where the server reads the same table. D30 covers what a `false` looks
	 * like on screen: the affordance is absent, not disabled.
	 */
	const mayEditItems = can(myRole, 'item:write');
	const mayEditTaxonomy = can(myRole, 'taxonomy:write');

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
		if (sortBy === 'restock') {
			// Out first, then low, then stocked — the order you would walk the
			// kitchen in. `sort` is stable, so within a status the list keeps
			// whatever order it already had.
			arr.sort((a, b) => RESTOCK_RANK[statusKeyFor(a.qty, a.threshold)] - RESTOCK_RANK[statusKeyFor(b.qty, b.threshold)]);
		}
		else if (sortBy === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name));
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
	}, [locations, types, stores, activeLocation, activeType, activeStore]);

	/*
	 * The shopping list is contextual: it is whatever the store you are
	 * filtering by is short of. There is no second store selector any more —
	 * one store, chosen once, in the filter pane.
	 */
	const storeColor = entityColorFor(activeStore ?? '', stores, dark);

	const shoppingItems = useMemo(() => {
		if (! activeStore) return [];
		return items
			.filter((it) => it.storeIds.includes(activeStore) && statusFor(it.qty, it.threshold, dark).key !== 'ok')
			.sort((a, b) => (toInt(a.qty) <= 0 ? -1 : 1) - (toInt(b.qty) <= 0 ? -1 : 1));
	}, [items, activeStore, dark]);

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

		// Only arm undo for a removal that happened. A refused delete leaves the
		// row on screen, and undo re-inserts through `addItem` (D17) — so an
		// undo offered for a row that never went anywhere produces a duplicate.
		if (! await api.removeItem(id)) return;

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
		// The button is absent for a viewer, so this is belt-and-braces — but it
		// is the one entry point that opens a write form, and the server would
		// only refuse at save time, after the typing.
		if (! mayEditItems) return;

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
		setEditError('');
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

	/**
	 * The same two rules `addItem` enforces, said out loud.
	 *
	 * Returning silently here made Save a dead button: no message, no close, no
	 * clue which field was at fault.
	 */
	async function saveEdit(id: string) {
		if (! editForm) return;

		if (! editForm.name.trim()) {
			setEditError('Give the item a name first.');
			return;
		}

		if (! editForm.locationId) {
			setEditError('Pick a location first.');
			return;
		}

		setSaving(true);
		const saved = await api.updateItem(id, editForm);
		setSaving(false);

		// The server refused. `api.error` says why; keep the sheet open so the
		// edit is still there to correct, rather than discarding it.
		if (! saved) return;

		cancelEdit();
	}

	function cancelEdit() {
		setEditingId(null);
		setEditForm(null);
		setEditError('');
	}

	// --- Non-ready states ---------------------------------------------------

	if (api.status.state !== 'ready') {
		return (
			<Gate
				status={api.status}
				dark={dark}
				onCreateHousehold={createHousehold}
				onSignOut={onSignOut}
				error={api.error}
				onDismissError={api.dismissError}
				pendingCode={pendingCode}
				onJoin={joinWithCode}
				onDismissInvite={dismissInvite}
			/>
		);
	}

	/*
	 * No `overflow-x-hidden` on the root: setting one overflow axis makes the
	 * other compute to `auto`, which turns that element into the scroll
	 * container and leaves the drawer's `position: sticky` with nothing to
	 * stick to — it then only covers its own flow height instead of the
	 * viewport's. The content column clips instead.
	 */
	return (
		<div
			class="font-sans min-h-screen w-full flex transition-colors duration-200"
			style={{
				background: theme.pageBg,
				color: theme.text,
				colorScheme: dark ? 'dark' : 'light',
			}}
		>
			{/*
			  * Collapsed is a rail, not an absence — it reflows the content column
			  * rather than covering it, so nothing overlaps the grid.
			  */}
			{drawerCollapsed && (
				<CollapsedRail
					locations={locations} stores={stores} types={types}
					activeLocation={activeLocation} setActiveLocation={setActiveLocation}
					activeStore={activeStore} setActiveStore={setActiveStore}
					activeType={activeType} setActiveType={setActiveType}
					itemCount={items.length} locationCounts={locationCounts}
					householdName={householdName}
					households={api.households} currentHouseholdId={api.currentHouseholdId}
					onSelectHousehold={setSelectedHousehold}
					onCreateHousehold={createHousehold} onJoinHousehold={joinWithCode}
					accountName={displayName}
					themeOverride={themeOverride} setThemeOverride={setThemeOverride}
					dark={dark}
					onExpand={(tab) => { setDrawerTab(tab); setDrawerCollapsed(false); }}
					onSignOut={onSignOut}
					theme={theme}
				/>
			)}

			<Drawer
				items={items} locations={locations} types={types} stores={stores}
				activeLocation={activeLocation} setActiveLocation={setActiveLocation}
				activeType={activeType} setActiveType={setActiveType}
				activeStore={activeStore} setActiveStore={setActiveStore}
				locationCounts={locationCounts} anyFilterActive={anyFilterActive} onClearAll={clearAllFilters}
				tab={drawerTab} setTab={setDrawerTab}
				open={drawerOpen} onClose={() => setDrawerOpen(false)}
				collapsed={drawerCollapsed}
				onDismiss={() => { setDrawerOpen(false); setDrawerCollapsed(true); }}
				householdName={householdName}
				households={api.households} currentHouseholdId={api.currentHouseholdId}
				onSelectHousehold={setSelectedHousehold}
				onCreateHousehold={createHousehold} onJoinHousehold={joinWithCode}
				accountName={displayName}
				settings={{
					themeOverride, setThemeOverride,
					householdName,
					setHouseholdName: (v) => void api.updateHousehold({ name: v }),
					defaultThreshold,
					setDefaultThreshold: (v) => void api.updateHousehold({ defaultThreshold: v }),
					accountName: displayName, accountEmail: email, onSignOut,
					members, invites,
					me: { membershipId: myMembershipId, role: myRole },
					onCreateInvite: api.createInvite,
					onRevokeInvite: api.revokeInvite,
					onChangeRole: api.changeRole,
					onRemoveMember: api.removeMember,
					onLeaveHousehold: api.leaveHousehold,
				}}
				onCreateTerm={(kind, name, ink) => taxonomy.create(kind, { name, ink })}
				onRenameTerm={(kind, id, name) => { void taxonomy.update(kind, id, { name }); }}
				onRecolorTerm={(kind, id, ink) => { void taxonomy.update(kind, id, { ink }); }}
				onDeleteTerm={(kind, id) => { void taxonomy.remove(kind, id); }}
				canEditTaxonomy={mayEditTaxonomy}
				theme={theme}
			/>

			<div class="flex-1 min-w-0 overflow-x-hidden">
			{/* Mobile only: above `md` the drawer carries the wordmark and the menu. */}
			<header class="md:hidden">
				<div class="flex items-center gap-[13px] px-5 pt-4 pb-3">
					{/* Left, the same side the drawer comes from. */}
					<button
						onClick={() => { setDrawerOpen(true); setDrawerCollapsed(false); }}
						class={`shrink-0 flex items-center justify-center w-11 h-11 rounded-[13px] ${PAGE_BUTTON}`}
						style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
						aria-label="Open menu"
					>
						<Menu size={19} />
					</button>

					<div class="min-w-0 flex flex-col">
						<h1
							class="font-disp text-wordmark font-bold leading-[1.06] tracking-[-0.015em]"
							style={{ color: theme.textStrong }}
						>
							Larder <span class="italic font-semibold" style={{ color: '#BE3346' }}>Log</span>
						</h1>
						{householdName && (
							<span
								class="text-[10px] font-semibold uppercase tracking-[0.16em] truncate"
								style={{ color: theme.textMuted }}
							>
								{householdName}
							</span>
						)}
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

			{/*
			  * An invite link followed by someone who already has a household.
			  * Under D18 this could only be refused; now it is an offer, and
			  * accepting it switches to what the link opened.
			  */}
			{pendingCode && (
				<div class="max-w-5xl mx-auto px-6">
					<div
						class="flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm mb-1"
						style={{ background: theme.surfaceAlt, color: theme.textMuted, border: `1px solid ${theme.border}` }}
					>
						<span>You&rsquo;ve been invited to another household.</span>
						<span class="flex items-center gap-3 shrink-0">
							<button
								onClick={() => void joinWithCode(pendingCode)}
								class="font-semibold"
								style={{ color: theme.textStrong, textDecoration: 'underline', textUnderlineOffset: '3px' }}
							>
								Join
							</button>
							<button onClick={dismissInvite} aria-label="Dismiss invite">
								<X size={15} />
							</button>
						</span>
					</div>
				</div>
			)}

			<div class="max-w-[1160px] px-[18px] md:px-[34px] py-6 md:py-[30px] pb-28 md:pb-[30px]">
				<main>
					<div class="flex items-center gap-3.5">
						<label class={`flex-1 min-w-0 flex items-center gap-[11px] h-[50px] px-[18px] rounded-[15px] focus-within:border-ink-muted ${PAGE_INPUT}`}>
							<Search size={18} style={{ color: theme.textFaint }} />
							<input
								value={search}
								onInput={(e) => setSearch(e.currentTarget.value)}
								placeholder="What are you looking for?"
								aria-label="Search items"
								class="text-[15px] outline-none flex-1 min-w-0 bg-transparent"
								style={{ color: theme.text }}
							/>
						</label>
						{mayEditItems && (
							<button
								onClick={openAddForm}
								class={`shrink-0 hidden md:flex items-center gap-2.5 h-[50px] px-[22px] rounded-[15px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
								style={{ background: theme.inkBg, color: theme.inkText }}
							>
								<Plus size={17} strokeWidth={2.4} /> Add item
							</button>
						)}
					</div>

					{/*
					  * The shopping list is reached from here and nowhere else: it is
					  * whatever the store you are filtering by is short of. The count
					  * is the point — a store with nothing low does not need a list,
					  * and the badge says so before you open it.
					  */}
					{activeStore && (
						<div
							class="flex items-center justify-between gap-4 mt-4 pl-[18px] pr-3 py-[11px] rounded-[15px]"
							style={{ background: theme.surface, border: `1px solid ${storeColor.ring}` }}
						>
							<span class="flex items-center gap-2.5 text-[14.5px] min-w-0" style={{ color: theme.text }}>
								<span class="w-2 h-2 rounded-full shrink-0" style={{ background: storeColor.dot }} />
								<span class="truncate">
									Filtering by <strong class="font-semibold" style={{ color: theme.textStrong }}>{termNameFor(activeStore, stores)}</strong>
								</span>
								<button
									onClick={() => setActiveStore(null)}
									class="pl-1 text-[13.5px] shrink-0"
									style={{ color: theme.textMuted, textDecoration: 'underline', textUnderlineOffset: '3px' }}
								>
									Clear
								</button>
							</span>
							<button
								onClick={() => setShoppingListOpen(true)}
								class="flex items-center gap-2.5 h-10 px-4 rounded-xl text-sm font-semibold shrink-0"
								style={{ background: theme.inkBg, color: theme.inkText }}
							>
								<ShoppingCart size={16} />
								Shopping list
								<span
									class="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold"
									style={{ background: '#BE3346', color: '#F2E9DA' }}
								>
									{shoppingItems.length}
								</span>
							</button>
						</div>
					)}


					<div class="flex items-center justify-between gap-4 flex-wrap pt-6 pb-4 px-0.5">
						<div class="flex items-center gap-2.5 flex-wrap">
							{STATUS_CHIPS.map(({ key, label, short }) => (
								<StatusChip
									key={key} statusKey={key} label={label} short={short} count={statusCounts[key]}
									active={activeStatus === key} dark={dark} theme={theme}
									onClick={() => setActiveStatus((prev) => prev === key ? null : key)}
								/>
							))}
							{/*
							  * On desktop the wordmark line is hidden, so this is where a
							  * viewer learns why their controls are missing — once, rather
							  * than as a disabled button on every card (D30).
							  */}
							{! mayEditItems && (
								<span
									class="inline-flex items-center px-3 py-[7px] rounded-full text-[13.5px]"
									style={{ background: theme.neutralChipBg, color: theme.textMuted, border: `1px solid ${theme.border}` }}
								>
									View only
								</span>
							)}
						</div>
						{/*
						  * Its own full-width row on mobile, so the count stays left and
						  * the sort stays right rather than both wrapping to the left.
						  * Inline at the end of the row from `md` up.
						  */}
						<div class="w-full md:w-auto flex items-center justify-between md:justify-end gap-[18px]">
							<span class="text-[13px]" style={{ color: theme.textMuted }}>
								Showing {Math.min(visibleCount, sorted.length)} of {sorted.length}
							</span>
							{/* Pulled to the edge so the trigger's padding does not read as a gap. */}
							<div class="-mr-2.5 md:mr-0">
								<SortMenu open={sortMenuOpen} setOpen={setSortMenuOpen} sortBy={sortBy} setSortBy={setSortBy} theme={theme} />
							</div>
						</div>
					</div>

					{/*
					  * A grid rather than a stack, per the spec: cards are dense
					  * enough that eight scan in one pass on a desktop. `items-start`
					  * keeps an expanded card from stretching its whole row.
					  */}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
						{sorted.length === 0 && (
							<p class="text-sm py-8 text-center" style={{ color: theme.textMuted }}>Nothing here yet.</p>
						)}

						{visibleItems.map((it) => (
							<ItemCard
								key={it.id}
								item={it} open={openId === it.id}
								locations={locations} types={types} stores={stores}
								dark={dark} theme={theme} canEdit={mayEditItems}
								onToggleOpen={() => toggleOpen(it.id)}
								onAdjustQty={(delta) => void api.adjustQty(it.id, delta)}
								onRemove={() => void removeItem(it.id)}
								onStartEdit={() => startEdit(it)}
							/>
						))}

						{/*
						  * The tile sits in the grid rather than above it, so adding
						  * something is where the shelf ends — the same gesture as
						  * reaching past the last jar. Desktop only: on mobile the
						  * bottom bar already carries it.
						  */}
						{mayEditItems && sorted.length > 0 && visibleCount >= sorted.length && (
							<button
								onClick={openAddForm}
								class={`hidden md:flex flex-col items-center justify-center gap-2.5 min-h-[152px] p-5 rounded-[20px] font-disp italic text-base ${PAGE_CHIP_ADD}`}
							>
								<Plus size={20} strokeWidth={2.2} />
								Something new on the shelf
							</button>
						)}

						{visibleCount < sorted.length && (
							<div ref={sentinelRef} class="py-4 text-center">
								<span class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textFaint }}>Loading more…</span>
							</div>
						)}
					</div>
				</main>
			</div>
			</div>

			{/*
			  * Mobile's primary action, pinned rather than scrolled past. The grid
			  * carries matching bottom padding so the last card clears it.
			  */}
			{mayEditItems && (
				<div
					class="md:hidden fixed inset-x-0 bottom-0 z-30 px-5 pt-3.5 pb-5"
					style={{ background: theme.ground, borderTop: `1px solid ${theme.border}` }}
				>
					<button
						onClick={openAddForm}
						class={`flex items-center justify-center gap-2.5 w-full h-[54px] rounded-2xl text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
						style={{ background: theme.inkBg, color: theme.inkText }}
					>
						<Plus size={18} strokeWidth={2.4} /> Add item
					</button>
				</div>
			)}

			{/*
			  * One sheet for both flows. Editing wins if somehow both are set,
			  * because it is the one tied to a specific row.
			  */}
			<ItemSheet
				open={mayEditItems && (Boolean(editingId && editForm) || (showForm && Boolean(form)))}
				mode={editingId ? 'edit' : 'add'}
				title={items.find((i) => i.id === editingId)?.name}
				value={(editingId ? editForm : form) ?? emptyDraft()}
				onChange={editingId ? setEditForm : setForm}
				error={editingId ? editError : formError}
				locations={locations} types={types} stores={stores}
				taxonomy={taxonomy} canCreateTerms={mayEditTaxonomy}
				defaultThreshold={defaultThreshold} saving={saving}
				onSave={() => void (editingId ? saveEdit(editingId) : addItem())}
				onRemove={editingId ? () => { const id = editingId; cancelEdit(); void removeItem(id); } : undefined}
				onClose={() => { if (editingId) cancelEdit(); else { setShowForm(false); setFormError(''); } }}
				dark={dark} theme={theme}
			/>

			<UndoToast item={pendingRemoval} onUndo={() => void undoRemove()} theme={theme} />

			<ShoppingListModal
				open={shoppingListOpen}
				store={activeStore ? termNameFor(activeStore, stores) : null}
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
	error,
	onDismissError,
	pendingCode,
	onJoin,
	onDismissInvite,
}: {
	status: ReturnType<typeof usePantryData>['status'];
	dark: boolean;
	onCreateHousehold: (name: string) => Promise<string | null>;
	onSignOut: () => void;
	/** A refused join or household creation. The app shell's banner isn't mounted here. */
	error: string | null;
	onDismissError: () => void;
	pendingCode: string | null;
	onJoin: (code: string) => Promise<string | null>;
	onDismissInvite: () => void;
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
			<div class="max-w-sm w-full text-center">
				{error && (
					<div
						role="alert"
						class="flex items-start justify-between gap-3 px-3 py-2 rounded-md text-sm mb-4 text-left"
						style={{
							background: theme.surfaceAlt,
							color: theme.dangerText,
							border: `1px solid ${theme.dangerText}`,
						}}
					>
						<span>{error}</span>
						<button onClick={onDismissError} aria-label="Dismiss" class="shrink-0">
							<X size={15} />
						</button>
					</div>
				)}
				{children}
			</div>
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
				{/*
				  * An invited visitor is here to join something that already
				  * exists, so the invite comes first and the first-run form
				  * follows it. Without a code this renders as a single line of
				  * link text below the form.
				  */}
				{pendingCode && (
					<JoinBox
						pendingCode={pendingCode}
						onJoin={async (code) => Boolean(await onJoin(code))}
						onDismiss={onDismissInvite}
						theme={theme}
					/>
				)}

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

				{! pendingCode && (
					<JoinBox
						pendingCode={null}
						onJoin={async (code) => Boolean(await onJoin(code))}
						onDismiss={onDismissInvite}
						theme={theme}
					/>
				)}

				{/*
				  * The way out of the wrong account. Every other screen reaches
				  * sign-out through the drawer, and there is no drawer until a
				  * household exists.
				  */}
				<p class="mt-6">
					<button onClick={onSignOut} class="text-xs underline" style={{ color: theme.textFaint }}>
						Sign out
					</button>
				</p>
			</>
		);
	}

	// 'guest' — the gate in index.tsx normally catches this first.
	return frame(
		<p class="text-sm" style={{ color: theme.textMuted }}>Sign in to use Larder Log.</p>
	);
}
