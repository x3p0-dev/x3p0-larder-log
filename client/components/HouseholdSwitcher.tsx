import { useState } from 'preact/hooks';
import { Check, Link2, Plus } from 'lucide-preact';

import { HouseholdTile } from './HouseholdTile';
import { DRAWER_BUTTON, DRAWER_INPUT } from '../lib/controlStyles';
import { readJoinInput } from '../../shared/joinLink';
import type { HouseholdSummary } from '../../shared/types';

/**
 * The switcher's contents: every household you belong to, then the two ways to
 * get another one.
 *
 * Contents only, not a container — it is rendered inside the drawer's popover
 * at full width and inside a rail flyout at 264px, and both of those own their
 * own dismissal. The surface underneath is the drawer in either case, so the
 * dark tokens are hardcoded rather than themed.
 *
 * Joining lives here because an invite code is how you acquire a household you
 * did not create, which makes it a sibling of *New household* rather than a
 * settings task.
 *
 * **Creating does not happen here.** *New household* hands off to a dialog on
 * the confirm shell (D42) — a name and a colour will not fit in a 264px flyout
 * without pushing the list of households off the bottom of it. Joining stays
 * inline, because a code is one field and nothing else.
 *
 * **The field takes the link as well as the code**, and says so. The sender's
 * one-press affordance in `InvitesPanel` is *Copy link*, so a URL is the thing
 * most likely to be pasted here; `readJoinInput` reads the code out of either
 * form.
 */

type Props = {
	households: HouseholdSummary[];
	/** The one being shown right now — the server's answer, not the stored guess. */
	currentId: string;
	onSelect: (id: string) => void;
	/** Opens the New household dialog. The popover closes; the host takes over. */
	onNewHousehold: () => void;
	/** Resolves to the joined household's id. */
	onJoin: (code: string) => Promise<string | null>;
	/** Close the popover — called only after something actually happened. */
	onDone: () => void;
	/** The tile follows the theme, not the drawer it sits on. */
	dark: boolean;
};

type Form = 'none' | 'join';

export function HouseholdSwitcher({ households, currentId, onSelect, onNewHousehold, onJoin, onDone, dark }: Props) {
	const [form, setForm] = useState<Form>('none');
	const [code, setCode] = useState('');
	const [busy, setBusy] = useState(false);

	async function join() {
		const entered = readJoinInput(code);

		if (busy || ! entered) return;

		setBusy(true);
		const id = await onJoin(entered);
		setBusy(false);

		if (! id) return;

		onSelect(id);
		setCode('');
		setForm('none');
		onDone();
	}

	return (
		<div class="flex flex-col">
			<p class="px-1.5 pt-1 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-dark-label">
				Households
			</p>

			<div class="flex flex-col gap-0.5">
				{households.map((household) => {
					const current = household.id === currentId;

					return (
						<button
							key={household.id}
							onClick={() => { onSelect(household.id); onDone(); }}
							class={
								current
									? 'flex items-center gap-2.5 w-full px-2 py-2 rounded-[10px] text-left bg-drawer-raised'
									: 'flex items-center gap-2.5 w-full px-2 py-2 rounded-[10px] text-left transition-colors hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset'
							}
							aria-current={current ? 'true' : undefined}
						>
							<HouseholdTile ink={household.ink} name={household.name} size={34} dark={dark} />
							<span class="flex-1 min-w-0 flex flex-col gap-px">
								<span class="text-[13.5px] truncate text-on-dark">{household.name}</span>
								{/* Role and size, the two things that tell two pantries apart. */}
								<span class="text-[11px] text-on-dark-faint">
									{household.role} · {household.itemCount} {household.itemCount === 1 ? 'item' : 'items'}
								</span>
							</span>
							{current && <Check size={15} class="shrink-0 text-accent" />}
						</button>
					);
				})}
			</div>

			<span class="block h-px mx-1.5 my-2 bg-drawer-raised" />

			{form === 'join' ? (
				<div class="flex flex-col gap-2 px-1 pb-1">
					<input
						value={code}
						onInput={(e) => setCode(e.currentTarget.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void join(); } }}
						placeholder="ABC2 3DEF GH"
						aria-label="Invite code or link"
						autocapitalize="characters"
						spellcheck={false}
						/*
						 * The grouped mono face is the code's, and a pasted URL
						 * in `tracking-widest` is a wall you cannot check
						 * against the message it came from. Any character
						 * outside the code alphabet's own separators means a
						 * link is being typed — a URL has a `:` and a `/` and a
						 * code never does — so the treatment is derived from
						 * the alphabet rather than from a guessed width.
						 */
						class={`h-9 px-3 rounded-[10px] text-[13.5px] ${/[^0-9A-Za-z\s-]/.test(code) ? '' : 'font-mono tracking-widest'} ${DRAWER_INPUT}`}
						// eslint-disable-next-line
						ref={(el) => el?.focus()}
					/>
					<div class="flex items-center gap-2">
						<button
							onClick={() => void join()}
							disabled={busy || ! readJoinInput(code)}
							class={`h-8 px-3 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50 ${DRAWER_BUTTON}`}
						>
							{busy ? 'Joining…' : 'Join'}
						</button>
						<button
							onClick={() => { setForm('none'); setCode(''); }}
							class="text-[12.5px] text-on-dark-faint hover:text-on-dark-muted"
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div class="flex flex-col">
					<button
						onClick={() => { onDone(); onNewHousehold(); }}
						class="flex items-center gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-on-dark-muted hover:bg-drawer-raised"
					>
						<Plus size={14} /> New household
					</button>
					<button
						onClick={() => setForm('join')}
						class="flex items-center gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-on-dark-muted hover:bg-drawer-raised"
					>
						<Link2 size={14} /> Join with a code or link
					</button>
				</div>
			)}
		</div>
	);
}
