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

**Phase 3 is built. Phase 4 is largely built too. Neither can be published
right now — see the blocker below.** A real Spacefast Zero project: `sf.jsonc`,
`theme.json`, a Preact + TypeScript client in `client/`, pure domain logic in
`shared/`, and a capsule in `server/` holding the full schema from
`.docs/data-model.md`, four live queries, and sixteen mutations. The schema is
declared inline in `server/index.ts` and **has to be** — see
[D27](../.docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry)
before editing it.

Data lives in the database. **Three** `localStorage` call sites remain, all
correct: the per-device theme override (D25), which household this device is
pointed at (D33), and the shopping trip's ticks (D41). Same reasoning for the
first two — a dark-mode choice on a phone should not follow you to a desktop,
and neither should which pantry you were last looking at; the third is a record
of what is in *this* person's cart right now.

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
**None of Phase 3 has been exercised by a second person** — that needs the
published space. The same is now true of D33: one identity in two households is
verified server-side, but two *people* sharing one household is not.

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

**Nothing here has been seen by a second person, or published** — see the
blocker below. Two `font-mono` sites remain: the switcher's invite-code field,
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
- ***Recently added* sorts on `createdAt`** (D35). It previously applied no sort
  at all, so it rendered oldest-first — the opposite of its label.

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
- **The row is not a click target.** The left column checks; the name and the
  counts open the Edit sheet. Below `md` it stacks — the spec leaves the exact
  breakpoint open and `md` is a choice made here.
- **`ShoppingListTrigger.tsx`** sits **immediately after the three status
  pills** and is **secondary** — `surface` on `line strong`, ink label, ink
  count pill. Placement does the work colour would have: the eye crosses
  `9 in stock · 6 running low · 5 out` and lands on the thing to do about it.
  It was amber for one round, which put it a gap away from `6 running low` —
  already amber, and meaning something else. Hidden when nothing is low or out.
  **Its count is the household's, never the filtered one.** When space is short
  it drops its label for a cart glyph; *Back to items* keeps its words.
- **Row 2 sizes off the measured content column, not the viewport.** A
  `ResizeObserver` on `<main>` sets `compact` below `ROW2_FULL_PX` (910, derived
  from the parts), which is what the pills, the trigger and the sort all read.
  `md:` was wrong in the middle: a docked drawer costs 340px, so a 1280 screen
  leaves 872 and is as cramped as a phone. **Do not put these controls back on a
  breakpoint.**
- **Below `md` the trigger lives in the mobile header**, squared up with the
  wordmark opposite the menu button — it is chrome, and moving it there is what
  lets the status pills and the sort share one line at 390. The *exit* stays in
  row 2 with the list it exits. Row 2 drops `Showing X of Y` when compact.
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
  one fixed order). *Back to items* takes the left, `11 to buy · 4 stores · 3 in
  the cart` the right. **Row 1 never changes**, so the switch reads as the
  content changing rather than the app changing.
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
**The one schema change since Phase 2, and it is additive**: `households.ink`,
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

**`signInWithGravatar` is not exported publicly.** `@spacefast/zero/client`
resolves to `dist/public-client.d.ts`, which exports only `signInWithGoogle` —
the same function, Lakebed compatibility. `client/index.tsx` aliases it on
import. Do not "fix" the name back.

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

### Publishing is blocked, and it is not our bug

**Do not attempt a publish before re-reading this.** As of 2026-08-25, and
**re-checked on 2026-08-26 — nothing has changed**; npm's `latest` is still
`spacefast@0.0.26` (no `next`/`beta` tag, and `@spacefast/zero` tops out there
too), so there is nothing to update and a plain `npx sf publish` dies at
*Creating version* on the missing header, before it ever reaches `finalize`:

1. The API now rejects publishes from agent-attributed credentials unless they
   carry an `x-spacefast-rationale` header. **npm's `spacefast@0.0.26` cannot
   send it** — no flag, no env var.
2. The CLI that can is **0.0.27, released to the binary channel only**
   (`install.sh` / GitHub releases). npm is still on 0.0.26.
3. That standalone 0.0.27 binary **cannot compile a Zero capsule**: it resolves
   esbuild's native helper and `@spacefast/zero/client` relative to its own Bun
   virtual filesystem. `ESBUILD_BINARY_PATH` gets past the first, nothing gets
   past the second.
4. The one run that reached the platform (0.0.26 with the header injected)
   created a version, uploaded, then **failed at `finalize` with
   `runtime_api_not_found`** — the same stage that broke on 2026-08-24.

Net: **v2 is still live**, v3 is recorded `status=failed`, and the space is
healthy (`Status: active`). The way out is npm shipping 0.0.27, or Spacefast
fixing finalize. The full write-up, with exact errors and version ids, is in
[`.claude/docs/spacefast.md`](docs/spacefast.md) — Justin intends to send it.

**Phase 2 is live at <https://larderlog.view.fast/>** as v2 (space slug
`larderlog`, team `justin-team-2`), published 2026-08-24. The first real
migration ran with it: all nine tables exist and are empty. Verify a publish
with `GET /api/status` and `sf db dump --table <name>`; ignore `sf db`'s
"Pending operations" count, which shows the artifact's full plan rather than a
diff against live state.

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
   it should never appear on a hosted runtime. **This one is still NOT
   verified** — v2 shipped on 2026-08-24 and the check needs a real sign-in,
   which nobody has done yet. Until then, treat it as the weaker hole. If a
   published space ever issued `guest:local`, every anonymous visitor would
   share one household. **How to close it:** sign in on the published space,
   create the household, then `npx sf db dump --table memberships` and read the
   `userId`. A Gravatar identity clears it; `guest:local` is an emergency.

Don't widen either one, and take both out if Spacefast ships a local sign-in
stub.

**`sf dev` issues one fixed identity**, so a second local tab is the same user.
That is enough to watch a mutation propagate; it is not enough to test two
members of a household. Anything touching sign-in, invites, or roles has to be
checked against the published space.

See `.docs/roadmap.md` for the phases.

## Target platform: Spacefast Zero

The app will be published on [Spacefast Zero](https://spacefast.com/docs/zero):
a Preact client plus a typed server "capsule" holding the database schema and
handlers, with Gravatar sign-in and live queries built in. One `sf publish`
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
| `.docs/decisions.md` | D1–D42, with reasoning and rejected alternatives. **D27 governs every schema edit**; **D32 governs term colors**; **D35 governs row timestamps**; **D36 governs destructive actions**; **D41 governs the shopping list**; **D42 governs the household colour** |
| `.docs/notes.md` | Open platform questions, and what the v2 publish and Phase 3 answered |
| `.claude/docs/design/ui-directions.md` | **The current design spec** (Aug 2026, "Cellar") — palette, type, structure |
| `.claude/docs/design/larderlogdesigns-4.html` | The rendered final mockup that spec describes |
| `.claude/docs/design/larderlogshoppinglistboards-2.html` | **The 16 boards for the shopping list** — eight screens, light and dark. Supersedes the `-1` file, which drew a top bar the app does not have |
| `.claude/docs/design/larderloghouseholdcolourboards.html` | **The 8 boards for the household colour** — four screens, light and dark |
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

- **`npm test`** — 129 assertions over `shared/`, compiled with the project's
  `tsc` and run on plain Node. No runner, no dependencies. It covers the things
  that are invisible when wrong: the D20 capability matrix, D18's
  one-household rule, D22's last-owner guard, invite expiry boundaries, D28's
  invite-link parsing, and the dev-guest bypass in `shared/identity.ts`. **Add
  to it** when you touch any of those — that file is the app's only
  authorization test.
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
