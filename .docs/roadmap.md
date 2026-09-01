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

- ✅ **`sf publish` to a real space** — live at
  <https://larderlog.view.fast/>. **v13** as of 2026-08-29
  (`ver_cb18bde5f0e44c5db5fa37f75c9d4470`, 125 files, 16 seconds) carries all of
  `garden-and-kitchen.md`'s v1 — D58, the run list, the item side, D60 and D61 —
  and took `stores.kind`, `items.seasonFrom` and `items.seasonTo` live.
  **Publishing no longer needs the `x-spacefast-rationale` shim**: the CLI was
  upgraded 0.0.26 → 0.2.2 and a plain `npx sf publish` now works first try. See
  [CLAUDE.md](../.claude/CLAUDE.md) before attempting one.
- ✅ **The app is installable** — `site.webmanifest` serves as
  `application/manifest+json` with the 192, 512 and maskable-512 icons.
  **Nobody has installed it**; that needs a phone.
- ✅ **The app says it is installable** — one row in Settings › Preferences,
  *Add to home screen*, built 2026-08-28 and governed by
  [D54](decisions.md#d54-the-offer-to-install-is-one-row-in-settings-and-there-is-no-banner).
  **Install** where a browser hands the page a prompt, **Show me** and two
  written steps on iOS, and nothing at all in the installed app or where no
  path exists. There is deliberately no banner, which means **discovery is
  unsolved on purpose** — the first thing to revisit if nobody installs it.
  **Nobody has clicked it.**
- Custom domain
- `sf db export` backup routine
- Use it for a month of actual grocery trips

**Done when:** we stop keeping a mental list.

**The gap now is clicking, not building.** Every phase through 4.15 is built,
published and verified by compiling, curling and reading the artifact — and the
Phase 4.9 entry records what that is worth: a single real session on a phone
found six defects none of those checks could have caught. v13 carries
Garden and Kitchen's whole v1 into production and **nobody has used any of
it**. The unexercised list keeps growing rather than shrinking: the applied
filter bar, the display-name gate, the redesigned drawer, the members pane and
the restored view state from v11; the item sheet's size and steppers and the
install row from v12; and now the source-kind menu, the run list's bands and
segment, the season panel and the first-run source mix. **The published
household still holds three shop sources and the old nine types**, so the
bands, the segment and the `SOURCE` rename are not even visible there until a
source is given a kind by hand. **Phase 6's whole console joins that list on the
day it publishes**, and it is the largest single thing on it.

## Phase 6 — The admin console

Built 2026-08-29 in seven stages, **unpublished**. Twenty-six boards on three
pages in `.claude/docs/design/admin-console.md`, governed by
[D62](decisions.md#d62-the-console-is-a-pane-in-the-app-drawer-and-an-administrator-is-a-name-in-the-environment).
The single account of it is in
[CLAUDE.md](../.claude/CLAUDE.md); this is the phase ledger.

- ✅ **The way in, and the pane** — a row in the account menu, administrators
  only; *Administration* pushed into the app drawer exactly as *Members* is.
  **There is no admin shell**: the content column swaps and nothing outside it
  does. `/admin` cannot exist (`SPA false`), so the deep link is `?admin` and
  the platform's own 404 is a better refusal than board 8's.
- ✅ **Overview** — four stat cards, a twelve-month household line drawn from
  `@spacefast/zero/charts`, and *Needs attention* whose rows land on the
  household list with the chip already set.
- ✅ **The household list** — searched, four status chips, four sorts, 25 a page.
- ✅ **The household page** — the metadata-only rule made checkable: every field
  is a count, a name or a date, and the card in the left column says so.
- ✅ **The household's three writes** — the role menu (the console's one
  component that changes surface), *Revoke* on a live invite, and *Delete
  household* behind the app's **second** typed confirmation.
- ✅ **People and the account page** — where somebody is a member and what they
  can do there, behind the same line the household page draws.
- ✅ **Ownership transfer** — a real hand-over rather than a promotion, which is
  what account deletion forced into existence and what the orphan dialog calls.
- ✅ **The account-deletion pre-flight** — one row per solely-owned household,
  hand it over or delete it, and a tail line for the rest. 520 rather than 420,
  the console's one deviation from the confirm shell.
- ✅ **The audit log** — the eleventh table, `activity`, on `by_at`. A time, a
  person, an action and a target; a deletion entry carries its own copy of what
  the thing held; and **nothing a household does to its own pantry appears in
  it**.
- ✅ **Retention and export** — retention enforced at append time (there is no
  scheduler) and set by `LARDER_RETENTION_MONTHS` rather than by a control, on
  the grounds that an administrator who could shorten it could erase the record
  of what administrators did. Export is a range, capped, and says when the cap
  bit.
- ✅ **The orphan dialog** — amber, because nothing is gone and a household is
  stuck.
- ✅ **The list states and 390** — *Best match* while searching, day one with no
  controls at all, chips that scroll, and every control clearing 44px.
- ✅ **The collapsed rail** — back-to-the-pantry in slot 2 and the four sections
  in the filter groups' places, so collapsing the drawer no longer leaves the
  console beside a rail offering to filter a household nothing on screen is
  about.
- ✅ **The interaction states, swept** (2026-08-30) — ten controls were missing
  hover, press, focus or an open state they were written to have, all of it
  invisible to a typecheck and to a class-presence grep. The pattern under nine
  of the ten is one the app had already recorded three times: **an inline style
  beats a `hover:` class**, and six of these inline colours were byte-identical
  to the token they were overriding. `PAGE_BUTTON_QUIET_ON`, `PAGE_BANNER_X`,
  `PAGE_GHOST_DANGER`, `PAGE_SUNK_UNSET`, `PAGE_BUTTON_OUTLINE_ON` and
  `DRAWER_NAV_ROW_ON` are what came out of it. **It then shipped two dead
  controls of its own** — both *Delete* buttons hovering to the colour of the
  `surface-alt` strip they sit in — because a class-literal diff cannot see what
  is painted behind a control. `PAGE_GHOST_DANGER_SUNK`, `PAGE_SUNK_ON_ROW` and
  `PAGE_ICON_IN_FIELD` came out of the ground-aware check written in response,
  which now reports 36 console controls and 0 flagged.
- ✅ **A loading state that can escalate** — `AdminLoading`, shared by all seven
  screens. Zero has no query error path, so a thrown handler and a slow one look
  identical **forever**; time is the only signal, so past ten seconds the copy
  stops claiming to be loading and offers the one recovery there is. Quiet for
  the first half-second, because every console subscription opens in the same
  tick as the pane.
- ✅ **The chart's tooltip** (2026-08-30) — the last drawn console surface that
  was neither built nor decided against. The design gives the surface and the
  surface was the whole answer: it is the rail's `Tip` with two lines in it, on
  the drawer's darkest layer in both themes. Hit-tested by band rather than by
  dot, positioned from the `xMidYMid meet` scale worked out at
  `pointerenter` — so the chart still has no `ResizeObserver` — and the twelve
  values moved into the `aria-label`, which had carried only the ending one.
- ❌ **Seeing inside a household** — **decided against** on 2026-08-29 and
  recorded in D62 as a decision rather than an omission, which is what the
  design document asks for. Metadata-only holds; support means asking somebody
  inside the household. **Do not build it without reopening the decision**, and
  if it is reopened the amber banner and the household being told are not
  negotiable parts of it.

**Still open in the design's own *Gaps***: **concurrent edits**, where two administrators act on one household and nothing
says so; **the rest of mobile**, where Overview, People and one account render
at 390 but have never been drawn there; **announcements** and **running cost**,
both from *future-ideas*; and whether **a household can see the Activity rows
that touch it**.

**Not built, and none of it is a later stage** — the platform cannot supply
any: every **email** on the boards (D56), **storage** figures, and **last
seen**. The `Awaiting deletion` chip needs a deletion hold, which is a column
nothing else wants; *Sole owner* took its place and is more useful.

**Done when:** `LARDER_ADMIN_IDS` holds a real account id on the published
space and somebody has opened the pane there. **Neither has happened.**

**Before publishing it**, two things are new since v14 and both want reading
first: this is a **migrating** publish (`activity` is a new table, additive and
flagless, as `profiles` was), and `.env.server` gains two variables that must be
set on the space or the console is unreachable and the log keeps its rows
forever.

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

### Phase 4.10 — The applied filter bar ✅ (2026-08-27)

`.claude/docs/design/ui-directions.md` § *Applied filters*, drawn as a live page
on `.claude/docs/design/appliedfilterbar.html` rather than as boards. Governed by
[D45](decisions.md#d45-the-applied-filters-are-a-row-of-the-top-bar-not-a-badge-on-the-drawer):
**a filter you cannot see is a filter you cannot remove.**

**No schema change and nothing server-side.** One new component, three new
control styles, and about ninety lines in `Pantry`.

- **`AppliedFilters.tsx`** — row 3 of the top bar: `Clear filters`, then one
  chip per active term, in the drawer's order (location, store, type). Present
  only while a term filter is on, and **not** conditional on the drawer. It
  stays in list mode, because the list obeys the same filters.
- **Three `PAGE_*` styles**, and the rule they encode is now the fourth theming
  rule in the spec: **an interaction state on the ground moves away from the
  ground, not toward it.** `surface-alt` — the app's usual ghost hover — is the
  ground gradient's own middle stop, so out here it reads as the control
  vanishing. `line` moves the right way in both themes at once.
- **`clearFilters()`** takes every term *and* the status pill, never the search.
  The drawer's *Clear all filters* now calls it, and its visibility moved from
  "anything at all" to terms-or-status so a lone search cannot leave a no-op
  button on the Filter tab. `clearAllFilters()` — search included — stays for
  the empty state.
- **The mobile menu button carries the crimson total**, so the fact that
  something is filtering survives scrolling past row 3.
- **A live region in `Pantry`**, not in the bar: the bar unmounts with its last
  chip, and *Filters cleared* announced from a removed node is silence.

- **Focus moves to `Clear filters`** when a chip goes and the bar survives.
- **Two mobile fixes from the same 2px**: the clear is padded symmetrically at
  every width (the boards' 2px left padding put the hover fill against the *C*),
  and the row gained the 8px gap between the clear and the first chip that the
  boards have and the first build lost.

**Filtering became multi-select with it** — OR inside a group, AND across
groups. `shared/filter.ts` owns the rule; the drawer's sections and the rail's
flyouts toggle rather than select, the rail's badges count the group, and the
quick-filter flyout now stays open on a pick because a group holds more than one
term. `npm test` is at 222 assertions, fourteen of them new.

**Verified without a browser**: typecheck clean, 222 assertions, `sf dev` on
`--port 4199` compiles and serves, and every new utility is in the live
`/zero.css` — checked by printing and unescaping the selectors, with the `md:`
variants' line numbers compared against their base rules. **Nobody has clicked
it.**

### Phase 4.11 — The account's display name ✅ (2026-08-27)

`.claude/docs/design/ui-directions.md` § *First run — the display name*, drawn on
`.claude/docs/design/display-name-light.html` / `-dark.html` — two states, light
and dark. Governed by
[D46](decisions.md#d46-the-display-name-is-on-the-account-and-it-is-asked-before-the-fork):
**the account carries a name; the identity does not carry it for us.**

A real signup on the published space is janky in a way the design assumed away —
plenty of accounts arrive through my.spacefast.com with no profile name, and the
ones that have one did not set it here. So `ctx.auth.displayName` is a
suggestion and the app collects its own.

**The third additive schema change since Phase 2**, after `households.ink` (D42)
and D44's nine stamp columns. Ten tables, five queries, seventeen mutations; it
applies on the next publish with no flag.

- **`profiles`** — `userId`, `displayName`, and D44's two stamps, on a `by_user`
  index. Stamped from birth because a column is permanent and this table had no
  rows yet.
- **`profile` query** — takes no argument and answers *before* a household
  exists, which is the point. `needsName` is narrower than "has no profile row":
  an account that predates the table inherits the Gravatar name off its own
  memberships and is grandfathered, so only an account with no name **anywhere**
  is stopped.
- **`setDisplayName` mutation** — an upsert, plus a write-through to every
  membership the account holds. `memberships.displayName` is now a documented
  *copy*, and the write-through is what keeps it from showing the new name to
  the person who typed it and the old one to everyone else. Rows already
  agreeing are skipped.
- **`accountName()` in the capsule** — the one place a membership's name is
  resolved, walking profile → membership → identity. `createHousehold` and
  `redeemInvite` both stamp through it.
- **`shared/profile.ts`** — `normalizeDisplayName`, `isValidDisplayName`, and
  `pickDisplayName`, which is the fallback chain both halves walk. `npm test` is
  at 235 assertions, thirteen of them new.
- **`DisplayNameCard.tsx`** — the card, from the boards: eyebrow, the 52px
  avatar beside the email, *What should we call you?*, the field with its
  crimson focus border and halo, a hint that switches on whether Gravatar
  supplied a name, and *Continue* disabled until something is typed. The hint's
  branch is fixed at mount, so clearing the field does not rewrite where the
  value came from.
- **The gate sits above the invite landing** in `Pantry`, and the consented
  auto-redeem waits for the name to settle. `accountName` — profile, then
  identity — replaces the auth name on every surface that renders a person.

**Two departures from the boards**, both in D46: the account row carries a
*Sign out* (the screen is required, and without one a mis-signed-in account has
no exit), and the entry passes the identity's name through raw — the old
`auth.displayName || 'Signed in'` made an absent name look present, which is
exactly the case this screen exists to catch.

**Editing the name in the drawer is deliberately not in this round.** Settings'
Account section is specified for it and a new sidebar drawer is in flight;
`setDisplayName` is already the right shape, since it upserts and writes through.

**Verified without a browser**: typecheck clean, 235 assertions, the artifact
shows `profiles` with its `by_user` index and the two new handlers, every new
utility is in the live `/zero.css` (selectors printed and unescaped, exact
match), and the **real handlers** were driven over `POST /__spacefast/zero/run`
on a second `sf dev` at `--port 4199` — a blank name refused, whitespace
collapsed on the way in, a membership stamped with the account's name, a rename
reaching the member list, an unchanged rename touching only `profiles`, and the
grandfathering path confirmed by creating a household with no profile row and
watching `needsName` come back **false** with the inherited name.
**Nobody has clicked it.**

### Phase 4.12 — The sidebar drawer redesign ✅ (2026-08-27)

`.claude/docs/design/ui-directions.md` § *Settings tab*, drawn on
`.claude/docs/design/larderlogdrawerpreview.html` — five screens: the root pane,
the Members pane, changing a role, making an invite, and the account menu.
Governed by [D49](decisions.md#d49-settings-is-three-blocks-and-members-are-a-level-down).

**Client only.** No schema change, no new handler, no new query or mutation —
ten tables, five queries, seventeen mutations, exactly as Phase 4.11 left them.

- **The root pane is three blocks and a row.** *Household* (name and colour
  behind a pencil, with the item count in meta · a **Members** row with three
  stacked avatars and a chevron · *Leave household* inside the same card under a
  hairline) → *Preferences* (Appearance) → *Pantry settings* (the default
  low-stock threshold, now a stepper rather than a commit-on-blur field). The
  account row at the foot belongs to `Drawer`, not to the pane.
- **`MembersPane.tsx`** — the pushed second level, holding `MembersPanel` and
  `InvitesPanel` at the full 340. `Drawer` owns whether it is pushed, because
  the Filter / Settings tabs go while it is; a household switch pops it.
- **`RoleMenu.tsx`** — the role word is the trigger, cream when open, and the
  menu is `DrawerMenu`'s surface with a crimson check on the current value and
  *Remove from household* under a hairline. Nothing in it is disabled.
- **`AccountMenu.tsx`** — one component in two places, the drawer's foot row and
  the collapsed rail's account flyout. Identity row with a pencil that flips it
  in place into the composer's field, a hairline, and *Sign out*. **This is
  where the display name is edited**, which Phase 4.11 deliberately left out.
- **`DrawerMenu.tsx` / `DrawerAvatar.tsx` / `useDismiss.ts`** — the menu box and
  its hairline, the person on the drawer at five sizes, and the Escape +
  outside-press pair the switcher already had inline. `useDismiss`'s ref wraps
  the **trigger as well as the panel**, which is what keeps a press on the
  trigger from closing and reopening in one gesture.
- **`InvitesPanel.tsx`** is rebuilt: one card per invite with the role as its
  heading and a countdown rather than a date, a full-width link field, *Copy
  link* beside a ghost crimson *Revoke*, and the dashed *New invite* row that
  drops the composer in below itself. All but the newest card collapses to its
  header.
- **`Theme.drawer` gained `menu` and `menuLine`**; `controlStyles` gained
  `DRAWER_SUNK`, `DRAWER_SUNK_ON`, `DRAWER_CARD_ROW`, `DRAWER_MENU_ROW`,
  `DRAWER_MENU_ROW_DANGER`, `DRAWER_PRIMARY`, `DRAWER_STEPPER` and
  `DRAWER_CHIP_OUTLINE`, and lost `DRAWER_ICON_DANGER`, `DRAWER_CARD` and the
  on-drawer form of `DRAWER_GHOST_DANGER` along with the surfaces they described.

**Verified without a browser**: typecheck clean, 235 assertions, `sf dev` on
`--port 4199` compiles and serves, and **every** class literal in the twelve
touched files was checked against the live `/zero.css` by unescaping the sheet's
selectors and diffing — printed, not hand-written. **Nobody has clicked it.**

### Phase 4.13 — Add / edit item, redesigned ✅ (2026-08-28)

`.claude/docs/design/add-edit-item.md`, drawn on
`.claude/docs/design/larderlogaddedititem.html` — nine boards in both themes.
Governed by [D52](decisions.md#d52-an-item-has-a-size-and-a-size-is-a-pair-that-is-never-half-set)
(the size) and [D53](decisions.md#d53-some-things-are-never-shopped-for-and-that-is-a-property-of-the-item)
(off the shopping list).

**The fourth and fifth additive schema changes since Phase 2**, together in one
publish: `items.size`, `items.unit` and `items.offShoppingList`. Still ten tables, five
queries and seventeen mutations — no new handler, only three more fields through
the two that already existed.

- **The sheet reads as four sections, not one stack** — Item · Count ·
  Location / Store / Type · Notes, each a micro-label over its content and
  separated by a full-width `divider` hairline. The three taxonomies are three
  labelled groups under **one** rule, because they are one question asked three
  times. **The grouping is labels and rules, never a fill**: on this sheet a
  recessed panel already means *you are editing something* — it is the inline
  composer — and a second one that only grouped would make the composer stop
  meaning anything.
- **One field treatment.** `PAGE_FIELD` — the name, the size number, the unit
  trigger, both steppers and the notes box are the same object at six widths,
  and the border is `ink-muted` on a **contrast finding**, not a preference: the
  composer's old field border measured 2.80:1 on the panel and **2.45:1** on the
  sheet in dark, which is the same measurement that sent the shopping list's
  checkbox to this token.
- **`UnitMenu.tsx`** — the sort menu's construction unchanged, and the trigger is
  a *field* rather than a ghost because it sits on a form. Fourteen units in
  three groups behind *No size*; the abbreviation sits in the check's reserved
  slot on every row but the current one, so you learn that *Quart* prints as
  *qt* before committing to it. Caps at 320px, scrolls, and opens scrolled to
  the unit you are on.
- **On hand and Low at are matched peers.** *Low at* stops being a caption inside
  the on-hand control, which is most of why it was the hardest thing on the sheet
  to change. Both are symmetric and neutral — **neither takes the item card's ink
  plus**, because the sheet already has exactly one primary and it is *Save*.
- **The numeral is a text field**, which closes *Typing a quantity directly
  rather than stepping to it* for the sheet: stepping a low-at from 2 to 15 is
  thirteen taps and typing is one gesture. `useHoldRepeat.ts` adds an
  accelerating press-and-hold for anyone who does not find it — **the first step
  still comes from `onClick`**, so a tap fires once through the path that already
  works for a thumb, a mouse and the keyboard alike.
- **`Household default` rides the *Low at* sub-label** after a middot, rather
  than sitting under the field as the boards draw it — a line of its own made
  two side-by-side steppers unequal. It is **a statement about the number, not
  about whether you have touched it**: it shows on the Add sheet exactly while
  the value is still the household's, and **comes back if you step or type your
  way back to it**. The design's *disappears the moment the number is changed*
  was built first, as a one-way flag, and left the sheet silent about a value
  that *was* the default — which is the only thing the line is for.
- **A live status line, right of the `COUNT` label.** Dot and word in the status
  ramp's own colours, updating as either stepper moves. **This is what makes the
  threshold easy rather than merely bigger** — a threshold is an abstraction
  until you can watch it turn the item in front of you *Running low* — and it
  costs no vertical space, because the label row was half empty. It also forced
  a rule the docs had never written down: **`on hand == low at` is low**, which
  is what the build already did and now has a test.
- **`CheckBox.tsx`** is the shopping list's own 22px box, extracted rather than
  drawn twice, and used by *Keep off the shopping list* in the `COUNT` section.
- **The card gained two things**: the size beneath the name in meta 13 (not
  beside it — names are long), and a struck cart left of the status when the item
  is kept off the list. The status itself does not move.
- **The shopping-list row gained one**: the size riding with the name, before the
  badge. At the shelf *"Butter, 1 lb"* is one phrase.
- **`controlStyles` gained** `PAGE_FIELD`, `PAGE_STEPPER_CELL`, `PAGE_MENU`,
  `PAGE_MENU_ROW`, `PAGE_CHECKBOX_ROW` and the two `PAGE_FIELD_HALO_WITHIN`
  forms, **and lost `PAGE_BUTTON`** — the sheet's old asymmetric minus was its
  last caller. `digitField` gained a digit cap.

**Verified without a browser**: typecheck clean, **285 assertions** (46 new,
covering the size pair, the unit table's invariants, the exclusion's split from
`statusKeyFor`, and the threshold boundary), the artifact shows all three
columns on `items` with defaults and **zero migrations pending**, `sf dev` on
`--port 4199` compiles and serves, every new utility class is in the live
`/zero.css` — checked by printing and unescaping the sheet's own selectors — and
the **real handlers** were driven over `POST /__spacefast/zero/run`: a whole
pair stored, a unit with no number resolving to 1, a number with no unit and an
unknown unit key both resolving to neither, a unit-only patch keeping the number
it did not name, and `offShoppingList` set and cleared. **Nobody has clicked it.**

### Members have faces — 2026-08-28

[D55](decisions.md#d55-a-members-face-is-a-copy-on-the-membership-and-the-letter-is-not-a-fallback-to-be-ashamed-of).
**The sixth additive schema change since Phase 2**: `memberships.picture`, a
string defaulting to `''`. Ten tables and five queries still; **eighteen
mutations**, the new one being `syncAccountAvatar`. Applies on the next publish
with no flag, as the previous five did.

Only the account's *own* avatar had ever been a picture — the drawer's foot row,
the collapsed rail, the account menu, the first-run card. The Members pane and
Settings' stacked trio drew initials, and **nothing had decided that**:
`DrawerAvatar` has taken a `picture` since Phase 4.12 and calls the initial "the
fallback"; those rows were the one caller with nothing to pass. It read as
deliberate only because the boards draw a letter for everyone, your own row
included.

- **It stores a URL, so it stores no email.** `ctx.auth.picture` is already the
  finished Gravatar address and the server had never read it. That removed the
  only real objection — `ctx.gravatar.avatarUrl(email)` would have needed an
  address every member of a household could then read.
- **Stamped at the two moments it is in reach** — `createHousehold` and
  `redeemInvite`, through `accountAvatar(ctx)` beside the `accountName(ctx)`
  already there. The platform tells a handler about its caller, never a third
  party.
- **`syncAccountAvatar` is what makes it visible.** Write-once-at-join is wrong
  for the ordinary case (join, then set up a Gravatar) and useless for rows that
  predate the column, which hold `''` forever since nothing backfills (D44). It
  writes only rows that disagree and invalidates only when it wrote.
- **`onError` on both avatar components**, and it is load-bearing: the
  platform's URL carries `d=404`, so an account with no Gravatar serves no image
  and a bare `<img>` shows the broken-image glyph. Already true of your own
  avatar, never hit.
- **The stacked trio stays capped at three** with the count in words below it,
  and gets no "+2" bubble.

**Done when** a household with two Gravatar'd members and one without has been
looked at on a real screen — which is also the one open question, since a mixed
row of faces and letters may read worse than letters alone. `?members` seeds one
stand-in with a picture and one without for exactly that.

Verified without a browser: typecheck clean, **295 assertions**, the artifact
shows the column with its default and `db.migrations` empty, and the real
handlers were driven over `POST /__spacefast/zero/run` — the members DTO
carrying the column, the reconcile clearing a seeded value, and a second call
reporting `changedTables: []`. **Nobody has clicked it**, and the stamping half
cannot be clicked here at all: `sf dev` issues no `auth.picture`.

### The account row, and the first outbound link — 2026-08-28

[D56](decisions.md#d56-the-account-row-shows-a-name-and-a-face-never-an-address--and-change-your-picture-leaves-the-app).
Client only: no schema change, no handler moved.

**`auth.email` is empty in production by design** — it is the identity token's
`email` claim and a Spacefast account carries none, while `auth.picture` *is*
present (which is what makes D55 safe). Both render sites were already
*absent, not blank*, so nothing in production changed; what changed is that the
**dev guest stopped inventing an address**, having briefly made the local
account row a line taller than the published one.

**`Change your picture` ships** — the board's third row, previously marked *"Do
not build yet."* Its own block between the identity row and *Sign out*, pointing
at Gravatar's avatar editor, with the outbound arrow that means this leaves the
app. The app's first external link.

**Done when** somebody presses it and lands on the editor signed in. Verified
without a browser: typecheck clean, 295 assertions, all 32 class literals in the
touched component diffed against the live `/zero.css`, and the served
`/client.js` carrying the URL, both labels and the link hygiene.

### The front door says it is a beta — 2026-08-28

[D57](decisions.md#d57-the-beta-badge-is-on-the-front-door-only-and-not-in-the-app).
Client only: no schema change, no handler moved, no new `theme.json` token.

**The marketing page discloses the stage; the app shell does not repeat it.** A
`BETA` pill beside the wordmark in the nav and the footer, and nowhere else —
not the drawer header, not the mobile header row, not `<title>`, not the
manifest name, not the icon. It is the tag component with no dot: not focusable,
no press state, no tooltip, no link.

**Built the spec's way first and rejected.** The spec's rule is *the wordmark
never appears without it*, on the grounds that a marker on some screens and not
others stops being a disclosure. Sound about disclosure, wrong about audience —
a caveat is read once, when you are deciding, and a permanent pill above the
item grid re-serves it on every load to somebody who has already signed up. The
rule still holds within the marketing page, which is why the footer keeps it.

- **A fill one step off the ground, a `meta` edge, a `body` label**, all read
  off the theme. The fill separates at 1.10–1.45:1, so **the edge is the whole
  component**; it is the second after the shopping-list checkbox to borrow a
  text token for its border.
- **It scales off the wordmark's set size**, the way `HouseholdTile` derives its
  radius and letter, with the 9px label floor applied to the *input* so the 18px
  footer wordmark takes Small unchanged.
- **The nav is 20/24, not the spec's assumed 27**, so both its badges are small.

**Done when** it has been looked at — `?signedout` locally, or the published
front page. The cap-height alignment and the gap beside the italic `g` are
arguments made on paper. **The sign-in card and the `?join=` landing are now the
only signed-out surfaces without a marker**, which makes them the open question
rather than a deliberate exclusion; the invite landing has no wordmark to attach
one to.

Verified without a browser: typecheck clean, 322 assertions, `sf dev` on
`--port 4199` compiles and serves, and every class literal in the new component
was diffed against the live `/zero.css` by unescaping the sheet's own selectors.
**Nobody has clicked it.**

### The seeded types cover a supermarket — 2026-08-27

[D50](decisions.md#d50-the-seeded-types-are-a-supermarket-and-the-other-two-taxonomies-are-not),
amending D40. `shared/seed.ts` only — no schema change, no handler moved.

D40 seeded all three taxonomies on one rule, *generic so a household renames
rather than deletes*, and it was only right for two of them. A type is not a
shelf you name or a shop you choose; it is a kind of food, and those are the
same in every kitchen. **Nine became fourteen**, seeded for coverage rather
than as a vocabulary to make your own: Produce · Dairy · Meat · Baked Goods ·
Grains · Canned Goods · Condiments · Oils & Vinegars · Spices · Baking ·
Breakfast · Snacks · Beverages · Frozen Meals.

- Each earned its place against *would a household hold two or more things that
  fit here and nowhere else?*, which keeps *Oils & Vinegars* and drops *Sweets*,
  *Soups*, *Deli* and *Pet*. Non-food types were rejected rather than
  forgotten — the data model's own words are "what kind of *food* it is".
- **The names stay short.** Only **Protein → Meat** is a real rename; the rest
  of the nine merely pluralised. A first pass widened six into pairs
  (*Dairy & Eggs*, *Bread & Bakery*, …) and was reverted the same day.
- **Two colour tokens are left unspent** — `color-11` and `color-16` — because
  `proposeColor()` falls back to `color-1` once a group has taken them all, so
  seeding sixteen would make a household's own first type arrive wearing
  Produce's olive.
- **New households only.** Nothing backfills, and a backfill would have to
  reason about terms already renamed, recoloured or deleted on purpose.

**Verified**: typecheck clean, 239 assertions — two new, on the palette headroom
and on no two seeds in a group sharing a colour — and `createHousehold` driven
over `POST /__spacefast/zero/run` on a second `sf dev`, coming back with the
fourteen A–Z, stamped, distinctly coloured, and `color-11` / `color-16` free.

### The app opens where you left it — 2026-08-27

[D51](decisions.md#d51-the-app-opens-where-you-left-it-and-where-you-left-it-is-a-property-of-the-device).
**Client only** — no schema change, no handler moved, no new utility class.

`client/hooks/useViewState.ts` and a **fourth `localStorage` key**,
`larder.v4.<userId>.view`, after the theme (D25), the household (D33) and the
trip (D41). It restores **`drawerCollapsed`**, **`drawerTab`**, **all three
term-filter groups** and **the status pill**. The shopping-list mode was already
restored — D41 put it in the trip record beside the ticks, where it expires 24
hours after the last tick and clears on a household switch.

- **The prune effect's new `ready` guard is the load-bearing line.** The term
  lists are `[]` while `pantry` is in flight, so without it the effect runs once
  against nothing and drops every restored filter before the household it
  belongs to has arrived. With it, the effect that already handled a term
  someone else deleted also handles ids from a household this device has left —
  a row id belongs to exactly one household, so it is one rule, not two.
- **Restoring a filter is only safe because D45 shipped first.** An app that
  reopens three filters deep with no way to see them is one hiding most of your
  pantry for no stated reason.
- **The restore is render-time, not an effect** — `readViewState()` feeds the
  `useState` initialisers, so the first painted grid is already the restored
  one. It costs nothing, since the shell does not render until `api.status` is
  `ready`.
- **`drawerOpen` is deliberately not restored** — it is the mobile slide-over,
  and it is the flag the dock effect exists to clear. Neither is the search
  text, which is also what keeps the write cheap: the app's one high-frequency
  field never triggers a `setItem`.

**Verified**: typecheck clean, 239 assertions, `sf dev` recompiled, and the
served `/client.js` carries the `.view` key and both drawer fields. **Nobody has
clicked it** — and it is the change most worth clicking, since all of it is
about what the *second* load looks like.

**What else the view might remember is written up in
[notes.md](notes.md#product-questions)** — the sort, an in-progress add, how far
down you had scrolled, per-household filters, whether a filter should expire,
and which of it belongs to the account rather than the device.

### The app is installable — 2026-08-27

`site.webmanifest` at the project root, linked from `installAppIcon()`. **No
new artwork**: the three PNGs the icon README staged in August are correct as
they stand, and the maskable one was measured rather than assumed — its glyph
sits in a 181 × 226 box centred in the 512, so the furthest ink is 145px from
the centre against the 205px the 80% safe zone allows. Android can mask it to a
circle, a squircle or a teardrop and lose nothing.

- **The manifest is a real file, not a data URI**, which is the one place this
  breaks from how the icons and the webfonts get past Zero's missing head hook
  (D31). `start_url` and `scope` resolve against the **manifest's own URL**, and
  a `data:` URL is no base to resolve `/` from — both would fall back to
  whatever page the app was installed from, which for this app is often
  `/?join=<code>`. An expiring invite as the app's front door.
- **`purpose` is split across two icons, never combined.** `icon-192` and
  `icon-512` are `any` and keep their 22% rounding; `icon-maskable-512` is
  `maskable` and is full-bleed oat. Writing `"any maskable"` on one file is the
  usual mistake and would put the rounded corners inside Android's mask, which
  crops them again.
- **`background_color` is `#F3EADC`** — `canvas` in light, so the splash screen
  is the page it is about to become — and **`theme_color` is `#E2D5C0`**, the
  same oat the `theme-color` meta carries in light. A manifest colour cannot
  vary by scheme, so these two are the light values and the meta does the rest.
- **The `theme-color` meta is a pair now, and it follows the *app's* theme.**
  Dark is `#1F1912`, `canvas` exactly; light stays on the oat `#E2D5C0`, a
  deliberate half-step darker than the page. It cannot be a `media` attribute:
  the app's theme is not the OS's the moment a device overrides it (D25), and
  an installed app has no tab strip to absorb the difference — the status bar
  sits directly on the page. So `appIcon` exports `setThemeColor`, the boot
  value reads `prefers-color-scheme`, and **exactly one owner sets it after**:
  `Pantry` while signed in, the entry's `App` only while signed out. Effects
  run child-first, so an unguarded `App` would overwrite the override with the
  system value a tick later.
- **`short_name` is `Larder Log`**, not the `Larder` the icon README's own
  manifest block suggests. Ten characters fits an Android home-screen label
  without truncating, so there is nothing to shorten for, and the full name is
  what the app is called everywhere else.

**Two platform rules turned up on the way, both undocumented and both written up
in `.claude/docs/spacefast.md`:** `sf publish` mirrors the project root
**selectively** (`LICENSE.md` ships, `README.md` does not; `package-lock.json`
ships, `package.json` does not), and **being in the payload does not mean it
serves** — `theme.json` and `sf.jsonc` are staged in
`.spacefast/zero/public/` and 404 in production, because the edge hides the
platform's own config on top of D29's dot-prefix rule.

**Verified as far as it can be**: typecheck clean, 235 assertions, the compiled
`client.js` in the payload carries `link("manifest", MANIFEST)`, and
`site.webmanifest` is staged in `.spacefast/zero/public/`. **A manifest has no
local proxy at all** — `sf dev` serves no static files, so `/site.webmanifest`
comes back as the SPA shell and Chrome logs a parse error on every local load.
Whether it serves, with what content type, and whether a Pixel offers to install
it are **post-publish checks**. Nobody has installed it.

### Published: v8, v9, v10 — 2026-08-27

**v10** (`ver_0026484fd67c495b8d3b7d52b9215d67`) is live: the term composer's
swatch resolves a **legacy hex ink**. It had rendered `transparent` for any term
seeded before colour tokens (D32), which looked like a device bug — one phone
blank, another correct — because the two phones were signed in to different
households. `termColorFor()` is a token lookup; `themed()` is the ink resolver.

**v9** (`ver_61c3c5883290440d9e1234314788e14c`): a document-level
`<meta name="color-scheme" content="light dark">`, and the removal of the
temporary `/api/probe` endpoint — confirmed gone from the artifact and 404ing
in production even with its key. **v8** is the one that carried the schema:

### Published: v8 — 2026-08-27

`ver_09cc0c8a8bb34dd38ed92fae693c63d4`, 105 files, 16 seconds. Carries
everything below: D44's nine stamp columns, A-Z term ordering, and the device
fixes. The rationale-header shim was needed again — npm's `latest` is still
`spacefast@0.0.26`, which has no `--rationale` and reads no
`SPACEFAST_RATIONALE`.

Verified on the live space: `GET /` 200, `/api/status` -> `ok`, `/client.js`,
`/zero.css` and `/icons/*` serve, every new utility class present in the **live**
CSS, D29's 403s hold on `.claude/`, `.docs/`, `.env.server` and `.spacefast/`,
and `invitePreview` answers an unauthenticated caller correctly.

**The nine columns migrated additively, no flag** — but `sf db` prints
`Pending operations: 9` after doing it, because that line counts the migration's
own changelog rather than the queue. `sf db --json` -> `data.plan` is the field
that answers: `applied: true`, `pendingOperationCount: 0`, `appliedSchemaHash`
matching `schemaHash`. **Check `plan`, not the footer**, and note that the D42
check read the declared `tables` list instead, which would look the same either
way.

**D14's second hole is closed** — the one open since 2026-08-24. `shared/identity.ts`
accepts the identity `sf dev` issues, and whether a hosted runtime ever issues it
could not be tested until real people had signed in. Two have. The keyed
`/api/probe` reports `schemes ["account"], anyDevGuest false` in production and
`schemes ["guest"], anyDevGuest true` under `sf dev` — the second half is what
makes the first mean anything. The client-side half (D14 proper) was already
confirmed inert.

**`/api/probe` was removed in v9**, right after the reading above. Both
questions it was built for are answered and its own comment said *REMOVE once
read*.

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

### Phase 4.15a — A source carries a kind ✅ (2026-08-29)

`.claude/docs/design/garden-and-kitchen.md`, drawn on
`.claude/docs/design/larderloggardenkitchenboards.html` — six boards on two
pages, light theme only. Governed by
[D58](decisions.md#d58-a-source-carries-a-kind-and-the-group-is-named-for-what-it-holds).

**The first of three builds from that document**, and the foundation the other
two read: the run list's three bands and the item side's season and ingredients
both need this column to exist first.

**The seventh additive schema change since Phase 2**: `stores.kind`, defaulting
to `''`. Ten tables and five queries still; **nineteen mutations**, the new one
being `setSourceKind`.

- **A store carries a kind — shop, grow or make.** It is a property of the
  *term*, so *The Garden* is a term like any other: a colour, a name, a count, a
  chip that filters, a tag on an item card. **The drawer never learns what a kind
  is** — filtering by The Garden works identically to filtering by Publix, and
  the item card did not change at all.
- **The group renames itself** — `Store`, or `Source` once one of them is not a
  shop. Five places move together: the Filter tab's heading, the dashed chip, the
  editing panel's micro-label, the item sheet's group label, and the
  blocked-delete dialog, which the design doc does not name and which would
  otherwise contradict the heading it opened from. The rail's flyout label moves
  with them; **its storefront glyph deliberately does not**.
- **`SourceKindMenu` is `RoleMenu` with different words in it**, and the trigger
  is the glyph rather than a word — a 340px row cannot spend a slot on *Shop*.
  Shop sits at the drawer's rest colour, grow and make brighten, so a glance down
  the panel says which rows are not shops.
- **The item count left the editing row**, which is D36's own delta and a
  consequence of the glyph taking its slot. The blocked dialog is where the
  outcome is explained now.
- **Undo carries the kind back.** `createTerm` takes it on that path only, for
  the reason it takes the stamps (D44): undo is a re-insert, and a restored
  garden coming back a shop is a silent change to a row somebody asked to have
  back exactly as it was.

**The run list landed on 2026-08-29** — see *Phase 4.15b* below.

**Two things landed with the revised spec on 2026-08-29.** The item card gained
**one glyph** — sprout or pot, leftmost in a `glyph · dot · chevron` cluster, a
bought item carrying none. The first spec said the card changed *not at all*;
the glyph adds *what kind*, which the tag cannot say. And **every editing panel
gained a way to add a term** — a gap that was not this feature's: the dashed
chip is hidden while editing, which left the Filter pane as the one place you
could rename, recolour and delete a term but not make one.

**Verified without a browser**: typecheck clean, **353 assertions** (31 new,
covering `toSourceKind`'s fallbacks and every branch of the group-word rule
including the gardens-only case that separates it from the design doc's prose),
the artifact shows `stores.kind` with `default: ""` alongside `setSourceKind`
among nineteen mutations and `db.migrations` empty, every class literal in the
four touched files was diffed against a live `/zero.css` by unescaping the
sheet's own selectors — printed, never hand-written — and the **real handlers**
were driven over `POST /__spacefast/zero/run` on a throwaway `sf dev --port
4199`: seeded stores resolving `''` to `shop`, a new source arriving as a shop,
shop → grow → shop, a repeat write reporting `changedTables: []` *and*
`changedQueries: []`, a bogus kind refused, a bogus kind on create landing as a
shop, a cross-household id refused, the kind surviving a create, and the blocked
dialog saying **"A source can only be deleted once nothing uses it"** because
the household held a `make` source.

**Nobody has clicked it.** The one thing worth a thumb is the menu, which is the
only new surface.

### Phase 4.15b — The run list ✅ (2026-08-29)

The second of three builds from `.claude/docs/design/garden-and-kitchen.md`, and
the only one with no schema at all. Ten tables, five queries, nineteen mutations.

**Four files were renamed rather than re-explained** — `shared/shoppingList.ts`
→ `runList.ts`, `shoppingGroups` → `runBands`, and both components — because
what they render genuinely changed. **Nothing about a card did**: same 460px
`auto-fill` grid, same header, same rows, same trip bar. What is new is a band
around them.

- **Three bands, present only when they hold something**, always Buy · Harvest ·
  Make. **A household with nothing but shops sees one band, no headers and no
  segment** — today's shopping list byte for byte, which is most of why this
  shape won over the two that lost.
- **An item can be on two bands**, because it appears under every source it
  names and a source carries a kind. Each band counts it once, so the bands do
  not sum to the total — the same rule that already stopped the store cards
  summing to it.
- **`needsBuying` gates every band**, which narrows what D53's *Keep off the
  list* is for. It was written for "the things a household grows or brews"; a
  grow source says that better and says which. What is left is the genuine
  override, and the label lost the word *shopping*.
- **The trigger says `To get`.** *Shopping list* stopped being true the moment
  three of the seventeen were things you pick.
- **`All` is the default and the whole design** — the banded screen, so the
  carrots for the stock are two bands above it.

**Two forced departures.** The **Make card is a Buy card**, because its second
line needs a recipe and recipes are not being built (D59) — board 1 draws the
taller form and is drawing the mockup. And **below the measured column the
segment takes its own row**, because row 2's left slot owns the slack there and
giving it up would move the trigger on press. That costs a fifth row at 390 and
wants a real phone.

**368 assertions**, typecheck clean, every class literal diffed against a live
`/zero.css`. **Nobody has clicked it, and `?demo` cannot show it** — the seeded
sources are all shops. Extending the fixture is the obvious fix and was not
done: its distribution is pinned by `npm test` on purpose.

### Phase 4.15c — The item side ✅ (2026-08-29)

The last of three, and the one that shrank most when the spec was revised.
**`items.seasonFrom` and `items.seasonTo` are the whole schema cost** — the
eighth additive change since Phase 2 — because
[D59](decisions.md#d59-processes-depend-on-the-pantry-the-pantry-depends-on-nothing)
settles that a recipe references items and nothing references back, so **there
is no `itemIngredients` table and no ingredient panel on an item**.

- **`shared/season.ts`** — months rather than dates, and a pair that is never
  half-set. `normalizeSeason` **discards a half rather than completing it**;
  completing means guessing a value nobody typed. **The range wraps**, which is
  the case worth a test: November to February read literally is empty, and would
  move an item to `NOT YET` every month of the year.
- **`NOT YET`** is a sub-group at the foot of a harvest card, losing exactly the
  checkbox and the status badge. **Its rows do not count** toward the band or
  the trigger — **but the item is unchanged**, still *out* on its card and still
  in the status pills. The one place those numbers deliberately disagree.
- **Only the harvest card is affected**: something you buy *and* grow is still on
  the Buy card out of season, counted once by the band it is really on.
- **The season panel is the inline composer** and **`MonthMenu` is `UnitMenu`
  with twelve rows**. Nothing new was drawn.
- **`MADE BY` is a statement, not an empty state** — no icon, no amber, nothing
  to press. Make items only.

**The item card wears every kind it has**, one glyph per kind in band order,
amending the phase's own first pass. **The off-list marker stopped being a
struck cart**: a cart is now the shop kind's glyph, and the strike was claiming
the wrong thing anyway now that `needsBuying` gates all three bands.

**419 assertions**, typecheck clean, the artifact carries both columns with
`db.migrations` empty, and the real handlers were driven over
`POST /__spacefast/zero/run` — a whole pair, both half-set cases, a bogus month,
a one-sided patch reading the other half off the row, `11`–`2` surviving
storage, and clearing one half clearing the pair.

**That completes the document's v1.** Everything left in it — recipes, the
ingredient panel, quantities, units and the picker — is a marked mockup under
D59.

### The off-list checkbox is retired ✅ (2026-08-29)

[D60](decisions.md#d60-the-off-list-checkbox-is-retired-and-the-column-is-kept),
amending D53. **Client only, and no migration.** A source's kind answers the
question the checkbox was invented for and answers it better — you grow it, you
make it, or you buy it — and the checkbox says it worse, because it hides an
item from the list without saying where it went.

`items.offShoppingList` stays and `needsBuying` still reads it, so rows ticked
before today behave exactly as they did. **The control is a way out, not a way
in**: the sheet draws it only on an item that already carries the flag, so it
can be cleared and never set, and the flag drains out of the database rather
than being migrated out from under anyone. Putting it back is deleting one
condition.

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

- ~~**A `site.webmanifest`.**~~ **Built 2026-08-27** — see *The app is
  installable* below. The 192/512/maskable PNGs it was staged for needed no
  changes.
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

### First run asks where your food comes from ✅ (2026-08-29)

[D61](decisions.md#d61-first-run-asks-where-your-food-comes-from-and-the-answer-is-what-seeds-the-sources),
amending D40 and D58. **Client and one handler argument; no schema change** —
`stores.kind` shipped with D58 and this writes it at seed time. Ten tables, five
queries, nineteen mutations, `db.migrations` empty.

D58 gave a source a kind and left every household to discover it. **Three
checkboxes on the creation card** ask instead, under `WHERE YOUR FOOD COMES
FROM`: *We buy it* (ticked) seeds Grocery · Warehouse · Market as shops, *We
grow some of it* seeds **Garden** at fern, *We make some of it* seeds
**Kitchen** at mulberry.

- **`SourceMixRows.tsx` is on both creation surfaces** — `FirstRun` and
  `NewHouseholdDialog` — though the boards draw only the first. The second
  household is as likely to be the one with the garden.
- **It does not break *one field, one button, nothing else***: that rule was
  written against a preview that *explained* the seeded terms, and this *asks*
  the one thing the app cannot infer. **Enter still finishes the screen**,
  because the defaults are the household that existed before the question did.
- **Nothing is required.** Untick all three and you get the locations and types
  and no sources — not a dead end, because `itemStores` is a join table, and the
  cleanest version of the *seed no stores* question open in `notes.md` since
  D40. That note is now closed.
- **An absent mix and an empty one are different answers.** `undefined` takes
  the buy-only default; an explicit all-false seeds nothing. Truthiness is not a
  tick.
- **No definite article** — *Garden*, not *The Garden*, unlike how D58 and the
  design doc write them in prose.
- **This retires D58's line** that a new household is a `STORE` household on day
  one. Whether anyone meets the word *Source* is now an answer.

**445 assertions** (26 new), typecheck clean, the artifact shows no migration,
all 70 class literals diffed against a live `/zero.css`, and `createHousehold`
was driven over `POST /__spacefast/zero/run` across all eight branches including
**the argument omitted**, which still seeds exactly three shops.

### Restock — the trip that ends ✅ (2026-08-31)

[D64](decisions.md#d64-a-check-is-a-claim-and-the-count-is-written-once-at-the-shelf),
amending D41. **One schema change**: `restocks`, the twelfth table. Thirteen
queries, **twenty-six** mutations, `db.migrations` empty, `/api/status` still
the only endpoint.

The trip bar's right half has been drawn empty since the shopping list was
first specified, reserved for the honest end of *it's in the cart*: **setting
the count when you unpack**. This is that.

- **A check is a claim, not a write.** The app cannot know whether you came home
  with a four-pack or a single, so it stops guessing and asks once, on a screen
  you are looking at while standing in front of the shelf.
- **The prefill is `max(low at + 1, on hand + 1)`** — the smallest thing that is
  certainly true. The second half is not redundant: an item already above its
  threshold would otherwise prefill to a step *down*.
- **The stepper asks *how many do you have now***, which makes the put-away
  **the only self-correcting moment in the product** — and is why the log may
  only ever promise intervals, never rates.
- **`restockItems` is one mutation** and resolves every row before writing any,
  because a put-away is several writes that mean one thing from a phone in a
  car park.
- **The bar keeps one shape at every count.** Three controls, the ghosts left
  and the write right, glyph-only ghosts at 390. The 70px green completion
  variant is deleted and its disc moved to the screen *after* the trip.
- **`restocks` records no `userId`.** A name rides the trip, which is transient;
  nothing in the larder ever records who touched a thing.

**Deferred by request: shared claims** — *in Sarah's cart* — and with it the
`N in your cart` wording. **Unbuilt and optional in the document itself:** the
`Always` / `Never` tri-state and trends tier 2, which the log now collects for.

**671 assertions** (23 new), typecheck clean, the artifact at twelve tables and
twenty-six mutations with no migration, 433 class literals diffed against the
freshly built `zero.css` and the check proved to discriminate, and the real
handler driven over `POST /__spacefast/zero/run` — the doc's own three-row trip
written and read back, a bogus id refusing the whole call with its neighbour
untouched, a viewer refused, and both cascades watched to actually delete.

### The list override is a tri-state ✅ (2026-08-31)

[D65](decisions.md#d65-the-list-override-is-a-tri-state-and-it-lives-where-low-at-is-set),
amending D53 and completing D60. **One schema change**: `items.listRule`.
Twelve tables, thirteen queries, twenty-six mutations, `db.migrations` empty.

*Low at* is the sentence **put this on the list when I'm down to N**, and both
overrides amend it — so **Automatic · Always · Never** sits under the two
steppers, where the sentence is set.

- **It closes what D53 could only half-answer.** D60 retired D53's checkbox and
  left a control that could subtract and never add; the question none of them
  answered is the opposite one — the thing you want on the list whatever the
  count says.
- **`listRuleOf` folds the retired `offShoppingList` in as `never`**, and an
  edit through the segment drains it in the same patch. That is what finally
  makes D60's *the flag drains out as people meet it* happen.
- **`always` outranks the count and never the season.** An out-of-season harvest
  row still files under `NOT YET`, and the pills never move — they count stock.
- **`EXTRA`** fills the badge slot a pinned row leaves free, quiet by having no
  hue at all. A row that is genuinely low or out keeps its status.
- **The copy is not the design's.** Built as drawn it read as unclear, so the
  hints now name the list this item actually lands on — *shopping*, *harvest*,
  *make*, or both — follow the source chips live, and say **stock** rather than
  *count*. The segment gained a sub-label for the same reason: the two steppers
  beside it name their fields and it named nothing. **And the hint carries no caveat**,
  because the behaviour moved to match the label rather than the sentence
  stretching to excuse it.
- **`always` means always**, which overrules D64's *clears on the put-away*.
  That rule asked when the pin should end and never whether it should; a control
  labelled Always that stops after one trip makes the word lie. Nothing ends a
  pin now but somebody setting it back.
- The card's `ListX` follows the rule now and **`always` gets no marker**, so
  the four-glyph cluster the design prices is not created.

**719 assertions** (48 new), typecheck clean, the artifact showing the column
with `default: ""` and no migration, 532 class literals diffed with 0 absent,
and the real handlers driven across all four values including the drain, the
put-away clear, and a viewer refused. **Both new rules were proved by
mutation**: deleting the legacy fold fails 6 assertions, making `always` beat
the season fails 2.

**Trends tier 2 is the last unbuilt piece of `restock.md`**, and the `restocks`
log is collecting for it — **decided against for now** on 2026-08-31, because
the log records put-aways and two of the three ways to raise a count write
nothing, so *you restock this every three weeks* would be a confident sentence
about a biased sample. See D65's *Open* and the note in D64.

**Both phases were used on 2026-08-31 and read correctly** — on the first pass,
which no phase of this size has managed before. **390 and a twenty-row put-away
are what that session did not cover.**

### Claims are shared, and that stops the double-buy ✅ (2026-08-31)

[D66](decisions.md#d66-a-claim-says-whose-and-that-is-what-stops-the-double-buy),
completing D64 and replacing D41's *checks are local* outright. **Two schema
changes**: `trips` and `claims`. Fourteen tables, fourteen queries, twenty-eight
mutations, `db.migrations` empty.

D41 refused to share ticks because *a tick that means "in my cart" cannot be
read by someone else without saying whose*. **So it says whose** — and the
collision that rule was avoiding is the feature, because it is what stops the
double-buy.

- **A claim is not a write**, which is what makes sharing safe: it says somebody
  intends to get the item and the count is still written once, at the put-away.
- **The trip is a row** so the twenty-four hours run from the last tick rather
  than the first, and so `restocks.tripId` becomes a real id.
- **Neither table stores a name.** A `userId` and the `household` query's members
  are enough, so nothing in the larder records who touched a thing and a trip
  goes with the account.
- **`claims` is its own query** — a tick must not refetch every member's pantry.
- **Yours only** for `Hide N checked`, `Put N away` and `N in your cart`. You
  cannot put away what you do not have.
- **The tick column became the answer** — empty box, your check, or their face —
  which is a knowing departure from the design's *leave it empty*, and the thing
  that finally made the row read.
- **A real Gravatar with an initial fallback** (D55), which the first pass got
  wrong by drawing a letter unconditionally.

**745 assertions** (26 new), typecheck clean, the artifact showing both tables
with no migration pending, and the real handlers driven **as two named dev
guests at once**: the refusal on somebody else's row, the no-op on your own, a
put-away ending one trip and leaving the other standing, and every cascade
watched to actually delete.

**Trends tier 2 is the last unbuilt piece of `restock.md` and is decided
against for now** — the log records put-aways, and two of the three ways to
raise a count write nothing.

### Bulk entry — the adoption wall ✅ (2026-08-31)

`.claude/docs/design/bulk-entry.md`, governed by
[D67](decisions.md#d67-bulk-entry-is-two-sources-one-review-and-one-write).
**No schema change** — fourteen tables, fourteen queries, **twenty-nine**
mutations, the new one being `addItems`.

Twenty items is a sample dataset and a real pantry is two hundred. Every screen
this app has been judged on was judged with a pantry somebody had already
entered, which is exactly why the wall is invisible from inside a design
document.

- **Two sources, one review, one write.** A paste dialog and a common-items
  checklist both land on the same review table, and **nothing is written until
  Add**. That is what lets the checklist tick thirty-one things without putting
  thirty-one rows on the shopping list on day one — counts default to 1 on the
  review rather than 0 at the tick.
- **The way in is a split on the primary**, the app's first split control. The
  label opens the Add sheet unchanged; the chevron holds the other routes. Three
  rounds of fitting *many* into the Add sheet lost to one objection: the sheet is
  for one item.
- **At 390 the chevron joins the pinned bar**, which is a knowing departure from
  the board and the answer to the one number the design flags as most likely
  wrong — the 34px cell was under the 44px floor.
- **The parse works from the end**, guesses no shelf, shop or type, and never
  claims the whole line. **`Set for checked`** is what keeps the review from
  being three chips × two hundred rows. The review is **A–Z**, sorted once when
  the batch arrives; the **count is the app's stepper**, and the **name is not
  editable** — built and removed the same day, since correcting a word belongs
  to the Add sheet.
- **`addItems` resolves every draft before writing any**, so a refusal leaves
  the table exactly as it was. **No undo, a plain toast**, which answers the
  design's own first open question.

**807 assertions** (61 new), typecheck clean, the artifact non-migrating, the
data model diffed against it, and the real handler driven over
`POST /__spacefast/zero/run` — including the resolve-first guarantee measured
rather than asserted, a viewer refused, and a cross-household location refused.
**All four new rules were proved by mutation**, and one of those mutations
initially passed, which found a real gap in the duplicate test.

**`Save and add another` was built and removed the same day** — the Add sheet's
footer is too cramped for a third control. `ItemSheet.tsx` is byte-identical to
what it was before the work.

**Nobody has clicked it.**
