import { useEffect, useRef, useState } from 'preact/hooks';
import { Check, Copy, Trash2 } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { DRAWER_BUTTON, DRAWER_CARD, DRAWER_ICON_DANGER, DRAWER_INPUT } from '../lib/controlStyles';
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

/*
 * `viewer` used to be withheld here, waiting on Phase 4's read-only client —
 * which made invite creation effectively owner-only, since an editor may mint
 * viewer invites and nothing else. That pass shipped (D30), so the capability
 * check now stands on its own and all three roles are offerable.
 */

const ROLE_LABELS: Record<Role, string> = {
	owner: 'Owner',
	editor: 'Editor',
	viewer: 'Viewer',
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

	/*
	 * Collapsed by default: an invite is a link you send once, so the link row
	 * is dead weight on every code you already dealt with. The one you just
	 * minted opens on its own, because that is the one you are about to copy.
	 *
	 * "Just minted" is worked out by watching for an id that was not here a
	 * moment ago rather than by threading it back from `onCreate`, which
	 * resolves to nothing — and this way a code created in another tab opens
	 * here too, which is the same intent.
	 */
	const [openId, setOpenId] = useState<string | null>(null);
	const seen = useRef<Set<string> | null>(null);

	useEffect(() => {
		const ids = new Set(invites.map((i) => i.id));

		if (seen.current === null) {
			seen.current = ids;
			return;
		}

		const fresh = invites.find((i) => ! seen.current?.has(i.id));
		seen.current = ids;
		if (fresh) setOpenId(fresh.id);
	}, [invites]);

	const offerable = invitableRoles(myRole);
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
		<div class="flex flex-col gap-2.5">
			{offerable.length > 0 ? (
				<>
					<p class="text-[12.5px] leading-[1.45]" style={{ color: theme.textMuted }}>
						Send someone a link. It works once and expires in two weeks.
					</p>
					{/*
					  * One button per role, each minting directly — no icons, per the
					  * design. All three rest identically: nothing here is *selected*,
					  * and giving one of them the cream treatment permanently reads as
					  * a choice already made. The cream is the hover/press state.
					  *
					  * Static class names, not inline styles: a `:hover` cannot be
					  * expressed in a style object, and Zero compiles utilities by
					  * scanning source for literal strings. Hence the theme.json
					  * tokens — `drawer-press` and its ink are theme-independent,
					  * because the drawer is dark in both themes.
					  */}
					<div class="flex gap-1.5">
						{offerable.map((role) => (
							<button
								key={role}
								onClick={() => onCreate(role)}
								disabled={creating}
								title={ROLE_BLURBS[role]}
								class={
									'flex-1 flex items-center justify-center h-10 rounded-[11px] text-[13.5px] font-medium ' +
									'bg-drawer-raised text-on-dark-muted transition-colors ' +
									'hover:bg-drawer-press hover:text-drawer-press-ink hover:font-semibold ' +
									'active:translate-y-px ' +
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-well ' +
									'disabled:opacity-50 disabled:pointer-events-none'
								}
							>
								{ROLE_LABELS[role]}
							</button>
						))}
					</div>
				</>
			) : (
				<p class="text-[12.5px]" style={{ color: theme.textMuted }}>Only an owner can invite people.</p>
			)}

			{invites.length === 0 ? (
				<p class="text-[12.5px]" style={{ color: theme.textMuted }}>No invites waiting.</p>
			) : (
				<div class="flex flex-col gap-2.5">
					{invites.map((invite) => {
						const days = daysUntilExpiry(invite.expiresAt, now);

						return (
							<div
								key={invite.id}
								class={`flex flex-col gap-[9px] p-[13px] rounded-[14px] ${DRAWER_CARD}`}
								role="button"
								tabIndex={0}
								aria-expanded={openId === invite.id}
								onClick={() => setOpenId((id) => (id === invite.id ? null : invite.id))}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										setOpenId((id) => (id === invite.id ? null : invite.id));
									}
								}}
							>
								{/*
								  * The role leads, because it is the one thing about an
								  * invite that has a consequence. The code itself is not
								  * shown: what gets sent is the link, and the code is
								  * legible on the end of it for anyone reading it aloud.
								  *
								  * This row is also the toggle — no chevron. A row this
								  * small has no room for a control whose only job is to
								  * reveal one more row.
								  */}
								<div class="flex items-center justify-between gap-2.5">
									<span class="flex items-baseline gap-[7px] min-w-0">
										<span class="font-disp text-base font-semibold" style={{ color: theme.textStrong }}>
											{ROLE_LABELS[invite.role]}
										</span>
										<span class="text-xs truncate" style={{ color: theme.textMuted }}>
											{days === null
												? ''
												: days === 0
													? 'expires today'
													: days === 1
														? 'expires tomorrow'
														: `expires in ${days} days`}
										</span>
									</span>
									{mayRevoke && (
										<button
											onClick={(e) => { e.stopPropagation(); onRevoke(invite.id); }}
											class={`shrink-0 flex items-center justify-center w-[30px] h-[30px] ${DRAWER_ICON_DANGER}`}
											style={{ color: '#C4746E' }}
											aria-label={`Revoke ${ROLE_LABELS[invite.role].toLowerCase()} invite`}
										>
											<Trash2 size={15} />
										</button>
									)}
								</div>

								{openId === invite.id && (
								<div
									class="flex items-center gap-2"
									onClick={(e) => e.stopPropagation()}
									onKeyDown={(e) => e.stopPropagation()}
								>
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
										class={`flex-1 min-w-0 h-[38px] px-3 rounded-[10px] text-[12.5px] ${DRAWER_INPUT}`}
									/>
									<button
										onClick={() => void copyLink(invite)}
										class={`shrink-0 flex items-center gap-[7px] h-[38px] px-[13px] rounded-[10px] text-[13px] font-medium ${DRAWER_BUTTON}`}
									>
										{copied === invite.id ? <Check size={14} /> : <Copy size={14} />}
										{copied === invite.id ? 'Copied' : 'Copy'}
									</button>
								</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
