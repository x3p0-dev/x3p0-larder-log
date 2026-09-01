import { ArrowLeft, ChevronRight, LogOut, Shield, UserRound } from 'lucide-preact';

import { DrawerMenuRule } from './DrawerMenu';
import type { Theme } from '../lib/theme';
import { DRAWER_MENU_ROW } from '../lib/controlStyles';

/**
 * You, and the ways out.
 *
 * The Settings pane has no Account block any more: this is the only place the
 * account appears, and it never says whether you are signed in, because if you
 * are reading it you are.
 *
 * **Contents only.** Each host owns its own box and its own dismissal, the same
 * arrangement `HouseholdSwitcher` has: the drawer's foot row opens it upward in
 * a `DrawerMenu`, and the collapsed rail opens it in a `RailFlyout` beside the
 * avatar. One component, two states of the drawer.
 *
 * **The identity row is a door now, not a display** (D68), and a door does not
 * have to be a portrait. It opens *Your account* — the pane that holds the
 * display name, the export and the deletion — and it says so in two words.
 *
 * **It stopped repeating you.** It shipped as the avatar, the name and the
 * email over again, on the reasoning that the same row one level in reads as
 * continuing rather than as arriving — but the row you pressed to get here is
 * that row, a few pixels below, still on screen. A menu that opens with a copy
 * of its own trigger has spent its widest row saying something you can already
 * see. *Your account* is the only new fact in it: what is behind the door.
 *
 * **So all three rows are one row now**, glyph and label, and only this one
 * takes a chevron — because only this one pushes a level.
 *
 * **That answers the menu's ceiling instead of walking into it.** Four rows was
 * already the point at which this construction stops being a menu, and the two
 * account-scoped rows that arrived in one week would have taken it past. A menu
 * absorbs one at a push; a pane absorbs both without being asked.
 *
 * **What it costs is the collapsed rail**, where the flyout was the one place a
 * name appeared — the trigger there is a bare 38px avatar. It is not lost: the
 * rail's own tooltip on that control is `accountName`, and the pane behind this
 * row opens on it. The drawer, where this was pure repetition, is the case that
 * decides it, and one component in two hosts stays one component.
 *
 * **The cost is that the display name moved.** *Settings tab* put it here on
 * purpose — *no modal, no profile screen; it is where you already were* — and
 * the pencil cannot live in two places. The idiom survives intact one push
 * further in: a read-only row that flips in place, Escape cancels, no toast.
 * That is the trade, and it is the thing to watch on a real screen.
 */
export function AccountMenu({
	onOpenAccount, onOpenAdmin, adminOpen, onCloseAdmin,
	onSignOut, onDone, theme,
}: {
	/**
	 * Pushes the *Your account* pane. **Handed by both hosts, always** — the
	 * drawer's foot row and the collapsed rail's flyout — which is the rule the
	 * missing *Admin* row cost a real session to learn: anything either host
	 * gives this component has to be given by both.
	 */
	onOpenAccount: () => void;
	/**
	 * Opens the admin console. **Absent for everybody who is not an
	 * administrator**, which is most people — they keep the two-row menu and
	 * never learn the console exists.
	 */
	onOpenAdmin?: () => void;
	/**
	 * Whether the console is already open, which is what turns the row round.
	 *
	 * The menu is reachable from inside the console — the account row is at the
	 * foot of the drawer the console fills, and the rail's flyout sits beside it
	 * — so *Admin* was offering to go somewhere you already were.
	 */
	adminOpen?: boolean;
	/** Leaves the console. Handed by both hosts alongside `onOpenAdmin`. */
	onCloseAdmin?: () => void;
	onSignOut: () => void;
	/** Closes the host's popover. Sign out takes it with them either way. */
	onDone: () => void;
	theme: Theme;
}) {
	const d = theme.drawer;

	return (
		<div class="flex flex-col">
			{/*
			  * The door, named rather than portrayed. **The chevron is the whole
			  * difference from the two rows below**: it is the only one that goes a
			  * level deeper into the drawer, and the app already spends that mark
			  * on exactly that — the Settings pane's *Members* row.
			  *
			  * `onDone()` because this navigates, exactly as *Admin* below does:
			  * the menu sits over the drawer the pane is about to fill.
			  */}
			<button
				onClick={() => { onDone(); onOpenAccount(); }}
				class={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
			>
				<UserRound size={15} class="shrink-0" style={{ color: d.inkFaint }} />
				<span class="flex-1 min-w-0 truncate">Your account</span>
				<ChevronRight size={14} class="shrink-0" style={{ color: d.inkFaint }} />
			</button>

			{/*
			  * *Admin* — the way into the console, above the account actions.
			  *
			  * **It is a destination, not something you do to your account**,
			  * which is why it sits here rather than beside *Sign out*.
			  *
			  * **It takes no outbound arrow.** That mark means *this leaves the
			  * app*, which is why *Change your picture* carries one — over in the
			  * account pane, where D68 moved it. Admin is still Larder Log: the
			  * same drawer, one pane along.
			  *
			  * `onDone()` because this one *does* navigate: the menu is over the
			  * drawer the console is about to fill, and leaving it open would put
			  * a popover on top of the thing it just opened.
			  *
			  * **It turns round inside the console**, because both hosts of this
			  * menu are reachable from in there — the drawer's foot row is below
			  * the console pane, and the rail's account flyout sits beside it — so
			  * a row offering to open what you are looking at is a no-op wearing a
			  * label. One row, two directions, the run list trigger's rule.
			  *
			  * **A back arrow, not a house.** The app names this destination *the
			  * pantry* and marks it with a back mark in both of the two places it
			  * already offers it — the rail's slot 2 and the console pane's own
			  * header — and `Home` is spoken for a few pixels away: it is the
			  * **Households** section's glyph in the nav block and in the rail. A
			  * house here would be the third meaning of the second mark on one
			  * screen.
			  */}
			{onOpenAdmin && (
				<button
					onClick={() => {
						onDone();
						if (adminOpen) onCloseAdmin?.();
						else onOpenAdmin();
					}}
					class={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
				>
					{adminOpen ? (
						<>
							<ArrowLeft size={15} class="shrink-0" style={{ color: d.inkFaint }} /> Back to the pantry
						</>
					) : (
						<>
							<Shield size={15} class="shrink-0" style={{ color: d.inkFaint }} /> Admin
						</>
					)}
				</button>
			)}

			{/*
			  * **One rule, and it separates the destinations from the way out.**
			  * It used to sit under the identity row, which earned it by being a
			  * taller card row among menu rows; three identical rows with a rule
			  * between each pair reads as three unrelated things. *Your account*
			  * and *Admin* are both places to go, and signing out is not.
			  */}
			<DrawerMenuRule theme={theme} />

			<button
				onClick={() => { onDone(); onSignOut(); }}
				class={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
			>
				<LogOut size={15} class="shrink-0" style={{ color: d.inkFaint }} /> Sign out
			</button>
		</div>
	);
}
