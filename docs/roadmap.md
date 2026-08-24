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

## Phase 2 — Real data layer

- Declare the full schema from [data-model.md](data-model.md)
- `requireHousehold()` helper; every handler resolves the household server-side
- `pantry` and `household` queries; item and taxonomy mutations
- Replace `usePersistentState` with `useQuery` / `useMutation`
- Server-side validation and integer clamping for `qty` / `threshold` — reuse
  `normalizeQty` from `shared/qty.ts` rather than writing the rule twice
- **Convert taxonomy references from names to ids** — the largest single piece
  of this phase; see [notes](notes.md#known-cost-carried-into-phase-2)
- Retire the Vite app and its localStorage code

**Done when:** two browsers signed in as the same identity see each other's
edits live, and a reload loses nothing. The live space this needs now exists.

**This is the risky milestone.** Schema mistakes get expensive after it, since
destructive migrations need explicit flags.

## Phase 3 — Households, members, invites

- `createInvite` / `revokeInvite` / `redeemInvite`
- `/join/<code>` route
- Member list in Settings
- Real two-person test: both accounts editing the same household at once

**Done when:** Justin's wife signs in via an invite link and edits the same
pantry.

## Phase 4 — Feature parity and polish

Everything the prototype does that Phases 1–3 didn't carry over:

- Shopping list per store
- Sorting, search, infinite scroll at real row counts
- Undo on remove (needs a server-side soft delete or a client-held tombstone —
  the prototype's in-memory undo won't survive a live query refresh)
- Cascade cleanup on taxonomy delete
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
  and queries can take arguments, so a household id can be a query parameter)
- Item photos via Zero storage
- Multiple households per person
- Roles beyond owner/member
- Barcode scanning
