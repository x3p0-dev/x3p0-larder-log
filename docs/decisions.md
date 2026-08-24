# Decisions

Choices we've made and the reasoning, so we don't relitigate them by accident.
Newest at the bottom.

---

## D1. Spacefast Zero as the platform

**Decided:** 2026-08-24

The app needs a database, sign-in for two people, and live updates across
devices. Zero supplies all three with no infrastructure to operate, and
publishing is one command.

**Trade-off accepted:** we inherit Zero's constraints wholesale — no numeric
column type, no arrays, no row-level security, Preact rather than React. Those
are real and shape the data model.

---

## D2. Require sign-in; no guest mode

**Decided:** 2026-08-24

Zero gives every visitor a guest identity that could own rows, which would allow
a try-before-you-sign-in experience. We're not doing that.

**Why:** it introduces an adoption problem — when a guest signs in, do their
guest-owned rows migrate to the new identity, get discarded, or merge? Every
answer is work, and none of it serves the primary use case of two people who
will sign in once and stay signed in.

**Consequence:** the sign-in gate is the entire unauthenticated surface.
Revisit only if we ever want strangers to evaluate the app.

---

## D3. Multi-household schema, single-household UI

**Decided:** 2026-08-24

Every row carries `householdId` from the first migration, but v1 ships no
household switcher. The UI assumes "your household".

**Why:** retrofitting a scoping column onto existing rows requires a destructive
migration, which Zero deliberately makes awkward. Adding a switcher later is
purely additive. Pay the cheap cost now to avoid the expensive one later.

---

## D4. Numbers are strings

**Decided:** 2026-08-24 · **Forced by the platform**

Zero's schema types are `string()`, `boolean()`, and `id(table)`. There is no
numeric type. `qty` and `threshold` are stored as decimal strings.

**Rules that follow:** parse on read through a single helper, validate and clamp
on the server, and never sort by these fields in the database (string ordering
puts "10" before "2" — quantity sorting is client-side).

**Rejected:** zero-padded strings. They'd make database sorting correct but leak
an encoding detail into every read and every write.

---

## D5. Join tables for many-to-many

**Decided:** 2026-08-24 · **Forced by the platform**

No array or JSON field type exists, so the prototype's `item.types[]` and
`item.stores[]` become `itemTypes` and `itemStores` join tables.

**Consequence:** reading an item's full shape means joining, and writing one
means reconciling join rows. `householdId` is denormalized onto the join tables
so household-scoped reads and cleanup don't have to walk through `items`.

---

## D6. Invite links with a join code

**Decided:** 2026-08-24

Membership is granted by opening `/join/<code>` while signed in.

**Why not email invites:** sign-in is Gravatar-based, so the address someone
signs in with may not be the one you'd type into an invite form. A link works
regardless of which identity they land on.

**Consequence:** the code is a bearer credential. It must be revocable, and we
should think about whether it expires.

---

## D7. Keep the prototype's theme system; don't adopt the kit wholesale

**Decided:** 2026-08-24

`@spacefast/zero/kit` provides `Button`, `Card`, `Input`, `Badge`, and Lucide
icons. We use it where it's generic, but keep the hand-rolled "ink → tint/ring"
color derivation from the prototype.

**Why:** that color system is the app's visual identity — every location, type,
store, and status derives its palette from a single hex. A generic component kit
can't express it.

---

## D8. Port the Vite prototype, then retire it

**Decided:** 2026-08-24

The React/Vite app in `src/` moves into `client/` and is deleted, rather than
being kept as a parallel design sandbox.

**Why:** two codebases drift, and the prototype's value was settling the
interaction design, which it has done. The mockup `.jsx` stays as the design
reference.

---

## D9. Status is derived, never stored

**Decided:** 2026-08-24

`out` / `low` / `ok` is computed from `qty` and `threshold` at render time.

**Why:** a stored status is a second source of truth that drifts the moment
someone edits a threshold. The computation is trivial.

---

## D10. TypeScript for the port, with the domain types in `shared/`

**Decided:** 2026-08-24

The prototype is plain JS/JSX. The port to `client/` is TypeScript, and the
domain vocabulary (`Item`, `Term`, `Settings`) plus the pure helpers (`toInt`,
`statusKeyFor`) live in `shared/`, which both the client and the capsule import.

**Why:** this codebase encodes numbers as strings and joins taxonomies by name,
which are exactly the mistakes a type checker catches and a reviewer doesn't.
`shared/` is also where the server's validation has to live in Phase 2 — a
mutation that clamps `qty` should call the same `normalizeQty` the form does,
not a second copy of the rule.

`npm run typecheck` (`tsc --noEmit`) is now the cheapest real verification this
project has, since there is no test runner.

**Rejected:** porting as plain `.jsx`. It would have been a faster afternoon and
a worse Phase 2.

---

## D11. `lucide-preact` directly, not the kit's `Icon`

**Decided:** 2026-08-24

[Architecture](architecture.md) originally said icons would come from `Icon` in
`@spacefast/zero/kit`. They come from `lucide-preact` instead.

**Why:** the prototype imports named icon components and passes `size`, and
`lucide-preact` is already a dependency of `@spacefast/zero`, so it costs
nothing. Platform modules — kit, charts, preact, lucide — are served from
Spacefast's immutable URLs and don't count against the 8 MB client budget, so
there is no bundle argument either way. Named imports kept the port mechanical.

---

## D12. Quantities become strings in Phase 1, not Phase 2

**Decided:** 2026-08-24

[D4](#d4-numbers-are-strings) is forced by the platform, but nothing forced it
to land during the port rather than with the schema. It landed during the port:
`qty` and `threshold` are decimal strings in `shared/types.ts` today, parsed
through `toInt` and written through `normalizeQty`.

**Why:** the encoding is cheap to adopt while the only data is a seed array and
expensive to retrofit once rows exist. Doing it now also means Phase 2 — the
milestone the roadmap calls risky — has one less thing to change, and the
"never sort by these in the database" rule already has a working client-side
implementation to point at.

**Consequence:** the localStorage key is `larder.v3.*`; v2 data from the Vite
prototype is not read.

---

## D13. Accordion state is not part of an item

**Decided:** 2026-08-24

The prototype stores `open` on each item row and closes the others by mapping
over the whole list. The port holds a single `openId` in component state.

**Why:** [data-model.md](data-model.md) already said `open` is UI, not data, so
the schema was never going to have it. Keeping it on the row would have meant
either writing it to the database on every expand — a mutation, a live-query
refresh, and a re-render in every open tab for an animation — or stripping it at
the edge. A single `openId` is also a more honest model of an accordion.

---

## D14. A loopback-only bypass in the sign-in gate

**Decided:** 2026-08-24

`sf dev` ships no sign-in flow — its runtime config reports
`signInPath: null` and `signInUrl: null`, so `auth.isGuest` is permanently true
on the dev server. With [D2](#d2-require-sign-in-no-guest-mode) that hides the
whole application from its own developer.

`client/index.tsx` therefore accepts the dev guest as the working identity
**when `location.hostname` is a loopback address**, and shows a persistent
orange "Dev guest · not signed in" badge whenever it does.

**Why this is acceptable:** a published space is served from a real hostname, so
the condition is false in production and the gate applies exactly as written.
The guest identity Zero hands out has a stable `userId`, which is all the app
needs — Phase 2's server-side household resolution will work locally against it
without a second code path.

**Why the badge:** the only failure mode that matters is someone mistaking a
local session for a real one. Making the state loud costs nothing.

**Deliberately not included:** LAN addresses. `sf dev --host 0.0.0.0
--allow-network` binds one, and anything another machine can reach gets the real
gate.

**Rejected:**
- *Build Phase 2 blind.* Every change lands unverified, on the milestone the
  roadmap already calls the risky one.
- *Publish early instead.* Still worth doing — a real Gravatar sign-in is the
  only way to close Phase 1's "done when", and Phase 2's two-browser live-query
  test needs a live space. But it makes the day-to-day loop a publish, which is
  the wrong iteration speed for porting a UI.

**Revisit when:** Spacefast ships a local sign-in stub (`sf dev --sign-in-as`,
or similar). At that point this bypass should come straight out.
