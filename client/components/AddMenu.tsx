import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronDown, ClipboardList, ListChecks, Plus } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { mixHex } from '../lib/theme';
import { PAGE_MENU, PAGE_MENU_ROW, PAGE_SPLIT, PAGE_SPLIT_HALF } from '../lib/controlStyles';

/**
 * The primary, with a chevron on it — bulk entry's way in (D67).
 *
 * **Pressing the label opens the Add sheet exactly as it does today; pressing
 * the chevron opens a menu holding the other routes.** The Add sheet itself
 * carries none of this, which is the whole point: three rounds went into
 * fitting *many* into the sheet — a ghost row under the header, a
 * `One item / A list` segment in it, a footer link — and all three lost to the
 * same objection once it was named. **The sheet is for one item; the button is
 * for choosing.**
 *
 * **The default is deliberately absent from the menu.** Pressing the label
 * already does it, and a menu that repeats its own button's action is a second
 * way to do the same thing three pixels away.
 */

export type AddRoute = 'paste' | 'common';

type Props = {
	/** The label half — the ordinary Add sheet. */
	onAdd: () => void;
	onRoute: (route: AddRoute) => void;
	/**
	 * `bar` is mobile's pinned primary, which is where the split lives at 390 —
	 * see the note on `SplitPrimary` below. `inline` is row 1 on desktop.
	 */
	variant: 'inline' | 'bar';
	theme: Theme;
};

const ROUTES: { key: AddRoute; label: string; icon: typeof ClipboardList }[] = [
	{ key: 'paste', label: 'Paste a list', icon: ClipboardList },
	{ key: 'common', label: 'Start from common items', icon: ListChecks },
];

export function AddMenu({ onAdd, onRoute, variant, theme }: Props) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const labelRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

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

	const bar = variant === 'bar';

	/**
	 * **The hover is derived, not looked up, and it has to answer both themes.**
	 *
	 * The design gives `#332B22`, which is light's `drawer.raised` — one step
	 * lighter than the ink fill, the same move the drawer's own ghost hover
	 * makes. That token is no use in dark, where the primary is *cream* on a
	 * near-black ground: away from the ground there means darker, not lighter
	 * (D45). So both come out of one expression, and the light end lands within
	 * three units of the number the design names.
	 */
	const hover = mixHex(theme.inkBg, theme.dark ? '#000000' : '#ffffff', 0.07);
	const press = mixHex(theme.inkBg, theme.dark ? '#000000' : '#ffffff', 0.13);

	return (
		<div class={bar ? 'relative' : 'relative shrink-0 hidden md:block'} ref={ref}>
			<div
				class={`${PAGE_SPLIT} ${bar ? 'h-[54px] rounded-2xl' : 'h-[50px] rounded-[15px]'}`}
				style={{
					background: theme.inkBg,
					color: theme.inkText,
					'--split-hover': hover,
					'--split-press': press,
				}}
			>
				<button
					ref={labelRef}
					onClick={onAdd}
					onKeyDown={(e) => {
						// The split-button pattern's own answer to having one focus
						// stop: down opens the menu from the half you can reach.
						if (e.key !== 'ArrowDown') return;

						e.preventDefault();
						setOpen(true);
					}}
					class={`flex items-center justify-center gap-2.5 text-[15px] font-semibold outline-none ${bar ? 'flex-1' : 'pl-[20px] pr-4'} ${PAGE_SPLIT_HALF}`}
					aria-keyshortcuts="ArrowDown"
				>
					<Plus size={bar ? 18 : 17} strokeWidth={2.4} /> Add item
				</button>

				{/*
				  * Inset top and bottom rather than full height, so the two halves
				  * read as one shape with a seam in it. It is `inkText` at low
				  * alpha rather than the design's `#6F6049`, which is a light-theme
				  * literal and would be invisible on the cream fill dark paints.
				  */}
				<span class="self-stretch w-px my-[13px] shrink-0" style={{ background: theme.inkText, opacity: 0.34 }} />

				<button
					tabIndex={-1}
					onClick={() => setOpen((o) => ! o)}
					class={`flex items-center justify-center shrink-0 w-11 outline-none ${PAGE_SPLIT_HALF}`}
					aria-haspopup="menu"
					aria-expanded={open}
					aria-label="More ways to add"
				>
					<ChevronDown
						size={14}
						strokeWidth={2.6}
						style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
					/>
				</button>
			</div>

			{open && (
				<div
					ref={menuRef}
					role="menu"
					aria-label="More ways to add"
					/*
					 * Right-aligned to the button's right edge and 8px clear of it:
					 * the control sits at the end of row 1, so a left-aligned menu
					 * would hang off the column. The pinned bar's menu opens
					 * *upward* for the same reason — there is nothing below it.
					 */
					class={`${PAGE_MENU} right-0 w-[248px] ${bar ? 'bottom-full mb-2' : 'top-full mt-2'}`}
					style={{ boxShadow: '0 14px 30px rgba(36, 30, 23, 0.20)' }}
				>
					{ROUTES.map(({ key, label, icon: Icon }) => (
						<button
							key={key}
							role="menuitem"
							/*
							 * It closes on a pick: each row is a choice made once, which
							 * is the household switcher's rule rather than the rail's
							 * quick-filter one.
							 */
							onClick={() => { setOpen(false); onRoute(key); }}
							/*
							 * The sort menu's row, **minus the check**. Nothing here is
							 * a current value — these are two actions — so the hover
							 * fill is free to mean hover, which is the one thing the
							 * sort menu's own rule says a fill cannot do when it is
							 * also marking selection.
							 */
							class={PAGE_MENU_ROW}
							style={{ color: theme.text }}
						>
							<Icon size={15} strokeWidth={2} style={{ color: theme.textMuted }} />
							<span class="flex-1 min-w-0 truncate">{label}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
