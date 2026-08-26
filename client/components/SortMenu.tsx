import { useEffect, useRef } from 'preact/hooks';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { PAGE_FOCUS } from '../lib/controlStyles';

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
 */
const TRIGGER =
	'bg-transparent border-transparent text-ink-body hover:bg-surface-alt hover:border-line hover:text-ink';
const TRIGGER_ON =
	'bg-surface-alt border-line-strong text-ink';

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
	/** Short of room — drop the glyph and the word "Sort", and shorten the label. */
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
				class={`inline-flex items-center gap-2 h-10 ${compact ? 'px-2.5' : 'px-3'} rounded-[11px] text-[13.5px] border transition-colors active:translate-y-px ${PAGE_FOCUS} ${open ? TRIGGER_ON : TRIGGER}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`Sort: ${current.label}`}
			>
				{/*
				  * The label alone carries it when space is short; "Sort" is the
				  * widest word here and the one the chevron already implies.
				  */}
				{! compact && <ArrowUpDown size={15} style={{ color: theme.textFaint }} />}
				{! compact && <span style={{ color: theme.textFaint }}>Sort</span>}
				<span class="font-semibold">{compact ? current.short : current.label}</span>
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
									class={`flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left transition-colors hover:bg-surface-alt ${PAGE_FOCUS}`}
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
