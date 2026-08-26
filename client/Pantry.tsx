import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Archive, Link2Off, LogOut, Menu, Plus, Search, ShoppingCart, Trash2, UserCheck, UserMinus, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';

import { CollapsedRail } from './components/CollapsedRail';
import { Drawer } from './components/Drawer';
import type { DrawerTab } from './components/Drawer';
import { StatusChip } from './components/StatusChip';
import { SortMenu } from './components/SortMenu';
import type { SortKey } from './components/SortMenu';
import { ItemSheet } from './components/ItemSheet';
import { PAGE_BUTTON_OUTLINE, PAGE_BUTTON_PRIMARY, PAGE_CHIP_ADD, PAGE_INPUT } from './lib/controlStyles';
import { ItemCard } from './components/ItemCard';
import { FirstRun } from './components/FirstRun';
import { InviteLanding } from './components/InviteLanding';
import { OutsideShell } from './components/OutsideShell';
import { ShoppingListModal } from './components/ShoppingListModal';
import { ToastStack } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import type { ConfirmTone } from './components/ConfirmDialog';

import { useSystemTheme } from './hooks/useSystemTheme';
import { usePersistentState } from './hooks/usePersistentState';
import { usePantryData, useInvitePreview } from './hooks/usePantryData';
import { useToasts } from './hooks/useToasts';

import { entityColorFor, getTheme, statusFor, termNameFor } from './lib/theme';
import { clearInviteAccepted, clearPendingInvite, inviteAccepted, pendingInvite } from './lib/pendingInvite';
import type { TaxonomyActions } from './lib/actions';

import { normalizeCode } from '../shared/invite';
import { wouldStrandHousehold } from '../shared/membership';
import type { StatusKey } from '../shared/status';
import { statusKeyFor } from '../shared/status';
import type { Item, ItemDraft, Term, TermKind, ThemeOverride } from '../shared/types';
import { DEFAULT_ROLE, can } from '../shared/roles';
import type { Role } from '../shared/roles';
import { toInt } from '../shared/qty';
import type { TermBlock } from '../shared/term';
import { termBlock, termUsageCount } from '../shared/term';

const PAGE_SIZE = 20;

/**
 * The width the drawer docks at.
 *
 * **This must stay equal to the `min-[1120px]:` literals in `Drawer` and
 * `CollapsedRail`.** Tailwind resolves a class name by scanning source for a
 * static string, so the breakpoint cannot be interpolated from here and the
 * number necessarily appears twice. The value itself is derived from the card
 * floor — see the note in `Drawer`.
 */
const DOCK_PX = 1120;

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

/**
 * A destructive action waiting on an answer, or on being understood.
 *
 * Two families in one union, and the difference is whether there is anything to
 * decide. `*-blocked` states are **preconditions**: they explain and offer a
 * way to the problem, and their primary is never destructive.
 */
type Pending =
	| { kind: 'revoke-invite'; inviteId: string; role: Role }
	| { kind: 'remove-member'; membershipId: string; name: string }
	| { kind: 'leave' }
	| { kind: 'leave-blocked' }
	| { kind: 'delete-household' }
	| { kind: 'term-blocked'; block: TermBlock; termKind: TermKind; termId: string };

type DialogCopy = {
	tone: ConfirmTone;
	icon: LucideIcon;
	title: string;
	body: string;
	confirmLabel: string;
	/** Set only on the typed confirmation. */
	requireText?: string;
};

type DialogFacts = {
	householdName: string;
	itemCount: number;
	locationCount: number;
	storeCount: number;
	typeCount: number;
};

/**
 * What each pending action says.
 *
 * Kept out of the component because it is the part worth reading side by side:
 * every title asks the question or gives the instruction, every body names what
 * is lost, and every button says the verb — never *Confirm*, *OK* or *Yes*.
 * That is what carries destructiveness here, since crimson never will.
 */
function dialogCopy(pending: Pending, facts: DialogFacts): DialogCopy {
	const { householdName, itemCount, locationCount, storeCount, typeCount } = facts;
	const name = householdName || 'this household';

	switch (pending.kind) {
		case 'revoke-invite':
			return {
				tone: 'danger',
				icon: Link2Off,
				title: 'Revoke this invite?',
				body: 'The link stops working immediately. Anyone who hasn’t accepted it yet will need a new one.',
				confirmLabel: 'Revoke invite',
			};

		case 'remove-member':
			return {
				tone: 'danger',
				icon: UserMinus,
				title: `Remove ${pending.name}?`,
				body: `They lose access to ${name} straight away. You can invite them back with a new link.`,
				confirmLabel: 'Remove member',
			};

		case 'leave':
			return {
				tone: 'danger',
				icon: LogOut,
				title: `Leave ${name}?`,
				body: `You’ll lose access to its ${plural(itemCount, 'item')}. An owner can invite you back.`,
				confirmLabel: 'Leave household',
			};

		// Not a decision — you cannot leave a household that would have no
		// owner left, so the dialog points at the fix instead of asking.
		case 'leave-blocked':
			return {
				tone: 'blocked',
				icon: UserCheck,
				title: 'Make someone else an owner first',
				body: `You’re the only owner of ${name}. Promote another member, then you can leave.`,
				confirmLabel: 'Open Members',
			};

		/*
		 * The only typed confirmation in the app. It earns the exception by
		 * being the only action that destroys data belonging to more than one
		 * screen; anywhere else it would be theatre.
		 */
		case 'delete-household':
			return {
				tone: 'danger',
				icon: Trash2,
				title: `Delete ${name}?`,
				body: `You’re its only member, so leaving deletes it. ${plural(itemCount, 'item')}, ${plural(locationCount, 'location')}, ${plural(storeCount, 'store')} and ${plural(typeCount, 'type')} go permanently.`,
				confirmLabel: 'Delete household',
				requireText: householdName,
			};

		case 'term-blocked':
			return {
				tone: 'blocked',
				icon: Archive,
				title: pending.block.title,
				body: pending.block.body,
				confirmLabel: pending.block.action,
			};
	}
}

/** `1 item` / `4 locations`. Every count in a dialog body goes through this. */
function plural(count: number, noun: string): string {
	return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

type Props = {
	userId: string;
	displayName: string;
	email: string;
	/** The Gravatar avatar, when the identity carries one. */
	picture?: string;
	onSignOut: () => void;
};

export function Pantry({ userId, displayName, email, picture, onSignOut }: Props) {
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

	/**
	 * `drawerOpen` only means anything below the dock, so it is cleared above it.
	 *
	 * Two callers set it at any width — the rail's expand control and the
	 * blocked-leave dialog's *Open Members* — because below the dock that flag is
	 * the only thing that reveals the drawer. Above the dock the drawer is
	 * already on screen and setting it looks like a harmless no-op.
	 *
	 * It is not. The flag persists, and narrowing the window past the dock cashes
	 * it in: the drawer becomes a `fixed` slide-over that nothing in the layout
	 * accounts for, so only the 68px rail holds the column open and the item grid
	 * runs underneath it.
	 *
	 * The listener covers the other direction — widening while the slide-over is
	 * open — and the `drawerOpen` dependency covers a caller setting it while
	 * already docked. Both are needed; either alone leaves one path stale.
	 */
	useEffect(() => {
		// Guarded like `useSystemTheme`: the same absence of a browser would
		// otherwise throw here rather than degrade.
		if (! window.matchMedia) return;

		const docked = window.matchMedia(`(min-width: ${DOCK_PX}px)`);

		function sync() {
			if (docked.matches && drawerOpen) setDrawerOpen(false);
		}

		sync();
		docked.addEventListener('change', sync);

		return () => docked.removeEventListener('change', sync);
	}, [drawerOpen]);
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
	 * The removed row is held by its toast for the length of the window and
	 * re-inserted by re-running `addItem`. That means undo produces a **new row
	 * id** and does not survive a reload — both accepted, because the
	 * alternative is a `deletedAt` column every query in the app would have to
	 * filter forever.
	 */
	const toasts = useToasts();

	/**
	 * The one dialog on screen, or nothing.
	 *
	 * **Undo what comes back, confirm what doesn't** (D36). A record that can be
	 * restored and affects only you gets a toast; anything irreversible, or that
	 * reaches someone who is not looking at your screen, gets a modal. Nothing
	 * gets both, so this and `toasts` never describe the same action.
	 *
	 * One at a time by construction: every trigger is a control inside a surface
	 * the dialog covers, so a second could only come from a live query, and a
	 * dialog that swapped its own question mid-read would be worse than one that
	 * waits.
	 */
	const [pending, setPending] = useState<Pending | null>(null);

	/*
	 * The dialog outlives `pending` by the length of its exit fade, and a
	 * dialog is unmounted by `open` going false — not by losing its copy. Held
	 * here so the last question stays on screen while it fades instead of
	 * flicking to whatever the fallback happens to be.
	 */
	const shownPending = useRef<Pending | null>(null);

	if (pending) shownPending.current = pending;

	/*
	 * Counters, not booleans — a signal that has to fire twice in a row for the
	 * same reason still has to be distinguishable from itself.
	 */
	const [closeEditing, setCloseEditing] = useState(0);
	const [openMembers, setOpenMembers] = useState(0);

	const [shoppingListOpen, setShoppingListOpen] = useState(false);

	/**
	 * A code from an invite link, captured in the entry before sign-in.
	 *
	 * Held in state as well as the stash so redeeming it re-renders; the stash
	 * is what survived the sign-in round trip, and this is what the screen reads.
	 */
	const [pendingCode, setPendingCode] = useState<string | null>(() => pendingInvite());

	/**
	 * What that code says about itself, for the landing card.
	 *
	 * The same subscription the signed-out landing uses; this one answers with
	 * `member` as well, because the caller now has an identity to compare
	 * against.
	 */
	const invitePreview = useInvitePreview(pendingCode);

	/**
	 * A code the visitor already said yes to, on the way in.
	 *
	 * **Signing in is the accept** — someone who pressed *Sign in with Gravatar
	 * to join* while signed out has consented, and showing them the same card
	 * again on the way back would make that press look like it did nothing. So
	 * this redeems on arrival instead. A link followed while *already* signed in
	 * carries no consent and gets the card with its two buttons.
	 *
	 * Read once into state rather than called during render: the flag is
	 * cleared as soon as the consent is spent, and a render that re-read it
	 * would flip the screen out from under an in-flight request.
	 */
	const [autoJoining, setAutoJoining] = useState(() => Boolean(pendingInvite()) && inviteAccepted());

	useEffect(() => {
		if (! pendingCode || ! autoJoining) return;

		let live = true;

		void joinWithCode(pendingCode).then((householdId) => {
			if (! live) return;

			// The consent is spent either way. A refusal — expired between the
			// press and the return, revoked, or a household they turn out to
			// already be in — hands the screen to the landing card, which is the
			// only thing that can say which of those happened.
			if (! householdId) clearInviteAccepted();

			setAutoJoining(false);
		});

		return () => { live = false; };
	}, [pendingCode, autoJoining]);

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
		if (sortBy === 'default') {
			/*
			 * *Recently added* used to apply no sort at all, which left the list
			 * in `collect()` order — oldest first, the exact opposite of what the
			 * label promised. `createdAt` is Zero's own insert stamp (D35), ISO
			 * 8601 UTC, so it is the one string in the app that compares
			 * correctly without parsing.
			 *
			 * An undone removal therefore comes back at the *top* rather than in
			 * its old slot: undo re-inserts through `addItem` (D17), so the row is
			 * genuinely new and genuinely the most recently added thing here.
			 */
			arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		}
		else if (sortBy === 'restock') {
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

	/**
	 * A household with nothing in it yet — not a filter that matches nothing.
	 *
	 * The difference is the whole reason this is `items` rather than `sorted`.
	 * An empty result *from a filter* is a thing the visitor did and can undo;
	 * an empty pantry is a state the app has to explain, and it is the one that
	 * takes the screen's only primary and strips the top bar back.
	 */
	const empty = items.length === 0;

	const locationCounts = useMemo(() => Object.fromEntries(
		locations.map((loc) => [loc.id, items.filter((i) => i.locationId === loc.id).length])
	), [items, locations]);

	/**
	 * How many items reference a term, for every kind.
	 *
	 * The same function `requestDeleteTerm` asks before it deletes, so the
	 * number on the editing row and the number in the blocked dialog cannot
	 * disagree. `locationCounts` stays for the collapsed rail, which shows only
	 * locations and wants a map rather than a call per chip.
	 */
	const countFor = useCallback(
		(kind: TermKind, id: string) => termUsageCount(items, kind, id),
		[items]
	);

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

		toasts.push({
			lead: 'Removed',
			name: item.name,
			// Re-insert rather than un-delete. The row comes back with a new id
			// (D17), which nothing references.
			onUndo: () => {
				void api.addItem({
					name: item.name,
					locationId: item.locationId,
					typeIds: item.typeIds,
					storeIds: item.storeIds,
					qty: item.qty,
					threshold: item.threshold,
					notes: item.notes,
				});
			},
		});
	}

	/** The list a kind's terms live in, and the filter currently pointed at it. */
	function termsOf(kind: TermKind): Term[] {
		return kind === 'location' ? locations : kind === 'type' ? types : stores;
	}

	function activeTermOf(kind: TermKind): string | null {
		return kind === 'location' ? activeLocation : kind === 'type' ? activeType : activeStore;
	}

	function setActiveTerm(kind: TermKind, id: string | null) {
		if (kind === 'location') setActiveLocation(id);
		else if (kind === 'type') setActiveType(id);
		else setActiveStore(id);
	}

	/**
	 * The trash on a term's editing row. Live in every case (D36).
	 *
	 * Deleting is refused while anything references the term, so the press
	 * either explains why — with the count that was already on the row — or goes
	 * through and hands you an undo. Both outcomes are readable *before* the
	 * press; neither needs a disabled control that cannot say so.
	 */
	async function requestDeleteTerm(kind: TermKind, id: string) {
		const term = termsOf(kind).find((t) => t.id === id);

		if (! term) return;

		// The same call the server refuses on, so the sentence on screen and the
		// sentence the mutation would have thrown are one string.
		const block = termBlock(kind, term.name, termUsageCount(items, kind, id));

		if (block) {
			setPending({ kind: 'term-blocked', block, termKind: kind, termId: id });
			return;
		}

		/*
		 * Captured before the delete, because the effect that heals a filter
		 * pointing at a vanished term will have cleared it by the time undo runs.
		 */
		const wasActive = activeTermOf(kind) === id;

		if (! await api.deleteTerm(kind, id)) return;

		toasts.push({
			lead: 'Deleted',
			name: term.name,
			onUndo: () => void restoreTerm(kind, term, wasActive),
		});
	}

	/**
	 * Puts a deleted term back, and the filter with it if it was the active one.
	 *
	 * Name and colour survive; **position does not**. The term is re-created, so
	 * it is a new row at the end of its list — the same trade D17 makes for an
	 * item, for the same reason.
	 */
	async function restoreTerm(kind: TermKind, term: Term, wasActive: boolean) {
		const id = await taxonomy.create(kind, { name: term.name, ink: term.ink });

		if (id && wasActive) setActiveTerm(kind, id);
	}

	/**
	 * Leaving, and the two things it turns into.
	 *
	 * The last member of a household cannot leave it — that would strand it — so
	 * the row relabels to *Delete household* and takes the typed confirmation.
	 * The last *owner* of a household with members left cannot leave either, and
	 * that one is a precondition rather than a question.
	 */
	function requestLeave() {
		if (members.length <= 1) { setPending({ kind: 'delete-household' }); return; }

		if (wouldStrandHousehold(members, myMembershipId)) { setPending({ kind: 'leave-blocked' }); return; }

		setPending({ kind: 'leave' });
	}

	/** Runs whatever the open dialog was asking about, then closes it. */
	async function confirmPending() {
		const action = pending;

		if (! action) return;

		setPending(null);

		switch (action.kind) {
			case 'revoke-invite':
				// Plain: there is nothing to restore, only a new link to issue.
				if (await api.revokeInvite(action.inviteId)) toasts.push({ lead: 'Invite revoked.' });
				return;

			case 'remove-member':
				if (await api.removeMember(action.membershipId)) toasts.push({ lead: 'Member removed.' });
				return;

			// No toast on either: the household you would announce it in is the
			// one you just left.
			case 'leave':
				await api.leaveHousehold();
				return;

			case 'delete-household':
				await api.deleteHousehold();
				return;

			// Both blocked cases send you where the problem is instead.
			case 'leave-blocked':
				setDrawerTab('settings');
				setDrawerOpen(true);
				setDrawerCollapsed(false);
				setOpenMembers((n) => n + 1);
				return;

			case 'term-blocked':
				clearAllFilters();
				setActiveTerm(action.termKind, action.termId);
				setCloseEditing((n) => n + 1);
				return;
		}
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

	/*
	 * An invite link takes the whole screen, ahead of everything else.
	 *
	 * It was a banner inside the app before, which was the right size for the
	 * one case D18 allowed — "you already have a household, this is a refusal".
	 * Since D33 it is a real offer with a role attached, and it belongs on the
	 * same card the signed-out landing uses rather than as a strip above the
	 * pantry you were already looking at.
	 *
	 * `autoJoining` holds the card in its checking state while the accepted code
	 * is redeemed, so a consented join never flashes the buttons it does not
	 * need.
	 */
	if (pendingCode) {
		return (
			<OutsideShell dark={dark} theme={theme}>
				<InviteLanding
					preview={autoJoining ? null : invitePreview}
					signedIn
					displayName={displayName} email={email} picture={picture}
					onSignIn={() => {}}
					onJoin={async () => { await joinWithCode(pendingCode); }}
					onDismiss={(householdId) => {
						if (householdId) setSelectedHousehold(householdId);

						dismissInvite();
					}}
					onSignOut={onSignOut}
					pending={false}
					theme={theme}
				/>
			</OutsideShell>
		);
	}

	if (api.status.state !== 'ready') {
		return (
			<Gate
				status={api.status}
				dark={dark}
				displayName={displayName}
				email={email}
				picture={picture}
				onCreateHousehold={createHousehold}
				onSignOut={onSignOut}
				error={api.error}
				onDismissError={api.dismissError}
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
			  *
			  * Rendered unconditionally, because below 1024 the rail *is* the
			  * drawer whether or not anyone chose to collapse it. `autoOnly` lets
			  * it hide itself again at `lg` when the collapse was only the width's
			  * doing. A `matchMedia` listener would do the same thing and be wrong
			  * for one frame on every load.
			  */}
			{(
				<CollapsedRail
					autoOnly={! drawerCollapsed}
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
					/*
					 * Both, deliberately. Un-collapsing is what reveals the docked
					 * drawer at `lg`; `open` is what slides it in below that, where
					 * un-collapsing alone would do nothing visible.
					 */
					onExpand={(tab) => { setDrawerTab(tab); setDrawerCollapsed(false); setDrawerOpen(true); }}
					onSignOut={onSignOut}
					theme={theme}
				/>
			)}

			<Drawer
				items={items} locations={locations} types={types} stores={stores}
				activeLocation={activeLocation} setActiveLocation={setActiveLocation}
				activeType={activeType} setActiveType={setActiveType}
				activeStore={activeStore} setActiveStore={setActiveStore}
				countFor={countFor} anyFilterActive={anyFilterActive} onClearAll={clearAllFilters}
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
					// Both of these *ask*. Revoking kills a link someone else is
					// holding and removing reaches a person who is not looking at
					// this screen, so neither is an undo (D36).
					onRevokeInvite: (inviteId) => {
						const invite = invites.find((i) => i.id === inviteId);

						if (invite) setPending({ kind: 'revoke-invite', inviteId, role: invite.role });
					},
					onChangeRole: api.changeRole,
					onRemoveMember: (membershipId) => {
						const member = members.find((m) => m.id === membershipId);

						setPending({
							kind: 'remove-member',
							membershipId,
							name: member?.displayName || 'this member',
						});
					},
					onLeaveHousehold: requestLeave,
					leaveLabel: members.length <= 1 ? 'Delete household' : 'Leave household',
					openMembers,
				}}
				onCreateTerm={(kind, name, ink) => taxonomy.create(kind, { name, ink })}
				onRenameTerm={(kind, id, name) => { void taxonomy.update(kind, id, { name }); }}
				onRecolorTerm={(kind, id, ink) => { void taxonomy.update(kind, id, { ink }); }}
				onDeleteTerm={(kind, id) => void requestDeleteTerm(kind, id)}
				canEditTaxonomy={mayEditTaxonomy}
				closeEditing={closeEditing}
				theme={theme}
			/>

			<div class="flex-1 min-w-0 overflow-x-hidden">
			{/* Mobile only: above `md` the drawer carries the wordmark and the menu. */}
			<header class="md:hidden">
				<div class="flex items-center gap-[13px] px-5 pt-4 pb-3">
					{/* Left, the same side the drawer comes from. */}
					<button
						onClick={() => { setDrawerOpen(true); setDrawerCollapsed(false); }}
						class={`shrink-0 flex items-center justify-center w-11 h-11 rounded-[13px] ${PAGE_BUTTON_OUTLINE}`}
						aria-label="Open menu"
					>
						<Menu size={19} />
					</button>

					<div class="min-w-0 flex flex-col">
						<h1
							class="font-disp text-wordmark font-extrabold leading-[1.06] tracking-[-0.015em]"
							style={{ color: theme.textStrong }}
						>
							Larder <span class="italic" style={{ color: '#BE3346' }}>Log</span>
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
				<div class="px-[18px] md:px-[34px]">
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
			  * No max width. The column is whatever the drawer leaves it, so the
			  * grid below can keep adding tracks instead of stranding whitespace
			  * on a wide screen. Only the gutters are fixed.
			  */}
			<div class="px-[18px] md:px-[34px] py-6 md:py-[30px] pb-28 md:pb-[30px]">
				<main>
					{/*
					  * The whole top bar is absent at zero items — search, the
					  * status chips, the count and the sort trigger with them.
					  * Every one of them is a control over nothing, and the empty
					  * state below is meant to own the screen and carry its only
					  * primary. All of it comes back with the first item.
					  */}
					{! empty && (
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
					)}

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


					{! empty && (
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
					)}

					{/*
					  * A grid rather than a stack, per the spec: cards are dense
					  * enough that eight scan in one pass on a desktop. `items-start`
					  * keeps an expanded card from stretching its whole row.
					  *
					  * `auto-fit` with a 320px floor and a `1fr` ceiling: the tracks
					  * always divide the row exactly, so the gutter is 16px at every
					  * width and there is never a ragged remainder at the end.
					  *
					  * Both of the earlier attempts spent that remainder somewhere
					  * visible and both were wrong. Capping the card inside a `1fr`
					  * track pushed it between the cards — 104px between neighbours
					  * at 1440, because the track stretched while the card did not.
					  * Capping the *track* at 420 held the gutter but left up to a
					  * full track of dead space at the right edge. Letting the track
					  * stretch is what removes the remainder rather than relocating
					  * it.
					  *
					  * The trade is `auto-fit`'s: it collapses empty tracks, so a
					  * household holding fewer items than columns gets fewer, wider
					  * cards rather than a short row of narrow ones. Once there are
					  * more items than columns — the normal state of a pantry — it
					  * is identical to `auto-fill`.
					  *
					  * Mobile stays an explicit single column: below 320px of content
					  * the floor would overflow its own track.
					  */}
					<div class="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 items-start">
						{/*
						  * Full width, or these read as a message about the first
						  * card rather than about the list — and the wider the
						  * screen, the more off-centre they look.
						  */}
						{/*
						  * Two different nothings. An empty *household* gets the
						  * screen, an italic line and the only *Add item* on it; a
						  * filter that matches nothing gets one quiet sentence,
						  * because the way out is the filter the visitor just set.
						  */}
						{empty ? (
							<div class="col-span-full flex flex-col items-center justify-center text-center gap-3.5 py-16 md:py-24 px-4 md:px-16">
								<p class="font-disp italic text-[27px] font-medium leading-[1.3]" style={{ color: theme.textStrong }}>
									Nothing in the larder yet.
								</p>
								<p class="text-[14.5px] leading-[1.5] max-w-[420px]" style={{ color: theme.textMuted }}>
									Add your first item. Your locations, stores and types are already set up
									in Filters — rename or recolour them whenever you like.
								</p>
								{mayEditItems ? (
									<button
										onClick={openAddForm}
										class={`flex items-center justify-center gap-2.5 w-[158px] h-11 mt-1.5 rounded-[13px] text-base font-semibold ${PAGE_BUTTON_PRIMARY}`}
										style={{ background: theme.inkBg, color: theme.inkText }}
									>
										<Plus size={18} strokeWidth={2.2} /> Add item
									</button>
								) : (
									// The one thing the stripped top bar took with it that
									// a viewer still needs: why there is nothing to press.
									<span
										class="inline-flex items-center px-3 py-[7px] mt-1.5 rounded-full text-[13.5px]"
										style={{ background: theme.neutralChipBg, color: theme.textMuted, border: `1px solid ${theme.border}` }}
									>
										View only
									</span>
								)}
							</div>
						) : sorted.length === 0 && (
							<p class="col-span-full text-sm py-8 text-center" style={{ color: theme.textMuted }}>Nothing here yet.</p>
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
								class={`hidden md:flex flex-col items-center justify-center gap-2.5 min-h-[188px] p-5 rounded-[20px] font-disp italic text-base ${PAGE_CHIP_ADD}`}
							>
								<Plus size={20} strokeWidth={2.2} />
								Something new on the shelf
							</button>
						)}

						{visibleCount < sorted.length && (
							<div ref={sentinelRef} class="col-span-full py-4 text-center">
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
			{mayEditItems && ! empty && (
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

			{/*
			  * Bottom-centre of the **content column**, never over the drawer —
			  * which is why the offset tracks the drawer's own three states
			  * rather than being a single `left-0`. Each branch is a complete
			  * literal so Zero's scanner can see it; a computed class emits no
			  * CSS at all.
			  *
			  * Mobile clears the pinned *Add item* bar when there is one.
			  */}
			<ToastStack
				toasts={toasts.toasts}
				onUndo={toasts.undo}
				onClose={toasts.close}
				positionClass={
					'fixed z-[55] left-0 right-0 ' +
					(mayEditItems ? 'bottom-[92px] md:bottom-6 ' : 'bottom-4 md:bottom-6 ') +
					/*
					 * Bounded ranges, not an override. `md:left-[68px]` plus a
					 * `min-[1120px]:` rule looks equivalent and is not: Tailwind
					 * emits arbitrary `min-[…]` variants before the named
					 * breakpoints, so at 1120 the `md` rule wins on source order and
					 * the toast sits under the docked drawer.
					 */
					'md:max-[1120px]:left-[68px] ' +
					(drawerCollapsed ? 'min-[1120px]:left-[68px]' : 'min-[1120px]:left-[340px]')
				}
				dark={dark}
				theme={theme}
			/>

			<ConfirmDialog
				open={pending !== null}
				{...dialogCopy(shownPending.current ?? { kind: 'leave' }, {
					householdName,
					itemCount: items.length,
					locationCount: locations.length,
					storeCount: stores.length,
					typeCount: types.length,
				})}
				onConfirm={() => void confirmPending()}
				onCancel={() => setPending(null)}
				dark={dark}
				theme={theme}
			/>

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
 *
 * Three states and no fourth. An invite is deliberately not one of them any
 * more: it takes the whole screen a few hundred lines up, before this is ever
 * reached.
 */
function Gate({
	status,
	dark,
	displayName,
	email,
	picture,
	onCreateHousehold,
	onSignOut,
	error,
	onDismissError,
}: {
	status: ReturnType<typeof usePantryData>['status'];
	dark: boolean;
	displayName: string;
	email: string;
	picture?: string;
	onCreateHousehold: (name: string) => Promise<string | null>;
	onSignOut: () => void;
	/** A refused household creation. The app shell's banner isn't mounted here. */
	error: string | null;
	onDismissError: () => void;
}) {
	const theme = getTheme(dark);

	const frame = (children: preact.ComponentChildren) => (
		<OutsideShell dark={dark} theme={theme}>
			<div class="w-full max-w-[440px]">
				{error && (
					<div
						role="alert"
						class="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-[13px] text-sm mb-4"
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
		</OutsideShell>
	);

	if (status.state === 'loading') {
		return frame(
			<p class="text-[13.5px] text-center" style={{ color: theme.textFaint }}>Loading&hellip;</p>
		);
	}

	if (status.state === 'no-household') {
		return frame(
			<FirstRun
				displayName={displayName}
				email={email}
				picture={picture}
				onCreate={onCreateHousehold}
				onSignOut={onSignOut}
				theme={theme}
			/>
		);
	}

	// 'guest' — the gate in index.tsx normally catches this first.
	return frame(
		<p class="text-sm text-center" style={{ color: theme.textMuted }}>Sign in to use Larder Log.</p>
	);
}
