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

## Phase 1 — Zero scaffold and sign-in gate

- `sf init larder-log --runtime zero`, `sf.jsonc`, `theme.json`
- Port the component tree from `src/` to `client/` (Preact, `class`, `onInput`)
- Sign-in gate: guests see only a sign-in screen
- Auto-create a household + seed taxonomies on a user's first sign-in
- Data still in-memory/localStorage; **no schema yet**

**Done when:** signing in with Gravatar shows the pantry UI, and signing out
returns to the gate.

## Phase 2 — Real data layer

- Declare the full schema from [data-model.md](data-model.md)
- `requireHousehold()` helper; every handler resolves the household server-side
- `pantry` and `household` queries; item and taxonomy mutations
- Replace `usePersistentState` with `useQuery` / `useMutation`
- Server-side validation and integer clamping for `qty` / `threshold`
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

- Household switching UI (schema already supports it; only the UI is missing)
- Item photos via Zero storage
- Multiple households per person
- Roles beyond owner/member
- Barcode scanning
