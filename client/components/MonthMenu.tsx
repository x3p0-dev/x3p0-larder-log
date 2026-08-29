import { useEffect, useRef } from 'preact/hooks';
import { Check, ChevronDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { useDismiss } from '../hooks/useDismiss';
import {
	PAGE_FIELD, PAGE_MENU, PAGE_MENU_ROW, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';
import { MONTHS, monthName } from '../../shared/season';

type Props = {
	/** A stored month, `'1'`–`'12'`, or `''` for none. */
	value: string;
	onChange: (month: string) => void;
	/** *From* or *To* — the accessible name, since the visible label is the month. */
	label: string;
	open: boolean;
	setOpen: (open: boolean) => void;
	dark: boolean;
	theme: Theme;
};

/**
 * One end of a season.
 *
 * **`UnitMenu`'s construction, with twelve rows and no abbreviations.** Same
 * field trigger — the ghost treatment is for a control on the page ground and
 * this one sits on a form — same 6px padding, same radius-9 rows, same crimson
 * check rather than a fill so a hovered row still reads.
 *
 * Twelve rows is 400px of menu, so it caps and scrolls, and it opens **scrolled
 * to the month you are on** for the same reason the unit menu does: a menu that
 * opens at January when the answer is September is a scroll before it is a
 * choice.
 *
 * **There is no *no month* row**, unlike the unit menu's *No size*. A season is
 * a pair that is never half-set, so clearing one end would have to clear the
 * other — a control on one trigger reaching across to the other. The panel
 * carries that instead.
 */
export function MonthMenu({ value, onChange, label, open, setOpen, dark, theme }: Props) {
	const box = useDismiss<HTMLDivElement>(open, () => setOpen(false));
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const currentRef = useRef<HTMLButtonElement>(null);

	const current = monthName(value);

	useEffect(() => {
		if (! open) return;

		currentRef.current?.scrollIntoView({ block: 'nearest' });
	}, [open]);

	function pick(month: string) {
		onChange(month);
		setOpen(false);
		triggerRef.current?.focus();
	}

	/**
	 * Arrows, Home/End and type-ahead, read off the DOM.
	 *
	 * The unit menu's handler unchanged — the rows are already in menu order
	 * there, and an index in state would be a second ordering to keep in
	 * agreement with the first. Type-ahead earns its keep here more than it does
	 * on units: `j` walks January → June → July.
	 */
	function onKey(e: KeyboardEvent) {
		const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
		if (! rows.length) return;

		const at = rows.indexOf(document.activeElement as HTMLButtonElement);

		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			const next = at === -1 ? (step === 1 ? 0 : rows.length - 1) : (at + step + rows.length) % rows.length;
			rows[next]?.focus();
			return;
		}

		if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			(e.key === 'Home' ? rows[0] : rows[rows.length - 1])?.focus();
			return;
		}

		if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return;

		const letter = e.key.toLowerCase();
		// Wrap past the focused row, so `j` twice walks January → June.
		const order = [...rows.slice(at + 1), ...rows.slice(0, at + 1)];
		const hit = order.find((r) => (r.dataset.label ?? '').toLowerCase().startsWith(letter));

		if (hit) { e.preventDefault(); hit.focus(); }
	}

	return (
		<div class="relative flex-1 min-w-0" ref={box} onKeyDown={onKey}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(! open)}
				role="combobox"
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label={label}
				class={
					'flex items-center justify-between w-full h-11 pl-3.5 pr-3 rounded-[11px] text-[15px] ' +
					`${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`
				}
				style={{ color: current ? theme.textStrong : theme.textMuted }}
			>
				<span class="truncate">{current || 'Month'}</span>
				<ChevronDown
					size={13}
					class="shrink-0"
					style={{ color: theme.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
				/>
			</button>

			{open && (
				<div
					ref={listRef}
					role="listbox"
					aria-label={label}
					class={`${PAGE_MENU} left-0 top-full mt-1.5 w-[180px] max-h-[320px] overflow-y-auto`}
					style={{ boxShadow: dark ? '0 14px 30px rgba(0, 0, 0, 0.55)' : '0 14px 30px rgba(36, 30, 23, 0.20)' }}
				>
					{MONTHS.map((name, i) => {
						const key = String(i + 1);
						const on = key === value;

						return (
							<button
								key={key}
								ref={on ? currentRef : undefined}
								type="button"
								role="option"
								aria-selected={on}
								data-label={name}
								onClick={() => pick(key)}
								class={PAGE_MENU_ROW}
								style={{ color: on ? theme.textStrong : theme.text, fontWeight: on ? 600 : 400 }}
							>
								<span class="flex-1 min-w-0 truncate">{name}</span>
								{on && <Check size={14} strokeWidth={2.4} style={{ color: theme.accent }} />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
