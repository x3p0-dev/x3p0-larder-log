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

/** The dashed "add a term" chip. */
export const DRAWER_CHIP_ADD =
	'transition-colors border border-dashed border-drawer-dashed text-on-dark-faint hover:border-on-dark-faint hover:text-on-dark active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** A solid secondary button — Sign out, Copy, Leave household. */
export const DRAWER_BUTTON =
	'transition-colors bg-drawer-raised text-on-dark-muted hover:bg-drawer-press hover:text-drawer-press-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer disabled:opacity-50 disabled:pointer-events-none';

/** An icon-only control that is quiet until touched — pencils, chevrons. */
export const DRAWER_ICON =
	'transition-colors text-on-dark-label hover:text-on-dark hover:bg-drawer-raised rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

/** A destructive icon control. Red at rest so the consequence is legible. */
export const DRAWER_ICON_DANGER =
	'transition-colors hover:bg-drawer-raised rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer disabled:opacity-40 disabled:pointer-events-none';

/** A text field on the drawer. */
export const DRAWER_INPUT =
	'transition-colors bg-drawer-well border border-drawer-line text-on-dark outline-none focus-visible:border-on-dark-faint focus:border-on-dark-faint';

/** A whole row that is itself a target — the account row. */
export const DRAWER_ROW =
	'transition-colors hover:bg-drawer-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset';

/**
 * A card that is itself the target, edge to edge — an invite.
 *
 * Its own surface rather than `raised`, because it sits *on* the drawer body
 * and needs to lift away from it in both themes; `raised` is lighter than the
 * body in light and darker in dark, which would invert the hover.
 */
export const DRAWER_CARD =
	'transition-colors cursor-pointer bg-drawer-card border border-drawer-line hover:bg-drawer-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-inset';

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

/** A quiet secondary — Cancel, the stepper's minus. */
export const PAGE_BUTTON =
	'transition-colors bg-surface-alt text-ink-body hover:bg-line hover:text-ink active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none';

/** An icon-only control that is quiet until touched — close, expand. */
export const PAGE_ICON =
	'transition-colors text-ink-muted hover:text-ink hover:bg-surface-alt rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

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
 */
export const DRAWER_GHOST_DANGER =
	'transition-colors text-drawer-danger hover:bg-drawer-raised active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-drawer';

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
