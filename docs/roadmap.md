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
[spacefast.md](../.claude/docs/spacefast.md) and
[the bug report](../.claude/docs/spacefast-bug-2026-08-24.md).

## Phase 2 — Real data layer ✅

- ✅ Full schema from [data-model.md](data-model.md), in `server/schema.ts`
- ✅ `requireMembership()` / `requireCapability()` in `server/auth.ts` — every
  handler resolves the household server-side and asserts a capability
- ✅ `pantry` and `household` queries; item, taxonomy, invite, and membership
  mutations, all declaring `invalidate()`
- ✅ Server-side validation and clamping, reusing `shared/qty.ts` — plus
  `shared/term.ts` (names, ink), `shared/icons.ts` (D23), `shared/invite.ts`
  (codes, expiry), `shared/roles.ts` (D20 capabilities)
- ✅ Platform spike: six unknowns answered, recorded in [notes](notes.md) and
  `.claude/docs/spacefast.md`
- ✅ `npm test` — 66 assertions over `shared/`, no runner needed
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

**Still unverified, and it needs the published space:** anything touching real
sign-in, and the two-browser live-query test. `sf dev` issues one fixed identity
(`guest:local`), so a second local tab is the same user — enough to watch a
mutation propagate, not enough to test two members of a household.

**This was the risky milestone.** Schema mistakes get expensive from here, since
destructive migrations need explicit flags.

## Phase 3 — Households, members, invites

- `createInvite` / `revokeInvite` / `redeemInvite` — each invite carries the
  role it grants ([D21](decisions.md#d21-invites-carry-the-role-they-grant)) and
  expires after 14 days
  ([D24](decisions.md#d24-invites-expire-after-14-days))
- `/join/<code>` route
- Member list in Settings, with `changeRole` / `removeMember` / `leaveHousehold`
- `shared/roles.ts` — the `can(role, capability)` matrix
  ([D20](decisions.md#d20-three-roles-owner-editor-viewer)) — and a role check
  in every mutation that writes
- Last-owner and no-escalation guards
  ([D22](decisions.md#d22-ownership-is-a-role-not-a-column))
- Issue `owner` and `editor` invites only; `viewer` waits on Phase 4's
  read-only UI. **Note the consequence:** editors may mint viewer invites and
  nothing else ([D21](decisions.md#d21-invites-carry-the-role-they-grant)), so
  until viewer goes live in Phase 4 the `invite:create` capability is dormant
  for editors and invite creation is effectively owner-only. Build the
  capability check properly anyway — it wakes up on its own when viewer ships

**Done when:** Justin's wife signs in via an invite link and edits the same
pantry.

## Phase 4 — Feature parity and polish

Everything the prototype does that Phases 1–3 didn't carry over:

- Shopping list per store
- Sorting, search, infinite scroll at real row counts
- Undo on remove (needs a server-side soft delete or a client-held tombstone —
  the prototype's in-memory undo won't survive a live query refresh)
- Cascade cleanup on taxonomy delete
- **Read-only UI pass, which is what makes `viewer` usable** — steppers, inline
  edit, the taxonomy manager, and every add/remove affordance need a disabled
  state. The enforcement already shipped in Phase 3; this is the client half
  ([D20](decisions.md#d20-three-roles-owner-editor-viewer))
- Theme override persistence (per device, so localStorage is correct here)
- Typography: Fraunces and IBM Plex Mono have **no way to load** — confirmed on
  the published space, where `zero.css` ships zero `@font-face` rules. Either
  accept the `ui-serif` / `ui-monospace` fallbacks as the app's real identity or
  wait for Spacefast to offer a font mechanism — see [notes](notes.md)

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
