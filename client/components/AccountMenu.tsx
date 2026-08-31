import { useState } from 'preact/hooks';
import { CircleDot, ExternalLink, LogOut, Pencil, Shield } from 'lucide-preact';

import { DrawerAvatar } from './DrawerAvatar';
import { DrawerMenuRule } from './DrawerMenu';
import type { Theme } from '../lib/theme';
import {
	DRAWER_SUNK, DRAWER_MENU_ROW, DRAWER_PRIMARY, PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';
import { isValidDisplayName, MAX_DISPLAY_NAME, normalizeDisplayName } from '../../shared/profile';

/**
 * You, and the two things you can do about it.
 *
 * The Settings pane has no Account block any more: this is the only place the
 * account appears, and it never says whether you are signed in, because if you
 * are reading it you are. What it held that was worth keeping — the name, and
 * the way out — is two rows.
 *
 * **Contents only.** Each host owns its own box and its own dismissal, the same
 * arrangement `HouseholdSwitcher` has: the drawer's foot row opens it upward in
 * a `DrawerMenu`, and the collapsed rail opens it in a `RailFlyout` beside the
 * avatar. One component, two states of the drawer.
 *
 * The pencil flips the identity row **in place**, exactly as the Filter tab's
 * sections do — no modal and no profile screen. There is no toast on save: the
 * row coming back read-only with the new name in it is the whole confirmation,
 * and a toast for a save you are looking at is the noise the plain-toast
 * question is trying to avoid.
 */
export function AccountMenu({
	name, email, picture, onRename, onOpenAdmin, onSignOut, onDone, theme,
}: {
	name: string;
	email: string;
	picture?: string;
	/**
	 * Opens the admin console. **Absent for everybody who is not an
	 * administrator**, which is most people — they keep the two-row menu and
	 * never learn the console exists.
	 */
	onOpenAdmin?: () => void;
	/**
	 * Writes the new display name. Absent for the dev guest, who has no account
	 * to rename — the pencil goes with it rather than failing on press.
	 */
	onRename?: (next: string) => void;
	onSignOut: () => void;
	/** Closes the host's popover. Sign out takes it with them either way. */
	onDone: () => void;
	theme: Theme;
}) {
	const d = theme.drawer;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(name);
	const valid = isValidDisplayName(draft);

	/**
	 * *Done* commits and returns the row to read-only.
	 *
	 * An emptied field is refused rather than saved: the server throws on a
	 * blank name, and the refusal would arrive as a banner over a row that had
	 * already closed. The pill is disabled on the same rule, so this is the
	 * keyboard path — Enter in the field — rather than a second guard.
	 */
	function commit() {
		const next = normalizeDisplayName(draft);

		if (! next) return;

		if (next !== name) onRename?.(next);
		setEditing(false);
	}

	function cancel() {
		setDraft(name);
		setEditing(false);
	}

	return (
		<div class="flex flex-col">
			{editing ? (
				<div class="flex items-center gap-2.5 p-1.5">
					<input
						value={draft}
						onInput={(e) => setDraft(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') { e.preventDefault(); commit(); }
							// Escape cancels the edit, and stops there — the menu
							// behind it stays open, or the field would vanish along
							// with the thing you were correcting.
							if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
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
						class={`shrink-0 flex items-center h-[30px] px-[15px] rounded-[10px] text-[13.5px] font-semibold ${DRAWER_PRIMARY}`}
						style={valid
							? { background: d.ink, color: '#241E17' }
							: { background: theme.disabledBg, color: theme.disabledText }}
					>
						Done
					</button>
				</div>
			) : (
				<div class="flex items-center gap-[11px] py-[9px] pl-2.5 pr-2">
					<DrawerAvatar name={name} picture={picture} size={38} />
					<span class="flex-1 min-w-0 flex flex-col gap-px">
						<span class="text-body truncate" style={{ color: d.ink }}>{name || 'Account'}</span>
						{/* Absent, not blank — the dev guest has no email. */}
						{email && (
							<span class="text-meta truncate" style={{ color: theme.textFaint }}>{email}</span>
						)}
					</span>
					{/*
					  * The card control, on the menu rather than a card — the only
					  * place it appears off one. Its focus gap therefore resolves
					  * against `drawer-raised` instead of the menu's own fill, which
					  * is a 2px difference between two near-blacks.
					  */}
					{onRename && (
						<button
							onClick={() => { setDraft(name); setEditing(true); }}
							class={`shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-[9px] ${DRAWER_SUNK}`}
							aria-label="Change your display name"
						>
							<Pencil size={15} />
						</button>
					)}
				</div>
			)}

			<DrawerMenuRule theme={theme} />

			{/*
			  * *Admin* — the way into the console, above the account actions.
			  *
			  * **It is a destination, not something you do to your account**,
			  * which is why it sits here rather than beside *Sign out*.
			  *
			  * **It takes no outbound arrow.** That mark means *this leaves the
			  * app*, which is why *Change your picture* below carries one. Admin
			  * is still Larder Log — the same drawer, one pane along.
			  *
			  * `onDone()` because this one *does* navigate: the menu is over the
			  * drawer the console is about to fill, and leaving it open would put
			  * a popover on top of the thing it just opened.
			  */}
			{onOpenAdmin && (
				<>
					<button
						onClick={() => { onDone(); onOpenAdmin(); }}
						class={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
					>
						<Shield size={15} class="shrink-0" style={{ color: d.inkFaint }} /> Admin
					</button>

					<DrawerMenuRule theme={theme} />
				</>
			)}

			{/*
			  * *Change your picture* — the board's third row, its own block between
			  * the identity and the way out, with the outbound arrow that means
			  * **this leaves the app**.
			  *
			  * Naming Gravatar here is right where naming it on the sign-in button
			  * was wrong (D47). That button went to a Spacefast account and only
			  * looked like it went to Gravatar; this genuinely is Gravatar —
			  * `auth.picture` is a `gravatar.com/avatar/…` URL, and that page is
			  * where the image behind it is changed.
			  *
			  * The label stays the board's four words because the menu is 292px
			  * and *Change your picture on Gravatar* does not fit one line; the
			  * destination rides the accessible name instead, which contains the
			  * visible label rather than replacing it.
			  *
			  * `/profile/avatars` rather than the profile root: it is the editor,
			  * and Gravatar bounces a signed-out visitor through sign-in and back
			  * to it. No `onDone()` — this opens a tab beside us rather than
			  * navigating away, and a menu that shut itself would make coming back
			  * feel like the app had forgotten where you were.
			  */}
			<a
				href="https://gravatar.com/profile/avatars"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Change your picture on Gravatar (opens in a new tab)"
				class={`flex items-center gap-2.5 h-[38px] px-2.5 rounded-[9px] text-sm text-left no-underline ${DRAWER_MENU_ROW}`}
			>
				<CircleDot size={15} class="shrink-0" style={{ color: d.inkFaint }} />
				<span class="flex-1 min-w-0 truncate">Change your picture</span>
				<ExternalLink size={14} class="shrink-0" style={{ color: d.inkFaint }} aria-hidden="true" />
			</a>

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
