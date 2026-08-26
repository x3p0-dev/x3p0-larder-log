import { useState } from 'preact/hooks';
import { Check, House, Link2, Plus } from 'lucide-preact';

import { DRAWER_BUTTON, DRAWER_INPUT } from '../lib/controlStyles';
import { isCodeShaped, normalizeCode } from '../../shared/invite';
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
 * settings task. The signed-out path through `JoinBox` still exists for someone
 * who has no household at all.
 */

type Props = {
	households: HouseholdSummary[];
	/** The one being shown right now — the server's answer, not the stored guess. */
	currentId: string;
	onSelect: (id: string) => void;
	/** Resolves to the new household's id. */
	onCreate: (name: string) => Promise<string | null>;
	/** Resolves to the joined household's id. */
	onJoin: (code: string) => Promise<string | null>;
	/** Close the popover — called only after something actually happened. */
	onDone: () => void;
};

type Form = 'none' | 'create' | 'join';

export function HouseholdSwitcher({ households, currentId, onSelect, onCreate, onJoin, onDone }: Props) {
	const [form, setForm] = useState<Form>('none');
	const [name, setName] = useState('');
	const [code, setCode] = useState('');
	const [busy, setBusy] = useState(false);

	async function create() {
		const trimmed = name.trim();

		if (busy || ! trimmed) return;

		setBusy(true);
		const id = await onCreate(trimmed);
		setBusy(false);

		// A refusal is already in the error banner. Keep the form and the typing.
		if (! id) return;

		onSelect(id);
		setName('');
		setForm('none');
		onDone();
	}

	async function join() {
		const entered = normalizeCode(code);

		if (busy || ! isCodeShaped(entered)) return;

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
							<span class="shrink-0 flex items-center justify-center w-7 h-7 rounded-[9px] bg-drawer-well text-on-dark-muted">
								<House size={14} />
							</span>
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

			{form === 'create' ? (
				<div class="flex flex-col gap-2 px-1 pb-1">
					<input
						value={name}
						onInput={(e) => setName(e.currentTarget.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } }}
						placeholder="Cabin pantry"
						aria-label="New household name"
						class={`h-9 px-3 rounded-[10px] text-[13.5px] ${DRAWER_INPUT}`}
						// eslint-disable-next-line
						ref={(el) => el?.focus()}
					/>
					<div class="flex items-center gap-2">
						<button
							onClick={() => void create()}
							disabled={busy || ! name.trim()}
							class={`h-8 px-3 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50 ${DRAWER_BUTTON}`}
						>
							{busy ? 'Creating…' : 'Create'}
						</button>
						<button
							onClick={() => { setForm('none'); setName(''); }}
							class="text-[12.5px] text-on-dark-faint hover:text-on-dark-muted"
						>
							Cancel
						</button>
					</div>
				</div>
			) : form === 'join' ? (
				<div class="flex flex-col gap-2 px-1 pb-1">
					<input
						value={code}
						onInput={(e) => setCode(e.currentTarget.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void join(); } }}
						placeholder="ABC2 3DEF GH"
						aria-label="Invite code"
						autocapitalize="characters"
						spellcheck={false}
						class={`h-9 px-3 rounded-[10px] text-[13.5px] font-mono tracking-widest ${DRAWER_INPUT}`}
						// eslint-disable-next-line
						ref={(el) => el?.focus()}
					/>
					<div class="flex items-center gap-2">
						<button
							onClick={() => void join()}
							disabled={busy || ! isCodeShaped(normalizeCode(code))}
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
						onClick={() => setForm('create')}
						class="flex items-center gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-on-dark-muted hover:bg-drawer-raised"
					>
						<Plus size={14} /> New household
					</button>
					<button
						onClick={() => setForm('join')}
						class="flex items-center gap-2 w-full px-2 py-1.5 rounded-[9px] text-[12.5px] text-on-dark-muted hover:bg-drawer-raised"
					>
						<Link2 size={14} /> Join with a link
					</button>
				</div>
			)}
		</div>
	);
}
