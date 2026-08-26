import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronUp, Pencil, Plus } from 'lucide-preact';

import { TermPanel, TermRow } from './TermPanel';
import type { Theme } from '../lib/theme';
import { chipDot, proposeColor } from '../lib/theme';
import { DRAWER_CHIP, DRAWER_CHIP_ADD, DRAWER_CHIP_ON, DRAWER_ICON } from '../lib/controlStyles';
import type { Term } from '../../shared/types';

type SectionProps = {
	title: string;
	entities: Term[];
	/** A term **id**, or null for "no filter". */
	active: string | null;
	onSelect: (id: string | null) => void;
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
 * Two affordances, deliberately separate. The **pencil** opens
 * `LOCATION · EDITING` — rename, recolour, delete what is already there. The
 * **dashed chip** opens `LOCATION · NEW` — one row, for the term you are about
 * to make. Both drop the same recessed panel in below the group rather than
 * replacing it, so the chips stay put and you can still see what exists while
 * you add to it.
 *
 * Term management lives here rather than in Settings so that filtering by a
 * term and fixing its name happen in the same place.
 */
export function FilterSection({
	title, entities, active, onSelect, countFor, leadingAll,
	onCreate, onRename, onRecolor, onDelete, canEdit, closeEditing, theme,
}: SectionProps) {
	const [open, setOpen] = useState(true);
	const [editing, setEditing] = useState(false);
	const [composing, setComposing] = useState(false);
	const [draft, setDraft] = useState('');
	const [draftColor, setDraftColor] = useState<string | null>(null);
	const d = theme.drawer;

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
					<div class="flex flex-wrap gap-[7px]">
						{leadingAll && (
							<button
								onClick={() => onSelect(null)}
								class={`flex items-center gap-[7px] h-[34px] px-[13px] rounded-full text-[13.5px] ${active === null ? DRAWER_CHIP_ON : DRAWER_CHIP}`}
							>
								{leadingAll.label}
								<span style={{ color: active === null ? '#BE3346' : d.inkFaint }}>{leadingAll.count}</span>
							</button>
						)}

						{entities.map((e) => {
							const isActive = active === e.id;
							const count = countFor?.(e.id);

							return (
								<button
									key={e.id}
									onClick={() => onSelect(isActive ? null : e.id)}
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
						<TermPanel label={title} mode="editing" onDone={() => setEditing(false)} onDark theme={theme}>
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
					)}
				</>
			)}
		</div>
	);
}

export type { SectionProps };
