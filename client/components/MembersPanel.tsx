import { useState } from 'preact/hooks';

import { DrawerAvatar } from './DrawerAvatar';
import { ROLE_LABELS, RoleMenu } from './RoleMenu';
import type { Theme } from '../lib/theme';
import type { Member } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can } from '../../shared/roles';

/**
 * Who is in the household, and what an owner may do about it.
 *
 * Every rule shown here is also enforced server-side — this panel is where the
 * reason is visible *before* the click, not instead of the check. The two never
 * diverge because both read `shared/roles.ts`; nothing about a role is decided
 * in this file.
 *
 * **The role word is the only control on a row.** It used to be a pill stating
 * the role with a segmented strip appearing underneath whichever member you
 * last tapped, anchored to nothing, plus a separate remove button — three
 * controls saying two things. Now the word opens a menu, and *Remove from
 * household* is the last row of it: a `⋯` beside the role would be a second
 * control opening a menu you can already reach.
 *
 * **Leaving is not here.** It sits inside the Household card on the root pane,
 * because leaving is something you do to your own membership rather than
 * something you do to the member list.
 */
type Props = {
	members: Member[];
	/** The viewer's own membership row id and role. */
	me: { membershipId: string; role: Role };
	onChangeRole: (membershipId: string, role: Role) => void;
	/**
	 * Asks to remove someone. It does **not** remove them.
	 *
	 * Removing a member reaches somebody who is not looking at this screen, so
	 * it is a confirm modal rather than an undo (D36) — and the modal is owned
	 * by `Pantry`, which is the only place that can put one over the whole app.
	 */
	onRemoveMember: (membershipId: string) => void;
	theme: Theme;
};

export function MembersPanel({ members, me, onChangeRole, onRemoveMember, theme }: Props) {
	const d = theme.drawer;
	const mayManageRoles = can(me.role, 'member:role');

	/** Which row's menu is open. One at a time, so two cannot overlap. */
	const [openId, setOpenId] = useState<string | null>(null);

	return (
		<div class="flex flex-col rounded-[13px]" style={{ background: d.raised, border: `1px solid ${d.line}` }}>
			{members.map((member, i) => {
				const isMe = member.id === me.membershipId;
				const name = member.displayName || 'Someone';

				return (
					<div key={member.id}>
						{/* Full-bleed, like every other hairline inside a card in this
						  * drawer. The boards inset it past the avatar; at 340px with
						  * three rows that reads as a ragged edge rather than a list
						  * rule, and the Household card two taps away divides its rows
						  * edge to edge. */}
						{i > 0 && <span class="block h-px" style={{ background: d.line }} />}

						<div class="flex items-center gap-3 px-3 py-[11px]">
							<DrawerAvatar name={name} size={36} />

							{isMe ? (
								/*
								 * Your own row has no trigger. Demoting yourself while
								 * you are the only owner is the blocked dialog that
								 * already exists for leaving, not a disabled menu row —
								 * and there is nothing else on this row to change.
								 */
								<span class="flex-1 min-w-0 flex flex-col gap-px">
									<span class="text-body truncate" style={{ color: d.ink }}>{name}</span>
									<span class="text-meta" style={{ color: d.inkFaint }}>
										{ROLE_LABELS[member.role]} &middot; You
									</span>
								</span>
							) : (
								<>
									<span class="flex-1 min-w-0 text-body truncate" style={{ color: d.ink }}>{name}</span>
									{mayManageRoles ? (
										<RoleMenu
											open={openId === member.id}
											setOpen={(open) => setOpenId(open ? member.id : null)}
											memberName={name}
											role={member.role}
											onChangeRole={(role) => onChangeRole(member.id, role)}
											onRemove={() => onRemoveMember(member.id)}
											theme={theme}
										/>
									) : (
										<span class="shrink-0 text-meta" style={{ color: d.inkFaint }}>
											{ROLE_LABELS[member.role]}
										</span>
									)}
								</>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
