import { Check, ChevronDown } from 'lucide-preact';

import { DrawerMenu, DrawerMenuRule } from './DrawerMenu';
import { useDismiss } from '../hooks/useDismiss';
import type { Theme } from '../lib/theme';
import {
	DRAWER_MENU_ROW, DRAWER_MENU_ROW_DANGER, DRAWER_SUNK, DRAWER_SUNK_ON,
	PAGE_HELD, PAGE_MENU, PAGE_MENU_ROW, PAGE_MENU_ROW_DANGER, PAGE_SUNK,
} from '../lib/controlStyles';
import type { Role } from '../../shared/roles';
import { ROLES } from '../../shared/roles';

export const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	editor: 'Editor',
	viewer: 'Viewer',
};

/**
 * What a role lets someone do, in one sentence each.
 *
 * Three role names are meaningless words on their own, and *Viewer* is the one
 * nobody can guess. Written from the third person, because the reader is the
 * person handing the role out.
 *
 * **These have to track `shared/roles.ts`.** The first version said an editor
 * *"can’t invite anyone"*, which the capability table flatly contradicts:
 * `editor` holds `invite:create` and `invite:revoke`, and `invitableRoles`
 * lets them mint viewer invites. It also said only "items", omitting
 * `taxonomy:write` — locations, stores and types. Copy that describes a
 * permission is as wrong as code that gets it wrong, and it is the half nobody
 * typechecks.
 *
 * What each one is actually claiming, against the matrix:
 *
 * - **owner** — every capability, so the sentence names the three an editor
 *   does not have rather than listing nine.
 * - **editor** — `item:write` and `taxonomy:write`, plus invites limited to
 *   Viewer. Denied `household:settings`, `member:role`, `member:remove` and
 *   `household:delete`, which "manage members or rename the pantry" covers.
 * - **viewer** — `pantry:read`, and nothing else at all.
 */
export const ROLE_BLURBS: Record<Role, string> = {
	owner: 'Can do everything you can, including inviting people, changing roles, and renaming the pantry.',
	editor: 'Can add and change items, locations, stores, and types, and can invite viewers. Can’t manage members or rename the pantry.',
	viewer: 'Can see everything, and nothing they do changes it.',
};

/**
 * Changing someone's role.
 *
 * **The role word is the trigger**, so the role is named once rather than twice
 * — which is what put this ahead of a `⋯` overflow menu, and *Remove from
 * household* at the foot of it is why there is no second control on the row at
 * all. Owner only; absent rather than disabled for everyone else (D30), and
 * absent on your own row, which reads *Owner · You* in meta and carries no
 * control.
 *
 * The menu right-aligns to its trigger and is 224px inside a 340px pane, so it
 * never asks for room the drawer does not have.
 *
 * Nothing here is disabled. Demoting the household's only owner is refused
 * server-side, and it is unreachable from this menu anyway: you have to be an
 * owner to see it, and it never appears on your own row, so the person you are
 * looking at is never the last owner. The trash on a term row settled the same
 * question the same way (D36) — a disabled control cannot explain itself.
 *
 * **`onDark` is the one thing that changes, and the existing rule picked it.**
 * In the app this opens on the drawer, so it is dark. In the admin console it
 * opens on a cream card, so it takes the sort menu's construction instead — the
 * same component, the other surface. The reverse is the mistake `DrawerMenu`
 * already records: a cream popover over the darkest panel in the app would put
 * the brightest thing on screen over the darkest.
 *
 * **The console reaches the last-owner case where the app cannot.** There, this
 * only ever appears on somebody else's row and only to an owner, so the person
 * you are looking at is never the last one. An administrator is in neither
 * position, so a demotion here really can be refused — and it is refused
 * server-side with a sentence rather than disabled, for the reason above.
 */
export function RoleMenu({
	open, setOpen, memberName, role, onChangeRole, onRemove, onDark = true, held = false, theme,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	memberName: string;
	role: Role;
	onChangeRole: (role: Role) => void;
	onRemove: () => void;
	/** False in the admin console, where this opens on a cream card. */
	onDark?: boolean;
	/**
	 * Present but not pressable — the console while `ADMIN_WRITES_HELD` is on.
	 *
	 * The role still **reads**, which is the point: this trigger is the only
	 * place a member's role is written on the page, so hiding it would take a
	 * fact away to disable a control. The drawer's own members pane never passes
	 * this, and must not.
	 */
	held?: boolean;
	theme: Theme;
}) {
	const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));

	const trigger = onDark
		? `h-[30px] rounded-[13px] ${open ? DRAWER_SUNK_ON : DRAWER_SUNK}`
		/* 32px at radius 10 as the boards draw it, and it keeps one treatment
		 * open or shut: the cream trigger's "open" is the menu below it, where
		 * the drawer's had to invert because a dark control on a dark panel has
		 * no other way to say so. */
		/* 44 on a phone, 32 as drawn above `md` — the console's rows are 78px
		 * tall at 390 and a 32px control inside one is the hit area the
		 * shopping list already corrected once. */
		: `h-11 md:h-8 rounded-[10px] font-semibold ${PAGE_SUNK}`;

	return (
		<span class="relative shrink-0" ref={ref}>
			<button
				onClick={() => setOpen(! open)}
				disabled={held}
				class={`flex items-center gap-[5px] pl-3 pr-2.5 text-[13.5px] ${trigger} ${held ? PAGE_HELD : ''}`}
				aria-haspopup="menu"
				aria-expanded={open}
				/* The label states the role either way and only the second half
				  * changes, so a screen reader hears what the sighted reader sees
				  * rather than an offer the control cannot honour. */
				aria-label={held
					? `${memberName} is ${ROLE_LABELS[role]} — changing roles is on hold`
					: `${memberName} is ${ROLE_LABELS[role]} — change role`}
			>
				{ROLE_LABELS[role]}
				<ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
			</button>

			{open && ! onDark && (
				<div
					role="menu"
					aria-label={`Role for ${memberName}`}
					class={`${PAGE_MENU} right-0 top-full mt-1.5 w-[240px]`}
					style={{ boxShadow: theme.liftShadow }}
				>
					{ROLES.map((option) => {
						const on = option === role;

						return (
							<button
								key={option}
								role="menuitemradio"
								aria-checked={on}
								onClick={() => { setOpen(false); if (! on) onChangeRole(option); }}
								class={PAGE_MENU_ROW}
								style={{ color: theme.text, fontWeight: on ? 600 : 400 }}
							>
								<span class="flex-1 min-w-0 truncate">{ROLE_LABELS[option]}</span>
								{on && <Check size={15} strokeWidth={2.4} style={{ color: theme.accent }} />}
							</button>
						);
					})}

					<div class="h-px mx-2 my-[5px]" style={{ background: theme.divider }} />

					<button
						role="menuitem"
						onClick={() => { setOpen(false); onRemove(); }}
						class={PAGE_MENU_ROW_DANGER}
					>
						Remove from household
					</button>
				</div>
			)}

			{open && onDark && (
				<DrawerMenu label={`Role for ${memberName}`} width="224px" place="right-0 top-full mt-1.5" theme={theme}>
					{ROLES.map((option) => {
						const on = option === role;

						return (
							<button
								key={option}
								role="menuitemradio"
								aria-checked={on}
								onClick={() => {
									setOpen(false);
									if (! on) onChangeRole(option);
								}}
								class={`flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
								style={on ? { color: theme.drawer.ink, fontWeight: 600 } : undefined}
							>
								<span class="flex-1 min-w-0 truncate">{ROLE_LABELS[option]}</span>
								{/* A check, not a fill — so a hovered row still reads. */}
								{on && <Check size={15} strokeWidth={2.4} style={{ color: theme.accent }} />}
							</button>
						);
					})}

					<DrawerMenuRule theme={theme} />

					{/*
					  * Crimson text on nothing: this is how a destructive action is
					  * *offered*. Pressing it opens the confirm, whose own primary
					  * is the ordinary ink/cream fill (D36).
					  */}
					<button
						role="menuitem"
						onClick={() => { setOpen(false); onRemove(); }}
						class={`flex items-center w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW_DANGER}`}
					>
						Remove from household
					</button>
				</DrawerMenu>
			)}
		</span>
	);
}
