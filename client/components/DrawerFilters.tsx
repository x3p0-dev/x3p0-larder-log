import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronUp, Pencil, Plus } from 'lucide-preact';

import { TermPanel, TermRow } from './TermPanel';
import type { Theme } from '../lib/theme';
import { chipDot, proposeColor } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_CHIP_ADD, DRAWER_CHIP_ON, DRAWER_ICON } from '../lib/controlStyles';
import type { TermFilter } from '../lib/actions';
import type { SourceKind } from '../../shared/source';
import { toSourceKind } from '../../shared/source';
import type { Term } from '../../shared/types';

type SectionProps = {
	/**
	 * The group's heading, the dashed chip's word, and the composer's label.
	 *
	 * A prop rather than a constant because the source group renames itself:
	 * `Store` while every source is a shop, `Source` once one of them is not
	 * (D58). `sourceGroupWord()` owns that rule and the caller applies it, so
	 * all four places move together or none of them do.
	 */
	title: string;
	entities: readonly (Term & { kind?: SourceKind })[];
	/** The group's selection — several terms at once, OR'd together (D45). */
	filter: TermFilter;
	countFor?: (id: string) => number;
	leadingAll?: { label: string; count: number };
	/**
	 * The third argument is the source group's own, and is `undefined`
	 * everywhere else: a location and a type have no kind to compose.
	 */
	onCreate: (name: string, ink: string, kind?: SourceKind) => Promise<string | null>;
	onRename: (id: string, name: string) => void;
	onRecolor: (id: string, token: string) => void;
	onDelete: (id: string) => void;
	/**
	 * Sets a source's kind — present on the store group and nowhere else.
	 *
	 * Its presence is what puts the glyph on each editing row, so a group with
	 * no kinds renders exactly the row it always did.
	 */
	onSetKind?: (id: string, kind: SourceKind) => void;
	/** `taxonomy:write`. A viewer filters by terms but cannot mint or edit them. */
	canEdit: boolean;
	/**
	 * Bumped to fold every editing panel shut.
	 *
	 * A blocked dialog's *Show the 3 items* applies the term as the only filter
	 * and leaves editing — you asked to go look at the items, and staying in a
	 * panel of text fields on top of them is not that. The signal is a counter
	 * rather than a boolean so consecutive closes are distinguishable.
	 */
	closeEditing?: number;
	theme: Theme;
};

/**
 * One filter section, and the place its terms are managed.
 *
 * Two affordances, deliberately separate — and they are separate in what they
 * do to the group as well as in what they open.
 *
 * The **pencil** opens `LOCATION · EDITING` and the chips **go**: that panel
 * already lists every term in the group, with its colour and its count, so
 * leaving the chips above it printed the same list twice and made the section
 * twice as tall to say the same thing. It takes the Settings card's
 * construction while it is there — `raised` fill, a `line` border, radius 13,
 * with the panel `flush` inside it — which is what the Household rename one tab
 * over already looks like.
 *
 * The **dashed chip** opens `LOCATION · NEW` — one row, for the term you are
 * about to make — and that one still drops in *below* the chips, which stay
 * put. It shows nothing of what exists, so hiding what does would mean naming a
 * new term with the existing names off screen.
 *
 * **The editing panel has its own way to add one**, a dashed row at its foot.
 * Both exist because the chip is hidden while editing — the panel *is* the
 * group — which left this pane as the one place in the app where you could
 * rename, recolour and delete a term but not make one. The two are the same
 * draft row on two surfaces, never both open: opening the composer closes
 * editing, and the add row only exists inside it.
 *
 * Term management lives here rather than in Settings so that filtering by a
 * term and fixing its name happen in the same place.
 */
export function FilterSection({
	title, entities, filter, countFor, leadingAll,
	onCreate, onRename, onRecolor, onDelete, onSetKind, canEdit, closeEditing, theme,
}: SectionProps) {
	const [open, setOpen] = useState(true);
	const [editing, setEditing] = useState(false);
	const [composing, setComposing] = useState(false);
	/**
	 * A draft row at the foot of the **editing** panel.
	 *
	 * Separate from `composing`, which is the panel that drops in below the
	 * chips, because the two are hosted by different surfaces and only ever one
	 * is open: opening the composer closes editing, and this only exists while
	 * editing. They share `draft` and `draftColor` for that reason.
	 */
	const [adding, setAdding] = useState(false);
	const [draft, setDraft] = useState('');
	const [draftColor, setDraftColor] = useState<string | null>(null);
	/**
	 * The kind the row being composed carries, on the source group only.
	 *
	 * **A new source is no longer always a shop.** It defaults to one, which is
	 * the common case and is what the column's own fallback resolves an empty
	 * string to — but you know as you type *The Garden* that it is not a shop,
	 * and D58 made you name it, press *Done*, re-open the panel with the pencil
	 * and find the row again to say so.
	 *
	 * Shared by both draft rows for the reason `draft` and `draftColor` are:
	 * only one of them is ever open.
	 */
	const [draftKind, setDraftKind] = useState<SourceKind>('shop');
	const d = theme.drawer;

	/*
	 * `All items` is the *absence* of a selection, not a member of it, so it
	 * lights when the group is empty rather than tracking an id of its own.
	 */
	const none = filter.ids.length === 0;

	const proposed = draftColor ?? proposeColor(entities.map((e) => e.ink));

	// Skips the first run: `closeEditing` starts defined, and folding a panel
	// nobody opened is invisible but still a wasted render.
	const seen = useRef(closeEditing);

	useEffect(() => {
		if (closeEditing === seen.current) return;

		seen.current = closeEditing;
		setEditing(false);
		setComposing(false);
		// The draft goes with the panel holding it. A half-typed name surviving
		// into the next thing you open is worse than losing three characters.
		setAdding(false);
		setDraft('');
		setDraftColor(null);
		setDraftKind('shop');
	}, [closeEditing]);

	function startDraft() {
		setDraft('');
		setDraftColor(null);
		setDraftKind('shop');
	}

	function startComposing() {
		startDraft();
		setAdding(false);
		setEditing(false);
		setComposing(true);
	}

	/**
	 * Creates whatever is in the draft, if anything, and clears it.
	 *
	 * Both panels' *Done* runs this, because both mean *I am finished with the
	 * row I was typing into* — an empty draft is simply nothing to create, which
	 * is why there is no separate cancel path here. The `×` on the row is that.
	 *
	 * Created but *not* selected: filtering by a brand-new term would blank the
	 * list, which is the opposite of what pressing "+ Location" meant.
	 */
	function commitDraft() {
		const name = draft.trim();

		// The kind rides along only where there is one to send. `onSetKind` is
		// the source group's own marker, and the same flag that puts the glyph
		// on the row being typed into.
		if (name) void onCreate(name, proposed, onSetKind ? draftKind : undefined);

		startDraft();
	}

	return (
		<div class="flex flex-col gap-2.5">
			<div class="flex items-center justify-between">
				<span class="text-label font-bold uppercase tracking-[0.15em]" style={{ color: d.label }}>{title}</span>
				<span class="flex items-center gap-0.5">
					{canEdit && ! editing && (
						<button
							onClick={() => { setComposing(false); setEditing(true); }}
							class={`flex items-center justify-center w-7 h-7 ${DRAWER_ICON}`}
							title={`Edit ${title.toLowerCase()}`}
						>
							<Pencil size={14} />
						</button>
					)}
					<button
						onClick={() => setOpen((v) => ! v)}
						class={`flex items-center justify-center w-7 h-7 ${DRAWER_ICON}`}
						aria-expanded={open}
						aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
					>
						<ChevronUp size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }} />
					</button>
				</span>
			</div>

			{open && (
				<>
					{/* Hidden while editing: the panel below is the same list. */}
					{! editing && (
					<div class="flex flex-wrap gap-[7px]">
						{leadingAll && (
							<button
								onClick={filter.clear}
								class={`flex items-center gap-[7px] h-[34px] px-[13px] rounded-full text-[13.5px] ${none ? DRAWER_CHIP_ON : DRAWER_CHIP}`}
							>
								{leadingAll.label}
								<span style={{ color: none ? '#BE3346' : d.inkFaint }}>{leadingAll.count}</span>
							</button>
						)}

						{entities.map((e) => {
							const isActive = filter.ids.includes(e.id);
							const count = countFor?.(e.id);

							return (
								<button
									key={e.id}
									onClick={() => filter.toggle(e.id)}
									aria-pressed={isActive}
									class={`flex items-center gap-[7px] h-[34px] px-[13px] rounded-full text-[13.5px] ${isActive ? DRAWER_CHIP_ON : DRAWER_CHIP}`}
								>
									{/*
									  * The dot stays when the chip is on. It is the only
									  * thing carrying the term's colour, and dropping it on
									  * selection stops the chip saying which term it is at
									  * the moment you have picked it.
									  */}
									<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: chipDot(e.ink, isActive) }} />
									{e.name}
									{count !== undefined && <span style={{ color: isActive ? '#BE3346' : d.inkFaint }}>{count}</span>}
								</button>
							);
						})}

						{canEdit && ! composing && (
							<button
								onClick={startComposing}
								class={`flex items-center gap-1.5 h-[34px] px-[13px] rounded-full text-[13.5px] ${DRAWER_CHIP_ADD}`}
							>
								<Plus size={13} strokeWidth={2.2} /> {title}
							</button>
						)}
					</div>
					)}

					{canEdit && composing && (
						<TermPanel
							label={title}
							mode="new"
							onDone={() => { commitDraft(); setComposing(false); }}
							onDark theme={theme}
						>
							<TermRow
								name={draft} ink={proposed} placeholder={`New ${title.toLowerCase()}…`} autoFocus
								kind={onSetKind ? draftKind : undefined}
								onKind={onSetKind && setDraftKind}
								onName={setDraft} onColor={setDraftColor}
								onAction={() => setComposing(false)} action="abandon"
								onDark theme={theme}
							/>
						</TermPanel>
					)}

					{canEdit && editing && (
						/*
						 * A card, not the bare panel the `NEW` composer gets.
						 * Nothing is dropping in below a group here — for as long
						 * as it is open this *is* the group, so it takes a
						 * Settings block's construction: a `raised` fill, a `line`
						 * border and radius 13. `overflow-hidden` is what lets the
						 * `flush` panel's square bottom corners take the card's
						 * radius; its top corners are already the card's own.
						 *
						 * Both sit on the pane's gutter now. This one always did;
						 * the composer used to hang 10px outside it, which made
						 * one panel disagree with the same panel one state along.
						 */
						<div
							class="flex flex-col rounded-[13px] overflow-hidden"
							style={{ background: d.raised, border: `1px solid ${d.line}` }}
						>
							<TermPanel
								label={title}
								mode="editing"
								onDone={() => { commitDraft(); setAdding(false); setEditing(false); }}
								onDark flush theme={theme}
							>
								{entities.map((e) => (
									<TermRow
										key={e.id}
										name={e.name} ink={e.ink}
										kind={onSetKind ? toSourceKind(e.kind) : undefined}
										onKind={onSetKind && ((next) => onSetKind(e.id, next))}
										onName={(next) => { if (next.trim()) onRename(e.id, next.trim()); }}
										onColor={(token) => onRecolor(e.id, token)}
										onAction={() => onDelete(e.id)} action="delete"
										onDark theme={theme}
									/>
								))}

								{/*
								  * The way to add one **without leaving the panel**.
								  *
								  * The dashed chip above is hidden while editing, because
								  * the panel *is* the group — which left the editing pane
								  * as the one place in the app where you could rename,
								  * recolour and delete a term but not make one. Pressing
								  * *Done* to reach an add affordance is a trip out of the
								  * thing you are already in.
								  *
								  * It is the same draft row the `NEW` panel holds, in the
								  * same order as the boards draw it: the group, then the
								  * way to extend it. Committed by this panel's own *Done*,
								  * because a second confirm inside a panel that already has
								  * one is two answers to one question.
								  */}
								{adding
									? (
										<TermRow
											name={draft} ink={proposed}
											placeholder={`New ${title.toLowerCase()}…`} autoFocus
											kind={onSetKind ? draftKind : undefined}
											onKind={onSetKind && setDraftKind}
											onName={setDraft} onColor={setDraftColor}
											onAction={() => { setAdding(false); startDraft(); }} action="abandon"
											onDark theme={theme}
										/>
									)
									: (
										<button
											onClick={() => { startDraft(); setAdding(true); }}
											class={`flex items-center justify-center gap-[7px] h-9 rounded-[11px] text-[13px] ${DRAWER_CHIP_ADD}`}
										>
											<Plus size={13} strokeWidth={2.2} />
											Add a {title.toLowerCase()}
										</button>
									)}
							</TermPanel>
						</div>
					)}
				</>
			)}
		</div>
	);
}

export type { SectionProps };
