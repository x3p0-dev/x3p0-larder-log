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
