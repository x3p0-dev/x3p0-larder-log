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

**Decided:** 2026-08-24

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
