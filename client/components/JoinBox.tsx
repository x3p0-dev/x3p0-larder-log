import { useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { isCodeShaped, normalizeCode } from '../../shared/invite';
import { formatCode } from '../../shared/joinLink';

/**
 * Redeeming an invite: the link's destination and the typed-code path at once.
 *
 * Both exist because only one of them is guaranteed. A shared link carries the
 * code in `?join=` and arrives here pre-filled (D28); a code read aloud across
 * a kitchen arrives in the box. The unambiguous alphabet in `shared/invite.ts`
 * was chosen for exactly the second case.
 */

type Props = {
	/** A code from the invite link, if the visitor followed one. */
	pendingCode: string | null;
	/** Resolves true when the membership was created. False leaves the code in place. */
	onJoin: (code: string) => Promise<boolean>;
	/** Discards a link's code so the first-run form is the whole screen again. */
	onDismiss: () => void;
	theme: Theme;
};

export function JoinBox({ pendingCode, onJoin, onDismiss, theme }: Props) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState('');
	const [joining, setJoining] = useState(false);

	const typed = normalizeCode(draft);
	const code = pendingCode ?? typed;
	const valid = isCodeShaped(code);

	async function submit() {
		if (joining || ! valid) return;

		setJoining(true);
		const joined = await onJoin(code);
		setJoining(false);

		// A refusal — expired, revoked, already in a household — is reported in
		// the error banner above. Keep what was typed so it can be corrected
		// rather than retyped.
		if (joined) setDraft('');
	}

	if (pendingCode) {
		return (
			<div
				class="rounded-md p-4 mb-6 text-left"
				style={{ background: theme.surface, border: `1px solid ${theme.borderStrong}` }}
			>
				<p class="font-disp text-base font-semibold mb-1" style={{ color: theme.textStrong }}>
					You&rsquo;ve been invited
				</p>
				<p class="text-sm mb-3" style={{ color: theme.textMuted }}>
					Join the household this invite belongs to, and you&rsquo;ll share its pantry.
				</p>
				<p class="font-mono text-sm tracking-widest mb-3" style={{ color: theme.textFaint }}>
					{formatCode(pendingCode)}
				</p>
				<div class="flex items-center gap-2">
					<button
						onClick={() => void submit()}
						disabled={joining}
						class="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
						style={{ background: theme.primaryBg, color: theme.primaryText }}
					>
						{joining ? 'Joining…' : 'Join household'}
					</button>
					<button onClick={onDismiss} class="text-xs" style={{ color: theme.textFaint }}>
						Not now
					</button>
				</div>
			</div>
		);
	}

	if (! open) {
		return (
			<button
				onClick={() => setOpen(true)}
				class="text-xs underline mt-4"
				style={{ color: theme.textFaint }}
			>
				Have an invite code?
			</button>
		);
	}

	return (
		<div class="mt-4 text-left">
			<label class="block">
				<span class="font-mono tracking-[0.02em] text-xs" style={{ color: theme.textMuted }}>
					Invite code
				</span>
				<input
					value={draft}
					onInput={(e) => setDraft(e.currentTarget.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
					placeholder="ABC2 3DEF GH"
					autocapitalize="characters"
					spellcheck={false}
					aria-label="Invite code"
					class="mt-1 w-full px-3 py-2 rounded border text-sm font-mono tracking-widest outline-none"
					style={{ borderColor: theme.borderStrong, background: theme.surface, color: theme.text }}
				/>
			</label>
			<div class="flex items-center gap-2 mt-2">
				<button
					onClick={() => void submit()}
					disabled={joining || ! valid}
					class="px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
					style={{ background: theme.primaryBg, color: theme.primaryText }}
				>
					{joining ? 'Joining…' : 'Join'}
				</button>
				<button
					onClick={() => { setOpen(false); setDraft(''); }}
					class="text-xs"
					style={{ color: theme.textFaint }}
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
