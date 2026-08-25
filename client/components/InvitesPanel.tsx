import { useState } from 'preact/hooks';
import { Check, Copy, Trash2, UserPlus } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import type { Invite } from '../../shared/types';
import type { Role } from '../../shared/roles';
import { can, invitableRoles } from '../../shared/roles';
import { daysUntilExpiry } from '../../shared/invite';
import { buildJoinUrl } from '../../shared/joinLink';

/**
 * Minting and revoking invite codes.
 *
 * A code is a bearer credential: anyone holding it joins the household as the
 * role it carries (D21), so the panel shows the role on every row and keeps
 * revoking one click away. Expiry is D24's 14 days, computed from the same
 * `shared/invite.ts` the server enforces with.
 */

/**
 * Roles this UI will offer an invite for.
 *
 * `viewer` waits on Phase 4's read-only client. The consequence is worth
 * knowing rather than working around: editors may mint viewer invites and
 * nothing else, so intersecting with this list leaves them with none and
 * invite creation is effectively owner-only until viewer ships. The capability
 * check below is written properly anyway — it wakes up on its own.
 */
const OFFERABLE: readonly Role[] = ['owner', 'editor'];

const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	editor: 'Editor',
	viewer: 'View only',
};

const ROLE_BLURBS: Record<Role, string> = {
	owner: 'Can do everything, including managing members.',
	editor: 'Can add and edit items, locations, types, and stores.',
	viewer: 'Can look, but not change anything.',
};

type Props = {
	invites: Invite[];
	/** The viewer's own role — what they may mint, and whether they may revoke. */
	myRole: Role;
	onCreate: (role: Role) => void;
	onRevoke: (inviteId: string) => void;
	/** Set while a code is being minted, so the buttons can't be double-fired. */
	creating: boolean;
	theme: Theme;
};

export function InvitesPanel({ invites, myRole, onCreate, onRevoke, creating, theme }: Props) {
	const [copied, setCopied] = useState<string | null>(null);

	const offerable = invitableRoles(myRole).filter((role) => OFFERABLE.includes(role));
	const mayRevoke = can(myRole, 'invite:revoke');
	const now = Date.now();

	// `location` is always present in the browser; the guard is for the type,
	// and for the day this component gets rendered somewhere that isn't one.
	const origin = typeof location === 'undefined' ? '' : location.origin;

	async function copyLink(invite: Invite) {
		try {
			await navigator.clipboard.writeText(buildJoinUrl(origin, invite.code));
			setCopied(invite.id);
			setTimeout(() => setCopied((id) => (id === invite.id ? null : id)), 2000);
		} catch {
			// Clipboard access is refused outside a secure context and on some
			// mobile browsers. The link is on screen and selectable either way,
			// which is why it is rendered rather than hidden behind this button.
		}
	}

	return (
		<div class="mb-6">
			<p class="font-mono text-xs uppercase tracking-widest mb-2" style={{ color: theme.textMuted }}>
				Invites
			</p>

			{offerable.length > 0 ? (
				<>
					<p class="text-xs mb-2" style={{ color: theme.textFaint }}>
						Send someone a link. It works once and expires in two weeks.
					</p>
					<div class="flex flex-wrap gap-1.5 mb-4">
						{offerable.map((role) => (
							<button
								key={role}
								onClick={() => onCreate(role)}
								disabled={creating}
								title={ROLE_BLURBS[role]}
								class="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50"
								style={{ background: theme.primaryBg, color: theme.primaryText }}
							>
								<UserPlus size={12} /> Invite {ROLE_LABELS[role].toLowerCase()}
							</button>
						))}
					</div>
				</>
			) : (
				<p class="text-xs mb-3" style={{ color: theme.textFaint }}>
					{can(myRole, 'invite:create')
						? 'Inviting people with view-only access isn’t finished yet, so only an owner can send invites for now.'
						: 'Only an owner can invite people.'}
				</p>
			)}

			{invites.length === 0 ? (
				<p class="text-xs" style={{ color: theme.textFaint }}>No invites waiting.</p>
			) : (
				<div class="flex flex-col gap-3">
					{invites.map((invite) => {
						const days = daysUntilExpiry(invite.expiresAt, now);

						return (
							<div
								key={invite.id}
								class="rounded-md p-2.5"
								style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
							>
								{/*
								  * The role leads, because it is the one thing about an
								  * invite that has a consequence. The code itself is not
								  * shown: what gets sent is the link, and the code is
								  * legible on the end of it for anyone reading it aloud.
								  */}
								<div class="flex items-baseline justify-between gap-2">
									<p class="text-sm" style={{ color: theme.textMuted }}>
										<span class="font-semibold" style={{ color: theme.textStrong }}>
											{ROLE_LABELS[invite.role]}
										</span>
										{days === null
											? ''
											: days === 0
												? ' · expires today'
												: days === 1
													? ' · expires tomorrow'
													: ` · expires in ${days} days`}
									</p>
									{mayRevoke && (
										<button
											onClick={() => onRevoke(invite.id)}
											class="shrink-0"
											style={{ color: theme.dangerText }}
											aria-label={`Revoke ${ROLE_LABELS[invite.role].toLowerCase()} invite`}
										>
											<Trash2 size={14} />
										</button>
									)}
								</div>

								<div class="flex items-center gap-1.5 mt-2">
									{/*
									  * Readonly and selectable rather than copy-only: the
									  * clipboard API is refused outside a secure context, and a
									  * link nobody can select is a dead end when that happens.
									  */}
									<input
										readOnly
										value={buildJoinUrl(origin, invite.code)}
										onFocus={(e) => e.currentTarget.select()}
										aria-label="Invite link"
										class="flex-1 min-w-0 text-xs px-2 py-1 rounded border outline-none"
										style={{ borderColor: theme.border, background: theme.surface, color: theme.textMuted }}
									/>
									<button
										onClick={() => void copyLink(invite)}
										class="shrink-0 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1"
										style={{ background: theme.neutralChipBg, color: theme.neutralChipText }}
									>
										{copied === invite.id ? <Check size={12} /> : <Copy size={12} />}
										{copied === invite.id ? 'Copied' : 'Copy'}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
