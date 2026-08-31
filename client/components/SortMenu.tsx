import { useEffect, useRef } from 'preact/hooks';
import { Check, ChevronDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import {
	PAGE_BUTTON_QUIET, PAGE_BUTTON_QUIET_ON, PAGE_FOCUS, PAGE_MENU_ROW,
} from '../lib/controlStyles';

export type SortKey = 'default' | 'restock' | 'name-asc' | 'name-desc' | 'qty-asc' | 'qty-desc';

/**
 * Six options in three groups, split by hairlines rather than headings — at six
 * rows a group label costs more than it explains.
 *
 * `group` is the break *before* this row. "Recently added" is the default and
 * "Needs restocking" sits directly under it: that pair is the priority group,
 * and everything below is a plain ordering.
 */
/**
 * The trigger at rest, and open.
 *
 * Both states have to be class strings: they were inline styles, and an inline
 * `background` overrides any `hover:` rule, so the control had no hover at all
 * while every other button on the page ground did. The hover destination is
 * `PAGE_BUTTON_OUTLINE`'s, one border step short of it — open keeps
 * `line-strong` to itself, and the chevron's flip carries the rest.
 *
 * The resting half is shared with row 2's other quiet control, *Back to items*,
 * and lives in `controlStyles` — two controls a gap apart wearing the same
 * rest and two different hovers is exactly the kind of drift this app writes
 * down once.
 */
const TRIGGER = PAGE_BUTTON_QUIET;
const TRIGGER_ON = PAGE_BUTTON_QUIET_ON;

export const SORT_OPTIONS: { key: SortKey; label: string; short: string; group?: boolean }[] = [
	{ key: 'default', label: 'Recently added', short: 'Recent' },
	{ key: 'restock', label: 'Needs restocking', short: 'Restock' },
	{ key: 'name-asc', label: 'Name · A to Z', short: 'A–Z', group: true },
	{ key: 'name-desc', label: 'Name · Z to A', short: 'Z–A' },
	{ key: 'qty-asc', label: 'Quantity · fewest first', short: 'Fewest', group: true },
	{ key: 'qty-desc', label: 'Quantity · most first', short: 'Most' },
];

type Props = {
	open: boolean;
	setOpen: (open: boolean) => void;
	sortBy: SortKey;
	setSortBy: (key: SortKey) => void;
	/**
	 * Short of room — stand 44px rather than 40. **Geometry only.**
	 *
	 * It used to switch the trigger's whole form; the short form is the only
	 * form now. Row 2's other controls read the same flag, so the trigger, the
	 * exit, the segment and this share one height at both widths.
	 */
	compact: boolean;
	theme: Theme;
};

/**
 * The sort control.
 *
 * The trigger **names the current choice**, so the menu only ever gets opened
 * to change it — the old icon-only button meant the only way to find out how
 * the list was ordered was to open the thing that changes it.
 *
 * **It names it the short way at every width now** — `Restock`, not
 * `Sort · Needs restocking`. The long form carried a glyph and the word *Sort*
 * on top of the full option name, and all three are things the control can be
 * read without: a chevron says it opens, its position at the row's end says what
 * kind of control it is, and the option names are unambiguous on their own. The
 * full name survives in `aria-label` and on the menu's own rows, which is where
 * a word that long is actually read.
 *
 * It stays a popover at every size rather than becoming a sheet on mobile; six
 * rows do not earn one. They just grow to 44px.
 */
export function SortMenu({ open, setOpen, sortBy, setSortBy, compact, theme }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const current = SORT_OPTIONS.find((o) => o.key === sortBy) ?? SORT_OPTIONS[0];

	useEffect(() => {
		if (! open) return;

		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); }
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
	}, [open, setOpen]);

	return (
		<div class="relative" ref={ref}>
			<button
				onClick={() => setOpen(! open)}
				class={`inline-flex items-center gap-2 ${compact ? 'h-11 px-2.5' : 'h-10 px-3'} rounded-[11px] text-[13.5px] border transition-colors active:translate-y-px ${PAGE_FOCUS} ${open ? TRIGGER_ON : TRIGGER}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`Sort: ${current.label}`}
			>
				<span class="font-semibold">{current.short}</span>
				<ChevronDown size={15} style={{ color: theme.textFaint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
			</button>

			{open && (
				<div
					role="menu"
					class="absolute right-0 top-full mt-1.5 z-30 w-[248px] p-1.5 rounded-[14px]"
					style={{ background: theme.surface, border: `1px solid ${theme.border}`, boxShadow: '0 14px 30px rgba(36, 30, 23, 0.20)' }}
				>
					{SORT_OPTIONS.map((opt) => {
						const on = sortBy === opt.key;

						return (
							<div key={opt.key}>
								{opt.group && <span class="block h-px mx-2.5 my-[5px]" style={{ background: theme.border }} />}
								<button
									role="menuitemradio"
									aria-checked={on}
									onClick={() => { setSortBy(opt.key); setOpen(false); }}
									/* `PAGE_MENU_ROW`, which this was character for
									  * character apart from the focus ring: `PAGE_FOCUS`
									  * offsets against `canvas`, and these rows are
									  * inside a `surface` popover. Two menus a click
									  * apart wearing the same row and two different
									  * rings is the drift this app writes down once. */
									class={PAGE_MENU_ROW}
									style={{ color: on ? theme.textStrong : theme.text, fontWeight: on ? 600 : 400 }}
								>
									<span class="flex-1 min-w-0 truncate">{opt.label}</span>
									{/* A check, not a fill — so hover still reads on the chosen row. */}
									{on && <Check size={15} strokeWidth={2.4} style={{ color: '#BE3346' }} />}
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
