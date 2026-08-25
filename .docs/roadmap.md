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
  `shared/term.ts` (names, ink), `shared/icons.ts` (D23), `shared/invite.ts`
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
- ✅ `npm test` — 100 assertions; `npm run typecheck` clean; the artifact still
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
- ✅ Typography — Fraunces, Inter, and IBM Plex Mono load from Google Fonts via
  a `<link>` that `client/lib/fonts.ts` appends at boot, because Zero has no way
  to declare a webfont and `sf dev` cannot serve a self-hosted one
  ([D31](decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google)).
  **Verified rendering in a browser on 2026-08-25** under `sf dev` — Fraunces
  paints the headers, not the `ui-serif` fallback. Unverified only on the
  published space, which runs the same remote URL

**What is actually left:** the row-count test for sort/search/scroll, the
typography decision, and a browser pass over the read-only UI — none of which
can be finished without either real data or the published space.

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

- Household switching UI (schema already supports it; only the UI is missing —
  and queries can take arguments, so a household id can be a query parameter).
  Households are already named and the name already has a home in the header
  ([D3](decisions.md#d3-multi-household-schema-single-household-ui)), so the
  switcher is a control, not a data change
- Item photos via Zero storage
- Multiple households per person
- Roles beyond owner/editor/viewer — a contributor tier, per-location
  permissions ([D20](decisions.md#d20-three-roles-owner-editor-viewer) settled
  the base set)
- Barcode scanning
