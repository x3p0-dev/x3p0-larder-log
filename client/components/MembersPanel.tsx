import { useState } from 'preact/hooks';
import { LogOut, UserMinus } from 'lucide-preact';

import type { Theme } from '../lib/theme';
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
 */

/**
 * Roles this UI will assign.
 *
 * `viewer` is deliberately absent: the enforcement shipped in Phase 3 but the
 * read-only client — disabled steppers, no add button, no taxonomy editing —
 * is Phase 4 work, so a viewer today would get a pantry full of controls that
 * fail on use. A member who is already a viewer still renders as one; see
 * `roleOptions` below.
 */
const ASSIGNABLE: readonly Role[] = ['owner', 'editor'];

const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	editor: 'Editor',
	viewer: 'View only',
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
	onRemoveMember: (membershipId: string) => void;
	onLeave: () => void;
	theme: Theme;
};

export function MembersPanel({ members, me, onChangeRole, onRemoveMember, onLeave, theme }: Props) {
	// Removing someone and leaving are both one-way, so each asks once. Held as
	// an id rather than a boolean so only the row in question is armed.
	const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
	const [confirmLeave, setConfirmLeave] = useState(false);

	const mayManageRoles = can(me.role, 'member:role');
	const mayRemove = can(me.role, 'member:remove');

	// D22, asked of the same function the server asks. Leaving is refused for
	// the last owner, and so is demoting or removing them.
	const leaveWouldStrand = wouldStrandHousehold(members, me.membershipId);

	return (
		<div class="mb-6">
			<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>
				Members
			</p>

			<div class="flex flex-col gap-3">
				{members.map((member) => {
					const isMe = member.id === me.membershipId;
					const strands = wouldStrandHousehold(members, member.id);

					return (
						<div key={member.id}>
							<div class="flex items-baseline justify-between gap-2">
								<p class="text-sm truncate" style={{ color: theme.text }}>
									{member.displayName || 'Someone'}
									{isMe && (
										<span class="font-mono text-xs ml-1.5" style={{ color: theme.textFaint }}>you</span>
									)}
								</p>

								{mayRemove && ! isMe && (
									<button
										onClick={() => setConfirmRemove(confirmRemove === member.id ? null : member.id)}
										disabled={strands}
										class="shrink-0 disabled:opacity-40"
										style={{ color: theme.dangerText }}
										aria-label={`Remove ${member.displayName}`}
									>
										<UserMinus size={14} />
									</button>
								)}
							</div>

							{mayManageRoles && ! isMe ? (
								<div class="flex gap-1.5 mt-1.5">
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
												class="px-2.5 py-1 rounded-full text-xs font-medium disabled:opacity-40"
												style={{
													background: active ? theme.inkBg : theme.neutralChipBg,
													color: active ? theme.inkText : theme.neutralChipText,
												}}
											>
												{ROLE_LABELS[role]}
											</button>
										);
									})}
								</div>
							) : (
								<p class="font-mono text-xs mt-0.5" style={{ color: theme.textFaint }}>
									{ROLE_LABELS[member.role]}
								</p>
							)}

							{confirmRemove === member.id && (
								<div class="flex items-center gap-2 mt-2">
									<span class="text-xs" style={{ color: theme.textMuted }}>
										Remove {member.displayName || 'this member'}?
									</span>
									<button
										onClick={() => { onRemoveMember(member.id); setConfirmRemove(null); }}
										class="text-xs px-2 py-1 rounded-md font-medium"
										style={{ background: theme.dangerText, color: theme.surface }}
									>
										Remove
									</button>
									<button
										onClick={() => setConfirmRemove(null)}
										class="text-xs px-2 py-1 rounded-md"
										style={{ color: theme.textFaint }}
									>
										Cancel
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<div class="mt-4">
				{confirmLeave ? (
					<div class="flex items-center gap-2">
						<span class="text-xs" style={{ color: theme.textMuted }}>Leave this household?</span>
						<button
							onClick={() => { onLeave(); setConfirmLeave(false); }}
							class="text-xs px-2 py-1 rounded-md font-medium"
							style={{ background: theme.dangerText, color: theme.surface }}
						>
							Leave
						</button>
						<button
							onClick={() => setConfirmLeave(false)}
							class="text-xs px-2 py-1 rounded-md"
							style={{ color: theme.textFaint }}
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						onClick={() => setConfirmLeave(true)}
						disabled={leaveWouldStrand}
						class="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 disabled:opacity-40"
						style={{ background: theme.neutralChipBg, color: theme.neutralChipText }}
					>
						<LogOut size={12} /> Leave household
					</button>
				)}

				{leaveWouldStrand && (
					<p class="text-xs mt-1.5" style={{ color: theme.textFaint }}>
						You&rsquo;re the only owner. Make someone else an owner first.
					</p>
				)}
			</div>
		</div>
	);
}
