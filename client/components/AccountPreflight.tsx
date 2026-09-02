import type { ComponentChildren } from 'preact';
import { useCallback, useId, useMemo, useRef, useState } from 'preact/hooks';
import { ChevronDown, TriangleAlert } from 'lucide-preact';

import { DialogButtons, ModalShell } from './ModalShell';
import { HouseholdTile } from './HouseholdTile';
import { PersonAvatar } from './PersonAvatar';
import { useDismiss } from '../hooks/useDismiss';
import { useFixedMenu } from '../hooks/useFixedMenu';
import type { Theme } from '../lib/theme';
import { statusColor } from '../lib/theme';
import {
	LIST_GHOST_ON_CARD, PAGE_MENU_FIXED, PAGE_MENU_ROW, PAGE_MENU_ROW_DANGER_STACKED,
	PAGE_SUNK_ON_ROW, PAGE_SUNK_ON_ROW_UNSET,
} from '../lib/controlStyles';
import type { AccountHousehold } from '../../shared/accountDeletion';
import type { ExportFormat } from '../../shared/exportData';
import {
	andList, deleteConsequence, goesLine, householdMeta, leavingLine, preflightGroups,
	preflightLede, transferConsequence, unanswered,
} from '../../shared/accountDeletion';

/**
 * How many household tiles the *leaving* row draws.
 *
 * Four is what fits beside its own sentence at 520: 4 x 28 with 4px between
 * them is 124px, and `You'll leave all 14. Nothing in them changes.` wants most
 * of what is left. Raising it means re-deriving that, not just the number.
 */
const LEAVING_TILES = 4;

/** The transfer menu's own width and height cap — what placement needs. */
const MENU_SIZE = { width: 284, maxHeight: 280 };

/** The export menu's. Two rows, so the cap is the height rather than a limit. */
const EXPORT_MENU_SIZE = { width: 184, maxHeight: 104 };

/**
 * The words on the two rows.
 *
 * **The format is named and the file is not** — *Download as CSV* would repeat
 * the verb already standing in the trigger above it.
 */
const EXPORT_FORMATS: { key: ExportFormat; label: string }[] = [
	{ key: 'csv', label: 'As a CSV file' },
	{ key: 'json', label: 'As a JSON file' },
];

/**
 * Deleting your account — the pre-flight (D68).
 *
 * **This is the screen that makes account deletion reachable at all.** D22
 * blocks a sole owner from leaving a household; run that rule against every
 * household at once and deletion becomes a wall for exactly the people most
 * likely to want it. **One blocked dialog is a step; five is a wall** — so every
 * block becomes a choice, every choice becomes one row, and the set is asked
 * once at the end rather than five times on the way past.
 *
 * **520 rather than the confirm's 420**, because it carries a list. It is the
 * second caller of `ModalShell`'s `width`, after the console's own pre-flight,
 * and for the same reason: a confirm asks one question and 420 is right for it.
 *
 * **The disc is amber, not crimson.** This screen is the blocked dialog turned
 * into a choice, so it keeps the blocked dialog's disc. Amber is *hold on*, and
 * this is the last screen where that is still true — the confirmation after it
 * is the one that is final.
 *
 * **The primary is the one in the app that does not name a destructive verb.**
 * Every other confirm says *Revoke invite*, *Leave household*, *Delete
 * household*. Pressing this one destroys nothing: the verb is on the next
 * screen, and putting it here would make the pre-flight a second confirmation.
 *
 * **`role="dialog"`, not `alertdialog`.** It is a form with a decision in it;
 * the confirmation is the alert. That distinction has not been needed before,
 * because every modal in the app was a question with two answers.
 */
export function AccountPreflight({
	open, households, chosen, onChoose, onExport, onContinue, onCancel, dark, theme,
}: {
	open: boolean;
	households: readonly AccountHousehold[];
	/** `householdId → membershipId`, or `''` meaning *delete this household*. */
	chosen: Readonly<Record<string, string>>;
	onChoose: (householdId: string, value: string) => void;
	/** Takes a CSV of the household about to be destroyed. Row set to delete only. */
	onExport: (household: AccountHousehold, format: ExportFormat) => void;
	onContinue: () => void;
	onCancel: () => void;
	dark: boolean;
	theme: Theme;
}) {
	const titleId = useId();
	const bodyId = useId();
	const [menu, setMenu] = useState('');
	const firstRef = useRef<HTMLButtonElement | null>(null);

	const { decide, goes, leaving } = useMemo(() => preflightGroups(households), [households]);
	const waiting = unanswered(households, chosen);
	const disc = statusColor('low', dark);

	return (
		<ModalShell
			open={open}
			role="dialog"
			labelledBy={titleId}
			describedBy={bodyId}
			onCancel={onCancel}
			width={520}
			/*
			 * **The first trigger, not Cancel.** A confirm lands on Cancel so the
			 * harmless thing is under the return key; here the disabled *Continue*
			 * is already that guard, and landing on Cancel would mean tabbing past
			 * the one control this screen exists to make you use — the typed
			 * confirmation's own reasoning for focusing its field.
			 */
			initialFocus={() => { setMenu(''); firstRef.current?.focus(); }}
			dark={dark}
			theme={theme}
		>
			<span
				class="flex items-center justify-center w-10 h-10 rounded-full"
				style={{ background: disc.bg, border: `1px solid ${disc.ring}`, color: disc.ink }}
			>
				<TriangleAlert size={20} strokeWidth={1.75} />
			</span>

			<h2
				id={titleId}
				class="font-disp text-[21px] font-semibold leading-[1.25] mt-3.5 mb-2"
				style={{ color: theme.textStrong }}
			>
				Choose what happens to your households
			</h2>

			<p id={bodyId} class="m-0 text-[15px] leading-[1.5]" style={{ color: theme.text }}>
				{preflightLede(households)}
			</p>

			<Group label="Needs a decision" theme={theme}>
				{/*
				  * **No `overflow-hidden`**, which is the third time this app has
				  * paid for one: the console's Members card and the review table
				  * both cropped their own popovers at a rounded edge. Nothing in
				  * here is full-bleed and filled — the rows sit on the dialog's own
				  * surface and the only thing that could poke out is a 1px rule at
				  * the vertical middle, where the radius does not reach — so the
				  * clip was buying nothing and cutting the transfer menu in half.
				  */}
				<div class="rounded-[14px]" style={{ border: `1px solid ${theme.border}` }}>
					{decide.map((h, i) => (
						<Decision
							key={h.id}
							household={h}
							first={i === 0}
							firstRef={i === 0 ? firstRef : undefined}
							chosen={chosen[h.id]}
							menuOpen={menu === h.id}
							setMenuOpen={(o) => setMenu(o ? h.id : '')}
							onChoose={(value) => { onChoose(h.id, value); setMenu(''); }}
							onExport={(format) => onExport(h, format)}
							dark={dark}
							theme={theme}
						/>
					))}
				</div>
			</Group>

			{/*
			  * **A group, not the console's tail line.** A sole-member household is
			  * *destroyed* and the rest are merely *left* — three facts, and one
			  * sentence covering all three flattens the first into the others. The
			  * row that loses 34 items says so in the out text colour, on a screen
			  * where nothing is pressable to fix it.
			  */}
			{(goes.length > 0 || leaving.length > 0) && (
				<Group label="Nothing to decide" theme={theme}>
					<div
						class="rounded-[14px] px-3.5"
						style={{ background: theme.surfaceAlt, border: `1px solid ${theme.border}` }}
					>
						{goes.map((h, i) => (
							<Quiet key={h.id} rule={i > 0} theme={theme}>
								<HouseholdTile ink={h.ink} name={h.name} size={28} dark={dark} />
								<span class="flex-1 min-w-0 flex flex-col gap-px">
									<span class="truncate text-[14.5px] font-semibold" style={{ color: theme.textStrong }}>
										{h.name}
									</span>
									<span class="text-meta" style={{ color: theme.dangerText }}>{goesLine(h)}</span>
								</span>
							</Quiet>
						))}

						{leaving.length > 0 && (
							<Quiet rule={goes.length > 0} theme={theme}>
								{/*
								  * **The tiles are one cluster, and it is capped.** They were
								  * the row's first tile with every other one trailing *after*
								  * the text, so a household you are merely leaving cost 28px
								  * that nothing could shrink: at fourteen the tiles alone
								  * wanted ~530px of a 448px row and ran clean out of the box.
								  *
								  * **No bubble standing in for the ones not drawn** — the
								  * Members card's rule, and it costs nothing here because the
								  * sentence under the names already says *all 14*. The tiles
								  * say these are households; the line says how many.
								  */}
								<span class="shrink-0 flex items-center gap-1">
									{leaving.slice(0, LEAVING_TILES).map((h) => (
										<HouseholdTile key={h.id} ink={h.ink} name={h.name} size={28} dark={dark} />
									))}
								</span>
								<span class="flex-1 min-w-0 flex flex-col gap-px">
									<span class="truncate text-[14.5px] font-semibold" style={{ color: theme.textStrong }}>
										{namesOf(leaving)}
									</span>
									<span class="truncate text-meta" style={{ color: theme.textMuted }}>
										{leavingLine(leaving.length)}
									</span>
								</span>
							</Quiet>
						)}
					</div>
				</Group>
			)}

			<DialogButtons
				onCancel={onCancel}
				onConfirm={onContinue}
				confirmLabel="Continue"
				armed={waiting.length === 0}
				dark={dark}
				theme={theme}
				/*
				 * The reason the primary is asleep, beside the primary. D36's *a
				 * disabled control cannot explain itself* is about a control whose
				 * reason is off-screen; here the reason **is** the screen, and this
				 * line names how much of it is still waiting.
				 */
				note={waiting.length === 0
					? ''
					: waiting.length === decide.length && decide.length > 1
						? `${decide.length} decisions are needed before you can go on.`
						: waiting.length === 1
							? `${waiting[0].name} still needs an answer.`
							: `${waiting.length} decisions are still needed.`}
			/>
		</ModalShell>
	);
}

/** A micro-label over a block, which is what makes the two groups two groups. */
function Group({ label, theme, children }: {
	label: string;
	theme: Theme;
	children: ComponentChildren;
}) {
	return (
		<section class="flex flex-col gap-2 mt-4">
			<p class="m-0 text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textMuted }}>
				{label}
			</p>
			{children}
		</section>
	);
}

/** One row of *Nothing to decide* — a statement, and nothing to press. */
function Quiet({ rule, theme, children }: {
	rule: boolean;
	theme: Theme;
	children: ComponentChildren;
}) {
	return (
		<>
			{rule && <span class="block h-px" style={{ background: theme.border }} />}
			<div class="flex items-center gap-3 py-2.5">{children}</div>
		</>
	);
}

/**
 * One household that has to be answered for.
 *
 * **One trigger, not two chips.** *Transfer* and *Delete* look like a pair
 * until you notice that transfer needs a **name** — so it is one question with
 * several answers, which is a menu. At rest it reads *Choose*; chosen, it takes
 * the inversion every selected control in this app uses and says what was
 * chosen, which is the sort trigger's rule: a control that names its own value
 * needs no second label.
 *
 * **The row's meta line becomes the consequence.** Unanswered it says what the
 * household is; answered it says what is about to happen to it, and the
 * destructive half says so in the out text colour. That is the confirm's own
 * rule — *the body names what is lost* — applied once per row.
 */
function Decision({
	household, first, firstRef, chosen, menuOpen, setMenuOpen, onChoose, onExport, dark, theme,
}: {
	household: AccountHousehold;
	first: boolean;
	firstRef?: { current: HTMLButtonElement | null };
	/** `undefined` unanswered, `''` delete, otherwise the membership to hand it to. */
	chosen: string | undefined;
	menuOpen: boolean;
	setMenuOpen: (open: boolean) => void;
	onChoose: (value: string) => void;
	onExport: (format: ExportFormat) => void;
	dark: boolean;
	theme: Theme;
}) {
	const ref = useDismiss<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
	const close = useCallback(() => setMenuOpen(false), [setMenuOpen]);
	const seat = useFixedMenu(menuOpen, ref, MENU_SIZE, close);
	const to = chosen ? household.candidates.find((c) => c.id === chosen) : undefined;

	const meta = chosen === undefined
		? householdMeta(household)
		: chosen === ''
			? deleteConsequence(household)
			: transferConsequence(to?.name ?? '');

	return (
		<>
			{! first && <span class="block h-px" style={{ background: theme.divider }} />}

			<div class="flex items-center gap-3 px-3.5 py-3">
				<HouseholdTile ink={household.ink} name={household.name} size={34} dark={dark} />

				<span class="flex-1 min-w-0 flex flex-col gap-px">
					<span class="truncate text-[15px] font-semibold" style={{ color: theme.textStrong }}>
						{household.name}
					</span>
					<span
						class="truncate text-meta"
						style={{ color: chosen === '' ? theme.dangerText : theme.textMuted }}
					>
						{meta}
					</span>
				</span>

				{/*
				  * **Only on a row set to delete**, which is the only moment in the
				  * app where a pantry is about to stop existing and somebody is
				  * looking straight at it. A row set to transfer does not get it:
				  * that household keeps its own copy and its own export row.
				  *
				  * **A menu rather than the pair of buttons Settings uses**, and the
				  * row is what decides it: a tile, a name, a consequence line and a
				  * decision trigger are already in it, and a second format sitting
				  * loose in that line would be a fifth thing competing with the one
				  * control that has to be pressed. The label is the instruction and
				  * has to survive — `Export it first` says why the control is there,
				  * where a bare `CSV` beside `Delete it` says nothing at all.
				  */}
				{chosen === '' && <ExportControl onExport={onExport} theme={theme} />}

				<div class="relative shrink-0" ref={ref}>
					<button
						ref={firstRef}
						onClick={() => setMenuOpen(! menuOpen)}
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						aria-label={`What happens to ${household.name}`}
						/*
						 * Unanswered is muted, and it has to be a **class**: as an
						 * inline `color` it would beat the style's own `hover:text-ink`,
						 * so the one row still waiting on you would be the one row that
						 * did not resolve under the pointer.
						 *
						 * The row form, not the card form — these rows sit on `surface`
						 * inside a bordered block, and `PAGE_SUNK_ON_ROW`'s ring offset
						 * is what the console's identical trigger already settled.
						 */
						class={`flex items-center gap-[5px] max-w-[200px] h-[30px] pl-2.5 pr-2 rounded-[13px] text-[13.5px] font-semibold ${chosen === undefined ? PAGE_SUNK_ON_ROW_UNSET : PAGE_SUNK_ON_ROW}`}
					>
						{to && <PersonAvatar name={to.name} picture={to.picture} size={18} theme={theme} />}
						<span class="truncate">
							{chosen === undefined ? 'Choose' : chosen === '' ? 'Delete it' : to?.name ?? 'Them'}
						</span>
						<ChevronDown
							size={13}
							class="shrink-0"
							style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
						/>
					</button>

					{menuOpen && seat && <TransferMenu
						household={household}
						chosen={chosen}
						onChoose={onChoose}
						seat={seat}
						theme={theme}
					/>}
				</div>
			</div>
		</>
	);
}

/**
 * *Export it first*, and which file.
 *
 * **Two rows, and the trigger keeps the sentence.** The formats are what
 * `shared/exportData.ts` offers everywhere; the difference here is only that
 * there is no room in this row to draw them side by side, so they go where a
 * short list of alternatives goes in this app.
 *
 * **A press downloads and closes**, unlike the audit log's format rows: there
 * the format is a modifier on a range you have still to pick, and here it *is*
 * the act. Nothing is marked as current, for the transfer menu's own reason one
 * component up — neither row has happened yet, so there is no incumbent to
 * check.
 *
 * `useFixedMenu`, because the dialog card is `overflow-y-auto max-h-[90vh]` and
 * a scroll container clips absolutely-positioned descendants at its padding
 * box. Same cap, same fix, same reason as the transfer menu.
 */
function ExportControl({ onExport, theme }: {
	onExport: (format: ExportFormat) => void;
	theme: Theme;
}) {
	const [open, setOpen] = useState(false);
	const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
	const close = useCallback(() => setOpen(false), []);
	const seat = useFixedMenu(open, ref, EXPORT_MENU_SIZE, close);

	return (
		<div class="relative shrink-0" ref={ref}>
			<button
				onClick={() => setOpen(! open)}
				aria-haspopup="menu"
				aria-expanded={open}
				class={`flex items-center gap-1 h-8 pl-2 pr-1.5 rounded-[9px] text-[13px] font-semibold ${LIST_GHOST_ON_CARD}`}
			>
				Export it first
				<ChevronDown
					size={13}
					class="shrink-0"
					style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
				/>
			</button>

			{open && seat && (
				<div
					role="menu"
					aria-label="Export this pantry"
					class={`${PAGE_MENU_FIXED} w-[184px]`}
					style={{
						top: `${seat.top}px`,
						left: `${seat.left}px`,
						maxHeight: `${seat.maxHeight}px`,
						boxShadow: theme.liftShadow,
					}}
				>
					{EXPORT_FORMATS.map((f) => (
						<button
							key={f.key}
							role="menuitem"
							onClick={() => { onExport(f.key); setOpen(false); }}
							class={PAGE_MENU_ROW}
							style={{ color: theme.text }}
						>
							{f.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Who it could go to, and the one answer that is not a person.
 *
 * **Cream, because it opens on a card** — the console's rule already decides
 * this, and the reverse is the mistake `DrawerMenu` records: a cream popover
 * over the darkest panel in the app.
 *
 * **No row is marked as current, because there is no current value.** The sort
 * menu and the role menu both check the value you are on; a transfer has no
 * incumbent — every row is a thing that has not happened yet. So the check
 * comes off and hover is the only state the rows have.
 *
 * **It carries a micro-label header, which no other menu in the app has.** Two
 * kinds of row — people, and one destruction — and without it the delete row
 * reads as a fourth person. The hairline alone was not enough on the board.
 */
function TransferMenu({ household, chosen, onChoose, seat, theme }: {
	household: AccountHousehold;
	chosen: string | undefined;
	onChoose: (value: string) => void;
	/** Viewport coordinates and the height it actually has — see `useFixedMenu`. */
	seat: { top: number; left: number; maxHeight: number };
	theme: Theme;
}) {
	return (
		<div
			role="menu"
			aria-label={`What happens to ${household.name}`}
			/*
			 * **`fixed`, not `absolute`.** The dialog card is
			 * `overflow-y-auto max-h-[90vh]` so a tall pre-flight can reach its
			 * own footer, and a scroll container clips absolutely-positioned
			 * descendants at its padding box. That cap is load-bearing and cannot
			 * be removed, so the popover moves layer instead.
			 *
			 * The position and the height are inline because they are measured;
			 * the cap beats the class rather than fighting it, which is the
			 * review's rule for the same number.
			 *
			 * **The panel is a column and the people are the only part that
			 * scrolls.** A household with five candidates is taller than the cap,
			 * and scrolling the whole box would take the header and the one row
			 * that destroys something below the fold — so the label stays, the
			 * crimson row stays, and the list between them shrinks. `min-h-0` is
			 * what lets it: a flex item's floor is its content until it is told
			 * otherwise, so without it the list never shrinks and the panel
			 * overflows exactly as before.
			 */
			class={`${PAGE_MENU_FIXED} w-[284px] flex flex-col`}
			style={{
				top: `${seat.top}px`,
				left: `${seat.left}px`,
				maxHeight: `${seat.maxHeight}px`,
				boxShadow: theme.liftShadow,
			}}
		>
			<p class="shrink-0 m-0 px-2.5 pt-2 pb-1.5 text-label font-bold uppercase tracking-[0.15em]" style={{ color: theme.textMuted }}>
				Transfer it to
			</p>

			{/*
			  * `role="none"` because this box is layout: without it the menu's
			  * rows stop being the menu's own children, and a screen reader
			  * announces a menu holding one group rather than five people.
			  */}
			<div role="none" class="min-h-0 overflow-y-auto">
				{household.candidates.map((c) => (
					<button
						key={c.id}
						role="menuitemradio"
						aria-checked={chosen === c.id}
						onClick={() => onChoose(c.id)}
						class={PAGE_MENU_ROW}
						style={{ color: theme.text }}
					>
						<PersonAvatar name={c.name} picture={c.picture} size={24} theme={theme} />
						<span class="flex-1 min-w-0 truncate ml-2.5">{c.name}</span>
						<span class="shrink-0 text-[12.5px]" style={{ color: theme.textMuted }}>
							{c.role === 'owner' ? 'Owner' : c.role === 'editor' ? 'Editor' : 'Viewer'}
						</span>
					</button>
				))}
			</div>

			<div class="shrink-0 h-px mx-2 my-[5px]" style={{ background: theme.divider }} />

			{/*
			  * Crimson text on nothing, which is how this app *offers* destruction.
			  * The second line is the count, because this is the row that means it.
			  */}
			<button
				role="menuitemradio"
				aria-checked={chosen === ''}
				onClick={() => onChoose('')}
				class={`shrink-0 ${PAGE_MENU_ROW_DANGER_STACKED}`}
			>
				<span class="flex-1 min-w-0 flex flex-col gap-px text-left">
					<span class="font-medium">Delete this household</span>
					<span class="text-[12.5px]" style={{ color: theme.textMuted }}>
						{deleteConsequence(household)}
					</span>
				</span>
			</button>
		</div>
	);
}

/** `The Shop and Mom's Pantry`, `The Shop, Mom's Pantry, and The Cabin`. */
function namesOf(households: readonly AccountHousehold[]): string {
	return andList(households.map((h) => h.name));
}
