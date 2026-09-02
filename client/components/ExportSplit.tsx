import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronDown, Download } from 'lucide-preact';

import { DrawerMenu } from './DrawerMenu';
import type { Theme } from '../lib/theme';
import { mixHex } from '../lib/theme';
import { DRAWER_MENU_ROW, DRAWER_SPLIT, PAGE_SPLIT_HALF } from '../lib/controlStyles';
import type { ExportFormat } from '../../shared/exportData';

/**
 * *Export the pantry*, with the other format behind a chevron (D75).
 *
 * **The app's second split control, and it is `AddMenu`'s construction on the
 * drawer's raised card.** Pressing the label hands over a CSV; pressing the
 * chevron opens the one other file this export can be. Two buttons side by side
 * were built first and this replaces them: a pair reads as two features, and a
 * split reads as one control with a default — which is what an export is.
 *
 * **The default is absent from the menu**, which is `AddMenu`'s own rule: the
 * label already does it, and a menu repeating its own button's action is a
 * second way to do the same thing three pixels away. So the menu is one row.
 * That is thin and it is honest — there is exactly one alternative, and a row
 * for the thing you can already press would only make it look like two.
 *
 * **The label names the format it will hand over.** `CSV` rather than *Export*:
 * the section header a few pixels left already says what the control is for, so
 * the button's own word is free to say *which file*, and the state is then
 * readable without opening the thing that changes it — the sort trigger's rule.
 *
 * **`DrawerMenu`, not `PAGE_MENU`.** The reverse is the mistake that component
 * records in so many words: the brightest thing on the page opening over the
 * darkest panel in the app.
 */
export function ExportSplit({ onExport, theme }: {
	onExport: (format: ExportFormat) => void;
	theme: Theme;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const labelRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const d = theme.drawer;

	useEffect(() => {
		if (! open) return;

		// Focus lands in the menu, because the control it came from is not
		// reachable: the chevron is `tabIndex={-1}` so the split keeps one focus
		// stop, so there is nowhere for a keyboard user to be otherwise.
		menuRef.current?.querySelector('button')?.focus();

		function onKey(e: KeyboardEvent) {
			if (e.key !== 'Escape') return;

			setOpen(false);
			labelRef.current?.focus();
		}

		function onDown(e: PointerEvent) {
			if (! ref.current?.contains(e.target as Node)) setOpen(false);
		}

		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onDown);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onDown);
		};
	}, [open]);

	/**
	 * **Derived, not looked up, and it only has one direction to go.** The fill
	 * is `drawer.ink` — cream — and the drawer is dark in both themes, so away
	 * from the ground (D45) is *darker* in both. `AddMenu` needs a light branch
	 * because its ground flips; this one cannot.
	 */
	const hover = mixHex(d.ink, '#000000', 0.07);
	const press = mixHex(d.ink, '#000000', 0.13);

	return (
		<div class="relative shrink-0" ref={ref}>
			<div
				class={`${DRAWER_SPLIT} h-8 rounded-[10px]`}
				style={{
					background: d.ink,
					color: '#241E17',
					'--split-hover': hover,
					'--split-press': press,
				}}
			>
				<button
					ref={labelRef}
					onClick={() => onExport('csv')}
					onKeyDown={(e) => {
						// The split-button pattern's own answer to having one focus
						// stop: down opens the menu from the half you can reach.
						if (e.key !== 'ArrowDown') return;

						e.preventDefault();
						setOpen(true);
					}}
					class={`flex items-center gap-1.5 pl-3 pr-2.5 text-[13.5px] font-semibold outline-none ${PAGE_SPLIT_HALF}`}
					aria-keyshortcuts="ArrowDown"
					aria-label="Export the pantry as CSV"
				>
					<Download size={14} /> CSV
				</button>

				{/*
				  * Inset top and bottom rather than full height, so the two halves
				  * read as one shape with a seam in it — `AddMenu`'s rule at this
				  * control's smaller height, so the inset is 7px rather than 13.
				  */}
				<span class="self-stretch w-px my-[7px] shrink-0" style={{ background: '#241E17', opacity: 0.34 }} />

				<button
					tabIndex={-1}
					onClick={() => setOpen((o) => ! o)}
					class={`flex items-center justify-center shrink-0 w-7 outline-none ${PAGE_SPLIT_HALF}`}
					aria-haspopup="menu"
					aria-expanded={open}
					aria-label="Other export formats"
				>
					<ChevronDown
						size={13}
						strokeWidth={2.6}
						style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
					/>
				</button>
			</div>

			{open && (
				<div ref={menuRef}>
					{/*
					  * Right-aligned and opening **upward**: the export row is the last
					  * thing in the Settings pane, so a menu dropping below it would
					  * open past the foot of the drawer — the pinned bar's reasoning in
					  * `AddMenu`, arrived at from the other end of the column.
					  */}
					<DrawerMenu
						label="Other export formats"
						width="204px"
						place="right-0 bottom-full mb-1.5"
						theme={theme}
					>
						<button
							role="menuitem"
							onClick={() => { setOpen(false); onExport('json'); }}
							class={`flex items-center gap-2.5 w-full h-[38px] px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`}
						>
							Export as JSON
						</button>
					</DrawerMenu>
				</div>
			)}
		</div>
	);
}
