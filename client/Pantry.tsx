import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Archive, ArrowRightLeft, ChevronLeft, ChevronRight, Link2Off, LogOut, Menu, Plus, Search, Trash2, UserCheck, UserMinus, X } from 'lucide-preact';
import type { LucideIcon } from 'lucide-preact';

import { CollapsedRail } from './components/CollapsedRail';
import { Drawer } from './components/Drawer';
import type { DrawerTab } from './components/Drawer';
import { StatusChip } from './components/StatusChip';
import { SortMenu } from './components/SortMenu';
import type { SortKey } from './components/SortMenu';
import { ItemSheet } from './components/ItemSheet';
import { SuggestMenu, useSuggest } from './components/SuggestMenu';
import type { SuggestGroup, SuggestRow } from './components/SuggestMenu';
import {
	PAGE_BUTTON_OUTLINE, PAGE_BUTTON_QUIET, PAGE_CHIP_ADD, PAGE_FIELD_HALO_WITHIN,
	PAGE_FIELD_HALO_WITHIN_DARK, PAGE_FOCUS, PAGE_ICON_IN_FIELD, PAGE_INPUT,
} from './lib/controlStyles';
import { AppliedFilters } from './components/AppliedFilters';
import type { AppliedFilter } from './components/AppliedFilters';
import { ItemCard } from './components/ItemCard';
import { EmptyState } from './components/EmptyState';
import { DisplayNameCard } from './components/DisplayNameCard';
import { FirstRun } from './components/FirstRun';
import { InviteLanding } from './components/InviteLanding';
import { OutsideShell } from './components/OutsideShell';
import { RunList } from './components/RunList';
import { PutAwaySheet } from './components/PutAwaySheet';
import { RunListTrigger } from './components/RunListTrigger';
import { RunSegment, runSegmentPx } from './components/RunSegment';
import { AddMenu } from './components/AddMenu';
import type { AddRoute } from './components/AddMenu';
import { PasteListSheet } from './components/PasteListSheet';
import { CommonItems } from './components/CommonItems';
import { BulkReview } from './components/BulkReview';
import { ToastStack } from './components/Toast';
import { AccountDeleteConfirm } from './components/AccountDeleteConfirm';
import { AccountGoneCard } from './components/AccountGoneCard';
import { AccountPreflight } from './components/AccountPreflight';
import { ExportPantry } from './components/ExportPantry';
import { ConfirmDialog } from './components/ConfirmDialog';
import { NewHouseholdDialog } from './components/NewHouseholdDialog';
import type { ConfirmTone } from './components/ConfirmDialog';

import { useSystemTheme } from './hooks/useSystemTheme';
import { setThemeColor } from './lib/appIcon';
import { usePersistentState } from './hooks/usePersistentState';
import { readViewState, usePersistedView } from './hooks/useViewState';
import { usePantryData, useInvitePreview, useProfile } from './hooks/usePantryData';
import { DEV_MEMBERS, devMembersEnabled, isDevMember } from './lib/devMembers';
import { devItemsEnabled, runDemoSeed } from './lib/devItems';
import { useAvatarSync } from './hooks/useAvatarSync';
import { useAdminAccess } from './hooks/useAdminData';
import { useAccountWrites } from './hooks/useAccountData';
import { downloadExport } from './lib/download';
import { AdminConsole } from './components/AdminConsole';
import type { AdminSection } from './components/AdminPane';
import { adminDeepLink } from './lib/adminEntry';
import { addedAtOf, changedAtOf } from '../shared/stamp';
import { bulkDrafts, bulkSummary, rowsFromCatalog, rowsFromLines } from '../shared/bulkEntry';
import type { BulkRow, BulkSource, ParsedLine } from '../shared/bulkEntry';
import type { CatalogItem } from '../shared/catalog';
import { useToasts } from './hooks/useToasts';
import { useTripChecks } from './hooks/useTripChecks';

import { entityColorFor, getTheme, statusFor, termNameFor } from './lib/theme';
import { clearInviteAccepted, clearPendingInvite, inviteAccepted, pendingInvite } from './lib/pendingInvite';
import type { TaxonomyActions, TermFilter } from './lib/actions';

import { normalizeCode } from '../shared/invite';
import { wouldStrandHousehold } from '../shared/membership';
import type { StatusKey } from '../shared/status';
import { statusKeyFor } from '../shared/status';
import type { SourceKind } from '../shared/source';
import type { SourceMix } from '../shared/seed';
import { sourceGroupWord } from '../shared/source';
import type {
	AdminHouseholdFilter, AdminPeopleFilter,
	Item, ItemDraft, Member, Term, TermKind, ThemeOverride,
} from '../shared/types';
import { DEFAULT_ROLE, can } from '../shared/roles';
import type { Role } from '../shared/roles';
import { toInt } from '../shared/qty';
import { runBands, runCount, runIds } from '../shared/runList';
import { putAwayRows, restockEntry } from '../shared/restock';
import type { ClaimOwner } from '../shared/claim';
import type { PutAwayRow } from '../shared/restock';
import type { AccountHousehold, RecapRow } from '../shared/accountDeletion';
import { decisionsFrom, needsPreflight, recapRows, transferBody, transferTitle } from '../shared/accountDeletion';
import type { ExportFormat } from '../shared/exportData';
import { pantryFile, pantryFilename } from '../shared/exportData';
import { monthOf } from '../shared/season';
import type { RunTab } from './components/RunSegment';
import { countTermFilters, matchesTermFilters, pruneTermFilter, toggleTermFilter } from '../shared/filter';
import { matchesQuery, searchSuggestions, sizeSearchText } from '../shared/suggest';
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

/** The listbox the search field points `aria-controls` at. */
const SEARCH_SUGGEST_ID = 'search-suggestions';

/**
 * The content width row 2 needs before its controls can wear their full forms.
 *
 * Measured from the parts, not chosen, and **re-measured on 2026-08-29 because
 * three of the four parts changed**. It was 910: the three status pills at 368,
 * *Shopping list* with its count pill at 165, `Showing 20 of 20` at ~112, and
 * the sort trigger naming *Recently added* at ~207. Since then the count line
 * is **deleted**, the trigger is a glyph and a count (~72), and the sort names
 * its choice the short way at every width (~100). With the row's own gaps that
 * is ~572, so 580 is the first width at which nothing is cramped.
 *
 * **What it still governs is now mostly touch geometry** — the pills' short
 * words, and the 44px height every control on the row shares — since the two
 * controls that used to shed words no longer have any to shed. Whether the
 * *segment* wears its labels is a separate threshold; see `ROW2_LIST_PX`.
 *
 * **It is compared against the content column, not the viewport**, and that is
 * the whole point: a docked drawer costs 340px, so a 1280 screen leaves 872.
 * Sizing off `md:` got this wrong in both directions. The cost of the new
 * number is that a landscape phone clears it and takes the 40px row; the gain
 * is that a docked drawer on a desktop stops wearing a 390 layout with 300px of
 * the row empty.
 */
const ROW2_FULL_PX = 580;

/**
 * What row 2 spends in list mode on everything that is not the segment.
 *
 * Measured the same way, and there is very little left to measure: *Back to
 * items* is ~145, `3 in the cart` is ~88, and the row's own gaps are the rest.
 * Add `runSegmentPx()` to it and you have the width at which the segment can
 * wear its words.
 *
 * **Neither the pills' slot nor the trigger is in it**, and that is the whole
 * reason the words fit. The pills unmount in list mode rather than going
 * `invisible`, and the trigger is not on this row in list mode at all — so the
 * only fixed costs are the exit and one short clause. At 265 a household with
 * all three bands wears its labels from ~685 of column, which is every desktop
 * arrangement this app has: the drawer does not dock below 1120, and undocked
 * that is a 753px window.
 *
 * It stays a little conservative below `md`, where the trip clause goes with
 * the words, rather than keeping a second constant for one band.
 */
const ROW2_LIST_PX = 265;

/** What "needs restocking" means as an ordering. */
const RESTOCK_RANK: Record<StatusKey, number> = { out: 0, low: 1, ok: 2 };

const STATUS_CHIPS: { key: StatusKey; label: string; short: string }[] = [
	{ key: 'ok', label: 'in stock', short: 'stocked' },
	{ key: 'low', label: 'running low', short: 'low' },
	{ key: 'out', label: 'out', short: 'out' },
];

/**
 * The four things in localStorage, and all for the same reason: they are
 * properties of *this device*, not of the account (D25, D33, D41, D51).
 *
 * A dark-mode choice made on a phone should not follow you to a desktop, and
 * neither should which household you were last looking at — the phone in the
 * kitchen is pointed at the kitchen. Nor should what is in your cart: two people
 * at two different stores would collide on the same rows, and a tick that means
 * "in *my* cart" cannot be read by someone else without saying whose. Nor which
 * shelf you had filtered to, or whether the drawer was folded away.
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

function viewKeyFor(userId: string) {
	return `larder.v4.${userId}.view`;
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
	/**
	 * Handing the household over (D68).
	 *
	 * **In the destructive family even though nothing is destroyed.** A confirm
	 * takes crimson because it is *final*; a blocked dialog takes amber because
	 * it is a *precondition*. Losing ownership passes the second test and fails
	 * the first, so the ramp is picked by finality rather than by data loss —
	 * which is the existing two users generalised, not a new rule.
	 */
	| { kind: 'transfer-ownership'; membershipId: string; name: string }
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
				body: `They lose access to ${name} right away. You can invite them back with a new link.`,
				confirmLabel: 'Remove member',
			};

		case 'transfer-ownership':
			return {
				tone: 'danger',
				icon: ArrowRightLeft,
				title: transferTitle(pending.name),
				body: transferBody(pending.name, name),
				confirmLabel: 'Transfer ownership',
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
				body: `You’re its only member, so leaving deletes it. ${plural(itemCount, 'item')}, ${plural(locationCount, 'location')}, ${plural(storeCount, 'store')}, and ${plural(typeCount, 'type')} go permanently.`,
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
	/**
	 * `Store` or `Source`, from `sourceGroupWord()` — the copy names the group
	 * the way the drawer's heading does (D58), or it sends someone to a *Store*
	 * list that is labelled *Source* one panel over.
	 */
	sourceWord: 'Store' | 'Source';
	status: StatusKey | null;
};

const STATUS_EMPTY: Record<StatusKey, { title: string; body: string }> = {
	ok: {
		title: 'Nothing’s fully stocked.',
		body: 'Everything in the larder is low or out. The run list has it grouped by where you get it from.',
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
			body: `No item names this ${f.sourceWord.toLowerCase()} yet. Open any item and add it to its ${f.sourceWord} list.`,
			clear: 'one',
			label: `Clear the ${f.sourceWord.toLowerCase()} filter`,
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
			body: 'Search reads item names and sizes, and matches the start of a word — so a shorter word usually finds more.',
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
	/**
	 * The **identity's** name, which is a suggestion rather than an answer.
	 *
	 * It is whatever the Spacefast account carried, and it is often nothing at
	 * all — which is the whole reason the account keeps its own
	 * display name (D46). Everything below reads `accountName`, resolved from
	 * the profile with this as the last fallback; the one place this is used
	 * directly is prefilling the field that sets the profile.
	 */
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
	 * The browser chrome follows the *app's* theme, not the OS's. The two part
	 * company the moment this device overrides it (D25), and an installed app
	 * has no tab strip to absorb the difference — the status bar sits directly
	 * on the page.
	 */
	useEffect(() => {
		setThemeColor(dark);
	}, [dark]);

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
	const profile = useProfile();

	/**
	 * The name the rest of the household sees, and the one every surface below
	 * renders.
	 *
	 * The profile answers whenever it has one. The identity's name is the
	 * fallback for the moment before the query lands — and for a dev guest,
	 * which has no profile row and no household to inherit a name from.
	 */
	const accountName = (
		(profile.status.state === 'ready' ? profile.status.displayName : '') || displayName || 'Signed in'
	);

	/**
	 * Nobody gets past this without a name (D46), and *settled* is the stronger
	 * of the two — it means the question has been answered, not merely that the
	 * screen is not showing.
	 */
	const needsName = profile.status.state === 'ready' && profile.status.needsName;
	const nameSettled = profile.status.state === 'ready' && ! profile.status.needsName;

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

	/**
	 * Where this device left off (D51) — read once, before the state it seeds.
	 *
	 * It is read rather than subscribed to: these are *initial values*, and a
	 * second tab writing its own view is not an instruction to this one to move.
	 *
	 * Seeding state from it once is safe in a way it would not be for the theme
	 * or the household, whose hooks re-read on a key change: `Pantry` renders
	 * only while signed in, so `userId` cannot change underneath it — signing
	 * out unmounts the whole component and the next account mounts a new one.
	 */
	const viewKey = useMemo(() => viewKeyFor(userId), [userId]);
	const restored = useMemo(() => readViewState(viewKey), [viewKey]);

	/*
	 * Each group holds a **list** of term ids, not one: OR inside a group, AND
	 * across groups (D45). Empty means the group filters nothing.
	 *
	 * Restored ids are **not** verified here, because there is nothing to verify
	 * them against yet — the pantry has not loaded. The prune effect below is
	 * what settles them, and it is the same one that already handles a term
	 * someone else deleted while you were looking at it.
	 */
	const [activeLocations, setActiveLocations] = useState<string[]>(() => [...restored.filters.locations]);
	const [activeTypes, setActiveTypes] = useState<string[]>(() => [...restored.filters.types]);
	const [activeStores, setActiveStores] = useState<string[]>(() => [...restored.filters.stores]);
	const [activeStatus, setActiveStatus] = useState<StatusKey | null>(restored.status);
	/* Not restored: a field that refills itself on load reads as a bug. */
	const [search, setSearch] = useState('');

	const [drawerTab, setDrawerTab] = useState<DrawerTab>(restored.drawerTab);
	/*
	 * Mobile only — the drawer is docked and always present from `md` up.
	 *
	 * **Deliberately not restored.** Every other flag in the record describes a
	 * layout you come back to; this one describes a panel over the thing you
	 * opened the app to look at. It is also the flag the dock effect below
	 * exists to clear, and seeding it true would hand that effect a slide-over
	 * on a screen that has no room for one.
	 */
	/*
	 * The admin console — `null` when it is closed, which is every load that did
	 * not arrive at `?admin`.
	 *
	 * It is **not** in `useViewState` (D51) and that is deliberate. Everything
	 * that record restores is a way of looking at *your* pantry, and it restores
	 * it because coming back to a filter you set is coming back to where you
	 * were. The console is somewhere else entirely: an app that reopens on a
	 * list of every household in the space is an app that has forgotten what it
	 * is for, and a `LARDER_ADMIN_IDS` that loses an id would leave a device
	 * restoring a section it can no longer be shown.
	 */
	const [adminSection, setAdminSection] = useState<AdminSection | null>(
		() => (adminDeepLink() ? 'overview' : null)
	);
	/*
	 * *Your account* — a drawer pane beside the console rather than inside
	 * Settings (D68), and deliberately not in `useViewState` for the console's
	 * own reason: an app that reopens on the screen that deletes your account has
	 * forgotten what it is for.
	 */
	const [accountOpen, setAccountOpen] = useState(false);
	/**
	 * The recap of a deletion that has already happened, or `null`.
	 *
	 * **It is what replaces the whole app**, so it lives here rather than in the
	 * pane it came from — the pane is inside the drawer the card is replacing.
	 * The rows are captured before the write, because afterwards there is nothing
	 * left to build them from.
	 */
	const [deletedRows, setDeletedRows] = useState<RecapRow[] | null>(null);
	/** A refused ownership transfer, for the shell's banner. See below. */
	const [transferError, setTransferError] = useState('');
	/*
	 * The account deletion flow (D68), owned here rather than by the pane that
	 * starts it. **`MembersPanel` has had the reason written down since Phase
	 * 4.12** — *the modal is owned by `Pantry`, which is the only place that can
	 * put one over the whole app* — and here it is load-bearing rather than
	 * tidy: the drawer's `<aside>` carries a `transform` for its slide-over, and
	 * a transform on an ancestor is the containing block for everything
	 * `position: fixed` beneath it. A dialog rendered from the pane is trapped
	 * inside 340px of drawer.
	 *
	 * The snapshot is handed over rather than re-queried, which is safe for the
	 * reason the recap is: the server recomputes the whole plan from `fateOf`
	 * and refuses a decision it was not owed, so a stale one can only be
	 * *refused* — with the server's own sentence, in the dialog.
	 */
	const [deleting, setDeleting] = useState<{ name: string; households: AccountHousehold[] } | null>(null);
	/** `''` while the pre-flight is up, then the typed confirmation. */
	const [deleteStep, setDeleteStep] = useState<'preflight' | 'confirm'>('preflight');
	/** `householdId → membershipId`, or `''` meaning *delete this household*. */
	const [deleteChosen, setDeleteChosen] = useState<Record<string, string>>({});
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState('');
	/**
	 * The household `ExportPantry` is fetching and the format asked for, or
	 * null. See *Export it first*.
	 *
	 * One piece of state rather than two, because the format is a property of
	 * *this* fetch: two states could be set a render apart and hand over the
	 * previous household in the new format.
	 */
	const [exporting, setExporting] = useState<{ household: AccountHousehold; format: ExportFormat } | null>(null);
	/* Stable: `ExportPantry`'s effect depends on it, and a fresh closure every
	 * render would re-run the effect that hands over the file. */
	const clearExport = useCallback(() => setExporting(null), []);
	/*
	 * The two account writes (D68). **Mutations, not a subscription** — this
	 * costs nothing on a load, which is why it can live here while `useAccount`
	 * is mounted by the pane that needs it.
	 */
	const accountWrites = useAccountWrites();
	/*
	 * Lifted out of the list so a *Needs attention* row on Overview can set the
	 * chip on its way to the list. The search, the sort and the page stay inside
	 * `AdminHouseholds`: nothing else has an opinion about any of them.
	 */
	const [adminFilter, setAdminFilter] = useState<AdminHouseholdFilter>('all');
	/*
	 * Which household's page is open, `''` for the list.
	 *
	 * Separate from the section rather than a fifth one, because the drawer's
	 * *Households* row stays lit while a household is open: you are still in
	 * Households, one level down, which is what the nav block should say.
	 */
	const [adminOpenId, setAdminOpenId] = useState('');
	/** People's own chip and open account. The same pair, one section along. */
	const [adminPeopleFilter, setAdminPeopleFilter] = useState<AdminPeopleFilter>('all');
	const [adminOpenUserId, setAdminOpenUserId] = useState('');

	/*
	 * Choosing a section always lands on that section's top level.
	 *
	 * Both the drawer's nav rows and Overview's *Needs attention* go through
	 * here, and the drawer's is why it exists: pressing **Households** while a
	 * household's page is open has to return to the list, and it is the one
	 * press that looks like a no-op if it does not — the row is already lit.
	 */
	/**
	 * Opens the console, from either place the account menu appears.
	 *
	 * **`AccountMenu` is one component in two hosts** — the drawer's foot row
	 * and the collapsed rail's flyout — so this is defined once and handed to
	 * both. It shipped wired to the drawer alone for one round, which meant the
	 * *Admin* row simply did not exist whenever the drawer happened to be
	 * collapsed. Anything either host passes that menu belongs here.
	 *
	 * **It does not move the drawer, and neither does `closeAdmin`.** Going to
	 * the console and coming back is a change of *what you are looking at*, not
	 * a change of how much chrome you want beside it — and somebody who has
	 * folded the drawer away has said what they want. It did un-collapse for one
	 * round, on the reasoning that the console *is* the drawer pane and opening
	 * it behind a folded drawer would leave no visible way back. That was true
	 * until the rail learned the console's own state; now the rail carries
	 * back-to-the-pantry and all four sections, so there is nothing to reveal.
	 *
	 * Below `md` there is no rail at all and this menu is only reachable from
	 * inside the open slide-over, so the drawer is already open there and there
	 * is nothing to set.
	 */
	function openAdmin() {
		setAdminSection('overview');
		setAdminOpenId('');
		setAdminOpenUserId('');
		// Both are drawer-level panes and only one column holds them. Leaving
		// the account pane flagged behind the console would put it back the
		// moment somebody left the console, which is not where they were.
		setAccountOpen(false);
	}

	/**
	 * Opens *Your account*, from either place the account menu appears (D68).
	 *
	 * **Defined once and handed to both hosts**, which is `openAdmin`'s own rule
	 * and the thing the missing *Admin* row cost a real session to learn: a
	 * handler written twice is a handler that will be changed once.
	 *
	 * **It un-collapses the drawer, and that is the opposite of `openAdmin`.**
	 * The reason `openAdmin` leaves the drawer alone is that the collapsed rail
	 * carries the console — back-to-the-pantry, all four sections — so opening it
	 * behind a folded drawer still leaves a visible way through. This pane has no
	 * rail form at all, so a press on the rail's flyout would set a flag and
	 * reveal nothing. Both halves, for `onExpand`'s reason: un-collapsing is what
	 * shows the docked drawer above the dock, and `open` is what slides it in
	 * below.
	 */
	function openAccount() {
		setAccountOpen(true);
		setAdminSection(null);
		setDrawerCollapsed(false);
		setDrawerOpen(true);
	}

	/**
	 * *Delete account*, from the pane's card.
	 *
	 * **The pre-flight is skipped when there is nothing to decide**, and the
	 * confirmation is the whole flow: a screen whose only content is *nothing to
	 * decide* is the control that can only disappoint, one level up.
	 */
	function startAccountDelete(snapshot: { name: string; households: AccountHousehold[] }) {
		setDeleting(snapshot);
		setDeleteChosen({});
		setDeleteError('');
		setDeleteStep(needsPreflight(snapshot.households) ? 'preflight' : 'confirm');
	}

	async function commitAccountDelete() {
		if (! deleting || deleteBusy) return;

		setDeleteBusy(true);

		/*
		 * The recap is taken **before** the write, because afterwards the query
		 * that fed it answers about an account that no longer exists. The card at
		 * the end is the only place those sentences are ever said, so they are
		 * captured while there is still something to say them about — the audit
		 * log's own denormalisation argument, one feature over.
		 */
		const rows = recapRows(deleting.households, deleteChosen);
		const refusal = await accountWrites.deleteAccount(
			decisionsFrom(deleting.households, deleteChosen)
		);

		setDeleteBusy(false);

		/*
		 * Refused — usually because somebody left or took over a household while
		 * this was open. The dialog stays exactly where it is with the server's
		 * sentence above its buttons, so the decisions and the typing survive.
		 */
		if (refusal) { setDeleteError(refusal); return; }

		setDeleting(null);
		setDeletedRows(rows);
	}

	/**
	 * Leaves the console, from the drawer's back button or the rail's slot 2.
	 *
	 * It leaves the drawer exactly as it found it, for `openAdmin`'s reason —
	 * and because the Members pane's own back button sets the precedent: going
	 * up a level inside the drawer has never also closed it.
	 */
	function closeAdmin() {
		setAdminSection(null);
		setAdminOpenId('');
		setAdminOpenUserId('');
	}

	/**
	 * The drawer's own nav rows, and Overview's *Needs attention*. Both mean
	 * *the list, from the top*, so both clear whichever page was open.
	 */
	function goAdmin(next: AdminSection) {
		setAdminOpenId('');
		setAdminOpenUserId('');
		setAdminSection(next);
	}

	/*
	 * The seam between the console's two halves, and it cannot go through
	 * `goAdmin`: these move the section *and* carry an id, and `goAdmin` clears
	 * exactly the id they have just set — which is what put a member row on the
	 * People list and a household row on the Households list.
	 *
	 * The section has to move with the id either way, because landing on an
	 * account page while the nav block still lit *Households* would be the
	 * drawer saying something untrue. The other half is cleared for the same
	 * reason it is on the way in: nothing behind you should still be open.
	 */
	function goAdminPerson(userId: string) {
		setAdminOpenId('');
		setAdminOpenUserId(userId);
		setAdminSection('people');
	}

	function goAdminHousehold(householdId: string) {
		setAdminOpenUserId('');
		setAdminOpenId(householdId);
		setAdminSection('households');
	}

	/*
	 * Whether this account administers the space, which is the one console query
	 * every load runs. It is a single boolean over no scan, and it is what draws
	 * the account menu's row — so it cannot be gated behind the console being
	 * open, or there would be no way in.
	 */
	const isAdmin = useAdminAccess();

	const [drawerOpen, setDrawerOpen] = useState(false);
	/* Desktop only — folded away, with the header's menu button to bring it back. */
	const [drawerCollapsed, setDrawerCollapsed] = useState(restored.drawerCollapsed);

	/*
	 * The other half of `restored`. Written on every change rather than on
	 * unload: a phone tab is killed in the background without ever firing one,
	 * and being in a shop is exactly when that happens.
	 */
	usePersistedView(viewKey, {
		drawerCollapsed,
		drawerTab,
		status: activeStatus,
		filters: { locations: activeLocations, types: activeTypes, stores: activeStores },
	});

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
	 * The measured content column — how wide row 2's controls actually are.
	 *
	 * A `ResizeObserver` on the column rather than a media query, because the
	 * drawer's three states change the available width by 340px without the
	 * viewport moving at all.
	 *
	 * **It starts at 0**, which reads as compact, and that is deliberate: the
	 * observer cannot report before the first paint, and the compact row fits
	 * everywhere while the full one does not — so the one frame that might be
	 * wrong is the one that only ever has too much room.
	 *
	 * **The element is state, not a `useRef`, and that is a bug fix rather than
	 * a style.** This component returns a loading screen above `<main>` until
	 * `api.status` is `ready`, so an `[]` effect reading `ref.current` ran while
	 * the column did not exist yet, bailed on the null, and **never attached the
	 * observer at all** — leaving `compact` stuck `true` on every screen forever.
	 * The status pills, the sort trigger, the run trigger and the segment were
	 * all wearing their 390 forms on a 1440 desktop because of it.
	 *
	 * A callback ref fires on attach with the node itself, so the effect depends
	 * on the element rather than on a theory about when it exists. **This is the
	 * same fix `sentinel` carries a few hundred lines down**, and the same
	 * mistake: an `[]` effect is only safe against a ref that is mounted on the
	 * component's first render.
	 */
	const [column, setColumn] = useState<HTMLElement | null>(null);
	const [columnPx, setColumnPx] = useState(0);

	const compact = columnPx < ROW2_FULL_PX;

	useEffect(() => {
		// Guarded like `useSystemTheme`'s `matchMedia`: the same absence of a
		// browser would otherwise throw here rather than degrade.
		if (! column || ! window.ResizeObserver) return;

		const observer = new ResizeObserver(([entry]) => {
			setColumnPx(entry.contentRect.width);
		});

		observer.observe(column);

		return () => observer.disconnect();
	}, [column]);

	const [sortMenuOpen, setSortMenuOpen] = useState(false);
	const [sortBy, setSortBy] = useState<SortKey>('default');

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ItemDraft | null>(null);
	const [formError, setFormError] = useState('');
	const [saving, setSaving] = useState(false);

	/**
	 * Bulk entry's two screens, and the dialog that feeds them (D67).
	 *
	 * **`bulkMode` replaces the content column exactly as the run list does**, so
	 * it is a peer of `listMode` rather than something layered over it — and the
	 * two are mutually exclusive for the same reason two modes always are: row 2
	 * has one left-hand exit.
	 *
	 * **It is deliberately not in `useViewState` (D51)**, on the console's
	 * argument: an app that reopens on a half-reviewed paste has forgotten what
	 * it is for, and the rows are not a record anything could restore anyway.
	 */
	const [bulkMode, setBulkMode] = useState<'common' | 'review' | null>(null);
	const [bulkSource, setBulkSource] = useState<BulkSource>('paste');
	const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
	const [pasteOpen, setPasteOpen] = useState(false);

	/**
	 * The put-away sheet's rows, snapshotted when it opened. `null` while closed.
	 *
	 * Held here rather than in the sheet because the list underneath is live —
	 * see `openPutAway`.
	 */
	const [putAway, setPutAwayRows] = useState<PutAwayRow[] | null>(null);

	/**
	 * How many counts the last put-away wrote, for the screen that follows it.
	 *
	 * It survives only as long as it is *true*: the after-the-trip card draws on
	 * `justPutAway !== null && toBuyTotal === 0`, so a trip that emptied half the
	 * list simply never shows one, and a stale value is invisible until it is
	 * cleared below.
	 */
	const [justPutAway, setJustPutAway] = useState<number | null>(null);

	/** What the trip's own live region last said. See `announceTrip`. */
	const [tripAnnouncement, setTripAnnouncement] = useState('');

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<ItemDraft | null>(null);
	const [editError, setEditError] = useState('');

	// Accordion state is UI, not data — the row itself carries no `open` field.
	const [openId, setOpenId] = useState<string | null>(null);

	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
	 * Renaming the account, from the menu at the foot of the drawer.
	 *
	 * `setDisplayName` upserts the profile row **and writes back through every
	 * membership** the account holds, which is what a rename needs: skipping
	 * that would show the new name to the person who typed it and the old one
	 * to everybody else (D46).
	 *
	 * No toast. The row returns to read-only with the new name in it, which is
	 * the whole confirmation — and a toast for a save you are looking at is the
	 * noise the open plain-toast question is trying to avoid.
	 */
	function renameAccount(name: string) {
		void profile.setDisplayName(name);
	}

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
	 * **Signing in is the accept** — someone who pressed *Sign in to join* while
	 * signed out has consented, and showing them the same card
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

		/*
		 * And not before the name is settled. The membership this is about to
		 * create carries a copy of the account's name, so redeeming ahead of the
		 * first-run screen would stamp the row with whatever the account supplied —
		 * possibly nothing — and announce that to the household. `setDisplayName`
		 * writes back through every membership, so the end state is the same
		 * either way; waiting is what keeps the other members from seeing the
		 * wrong name in between.
		 */
		if (! nameSettled) return;

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
	}, [pendingCode, autoJoining, nameSettled]);

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

	/**
	 * First run and the dialog both create; both then switch to what they made.
	 *
	 * `sources` is the three ticks from either card (D61) — which of shop, grow
	 * and make this household stocks from. The server turns it into the seeded
	 * source list and normalizes it on the way, so this only carries it.
	 */
	async function createHousehold(name: string, ink: string, sources: SourceMix): Promise<string | null> {
		const householdId = await api.createHousehold(name, ink, sources);

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

	/*
	 * `Store` while every source is a shop, `Source` once one of them is not
	 * (D58). The drawer, the rail and the item sheet each derive this from the
	 * same array themselves; `Pantry` needs its own copy for the empty-state
	 * copy, which is the one place the word appears in a sentence.
	 */
	const sourceWord = sourceGroupWord(stores);
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

	/*
	 * `?demo` — sixty items, so the collection behaviour can be looked at at all
	 * (`client/lib/devItems.ts`). Loopback only, and it refuses a household that
	 * already holds items.
	 *
	 * **The ref is load-bearing.** Each `addItem` invalidates `pantry`, so
	 * `items` grows under the effect while it is still writing; without a latch
	 * the effect re-runs on every arrival and starts sixty overlapping seeds.
	 * `runDemoSeed`'s own empty-household check cannot cover this — by the time
	 * the second run reads it, the first has already written row one.
	 */
	const demoSeeded = useRef(false);

	useEffect(() => {
		if (! ready || demoSeeded.current || ! devItemsEnabled()) return;

		// Terms arrive with the same query as the items, so this is only ever
		// false for a household that has genuinely lost its locations.
		if (locations.length === 0) return;

		demoSeeded.current = true;

		void runDemoSeed({ items, locations, types, stores, addItem: api.addItem })
			.then(({ added, skipped }) => {
				if (added === 0) return;

				toasts.push({
					lead: skipped.length
						? `Added ${added} demo items · skipped ${skipped.length} with no matching location`
						: `Added ${added} demo items`,
				});
			});
		// Deliberately not reactive: this fires once for the household that was
		// on screen when the page loaded. A household switch is a new intent,
		// and re-seeding on one would be a surprise rather than a feature.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ready]);
	const myMembershipId = household?.me.membershipId ?? '';
	/**
	 * Your account id — what a claim is keyed by (D66).
	 *
	 * `''` until the household query answers, which `indexClaims` reads as
	 * *nothing is mine*. That is the safe direction: the alternative is briefly
	 * offering to put away somebody else's shopping.
	 */
	const myUserId = household?.me.userId ?? '';

	/*
	 * Your own avatar, reconciled into the copy the rest of the household reads.
	 *
	 * `null` means the query has not answered. That has to be read off the
	 * **row**, never off the column: a membership written before
	 * `memberships.picture` existed holds `null` rather than the schema's `''`
	 * — a default applies to an insert and nothing backfills (D44) — so a
	 * `?.picture ?? null` collapsed the two meanings and short-circuited the
	 * hook forever, on exactly the rows it exists to reconcile.
	 *
	 * See client/hooks/useAvatarSync.ts.
	 */
	const myMembership = realMembers.find((m) => m.id === myMembershipId);

	useAvatarSync(
		picture ?? '',
		myMembership ? myMembership.picture ?? '' : null,
	);

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
		setKind: api.setSourceKind,
	}), [api.createTerm, api.updateTerm, api.deleteTerm, api.setSourceKind]);

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

	/*
	 * The search field's suggestion menu — the name field's, re-pointed.
	 *
	 * Two groups and one extra rule: **a chevron means the row leaves the screen
	 * you are on**. An item row opens that item's Edit sheet and closes the menu,
	 * because it has taken you somewhere. A term row applies the term, appears in
	 * the applied-filter row where *Clear filters* can already take it off again,
	 * and **does not close** — terms are a set you work through, which is the
	 * rule the rail's quick filters already hold.
	 *
	 * **It searches past the applied filters on purpose.** Filtered to *Pantry*
	 * and searching for something in the freezer, the menu still finds it and the
	 * grid does not. A search that cannot reach past a filter you forgot you set
	 * is the worse failure — recorded as an open question in `autofill.md`,
	 * because nothing on screen says so.
	 */
	const searchHits = useMemo(() => searchSuggestions(
		search,
		items,
		[
			{ kind: 'location' as const, terms: locations },
			{ kind: 'store' as const, terms: stores },
			{ kind: 'type' as const, terms: types },
		],
		[
			...activeLocations.map((id) => `location:${id}`),
			...activeStores.map((id) => `store:${id}`),
			...activeTypes.map((id) => `type:${id}`),
		]
	), [search, items, locations, stores, types, activeLocations, activeStores, activeTypes]);

	const searchGroups = useMemo<SuggestGroup[]>(() => ([
		{
			label: 'In your pantry',
			rows: searchHits.items.map((h) => ({
				kind: 'item' as const,
				id: `search-item-${h.item.id}`,
				item: h.item,
				place: termNameFor(h.item.locationId, locations),
				at: h.at,
				sizeAt: h.sizeAt,
			})),
		},
		{
			/*
			 * **`FILTERS`, not `TERMS`.** *Terms* is what these are and it is the
			 * app's own word everywhere else — but this menu is the one place a
			 * term is not a thing you are looking at so much as a thing you are
			 * about to *do*, and the row does the same job as a chip in the drawer
			 * two panes away. The two menus stopped sharing a vocabulary here, and
			 * that is fine: they no longer share a group.
			 */
			label: 'Filters',
			rows: searchHits.terms.map((h) => ({
				kind: 'term' as const,
				id: `search-term-${h.kind}-${h.term.id}`,
				term: h.term,
				group: h.kind,
				// The source group renames itself once one source is not a shop
				// (D58). This is the sixth place that moves with it.
				groupWord: h.kind === 'location' ? 'Location' : h.kind === 'type' ? 'Type' : sourceWord,
				count: h.count,
				at: h.at,
			})),
		},
	]), [searchHits, locations, sourceWord]);

	const searchSuggest = useSuggest(search, searchGroups);

	/**
	 * The two things a search row does, and **neither of them leaves this
	 * screen**.
	 *
	 * **An item row finishes the query for you.** It fills the field with that
	 * item's name, which narrows the grid to it — the row is a shortcut through
	 * typing, not a way into the item. It used to open that item's Edit sheet,
	 * which put a form over the pantry from a control whose whole job is finding
	 * things in it, and it is what the chevron existed to warn about. Both are
	 * gone.
	 *
	 * **A term row applies the filter and clears the query**, because the two
	 * are alternative ways of narrowing the same grid and leaving a stale query
	 * on top of a fresh filter narrows it twice — usually to nothing. Clearing
	 * also empties the menu, which is what closes it: with no query there are no
	 * rows.
	 */
	function pickSearchSuggestion(row: SuggestRow) {
		if (row.kind === 'item') {
			setSearch(row.item.name);
			searchSuggest.close(row.item.name);
			return;
		}

		if (row.kind !== 'term') return;

		const toggle = row.group === 'location'
			? setActiveLocations
			: row.group === 'type' ? setActiveTypes : setActiveStores;

		// Functional, for the reason every late path in this file is: nothing
		// guarantees this write lands before the next render reads the array.
		toggle((prev) => toggleTermFilter(prev, row.term.id));
		setSearch('');
	}

	/*
	 * **The grid matches the way the suggestion menu does** — a word prefix in
	 * the name or the size, never a substring anywhere and never the notes. It
	 * was `includes` on the name alone, so `eef` found Ground Beef and typing
	 * `pint` found nothing at all.
	 *
	 * The two have to agree: the menu is a shortcut into results that are
	 * already on screen underneath it, and a menu listing a row the grid has
	 * ruled out is a menu nobody can trust.
	 */
	const preStatusFiltered = useMemo(() => items.filter((it) => (
		matchesTermFilters(it, termFilters)
			&& (matchesQuery(it.name, search) || matchesQuery(sizeSearchText(it.size, it.unit), search))
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

	/**
	 * Infinite scroll: grow `visibleCount` when the sentinel enters the viewport.
	 *
	 * **The sentinel is held in state, not a ref, and that is the whole point.**
	 * A `useRef` gives the effect nothing to depend on, so the effect has to
	 * guess at which renders the element exists — and the guess was
	 * `[sorted.length, visibleCount]`, which are merely *correlated* with it.
	 * The element's real conditions are those two **and** `listMode`, `empty`,
	 * and the loading gate. Any transition that mounted it without moving the
	 * two numbers left the observer attached to nothing, permanently:
	 *
	 *   load in list mode with 60 items  → effect runs at [60, 20], no sentinel
	 *   press *Back to items*            → sentinel mounts, deps still [60, 20]
	 *                                    → effect never re-runs, nothing observes
	 *
	 * A callback ref fires on attach and detach with the node itself, so the
	 * effect depends on the element rather than on a theory about it. This is
	 * the general fix: there is no longer a render path that can mount the
	 * sentinel without waking the observer.
	 *
	 * `visibleCount` stays in the deps deliberately. An observer only reports
	 * *changes* to intersection, so when a page lands and the sentinel is still
	 * on screen, nothing further fires and the list stops short. Re-observing
	 * replays the initial callback, which is what carries a tall viewport
	 * through several pages in one scroll.
	 */
	const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

	useEffect(() => {
		if (! sentinel) return;

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length));
			}
		}, { rootMargin: '200px' });

		observer.observe(sentinel);

		return () => observer.disconnect();
	}, [sentinel, sorted.length, visibleCount]);

	/**
	 * A filter pointing at a term that isn't there would silently hide every
	 * item. Live queries make a term someone else just deleted a real race
	 * rather than a hypothetical, and D51 added a second source: ids restored
	 * from the last session, which may name a household this device is no
	 * longer pointed at.
	 *
	 * **The `ready` guard is what makes the restore survive at all.** The three
	 * term lists are `[]` while the pantry loads, so without it this runs once
	 * against nothing and prunes every restored filter before the household it
	 * belongs to has arrived.
	 */
	useEffect(() => {
		if (! ready) return;

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
	}, [ready, locations, types, stores, activeLocations, activeTypes, activeStores]);

	/*
	 * The shopping list is a **view of the filtered items**, not a thing anyone
	 * keeps: every item currently low or out, grouped by where you would buy it.
	 * Nothing is authored into it and nothing is authored out of it, which is
	 * why there is no shopping-list tab and no way for the list and the pantry
	 * to disagree.
	 */
	/**
	 * The month, read once per mount rather than per render.
	 *
	 * A season only moves a row between groups on one card, so a tab left open
	 * across midnight on the last of August showing an August season is a
	 * cosmetic staleness that a reload fixes. Reading the clock in a `useMemo`
	 * with no dependencies is what keeps every derivation below it stable.
	 */
	const month = useMemo(() => monthOf(Date.now()), []);

	const bands = useMemo(() => runBands(filtered, stores, month), [filtered, stores, month]);

	/**
	 * Which tab of the segment is showing, and it resets to `All` on its own.
	 *
	 * Not persisted, unlike the mode itself (D41) and the filters (D51). `All`
	 * is the whole design — it is the screen that puts the carrots for the stock
	 * two bands above it — so coming back to a *narrowed* run list would be
	 * restoring the state that hides things, which is the failure D45 exists to
	 * prevent and this has no row 3 to make legible.
	 */
	const [runTab, setRunTab] = useState<RunTab>('all');

	/**
	 * The segment is a control only when there is more than one band.
	 *
	 * A household with nothing but shops sees no segment, no band headers, and
	 * today's shopping list byte for byte — which is most of why this shape won.
	 */
	const banded = bands.length > 1;

	/**
	 * The tab actually in effect, which is not always the one that was pressed.
	 *
	 * A chosen band can empty out under you — tick the last thing on Harvest, or
	 * narrow a filter until nothing you grow is low — and the honest answer is to
	 * fall back to `All` rather than draw an empty screen for a tab that no
	 * longer exists. **Resolved once and read everywhere**: the segment's
	 * highlight, which bands render, and whether they carry headers all come from
	 * this. Reading `runTab` in one place and the fallback in another is how the
	 * screen ends up showing every band with no headers over them.
	 */
	const activeTab: RunTab = useMemo(() => (
		! banded || runTab === 'all' || bands.some((b) => b.kind === runTab) ? runTab : 'all'
	), [bands, banded, runTab]);

	/** The chosen tab's bands, or all of them under `All`. */
	const shownBands = useMemo(() => (
		activeTab === 'all' ? bands : bands.filter((b) => b.kind === activeTab)
	), [bands, activeTab]);

	/** What is on this screen — the filtered count. */
	const toBuyHere = useMemo(() => runCount(filtered, stores, month), [filtered, stores, month]);

	/**
	 * What the household has to buy, filters or no filters.
	 *
	 * The trigger wears this one and nothing else: it answers *is there shopping
	 * to do*, which is a fact about the household. The meta line answers *what
	 * is on this screen*, and the two are allowed to disagree.
	 */
	const toBuyTotal = useMemo(() => runCount(items, stores, month), [items, stores, month]);

	/**
	 * The ids a tick can still belong to.
	 *
	 * Deliberately the *unfiltered* set: narrowing to one store must not read as
	 * having bought everything else, and a check whose row is merely filtered
	 * out has not been bought.
	 */
	const buyableIds = useMemo(
		() => runIds(items, stores, month),
		[items, stores, month]
	);

	const trip = useTripChecks(
		tripKey,
		api.currentHouseholdId,
		myUserId,
		api.claims,
		buyableIds,
		api.claimItem,
		api.releaseClaims
	);
	const { setListMode } = trip;

	/**
	 * Item id to the **name** of whoever else has claimed it (D66).
	 *
	 * Resolved here, where the members are, rather than in `RunList` — a row
	 * should not have to know that a claim is keyed by an account id.
	 *
	 * **A missing member still draws.** She can leave the household between the
	 * claim and the read, and *In someone else's cart* is still true and still
	 * stops the double-buy, which is the entire job.
	 */
	const claimedBy = useMemo(() => {
		const people = new Map(members.map((m) => [m.userId, { name: m.displayName, picture: m.picture }]));
		const out = new Map<string, ClaimOwner>();

		for (const [itemId, userId] of trip.claims.theirs) {
			// A face wherever there is one (D55). `picture` is '' for an account
			// with no Gravatar, which the avatar reads as *draw the initial*.
			out.set(itemId, people.get(userId) ?? { name: '', picture: '' });
		}

		return out;
	}, [members, trip.claims]);


	/*
	 * The mode is only meaningful while there is something to buy. It survives a
	 * reload — the single most likely thing to go wrong on a phone in a shop —
	 * but the trigger is hidden once the list would be empty, and a mode with no
	 * way out is worse than one that lets go.
	 */
	/*
	 * **And it survives one more beat than that, exactly once.** A put-away
	 * empties the list by arithmetic, so `toBuyTotal` drops to zero in the same
	 * breath as the write lands — and dropping the mode there would answer the
	 * terminal action of the whole flow by throwing you back to the grid with no
	 * confirmation that anything happened. `justPutAway` holds the mode open for
	 * the one screen that says so.
	 */
	const listMode = trip.listMode && (toBuyTotal > 0 || justPutAway !== null) && bulkMode === null;

	/** What row 2 and the commit bar report about the review (D67). */
	const bulkCounts = useMemo(() => bulkSummary(bulkRows), [bulkRows]);

	/**
	 * How many counts the trip just wrote, when that is the reason the list is
	 * empty — and `null` whenever anything else is.
	 *
	 * The two empty screens look alike and mean opposite things, so the test is
	 * made here where both numbers are in hand rather than inside `RunList`,
	 * which knows only about the bands it was handed and could not tell a
	 * finished trip from a Store filter that matched nothing.
	 */
	const tripDone = justPutAway !== null && toBuyTotal === 0 ? justPutAway : null;

	/*
	 * The card is about *this* trip, so it goes the moment there is another one.
	 * Leaving the mode drops it too: coming back later to a pantry that happens
	 * to be full again should not re-announce a shop from last week.
	 *
	 * Keyed on `trip.listMode` rather than on `listMode`, which `justPutAway`
	 * itself holds true — reading the derived value here would be an effect that
	 * can never fire.
	 */
	useEffect(() => {
		if (trip.count > 0 || ! trip.listMode) setJustPutAway(null);
	}, [trip.count, trip.listMode]);

	/**
	 * Whether the segment has to give up its three words for its three glyphs.
	 *
	 * **A different question from row 2's `compact`, and asking it separately is
	 * the point.** `compact` is about touch geometry and the whole row answers
	 * it together, so the segment stands exactly as tall as *Back to items* and
	 * the trigger either side of it. Whether its labels fit depends on how many
	 * bands the household has, which no constant knows — a docked drawer on a
	 * 1280 screen is `compact` and still has ~470px spare for the words.
	 */
	const iconOnly = banded
		&& columnPx < ROW2_LIST_PX + runSegmentPx(bands.map((band) => band.kind), false);


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
	const inCart = useMemo(() => {
		// `hereIds` rather than `needsBuying`, so an out-of-season row — which has
		// no checkbox to tick — cannot be counted as being in the cart.
		const hereIds = runIds(filtered, stores, month);

		return [...trip.checked].filter((id) => hereIds.has(id)).length;
	}, [filtered, stores, month, trip.checked]);

	const tripLine = useMemo(() => {
		/*
		 * **With a segment on screen this shrinks to the cart clause alone.**
		 * `12 to buy · 4 stores` is what the segment now says, in tabs you can
		 * press — and printing it twice a gap apart would be the app answering
		 * one question two ways. What the segment cannot say is how much of it is
		 * already in your hand, so that is what is left here.
		 */
		if (banded) {
			// **`your` cart, not `the` cart** (D66) — there may be somebody else's
			// now. It counts yours only: a second number for rows you cannot act
			// on would be chrome about somebody else's afternoon, and hers are
			// visible where they matter, on the rows themselves.
			const cart = inCart > 0 ? `${inCart} in your cart` : '';

			return { short: cart, full: cart };
		}

		const parts: string[] = [];

		if (storeFilterName) {
			parts.push(`${toBuyHere} to buy at ${storeFilterName}`);
		} else {
			parts.push(toBuyHere < toBuyTotal ? `${toBuyHere} of ${toBuyTotal} to buy` : `${toBuyHere} to buy`);

			const sources = bands[0]?.groups.length ?? 0;

			if (sources > 1) parts.push(plural(sources, 'store'));
		}

		const short = parts.join(' · ');

		/*
		 * **The cart clause is the one that goes at 390.** How many are checked
		 * is the half a glance can spare — the trip bar below already says it,
		 * next to the control that acts on it.
		 */
		return { short, full: inCart > 0 ? `${short} · ${inCart} in your cart` : short };
	}, [banded, storeFilterName, toBuyHere, toBuyTotal, bands, inCart]);

	/**
	 * What the rest of the household still has to buy, for the scoped empty
	 * state. Multi-store items count as elsewhere only if they are not also here.
	 */
	const elsewhereCount = useMemo(() => {
		if (! activeStores.length) return 0;

		const onList = runIds(items, stores, month);

		return items.filter((it) => (
			onList.has(it.id) && ! activeStores.some((id) => it.storeIds.includes(id))
		)).length;
	}, [items, stores, month, activeStores]);

	/*
	 * Escape leaves the mode. It is not an overlay, so nothing else claims the
	 * key — but a sheet or a dialog over it does, and theirs has to win.
	 */
	useEffect(() => {
		if (! listMode) return;

		function onKey(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;
			// A sheet or a dialog over the mode owns the key first — including the
			// put-away, which closes to the list it was opened from rather than
			// closing the list underneath it.
			if (pending || showForm || editingId || putAway) return;

			setListMode(false);
		}

		window.addEventListener('keydown', onKey);

		return () => window.removeEventListener('keydown', onKey);
	}, [listMode, pending, showForm, editingId, putAway, setListMode]);

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
		sourceWord,
		status: activeStatus,
	}), [search, activeLocations, activeTypes, activeStores, activeStatus, locations, types, stores, sourceWord]);

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
					seasonFrom: item.seasonFrom,
					seasonTo: item.seasonTo,
					qty: item.qty,
					threshold: item.threshold,
					size: item.size,
					unit: item.unit,
					offShoppingList: item.offShoppingList,
					listRule: item.listRule,
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
		const block = termBlock(
			kind,
			term.name,
			termUsageCount(items, kind, id),
			kind === 'store' ? sourceWord : kind
		);

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
	 * Empties the cart, with the ticks one press from coming back.
	 *
	 * D36's rule holds even though nothing here is a record: **undo what comes
	 * back**. The ticks are local (D41), so the clear is instant and total and
	 * the toast is the whole safety net — a confirm dialog in front of someone
	 * holding a phone in a shop costs more than the mistake it prevents, and
	 * unlike a deleted term there is no server round trip to fail.
	 *
	 * The ids come *from the list*, not from the trip record: with a Store
	 * filter on, this clears what you can see and leaves the rest, which is the
	 * only reading that agrees with the `Hide 3 checked` beside it.
	 */
	function clearChecks(ids: string[]) {
		if (ids.length === 0) return;

		trip.uncheck(ids);

		toasts.push({
			lead: 'Cleared',
			name: plural(ids.length, 'check'),
			onUndo: () => trip.recheck(ids),
		});

		// The toast is the sighted confirmation and it is not read: it appears
		// in a corner with no focus moved to it. This is the same fact said out
		// loud, through the region the put-away already uses.
		setTripAnnouncement(`${plural(ids.length, 'check')} cleared.`);
	}

	/**
	 * Opens the put-away on the rows the bar was counting.
	 *
	 * **The rows are snapshotted here rather than recomputed by the sheet**,
	 * because the list underneath is live: somebody else restocking one of them
	 * mid-put-away would otherwise pull it out from under a number you had
	 * already typed. `shownBands` is what the list is drawing, so the sheet holds
	 * the screen's own rows in the screen's own order.
	 */
	function openPutAway(ids: string[]) {
		if (ids.length === 0) return;

		setPutAwayRows(putAwayRows(shownBands, new Set(ids)));
	}

	/**
	 * The write — a whole trip's counts, in one mutation.
	 *
	 * **One call rather than a loop**, and that is the point of the handler: a
	 * put-away is several writes that mean one thing, made from a phone in a car
	 * park, and half of them landing is the state it exists to prevent.
	 *
	 * **No toast.** Four toast triggers are settled on the grounds that the thing
	 * you did is visible on the screen you are on, and three rows vanishing from
	 * the list you are looking at is the most visible confirmation in the app.
	 * The rows leave *by arithmetic* — every one was put away to a count that
	 * clears its threshold — so nothing has to remove them.
	 */
	async function commitPutAway(counts: Record<string, string>) {
		if (! putAway || saving) return;

		const entries = putAway.map((row) => restockEntry(row, counts[row.item.id] ?? String(row.was)));

		setSaving(true);

		// The trip is the server's to name (D66) — it is holding the row, and
		// asking the client which trip it is in would be asking it to tell us
		// something we already know better.
		const ok = await api.restockItems(entries);

		setSaving(false);

		// A refusal leaves the sheet open with the numbers still in it, the way a
		// refused item edit does — they were typed at the shelf and are not
		// something to make somebody reconstruct.
		if (! ok) return;

		setPutAwayRows(null);
		setJustPutAway(entries.length);
		// The trip ended server-side, with the same write — `restockItems` drops
		// it and its claims, which is what frees every row it held.

		/*
		 * **What is left is counted here rather than read off `toBuyTotal`.**
		 * That number comes from a live query which has not re-emitted yet — the
		 * write landed a line ago — so reading it would announce the total from
		 * *before* the trip, which is the one number this sentence must not say.
		 *
		 * Every row that now clears its threshold leaves the list, and `putAway`
		 * holds one row per item, so subtracting is exact. `statusKeyFor` rather
		 * than `needsBuying`: a row that was on the list is not excluded, or it
		 * would not have been there to tick.
		 */
		const leaving = putAway.filter(
			(row) => statusKeyFor(counts[row.item.id] ?? String(row.was), row.item.threshold) === 'ok'
		).length;

		const left = Math.max(0, toBuyTotal - leaving);

		setTripAnnouncement(
			`${plural(entries.length, 'count')} updated. `
			+ (left > 0 ? `${left} left to get.` : 'Nothing left to get.')
		);
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
	async function restoreTerm(kind: TermKind, term: Term & { kind?: SourceKind }, wasActive: boolean) {
		const id = await taxonomy.create(
			kind,
			/*
			 * The source's own kind travels with it (D58). Undo is a re-insert
			 * (D17) and a new source is always a shop, so without this a restored
			 * garden would come back a shop — a silent change to a row somebody
			 * asked to have back exactly as it was. The server ignores it for the
			 * two taxonomies that have no column.
			 */
			{ name: term.name, ink: term.ink, kind: term.kind },
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

			/*
			 * **No toast.** The Members row you are looking at changes — they
			 * become Owner and your own row becomes *Editor · You* — which is the
			 * most visible confirmation the app has, and the same argument four
			 * other triggers already settle on.
			 *
			 * A refusal goes through `api.error`'s banner rather than being
			 * swallowed: the server's own sentences here are instructions.
			 */
			case 'transfer-ownership': {
				const refusal = await accountWrites.transferOwnership(
					api.currentHouseholdId,
					action.membershipId
				);

				if (refusal) setTransferError(refusal);
				return;
			}

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
			// Both halves of the size, or neither — see `shared/size.ts`. A new
			// item starts with neither: most things in a pantry are counted rather
			// than packaged, and a prefilled unit is a guess about the wrong half.
			size: '',
			unit: '',
			offShoppingList: false,
			listRule: '',
			// Neither half of the season either, and for a firmer reason than the
			// size's: the field is not even on screen until a **grow** source is
			// picked (D58), so a new item cannot arrive holding one.
			seasonFrom: '',
			seasonTo: '',
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

	/*
	 * -----------------------------------------------------------------------
	 * Bulk entry (D67)
	 * -----------------------------------------------------------------------
	 *
	 * **Paste and the checklist are both just sources; the review is the
	 * destination, and nothing is written until Add.** That is the whole
	 * structure and it is what stops the two features being two features.
	 */

	function openBulkRoute(route: AddRoute) {
		if (! mayEditItems) return;

		if (route === 'paste') { setPasteOpen(true); return; }

		// Entering a mode leaves the other one: row 2 has one left-hand exit, and
		// two modes claiming it is how a screen ends up with two ways back.
		setListMode(false);
		setBulkMode('common');
	}

	function readPastedList(lines: ParsedLine[]) {
		setPasteOpen(false);

		if (lines.length === 0) return;

		setBulkSource('paste');
		setBulkRows(rowsFromLines(lines, items));
		setListMode(false);
		setBulkMode('review');
	}

	function reviewCommonItems(entries: CatalogItem[]) {
		if (entries.length === 0) return;

		setBulkSource('common');
		setBulkRows(rowsFromCatalog(entries, items, types, locations));
		setBulkMode('review');
	}

	function leaveBulk() {
		setBulkMode(null);
		setBulkRows([]);
	}

	/**
	 * The commit — one write of the whole table.
	 *
	 * **A plain toast, and no undo**, which is the one open question in
	 * `bulk-entry.md` this build answers. D36 governs *records that go away*, and
	 * nothing here does: twenty-two rows arrive, in the grid this screen returns
	 * to. What a run of twenty-two lacks that a single add has is *visibility* —
	 * one new card is obvious and twenty-two at once is a wall — so it gets the
	 * plain 3.5s toast rather than the actionable one. Making it undoable would
	 * mean a second, destructive bulk mutation written to reverse a constructive
	 * one, and that is a bigger decision than this screen.
	 */
	async function commitBulk() {
		const drafts = bulkDrafts(bulkRows, defaultThreshold, locations[0]?.id ?? '');

		if (drafts.length === 0) return;

		setSaving(true);
		const count = await api.addItems(drafts);
		setSaving(false);

		// Refused. `api.error` already says why, and the table is exactly as it
		// was — which is what *nothing is written until you press Add* promises
		// on the way out as well as on the way in.
		if (count === null) return;

		leaveBulk();
		// A **plain** toast: `lead` alone, no `onUndo`, so there is no control on it.
		toasts.push({ lead: `${count} ${count === 1 ? 'item' : 'items'} added.` });
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
			size: item.size,
			unit: item.unit,
			offShoppingList: item.offShoppingList,
			listRule: item.listRule,
			seasonFrom: item.seasonFrom,
			seasonTo: item.seasonTo,
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
	/*
	 * **The account is gone, and this is above everything** (D68).
	 *
	 * It has to be: the deletion removes the profile and every membership, so a
	 * beat later `profile` reports `needsName` and `households` reports
	 * `no-household` — which would put the first-run screen in front of somebody
	 * who has just deleted their account, offering to name a household. The
	 * session is still live, because deleting an account removes this app's rows
	 * and cannot reach the Spacefast identity behind them, so neither the shell
	 * nor the signed-out surface is the right answer either.
	 *
	 * **No toast.** There is no app left to show one in; the card is the
	 * confirmation, which is the fifth settled case of what gets one.
	 */
	if (deletedRows) {
		return (
			<OutsideShell dark={dark} theme={theme}>
				{/* Signing out is what makes *Back to Larder Log* land on the
				  * marketing page rather than on a first-run screen. */}
				<AccountGoneCard rows={deletedRows} onLeave={onSignOut} theme={theme} />
			</OutsideShell>
		);
	}

	/*
	 * The display name comes before everything, the invite landing included.
	 *
	 * Both halves of this are load-bearing. Waiting on the query means the
	 * landing card cannot paint and then be replaced by the name screen a beat
	 * later — it costs nothing, since every subscription on this screen starts
	 * in the same tick. And putting the name *ahead* of the invite is the point
	 * of D46: the person arriving on somebody else's link is the one the rest of
	 * that household is about to see a name for.
	 */
	if (profile.status.state === 'loading') {
		return (
			<OutsideShell dark={dark} theme={theme}>
				<p class="text-[13.5px]" style={{ color: theme.textFaint }}>Loading&hellip;</p>
			</OutsideShell>
		);
	}

	if (needsName) {
		return (
			<OutsideShell dark={dark} theme={theme}>
				<div class="w-full max-w-[440px]">
					{profile.error && (
						<div
							role="alert"
							class="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-[13px] text-sm mb-4"
							style={{
								background: theme.surfaceAlt,
								color: theme.dangerText,
								border: `1px solid ${theme.dangerText}`,
							}}
						>
							<span>{profile.error}</span>
							<button onClick={profile.dismissError} aria-label="Dismiss" class="shrink-0">
								<X size={15} />
							</button>
						</div>
					)}
					<DisplayNameCard
						email={email}
						picture={picture}
						onSubmit={profile.setDisplayName}
						onSignOut={onSignOut}
						theme={theme}
					/>
				</div>
			</OutsideShell>
		);
	}

	if (pendingCode) {
		return (
			<OutsideShell dark={dark} theme={theme}>
				<InviteLanding
					preview={autoJoining ? null : invitePreview}
					signedIn
					displayName={accountName} email={email} picture={picture}
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
				displayName={accountName}
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
					accountName={accountName} accountPicture={picture}
					/* Both of the menu's destinations, in the other host it has. */
					onOpenAccount={openAccount}
					onOpenAdmin={isAdmin ? openAdmin : undefined}
					/*
					 * While the console is open the rail is the console's, not the
					 * pantry's — the switcher, the filter groups and Settings all
					 * go. Without this the collapse control produced a screen with
					 * the console in the column and a pantry rail beside it,
					 * offering to filter a household nothing on screen was about.
					 */
					adminSection={adminSection}
					onAdminSection={goAdmin}
					onCloseAdmin={closeAdmin}
					themeOverride={themeOverride} setThemeOverride={setThemeOverride}
					dark={dark}
					/*
					 * Both, deliberately. Un-collapsing is what reveals the docked
					 * drawer at `lg`; `open` is what slides it in below that, where
					 * un-collapsing alone would do nothing visible.
					 */
					/*
					 * It names a tab, so it has to leave the account pane — which is
					 * a level *above* the tabs (D68). Without this, pressing
					 * **Filter** on the rail expands onto *Your account*, which is
					 * the drawer answering a question nobody asked. `goAdmin` makes
					 * the same move one pane over.
					 */
					onExpand={(tab) => {
						setDrawerTab(tab);
						setAccountOpen(false);
						setDrawerCollapsed(false);
						setDrawerOpen(true);
					}}
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
				accountName={accountName} accountEmail={email} accountPicture={picture}
				onSetDisplayName={renameAccount} onSignOut={onSignOut}
				accountOpen={accountOpen}
				onOpenAccount={openAccount}
				onCloseAccount={() => setAccountOpen(false)}
				onDeleteAccount={startAccountDelete}
				openMembers={openMembers}
				adminSection={adminSection}
				setAdminSection={goAdmin}
				/*
				 * Absent, not disabled, and absent for almost everybody (D30). A
				 * non-administrator's account menu is the two-row menu it has
				 * always been and never mentions a console.
				 */
				onOpenAdmin={isAdmin ? openAdmin : undefined}
				onCloseAdmin={closeAdmin}
				settings={{
					themeOverride, setThemeOverride,
					householdName,
					setHouseholdName: (v) => void api.updateHousehold({ name: v }),
					householdInk,
					setHouseholdInk: (v) => void api.updateHousehold({ ink: v }),
					itemCount: items.length,
					defaultThreshold,
					setDefaultThreshold: (v) => void api.updateHousehold({ defaultThreshold: v }),
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
					onTransferOwnership: (membershipId) => {
						const member = members.find((m) => m.id === membershipId);

						setPending({
							kind: 'transfer-ownership',
							membershipId,
							name: member?.displayName || 'this member',
						});
					},
					/*
					 * Built here rather than in the pane, because the rows are
					 * already in this component: `pantry` is the household you are
					 * in, and the file is that answer written down. Nothing is
					 * fetched and nothing is asked of the server.
					 */
					onExportPantry: (format) => downloadExport(
						pantryFilename(householdName, new Date().toISOString(), format),
						pantryFile(format, items, locations, stores, types),
						format
					),
					onLeaveHousehold: requestLeave,
					leaveLabel: members.length <= 1 ? 'Delete household' : 'Leave household',
				}}
				onCreateTerm={(kind, name, ink, sourceKind) => taxonomy.create(kind, { name, ink, kind: sourceKind })}
				onRenameTerm={(kind, id, name) => { void taxonomy.update(kind, id, { name }); }}
				onRecolorTerm={(kind, id, ink) => { void taxonomy.update(kind, id, { ink }); }}
				onDeleteTerm={(kind, id) => void requestDeleteTerm(kind, id)}
				onSetSourceKind={(id, next) => { void taxonomy.setKind(id, next); }}
				canEditTaxonomy={mayEditTaxonomy}
				closeEditing={closeEditing}
				theme={theme}
			/>

			<div class="flex-1 min-w-0 overflow-x-hidden">
			{/*
			  * The admin console takes the whole content column.
			  *
			  * It replaces the top bar rather than sitting under it: search, the
			  * status pills, the sort and the run trigger are every one of them a
			  * control over *a* household, and there is no household here. What
			  * survives is everything outside this column — the drawer, the rail,
			  * the account row — which is the entire argument for the console
			  * being a pane rather than a surface.
			  *
			  * The mobile header keeps its menu button and its wordmark and loses
			  * the rest, for the same reason: the filter badge counts a filter on
			  * a pantry, and the household name under the wordmark says which
			  * pantry, and neither is a fact about this screen.
			  */}
			{adminSection !== null ? (
			<>
			<header class="md:hidden">
				<div class="flex items-center gap-[13px] px-5 pt-6 pb-3">
					<button
						onClick={() => { setDrawerOpen(true); setDrawerCollapsed(false); }}
						class={`shrink-0 flex items-center justify-center w-11 h-11 rounded-[13px] ${PAGE_BUTTON_OUTLINE}`}
						aria-label="Open menu"
					>
						<Menu size={19} />
					</button>
					<h1
						class="min-w-0 font-disp text-wordmark font-extrabold leading-[1.06] tracking-[-0.015em]"
						style={{ color: theme.textStrong }}
					>
						Larder <span class="italic" style={{ color: theme.accent }}>Log</span>
					</h1>
				</div>
			</header>

			<div class="px-[18px] md:px-[34px] pt-3 md:pt-[30px] pb-28 md:pb-[30px]">
				<AdminConsole
					section={adminSection}
					onSection={goAdmin}
					filter={adminFilter}
					onFilter={setAdminFilter}
					openId={adminOpenId}
					onOpen={setAdminOpenId}
					peopleFilter={adminPeopleFilter}
					onPeopleFilter={setAdminPeopleFilter}
					openUserId={adminOpenUserId}
					onOpenPerson={setAdminOpenUserId}
					onCrossToPerson={goAdminPerson}
					onCrossToHousehold={goAdminHousehold}
					theme={theme}
					dark={dark}
				/>
			</div>
			</>
			) : (
			<>
			{/* Mobile only: above `md` the drawer carries the wordmark and the menu. */}
			<header class="md:hidden">
				{/*
				  * **24px is the phone's one vertical rhythm**, and every gap down
				  * this column is it: above the wordmark, between the wordmark and
				  * the search, between the search and the status pills (row 2's own
				  * `pt-6`). It was 16 / 36 / 24 — three different gaps in the first
				  * three, which reads as three unrelated bands rather than one
				  * column.
				  *
				  * The middle one is **split between two owners** and always has
				  * been: this `pb-3` and the content wrapper's `pt-3` below. They
				  * are 12 + 12, and neither is meaningful alone — change one and
				  * change the other.
				  */}
				<div class="flex items-center gap-[13px] px-5 pt-6 pb-3">
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
							{/*
							  * `theme.accent`, not the light crimson written down
							  * twice. This wordmark held `#BE3346` in both themes —
							  * 3.11:1 on the dark ground — which is the exact bug
							  * `accent` was added to fix, on the one wordmark that
							  * never got it. 4.81:1 in dark now.
							  */}
							Larder <span class="italic" style={{ color: theme.accent }}>Log</span>
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
					{! empty && ! bulkMode && toBuyTotal > 0 && (
						<span class="ml-auto shrink-0">
							<RunListTrigger
								active={listMode}
								count={toBuyTotal}
								onToggle={() => setListMode(! listMode)}
								compact
								basket={sourceWord === 'Source'}
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
			{/*
			  * `transferError` rides the same banner rather than a second one.
			  * `transferOwnership` is the app's one mutation outside
			  * `usePantryData`, so its refusal has nowhere else to land — and two
			  * alert regions saying the same kind of thing in the same place is
			  * the drift the shared banner exists to prevent.
			  */}
			{(api.error || transferError) && (
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
						<span>{api.error || transferError}</span>
						<button
							onClick={() => { api.dismissError(); setTransferError(''); }}
							aria-label="Dismiss"
							class="shrink-0"
						>
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
			{/* `pt-3` is the second half of the header's 24px gap — see the note on it. `py-6`'s bottom half never applied: `pb-28` and `md:pb-[30px]` both overrode it. */}
			<div class="px-[18px] md:px-[34px] pt-3 md:pt-[30px] pb-28 md:pb-[30px]">
				<main ref={setColumn}>
					{/*
					  * The whole top bar is absent at zero items — search, the
					  * status chips, the count and the sort trigger with them.
					  * Every one of them is a control over nothing, and the empty
					  * state below is meant to own the screen and carry its only
					  * primary. All of it comes back with the first item.
					  */}
					{! empty && (
					<div class="flex items-center gap-3.5">
						{/*
						  * The field and its menu, in one positioned box — the menu is
						  * `absolute` under the field's own bottom edge, and at 390 it
						  * takes the column's width from this wrapper rather than
						  * naming a number.
						  */}
						<div class="relative flex-1 min-w-0">
							<label class={`flex items-center gap-[11px] h-[50px] px-[18px] rounded-[15px] focus-within:border-line-strong ${PAGE_INPUT} ${dark ? PAGE_FIELD_HALO_WITHIN_DARK : PAGE_FIELD_HALO_WITHIN}`}>
								<Search size={18} style={{ color: theme.textFaint }} />
								<input
									value={search}
									onInput={(e) => setSearch(e.currentTarget.value)}
									onKeyDown={(e) => {
										if (searchSuggest.onKeyDown(e, pickSearchSuggestion)) return;

										/*
										 * **A second Escape clears the field** — the two
										 * steps the `×` beside it collapses into one. The
										 * first went to the menu, above.
										 */
										if (e.key === 'Escape' && search) { e.preventDefault(); setSearch(''); }
									}}
									onBlur={() => searchSuggest.close()}
									placeholder="What are you looking for?"
									aria-label="Search items"
									class="text-[15px] outline-none flex-1 min-w-0 bg-transparent"
									style={{ color: theme.text }}
									role="combobox"
									aria-autocomplete="list"
									aria-expanded={searchSuggest.open}
									aria-controls={SEARCH_SUGGEST_ID}
									aria-activedescendant={searchSuggest.open && searchSuggest.active >= 0 ? searchSuggest.rows[searchSuggest.active]?.id : undefined}
									autocomplete="off"
								/>
								{/*
								  * **Search is still not touched by `Clear filters`**, so
								  * this is the only thing that empties it — and now doubly
								  * right, since the menu's term rows put chips in that bar
								  * and clearing them should not clear the query that found
								  * them.
								  */}
								{search && (
									<button
										onClick={() => { setSearch(''); searchSuggest.close(''); }}
										/* The console's two clears' geometry, so the app has one search clear and not a third size. `-mr-2` puts the glyph's centre 26px off the field's right edge, against the search mark's 27 on the left. */
						class={`flex items-center justify-center w-8 h-8 -mr-2 shrink-0 ${PAGE_ICON_IN_FIELD}`}
										aria-label="Clear the search"
									>
										<X size={15} />
									</button>
								)}
							</label>

							<SuggestMenu
								open={searchSuggest.open}
								groups={searchSuggest.groups}
								active={searchSuggest.active}
								setActive={searchSuggest.setActive}
								onPick={pickSearchSuggestion}
								announced={searchSuggest.announced}
								label="Search suggestions"
								id={SEARCH_SUGGEST_ID}
								matchLength={search.trim().length}
								dark={dark}
								theme={theme}
							/>
						</div>
						{/*
						  * **The primary grows a chevron** (D67): pressing the label
						  * opens the Add sheet exactly as it did, pressing the chevron
						  * opens the menu holding the other routes. The Add sheet
						  * carries none of it — the sheet is for one item and the
						  * button is for choosing.
						  */}
						{mayEditItems && (
							<AddMenu onAdd={openAddForm} onRoute={openBulkRoute} variant="inline" theme={theme} />
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
					  * because the list has one fixed order; and **the trigger goes**,
					  * because *Back to items* is the way out. Two controls are left —
					  * the exit on the left, the **segment** on the right where the
					  * sort trigger stands in grid mode — with the trip count between
					  * them.
					  *
					  * **It is one line at every width**, the segment included. It had
					  * a row of its own for a day and that was a fifth row at 390, in a
					  * top bar whose documented worst case was already four. Three
					  * things paid for it, in order: the pills' 368px reserved slot
					  * (nothing is holding an x any more), the trigger's 135, and then
					  * the trip clause and the segment's own words, which go together
					  * on one threshold.
					  *
					  * **Every control on the row shares a height** — 44px compact, 40
					  * full — off row 2's own `compact`.
					  *
					  * Below `md` the trigger is in the mobile header in both modes,
					  * which is what buys the pills and the sort room to share a row
					  * again at 390.
					  */}
					{/*
					  * **The top bar is absent at zero items — except in bulk mode.**
					  * Every control on it is a control over nothing on an empty
					  * pantry, which is why the empty state owns that screen. A review
					  * table is not nothing: it has to carry its own way out, and the
					  * exit lives in this row.
					  */}
					{(! empty || bulkMode !== null) && (
					<div class={`flex items-center pt-6 pb-4 px-0.5 ${compact ? 'gap-2' : 'gap-3.5'}`}>
						{/*
						  * The row's left slot: the status pills in grid mode, the exit
						  * in list mode, and never both.
						  *
						  * **It used to hold the pills' width in both modes** —
						  * `invisible` rather than unmounted, with the exit laid over
						  * them absolutely — because the trigger sat immediately after
						  * it and unmounting them slid the trigger a third of the way
						  * across a 1440 screen on every press. The trigger is not on
						  * this row in list mode at all now, so there is no x to hold
						  * still and the 368px is simply gone: it is what the segment
						  * is built out of.
						  */}
						<div class={
							// In list mode there is nothing to hold still — the trigger
							// has gone to the row's right end — so the slot is the
							// exit's own words and the segment takes everything else.
							listMode || bulkMode
								? 'flex items-center shrink-0'
								: (compact ? 'flex-1 min-w-0 flex items-center' : 'flex items-center')
						}>
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
								// They unmount now rather than going `invisible`. The
								// width they were holding was the trigger's x, and the
								// trigger is no longer measured from this slot.
								(listMode || bulkMode ? 'hidden ' : '') +
								(compact
									? 'w-full min-w-0 flex items-center gap-2 overflow-x-auto p-1 -m-1'
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
							  * half of this pair — filled while the mode is on — so the
							  * way out is the sort menu's resting treatment: a chevron
							  * and its words on nothing, resolving under the pointer.
							  * Two filled controls a gap apart would both be asking to
							  * be pressed.
							  *
							  * **It is an ordinary flex child now**, not an overlay on a
							  * reserved slot: it owns the row's left, the trigger has
							  * gone to the right, and nothing is holding a width for
							  * anything. That retires the `top-0 bottom-0 my-auto`
							  * centring, which existed because this row's
							  * `active:translate-y-px` and a `-translate-y-1/2` are the
							  * same custom property — a press replaced `-50%` with `1px`
							  * and dropped the button half its own height.
							  *
							  * It stands `h-11` / `h-10` with the trigger and the
							  * segment, so the three controls on this row share one
							  * height at both widths.
							  */}
							{/*
							  * One exit, and both modes take it. Bulk entry replaces the
							  * content column exactly as the run list does, so the way
							  * out is the same control in the same place — and the two
							  * can never be on at once, which is what makes that safe.
							  */}
							{(listMode || bulkMode) && (
								<button
									onClick={() => { if (bulkMode) leaveBulk(); else setListMode(false); }}
									class={`shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap ${compact ? 'h-11 px-2.5' : 'h-10 px-3'} rounded-[11px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${PAGE_BUTTON_QUIET}`}
								>
									<ChevronLeft size={16} strokeWidth={2.4} />
									Back to items
								</button>
							)}
						</div>

						{/*
						  * `ml-auto` rather than a spacer: with room it pushes the tail
						  * right, and with none it collapses — where a second `flex-1`
						  * would have taken half the slack off the pills.
						  */}
						<div class={
							'ml-auto flex items-center gap-[18px] ' +
							// The segment scrolls inside the tail once its words have
							// gone, so the tail has to be allowed to shrink; every other
							// arrangement of this row is fixed-width.
							(iconOnly && listMode ? 'min-w-0' : 'shrink-0')
						}>
							{/*
							  * The trip clause, and **only in list mode**.
							  *
							  * `Showing 20 of 63` used to hold this slot in grid mode and
							  * is gone: the three status pills to its left already carry
							  * every count that matters, the grid is directly below to be
							  * looked at, and its pair — rendered-so-far of matching — was
							  * never the pair the live region announces (matching of
							  * household), so the two disagreed on screen by design and
							  * explained nothing to anyone.
							  *
							  * **The trip clause goes with the segment's words**, on the
							  * same threshold: it is down to `3 in the cart` by then, the
							  * segment says the rest in tabs you can press, and the trip
							  * bar directly under the list says that sentence again. One
							  * budget, spent in order.
							  */}
							{listMode && ! iconOnly && (
								<span
									class={'text-right ' + (compact ? 'text-[12.5px]' : 'text-sm')}
									style={{ color: theme.textMuted }}
								>
									{compact ? tripLine.short : tripLine.full}
								</span>
							)}

							{/*
							  * **The segment sits at the row's right edge**, which is
							  * where the sort trigger stands out of list mode — so the
							  * two modes put their one *how am I looking at this*
							  * control in the same place, and the trigger and the exit
							  * keep the left exactly as they were.
							  *
							  * Short of room it drops its words to its glyphs and
							  * scrolls, rather than taking a row of its own. It had one
							  * for a day: it cost a fifth row at 390 in a top bar whose
							  * documented worst case was already four. The bleed is row
							  * 3's — `pr` past the gutter with a matching negative
							  * margin — so the last tab does not stop dead at the column
							  * edge while there is more of it to reach.
							  *
							  * `py-1 -my-1` and `pl-1 -ml-1` are the pills' trick, split
							  * per axis so they cannot collide with that bleed:
							  * `overflow-x-auto` clips on **both** axes, and a focused
							  * tab's ring is a box-shadow outside its border box. A
							  * single `p-1 -m-1` would fight `-mr-[18px]` for the right
							  * margin, and which won would be decided by the order two
							  * rules happen to land in the compiled sheet.
							  */}
							{listMode && banded && (
								<div class={
									iconOnly
										// The bleed is below `md` only, where the segment is
										// the last thing before the gutter. Above it the
										// trigger is, and 18px of negative margin there would
										// slide the tabs under it. A base utility loses to a
										// `md:` rule cleanly — it is *arbitrary variants* that
										// cannot be ordered against a named breakpoint.
										? 'min-w-0 flex overflow-x-auto py-1 -my-1 pl-1 -ml-1 pr-[18px] -mr-[18px] md:pr-0 md:mr-0'
										: 'flex'
								}>
									<RunSegment
										bands={bands}
										total={toBuyHere}
										tab={activeTab}
										onPick={setRunTab}
										compact={compact}
										iconOnly={iconOnly}
										theme={theme}
									/>
								</div>
							)}

							{/*
							  * The trigger, and on desktop it is **the way in only**.
							  *
							  * It sits at the row's right end beside the sort, which is
							  * the group of two: neither is about the pantry, both are
							  * about how you are looking at it. It used to sit
							  * immediately after the status pills — the on-ramp where the
							  * eye crossing `9 in stock · 6 running low · 5 out` lands on
							  * the thing to do about it — and that argument is what was
							  * given up for the grouping.
							  *
							  * **In list mode there is no trigger on this row.** *Back to
							  * items* is the way out and it is unambiguous about it; the
							  * trigger would be a second exit, and a control whose count
							  * is the household's on a screen already counting the
							  * filtered set. The segment takes this slot instead, which
							  * is the same trade: the right end is what you can do about
							  * the view, whichever view it is.
							  *
							  * Below `md` none of this applies — the trigger is in the
							  * mobile header in both modes and never moves at all.
							  */}
							{! listMode && ! bulkMode && toBuyTotal > 0 && (
								<span class="hidden md:inline-flex shrink-0">
									<RunListTrigger
										active={listMode}
										count={toBuyTotal}
										onToggle={() => setListMode(! listMode)}
										compact={compact}
										basket={sourceWord === 'Source'}
										dark={dark}
										theme={theme}
									/>
								</span>
							)}

							{/*
							  * The list has one fixed order — A–Z inside each card
							  * (D74) — so offering to change it would be a lie.
							  *
							  * Pulled to the edge so its padding does not read as a gap.
							  */}
							{/*
							  * **Both modes drop the sort**, and for one reason: neither
							  * is showing the item grid. The run list has one fixed
							  * order; the review is the order the lines arrived in, which
							  * is what makes it *the screen you just typed, read back to
							  * you*.
							  */}
							{! listMode && ! bulkMode && (
								<div class="-mr-2 md:mr-0">
									<SortMenu open={sortMenuOpen} setOpen={setSortMenuOpen} sortBy={sortBy} setSortBy={setSortBy} compact={compact} theme={theme} />
								</div>
							)}

							{/*
							  * Bulk entry's own clause, in the slot the trip line holds
							  * in list mode: `24 lines · 22 new · 2 already here`. It
							  * shortens rather than truncating at the width where the
							  * status pills already shorten.
							  */}
							{bulkMode === 'review' && (
								<span
									class={'text-right ' + (compact ? 'text-[12.5px]' : 'text-sm')}
									style={{ color: theme.textMuted }}
								>
									{compact
										? `${bulkCounts.selected} new · ${bulkCounts.existing} here`
										: `${bulkCounts.lines} ${bulkCounts.lines === 1 ? 'line' : 'lines'} · ${bulkCounts.fresh} new · ${bulkCounts.existing} already here`}
								</span>
							)}

							{bulkMode === 'common' && (
								<span
									class={'text-right ' + (compact ? 'text-[12.5px]' : 'text-sm')}
									style={{ color: theme.textMuted }}
								>
									Common items
								</span>
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
					  * The trip's own region, separate from the filters'.
					  *
					  * They describe different things and land at different moments —
					  * one answers a press on a chip, the other answers a write — and a
					  * shared region would have each overwrite the other's sentence.
					  */}
					<span role="status" aria-live="polite" style={SR_ONLY}>{tripAnnouncement}</span>

					{/*
					  * **Row 3 — the applied filters.** Present only while a term
					  * filter is on, so most of the time the bar is still two rows.
					  *
					  * It stays in list mode. The list obeys the same filters, so the
					  * bar and its clear come with you: row 1 never changes and row 2
					  * swaps its contents, which is what makes the switch read as the
					  * content changing rather than the app changing.
					  */}
					{! empty && ! bulkMode && (
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
					{/*
					  * **Three modes share this column and only one is ever on.** The
					  * run list and the two bulk screens all *replace* the grid rather
					  * than covering it, for the reason a modal was wrong for the first
					  * of them: these are things you work through, not questions you
					  * dismiss to continue.
					  */}
					{bulkMode === 'review' ? (
						<BulkReview
							source={bulkSource}
							rows={bulkRows}
							setRows={setBulkRows}
							locations={locations}
							types={types}
							stores={stores}
							saving={saving}
							onCommit={() => void commitBulk()}
							onBack={leaveBulk}
							dark={dark}
							theme={theme}
						/>
					) : bulkMode === 'common' ? (
						<CommonItems
							items={items}
							types={types}
							onReview={reviewCommonItems}
							onBack={leaveBulk}
							dark={dark}
							theme={theme}
						/>
					) : listMode ? (
						<RunList
							bands={shownBands}
							banded={banded && activeTab === 'all'}
							checked={trip.checked}
							claimedBy={claimedBy}
							onToggle={mayEditItems ? trip.toggle : undefined}
							onClearChecks={mayEditItems ? clearChecks : undefined}
							onPutAway={mayEditItems ? openPutAway : undefined}
							putAwayCount={tripDone}
							onBackToItems={() => setListMode(false)}
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
									body="Add your first item. Your locations, stores, and types are already set up in Filters — rename or recolor them whenever you like."
									action={mayEditItems ? { label: 'Add item', icon: Plus, onClick: openAddForm } : undefined}
									theme={theme}
								>
									{/*
									  * **Day one keeps both routes spelled out** rather than
									  * taking the chevron (D67). This is the one screen in the
									  * app with room and nothing else competing for it, and it
									  * is also the screen where somebody is most likely to
									  * have two hundred things to enter and no idea the app
									  * can take them.
									  *
									  * A pressable sentence rather than a button: the primary
									  * above it is the answer for most people, and a second
									  * button beside it would be two of them asking equally.
									  * It is a deliberate second idiom for one job, and the
									  * argument for it is only as good as this screen — worth
									  * revisiting if the app grows another empty state.
									  */}
									{mayEditItems && (
										<button
											onClick={() => setPasteOpen(true)}
											class={`inline-flex items-center gap-1 h-9 px-2 -mx-2 rounded-[11px] text-[14.5px] font-semibold ${PAGE_BUTTON_QUIET} border border-transparent transition-colors active:translate-y-px ${PAGE_FOCUS}`}
										>
											Add several at once
											<ChevronRight size={16} strokeWidth={2.4} />
										</button>
									)}
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

							{/*
							  * A real control, not only a scroll trigger. An
							  * IntersectionObserver answers a gesture a keyboard does
							  * not have, so a sentinel with nothing in it is a list a
							  * keyboard user cannot reach the end of. The observer makes
							  * this redundant for a pointer, which is the right order:
							  * the button is the floor, the scroll is the convenience.
							  */}
							{visibleCount < sorted.length && (
								<div ref={setSentinel} class="col-span-full py-4 flex justify-center">
									<button
										onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length))}
										class={`inline-flex items-center h-10 px-4 rounded-[11px] text-[13.5px] font-semibold border transition-colors active:translate-y-px ${PAGE_FOCUS} ${PAGE_BUTTON_QUIET}`}
									>
										{`Show ${Math.min(PAGE_SIZE, sorted.length - visibleCount)} more`}
									</button>
								</div>
							)}
						</div>
					</>
					)}
				</main>
			</div>
			</>
			)}
			</div>

			{/*
			  * Mobile's primary action, pinned rather than scrolled past. The grid
			  * carries matching bottom padding so the last card clears it.
			  */}
			{/* Gone in the console: it is the pantry's primary, and the console
			  * has no pantry under it to add to. */}
			{mayEditItems && ! empty && adminSection === null && (
				<div
					class="md:hidden fixed inset-x-0 bottom-0 z-30 px-5 pt-3.5 pb-5"
					style={{ background: theme.ground, borderTop: `1px solid ${theme.border}` }}
				>
					{/*
					  * **At 390 the chevron joins the pinned bar, not row 1**, and that
					  * is a knowing departure from the design's mobile board.
					  *
					  * That board draws the split beside search on the reasoning that
					  * *the primary is already a 52px square at this width* — which is
					  * not what the build has: below `md` row 1 is search alone and
					  * mobile's primary is this bar. Putting a second one up there
					  * would be three ways to add on one phone screen.
					  *
					  * It also answers the number the design flags as most likely to be
					  * wrong. A 34px chevron cell was under the 44px floor every other
					  * mobile control holds, and growing it in row 1 cost search
					  * another 10px; down here there is a full row to spend, so the
					  * chevron is 44 and search is untouched.
					  */}
					<AddMenu onAdd={openAddForm} onRoute={openBulkRoute} variant="bar" theme={theme} />
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
				itemId={editingId}
				items={items}
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
			  * The put-away — the Add / Edit sheet in a different job (D64), and
			  * the only thing on the run list that writes.
			  *
			  * It renders beside that sheet rather than inside `RunList`, for the
			  * reason every other overlay in this app does: a sheet is a fact about
			  * the screen, not about the list under it, and the two can never be
			  * open at once because the trip bar is unreachable while either is.
			  */}
			{/*
			  * Bulk entry's paste sheet, beside the other two rather than inside a
			  * screen — every overlay in this app sits here, because an overlay is a
			  * fact about the screen and not about the thing under it. It is
			  * reachable from the chevron menu, from the empty larder's ghost, and
			  * from the checklist it in turn offers.
			  */}
			<PasteListSheet
				open={mayEditItems && pasteOpen}
				onRead={readPastedList}
				onCommonItems={() => { setPasteOpen(false); openBulkRoute('common'); }}
				onClose={() => setPasteOpen(false)}
				dark={dark}
				theme={theme}
			/>

			<PutAwaySheet
				open={putAway !== null}
				rows={putAway ?? []}
				saving={saving}
				onCommit={(counts) => void commitPutAway(counts)}
				onClose={() => setPutAwayRows(null)}
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

			{/*
			  * The account deletion flow (D68), at the app's top level with every
			  * other modal — **not in the pane it is reached from**, whose
			  * `<aside>` is a transformed ancestor and therefore the containing
			  * block for anything `position: fixed` inside it.
			  *
			  * `deleting` is the snapshot the pane handed over, so both dialogs
			  * draw the same households and neither re-queries.
			  */}
			{deleting && (
				<>
					<AccountPreflight
						open={deleteStep === 'preflight'}
						households={deleting.households}
						chosen={deleteChosen}
						onChoose={(householdId, value) => setDeleteChosen((prev) => ({ ...prev, [householdId]: value }))}
						/*
						 * **The dialog stays open.** The file arrives beside it, and
						 * the decision the row is about has not been made yet —
						 * closing the pre-flight to hand over a copy would throw away
						 * every other answer on the screen.
						 */
						onExport={(household, format) => setExporting({ household, format })}
						onContinue={() => setDeleteStep('confirm')}
						onCancel={() => setDeleting(null)}
						dark={dark}
						theme={theme}
					/>

					<AccountDeleteConfirm
						open={deleteStep === 'confirm'}
						name={deleting.name}
						households={deleting.households}
						chosen={deleteChosen}
						onConfirm={() => void commitAccountDelete()}
						onCancel={() => setDeleting(null)}
						busy={deleteBusy}
						error={deleteError}
						dark={dark}
						theme={theme}
					/>
				</>
			)}

			{/* Renders nothing: it mounts, subscribes, downloads once, and asks to
			  * be unmounted — the one-shot read in a client that only has
			  * subscriptions. */}
			{exporting && (
				<ExportPantry
					householdId={exporting.household.id}
					householdName={exporting.household.name}
					format={exporting.format}
					onDone={clearExport}
				/>
			)}

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
	onCreateHousehold: (name: string, ink: string, sources: SourceMix) => Promise<string | null>;
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
