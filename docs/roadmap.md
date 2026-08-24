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

## Phase 1 — Zero scaffold and sign-in gate ⚠️ built; sign-in itself unverified

- ✅ `spacefast` CLI pinned as a devDependency (`sf`), `sf.jsonc`, `theme.json`
- ✅ Component tree ported from `src/` to `client/` — Preact, `class`,
  `onInput`, TypeScript, with the domain types and pure helpers in `shared/`
- ✅ Sign-in gate: guests see only a sign-in screen; sign-out lives in Settings
- ✅ First-run seeding: a signed-in identity with nothing stored falls through
  to the sample taxonomies and items
- ✅ Data still in localStorage, namespaced per identity; **no schema yet**
  (`capsule({ schema: {} })` is legal and compiles)
- ✅ Loopback-only dev bypass so the app is reachable on `sf dev`, with a
  persistent "Dev guest · not signed in" badge whenever it is in effect
  ([D14](decisions.md#d14-a-loopback-only-bypass-in-the-sign-in-gate))

**Verified:** `tsc --noEmit` clean across 27 files; `sf dev` compiles the
capsule and serves it (~93 KB `client.js`, 40 KB `zero.css`); every Tailwind
class used — arbitrary values and responsive variants included — compiles;
`theme.json` colors and font families become real tokens; `GET /api/status`
returns `ok`.

**Not verified:** the "done when" below, and it needs a publish. `sf dev` has no
sign-in flow (`signInPath` and `signInUrl` are both null), so Gravatar sign-in,
`signOut()` returning to the gate, and a real `useAuth()` identity are all
untested — the bypass sidesteps authentication rather than exercising it. There
is also no browser in the working environment, so nothing requiring real
interaction — clicks, drawer animation, the IntersectionObserver infinite
scroll, dark mode — has been exercised.

**Done when:** signing in with Gravatar shows the pantry UI, and signing out
returns to the gate.

**Suggested next:** an early `sf publish` to an anonymous space. It closes the
"done when" above and gives Phase 2 the live space its two-browser test needs,
before the schema is the thing being debugged.

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
edits live, and a reload loses nothing.

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
- Typography: decide what to do about Fraunces and IBM Plex Mono, which
  currently have no way to load — see [notes](notes.md)

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
