import { ChevronLeft } from 'lucide-preact';

import { InvitesPanel } from './InvitesPanel';
import { MembersPanel } from './MembersPanel';
import type { Theme } from '../lib/theme';
import { DRAWER_CHIP } from '../lib/controlStyles';
import type { Invite, Member } from '../../shared/types';
import type { Role } from '../../shared/roles';

/**
 * Members and invites, one level below the Settings pane.
 *
 * **They are one subject and get the full 340 together.** That is what settled
 * the standing complaint that invite links were cramped: the link now has a
 * field of its own to sit in before you copy it, which it never had as a
 * section competing with five others.
 *
 * The pane is pushed rather than expanded, and while it is pushed the drawer
 * drops the Filter / Settings tabs — back is the only way out. A decision
 * rather than an oversight, and the first thing to revisit if it reads as a
 * trap: a second-level pane that keeps a tab bar it does not belong to is its
 * own kind of lie.
 */
export function MembersPane({
	householdName, members, invites, me,
	onBack, onCreateInvite, onRevokeInvite, onChangeRole, onRemoveMember,
	onTransferOwnership, creatingInvite, theme,
}: {
	householdName: string;
	members: Member[];
	invites: Invite[];
	me: { membershipId: string; role: Role };
	onBack: () => void;
	onCreateInvite: (role: Role) => unknown;
	onRevokeInvite: (inviteId: string) => void;
	onChangeRole: (membershipId: string, role: Role) => void;
	onRemoveMember: (membershipId: string) => void;
	/** Hands the household over — owner only, and never on your own row (D68). */
	onTransferOwnership: (membershipId: string) => void;
	creatingInvite: boolean;
	theme: Theme;
}) {
	const d = theme.drawer;

	return (
		<div class="flex flex-col gap-[18px] px-5 pt-5 pb-6">
			<div class="flex items-center gap-3">
				<button
					onClick={onBack}
					class={`shrink-0 flex items-center justify-center w-9 h-9 rounded-[11px] ${DRAWER_CHIP}`}
					style={{ border: `1px solid ${d.line}` }}
					aria-label="Back to settings"
				>
					<ChevronLeft size={16} />
				</button>
				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="font-disp text-[21px] font-semibold leading-tight" style={{ color: d.ink }}>Members</span>
					<span class="text-meta truncate" style={{ color: theme.textFaint }}>{householdName}</span>
				</span>
			</div>

			<MembersPanel
				members={members}
				me={me}
				onChangeRole={onChangeRole}
				onRemoveMember={onRemoveMember}
				onTransferOwnership={onTransferOwnership}
				theme={theme}
			/>

			<InvitesPanel
				invites={invites}
				myRole={me.role}
				onCreate={onCreateInvite}
				onRevoke={onRevokeInvite}
				creating={creatingInvite}
				theme={theme}
			/>
		</div>
	);
}
