import { useEffect, useMemo, useState } from 'preact/hooks';

import type { Theme } from '../lib/theme';
import { statusFor, themed } from '../lib/theme';
import { formatSize } from '../../shared/size';
import type { CatalogItem } from '../../shared/catalog';
import { suggestionAnnouncement } from '../../shared/suggest';
import type { Item, Term, TermKind } from '../../shared/types';

/**
 * The one thing on screen whose failure mode is silence — see `Pantry`'s copy
 * of this, which explains why it is an inline style rather than a class.
 */
const SR_ONLY = {
	position: 'absolute', width: '1px', height: '1px',
	overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
} as const;

/**
 * A row of either menu.
 *
 * `at` is where the query landed, which is the only thing the row needs to
 * render its highlight — the matching *rule* stays in `shared/suggest.ts` and
 * nothing here re-derives it.
 */
export type SuggestRow =
	| {
		kind: 'item';
		id: string;
		item: Item;
		/** The location's *name*, resolved by the host — the item carries only an id. */
		place: string;
		at: number;
		sizeAt: number;
	}
	| { kind: 'catalog'; id: string; entry: CatalogItem; at: number }
	| { kind: 'term'; id: string; term: Term; group: TermKind; groupWord: string; count: number; at: number };

/** A labelled run of rows. A group with no rows is dropped by the hook. */
export type SuggestGroup = { label: string; rows: SuggestRow[] };

/**
 * The state behind a suggestion menu, and the keys that drive it.
 *
 * The field keeps focus throughout — this is a `combobox` over a `listbox`, the
 * shape the unit trigger already takes two controls away on the same sheet — so
 * the highlight is an index here rather than DOM focus, and it is one treatment
 * for the pointer and the keyboard alike.
 *
 * **`close()` takes the query it should stay closed for**, which is what makes
 * picking work: the sheet's pick rewrites the name field, so closing "for the
 * current query" would reopen the menu a tick later showing the row that was
 * just pressed.
 */
export function useSuggest(query: string, groups: SuggestGroup[]) {
	const filled = useMemo(() => groups.filter((g) => g.rows.length > 0), [groups]);
	const rows = useMemo(() => filled.flatMap((g) => g.rows), [filled]);

	const [closedFor, setClosedFor] = useState<string | null>(null);
	const [active, setActive] = useState(-1);
	const [announced, setAnnounced] = useState('');

	const open = rows.length > 0 && closedFor !== query;

	/*
	 * Escape holds only until the query moves. Clearing the moment it differs
	 * — rather than testing equality at render — is what stops a deleted-and
	 * retyped character from landing back on the string the menu was dismissed
	 * for and staying shut.
	 */
	useEffect(() => {
		if (closedFor !== null && closedFor !== query) setClosedFor(null);
	}, [query, closedFor]);

	const rowKey = rows.map((r) => r.id).join('|');

	/*
	 * **Nothing is highlighted until an arrow key says so**, and that is a
	 * decision rather than an oversight. With row 0 pre-selected, Enter commits
	 * a guess nobody made — D48's rule about a name nobody typed, one control
	 * over. Down from nothing lands on the first row, Up on the last, which is
	 * what every menu in this app already does.
	 */
	useEffect(() => { setActive(-1); }, [rowKey]);

	// Only when the number moves, never on every keystroke.
	useEffect(() => {
		setAnnounced(open ? suggestionAnnouncement(rows.length) : '');
	}, [open, rows.length]);

	function close(forQuery: string = query) { setClosedFor(forQuery); }

	/**
	 * The field's own key handler. Returns whether it took the key, so the host
	 * can fall through to what Escape means when the menu is already shut — the
	 * sheet closing, or the search field clearing.
	 */
	function onKeyDown(e: KeyboardEvent, pick: (row: SuggestRow) => void): boolean {
		if (! open) return false;

		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			const next = active < 0
				? (step === 1 ? 0 : rows.length - 1)
				: (active + step + rows.length) % rows.length;
			setActive(next);
			return true;
		}

		if (e.key === 'Enter' && active >= 0 && rows[active]) {
			e.preventDefault();
			pick(rows[active]!);
			return true;
		}

		// Escape keeps what you typed. The `×` and a second Escape are what
		// clear the field; this only takes the menu away.
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return true;
		}

		return false;
	}

	return { open, groups: filled, rows, active, setActive, close, onKeyDown, announced };
}

type Props = {
	open: boolean;
	groups: SuggestGroup[];
	active: number;
	setActive: (i: number) => void;
	onPick: (row: SuggestRow) => void;
	/** Announced politely when the count moves. Rendered whether the menu is up or not. */
	announced: string;
	/** Names the listbox for a screen reader — *Suggestions* on both fields today. */
	label: string;
	/** Must match the field's `aria-controls`. */
	id: string;
	/**
	 * How many characters the highlight covers — the trimmed query's length.
	 *
	 * Passed down rather than stored on every row: it is one number for the
	 * whole menu, and a copy per row is a copy that can disagree.
	 */
	matchLength: number;
	dark: boolean;
	theme: Theme;
};

/**
 * One menu, two places — the item name on the Add / Edit sheet, and the top
 * bar's search.
 *
 * **The sort menu's construction at the sort menu's tokens**, and its third
 * user after the unit menu: `surface` on `line`, radius 14, 6px of padding,
 * rows at radius 9. What it does not borrow is the crimson check — **nothing
 * here is ever *selected***, so there is no current value for a check to mark
 * and the fill is free to mean highlight outright.
 *
 * > Sunk works here where it fails on the page ground. D45 found that a control
 * > on the ground hovering to `surface-alt` reads as disappearing, because that
 * > token *is* the ground's middle stop. A menu is a card, so sunk is a real
 * > step down from it — the rule generalises exactly as it was written.
 *
 * **440 wide in both menus.** On the sheet that is the name field's own width.
 * In the top bar the field is a banner — about 1221px at a 1372 column — and a
 * menu that wide would put a two-word item name in an acre of nothing, so
 * search takes 440 too and aligns to the field's left edge. It lands on exactly
 * one column of the item grid, which is the second reason: at 560 it covered
 * part of the neighbouring card and clipped a name mid-word.
 *
 * It renders whether it is open or not, because the live region has to outlive
 * the menu — a count announced from a node that is unmounting is not announced.
 */
export function SuggestMenu({
	open, groups, active, setActive, onPick, announced, label, id, matchLength, dark, theme,
}: Props) {
	const [shown, setShown] = useState(false);

	/*
	 * A frame late, so the transition has two states to run between. Keyed on
	 * `open` rather than on mount: the menu closes and reopens as you type past
	 * a query nothing matches, and it should fade in each time.
	 */
	useEffect(() => {
		if (! open) { setShown(false); return; }

		const frame = requestAnimationFrame(() => setShown(true));
		return () => cancelAnimationFrame(frame);
	}, [open]);

	let index = -1;

	return (
		<>
			<span role="status" aria-live="polite" style={SR_ONLY}>{announced}</span>

			{open && (
				<div
					id={id}
					role="listbox"
					aria-label={label}
					/*
					 * The field keeps focus, so a press inside the menu must not
					 * take it away — `pointerdown` is what blurs, and blur is what
					 * closes. Preventing it here is what lets a row be clicked at
					 * all.
					 */
					onPointerDown={(e) => e.preventDefault()}
					class={
						'left-0 top-full mt-2 w-full md:w-[440px] transition-all duration-[140ms] ease-out motion-reduce:transition-none '
						+ `${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'} `
						+ 'absolute z-30 p-1.5 rounded-[14px] bg-surface border border-line'
					}
					style={{ boxShadow: dark ? '0 14px 30px rgba(0, 0, 0, 0.55)' : '0 14px 30px rgba(36, 30, 23, 0.20)' }}
				>
					{groups.map((group, g) => (
						<div key={group.label}>
							{/*
							  * These get headings where the sort and unit menus get
							  * bare hairlines, and the difference is real: those
							  * group six sorts and fifteen units — variants of one
							  * thing. Here the groups are different *kinds of
							  * answer*, and which kind a row is changes what
							  * pressing it does. A hairline cannot say that.
							  */}
							{g > 0 && <span class="block h-px mx-3 my-[5px]" style={{ background: theme.divider }} />}
							<div
								class="px-3 pt-2.5 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.15em]"
								style={{ color: theme.textMuted }}
							>
								{group.label}
							</div>

							{group.rows.map((row) => {
								index += 1;
								const i = index;

								return (
									<Row
										key={row.id}
										row={row}
										on={i === active}
										onEnter={() => setActive(i)}
										onPick={() => onPick(row)}
										len={matchLength}
										dark={dark}
										theme={theme}
									/>
								);
							})}
						</div>
					))}
				</div>
			)}
		</>
	);
}

/**
 * The matched characters at 700, the rest at 400.
 *
 * **That single change is the whole explanation of the matching rule**, and it
 * costs nothing: typing `be` and seeing Ground **Be**ef and Black **Be**ans is
 * how you learn that a match is a prefix of any word rather than of the first.
 */
function Marked({ text, at, length }: { text: string; at: number; length: number }) {
	if (at < 0) return <>{text}</>;

	return (
		<>
			{text.slice(0, at)}
			<span class="font-bold">{text.slice(at, at + length)}</span>
			{text.slice(at + length)}
		</>
	);
}

function Row({ row, on, onEnter, onPick, len, dark, theme }: {
	row: SuggestRow;
	on: boolean;
	onEnter: () => void;
	onPick: () => void;
	len: number;
	dark: boolean;
	theme: Theme;
}) {
	/*
	 * One fill for the pointer and the keyboard cursor, driven from the index
	 * rather than from `:hover` — two treatments for one idea would let a
	 * pointer resting on row three and an arrow key sitting on row one paint
	 * the menu twice.
	 */
	const fill = on ? { background: theme.surfaceAlt } : undefined;

	if (row.kind === 'item') {
		const status = statusFor(row.item.qty, row.item.threshold, dark);
		const size = formatSize(row.item.size, row.item.unit);

		return (
			/*
			 * **One row shape for all three kinds**, and this is the one that
			 * moved to meet the other two. It was 56px and stacked — the name over
			 * `3 on hand · Pantry` — while a term row was a single 38px line with
			 * its scope and its number right-aligned. Two constructions inside one
			 * 440px menu read as two different kinds of control, and the stacked
			 * one was carrying its second line for a sentence rather than for a
			 * fact: *on hand* is what the number in that slot has always meant.
			 *
			 * So the item row is the term row with a status dot and a size in it:
			 * mark · name · **`Location · N`**, right-aligned in meta. **No
			 * chevron** — search's item row used to open that item's Edit sheet and
			 * carried one to say so; it fills the search field now, and nothing in
			 * either menu leaves the screen you are on.
			 */
			<button
				type="button"
				role="option"
				id={row.id}
				aria-selected={on}
				onClick={onPick}
				onPointerEnter={onEnter}
				class="flex items-center gap-2.5 w-full h-12 md:h-[38px] px-3 rounded-[9px] text-left"
				style={fill}
			>
				<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: status.dot }} />

				{/*
				  * The size rides with the name rather than taking the meta slot —
				  * at the shelf *"Butter, 1 lb"* is one phrase, which is the run
				  * list row's own rule. It is also the only place a size-only match
				  * can show why the row is here.
				  */}
				<span class="flex-1 min-w-0 truncate text-[15px]" style={{ color: theme.textStrong }}>
					<Marked text={row.item.name} at={row.at} length={len} />
					{size && (
						<span class="text-[12.5px] pl-1.5" style={{ color: theme.textMuted }}>
							<Marked text={size} at={row.sizeAt} length={len} />
						</span>
					)}
				</span>

				<span class="text-[12.5px] shrink-0" style={{ color: theme.textMuted }}>
					{row.place ? `${row.place} · ` : ''}{row.item.qty}
				</span>
			</button>
		);
	}

	if (row.kind === 'catalog') {
		return (
			<button
				type="button"
				role="option"
				id={row.id}
				aria-selected={on}
				onClick={onPick}
				onPointerEnter={onEnter}
				class="flex items-center w-full h-12 md:h-[38px] px-3 rounded-[9px] text-[15px] text-left"
				style={{ ...fill, color: theme.textStrong }}
			>
				{/* A word and nothing else. There is nothing else true of it yet. */}
				<span class="truncate"><Marked text={row.entry.name} at={row.at} length={len} /></span>
			</button>
		);
	}

	// A term. Its dot takes the **dark** variant in dark mode rather than the
	// light base — the Filter tab's drawn picker gets that backwards, and the
	// bug is not repeated here.
	const dot = themed(row.term.ink, dark).dot;

	return (
		<button
			type="button"
			role="option"
			id={row.id}
			aria-selected={on}
			onClick={onPick}
			onPointerEnter={onEnter}
			class="flex items-center gap-2.5 w-full h-12 md:h-[38px] px-3 rounded-[9px] text-left"
			style={fill}
		>
			<span class="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: dot }} />
			<span class="flex-1 min-w-0 truncate text-[15px]" style={{ color: theme.textStrong }}>
				<Marked text={row.term.name} at={row.at} length={len} />
			</span>
			<span class="text-[12.5px] shrink-0" style={{ color: theme.textMuted }}>
				{row.groupWord} · {row.count}
			</span>
		</button>
	);
}
