# CLAUDE.md

Project instructions for Claude Code. Read this before doing anything else.

## What this project is

**Larder Log** — a pantry and freezer inventory tracker for a household. Track
what you have, how much, and where it lives; see what's low or out; build a
shopping list per store.

**This is NOT a WordPress plugin.** It lives in
`/wp-content/plugins/x3p0-larder-log/` purely for convenience, and it carries
leftovers that make it look like one (an `x3p0-` name, WordPress-era
`.gitignore` entries, `.phpstorm.meta.php`, sibling `x3p0-*` plugins in the
parent directory). Ignore all of that.

Never propose custom post types, taxonomies, post meta, `wp-scripts`,
`plugin.php`, or anything else WordPress. If a request seems to assume
WordPress, say so rather than building it.

## Current state

**Phases 3 and 4 are built and published.** **v11 is live** as of 2026-08-27
(`ver_1c0448898da744d3b2b42a89c4272e21`, 93 files, 16 seconds) — it carries
Phases 4.10, 4.11 and 4.12 and D45–D51, and it is **the publish that took the
`profiles` table live** (D46), the third additive schema change since Phase 2.
Verified after the fact: `applied: true`, `pendingOperationCount: 0`, and
`data.schemaHash` equal to `data.plan.appliedSchemaHash`. **Nobody has clicked
v11** — everything below that says "nobody has clicked it" is still true, and is
now true *in production* rather than only locally.

v10 (`ver_0026484fd67c495b8d3b7d52b9215d67`) was the legacy-hex swatch fix. v9 added a
document-level `color-scheme` meta and removed `/api/probe`, which is **gone
from the artifact and 404s in production even with its key**. v8 is what carried
the schema:

**v8** (`ver_09cc0c8a8bb34dd38ed92fae693c63d4`, 105 files, 16 seconds) carried
everything through D44 — the nine stamp columns, the A–Z term order, and the
device fixes. The v4 publish on 2026-08-26 ended a three-day blockade; v5–v7
were the probe rounds that found the hosted-runtime divergences. Publishing
still needs a rationale-header shim, re-checked against npm on 2026-08-27.

**The hosted runtime is a different JS engine from the one `sf dev` runs**,
which broke `createInvite` in production while it worked locally — read *The
hosted runtime is not the engine `sf dev` runs* before writing any handler.

A real Spacefast Zero project: `sf.jsonc`,
`theme.json`, a Preact + TypeScript client in `client/`, pure domain logic in
`shared/`, and a capsule in `server/` holding the full schema from
`.docs/data-model.md`, five live queries, and seventeen mutations. The schema is
declared inline in `server/index.ts` and **has to be** — see
[D27](../.docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry)
before editing it.

Data lives in the database. **Four** `localStorage` call sites remain, all
correct: the per-device theme override (D25), which household this device is
pointed at (D33), the shopping trip's ticks and list mode (D41), and where the
view was left — drawer, tab and filters (D51). Same reasoning throughout — a
dark-mode choice on a phone should not follow you to a desktop, neither should
which pantry you were last looking at, and neither should which shelf you had
filtered to; the trip is a record of what is in *this* person's cart right now.

**A user may belong to several households** as of 2026-08-25
([D33](../.docs/decisions.md#d33-a-user-may-belong-to-several-households),
which supersedes D18). Every query and scoped mutation names a household, and
the id is a **selector, never an authority** — handlers resolve it against the
caller's own memberships. Reads heal (`selectMembership` falls back to a
deterministic default when the requested household is not yours), writes refuse
(`findMembership` matches exactly or throws). Roles are per household: the same
person can be an owner in one pantry and a viewer in another. It needed **no
migration** — D3 built the schema for this.

The React/Vite prototype in `src/` is **deleted**, along with `index.html`,
`vite.config.js`, and the react/vite/tailwind dependencies. Zero compiles
Tailwind itself. There is no `npm run prototype` any more.

Phase 3 added the client half of households, members, and invites — the six
server handlers had shipped with Phase 2. Invite links are `/?join=<code>`
rather than `/join/<code>`, because the published space serves nothing at an
unknown path and `sf publish --dry-run` prints `SPA false`
([D28](../.docs/decisions.md#d28-an-invite-link-is-joincode-not-joincode)).
The project's own docs are no longer in the publish payload: `docs/` is `.docs/`
and this file is `.claude/CLAUDE.md`, both behind the serving layer's 403 on
dot-prefixed paths
([D29](../.docs/decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload)).
**Phase 3 is exercised end to end as of 2026-08-27**: an invite was minted on
the published space and **a second person redeemed it and joined the
household**. Invites, membership and roles have now been through a real two-user
round trip rather than one identity in two tabs. D33's other half is closed
too: one identity in two households was already verified server-side, and two
*people* sharing one household now is.

Phase 4's read-only pass landed on 2026-08-25: every write affordance is gated
on `can()` and is **absent rather than disabled**, with one "View only" chip
explaining it ([D30](../.docs/decisions.md#d30-a-viewers-missing-controls-are-absent-not-disabled),
which amends D20). Verified locally against the real code path — `sf dev` makes
you an owner, so a throwaway endpoint rewrote the caller's own role, and it has
been removed. The rest of Phase 4 was already built and the roadmap now says so.

### The Cellar reskin (Phase 4.5) is built, and is the bulk of the current diff

Everything structural in `.claude/docs/design/ui-directions.md` is implemented,
the household switcher included — it was the last one deferred, and D33 settled
the decision it was waiting on. What landed on 2026-08-25:

- **Tokens.** `theme.json` carries the warm-brown palette and an 8-step type
  scale as `light-dark()` pairs. Term colors became *tokens* rather than hexes
  ([D32](../.docs/decisions.md#d32-a-term-stores-a-color-token-not-a-color));
  `shared/palette.ts` says which exist, `client/lib/palette.ts` says what they
  look like.
- **Both themes.** Light and dark come from the same table, including a full
  dark quad for all sixteen term colors.
- **New surfaces.** Item card, the dark left drawer (docked / slide-over /
  68px collapsed rail with flyouts), the Filter and Settings panes, the item
  sheet for add *and* edit, and the sort menu. (The contextual shopping list
  that landed with it has since been replaced — see Phase 4.8.)
- **Interaction states** live in `client/lib/controlStyles.ts` as literal class
  strings — `DRAWER_*` and `PAGE_*`. Inline styles cannot express `:hover`,
  which is why the drawer shipped once with no feedback at all.
- **Nine components were replaced and deleted**: `Sidebar`, `FacetSection`,
  `SettingsDrawer`, `TaxonomyManager`, `ItemFields`, `ChipPicker`,
  `IconPicker`, plus the `createTermFor` adapter.
- **The household switcher is built** (2026-08-25) — the drawer's household row
  and the rail's household flyout both open it: every household you belong to
  with your role and item count, a check on the current one, then *New
  household* and *Join with a link*. `HouseholdSwitcher` is the contents; each
  host owns its own dismissal.
- **Term icons were cut** and the `icon` column kept, holding `''`
  ([D34](../.docs/decisions.md#d34-term-icons-are-cut-and-the-column-is-kept)).
  `shared/icons.ts` and `client/lib/icons.ts` are gone. Do not "clean up" the
  column: dropping it needs `sf db migrate --drop`, refilling it is additive.

**Published as of 2026-08-26 (v4) and seen by a second person on 2026-08-27.** Two `font-mono` sites remain: the switcher's invite-code field,
which is arguably a real monospace use, and one loading string in `Pantry`.

### Destructive actions (Phase 4.6) are built — 2026-08-26

The spec's *Destructive actions* section, governed by
[D36](../.docs/decisions.md#d36-undo-what-comes-back-confirm-what-doesnt):
**undo what comes back, confirm what doesn't**. Two components replace the three
idioms that were there before.

- **`Toast.tsx` / `useToasts.ts`** — actionable (6s, Undo, dismiss) and plain
  (3.5s, no controls); the drawer surface in both themes; a timer bar that
  pauses on hover and focus; max 3 stacked; Cmd/Ctrl+Z from anywhere. Each row
  owns its own countdown, so hovering one pauses only that one. `UndoToast` is
  deleted.
- **`ConfirmDialog.tsx`** — one shell for confirm, blocked, and the app's only
  typed confirmation. **Crimson is never a button**: the primary is the ordinary
  ink/cream fill, and crimson appears once as the icon tint.
- **Every term kind now blocks while in use**, widening D16 from locations
  alone. `termBlock` in `shared/term.ts` is one rule the server throws and the
  client renders — do not write that sentence twice. The trash on an editing row
  is **live in every case and neutral, never disabled** (a disabled control
  cannot explain itself), with the item count beside it.
- **Leave household** moved to the foot of the Household section and relabels to
  *Delete household* for the last member. `deleteHousehold` finally has a client
  caller.
- ***Recently added* got a sort at all** (D35). It previously applied none, so
  it rendered oldest-first — the opposite of its label. It sorted on the
  platform's `createdAt` until D44 moved it to `addedAt` on 2026-08-27.

### Flows outside the shell (Phase 4.7) are built — 2026-08-26

The spec's *Flows outside the shell* and *The marketing page*. Everything before
the app shell.

- **The signed-out surface is two pages**
  ([D37](../.docs/decisions.md#d37-the-signed-out-surface-is-two-pages-not-one)):
  `/` is a marketing page, any other URL is a bounce to the sign-in card. The
  entry routes on the visitor's reason for being there — invitation, then an
  abandoned sign-in, then the path.
- **New components.** `MarketingPage`, `SignInCard` (plus `SigningInCard` and
  `SignInFailedCard`), `FirstRun`, `InviteLanding`, and the furniture they share
  in `OutsideShell` and `Brand`. `JoinBox` and the in-app invite banner are
  **deleted**; the `Gate` in `Pantry.tsx` no longer handles invites at all.
- **The hero mock is the real `ItemCard` and its steppers are live** — three
  sample rows, stocked / low / out, with working plus and minus so a visitor
  watches the ramp move rather than reading about it. `HeroMock` holds the
  quantities so a press re-renders three cards and not the page. The step is
  `fromInt(toInt(qty) + step)`, the same expression `adjustQty` runs — do not
  reimplement the clamp. `ItemCard`'s `canExpand={false}` drops the chevron:
  there is no *Edit* or *Remove* behind the accordion on a public page.
- **`invitePreview` is the one query that answers a guest**
  ([D39](../.docs/decisions.md#d39-an-invite-preview-is-the-one-query-that-answers-a-guest)).
  The code is the authorization. Unknown, malformed and **revoked** collapse to
  one bare `invalid` — naming the household behind a dead link would tell a
  stranger something about it. Expired is the exception, because that screen
  exists to say who to ask for a new one.
- **Signing in is the accept**
  ([D38](../.docs/decisions.md#d38-signing-in-is-the-accept)). The consent is
  written beside the code in `sessionStorage` *before* the redirect, and
  `Pantry` redeems on arrival. Zero's sign-in is a full-page
  `location.assign` — there is no popup and no promise that survives it.
- **The empty household.** At zero items the top bar carries neither the sort
  trigger nor an *Add item*; the empty state owns the screen's only primary.
  `empty` is `items.length === 0`, **not** `sorted.length === 0` — a filter that
  matches nothing is a different screen and keeps its one quiet sentence.
- **Seeds are generic now** — Pantry · Refrigerator · Freezer and Grocery ·
  Warehouse · Market ([D40](../.docs/decisions.md#d40-seeded-terms-are-generic-and-there-are-still-three-stores)).
  **Types are the exception and were rewritten on 2026-08-27** — see *The
  seeded types cover a supermarket* below.
- **`Theme` gained `dark`, `accent`, `disabledBg` and `disabledText`**;
  `theme.json` gained `wordmark-md`, `wordmark-lg`, `headline-sm` and
  `headline`. `accent` exists because the page wordmark was hard-coding the
  light crimson in both themes.

### The shopping list (Phase 4.8) is built — 2026-08-26

The spec's *Shopping list*, governed by
[D41](../.docs/decisions.md#d41-the-shopping-list-is-a-mode-and-its-checks-are-local):
**the list is a view of the items, not a thing you keep.** It is a *mode* that
replaces the content column, not a modal over it. `ShoppingListModal` and the
store banner above the grid are **deleted**; the Store filter is a filter again.

- **`shared/shoppingList.ts`** owns the grouping and both orderings — groups
  A–Z with the storeless one last, rows out-before-low then A–Z, the latter
  being the *Needs restocking* sort reused rather than written twice. An item
  naming several stores appears under **every** one of them, so the count is of
  items and never of rows. `npm test` is at 150 assertions.
- **`ShoppingList.tsx`** — one card per store in
  `md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))]`. **`auto-fill`,
  not `auto-fit`**, and that is the opposite of the item grid on purpose: with
  one card left after a store filter, `auto-fit` would stretch it across the
  screen. The card header is the tag component stretched to the card's width.
- **The whole row is the checkbox** (amended 2026-08-28 — see below). Below
  `md` it stacks — the spec leaves the exact breakpoint open and `md` is a
  choice made here.
- **`ShoppingListTrigger.tsx`** sits **immediately after the three status
  pills** and is **secondary** — `surface` on `line strong`, ink label, ink
  count pill. Placement does the work colour would have: the eye crosses
  `9 in stock · 6 running low · 5 out` and lands on the thing to do about it.
  It was amber for one round, which put it a gap away from `6 running low` —
  already amber, and meaning something else. Hidden when nothing is low or out.
  **Its count is the household's, never the filtered one.** When space is short
  it drops its label for a cart glyph.
- **The trigger is a toggle that stays put** (2026-08-27, amending D41). It was
  a pair — *Shopping list* going in, `‹ Back to items` coming out — and below
  `md` the two lived in **different rows**, so a press moved the thing under
  your finger. Now it holds its slot at every width, keeps its label, and wears
  the **low tint** when the mode is on — `low.bg` filled, `low.ink` for border
  and label, count pill inverted, `aria-pressed` — which is what the first
  boards drew for it. **Amber is still rejected at rest** and the reason is why
  it works here: in list mode the status pills are not on screen, so nothing
  else in the row is amber. Its border is the low *text* colour, never the
  border token, per the contrast note above.
- **Row 2's left slot holds its width in both modes.** The pills go
  `invisible` rather than unmounting and *Back to items* is laid over them
  absolutely, because unmounting them slid the trigger a third of the way across
  a 1440 screen on every press. `visibility: hidden` keeps the geometry *and*
  drops the pills from the tab order, which `opacity-0` would not.
- **The exit is quiet now** — chevron plus bold words on nothing, resolving
  under the pointer. Its resting half is `PAGE_BUTTON_QUIET` in
  `controlStyles`, **shared with the sort trigger**, which is the other quiet
  control in that row.
- **Row 2 sizes off the measured content column, not the viewport.** A
  `ResizeObserver` on `<main>` sets `compact` below `ROW2_FULL_PX` (910, derived
  from the parts), which is what the pills, the trigger and the sort all read.
  `md:` was wrong in the middle: a docked drawer costs 340px, so a 1280 screen
  leaves 872 and is as cramped as a phone. **Do not put these controls back on a
  breakpoint.**
- **Below `md` the trigger lives in the mobile header**, squared up with the
  wordmark opposite the menu button — it is chrome, and moving it there is what
  lets the status pills and the sort share one line at 390. **It stays there in
  list mode too**, tinted. The *exit* stays in row 2 with the list it exits. Row
  2 drops `Showing X of Y` when compact.
- **`useTripChecks.ts`** — checks in `localStorage`, the **third** thing there
  after the theme (D25) and the household (D33). Cleared when the item leaves
  the list, after 24 hours with no ticking, or on a household switch. The
  household id is stored *in* the record rather than used as its key, because a
  key per household would hand yesterday's ticks back on a switch away and back.
- **`Theme` gained `divider`** — a hairline *inside* a card. Softer than
  `border` in light and identical to it in dark: at `#E2D5C0` a rule every 56px
  stripes a card into a ladder, and anything below `#3E3527` vanishes at the
  dark fill.
- **Row 2 empties out and re-fills in list mode** — the status pills go (you are
  already filtered to low and out) and so does the sort trigger (the list has
  one fixed order). *Back to items* takes the left, over the pills' reserved
  width; the trigger stays exactly where it was and tints; and
  `11 to buy · 4 stores · 3 in the cart` takes the right. **Row 1 never
  changes**, so the switch reads as the content changing rather than the app
  changing.
- **The status pills tighten at 390 rather than truncating** — padding 16 → 13,
  gap 9 → 7, label 14 → 13.5 — which is what makes room for the trigger's row.

**Built twice.** The first pass was specced against a top bar with a title and
no status pills, which **does not exist**; the `-2` boards drew the real one and
the trigger changed colour and position. The mobile primary was left alone —
the boards draw *Add item* at 390 as a square in row 1, and the pinned bottom
bar is correct. **The lesson is the spec's own: anything not drawn on a canvas
drifts out of the design document silently.**

**One copy change on the marketing page**, and it is the only place the build
now differs from the front-door boards: the third benefit said *"Nothing to tick
off"*, which the checkbox makes false.

**Nobody has clicked any of it.** Verified the usual way: the capsule compiles
and reloads, `npm run typecheck` is clean, `npm test` passes, and every new
utility class is in `/zero.css` — checked by **printing the selectors**, not by
hand-writing the escaped form.

### Household colour (Phase 4.9) is built — 2026-08-26

The spec's *Household colour*, governed by
[D42](../.docs/decisions.md#d42-a-household-has-a-colour-and-it-is-one-of-the-sixteen).
**The first of two additive schema changes since Phase 2** (the other is D44's
nine stamp columns): `households.ink`,
a colour token defaulting to `''`. Nine tables and sixteen mutations still; the
column applies on the next publish with no flag.

- **The rail, the switcher and the invite card all drew a tile that nothing
  set.** The rail took the *first location's* colour and `invitePreview`
  returned the same stand-in, so every seeded household was olive and renaming a
  location could recolour a pantry. `invitePreview` no longer reads `locations`.
- **`shared/household.ts`** — `householdLetter()` (first letter of the first word
  that is not an article: *The Lake Cabin* gives **L**), `householdInk()`
  (an unset colour resolves from the row **id**, so it survives a rename), and
  `toHouseholdInk()` (a token or `''`; a legacy hex is refused, unlike
  `normalizeInk` for terms). In `shared/` because the server answers them too.
  `npm test` is at 165 assertions.
- **`HouseholdTile.tsx`** — one shape at every size, radius **30%** of the side
  and the letter Playfair 700 at **42%**, both derived so a fifth size is a
  number rather than a table entry. The fill follows the **theme**, not the
  surface: light `base` + cream letter, dark variant + near-black. Rail hover and
  press are the colour mixed 10% toward white and 9% toward black — derived, via
  `--tile` / `--tile-hover` / `--tile-press` custom properties, because a
  `:hover` cannot be an inline style. This replaced the hard-coded
  `#A85E33 / #B96A3C / #98522B` triple, which was one household's terracotta
  written down as though it were a token.
- **`HouseholdIdentity.tsx` is the term composer**, not a new component — 26px
  swatch, 40–44px field at radius 11, the 8 × 2 picker **inline**. Settings'
  pencil flips the section into `TermPanel` (`HOUSEHOLD · EDITING`, *Done*).
  Owners only. **No tile preview**, and that is the one place the build
  knowingly differs from the boards: the spec asks for a 34px preview on the
  grounds that the tile is elsewhere, but the drawer's own household row is
  directly above the panel and already shows it.
- **A selected chip keeps its dot, everywhere** (2026-08-27). The item sheet's
  Location / Type / Store chips dropped theirs on selection, on the reasoning
  that the fill already said what the dot was for — but the fill says
  *selected*, and only the dot says *which term*. The drawer's filter chips
  already kept theirs; this is the sheet catching up. **The dot reads against
  the chip, not the sheet**: a selected chip is filled with `inkBg`, the page's
  inverse, so the dot takes the *other* theme's value —
  `entityColorFor(id, terms, on ? ! dark : dark)`. That is not only consistent
  but measurably better, since those two palettes are tuned against exactly
  these two grounds: across all sixteen colours the worst dot-on-fill contrast
  goes from 1.98:1 to 3.09:1, clearing the 3:1 non-text floor everywhere.
- **Every picker draws one palette, and it follows the theme** — light `base` in
  light, the dark variant in dark, on the drawer and on a card alike.
  `ColorPicker`'s `onDark` now governs the **well and the selected ring only**,
  and `TermRow`'s swatch takes the same rule. The old surface-dependent dot was
  wrong in two places, not one: in dark mode the item sheet drew light bases
  while the chips it recoloured took `darkDot`.
  **One divergence survives on purpose** — a term chip's dot on the drawer is
  still `drawerDot(c)` in both themes, so the Filter tab shows a light base in
  the picker and a brighter ink on the chip below. Only eight of sixteen
  `onDrawer` values exist; the question is written up in `.docs/notes.md` under
  *Product questions*, to settle when they are finished. **Do not "fix" it in
  passing.**
- **A collision is allowed and nothing mentions it.** There is **no uniqueness
  rule**, and nothing is disabled (D36's reason: a disabled control cannot
  explain itself). The spec's caption — *Aqua — also used by **The Shop**.* —
  was built and removed: with nothing restricted there is nothing to explain, so
  it printed the absence of a rule. That is the **second** deliberate departure
  from the boards, with the missing tile preview. `TermColor` gained `name` and
  it now survives only as each dot's `aria-label` and `title`, which is the one
  place it earns its keep — sixteen bare circles announce as "Choose color 7".
- **`ModalShell.tsx` is `ConfirmDialog`'s box, extracted** — scrim, focus trap,
  Escape, the fade, and `DialogButtons`. `NewHouseholdDialog` is the confirm
  shell with a form in it, which is what the spec asks for in so many words. The
  switcher's inline create form is **gone**: a name and a colour do not fit in a
  264px flyout without pushing the household list off the bottom. Joining stays
  inline — a code is one field.
- **The colour arrives already chosen** on both creation surfaces: the first
  unused across the households you are in, walking the sixteen in order.
- **A just-created household now actually opens.** `Pantry`'s selection heal
  adopts the server's answer whenever the selection is absent from `households`
  — but that list is a separate live query and re-emits *after* the create
  mutation resolves, so for one round trip a brand-new id looked stale and got
  bounced back to the household you were already in. Joining had the same hole,
  and so did the switcher's old inline create; this is **not** new to the
  dialog. A deliberate selection now `claim`s the id and the heal waits.
  **Do not "simplify" the claim away** — "not in the list" only means stale if
  the list is current, and nothing can ask it whether it is. Two signals release
  it: the list carrying the id, or `household` resolving to it.

**Verified without a browser**: typecheck clean, 165 assertions pass, the
artifact shows `ink` on `households` with `default: ""`, the three `--tile`
classes are in `/zero.css` in the right order (base → hover → active), and the
**real handlers** were driven over `POST /__spacefast/zero/run` — an explicit
`color-7` stored, an omitted colour resolving to a stable default,
`updateHousehold` writing a new one, `invitePreview` returning the household's
own colour. **Nobody has clicked any of it.**

**Superseded 2026-08-27: it has been clicked.** A real session on a Pixel 8 Pro
and with a second person found six defects nothing in this list could have
caught — a stale effect dependency, a ring clipped by `overflow-x-auto`, a
`100vh` drawer running past the mobile viewport, a hover painted the colour of
the row under it, a picker that snapped shut, and a chip that dropped its dot.
**Compiling, curling and reading the artifact prove a build is coherent, not
that it is usable.**

### The applied filter bar (Phase 4.10) is built — 2026-08-27

The spec's *Applied filters*, governed by
[D45](../.docs/decisions.md#d45-the-applied-filters-are-a-row-of-the-top-bar-not-a-badge-on-the-drawer):
**a filter you cannot see is a filter you cannot remove.** A third top-bar row —
`Clear filters`, then one chip per active term — present only while at least one
**term** filter is on, so most of the time the bar is still two rows. No schema
change; nothing server-side moved.

- **`AppliedFilters.tsx`** is the whole component. It takes resolved filters and
  two callbacks and owns nothing but the 140ms exit. **A chip's key is
  `kind:id`** — row ids are unique only within a table, and the hosted runtime
  issues sequential integers, so a location and a store both holding `"4"` is
  the normal state of a seeded household.
- **Three new `PAGE_*` styles**, and the rule behind them generalises: **an
  interaction state on the ground moves away from the ground, not toward it.**
  The app's usual ghost hover is `surface-alt`, which *is* the ground gradient's
  middle stop — a chip hovering to it goes from a step lighter than the ground
  to exactly the ground and reads as disappearing. `line` moves the other way in
  both themes at once. Controls on a **card** keep sinking to `surface-alt`,
  where it is a real step.
- **Hover, pressed and focus are one treatment, and there is no transform.** The
  chip is leaving the moment you press it, so a separate press state has nothing
  to report — and with the two merged a `scale()` would fire on *hover*. The
  focus ring is crimson, not the page's ink: ink is what the chip is made of.
- **The whole chip is the target.** The `×` is a glyph, not a second hit area.
  Removal gets no toast — D36 is about records, and a filter is neither a record
  that comes back nor one that does not.
- **`Clear filters` takes every term *and* the status pill, never the search.**
  Search has its own `×` and you can see it working. The drawer's
  *Clear all filters* now calls the **same function**, and its visibility moved
  with it: gated on terms-or-status rather than on "anything at all", or a
  search alone would put a no-op button on the Filter tab. `clearAllFilters` —
  search included — survives for the empty state, where the copy says the
  filters *together* rule everything out.
- **Desktop wraps; mobile scrolls, and that split is `md:`, not the measured
  column.** This is **not** the mistake the row-2 note warns about. Row 2 asks
  whether its labels fit, which a docked drawer changes without the viewport
  moving. This row asks whether there is a **scroll gesture** — a mouse has
  none, so a docked drawer at 1280 must still wrap. Different question,
  different axis. At 390 the clear is pinned outside the scroller and the chips
  bleed past the gutter with `pr-[18px] -mr-[18px]`, which cancels on desktop.
- **`Clear filters` is padded symmetrically at every width, and the row has a
  gap.** Both were the same 2px mistake, found on a phone. The boards give the
  clear `padding: 0 12px 0 2px` so its label sits flush with the column edge —
  but on touch the hover fill is the only press feedback there is, and 2px put
  that fill hard against the *C*. At 12px the label lines up with the status
  pills' labels one row above, which is the alignment that was actually wanted.
  The chips' scroller keeps its `pl-1` **uncancelled** for the other half: those
  4px plus the row's `gap-1` are the 8px the two boxes had none of.
- **The mobile menu button carries the crimson total**, so the fact that
  something is filtering survives scrolling past row 3. Same construction as the
  rail badges, except the ring is the page ground and therefore follows the
  theme where the rail's cannot.
- **Row 3 stays in list mode.** The list obeys the same filters. Row 1 never
  changes and row 2 swaps contents, which is what makes the switch read as the
  content changing rather than the app changing.
- **The live region is in `Pantry`, not in the bar** — the bar unmounts with its
  last chip, so *Filters cleared* would be announced from a node that has just
  been removed. It quotes **matching-of-household** (`Showing 12 of 20`), which
  is the spec's own sentence; row 2's `Showing X of Y` is a different pair
  (rendered-so-far of matching) and the two have always disagreed on screen.
- **Under `prefers-reduced-motion` the chip still fades**, it only loses the 4px
  rise — `motion-safe:-translate-y-1`. A chip that blinks out gives no sign the
  press did anything, which is the one job the motion has.
- **Focus moves to `Clear filters`** when a chip is removed and the bar
  survives — the element that had focus is gone, and focus falling to the body
  restarts a keyboard user at the top of the document. It paints no ring after a
  mouse press, because a programmatic `focus()` matches `:focus-visible` only
  when the interaction that led to it was keyboard-driven.

**Filtering is multi-select now, and that is the other half of this** — OR
inside a group, AND across groups. Each group holds a **list** of ids;
`shared/filter.ts` owns the rule and is in `shared/` because an `every` where a
`some` belongs still compiles, still runs, and hands back an empty grid.
`npm test` is at 235 assertions.

- `FilterSection` and the rail flyouts **toggle** and carry `aria-pressed`;
  *All items* lights on an **empty** group rather than tracking an id.
- **The rail's quick-filter flyout stays open on a pick**, alone among the
  rail's menus: a group holds several terms, so closing after each one means
  reopening the panel to add the second.
- The rail badges count the group. `emptyCopy` counts **terms, not groups**, so
  two locations land in the "anything else" branch — correctly, since with
  *Pantry or Freezer* on and nothing showing neither name is the cause.
- The add sheet prefills a location **only when the filter is unambiguous**, and
  the shopping list names a store only when exactly one is on.
- **The late paths use functional setters.** A chip's removal fires 140ms after
  the press and `restoreTerm` fires after a round trip; either could otherwise
  write back an array captured before something else touched the same group.

**Verified without a browser**: typecheck clean, 222 assertions pass — fourteen
of them new, covering the OR/AND rule including the case that separates it from
OR-across — `sf dev` on `--port 4199` compiles and serves, and **every** new
utility is in the live `/zero.css`, checked by *printing and unescaping the
selectors*, including the `md:` variants' line numbers to prove each lands after
the base rule it overrides. **Nobody has clicked any of it.**

### The account's display name (Phase 4.11) is built — 2026-08-27

The spec's *First run — the display name*, drawn on
`.claude/docs/design/display-name-light.html` / `-dark.html`, governed by
[D46](../.docs/decisions.md#d46-the-display-name-is-on-the-account-and-it-is-asked-before-the-fork):
**the account carries a name; the identity does not carry it for us.** A real
signup on the published space is janky in a way the design assumed away — plenty
of accounts arrive through my.spacefast.com with no profile name, and the ones
that have one did not set it here. `ctx.auth.displayName` is a **suggestion, not
an answer**.

**The third additive schema change since Phase 2**, after `households.ink` (D42)
and D44's nine stamp columns. Now **ten tables, five queries, seventeen
mutations**; it applies on the next publish with no flag.

- **`profiles`** — `userId`, `displayName`, `addedAt`, `changedAt`, on a
  `by_user` index, which is the only way in. **Stamped from birth on purpose**:
  D44's own note is that a column is permanent and a row written without one
  never gets one, and this table had no rows yet. There is no unique constraint
  any more than `id()` is a foreign key — `setDisplayName` reads before it
  inserts, and that read *is* the one-row-per-account rule.
- **`memberships.displayName` is now a documented copy**, not a second name.
  `setDisplayName` **writes back through every membership** the account holds;
  skipping that would show the new name to the person who typed it and the old
  one to everybody else, which is worse than having no column. Rows already
  agreeing are skipped, so a rename across five households is one write.
  `accountName()` in the capsule is the single place a membership's name is
  resolved — profile → membership → identity — and both `createHousehold` and
  `redeemInvite` stamp through it.
- **`needsName` is narrower than "has no profile row".** An account that
  predates the table carries the Gravatar name it joined under on every
  membership, which is a name it effectively already gave; sending those people
  through a required screen would be a wall in front of everyone who was using
  the app yesterday. So the query falls back to the memberships and stops only
  an account with **no name anywhere**. Verified by creating a household with no
  profile row and watching `needsName` come back false with the inherited name.
- **The gate is above the invite landing, not below it.** Someone accepting an
  invite never sees *Name your household* and is exactly the person whose name
  the household is about to see. The consented auto-redeem waits on
  `nameSettled` for the same reason — the write-through would fix the membership
  a beat later either way, and waiting is what keeps the others from seeing the
  wrong name in between. The screen **blocks on the `profile` query** rather
  than painting the invite card and replacing it, which costs nothing since
  every subscription starts in the same tick.
- **`shared/profile.ts`** owns the rule — `normalizeDisplayName`,
  `isValidDisplayName`, and `pickDisplayName`, the fallback chain both halves
  walk. `npm test` is at **235 assertions**.
- **`Pantry` renders `accountName` everywhere a person appears**, resolved from
  the profile with the identity as fallback. The entry now passes
  `auth.displayName` **raw** — the old `|| 'Signed in'` made an absent name look
  present, which is precisely the case this screen exists to catch, and it would
  have prefilled the field with *Signed in*.
- **Two deliberate departures from the boards.** The account row carries a
  *Sign out*: the screen is required, so without one an account signed in by
  mistake has no exit that is not clearing cookies. And the field's hint is
  **gone** — both of its branches explained where a prefilled value came from,
  and [D48](../.docs/decisions.md#d48-a-name-nobody-typed-is-not-an-answer)
  removed the prefill.

**Editing the name in the drawer landed with Phase 4.12** — in the account menu
rather than a Settings section, since D49 removed the Account block. It goes
through the same `setDisplayName`, which was already the right shape: it upserts,
and the write-through is what a rename needs.

**A fresh `sf dev` now hits the name card first**, since a dev guest has no
profile row and no household to inherit from. That is the only way to click the
screen locally, and it costs one Enter.

**Verified without a browser**: typecheck clean, 235 assertions, the artifact
shows `profiles` with `by_user` plus `profile` and `setDisplayName`, every new
utility is in the live `/zero.css` (selectors printed and unescaped, exact
match), and the **real handlers** were driven over `POST /__spacefast/zero/run`
on a second `sf dev` at `--port 4199`. **Nobody has clicked it.**

### The sign-in button names no provider — 2026-08-27

[D47](../.docs/decisions.md#d47-the-sign-in-button-names-no-provider). Copy
only: no schema change, no new utility classes, nothing server-side moved.

**`SignInWithGravatar` does not go to Gravatar.** It redirects to
`api.spacefast.com/v1/access/acquire/…`, which redirects to
`my.spacefast.com/sign-in`. That is **Spacefast account sign-in**, and
`GET /v1/auth/capabilities` — public, unauthenticated, and the only way to know
— reports what it offers: `wpcom` **and an emailed one-time code and a
password**, with `google` and `github` present but `false`. So the old label
was sending most of the people who pressed it after an account they do not
need. This is also why real signups arrive nameless (D46): an email-code
account has no profile behind it.

- **The labels are the act.** *Sign in*, *Sign in to join*, and *Signing in…*
  while the redirect is in flight. `GravatarButton` is **`SignInButton`**,
  `GravatarMark` is **deleted**, and lucide's `LogIn` replaces it on the card,
  the marketing hero and nav, and the invite landing.
- **The lanes are deliberately not named in copy.** They are deployment flags
  that can change without telling us, and the next screen shows them anyway.
- **The avatar is a different question and keeps its name.** `auth.picture` is
  a real `gravatar.com/avatar/…` URL, so every *"the Gravatar avatar"* comment
  in the client is still true.
- **The alias is `hostedSignIn`, not `startSignIn`** — the obvious name
  collides with the app's own handler one screen down in `client/index.tsx`,
  and the collision compiles into a recursive call. `typecheck` caught it.
- **The boards still say Gravatar** on the sign-in, invite and display-name
  screens. That is the third knowing departure from the design documents, after
  D42's missing tile preview and its removed collision caption.

**Not built, and written up in D47's rejected list:** restricting the app to
email and password (the platform pins `provider` to one literal), and building
either credential ourselves. Passwords are the one thing this runtime is worst
at — no `crypto`, so a KDF means iterating `shared/sha256.ts`, which measures
5.8s for OWASP's 600k rounds *on Node with a JIT* and is an interpreter away
from that in production.

Verified: typecheck clean, 235 assertions, `sf dev` on `--port 4199` compiles,
and the served `/client.js` carries every new string with **no `Gravatar` left
in the bundle**. **Nobody has clicked it.**

### Neither name arrives prefilled — 2026-08-27

[D48](../.docs/decisions.md#d48-a-name-nobody-typed-is-not-an-answer), amending
D46. Client only: no schema change, no new utility classes, nothing server-side
moved.

**The display name and the household name both start empty**, and each screen's
primary stays disabled until something is typed. D46 exists because
`ctx.auth.displayName` is a suggestion rather than an answer — and then seeded
the field with it. `FirstRun` went further and composed
`` `${displayName}’s Household` ``, a name assembled here out of a suggestion.
The default path through both screens was Enter, which accepted a value nobody
chose and reported success having collected nothing.

- **`DisplayNameCard` no longer takes a `suggestion`.** The prop, the
  `inherited` memo and the `useMemo` import are deleted. `Pantry` stops passing
  it; `displayName` still reaches `FirstRun` for `SignedInRow` and the avatar.
- **The display-name hint is gone entirely** — both branches only ever explained
  where the prefilled value came from, and the paragraph above the field already
  says what the name is for. **The household hint keeps its colour sentence**
  and loses *Taken from your own name*.
- **Focus but do not select**, on both. Select-on-mount existed so typing would
  replace a name you did not choose.
- **Still no placeholder on the display name**, and the rule is firmer now: a
  placeholder there would have to be an example *person's* name, which is a
  prefill that merely cannot be submitted by accident. `HouseholdIdentity`'s own
  *Household name* is a category, not an example, and stays.
- **`needsName` is untouched**, so everyone it grandfathers still never reaches
  either screen. What stopped is the identity name's use as a starting value.

Verified: typecheck clean, 235 assertions, and the running `sf dev` recompiled
and served a `/client.js` with none of the removed strings and the kept one
intact. **Nobody has clicked it.**

### The app opens where you left it — 2026-08-27

[D51](../.docs/decisions.md#d51-the-app-opens-where-you-left-it-and-where-you-left-it-is-a-property-of-the-device).
Client only: no schema change, no handler moved, no new utility class.

`client/hooks/useViewState.ts` and a **fourth `localStorage` key**,
`larder.v4.<userId>.view`, after the theme (D25), the household (D33) and the
trip (D41). It restores **`drawerCollapsed`**, **`drawerTab`**, **all three
term-filter groups**, and **the status pill**.

- **The shopping-list mode was already restored** and did not change — D41 put
  it in the trip record beside the ticks, where it expires 24 hours after the
  last tick and clears on a household switch. The mode and the cart are one
  answer to one question; two keys would let the app come back into list mode
  with an empty cart it had been told about.
- **The prune effect's new `ready` guard is the load-bearing line in the whole
  change.** The three term lists are `[]` while `pantry` is in flight, so
  without it the effect runs once against nothing and drops every restored
  filter before the household it belongs to has arrived. With it, the effect
  that already handled "someone deleted the term you were filtering by" also
  handles "these ids are from a household this device has left" — a row id
  belongs to exactly one household, so both are the same rule.
- **Restoring a filter is only safe because D45 shipped first.** An app that
  reopens three filters deep with no way to see them is an app hiding most of
  your pantry for no stated reason. Row 3 is what makes the state legible on
  arrival.
- **The restore is render-time, not an effect** — `readViewState()` feeds the
  `useState` initialisers, because an effect runs after paint and the grid would
  flash unfiltered. It costs nothing: the shell does not render until
  `api.status` is `ready`.
- **`drawerOpen` is deliberately not restored.** It is the mobile slide-over —
  a panel over the thing you opened the app to see — and it is the flag the dock
  effect exists to clear. Seeding it true hands that effect a slide-over the
  layout does not account for.
- **Search is not restored and is not in the record at all**, which is also what
  keeps the write cheap: the one high-frequency field never triggers a
  `setItem`. Sort is not restored either — one line in the same record if it
  should be.
- **Nothing read back is trusted.** A non-array where `locations` belongs would
  throw inside `.includes` on the first render, which is a blank screen rather
  than a lost filter.

Verified: typecheck clean, 239 assertions, `sf dev` recompiled, and the served
`/client.js` carries the `.view` key and both drawer fields. **Nobody has
clicked it** — this is the change most worth clicking, since every part of it is
about what the second load looks like.

**More of the view is likely to be stored, and the candidates are written up in
`.docs/notes.md` under *Product questions*** — the sort, an add or edit in
progress, how far down you had scrolled, per-household filters, whether a
restored filter should expire, and which of it belongs to the account rather
than the device. **The fork to notice there:** another per-device field costs a
line in the same record, while anything that should follow a person across their
phone and desktop is a schema change and therefore D27. That note also records
the one thing the storage keys cannot do — a field whose *meaning* changes has
no migration but bumping the `larder.v4.` prefix, which discards the theme, the
household, the trip and the view on every device at once.

### The seeded types cover a supermarket — 2026-08-27

[D50](../.docs/decisions.md#d50-the-seeded-types-are-a-supermarket-and-the-other-two-taxonomies-are-not),
amending D40. `shared/seed.ts` only: no schema change, no handler moved, no new
class.

D40 seeded all three taxonomies on one rule — *generic, so a household renames
rather than deletes* — and it was only ever right for two of them. **A type is
not a shelf you name or a shop you choose; it is a kind of food, and those are
the same in every kitchen.** So types are seeded for **coverage** instead: the
nine inherited from the design's sample data had no home for bread, canned
tomatoes, cereal, cooking oil or a frozen pizza, which is five detours through
the composer in a normal week.

**Fourteen now** — Produce · Dairy · Meat · Baked Goods · Grains · Canned Goods
· Condiments · Oils & Vinegars · Spices · Baking · Breakfast · Snacks ·
Beverages · Frozen Meals — each earning its place against *would a household
hold two or more things that fit here and nowhere else?*, which keeps *Oils &
Vinegars* and drops *Sweets*, *Soups*, *Deli* and *Pet*.

**The names stay short.** Only **Protein → Meat** is a real rename; the rest
of the nine merely pluralised. A first pass widened six into pairs (*Dairy &
Eggs*, *Meat & Seafood*, *Bread & Bakery*, …) and was **reverted the same
day** — nobody wonders where eggs go, and a chip is read at a glance. The
two-word names left are each one idea with no one-word name.

- **Two colour tokens are left unspent on purpose** — `color-11` and
  `color-16`. `proposeColor()` hands out the first token a group has not taken
  and falls back to `color-1` once they are all gone, so seeding sixteen would
  make a household's own first type arrive wearing Produce's olive. `npm test`
  asserts the headroom, and that no two seeds in a group share a colour.
- **`Frozen Meals` is not a repeat of the Freezer location.** Meat, frozen
  vegetables and ice cream all live in a freezer and all belong elsewhere on
  the list; pizza and burritos have nowhere else to go.
- **Non-food types were rejected, not forgotten** — *Household*, *Cleaning*,
  *Pet*. Real things on real pantry shelves, but `.docs/overview.md` defines a
  type as "what kind of *food* it is", so adding them is a decision about what
  the app is for and wants that file changed in the same breath.
- **This reaches new households only.** `createHousehold` seeds once and
  nothing backfills; a backfill would have to reason about terms a household
  has already renamed, recoloured or deleted deliberately. **The published
  household still holds the old nine** and gains the missing five by hand, once.

`npm test` is at **239 assertions**. Typecheck clean. Nothing to click — the
change is a list of strings the server reads at household creation.

### The sidebar drawer redesign (Phase 4.12) is built — 2026-08-27

The spec's *Settings tab*, drawn on
`.claude/docs/design/larderlogdrawerpreview.html`, governed by
[D49](../.docs/decisions.md#d49-settings-is-three-blocks-and-members-are-a-level-down).
**Client only**: no schema change, no new handler — still ten tables, five
queries, seventeen mutations.

The pane had six labelled sections and printed the same two facts three times
over — you in Account, again in Members, again in the row at the foot; the
household in the switcher and again under its own heading. Three rules cut it
down: **the household tile appears once** (in the switcher), **you appear once**
(in the row at the foot), and **scope is in the label**.

- **Three blocks and a row.** *Household* — name and colour behind the pencil,
  the item count in meta, a **Members** row with three stacked avatars and a
  chevron, and *Leave household* **inside the same card** under a hairline. The
  rename panel is **flush** with that card rather than a box inside it — a
  rounded `TermPanel` there put three nested outlines on one screen, and only
  the innermost (the colour picker's well) says anything →
  *Preferences*, which are yours (Appearance) → *Pantry settings*, which are the
  household's (the default low-stock threshold). **There is no Account block**,
  and nothing says whether you are signed in: if you are reading it, you are.
- **The threshold moved out of Preferences and became a stepper.** It is a fact
  about the pantry, not about the person looking at it. A stepper also has no
  empty state, which is what the old commit-on-blur field existed to survive.
  **Its minus at zero stays live and faint**, never disabled — the item card's
  rule.
- **`MembersPane.tsx` is a second level, pushed by the chevron.** Members and
  invites are one subject and get the full 340 together, which is what finally
  **settled the standing complaint that invite links are cramped**. The pane
  **drops the Filter / Settings tabs while pushed** — back is the only way out —
  and a household switch pops it. `Drawer` owns that state for exactly that
  reason.
- **`RoleMenu.tsx` — the role word is the trigger.** Owner only, never on your
  own row, and *Remove from household* is the last row of the same menu, so
  there is no `⋯`. **Selection is a check, not a fill** (the sort menu's rule's
  second user) and **nothing in it is disabled**: the last-owner case is
  unreachable from a menu only an owner sees on somebody else's row.
- **`AccountMenu.tsx` is one component in two places** — the drawer's foot row
  and the collapsed rail's account flyout. Identity row with a pencil that flips
  it **in place** into the composer's field, a hairline, *Sign out*. **This is
  where the display name is edited now**, which Phase 4.11 deferred. No toast:
  the row returning read-only with the new name is the confirmation.
- **The invite composer is the term composer again** — the dashed row stays put
  and drops the panel in below itself, role chips with *Editor* preselected, and
  a sentence that changes with the chip. **Expiry is a countdown, not a date**
  inside the app; the `?join=` landing keeps its date deliberately. All but the
  newest invite card collapses to its header.
- **`Theme.drawer` gained `menu` and `menuLine`** — the two menus are near the
  drawer's own body on purpose, separated by their border and shadow. Reusing
  the sort menu's cream popover was rejected: it would put the brightest thing on
  screen over the darkest panel in the app.
- **`useDismiss.ts`** is the Escape + outside-press pair the switcher had inline.
  **Its ref wraps the trigger as well as the panel** — a handler exempting only
  the panel closes on `pointerdown` and lets the trigger reopen on the `click`,
  which is the bug the rail needed a `dismissed` ref for.
- **Three control styles went with the surfaces they described** —
  `DRAWER_ICON_DANGER`, `DRAWER_CARD`, and the on-drawer form of
  `DRAWER_GHOST_DANGER`. Both surviving crimson ghosts now sit on a **card**, so
  the hover is `drawer-raised-hover`: painted with the drawer's own values they
  hovered to exactly the colour they were already on.

**One knowing departure from the boards**, the fifth overall: the rail's account
flyout keeps the rail's own flyout surface and only its width moves to 292.
Household and appearance sit a few pixels above it on that surface, and one
flyout in three wearing a different fill reads as a different kind of thing.

**Verified without a browser**: typecheck clean, 235 assertions, `sf dev` on
`--port 4199` compiles and serves, and **every class literal in the twelve
touched files** was diffed against the live `/zero.css` by unescaping the
sheet's own selectors — printed, never hand-written. **Nobody has clicked it.**

### Four fixes from a real shop — 2026-08-28

Client only: no schema change, no handler moved, no new decision beyond D41's
amendment.

- **The press no longer drops *Back to items* half its own height.** It was
  centred with `top-1/2 -translate-y-1/2` over the hidden status pills *and*
  carried the row's `active:translate-y-px`. **Tailwind writes both to
  `--tw-translate-y`**, so a press replaced `-50%` with `1px` and the button
  fell ~21px for as long as you held it. It centres with `top-0 bottom-0
  my-auto` now, which leaves the transform to the press. **Never pair an
  absolute-centring transform with the press nudge** — the two cannot coexist
  on one element, and neither `typecheck` nor a class-presence grep sees it.
  `CollapsedRail`'s tooltip is the only other `-translate-y-1/2` and is
  `pointer-events-none`, so this was the only site.
- **A press on a shopping-list row ticks it, anywhere on the row** — D41's new
  amendment. The name and the counts used to open the Edit sheet, which is a
  form over a shopping list, arriving from the half of the row the thumb aims
  at. `onOpenItem` is gone from all three levels of the component and from
  `Pantry`'s call site.
- **The Edit sheet does not put the caret in the name field.** Adding still
  does — one next step, an empty field. Editing opens on a whole item and
  nothing knows which part of it you came for, so a caret in the name says
  *rename this* and on a phone throws the keyboard over the fields you were
  reaching for. Focus still has to **enter** the dialog or Tab would walk the
  pantry behind it, so the sheet takes `tabIndex={-1}` and focuses itself,
  `outline-none` because a ring around a 480px panel says nothing the panel
  does not.
- **The phone column has one vertical rhythm and it is 24px** — above the
  wordmark, wordmark to search, search to the status pills. It was 16 / 36 / 24,
  which reads as three unrelated bands rather than one column. The header takes
  `pt-6`, and the 24 between it and the search is **split between two owners**,
  as it always was: the header's `pb-3` and the content wrapper's `pt-3`. The
  wrapper's old `py-6` was replaced rather than trimmed — its bottom half never
  applied, `pb-28` and `md:pb-[30px]` having overridden it all along. Row 2's
  own `pt-6` is the third gap and did not move. **Desktop is untouched**:
  `md:pt-[30px]` still wins above `md`, checked by line number in the sheet.

Verified: typecheck clean, 239 assertions, and on a throwaway `sf dev --port
4199` every new utility (`top-0`, `bottom-0`, `my-auto`, `w-full`, `h-full`,
`text-left`, `outline-none`, `md:pt-[30px]`) is in the live `/zero.css` with the served
`/client.js` carrying the new class literals and none of the old. **Nobody has
clicked any of it** — all three are press-time behaviour, so all three want a
thumb.

### Empty results — 2026-08-26

`EmptyState.tsx` is the app's one empty screen for the content column, drawn
from the first-run board: Playfair italic 27px, a 420px body, at most one
action. Before it, only the empty household got that treatment and every other
empty result got `Nothing here yet.` in 14px grey.

`emptyCopy()` in `Pantry.tsx` picks the words **and** the action together, so an
action can never clear a filter the title did not name. **A status chip on its
own gets no button** — the chip you pressed is still on screen and now reads
`0`. One term or one search names itself and clears itself; anything more says
so and clears everything.

**`?signedout` is a dev-only switch and the only way to see any of this
locally.** D14's loopback hole makes every local visitor a signed-in dev guest,
which puts the whole signed-out surface out of reach under `sf dev`. It only
ever *removes* access and is ignored off loopback. Take it out with D14.

**`POST /__spacefast/zero/run` calls a query by name over plain HTTP** and is
now the cheapest honest verification we have — it exercises the handler the
client calls rather than a copy of it in a throwaway endpoint. It needs the
bearer token **and** the bootstrap cookie; the cookie alone answers
`{"error":"unauthorized"}`. All five `invitePreview` branches were checked this
way. Undocumented; written up in `.claude/docs/spacefast.md`.

**The sign-in function is exported under one name and it is the wrong one.**
`@spacefast/zero/client` resolves to `dist/public-client.d.ts`, which exports
only `signInWithGoogle` — Lakebed compatibility, and it goes nowhere near
Google. `client/index.tsx` aliases it to `hostedSignIn` on import (D47). Do not
"fix" the name back, and do not rename the alias to `startSignIn`: that is
already the app's own handler in the same file, and the collision compiles into
a recursive call.

**The item grid is fluid and the drawer docks at 1120px, not `md`.** Cards are
`md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]` — tracks always divide the
row exactly, so the gutter is 16px everywhere and there is no remainder. Two
alternatives were built and reverted: capping the card inside a `1fr` track puts
the remainder *between* cards (104px at 1440), and capping the track at 420 puts
it at the right edge. Collapsed cards match via `min-h-[188px]` + `mt-auto` on
the quantity row, **not** `align-items: stretch` — a grid row is sized by its
tallest item's content, so an open card would drag its row down.

**Never pair `min-[1120px]:` with a `md:` class on the same property** —
Tailwind emits arbitrary variants first, so `md:` wins at 1120 and the rule
silently does nothing. Use a bounded `md:max-[1120px]:` range instead; pairing
with a base utility is fine. **`min-[1120px]:` is derived from the 320px card
floor and must be re-derived if that changes.** Docking spends 340px and must
not cost a column; with a 336px track only 1064–1128 and 1400–1464 survive, and
no Tailwind breakpoint is in either (`lg`, `xl` and `2xl` each lose one). The
number lives in **three** places — the class literals in `Drawer` and
`CollapsedRail`, plus `DOCK_PX` in `Pantry`. Tailwind resolves a class by
scanning for a static string, so it cannot be interpolated and the duplication
is unavoidable; keep them equal.

**`drawerOpen` only means anything below the dock, and has to be cleared above
it.** Two callers set it at any width (the rail's expand control, and the
blocked-leave dialog's *Open Members*) because below the dock it is the only
thing that reveals the drawer. Above the dock the set looks like a no-op and is
not: the flag persists, and narrowing the window turns it into a `fixed`
slide-over that nothing in the layout accounts for, so only the 68px rail holds
the column open and the item grid runs underneath it. `DOCK_PX` exists for the
effect that clears it. Below it the 68px rail *is* the
drawer regardless of `drawerCollapsed`; `CollapsedRail` renders unconditionally
and hides itself above the threshold via its `autoOnly` prop.

**Never declare a component inside another component.** `CollapsedRail` had
`Control` and `Tip` nested in it, which gave them a new function identity per
render — Preact reads that as a new component *type* and rebuilds the whole
subtree, so any re-render between a `pointerdown` and its `click` swapped the
element out and dropped the click. It presented as "the rail needs two clicks,
sometimes"; the 400ms tooltip timer was what landed in the gap. Both are at
module scope now and take a `chrome` prop.

**The rail owns flyout dismissal, not `RailFlyout`.** A press anywhere outside
the open panel closes it — including on the rail itself — so the rail keeps a
`dismissed` ref recording what the current gesture just closed, and `toggle()`
compares against that rather than against `menu`, which `pointerdown` has
already nulled.

`theme.json` gained `focus-dark` and `drawer-danger`. **`theme.json` is strict
JSON — no comments**, unlike `sf.jsonc`; a `//` line stops `sf dev` from
starting at all.

**Verified without a browser** (there isn't one): the capsule compiles and
reloads, every new utility class and both tokens are in `/zero.css`, the term
counts and refusal sentence were exercised through a throwaway endpoint, and the
artifact still shows nine tables, sixteen mutations, **zero migrations**.
**Nobody has clicked any of it.**

Phase 4's typography question is also closed, in the opposite direction from
the one the notes predicted. Zero has no webfont mechanism — `theme.json`'s
`fontFace` is discarded silently — but the `--font-disp` / `--font-sans` /
`--font-mono` tokens it emits are already complete stacks, so the only missing
piece is a stylesheet. `client/lib/fonts.ts` appends a Google Fonts `<link>`
for Playfair Display and Karla at boot (plus IBM Plex Mono, interim — the
Cellar spec has no monospace, but ten `font-mono` sites still reference one)
([D31](../.docs/decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google)).
The Cellar reskin's token layer is in for **both** themes — see Phase 4.5 in
the roadmap. Layout is untouched: the drawer, item card, and add-item sheet are
still the pre-Cellar components, so the app currently reads as the same
interface in a new palette.
The family names there must keep matching the `theme.json` literals exactly —
that is the entire contract between the two files. `client/lib/appIcon.ts` does
the same trick for the page title, favicons and `theme-color`: the generated
shell exposes only a title, and `sf dev` hardcodes even that, so all of it is
appended to `document.head` at boot. The icons are inlined as data URIs
because `sf dev` serves no project static files. Self-hosting was built first
and rejected: `sf dev` serves no project static files, so a self-hosted face is
invisible locally and appears only after a publish. **Confirmed rendering under
`sf dev` on 2026-08-25** — the whole reason for choosing a remote URL was that
this check is possible at all.

### The app is installable — 2026-08-27

`site.webmanifest` at the project root, linked from `installAppIcon()` — the
**fourth** thing appended to `document.head` at boot, after the webfont
stylesheet, the icons and the two metas. **No new artwork**: the 192, 512 and
maskable-512 PNGs staged with the icon set in August are correct. The maskable
one was measured, not assumed — the glyph is a 181 × 226 box centred in the 512,
so the furthest ink is 145px from centre against the 205px the 80% safe zone
allows.

**The manifest cannot be a data URI, and that is the one place it departs from
how the icons get past the missing head hook.** `start_url` and `scope` resolve
against the **manifest's own URL**; a `data:` URL is no base to resolve `/`
from, so both would fall back to the page the app was installed from — often
`/?join=<code>` here, pinning an expiring invite as the front door.
`purpose` is split across two files and **never combined into `"any maskable"`**:
the `any` pair keeps its 22% rounding, the maskable is full bleed, and one file
claiming both would put those rounded corners inside Android's mask to be
cropped a second time.

**The `theme-color` meta became a pair and follows the *app's* theme.** Dark is
`#1F1912` — `canvas` exactly; light stays on the oat `#E2D5C0`, a deliberate
half-step darker than the page. **It is not a `media` attribute**, because the
app's theme stops being the OS's the moment a device overrides it (D25), and an
installed app has no tab strip to absorb the difference — the status bar sits
directly on the page. `appIcon` exports `setThemeColor`; the boot value reads
`prefers-color-scheme` so there is no flash, and **exactly one owner sets it
after**: `Pantry` while signed in, the entry's `App` only while signed out.
Effects run child-first, so an unguarded `App` would overwrite the override with
the system value a tick later. The **manifest's** `theme_color` and
`background_color` cannot vary by scheme at all, so they are the light values
and the cold-launch splash is light for everyone.

**Two undocumented platform rules turned up, both in `.claude/docs/spacefast.md`:**

1. **`sf publish` mirrors the project root selectively.** `LICENSE.md` ships and
   `README.md` does not; `package-lock.json` ships and `package.json` does not.
   There is no stated rule — run a dry run and list
   `.spacefast/zero/public/`.
2. **Being in the payload does not mean it serves.** `theme.json` and
   `sf.jsonc` are staged and **404 in production**, because the edge hides the
   platform's own config on top of D29's dot-prefix 403. So `--dry-run` is
   necessary evidence and not sufficient.

**A manifest has no local proxy at all.** `sf dev` serves no static files, so
`/site.webmanifest` comes back as the SPA shell and Chrome logs a manifest parse
error on every local load — harmless, and unavoidable without a dev-only branch
that would make the thing untestable everywhere. Whether it serves, with what
content type, and whether a Pixel offers to install it were **post-publish
checks**. **Two of the three are now answered, on v11**: `/site.webmanifest`
serves `200 application/manifest+json; charset=utf-8` (769 B) and all three
icons serve as `image/png`, so the edge maps the extension correctly with no
configuration. **Nobody has installed it** — that half still needs a phone.

### Every ordered row carries its own stamps (D44) — 2026-08-27

**The rule: a timestamp this app sorts by is a timestamp this app writes.** The
platform's `createdAt` and `updatedAt` are readable but **cannot be set by app
code** — an insert supplying one is refused outright, *"Zero manages
items.createdAt; app code cannot set it directly"*, confirmed against a running
capsule rather than inferred from the docs' "those names are reserved". So
neither survives a re-insert, and undo is a re-insert (D17). **Do not try
again.**

**The second additive schema change since Phase 2**, and the largest: nine
columns across five tables, all ISO 8601 UTC strings defaulting to `''`. Nine
tables and sixteen mutations still; applies on the next publish with no flag,
exactly as `households.ink` did.
[D44](../.docs/decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)
has the table.

- **`items`, `locations`, `types`, `stores` get both** `addedAt` and
  `changedAt`. **`households` gets `addedAt` only** — nothing orders households
  by recency and a rename is not an event anything reacts to.
- **`shared/stamp.ts`** owns every rule: `stampFrom`, `normalizeStamp` (falls
  back to now for anything unparseable and **clamps a future stamp**, so a bad
  value cannot pin a row to the top of a list forever), `addedAtOf`, and
  `changedAtOf`, whose fallback chain is `changedAt` → `addedAt` →
  `createdAt`. `npm test` is at 198 assertions.
- **`changedAt` is bumped by every mutation that writes a visible field** —
  `updateItem`, `adjustQty`, `updateTerm`. **`adjustQty` is not exempt**: a
  quantity is information about the item, and the hot path being hot is not a
  reason for it to lie.
- **Nothing reads `changedAt` yet**, and that is deliberate. The column has to
  exist before there are rows to stamp — a row written without one never gets
  one, because nothing backfills.
- **The fallbacks are permanent, not transitional.** Every row that exists on
  the published space today holds `''` forever.
- **Both create mutations take stamps beside the draft, not in it.**
  `ItemDraft` and `TermDraft` omit them, because no form holds one — undo is the
  only caller that passes any.
- **`createHousehold` seeds fifteen terms through `insert`, not `createTerm`**,
  so it is the one path that could leave a term unstamped. It shares one stamp
  across all fifteen: they arrive together, and staggering them by a millisecond
  each would imply an order that isn't real.

**Term lists are A–Z now**, sorted once in the `pantry` query so the drawer's
filters, the item sheet's chips and the shopping list's cards cannot disagree.
They were in `collect()` order — seed order, then creation order. This also
closes what D36 recorded as "a restored term appends". `byName()` is in
`shared/term.ts`; `termDto()` in the capsule is the one place the three
taxonomies' shared DTO shape is written down.

**Not covered:** `memberships`, `invites`, and the join tables. Nothing orders
them by time today, and a column is permanent — if any of them grows a
chronological view, it needs stamps *before* the rows that would want them.

Verified against the real handlers over `POST /__spacefast/zero/run`, on a
**second `sf dev` started with `--port 4199`** so the one already running was
undisturbed: three items added in order and the middle one removed and undone
(`addedAt` order keeps it in place, `createdAt` order — the bug — puts it
first); seeded terms A–Z and stamped; `changedAt` moving on `adjustQty` and
again on `updateItem` while `addedAt` holds still; a removed item and a deleted
term both restored with **both** stamps byte-identical and a visibly newer
`createdAt`; a renamed store re-sorting alphabetically. **Nobody has clicked
it.**

### Publishing works, and v11 is live — 2026-08-27

**Phases 3 through 4.9 are published.** `sf publish` completed for the first
time since v2: **v4**, `ver_d80a395f07144ce6863ba75b212a1486`, 71 files, 18
seconds. The platform's `finalize` / `runtime_api_not_found` failure — which
killed v3 on 2026-08-25 and wedged three spaces on 2026-08-24 — **is fixed on
their side**. Nothing here changed to cause that.

Verified again on **v11**, and this is the standing checklist: `GET /` 200,
`/api/status` → `ok`, `/client.js` (299 KB) and `/zero.css` (74 KB) serve,
`/site.webmanifest` serves as `application/manifest+json` with all three
`/icons/*`, **D29 holds** (`/.claude/CLAUDE.md`, `/.docs/decisions.md`,
`/.env.server`, `/.spacefast/state.json` all 403), `theme.json` and `sf.jsonc`
404, every new utility class is in the **live** `/zero.css`, and the `profiles`
table migrated additively with no flag — as D44's nine columns and
`households.ink` did before it.

**Read `plan`, not the footer, to confirm a migration applied.** `sf db` prints
`Pending operations: 9` after a successful nine-column migration — it is
counting the version's `migrations` array, which is the changelog of what this
migration *did*, not a queue of what is outstanding. The real answer is
`--json` → `data.plan`: `applied: true`, `pendingOperationCount: 0`, and
`appliedSchemaHash` equal to `schemaHash`. **The human-readable output says the
opposite of the truth here**, and the same trap sank the D42 check, which read
the declared `tables` list and concluded `ink` had migrated — right answer,
wrong evidence.

**The two hashes sit at different depths, and the obvious read is `undefined`.**
It is `data.schemaHash` but `data.plan.appliedSchemaHash` — so
`data.plan.schemaHash` is `undefined`, and comparing that against the applied
hash reports a **spurious mismatch on a clean migration**. That happened on the
v11 check and cost a round trip. Print the `plan` keys rather than assuming
them. `invitePreview` answers an unauthenticated caller
over `POST /__spacefast/zero/run`, which **exists in production too**, not just
under `sf dev`.

**The `x-spacefast-rationale` blocker is NOT gone.** A plain `npx sf publish`
still dies at *Creating version*. Re-checked **2026-08-27, before the v11
publish**: npm's `latest` is still `spacefast@0.0.26` (no `next`/`beta`;
`@spacefast/zero` tops out there too), the binary channel is still 0.0.27, and
that binary still cannot compile a Zero capsule. Two greps settle it faster than
reading release notes — dumping every `SPACEFAST_[A-Z_]+` literal out of
`node_modules/spacefast/dist` gives 57 variables with **no `SPACEFAST_RATIONALE`
among them**, and the CLI's whole `x-spacefast-*` header vocabulary is `client`,
`client-capabilities`, `country`, `idempotency-principal`, `language`,
`mcp-token`, `runtime`, `version` — **`rationale` is not a header this CLI can
send at all.**

The publish only completed because the header was attached out-of-band: a
`fetch` wrapper loaded with `NODE_OPTIONS=--import`, adding a **truthful**
rationale to `*.spacefast.com` requests. The shim is not in the repo — it lives
in the session scratchpad and has to be rewritten each time.

**Two things the rewrite must get right**, both learned on v11. Match the host
with `/(^|\.)spacefast\.com$/` and not a bare `includes('spacefast.com')`, or
a lookalike domain would be handed the rationale too. And seed a `Headers` from
the incoming `Request`'s own headers before setting anything, because passing
`init.headers` to `fetch` **replaces** rather than merges — get that wrong and
the CLI's `authorization` is silently dropped, which presents as an auth failure
rather than a shim bug. Test it against a stubbed transport before pointing it
at a real publish; it takes one command and proves auth, content-type, method
and body all survive.

Two things to know before publishing again:

1. **You will need the shim**, until npm ships 0.0.27 or 0.0.26 gains
   `--rationale` / `SPACEFAST_RATIONALE`. Check npm first — it may have landed.
2. **The rationale must be true.** It exists so an agent-driven mutation is
   attributable. Do not misrepresent the caller to dodge it — `SPACEFAST_CLIENT`
   feeds `x-spacefast-client` and would do exactly that. Supplying the metadata
   is compliance; hiding it is not.

The full write-up is in [`.claude/docs/spacefast.md`](docs/spacefast.md).

### A term's ink is a token **or** a legacy hex, and both must render — 2026-08-27

**The bug that looked like a device bug.** The term composer's 26px swatch — the
button beside the name field that opens the picker — rendered as blank space on
one phone and correctly on another. It was never the phone. The two were signed
in to **different households**, and the one that failed was seeded before D32.

`normalizeInk` deliberately stores **either** a colour token **or** a legacy
`#rrggbb`. `termColorFor()` resolves only the token half and returns
`undefined` for a hex; `TermRow` fell back to `'transparent'`, which is
invisible three times over — no fill, an inset ring already painted in the
panel's own colour, and an outer ring in the colour that had just gone
transparent. Pressing it showed a ring because the *open* state's ring is the
only one with a colour of its own. Fixed by using `themed()`, which has the
legacy branch, and is why every chip on the page rendered those terms correctly
the whole time.

**The rule: anything that turns a stored `ink` into a colour must handle both
forms.** `termColorFor()` is a **token lookup, not an ink resolver** — reach for
`themed()` or `entityColorFor()` unless you are iterating the palette itself.
Audited on 2026-08-27: `chipDot()` already falls through to the raw hex,
`ColorPicker` only ever maps `DEFAULT_PALETTE` so its lookups always resolve,
and `HouseholdTile` / `HouseholdIdentity` are safe for a different reason —
`toHouseholdInk` **refuses** a hex, so a household's ink is always a token or
`''` resolved upstream by `householdInk()`.

**Two wrong guesses came first, and both shipped.** `h-dvh` (the picker was
supposedly below the mobile fold — it was on screen and pressable) and a
document-level `color-scheme` meta (Android auto-dark — it does not make things
transparent). Both are correct changes on their own merits and were kept. **The
lesson is the one this file already gives:** the reporter's own words held the
answer — *"the colour swatches themselves work correctly, it's just the button
next to the input"* — and two publishes were spent before that detail was asked
for. **Ask what still works before theorising about what does not.**

### The hosted runtime is not the engine `sf dev` runs — 2026-08-27

**This is the trap that cost three days, and it will happen again.** The
artifact reports `serverRuntime: "quickjs-rust"`. `sf dev` runs something else.
A capsule can typecheck, pass the compiler, work perfectly under `sf dev`, and
still throw in production. Three divergences are **confirmed against the
published space**, not inferred:

| | `sf dev` | hosted |
|---|---|---|
| `crypto` | present | **`undefined`** |
| row ids | v4 UUIDs | **sequential integers** (`"4"`, `"6"`) |
| `ctx.log` | prints to console | reaches `sf logs runtime` |

**An uncaught handler exception still logs nothing** — no message, no stack,
just a 500. `ctx.log` *is* the way out and it does work in production; nothing
writes there unless you call it. Instrument deliberately.

**How that was established, and how to do it again:** a keyed `endpoint` that
**returns** its findings rather than logging them. (`/api/probe` itself was
**removed in v9** once both its questions were answered — it is not there to
reuse; write a fresh one and remove it again.) An endpoint gets a full
`ServerContext` — `db`, `transaction`, `log`, `env` — and needs no auth, so it
is the only way to interrogate the hosted runtime. Give it a `?key=` and a
`404` without it. Two guesses were burned before this (`crypto`, then the one
`boolean` column) at a publish apiece; the probe answered everything at once.
**Reach for it third-guess-first.**

**The capsule compiler enforces a global denylist**, in
`@spacefast/zero-compile/dist/analyze.js`, undocumented anywhere:

```js
UNSAFE_GLOBAL_PATTERN            = Bun|Deno|Function|__dirname|__filename|eval|process
ZERO_SERVER_UNSAFE_GLOBAL_PATTERN = BroadcastChannel|SharedWorker|WebSocket|Worker|
  XMLHttpRequest|document|global|globalThis|localStorage|location|navigator|
  sessionStorage|window
```

It is a **denylist of the inappropriate, not an allowlist of the available** —
`crypto` is on neither list, so the compiler admits it and the runtime still
lacks it. It matches **transpiled code, not comments**. Never write `globalThis`
in `server/`; use a bare identifier behind `typeof x !== 'undefined'`, which is
also the only form that survives a missing binding without a `ReferenceError`.
The same rules ban dynamic `import()`, `require()`, and `shared/` importing from
`client/` or `server/`.

**Invite codes are the one thing this all landed on — see
[D43](../.docs/decisions.md#d43-an-invite-code-is-a-secret-mixed-with-the-row-because-the-runtime-has-no-randomness).**
`INVITE_SECRET` lives in `.env.server` (gitignored; the artifact records only
`env: {file, names}` and the file is **not** among the uploaded payload files).
`shared/sha256.ts` is hand-written because there is no host primitive, and is
checked against the FIPS 180-4 vectors. `crypto` is still preferred when
present, so **`sf dev` never exercises the path production uses** — if you touch
`inviteCode`, force `crypto` off locally *and* keep the unit tests green.

### `sf db dump` is broken — open, 2026-08-26

`zero_db_dump_failed`, a 500 from the edge, with or without the rationale
header, against a healthy space. `sf db` works in the same second and still
prints the live table list. This is the command that CLAUDE.md used to name for
verifying a publish and for closing out the D14 auth check, so **both now need
another route**.

### Two auth bypasses, and they are not equally safe

`sf dev` ships no sign-in flow (`signInPath` and `signInUrl` are both null), so
`auth.isGuest` never goes false locally. Two separate holes exist because of it:

1. **The client gate** (`client/index.tsx`) lets a guest through on loopback
   hostnames only — D14. **Confirmed inert in production**: a signed-out
   visitor on the published space gets the sign-in screen. The orange
   "Dev guest · not signed in" chip that used to mark this was removed on
   2026-08-25; the drawer's Account section names the dev guest instead, which
   is where someone looks to find out who they are. If that ever stops being
   true, put a marker back.
2. **The server** (`shared/identity.ts`) accepts the exact identity `sf dev`
   issues — `guest:local` / `Local` / `guest` / not authenticated, all four
   matched. That value comes from `zeroGuestAuth()` in the `spacefast` CLI, so
   it should never appear on a hosted runtime. **Verified inert in production
   on 2026-08-27**, on v8, after two real people had signed in — which is what
   the check needed and why it sat open from 2026-08-24. The keyed
   `/api/probe` endpoint reported:

   ```
   production:  schemes ["account"]  anyDevGuest false   (4 memberships, 2 users)
   sf dev:      schemes ["guest"]    anyDevGuest true    (1 membership,  1 user)
   ```

   **The second line is the point.** A `false` from a probe that cannot detect
   the condition would mean nothing, so the same probe was run against `sf dev`
   — where the hole is known to be open — and it came back `true`. The test
   discriminates. Production issues only `account:` identities. (`sf db dump`
   is the documented route for this and is still broken.)

Don't widen either one, and take both out if Spacefast ships a local sign-in
stub.

**`sf dev` issues one fixed identity**, so a second local tab is the same user.
That is enough to watch a mutation propagate; it is not enough to test two
members of a household. Anything touching sign-in, invites, or roles has to be
checked against the published space — which, as of 2026-08-27, two real people
have now done.

See `.docs/roadmap.md` for the phases.

## Target platform: Spacefast Zero

The app will be published on [Spacefast Zero](https://spacefast.com/docs/zero):
a Preact client plus a typed server "capsule" holding the database schema and
handlers, with hosted sign-in and live queries built in. One `sf publish`
compiles the capsule, migrates the database, and activates the version.

### Constraints that must never be forgotten

These are hard platform limits and they shape everything:

1. **No numeric column type.** Schema fields are `string()`, `boolean()`,
   `id(table)` only. `qty` and `threshold` are decimal strings — parse at the
   edges, validate server-side, and **never sort by them in the database**
   ("10" sorts before "2").
2. **No array or JSON type.** Many-to-many needs join tables (`itemTypes`,
   `itemStores`).
3. **No row-level security.** Every household boundary is a hand-written check.
   Resolve the household server-side from `ctx.auth.userId`; never trust a
   client-supplied `householdId`; re-read a row and verify before writing.
4. **Destructive migrations need explicit flags** (`sf db migrate --drop` /
   `--rename`). Additive changes apply on publish. Getting the schema right
   early is worth real effort.

### Reading the Spacefast docs

The whole runtime reference is one file: `https://spacefast.com/docs/zero.md`
(~19 KB of plain Markdown — schema API, auth, storage, styling, limits, and a
complete example app).

A plain `curl` works — **the 403 to programmatic fetches was fixed on
2026-08-25**, so the browser User-Agent this file used to insist on is no longer
needed:

```bash
curl -sL https://spacefast.com/docs/zero.md
```

Every docs page has a `.md` twin at the same path. Prefer it over the HTML. If a
page ever 403s again, a desktop browser User-Agent was the old workaround.

**But read `.claude/docs/zero-agent-rules.md` first.** It is the `AGENTS.md`
that `sf init --runtime zero` scaffolds, and it is denser and more accurate than
the public docs — it is the only place that documents the static-class-names
rule, the semantic token vocabulary, the server's import restrictions, and the
fact that platform modules don't count against the client bundle budget.

## Documentation map

Depth lives in `.docs/`. Read the relevant one before proposing architecture —
most of it is already decided.

| File | What's in it |
|---|---|
| `.docs/overview.md` | What the app is, concept vocabulary, goals, **non-goals** |
| `.docs/architecture.md` | Zero's shape, project layout, data flow, auth, constraints |
| `.docs/data-model.md` | Schema, indexes, ownership rules, cascade deletes, query surface |
| `.docs/roadmap.md` | Phases 0–5 in dependency order, each with a "done when" |
| `.docs/decisions.md` | D1–D51, with reasoning and rejected alternatives. **D27 governs every schema edit**; **D32 governs term colors**; **D35 and D44 govern row timestamps**; **D36 governs destructive actions**; **D41 governs the shopping list**; **D42 governs the household colour**; **D43 governs invite codes**; **D45 governs the applied filter bar**; **D46 governs the account's display name**, amended by **D48, which forbids prefilling either name**; **D47 governs the sign-in copy**; **D49 governs the Settings pane, the Members pane and both drawer menus**; **D50 governs the seeded types**; **D51 governs what the view restores on load** |
| `.docs/notes.md` | Open platform questions, and what the v2 publish and Phase 3 answered |
| `.claude/docs/design/ui-directions.md` | **The current design spec** (Aug 2026, "Cellar") — palette, type, structure |
| `.claude/docs/design/larderlogdesigns-4.html` | The rendered final mockup that spec describes |
| `.claude/docs/design/larderlogshoppinglistboards-2.html` | **The 16 boards for the shopping list** — eight screens, light and dark. Supersedes the `-1` file, which drew a top bar the app does not have |
| `.claude/docs/design/larderloghouseholdcolourboards.html` | **The 8 boards for the household colour** — four screens, light and dark |
| `.claude/docs/design/appliedfilterbar.html` | **The applied filter bar** — a live page rather than boards: desktop, 390, and the state strip, in both themes |
| `.claude/docs/design/larderlogdrawerpreview.html` | **The redesigned drawer** — five screens in one page: the root Settings pane, the Members pane, changing a role, making an invite, and the account menu. Light theme only; the dark counterparts are a hex-for-hex map away |
| `.claude/docs/design/display-name-light.html` / `-dark.html` | **The first-run display name** — two states, *Gravatar had a name* and *it didn't*, in both themes. **The build has one state now** — D48 removed the prefill, so neither board's hint exists |
| `.claude/docs/design/larder-log-front-door/` | **The 18 boards for the flows outside the shell** — nine screens, light and dark. Where these and the spec text disagree, these win |
| `.claude/docs/pantry-tracker-mockup.jsx` | The **superseded** design reference (see below) |
| `.claude/docs/spacefast.md` | Running feedback log on the platform |
| `.claude/docs/zero-agent-rules.md` | Zero's own `AGENTS.md`, verbatim — the best runtime reference |

**Keep these current.** When a decision gets made, add it to `.docs/decisions.md`
and remove the corresponding entry from `.docs/notes.md`. When a phase completes,
update `.docs/roadmap.md` and the status section here.

## Standing instructions

- **Ignore `/.ideas/`.** Abandoned WordPress prototyping. It is gitignored and
  untracked; do not read it for conventions, extend it, or cite it.
- **Append to `.claude/docs/spacefast.md`** after any notable interaction with
  Spacefast — docs, CLI, `sf dev`, publishing, migrations. Dated entries tagged
  good / friction / unclear / bug. Justin intends to send this feedback to the
  Spacefast team, so record concrete detail: exact errors, HTTP codes, what was
  tried. Do this as you go, not at the end.
- **The design spec is `.claude/docs/design/ui-directions.md`.** It supersedes
  `pantry-tracker-mockup.jsx`, which describes the pre-Cellar interface and is
  now history. `larderlogdesigns-4.html` is the rendered final design; page 2 of
  the linked canvas holds three rejected explorations — **ignore those**. Where
  the spec and the HTML disagree, the HTML wins; they were checked against each
  other and currently agree.
- **The old mockup is a design reference, not source.** `pantry-tracker-mockup.jsx`
  is a design artifact Justin edits and replaces wholesale. Diff it against the
  implementation rather than assuming it matches. It also contains at least one
  known bug (a stale-closure duplicate guard), and it is **name-based
  throughout** while the app now joins taxonomies by id — so it is a reference
  for *layout and interaction*, never for data shape. Don't copy from it
  blindly.

## Code conventions

- **Tabs for indentation** (`.editorconfig`, `indent_style = tab`). This applies
  to JS/JSX/TS as well as everything else.
- Single quotes in JS/TS; semicolons.
- Space after `!` in negations (`if (! name)`) — matches the existing source.
- Comments explain *why*, not *what*. Match the density of the surrounding file.
- Keep components small and props explicit. `client/` is the model to follow —
  `components/`, `hooks/`, `lib/`, `data/`, with the entry in `index.tsx` and
  the signed-in app in `Pantry.tsx`.
- **Pure domain logic goes in `shared/`, not `client/lib/`.** `shared/` imports
  nothing, so the capsule can reuse it; a validation rule written client-side
  becomes a second copy the server has to duplicate. `client/lib/theme.ts` is
  the boundary — status *derivation* is shared, status *colors* are not.
- `import type` for type-only imports (`verbatimModuleSyntax` is on).

## Commands

```bash
npm install
npm run dev          # the Zero app — `sf dev` on http://localhost:4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm test             # unit tests over shared/ — compiles with tsc, runs on node
```

`sf` is a pinned devDependency, **not** a global install — use the npm scripts
or `npx sf …`. Do not run the `curl … install.sh | bash` installer; the CLI
ships on npm as the `spacefast` package and the pinned version is deliberate.

`sf --help` does not list `dev`, `db`, `logs`, or `storage`, but they all exist,
as do `sf db migrate`, `sf db export`, `sf db dump`, and `sf db console`.

`sf dev` gates every path behind a capability token printed in its banner. To
reach it from a script, POST that token to bootstrap first — **an `Origin`
header is required or it answers 403**:

```bash
CAP=…   # the #zero-dev-capability= fragment from the sf dev banner
curl -X POST -H "authorization: Bearer $CAP" -H "origin: http://127.0.0.1:4173" \
  http://127.0.0.1:4173/__spacefast/zero/bootstrap        # 204 + Set-Cookie
curl -b "spacefast_zero_dev_4173=$CAP" http://127.0.0.1:4173/zero.css
```

`sf dev` state is in memory and resets on restart. Pass `--state-backend sqlite`
to keep a database between runs.

## Verifying work

Cheapest first:

- **`npm test`** — 235 assertions over `shared/`, compiled with the project's
  `tsc` and run on plain Node. No runner, no dependencies. It covers the things
  that are invisible when wrong: the D20 capability matrix, D18's
  one-household rule, D22's last-owner guard, invite expiry boundaries, D28's
  invite-link parsing, the dev-guest bypass in `shared/identity.ts`, D44's
  stamp guards and A–Z term ordering, D45's *OR inside a group, AND across
  groups*, and D46's display-name fallback chain. **Add to it** when you touch any of those — that file is the app's
  only authorization test, and the only place the filter rule is checked at
  all.
- **`npm run typecheck`** — `strict` over `client/`, `server/`, `shared/`. Still
  the fastest way to catch string-encoded numbers used as numbers.
  **It will not catch a term id rendered where a name belongs** — both are
  `string`. That bug shipped once already; see `.docs/notes.md`.
- **`npx sf publish --dry-run`, then read `.spacefast/zero/artifact.json`** —
  the only way to see what a publish would actually install: the schema,
  queries, mutations, endpoints, and migrations. **Mandatory after any schema
  edit.** The capsule compiler finds tables by regex over `server/index.ts`
  alone, so a table can vanish from the artifact while typechecking perfectly
  ([D27](../.docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry)).
  Note that `--dry-run` is not read-only: it rewrites the build under
  `.spacefast/zero/`.
- **`sf dev`** compiles the capsule for real. A clean start plus `GET /` and
  `GET /api/status` proves the client and server entries both resolve.
- **An unused `theme.json` token is pruned from `zero.css`, and that looks
  exactly like a rejected one.** The compiler reads every palette and
  `fontSizes` entry, but Tailwind emits a `--color-*` / `--text-*` var only
  once a class actually uses it — so `bg-drawer` compiles to nothing until
  something references it, and grepping for the var proves nothing either way.
  To check a token was *read*, run the compiler's own reader instead:

  ```bash
  node --input-type=module -e "
  import { zeroThemeSettingsFromThemeJson } from './node_modules/@spacefast/zero-compile/dist/tailwind-core.js';
  import { readFileSync } from 'fs';
  console.log(zeroThemeSettingsFromThemeJson(JSON.parse(readFileSync('theme.json','utf8'))));"
  ```
- **Curl the compiled assets** to confirm styling shipped. Zero finds Tailwind
  classes by scanning source for static strings, so "it typechecks" says nothing
  about whether a class exists. Fetch `/zero.css` (see the bootstrap dance
  above) and grep. The file escapes **brackets, colons, parentheses, commas and
  `#`**: `max-h-[80vh]` appears as `max-h-\[80vh\]`, `bg-[#4A3E2E]` as
  `.bg-\[\#4A3E2E\]`,
  `md:grid-cols-[190px_1fr]` as `.md\:grid-cols-\[190px_1fr\]`, and
  `md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]` as
  `.md\:grid-cols-\[repeat\(auto-fill\,minmax\(300px\,1fr\)\)\]`. Grepping a
  half-escaped form returns nothing and looks exactly like a missing class.

  **The reliable check prints the selector instead of guessing at it:**

  ```bash
  grep -oE '\.[a-z:\\-]*grid-cols[^ {]*' zero.css | sort -u
  ```

  Failing that, search for a distinctive *unescaped* substring — `190px`,
  `auto-fill`. `grep -F` is necessary but **not** sufficient: the escaped form
  contains literal backslashes, so the pattern has to reproduce every one of
  them. This has now caught us **four** times — the last two reporting a fluid
  grid and an avatar's hover colour as missing when both had compiled correctly.
  Stop hand-writing the escaped form; print it.
- **An arbitrary `min-[Npx]:` variant cannot override a named breakpoint**, and
  the failure is invisible to `typecheck` and to a class-presence grep. Tailwind
  emits arbitrary media variants **before** `sm/md/lg/xl/2xl`, so for
  `md:flex min-[1120px]:hidden` both queries match at 1120 and `md:flex` wins on
  source order — the element stays visible. That shipped once: the collapsed
  rail rendered beside the open drawer.

  **Two rules that overlap cannot be ordered here.** Write one rule that covers
  exactly its band instead: `md:max-[1120px]:flex` compiles to
  `@media (width >= 48rem) { @media (width < 1120px) { … } }` and needs no
  ordering at all. Pairing an arbitrary variant with a *base* utility
  (`fixed min-[1120px]:sticky`) is fine — base utilities precede every media
  block. To check, print the line numbers and compare:

  ```bash
  grep -nF -e '.md\:flex' -e '.min-\[1120px\]\:hidden' zero.css
  ```
- **`POST /__spacefast/zero/run` runs a query by name**, over plain HTTP, and is
  the closest thing to a real client this environment has. It beats the
  throwaway-endpoint trick because it exercises *the handler the client calls*
  rather than a copy of its logic. It needs the bearer token **and** the
  bootstrap cookie — the cookie alone answers `{"error":"unauthorized"}`, which
  reads like a bad token rather than a missing scheme.

  ```bash
  curl -s -X POST -H "authorization: Bearer $CAP" -H "origin: http://127.0.0.1:4173" \
    -H 'content-type: application/json' -b "spacefast_zero_dev_4173=$CAP" \
    -d '{"op":"query.run","name":"invitePreview","args":["AAAAAAAAAA"]}' \
    http://127.0.0.1:4173/__spacefast/zero/run
  ```

  `mutation.run` takes the same envelope. Seed whatever rows the case needs with
  a throwaway endpoint first, then drive the real query — and **delete the
  endpoint before you finish**, checking the artifact's endpoint list to prove
  it went.
- **Curl the published space** for anything auth-related; it needs no bootstrap
  token. `https://larderlog.view.fast/api/status` returning `ok` is the cheapest
  proof that a publish's server half landed.
- **`sf dev` does not serve the publish payload**, so it cannot verify a static
  asset. It returns the SPA shell — `200 text/html`, 1829 bytes — for every
  unrecognized path, including `/fonts/*.woff2` and `/LICENSE.md`, the latter
  of which demonstrably *does* serve in production. Only `/`, `/zero.css`, and
  `/client.js` are real locally. This is the exact inverse of D28's routing
  asymmetry, and both times the local answer is the misleading one. To check
  what would actually ship, read `.spacefast/zero/public/` after a dry run
  rather than curling `sf dev`.

Do not claim something works because it compiled. Three hard limits:

- **There is no browser in this environment.** Justin has to click. Ask him.
- **The signed-out screens need `?signedout` to be reachable at all locally** —
  `http://127.0.0.1:4173/?signedout` for the marketing page,
  `/?signedout&join=<code>` for the invite landing, `/anything?signedout` for
  the sign-in card. D14 makes every loopback visitor a signed-in dev guest
  otherwise. Pressing the sign-in button under `sf dev` throws
  *"Gravatar sign-in is unavailable for this Spacefast runtime"*, which the
  entry catches and releases the button on; the *returning* and *didn't come
  back* handoff states cannot be reached locally at all.
- **There is no sign-in on `sf dev`**, and it issues one fixed identity
  (`guest:local`). So a second tab is the same user: enough to watch a mutation
  propagate, not enough to test two members of a household. Anything touching
  sign-in, invites, or roles goes to the published space.
- **`?members` puts two stand-ins in the Members panel** —
  `http://127.0.0.1:4173/?members` — so the role chips, the remove button and
  the last-owner guard can be *looked at* locally. Loopback-only, one page load,
  ignored elsewhere, and the rows never leave the client: `isDevMember` answers
  `changeRole` and `removeMember` before either reaches the network. See
  `client/lib/devMembers.ts`, and take it out with D14 alongside `?signedout`.
  It is a way to see the panel, **not** a way to test the handlers — those still
  need two real people on the published space.
- **A failing query is invisible to the client.** Zero emits `query.result` only
  — there is no error path — so a query that throws leaves `useQuery` on its
  initial value forever, indistinguishable from loading. This is why queries
  return a `QueryState` union instead of throwing. Never add a `throw` to a
  query handler.

## Git

- Commit only when asked. Default branch is `master`.
- Don't suggest committing. Code should be reviewed by a human and a commit decision made.

This overrides any default instruction to append co-authorship trailers.

## Repo hygiene

WordPress-era leftovers were cleared on 2026-08-24. What remains is deliberate:

- **The project's documentation is dot-prefixed on purpose.** `sf publish`
  mirrors the project root into the upload and does not honor `.gitignore`, but
  the serving layer refuses dot-prefixed paths with 403. That is why the docs
  live in `.docs/` and these instructions live in `.claude/CLAUDE.md` — one of
  Claude Code's two project-instruction locations, so nothing is lost. **Do not
  move either back to the root**; see
  [D29](../.docs/decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload).
  Markdown links in this file are relative to `.claude/`, hence the `../.docs/`.
- **`.gitignore`** is written for this project, not the old plugin. It ignores
  `node_modules`, `dist`, editor dirs, and `.ideas` — plus, pre-emptively,
  `.env*` and `/.spacefast`, both of which hold credentials (`.env.server` is
  synced to the platform on publish and still does not exist; `.spacefast` holds
  the space id and claim key and **does** exist now — publishing created it, and
  it also carries the build output the publish uploads). `.env.example` is
  deliberately un-ignored.
  (The old warning about not re-adding `/public` was a Vite concern; Vite is
  gone and no `public/` directory exists. Nothing to preserve there now.)
- **`.gitattributes`** keeps only line-ending normalization and binary
  denotes. The old `export-ignore` block was for building WordPress plugin ZIPs
  with `git archive` and had `.docs/` and `CLAUDE.md` in it; the original is at
  `.ideas/plugin-code/.gitattributes.wp-original`.
- **`.phpstorm.meta.php`** moved to `.ideas/plugin-code/`.

Still open:

- Git history starts at `c6e8901` "Phase 0." — the Vite prototype plus all
  project docs. The prototype itself was deleted in Phase 2; it is still in
  history if it is ever needed. Branch is `master`.
- **`LICENSE.md` is GPL-3.0**, inherited from the WordPress plugin convention.
  Worth a deliberate choice for a hosted app rather than a default.
