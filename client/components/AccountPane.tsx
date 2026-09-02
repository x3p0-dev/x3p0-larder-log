import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { ChevronLeft, CircleDot, Download, ExternalLink, Pencil, Trash2 } from 'lucide-preact';

import { DrawerAvatar } from './DrawerAvatar';
import { useAccount } from '../hooks/useAccountData';
import type { Theme } from '../lib/theme';
import { drawerTheme } from '../lib/theme';
import { downloadJson } from '../lib/download';
import {
	DRAWER_CARD_ROW, DRAWER_CHIP, DRAWER_GHOST_DANGER, DRAWER_PRIMARY_ON_CARD, DRAWER_SUNK,
	PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';
import type { AccountHousehold } from '../../shared/accountDeletion';
import { ADMIN_UNDELETABLE_NOTE } from '../../shared/admin';
import { accountDataFilename, accountDataJson } from '../../shared/exportData';
import { isValidDisplayName, MAX_DISPLAY_NAME, normalizeDisplayName } from '../../shared/profile';

/**
 * *Your account* — a pane, one level below the account menu (D68).
 *
 * **The identity row in the menu became the door.** It loses its pencil, gains
 * a chevron, and this is what it opens: the display name, *Change your
 * picture*, *Download your data*, and *Delete account* at the foot of the
 * account's own card under a hairline.
 *
 * **It is the third use of a construction that already exists** — Members,
 * Administration, and now this — so the way out is the gesture the app already
 * teaches, and it inherits collapse, the rail and the account row for free.
 *
 * **`Delete account` sits inside the account's own card, under a hairline —
 * exactly where *Leave household* sits inside the Household card.** That
 * parallel is the argument rather than a coincidence: this *is* leaving, at the
 * scale of every household at once.
 *
 * **The cost is one thing and it is on the record.** The display name moves out
 * of the menu, where *Settings tab* put it on purpose — *no modal, no profile
 * screen; it is where you already were*. The idiom survives intact: a read-only
 * row that flips in place, no modal, Escape cancels, no toast. What changes is
 * the surface it happens on, one push further in.
 *
 * **The query is subscribed here rather than beside `pantry`**, and that is
 * what makes it affordable: five indexed reads per household is nothing once
 * and a page-load tax on everybody if it lives in the hook every signed-in
 * person opens. This component only exists while the pane is pushed.
 *
 * **The deletion's two dialogs are not here, and that is not a preference.**
 * The drawer's `<aside>` carries a `transform` for its slide-over, and a
 * transform on an ancestor becomes the containing block for everything
 * `position: fixed` beneath it — so a modal rendered from this pane is trapped
 * inside 340px of drawer rather than covering the screen. `MembersPanel` has
 * said the rule since Phase 4.12: **a modal is owned by `Pantry`, which is the
 * only place that can put one over the whole app.** So *Delete account* hands
 * `Pantry` a snapshot and `Pantry` owns the flow.
 */
export function AccountPane({
	name, email, picture, onBack, onRename, onDelete, theme,
}: {
	/** The account's name as `Pantry` already resolved it, for the header. */
	name: string;
	email: string;
	picture?: string;
	onBack: () => void;
	/** Absent for the dev guest, who has no account row to rename. */
	onRename?: (next: string) => void;
	/**
	 * Starts the deletion flow, in `Pantry`, with what this pane already knows.
	 *
	 * **A snapshot rather than a subscription handed over**, and it is safe for
	 * the reason the recap is: the server recomputes the whole plan from
	 * `fateOf` and refuses a decision it was not owed, so a stale snapshot can
	 * only be *refused* — with the server's own sentence, in the dialog — and
	 * never act on the wrong household.
	 */
	onDelete: (snapshot: { name: string; households: AccountHousehold[] }) => void;
	theme: Theme;
}) {
	const d = theme.drawer;
	/* Panels and menus paint from a Theme; hand them one whose surfaces are the
	 * drawer's, which is the arrangement `DrawerSettings` already uses. */
	const inner = drawerTheme(theme);

	const account = useAccount();

	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(name);

	const data = account.state === 'ready' ? account.data : null;
	const valid = isValidDisplayName(draft);

	function commit() {
		const next = normalizeDisplayName(draft);

		if (! next) return;

		if (next !== name) onRename?.(next);
		setEditing(false);
	}

	/** *Get it* — the four fields, as a file. */
	function downloadAccountData() {
		if (! data) return;

		downloadJson(
			accountDataFilename(new Date().toISOString()),
			accountDataJson({
				display_name: data.name,
				email: data.email,
				member_of: data.households.map((h) => ({ household: h.name, role: h.role, joined: h.joinedAt })),
				invites_issued: data.invites.map((i) => ({
					household: i.household,
					role: i.role,
					expires_at: i.expiresAt,
					live: i.live,
				})),
			})
		);
	}

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
					<span class="font-disp text-[21px] font-semibold leading-tight" style={{ color: d.ink }}>
						Your account
					</span>
					{/* Absent, not blank — a Spacefast account carries no email (D56). */}
					{email && (
						<span class="text-meta truncate" style={{ color: theme.textFaint }}>{email}</span>
					)}
				</span>
			</div>

			<Block title="Account" theme={theme}>
				<div class="flex flex-col rounded-[13px]" style={{ background: d.raised, border: `1px solid ${d.line}` }}>
					{/*
					  * The composer's own idiom, moved one pane in: a read-only row
					  * that flips **in place**, no modal, Escape cancels, and no
					  * toast — the row coming back read-only with the new name in it
					  * is the whole confirmation.
					  */}
					{editing ? (
						<div class="flex items-center gap-2.5 p-2.5">
							<input
								value={draft}
								onInput={(e) => setDraft(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); commit(); }
									if (e.key === 'Escape') {
										e.preventDefault();
										e.stopPropagation();
										setDraft(name);
										setEditing(false);
									}
								}}
								maxLength={MAX_DISPLAY_NAME}
								autoFocus
								aria-label="Your display name"
								class={`flex-1 min-w-0 h-10 px-3 rounded-[11px] text-sm ${PANEL_FIELD_HALO_DARK}`}
								style={{ background: d.well, border: `1px solid ${d.line}`, color: d.ink }}
							/>
							<button
								onClick={commit}
								disabled={! valid}
								class={`shrink-0 flex items-center h-[30px] px-[15px] rounded-[10px] text-[13.5px] font-semibold ${DRAWER_PRIMARY_ON_CARD}`}
								style={valid
									? { background: d.ink, color: '#241E17' }
									: { background: theme.disabledBg, color: theme.disabledText }}
							>
								Done
							</button>
						</div>
					) : (
						<div class="flex items-center gap-2.5 pl-3.5 pr-3 py-[11px]">
							<DrawerAvatar name={name} picture={picture} size={34} />
							<span class="flex-1 min-w-0 truncate text-body" style={{ color: d.ink }}>
								{name || 'Account'}
							</span>
							{onRename && (
								<button
									onClick={() => { setDraft(name); setEditing(true); }}
									class={`shrink-0 flex items-center justify-center w-8 h-8 rounded-[10px] ${DRAWER_SUNK}`}
									aria-label="Change your display name"
								>
									<Pencil size={15} />
								</button>
							)}
						</div>
					)}

					<span class="block h-px" style={{ background: d.line }} />

					{/*
					  * The outbound arrow means **this leaves the app**, which is the
					  * same mark and the same reason it carried in the menu (D56).
					  * Naming Gravatar here is right where naming it on the sign-in
					  * button was wrong: that button went to a Spacefast account, and
					  * this genuinely goes to Gravatar.
					  */}
					<a
						href="https://gravatar.com/profile/avatars"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Change your picture on Gravatar (opens in a new tab)"
						class={`flex items-center gap-2.5 pl-3.5 pr-3 py-[11px] text-[14.5px] no-underline ${DRAWER_CARD_ROW}`}
						style={{ color: inner.textMuted }}
					>
						<CircleDot size={15} class="shrink-0" style={{ color: d.inkFaint }} />
						<span class="flex-1 min-w-0 truncate">Change your picture</span>
						<ExternalLink size={13} class="shrink-0" aria-hidden="true" />
					</a>

					<span class="block h-px" style={{ background: d.line }} />

					{/*
					  * **An administrator's account is not the app's to delete**
					  * (D68), and the row is *absent* rather than disabled — D30's
					  * rule, with the sentence in its place doing the job the
					  * viewer's *View only* chip does. A disabled control cannot
					  * explain itself (D36); a sentence can, and this one names the
					  * variable the fix lives in.
					  *
					  * It reads the server's own answer rather than deciding for
					  * itself: the client cannot see `LARDER_ADMIN_IDS`, and must
					  * not hold a second copy of a rule the server enforces. The
					  * throw behind it is the enforcement — a hidden control is one
					  * devtools call from a deleted account — but its text never
					  * reaches anybody in production, which is why this sentence is
					  * here and not there.
					  */}
					{data?.administers ? (
						<p
							class="m-0 px-3.5 py-2.5 text-[13px] leading-[1.5]"
							style={{ color: inner.textMuted }}
						>
							{ADMIN_UNDELETABLE_NOTE}
						</p>
					) : (
						/*
						 * Ghost with crimson text: this is how a destructive action is
						 * **offered**. Executing it is a dialog's ink/cream primary, and
						 * crimson is never a button (D36).
						 */
						<button
							onClick={() => data && onDelete({ name: data.name, households: data.households })}
							disabled={! data}
							class={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-b-[12px] text-left text-[14.5px] ${DRAWER_GHOST_DANGER}`}
						>
							<Trash2 size={15} class="shrink-0" /> Delete account
						</button>
					)}
				</div>
			</Block>

			{/*
			  * **Your data, not the pantry.** The pantry belongs to the household
			  * and survives your deletion, so its export lives in Pantry settings
			  * where the scope is in the label. What is here is four fields, and the
			  * shortness of the file is the same argument the deletion copy makes in
			  * a different form: no per-item authorship anywhere in Larder Log means
			  * an account has almost no data to hand back.
			  */}
			<Block title="Your data" theme={theme}>
				<div
					class="flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-[13px]"
					style={{ background: d.raised, border: `1px solid ${d.line}` }}
				>
					<span class="flex-1 min-w-0 flex flex-col gap-px">
						<span class="text-[14.5px]" style={{ color: d.inkMuted }}>Download your data</span>
						<span class="text-[12.5px]" style={{ color: inner.textFaint }}>
							Name, email, and where you’re a member
						</span>
					</span>
					<button
						onClick={downloadAccountData}
						disabled={! data}
						class={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[13.5px] font-semibold ${DRAWER_PRIMARY_ON_CARD}`}
						style={{ background: d.ink, color: '#241E17' }}
					>
						<Download size={14} /> Get it
					</button>
				</div>
			</Block>

		</div>
	);
}

/**
 * A settings block — a micro-label over content on the drawer's raised fill.
 *
 * The same shape `DrawerSettings` draws, written here rather than exported from
 * there: it is four lines, and reaching across for it would make one pane's
 * layout depend on the other's file.
 */
function Block({ title, theme, children }: {
	title: string;
	theme: Theme;
	children: ComponentChildren;
}) {
	return (
		<section class="flex flex-col gap-2.5">
			<p class="text-label font-bold uppercase tracking-[0.15em] pl-1" style={{ color: theme.drawer.label }}>
				{title}
			</p>
			{children}
		</section>
	);
}
