/**
 * Interactive class names.
 *
 * Painting a control with an inline style cannot express `:hover`, `:active`,
 * or `:focus-visible` at all, so anything styled that way gives no feedback
 * that it is pressable. These are static strings instead, because Zero compiles
 * utilities by scanning source for literal class names; a computed one produces
 * no CSS.
 *
 * Two families, because the app has two grounds. `DRAWER_*` resolves against
 * the drawer tokens — `drawer-press` and its ink are theme-independent on
 * purpose, since the drawer is the darkest surface in both themes. `PAGE_*`
 * resolves against the page tokens, which are `light-dark()` pairs and so
 * follow the theme on their own.
 *
 * Keep each constant a single complete literal. Splitting a class name across
 * a concatenation hides it from the scanner.
 */

/** Shared focus ring. Offset against the well, which is what most controls sit on. */
export const DRAWER_FOCUS =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-well';

/** Focus ring for controls sitting directly on the drawer gradient. */
export const DRAWER_FOCUS_FLAT =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** A filter chip at rest: raised, and it lifts to cream under the pointer. */
export const DRAWER_CHIP =
	'transition-colors bg-drawer-raised text-on-dark-muted hover:bg-drawer-press hover:text-drawer-press-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** The same chip, already selected. Hover only deepens it slightly. */
export const DRAWER_CHIP_ON =
	'transition-colors bg-drawer-press text-drawer-press-ink font-semibold hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** The dashed "add a term" chip, and the dashed *New invite* row. */
export const DRAWER_CHIP_ADD =
	'transition-colors border border-dashed border-drawer-dashed text-on-dark-faint hover:border-on-dark-faint hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** A solid secondary button — Sign out, Copy, Leave household. */
export const DRAWER_BUTTON =
	'transition-colors bg-drawer-raised text-on-dark-muted hover:bg-drawer-press hover:text-drawer-press-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer disabled:opacity-50 disabled:pointer-events-none';

/** An icon-only control that is quiet until touched — pencils, chevrons. */
export const DRAWER_ICON =
	'transition-colors text-on-dark-label hover:text-on-dark hover:bg-drawer-raised rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/**
 * A control sunk into a raised card — the household pencil, the role trigger.
 *
 * `DRAWER_CHIP` is wrong here and looks right: its rest is `drawer-raised`,
 * which *is* the card these sit on, so the control has no edge at all until
 * you touch it. The hairline token is the step down that the boards draw.
 */
export const DRAWER_SUNK =
	'transition-colors bg-drawer-line text-on-dark-muted hover:bg-drawer-raised-hover hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/** The same control with its menu open — the rail's documented open state. */
export const DRAWER_SUNK_ON =
	'transition-opacity bg-drawer-press text-drawer-press-ink font-semibold hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/**
 * A whole row inside a raised card that is itself the target — *Members*, and
 * an invite card's header.
 *
 * `DRAWER_ROW` hovers to `drawer-raised`, which these already sit on. This one
 * moves away from the card instead, which is the same rule the applied-filter
 * chips wrote down for the page ground.
 */
export const DRAWER_CARD_ROW =
	'transition-colors hover:bg-drawer-raised-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset';

/**
 * A row in one of the drawer's two menus — the role menu, the account menu.
 *
 * Selection is a **check, not a fill** (the sort menu's rule), so the fill is
 * free to be the hover and a chosen row still reads under the pointer. The
 * focus ring is inset because the menu's own fill is not a `theme.json` token,
 * so there is nothing for a ring offset to resolve against.
 */
export const DRAWER_MENU_ROW =
	'transition-colors text-on-dark-muted hover:bg-drawer-raised hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset';

/** The same row, crimson — *Remove from household*. Offered, never executed here. */
export const DRAWER_MENU_ROW_DANGER =
	'transition-colors text-drawer-danger hover:bg-drawer-raised hover:text-drawer-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-inset';

/**
 * The drawer's cream primary — *Done*, *Create*, *Copy link*.
 *
 * Its fill is `theme.drawer.ink`, set inline, so only the states live here.
 * Disabled keeps a flat fill rather than dropping opacity, for the reason
 * `Theme.disabledBg` exists: a translucent control looks like a rendering
 * artefact rather than a control you cannot press.
 */
export const DRAWER_PRIMARY =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer disabled:opacity-100 disabled:pointer-events-none';

/**
 * The drawer's cream primary sitting on a **raised card** — the install pill.
 *
 * Two things move from `DRAWER_PRIMARY`, and both are about what is underneath.
 * The ring offsets against `drawer-raised` rather than the gradient, and it is
 * `focus-dark` rather than `on-dark`: a cream ring around a cream pill is the
 * pill drawn twice. Crimson on a dark card in both themes, for the reason the
 * rail already gives — the surface under it is dark either way.
 */
export const DRAWER_PRIMARY_ON_CARD =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/**
 * The dismiss `×` on a panel filled with the drawer's well — the install steps.
 *
 * `TOAST_DISMISS` with its ring offset moved to the fill it actually sits on.
 */
export const DRAWER_PANEL_X =
	'transition-colors text-on-dark-faint hover:text-on-dark-muted rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-well';

/** A stepper key on the drawer's well — the default-threshold pair. */
export const DRAWER_STEPPER =
	'transition-colors text-on-dark-muted hover:bg-drawer-raised hover:text-on-dark active:translate-y-px rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset disabled:opacity-40 disabled:pointer-events-none';

/** A text field on the drawer. */
export const DRAWER_INPUT =
	'transition-colors bg-drawer-well border border-drawer-line text-on-dark outline-none focus-visible:border-on-dark-faint focus:border-on-dark-faint';

/** A whole row that is itself a target — the account row. */
export const DRAWER_ROW =
	'transition-colors hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset';

/* ---------- the page: cards, the header, the item sheet ---------- */

/** Shared focus ring for controls on the page ground. */
export const PAGE_FOCUS =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** A term chip at rest — neutral, with the term's colour carried by its dot. */
export const PAGE_CHIP =
	'transition-colors bg-surface border border-line text-ink-body hover:border-line-strong hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/**
 * The same chip, selected.
 *
 * Its fill is the term's own colour, which is a stored value and therefore an
 * inline style — so only the states live here.
 */
export const PAGE_CHIP_ON =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** The dashed "add one" chip. */
export const PAGE_CHIP_ADD =
	'transition-colors border border-dashed border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** The near-black primary — Add item, Save item, the stepper's plus. */
export const PAGE_BUTTON_PRIMARY =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none';

/** An icon-only control that is quiet until touched — close, expand. */
export const PAGE_ICON =
	'transition-colors text-ink-muted hover:text-ink hover:bg-surface-alt rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/**
 * A bordered control on the page ground that has to be *found* — the shopping
 * list trigger, in both of its labels.
 *
 * `line-strong` at rest rather than `line`, and ink rather than body text.
 * Top-bar controls have almost no edge against the ground: `surface` on `line`
 * separates from it at 1.53:1 on the border and barely at all on the fill, and
 * this is the one control in the bar whose whole job is to be noticed. It is
 * the heavier of the two outlines for that reason and no other.
 */
export const PAGE_BUTTON_SECONDARY =
	'transition-colors bg-surface border border-line-strong text-ink hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/**
 * The quiet end of the page's controls — the sort trigger, and *Back to items*.
 *
 * Nothing at rest but its label: no fill, no border, body ink. It resolves
 * under the pointer to one border step short of `PAGE_BUTTON_OUTLINE`, which
 * leaves `line-strong` to the controls that have to be *found*.
 *
 * Resting colours only. Each caller brings its own shell — `border`,
 * `transition-colors`, `active:translate-y-px` and `PAGE_FOCUS` — because the
 * sort trigger pairs this with an *open* state that needs the same box.
 */
export const PAGE_BUTTON_QUIET =
	'bg-transparent border-transparent text-ink-body hover:bg-surface-alt hover:border-line hover:text-ink';

/**
 * A bordered icon control on the page ground — the mobile header's menu button.
 *
 * Its resting fill and border have to be classes rather than an inline style:
 * an inline `background` beats any `hover:` rule, so the button wore
 * `PAGE_BUTTON` and still had no hover. States match `PAGE_CHIP`, which is the
 * page's other bordered-on-surface control.
 */
export const PAGE_BUTTON_OUTLINE =
	'transition-colors bg-surface border border-line text-ink-body hover:bg-surface-alt hover:border-line-strong hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** A field on the page. The border firms up on focus rather than glowing. */
export const PAGE_INPUT =
	'transition-colors bg-surface border border-line text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted focus-visible:border-ink-muted';

/* ---------- destructive actions: the toast and the confirm dialog ---------- */

/**
 * The toast's Undo pill.
 *
 * The drawer's primary, because the toast is the drawer surface in both themes
 * — this is the one control the component exists for, and a `drawer-raised`
 * pill disappeared into the fill when it was drawn that way first.
 *
 * The focus ring is `focus-dark` rather than `accent`: the ground under a toast
 * is dark either way, so a ring that follows the theme would be solving a
 * problem this surface does not have.
 */
export const TOAST_UNDO =
	'transition-colors bg-drawer-press text-drawer-press-ink hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** The toast's dismiss `×`. Pressing it commits — it is not a "later". */
export const TOAST_DISMISS =
	'transition-colors text-on-dark-faint hover:text-on-dark-muted rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/**
 * A dialog's ghost — Cancel, and the only non-committing thing in the footer.
 *
 * `PAGE_BUTTON` fills at rest, which would put two filled buttons side by side
 * and make the pair read as a choice between equals.
 */
export const PAGE_BUTTON_GHOST =
	'transition-colors text-ink-body hover:bg-surface-alt hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * A dialog's primary. The ordinary ink/cream fill — crimson is never a button.
 *
 * Distinct from `PAGE_BUTTON_PRIMARY` only in its focus ring, which offsets
 * against the dialog surface rather than the page ground behind the scrim.
 */
export const PAGE_BUTTON_DIALOG =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-100 disabled:pointer-events-none';

/** The typed-confirmation field. Its border is already strong at rest. */
export const PAGE_INPUT_CONFIRM =
	'transition-colors bg-surface border border-ink-faint text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted focus-visible:border-ink-muted';

/**
 * The trash on a term's editing row.
 *
 * Neutral, not crimson, and **never disabled** (D36). A disabled control cannot
 * explain itself — it takes no hover on touch and screen readers skip it — and
 * the reason is the one thing worth having at that moment, so the press always
 * lands and the blocked dialog does the explaining.
 */
export const DRAWER_TRASH =
	'transition-colors text-on-dark-faint hover:text-on-dark hover:bg-drawer-raised rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/**
 * A ghost row with crimson text — *Leave household*, *Revoke*.
 *
 * The way a destructive action is **offered**, never the way it is executed:
 * pressing one opens a dialog whose own primary is the ordinary ink/cream fill.
 * Crimson never carries a commit anywhere in this app.
 *
 * **It sits on a raised card in both places now**, since the 27 Aug redesign
 * put *Leave household* inside the Household block and *Revoke* inside an
 * invite card. So the hover is `drawer-raised-hover` and the ring offsets
 * against `drawer-raised`: with the drawer's own values it hovered to exactly
 * the colour it was already on and had no press feedback at all. It is the
 * applied-filter bar's rule again — an interaction state moves *away* from its
 * ground, not toward it.
 */
export const DRAWER_GHOST_DANGER =
	'transition-colors text-drawer-danger hover:bg-drawer-raised-hover active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/**
 * A chip that is off, inside the drawer — the invite composer's role chips, on
 * the term composer's panel.
 *
 * A solid `drawer-dashed` outline with no fill, which is what the boards draw
 * and a **third** answer to the standing question about off-state chips in the
 * drawer: the filter chips are `drawer-raised`, the page's are surface-on-line.
 * Built as drawn, and written up as unreconciled rather than quietly
 * normalised — see the open question in the design spec.
 */
export const DRAWER_CHIP_OUTLINE =
	'transition-colors border border-drawer-dashed text-on-dark-muted hover:bg-drawer-raised hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-well';

/**
 * The composer field's focus halo, light theme.
 *
 * A halo rather than the page's border-firms-up treatment because the field
 * sits on a recessed panel that already has a hairline — firming that up moves
 * nothing the eye can see. Crimson at 14% is the only place the brand colour
 * appears on a control, and it is a glow, not a fill.
 */
export const PANEL_FIELD_HALO =
	'transition-shadow outline-none focus:shadow-[0_0_0_3px_rgba(190,51,70,0.14)]';

/**
 * The same halo in dark, at the dark crimson and a little more alpha.
 *
 * 14% of `#BE3346` on `#2C251B` is invisible; `#D4636B` at 18% lands at the
 * same apparent strength the light pair has. Also used on the drawer in *both*
 * themes, which is dark either way.
 */
export const PANEL_FIELD_HALO_DARK =
	'transition-shadow outline-none focus:shadow-[0_0_0_3px_rgba(212,99,107,0.18)]';

/* ---------- the item card, whose controls sit on `surface` ---------- */

/*
 * A separate family from `PAGE_*` for one reason that matters: these sit on a
 * **card**, not on the page ground, so the focus ring offsets against `surface`
 * or it draws its gap in the wrong colour and reads as a halo.
 *
 * Every fill here is a class rather than an inline style, and that is the whole
 * point. An inline `background` outranks `hover:bg-line`, so a control painted
 * that way is rounded, sized, and completely inert under the pointer. The
 * card's stepper shipped exactly like that — the same mistake the drawer made
 * before this file existed.
 */

/** The stepper's minus: sunk at rest, a step darker under the pointer. */
export const CARD_STEPPER =
	'transition-colors bg-surface-alt hover:bg-line active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The stepper's plus.
 *
 * Opacity rather than a colour swap, because the fill it lifts off is
 * `theme.inkBg` — set inline, and the one thing on the card that is genuinely
 * *pressed* rather than merely clicked.
 */
export const CARD_STEPPER_PRIMARY =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * *Edit* — flush with the card at rest, sinking on hover.
 *
 * Deliberately the inverse of the stepper's minus: that one starts sunk, this
 * one starts level with the surface it sits on and its border does the work.
 */
export const CARD_ACTION =
	'transition-colors bg-surface hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * *Remove* — crimson text on nothing.
 *
 * It fills on hover rather than deepening its text, which would read as the
 * button getting more dangerous the longer you looked at it. Crimson is how a
 * destructive action is **offered**; it never carries the commit (D36).
 */
export const CARD_ACTION_GHOST =
	'transition-colors hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The header row, which is itself the accordion's target.
 *
 * Nothing in the row changes on hover except the chevron, which is what `group`
 * is for — the name and the status badge are information, and they should not
 * light up because a pointer crossed them.
 */
export const CARD_HEADER =
	'group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/* ---------- the shopping list ---------- */

/**
 * The hover step for a control whose fill is a runtime value.
 *
 * Brightness rather than a second set of colors: every value on the shopping
 * list's trigger comes from `statusColor` at runtime, so there is nothing to
 * write a literal hover shade against. The *direction* has to flip, though,
 * which is why this is a pair — a status tint is pale in light and deep in
 * dark, so hovering means darkening in one and lightening in the other. Both
 * are written out in full because Tailwind resolves a class by scanning for a
 * static string.
 */
export const PAGE_TINT_HOVER = {
	light: 'hover:brightness-95',
	dark: 'hover:brightness-125',
};

/**
 * A shopping-list row.
 *
 * The whole row is one checkbox now, but the hover stays on the `<li>`: the
 * button is a flex child and its own fill would stop at the row's rounding
 * rather than at its edge. `surface-alt` is the row hover in both themes.
 */
export const LIST_ROW = 'transition-colors hover:bg-surface-alt';

/**
 * A shopping-list row's one target.
 *
 * It offsets its focus ring against `surface`, not the ground: these sit on a
 * card, and a ring offset against the canvas draws its gap in the wrong colour
 * and reads as a halo.
 */
export const LIST_TARGET =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The trip bar's ghost — *Hide 3 checked*, *Clear checks*.
 *
 * It lifts to `surface` rather than sinking to `surface-alt`, which is the
 * token the spec names: the bar *is* `surface-alt`, so sinking would give the
 * control no hover at all. Lifting is the same one-step move in both themes.
 *
 * **It stays a ghost, and the glyph is what carries it at rest.** A bordered
 * box was built here and reverted: what made these read as prose was never the
 * missing outline but the all-checked bar putting two of them, centred, on a
 * line of their own. With one control per end of the bar the position is the
 * affordance, the same argument `PAGE_BUTTON_QUIET` makes in row 2 — and an
 * icon beside the label says *control* without spending an edge on a surface
 * where `line` measures 1.21:1 and would have had to be `line-strong`.
 */
export const LIST_GHOST =
	'transition-colors text-ink-body hover:bg-surface hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * The same ghost, on a card instead of the bar.
 *
 * The empty state's *Clear the store filter* sits on `surface`, so it sinks to
 * `surface-alt` — which is the token the spec names, and the direction that
 * only works because the ground under it is the lighter of the two.
 */
export const LIST_GHOST_ON_CARD =
	'transition-colors text-ink-body hover:bg-surface-alt hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/* ---------- the applied filter bar, row 3 of the top bar ---------- */

/*
 * These three are the only page controls whose active fill is `line`, and the
 * reason generalises: **an interaction state on the ground has to move away
 * from the ground, not toward it.**
 *
 * Everywhere else on the page a ghost hover sinks to `surface-alt` — but
 * `surface-alt` *is* the ground gradient's middle stop, so out here a chip
 * hovering to it goes from a step lighter than the ground to exactly the
 * ground, and the hover reads as the chip vanishing. `line` moves the other
 * way in both themes at once: `#E2D5C0` is darker than the cream ground,
 * `#3E3527` is lighter than the dark one. One token, mirrored.
 *
 * Controls sitting on a *card* keep hovering to `surface-alt`, because there it
 * is a real step. This is a ground rule, not a replacement.
 */

/**
 * An applied-filter chip — the drawer's off chip with an `×` on it.
 *
 * Hover, press and focus share one treatment on purpose: the chip is on its way
 * out the moment you press it, so a distinct press state has nothing left to
 * report. **No transform** for the same reason — with the two merged, a
 * `scale()` or a `translate` would fire on hover, and a chip that flinches when
 * you point at it is worse than no press feedback at all.
 *
 * The focus ring is crimson rather than ink: ink is what this row's chips are
 * *made of*, so an ink ring on an ink label reads as a thicker border.
 */
export const PAGE_CHIP_APPLIED =
	'group transition-[background-color,border-color,color,opacity,transform] duration-150 bg-surface border border-line-strong text-ink hover:bg-line hover:border-ink-faint active:bg-line active:border-ink-faint focus-visible:bg-line focus-visible:border-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** The `×` inside that chip. Faint until the chip is touched, then ink. */
export const PAGE_CHIP_APPLIED_X =
	'transition-colors text-ink-faint group-hover:text-ink group-active:text-ink group-focus-visible:text-ink';

/**
 * *Clear filters*, which leads the row.
 *
 * Ghost at rest — no fill, no edge — and it takes the chips' active treatment
 * exactly, so the row reads as one thing rather than a button and some chips.
 * Its border is declared transparent rather than absent so nothing shifts by a
 * pixel when the hover paints one.
 */
export const PAGE_BUTTON_CLEAR =
	'transition-[background-color,border-color,color] duration-150 bg-transparent border border-transparent text-ink-body hover:bg-line hover:border-ink-faint hover:text-ink active:bg-line active:border-ink-faint active:text-ink focus-visible:bg-line focus-visible:border-ink-faint focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/* ---------- the item sheet: one field treatment, and the unit menu ---------- */

/*
 * **Everything you can change on the sheet is the same object at a different
 * width.** The name field, the size number, the unit trigger, both steppers and
 * the notes box share this border, this fill and this focus halo — which is
 * most of what makes the redesigned sheet read as calmer than the flat stack it
 * replaces. Nothing got quieter; six controls stopped being four kinds of
 * thing.
 *
 * The border is `ink-muted` and that is a contrast finding rather than a
 * preference. The composer's old field border reads **2.80:1** on the panel and
 * **2.45:1** on the sheet in dark — under the 3:1 a control outline needs, and
 * the same measurement that sent the shopping list's checkbox to this token.
 * `ink-muted` clears 5:1 on all four surface-and-theme combinations.
 */
export const PAGE_FIELD =
	'transition-shadow bg-surface border border-ink-muted text-ink outline-none placeholder:text-ink-muted';

/**
 * One cell of a stepper — the `−` and the `+`.
 *
 * **Neither carries the ink fill the item card's plus does.** The card has no
 * primary at all, so its plus has to be one; the sheet already has exactly one
 * ink control and it is *Save*. Two ink pluses and an ink Save would be three
 * primaries on a form with a single action.
 *
 * The focus ring is inset because the cell sits inside a rounded, clipped
 * field: an offset ring would be cropped by the parent's `overflow-hidden` and
 * read as a broken edge rather than a focus state.
 */
export const PAGE_STEPPER_CELL =
	'transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink';

/**
 * The field halo, raised by anything inside the field rather than by the field.
 *
 * A stepper's focusable part is the numeral in the middle of it, and the box is
 * `overflow-hidden` so the three cells can share one rounded outline — which
 * clips a shadow drawn on the numeral itself. So the halo goes on the wrapper
 * and listens for focus below it.
 */
export const PAGE_FIELD_HALO_WITHIN =
	'transition-shadow focus-within:shadow-[0_0_0_3px_rgba(190,51,70,0.14)]';

/** The same, at the dark crimson and a little more alpha. See `PANEL_FIELD_HALO_DARK`. */
export const PAGE_FIELD_HALO_WITHIN_DARK =
	'transition-shadow focus-within:shadow-[0_0_0_3px_rgba(212,99,107,0.18)]';

/**
 * The unit menu's box and rows — the sort menu's construction, unchanged.
 *
 * Written down once here rather than twice inline. The shadow stays with the
 * caller because it is the one part that differs by theme, and a `light-dark()`
 * box-shadow is not something `theme.json` can express.
 */
export const PAGE_MENU =
	'absolute z-30 p-1.5 rounded-[14px] bg-surface border border-line';

/** One row of it. Selection is a check, never a fill — so hover still reads on it. */
export const PAGE_MENU_ROW =
	'flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The row a checkbox and its explanation share — *Keep off the shopping list*.
 *
 * The whole row is the target, box and words alike: the box is 22px and a 22px
 * hit area on a phone is the mistake this app already corrected once on the
 * shopping list's own rows.
 */
export const PAGE_CHECKBOX_ROW =
	'w-full text-left transition-colors rounded-xl hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
