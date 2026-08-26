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

**Amendment, 2026-08-24 — households are named at creation.** `households.name`
existed from the first schema but nothing set it; first run hardcoded
"My Pantry" and no screen ever showed it. That is fine for one household and
useless for two, and a name applied retroactively is worse than one chosen at
the moment the thing is made.

So the first-run screen asks for a name, Settings can rename it (owner-only,
`household:settings`), and the header shows it under the app title. The header
placement is the part that matters: it is the line a switcher will eventually
replace, and until it exists the name has somewhere to be seen — otherwise
naming a household is a form field with no consequence.

No schema change; the column was always there.

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

**Consequence at the time:** the localStorage key was `larder.v3.*`; v2 data from
the Vite prototype was not read.

**Superseded by Phase 2.** Quantities live in the database now, and the only
localStorage key left is `larder.v4.<userId>.theme` — the per-device theme
override ([D25](#d25-no-preferences-table)). The version bump to v4 abandons
every v3 key rather than migrating them; the data they held is in the database
or was never real.

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

**Verified 2026-08-24.** On the published space the badge does not render and a
signed-out visitor gets the sign-in screen, so the loopback condition is
confirmed false in production rather than merely argued to be.

**Revisit when:** Spacefast ships a local sign-in stub (`sf dev --sign-in-as`,
or similar). At that point this bypass should come straight out.

**The orange badge is gone (2026-08-25).** This decision originally carried a
persistent "Dev guest · not signed in" chip pinned bottom-left. The Cellar
drawer's Account section now shows the same two facts — the identity reads
*Local dev guest* and the email line reads *Not signed in* — in the place a
person looks to find out who they are signed in as. A fixed chip sitting over
the interface to repeat that was covering real UI.

The signal is what mattered, not the chip. If the Account section ever stops
naming the dev guest, put something back.

## D15. The space is public; the app's own gate is the boundary

**Decided:** the Spacefast space serves to anyone, and every access decision is
made inside the app.

Spaces are private by default — an unauthenticated request gets Spacefast's own
"This space is private" 403 before a single line of our code runs. That is the
wrong boundary for this app. [D2](#d2-require-sign-in-no-guest-mode) already
requires sign-in, and Phase 3's invite flow depends on a stranger being able to
*reach* the sign-in screen in order to join a household. A platform-level gate
in front of that makes the invite link unusable by the one person it is for.

So the space is public and the gate in `client/index.tsx` does the work: a
visitor who is not signed in sees the sign-in screen and nothing else, and no
household data is reachable without an identity Zero vouches for.

**What this does not weaken:** there is no row-level security in Zero, so every
household boundary is a hand-written server-side check regardless. Making the
space public changes who can see the *sign-in screen*, not who can read a row.

**The loose end:** the setting was made from the dashboard, and `sf spaces get`
reports `config: {}` — so it lives outside the published config, and it is
unknown whether a later publish reverts it. `sf.jsonc` has an `access` field
that should express this declaratively. See [notes](notes.md).

**Rejected:**
- *Keep it private and share a Link.* Fine for a solo demo, useless for an
  invite: the recipient hits the platform 403 before our join route exists.
- *Rely on the platform gate instead of the app's.* It authenticates against
  Spacefast accounts, not Gravatar identities, and it has no concept of a
  household.

---

## D16. Deleting a location is blocked while items reference it

**Decided:** 2026-08-24
**Widened by [D36](#d36-undo-what-comes-back-confirm-what-doesnt) on 2026-08-26:
the same refusal now covers types and stores, so the item count on an editing
row means one thing in every section.**

Zero has no nullable or optional fields — every column holds a value, and the
type vocabulary is `string()`, `boolean()`, `id(table)`. So "clear the location"
is not a thing the schema can express without changing `locationId` to a plain
`string()` and giving up the typed reference.

`deleteTerm` therefore refuses to delete a location while any item points at it,
and reports the count so the user knows what to move.

**Why this one:** it costs nothing in the schema — no sentinel row to seed, no
undeletable-row logic threaded through every taxonomy mutation, no migration. It
is also the only option that can become either of the others later without
touching stored data.

**Consequence:** the Settings copy "deleting doesn't remove items" stays true,
but it now needs a second sentence — deleting is refused rather than silent.

**Confirmed 2026-08-24, and it raises the stakes:** `id("locations")` does **not**
enforce referential integrity. A spike inserted an `items` row whose
`householdId` and `locationId` both pointed at nothing, and it succeeded — `id()`
is a type hint, not a foreign key. So this rule is enforced by `deleteTerm` or
not at all; the database will not catch a bug that lets a dangling reference
through. The client already renders a fallback box for an unresolvable location,
which means such a bug would be **invisible rather than loud**. Worth a
consistency check if items ever start rendering as boxes.

**Rejected:**
- *Reassign to a reserved "Unsorted" location.* Friendlier, and the likely
  upgrade if blocking turns out to be annoying in real use. It needs a
  guaranteed-present per-household row that seeding creates and no mutation can
  delete — real work for a case that may never come up in a two-person pantry.
- *Allow dangling references.* What the prototype does today: items keep a
  `locationId` pointing at nothing and fall back to a hashed color and a box
  icon. Requires `locationId: string()` rather than `id("locations")`, which
  discards referential typing on the one relationship every item has.

---

## D17. Undo is a client-held tombstone, not a soft delete

**Decided:** 2026-08-24

`removeItem` really deletes. The client keeps the removed row and its join rows
in memory for the length of the undo window, and undo re-runs `addItem` with the
captured fields.

**Why:** a `deletedAt` column would make every read in the app filter on it
forever, and give cascade cleanup a second mode to get wrong — a permanent tax
on every query to buy a six-second affordance.

**Trade-off accepted:** undo produces a **new row id**, and with live queries
another signed-in tab sees the item vanish and reappear. Both are fine here:
nothing references items except the `itemTypes` / `itemStores` rows the undo
recreates, and the flicker is visible only if two people are looking at the same
list in the same six seconds.

**Consequence:** undo does not survive a page reload, and it is not
cross-device. If either becomes a real complaint, that is the signal to revisit.

**Rejected:** *soft delete with `deletedAt`.* The right answer if we ever want a
"recently deleted" view or cross-device recovery. Adding the column later is an
additive migration, so this stays cheap to reverse.

---

## D18. One household per user, enforced in the handler — not in the schema

**Decided:** 2026-08-24. **Superseded by [D33](#d33-a-user-may-belong-to-several-households)
on 2026-08-25** — the "reaching multi-household later" paragraph below is what
happened, and it cost no migration, exactly as written.

The schema stays exactly as [D3](#d3-multi-household-schema-single-household-ui)
describes: `memberships` is a plain join, and nothing prevents a user from
holding rows for several households. The *handler* is what draws the line.

`requireHousehold()` reads the caller's memberships through `by_user` and:

- **one row** → the household
- **zero rows** → throw. First-run creation is a separate path, so the helper
  stays resolve-or-throw rather than resolve-or-create.
- **more than one** → throw. Not `.first()`.

**Why throw rather than pick:** `.first()` on a multi-row result is a silent
wrong answer — the user's edits land in whichever household the index happened
to return, and nothing surfaces the problem. An explicit error is a bug report
instead of quiet data corruption.

**Why not support many now:** it means threading `householdId` through every
handler as an argument and building a switcher in Phase 2, on the milestone the
roadmap already calls the risky one. Queries can take arguments, so nothing
about doing it later is harder than doing it now.

**Reaching multi-household later** needs no destructive migration: delete the
throw, add the parameter, build the switcher. That was the point of D3.

---

## D19. Quantities stay whole numbers

**Decided:** 2026-08-24

`qty` and `threshold` hold non-negative **integers** encoded as strings.
`shared/qty.ts` enforces it — `toInt` rejects `"1.5"` along with `"-3"` and
`"12abc"`, reading anything unparseable as `0`.

("Decimal string" throughout these docs means base-10 text, not a fractional
value. The encoding is decimal; the value is an integer.)

**Why:** the whole UI is built on whole counts — a `+1` / `−1` stepper, a
low-stock comparison, a shopping list. Fractions have no obvious behavior in any
of them. What does `−1` do to `1.5`?

**Why this is safe to defer:** the column is already a `string()`, so allowing
decimals later changes `toInt` / `fromInt` / `isQty` and the stepper — **no
migration, and every existing integer value stays valid**. The reverse would not
be true, which is the argument for starting strict.

**Revisit after** a month of real use. "Half a bag of rice" is exactly the kind
of gap that shows up in week three, and it is cheap to close when it does.

---

## D20. Three roles: owner, editor, viewer

**Decided:** 2026-08-24

`memberships.role` holds one of `"owner"`, `"editor"`, `"viewer"`, defaulting to
`"viewer"`. The value `"member"` from the original sketch is gone.

**Names:** `viewer` rather than `reader` — "reader" implies text, and Drive,
Docs, and Notion have already taught every user what a viewer is. `editor` is
kept because it is exact.

| Capability | owner | editor | viewer |
|---|---|---|---|
| `pantry:read` — items, taxonomies, shopping list, member list | ✓ | ✓ | ✓ |
| `item:write` — add, edit, remove, adjust qty | ✓ | ✓ | — |
| `taxonomy:write` — create, rename, recolor, delete terms | ✓ | ✓ | — |
| `household:settings` — name, `defaultThreshold` | ✓ | — | — |
| `invite:create` / `invite:revoke` | ✓ | ✓ ¹ | — |
| `member:role` — change an **existing** member's role ² | ✓ | — | — |
| `member:remove` | ✓ | — | — |
| `household:delete` | ✓ | — | — |

¹ An editor may mint **viewer invites only**
([D21](#d21-invites-carry-the-role-they-grant)).
² Only owners promote or demote — and only owners can produce an editor by any
route, since [D21](#d21-invites-carry-the-role-they-grant) limits editors to
minting viewer invites.
Leaving voluntarily is available to everyone, subject to the last-owner rule in
[D22](#d22-ownership-is-a-role-not-a-column).

**The matrix lives in `shared/roles.ts` as a pure `can(role, capability)`.** Zero
has no row-level security, so every one of these is a hand-written check; three
roles across a dozen handlers is exactly the thing that drifts when the rules are
written inline. `shared/` imports nothing, so the server enforces and the client
disables UI from the same table — the same boundary
[D10](#d10-typescript-for-the-port-with-the-domain-types-in-shared) draws.

**The client half is a Phase 4 concern.** Phase 3 stores `role` and enforces
every check server-side, but issues only `owner` and `editor` invites. Viewer is
unusable until the read-only UI pass lands — steppers, inline edit, the taxonomy
manager, and the add/remove affordances all need a disabled state, and that is
more work than the schema. Shipping the enforcement first means no half-disabled
screens and nothing to redo.

**Deliberately not added:** a contributor tier (add items but not delete). It is
a real distinction in a CMS and noise in a two-person pantry.

---

## D21. Invites carry the role they grant

**Decided:** 2026-08-24

`invites` gets a `role` field. An invite is a bearer credential for a specific
level, so the level is fixed when the code is minted rather than guessed at
redemption.

**Who may mint what:**

| Creator | May invite |
|---|---|
| owner | owner, editor, viewer |
| editor | viewer |
| viewer | nothing |

Editors mint viewer invites and nothing else. **The editor tier can only grow by
owner action** — there is no path by which an editor produces another editor.

**This table is the rule; it is not "strictly below your own level."** Owners may
invite co-owners, because [D22](#d22-ownership-is-a-role-not-a-column) wants more
than one owner so a lost account never leaves a household unadministered. Any
rank formula that yields both the owner row and the editor row is a formula
fitted to three hardcoded cases, so `shared/roles.ts` encodes the table
literally. (An earlier draft of this decision asserted the "strictly below"
generalization above the table it contradicted — writing `invitableRoles()` is
what caught it.)

### Promotion and invitation are different paths

These two statements are both true and only look contradictory:

> Only owners can create new editors. Editors can invite new editors.

**Both paths to the editor tier are owner-only**, which is what makes the
guarantee absolute rather than conditional:

| | Existing member | New person |
|---|---|---|
| **Mutation** | `changeRole` | `createInvite` + `redeemInvite` |
| **Who may promote to editor** | owner only | owner only |
| **What an editor may do** | nothing | invite a viewer |

An editor cannot change the level of anyone already in the household — no
promoting a viewer, no demoting a peer (`member:role`, reserved to owners by
[D20](#d20-three-roles-owner-editor-viewer)) — and cannot mint a code that
grants editor. There is no leave-and-rejoin gap either: a viewer who leaves and
is re-invited by an editor comes back as a viewer, because a viewer invite is
the only kind an editor can produce.

**Cost accepted:** an owner is in the loop for every new editor. In a household
where one or two people administer and everyone else is along for the ride,
that is the point rather than a tax.

**Two rules that close the obvious holes:**

- **Demoting or removing a member revokes the invites they created.**
  Validation happens at creation, not redemption, so revocation is the only
  thing that enforces it afterward. The case that matters is an **owner demoted
  to editor**: their outstanding editor- and owner-invites would otherwise keep
  minting exactly the levels they just lost. `by_creator` exists for this.
- **Redeeming while already in a household is rejected.**
  [D18](#d18-one-household-per-user-enforced-in-the-handler--not-in-the-schema)
  allows exactly one membership per user, so redemption must refuse rather than
  create a second one. It also means a code can never change a current member's
  role in either direction — no self-promotion, and no editor demoting a peer by
  handing them a viewer invite. The error needs to say so plainly; this is the
  most likely thing a real invite recipient hits.

**Still open:** whether codes expire. See [notes](notes.md).

---

## D22. Ownership is a role, not a column

**Decided:** 2026-08-24

`memberships.role === "owner"` is the **sole** authority for ownership. A
household may have any number of owners.

`households.ownerId` is renamed **`createdBy`** and is never consulted for
access — it records who set the household up and nothing more.

**Why:** keeping `ownerId` authoritative alongside a `role` column creates two
sources of truth that drift the first time someone is promoted — the same
failure [D9](#d9-status-is-derived-never-stored) avoids for status. Renaming it
makes the field's job unambiguous at every call site.

**Why multiple owners:** with a single owner, losing that account leaves the
household with no administrator and makes ownership transfer a special-case
mutation. Two people who share a pantry should both be able to administer it.

**The last-owner rule:** a household always retains at least one owner. The last
owner cannot demote themselves, cannot be demoted, and cannot leave. Deleting
the household is the exit. This is the standard way these systems strand people,
and it is one guard in `member:role` and one in the leave path.

**Cost:** `ownerId` → `createdBy` is a destructive rename (`sf db migrate
--rename`) once anything is published. It is free today because the schema does
not exist yet, which is the entire reason to settle it now.

---

## D23. Icons are a closed set, and the keys live in `shared/`

**Decided:** 2026-08-24

Taxonomy icons are never uploaded. `icon` stores a **key** into a curated list —
today 10 location icons and 10 type icons in `client/lib/icons.ts`; stores have
no icon and render as outlined chips.

That much was already true. What changes is where the list lives:

- **`shared/icons.ts`** holds the key arrays — plain strings, no imports.
- **`client/lib/icons.ts`** keeps the key → `lucide-preact` component map.

**Why the split:** Zero's server may import `@spacefast/zero/server` and its own
files, nothing else, and `lucide-preact` is a client package regardless — so the
server currently has no way to reject `icon: "not-a-real-icon"`. It would store
the garbage and the client would render a fallback box forever. With the keys in
`shared/`, `createTerm` and `recolorTerm` validate on write and the closed set
becomes an enforced constraint instead of a convention.

This is the boundary CLAUDE.md already describes for `client/lib/theme.ts`:
status *derivation* is shared, status *colors* are not. Icon *keys* are shared,
icon *components* are not.

**Unrelated:** item photos via Zero storage, still parked in the roadmap's
"Later, maybe". This decision is about taxonomy icons only.

---

## D24. Invites expire after 14 days

**Decided:** 2026-08-24

`invites` gets `expiresAt: string()` — an **ISO 8601 UTC timestamp**
(`"2026-09-07T14:23:00.000Z"`), computed server-side at mint time as now + 14
days. `redeemInvite` rejects a code whose `expiresAt` is in the past, alongside
the existing `revoked` check.

**Why an explicit field rather than `createdAt` + 14 days:** the policy becomes a
constant applied at mint time instead of a schema fact applied retroactively.
Changing 14 to 30 later affects new codes only; outstanding ones keep the expiry
they were issued with, which is the behavior anyone would expect from a
credential. It also leaves room for a per-invite override without a migration.

**Why ISO 8601 UTC specifically:** it is the one date encoding that sorts and
compares correctly as a plain string, since it is fixed-width and
big-endian. Given [D4](#d4-numbers-are-strings) — where string ordering puts
"10" before "2" and cost us a standing rule against sorting in the database —
picking an encoding that survives lexicographic comparison is worth doing
deliberately. Epoch milliseconds as a string would reintroduce exactly the D4
problem.

**Why not derive from `createdAt`:** its format is undocumented. Zero's own
examples only ever pass it to `new Date()` client-side, and `new Date()` parses
non-ISO formats in implementation-defined ways. An `expiresAt` we write
ourselves has a format we control.

**`""` means never.** Nothing mints such a code today, but reserving the empty
string costs nothing and keeps the escape hatch from needing a migration.

**Confirmed 2026-08-24** against `sf dev`: `Date` *is* available in a capsule
handler — `new Date()`, `Date.now()`, and `.toISOString()` all work server-side,
so expiry is computed where it should be.

The same spike found that Zero's own `createdAt` / `updatedAt` are **already ISO
8601 UTC** (`new Date(row.createdAt).toISOString() === row.createdAt` is true).
So the format choice here matches the platform's rather than introducing a
second convention — and the argument against deriving expiry from `createdAt`
now rests on policy-at-mint-time alone, not on format uncertainty.

---

## D25. No `preferences` table

**Decided:** 2026-08-24

There is no per-user synced settings table. `defaultThreshold` is per-household
and shared; the theme override is per-device and stays in `localStorage`, which
is correct for it — a dark-mode choice on a phone should not follow you to a
desktop.

**Why:** nothing has been identified that needs to be per-user *and* synced.
Adding a table later is an additive migration, so this is cheap to reverse; a
speculative table that every handler has to consider is not.

**Revisit when** a real preference shows up that fails both tests — shared is
wrong, and per-device is also wrong.

---

## D26. `pantry` stays one payload

**Decided:** 2026-08-24

One live subscription returns items, their `itemTypes` / `itemStores` join rows,
and all three taxonomies. The client keeps a single query rather than
orchestrating five.

**The size argument.** A household pantry is realistically 100–500 items, each
with a handful of join rows, plus perhaps 30 taxonomy terms — call it 2,000 small
rows, a few hundred KB at the very top end. That is unremarkable for a single
subscription.

**The real risk is not size, it's re-send** — and the 2026-08-24 spike confirmed
the bad case. Zero's live queries **refetch; they do not diff.** From
`@spacefast/zero/dist/server.d.ts`, on `invalidate()`:

> Declaring nothing is the safe default, not a mistake — every live query on the
> page refreshes. That is correct and it is also why a page with a dozen
> subscriptions refetches all twelve on every write, so a mutation that knows
> what it touched should say so.

`invalidate()` takes **query names**, so it narrows *which subscriptions* refresh
— it cannot narrow *what a refreshed query returns*. With `pantry` as a single
query there is nothing to narrow: every write re-runs it in full.

**Two consequences:**

1. **`invalidate()` discipline is mandatory regardless of shape.** Every mutation
   must declare what it touched, or every subscription on the page refetches.
2. **The single-payload shape is the worst case for this runtime**, because it
   maximizes bytes per write. Whether that matters is a question of scale — see
   the amendment below.

### Amendment, 2026-08-24: the decision stands, for a different reason

The refetch finding looked like it should reverse this. Working the numbers says
otherwise, and it corrects the seam this decision originally named.

Rough payload, JSON, at two scales:

| | items | join rows | taxonomies | total |
|---|---|---|---|---|
| typical (150 items) | ~18 KB | ~36 KB | ~2 KB | **~56 KB** |
| large (500 items) | ~60 KB | ~108 KB | ~2 KB | **~170 KB** |

**The join rows dominate — the taxonomies are noise.** So the seam this decision
first proposed (split taxonomies from items) saves ~2 KB and is close to
pointless. And the split that *would* matter — items apart from their join rows —
buys nothing either, because any item mutation invalidates both and they refetch
together regardless.

There is no shape that makes `adjustQty` cheap. Zero has no partial subscription:
a live query is re-run whole or not at all. Splitting `pantry` therefore trades
real complexity for savings that round to zero, which makes **one payload the
right call** — not as the simple-until-proven-otherwise default it was, but as
the option that survives knowing how the runtime actually behaves.

**What does the work instead: `invalidate()` discipline.** With more than one
query on the page (`household` and `pantry` at minimum), an undeclared mutation
refetches all of them. Every mutation names what it touched:

- item and taxonomy mutations → `invalidate("pantry")`, so the member list does
  not refetch on every `+1`
- membership and settings mutations → `invalidate("household")`

**The real tripwire, revised.** Not payload size — that is unavoidable at any
shape — but whether the refetch-per-write is *perceptible* on the hot path.
Watch a held-down `+1` at real row counts. If it stutters, the fix is
client-side (debounce or coalesce the mutation), **not** a different query shape.

**Why this remains cheap to revisit:** splitting a query is client-side
refactoring. No schema change, no migration, no stored data affected.

## D27. The schema has to be a literal in the server entry

**Decision.** `schema` is declared as an object literal in `server/index.ts`.
`server/schema.ts` keeps only the derived `ReadDb` / `WriteDb` types, which it
gets back through a type-only `import type { schema } from './index'`.

**Why.** Not a preference — a platform constraint we hit head-on. The capsule
compiler does not execute the capsule to learn its schema. It runs a regex over
the source of the server *entry file only* and never follows an import. A schema
defined in `server/schema.ts` and imported into `capsule({ schema })` produces an
artifact with **zero tables and zero migrations**, while still reporting all
sixteen mutations and both queries.

Nothing catches it. `tsc --noEmit` passes — the types are real and correct.
`sf publish --dry-run` reports a successful plan. `sf dev` works normally,
which is why all of Phase 2's browser verification passed against a schema the
publish path could not see. The failure would first have appeared as every write
failing on the live space, after a publish the version history recorded as
clean.

Found by reading `.spacefast/zero/artifact.json` after a dry run, before the
first Phase 2 publish. Confirmed by experiment: a throwaway `probeTable`
declared inline in the entry appeared in the artifact while the nine real tables
stayed missing.

**Rules this imposes on editing the schema.** All of them are invisible to the
typechecker:

- Every table must be a plain `table({ ... })` literal in `server/index.ts`. A
  helper that returns a table, a spread, or a computed key compiles to nothing.
- No nested braces inside a `table({ ... })` body — the extractor's match is
  non-greedy and stops at the first `}`.
- **No comment anywhere between a table's closing `})` and the end of its
  `.index()` chain.** The chain is matched as `(\s*\.index(…))*`, so a comment
  truncates it at that point and every index after it is silently dropped. This
  really happened to `invites.by_creator`; a comment one line higher dropped all
  three of that table's indexes.
- Comments are *not* stripped before matching, so a comment containing something
  shaped like a table entry mints a phantom empty table. This also really
  happened, to a doc comment written while fixing the first problem.
- After any schema edit, run `npx sf publish --dry-run` and read the tables back
  out of `.spacefast/zero/artifact.json`. That is the only verification that
  exists.

**Rejected: keeping the schema in `server/schema.ts` and duplicating it.** Two
copies of a schema that must agree, with no check that they do, is worse than
the constraint.

**Rejected: folding `ReadDb` / `WriteDb` into `server/index.ts` and deleting
`server/schema.ts`.** It would work, but `server/auth.ts` imports those types
and there is no reason to point it at the entry. The type-only cycle is erased
at build time and costs nothing.

Reported to Spacefast with a suggested fix — fail the build when a capsule
declares mutations against zero tables. See
[spacefast.md](../.claude/docs/spacefast.md).

---

## D28. An invite link is `/?join=<code>`, not `/join/<code>`

**Decision.** The link an owner shares is
`https://larderlog.view.fast/?join=ABC23DEFGH`. The client entry reads the code
out of `location.search` before anything renders, stashes it in
`sessionStorage`, and strips it from the address bar. A typed-code box is always
available beside it.

**Why.** A path route does not survive first contact with the platform. Zero
exports `Router`, `Routes`, `Route`, and `useParams`, but the published space
serves nothing at an unknown path: `/join/TEST` and `/anything-else` both return
the platform's own 404 page, so `client.js` is never fetched and the router
never runs. `sf publish --dry-run` says why in one line — `SPA false` — and the
compiled artifact's `client` section carries only `bundlePath` and
`basePathAware`, no route declarations. The root path is the app's entire
surface.

**And `sf dev` does not reproduce it.** Locally, `/join/ABC23DEFGH` returns the
client shell byte-for-byte identical to `/`; the dev server behaves as though
`--spa true`. A path route would therefore have worked on every local check and
404'd for the first person who clicked the link — the same failure shape as
[D27](#d27-the-schema-has-to-be-a-literal-in-the-server-entry): local success,
silent production breakage. Verified by curling both.

`sessionStorage` rather than a URL that survives sign-in, because sign-in
navigates away and back and nothing promises the query string comes back with
it. The code is a bearer credential with a job that ends at redemption, so it
should not outlive the tab either — and stripping it from the URL keeps it out
of the history entry and out of any screenshot taken afterwards.

**The typed path is not a fallback, it is the other half.** An invite is as
likely to be read across a kitchen as clicked. The code alphabet in
`shared/invite.ts` already excludes `0`/`O` and `1`/`l`/`I` for exactly that
case, and `formatCode` groups it in fours for reading aloud; `normalizeCode`
takes the spaces back out, so the dictated form pastes straight back in.

**Rejected: `sf publish --spa true`.** The flag exists and would probably make
deep links work, but it changes how the whole space answers every unknown path,
for one link that a query parameter already carries. Three things make it the
wrong trade today:

- **It buys nothing the query parameter doesn't.** The paste box still has to
  exist for a dictated code, and the `sessionStorage` stash still has to exist
  to survive sign-in. The only gain is a tidier URL.
- **Soft 404s.** With the fallback on, every unmatched path answers 200 with the
  app's HTML — including a mistyped asset or endpoint path. A missing script
  then fails as `Unexpected token '<'` instead of a clean 404, and `/api/typo`
  looks like the app rather than a mistake.
- **It lives in the publish invocation, not the repo.** `sf.jsonc` has no field
  for it, so the setting rides on whoever types the command. Forget the flag on
  a later publish and every live invite link breaks, with nothing in version
  control to catch it. A query parameter is in the source.

Revisit when the app actually wants more than one page — a household switcher,
or the shopping list as its own view. That is one deliberate change with a
browser test behind it, and `--spa auto` (which may detect the `Router`) is
probably what to try first.

**Rejected: a hash fragment (`/#join=…`).** A fragment is never sent to the
server, so it would work — but whether it survives the hosted sign-in redirect
is unknown and untestable without a browser, and it buys nothing over a query
parameter that already works.

---

## D29. The project's own documentation is kept out of the publish payload

**Decision.** `docs/` moved to `.docs/`, and `CLAUDE.md` moved to
`.claude/CLAUDE.md`. Both are still tracked in git and still read normally —
`.claude/CLAUDE.md` is one of Claude Code's two project-instruction locations.

**Why.** `sf publish` mirrors the whole project root into the upload, and the v2
publish made that real: `/CLAUDE.md` and every file under `/docs/` returned 200
to anyone on the public space. None of it is secret, but it is internal planning
— including a frank description of the app's two authentication bypasses — and
nobody chose to publish it. Phase 3 sends invite links to people, which is the
wrong moment to be handing out the design notes.

The serving layer refuses dot-prefixed paths with 403 while `publishPathIgnored()`
still uploads them, which is what makes the rename sufficient: `.claude/` was
already unreachable on the live space, verified before and after v2. Confirmed
in the payload — `.spacefast/zero/public/` no longer contains `docs/` or
`CLAUDE.md` at all.

What stays public is what should be: `index.html`, `client.js`, `zero.css`,
`LICENSE.md`, `package-lock.json`, and the two `tsconfig` files.

**Rejected: an `access` allowlist in `sf.jsonc`.** The cleanest in principle and
the riskiest in practice — a wrong list breaks the signed-out sign-in screen,
which is precisely the surface an invite link depends on, and it could only be
proven by publishing and clicking.

**Rejected: moving the files out of the root around each publish.** Fails open.
Forget the ritual once and the docs are public again, with nothing to notice it.

**Rejected: accepting it.** Defensible — it is documentation, not credentials —
but a rename cost one commit and closed it.

---

## D30. A viewer's missing controls are absent, not disabled

**Decision.** Where a role cannot write, the control is not rendered. The
quantity, the notes, the terms, and the shopping list all stay — a viewer sees
the same pantry, minus the affordances. One "View only" chip beside the
household name in the header explains all of it at once.

This **amends [D20](#d20-three-roles-owner-editor-viewer)**, which said the
steppers, inline edit, taxonomy manager, and add/remove affordances "all need a
disabled state".

**Why the change.** A disabled control is a promise that it might become
enabled. That is true of a button waiting on a form, and false of a stepper a
viewer will never be able to press — their role is a property of the account,
not of the moment. Rendering it disabled puts two dead buttons on every card in
a pantry that is meant to hold hundreds, and answers "why can't I?" nowhere.

So the rule is: **remove the control, explain the absence once.** The chip in
the header is that one explanation, and Settings says it again where the
taxonomy list would otherwise look mysteriously uneditable.

**What is gated, and by what:**

| Surface | Capability |
|---|---|
| Quantity steppers, Edit, Remove, Add item, the add form | `item:write` |
| The "+" chip on every picker; rename / recolor / delete in Settings | `taxonomy:write` |
| Household name, default threshold | `household:settings` |
| Role controls, remove member, invite creation | `member:role`, `member:remove`, `invite:create` |

**Rendered as an alternative, never hidden with a class.** `TaxonomyManager`
draws a plain list for a viewer rather than the editable rows behind
`display: none`. A permission boundary that leaves live inputs in the DOM is
not a boundary — and the server check is what actually enforces this, so the
client's job is to be honest rather than clever.

**The components never see a role.** `Pantry` reads `can()` once and passes
`canEdit` / `canCreateTerms` booleans down. No component knows what a role is,
the matrix stays in `shared/roles.ts` where the server reads the same table,
and a component cannot invent a rule of its own.

**Rejected: a read-only *mode* toggle.** Tempting for testing — a switch that
previews the viewer UI — but it would be a second source of truth for the same
question, and the one thing worse than an untested read-only pass is one that
tests a different code path than the real thing.

**Still unverifiable locally.** `sf dev` issues one identity and
`createHousehold` makes it an owner, so nothing here can be exercised without a
published space and a second account. The gating is driven entirely by `can()`,
which `npm test` covers directly; what remains unproven is the rendering.

## D31. Webfonts are declared by the client at boot, and served by Google

Zero has no webfont mechanism, so the app supplies one: `client/lib/fonts.ts`
appends a Google Fonts `<link>` to `document.head` before the first render.
Playfair Display and Karla, full weight axes and italics — the design uses
Playfair italic for the wordmark's second half and for empty-state prose, so the
italic face is load bearing rather than a synthesised slant.

IBM Plex Mono rides along **temporarily**. The Cellar spec has no monospace at
all; its role (uppercase section labels, 10.5px / 0.15em) is Karla's now. It
comes out when the 35 remaining `font-mono` sites are converted.

**Why any of this is necessary.** Declaring a webfont is normally one line of
HTML or one line of CSS. Zero provides neither file. `theme.json`'s `fontFace`
block is discarded by `zero-compile`'s `presetRecord()` without a warning, the
`index.html` is generated from a fixed template in `compile.js` with no head
hook, and there is no CSS entry point — `@plugin` and `@config` are rejected.

What the compiler *does* emit is a complete stack per family:

```
--font-disp: var(--wp--preset--font-family--disp, Fraunces, ui-serif, Georgia, serif);
```

So `font-disp`, `font-sans`, and `font-mono` are real utilities that already
resolve; the browser simply has nowhere to find "Fraunces". A stylesheet link
is a DOM node, and nothing in the compile pipeline touches those. Hence a ~40
line module, **no change to `theme.json`, and no change to any component**. The
family names in `fonts.ts` must keep matching the `theme.json` literals exactly
— that is the entire contract between the two files.

**Why Google rather than self-hosting.** Self-hosting works in production —
`sf publish` mirrors the project root and serves what it finds, confirmed
against live v2 where `/LICENSE.md`, `/package-lock.json`, and `/tsconfig.json`
all return 200 with correct content types. It does **not** work in development.
`sf dev` does not serve project static files at all: it answers every
unrecognized path with the SPA shell, so `/fonts/inter.woff2` comes back as
1829 bytes of `text/html` — as does `/LICENSE.md`, which demonstrably serves in
production. `sf dev --help` offers no static-directory flag.

That would have made the app's own typography invisible in the only environment
we can iterate in, and visible only after a publish — during a UI redesign, on
a project where **publishing is currently blocked**. A remote URL behaves
identically in both environments. That is the whole argument, and for a
two-person household app it outweighs the costs below.

**What it costs:**

- A third-party dependency on `fonts.googleapis.com` and `fonts.gstatic.com`.
  If either is unreachable the app falls back to `ui-serif` / `ui-monospace` —
  degraded, not broken.
- Visitor IPs reach Google. Negligible for this app's audience; it would not be
  for a public one.
- Two extra hosts to connect to. Mitigated with a `preconnect` to
  `fonts.gstatic.com`, which is where every `src` in the stylesheet points.

**Confirmed rendering on 2026-08-25**, in a browser under `sf dev`, with
Fraunces painting the headers rather than the fallback stack. That check is the
entire justification for this decision — it was impossible with self-hosted
files.

**Rejected: base64 `data:` URIs inlined in the bundle.** The one approach that
works everywhere with no network dependency at all. It adds ~155 KB to a 122 KB
`client.js`, parsed on every load, with no separate cache entry and no
revalidation. Too much weight for the problem.

**Self-hosting stays a documented fallback.** If Spacefast ever serves static
assets from `sf dev`, or if the Google dependency becomes unwanted, the swap is
small: drop Latin-subset `.woff2` files in `fonts/` at the project root and
point `@font-face` rules at `/fonts/…` instead of appending a link. The files
were built and verified once, from Fontsource — 116 KB total, all OFL-1.1:

```
@fontsource-variable/fraunces@5.3.0  files/fraunces-latin-wght-normal.woff2
@fontsource-variable/inter@5.3.0     files/inter-latin-wght-normal.woff2
@fontsource/ibm-plex-mono@5.3.0      files/ibm-plex-mono-latin-{400,600}-normal.woff2
```

They land in the publish payload correctly and the CLI's uploader tags a `wOF2`
file as `font/woff2` by magic-byte sniff with no configuration. Only two
serving exclusions exist and `fonts/` trips neither: dot-prefixed paths 403
([D29](#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload)),
and `sf.jsonc` / `theme.json` are shadowed by name.

**The local/production asymmetry is the inverse of [D28](#d28-an-invite-link-is-joincode-not-joincode).**
There, `sf dev` served deep paths the published space 404s. Here, `sf dev`
shells files the published space serves. Same root cause — a dev server whose
routing is unrelated to production's — pointing opposite ways on consecutive
features, and both times the local result is the misleading one.

## D32. A term stores a color token, not a color

`terms.ink` holds `color-7`. What `color-7` looks like is decided by the active
theme in `client/lib/palette.ts`, so a future theme restyles every location,
type, and store in every household by shipping sixteen new values — without
touching a single row.

Storing the hex, which is what the app did through Phase 4, pins the palette
into the data. Re-theming would mean rewriting every term in every household,
and any row missed would keep the old look forever with nothing to indicate
why.

**The split follows the existing one.** `shared/palette.ts` declares *which*
tokens exist (`color-1` … `color-16`) and validates them; it has no colors in
it. `client/lib/palette.ts` holds what they look like. Same rule as status:
the derivation is shared, the colors are not — the server has no business
knowing what a color looks like, and `shared/` is compiled into the capsule.

**The values are a table, not a formula.** Each token carries five hand-tuned
values — base, tint bg, tint border, tint text, on dark — because each pair was
checked to clear 4.6:1. Deriving them loses the corrections: `color-7`'s tint
text is deliberately darker than its base, and `color-8`'s darker still. The
old `lighten()` derivation survives only as the legacy path below.

**Legacy hex still renders, and that is not defensive.** Every row written
before this decision holds a raw `#rrggbb`. `normalizeInk()` accepts both,
`themed()` falls back to deriving a tint for anything it cannot resolve, and
`isInk()` still passes hex. Nothing new writes one.

**Timing made this cheap, and it will not stay cheap.** The production database
is empty — all nine tables exist with no rows — so there is no migration to
run and no data to convert. The same change after a household has a year of
terms in it would need a backfill and a rollback plan.

**Rejected: naming the tokens after their colors** (`slate`, `terracotta`).
Reads better in source, and it is exactly wrong: a theme that makes `terracotta`
blue leaves every call site lying. The spec's own names are kept as a trailing
comment on each row so the table can be diffed against the design doc, and
nothing reads them.

**Rejected: CSS custom properties for term colors.** The obvious move, and it
does not work here — Zero compiles utility classes by scanning source for
static strings, so a computed `bg-${token}` emits no CSS at all
([D7](#d7-keep-the-prototypes-theme-system-dont-adopt-the-kit-wholesale)).
Term colors have always been inline styles on this platform and still are;
the token indirection happens in TypeScript, not in CSS.

**What still stores a hex:** `theme.json`'s palette, and the status colors in
`theme.ts`. Neither is user data — they are the theme itself.

**Each token carries nine values, not five.** The dark spec (2026-08-25) added
a full second quad — dark dot, tint, border, text — rather than a lightened
first one, so nothing about a term's dark appearance is derived either. A ninth,
`onDrawer`, is the dot on the drawer: that surface is the darkest in *both*
themes and needs an ink brighter than `darkDot`. **Only eight of the sixteen
are specified** — the design's sample data exercises eight colors — and the rest
fall back to `darkDot` through `drawerDot()`, which reads slightly dim. That
also forced `ThemedColor` to grow a `dot` alongside `ink`: the solid fill and
the text had been close enough to share one value in light, and in dark they
are not.

---

## D33. A user may belong to several households

**Decided:** 2026-08-25. Supersedes [D18](#d18-one-household-per-user-enforced-in-the-handler--not-in-the-schema).

The schema has permitted this since [D3](#d3-multi-household-schema-single-household-ui);
only the handler refused. The refusal is gone, and with it the `blocked` query
state that existed to report it. **No migration** — the artifact still reports
nine tables and zero migration operations.

**Which household a request is about is now a question with two answers**, and
`shared/membership.ts` gives both:

- `selectMembership(rows, preferred)` — for **queries**. Honors the preference
  when the caller is a member of it, and otherwise falls back to a deterministic
  default (lowest household id).
- `findMembership(rows, householdId)` — for **mutations**. Exact match or
  nothing.

**A read heals; a write refuses.** These are deliberately different. A stale
selection is normal — you left a household on your phone, or someone removed
you while a tab was open — and blocking a read on it strands you on a screen
with nothing to press. A *write* redirected the same way would land an edit in a
household you never named, which is precisely the silent corruption D18's throw
was protecting against. That guarantee survives; only its scope changed.

**The client asks, the server answers, the client believes the answer.** The
selection lives in `localStorage`, per device, keyed by identity —
`larder.v4.<userId>.household`. It is the second and last exception to
[D25](#d25-no-preferences-table), and for the same reason as the first: the
phone in the kitchen is pointed at the kitchen, and a switch there should not
move a desktop in another room. Every query echoes the household it actually
resolved, and `Pantry` writes that id back over its stored guess, so a selection
pointing at a household you have left repairs itself on the next result rather
than needing a reset.

**A `householdId` from the client became a selector, not an authority.** The old
architecture rule — never accept one — could not survive a switcher, since
something has to name the household. The rule is now that naming proves nothing:
every handler looks the id up among the caller's own memberships and works from
the row it finds. An id belonging to a stranger and an id belonging to a
household you just left fail identically, with one message.

**Roles are per household, and that is the point.** The same person is an owner
in one pantry and a viewer in another. `requireCapability(ctx, householdId, cap)`
reads the role from the membership row it resolved, so
[D20](#d20-three-roles-owner-editor-viewer)'s matrix now applies per household
rather than per person. Verified against a real capsule on 2026-08-25 through a
temporary endpoint: owner in Alpha, viewer in Beta, `item:write` allowed in the
first and refused in the second, for one identity in one request.

**`redeemInvite` still refuses a second membership — in the same household.**
An invite must never change a current member's role in either direction, and a
duplicate membership row would do exactly that. Joining a *different* household
is now the ordinary case.

**Rejected: storing the current household server-side.** A `lastHouseholdId`
column or a `userPrefs` table would sync the choice across devices, which is the
wrong behavior — see above — and it would be a schema edit under
[D27](#d27-the-schema-has-to-be-a-literal-in-the-server-entry) for something
localStorage already does correctly.

**Rejected: putting the household id in the URL** (`/?h=<id>`). Bookmarkable,
and it makes a household id a thing people paste around; `?join=` codes are
already the sharing mechanism ([D28](#d28-an-invite-link-is-joincode-not-joincode)),
and they carry a role and an expiry.

**Still not built, deliberately:** leaving or deleting a household from the
switcher. Both exist elsewhere — leave in Settings, delete only in the capsule —
and destructive actions in a menu you open to *navigate* is how people delete
the wrong thing.

---

## D34. Term icons are cut, and the column is kept

**Decided:** 2026-08-25

A location and a type each stored an `icon` key, validated server-side against
per-kind sets in `shared/icons.ts` and rendered through `client/lib/icons.ts`.
The Cellar reskin identifies a term by its name and its color dot — the icon
circles came off the item card, and `IconPicker` was deleted with the rest of
the pre-Cellar surfaces. What was left was a validated, seeded, tested field
that nothing on screen could show or change.

So the feature is gone: both icon modules, the `icon` argument on `createTerm`
and `updateTerm`, the seed keys, and six assertions.

**The column stays**, holding `''`. Dropping it needs `sf db migrate --drop`
against a live space; filling it again later is additive and applies on publish
with no flags. The asymmetry decides it — keeping an unread column costs a
`icon: ''` in one insert, and removing it buys nothing.

**If icons come back**, the natural home is the drawer's filter rows rather than
the item card, and the glyph vocabulary is in git history at `shared/icons.ts`.

---

## D35. Created and modified dates are the platform's, not ours

**Decided:** 2026-08-26

Items, terms, and households should each carry a creation date and a
last-modified date — stored only, shown nowhere, so that later features have
them to work with.

**They already do, on every table, and we cannot add our own.** Zero stamps
`id`, `createdAt`, and `updatedAt` onto every row, and those three names are
reserved: `table({ createdAt: string() })` throws
`Field name "createdAt" is reserved for Lakebed metadata.` before the capsule
ever compiles. There is nothing to add to the schema in `server/index.ts`, and
so — per D27 — nothing to check in the artifact and no migration to run.

The semantics were verified against `sf dev` on 2026-08-26 rather than taken on
faith, because "you get the columns for free" does not say whether `updatedAt`
ever moves:

- both are stamped at insert, to the same instant
- `createdAt` is never rewritten by `update()`
- `updatedAt` is rewritten on **every** `update()`, including `update(id, {})`
- the encoding is ISO 8601 UTC with milliseconds, so it string-compares
  correctly — the one date format that does, which is why `invites.expiresAt`
  already uses it (D4, D24)

**The "additive, backfill old rows to the earliest date" plan is moot** and the
outcome is strictly better than it: existing rows are not backfilled with a
fallback, they carry their real insert times, because the platform has been
stamping them since the tables were created.

Three consequences worth keeping in mind before something reads these:

**An item's `updatedAt` does move when only its tags change.** Types and stores
live in join tables (`itemTypes`, `itemStores`), so retagging writes join rows
and not the item row. `updateItem` happens to call `ctx.db.items.update()`
unconditionally, and an empty patch still bumps the timestamp, so the item's
last-modified stays honest. That is load-bearing: **do not "optimize" away the
`items.update()` call when `next` is empty.**

**Deleting a term does not touch the items that referenced it.** The cascade in
`deleteTerm` removes join rows only, so an item silently loses a tag while its
`updatedAt` stands still. Left as-is — the item row genuinely did not change —
but a "recently edited" view built on `updatedAt` will not show it.

**Nothing surfaces them to the client yet.** Queries build DTOs from
`shared/types.ts`, and none of them carry a timestamp. Whatever feature wants
these dates adds the field to the DTO it needs; the storage half is already
done and needs no publish to start working.

**Rejected: a hand-rolled `createdAt` under a different name** (`addedAt`,
`published`). It would compile, and it would then have to be set correctly in
sixteen mutations forever, duplicating a column the platform maintains for free
and drifting from it the first time someone forgets. The only thing it buys is
a name we like better.

**Not verified on a hosted runtime.** Publishing is blocked, and
`sf db dump` currently fails with `zero_db_connect_failed` even though the space
serves `200 ok`, so live rows could not be inspected. The behavior is from the
runtime's own insert/update path, which is shared, but it is local-only
evidence.

---

## D36. Undo what comes back, confirm what doesn't

**Decided:** 2026-08-26

Destructive actions had three different idioms: an undo toast for items, an
inline "Remove Dana? / Remove / Cancel" row inside `MembersPanel`, and a server
refusal that surfaced as the error banner. The design spec's *Destructive
actions* section replaces all three with one rule.

**An action gets an undo toast when the record can be restored and you are the
only person affected. It gets a confirm modal when the effect cannot be
reversed, or when it reaches someone who is not looking at your screen.**
Nothing gets both — a confirm followed by a toast promising an undo it cannot
honour is worse than either alone.

| Action | Treatment |
|---|---|
| Remove item | Undo toast |
| Delete a term — unused | Undo toast |
| Delete a term — in use | Blocked dialog |
| Revoke an invite | Confirm modal, then a plain toast |
| Remove a member | Confirm modal, then a plain toast |
| Leave household | Confirm modal |
| Leave — last owner, others remain | Blocked dialog |
| Leave — last member | Confirm modal **+ typed name** |

**Crimson is never a button.** The confirm's primary is the ordinary ink/cream
fill; destructiveness is carried by the title asking the question, the body
naming what is lost, and the button saying the verb — *Revoke invite*, *Leave
household*, never *Confirm*, *OK* or *Yes*. Crimson appears once per dialog as
the icon tint. Ghost-plus-crimson-text stays what it already was on the Edit
sheet: the way a destructive action is **offered**, never the way it is
**executed**.

### Blocked is a precondition, not a question

A blocked dialog is the same shell with the destructive half removed: icon,
title, body, and Cancel plus a button that goes where the problem is. Its disc
takes the **low** tokens rather than the out ones — amber is "hold on", crimson
is "gone". Both come off the same status ramp as the item badges, so neither
needs a colour that did not already exist.

### Deleting a term is refused for every kind now, not just locations

D16 guarded `location` alone, and correctly: a location is *required*, Zero has
no nullable column, and deleting one in use leaves a dangling id that renders as
a silent box. Types and stores are optional tags, so `deleteTerm` used to drop
their join rows and carry on.

**That asymmetry is what changed, and the count is why.** The editing row now
carries an item count beside a trash that is live in every case. The count
exists to make the outcome predictable *before* the press — and a count that
means "this will be blocked" on the Location rows and "these tags are about to
vanish without telling you" on the Type rows teaches nothing. So every kind
blocks while anything references it.

The rule and the sentence explaining it are one function, `termBlock` in
`shared/term.ts`. The server throws its `body` and the client draws the dialog
from the same call, so the refusal and the explanation cannot drift. Counting
goes through the `by_type` / `by_store` indexes rather than scanning items —
locations have no join table, so that one still scans. **Verified against
`sf dev`** on 2026-08-26 with a throwaway endpoint: two items on one type
counted 2 through the index, an unused location returned `null`, and the
blocked sentence came back verbatim.

**Rejected: keeping types and stores deletable with an undo that re-tags.** It
works — the client knows which items carried the tag — but it makes undo the
only thing standing between a stray press and silently untagging a dozen items,
and it costs one `updateItem` per item to unwind. The cheaper honesty is to
refuse.

**The trash is never disabled.** A disabled control cannot explain itself: it
takes no hover on touch, screen readers skip it by default, and the reason is
the one thing worth having at that moment. It is also neutral rather than
crimson, matching the boards — the row's count already says what will happen.

### What the toast can and cannot restore

Undo re-inserts rather than un-deletes (D17), so a restored item is a **new
row**. Two consequences the spec asked about:

- **Position is not restored, and no longer needs to be.** The spec justified
  restoring it with "there are no timestamps". That premise is false as of D35
  — every row carries `createdAt` — and *Recently added* now sorts on it,
  newest first. It previously applied **no sort at all**, leaving the list in
  `collect()` order, which is oldest-first and the exact opposite of the label.
  An undone item comes back at the top, which is where a row that was just
  re-added belongs.
- **A restored term appends.** Name and colour survive, and the filter it was
  driving is re-pointed at the new id, but it lands at the end of its chip list.
  Same trade as D17, and not worth a client-held ordering to paper over.

**Removing a member is a confirm, not an undo**, even though re-inviting is
possible: it reaches a person who is not looking at your screen, which is the
half of the rule that decides it.

### Leaving moved out of Members

It sits at the foot of the **Household** section as a ghost row with crimson
text — leaving is something you do to your own membership, not to the member
list, and a new block after Invites would have broken *Invites last*. When you
are the household's only member the row relabels to **Delete household**, so it
never promises something softer than it does, and takes the app's **only** typed
confirmation. That earns its exception by being the only action that destroys
data belonging to more than one screen; anywhere else it would be theatre.

`deleteHousehold` had shipped server-side since Phase 2 and had no client
caller until now.

---

## D37. The signed-out surface is two pages, not one

**Decided:** 2026-08-26

Everything before the app shell had one screen: a sign-in card that greeted the
visitor and asked in the same breath. The design spec's *Flows outside the
shell* splits it.

**`/` is a marketing page. Any other URL hit while signed out is a bounce, and
shows the sign-in card with an eyebrow saying why.** Collapsing them makes the
front door either a wall for someone who has never heard of the app or a sales
pitch for someone who only wanted their pantry, and there is no single page that
is both without being worse at each.

The routing runs in the visitor's own order of intent, not the URL's: an
invitation is the most specific reason to be on the page, an abandoned sign-in
is next, and only after both does which path they landed on matter.

**Rejected:** routing this properly. `sf publish --dry-run` prints `SPA false`
and the published space serves nothing at an unknown path (D28), so the bounce
is reachable today only by a sign-out or an expired session landing somewhere
other than `/`. It is one `location.pathname` test, and it stays that way until
the platform can route.

**Open, and deliberately so:** what `/` does for someone who is *already*
signed in. Straight through to the app is what is built — but showing them the
marketing page is the answer that lets them find the pitch again to send to
someone, and that is a real thing to want.

---

## D38. Signing in is the accept

**Decided:** 2026-08-26

An invite link is followed by someone who is signed out by definition, and Zero
signs in with a **full-page redirect** — `location.assign`, not a popup. So the
`?join=` landing has to survive a teardown, and the visitor comes back to a
fresh page with no memory of having agreed to anything.

**Pressing *Sign in with Gravatar to join* is the acceptance.** The consent is
written to `sessionStorage` beside the code, before the redirect, and the app
redeems on arrival rather than showing the same card a second time. A press that
appeared to do nothing would be worse than an extra click; it would look broken.

A link followed by someone **already** signed in carries no consent and gets the
card with its two buttons. Same card, different question.

The consent is *spent* on the first attempt either way. If the server refuses —
expired in the meantime, revoked, or a household they turn out to already be in
— the flag is cleared and the landing card takes the screen, because it is the
only thing that can say which of those happened.

**This replaces the in-app banner.** Under D18 an invite arriving at someone who
already had a household could only be refused, and a strip above the pantry was
the right size for that. D33 made it a real offer with a role attached, and an
offer belongs on the same card the signed-out landing uses.

---

## D39. An invite preview is the one query that answers a guest

**Decided:** 2026-08-26

The `?join=` landing has to name the household and the role before anyone signs
in. Every other read in the app resolves a membership first and cannot.

**`invitePreview(code)` takes the code as its authorization.** Whoever holds one
was meant to see the household's name, who sent it, and what they are being
offered. It is a read, it writes nothing, and it grants nothing.

**What it will not do is confirm that a code existed.** Unknown, malformed and
**revoked** all return the same bare `invalid`, matching `redeemInvite`'s
refusal to distinguish them — naming the household behind a dead link would tell
a stranger something about it. The landing renders `invalid` as the expired
screen with one sentence changed, which is the spec's own construction.

Expiry is the exception the design asks for: an expired code is one somebody was
genuinely given, and the screen exists to say who to ask for another. It names
the household and the inviter; the security note it trades against is that a
code holder learns the code was real, and a code holder already knew.

**Only the already-a-member case carries a household id**, so its *Open X* can
switch to it. A non-member holding a code has no business learning one, and the
other three variants offer no destination to switch to.

---

## D40. Seeded terms are generic, and there are still three stores

**Decided:** 2026-08-26

The seeds were the design's sample data: Upright Freezer, Chest Freezer,
Costco, Publix, Calfee Cattle. That is one household's vocabulary shipped as
everybody's default.

Locations and stores are now generic — **Pantry · Refrigerator · Freezer** and
**Grocery · Warehouse · Market**. Types were already generic and keep their
assignments from the spec's *Term colours* table; only the order changed, to the
spec's. The aim is that a new household recognises its own shelves and renames
them, rather than deleting three that belong to someone else.

**Stores are the weak third.** Locations and types are near-universal; where
someone shops is not, and Grocery / Warehouse / Market may be three chips a new
user deletes. Seeding none is defensible and was considered. The trade against
it: the Store filter would open empty on day one, and a filter group with
nothing in it teaches nothing about what a store is for. Three generic ones lose
less than an empty pane does. Revisit after somebody has actually used it.

`npm test` now asserts every seed's colour token resolves and every group's
names are distinct under `termKey`. Both failures are invisible when wrong — a
mistyped token falls through to the legacy-hex derivation and renders in *some*
colour, and a duplicate name leaves the household one term short with no error
anywhere.

---

## D41. The shopping list is a mode, and its checks are local

**Decided:** 2026-08-26

**Supersedes the contextual modal** that D0-era design specced and Phase 2
shipped: a store banner above the grid, and a `ShoppingListModal` listing that
store's low and out items.

The rule the list now follows: **it is a *view* of the items, not a thing you
keep.** Every item currently low or out, grouped by where you would buy it.
Nothing is authored into it and nothing is authored out of it — an item arrives
when its count drops under its low-at and leaves when someone puts the count
back up. That is why there is no shopping-list tab, no *add to list*, and no
way for the list and the pantry to disagree.

**It replaces the content column rather than covering it.** Three reasons, all
of them already rules here:

1. A modal is a *question* — centred, focus-trapped, dismissed to continue —
   and D36 says so out loud. A shopping list is a reference you read while
   doing something else.
2. The modal had no interaction at all, so there was nothing to check off,
   which is the one thing a shopping list is for.
3. It was a dead end: no way to change store, fix a wrong count, or reach the
   item without closing it first.

**Rejected: one 720px document with the stores ruled across it.** A hairline
and a small label are not enough separation when you are scanning four shops at
once, and it left most of a 1440 screen empty. A card per store makes the store
a *bounded object* rather than a label, and gives the width something to do.

### The trigger is secondary, and placement does the work

One control on **row 2, immediately after the three status pills**, with two
labels: `Shopping list` + an ink count pill in grid mode, `‹ Back to items` in
list mode. Both wear the same shell — `surface` on a `line strong` border with
an ink label.

**Placement is doing the work that colour was doing.** The eye crosses
`9 in stock · 6 running low · 5 out` and lands on the thing to do about it. That
sequence is the on-ramp, and it only exists because row 2 already summarises
status.

**Rejected: the amber trigger, built first.** It wore the low tokens on the
argument that it is the one control that exists because something is running
low. That argument was made against a top bar with a title and no status pills
— **a top bar that does not exist**. Against the real one it lands a gap away
from `6 running low`, which is already amber and means something else, and two
amber controls side by side saying different things is worse than neither. It
is secondary now, and *Add item* keeps the only ink fill on screen.

The finding underneath it still stands and will bite again: **the status tints
were designed to sit on a card.** On the ground the low tint reads 1.03:1 and
the low border 1.16:1. Anything that wants to be amber out there needs the low
*text* colour as its border — 5.08 light, 9.33 dark — not the border token.

**When space is short it drops its label** for a 20px cart glyph and keeps the
count pill — 74px instead of 165. It is the only element on that row with a
fixed cost, and *Shopping list* is the most expendable phrase on the screen once
the pill says 11 and the glyph says what kind of 11. **`‹ Back to items` keeps
its words**: it is the exit, and an unlabelled back arrow on a screen with no
title is a guess.

### Row 2 sizes off the column, not the viewport — 2026-08-26

**Found by using it**, not by drawing it. The boards switch row 2's controls to
their compact forms at 390, on `md:`. That is wrong in the middle: a docked
drawer costs **340px**, so a 1280 screen leaves 872 of content and is every bit
as cramped as a phone while sitting well above every mobile breakpoint. The
pills, the trigger and the sort all crushed together there.

`ROW2_FULL_PX` is **910**, measured from the parts rather than chosen: three
pills at full padding are 368, *Shopping list* with its pill is 165,
`Showing 20 of 20` is ~112, the sort naming *Recently added* is ~207, plus the
row's gaps. A `ResizeObserver` on the content column decides it, because the
drawer's three states change the available width without the viewport moving at
all. It starts `true` — the compact row fits everywhere and the full one does
not, so the one frame before the observer fires is the one that can only have
too much room.

**The one thing that stays on the viewport is where the trigger lives.** Below
`md` it moves into the mobile header, squared up with the wordmark opposite the
menu button — it is chrome, a standing fact about the household rather than a
fact about the screen you are on. That is what buys the status pills and the
sort room to share one line again at 390, which they could not do with a third
control between them. **The exit does not move**: `‹ Back to items` stays in row
2 with the list it exits, where it can keep its words; beside a 27px wordmark at
390 neither would have room.

Row 2 gives up **`Showing X of Y`** first when compact — the pills already carry
the counts that matter and the grid is directly below. The list's trip line
never goes, because nothing else on screen says it.

**Its count is the unfiltered total, always.** Scope to a store with nothing to
buy and the meta line reads `0 to buy at Costco` while the trigger still holds
11. The trigger answers *is there shopping to do*, which is a fact about the
household; the meta line answers *what is on this screen*.

It is hidden when nothing is low or out — the same argument that hides the sort
trigger at zero items (D37): a control that can only disappoint.

### Checks are local, and they expire

Check state lives in `localStorage`, which makes it the **third** thing there
after the theme override (D25) and the selected household (D33), and for the
same reason: it is a property of this device. Reloading in a shop, on a phone
with two bars of signal, has to come back to the list with the ticks intact.

Three rules clear a check and none of them needs a button:

1. The item leaves the list — anyone restocks it, and the check goes with the
   row.
2. Twenty-four hours pass. A shopping trip does not last a day, and a week-old
   tick is a lie. The window runs from the **last** tick rather than the first,
   so a slow shop cannot expire underneath someone still walking it.
3. The household is switched. Checks belong to a list, not to you — which is
   why the household id is stored *in* the record rather than used as its key.
   A key per household would hand yesterday's ticks back when you switched away
   and returned.

**They are deliberately not shared.** Two people at two different stores would
collide on the same rows, and a tick meaning "in *my* cart" cannot be read by
someone else without saying whose. That is a real feature and it belongs with
restocking, not before it — which is what the trip bar's empty right half is
reserved for. Until restocking exists, coming home from the shop means stepping
every item by hand.

### Consequences

- `ShoppingListModal` is deleted, along with the store banner above the grid.
  The Store filter is now just a filter.
- `shared/shoppingList.ts` owns the grouping and both orderings — groups A–Z
  with the storeless one last, rows out-before-low then A–Z, the latter being
  the *Needs restocking* sort reused rather than reinvented.
- An item that names several stores appears under **every** one of them: you
  can buy it at either, and picking one would be guessing. So the count is of
  items, never of rows.
- `Theme` gains `divider` — a hairline *inside* a card, softer than `border` in
  light and identical to it in dark. At `#E2D5C0` a rule every 56px stripes a
  card into a ladder; below `#3E3527` it disappears at the dark fill.
- **Row 2 empties out and re-fills in list mode.** The status pills go — you are
  already filtered to low and out, so `9 in stock` has nothing to say — and so
  does the sort trigger, because the list has one fixed order. Row 1 does not
  change at all, so the switch reads as the content changing rather than the app
  changing.
- **The status pills tighten at 390 rather than truncating**: padding 16 → 13,
  gap 9 → 7, label 14 → 13.5, which brings the three of them from 368px to 332
  against the 358 available. Shortening the copy was the other option and it is
  worse — *running low* is the phrase, and *low* is a different, vaguer claim.
- The marketing page's third benefit said "Nothing to tick off". It is now
  wrong, and the copy is changed to match.

## D42: A household has a colour, and it is one of the sixteen

*2026-08-26*

**A household stores a colour token, and the tile drawn from it is the only
thing naming which household you are in on the 68px rail.**

The rail, the switcher and the invite card all drew that tile already. **Nothing
set it.** The rail took the first *location's* colour and `invitePreview`
returned the same stand-in, so every household created from the seeds was olive,
and renaming a location could recolour a pantry. Four households called *The
Tadlock House*, *The Lake Cabin*, *Mom's Pantry* and *Apartment 4B* were told
apart by reading them.

`households.ink` is additive — a new column with a default, which publishes
without `--drop` or `--rename`.

### The colour is a token, not a hex

Same rule as [D32](#d32-a-term-stores-a-color-token-not-a-color), and the same
sixteen slots: a re-theme restyles every household without touching a row.
`toHouseholdInk()` refuses a legacy hex outright, which `normalizeInk()` for
terms accepts — households never had one, and storing a value the resolver would
reject is exactly how the stored colour and the drawn colour come apart.

### An unset colour resolves from the id, not the name

Every row written before the column holds `""`, forever, because nothing
backfills them. `householdInk()` hashes the **id** into the sixteen:

- **The id, not the name**, so the default is fixed across a rename. A colour
  that moves when someone corrects a typo is the opposite of what the tile is
  for.
- **Spread over all sixteen, not pinned to one neutral.** The point is telling
  several households apart, and a shared default would fail exactly the people
  who never picked one.
- **In `shared/`, so the server answers the same way.** `invitePreview` hands a
  colour to a signed-out guest; a fallback computed one way there and another in
  the client would draw two tiles for one household.

New households never take this path: both creation surfaces arrive with a colour
already chosen — the first unused across the households you are in, walking the
sixteen in order.

### It is the term composer, not a new component

A household is a coloured, named thing in a list, which is what every location,
store and type already is. So the identity row is `TermRow`'s geometry: a 26px
swatch ringed in its own colour, a 40–44px field at radius 11, and the same 8 × 2
picker opening **inline**, pushing the panel taller rather than floating over
anything. Settings' pencil flips the section into the Filter tab's editing panel,
one row deep — no add row and no trash, because a household is one row and
*leaving* is a different verb with its own control below.

**No tile preview**, though the spec asks for one. Its reasoning is that the
tile is elsewhere while you are in Settings — but it is not: the drawer's own
household row sits directly above the panel and carries the tile, so a preview
would be a second copy of something already on screen. This is the one place the
build knowingly differs from the boards.

### Every picker draws one palette, and it follows the theme

A token has **one appearance per theme** — the light `base` in light, the dark
variant in dark — and every picker and swatch in the app now draws that, on the
drawer and on a card alike. Previously the dot depended on the surface the
picker happened to open over, which meant pressing one colour and getting
another. That was not only the household's problem: in dark mode the item
sheet's picker drew light bases while the chips it recoloured on that same sheet
took `darkDot`.

`ColorPicker`'s `onDark` therefore governs the **well and the selected ring
only**. `TermRow`'s swatch takes the same rule.

**One divergence survives and is deliberately unsettled**: a term chip's dot on
the drawer is `drawerDot(c)`, an `onDrawer` override tuned against near-black,
in both themes — so the Filter tab now shows a light base in the picker and a
brighter ink on the chip below it. Only eight of the sixteen `onDrawer` values
are specified at all, so the divergence is already partial; it is written up in
[notes.md](notes.md#product-questions) to settle when they are finished.

### A collision is allowed, and nothing says anything about it

There is **no uniqueness rule.** It would fail the moment someone belongs to
seventeen households, and a household you do not own should not get to dictate
what yours looks like. Nothing is disabled either, for the reason the live trash
already carries ([D36](#d36-undo-what-comes-back-confirm-what-doesnt)): a
disabled control cannot explain itself.

The spec asks for a caption naming the colour and flagging the clash — *Aqua —
also used by **The Shop**.* It was built and then removed. Once nothing is
restricted there is nothing to explain, so the line was describing the *absence*
of a rule, which is a sentence no interface needs to print; and the swatch and
the ringed dot already answer "which one is chosen". The colour names survive as
the dots' `aria-label` and `title`, which is the one place they do real work —
sixteen bare circles announce as "Choose color 7" otherwise.

This is the second deliberate departure from the boards, with the missing tile
preview.

### The letter skips articles

*The Tadlock House* gives T, *The Lake Cabin* gives L. Taking the literal first
character would make every household beginning "The" a T, which is precisely the
case the colour exists to disambiguate. Only articles are skipped — *Under the
Stairs* gives U, and a stopword list long enough to be "correct" stops being
predictable from the name.

### Rejected

- **A hand-picked hover/pressed pair per colour.** Thirty-two more values. The
  rail's states are derived instead — 10% toward white, 9% toward black — which
  is exactly what the boards draw, and it replaces the hard-coded
  `#A85E33 / #B96A3C / #98522B` that was one household's terracotta written down
  as though it were a token.
- **Recolouring from the rail's household flyout.** It switches, creates and
  joins. Management expands the drawer, the same line the quick filters hold.
- **Creating inline in the switcher.** A name and a colour do not fit in a 264px
  flyout without pushing the household list off the bottom. *New household* opens
  a 420px dialog on the confirm shell instead, and its header tile is the live
  preview. Joining stays inline — a code is one field and nothing else.

### A just-made household has to outrank the selection heal

`Pantry` keeps a per-device household selection (D33) and heals it: if the
selection is not in `households`, it adopts whatever the server resolved. The
list is the right test — it takes no argument, so it does not lag a switch the
way the scoped queries do.

**But it does lag a create.** `createHousehold` and `redeemInvite` return an id
the server has already written, while `households` is a separate live query that
re-emits a beat later. In that window the heal saw a selection the list did not
contain, read it as stale, and put you back where you started — so a household
you had just made or just joined did not open. The switcher's old inline create
had the same hole; the dialog did not introduce it.

So a deliberate selection *claims* the id, and the heal waits rather than
correcting. "Not in the list" only means stale if the list is current, and there
is no way to ask it whether it is. Waiting is safe because the id is real: the
scoped queries answer for it immediately. Two signals release the claim — the
list carrying it, or `household` resolving to it, the latter being conclusive
because that query only ever resolves to one of the caller's memberships.

### Consequences

- `HouseholdTile`, `HouseholdIdentity`, `NewHouseholdDialog` and `ModalShell` are
  new; `ModalShell` is `ConfirmDialog`'s box, extracted rather than rebuilt,
  because the spec calls the household dialog "the confirm shell" in so many
  words.
- `createHousehold` takes a colour; `updateHousehold` accepts one under the same
  `household:settings` capability as the name — both are the one look every
  member of the household sees.
- `invitePreview` no longer reads `locations` at all.
- `TermColor` gained `name`, and every dot in every picker is now labelled with
  it. The names were a trailing comment nothing read.
- The switcher's generic house glyph is gone; each row is its household's tile.
