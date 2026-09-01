import { useEffect, useRef, useState } from 'preact/hooks';
import { ArrowRight, ChevronRight, ListChecks, X } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import {
	PAGE_BUTTON_PRIMARY, PAGE_FIELD, PAGE_ICON,
	PAGE_MENU_ROW_ON_SHEET, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';
import { BULK_MAX, countLines, parseList } from '../../shared/bulkEntry';
import type { ParsedLine } from '../../shared/bulkEntry';

/**
 * Paste your list — the desktop-shaped way past the adoption wall (D67).
 *
 * **It is the Add / Edit sheet, not a dialog**, and that is the whole of what
 * this component is: the same scrim, the same right-edge geometry, the same
 * gradient, the same header and the same sticky footer, with one field in it.
 * `PutAwaySheet` made the same move for the same reason — *nothing new is
 * drawn* — and the argument is stronger here, because this surface and the Add
 * sheet are **two answers to one question**. They are reached from the two
 * halves of one split button; a card floating in the middle of the screen and a
 * panel hinged to its right edge is that button telling you they are different
 * kinds of act, which they are not.
 *
 * **A dialog is a question and this is an entry surface.** *Destructive
 * actions* centres a confirm precisely because a confirm is a question and
 * centring keeps it out of the thumb zone the Add sheet owns — and the corollary
 * was there all along: something you *type into* belongs in that thumb zone,
 * which is where the app already puts the other way of typing an item in.
 *
 * **It reads a name, a count and a size, and nothing else.** A paste cannot know
 * which shelf a thing goes on or which shop it comes from — that is what *Set
 * for all* on the review is for. What it does know is on the line under the
 * micro-label, describing the parse rather than a syntax.
 *
 * **The primary counts what it will do.** *Read 24 lines*, so the press is not a
 * leap: the number is the same one the review's header band will carry.
 */
type Props = {
	open: boolean;
	/** Hands the parsed lines to the review. Nothing is written here. */
	onRead: (lines: ParsedLine[]) => void;
	/** The other route, from this sheet's own body. */
	onCommonItems: () => void;
	onClose: () => void;
	dark: boolean;
	theme: Theme;
};

export function PasteListSheet({ open, onRead, onCommonItems, onClose, dark, theme }: Props) {
	const [text, setText] = useState('');
	const fieldRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (! open) return;

		// The field empties on every open. A surface that hands back last week's
		// list is one that adds it twice.
		setText('');

		/*
		 * **The caret goes in the field, which is the Add sheet's rule rather than
		 * the Edit sheet's.** Adding is one next step into an empty field, so a
		 * caret is the next thing to do; editing opens on a whole item and nothing
		 * knows which part of it you came for. This screen is the first of those:
		 * there is exactly one field and nothing else to have come here for.
		 */
		fieldRef.current?.focus();
	}, [open]);

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			// Escape closes and nothing is read — the sheet's own bargain, and the
			// reason the header's `×` needs no confirmation beside it.
			if (e.key === 'Escape') onClose();
		}

		document.addEventListener('keydown', onKey);

		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (! open) return null;

	const lines = countLines(text);
	const capped = lines > BULK_MAX;

	return (
		<>
			<button
				onClick={onClose}
				class="fixed inset-0 z-40"
				style={{ background: 'rgba(36, 30, 23, 0.34)' }}
				aria-label="Close"
			/>

			<aside
				role="dialog"
				aria-label="Paste your list"
				class={
					/* The Add / Edit sheet's geometry exactly, for the reason its own comment gives: `dvh`, because `vh` is the URL-bar-hidden viewport and the footer is the decision. */
					/* No `outline-none` and no `tabIndex`: the other two sheets are focusable so they can catch the keyboard when nothing inside them should hold the caret. This one has a single field and the caret belongs in it. */
					'fixed z-50 flex flex-col '
					+ 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl '
					+ 'md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:max-h-none md:rounded-none'
				}
				style={{
					background: dark
						? 'radial-gradient(120% 60% at 100% 0%, #2E271C 0%, #241E16 100%)'
						: 'radial-gradient(120% 60% at 100% 0%, #FBF6EC 0%, #F5EDDF 100%)',
					borderLeft: `1px solid ${theme.borderStrong}`,
					boxShadow: '-20px 0 50px rgba(36, 30, 23, 0.22)',
				}}
			>
				{/* Mobile grabber. On desktop the sheet has an edge and does not need one. */}
				<span class="md:hidden mx-auto mt-2 mb-1 w-9 h-1 rounded-full shrink-0" style={{ background: theme.border }} />

				<div
					class="flex items-center justify-between gap-3 shrink-0 h-[58px] md:h-[68px] px-4 md:px-5"
					style={{ borderBottom: `1px solid ${theme.divider}` }}
				>
					<span class="font-disp text-[21px] font-semibold tracking-[-0.01em] truncate" style={{ color: theme.textStrong }}>
						Paste your list
					</span>
					<button
						onClick={onClose}
						class={`flex items-center justify-center w-11 h-11 -mr-2.5 shrink-0 ${PAGE_ICON}`}
						aria-label="Close"
					>
						<X size={19} />
					</button>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto flex flex-col p-4 md:p-5">
					{/* The sheet's own section grammar: micro-label, content, hint. */}
					<p class="text-label font-bold uppercase tracking-[0.15em] shrink-0" style={{ color: theme.textMuted }}>
						Your list
					</p>

					{/*
					  * **The parse is described above the field, not below it.** Every
					  * other hint on this board reports on something already typed; this
					  * one is a rule you need before the first line, and a sentence under
					  * a 220px box is read after the typing it was meant to shape.
					  */}
					<p class="text-[12.5px] leading-[1.45] pt-1.5 shrink-0" style={{ color: theme.textMuted }}>
						One item per line. A number after the name is how many you have; a number with a unit is the size.
					</p>

					{/*
					  * **The field fills the sheet on desktop and is fixed on the phone.**
					  * A 200px box in a full-height panel is a dialog that has been moved
					  * rather than a sheet; below `md` the panel is content-sized, so
					  * there is nothing to fill and the height has to be stated.
					  */}
					<div class="relative mt-2.5 h-[220px] md:h-auto md:flex-1 md:min-h-[240px]">
						<textarea
							ref={fieldRef}
							value={text}
							onInput={(e) => setText(e.currentTarget.value)}
							placeholder={'Basmati Rice, 5 lb, 2\nChickpeas 15 oz, 6\nChicken Thighs 4\nSour Cream 16 oz'}
							class={`w-full h-full px-3.5 py-3 pb-9 rounded-[11px] text-[15px] leading-[1.6] resize-none ${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`}
							aria-label="Your list, one item per line"
							spellcheck={false}
						/>
						{/*
						  * The count sits **inside** the field's own bottom-right corner
						  * rather than under it: it is a fact about what has been typed, and
						  * a line of its own below the box reads as a caption about the
						  * sheet.
						  */}
						<span
							class="absolute right-3.5 bottom-3 text-[12.5px] pointer-events-none"
							style={{ color: theme.textMuted }}
						>
							{lines === 1 ? '1 line' : `${lines} lines`}
						</span>
					</div>

					{/*
					  * **No silent cap.** `parseList` stops at `BULK_MAX` and the one thing
					  * that must not happen is the review quietly holding 200 of 240 — a
					  * table that says *24 lines* when 24 is all it kept is the same lie as
					  * a truncated search result.
					  */}
					{capped && (
						<p class="text-[12.5px] leading-[1.45] pt-2 shrink-0" style={{ color: theme.textMuted }}>
							{`Only the first ${BULK_MAX} will be read.`}
						</p>
					)}

					{/*
					  * **The other route lives in this sheet's body**, under the board's own
					  * section rule, so the chevron menu is not the only door to the
					  * checklist — and so that somebody who opened this with nothing to
					  * paste has somewhere to go that is not Cancel.
					  */}
					<span
						class="block h-px mt-[18px] mb-[18px] md:mt-[22px] md:mb-5 shrink-0"
						style={{ background: theme.divider }}
					/>

					<button
						onClick={onCommonItems}
						class={`${PAGE_MENU_ROW_ON_SHEET} shrink-0 -mx-2.5`}
						/*
						 * The width is **inline**, because `PAGE_MENU_ROW_ON_SHEET`
						 * already carries `w-full` and two utilities for one property
						 * is a coin toss settled by sheet order — `.w-full` lands at
						 * 20814 and `.w-[calc(100%+20px)]` at 20565, so the class lost
						 * and this row has been 20px short of its own negative margins.
						 * An inline value beats any class outright, which is the same
						 * answer the fixed menus' measured height takes (D68).
						 */
						style={{ color: theme.text, width: 'calc(100% + 20px)' }}
					>
						<ListChecks size={15} strokeWidth={2} style={{ color: theme.textMuted }} />
						<span class="flex-1 min-w-0 truncate">Nothing to paste? Start from common items</span>
						<ChevronRight size={15} style={{ color: theme.textFaint }} />
					</button>
				</div>

				{/* Sticky: the sheet scrolls, the decision does not. */}
				<div
					class="mt-auto shrink-0 flex items-center justify-end gap-2.5 h-20 md:h-[76px] px-4 md:px-5"
					style={{ borderTop: `1px solid ${theme.divider}` }}
				>
					<button onClick={onClose} class={`h-11 px-[18px] rounded-[13px] text-[15px] font-semibold ${PAGE_ICON}`}>
						Cancel
					</button>
					{/*
					  * **An arrow, not the sheet's check.** Every other primary on this
					  * board writes something, and the check is what says so. This one
					  * writes nothing at all — it hands the lines to the review, which is
					  * the screen that asks. Wearing a check here would promise the one
					  * thing D67 is built around not doing.
					  *
					  * Nothing to read is nothing to press, and the reason is on screen
					  * rather than off it: the field the button counts is directly above,
					  * and empty. `PAGE_BUTTON_PRIMARY` fades rather than recolouring —
					  * `PAGE_HELD`'s rule, one board over.
					  */}
					<button
						onClick={() => onRead(parseList(text))}
						disabled={lines === 0}
						class={`flex items-center gap-2.5 h-11 px-5 rounded-[13px] text-[15px] font-semibold ${PAGE_BUTTON_PRIMARY}`}
						style={{ background: theme.inkBg, color: theme.inkText }}
					>
						{lines === 1 ? 'Read 1 line' : `Read ${Math.min(lines, BULK_MAX)} lines`}
						<ArrowRight size={17} strokeWidth={2.4} />
					</button>
				</div>
			</aside>
		</>
	);
}
