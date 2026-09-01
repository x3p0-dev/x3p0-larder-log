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

/**
 * The dashed add row **inside the editing card** — the Filter tab's *Add a
 * location / type / source*, which drops in when a group is being edited.
 *
 * `DRAWER_CHIP_ADD` is right for its two other callers, which sit on the pane's
 * own gradient: the chip beside the filter chips, and *New invite*. This one is
 * inside a `drawer-raised` card, so its ring offset painted the gradient over a
 * card two steps lighter.
 */
export const DRAWER_CHIP_ADD_ON_CARD =
	'transition-colors border border-dashed border-drawer-dashed text-on-dark-faint hover:border-on-dark-faint hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

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

/**
 * The **selected half of a drawer segmented control** — Filter / Settings, and
 * Appearance's three theme options.
 *
 * Both wore `DRAWER_CHIP_ON`, which is right for a filter chip standing on the
 * drawer gradient and wrong inside a `drawer-well` track for two reasons at
 * once:
 *
 * 1. **The ring offset painted a colour that is not behind it.** `ring-offset-
 *    drawer` puts a 2px band of the gradient between the pill and its ring,
 *    where the pixels are actually the well — two steps darker.
 * 2. **There is nowhere for an offset ring to go.** The track is `p-1` with
 *    `gap-1`, so `ring-2 ring-offset-2` reaches exactly 4px out: flush against
 *    the track's inner edge, and touching the neighbouring tab across the gap.
 *
 * So the ring goes **inside**, which is what the unselected half has always
 * done — one control, one ring treatment.
 *
 * **And it had to change colour to survive that.** Inset means the ring lands
 * on the pill's own `drawer-press` fill, where `ring-on-dark` measures
 * **1.00:1** — it *is* that colour. `focus-dark` reaches only 3.01:1 there.
 * `drawer-press-ink` is 13.70:1, and it is the pill's own label colour, so the
 * ring is the text token doing what the shopping list's checkbox and the beta
 * badge already do with a border.
 *
 * The unselected half keeps `ring-on-dark`: it sits on the well, at 15.09:1
 * light and 16.62:1 dark.
 *
 * `transition-opacity` rather than `DRAWER_CHIP_ON`'s `transition-colors`,
 * which never animated the `hover:opacity-90` beside it.
 */
export const DRAWER_SEGMENT_ON =
	'transition-opacity bg-drawer-press text-drawer-press-ink font-semibold hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drawer-press-ink focus-visible:ring-inset';

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

/**
 * The same ring, offset against a sunk strip rather than the page ground.
 *
 * `LIST_GHOST` already spells this offset out inline and is the proof it is a
 * real position: a header band and a bottom bar are both `surface-alt`, and a
 * ring that offsets against `canvas` there paints a halo of a colour that is not
 * behind it.
 */
export const PAGE_FOCUS_ON_SUNK =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

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

/**
 * Both chips again, on a **`surface` card** rather than on the page ground.
 *
 * The ring offset, and nothing else. Their three original callers are on the
 * item sheet, whose gradient is near enough `canvas`; the review's rows sit on a
 * card, which is a different colour in both themes.
 */
export const CARD_CHIP_ON =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/** Its dashed twin, same one token moved. */
export const CARD_CHIP_ADD =
	'transition-colors border border-dashed border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * A 22px checkbox that is its own target, on a card.
 *
 * **`LIST_TARGET` is a focus ring and nothing else**, and that is right where it
 * came from: on the run list *the whole row is the checkbox*, so the row's own
 * hover is the box's hover. The review's tick is a 22px button in a gutter with
 * no row hover behind it, so it had no pointer feedback at all.
 *
 * **It paints 30px and occupies 22**, which is `CARD_CHEVRON`'s trick and its
 * warning: `p-1 -m-1` gives back exactly the 8px the well added on each axis, so
 * the box, the name field beside it and the row's height are all where they
 * were. Do not resize it without re-deriving the row's `min-h`.
 */
export const CARD_CHECK_TARGET =
	'transition-colors hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/** The dashed "add one" chip. */
export const PAGE_CHIP_ADD =
	'transition-colors border border-dashed border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/** The near-black primary — Add item, Save item, the stepper's plus. */
export const PAGE_BUTTON_PRIMARY =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none';

/**
 * The primary on a **sunk bar** — the run list's trip bar and the review's
 * commit bar, which are the same construction doing the same job.
 *
 * The ring offset alone. Both bars are `surface-alt`, and both shipped wearing
 * the page ground's offset; the *ghost* beside each of them (`LIST_GHOST`) had
 * always had it right, which is what makes the pair legible as a mistake rather
 * than a choice.
 */
export const PAGE_BUTTON_PRIMARY_ON_SUNK =
	'transition-opacity hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt disabled:opacity-50 disabled:pointer-events-none';

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
	'transition bg-surface border border-line text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted focus-visible:border-ink-muted';

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
/**
 * The kind glyph on a source's editing row (D58).
 *
 * `DRAWER_TRASH`'s geometry with **no colour of its own**: the glyph's colour
 * says which kind it is — the drawer's rest colour for a shop, a step brighter
 * for grow and make — and it arrives as an inline style, which would beat this
 * class's `:hover` colour and leave the hover with nothing to report. So the
 * hover here is the fill alone, which is the half a coloured glyph can keep.
 */
export const DRAWER_KIND =
	'transition-colors rounded-[9px] hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

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
	'transition outline-none focus:shadow-[0_0_0_3px_rgba(190,51,70,0.14)]';

/**
 * The same halo in dark, at the dark crimson and a little more alpha.
 *
 * 14% of `#BE3346` on `#2C251B` is invisible; `#D4636B` at 18% lands at the
 * same apparent strength the light pair has. Also used on the drawer in *both*
 * themes, which is dark either way.
 */
export const PANEL_FIELD_HALO_DARK =
	'transition outline-none focus:shadow-[0_0_0_3px_rgba(212,99,107,0.18)]';

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

/**
 * The chevron's well, at the end of that row.
 *
 * **A colour step alone was not a hover state.** The glyph went `ink-faint` to
 * `ink-muted` — `#9B8B75` to `#6F6049`, two greys on 17px of 1.5px stroke — and
 * it fired from anywhere in a header the width of the card, so the one thing
 * that *did* respond was the one thing nobody was pointing at. It read as a
 * card with no hover at all, which is what it was reported as.
 *
 * So the glyph gets a 26px round well that fills to `surface-alt` on the
 * header's hover. **That is the card's own ghost step** — a control on a
 * `surface` card sinks to `surface-alt`, which is the same move `CARD_ACTION_GHOST`
 * makes a few pixels below it, and the opposite of what a control on the page
 * ground does (D45). The colour step stays and now has something to read
 * against.
 *
 * **It does not claim to be the target.** The whole row is the button and the
 * focus ring still wraps the whole row; the well is where the affordance is
 * *drawn*, which is the ordinary accordion arrangement.
 *
 * **It paints 25px and occupies 17 — the glyph's own box — and that is
 * load-bearing, not tidiness.** Collapsed cards are equalised by a
 * `min-h-[188px]` floor rather than by `align-items: stretch`, because a grid
 * row is sized by its tallest item's content and stretch would let an open card
 * drag its whole row down. A floor only equalises what fits under it: the first
 * cut of this well was 26px in flow, which grew the header's cluster from 17px
 * to 26 and pushed the ordinary card past 188 — at which point every card is
 * its own content height again and the row stops lining up. `-my-1` on a 25px
 * box gives back exactly the 8px it added, and `-mr-1` does the same
 * horizontally, so the glyph's centre, the status badge and the card's height
 * are all where they were.
 *
 * **So do not resize this without re-deriving the floor.** The circle bleeds 4px
 * into the card's own padding, which is what makes it free.
 */
export const CARD_CHEVRON =
	'shrink-0 -my-1 -mr-1 inline-flex items-center justify-center w-[25px] h-[25px] rounded-full transition-colors text-ink-faint group-hover:bg-surface-alt group-hover:text-ink-muted';

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
	/*
	 * **`transition`, not `transition-shadow`, because there are two properties
	 * to move now** — and **every style in the field family moved with it**. Two
	 * `transition-*` utilities on one element is the coin toss the console sweep
	 * warns about: both set `transition-property` and sheet order decides. These
	 * styles are *designed* to be worn together (`PAGE_FIELD` + a halo, at eight
	 * call sites), so leaving one on `transition-shadow` would have made the pair
	 * a toss at every one of them. `PAGE_INPUT` had that bug already, against
	 * `PAGE_FIELD_HALO_WITHIN` on the top bar's search, and it is fixed here too.
	 *
	 * **The hover is the border stepping one shade toward the text**, which is
	 * the run segment's rule: darker in light, brighter in dark, one expression.
	 * It is a border rather than a fill for the reason a field cannot use D45 —
	 * `bg-surface` is the field's *identity*, and this treatment sits on the item
	 * sheet's gradient, on a `surface` card and inside a stepper, three grounds
	 * that no single fill moves away from.
	 *
	 * **A field was the one control in the app with nothing under the pointer.**
	 * It had a caret, a focus halo and a selection colour and no hover at all,
	 * which reads as inert on any surface holding several of them — the review's
	 * table of steppers is where it showed, and the item sheet is where it is
	 * used most. It belongs to the field rather than to either screen.
	 */
	'transition bg-surface border border-ink-muted hover:border-ink text-ink outline-none placeholder:text-ink-muted';

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
	'transition focus-within:shadow-[0_0_0_3px_rgba(190,51,70,0.14)]';

/** The same, at the dark crimson and a little more alpha. See `PANEL_FIELD_HALO_DARK`. */
export const PAGE_FIELD_HALO_WITHIN_DARK =
	'transition focus-within:shadow-[0_0_0_3px_rgba(212,99,107,0.18)]';

/**
 * The unit menu's box and rows — the sort menu's construction, unchanged.
 *
 * Written down once here rather than twice inline. The shadow stays with the
 * caller because it is the one part that differs by theme, and a `light-dark()`
 * box-shadow is not something `theme.json` can express.
 */
export const PAGE_MENU =
	'absolute z-30 p-1.5 rounded-[14px] bg-surface border border-line';

/**
 * The same popover, **positioned against the viewport** rather than its parent.
 *
 * For a menu whose nearest scroll container would crop it — the two account
 * pre-flights, inside `ModalShell`'s `overflow-y-auto max-h-[90vh]` card. A
 * scroll container clips its absolutely-positioned descendants at its padding
 * box, and that cap is load-bearing: the pre-flight is the tallest dialog in the
 * app and a short window has to reach its footer. So the panel moves layer
 * (D68), and `useFixedMenu` supplies the coordinates.
 *
 * **A whole constant rather than `${PAGE_MENU} fixed`**, which is what shipped
 * first. Two utilities for one property is a coin toss settled by **sheet
 * order**, not by attribute order — `.absolute` lands at 10385 and `.fixed` at
 * 10427, so it was going the right way by luck. The console sweep already
 * recorded this trap twice; this is the third.
 *
 * **Do not use it inside the drawer.** That `<aside>` carries a `transform`, and
 * a transform on an ancestor becomes the containing block for everything `fixed`
 * beneath it — so this would be trapped there exactly as `absolute` is trapped
 * here. Same three words, opposite outcomes.
 */
export const PAGE_MENU_FIXED =
	'fixed z-30 p-1.5 rounded-[14px] bg-surface border border-line';

/** One row of it. Selection is a check, never a fill — so hover still reads on it. */
export const PAGE_MENU_ROW =
	'flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The same row, on the Add / Edit sheet's ground rather than inside a popover.
 *
 * **One token moved, and it is the ring offset.** `PAGE_MENU_ROW` offsets
 * against `surface`, which is the fill of the menu box its three callers open
 * inside. The paste sheet's route out to the checklist sits on the sheet's own
 * gradient, and every control already on that board — `PAGE_ICON` on Cancel and
 * the close, `PAGE_BUTTON_PRIMARY` on Save — offsets against `canvas`. A ring
 * painted against a fill that is not behind it is the defect the console's
 * ground sweep found four times over.
 *
 * **The hover is unchanged and is already right**: `surface-alt` is a real step
 * down from the sheet's gradient in both themes, so it moves away from the
 * ground rather than onto it (D45).
 */
export const PAGE_MENU_ROW_ON_SHEET =
	'flex items-center gap-2.5 w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/**
 * The source-kind glyph on the item sheet's composer panel — `DRAWER_KIND`'s
 * light twin.
 *
 * **It fills to `surface`, not to `surface-alt`**, and that is the applied
 * filter bar's rule met on a different ground: the composer panel *is*
 * `surface-alt`, so the app's usual ghost hover would move the control to
 * exactly the colour it is already sitting on. `surface` steps the other way —
 * it is the field beside it, so the hover lands on a colour this panel already
 * uses rather than inventing one.
 */
export const PAGE_KIND =
	'transition-colors rounded-[9px] hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * The row a checkbox and its explanation share — *Keep off the shopping list*.
 *
 * The whole row is the target, box and words alike: the box is 22px and a 22px
 * hit area on a phone is the mistake this app already corrected once on the
 * shopping list's own rows.
 */
export const PAGE_CHECKBOX_ROW =
	'w-full text-left transition-colors rounded-xl hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/**
 * The same row, on a **card** rather than on the page ground.
 *
 * One token apart from `PAGE_CHECKBOX_ROW` and it is the ring's offset: the
 * item sheet's ground is a near-`canvas` gradient, while the first-run card and
 * the new-household dialog are both `surface`. A ring offset painted in the
 * wrong ground draws a hairline of the page *through* the card it sits on.
 *
 * The hover is unchanged and still correct here — D45 asks that an interaction
 * state move *away* from the ground, and `surface-alt` is a real step down from
 * `surface` in both themes. It is only on a panel that already *is*
 * `surface-alt` that the rule sends a control the other way (`PAGE_KIND`).
 */
export const CARD_CHECKBOX_ROW =
	'w-full text-left transition-colors rounded-xl hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/*
 * ---------------------------------------------------------------------------
 * Touch sizes for the term composer
 * ---------------------------------------------------------------------------
 *
 * The six constants below are **geometry, not interaction state**, which makes
 * them the exception in this file. They are here because they all encode one
 * rule and it is worth writing down once:
 *
 * **The term composer is compact only where it is docked.** Its controls were
 * drawn against the docked 340px drawer — a 26px swatch, a 28px pencil, a 30px
 * trash — and that is a sensible density for a pointer sitting a foot from a
 * 1440 screen. It is not a sensible density for a thumb. Below the dock the
 * drawer is a slide-over on a phone, and the composer is the one surface in the
 * app where four controls share a 292px row.
 *
 * So the base value is the touch value and `min-[1120px]:` restores the drawn
 * one. **1120 rather than `md`** because that is the number the drawer docks
 * at: it is the moment the panel stops being a slide-over *and* the moment its
 * column stops being able to afford the extra pixels. A `md:` (768) line would
 * compact a tablet's slide-over, which is the case that wants this most, and it
 * would compact it while the column is at its widest.
 *
 * **The row's name field pays for it**, and that is the trade taken knowingly.
 * On a 390 screen a source's field goes 176 → 164px, and on a 360 screen
 * 146 → 134. D58 records ~150px as where a long source name starts truncating
 * — but that finding was about the *docked* row, which is untouched here, and
 * a name you scroll to read is a smaller cost than a colour you cannot press.
 * The chips above the panel still carry every name in full.
 *
 * These are class strings rather than numbers because Tailwind resolves a
 * class by scanning for a static string — an interpolated size compiles to
 * nothing. Same reason `DOCK_PX` is written out three times.
 */

/** The colour swatch that opens the sixteen. 30px on touch, 26 docked. */
export const TERM_SWATCH =
	'w-[30px] h-[30px] min-[1120px]:w-[26px] min-[1120px]:h-[26px]';

/** The name field beside it. 44px on touch — the ordinary target — 40 docked. */
export const TERM_FIELD =
	'h-11 min-[1120px]:h-10';

/** The row's trailing glyph buttons: the kind, the trash, the abandon. */
export const TERM_ICON =
	'w-[34px] h-[34px] min-[1120px]:w-[30px] min-[1120px]:h-[30px]';

/** The panel header's *Done* pill. */
export const TERM_DONE =
	'h-8 px-3.5 min-[1120px]:h-7 min-[1120px]:px-3';

/**
 * A filter section header's pencil and chevron.
 *
 * These grow the most — 28 → 36 — because they are the only two that cost
 * nothing: they sit alone in a header row opposite a micro-label, so there is
 * no neighbour for them to squeeze.
 */
export const TERM_SECTION_ICON =
	'w-9 h-9 min-[1120px]:w-7 min-[1120px]:h-7';

/** A filter chip, and the dashed one that starts a new term. */
export const TERM_CHIP_SIZE =
	'h-9 min-[1120px]:h-[34px]';

/* ---------- the admin console ---------- */

/**
 * A nav row inside the console's raised block, at rest.
 *
 * Not `DRAWER_ROW`, and the difference is the same one `DRAWER_SUNK` exists
 * for: these sit **on** `drawer-raised` rather than on the drawer gradient, so
 * a hover to `drawer-raised` is a hover to the colour the row is already —
 * D45's rule about moving away from the ground, on the drawer's own ramp.
 * `drawer-raised-hover` is the step that is actually a step.
 *
 * The focus ring offsets against `drawer-raised` for the same reason.
 */
export const DRAWER_NAV_ROW =
	'transition-colors hover:bg-drawer-raised-hover hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/**
 * One of Overview's four stat cards, and one household row on the list.
 *
 * A card on the page ground, so it sinks to `surface-alt` under the pointer
 * where a control on the ground would lift (D45). Rows are pressable and cards
 * are not, which is why only this one carries the press nudge — the cards take
 * the border and the fill and leave the transform alone.
 */
export const ADMIN_ROW =
	'transition-colors hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * *Remove from household* on a cream menu — `DRAWER_MENU_ROW_DANGER`'s light
 * twin, for the console's role menu (D62).
 *
 * `text-accent` rather than the drawer's fixed `#D4636B`: on the page ground
 * the crimson has to follow the theme, which is the whole reason `theme.accent`
 * exists — the one wordmark that hard-coded the light crimson measured 3.11:1
 * in dark. The hover sinks to `surface-alt`, the move every control on a card
 * makes, so the crimson is doing nothing the neutral rows are not.
 */
export const PAGE_MENU_ROW_DANGER =
	'flex items-center w-full h-11 md:h-9 px-2.5 rounded-[9px] text-sm text-left transition-colors text-accent hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The same row, **two lines tall** — a label over what it costs.
 *
 * One caller: *Delete this household · 128 items, 4 locations… go permanently*
 * in the account pre-flight's transfer menu (D68). It is the only menu row in
 * the app that says what it means as well as what it is, and it earns that by
 * being the one row in that menu which is not a person.
 *
 * **A whole constant rather than `${PAGE_MENU_ROW_DANGER} h-auto py-2
 * items-start`**, which is what shipped first and was **cut off on desktop and
 * not on a phone**. Three utilities fighting for two properties are settled by
 * **sheet order**: `.h-11` lands at 17300 and `.h-auto` at 18401, so the base
 * height lost and the row grew — but `.md\:h-9` is in a media block at 75371,
 * far after both, so above `md` the row was clamped to 36px and the second line
 * was clipped. **A variant always wins a coin toss with a base utility**, which
 * is what made this look like a desktop-only bug.
 */
export const PAGE_MENU_ROW_DANGER_STACKED =
	'flex items-start w-full h-auto py-2 px-2.5 rounded-[9px] text-sm text-left transition-colors text-accent hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The role word as a trigger, on a card — `DRAWER_SUNK`'s light twin.
 *
 * Sunk rather than raised, exactly as the drawer's is: the card it sits on is
 * `surface`, so a `surface` control would have no edge until you touched it,
 * and `surface-alt` is the step down the boards draw (`#F2EADC` on `#FDFAF4`).
 * Its hover therefore goes *up* to `surface`, which is D45's rule met on a
 * ground that is already the lighter of the two — the same inversion
 * `LIST_GHOST` makes on the trip bar.
 */
export const PAGE_SUNK =
	'transition-colors bg-surface-alt border border-line text-ink-body hover:bg-surface hover:border-line-strong hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * A horizontal scroller for the console's status chips, below `md` only.
 *
 * **The split is `md:`, not the measured column**, and this is D45's rule
 * rather than the exception row 2's note warns about. Row 2 asks whether its
 * labels *fit*, which a docked drawer changes without the viewport moving.
 * This asks whether there is a **scroll gesture** — a mouse has none, so a
 * docked drawer at 1280 must still wrap. Different question, different axis.
 *
 * The bleed cancels above `md`, so the chips run to the gutter on a phone and
 * sit inside it on a desktop. Nothing is pinned: these are one status filter
 * with one value on at a time, not a set you are dismantling.
 */
export const ADMIN_CHIP_SCROLLER =
	'flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap pr-[18px] -mr-[18px] md:pr-0 md:mr-0';

/**
 * `PAGE_BUTTON_QUIET` with its menu open — the sort trigger, in the app and in
 * the console.
 *
 * It lived inside `SortMenu` as a local `TRIGGER_ON` while there was one
 * caller. There are three now, and the console's two shipped without it: an
 * `aria-expanded` trigger that looks identical open and shut says nothing to
 * anyone using their eyes. Resting colours only, like the style it pairs with —
 * the caller brings the box.
 */
export const PAGE_BUTTON_QUIET_ON =
	'bg-surface-alt border-line-strong text-ink';

/**
 * The same pair, on a **sunk strip** — a card's header band, or a bar below one.
 *
 * **One token moved in each, and it is the fill.** `PAGE_BUTTON_QUIET` hovers to
 * `surface-alt` and its open state *is* `surface-alt`, which is right on the
 * page ground and dead on a strip already painted that colour: the review's
 * three *Set for checked* triggers shipped with a hover you could not see and an
 * `aria-expanded` only a screen reader could hear. On the lighter of the two
 * grounds, away means up (D45), so both go to `surface`.
 */
export const PAGE_BUTTON_QUIET_SUNK =
	'bg-transparent border-transparent text-ink-body hover:bg-surface hover:border-line hover:text-ink';

/** Its open state. `PAGE_BUTTON_QUIET_ON`'s fill, moved for the same reason. */
export const PAGE_BUTTON_QUIET_ON_SUNK =
	'bg-surface border-line-strong text-ink';

/**
 * The dismiss `×` on the console's refusal banner — `DRAWER_PANEL_X`'s light
 * twin, and the same job: a control on a fill that is not the page ground.
 *
 * **It moves the fill and never the text.** The banner's crimson is inherited
 * from the box, and a `hover:text-*` here would announce that pointing at the
 * dismiss changed what the sentence beside it means. `DRAWER_GHOST_DANGER`
 * makes the same choice for the same reason.
 *
 * The fill goes *up* to `surface`, which is D45's rule met on the lighter of
 * the two grounds — `LIST_GHOST`'s inversion, because the banner is filled
 * `surface-alt` and hovering to it would be hovering to nothing. The ring
 * offsets against that fill rather than the canvas behind it.
 */
export const PAGE_BANNER_X =
	'transition-colors rounded-[9px] hover:bg-surface active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * A ghost row with crimson text, on a cream card — `DRAWER_GHOST_DANGER`'s
 * light twin. *Delete household*, *Delete account*, *Revoke*.
 *
 * Crimson is how a destructive action is **offered** and never how it is
 * executed: every one of these opens a dialog whose own primary is the ordinary
 * ink/cream fill.
 *
 * **It exists because `LIST_GHOST_ON_CARD` plus an inline crimson is not the
 * same thing and looks like it.** That pairing was what shipped, and an inline
 * `color` beats a `hover:text-ink` class — so the style claimed a hover it
 * could not perform, which is the failure the sort trigger and the mobile menu
 * button have each already recorded once. Here the crimson is declared at rest,
 * so nothing is being overridden and the hover is only the fill.
 */
export const PAGE_GHOST_DANGER =
	'transition-colors text-accent hover:bg-surface-alt active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The same offer, on a **sunk strip** rather than on the card — both *Delete*
 * buttons, which sit in a `surface-alt` band under a hairline at the foot of
 * their card.
 *
 * **The hover goes up, and it has to.** `PAGE_GHOST_DANGER` sinks to
 * `surface-alt`, which *is* the strip these are on, so those two buttons shipped
 * with a hover to the colour they were already sitting on and no visible state
 * at all — reported as *"the delete account and delete household buttons have no
 * interactive states"*, which is exactly what it was. The focus ring was
 * offsetting against the wrong fill for the same reason.
 *
 * It is `LIST_GHOST` and `LIST_GHOST_ON_CARD` again, and `PAGE_KIND` a third
 * time: **an interaction state moves away from its ground**, and on the lighter
 * of the two grounds away means up. One rule, four components, and this is the
 * fourth time it has had to be applied by hand — because a class string cannot
 * see what is painted behind it, and neither can a check that only asks whether
 * a `hover:` is present.
 */
export const PAGE_GHOST_DANGER_SUNK =
	'transition-colors text-accent hover:bg-surface active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * Appended to a control that is **present, visibly unavailable, and explained
 * on the same screen** — the console's writes while `ADMIN_WRITES_HELD` is on.
 *
 * **This is D36's exception, not a hole in it.** *A disabled control cannot
 * explain itself* is a rule about a reason that is off-screen; the pre-flight's
 * own disabled primary already earns the exception by having its reason be the
 * dialog it sits in, and every control this is applied to has a notice above it
 * saying the same thing in words. Take the notice away and the rule bites
 * again.
 *
 * **It fades rather than recolours**, which is the one thing worth getting
 * right: the crimson on both *Delete* buttons is the app saying *this destroys
 * something*, and that stays true while the button is asleep. Repainting it
 * neutral would say the control had become something else.
 *
 * `pointer-events-none` on top of `disabled` is belt and braces on purpose —
 * `disabled` already blocks the click and drops it from the tab order, and this
 * is what stops the hover and the cursor from promising a press that will not
 * happen.
 */
export const PAGE_HELD =
	'disabled:opacity-45 disabled:pointer-events-none';

/**
 * The console's *selected* nav row — `DRAWER_CHIP_ON` with its ring offset
 * moved to the fill the row actually sits on.
 *
 * `DRAWER_CHIP_ON` offsets against `drawer`, because a filter chip sits on the
 * drawer gradient. These sit inside the `drawer-raised` block, so the shipped
 * pairing drew the selected row's focus ring against a colour two steps away
 * from the one behind it while the three rows around it — `DRAWER_NAV_ROW` —
 * got it right. One block, one offset.
 */
export const DRAWER_NAV_ROW_ON =
	'transition-opacity bg-drawer-press text-drawer-press-ink font-semibold hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer-raised';

/**
 * The same trigger on a **sunk row** rather than on a card — the pre-flight's
 * *What happens to this household?*
 *
 * `PAGE_SUNK` is right for the console's role menu, which opens on a `Card`,
 * and wrong here by exactly one token: the pre-flight's rows are filled
 * `surface-alt`, so the ring has to offset against that or its 2px gap paints
 * a colour nothing on that row is. The hover was already correct — `PAGE_SUNK`
 * moves *up* to `surface` — which is why this one survived the first sweep and
 * the two `Delete` buttons beside it did not.
 */
export const PAGE_SUNK_ON_ROW =
	'transition-colors bg-surface-alt border border-line text-ink-body hover:bg-surface hover:border-line-strong hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * The same, with nothing chosen yet.
 *
 * One utility apart, and it is a whole constant rather than a class appended
 * beside it: two text utilities on one element are resolved by their order **in
 * the sheet**, not in the attribute, so `text-ink-muted text-ink-body` is a coin
 * toss that happens to land right. It shipped as an inline `color` instead,
 * which resolved deterministically and beat the hover — so the one row still
 * waiting on an answer was the one row that did not respond to being pointed at.
 */
export const PAGE_SUNK_ON_ROW_UNSET =
	'transition-colors bg-surface-alt border border-line text-ink-muted hover:bg-surface hover:border-line-strong hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt';

/**
 * `PAGE_ICON` for a control sitting **inside a field** — the console's two
 * search clears, which are the app's only ones.
 *
 * The field is `bg-surface`, so the ring offsets against that rather than
 * against the page ground the field is standing on. `PAGE_ICON` itself stays
 * as it is: its other three callers are on the item sheet, whose ground really
 * is the near-`canvas` gradient.
 */
export const PAGE_ICON_IN_FIELD =
	'transition-colors text-ink-muted hover:text-ink hover:bg-surface-alt rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * `PAGE_BUTTON_OUTLINE` with its menu open — Activity's *Export*.
 *
 * A complete constant rather than three utilities appended beside the closed
 * one, for `PAGE_SUNK_UNSET`'s reason: two `bg-`, two `border-` and two `text-`
 * utilities on one element are resolved by sheet order and not by the order
 * they are written in.
 *
 * It lands on the same fill the sort trigger's open state does. The two are the
 * only menu triggers on the console's page ground, and a menu opening under one
 * of them should not look like a different kind of event to a menu opening
 * under the other.
 */
export const PAGE_BUTTON_OUTLINE_ON =
	'transition-colors bg-surface-alt border border-line-strong text-ink hover:opacity-90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

/*
 * ---------------------------------------------------------------------------
 * The split primary — bulk entry's way in (D67)
 * ---------------------------------------------------------------------------
 *
 * **The first split control in the app.** The primary keeps its fill, its
 * radius and its height and grows a second cell: pressing the label opens the
 * Add sheet exactly as it does today, pressing the chevron opens the menu that
 * holds every other route in.
 *
 * **Each half lights on its own, and that is the entire affordance.** Two hit
 * areas, one shape — hovering the label must never light the chevron. So the
 * hover cannot be `PAGE_BUTTON_PRIMARY`'s `hover:opacity-90`: fading one half
 * would show the page ground through it and put a seam down the middle of a
 * control whose whole point is that it is one shape.
 *
 * It goes through a custom property for the reason `HouseholdTile`'s `--tile`
 * trio and `RunSegment`'s `--tab-*` do, and it is the fifth time this app has
 * hit it: **the resting fill is a stored value and therefore an inline style,
 * and an inline `background` beats any `hover:` class.** A half painted inline
 * would have no hover at all.
 */
export const PAGE_SPLIT_HALF =
	'transition-colors hover:bg-[color:var(--split-hover)] active:bg-[color:var(--split-press)]';

/**
 * The box the two halves sit in.
 *
 * **One focus stop, not two.** The ring is `focus-within` on the wrapper and
 * goes round the whole control, because two tab stops on one button is how a
 * split control becomes tiresome with a keyboard. The chevron is
 * `tabIndex={-1}` and `↓` opens the menu from the label — the split-button
 * pattern's own answer — and Escape hands focus back.
 *
 * `overflow-hidden` so the two halves share the wrapper's radius; the rule
 * between them is inset rather than full-height, so the fill reads as one shape
 * with a seam rather than as two buttons pushed together.
 */
export const PAGE_SPLIT =
	'relative flex items-stretch overflow-hidden focus-within:outline-none focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-canvas';
