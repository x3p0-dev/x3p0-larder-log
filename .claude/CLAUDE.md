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

**Phases 3 and 4 are built and published.** **v14 is live** as of 2026-08-29
(`ver_baf737f272f144f59de420f12f8c2c55`, 125 files, 7 uploaded, 18 seconds) —
**the first publish that is client-only**: no schema change, `db.migrations`
empty, and `schemaHash` byte-identical to v13's. It carries the run list's row-2
rework, the `ResizeObserver` fix, and the two hover states — see *Row 2 holds
the whole run list*. Verified the usual way plus the payload hash: `client.js`,
`zero.css` and `site.webmanifest` all `shasum`-match
`.spacefast/zero/public/`. **The first thing worth clicking on it is a resize**
— `compact` has never once been false in production before this version.

**v13** (`ver_cb18bde5f0e44c5db5fa37f75c9d4470`, 125 files, 16 seconds) carries
**all of `garden-and-kitchen.md`'s v1**: D58 (a source's kind, the STORE/SOURCE
rename, the kind menu, the item card's glyphs), the run list's three bands,
the item side's season, D60's retirement of the off-list checkbox, and D61's
first-run source mix. It took **three** columns live — `stores.kind` and
`items.seasonFrom` / `items.seasonTo` — the seventh and eighth additive schema
changes since Phase 2. Verified the usual way: `applied: true`,
`pendingOperationCount: 0`, a `migrations` array naming all three `add_column`
ops with their defaults, and `data.schemaHash` equal to
`data.plan.appliedSchemaHash` — read at their two different depths.

**v13 was the publish that ended the rationale blockade**, and **v14 confirmed
it**: a second plain `npx sf publish`, first try, no shim. It went out with
a plain `npx sf publish`, first try, no shim and no `NODE_OPTIONS` — see
*Publishing works* below, which is rewritten. **Nobody has clicked v13 or
v14** — everything below that says "nobody has clicked it" is still true, and is
now true *in production* rather than only locally.

v12 (`ver_50b38d7b92f2450a999c7835726c6411`, 121 files) carried Phases 4.13 and
4.14 and D52–D57, and is **the publish that took four columns live in one go**:
`items.size`, `items.unit`, `items.offShoppingList` (D52/D53) and
`memberships.picture` (D55), the fourth, fifth and sixth additive schema changes
since Phase 2.

v11 (`ver_1c0448898da744d3b2b42a89c4272e21`, 93 files) carried Phases 4.10–4.12
and D45–D51, and took the `profiles` table live (D46).

v10 (`ver_0026484fd67c495b8d3b7d52b9215d67`) was the legacy-hex swatch fix. v9 added a
document-level `color-scheme` meta and removed `/api/probe`, which is **gone
from the artifact and 404s in production even with its key**. v8 is what carried
the schema:

**v8** (`ver_09cc0c8a8bb34dd38ed92fae693c63d4`, 105 files, 16 seconds) carried
everything through D44 — the nine stamp columns, the A–Z term order, and the
device fixes. The v4 publish on 2026-08-26 ended a three-day blockade; v5–v7
were the probe rounds that found the hosted-runtime divergences. Publishing
needed a rationale-header shim from v4 through v12; **it does not any more** —
see *Publishing works plainly again* below.

**The hosted runtime is a different JS engine from the one `sf dev` runs**,
which broke `createInvite` in production while it worked locally — read *The
hosted runtime is not the engine `sf dev` runs* before writing any handler.

A real Spacefast Zero project: `sf.jsonc`,
`theme.json`, a Preact + TypeScript client in `client/`, pure domain logic in
`shared/`, and a capsule in `server/` holding the full schema from
`.docs/data-model.md`, five live queries, and nineteen mutations. The schema is
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

- **`shared/shoppingList.ts`** (now `shared/runList.ts` — D58) owns the grouping and both orderings — groups
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

### Four fixes from a real shop, and a way to reset a trip — 2026-08-28

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

**And *Clear checks* exists** — D41's fourth rule, and the only one with a
button. `useTripChecks` gained `uncheck(ids)` / `recheck(ids)`; the trip bar
gained a ghost opposite *Hide N checked*, and the all-checked bar a second one
before *Back to items*. It clears **what is on screen** — with a Store filter
on, the trip holds ticks for rows nobody can see, and a control beside
`Hide 3 checked` must not quietly clear seven — and it arms an ordinary
actionable toast, *Cleared 3 checks*, with Undo. **No confirm and no crimson**:
D36 governs records, a tick is not one, and a dialog in front of a phone in a
shop costs more than the mistake. The all-checked bar wraps now (`min-h-[70px]`
+ `flex-wrap`) because two sentences and two controls do not fit one line at
390.

**The all-checked bar has one control now, and it is *Clear checks*.**
*Back to items* is gone from it — a third way out of a mode that already has
two, when the state's own subject is the trip. That is also what fixed the
wrap: with two buttons the wrapped line was a pair pinned right under a
sentence starting 47px in, two ragged edges and neither shared. **Two
alternatives were built and reverted on the way**, and both are worth knowing.
Filling the line (`w-full` + `flex-1`, symmetric padding) aligned the block but
turned two ghosts into centred prose — a label on nothing reads as a control
only while its *position* is the affordance, which the ends of a bar give it
and the middle of its own line does not. Then giving them a box
(`bg-surface` + `line-strong`, since `line` measures 1.21:1 on this surface)
made them buttons and made the bar busy. **One control needs neither fix**: it
hangs off `ml-auto` at the row's end, wrapping or not, which is the shape the
trip bar above it already has. The glyphs stayed from that round —
`RotateCcw` on both *Clear checks*, `EyeOff` / `Eye` on the hide toggle — so
the ghosts say *control* at rest without spending an edge. `LIST_GHOST` is
unchanged, and `ShoppingList` no longer takes an `onBack`.

Verified: typecheck clean, 239 assertions, and on a throwaway `sf dev --port
4199` every new utility (`top-0`, `bottom-0`, `my-auto`, `w-full`, `h-full`,
`text-left`, `outline-none`, `md:pt-[30px]`, `flex-wrap`, `min-h-[70px]`,
`basis-[200px]`) is in the live `/zero.css` with the served
`/client.js` carrying the new class literals and none of the old. **Nobody has
clicked any of it** — all three are press-time behaviour, so all three want a
thumb.

### Add / edit item, redesigned (Phase 4.13) — 2026-08-28

`.claude/docs/design/add-edit-item.md`, drawn on
`.claude/docs/design/larderlogaddedititem.html`. Governed by
[D52](../.docs/decisions.md#d52-an-item-has-a-size-and-a-size-is-a-pair-that-is-never-half-set)
and
[D53](../.docs/decisions.md#d53-some-things-are-never-shopped-for-and-that-is-a-property-of-the-item).

**The fourth and fifth additive schema changes since Phase 2**, in one edit:
`items.size`, `items.unit` and `items.offShoppingList`. Still **ten tables, five
queries, seventeen mutations** — three more fields through the two item
mutations that already existed. It applies on the next publish with no flag, as
`households.ink`, D44's nine columns and the `profiles` table all did.
**`offShoppingList` is the app's second boolean column** and compiles exactly as
`invites.revoked` does.

- **An item has a size, and a size is a pair that is never half-set.**
  `shared/size.ts` owns it: fourteen units in three groups, and one function —
  `normalizeSize` — that both the sheet and the server call. A unit with no
  number becomes `1`; a number with no unit, or an unknown unit key, becomes
  neither. Between that and the sheet's two rules there is **no invalid state
  left to validate**, which is why nothing anywhere renders a size error.
- **`unit` stores a slug, never the abbreviation** — `quart`, not `qt`, on D32's
  reasoning about term colours. **Half pint printing as `cup` is the case that
  would otherwise be unfixable**: `1 ½ pt` reads as one and a half pints, which
  is a different quantity and the commonest use of that unit.
- **`offShoppingList` is read by exactly one function, `needsBuying`.** `statusKeyFor`
  does not see it. So an excluded item still reads *Out* on its card and still
  counts toward the three status pills, while the store card, its count and the
  cart total all drop it. **That split is the whole idea** — the pills count
  stock, the list counts shopping — and it is the thing to keep right.
- **The sheet is four sections**: Item · Count · Location / Store / Type ·
  Notes, micro-label over content, separated by a `divider` hairline. The three
  taxonomies share **one** rule because they are one question asked three times.
  **Grouping is labels and rules, never a fill**: a recessed panel on this sheet
  already means *you are editing something* — it is the inline composer — and a
  second one that only grouped would empty that meaning out.
- **One field treatment, and its border is `ink-muted` on a contrast finding.**
  The composer's old field border measures **2.80:1** on the panel and **2.45:1**
  on the sheet in dark; `ink-muted` clears 5:1 on all four surface-and-theme
  combinations. Same measurement that sent the shopping list's checkbox to this
  token. **`PAGE_FIELD` is now what a field on the page ground looks like**;
  `PAGE_INPUT` survives for the top bar's search alone, and **`PAGE_BUTTON` is
  deleted** — the sheet's old asymmetric minus was its last caller.
- **`UnitMenu.tsx` is the sort menu's construction, and its trigger is a field
  rather than a ghost** — the ghost treatment is for a control on the ground,
  this one sits on a form. The abbreviation sits in the check's reserved slot on
  every row but the current one. Caps at 320px and opens scrolled to the current
  unit; fifteen rows would otherwise be 593px of menu.
- **Two matched steppers, and *Low at* is a peer rather than a caption.**
  Symmetric and neutral, and **neither takes the card's ink plus**: the sheet has
  exactly one primary and it is *Save*. **The numeral is a text field** — 2 to 15
  is thirteen taps otherwise — capped at four digits, which is what fits an 85px
  cell at 390. `useHoldRepeat.ts` adds the accelerating hold, and **the first
  step still comes from `onClick`** so a tap fires once through the path that
  already works for a thumb, a mouse and the keyboard.
- **A live status line right of the `COUNT` label**, in the status ramp's own
  dot and text. **This is what makes the threshold easy rather than merely
  bigger.** It forced a rule the docs never stated: **`on hand == low at` is
  low** — which is what `statusKeyFor` already did, and now has a test.
- **`CheckBox.tsx`** is the shopping list's 22px box, extracted rather than drawn
  twice. The rhyme is the point: the box that takes a row off the list you are
  shopping, and the box that keeps an item off every list.
- **The card gained the size beneath the name** (not beside it — names are long,
  and the list's own 460px collision is on record) **and a struck cart left of
  the status** when the item is kept off the list. The status does not move. The
  cart is `ShoppingCart` under `Slash`, since lucide has no struck one, and it is
  **the first thing to challenge**: a glyph nobody has been taught, on a card
  that otherwise carries no icons beside the name.
- **The list row gained the size riding with the name**, before the badge — at
  the shelf *"Butter, 1 lb"* is one phrase. **The stacking floor was left at
  460**, not raised to the design's derived 520: the row already wraps on
  measured content rather than at a hard breakpoint, and 520 would change the
  grid's column count at 1440 on an unmeasured number. Worth a look on a real
  screen.

**Three deliberate departures from the boards.** The status line does **not**
crossfade — there is no stylesheet in this project and therefore no `@keyframes`
to reach for, and a 140ms fade is not worth appending a `<style>` at boot for.
The sheet keeps its full-height right-edge geometry on desktop rather than the
boards' floating card, which is how the boards draw it in isolation; the spec's
own table says *480 from the right*. And **`Household default` rides the *Low
at* sub-label after a middot**, rather than sitting on a line under the field:
the note is about the number the field arrived holding, so it belongs beside
that field's name, and a line of its own made two side-by-side steppers unequal.
It truncates rather than wraps — the pair measures 156px inside the 173px a
stepper gets at 390.

**That note tracks the value, not a touched flag**, which is a fourth departure
and the one worth knowing. The spec says it *disappears the moment the number is
changed*; built that way it was a one-way `thresholdTouched` boolean, and it
left the sheet saying nothing about a threshold that **was** the household's —
which is the only thing the line exists to say. It is now
`toInt(threshold) === toInt(defaultThreshold)` on the Add sheet, so stepping away
and back brings it back. `toInt` on both sides, so an empty field and a leading
zero read as the numbers they are. **`ItemSheet` takes `defaultThreshold`
again** — it was dropped when the hint stopped naming the number.

**Verified without a browser**: typecheck clean, **285 assertions** (46 new),
the artifact shows all three columns with defaults and `db.migrations` empty,
`sf dev` on `--port 4199` compiles and serves, every new class literal is in the
live `/zero.css` — printed and unescaped, never hand-written — and the **real
handlers** were driven over `POST /__spacefast/zero/run`: a whole pair stored, a
unit with no number resolving to 1, a bare number and a bogus unit key both
resolving to neither, a unit-only patch keeping the number it did not name, and
`offShoppingList` set and cleared. **Nobody has clicked it** — every interesting part of
this is press-time behaviour, so all of it wants a thumb.

### The app now says it is installable (Phase 4.14) — 2026-08-28

`.claude/docs/design/install-as-an-app.md`, drawn on
`.claude/docs/design/larderloginstallmockup.html`. Governed by
[D54](../.docs/decisions.md#d54-the-offer-to-install-is-one-row-in-settings-and-there-is-no-banner).
**Client only**: no schema change, no handler moved, no new `theme.json` token —
still ten tables, five queries, seventeen mutations.

The manifest shipped on 2026-08-27 and **nothing in the app has ever said so**.
This is one row — *Add to home screen*, in Settings › Preferences under
Appearance, behind the block's own hairline. **There is no banner, no
interstitial and no badge anywhere else.**

- **Two rules, and everything follows.** *Nothing offers to install what is
  already open* — four `display-mode` queries plus `navigator.standalone`, which
  is the only answer there is on a home-screen Safari. And *the row appears only
  where a path actually exists*, which is what the sort trigger and the
  shopping-list trigger already refuse to be.
- **One control, two labels** — **Install** where a browser handed the page a
  prompt, **Show me** everywhere the path is a menu. Same pill, same geometry,
  same position; the label carries the difference, which is the shopping-list
  trigger's rule.
- **A prompt is one path, not the definition of one**, and this is the part that
  was got wrong first. `beforeinstallprompt` was treated as the proxy for *a
  path exists* — but **Chrome installs any page from its own ⋮ menu**, with no
  manifest, no service worker and no prompt, and **the page is never told**.
  There is no API to ask. So the row keyed to the prompt stayed hidden on
  desktop Chrome while the browser sat there offering to install it. Now four
  `steps` modes carry the four menus that can be named — iOS, Chrome on Android,
  Chrome on the desktop, Safari on macOS — each in that browser's own words.
  **Edge, Opera, Samsung Internet, Vivaldi and Firefox answer `none`**: they all
  carry `Chrome/` or have a real path, and none of their menus has been checked.
- **The label follows the platform** — *Add to home screen* on a phone,
  **Install as an app** on a desktop, which has no home screen. The one
  departure from the boards, which drew the phone's words on the 1440 board
  before the row had desktop steps to be wrong about.
- **The event is captured at boot, not when Settings opens.**
  `beforeinstallprompt` fires once and early, so `watchInstall()` runs from the
  entry beside `installFonts()` and `installAppIcon()` and `client/lib/install.ts`
  holds the event. Waiting for the drawer would mean the row could only ever
  appear on a reload after the one that mattered — which the design doc listed
  as an open question and this is the answer to. **The event is dropped before
  the dialog opens**, not after: it can be prompted once, a second press throws,
  and a pill that fires nothing is the worst version of this row.
- **The steps panel is the inline composer on a fourth surface.** It drops in
  below the row and **the row stays put**, 180ms in and 140ms out — the applied
  chip's exit — animated on `grid-template-rows`, because a panel of unknown
  height has no pixel value for `max-height` to guess at. Instant under
  `prefers-reduced-motion`. **The words are Safari's own**: *Share* and *Add to
  Home Screen* are what the buttons say, and the share mark is drawn **beside**
  the word rather than instead of it.
- **`Theme.drawer` gained `inkMeta` (`#A5937A`) on a contrast finding.**
  `inkFaint` — the rail's rest colour — had been standing in for drawer meta
  text everywhere and measures **4.28:1** on the light theme's raised fill. It
  is fine on the drawer gradient and fails on the card that sits on it, which is
  where every meta line in the Settings pane actually lives. `drawerTheme()`'s
  `textMuted` resolves to it now, so the household's item count and the members
  count moved with the new row.
- **The steps panel's hairline is `#6E5F4B`, hard-coded, and that is the second
  finding.** The composer's own `#3B3126` reads **1.10:1** on `drawer-raised`;
  the fill alone is 1.31:1, so the panel has no edge at all. **The invite
  composer and the Filter tab's term composer have the same bug and were
  deliberately left alone** — one row should not quietly restyle three
  components.
- **The detection is exercised against eleven real user agents**, including the
  two that are easy to get wrong: **iPadOS 17 reports itself as a Mac** (a touch
  count is what separates them) and **Chrome's own user agent contains
  `Safari/`**. It lives in `client/lib/install.ts` and **cannot move to
  `shared/`** — it reads `navigator`, which is on the capsule compiler's server
  denylist — so it is checked by driving the compiled module, not by `npm test`.
- **There is no service worker anywhere in this project**, and that is the open
  risk under all of it: Chrome has historically wanted one before it will fire
  `beforeinstallprompt`, so the **Install** branch may be dead everywhere. The
  manifest is complete and its three icons serve — checked against the live
  space. **DevTools ▸ Application ▸ Manifest ▸ Installability** settles it. The
  steps variant is what makes the row useful either way.

**Discovery is unsolved on purpose, and this is the thing to remember about the
whole change.** A banner was drawn at 358 × 127 and cut: it cost ~125px at the
top of a 390 screen where the top bar already takes three rows, it needed a
whole dismissal design to be tolerable, and it made the already-installed case
worse. **Nobody opens Settings to see what is in it** — so installing is now
reachable only by someone who already suspects it is possible. That is on the
record rather than left to be noticed later, and it is the first thing to
revisit if install numbers come back at zero.

**Verified without a browser**: typecheck clean, 285 assertions, `sf dev` on
`--port 4199` compiles and serves, and **all 65 class literals** in the new
component and the two new control styles were diffed against the live
`/zero.css` by unescaping the sheet's own selectors — printed, never
hand-written — including the line numbers proving each `md:` rule lands after
the base it overrides. The served `/client.js` carries every new string.
**The row is now visible under `sf dev`**, which the first cut was not: desktop
Chrome on loopback resolves to `chromium`, so it renders *Install as an app* and
**Show me**. That is honest rather than a dev switch — Chrome really will
install a localhost page from that menu. What still cannot be reached locally is
the **Install** pill, which needs a browser that fires the prompt, and the iOS
and Android steps.

**Nobody has clicked it.**

### Members have faces (D55) — 2026-08-28

`.docs/decisions.md` D55. **The sixth additive schema change since Phase 2**:
`memberships.picture`, a string defaulting to `''`. Ten tables and five queries
still; **eighteen mutations**, the new one being `syncAccountAvatar`. Applies on
the next publish with no flag.

Only your *own* avatar was ever a picture, and **nothing decided that** —
`DrawerAvatar` has taken a `picture` since Phase 4.12 and calls the initial "the
fallback"; the members' rows were the one caller with nothing to pass. It read as
deliberate because **the boards draw a letter for everyone, your own row
included**, so your face was the departure rather than their initials.

- **It stores a URL, and therefore no email.** `ctx.auth.picture` is already the
  finished Gravatar URL and the server had simply never read it. That is the
  whole privacy argument: `ctx.gravatar.avatarUrl(email)` is free and was the
  obvious tool, but it needs an *address*, and every member of a household would
  have been able to read every other member's.
- **The two stamp sites are the only two moments the value is in reach.** The
  platform tells a handler about its **caller**, never a third party — so
  `createHousehold` and `redeemInvite` stamp through `accountAvatar(ctx)`,
  beside the `accountName(ctx)` already there.
- **`syncAccountAvatar` is what makes it visible at all.** Stamped-at-join and
  left alone, the column is write-once — wrong for the ordinary case (join
  first, set up Gravatar later) and, worse, **every row on the published space
  today holds `''` and nothing backfills** (D44). It writes only rows that
  disagree and **invalidates only when it wrote**; an unconditional invalidate
  would refetch the household for every member on each other member's load. A
  second call in a row reports `changedTables: []`.
- **`onError` is load-bearing.** The platform's URL carries `d=404` on purpose,
  so an account without a Gravatar serves **no image** and the consumer draws
  its own initial. Both avatar components rendered a bare `<img>`, so that
  account got the browser's broken-image glyph — already true of your own
  avatar, never hit. They hold the URL that *failed* rather than a boolean, so a
  changed picture retries with no effect to reset a flag.
- **The stacked trio was already capped** at `members.slice(0, 3)` with the
  count in words below it, and did not move. No "+2" bubble: a fourth circle
  that is not a person is a worse thing to overlap than a person.

**Verified without a browser**: typecheck clean, **295 assertions**, the
artifact shows `picture` with `default: ""` and `db.migrations` empty, and the
**real handlers** were driven over `POST /__spacefast/zero/run` — the members
DTO carrying the column, the reconcile clearing a seeded picture, and a second
call writing nothing. **Nobody has clicked it, and one half cannot be clicked
here at all**: `sf dev` issues no `auth.picture`, so the stamping path needs the
published space. What *is* local is the rendering, via `?members`.

### The account row, and the app's first outbound link (D56) — 2026-08-28

**Client only**: no schema change, no handler moved. Ten tables, five queries,
eighteen mutations.

- **`auth.email` is empty in production by design.** It is the identity token's
  `email` claim, read straight off the JWT by `createAuthFromToken` with no
  lookup and no fallback, and a Spacefast account carries none. `pairwise_sub`
  preferred over `sub` for the user id, plus the SDK's own comment about
  deriving a Gravatar profile *"without ever touching the email behind it"*, say
  it is a privacy stance rather than an omission. **`auth.picture` is present** —
  confirmed on the live site — so D55 is safe. `docs/zero.md` promises `email`
  with no caveat; logged as a docs gap.
- **The dev guest no longer reports an email**, only hashes one for its avatar.
  It briefly showed `justintadlock@gmail.com` and made the local account row a
  line taller than the published one. **A dev switch may reveal what production
  hides; it must never invent what production lacks.** Both render sites were
  already `{email && …}` — *absent, not blank* — so production never changed.
- **`Change your picture` ships**, the board's third row, which had been marked
  *"Do not build yet — nowhere to send anyone."* There is now. Its own block
  between the identity row and *Sign out*, `CircleDot` in front and
  `ExternalLink` behind. **Naming Gravatar here is right where naming it on the
  sign-in button was wrong (D47)**: that button went to a Spacefast account, this
  genuinely goes to Gravatar. Label stays the board's four words (292px menu);
  the destination rides the accessible name, which *contains* the visible label.
  Points at `/profile/avatars`, the editor — Gravatar bounces a signed-out
  visitor through sign-in and back to it. No `onDone()`: it opens a tab beside
  the app, and a menu that shut itself would read as the app forgetting where
  you were.
- **The app's first `target="_blank"` and first `rel="noopener noreferrer"`**,
  and its first use of `no-underline`.

Verified: typecheck clean, 295 assertions, and on a throwaway `sf dev --port
4199` **all 32 class literals** in the touched component were diffed against the
live `/zero.css` by unescaping the sheet's own selectors — printed, never
hand-written — with `.no-underline` among them. The served `/client.js` carries
the URL, both labels, `_blank` and `noopener noreferrer`. **Nobody has clicked
it.**

### The front door says it is a beta (D57) — 2026-08-28

`.claude/docs/design/beta-badge.md`, drawn on
`.claude/docs/design/larderlogbetabadgeboards.html`. **Client only**: no schema
change, no handler moved, no new `theme.json` token — still ten tables, five
queries, eighteen mutations.

**The marketing page discloses the stage and the app shell does not repeat it.**
`BetaBadge` in `Brand.tsx`, drawn twice in the nav (the wordmark there is
responsive and the badge derives its metrics from a number) and once in the
footer. Nothing else: not the drawer header, not the mobile header row, not
`<title>`, not the manifest name, not the icon.

**It was built the spec's way first and rejected**, and that is the part worth
keeping. The spec's rule is *the wordmark never appears without it* — a marker
on some screens and not others stops being a disclosure and becomes decoration.
Sound about disclosure, wrong about audience: **a caveat is read once, when you
are deciding.** A permanent pill above the item grid re-serves it on every load
to somebody who has already signed up, in the two places the app is least able
to spare the width. The rule still holds *within* the marketing page, which is
why the footer keeps it.

- **It is not a control.** Not focusable, no press state, no tooltip, no link.
  The tag component with no dot. The markup says `Beta` and the caps are CSS, so
  a screen reader is handed a word; it is deliberately **not** `aria-hidden`, so
  the nav announces *Larder Log Beta*.
- **A fill one step off the ground, a `meta` edge, a `body` label** — `border`,
  `textMuted`, `text`, so both themes come from one expression. **The fill does
  none of the separating** (1.10:1 light, 1.45:1 dark), so the edge is the whole
  component. It is the **second** component to borrow a text token for its
  border, after the shopping-list checkbox, which is starting to look like the
  answer to the *top-bar controls have no edge* question.
- **The drawer trio is measured and not built** — `drawer.raised` /
  `drawer.inkMeta` / `drawer.inkMuted`, 8.70:1 and 10.44:1 — and is recorded in
  `BetaBadge`'s comment so that surface is a trio rather than a measuring
  exercise if it is ever wanted.
- **It scales off the wordmark's set size** — height 0.66, label 0.55 of the
  height, padding 0.39 of the height, gap 0.37 of the set size — the way
  `HouseholdTile` derives its radius and letter. **The 9px label floor is applied
  to the input** (`Math.max(24, size)`), which is what the spec's *"the footer
  takes Small unchanged"* amounts to in one expression. **The gap belongs to the
  badge**, as a `marginLeft`, which is why both call sites wrap the wordmark and
  badge in a gapless row of their own.
- **The nav is 20/24, not the spec's assumed 27**, so both its badges are small.
  That is the derivation doing its job rather than a departure.
- **The sign-in card and the `?join=` landing are now the only signed-out
  surfaces without a marker**, which makes them candidates rather than
  exclusions — see D57's *Open*. The invite landing has no wordmark at all.

**One unrelated fix rode along.** The mobile header's `Log` was hard-coded
`#BE3346` in both themes — 3.11:1 on the dark ground, the exact bug
`theme.accent` was added to fix, on the one wordmark that never got it. Now
`theme.accent`, 4.81:1 in dark. Found while the badge was still attached to that
wordmark, and kept when it was removed.

**Verified without a browser**: typecheck clean, 322 assertions, `sf dev` on
`--port 4199` compiles and serves, and **every class literal** in the new
component was diffed against the live `/zero.css` by unescaping the sheet's own
selectors — printed, never hand-written — including `.-top-px` resolving to
`top: -1px` and `@property --tw-border-style` carrying `initial-value: solid`,
which is what makes a bare `border` paint the inline `borderColor`.

**Nobody has clicked it, and `?signedout` is the only way to look at it
locally** — `http://127.0.0.1:4173/?signedout`. The cap-height alignment (a flat
`-top-px`) and the gap beside the italic `g` are arguments made on paper.

### A source carries a kind (Phase 4.15a, D58) — 2026-08-29

`.claude/docs/design/garden-and-kitchen.md`, drawn on
`.claude/docs/design/larderloggardenkitchenboards.html`. **The seventh additive
schema change since Phase 2**: `stores.kind`, a string defaulting to `''`. Ten
tables and five queries still; **nineteen mutations**, the new one being
`setSourceKind`. Applies on the next publish with no flag.

**The first of three builds from that document** — the run list's bands and the
item side's season and ingredients both read this column, so it exists first.

- **A store carries a kind — shop, grow or make**, and it is a property of the
  *term*, not the item, not a fourth term group, and not a mode. *The Garden* is
  a term like any other: a colour, a name, a count, a chip that filters, a tag on
  a card. **The drawer never learns what a kind is**, and **the item card did not
  change at all** — which is the strongest argument for putting it here.
- **Why it exists: `NO STORE` was carrying two opposite meanings.** Baking Soda
  has no store because nobody set one — a gap. Frozen Peaches may have none
  because *there isn't one*. The list drew them identically.
- **`shared/source.ts`** owns every rule — `toSourceKind` (anything unrecognised,
  `''` included, is a `shop`; a query that throws is invisible, so nothing here
  throws) and `sourceGroupWord`. `npm test` is at **342 assertions**.
- **The group renames itself** — `Store`, or `Source` once one source is not a
  shop. **Five places move together**, one more than the design doc names: the
  Filter heading, the dashed chip, the composer's micro-label, the item sheet's
  group label, and the **blocked-delete dialog**, which would otherwise say *"A
  store can only be deleted…"* under a heading reading `SOURCE`. `termBlock`
  takes a `noun` and both halves pass it, so the server's throw and the client's
  dialog stay one string. The rail's flyout **label** moves with them; **its
  storefront glyph deliberately does not** — a neutral mark has not been drawn,
  and inventing one would put an unlearned glyph on the one surface that is
  nothing but glyphs.
- **The rule is "does anything here fail to be a shop", not "how many distinct
  kinds are there"**, and that is a **knowing departure from the doc's prose**,
  which says *one kind and it is a Store*. Its own table says otherwise, and a
  household whose every source is a garden has exactly one kind. The table wins.
  `npm test` asserts the gardens-only case specifically.
- **`SourceKindMenu` is `RoleMenu` with different words in it** — nothing new is
  drawn. **The trigger is the glyph, not a word**: a 340px row cannot spend a
  slot on *Shop*. Shop sits at `drawer.inkFaint`, grow and make brighten to
  `inkMuted`, so a glance down the panel says which rows are not shops.
  `DRAWER_KIND` is `DRAWER_TRASH`'s geometry with **no colour of its own** — the
  glyph's colour is an inline style, which would beat a class's `:hover` colour,
  so the hover is the fill alone.
- **A new source is a shop unless you say otherwise** (amended 2026-08-29, and
  D58 had this wrong). It shipped with no kind control on any composer; the kind
  is not something you discover afterwards, and saying *The Garden* is a garden
  meant naming it, pressing *Done*, re-opening the group with the pencil and
  finding the row again. **All three draft rows carry the glyph now** — the
  Filter tab's `NEW` panel, its editing panel's add row, and the item sheet's
  `+ Source` composer — in the slot an editing row already spends on it, and
  **defaulting to shop**, which is what `toSourceKind` resolves an absent value
  to. A household that never touches it composes exactly the row D58 composed.
  **`createTerm` did not change**: the draft's optional `kind` existed for undo,
  and composing is a second caller of an argument that was already there.
- **The composer stopped hanging past its column, on both surfaces**, and that
  bug is older than any of this — `TermPanel` has carried a `-mx-2.5` since
  Phase 4.5. It was there to read as a tray opening rather than a card floating
  in a list, and it read as neither: on the item sheet it hung 10px outside the
  fields, the micro-labels and the season and make panels either side of it, and
  in the Filter tab it hung outside the chips it drops under **and outside the
  `EDITING` card** — which is the same panel one state along and has always sat
  on the pane's gutter. One panel disagreeing with itself one state later is the
  clearest argument there was. **The margin is gone rather than made a prop**:
  it was added as `bleed`, defaulting on, with the sheet turning it off, and
  then nothing wanted it on. One geometry now — the panel's edges are its
  column's, `px-3.5` inside, which is the season panel's `p-3.5` and the editing
  card's `pl-3.5`.
- **The kind menu is on cream for the first time**, since one of the three
  composers is the item sheet. `SourceKindMenu` takes an `onDark` and re-skins
  the way `TermRow` and `panelSkin` do — the drawer keeps `DrawerMenu`, the
  sheet gets `PAGE_MENU`, which is the sort menu's popover and therefore the box
  the unit menu opens a few pixels away on the same sheet. **The reverse would
  be the mistake `DrawerMenu` already records**: a cream popover over the
  darkest panel in the app. **`PAGE_KIND` fills to `surface`, not
  `surface-alt`** — the composer panel *is* `surface-alt`, so the usual ghost
  hover would move the control to the colour it is already on (D45's rule, on a
  different ground).
- **`setSourceKind` is its own mutation**, not a `kind` on `updateTerm`'s patch:
  that handler's second argument is *already* called `kind` and means the
  taxonomy. It **short-circuits an unchanged value and invalidates nothing** —
  the menu is a radio group where pressing the current row is how you close it.
- **Undo carries the kind back.** `createTerm`'s draft takes an optional `kind`,
  **undo only**, the same trade the stamps make (D44). Undo is a re-insert
  (D17), so without it a restored garden comes back a shop.
- **The item count left the editing row** — D36's own delta, and a consequence of
  the glyph taking its slot rather than a change of mind. At 340px a fifth
  control left the field ~150px, which is where *Calfee Cattle* truncates.
  **Counts stay on the chips at rest.** D16's widening to all three kinds stands
  without it; that rule was argued from the count, never about it.

**Two things landed with the revised spec on 2026-08-29.**

- **The item card carries one glyph** — sprout or pot, 15px in `textMuted`,
  leftmost in a top-right cluster that is now **glyph · dot · chevron**. A
  bought item has nothing there and **the absence is the point**. The first
  version of the spec said the card changed *not at all*; the glyph adds *what
  kind*, which the tag cannot say — a household can call a grow source anything
  and colour it anything. **Meta grey, never the term's colour**: the status dot
  stays the only coloured thing in that corner. The objection that nearly killed
  the off-list cart does not apply — this glyph is taught three times (band
  headers, segment tabs, the editing row) before a card shows it.
  `itemSourceKind()` returns `null` far more often than not, and **grow wins a
  tie** on the run list's own band order. **A make item kept off the list draws
  both this and the struck cart**, which will be common — worth watching.
- **Every editing panel gained a way to add a term**, and that gap was **not
  this feature's**. The dashed chip is hidden while editing — the panel *is* the
  group — which left the Filter pane as the one place you could rename,
  recolour and delete a term but not make one. All three groups, not just
  sources. Both add affordances are the same draft row on two surfaces and are
  never both open; the editing panel's own *Done* commits it.

**Verified without a browser**: typecheck clean, **353 assertions**, the artifact
shows `stores.kind` with `default: ""`, `setSourceKind` among nineteen
mutations, ten tables and `db.migrations` empty; every class literal in the four
touched files was diffed against a live `/zero.css` by unescaping the sheet's
own selectors — printed, never hand-written — and the **real handlers** were
driven over `POST /__spacefast/zero/run` on a throwaway `sf dev --port 4199`:
seeded stores resolving `''` to `shop`, a new source arriving as a shop, shop →
grow → shop, a repeat write reporting `changedTables: []` *and*
`changedQueries: []`, a bogus kind refused, a bogus kind on create landing as a
shop, a cross-household id refused, a kind surviving a create, and the blocked
dialog saying **"A source can only be deleted once nothing uses it."**

**Nobody has clicked it.** The menu is the only new surface, and it is the one
thing that wants a thumb. **To see any of it locally**: Filter tab → `+ Store` →
name it → the pencil → press the cart glyph. The seeded three are all shops, so
a fresh household says `Store` until you change one.

### The run list (Phase 4.15b, D58) — 2026-08-29

**Client only**: no schema change, no handler moved. Ten tables, five queries,
nineteen mutations.

**`shared/shoppingList.ts` is `shared/runList.ts`**, `shoppingGroups` is
`runBands`, `ShoppingList.tsx` is `RunList.tsx` and `ShoppingListTrigger.tsx` is
`RunListTrigger.tsx` — all four `git mv`'d, so history follows. The list groups
by **kind first, source second**, and **nothing about a card changed**: same
460px `auto-fill` grid, same header, same rows, same trip bar.

- **A band appears only when it holds something**, always Buy · Harvest · Make.
  A household with nothing but shops gets one band, no headers and no segment —
  **today's shopping list byte for byte**, which is most of why this shape won.
- **An item appears under every source it names, which now means two bands.**
  Tomatoes bought in February and picked in July are on both cards, counted once
  by each — so **the bands need not add up to the total**, exactly as the store
  cards never summed to it.
- **The storeless group is Buy's, and its test is against *every* source.** An
  item naming only The Garden has a source, so it must not also turn up in Buy
  asking to be given a shop.
- **`needsBuying` gates every band**, so *Keep off the list* keeps an item off
  Harvest and Make too — what the checkbox says is *never remind me about this*,
  and a harvest list is a reminder. **That narrows what D53's checkbox is for**:
  it was written for "the things a household grows or brews", and a grow source
  now says that better and says which. The label lost the word *shopping* with
  it, and so did the card's `aria-label`.
- **The trigger says `To get`** — *Shopping list* stopped being true the moment
  three of the seventeen were things you pick. **Its cart glyph stays** at the
  compact width and is the one thing still saying *shop*; recorded rather than
  solved, in the same place the rail's storefront is. Its count is unchanged: the
  household's total across all bands.
- **`All` is the default and the whole design**, and carries no glyph — the
  drawer's `All items` argument reused. **The active tab is not the ink
  primary** (*Add item* is on screen and ink is what you press), so it is
  `surface` on `borderStrong`: a raised tab on a sunk track. An inactive tab
  carries a **transparent 1px border** so picking one does not shift its
  neighbours by a pixel.
- **The segment's counts are the filtered set's; the trigger's is the
  household's.** That pair has always been allowed to disagree.
- **The trip line shrinks to the cart clause when the segment is up** —
  `12 to buy · 4 stores` is what the segment now says in tabs you can press.
- **The active tab is resolved once and read three times.** A chosen band can
  empty under you, so it falls back to `All`. Reading the raw tab in one place
  and the fallback in another draws every band with no headers over them — built,
  caught, fixed before it shipped.

**One departure from the boards, and it is forced.** **The Make card is a Buy
card**: the doc's own refinement says the row is 56px "until a recipe gives it
something to say", and recipes are not being built (D59), so there is no second
line and no *short 3 carrots*. **Board 1 draws it in the taller form and is
drawing the mockup.**

**The segment's own row lasted a day — see *Row 2 holds the whole run list*
below.** It shipped beneath row 2 because row 2's left slot held its width in
both modes so the trigger never moved when pressed, and in compact that slot
*was* the slack. The answer was to spend both: the trigger leaves the row in
list mode, and its 135px and the slot's 368 become the segment.

**Verified without a browser**: typecheck clean, **368 assertions** (15 new,
covering band order, the two-kind item counted once by each band, the storeless
group staying on Buy, an excluded grown item reaching no band, and a `''` kind
landing on Buy), and every class literal in the four touched files diffed
against the live `/zero.css` by unescaping the sheet's own selectors — printed,
never hand-written. The served `/client.js` carries `To get`, `Harvest` and
`Run list`.

**Nobody has clicked it, and `?demo` cannot show it** — the seeded sources are
all shops, so it draws one band and no segment. To see the bands locally:
`?demo`, then Filter → the pencil → **Add a source** → *The Garden* → the cart
glyph → **Grow** → Done, then tag two low items with it. Extending `?demo` is
the obvious fix and was not done: `DEMO_ITEMS`' distribution is pinned by
`npm test` on purpose and adding rows moves eight assertions.

### Row 2 holds the whole run list — 2026-08-29

**Client only**: no schema change, no handler moved, no new utility class — every
one it uses was already in the sheet. Ten tables, five queries, nineteen
mutations.

**Row 2 is one line at every width, the segment included.** The segment had
shipped in a scrolling row of its own below the measured column, which was a
**fifth** row at 390 in a top bar whose documented worst case was already four.

- **The row's right end is the chrome, in both modes**: in grid mode the trigger
  and the sort, in list mode the segment. Neither end is about the pantry — the
  left is what you have, the right is how you are looking at it.
- **List mode is two controls and a clause**: *Back to items* on the left, the
  trip count, and the segment at the right end.
- **The trigger is a glyph and a count at every width**, and it moved from after
  the status pills to beside the sort. It wore *To get* with room; the count
  pill already says how much and the glyph says what kind, and a word beside the
  sort's own short label is the odd one out. The words survive in `aria-label`,
  which reads *To get, 17 across every kind*. **What this gives up is the
  on-ramp** — the eye crossing `9 in stock · 6 running low · 5 out` and landing
  on the thing to do about it, which is the argument D41 used for placing it
  there instead of colouring it.
- **The sort names its choice the short way at every width** — `Restock`, not
  `Sort · Needs restocking`. The glyph and the word *Sort* are gone with the
  long form: a chevron says it opens, its position says what kind of control it
  is, and the full name is still on the menu's own rows and in its accessible
  name.
- **`Showing 20 of 63` is deleted.** The pills to its left carry every count
  that matters and the grid is directly below; its pair — rendered-so-far of
  matching — was never the pair the live region announces (matching of
  household), so the two disagreed on screen by design.
- **`ROW2_FULL_PX` is 580, re-measured.** Three of the four parts the old 910
  was derived from are gone or shrunk: the count line deleted, the trigger down
  to ~72, the sort to ~100. **`compact` is now mostly a touch-geometry flag** —
  the pills' short words and the row's shared 44px — since the two controls that
  used to shed words have none left to shed. The cost is that a landscape phone
  clears it and takes the 40px row; the gain is that a docked drawer on a 1280
  desktop stops wearing a 390 layout with 300px of the row empty.
- **The trigger is the way *in* only, on desktop.** Row 2 drops it in list mode.
  *Back to items* is the way out and says so; a second exit whose count is the
  **household's** would argue with a screen counting the **filtered** set; and
  its 135px is what the segment wears its labels with. **So the press removes
  the thing under the pointer** — the thing D41's amendment was written against
  — and what it buys is the whole run list on one row with its words on.
  **Below `md` none of that applies**: the trigger is in the mobile header in
  both modes and never moves, which is the arrangement D41 was really
  protecting, since the pair it replaced put the way in and the way out in
  *different rows* on a phone.
- **The pills' 368px reserved slot is gone with it.** They unmount rather than
  going `invisible`; there is no longer an x to hold still. Three things paid
  for the fifth row, in order: that slot, the trigger's 135, and then the trip
  clause and the segment's words, which share one threshold.
- **Every control on the row shares a height** — 44px compact, 40 full — off row
  2's own `compact`. The segment was `h-10` at every width and stood 4px short
  of its neighbours on a phone.
- **`compact` was stuck `true` on every screen, and had been for as long as it
  has existed — see *The observer never attached* below.** Everything row 2 has
  ever been documented to do at full width was unreachable.
- **Whether the segment wears its words is a different question from
  `compact`.** `compact` is `< 910` measured on the content column, so a docked
  drawer on a 1280 screen would drop the words with ~470px spare. `compact` is
  geometry alone; `iconOnly` is `ROW2_LIST_PX + runSegmentPx(kinds, false)`, a
  threshold that moves with the band count.
- **`ROW2_LIST_PX` is 265** — the exit at ~145, `3 in the cart` at ~88, and the
  row's gaps. It was 400 with the trigger in it, which put a three-band
  household's labels at 820 of column and hid them on any window that was not
  most of a 1440. At 265 that is ~685, and **the drawer does not dock below
  1120** — so every desktop arrangement this app has wears the words.
- **`runSegmentPx()` lives beside the markup it measures**, in `RunSegment.tsx`:
  `ROW2_FULL_PX`'s method applied to a control with no single width.
- **The observer stores the width now, not the boolean.** `compact` derives from
  it, and still starts at 0 — which reads as compact — for the reason the
  boolean started `true`.
- **The segment's scroller bleeds right below `md` only.** Above `md` it never
  scrolls at all: `iconOnly` guarantees it fits, which is D45's rule (a mouse
  has no scroll gesture) satisfied by arithmetic rather than by a wrapper.

**The glyphs changed twice and settled as a family.**

- **The trigger is a basket once the household grows or makes anything.** The
  cart is the **Buy band's** glyph — band header, segment tab, item card — so a
  household with a garden had one cart meaning *the whole run* a gap from
  another meaning *the shop part of it*. **The test is `sourceGroupWord`'s**,
  not "has grow *and* make" as asked: the collision is with the cart, and one
  garden creates it as well as a garden and a kitchen do. So the trigger is a
  basket precisely when the drawer's group reads *Source* rather than *Store* —
  one rule, already written down, both surfaces moving together. It follows the
  **household's** sources, not the filtered set's bands, which is what its count
  already does.
- **`All` wears the basket too, reversing its own rule.** It carried no mark at
  first, on the drawer's `All items` argument — the absence of a choice is not a
  member of the set. What changed is that the basket became free: it already
  means *everything to get* rather than *the shop part of it*, and with the
  trigger off this row on desktop it had nowhere else to be. The segment now
  reads as one family — the whole basket, then the three ways things get into
  it. **And having a mark is what lets it drop its word** with the others, so
  glyph-only is four glyphs rather than three and a word.
- The band tabs take an `aria-label` carrying the word **and the count**, since
  `aria-label` replaces what is under it rather than prefixing it.

**The tabs hover on the edge and the words, never on the fill**, and that is
forced rather than chosen. The selected tab is the *raised* one — `surface` on a
`surface-alt` track — and `surface` is lighter than the track in **both** themes,
so D45's *move away from the ground* means darker, and there is no darker step
to take: light has `border` at `#E2D5C0` and works, while dark's track is
already `#221C14` with only the `#1F1912` canvas beneath it, three units and
invisible. A fill hover would have to run *toward* the selected fill, and a tab
that looks half-selected on a control whose whole job is saying which one is
selected is worse than no hover.

So an unselected tab grows a `border` where it had a transparent one, and the
selected tab deepens `borderStrong` to `textFaint` — **toward the text in
whichever direction the theme requires**, darker in light and brighter in dark.
One idea, both states, and **the selected tab gets feedback too**, which matters
because pressing it is a no-op: a dead control beside three live ones reads as
broken rather than as current. The words brighten to `textStrong` with it and
the count follows on `group-hover`.

**It goes through custom properties**, `--tab-line` / `--tab-ink` / `--tab-meta`
and two hover twins, because the rest colours come off the `theme` object at
runtime and **an inline `border-color` beats any `hover:` class** — which is
exactly how the sort trigger once shipped with no hover at all.
`HouseholdTile`'s `--tile` trio is the same trick. The arbitrary values need the
`[color:var(…)]` type hint: a bare `text-[var(--x)]` is ambiguous between size
and colour and compiles to nothing. All six rules were confirmed emitted, with
the three hover rules landing after the bases they override — checked by line
number, not assumed.

#### The observer never attached — 2026-08-29

**The bug under all of it, and it is older than any of this.** `Pantry` returns
a loading screen while `api.status` is not `ready`, so `<main>` does not exist on
the component's first render — and the column's `ResizeObserver` lived in a
`useEffect(…, [])` that read `columnRef.current`, found `null`, and returned.
**It never attached, on any load.** `compact` was therefore permanently `true`
and **every control on row 2 has been wearing its 390 form on a 1440 desktop**:
the status pills' short words, the sort trigger's, `Showing X of Y` hidden
outright, and the run trigger as a bare glyph — which is why the trigger looked
like "the shopping cart icon" on a desktop at all.

**The fix is a callback ref**, so the effect depends on the element rather than
on a theory about when it exists — and it is **the fix already written a few
hundred lines below for `sentinel`**, whose comment calls it "the general fix:
there is no longer a render path that can mount the sentinel without waking the
observer." The same mistake was left in place one screen up.

**The rule: an `[]` effect is only safe against a ref whose element is mounted
on the component's first render.** `Pantry` has four early returns above
`<main>`. A sweep found no third instance — the only other `[]` effects reading a
ref are `DisplayNameCard`'s and `FirstRun`'s autofocus, and both fields are
unconditional in components that do not return early.

**This is the second time a browserless verification chain has certified a
control that could not run.** Typecheck, assertions, an artifact read and a
class-literal diff all pass on a component whose observer is inert; nothing
short of a resize in a real browser can see it. It joins the D42 round in
*Compiling, curling and reading the artifact prove a build is coherent, not that
it is usable.*

**And the item card's chevron got a hover state it only appeared to have.** It
carried `text-ink-faint group-hover:text-ink-muted` — the rule fires, and it is
`#9B8B75` to `#6F6049` on 17px of 1.5px stroke, from a header the width of the
card. So the one element that responded was the one nobody was pointing at, and
it read as a card with no hover at all. `CARD_CHEVRON` gives the glyph a 26px
round well filling to `surface-alt`, **the card's own ghost step** — the move
`CARD_ACTION_GHOST` makes a few pixels below it, and the opposite of what a
control on the page ground does (D45). The whole row is still the button and
the focus ring still wraps it; the well is only where the affordance is
*drawn*.

**It paints 25px and occupies 17, and that is load-bearing.** The first cut was
26px in flow, which grew the header's cluster from the glyph's 17px to 26 and
**pushed the ordinary card past its `min-h-[188px]` floor** — at which point
every card is its own content height again and a row stops lining up, which is
exactly how it was reported. Collapsed cards are equalised by that floor rather
than by `align-items: stretch`, because a grid row is sized by its tallest
item's content and stretch would let an open card drag its whole row down; a
floor only equalises what fits under it. `-my-1` and `-mr-1` give back exactly
the 8px the circle added on each axis, so the glyph's centre, the status badge
and the card's height are all where they were, and the circle bleeds into the
card's own padding. **Do not resize it without re-deriving the floor.**

**Verified without a browser**: typecheck clean, 445 assertions, the dry-run
artifact unchanged (ten tables, five queries, nineteen mutations,
`db.migrations` empty), every class literal in the three touched files diffed
against the freshly built `.spacefast/zero/public/zero.css` by unescaping the
sheet's own selectors — printed, never hand-written — with `md:mr-0` confirmed
by byte offset to land after the base `-mr-[18px]`, and the built `/client.js`
carrying `shopping-basket` beside `shopping-cart`.

**Nobody has clicked it**, and this one is entirely widths, heights and glyphs:
it wants a real 390 phone, a docked drawer at 1280, and a household with all
three bands. `?demo` still cannot produce a band — the seeded sources are all
shops.

### The item side (Phase 4.15c, D58) — 2026-08-29

**The eighth additive schema change since Phase 2**: `items.seasonFrom` and
`items.seasonTo`, both `''`. Ten tables, five queries, nineteen mutations. That
is the *whole* schema cost of the item side, because **the ingredients are not
here and never will be** (D59).

- **`shared/season.ts`** owns every rule. **Months, not dates** — a season
  repeats and a date does not, so there is no year, no locale and no format.
  **A pair that is never half-set**, and `normalizeSeason` **discards a half
  rather than completing it**: completing means guessing a value nobody typed,
  which D48 settled once for names. A patch naming one month reads the other off
  the row, exactly as the size pair does.
- **The range wraps, and it is the case worth a test.** November to February is
  a real season; read literally as `11 <= m <= 2` it is empty, which would move
  an item to `NOT YET` in every month of the year including the ones it is ready
  in.
- **An unset season is always in season**, which is what makes it safe to ask
  about every item.
- **`NOT YET`** is a sub-group at the foot of a harvest card. Its rows keep the
  56px height and lose exactly two things — the checkbox (nothing to pick) and
  the status badge (the slot says *Ready in September*). **Not focusable and not
  in the tab order.**
- **An out-of-season row does not count** — not toward its band, not toward the
  trigger — **but the item is unchanged**: still *out* on its card, still in the
  three status pills. That is the one place those two numbers deliberately
  disagree, and `runIds` reading off the bands rather than filtering in parallel
  is what stops them drifting.
- **Only the harvest card is affected.** Something you buy at Publix *and* pick
  in July is still on the Buy card in February, counted once by the band it is
  really on.
- **The season panel is the inline composer**, from `panelSkin` rather than the
  boards' two hexes — it sits a few pixels from where a `+ Source` opens one, so
  literals would mean a panel that stopped matching its neighbour on the first
  re-theme. **`MonthMenu` is `UnitMenu` with twelve rows** and no *no month* row.
- **The make panel is the season panel's twin, and promises nothing** (amended
  2026-08-29). It sits in the **same place** — below the source chips, before
  Type, so an item naming both a garden and a kitchen gets both panels in the
  run list's own band order — and wears the **same `panelSkin` surface**, radius,
  padding and micro-label. It was a `surfaceAlt` card below Type reading
  *Recipes are coming*; that is a roadmap on a form, dating the sheet against a
  feature D59 does not commit to and apologising for a panel already doing its
  whole job. The label states the fact — **`MADE, NOT BOUGHT`** rather than the
  boards' `MADE BY`, which heads a list of ingredients that will never be there
  — and the copy says only what the kind changed: running low puts the item on
  the **Make** band rather than on a shopping card. **A statement**, not an empty
  state and not a disabled control — no icon, no amber, nothing to press. Make
  items only. **Two departures from the spec's *Made by — what ships*** and both
  deliberate.
- **Deselecting a grow source does not clear the season.** The panel goes and
  the months stay, so putting the source back brings them with it. Discarding
  what somebody typed because they touched another control is a silent write,
  and the value is inert — `runBands` reads it in the harvest band and nowhere
  else.

**The item card now wears every kind it has**, one glyph per distinct kind in
band order, amending this feature's own first pass (which drew one and broke a
tie toward grow). **An item naming no source still draws nothing** — D58's table
splits an empty source three ways and the first is *not set yet*, a gap.

**The off-list marker stopped being a struck cart**, for two reasons that
arrived together: a cart is now the *shop* kind's glyph, and a cart beside a
struck cart in one cluster is the worst pair of marks on the screen — and the
strike was claiming the wrong thing anyway, since `needsBuying` gates every band.
`ListX` says *off the list* and collides with nothing.

**Verified without a browser**: typecheck clean, **419 assertions** (49 new,
covering the wrap-around both ways, the half-set discard, a one-month season,
and every `NOT YET` case including the bought-and-grown row that stays on Buy),
the artifact shows both columns with `default: ""` and `db.migrations` empty,
every class literal in the four touched files diffed against the live
`/zero.css` by unescaping the sheet's own selectors, and the **real handlers**
driven over `POST /__spacefast/zero/run`: a whole pair stored, a start with no
end and an end with no start both stored as neither, a bogus month stored as
neither, a patch naming one half reading the other off the row (both ways),
`11`–`2` surviving storage, and clearing one half clearing the pair.

**Nobody has clicked it.** The season panel needs a grow source selected on the
sheet and the make panel needs a make one, so both are behind the same setup the
bands are.

**That completes `garden-and-kitchen.md`'s v1.** Everything left in that
document — recipes, the ingredient panel, quantities, units, the picker, the
*See recipe* link and both models on board 6 — is a **marked mockup** governed by
[D59](../.docs/decisions.md#d59-processes-depend-on-the-pantry-the-pantry-depends-on-nothing).

### The off-list checkbox is retired (D60) — 2026-08-29

**Client only, and there is no migration.**
[D60](../.docs/decisions.md#d60-the-off-list-checkbox-is-retired-and-the-column-is-kept)
amends D53: a source's kind answers the question the checkbox was invented for,
and answers it better. **You grow it, you make it, or you buy it** — the first
two go to their own bands without anybody ticking anything.

**The checkbox says it worse than the kind does**, which is the argument rather
than mere duplication: it hides an item from the list *without saying where it
went*, while a grow source puts it on a Harvest card while it does so.

- **`items.offShoppingList` stays.** Dropping a column needs
  `sf db migrate --drop`; filling one again is additive — the same trade D34
  made for `icon`, which is still there holding `''`. **Do not "clean up"
  either.**
- **`needsBuying` still reads it**, so a row ticked before today behaves exactly
  as it did. Nothing about existing data moves.
- **The control is a way out, not a way in.** The sheet draws it **only on an
  item that already carries the flag**; pressing it clears the flag and unmounts
  the row. So it can be cleared and never set, and the flag drains out of the
  database as people meet it rather than being migrated out from under them.
  **Absent where it would create a new one, present where it is the only way out
  of an old one** — D30's rule doing a job it was not written for. Removing it
  outright would strand every ticked row off every band with no way back.
- **The card's `ListX` marker is a legacy marker now** and draws only for those
  rows. It goes on its own when the last one is cleared.
- **Putting it back is deleting one condition.** The column, both mutations'
  normalisation, the `ItemDraft` field, the undo path and `needsBuying` are all
  untouched — only the sheet's `value.offShoppingList &&` guard stands between
  today and the control returning.
- **`?demo` still seeds three flagged rows, on purpose.** Nothing in the UI can
  set the flag any more, so they are the only way to reach the legacy state
  locally: the marker, the clear-only checkbox, and the two-item gap between the
  status pills and the run list's total that made D53's split countable.

**[D59](../.docs/decisions.md#d59-processes-depend-on-the-pantry-the-pantry-depends-on-nothing)
is the rule to not violate**: processes depend on the pantry, and the pantry
depends on nothing. A recipe references items; a planting references items;
neither is referenced back, so **a pantry item gains no recipe-shaped field at
all**. Everything about recipes, ingredients, quantities and unit arithmetic in
that design doc is a **marked mockup** and is not being built.

### First run asks where your food comes from (D61) — 2026-08-29

`.claude/docs/design/garden-and-kitchen.md`, *First run asks where your food
comes from*, drawn on **board 1** of the boards file. **No schema change** —
`stores.kind` shipped with D58 and this writes it at seed time. Ten tables, five
queries, **nineteen mutations**; `createHousehold` gained an optional third
argument and `db.migrations` is still empty.

**Three checkboxes under the name field, on both creation surfaces.** Buy ticked,
grow and make off. Buy seeds Grocery · Warehouse · Market as `shop`; grow seeds
**Garden** (fern, `color-11`); make seeds **Kitchen** (mulberry, `color-5`).

- **`SourceMixRows.tsx` is the whole component**, and it is on **both**
  `FirstRun` and `NewHouseholdDialog` — the design doc draws only the first-run
  card. The second household somebody makes is as likely to be the one with the
  garden, and asking on only one surface leaves the other seeding three shops
  and pointing back at a kind menu two levels into a drawer.
- **It looks like it breaks *one field, one button, nothing else* and does
  not.** That rule was written against a **preview** — fifteen seeded chips in a
  recessed panel, explaining what a household is. This is a **question**, and
  the answer changes what gets *written*. The test it passes: **Enter still
  finishes the screen**, because the defaults are the household that existed
  before the question did.
- **It is not the prefill D48 forbids.** D48 is about a *name* — a name nobody
  typed is not an answer and a filled field submits as though it were. A tick is
  a closed question whose commonest answer is knowably yes, legible without
  reading a field, with a hint under it saying what it will do.
- **Nothing is required and nothing is disabled**, which is a **deliberate
  departure from the brief that asked for it** — *maybe require at least one
  checkbox* was raised and dropped in favour of the spec, which argues the
  seed-nothing path is worth having. Untick all three and you get the locations
  and types and no sources. **That is not a dead end the way no locations would
  be**: `itemStores` is a join table so an item can name none, while
  `locationId` is required and D16 refuses to delete the last one. Sources are
  the one taxonomy that can start empty — and this is the cleanest version of
  the *seed no stores* argument open since D40.
- **An absent mix and an empty one are different answers**, and that is the
  load-bearing line. `toSourceMix(undefined)` is the buy-only default — every
  caller that predates the question. `{}` and an explicit all-false are somebody
  unticking all three. Collapse them and you either force shops on a household
  that refused them or drop the seed for every caller that omitted the argument.
  Each field is compared against `true` rather than coerced, so `{buy:'yes'}` is
  **not** a tick.
- **No definite article** — *Garden*, not *The Garden*, which is a change from
  how D58 and the design doc write them in prose. Every other seeded term is a
  bare noun, and a chip reading *The Garden* beside one reading *Market* is one
  term written as a phrase and the rest as labels. It also keeps
  `householdLetter()`'s article rule off terms, where it was never meant to go.
- **`SEED_STORES` is `SEED_SHOPS`**, and the seeded shops now carry
  `kind: 'shop'` explicitly rather than leaning on `toSourceKind`'s `''`
  fallback. Nothing behaves differently.
- **`CARD_CHECKBOX_ROW` is `PAGE_CHECKBOX_ROW` with one token moved** — the ring
  offsets against `surface` rather than `canvas`, because both creation cards
  are `surface` while the item sheet's ground is a near-`canvas` gradient. The
  hover is unchanged and still right: `surface-alt` is a real step from
  `surface` in both themes (D45).
- **The glyph beside each label is the run list's own**, so this is the
  **fourth** place the sprout and the pot are taught before an item card draws
  one. The label carries the weight of its own answer — 600 on `textStrong`
  ticked, 500 on `text` not — so the block reads at a glance rather than by
  inspecting three 22px boxes.
- **The hint has four states, not the doc's three**: it also answers *nothing
  ticked*, which the design's table treats as an aside and which is a real
  answer here.
- **This retires a settled D58 line.** *The seeded stores are all shops, so a
  new household is a `STORE` household on day one* — that is now an answer
  rather than a property of the seed, and a household that ticks grow reads
  `SOURCE` before it holds a single item.
- **A second step was drawn and lost** — `NEW HOUSEHOLD · STEP 2 OF 2`, *How do
  you stock it?* It reads better and turns *one screen, not a wizard* into a
  wizard, then grows a *Back* and a step count.

**This reaches new households only**, as D50's types do — nothing backfills, and
the published household keeps the three shops it has.

**Verified without a browser**: typecheck clean, **445 assertions** (26 new,
covering the absent-versus-empty pair, truthiness not being a tick, the band
order, the article rule, and the group word flipping on the seed), the artifact
shows ten tables, nineteen mutations, `db.migrations` empty and `/api/status` as
the only endpoint, and **all 70 class literals** in the three touched components
plus the new control style were diffed against a live `/zero.css` by unescaping
the sheet's own selectors — printed, never hand-written. The **real handler** was
driven over `POST /__spacefast/zero/run` on a throwaway `sf dev --port 4199`
across all eight branches: buy-only, all three, grow-only, make-only, none,
**the argument omitted** (three shops — backward compatible), a bogus non-object
payload (three shops), and `{buy:'yes',grow:1,make:{}}` (none). Locations (3) and
types (14) are untouched in every branch, and the group word reads `Source` for
the grow household and `Store` for the other two.

**Nobody has clicked it.** The three rows and the moving hint are the only new
surface, and `?signedout` does not reach first run — a fresh `sf dev` with no
household does, and the dialog is one press from the drawer's switcher.

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

**And as of 2026-08-28 the app finally offers to be installed** — one row in
Settings › Preferences, D54. See *The app now says it is installable* above.

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

### Publishing works plainly again, and v14 is live — 2026-08-29

**Phases 3 through 4.9 are published.** `sf publish` completed for the first
time since v2: **v4**, `ver_d80a395f07144ce6863ba75b212a1486`, 71 files, 18
seconds. The platform's `finalize` / `runtime_api_not_found` failure — which
killed v3 on 2026-08-25 and wedged three spaces on 2026-08-24 — **is fixed on
their side**. Nothing here changed to cause that.

Verified again on **v14**, and this is the standing checklist: `GET /` 200,
`/api/status` → `ok`, `/client.js` (378 KB) and `/zero.css` (77 KB) serve,
`/site.webmanifest` serves as `application/manifest+json` with all seven
`/icons/*`, **D29 holds** (`/.claude/CLAUDE.md`, `/.docs/decisions.md`,
`/.env.server`, `/.spacefast/state.json` all 403), `theme.json` and `sf.jsonc`
404 while `LICENSE.md` and `package-lock.json` serve, every class literal in
`client/` is in the **live** `/zero.css`, and all three new columns migrated
additively with no flag — as D44's nine columns, `households.ink`, the
`profiles` table and v12's four did before them.

**Cheaper than curling the live space for the bytes: hash the payload against
it.** `.spacefast/zero/public/` holds the *real* `zero.css` and `client.js` that
ship, so a class check can read that file rather than bootstrapping `sf dev` —
and after the publish, `shasum` on both sides proves the live space is serving
exactly what was built. All three of `client.js`, `zero.css` and
`site.webmanifest` matched byte for byte on v13.

**The maskable icon is `icon-maskable-512.png`.** A check that curls
`/icons/maskable-512.png` gets a 404 that looks like a missing asset and is
only a wrong filename. All seven icons serve; list
`.spacefast/zero/public/icons/` rather than typing the names from memory.

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
v11 check and cost a round trip on v12 as well. Print the `plan` keys rather
than assuming them. `invitePreview` answers an unauthenticated caller
over `POST /__spacefast/zero/run`, which **exists in production too**, not just
under `sf dev`.

**The `x-spacefast-rationale` blockade is over, as of 2026-08-29.** A plain
`npx sf publish` now works, first try. **v13 went out with no shim, no
`NODE_OPTIONS` and no out-of-band header**, ending a four-day workaround that
every publish from v4 to v12 depended on.

**It was not fixed the way this file predicted.** The prediction was that npm
would ship a CLI with `--rationale` or `SPACEFAST_RATIONALE`. **Neither
exists**, and both were checked against the new release *before* publishing:
`spacefast@0.2.2` still has no `SPACEFAST_RATIONALE` among its env vars, its
whole `x-spacefast-*` vocabulary is `client`, `client-capabilities`, `country`,
`idempotency-principal`, `language`, `runtime`, `version` — **`rationale` is
still not a header this CLI can send** — and `sf publish --help` lists no flag
for one. So **the platform stopped asking**; the requirement was dropped or is
now satisfied server-side. Do not read this as "the CLI caught up".

**The CLI is on `spacefast@0.2.2` now**, up from 0.0.26, and `@spacefast/zero`
moved with it. That jump is what to re-do if this ever regresses — and it was
safe for a reason worth repeating: **the compiled capsule was diffed across both
compilers before publishing** (tables, every column with its type and default,
indexes, queries, mutations, endpoints, migrations, runtime) and came back
**byte-identical**. The only payload difference was the content-hash directory
holding the platform modules. **Diff the artifact across a toolchain change
before trusting it**; it costs one dry run.

**The shim is retired, and this is what it was**, kept only so it can be rebuilt
if the requirement returns: a `fetch` wrapper loaded with `NODE_OPTIONS=--import`
that added a **truthful** rationale to `*.spacefast.com` requests. Two things
the rewrite had to get right, both learned on v11. Match the host with
`/(^|\.)spacefast\.com$/` and not a bare `includes('spacefast.com')`, or a
lookalike domain would be handed the rationale too. And seed a `Headers` from
the incoming `Request`'s own headers before setting anything, because passing
`init.headers` to `fetch` **replaces** rather than merges — get that wrong and
the CLI's `authorization` is silently dropped, which presents as an auth failure
rather than a shim bug. Spec-faithfulness matters in one place: when
`init.headers` *is* present it must win outright, because that is what `fetch`
itself does. Test against a stubbed transport before pointing it at a real
publish.

**If it ever comes back, the rationale must be true.** It exists so an
agent-driven mutation is attributable. Do not misrepresent the caller to dodge
it — `SPACEFAST_CLIENT` feeds `x-spacefast-client` and would do exactly that.
Supplying the metadata is compliance; hiding it is not.

**Two things the new CLI does that the old one did not.** Uploads are
**incremental** — v13 reported `Files 125` and `Uploading files 34 files`, so
those two numbers disagreeing is normal and not a truncated payload. And the
version record carries **git provenance nothing was asked for**: the commit URL,
branch and repository, with the commit message used as the changelog when `-m`
is omitted. Pass `-m` to say what the version actually carries, since one commit
message rarely describes a whole publish.

**`--dry-run` still is not sufficient, in a new way.** The real publish printed
`Warning: ignored 2 unsupported file(s) on this plan:
.claude/docs/pantry-tracker-mockup.jsx, .idea/x3p0-larder-log.iml` — *after*
creating the version, and the dry run said nothing about it. Neither file
matters here, but the rule is unstated and the warning arrives too late to act
on. This is the second documented case of a dry run being necessary and not
sufficient, after staged-but-404ing `theme.json`.

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

The whole runtime reference is one file:
**`https://spacefast.com/docs/zero-runtime.md`** (~22 KB of plain Markdown —
schema API, auth, storage, styling, limits, and a complete example app).

**It was `/docs/zero.md` and that path now 404s** (checked 2026-08-29) — the
page moved and nothing redirects. Worse, the 404 body is 25 KB of HTML, so a
script that does not check the status code gets a page of `<script>` tags where
it expected Markdown. The HTML page at `/docs/zero` still works, which is why a
browser sees nothing wrong. **`https://spacefast.com/docs/llms.txt` is the index
that names the current URL of every page** — check it there before assuming a
docs page is gone.

A plain `curl` works — **the 403 to programmatic fetches was fixed on
2026-08-25**, so the browser User-Agent this file used to insist on is no longer
needed:

```bash
curl -sL https://spacefast.com/docs/zero-runtime.md
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
| `.docs/decisions.md` | D1–D61, with reasoning and rejected alternatives. **D27 governs every schema edit**; **D32 governs term colors**; **D35 and D44 govern row timestamps**; **D36 governs destructive actions**; **D41 governs the shopping list**; **D42 governs the household colour**; **D43 governs invite codes**; **D45 governs the applied filter bar**; **D46 governs the account's display name**, amended by **D48, which forbids prefilling either name**; **D47 governs the sign-in copy**; **D49 governs the Settings pane, the Members pane and both drawer menus**; **D50 governs the seeded types**; **D51 governs what the view restores on load**; **D52 governs an item's size**; **D53 governs keeping an item off the shopping list, retired by D60**; **D54 governs the offer to install**; **D55 governs a member's avatar**; **D56 governs the account row and its outbound link**; **D57 governs the beta badge, and narrows the spec that describes it**; **D58 governs a source's kind, the group's own name, the run list's bands, an item's season and the item card's glyphs, and amends D36's editing row and D53's checkbox**; **D59 governs which way a reference may point once recipes and plantings exist, and is why no ingredient panel is being built on an item**; **D60 retires D53's off-list checkbox while keeping its column and its behaviour**; **D61 governs what first run asks and what each answer seeds, and retires D58's line that a new household is a `STORE` household on day one** |
| `.docs/notes.md` | Open platform questions, and what the v2 publish and Phase 3 answered |
| `.claude/docs/design/ui-directions.md` | **The current design spec** (Aug 2026, "Cellar") — palette, type, structure |
| `.claude/docs/design/larderlogdesigns-4.html` | The rendered final mockup that spec describes |
| `.claude/docs/design/larderlogshoppinglistboards-2.html` | **The 16 boards for the shopping list** — eight screens, light and dark. Supersedes the `-1` file, which drew a top bar the app does not have |
| `.claude/docs/design/larderloghouseholdcolourboards.html` | **The 8 boards for the household colour** — four screens, light and dark |
| `.claude/docs/design/appliedfilterbar.html` | **The applied filter bar** — a live page rather than boards: desktop, 390, and the state strip, in both themes |
| `.claude/docs/design/add-edit-item.md` | **The add / edit item redesign** (28 Aug) — the sheet's four sections, the size, the two steppers, and the off-list checkbox. A section of the design spec kept as its own doc, because `ui-directions.md` has no patch operation |
| `.claude/docs/design/larderlogaddedititem.html` | **The 9 boards for that redesign** — the sheet in both themes, the size row and its unit menu, the two steppers, where the size shows, 390, and keeping an item off the list |
| `.claude/docs/design/install-as-an-app.md` | **Install as an app** (28 Aug) — the one Settings row that offers it, the banner that was cut and why, and two contrast findings that leave the row. Its own doc for the reason `add-edit-item.md` is |
| `.claude/docs/design/larderloginstallmockup.html` | **The 5 boards for it** — desktop 1440, the row's states with the panel-edge finding drawn both ways, Preferences in three states × both themes, 390, and the appears-where matrix |
| `.claude/docs/design/garden-and-kitchen.md` | **Garden and Kitchen** (rev. 29 Aug) — a source carries a kind, the shopping list becomes a run list of three bands with a segment over it, and an item gains a season. Its own doc for the reason `add-edit-item.md` is; it **replaces *Shopping list* wholesale**. **Read its *what is in v1 and what is a mockup* callout first**: everything about recipes, ingredients, quantities and units is a marked mockup (D59). **Its lede is stale** — it still promises an item gains "ingredients with quantities", which the callout eight lines below and the *Ingredients — on the recipe, never on the item* section both contradict. **Built: all of v1** — D58 (the kind, the rename, the menu, the card glyph), the run list, the item side, and **D61**, its *First run asks where your food comes from* section |
| `.claude/docs/design/larderloggardenkitchenboards.html` | **The 9 boards for it** — **board 1 is first run** (the card, the hint in four states, the rejected second step, and the three seeded drawers with `STORE` becoming `SOURCE`); its card still draws the pre-D48 prefilled name and hint, which the build does not have. Then — the run list at 1440, entry and the three card types, ingredients (**mockup**), setting the kind with the STORE/SOURCE naming rule, the item side, where this goes (**mockup**), and the two structures that lost. Light theme only. **Board 2 draws both spellings of the trigger**; *To get* is the one chosen. **Board 1 draws the Make rows at 76px with a batch line, which is the mockup** — in v1 they are 56px like every other row |
| `.claude/docs/design/beta-badge.md` | **The beta badge** (28 Aug) — the pill, its one construction, and the surfaces it skips. Its own doc for the reason `add-edit-item.md` is. **Its central rule — *the wordmark never appears without it* — was built and rejected; D57 narrows the badge to the marketing page**, so its *Where it appears* table describes a build that does not exist |
| `.claude/docs/design/larderlogbetabadgeboards.html` | **The 5 boards for it** — anatomy and the four surface pairings, the drawer header, 390 with six filters applied, what lost, and the marketing nav and footer in both themes. **Its marketing nav still draws the pre-D47 *Sign in with Gravatar* button** |
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
npm run dev          # the Zero app — `sf dev --state-backend sqlite` on :4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm test             # unit tests over shared/ — compiles with tsc, runs on node
```

`sf` is a pinned devDependency, **not** a global install — use the npm scripts
or `npx sf …`. Do not run the `curl … install.sh | bash` installer; the CLI
ships on npm as the `spacefast` package and the pinned version is deliberate.
**It is `spacefast@0.2.2`, pinned exactly** (no `^`), together with
`@spacefast/zero@0.2.2` — upgraded from 0.0.26 on 2026-08-29, immediately
before the v13 publish. The two must move together: the CLI bundles
`@spacefast/zero-compile` at its own version, and that is what compiles the
capsule.

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

**`npm run dev` passes `--state-backend sqlite`**, so the dev database now
persists across restarts in `.spacefast/zero/dev-state.sqlite` (gitignored).
The CLI's own default is `memory`, which resets every run — drop the flag for a
clean slate, or delete that file.

## Verifying work

Cheapest first:

- **`npm test`** — 445 assertions over `shared/`, compiled with the project's
  `tsc` and run on plain Node. No runner, no dependencies. It covers the things
  that are invisible when wrong: the D20 capability matrix, D18's
  one-household rule, D22's last-owner guard, invite expiry boundaries, D28's
  invite-link parsing, the dev-guest bypass in `shared/identity.ts`, D44's
  stamp guards and A–Z term ordering, D45's *OR inside a group, AND across
  groups*, D46's display-name fallback chain, D52's size pair together with
  D53's split between `needsBuying` and `statusKeyFor`, and D55's `https:`-only
  avatar rule, D58's source-kind fallbacks, the group-word rule and the item card's
  one-glyph resolver, D61's source mix — including the absent-versus-empty pair
  and what each answer seeds — and
  `?demo`'s fixture distribution and term resolution. **Add to it** when you touch any of those — that file is the app's
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

  **The schema is at `server.schema`, keyed by table name — not `db.tables`,
  not `server.schema.tables`.** `db` holds only `{ backend, migrations }`. Both
  wrong reads return `undefined` rather than erroring, and the first prints an
  empty table list, which looks exactly like the catastrophe the check exists to
  catch. This has now cost two sessions:

  **`queries` and `mutations` are arrays of plain strings**, not objects — a
  `.map(q => q.name)` over them prints a row of blanks that looks exactly like
  an empty capsule. A table's fields are `columns`, not `fields`, so a lookup
  through the wrong key reports every column as absent. Both cost a round trip
  on the v13 check.

  ```js
  const a = JSON.parse(readFileSync('.spacefast/zero/artifact.json', 'utf8'));
  Object.keys(a.server.schema)   // table names
  a.server.schema.items.columns  // [{ name, type, nullable, default }] — NOT .fields
  a.server.mutations             // array of plain STRINGS — NOT objects with .name
  a.server.queries               // likewise, plain strings
  a.server.endpoints             // [{ method, path }] — check nothing throwaway survived
  a.db.migrations                // [] when nothing additive is pending
  ```
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
- **`?demo` fills an empty household with sixty items** —
  `http://127.0.0.1:4173/?demo` — so everything that is only wrong *at scale*
  can be looked at: the filters, the three sorts, the shopping list's grouping
  and its store cards, `Showing X of Y`, search, and the grid's wrapping. The
  rows are **real**, written through `addItem` one at a time, which is the whole
  point — a client-side fake would mean the thing under test is not the thing
  that runs. So there is no `isDemoItem` guard and none is wanted: a demo row is
  an ordinary item the moment it lands. Loopback-only, one page load, and it
  **refuses a household that already holds items**, so it cannot run twice or
  bury a real pantry. The fixture and the resolver are `shared/demoItems.ts`
  (in `shared/` so `npm test` reaches it); the gate and the write loop are
  `client/lib/devItems.ts`. Take it out with D14 alongside the other three.
  **`npm run dev` passes `--state-backend sqlite`**, so the sixty rows — and
  your household and display name — survive a restart; without it every restart
  is a fresh empty database and a first-run screen.
  **The fixture's distribution is the point, not its size**, and `npm test`
  asserts it: 8 out / 13 low / 39 stocked, all fourteen seeded types used, eight
  items in two stores, four in none, one of those storeless *and* on the list
  (the only way D41's storeless group renders), two off-list rows that are low
  (so the pills read exactly two above the list's row count — D53 made
  countable), and `addedAt` spread over 59 days so *Recently added* sorts by
  something. **Do not "tidy" those numbers** — each one is a screen that is
  otherwise unreachable locally.
  **Never write the bare identifier `location` in `shared/`**: the capsule
  compiler text-matches it as a browser global in anything `server/` might
  import, and the same word is legal in `client/lib/`. That is why the fixture
  says `locationName`. It cost a dev-server start; see `.claude/docs/spacefast.md`.
- **`?members` puts two stand-ins in the Members panel** —
  `http://127.0.0.1:4173/?members` — so the role chips, the remove button and
  the last-owner guard can be *looked at* locally. Loopback-only, one page load,
  ignored elsewhere, and the rows never leave the client: `isDevMember` answers
  `changeRole` and `removeMember` before either reaches the network. See
  `client/lib/devMembers.ts`, and take it out with D14 alongside `?signedout`.
  It is a way to see the panel, **not** a way to test the handlers — those still
  need two real people on the published space.
- **The dev guest borrows a real Gravatar**, so the avatar's `<img>` branch is
  reachable locally at all. `sf dev`'s identity carries no `email` and no
  `picture`, so every local look at the drawer's foot row, the collapsed rail,
  the account menu and the first-run card was the initial-on-a-fill fallback.
  `client/lib/devIdentity.ts` hands the dev guest `justintadlock@gmail.com` and
  builds **the platform's own URL shape** — `?d=404&r=g&s=160` over
  `sha256Hex` of the trimmed, lowercased address, byte-identical to what
  `@spacefast/common` emits. `?gravatar=<address>` previews a different one and
  `?gravatar=none` previews the initial fallback, which is the branch a real
  account with no Gravatar gets. The display name stays *Local dev guest*.
  Loopback-only; take it out with D14 alongside the other two.
- **Everyone has a face now (D55), and `?members` is the only way to see a
  mixed row.** One stand-in carries a picture and one does not, because a real
  household is two faces and a letter — an account with no Gravatar falls back.
  The mixed row was looked at on 2026-08-28 and is fine.
- **`auth.email` is empty in production and always will be (D56).** It is the
  identity token's `email` claim and a Spacefast account carries none — the SDK
  prefers `pairwise_sub` and derives the Gravatar profile from the avatar hash
  rather than the address. The docs list `email` among what `useAuth()` returns
  and never say it can be absent. **A dev switch may reveal what production
  hides and must never invent what production lacks** — which is why the dev
  guest hashes an address for its avatar and still reports no email.
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
