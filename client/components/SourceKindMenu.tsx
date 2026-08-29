import { Check, Sprout, CookingPot, ShoppingCart } from 'lucide-preact';

import { DrawerMenu } from './DrawerMenu';
import { useDismiss } from '../hooks/useDismiss';
import type { Theme } from '../lib/theme';
import { DRAWER_KIND, DRAWER_MENU_ROW, PAGE_KIND, PAGE_MENU, PAGE_MENU_ROW } from '../lib/controlStyles';
import type { SourceKind } from '../../shared/source';
import { SOURCE_KINDS, SOURCE_KIND_LABELS } from '../../shared/source';

/**
 * The glyph for a kind, and the one place the three are named in pictures.
 *
 * Exported because the run list's bands and its segment draw the same three,
 * and a band whose glyph disagreed with the menu row that produced it would be
 * two answers to one question.
 */
export const SOURCE_KIND_ICONS: Record<SourceKind, typeof ShoppingCart> = {
	shop: ShoppingCart,
	grow: Sprout,
	make: CookingPot,
};

/**
 * Setting a source's kind — shop, grow or make (D58).
 *
 * **This is `RoleMenu` with different words in it.** Three rows on the drawer's
 * own menu surface, radius 9, the current one at 600 with a crimson check
 * rather than a fill, and a trigger that takes the cream open state. Nothing
 * new is drawn, which is most of the argument for the kind living on the term:
 * one glyph in one panel and a menu that already existed.
 *
 * The trigger is the **glyph itself** rather than a word, because the row it
 * sits in is 340px wide and already spends its width on a swatch, a name field
 * and a trash. A shop's cart sits at the drawer's rest colour and grow and make
 * brighten to `ink` — so a glance down the panel says which rows are not shops
 * without reading any of them.
 *
 * Nothing here is disabled and nothing warns: changing a kind moves the source
 * between bands on the run list and changes nothing about any item.
 *
 * **It is on two surfaces now**, because a source's kind is chosen when the
 * source is *made* and not only afterwards — and one of the three places you
 * can make one is the item sheet, on cream. That is `TermRow`'s own `onDark`
 * split and `panelSkin`'s: one construction re-skinned, never a second control
 * that happens to look similar. The dark half is untouched.
 */
export function SourceKindMenu({
	open, setOpen, name, kind, onChange, onDark, theme,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	/** The source's name, for the trigger's accessible name only. */
	name: string;
	kind: SourceKind;
	onChange: (kind: SourceKind) => void;
	/** The drawer's panel, or the item sheet's cream one. */
	onDark: boolean;
	theme: Theme;
}) {
	const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
	const d = theme.drawer;
	const Icon = SOURCE_KIND_ICONS[kind];

	/*
	 * The trigger's three states, mapped across the two surfaces.
	 *
	 * **Open is the panel's own *Done* pill** in both — cream on near-black up
	 * there, near-black on cream down here — which is what an open control looks
	 * like on either panel, and is exactly what the colour swatch beside this
	 * row already does.
	 *
	 * **At rest a shop sits at the surface's quiet colour and the other two
	 * brighten**, so a glance down a panel says which rows are not shops without
	 * reading any of them. On cream, quiet is `textMuted` rather than a fainter
	 * step: faint measures 3.18:1 on this surface, which is the finding the unit
	 * menu's trigger records.
	 *
	 * **The light hover fills to `surface`, not to `surface-alt`.** The sheet's
	 * composer panel *is* `surface-alt`, so the app's usual ghost hover would
	 * move the control to exactly the colour it is already on — the applied
	 * filter bar's rule, met on a different ground.
	 */
	const openStyle = onDark
		? { background: d.ink, color: '#241E17' }
		: { background: theme.inkBg, color: theme.inkText };
	const restColor = onDark
		? (kind === 'shop' ? d.inkFaint : d.inkMuted)
		: (kind === 'shop' ? theme.textMuted : theme.textStrong);

	return (
		<span class="relative shrink-0" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen(! open)}
				class={`flex items-center justify-center w-[30px] h-[30px] ${onDark ? DRAWER_KIND : PAGE_KIND}`}
				style={open ? openStyle : { color: restColor }}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`${name || 'This source'} is a ${SOURCE_KIND_LABELS[kind].toLowerCase()} — change`}
			>
				<Icon size={17} strokeWidth={1.8} />
			</button>

			{open && (
				/*
				 * Two boxes, one set of rows. The drawer gets `DrawerMenu` — the
				 * role and account menus' surface — and the sheet gets `PAGE_MENU`,
				 * which is the sort menu's popover and therefore the box the unit
				 * menu opens a few pixels away on the same sheet. **A cream popover
				 * over the drawer was rejected once already** (it puts the brightest
				 * thing on screen over the darkest panel in the app), and the
				 * mirror of that mistake is what this branch avoids.
				 */
				<Rows
					label={`Kind for ${name || 'this source'}`}
					kind={kind}
					onPick={(option) => {
						setOpen(false);
						if (option !== kind) onChange(option);
					}}
					onDark={onDark}
					theme={theme}
				/>
			)}
		</span>
	);
}

/**
 * The three rows, in whichever box the surface calls for.
 *
 * The row *mechanics* are the same on both — radius 9, a glyph, the label, and
 * a **crimson check on the current one rather than a fill**, so a hovered row
 * still reads. Only the surface tokens differ, which is the whole of the
 * light/dark split in this file.
 */
function Rows({ label, kind, onPick, onDark, theme }: {
	label: string;
	kind: SourceKind;
	onPick: (kind: SourceKind) => void;
	onDark: boolean;
	theme: Theme;
}) {
	const d = theme.drawer;

	const rows = SOURCE_KINDS.map((option) => {
		const on = option === kind;
		const RowIcon = SOURCE_KIND_ICONS[option];

		return (
			<button
				key={option}
				type="button"
				role="menuitemradio"
				aria-checked={on}
				onClick={() => onPick(option)}
				class={onDark
					? `flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left ${DRAWER_MENU_ROW}`
					: PAGE_MENU_ROW}
				style={on
					? { color: onDark ? d.ink : theme.textStrong, fontWeight: 600 }
					: (onDark ? undefined : { color: theme.text })}
			>
				<RowIcon size={16} strokeWidth={1.8} class="shrink-0" />
				<span class="flex-1 min-w-0 truncate">{SOURCE_KIND_LABELS[option]}</span>
				{/* A check, not a fill — so a hovered row still reads. */}
				{on && <Check size={15} strokeWidth={2.4} style={{ color: theme.accent }} />}
			</button>
		);
	});

	if (onDark) {
		return (
			<DrawerMenu label={label} width="184px" place="right-0 top-full mt-1.5" theme={theme}>
				{rows}
			</DrawerMenu>
		);
	}

	return (
		<div
			role="menu"
			aria-label={label}
			class={`${PAGE_MENU} right-0 top-full mt-1.5 w-[184px]`}
			style={{ boxShadow: theme.dark ? '0 14px 30px rgba(0, 0, 0, 0.55)' : '0 14px 30px rgba(36, 30, 23, 0.20)' }}
		>
			{rows}
		</div>
	);
}
