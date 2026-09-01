import { useCallback, useId, useMemo, useRef, useState } from 'preact/hooks';
import { Check, ChevronDown, Trash2, UserMinus } from 'lucide-preact';

import { DialogButtons, ModalShell } from './ModalShell';
import { HouseholdTile } from './HouseholdTile';
import { useDismiss } from '../hooks/useDismiss';
import { useFixedMenu } from '../hooks/useFixedMenu';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import {
	PAGE_MENU_FIXED, PAGE_MENU_ROW, PAGE_MENU_ROW_DANGER, PAGE_SUNK_ON_ROW,
	PAGE_SUNK_ON_ROW_UNSET,
} from '../lib/controlStyles';
import type { AdminOwnershipDecision, AdminPersonHousehold } from '../../shared/types';

/** The menu's own width and height cap — the two numbers placement needs. */
const MENU_SIZE = { width: 240, maxHeight: 240 };

/**
 * Deleting an account — the pre-flight.
 *
 * **This is the screen that makes account deletion reachable at all.** D22
 * already blocks a sole owner from leaving a household; run that rule against
 * every household at once and deleting an account becomes a wall for exactly
 * the people most likely to want it. The pre-flight turns each block into a
 * choice — one row per solely-owned household, hand it over or delete it — and
 * a tail line for the households where nothing has to be decided.
 *
 * **520 rather than 420, and it is the console's one deviation from the confirm
 * shell.** A confirm asks one question and 420 is right for it; a pre-flight
 * asks two and has to show you what you are answering about. Everything else is
 * the same box: radius 18, the 40px disc, the title asking the question, the
 * body naming what is lost, and the verb on the button. **Crimson appears once,
 * as the disc tint, and never as a button.**
 *
 * The primary is disabled until every row is answered — this is the one place
 * in the app where a disabled control is right, because the thing it is waiting
 * for is directly above it and visibly unanswered. D36's *a disabled control
 * cannot explain itself* is about a control whose reason is off-screen; here
 * the reason **is** the screen.
 *
 * **Same dialog, two places.** Only the title changes when somebody deletes
 * their own account, which is why `isSelf` exists rather than a second
 * component.
 */
export function AccountDeleteDialog({
	open, name, households, isSelf, onConfirm, onCancel, dark, theme,
}: {
	open: boolean;
	name: string;
	/** Every household they are in. The rows are the solely-owned ones. */
	households: AdminPersonHousehold[];
	isSelf: boolean;
	onConfirm: (decisions: AdminOwnershipDecision[]) => void;
	onCancel: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const titleId = useId();
	const bodyId = useId();
	const cancelRef = useRef<HTMLButtonElement | null>(null);

	/** `householdId → membershipId`, or `''` meaning *delete this household*. */
	const [chosen, setChosen] = useState<Record<string, string>>({});
	const [menu, setMenu] = useState('');

	const decide = useMemo(
		() => households.filter((h) => h.soleOwner),
		[households]
	);
	const rest = households.filter((h) => ! h.soleOwner);

	const armed = decide.every((h) => chosen[h.id] !== undefined);
	const disc = statusColor('out', dark);

	function commit() {
		if (! armed) return;

		onConfirm(decide.map((h) => (
			chosen[h.id]
				? { householdId: h.id, action: 'transfer' as const, toMembershipId: chosen[h.id] }
				: { householdId: h.id, action: 'delete' as const }
		)));
	}

	return (
		<ModalShell
			open={open}
			role="dialog"
			labelledBy={titleId}
			describedBy={bodyId}
			onCancel={onCancel}
			width={decide.length > 0 ? 520 : 420}
			initialFocus={() => { setChosen({}); setMenu(''); cancelRef.current?.focus(); }}
			dark={dark}
			theme={theme}
		>
			<span
				class="flex items-center justify-center w-10 h-10 rounded-full"
				style={{ background: disc.bg, color: disc.ink }}
			>
				<UserMinus size={19} />
			</span>

			<h2
				id={titleId}
				class="font-disp text-[21px] font-semibold mt-3.5 mb-2"
				style={{ color: theme.textStrong }}
			>
				{isSelf ? 'Delete your account?' : `Delete ${name}’s account?`}
			</h2>

			<p id={bodyId} class="m-0 text-[14.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
				{decide.length > 0
					? `${isSelf ? 'You own' : 'They own'} ${countWord(decide.length)} other people use. ` +
						`Choose what happens to each — this can’t go ahead until ` +
						`${decide.length === 1 ? 'it is' : 'they are'} answered.`
					: `Every membership and the display name go. ` +
						`${isSelf ? 'You are' : 'They are'} not the only owner of anything, so nothing else is affected.`}
			</p>

			{/*
			  * **Erasure and an audit log pull in opposite directions, and this
			  * picks a side out loud.** Deleting an account removes the person,
			  * not the record of what they did as an administrator — an audit log
			  * you can erase by deleting yourself is not an audit log. The design
			  * says this wants a lawyer's read before it ships, which is a reason
			  * to state it on the screen rather than a reason to leave it unsaid.
			  */}
			<p class="m-0 mt-2.5 text-[13px] leading-[1.5]" style={{ color: theme.textFaint }}>
				This does not delete the Spacefast account itself, and the audit log keeps
				its record of what {isSelf ? 'you' : 'they'} did as an administrator.
			</p>

			{decide.length > 0 && (
				<div class="flex flex-col gap-2 mt-4">
					{decide.map((h) => (
						<HouseholdDecision
							key={h.id}
							household={h}
							chosen={chosen[h.id]}
							menuOpen={menu === h.id}
							setMenuOpen={(o) => setMenu(o ? h.id : '')}
							onChoose={(value) => {
								setChosen((prev) => ({ ...prev, [h.id]: value }));
								setMenu('');
							}}
							dark={dark}
							theme={theme}
						/>
					))}
				</div>
			)}

			{/*
			  * The tail line. It exists so the dialog accounts for **every**
			  * household, not only the ones with a question attached — otherwise
			  * a person in five households sees two rows and is left wondering
			  * what happened to the other three.
			  */}
			{rest.length > 0 && (
				<p class="m-0 mt-3 text-[13.5px] leading-[1.5]" style={{ color: theme.textMuted }}>
					{isSelf ? 'You’re' : `${name} is`} {roleList(rest)}, so {isSelf ? 'you' : 'they'} simply
					{rest.length === 1 ? ' leave it' : ' leave them'}. Nothing to decide.
				</p>
			)}

			<DialogButtons
				cancelRef={cancelRef}
				onCancel={onCancel}
				onConfirm={commit}
				confirmLabel="Delete account"
				armed={armed}
				dark={dark}
				theme={theme}
			/>
		</ModalShell>
	);
}

/**
 * One household that has to be answered for.
 *
 * The trigger reads *Choose…* until it is answered and then reads the answer,
 * which is the sort trigger's rule: a control that names its own current value
 * needs no second label.
 *
 * **Transferring is one press and deleting is one press**, in the same menu,
 * with the destructive one last and crimson — the role menu's construction, and
 * the same argument: there is no second control on the row, because the row's
 * one question has all its answers in one place.
 */
function HouseholdDecision({
	household, chosen, menuOpen, setMenuOpen, onChoose, dark, theme,
}: {
	household: AdminPersonHousehold;
	/** `undefined` unanswered, `''` delete, otherwise the membership to hand it to. */
	chosen: string | undefined;
	menuOpen: boolean;
	setMenuOpen: (open: boolean) => void;
	onChoose: (value: string) => void;
	dark: boolean;
	theme: Theme;
}) {
	const ref = useDismiss<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
	const close = useCallback(() => setMenuOpen(false), [setMenuOpen]);
	/*
	 * **The identical fix the app's own pre-flight needed** (D68), and this one
	 * was never reported because nobody has clicked the console's version: the
	 * dialog card is `overflow-y-auto max-h-[90vh]`, and a scroll container
	 * clips its absolutely-positioned descendants at its padding box. Two rows
	 * are enough to put the second menu past the edge.
	 */
	const seat = useFixedMenu(menuOpen, ref, MENU_SIZE, close);
	const others = household.candidates ?? [];

	const label = chosen === undefined
		? 'Choose…'
		: chosen === ''
			? 'Delete it'
			: `Transfer to ${others.find((c) => c.id === chosen)?.name ?? 'them'}`;

	return (
		<div
			class="flex items-center gap-3 p-2.5 rounded-[13px]"
			style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
		>
			<HouseholdTile ink={household.ink} name={household.name} size={34} dark={dark} />
			<span class="flex-1 min-w-0 flex flex-col gap-px">
				<span class="truncate text-[14.5px] font-semibold" style={{ color: theme.textStrong }}>
					{household.name}
				</span>
				<span class="truncate text-meta" style={{ color: theme.textMuted }}>
					{household.members} {household.members === 1 ? 'member' : 'members'} ·{' '}
					{household.items} {household.items === 1 ? 'item' : 'items'}
				</span>
			</span>

			<div class="relative shrink-0" ref={ref}>
				<button
					onClick={() => setMenuOpen(! menuOpen)}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					aria-label={`What happens to ${household.name}`}
					/* Unanswered is muted, and it has to be a **class**: as an
					  * inline `color` it beat the style's own `hover:text-ink`,
					  * so the one row still waiting on you was the one row that
					  * did not resolve under the pointer. `theme.textMuted` is
					  * `ink-muted` to the byte, so nothing moved at rest.
					  *
					  * The row form, not the card form — these rows are filled
					  * `surface-alt`, which is what the ring has to offset
					  * against. */
					class={`flex items-center gap-[5px] max-w-[210px] h-9 pl-3 pr-2.5 rounded-[10px] text-[13.5px] font-semibold ${chosen === undefined ? PAGE_SUNK_ON_ROW_UNSET : PAGE_SUNK_ON_ROW}`}
				>
					<span class="truncate">{label}</span>
					<ChevronDown
						size={13}
						class="shrink-0"
						style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
					/>
				</button>

				{menuOpen && seat && (
					<div
						role="menu"
						/* `fixed`, so the dialog's own scroll container cannot crop
						 * it. The position and the height are measured — see
						 * `useFixedMenu`. The panel is a column so that only the
						 * people scroll: a long household would otherwise push the
						 * crimson row past the cap, and the row that destroys
						 * something must not be the part you have to go looking
						 * for. Same treatment as the app's own pre-flight. */
						class={`${PAGE_MENU_FIXED} w-[240px] flex flex-col`}
						style={{
							top: `${seat.top}px`,
							left: `${seat.left}px`,
							maxHeight: `${seat.maxHeight}px`,
							boxShadow: theme.liftShadow,
						}}
					>
						{/* `role="none"`: the box is layout, and the rows inside it
						  * are still the menu's own. */}
						<div role="none" class="min-h-0 overflow-y-auto">
							{others.length === 0 ? (
								/*
								 * Nobody to hand it to. The row still has an answer —
								 * deleting — so this is a sentence rather than an empty
								 * menu, and the crimson row below it is still live.
								 */
								<p class="m-0 px-2.5 py-2 text-[13px]" style={{ color: theme.textMuted }}>
									Nobody else is in this household.
								</p>
							) : others.map((c) => (
								<button
									key={c.id}
									role="menuitemradio"
									aria-checked={chosen === c.id}
									onClick={() => onChoose(c.id)}
									class={PAGE_MENU_ROW}
									style={{ color: theme.text, fontWeight: chosen === c.id ? 600 : 400 }}
								>
									<span class="flex-1 min-w-0 truncate">Transfer to {c.name}</span>
									{chosen === c.id && <Check size={15} strokeWidth={2.4} style={{ color: theme.accent }} />}
								</button>
							))}
						</div>

						<div class="shrink-0 h-px mx-2 my-[5px]" style={{ background: theme.divider }} />

						<button
							role="menuitemradio"
							aria-checked={chosen === ''}
							onClick={() => onChoose('')}
							class={`shrink-0 ${PAGE_MENU_ROW_DANGER}`}
							style={chosen === '' ? { fontWeight: 600 } : undefined}
						>
							<Trash2 size={14} class="shrink-0 mr-2.5" />
							<span class="flex-1 min-w-0 truncate">Delete this household</span>
							{chosen === '' && <Check size={15} strokeWidth={2.4} />}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

/** `two households` — the count in words, because the sentence reads it aloud. */
function countWord(n: number): string {
	const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

	return `${words[n] ?? n} ${n === 1 ? 'household' : 'households'}`;
}

/** `an Editor in The Tadlock House`, or `an Editor in two households`. */
function roleList(rest: AdminPersonHousehold[]): string {
	if (rest.length === 1) {
		const role = rest[0].role;

		return `${role === 'owner' ? 'an Owner' : role === 'editor' ? 'an Editor' : 'a Viewer'} in ${rest[0].name}`;
	}

	return `in ${rest.length} other households where somebody else can take over`;
}
