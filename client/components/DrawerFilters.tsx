import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronUp, Pencil, Plus } from 'lucide-preact';

import { TermPanel, TermRow } from './TermPanel';
import type { Theme } from '../lib/theme';
import { chipDot, proposeColor } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_CHIP_ADD, DRAWER_CHIP_ON, DRAWER_ICON } from '../lib/controlStyles';
import type { TermFilter } from '../lib/actions';
import type { Term } from '../../shared/types';

type SectionProps = {
	title: string;
	entities: Term[];
	/** The group's selection — several terms at once, OR'd together (D45). */
	filter: TermFilter;
	countFor?: (id: string) => number;
	leadingAll?: { label: string; count: number };
	onCreate: (name: string, ink: string) => Promise<string | null>;
	onRename: (id: string, name: string) => void;
	onRecolor: (id: string, token: string) => void;
	onDelete: (id: string) => void;
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
 * Term management lives here rather than in Settings so that filtering by a
 * term and fixing its name happen in the same place.
 */
export function FilterSection({
	title, entities, filter, countFor, leadingAll,
	onCreate, onRename, onRecolor, onDelete, canEdit, closeEditing, theme,
}: SectionProps) {
	const [open, setOpen] = useState(true);
	const [editing, setEditing] = useState(false);
	const [composing, setComposing] = useState(false);
	const [draft, setDraft] = useState('');
	const [draftColor, setDraftColor] = useState<string | null>(null);
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
	}, [closeEditing]);

	function startComposing() {
		setDraft('');
		setDraftColor(null);
		setEditing(false);
		setComposing(true);
	}

	function commit() {
		const name = draft.trim();
		/*
		 * Created but *not* selected: filtering by a brand-new term would blank
		 * the list, which is the opposite of what pressing "+ Location" meant.
		 */
		if (name) void onCreate(name, proposed);
		setComposing(false);
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
						<TermPanel label={title} mode="new" onDone={commit} onDark theme={theme}>
							<TermRow
								name={draft} ink={proposed} placeholder={`New ${title.toLowerCase()}…`} autoFocus
								onName={setDraft} onColor={setDraftColor}
								onAction={() => setComposing(false)} action="abandon"
								onDark theme={theme}
							/>
						</TermPanel>
					)}

					{canEdit && editing && (
						/*
						 * A card, not the tray the `NEW` panel gets. Nothing is
						 * dropping in below a group here — for as long as it is
						 * open this *is* the group, so it stops bleeding to the
						 * column edge and sits inside the pane's gutter like a
						 * Settings block. `overflow-hidden` is what lets the
						 * `flush` panel's square bottom corners take the card's
						 * radius; its top corners are already the card's own.
						 */
						<div
							class="flex flex-col rounded-[13px] overflow-hidden"
							style={{ background: d.raised, border: `1px solid ${d.line}` }}
						>
							<TermPanel label={title} mode="editing" onDone={() => setEditing(false)} onDark flush theme={theme}>
								{entities.map((e) => (
									<TermRow
										key={e.id}
										name={e.name} ink={e.ink}
										count={countFor?.(e.id) ?? 0}
										onName={(next) => { if (next.trim()) onRename(e.id, next.trim()); }}
										onColor={(token) => onRecolor(e.id, token)}
										onAction={() => onDelete(e.id)} action="delete"
										onDark theme={theme}
									/>
								))}
							</TermPanel>
						</div>
					)}
				</>
			)}
		</div>
	);
}

export type { SectionProps };
