# Roadmap

Ordered by dependency, not by appeal. Each milestone should leave the app in a
usable state.

## Phase 0 — UI prototype ✅

React 19 + Vite + Tailwind app in `src/`, built from
`.claude/docs/pantry-tracker-mockup.jsx`. Full UI with localStorage
persistence: filtering, sorting, inline edit, taxonomy management, shopping
list, undo, theme override.

**Purpose:** settle the interaction design before any of it is expensive to
change. Done — this is the reference the port works from.

## Phase 1 — Zero scaffold and sign-in gate ✅

- ✅ `spacefast` CLI pinned as a devDependency (`sf`), `sf.jsonc`, `theme.json`
- ✅ Component tree ported from `src/` to `client/` — Preact, `class`,
  `onInput`, TypeScript, with the domain types and pure helpers in `shared/`
- ✅ Sign-in gate: guests see only a sign-in screen; sign-out lives in Settings
- ✅ First-run seeding: a signed-in identity with nothing stored falls through
  to the sample taxonomies and items
- ✅ Data still in localStorage, namespaced per identity; **no schema yet**
  (`capsule({ schema: {} })` is legal and compiles)
- ✅ Loopback-only dev bypass, with a persistent "Dev guest · not signed in"
  badge whenever it is in effect
  ([D14](decisions.md#d14-a-loopback-only-bypass-in-the-sign-in-gate))
- ✅ Published to a real space and the gate exercised end to end

**Live:** <https://larderlog.view.fast/> — space slug `larderlog`, team
`justin-team-2`, published 2026-08-24.

**Verified.** `tsc --noEmit` clean across 27 files. On the published space:
`GET /` returns the app, and `GET /api/status` returns `ok`, which is what
proves the capsule's *server* half deployed rather than a pile of static files.
`client.js` (99 KB) and `zero.css` (40 KB) both serve, with every Tailwind class
compiled — arbitrary values and responsive variants included. A signed-in
visitor gets the pantry; a signed-out one gets the sign-in screen; signing out
returns to the gate. The D14 badge does not appear on a real hostname, so the
loopback bypass is confirmed inert in production.

**Known gaps, carried forward.** Nothing that needs a browser *interaction* has
been exercised beyond sign-in: the IntersectionObserver infinite scroll, drawer
animation, and dark mode are still unverified. Webfonts do not work at all —
see [notes](notes.md).

**Getting here cost a day to a platform bug.** Every publish failed at
`version_finalize` with an internal 406, and the failed operation never
reconciled to the version, which wedged three spaces. Reported to Spacefast and
fixed the same day; the whole sequence is in
[spacefast.md](../.claude/docs/spacefast.md), under the 2026-08-24 entries.

## Phase 2 — Real data layer ✅

- ✅ Full schema from [data-model.md](data-model.md), declared inline in
  `server/index.ts` — it cannot live in its own module
  ([D27](decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry))
- ✅ `requireMembership()` / `requireCapability()` in `server/auth.ts` — every
  handler resolves the household server-side and asserts a capability
- ✅ `pantry` and `household` queries; item, taxonomy, invite, and membership
  mutations, all declaring `invalidate()`
- ✅ Server-side validation and clamping, reusing `shared/qty.ts` — plus
  `shared/term.ts` (names, ink), `shared/icons.ts` (D23, since removed —
  [D34](decisions.md#d34-term-icons-are-cut-and-the-column-is-kept)),
  `shared/invite.ts`
  (codes, expiry), `shared/roles.ts` (D20 capabilities)
- ✅ Platform spike: six unknowns answered, recorded in [notes](notes.md) and
  `.claude/docs/spacefast.md`
- ✅ `npm test` — 81 assertions over `shared/`, no runner needed
- ✅ Replaced `usePersistentState` with `useQuery` / `useMutation` via
  `client/hooks/usePantryData.ts` — the only remaining localStorage call site is
  the per-device theme override, which is correct there (D25)
- ✅ **Taxonomy references converted from names to ids throughout the client** —
  filters, chips, item forms, item cards, the taxonomy manager, and the shopping
  list all speak ids. A rename is now a single-row update
- ✅ Queries return a discriminated `QueryState` rather than throwing, because
  Zero never delivers a failed query to the client — see [notes](notes.md)
- ✅ First-run seeding moved server-side into `createHousehold`; a household with
  no locations cannot hold an item at all
- ✅ Retired the Vite prototype: `src/`, `index.html`, `vite.config.js`, `dist/`,
  the three `prototype*` scripts, and the `react` / `react-dom` /
  `lucide-react` / `tailwindcss` / `vite` dependencies. Zero compiles Tailwind
  itself, so nothing was left needing them

**Done when:** two browsers signed in as the same identity see each other's
edits live, and a reload loses nothing.

**Verified in a browser 2026-08-24.** First-run household creation, adding
items, the quantity steppers, creating terms from the `+` chip, renaming terms,
and D16's refusal to delete a location holding items all work against the real
capsule. Two things were found and fixed this way: `FacetSection` printed a raw
term id as its active-filter label, and the server rejected the `sf dev` guest
identity that D14's client-side bypass had just let through.

**Published as v2 on 2026-08-24**, and the schema is live. The publish applied
all 60 migration operations — 9 `create_table`, 36 `add_column`, 15 `add_index`
— with no flags and no prompt, and every table answers `sf db dump` on the live
space with `No rows`. `GET /api/status` returns `ok`; `/`, `/client.js`, and
`/zero.css` all serve. The space stayed publicly viewable through the publish.

**It nearly shipped broken.** The capsule compiler finds tables by regex over
the server *entry* and never follows an import, so the schema in
`server/schema.ts` compiled to an artifact with **zero tables and zero
migrations** while still reporting all 16 mutations — typechecking clean,
dry-running clean, and working perfectly under `sf dev`. Caught by reading
`.spacefast/zero/artifact.json` before publishing. The schema now lives inline
in `server/index.ts`; see
[D27](decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry) for
the rules that constraint imposes, and read it before touching the schema.

**Still unverified, and it needs a browser on the published space:** anything
touching real sign-in, and the two-browser live-query test. `sf dev` issues one
fixed identity (`guest:local`), so a second local tab is the same user — enough
to watch a mutation propagate, not enough to test two members of a household.
The first sign-in is also what settles the last open auth question: whether a
published space ever issues `guest:local`, which `shared/identity.ts` accepts.
Sign in, then check `sf db dump --table memberships` and read the `userId`.

**One thing the publish regressed, and Phase 3 fixed:** the project's own
documentation was served publicly — `/CLAUDE.md`, `/docs/*.md` and friends all
returned 200. `docs/` is now `.docs/` and `CLAUDE.md` is now
`.claude/CLAUDE.md`, both behind the serving layer's 403 on dot-prefixed paths
([D29](decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload)).

**This was the risky milestone.** Schema mistakes get expensive from here, since
destructive migrations need explicit flags.

## Phase 3 — Households, members, invites

**Built, not yet exercised by two people.** The server half shipped with Phase 2
— all six handlers (`createInvite`, `revokeInvite`, `redeemInvite`,
`changeRole`, `removeMember`, `leaveHousehold`), each resolving the household
from `ctx.auth.userId` and asserting a capability. Phase 3 is the client half.

- ✅ Invite links: `/?join=<code>` — captured in the client entry before
  sign-in, stashed in `sessionStorage` so it survives the round trip, and
  stripped from the address bar
  ([D28](decisions.md#d28-an-invite-link-is-joincode-not-joincode)). **Not
  `/join/<code>`**: the published space serves nothing at an unknown path, and
  `sf publish --dry-run` says `SPA false`
- ✅ A typed-code path beside the link, since an invite is as likely to be read
  across a kitchen as clicked. `shared/joinLink.ts` builds, parses, strips, and
  groups codes; 19 assertions cover it
- ✅ Member list in Settings — roles as a segmented control, remove with a
  one-step confirm, and leave-household. Owner-only controls are absent rather
  than disabled for anyone who cannot use them
- ✅ Invite panel — mint, copy link, revoke, and "expires in N days" from the
  same `shared/invite.ts` the server enforces with
- ✅ Last-owner and no-escalation guards visible in the UI before the click,
  read from `wouldStrandHousehold()` and `can()` rather than re-implemented
  ([D22](decisions.md#d22-ownership-is-a-role-not-a-column))
- ✅ Household name and default threshold now disabled for non-owners —
  `updateHousehold` is gated on `household:settings`
- ✅ Owner and editor invites only; `viewer` waits on Phase 4's read-only UI.
  The consequence is live and correct: editors may mint viewer invites and
  nothing else ([D21](decisions.md#d21-invites-carry-the-role-they-grant)), so
  intersecting with what the UI offers leaves them none and invite creation is
  effectively owner-only until viewer ships. The capability check is written
  properly and wakes up on its own
- ✅ The docs are out of the publish payload
  ([D29](decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload))
  — the thing that had to be decided before an invite link went to anyone
- ✅ `npm test` — 111 assertions; `npm run typecheck` clean; the artifact still
  reports nine tables, two queries, sixteen mutations, and **zero migrations**,
  which is what a client-only phase should produce

**Not verified, and it cannot be verified here.** Everything above compiles,
bundles, and ships its CSS. The Settings panels, invite minting, and the
read-only pass were checked in a browser against `sf dev` on 2026-08-25; what
cannot be checked locally is a *second person*, because `sf dev` issues one
fixed identity. That needs the published space.

**And the publish is blocked** — three platform bugs plus a broken `finalize`
stage, none of them ours. v2 is still live; v3 is recorded `failed`. See
[notes](notes.md#blocked-we-cannot-publish-2026-08-25) before attempting one.

**Done when:** Justin's wife signs in via an invite link and edits the same
pantry.

## Phase 4 — Feature parity and polish

Everything the prototype does that Phases 1–3 didn't carry over. **Audited
2026-08-25 against the code, and most of this list was already true** — the
Phase 2 port carried more across than this list assumed.

- ✅ Shopping list per store — `ShoppingListModal`, reachable from Settings and
  from the store filter bar
- ✅ Sorting, search, infinite scroll — `SortMenu`, the search field, and an
  `IntersectionObserver` sentinel paging 20 at a time. **Untested at real row
  counts**, which is the part of this line still outstanding
- ✅ Undo on remove — D17's client-held tombstone, not a soft delete. Re-adds
  through `addItem`, so the row comes back with a new id and does not survive a
  reload. Both accepted at the time
- ✅ Cascade cleanup on taxonomy delete — `deleteTerm` removes the `itemTypes` /
  `itemStores` join rows for a type or store, and refuses a location that still
  holds items (D16)
- ✅ **Read-only UI pass, which is what makes `viewer` usable.** Steppers, Edit,
  Remove, Add item, the "+" chip on every picker, and the taxonomy manager are
  now gated on `can()`. They are **absent rather than disabled**, with a single
  "View only" chip in the header explaining the absence
  ([D30](decisions.md#d30-a-viewers-missing-controls-are-absent-not-disabled)
  amends [D20](decisions.md#d20-three-roles-owner-editor-viewer) on that point).
  Unverified in a browser: `sf dev` makes you an owner every time, so this needs
  the published space and a second account
- ✅ Theme override persistence — per device in localStorage, which is where it
  belongs (D25)
- ✅ Typography — Playfair Display and Karla load from Google Fonts via a
  `<link>` that `client/lib/fonts.ts` appends at boot, because Zero has no way
  to declare a webfont and `sf dev` cannot serve a self-hosted one
  ([D31](decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google)).
  **Verified rendering in a browser on 2026-08-25** under `sf dev` — Fraunces
  paints the headers, not the `ui-serif` fallback. Unverified only on the
  published space, which runs the same remote URL

**What is actually left:** the row-count test for sort/search/scroll, and a
browser pass over the read-only UI — none of which
can be finished without either real data or the published space.

### Three bugs found by reading, fixed 2026-08-25

All three were code that compiled, typechecked, and did the wrong thing.

- **A refused delete still offered Undo.** `removeItem` resolved `void`, so the
  toast was armed whether or not the row went anywhere — and undo re-inserts
  through `addItem` (D17), so pressing it on a failed delete produced a
  duplicate. `removeItem` and `updateItem` now report success.
- **Save was a dead button when editing.** `saveEdit` returned silently on a
  blank name, and `ItemSheet`'s error prop was wired for the add flow only: no
  message, no close, no clue. It now validates name *and* location like `addItem`,
  shows the message, sets `saving`, and keeps the sheet open when the server
  refuses rather than discarding the edit.
- **The default threshold wrote on every keystroke.** Clearing the field to
  retype sent `''`, and `normalizeQty('')` is `"0"` — a household whose new items
  all start out already low. It is a draft committed on blur now, like the
  household name beside it, and anything that isn't a quantity snaps back.

**Also:** the first-run screen has a sign-out. It was the one screen with no way
off it, since sign-out lives in a drawer that does not exist until you have a
household.

**Done when:** nothing from the prototype is missing.

## Phase 5 — Ship

- `sf publish` to a real space
- Custom domain
- `sf db export` backup routine
- Use it for a month of actual grocery trips

**Done when:** we stop keeping a mental list.

## Later, maybe

Parked deliberately — see [non-goals](overview.md#non-goals) for the ones that
are parked permanently.

- Item photos via Zero storage
- Roles beyond owner/editor/viewer — a contributor tier, per-location
  permissions ([D20](decisions.md#d20-three-roles-owner-editor-viewer) settled
  the base set)
- Barcode scanning

## Phase 4.5 — The Cellar reskin

The interface spec at `.claude/docs/design/ui-directions.md` (Aug 2026),
rendered in `larderlogdesigns-4.html`. Chosen from three explorations; the other
two are not to be built.

- ✅ **Token layer** — `theme.json` carries the warm-brown palette (21 slugs),
  the Playfair/Karla families, and an 8-step type scale. Term colors became
  tokens rather than hexes
  ([D32](decisions.md#d32-a-term-stores-a-color-token-not-a-color)), with the
  sixteen theme values in `client/lib/palette.ts` and the token names in
  `shared/palette.ts`. Seed data, the picker (now 8 x 2), and `getTheme`'s light
  half all moved over. 111 assertions pass
- ✅ **Dark mode** — spec landed 2026-08-25 and is implemented. Both themes now
  come from the same table: ground gradients, surfaces, ink ramp, status trios,
  and a full dark quad for all sixteen term colors. `theme.json` carries
  `light-dark(light, dark)` pairs so one slug serves both, the way Zero's own
  platform tokens do. The primary button flips to cream on ink in dark — the
  single lightest control, since crimson never carries a button
- **Item card + list** — the densest surface, and the first real proof the
  tokens work
- ✅ **Sort menu** — the trigger names the active sort; six options in three
  groups split by hairlines, a crimson check rather than a fill
- ✅ **Term icons cut** — the reskin took the glyphs off the item card and
  deleted `IconPicker`, leaving a validated, seeded, tested field nothing could
  show or change. `shared/icons.ts` and `client/lib/icons.ts` are gone, along
  with the `icon` argument on `createTerm` / `updateTerm` and six assertions.
  **The column stays**, holding `''`
  ([D34](decisions.md#d34-term-icons-are-cut-and-the-column-is-kept)) — dropping
  it is destructive, refilling it is additive
- ✅ **App icon** — title, favicons and `theme-color` injected at boot, icons
  inlined as data URIs. The SVG favicon is deliberately not linked: browsers
  prefer it at 16px, which defeats the hand-cut `favicon-16.png`
- **`font-mono` retirement** — down from 35 sites to **ten**, all on surfaces
  the reskin has not reached: the sign-in gate, `JoinBox`, `ShoppingListModal`,
  and two loading strings in `Pantry`. IBM Plex Mono keeps loading until those
  are redrawn
- **Surfaces still pre-Cellar** — the sign-in gate, `JoinBox`, the shopping-list
  modal, `UndoToast`, and empty states (which the spec has never drawn)
- ✅ **Item card + list** — 20px radius, status on the edge, 42px Playfair
  numerals, named term chips with a color dot, 46px steppers; the list is a
  3-column grid
- ✅ **Drawer** — one dark drawer on the left, docked from `md` and a 328px
  slide-over with a scrim below it, same component at both sizes. Wordmark,
  household row, Filter/Settings switch, scrolling filter body, account row.
  **Term management moved into the Filter pane**: the pencil flips one section
  into editing (swatch, rename, delete, add) and Done flips it back.
  `Sidebar.tsx` and `FacetSection.tsx` were replaced and deleted; `Drawer.tsx`
  and `DrawerFilters.tsx` are their successors
- ✅ **Collapsed rail** — 68px, eight controls in three groups, dividers after
  2 and 5. Settings and Expand open a pane; household, appearance, account and
  the three filter groups are flyouts, so the rail stays put and the button
  that opened one takes the lit treatment. Badges count that group's active
  filter, crimson, ringed in the rail colour — the one place crimson touches
  the rail. Tooltips at 400ms; Escape and outside-click close a flyout
- ✅ **Household switcher** — the spec's popover, in the drawer and in the rail
  flyout: every household you belong to with your role and its item count, a
  crimson check on the current one, then *New household* and *Join with a link*.
  Built on [D33](decisions.md#d33-a-user-may-belong-to-several-households), which
  ended D18's one-household rule — see below
- ✅ **Settings pane** — the six sections now live *inside* the drawer, in the
  spec's order: Account, Household, Members, Appearance, Default threshold,
  **Invites last**. No terms block (they moved to the Filter pane) and no
  shopping list (it is contextual). `MembersPanel` and `InvitesPanel` render
  unchanged on the dark slab by way of `drawerTheme()`, which remaps a `Theme`
  onto the drawer ramp — cheaper than a second set of props and it keeps those
  panels unaware of where they are
- ✅ **Contextual shopping list** — reached only from the store-filter banner
  above the list, with a live count on the button. The separate `shoppingStore`
  state is gone: the list is whatever the store you are *filtering by* is short
  of. `SettingsDrawer.tsx` and `TaxonomyManager.tsx` were replaced and deleted
- ✅ **Main column header** — 50px search and Add item, then a counts row:
  status chips in their own tints with a crimson ring for the active one,
  opposite "Showing n of n" and the sort control
- ✅ **Item sheet (add *and* edit)** — 480px in from the right on desktop, a
  near-full-height bottom sheet with a grabber below `md`, one component for
  both flows: only the header, the save label and the presence of Remove
  differ. Editing used to expand inside the card and reflow the grid around it.
  Remove sits far left in the footer — ghost with crimson text, never a crimson
  fill — and removal stays undoable via the toast rather than confirmed.
  `ItemFields`, `ChipPicker` and `IconPicker` were replaced and deleted. Sticky
  footer, Escape to close, chips that fill with their own term colour when
  selected. Replaces the inline form, which pushed the whole pantry down the
  page every time you reached for it
- **Contextual shopping list** — reached from a store filter, not from Settings

**Open, from the spec's own list:** the collapsed desktop rail (undrawn, and it owns the reopen control); invite
links cramped at 340px; whether the shopping list earns a modal when the sample
data gives each store one row. Empty states are not designed.

**Not in the spec but now in the data:** the sample dataset names a "Meat
Freezer" location and an "Aldi" store that `shared/seed.ts` does not seed.

### Phase 4.6 — Destructive actions ✅ (2026-08-26)

The spec's *Destructive actions* section, built. One rule decides which
treatment an action gets — **undo what comes back, confirm what doesn't**
([D36](decisions.md#d36-undo-what-comes-back-confirm-what-doesnt)) — and the
three idioms that were in the code before it (an undo toast, an inline confirm
row inside `MembersPanel`, and a bare error banner) are down to two components.

- **`Toast.tsx` + `useToasts.ts`.** Actionable (6s, name, Undo pill, dismiss)
  and plain (3.5s, a finished sentence, no controls). The drawer surface in both
  themes, a draining timer bar that pauses on hover and focus, stacking capped
  at 3 with the oldest committing, and Cmd/Ctrl+Z from anywhere. Replaces the
  pre-Cellar `UndoToast`, which is deleted.
- **`ConfirmDialog.tsx`.** One shell, three shapes: confirm, blocked, and the
  typed confirmation. Focus trapped, initial focus on Cancel (the field on the
  typed variant), Escape and scrim and Cancel identical and all non-destructive,
  `role="alertdialog"`.
- **Every kind of term now blocks while in use**, widening D16 from locations
  alone. The editing row gained the item count and a trash that is live in every
  case; `termBlock` in `shared/term.ts` is the one rule the server refuses on and
  the client draws its dialog from.
- **Leave household moved** to the foot of the Household section, relabels to
  *Delete household* when you are the last member, and wired `deleteHousehold`
  — a mutation that had shipped in Phase 2 with no client caller.
- ***Recently added* is a real sort now**, on `createdAt` (D35). It had been
  applying no sort at all, which left the list oldest-first.

**Not verified in a browser** — no browser in the agent environment. What was
verified: the capsule compiles and reloads under `sf dev`; every new utility
class and both new `theme.json` tokens appear in the compiled `/zero.css`; the
term-usage counts and the refusal sentence were exercised through a throwaway
endpoint; the artifact still carries nine tables, sixteen mutations and **zero
migrations**. Justin has to click the rest.

**Deferred, and named in the spec as open:** the Viewer variant of these
surfaces, and which non-destructive events earn a plain toast (saved, copied,
invite sent, term added — a toast on every save would be noise). Neither blocks
anything.

### Phase 4.7 — Flows outside the shell ✅ (2026-08-26)

The spec's *Flows outside the shell* and *The marketing page*, built. Everything
before the app: the public page, sign-in, the handoff, the first household, and
the `?join=` landing. Scope is Owner and Editor, as with destructive actions.

- **Two pages, not one**
  ([D37](decisions.md#d37-the-signed-out-surface-is-two-pages-not-one)). `/`
  signed out is a marketing page; any other URL is a bounce to the sign-in card.
  The entry routes on the visitor's reason for being there — invitation, then an
  abandoned sign-in, then the path.
- **`MarketingPage.tsx`.** Nav, hero, three benefit cards, the *Three ways to
  slice it* band, closing CTA, footer. 1120 content column, 22px gutters at 390.
  No proof section: the slot is left open between the benefits and the band.
- **The hero mock is the real `ItemCard`, and its steppers work.** Three sample
  rows — stocked, low, out — with live plus and minus, so a visitor can press
  minus twice on the low card and watch it turn crimson. The status ramp doing
  its job *in their own hand* is the pitch; a screenshot could neither do that
  nor stay in step with the component. The arithmetic is
  `fromInt(toInt(qty) + step)`, the same expression `adjustQty` runs, so the
  clamp at zero comes from `shared/qty` rather than a second copy of the rule.
  Nothing resets. `ItemCard` gained one optional prop, `canExpand`, because the
  accordion has no *Edit* or *Remove* to reveal here and a chevron that expands
  nothing beside a stepper that works reads as broken.
- **`SignInCard.tsx`.** The 440px card, centred — the one surface that greets
  rather than asks — plus the two other handoff states. *Returning* replaces the
  card's contents rather than the card, so nothing jumps. *Didn't come back* is
  **amber, not crimson**, and left-aligned: it destroyed nothing, and it is a
  message with a body to read.
- **`FirstRun.tsx`.** One field, one button, the signed-in row, and nothing
  else. Prefilled from the Gravatar name and selected on mount, so Enter alone
  finishes the screen. The earlier draft's recessed panel of fifteen seeded
  chips is gone — the terms explain themselves in the drawer a second later,
  where they are also editable.
- **`InviteLanding.tsx`** and a new `invitePreview` query
  ([D39](decisions.md#d39-an-invite-preview-is-the-one-query-that-answers-a-guest)),
  the only read in the app that answers a guest. Four cases on one card, with a
  shared header. Already-a-member is **green** — the third rung of the same
  status ramp, since nothing is wrong and the thing you wanted is already true.
  **Signing in is the accept**
  ([D38](decisions.md#d38-signing-in-is-the-accept)); the in-app invite banner
  is deleted, and so is `JoinBox`.
- **The empty household.** Playfair italic 27px *Nothing in the larder yet.*, and
  at zero items the top bar carries neither the sort trigger nor an *Add item* —
  sorting nothing can only disappoint, and two *Add item* buttons on one screen
  is one too many. Both come back with the first item.
- **Generic seeds** ([D40](decisions.md#d40-seeded-terms-are-generic-and-there-are-still-three-stores)):
  Pantry · Refrigerator · Freezer and Grocery · Warehouse · Market.
- **Ramp additions**: `wordmark-md` 32, `wordmark-lg` 38, `headline-sm` 34,
  `headline` 56 — the first sizes above the wordmark the app has carried. Plus
  `Theme.accent` (crimson, theme-aware — the page wordmark had been hard-coding
  the light value in both themes), `Theme.dark`, and a disabled fill/text pair.
- **The composer's focus halo**, both themes, which the token table had
  specified and nothing had implemented.

Built from the spec first and then corrected against
`.claude/docs/design/larder-log-front-door/` — eighteen boards, nine screens
light and dark, which landed mid-build. The boards moved a dozen things: the
invite card leads with the tile on its own line and a *"Sarah Calfee invited you
as an Editor"* sentence rather than the role first; the blocked cards drop the
eyebrow and the household header entirely; the marketing nav has **no CTA**
below `sm`; and every card outside the shell takes a `0 24px 60px` lift rather
than the item card's hairline shadow.

**Two things Justin caught by clicking, fixed 2026-08-26:**

- **The closing CTA sat flush against its own edges on a narrow screen.** The
  wrapper was a bare `<div>` inside a `flex flex-col items-center` column, so it
  was shrink-to-fit — and a `w-full` button inside a shrink-to-fit box resolves
  to 100% of *its own content*, which is a button with no padding at all. The
  wrapper is `w-full sm:w-auto` now, and `GravatarButton` carries `px-5` so no
  layout above it can reproduce the effect.
- **Every control on the item card was inert under the pointer** — the
  steppers, *Edit*, *Remove*, and the header row. All four were painted with
  inline styles, and an inline `background` outranks `hover:bg-line`, so the
  hover rules would not have worked even if they had been written. Five
  constants in `controlStyles.ts` (`CARD_STEPPER`, `CARD_STEPPER_PRIMARY`,
  `CARD_ACTION`, `CARD_ACTION_GHOST`, `CARD_HEADER`) carry hover, active and a
  focus ring offset against `surface` rather than the page ground. **At zero the
  minus stays faint and does not brighten on hover** — it is still live, because
  the clamp is the server's and a disabled control cannot explain itself (D36),
  but nothing about it should promise a change it will not make. This is the
  third time inline styles have shipped a control with no feedback; the note at
  the top of `controlStyles.ts` now says so.

**Verified without a browser.** The capsule compiles and reloads; every new
class and all four type tokens are in `/zero.css`; the artifact still shows nine
tables, sixteen mutations and **zero migrations**, with `invitePreview` the
fourth query. All four preview cases were exercised through the real query path
— valid, expired, revoked and unknown, plus already-a-member — using `sf dev`'s
HTTP `query.run` endpoint and a throwaway `/api/__probe` that has been removed.
`npm test` is at 135 assertions. **Nobody has clicked any of it.**

**`?signedout` is a new dev-only switch.** D14's loopback hole makes every local
visitor a signed-in dev guest, which put the marketing page, the sign-in card
and the invite landing out of reach in the one environment they can be clicked
in. It only ever removes access and is ignored off loopback. It comes out with
D14.

**Still open, and named as such in the spec:** a proof section, the Viewer
wording on the invite card, wrong-account-on-invite, session expiry, and where privacy and
terms would be linked from if they ever exist. Tablet — 768–1024 — is undrawn
for the marketing page as well as the app; the hero splits its two columns at
`xl` (1280), which is a choice made here rather than one the spec settled.

### Phase 4.8 — The shopping list ✅ (2026-08-26)

The spec's *Shopping list* section, governed by
[D41](decisions.md#d41-the-shopping-list-is-a-mode-and-its-checks-are-local):
**the list is a view of the items, not a thing you keep.** It replaces the
content column rather than covering it.

- **`ShoppingListModal` and the store banner are deleted.** The Store filter is
  a filter again. A modal is a question, and it had nowhere to put a checkbox.
- **`shared/shoppingList.ts`** owns the grouping and both orderings — groups
  A–Z with the storeless one last, rows out-before-low then A–Z, which is the
  *Needs restocking* sort reused rather than written twice. An item naming
  several stores appears under **every** one of them, so the count is of items
  and never of rows. `npm test` is at 150 assertions.
- **`ShoppingList.tsx`** — one card per store in an `auto-fill` grid at a 460px
  floor, `auto-fill` and not `auto-fit` so a single card left after a store
  filter stays one column wide instead of stretching across the screen. The
  card header is the tag component stretched to the card's width, which is the
  one place a term's colour has ever filled a whole band.
- **The row is not a click target.** The left column checks; the name and the
  counts open the Edit sheet. Two controls, both over 44px, and no way to open
  a sheet when you meant to tick something. Below `md` the row stacks, because
  a long name and its badge collide with the counts on one line.
- **`ShoppingListTrigger.tsx`** — one control, two labels, **secondary** in
  both: `surface` on `line strong` with an ink label and an ink count pill. It
  sits immediately after the three status pills, so placement does the work
  colour would have. Hidden when nothing is low or out. Its count is the
  household's, never the filtered one. At 390 it drops its label for a cart
  glyph; *Back to items* keeps its words.
- **`useTripChecks.ts`** — checks in `localStorage`, the third thing there
  after the theme (D25) and the household (D33). Cleared when the item leaves
  the list, after 24 hours of no ticking, or on a household switch.
- **The trip bar** sits below the whole grid rather than inside a card, because
  *Hide checked* is a fact about the trip and not about Costco. Its right half
  is empty and reserved for restocking.
- **In list mode the sort trigger is hidden** — the list has one fixed order,
  and offering to change it would be a lie — and the meta line becomes
  `11 to buy · 4 stores · 3 in the cart`. *Add item* stays: noticing at the
  shelf that you need something untracked is the likeliest reason to add one.
- **`Theme` gains `divider`**, a hairline inside a card. Softer than `border` in
  light, identical to it in dark: at `#E2D5C0` a rule every 56px stripes a card
  into a ladder, and below `#3E3527` it vanishes at the dark fill.
- **The marketing page's third benefit said "Nothing to tick off"**, which the
  checkbox makes false. The copy is changed; this is the only place the build
  now differs from the front-door boards.

**Corrected against the `-2` boards, 2026-08-26.** The first pass was built
against a top bar the spec described and the app does not have — a title and a
count, no search, no status pills. Three things changed once the real bar was
drawn:

- **The trigger stopped being amber.** It lands a gap away from `6 running low`,
  which is already amber and means something else.
- **It moved from beside Sort to immediately after the status pills**, which is
  what makes it findable — the eye crosses the three counts and lands on the
  thing to do about them.
- **Row 2 empties out in list mode** — pills and sort both go, *Back to items*
  takes the left, the trip count takes the right. Row 1 never changes.

The mobile primary was left alone: the boards draw *Add item* at 390 as a 52px
square in row 1, and the build's pinned bottom bar is correct — Justin's call.

**The lesson, and it is the spec's own:** anything not drawn on a canvas drifts
out of the design document silently. Two turns of work were specced against a
component that did not exist.

**Then corrected again from live use, 2026-08-26** — none of it in the boards:

- **Row 2's compact forms now key off the measured content column**
  (`ROW2_FULL_PX`, 910) rather than `md:`. The boards switch at 390, which is
  wrong in the middle: a docked drawer costs 340px, so a 1280 screen leaves 872
  and cramps exactly the way a phone does.
- **The trigger moved into the mobile header** at the top right, level with the
  wordmark. It is chrome rather than a fact about the current screen, and
  taking it out of row 2 is what lets the status pills and the sort share one
  line at 390 again.
- **`Showing X of Y` is what row 2 gives up first** when compact.

**Verified without a browser.** The capsule compiles and reloads; every new
utility class is in `/zero.css`, checked by printing the selectors rather than
hand-writing the escaped form — including the `auto-fill` grid,
`ring-offset-surface-alt`, and both brightness hovers. `npm run typecheck` is
clean and `npm test` passes. **Nobody has clicked any of it.**

**Left undecided, and named as such in the spec:** which side of 720 the row
stops stacking — `md` is chosen here for consistency with the rest of the app,
not because the spec settled it. A Viewer gets no checkboxes and no *Add item*,
which leaves the list a pure read surface; the spec flags that as worth
confirming.


### Phase 4.9 — Household colour ✅ (2026-08-26)

`.claude/docs/design/ui-directions.md` § *Household colour*, drawn on
`.claude/docs/design/larderloghouseholdcolourboards.html` (four screens, light
and dark). Governed by
[D42](decisions.md#d42-a-household-has-a-colour-and-it-is-one-of-the-sixteen).

**The one schema change since Phase 2, and it is additive**: `households.ink`,
a colour token defaulting to `""`. `sf publish --dry-run` still shows nine
tables and sixteen mutations; the column applies on the next publish without a
flag.

- **`shared/household.ts`** — `householdLetter()` skips articles, `householdInk()`
  resolves an unset colour from the row **id**, `toHouseholdInk()` decides what
  gets stored. All three in `shared/` because the server answers them too: the
  invite preview hands a colour to a guest. `npm test` is at 165 assertions.
- **`HouseholdTile`** — one shape at every size, radius 30% and the letter at
  42%, both derived. It replaced four separate drawings: the rail's, the
  switcher's house glyph, the invite card's local component, and the Settings
  row that had none.
- **`HouseholdIdentity`** — swatch, field, inline picker. Used on the drawer
  (Settings › Household), on the first-run card, and in the New household
  dialog. **Two deliberate departures from the boards**: no tile preview in
  Settings, because the drawer's household row above it already shows the tile;
  and no caption under the picker, because a collision is allowed and the line
  therefore described the absence of a rule.
- **Every picker draws one palette now**, following the theme rather than the
  surface it opens over. It fixed a second instance of the same bug — the item
  sheet's picker drew light bases in dark mode — and left one divergence open in
  `notes.md`: a term chip's dot on the drawer is still `drawerDot(c)`.
- **`ModalShell`** was extracted from `ConfirmDialog` so *New household* could be
  the confirm shell rather than a lookalike. `ConfirmDialog` renders through it
  and behaves as before.
- **The switcher no longer creates.** *New household* opens the dialog; joining
  stays inline.

**Verified without a browser**: `npm run typecheck` clean, 165 assertions pass,
the artifact shows `ink` on `households` with `default: ""`, all three
`--tile` classes are in `/zero.css` in the right order, and the real handlers
were driven over `POST /__spacefast/zero/run` — an explicit `color-7` stored, an
omitted colour resolving to a stable default, `updateHousehold` writing a new
one, and `invitePreview` returning the household's own colour rather than a
location's. **Nobody has clicked any of it.**

**Superseded 2026-08-27: it has been clicked.** Phases 4.5–4.9 went through a
real session on a phone and with a second person, which found six things
compiling and curling could not — see *Real-device testing* below. Treat the
"nobody has clicked" line above as the state at the time of writing, not now.

### Real-device testing, and what it found — 2026-08-27

The first round of use on a phone and by a second person. Everything here is a
fix to something already built; nothing new was designed.

**The item sheet threw focus back into the name field on every keystroke.**
The focus call was folded into the Escape-listener effect, whose deps included
`onClose` — which `Pantry` rebuilds every render, so every chip press, every
stepper tap and every character re-ran it. Split into two effects; focus depends
on `open` alone. **The general rule: a "do this once when it opens" effect must
not share a dependency list with a listener that has to track a live callback.**

**A selected status pill's ring was clipped on three sides.** `overflow-x-auto`
clips on **both** axes, and the ring is a 3.5px `box-shadow` outside the border
box. `p-1 -m-1` on the compact scroller gives the ring room inside the scroll
port and gives the row back the width; chip positions are unchanged.

**The colour picker closed after every choice.** Recolouring is comparison — you
pick, look at the dot against the name, pick again — and snapping shut meant
re-opening the sixteen for every second guess. It now closes on the swatch and
nothing else.

**The picker's colours were unreachable on a Pixel 8 Pro.** The drawer was
`h-screen`, and on mobile Chrome `100vh` is the *large* viewport — the one with
the URL bar hidden — so a full-height fixed drawer runs ~60px past what you can
see. That dead band is the tail of the Filter list's scroll port, so a picker
opened on a row near the bottom had no scroll left to reach it. `h-dvh` on the
drawer and the rail, `92dvh` on the item sheet, whose Save row had the same
problem. **`h-screen` is wrong for anything full-height and fixed on a phone.**

**The remove-member button had no hover.** `DRAWER_ICON_DANGER` hovered to
`bg-drawer-raised`, which is exactly the colour of the member row it sits on,
and offset its focus ring against `drawer` — a value nowhere near it. Its
crimson was an inline `style`, which outranks any `hover:text-*`. Two new
tokens, `drawer-raised-hover` and `drawer-danger-hover`, and the colour is a
class now. **This is the third time a control has been styled against the wrong
surface**; the rule is that a `DRAWER_*` or `PAGE_*` constant is named for the
ground it sits on, and a control on a *raised* row is on neither.

**A selected chip in the item sheet lost its colour dot.** The drawer's filter
chips already kept theirs. See D44's note in decisions, and the contrast
figures: deriving the dot from the *chip's* fill rather than the page's theme
took the worst case across all sixteen colours from 1.98:1 to 3.09:1.

**`?members` was added** — two stand-in member rows, loopback only, so the role
chips and the remove button can be looked at without a second real person. Same
shape as `?signedout`, and it goes out with D14. The rows never leave the
client: `isDevMember` answers `changeRole` and `removeMember` before either
reaches the network.

### Undo puts things back where they were — 2026-08-27

Reported from use: undoing a removal sent the item to the top of *Recently
added* instead of back where it was. D17's re-insert makes the row genuinely
new, and D35 pointed the sort straight at the platform's `createdAt`; D36's
write-up had argued that was correct.

The platform will not let an insert set `createdAt`, so the app carries its own
stamps —
[D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo).
Nine columns across five tables, additive, no flag. `changedAt` has **no reader
yet**, deliberately: nothing backfills, so a column added later is `''` on every
row that already exists.

Term lists became **A–Z**, sorted once in the `pantry` query, which also closed
what D36 recorded as "a restored term appends".

Still open, and only worth doing if wanted:

- **No sort reads `changedAt`.** A *Recently changed* option in `SortMenu` is
  the obvious use and was not built, because it was not asked for.
- **`memberships`, `invites` and the join tables have no stamps.** Nothing
  orders them by time today. The same reasoning that put the columns in now
  applies to them: rows that exist before a column never get a value.

### Empty results get the first-run treatment — 2026-08-26

The household-with-nothing-in-it had the full screen — Playfair italic 27px, a
420px body, one primary — and **every other empty result got `Nothing here yet.`
in 14px grey**, which read as a rendering failure rather than an answer. Both
now go through `EmptyState.tsx`, drawn from
`larder-log-front-door/first-run-app-light.html`.

`emptyCopy()` in `Pantry.tsx` decides the words *and* the action together, so an
action can never clear a filter the title did not mention. Three families:

- **A status chip on its own** — *Nothing's out.* / *Nothing's running low.* /
  *Nothing's fully stocked.* — takes **no button**. The chip you pressed is
  still on screen and now reads `0`; a second control for the job the first one
  is still doing would be noise.
- **One term or one search** names it — *Nothing in Pantry.*, *Nothing from
  Grocery.*, *Nothing tagged Produce.*, *Nothing matches "beans".* — and offers
  to unpick exactly that one.
- **Anything else** cannot name a single cause without guessing which filter is
  to blame, so it says so and clears the lot.

### The item grid is fluid, and the drawer docks at 1120 — 2026-08-26

The content column was capped at `max-w-[1160px]` and the grid stepped
`1 → 2 → 3` columns at fixed breakpoints, so past about 1500px every extra pixel
became margin. Both are gone.

```
grid:  grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]
card:  min-h-[188px], quantity row mt-auto
```

The tracks always divide the row exactly, so the gutter is 16px at every width
and there is never a remainder. Two earlier attempts both spent that remainder
somewhere visible: capping the card inside a `1fr` track pushed it *between* the
cards (104px between neighbours at 1440, because the track stretched while the
card did not), and capping the track at 420 held the gutter but left up to a
full track of dead space at the right edge. Letting the track stretch removes
the remainder instead of relocating it.

`auto-fit`'s trade is that it collapses empty tracks, so a household holding
fewer items than columns gets fewer, wider cards. Once there are more items than
columns — the normal state of a pantry — it is identical to `auto-fill`. Mobile
keeps an explicit `grid-cols-1`; below 320px of content the floor would overflow
its own track.

**Collapsed cards share a height; an open one grows alone.** `align-items:
stretch` is the obvious route and cannot be used: a grid row is sized by its
tallest item's *content*, and `align-self: start` on that item changes only
where it sits, not how tall the row is — so an open card would drag its whole
row down. Equality comes from `min-h-[188px]` on the card instead (a one-line
name plus two rows of chips), with `mt-auto` on the quantity row so the slack
lands as breathing room under the chips rather than a gap in the middle. A card
carrying more chips than that is still taller; clamping the rows would square it
off at the cost of hiding a term, which is the wrong trade.

**The drawer docks at 1120, and the number is derived from the card floor.**
Docking spends 340px, so it must not drop the content column below what its
current column count needs — otherwise widening the window *removes* a card.
With a 320px floor a track is 336, and the thresholds that survive are narrow:

| Threshold | Below | Docked | |
|---|---|---|---|
| `lg` 1024 | 2 cols | 1 col | loses one |
| **1064–1128** | — | — | **clean** |
| `xl` 1280 | 3 cols | 2 cols | loses one |
| 1400–1464 | — | — | clean |
| `2xl` 1536 | 4 cols | 3 cols | loses one |

No Tailwind breakpoint sits in either surviving band, so it is the arbitrary
variant `min-[1120px]:` — the middle of the lower band, which keeps the docked
drawer available on ordinary laptops instead of pushing it out to 1400.
**Re-derive it if the card floor changes.**

Below 1120 the 68px rail *is* the drawer, whether or not anyone chose to
collapse it: `CollapsedRail` renders unconditionally and takes an `autoOnly`
prop that re-hides it above the threshold when the collapse was only the width's
doing. CSS rather than a `matchMedia` listener, so the two halves cannot
disagree for a frame on load. The rail's expand control sets `drawerOpen` as
well as clearing `drawerCollapsed` — below the threshold, un-collapsing alone
reveals nothing.

| Viewport | Drawer | Content | Cols | Card | Gap |
|---|---|---|---|---|---|
| 390 | off-canvas | 354 | 1 | 354 | — |
| 768 | rail | 632 | 1 | 632 | 16 |
| 900 | rail | 764 | 2 | 374 | 16 |
| 1119 | rail | 983 | 2 | 484 | 16 |
| 1120 | docked | 712 | 2 | 348 | 16 |
| 1280 | docked | 872 | 2 | 428 | 16 |
| 1440 | docked | 1032 | 3 | 333 | 16 |
| 1600 | docked | 1192 | 3 | 387 | 16 |
| 1920 | docked | 1512 | 4 | 366 | 16 |
| 2560 | docked | 2152 | 6 | 345 | 16 |

1440 lands on 3 × 333, which is the original mockup's grid to the pixel.

Two things fixed alongside: the error and pending-invite banners were
`max-w-5xl mx-auto`, centred and capped at 1024px while everything under them
was left-aligned — they now share the content gutters; and *Nothing here yet.*
and *Loading more…* were single grid cells, centring inside the first column
rather than the row. Both take `col-span-full`.

### Left open at the end of 2026-08-25

- **A `site.webmanifest`.** The icon README specifies one in full, and the
  192/512/maskable PNGs are staged for it. Not built: it makes the app
  installable, which is a product decision rather than an icon swap.
- **Five icon files the README's markup wants are missing** — `favicon.ico`,
  `favicon-48.png`, and the three source SVGs. The `.ico` is the one that
  matters; the sized-PNG pair is the substitute for it.
- **The household tile's colour** on the collapsed rail borrows the first
  location's, since a household has no `ink` of its own.
- **Eight of sixteen `onDrawer` values** are unspecified and fall back.

### Two things the rail spec leaves ambiguous

**Do filter groups fly out or expand?** The prose says *"Filter groups and
Settings need width, so they animate the rail 68px → 340px"*, but the control
table says "Flyout — quick filter" for all three, and the *Quick filter ≠ the
full set* paragraph describes flyout contents ending in *Open full filters* —
which only makes sense if it is a flyout. `CollapsedStates` draws it as a
flyout. Built as a flyout; the prose sentence appears to be stale.

**The household tile has no colour to take.** The spec says "the household's
initial on its term colour", but a household is not a term and carries no
`ink`. The tile currently borrows the first location's colour and falls back to
terracotta. It wants either a real `households.ink` column — a schema change,
so D27 governs — or a rule for deriving one.

### The household switcher is built, and D18 is gone

**Done 2026-08-25**, and it was the decision the note below predicted rather
than the component. [D33](decisions.md#d33-a-user-may-belong-to-several-households)
replaced D18's one-household rule with a read-heals / write-refuses split:
`selectMembership` for queries, `findMembership` for mutations, a `households`
query for the list, and a `householdId` argument on every scoped query and
mutation. **No migration** — the artifact still reports nine tables and zero
operations, exactly as D3 and D18 promised it would.

Which household you are looking at is per device, in `localStorage`, and every
query echoes the household it actually resolved so a stale selection repairs
itself. Roles are now per household: the same person is an owner in one pantry
and a viewer in another, verified against a real capsule.

Leaving and deleting a household are deliberately **not** in the switcher —
leave stays in Settings, and `deleteHousehold` still has no client caller at
all.

**Not verified, and it cannot be here:** two people in one household, and one
person in two households on a *published* space. `sf dev` issues one identity.

### What the deferral said at the time

The spec draws a full-width button opening a popover of **every** household you
belong to — name, role, item count, a check on the current one — plus *New
household* and *Join with a link*.

[D18](decisions.md#d18-one-household-per-user-enforced-in-the-handler--not-in-the-schema)
gives each user exactly one. `requireHousehold()` reads memberships through
`by_user` and throws on anything but a single row, and the client has one
`household` query rather than a list. The schema has always allowed many
(D3) — the handler is what refuses.

So this is not UI work. Building it means a query returning every membership, a
notion of "current household" the server can trust, and relaxing
`requireHousehold()` — which is the one function every household boundary in the
app is enforced through. **That is a decision to take deliberately, not a
component to draw.** The drawer currently shows the household name without a
switcher, and says so in a comment.

**Decided 2026-08-25:** left out for now, and **revisited once the design work
lands**. The schema was built multi-household from the start (D3) precisely so
this stays possible; D18 is a handler rule, not a data limitation, which is why
this is a deferral rather than a redesign.

### Eight of sixteen on-drawer dots are unspecified

The drawer is the darkest surface in both themes, so a term's dot there is
brighter than the `Dark dot` column — confirmed by the mockup, where the same
value appears in the light and dark artboards alike. The eight colors the
sample data uses are pinned down; the other eight fall back to `Dark dot` and
read slightly dim. `client/lib/palette.ts` marks which.
