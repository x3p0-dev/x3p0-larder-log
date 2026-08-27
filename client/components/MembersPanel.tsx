import { UserMinus } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_CHIP_ON, DRAWER_ICON_DANGER } from '../lib/controlStyles';
import type { Member } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can } from '../../shared/roles';
import { wouldStrandHousehold } from '../../shared/membership';

/**
 * Who is in the household, and what an owner may do about it.
 *
 * Every rule shown here is also enforced server-side — this panel disables a
 * control so the reason is visible *before* the click, not instead of the
 * check. The two never diverge because both read `shared/roles.ts` and
 * `shared/membership.ts`; nothing about a role is decided in this file.
 *
 * **Leaving is no longer here.** It sits at the foot of the Household section
 * instead, because leaving is something you do to your own membership rather
 * than something you do to the member list — and putting it after Invites would
 * have broken *Invites last*.
 */

/**
 * Roles this UI will assign.
 *
 * `viewer` used to be absent because the read-only client did not exist yet —
 * assigning it would have handed someone a pantry full of controls that fail on
 * use. Phase 4 shipped that pass (D30), so all three are offerable now.
 */
const ASSIGNABLE: readonly Role[] = ['owner', 'editor', 'viewer'];

const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	editor: 'Editor',
	viewer: 'Viewer',
};

/** What the role control offers for one member: the assignable set, plus their own role if it is outside it. */
function roleOptions(current: Role): Role[] {
	return ASSIGNABLE.includes(current) ? [...ASSIGNABLE] : [...ASSIGNABLE, current];
}

type Props = {
	members: Member[];
	/** The viewer's own membership row id and role. */
	me: { membershipId: string; role: Role };
	onChangeRole: (membershipId: string, role: Role) => void;
	/**
	 * Asks to remove someone. It does **not** remove them.
	 *
	 * Removing a member reaches somebody who is not looking at this screen, so
	 * it is a confirm modal rather than an undo — and the modal is owned by
	 * `Pantry`, which is the only place that can put one over the whole app.
	 * This panel used to grow its own inline confirm row; two confirmation
	 * idioms for the same class of action is one too many.
	 */
	onRemoveMember: (membershipId: string) => void;
	theme: Theme;
};

export function MembersPanel({ members, me, onChangeRole, onRemoveMember, theme }: Props) {
	const mayManageRoles = can(me.role, 'member:role');
	const mayRemove = can(me.role, 'member:remove');

	return (
		<div class="flex flex-col gap-2.5">
			{members.map((member) => {
				const isMe = member.id === me.membershipId;
				const strands = wouldStrandHousehold(members, member.id);
				const editable = mayManageRoles && ! isMe;

				return (
					<div key={member.id} class="flex flex-col gap-2">
						<div class="flex items-center gap-[11px] px-3 py-[9px] rounded-xl" style={{ background: theme.surface }}>
							<span
								class="flex items-center justify-center w-8 h-8 rounded-full shrink-0 font-disp text-sm font-bold"
								style={{ background: '#4A3E2E', boxShadow: 'inset 0 0 0 1px #63533E', color: '#E8DCC6' }}
							>
								{(member.displayName || '?').charAt(0).toUpperCase()}
							</span>

							<span class="flex-1 min-w-0 flex items-baseline gap-[7px]">
								<span class="text-[14.5px] truncate" style={{ color: theme.textStrong }}>
									{member.displayName || 'Someone'}
								</span>
								{isMe && <span class="text-xs shrink-0" style={{ color: theme.textMuted }}>you</span>}
							</span>

							{/* The pill states the role; changing it is the row below. */}
							<span
								class="px-2.5 py-[3px] rounded-full text-[11px] font-semibold tracking-[0.04em] shrink-0"
								style={{ background: '#4A3E2E', color: theme.text }}
							>
								{ROLE_LABELS[member.role]}
							</span>

							{mayRemove && ! isMe && (
								<button
									onClick={() => onRemoveMember(member.id)}
									disabled={strands}
									class={`shrink-0 flex items-center justify-center w-7 h-7 ${DRAWER_ICON_DANGER}`}
									aria-label={`Remove ${member.displayName}`}
								>
									<UserMinus size={14} />
								</button>
							)}
						</div>

						{editable && (
							<div class="flex gap-1.5 pl-1">
								{roleOptions(member.role).map((role) => {
									const active = member.role === role;

									return (
										<button
											key={role}
											onClick={() => { if (! active) onChangeRole(member.id, role); }}
											// Demoting the household's only owner is refused server-side.
											// Nobody but that owner can be in this state, and they can
											// only leave it by promoting someone else first.
											disabled={role !== 'owner' && strands}
											aria-pressed={active}
											class={`px-2.5 py-1 rounded-full text-xs disabled:opacity-40 disabled:pointer-events-none ${active ? DRAWER_CHIP_ON : DRAWER_CHIP}`}
										>
											{ROLE_LABELS[role]}
										</button>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
