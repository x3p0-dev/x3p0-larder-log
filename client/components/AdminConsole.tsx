import { AdminAccount } from './AdminAccount';
import { AdminActivity } from './AdminActivity';
import { AdminHousehold } from './AdminHousehold';
import { AdminHouseholds } from './AdminHouseholds';
import { AdminOverview } from './AdminOverview';
import { AdminPeople } from './AdminPeople';
import type { AdminSection } from './AdminPane';
import type { Theme } from '../lib/theme';
import type { AdminHouseholdFilter, AdminPeopleFilter } from '../../shared/types';

/**
 * The console's content column — the app's own column, with a different thing
 * in it.
 *
 * It replaces the pantry's whole top bar rather than sitting under it: the
 * search, the status pills, the sort and the run trigger are all controls over
 * a household, and there is no household here. What survives is everything
 * outside the column — the drawer, the rail, the account row — which is the
 * whole argument for the console being a pane.
 *
 * **The section is a prop and not a route.** The published space serves nothing
 * at an unknown path (`SPA false`, D28), so `/admin` is a 404 at the edge before
 * the app is ever reached — which is, by accident, exactly the refusal board 8
 * asks for and better than one we could draw. `?admin` is the deep link, in the
 * app's own `?join=` / `?demo` / `?members` idiom.
 */
export function AdminConsole({
	section, onSection, filter, onFilter, openId, onOpen,
	peopleFilter, onPeopleFilter, openUserId, onOpenPerson,
	onCrossToPerson, onCrossToHousehold, theme, dark,
}: {
	section: AdminSection;
	onSection: (section: AdminSection) => void;
	/** Lifted so a *Needs attention* row can set it on the way to the list. */
	filter: AdminHouseholdFilter;
	onFilter: (filter: AdminHouseholdFilter) => void;
	/**
	 * The household whose page is open, or `''` for the list.
	 *
	 * A second piece of state rather than a fifth `AdminSection`, because the
	 * drawer's *Households* row has to stay lit while a household is open — you
	 * are still in Households, one level down, which is exactly what the nav
	 * block should say.
	 */
	openId: string;
	onOpen: (householdId: string) => void;
	/** People's own chip, and the account whose page is open. Same shape again. */
	peopleFilter: AdminPeopleFilter;
	onPeopleFilter: (filter: AdminPeopleFilter) => void;
	openUserId: string;
	onOpenPerson: (userId: string) => void;
	/**
	 * The seam between the two halves — a member row opening an account page,
	 * and a household row on an account page opening that household.
	 *
	 * They are their own props rather than an `onOpen*` beside an `onSection`,
	 * because the host's section handler means *the list, from the top* and
	 * clears both open ids. Composing the two at this level set an id and then
	 * wiped it, so both rows landed on the list they were leaving.
	 */
	onCrossToPerson: (userId: string) => void;
	onCrossToHousehold: (householdId: string) => void;
	theme: Theme;
	dark: boolean;
}) {
	/*
	 * The household page draws its own header — a 44px tile, the name at 26, and
	 * a meta line — so it gets the column to itself rather than a second heading
	 * saying *Households* above a heading saying which one.
	 */
	if (section === 'households' && openId) {
		return (
			<AdminHousehold
				householdId={openId}
				onBack={() => onOpen('')}
				/*
				 * The seam again, running the other way: a member row opens that
				 * person's account page, so the section moves with the id for the
				 * same reason the account page's household rows move it back.
				 */
				onOpenPerson={onCrossToPerson}
				theme={theme}
				dark={dark}
			/>
		);
	}

	if (section === 'people' && openUserId) {
		return (
			<AdminAccount
				userId={openUserId}
				onBack={() => onOpenPerson('')}
				/*
				 * The other half of the seam. Pressing a household on somebody's
				 * page moves the *section* as well as the id — landing on a
				 * household page while the drawer still lit *People* would be the
				 * nav block saying something untrue.
				 */
				onOpenHousehold={onCrossToHousehold}
				theme={theme}
				dark={dark}
			/>
		);
	}

	const heading = section === 'households' ? 'Households'
		: section === 'people' ? 'People'
		: section === 'activity' ? 'Activity'
		: 'Overview';

	return (
		<div class="flex flex-col gap-[22px]">
			<h1 class="font-disp text-[26px] font-semibold m-0" style={{ color: theme.textStrong }}>
				{heading}
			</h1>

			{section === 'households' ? (
				<AdminHouseholds
					filter={filter}
					onFilter={onFilter}
					onOpen={onOpen}
					theme={theme}
					dark={dark}
				/>
			) : section === 'activity' ? (
				<AdminActivity theme={theme} dark={dark} />
			) : section === 'people' ? (
				<AdminPeople
					filter={peopleFilter}
					onFilter={onPeopleFilter}
					onOpen={onOpenPerson}
					theme={theme}
					dark={dark}
				/>
			) : (
				<AdminOverview
					onNeedsAttention={(next) => { onFilter(next); onSection('households'); }}
					theme={theme}
					dark={dark}
				/>
			)}
		</div>
	);
}
