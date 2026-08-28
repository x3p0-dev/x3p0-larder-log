import { Fragment } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Check, ChevronDown } from 'lucide-preact';

import type { Theme } from '../lib/theme';
import { useDismiss } from '../hooks/useDismiss';
import {
	PAGE_FIELD, PAGE_MENU, PAGE_MENU_ROW, PANEL_FIELD_HALO, PANEL_FIELD_HALO_DARK,
} from '../lib/controlStyles';
import { UNITS, unitFor } from '../../shared/size';

type Props = {
	/** The stored unit key, or `''` for no size. */
	value: string;
	/** `''` clears the pair; anything else is a unit key. */
	onChange: (key: string) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
	dark: boolean;
	theme: Theme;
};

/**
 * The unit half of the size row.
 *
 * **The trigger is a field, not a ghost.** The sort trigger's bare-label
 * treatment is for a control sitting on the page ground; this one sits on a
 * form, among five other bordered controls, and the one thing the sheet's
 * redesign is built on is that they all look like the same object.
 *
 * The menu itself is the sort menu's construction unchanged — 200px, 6px of
 * padding, 36px rows at radius 9, groups split by hairlines rather than
 * headings, and a **crimson check on the current row, never a fill**. With a
 * fill doing both jobs a hovered row looks selected.
 *
 * **The abbreviation sits where the check goes.** It is how you learn that
 * *Quart* prints as *qt* before committing to it, and it costs no vertical
 * space because the check's slot was already reserved.
 */
export function UnitMenu({ value, onChange, open, setOpen, dark, theme }: Props) {
	const box = useDismiss<HTMLDivElement>(open, () => setOpen(false));
	const triggerRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const currentRef = useRef<HTMLButtonElement>(null);

	const current = unitFor(value);

	/*
	 * Fifteen rows is 593px of menu and nothing in this app opens a panel half
	 * that tall, so it caps at 320 and scrolls — which is only usable if it
	 * opens showing the unit you are on. `block: 'nearest'` keeps a row that is
	 * already in view exactly where it is rather than centring it.
	 */
	useEffect(() => {
		if (! open) return;

		currentRef.current?.scrollIntoView({ block: 'nearest' });
	}, [open]);

	function pick(key: string) {
		onChange(key);
		setOpen(false);
		triggerRef.current?.focus();
	}

	/**
	 * Arrows, Home/End and type-ahead, over whatever rows the menu has drawn.
	 *
	 * Read off the DOM rather than from an index in state: the rows are already
	 * in menu order there, and an index would be a second ordering to keep in
	 * agreement with the first.
	 */
	function onKey(e: KeyboardEvent) {
		const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
		if (! rows.length) return;

		const at = rows.indexOf(document.activeElement as HTMLButtonElement);

		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			// From the trigger (`at` is -1) Down lands on the first row and Up on
			// the last, which is what every menu in the app already does.
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

		// Wrap the search past the focused row, so pressing `p` twice walks Pack
		// → Pint rather than sticking on the first match.
		const order = [...rows.slice(at + 1), ...rows.slice(0, at + 1)];
		const hit = order.find((r) => (r.dataset.label ?? '').toLowerCase().startsWith(letter));

		if (hit) { e.preventDefault(); hit.focus(); }
	}

	return (
		<div class="relative" ref={box} onKeyDown={onKey}>
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(! open)}
				role="combobox"
				aria-expanded={open}
				aria-haspopup="listbox"
				aria-label="Unit"
				class={
					'flex items-center justify-between w-[148px] h-[46px] md:w-[140px] md:h-11 pl-3.5 pr-3 rounded-[11px] text-[15px] ' +
					`${PAGE_FIELD} ${dark ? PANEL_FIELD_HALO_DARK : PANEL_FIELD_HALO}`
				}
				style={{ color: current ? theme.textStrong : theme.textMuted }}
			>
				{/* Meta rather than faint at rest: faint reads 3.18:1 light and 3.07:1 dark on this surface. */}
				<span class="truncate">{current ? current.label : 'Unit'}</span>
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
					aria-label="Unit"
					class={`${PAGE_MENU} left-0 top-full mt-1.5 w-[200px] max-h-[320px] overflow-y-auto`}
					style={{ boxShadow: dark ? '0 14px 30px rgba(0, 0, 0, 0.55)' : '0 14px 30px rgba(36, 30, 23, 0.20)' }}
				>
					{/*
					  * **`No size` is why the row carries no separate `×`.** One
					  * control both sets the pair and clears it, and clearing is
					  * where the pair's other half goes with it.
					  */}
					<Row label="No size" abbr="" on={! current} onPick={() => pick('')} refFor={! current ? currentRef : undefined} theme={theme} />

					{UNITS.map((u, i) => (
						<Fragment key={u.key}>
							{/* A break before each group, and before the first unit. */}
							{(i === 0 || UNITS[i - 1].group !== u.group) && (
								<span class="block h-px mx-2.5 my-[5px]" style={{ background: theme.divider }} />
							)}
							<Row
								label={u.label}
								abbr={u.abbr}
								on={u.key === value}
								onPick={() => pick(u.key)}
								refFor={u.key === value ? currentRef : undefined}
								theme={theme}
							/>
						</Fragment>
					))}
				</div>
			)}
		</div>
	);
}

function Row({ label, abbr, on, onPick, refFor, theme }: {
	label: string;
	abbr: string;
	on: boolean;
	onPick: () => void;
	refFor?: preact.RefObject<HTMLButtonElement>;
	theme: Theme;
}) {
	return (
		<button
			ref={refFor}
			type="button"
			role="option"
			aria-selected={on}
			data-label={label}
			onClick={onPick}
			class={PAGE_MENU_ROW}
			style={{ color: on ? theme.textStrong : theme.text, fontWeight: on ? 600 : 400 }}
		>
			<span class="flex-1 min-w-0 truncate">{label}</span>
			{on
				? <Check size={14} strokeWidth={2.4} style={{ color: theme.accent }} />
				: abbr && <span class="text-[12.5px] shrink-0" style={{ color: theme.textMuted }}>{abbr}</span>}
		</button>
	);
}
