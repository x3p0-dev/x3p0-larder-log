import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Archive, ChevronLeft, Link2Off, LogOut, Menu, Plus, Search, Trash2, UserCheck, UserMinus, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';

import { CollapsedRail } from './components/CollapsedRail';
import { Drawer } from './components/Drawer';
import type { DrawerTab } from './components/Drawer';
import { StatusChip } from './components/StatusChip';
import { SortMenu } from './components/SortMenu';
import type { SortKey } from './components/SortMenu';
import { ItemSheet } from './components/ItemSheet';
import { PAGE_BUTTON_OUTLINE, PAGE_BUTTON_PRIMARY, PAGE_BUTTON_QUIET, PAGE_CHIP_ADD, PAGE_FOCUS, PAGE_INPUT } from './lib/controlStyles';
import { AppliedFilters } from './components/AppliedFilters';
import type { AppliedFilter } from './components/AppliedFilters';
import { ItemCard } from './components/ItemCard';
import { EmptyState } from './components/EmptyState';
import { FirstRun } from './components/FirstRun';
import { InviteLanding } from './components/InviteLanding';
import { OutsideShell } from './components/OutsideShell';
import { ShoppingList } from './components/ShoppingList';
import { ShoppingListTrigger } from './components/ShoppingListTrigger';
import { ToastStack } from './components/Toast';
import { ConfirmDialog } from './components/ConfirmDialog';
import { NewHouseholdDialog } from './components/NewHouseholdDialog';
import type { ConfirmTone } from './components/ConfirmDialog';

import { useSystemTheme } from './hooks/useSystemTheme';
import { usePersistentState } from './hooks/usePersistentState';
import { usePantryData, useInvitePreview } from './hooks/usePantryData';
import { DEV_MEMBERS, devMembersEnabled, isDevMember } from './lib/devMembers';
import { addedAtOf, changedAtOf } from '../shared/stamp';
import { useToasts } from './hooks/useToasts';
import { useTripChecks } from './hooks/useTripChecks';

import { entityColorFor, getTheme, statusFor, termNameFor } from './lib/theme';
import { clearInviteAccepted, clearPendingInvite, inviteAccepted, pendingInvite } from './lib/pendingInvite';
import type { TaxonomyActions, TermFilter } from './lib/actions';

import { normalizeCode } from '../shared/invite';
import { wouldStrandHousehold } from '../shared/membership';
import type { StatusKey } from '../shared/status';
import { statusKeyFor } from '../shared/status';
import type { Item, ItemDraft, Member, Term, TermKind, ThemeOverride } from '../shared/types';
import { DEFAULT_ROLE, can } from '../shared/roles';
import type { Role } from '../shared/roles';
import { toInt } from '../shared/qty';
import { needsBuying, shoppingCount, shoppingGroups } from '../shared/shoppingList';
import { countTermFilters, matchesTermFilters, pruneTermFilter, toggleTermFilter } from '../shared/filter';
import type { TermFilters } from '../shared/filter';
import type { TermBlock } from '../shared/term';
import { termBlock, termUsageCount } from '../shared/term';

const PAGE_SIZE = 20;

/**
 * Visually hidden, but read.
 *
 * An inline style rather than a utility class, for the same reason
 * `ShoppingList` writes its own: this is the one thing on screen whose failure
 * mode is silence, and a class that did not compile would look identical to one
 * that did.
 */
const SR_ONLY = {
	position: 'absolute', width: '1px', height: '1px',
	overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
} as const;

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

/**
 * The content width row 2 needs before its controls can wear their full labels.
 *
 * Measured from the parts, not chosen: the three status pills at full padding
 * are 368, *Shopping list* with its count pill is 165, `Showing 20 of 20` is
 * ~112, and the sort trigger naming *Recently added* is ~207. With the row's
 * own gaps that is ~904, so 910 is the first width at which nothing is cramped.
 *
 * **It is compared against the content column, not the viewport**, and that is
 * the whole point: a docked drawer costs 340px, so a 1280 screen leaves 872 and
 * is every bit as cramped as a phone. Sizing off `md:` got this wrong in both
 * directions.
 */
const ROW2_FULL_PX = 910;

/** What "needs restocking" means as an ordering. */
const RESTOCK_RANK: Record<StatusKey, number> = { out: 0, low: 1, ok: 2 };

const STATUS_CHIPS: { key: StatusKey; label: string; short: string }[] = [
	{ key: 'ok', label: 'in stock', short: 'stocked' },
	{ key: 'low', label: 'running low', short: 'low' },
	{ key: 'out', label: 'out', short: 'out' },
];

/**
 * The three things still in localStorage, and all for the same reason: they are
 * properties of *this device*, not of the account (D25, D33, D41).
 *
 * A dark-mode choice made on a phone should not follow you to a desktop, and
 * neither should which household you were last looking at — the phone in the
 * kitchen is pointed at the kitchen. Nor should what is in your cart: two people
 * at two different stores would collide on the same rows, and a tick that means
 * "in *my* cart" cannot be read by someone else without saying whose.
 * Everything that is actually data lives in the database.
 *
 * Namespaced per identity so signing in as someone else picks up their choice.
 */
function themeKeyFor(userId: string) {
	return `larder.v4.${userId}.theme`;
}

function householdKeyFor(userId: string) {
	return `larder.v4.${userId}.household`;
}

function tripKeyFor(userId: string) {
	return `larder.v4.${userId}.trip`;
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

/**
 * What an empty result says, and it depends entirely on what emptied it.
 *
 * Three families, and they behave differently on purpose:
 *
 * 1. **A status chip on its own** is the good-news case — nothing is out,
 *    nothing is low. It gets **no action**, because the chip you pressed is
 *    still on screen and now reads `0`; a button would be a second control for
 *    a job the first one is still doing.
 * 2. **One term or one search** names the thing you picked, and offers to
 *    unpick exactly that.
 * 3. **Anything else** — several filters at once — cannot name a single cause
 *    without guessing which one is to blame, so it says so and clears the lot.
 */
type EmptyFilters = {
	search: string;
	/** The selected terms' names, per group. Several is the common case now. */
	locationNames: string[];
	typeNames: string[];
	storeNames: string[];
	status: StatusKey | null;
};

const STATUS_EMPTY: Record<StatusKey, { title: string; body: string }> = {
	ok: {
		title: 'Nothing’s fully stocked.',
		body: 'Everything in the larder is low or out. The shopping list has it grouped by the shop you buy it at.',
	},
	low: {
		title: 'Nothing’s running low.',
		body: 'Everything in the larder is either stocked up or already out — nothing is on its way down.',
	},
	out: {
		title: 'Nothing’s out.',
		body: 'You’ve got at least some of everything you’re tracking.',
	},
};

function emptyCopy(f: EmptyFilters): { title: string; body: string; clear: 'none' | 'one' | 'all'; label?: string } {
	/*
	 * Every *term* counts, not every group. Two locations at once is two
	 * things narrowing the screen, so it lands in the "anything else" branch
	 * below — which is right: with `Pantry or Freezer` on and nothing showing,
	 * neither name is the cause on its own.
	 */
	const named = f.locationNames.length + f.typeNames.length + f.storeNames.length;
	const searching = Boolean(f.search.trim());
	const only = named + (searching ? 1 : 0) + (f.status ? 1 : 0) === 1;

	if (f.status && only) return { ...STATUS_EMPTY[f.status], clear: 'none' };

	if (only && f.locationNames.length === 1) {
		return {
			title: `Nothing in ${f.locationNames[0]}.`,
			body: 'This location is empty right now — nothing you’re tracking lives here.',
			clear: 'one',
			label: 'Clear the location filter',
		};
	}

	if (only && f.storeNames.length === 1) {
		return {
			title: `Nothing from ${f.storeNames[0]}.`,
			body: 'No item names this store yet. Open any item and add it to its Store list.',
			clear: 'one',
			label: 'Clear the store filter',
		};
	}

	if (only && f.typeNames.length === 1) {
		return {
			title: `Nothing tagged ${f.typeNames[0]}.`,
			body: 'No item carries this type yet. Open any item and add it to its Type list.',
			clear: 'one',
			label: 'Clear the type filter',
		};
	}

	if (only && searching) {
		return {
			title: `Nothing matches “${f.search.trim()}”.`,
			body: 'Search reads item names only, so a shorter word usually finds more.',
			clear: 'one',
			label: 'Clear the search',
		};
	}

	return {
		title: 'Nothing matches these filters.',
		body: 'Together they rule out everything in the larder. Loosen one, or clear them all and start again.',
		clear: 'all',
		label: 'Clear all filters',
	};
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
	const tripKey = useMemo(() => tripKeyFor(userId), [userId]);
	const [selectedHousehold, setSelectedHousehold] = usePersistentState<string | null>(householdKey, null);

	const api = usePantryData(selectedHousehold);

	/**
	 * A household we have just created or joined, which the list has not caught
	 * up with yet.
	 *
	 * `createHousehold` and `redeemInvite` both return an id the server has
	 * already written — but `households` is a *separate* live query and re-emits
	 * a beat later. In that window the heal below sees a selection the list does
	 * not contain, reads it as stale, and puts you back where you started. It is
	 * the whole reason a brand-new household did not open.
	 */
	const claimed = useRef<string | null>(null);

	/** Create and join both switch to what they got, and hold off the heal. */
	function selectNewHousehold(householdId: string) {
		claimed.current = householdId;
		setSelectedHousehold(householdId);
	}

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
	 *
	 * **Except immediately after creating or joining one**, when the list is not
	 * yet evidence of anything. "Not in the list" only means stale if the list is
	 * current, and there is no way to ask it whether it is — so a deliberate
	 * selection says so, and waiting is safe: the id is real, so the `household`
	 * and `pantry` queries answer for it while the list catches up.
	 */
	useEffect(() => {
		if (! api.households.length || ! api.currentHouseholdId) return;

		const known = api.households.some((h) => h.id === selectedHousehold);
		/*
		 * The second confirmation, and the reason a claim cannot get stuck: the
		 * `household` query echoes back the id it *resolved*, and it only ever
		 * resolves to a membership. So either signal proves the selection real,
		 * and whichever arrives first releases the claim.
		 */
		const serverAgrees = api.currentHouseholdId === selectedHousehold;

		if (known || serverAgrees) {
			claimed.current = null;
			return;
		}

		if (claimed.current === selectedHousehold) return;

		setSelectedHousehold(api.currentHouseholdId);
	}, [api.households, api.currentHouseholdId, selectedHousehold, setSelectedHousehold]);

	// Filters and view state are all client-side; none of it is data.
	/*
	 * Each group holds a **list** of term ids, not one: OR inside a group, AND
	 * across groups (D45). Empty means the group filters nothing.
	 */
	const [activeLocations, setActiveLocations] = useState<string[]>([]);
	const [activeTypes, setActiveTypes] = useState<string[]>([]);
	const [activeStores, setActiveStores] = useState<string[]>([]);
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
	/**
	 * Whether row 2's controls have to give up their words.
	 *
	 * A `ResizeObserver` on the content column rather than a media query,
	 * because the drawer's three states change the available width by 340px
	 * without the viewport moving at all.
	 *
	 * **It starts `true`.** The first paint happens before the observer fires,
	 * and the compact row fits everywhere while the full one does not — so the
	 * one frame that might be wrong is the one that only ever has too much room.
	 */
	const columnRef = useRef<HTMLElement>(null);
	const [compact, setCompact] = useState(true);

	useEffect(() => {
		const el = columnRef.current;

		// Guarded like `useSystemTheme`'s `matchMedia`: the same absence of a
		// browser would otherwise throw here rather than degrade.
		if (! el || ! window.ResizeObserver) return;

		const observer = new ResizeObserver(([entry]) => {
			setCompact(entry.contentRect.width < ROW2_FULL_PX);
		});

		observer.observe(el);

		return () => observer.disconnect();
	}, []);

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
	/* *New household*, from the drawer's switcher and the rail's flyout (D42). */
	const [newHousehold, setNewHousehold] = useState(false);

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

		selectNewHousehold(householdId);

		return householdId;
	}

	/** First run and the dialog both create; both then switch to what they made. */
	async function createHousehold(name: string, ink: string): Promise<string | null> {
		const householdId = await api.createHousehold(name, ink);

		if (householdId) selectNewHousehold(householdId);

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
	/*
	 * Already resolved by the server (D42), so `''` here only ever means the
	 * query has not landed — never "this household has no colour".
	 */
	const householdInk = household?.household.ink ?? '';
	/*
	 * The stand-ins are held in state rather than appended as a constant, so a
	 * role chip and a removal actually *land* on them. Nothing here is written
	 * or sent — see `client/lib/devMembers.ts` — but a panel whose controls do
	 * nothing when pressed is not much better than a panel with one row in it.
	 */
	const [devMembers, setDevMembers] = useState<Member[]>(devMembersEnabled() ? [...DEV_MEMBERS] : []);
	const realMembers = household?.members ?? [];
	const members = useMemo(
		() => devMembers.length ? [...realMembers, ...devMembers] : realMembers,
		[realMembers, devMembers],
	);
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
	/*
	 * One object per group for the drawer and the rail, so neither has to know
	 * there are three separate pieces of state behind them. Memoised on the ids
	 * alone: the two setters are stable, so a filter object only changes when
	 * its selection does.
	 */
	const locationFilter = useMemo<TermFilter>(() => ({
		ids: activeLocations,
		toggle: (id) => setActiveLocations((prev) => toggleTermFilter(prev, id)),
		clear: () => setActiveLocations([]),
	}), [activeLocations]);

	const typeFilter = useMemo<TermFilter>(() => ({
		ids: activeTypes,
		toggle: (id) => setActiveTypes((prev) => toggleTermFilter(prev, id)),
		clear: () => setActiveTypes([]),
	}), [activeTypes]);

	const storeFilter = useMemo<TermFilter>(() => ({
		ids: activeStores,
		toggle: (id) => setActiveStores((prev) => toggleTermFilter(prev, id)),
		clear: () => setActiveStores([]),
	}), [activeStores]);

	const termFilters = useMemo<TermFilters>(
		() => ({ locations: activeLocations, types: activeTypes, stores: activeStores }),
		[activeLocations, activeTypes, activeStores]
	);

	const preStatusFiltered = useMemo(() => items.filter((it) => (
		matchesTermFilters(it, termFilters)
			&& it.name.toLowerCase().includes(search.toLowerCase())
	)), [items, termFilters, search]);

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
			 * label promised (D35).
			 *
			 * It sorts on `addedAt`, **not** the platform's `createdAt`, and the
			 * difference is exactly one case: an undone removal. Undo re-inserts
			 * (D17), so the row is new and its `createdAt` is now — sorting on
			 * that threw a restored item to the top of the list instead of
			 * putting it back where it was, which is not what undo means. See
			 * `shared/stamp.ts`; the fallback is what keeps rows from before the
			 * column ordering correctly.
			 */
			arr.sort((a, b) => addedAtOf(b).localeCompare(addedAtOf(a)));
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

	/**
	 * What *Clear filters* would actually clear — terms and the status pill.
	 *
	 * Deliberately **not** "any filter at all", which would count the search
	 * field. The clear does not touch search (it has its own `×`), so the wider
	 * test would put a button on screen that does nothing whenever a search is
	 * the only thing narrowing the grid.
	 */
	const anyClearableFilter = countTermFilters(termFilters) > 0 || Boolean(activeStatus);

	/**
	 * The term filters currently on, in the drawer's own order.
	 *
	 * **Location, store, type** — the same sequence the Filter tab sets them in,
	 * so the bar reads in an order someone has already learned. Status is not
	 * here on purpose: it is already on screen in row 2 as its own toggle, and a
	 * second copy would be two controls for one filter.
	 *
	 * The colour is resolved here rather than in the component because
	 * `entityColorFor` handles both forms a stored `ink` can take — a colour
	 * token, or a legacy `#rrggbb` from before D32 — and a screen that resolves
	 * only the token half draws those terms as blank space.
	 */
	const appliedFilters = useMemo<AppliedFilter[]>(() => {
		/*
		 * Walks the *term list*, not the selection, so a group's chips come out
		 * A–Z rather than in the order they were clicked. Two people who picked
		 * the same three terms in different orders see the same row.
		 */
		const group = (kind: TermKind, ids: readonly string[], list: Term[]): AppliedFilter[] => (
			list
				.filter((t) => ids.includes(t.id))
				.map((t) => ({ kind, id: t.id, name: t.name, dot: entityColorFor(t.id, list, dark).dot }))
		);

		return [
			...group('location', activeLocations, locations),
			...group('store', activeStores, stores),
			...group('type', activeTypes, types),
		];
	}, [activeLocations, activeStores, activeTypes, locations, stores, types, dark]);

	/**
	 * The total the mobile menu button wears as a crimson badge.
	 *
	 * Term filters only, and it counts the same set the bar draws — the badge
	 * exists so the *fact* that something is filtering survives scrolling past
	 * row 3, and a number that disagreed with the chips above it would be worse
	 * than no number.
	 */
	const termFilterCount = appliedFilters.length;

	/**
	 * What a screen reader hears when a filter goes.
	 *
	 * Two states rather than one, because the sentence cannot be written at the
	 * moment of the press: the counts it quotes belong to the render *after* the
	 * filter comes off. The request carries a nonce so the effect fires on every
	 * press — including two removals that happen to leave the same sentence
	 * behind — and reads the freshly derived counts on the way through.
	 *
	 * It quotes matching-of-household, which is what the sentence means to
	 * someone who cannot see the grid. Row 2's own `Showing X of Y` is a
	 * different pair — items rendered so far, of items matching — because it
	 * sits directly above a list that is still growing as you scroll.
	 */
	const [filterAnnounce, setFilterAnnounce] = useState<{ nonce: number; prefix: string } | null>(null);
	const [filterAnnouncement, setFilterAnnouncement] = useState('');

	function announceFilters(prefix: string) {
		setFilterAnnounce((prev) => ({ nonce: (prev?.nonce ?? 0) + 1, prefix }));
	}

	useEffect(() => {
		if (! filterAnnounce) return;

		setFilterAnnouncement(`${filterAnnounce.prefix} Showing ${sorted.length} of ${items.length}.`);
		// Deliberately keyed on the request alone: the counts are read here
		// rather than depended on, so a live query landing an item from another
		// device cannot re-announce a filter nobody just touched.
	}, [filterAnnounce]);

	// Reset pagination whenever the active filter set changes.
	useEffect(() => { setVisibleCount(PAGE_SIZE); }, [termFilters, activeStatus, search]);

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
		const prune = (
			ids: string[],
			list: Term[],
			set: (next: string[]) => void
		) => {
			// `pruneTermFilter` hands back the *same array* when nothing was
			// stale, which is what stops this effect from setting state on every
			// pass and re-running itself forever.
			const kept = pruneTermFilter(ids, (id) => list.some((t) => t.id === id));
			if (kept !== ids) set(kept as string[]);
		};

		prune(activeLocations, locations, setActiveLocations);
		prune(activeTypes, types, setActiveTypes);
		prune(activeStores, stores, setActiveStores);
	}, [locations, types, stores, activeLocations, activeTypes, activeStores]);

	/*
	 * The shopping list is a **view of the filtered items**, not a thing anyone
	 * keeps: every item currently low or out, grouped by where you would buy it.
	 * Nothing is authored into it and nothing is authored out of it, which is
	 * why there is no shopping-list tab and no way for the list and the pantry
	 * to disagree.
	 */
	const shoppingGroupsForView = useMemo(() => shoppingGroups(filtered, stores), [filtered, stores]);

	/** What is on this screen — the filtered count. */
	const toBuyHere = useMemo(() => shoppingCount(filtered), [filtered]);

	/**
	 * What the household has to buy, filters or no filters.
	 *
	 * The trigger wears this one and nothing else: it answers *is there shopping
	 * to do*, which is a fact about the household. The meta line answers *what
	 * is on this screen*, and the two are allowed to disagree.
	 */
	const toBuyTotal = useMemo(() => shoppingCount(items), [items]);

	/**
	 * The ids a tick can still belong to.
	 *
	 * Deliberately the *unfiltered* set: narrowing to one store must not read as
	 * having bought everything else, and a check whose row is merely filtered
	 * out has not been bought.
	 */
	const buyableIds = useMemo(
		() => new Set(items.filter(needsBuying).map((it) => it.id)),
		[items]
	);

	const trip = useTripChecks(tripKey, api.currentHouseholdId, buyableIds);
	const { setListMode } = trip;

	/*
	 * The mode is only meaningful while there is something to buy. It survives a
	 * reload — the single most likely thing to go wrong on a phone in a shop —
	 * but the trigger is hidden once the list would be empty, and a mode with no
	 * way out is worse than one that lets go.
	 */
	const listMode = trip.listMode && toBuyTotal > 0;

	/*
	 * Only named when the Store filter is a *single* store — the sentence it
	 * feeds is "Nothing to buy at Costco", which two stores cannot complete.
	 * With several on, the list falls back to its generic empty copy.
	 */
	const storeFilterName = activeStores.length === 1 ? termNameFor(activeStores[0]!, stores) : null;

	/**
	 * What the meta line says in list mode, at both widths.
	 *
	 * Three facts, and each one earns its place only when it is true: how much
	 * there is to buy *here*, how many shops that is spread across, and how much
	 * of it is already in the cart. A filter that is hiding something says so —
	 * `6 of 11 to buy` — rather than quietly showing a short list.
	 */
	/**
	 * How much of *this screen* is in the cart.
	 *
	 * A tick lives on the item, so filtering to one store leaves ticks on rows
	 * that are no longer here. The line describes the screen, so it counts the
	 * screen.
	 */
	const inCart = useMemo(
		() => filtered.filter((it) => needsBuying(it) && trip.checked.has(it.id)).length,
		[filtered, trip.checked]
	);

	const tripLine = useMemo(() => {
		const parts: string[] = [];

		if (storeFilterName) {
			parts.push(`${toBuyHere} to buy at ${storeFilterName}`);
		} else {
			parts.push(toBuyHere < toBuyTotal ? `${toBuyHere} of ${toBuyTotal} to buy` : `${toBuyHere} to buy`);

			if (shoppingGroupsForView.length > 1) parts.push(plural(shoppingGroupsForView.length, 'store'));
		}

		const short = parts.join(' · ');

		/*
		 * **The cart clause is the one that goes at 390.** How many are checked
		 * is the half a glance can spare — the trip bar below already says it,
		 * next to the control that acts on it.
		 */
		return { short, full: inCart > 0 ? `${short} · ${inCart} in the cart` : short };
	}, [storeFilterName, toBuyHere, toBuyTotal, shoppingGroupsForView, inCart]);

	/**
	 * What the rest of the household still has to buy, for the scoped empty
	 * state. Multi-store items count as elsewhere only if they are not also here.
	 */
	const elsewhereCount = useMemo(() => (
		activeStores.length
			? items.filter((it) => needsBuying(it) && ! activeStores.some((id) => it.storeIds.includes(id))).length
			: 0
	), [items, activeStores]);

	/*
	 * Escape leaves the mode. It is not an overlay, so nothing else claims the
	 * key — but a sheet or a dialog over it does, and theirs has to win.
	 */
	useEffect(() => {
		if (! listMode) return;

		function onKey(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;
			if (pending || showForm || editingId) return;

			setListMode(false);
		}

		window.addEventListener('keydown', onKey);

		return () => window.removeEventListener('keydown', onKey);
	}, [listMode, pending, showForm, editingId, setListMode]);

	// --- Item actions ------------------------------------------------------

	/**
	 * What the screen says when the filters rule everything out.
	 *
	 * Derived rather than branched at the call site so the *copy* and the
	 * *action* are decided together — an action that clears a filter the title
	 * never mentioned is the failure mode this shape prevents.
	 */
	const noMatch = useMemo(() => emptyCopy({
		search,
		locationNames: activeLocations.map((id) => termNameFor(id, locations)),
		typeNames: activeTypes.map((id) => termNameFor(id, types)),
		storeNames: activeStores.map((id) => termNameFor(id, stores)),
		status: activeStatus,
	}), [search, activeLocations, activeTypes, activeStores, activeStatus, locations, types, stores]);

	/**
	 * Clears the single filter the copy named.
	 *
	 * `emptyCopy` only reports `one` when exactly one filter is set, so this
	 * cannot clear the wrong thing — it clears whichever one is set.
	 */
	function clearOneFilter() {
		if (activeLocations.length) setActiveLocations([]);
		else if (activeTypes.length) setActiveTypes([]);
		else if (activeStores.length) setActiveStores([]);
		else if (activeStatus) setActiveStatus(null);
		else setSearch('');
	}

	function clearAllFilters() {
		setActiveLocations([]); setActiveTypes([]); setActiveStores([]);
		setActiveStatus(null); setSearch('');
	}

	/**
	 * What *Clear filters* clears: every term chip **and the active status
	 * pill** — everything narrowing the grid invisibly.
	 *
	 * **Search is deliberately untouched.** It has its own `×` in the field and
	 * you can see it working, so clearing it from here would empty a control the
	 * visitor is looking at for reasons they cannot connect to the button they
	 * pressed. `clearAllFilters` above *does* take it, and is the one the empty
	 * state offers — there the copy says the filters together rule everything
	 * out, and the search is part of "together".
	 *
	 * The drawer's own *Clear all filters* calls this same function. Same
	 * action, longer label, because inside the Filter tab the word "all" has a
	 * list to refer to.
	 */
	function clearFilters() {
		setActiveLocations([]); setActiveTypes([]); setActiveStores([]);
		setActiveStatus(null);
		announceFilters('Filters cleared.');
	}

	function removeTermFilter(kind: TermKind, id: string) {
		const name = termNameFor(id, termsOf(kind));

		updateActiveIds(kind, (prev) => prev.filter((x) => x !== id));
		announceFilters(`${name} filter removed.`);
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
			// (D17), which nothing references — but it carries the removed row's
			// *own* stamps, so *Recently added* puts it back where it was rather
			// than at the top, and it does not read as freshly edited either.
			// That is what has to survive the round trip; see `shared/stamp.ts`.
			onUndo: () => {
				void api.addItem({
					name: item.name,
					locationId: item.locationId,
					typeIds: item.typeIds,
					storeIds: item.storeIds,
					qty: item.qty,
					threshold: item.threshold,
					notes: item.notes,
				}, { addedAt: addedAtOf(item), changedAt: changedAtOf(item) });
			},
		});
	}

	/** The list a kind's terms live in, and the filter currently pointed at it. */
	function termsOf(kind: TermKind): Term[] {
		return kind === 'location' ? locations : kind === 'type' ? types : stores;
	}

	function activeIdsOf(kind: TermKind): string[] {
		return kind === 'location' ? activeLocations : kind === 'type' ? activeTypes : activeStores;
	}

	/**
	 * A group's selection, updated from its own previous value.
	 *
	 * Functional rather than a plain `set(next)` because both callers are
	 * **late**: a chip's removal fires 140ms after the press, and `restoreTerm`
	 * fires after a round trip to the server. Either could otherwise write back
	 * an array captured before something else touched the same group.
	 */
	function updateActiveIds(kind: TermKind, next: (prev: string[]) => string[]) {
		if (kind === 'location') setActiveLocations(next);
		else if (kind === 'type') setActiveTypes(next);
		else setActiveStores(next);
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
		const wasActive = activeIdsOf(kind).includes(id);

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
	 * **Position survives now**, two different ways: term lists are sorted A–Z
	 * server-side, so a restored term lands where its name puts it rather than
	 * at the end, and its stamps travel with it so the row is not younger than
	 * it was. The term is still genuinely re-created — same trade as D17 — but
	 * nothing visible reveals that any more.
	 */
	async function restoreTerm(kind: TermKind, term: Term, wasActive: boolean) {
		const id = await taxonomy.create(
			kind,
			{ name: term.name, ink: term.ink },
			{ addedAt: addedAtOf(term), changedAt: changedAtOf(term) }
		);

		if (id && wasActive) updateActiveIds(kind, (prev) => [...prev, id]);
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
				// The stand-ins take the real dialog and the real toast; only the
				// mutation is skipped. See `client/lib/devMembers.ts`.
				if (isDevMember(action.membershipId)) {
					setDevMembers((prev) => prev.filter((m) => m.id !== action.membershipId));
					toasts.push({ lead: 'Member removed.' });
					return;
				}

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
				// The *only* filter, deliberately: you pressed "show me the items
				// that are using this", so anything else still narrowing would
				// answer a different question.
				updateActiveIds(action.termKind, () => [action.termId]);
				setCloseEditing((n) => n + 1);
				return;
		}
	}

	function emptyDraft(): ItemDraft {
		return {
			name: '',
			/*
			 * Prefilled only when the Location filter is unambiguous. With two
			 * on, picking one of them would be the app quietly choosing — and
			 * choosing the wrong one is worse here than choosing nothing.
			 */
			locationId: (activeLocations.length === 1 ? activeLocations[0] : locations[0]?.id) ?? '',
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
					locationFilter={locationFilter} storeFilter={storeFilter} typeFilter={typeFilter}
					itemCount={items.length} locationCounts={locationCounts}
					householdName={householdName} householdInk={householdInk}
					households={api.households} currentHouseholdId={api.currentHouseholdId}
					onSelectHousehold={setSelectedHousehold}
					onNewHousehold={() => setNewHousehold(true)} onJoinHousehold={joinWithCode}
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
				locationFilter={locationFilter} typeFilter={typeFilter} storeFilter={storeFilter}
				countFor={countFor} anyFilterActive={anyClearableFilter} onClearAll={clearFilters}
				tab={drawerTab} setTab={setDrawerTab}
				open={drawerOpen} onClose={() => setDrawerOpen(false)}
				collapsed={drawerCollapsed}
				onDismiss={() => { setDrawerOpen(false); setDrawerCollapsed(true); }}
				householdName={householdName} householdInk={householdInk}
				households={api.households} currentHouseholdId={api.currentHouseholdId}
				onSelectHousehold={setSelectedHousehold}
				onNewHousehold={() => setNewHousehold(true)} onJoinHousehold={joinWithCode}
				accountName={displayName}
				settings={{
					themeOverride, setThemeOverride,
					householdName,
					setHouseholdName: (v) => void api.updateHousehold({ name: v }),
					householdInk,
					setHouseholdInk: (v) => void api.updateHousehold({ ink: v }),
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
					// A stand-in never reaches the network: it is answered here and
					// the server is never asked about an id it has no row for.
					onChangeRole: (membershipId, role) => {
						if (isDevMember(membershipId)) {
							setDevMembers((prev) => prev.map((m) => m.id === membershipId ? { ...m, role } : m));
							return;
						}

						api.changeRole(membershipId, role);
					},
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
					<span class="relative shrink-0 inline-flex">
						<button
							onClick={() => { setDrawerOpen(true); setDrawerCollapsed(false); }}
							class={`flex items-center justify-center w-11 h-11 rounded-[13px] ${PAGE_BUTTON_OUTLINE}`}
							aria-label={termFilterCount ? `Open menu, ${plural(termFilterCount, 'filter')} applied` : 'Open menu'}
						>
							<Menu size={19} />
						</button>
						{/*
						  * The total across all three groups, so the *fact* that
						  * something is filtering survives scrolling past row 3 —
						  * which on a phone is the first thing to go.
						  *
						  * Same construction as the rail's badges, with one
						  * difference that matters: the ring is drawn in the page
						  * ground rather than the rail's fixed dark, so it follows
						  * the theme where the rail's cannot.
						  */}
						{termFilterCount > 0 && (
							<span
								class="absolute -top-[5px] -right-[5px] flex items-center justify-center min-w-[19px] h-[19px] px-1 rounded-full text-[10.5px] font-bold bg-accent text-surface pointer-events-none"
								style={{ boxShadow: `0 0 0 2px ${theme.ground}` }}
							>
								{termFilterCount}
							</span>
						)}
					</span>

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

					{/*
					  * The shopping list's toggle, on mobile only, squared up with the
					  * wordmark opposite the menu button. It is chrome — a standing
					  * fact about the household rather than a fact about the screen
					  * you are on — and up here it costs row 2 nothing, which is what
					  * lets the pills and the sort share one line again.
					  *
					  * **It stays here in list mode too**, wearing its active fill.
					  * The way out used to be a different control in a different row,
					  * so a press moved the thing you had just pressed; now the way in
					  * and the way out are one button that never leaves its slot.
					  */}
					{! empty && toBuyTotal > 0 && (
						<span class="ml-auto shrink-0">
							<ShoppingListTrigger
								active={listMode}
								count={toBuyTotal}
								onToggle={() => setListMode(! listMode)}
								compact
								dark={dark}
								theme={theme}
							/>
						</span>
					)}
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
				<main ref={columnRef}>
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
					  * Row 2 is the state of what you are looking at, and the two
					  * modes fill it differently.
					  *
					  * **Grid:** the three status pills, then the shopping-list
					  * trigger immediately after them, then `Showing X of Y` and the
					  * sort pushed right. That sequence is the on-ramp — the eye
					  * crosses `9 in stock · 6 running low · 5 out` and lands on the
					  * thing to do about it.
					  *
					  * **List:** the pills go, because you are already filtered to low
					  * and out and `9 in stock` has nothing to say; the sort goes,
					  * because the list has one fixed order. The trigger stays exactly
					  * where it was and fills in, and the trip count takes the slot
					  * `Showing X of Y` occupies.
					  *
					  * **It is one line at every width.** The trigger moves into the
					  * mobile header below `md` — in both modes — which is exactly
					  * what buys the pills and the sort room to share a row again at
					  * 390.
					  */}
					{! empty && (
					<div class={`flex items-center pt-6 pb-4 px-0.5 ${compact ? 'gap-2' : 'gap-3.5'}`}>
						{/*
						  * The row's left slot, and it is **the same width in both
						  * modes**. In list mode the pills go `invisible` rather than
						  * unmounting, and *Back to items* is laid over them.
						  *
						  * That is the whole reason for the wrapper: the trigger sits
						  * immediately after this slot, and unmounting the pills slid it
						  * a third of the way across the screen on every press. A
						  * control that moves when you press it is the one thing this
						  * row cannot do — you look back to where you pressed to see
						  * what happened. `visibility: hidden` keeps the geometry and
						  * takes the pills out of the tab order and the a11y tree, which
						  * `opacity-0` would not.
						  *
						  * The overlay is absolute rather than a second flex child for
						  * the same reason: in flow it would add its own width to the
						  * slot. It sits outside the pills' scroll port, which clips.
						  */}
						<div class={compact ? 'relative flex-1 min-w-0 flex items-center' : 'relative flex items-center'}>
							{/*
							 * When space is short the pills take the row's slack and
							 * scroll inside it, so three counts can never wrap onto
							 * three lines or shove the sort off the end. With room they
							 * size to their content and the trigger sits right after
							 * them.
							 *
							 * `p-1 -m-1` is what makes that scroller safe to select in:
							 * `overflow-x-auto` clips on **both** axes, and a selected
							 * pill's ring is a 3.5px box-shadow *outside* its border box
							 * — so it was shaved top and bottom on every chip and on the
							 * left of the first one. The padding gives the ring room
							 * inside the scroll port; the negative margin gives the row
							 * back the width it cost.
							 */}
							<div class={
								compact
									? (listMode
										? 'invisible w-full min-w-0 flex items-center gap-2 overflow-x-auto p-1 -m-1'
										: 'w-full min-w-0 flex items-center gap-2 overflow-x-auto p-1 -m-1')
									: (listMode
										? 'invisible flex items-center gap-3.5 flex-wrap'
										: 'flex items-center gap-3.5 flex-wrap')
							}>
								{STATUS_CHIPS.map(({ key, label, short }) => (
									<StatusChip
										key={key} statusKey={key} label={label} short={short} count={statusCounts[key]}
										active={activeStatus === key} compact={compact} dark={dark} theme={theme}
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
										class="inline-flex items-center shrink-0 px-3 h-10 rounded-full text-[13.5px]"
										style={{ background: theme.neutralChipBg, color: theme.textMuted, border: `1px solid ${theme.border}` }}
									>
										View only
									</span>
								)}
							</div>

							{/*
							  * The exit, and it is **quiet**. The trigger is the loud
							  * half of this pair now — filled while the mode is on — so
							  * the way out is the sort menu's resting treatment: a
							  * chevron and its words on nothing, resolving under the
							  * pointer. Two filled controls a gap apart would both be
							  * asking to be pressed.
							  */}
							{listMode && (
								<button
									onClick={() => setListMode(false)}
									class={`absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 whitespace-nowrap ${compact ? 'h-11 px-2.5' : 'h-10 px-3'} rounded-[11px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${PAGE_BUTTON_QUIET}`}
								>
									<ChevronLeft size={16} strokeWidth={2.4} />
									Back to items
								</button>
							)}
						</div>

						{/*
						  * The trigger, in **both** modes. One control with two homes —
						  * here from `md` up, the mobile header below it — and never
						  * both at once. It does not move when the mode changes: same
						  * slot, same x, wearing its active fill, and pressing it again
						  * is the way out.
						  *
						  * `ml-0.5` is the 2px the boards set it off the last pill by,
						  * on top of the row's own gap — and it is measured off the same
						  * slot in list mode, because the slot holds its width.
						  */}
						{toBuyTotal > 0 && (
							<span class="hidden md:inline-flex md:ml-0.5 shrink-0">
								<ShoppingListTrigger
									active={listMode}
									count={toBuyTotal}
									onToggle={() => setListMode(! listMode)}
									compact={compact}
									dark={dark}
									theme={theme}
								/>
							</span>
						)}

						{/*
						  * `ml-auto` rather than a spacer: with room it pushes the tail
						  * right, and with none it collapses — where a second `flex-1`
						  * would have taken half the slack off the pills.
						  */}
						<div class="ml-auto shrink-0 flex items-center gap-[18px]">
							{/*
							  * The grid's `X of Y` is what row 2 gives up first at 390 —
							  * the pills already carry the counts that matter and the
							  * grid itself is directly below. The list's trip line stays
							  * at every width: nothing else on screen says it.
							  */}
							<span
								class={
									'text-right ' + (compact ? 'text-[12.5px] ' : 'text-sm ') +
									// Hidden on width, not on viewport: a docked drawer at
									// 1280 is exactly as short of room as a phone is.
									(listMode || ! compact ? '' : 'hidden')
								}
								style={{ color: theme.textMuted }}
							>
								{listMode
									? (compact ? tripLine.short : tripLine.full)
									: `Showing ${Math.min(visibleCount, sorted.length)} of ${sorted.length}`}
							</span>

							{/*
							  * The list has one fixed order — out before low, then A–Z —
							  * so offering to change it would be a lie.
							  *
							  * Pulled to the edge so the trigger's padding does not read
							  * as a gap.
							  */}
							{! listMode && (
								<div class="-mr-2 md:mr-0">
									<SortMenu open={sortMenuOpen} setOpen={setSortMenuOpen} sortBy={sortBy} setSortBy={setSortBy} compact={compact} theme={theme} />
								</div>
							)}
						</div>
					</div>
					)}

					{/*
					  * The one thing on this screen whose failure mode is silence.
					  *
					  * It lives out here rather than inside `AppliedFilters` because
					  * the bar unmounts with its last chip — announcing *Filters
					  * cleared* from inside it would mean announcing from a node
					  * that has just been removed, which is exactly nothing.
					  */}
					<span role="status" aria-live="polite" style={SR_ONLY}>{filterAnnouncement}</span>

					{/*
					  * **Row 3 — the applied filters.** Present only while a term
					  * filter is on, so most of the time the bar is still two rows.
					  *
					  * It stays in list mode. The list obeys the same filters, so the
					  * bar and its clear come with you: row 1 never changes and row 2
					  * swaps its contents, which is what makes the switch read as the
					  * content changing rather than the app changing.
					  */}
					{! empty && (
						<AppliedFilters
							filters={appliedFilters}
							onRemove={removeTermFilter}
							onClear={clearFilters}
						/>
					)}

					{/*
					  * The shopping list **replaces** the content column rather than
					  * covering it. A modal is a question — centred, focus-trapped,
					  * dismissed to continue — and a shopping list is a reference you
					  * read while doing something else, with a checkbox on every row.
					  *
					  * It obeys the filters, because it is a view of the same set
					  * narrowed to low and out: a Type filter of *Produce* gives you the
					  * produce run, and a Store filter collapses it to one card.
					  */}
					{listMode ? (
						<ShoppingList
							groups={shoppingGroupsForView}
							checked={trip.checked}
							onToggle={mayEditItems ? trip.toggle : undefined}
							onOpenItem={mayEditItems ? startEdit : undefined}
							onBack={() => trip.setListMode(false)}
							storeFilterName={storeFilterName}
							elsewhereCount={elsewhereCount}
							onClearStoreFilter={() => setActiveStores([])}
							onClearFilters={clearAllFilters}
							dark={dark}
							theme={theme}
						/>
					) : (
					<>
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
							  * Two different nothings, and they are different screens.
							  * An empty *household* is a state the app has to explain
							  * and it carries the only *Add item*; a filter that matches
							  * nothing is something the visitor did, so the copy names
							  * what they did and the action undoes exactly that.
							  *
							  * Both go through `EmptyState`, so a filtered result can
							  * never again read as the 14px grey sentence that looked
							  * like a rendering failure.
							  */}
							{empty ? (
								<EmptyState
									title="Nothing in the larder yet."
									body="Add your first item. Your locations, stores and types are already set up in Filters — rename or recolour them whenever you like."
									action={mayEditItems ? { label: 'Add item', icon: Plus, onClick: openAddForm } : undefined}
									theme={theme}
								>
									{/*
									  * The one thing the stripped top bar took with it that
									  * a viewer still needs: why there is nothing to press.
									  */}
									{! mayEditItems && (
										<span
											class="inline-flex items-center px-3 py-[7px] mt-1.5 rounded-full text-[13.5px]"
											style={{ background: theme.neutralChipBg, color: theme.textMuted, border: `1px solid ${theme.border}` }}
										>
											View only
										</span>
									)}
								</EmptyState>
							) : sorted.length === 0 && (
								<EmptyState
									title={noMatch.title}
									body={noMatch.body}
									action={noMatch.clear === 'none' ? undefined : {
										label: noMatch.label ?? 'Clear all filters',
										onClick: noMatch.clear === 'all' ? clearAllFilters : clearOneFilter,
									}}
									theme={theme}
								/>
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
					</>
					)}
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

			<NewHouseholdDialog
				open={newHousehold}
				taken={api.households.map((h) => h.ink)}
				onCreate={createHousehold}
				onCancel={() => setNewHousehold(false)}
				dark={dark}
				theme={theme}
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
	onCreateHousehold: (name: string, ink: string) => Promise<string | null>;
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
