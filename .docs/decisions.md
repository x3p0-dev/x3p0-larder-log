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

**Amended 2026-08-27 by [D44](#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo).**
One thing this decision waved through turned out to be a real complaint: a
restored item took a **new `createdAt`**, so *Recently added* put it at the top
of the list instead of back where it was. The tombstone stays exactly as
described — `removeItem` still really deletes and undo still re-runs `addItem` —
but the row now carries an `addedAt` of its own that undo hands back.

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

### Amended 2026-08-27 by [D44](#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)

**"We cannot add our own" was the wrong conclusion from a correct premise.** The
names are reserved, so a column *called* `createdAt` is impossible — but a
column called something else is not, and that turned out to matter. What this
decision did not test is whether a reserved column can be **written**: it cannot
(*"Zero manages items.createdAt; app code cannot set it directly"*), and since
undo re-inserts rather than un-deletes (D17), a stamp the app cannot write
cannot survive an undo. A restored item took a fresh `createdAt` and shot to the
top of *Recently added*.

So the app now carries `addedAt` on five tables and `changedAt` on four of them,
and **every ordering reads those**. The platform's pair survives as the last
fallback for rows written before those columns, and as the record above of what
they do.

Two of the three consequences below are superseded with it:

- **The `updateItem` note stands but no longer bites.** `next` is never empty
  now — it always carries `changedAt` — so the unconditional `items.update()`
  is no longer the only thing keeping the row's date honest. Do not remove it
  anyway; `updatedAt` is still the platform's answer to "when did this row last
  change" and something may yet read it.
- **The term-cascade gap is unchanged and now applies to `changedAt` too.**
  `deleteTerm` removes join rows only, so an item silently loses a tag and
  neither stamp moves. Still left as-is, and still the thing a *Recently
  changed* view would get wrong.
- **They do surface to the client now** — `Item` and `Term` both carry all
  three.

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

- **Position is restored after all — see
  [D44](#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)
  (2026-08-27), which reverses what this bullet used to say.** The spec had
  justified restoring position with "there are no timestamps"; that premise is
  false as of D35, and this section concluded from it that an undone item
  belongs at the top — reasoning from the *row*, which really is new, rather
  than from the *item*, which is not. In use it read as a bug. The item now
  carries an `addedAt` that undo hands back, and *Recently added* sorts on that.
- **A restored term no longer appends — see D44 (2026-08-27), which also
  reverses this.** It used to land at the end of its chip list, because the
  lists were in `collect()` order. They sort A–Z now, so a term put back by undo
  lands where its name puts it, and the fix cost an ordering rather than the
  client-held position this bullet was right to reject.

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
spec's. (**D50 later rewrote the types** — nine became fourteen, and this
decision's reasoning turned out not to apply to them at all.) The aim is that a new household recognises its own shelves and renames
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
status. *(Superseded 2026-08-29: the trigger moved to the row's right end beside
the sort — see the amendment below. The on-ramp is what that move gives up.)*

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
the pill says 11 and the glyph says what kind of 11.

#### Amended 2026-08-27: the trigger is a toggle that stays put, and it goes amber

**The trigger does not move and does not change its label.** In list mode it is
the same `Shopping list` + count control, in the same slot, wearing the low
tint and `aria-pressed`; pressing it again is a way out. *Back to items* is
still there — it is the **quiet** control at the row's left now, where the
status pills were.

**The pair was worse than it looked on the boards.** Swapping one label for the
other meant the control changed width, glyph and words at the same moment the
whole content column changed — two things to re-read where there should have
been one. Below `md` it was worse than that: the two labels lived in
**different rows**, the way in in the mobile header and the exit in row 2, so a
press made the thing under your finger vanish and put its replacement somewhere
else on screen.

**Holding its x costs one line of layout, and it is worth it.** Row 2's left
slot keeps its width in both modes: the pills go `invisible` rather than
unmounting, and *Back to items* is laid over them absolutely. Unmounting them
slid the trigger a third of the way across a 1440 screen on every press — and
you look back to where you pressed to find out what happened. `visibility:
hidden` is the right hammer over `opacity-0`: it keeps the geometry *and*
takes the pills out of the tab order and the a11y tree.

**Active is the low tint** — `low.bg` filled, `low.ink` for the border and the
label, the count pill inverted onto it — which is what the first boards drew
for this control. Amber was rejected **at rest** and stays rejected there: on
row 2 in grid mode it lands a gap away from `6 running low`, already amber and
meaning something else. That objection is void in list mode, because **the
pills are not on screen**. The only amber in the row is the trigger, and what
it means there is *you are shopping*.

The border is the low **text** colour rather than the border token, for the
reason this decision already records: these tints were drawn to sit on a card,
and out on the page ground the low fill reads 1.03:1 and the low border 1.16:1
while `low.ink` is 5.08 light and 9.33 dark.

**The exit is quiet, and it is the sort menu's resting treatment** — a chevron
and bold words on nothing, resolving to `surface-alt` on `line` under the
pointer. That rest is one literal, `PAGE_BUTTON_QUIET`, shared with the sort
trigger: two controls in the same row wearing the same rest and two different
hovers is exactly the kind of drift this app writes down once. It keeps its
words at every width, which is the original argument unchanged — an unlabelled
back arrow on a screen with no title is a guess. Escape and the ghost on the
everything-is-checked card are still the other two ways out.

#### Amended 2026-08-29: on desktop it is the way in, and the way out is the exit

D58's segment is a fourth control on a row that was already full, and it shipped
in a **row of its own** below the measured column — a fifth row at 390 in a top
bar whose worst case was already four. Buying that row back cost this amendment
most of its claim.

**The trigger is a glyph and a count at every width, and it lives at the row's
right end beside the sort.** Not after the status pills — that on-ramp is what
this gives up. The right end is the pair of controls that are *chrome*: neither
is about the pantry, both are about how you are looking at it, and in list mode
the segment takes exactly that slot. The label went with the move: the count
pill says how much, the glyph says what kind, and a word beside the sort's own
short label would be the odd one out. *To get* survives in `aria-label`, where
the whole sentence is read rather than the missing word.

**The sort names its choice the short way at every width too** — `Restock`, not
`Sort · Needs restocking`. A chevron says it opens and its position says what it
is; the full name is on the menu's rows and in its accessible name.

**Row 2 drops the trigger in list mode.** What is left is *Back to items* on the
left, the trip clause, and the segment at the right end where the sort trigger
stands in grid mode. **The pills' 368px reserved slot goes with it** — they
unmount rather than going `invisible`, since there is no longer an x to hold
still — and the two widths together are what the segment is built out of.

**So a press does remove the thing under the pointer.** That is the failure this
amendment was written against, conceded on one surface. Three things make it the
right trade here:

- **The exit is unambiguous and it is words.** The pair that was rejected swapped
  one control for a *different* control that looked and measured differently and,
  below `md`, lived in a different row. This is one control appearing and one
  disappearing in two clearly different places, with the screen behind them
  changed completely — nobody looks for the trigger where they pressed it,
  because everything there has changed.
- **A trigger in list mode is a second exit that argues with the screen.** Its
  count is the household's by design, and the screen it would sit on counts the
  filtered set. That pair is allowed to disagree beside the pills; beside a
  segment whose counts *are* the filtered set it is just two numbers for one
  question.
- **Below `md` nothing moves at all.** The trigger is in the mobile header in
  both modes, wearing its active fill, and that is the arrangement this
  amendment was really protecting — the phone, where the pair put the way in and
  the way out in different rows.

**Every control on the row shares a height** — 44px compact, 40 with room — off
row 2's `compact`, so the row has one baseline rather than three.

**Whether the segment wears its words is a separate question from `compact`,**
and conflating them is a bug rather than a nuance: `compact` is measured on the
content column, so a docked drawer on a 1280 screen is compact while leaving the
segment ~470px of spare room for labels it had already dropped. Geometry is one
flag; the label threshold is `ROW2_LIST_PX` plus a segment width that moves with
how many bands the household has.

**And the glyphs became a family.** The cart is the *Buy* band's mark now, so the
trigger is a **basket** once the household grows or makes anything — the test is
`sourceGroupWord`'s, a basket exactly when the group reads *Source* rather than
*Store*, because one garden creates the collision as well as a garden and a
kitchen do, and it follows the household's sources rather than the filtered
set's bands. **`All` wears the basket too**, reversing its own *the absence of a
choice is not a member of the set* rule: the basket already means *everything to
get*, and with the trigger off the row it was free. Having a mark is also what
lets `All` drop its word with the others, so the glyph-only row is four glyphs
rather than three and a word.

### Row 2 sizes off the column, not the viewport — 2026-08-26

**Found by using it**, not by drawing it. The boards switch row 2's controls to
their compact forms at 390, on `md:`. That is wrong in the middle: a docked
drawer costs **340px**, so a 1280 screen leaves 872 of content and is every bit
as cramped as a phone while sitting well above every mobile breakpoint. The
pills, the trigger and the sort all crushed together there.

`ROW2_FULL_PX` is measured from the parts rather than chosen. It was **910**:
three pills at full padding are 368, *Shopping list* with its pill is 165,
`Showing 20 of 20` is ~112, the sort naming *Recently added* is ~207, plus the
row's gaps. **It is 580 as of 2026-08-29**, because three of those four parts
changed — the count line is deleted, the trigger is a glyph and a count (~72),
and the sort names its choice the short way at every width (~100). What the
flag still governs is mostly touch geometry: the pills' short words, and the
44px height every control on the row shares. A `ResizeObserver` on the content
column decides it, because the
drawer's three states change the available width without the viewport moving at
all. It starts `true` — the compact row fits everywhere and the full one does
not, so the one frame before the observer fires is the one that can only have
too much room.

**The one thing that stays on the viewport is where the trigger lives.** Below
`md` it moves into the mobile header, squared up with the wordmark opposite the
menu button — it is chrome, a standing fact about the household rather than a
fact about the screen you are on. That is what buys the status pills and the
sort room to share one line again at 390, which they could not do with a third
control between them. Below `md` it stays in the header **in list mode too**,
wearing the low tint (amended 2026-08-27), so it is one control in one place at
each width rather than a control that relocates on press. **The exit does not
move either**: *Back to items* stays in row 2 with the list it exits, where it
can keep its words; beside a 27px wordmark at 390 neither would have room.

Row 2 gave up **`Showing X of Y`** first when compact — the pills already carry
the counts that matter and the grid is directly below. **It is deleted outright
as of 2026-08-29**: at no width was it saying anything the pills and the grid
did not, and its pair (rendered-so-far of matching) was never the pair the live
region announces (matching of household), so the two disagreed on screen by
design. The list's trip line stays, because nothing else on screen says it.

**Its count is the unfiltered total, always.** Scope to a store with nothing to
buy and the meta line reads `0 to buy at Costco` while the trigger still holds
11. The trigger answers *is there shopping to do*, which is a fact about the
household; the meta line answers *what is on this screen*.

It is hidden when nothing is low or out — the same argument that hides the sort
trigger at zero items (D37): a control that can only disappoint.

### The whole row is the checkbox — amended 2026-08-28

**Every press on a list row ticks it.** The row shipped as *two* targets: the
52px left column checked, and the name and the counts opened the Edit sheet.
The argument was that both were over 44px and neither could be hit by accident,
so there was no way to open a sheet when you meant to tick something.

**That is exactly what happened.** The reachable half of the row — the words,
which is what the eye goes to and the thumb follows — was the half that opened
a sheet. On this screen every press means *got it*, and the one that did not
covered the list with a form.

**There is no way to edit an item from the list now, and that is the point.**
Editing lives in the grid, which is one press away and named on the screen. A
list row is a thing to tick; if the count is wrong, the honest fix is the item
card, and pretending otherwise is what put a form over a shopping list in the
first place.

**One `<button role="checkbox">` spans the row**, box and words inside it, with
no `aria-label` — the row's own text names the control, so it announces as
*Butter, OUT, have 0 · low at 2, checkbox, not checked*, where the old label
replaced all of that with the name. A viewer gets no button at all, the same
row rendered as plain spans (D30). The hover stays on the `<li>`: the button is
a flex child and its own fill would stop at the row's rounding rather than at
its edge.

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

**And one that does — *Clear checks*, added 2026-08-28.** The three rules cover
every way a trip *ends*; none covers coming back to a list you ticked half of
and wanting to walk it again. Sitting the whole trip out for 24 hours is not an
answer, and unticking eleven rows by hand is the work the button removes.

It is a **ghost on the trip bar**, opposite *Hide N checked*, and a second one
on the all-checked bar where it is the likelier of the two things to do. Three
things it deliberately is not:

1. **Not crimson, and no confirm.** D36 governs records; a tick is not one.
   The clear is instant and the toast hands them straight back — and a dialog
   in front of someone holding a phone in a shop costs more than the mistake.
2. **Not the whole record.** It clears the ticks *on screen*. With a Store
   filter on, the trip holds ticks for rows nobody can see, and a control
   beside `Hide 3 checked` that quietly cleared seven would be lying about its
   own neighbour. The ids travel from the list into `uncheck(ids)`; the hook
   never empties itself.
3. **Not a viewer's control.** It arrives `undefined` without `mayEditItems`,
   like the tick itself, so the bar renders no button rather than a dead one
   (D30).

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

## D43: An invite code is a secret mixed with the row, because the runtime has no randomness

*2026-08-27*

**`INVITE_SECRET` from the server environment, hashed together with the row id,
the clock and two `Math.random()` draws, is what makes an invite code
unguessable.** Not `crypto` — the hosted runtime does not have it.

This was found the expensive way. `createInvite` worked under `sf dev` and
returned a bare 500 in production for three days. Three facts, all confirmed by
driving a keyed diagnostic endpoint against the published space on 2026-08-27,
and **none of them true locally**:

1. **`crypto` is `undefined`.** `serverRuntime` is `quickjs-rust`. It was the
   capsule's only non-core global, at one call site.
2. **Row ids are sequential integers** — `"4"`, `"6"` — not the v4 UUIDs
   `sf dev` mints.
3. **`ctx` offers nothing random**: `auth`, `db`, `env`, `gravatar`, `log`,
   `spam`.

So the only unpredictable thing available to a handler is a value we put there
ourselves.

### Why a hash, and not the row id

An earlier fix derived the code from the row id, on the reasoning that the
runtime generates ids so the runtime must have entropy. That reasoning was
sound and the premise was false. It shipped safely only because
`bytesFromUuid()` **refused an id that was not shaped like a v4** rather than
using it — which is exactly what happened in production, and is why the symptom
stayed a 500 instead of becoming guessable codes derived from `1, 2, 3, 4`.

Keep that instinct: a credential derived from an unverified source should fail
closed. The refusal was worth more than the fix.

SHA-256 makes the mix non-invertible, so observing codes never reveals the
secret or the counter. It is hand-written in `shared/sha256.ts` because there is
no host primitive, and it is checked against the published FIPS 180-4 vectors —
including two-byte and surrogate-pair UTF-8, since `utf8Bytes` is hand-rolled
too.

### The secret is load-bearing; the other inputs are not

`Math.random()` and `Date.now()` are mixed in, but **neither is relied on**.
QuickJS seeds its PRNG per context and nothing documents how, so an attacker who
knows ids are sequential and can guess the minute of minting must still not be
able to produce a code — and without the secret they cannot. If `INVITE_SECRET`
is unset the handler still mints, and logs a warning to `sf logs runtime`,
because breaking invites entirely is worse than a weaker code on a private
space.

`crypto` is still preferred when present, so `sf dev` takes it and production
takes the mixer. **That asymmetry is the original bug's shape**, so the mixer is
covered two ways: `codeFromSeed` is unit tested, and the handler was driven
locally with `crypto` forced off.

### Rejected

- **`Math.random()` alone.** Fine against the arithmetic — 31¹⁰ ≈ 8.2 × 10¹⁴, so
  network-bound guessing is hopeless — but not against a PRNG seeded from a
  clock, where a day's seeds are enumerable.
- **A random id column filled by the client.** The client is not trusted to
  choose a credential, and D3's rule is that ids come from the server.
- **Waiting for the platform.** `ctx.crypto` may well arrive; the workaround is
  small, tested, and easy to delete when it does.

Verified: five distinct codes over the mixer with `crypto` forced off, one
redeemed through `invitePreview`, and — on 2026-08-27 — **a second person
actually joined a household from a real invite link.**

---

## D44. The app writes its own timestamps, because the platform's cannot survive an undo

**Decided:** 2026-08-27

**The rule: a timestamp this app sorts by is a timestamp this app writes.** The
platform's `createdAt` and `updatedAt` are readable and useful, but neither can
be set by app code, so neither survives a re-insert — and undo is a re-insert
(D17).

Five tables gain columns, all ISO 8601 UTC strings defaulting to `''`:

| Table | `addedAt` | `changedAt` |
|---|---|---|
| `items` | ✓ | ✓ |
| `locations`, `types`, `stores` | ✓ | ✓ |
| `households` | ✓ | — |

`households` has no `changedAt` deliberately: nothing orders households by
recency, and a rename is not an event anything in the app reacts to. Adding one
later is additive, so this stays cheap to revisit.

`addedAt` is written once, at insert. `changedAt` is bumped by **every mutation
that writes a field a person can see** — `updateItem`, `adjustQty`,
`updateTerm`. `adjustQty` is not exempt: a quantity is information about the
item, and the hot path being hot is not a reason for it to lie.

Both create mutations — `addItem` and `createTerm` — accept optional stamps, and
the **only** caller that supplies them is undo, handing back the removed row's
own values. *Recently added* sorts on `addedAtOf(item)`; `changedAtOf` exists
for the same reason and **nothing reads it yet**, which is deliberate — the
column has to exist before there are rows to stamp, and a row written without
one never gets one.

The one path that could have left a term unstamped is `createHousehold`, which
seeds fifteen terms through `insert` rather than `createTerm`. They share one
stamp: the seeds arrive together, and staggering them a millisecond apart would
imply an order that isn't real.

**Why:** D17 makes undo a re-insert, so a restored item is a new row with a new
`createdAt`, and D35 made *Recently added* sort on exactly that. Undoing a
removal therefore threw the item to the top of the list. D36's write-up argued
that was correct — *"which is where a row that was just re-added belongs"* — but
that reasons from the row rather than from the item. Undo means *nothing
happened*, and a list that reorders itself is something happening.

**Why not just set `createdAt` on the re-insert:** the platform refuses. An
insert supplying it fails with *"Zero manages items.createdAt; app code cannot
set it directly"* — confirmed against a running capsule on 2026-08-27, not
inferred from the docs' "those names are reserved". That refusal is the entire
reason this column exists.

**Additive, and it applies on the next publish with no flag** — the same shape
as `households.ink` (D42). Nine tables, sixteen mutations, zero migrations.
A row written before these holds `''`, which is not a transitional state:
nothing backfills, so the fallback chain — `changedAt` → `addedAt` →
`createdAt` — is that row's sort key permanently. Every link is ISO 8601 UTC on
the same scale, so a list mixing them still orders correctly (D4).

**The supplied stamp is validated, not trusted.** `normalizeStamp` falls back to
now for anything unparseable and **clamps a future stamp to now** — a stamp
ahead of the clock would pin a row to the top of *Recently added* forever, which
is the bug this exists to fix rather than a new way to cause it.

### Rejected

- **A `deletedAt` soft delete.** Would restore the row itself and need no new
  stamp, but it is what D17 rejected and for the same reason: a filter on every
  read, forever, and a second mode for cascade cleanup to get wrong.
- **Patching the sort client-side** by remembering `newId → old stamp` for the
  session. Free, and wrong the moment you reload or open a second device —
  the item would jump to the top later, which is worse than jumping now.
- **Reusing `updatedAt`** for `changedAt`. Platform-managed the same way
  `createdAt` is, so it cannot survive an undo either — a restored row's
  `updatedAt` is the moment it was restored, which is the same bug one field
  over.
- **Ordering terms by `addedAt`** instead of A–Z. It would have "restored
  position" in the same sense items get it, but creation order is not an order
  anybody reads a name list in. Alphabetical is what the eye is already doing.

**Trade-off accepted:** `addedAt` and `createdAt` are the same value for any
item that has never been removed, which makes the column look redundant on
inspection. It diverges exactly once per undo, which is the whole point.

**Terms are now ordered too, and it is not by a stamp.** The three taxonomies
sort **A–Z by name**, applied once in the `pantry` query so the drawer's
filters, the item sheet's chips and the shopping list's cards cannot disagree.
They were in `collect()` order — seed order for a new household, creation order
after that, which is an order nothing about the list tells a reader to expect.
This also closes what D36 recorded as *"a restored term appends"*: a term put
back by undo lands where its name puts it.

**Not covered:** `memberships`, `invites`, and the two join tables. Nothing
orders them by time today, and every column is permanent — dropping one needs
`sf db migrate --drop`. If any of them ever grows a chronological view, it needs
its own stamps *before* the rows that would want them exist.

Verified against the real handlers over `POST /__spacefast/zero/run`: three
items added in order, the middle one removed and undone, and the list read back
— `addedAt` order keeps it in the middle while `createdAt` order (the bug) puts
it first. Then, on a fresh household: seeded terms come back A–Z and stamped;
an item's `changedAt` moves on `adjustQty` and again on `updateItem` while its
`addedAt` holds still; a removed item and a deleted term both come back with
**both** stamps byte-identical and a visibly newer `createdAt`; and a renamed
store re-sorts alphabetically. The clamp and the fallbacks were driven the same
way.

---

## D45. The applied filters are a row of the top bar, not a badge on the drawer

**Decided:** 2026-08-27

**A filter you cannot see is a filter you cannot remove.**

With the drawer closed, the set of active term filters was invisible on mobile
and merely *countable* on the collapsed rail: the rail's badges said `1` and `2`
without saying which of sixteen terms they meant, and nothing cleared across
groups from out there. The only route to either answer was to open the drawer,
which on a phone means covering the thing you are filtering.

Row 3 of the top bar closes it — `Clear filters`, then one chip per active term,
present only while at least one **term** filter is on. Most of the time the bar
is still two rows.

**Nothing on the rail moves.** The badges still count per group; they were never
wrong, only insufficient.

### Filtering became multi-select, and that is the other half of this

**OR inside a group, AND across groups.** Every group holds a *list* of term
ids now, not one. *Pantry* and *Freezer* together widen — anything in either —
while *Pantry* and *Protein* together narrow. That is the only reading under
which picking a second location can add items to the screen and picking a type
can never do so, which is what the two kinds of list are for: one names where a
thing lives, the others name what it is.

The app had always been single-select, and the applied bar is what made that
untenable: a row whose whole argument is *see what is on and take one off*
implies there can be more than one on. `shared/filter.ts` owns the rule, and it
is in `shared/` for one reason — an `every` where a `some` belongs still
compiles, still runs, and hands back an empty grid. `npm test` is the only thing
that can see the difference.

What moved with it:

- **`FilterSection` and the rail flyouts toggle rather than select**, and both
  carry `aria-pressed`. `All items` is the *absence* of a selection, not a
  member of it, so it lights when the group is empty.
- **The rail's quick-filter flyout stays open on a pick**, alone among the rail's
  menus. A group holds several terms now, and closing after each one means
  reopening the same panel to add the second — it is a list you work through,
  not a choice you make once.
- **The rail badges count the group**, where they used to count `1`.
- **`emptyCopy` counts terms, not groups.** Two locations at once is two things
  narrowing the screen, so it lands in the "anything else" branch — which is
  right: with *Pantry or Freezer* on and nothing showing, neither name is the
  cause on its own.
- **The add sheet prefills a location only when the filter is unambiguous.**
  With two on, picking one of them would be the app quietly choosing, and
  choosing wrong is worse here than choosing nothing.
- **The shopping list names a store only when exactly one is selected** — the
  sentence it feeds is *Nothing to buy at Costco*, which two stores cannot
  complete.

### What the row does and does not answer for

- **Term filters only.** Location, store, type, in the drawer's own order, so
  the bar reads in a sequence someone has already learned. Within a group the
  chips come out **A–Z**, because the bar walks the term list rather than the
  selection — two people who picked the same three terms in different orders
  see the same row.
- **The status pill is not mirrored into it.** It is already on screen in row 2
  and is already its own toggle; a second copy would be two controls for one
  filter. The consequence is that `Clear filters` clears something that is not
  in the row it sits in, which is exactly why it carries **no count** —
  `Showing X of Y` is the count.
- **Search is not touched.** It has its own `×` in the field, and you can see it
  working. `clearAllFilters` — the one the empty state offers — still takes it,
  because there the copy says the filters *together* rule everything out and the
  search is part of "together".
- **It is not conditional on the drawer.** The applied set is a fact about the
  content column, not about the drawer, and appearing on collapse would reflow
  the grid for a reason unrelated to what was pressed. Drawn open it is
  redundant with the Filter tab, and harmless.
- **It stays in list mode.** The shopping list obeys the same filters, so the
  bar and its clear come with it. Row 1 never changes and row 2 swaps its
  contents, which is what makes the switch read as the *content* changing rather
  than the app changing.

### The chip is the off chip with an `×`, and it is not inverted

Surface fill, `line strong` edge, 7px term dot, `×` in faint. In a row where
every chip is on by definition, inversion says nothing — and a row of ink fills
would take *Add item*'s only-ink-on-screen rule apart.

**One action, so one target.** The whole chip removes its term; the `×` is a
glyph, not a second hit area. 30px desktop, 44px mobile.

**Removal is neither undoable nor confirmed, and gets no toast.** Nothing is
lost, the term is still in the drawer, and one tap puts it back. D36's rule is
about *records*; a filter is neither a record that comes back nor one that does
not.

### The interaction state moves away from the ground

Hover, pressed and focus share one treatment, because the chip is on its way out
the moment you press it and a separate press state has nothing left to report.
**No transform** for the same reason: with the two merged, a `scale()` would
fire on hover, and a chip that flinches when you point at it is worse than no
press feedback.

The active fill is **`line` in both themes** — `#E2D5C0` light, `#3E3527` dark —
and that is the finding worth keeping. The app's usual ghost hover is
`surface-alt`, which *is* the ground gradient's own middle stop; out here a chip
hovering to it goes from a step lighter than the ground to exactly the ground,
and the hover reads as the chip disappearing. The general rule, which now sits
with the three theming rules in the spec: **an interaction state on the ground
moves away from the ground, not toward it** — darker on the cream, lighter on
the dark. Controls on a *card* keep sinking to `surface-alt`, because there it
is a real step.

The focus ring is crimson rather than the page's usual ink: ink is what this
row's chips are made of, so an ink ring on an ink label reads as a thicker
border.

### Rejected

- **A coloured chip.** The first draft gave each chip a 1.5px border in its
  term's *text* colour, which solved the ground-contrast problem outright and
  made the dot redundant. Sixteen possible hues shouting at rest made the row
  the busiest thing on the screen. The neutral edge puts the chips at the same
  weight as the sort trigger beside them.
- **Hiding the bar while the drawer is expanded.** The alternative reflows the
  grid on a drawer toggle, for a reason unrelated to the toggle. The redundancy
  with the Filter tab is accepted: **settled 2026-08-27**, leave it visible.
- **A step *down* in both themes** for the active fill, which is how it was
  drawn first and is exactly why the dark states came out indistinguishable
  from rest.

### Built here, not in the spec

- **`Desktop wraps; mobile scrolls` is `md:`, not the measured content column.**
  Row 2 sizes off a `ResizeObserver` because its question is whether its labels
  fit, and a docked drawer costs 340px without the viewport moving. This row's
  question is different: whether there is a **scroll gesture** at all. A mouse
  has none, so a docked drawer on a 1280 screen must still wrap even though its
  column is as cramped as a phone's. Different question, different axis — this
  is not the mistake the row-2 note warns about.
- **The drawer's `Clear all filters` is now the same function**, and its
  visibility moved with it: it used to appear whenever *anything* narrowed the
  grid, search included, which would now put a button on screen that does
  nothing when a search is the only filter on.
- **The announcement quotes matching-of-household**, `Showing 12 of 20` — which
  is what the sentence means to someone who cannot see the grid, and what the
  spec's boards draw. Row 2's own `Showing X of Y` is a different pair: items
  rendered so far, of items matching, because it sits above a list that is still
  growing as you scroll. The two disagree on screen today and always did.
- **The live region lives in `Pantry`, not in the bar.** The bar unmounts with
  its last chip, so announcing *Filters cleared* from inside it would be
  announcing from a node that has just been removed.
- **Focus moves to `Clear filters`** when a chip is removed and the bar
  survives. The element that held focus is gone, and focus falling to the body
  means a keyboard user starts tabbing from the top of the document again. It
  paints no ring after a mouse press: a programmatic `focus()` matches
  `:focus-visible` only when the interaction that led to it was itself
  keyboard-driven, so the ring appears exactly when someone is looking for it.
- **`Clear filters` is padded symmetrically at every width.** It was drawn with
  2px on the left so its label would sit flush with the column edge; on a phone,
  where the hover fill is the only press feedback there is, that put the fill
  hard against the *C*. At 12px the label lines up with the status pills' labels
  one row above, which is the alignment that was actually wanted — and the
  scroller beside it keeps its `pl-1` uncancelled, because those 4px are half
  the gap the two boxes had none of.
- **A chip's key is `kind:id`.** Row ids are only unique within a table, and the
  hosted runtime issues sequential integers — a location and a store both
  holding `"4"` is the normal state of a freshly seeded household, not a
  hypothetical.

## D46. The display name is on the account, and it is asked before the fork

**Decided:** 2026-08-27

**The account carries a name; the identity does not carry it for us.**

Gravatar is the sign-in provider, but a real signup on the published space is
janky in a way the design assumed away: a lot of accounts arrive through the
my.spacefast.com path with **no profile name at all**, and the ones that do
arrive with a name did not necessarily set it on Gravatar and did not set it
*here*. `ctx.auth.displayName` is therefore a suggestion, not an answer. Larder
Log collects its own **display name** and stores it on the account.

### Why a new table

`memberships.displayName` already existed and is not a substitute. It is scoped
to one household, and the moment that matters most — someone following an invite
link — has no membership yet. The name is also the *same* name in every
household: asking again per pantry would be asking the same question twice and
inviting two answers.

So `profiles` — `userId`, `displayName`, and D44's two stamps — with a `by_user`
index, which is the only way in. The **third additive schema change since Phase
2**, after `households.ink` (D42) and D44's nine stamp columns: ten tables, five
queries, seventeen mutations, and it applies on the next publish with no flag.

The stamps are there from birth on purpose. Nothing orders profiles by time
today, and D44's own note is the argument for including them anyway — a column
is permanent, a row written without one never gets one, and this table has no
rows yet, so they are free here and could never be free again.

### `memberships.displayName` stays, as a copy

It is now a **denormalized copy of the account's name**, and that is a decision
rather than an accident. The alternative is for the `household` query to join a
profile row per member on every refetch, and `invitePreview` to do the same for
the inviter — on a live query that re-runs whole, for a value that changes
approximately never.

The cost of a copy is that it can go stale, so `setDisplayName` writes back
through every membership the account holds. A rename that skipped that would
show the new name to the person who typed it and the old one to everybody else,
which is worse than having no column. Rows already carrying the name are
skipped, so a rename across five households is one write, not five.

`accountName()` in the capsule is the single place a membership's name is
resolved, and it walks `pickDisplayName`'s chain: the profile, then a name the
account already joined somewhere under, then the identity.

### It is its own step, before the fork

Someone accepting an invite never sees *Name your household*, and they are
exactly the person whose name the rest of that household is about to see. So the
name is asked once, immediately after first sign-in, **ahead of both** the
first-run household screen and the `?join=` landing. In `Pantry` that means the
gate sits above the invite card, and the consented auto-redeem waits for the
name to settle — the end state is the same either way, since the write-through
would fix the membership a beat later, but waiting is what keeps the other
members from seeing the wrong name in between.

The screen blocks on the `profile` query rather than painting the invite card
and replacing it. That costs nothing: every subscription on the screen starts in
the same tick.

### Existing accounts are grandfathered, and the rule is narrower than it looks

`needsName` is **not** "has no profile row". An account that predates this table
carries the Gravatar name it joined under on every membership it holds, which is
a name it has effectively already answered with. Sending those people through a
required screen would be a wall in front of everyone who was using the app
yesterday.

So the query falls back to the memberships, and `needsName` is true only when
there is no name **anywhere**. That covers both cases that deserve the screen: a
brand-new account, and an old one that never had a name to inherit.

### Required, not skippable

A blank display name puts an unnamed row in Members and an unsigned change in a
shared list. The only fallbacks are an email address — which is not a name, and
exposes one — or a generated label nobody recognises. It is one field, once.

The rejected alternative is optional-with-a-fallback to the email local-part,
and it is one line to change if the friction proves worse than the ambiguity.

**Amended by [D48](#d48-a-name-nobody-typed-is-not-an-answer)**: the field
described below as prefilled from the identity now starts **empty**, and so does
the household name. The reasoning here is unchanged — it is the same argument
carried one step further.

### Two departures from the boards

- **The account row carries a *Sign out*.** The boards draw the row without one.
  The screen is *required*, so without it an account signed in by mistake has no
  exit that is not clearing cookies — a dead end the boards could not see
  because they are two states, not a flow. Same control and same treatment as
  `SignedInRow`'s.
- **The identity's name is passed through raw.** The entry used to hand `Pantry`
  `auth.displayName || 'Signed in'`, which made an absent name look present —
  precisely the case this screen exists to catch. It would have prefilled the
  field with *Signed in* and told the visitor Gravatar had a name for them.
  `Pantry` resolves the account's real name and falls back for display there.

### What is deliberately not in this round

Editing the name from the drawer. Settings' Account section is specified for it
(*Editing the display name*), and a new sidebar drawer is in flight — the
mutation is already the right shape for it, since `setDisplayName` is an upsert
and the write-through is what a rename needs.

---

## D47. The sign-in button names no provider

**Decided:** 2026-08-27

**Hosted sign-in is a Spacefast account, not a Gravatar one, and the button
says the act rather than a brand.** *Sign in*, on a lucide `LogIn` glyph.

### The button had been wrong since Phase 4.7

`SignInWithGravatar` does not go to Gravatar. Following its own redirects on the
published space:

```
GET /__spacefast/zero/auth/gravatar/start
302 api.spacefast.com/v1/access/acquire/<id>?host=…&return=%2F
303 my.spacefast.com/sign-in?returnTo=/access/v1.<token>
```

It is **Spacefast account sign-in**, and `GET /v1/auth/capabilities` — public,
unauthenticated — says what that screen offers:

```json
{"providers":{"wpcom":true,"google":false,"github":false},
 "emailOtp":true,"password":true,"captcha":null}
```

Three lanes: **WordPress.com, an emailed one-time code, or a password.** So
*Sign in with Gravatar* was telling most of the people who pressed it to go and
get an account they do not need — and telling everyone who did not press it
that the app was closed to them. Gravatar's own ring mark, drawn on the button
beside it, was the logo of a service the destination never mentions.

This also settles, retroactively, why D46 exists at all. An account made with an
emailed code has no profile behind it and therefore no name, which is why real
signups arrive nameless. That is the **majority** path, not an edge case.

### Why not name Spacefast, and why not name the lanes

*Sign in with Spacefast* is accurate and was rejected anyway: it trades one
brand the visitor has no relationship with for another, and the account is an
implementation detail of the host, not a thing Larder Log is asking anyone to
join. The existing footnote — *New here? Signing in creates your account* —
already does the only job the brand was doing.

Naming the lanes in supporting copy (*"an email code, a password, or your
WordPress.com account"*) was rejected for a harder reason: **it is copy that can
go stale silently.** Those three are deployment flags — `google` and `github`
are present and `false` today — and nothing on our side would tell us if
Spacefast turned one on or dropped one. The lanes are visible on the very next
screen, where they cannot be wrong.

The avatar is a separate question and keeps its name. `auth.picture` really is a
`gravatar.com/avatar/…` URL, so every *"the Gravatar avatar"* comment in the
client is still true. What changed is the **sign-in**, not the **picture**.

### What moved

`GravatarButton` is `SignInButton` and `GravatarMark` is deleted; the lucide
`LogIn` glyph replaces it on the card, the marketing hero, the marketing nav,
and the invite landing. `Spinner` keeps its shape but not its reason — it was
tuned to Gravatar's ring so a press read as that mark spinning, and it now
tracks lucide's 24px grid so it swaps in beside `LogIn` at the same weight.

The labels: *Sign in*, *Sign in to join*, and *Signing in…* while the redirect
is in flight, replacing *Opening Gravatar…*. `SignInFailedCard` says *the
sign-in page* closed. `DisplayNameCard`'s account row says *Signed in*, and its
two hint branches name the account rather than Gravatar — which is also more
honest, since the identity name arrives through the platform and we cannot tell
which lane produced it.

`signInWithGoogle` is now aliased to `hostedSignIn` in `client/index.tsx` rather
than `signInWithGravatar`. The old alias claimed a provider; the obvious
replacement, `startSignIn`, **collides with the app's own handler of that name**
one screen down, and TypeScript caught the recursion.

### Rejected

- **Restricting the app to email and password.** The platform does not permit
  it: `zeroRuntimePublicAuthConfigSchema` pins `provider` to the single literal
  `"gravatar"`, `signInPath` and `signInUrl` are served to the client by the
  runtime rather than declared in `sf.jsonc`, and the client appends only
  `returnTo` before handing off. We get whatever lanes that screen shows.
- **Building email and password inside the capsule.** Possible, and the worst
  variant this runtime could be asked for. A password needs a slow KDF; there is
  no `crypto` (D43), so that means iterating `shared/sha256.ts` by hand. Measured
  on Node with JIT: 206k hashes/sec, so OWASP's 600k PBKDF2 iterations cost 5.8
  seconds *there*. The hosted engine is an interpreter, which puts it minutes
  away, per sign-in, inside a request. Lowering the iteration count is not a
  compromise, it is the absence of the feature — and `sf db export` exists.
- **Email one-time codes of our own.** Genuinely viable, and the file to reach
  for if identity ever has to stop depending on a Spacefast account:
  `ctx.email.send()` is brokered and transactional inside a mutation, `ctx.spam`
  takes a `signup` type, and D43's mixer already mints unguessable codes without
  randomness. Not built, because the platform's own sign-in already covers it
  and the cost is structural: **a query and a mutation cannot see request
  headers** — only an `endpoint` gets an `EndpointRequest` — so a session token
  would become an explicit argument on all five queries and all seventeen
  mutations, and `ctx.auth` would become decorative.

---

## D48. A name nobody typed is not an answer

*2026-08-27, amending D46*

**Neither the display name nor the household name arrives prefilled.** Both
fields start empty and their primary stays disabled until something is typed.

D46 built the display-name screen precisely because `ctx.auth.displayName` is a
suggestion rather than an answer — and then seeded the field with it anyway. The
household screen did the same thing one step further removed, composing
`` `${displayName}’s Household` `` out of a name that was itself a suggestion.

**A prefilled field asks a question it has already answered.** The default path
through both screens was Enter, and Enter accepted a value the person never
chose: a WordPress.com profile name picked years ago for something else, or
*Justin's Household* for a pantry nobody calls that. The screens then reported
success while having collected nothing. That is worse than not asking, because
the app now holds a name it will show to other people as though it were chosen.

The household name has a second failure the display name does not: it is the
**only** thing that tells two pantries apart in the switcher (D3, D33). Two
accounts prefilling from the same first name produce two entries differing by an
apostrophe.

### What the fields say now

The prefill was load-bearing for copy, and removing it removed the copy with it:

- **The display-name hint is gone entirely.** Both of its branches — *from your
  account* and *your account didn't come with a name* — existed only to explain
  where the value in the field came from. With nothing in the field there is
  nothing to explain, and the paragraph above already says what the name is for.
- **The household hint keeps its second sentence and loses its first.** *Taken
  from your own name* described the prefill; *the colour is how you will tell it
  apart later* describes the control beside the field and is still true.
- **`DisplayNameCard` no longer takes a `suggestion`.** The prop, its
  `inherited` memo, and the `useMemo` behind it are deleted rather than left
  unread.
- **Neither field selects on mount any more, only focuses.** Select-on-mount
  existed so typing would replace a name you did not choose; there is nothing to
  replace.

**No placeholder on the display name, and that is now a stronger rule than it
was.** `HouseholdIdentity` keeps its own *Household name*, which names a
category. A placeholder on this field would have to be an example *person's*
name, and a greyed-out example is a prefill that cannot be submitted by
accident — the same suggestion, one step quieter.

### What did not change

`needsName` still grandfathers an account carrying a name on any membership, so
the people this would newly inconvenience — everyone who was using the app
yesterday — never reach either screen. The identity's name is still passed to
`Pantry` raw and still renders in `SignedInRow` and the avatar; what stopped is
its use as a *starting value for someone else's answer*.

### Rejected

- **Prefill but require an edit.** A field that refuses the value it came with
  is a puzzle, and it would still have anchored the answer.
- **Keeping the household prefill only.** It is the weaker of the two: at least
  a display name is a name the account really does carry somewhere, while
  *X's Household* was assembled here out of a suggestion.

This is the **fourth** knowing departure from the design documents, after D42's
missing tile preview and removed collision caption and D47's provider-free
button. The display-name boards draw two states, *had a name* and *didn't*, and
the build now has one.

## D49. Settings is three blocks, and members are a level down

*2026-08-27, amending D30's Settings order and closing the invite-link
complaint. Client only: no schema change, no new handler, nothing server-side
moved.*

**The Settings pane had six labelled sections and printed the same two facts
three times over.** You appeared in Account, again in Members, and again in the
row at the foot of the drawer; the household appeared in the switcher and again
under its own heading. The role controls were a segmented strip that unfolded
under whichever member you last tapped, anchored to nothing. What replaced it is
**three blocks, a pushed pane, and two menus**, drawn on
`.claude/docs/design/larderlogdrawerpreview.html` and specced under *Settings
tab*.

Three rules did the cutting:

1. **The household tile appears once**, in the switcher. Nothing in the pane
   draws it — which also retires the *no tile preview* departure D42 recorded,
   since the switcher is directly above the rename panel either way.
2. **You appear once**, in the row at the foot of the drawer. There is no
   Account block, and nothing anywhere says whether you are signed in: if you
   are reading it, you are. The build's version of that block was the worst
   thing in the pane — an *Account* heading over *Not signed in* and a raw
   account id where a display name goes.
3. **Scope is in the label.** *Preferences* are yours and follow you between
   households; *Pantry settings* belong to the household you are in.

Rule 3 is what moved the default low-stock threshold out of Appearance's
company. It is a fact about the pantry, not about the person looking at it —
two people in one household who disagree about it are disagreeing about the
*household*, which is exactly what makes it a setting rather than a preference.

The cost is that *Preferences* sits between *Household* and *Pantry settings*,
so the two household-scoped blocks are not adjacent. Ordered yours-first on
purpose, because Appearance is the one anyone actually changes, and the labels
carry the distinction rather than the grouping.

*Leave household* moved **inside** the Household card, under a hairline, rather
than floating between two sections as a crimson row two rows into the pane. It
is contained by the block it belongs to.

**The rename panel is flush with the card, not a box inside it.** `TermPanel`
earns its rounded box and its ring in the Filter tab, where it floats in a
column — but dropped into the Household card it put a box inside a box with the
colour picker's own well inside *that*, three nested outlines on one screen and
only the innermost one carrying information. So it gained a `flush` variant: the
fill runs edge to edge from the card's top corners (12px, the card's radius less
its 1px border) down to the hairline above *Members*, which is the bottom edge
it already had. Same construction, same header, same *Done* pill — it just stops
drawing an edge the card is already drawing.

### Members and invites are one subject, and they get the full 340 together

The chevron on the Members row pushes a second-level pane: a back button,
*Members* in Playfair 21 with the household name beneath, the member list, then
Invites.

**This settles the standing complaint that invite links are cramped at 340px.**
The link now has a full-width field of its own, which it could never have as a
section competing with five others. It is a layout answer to a layout problem;
nothing about the code changed.

**The member rows are divided edge to edge**, where the spec's text says
"hairlines inset past the avatar". At 340px with three rows the inset rule reads
as a ragged edge rather than as a list, and the Household card two taps away
divides its own rows full-bleed — so this is the drawer agreeing with itself.
Inset rules survive where they belong, in the menus, whose rows are padded 6px
inside the box and whose dividers match that padding.

**The pane drops the Filter / Settings tabs while it is pushed**, and back is
the only way out. A decision rather than an oversight — a second-level pane that
keeps a tab bar it does not belong to offers a sideways exit from somewhere
nobody arrived sideways — and the first thing to revisit if it reads as a trap.
A household switch pops it, because the members you were looking at belong to
the household you left.

### The role word is the trigger, and the menu is the drawer's own surface

**Owner only, and never on your own row.** A member row carries the role and
nothing else: `Remove from household` is the last row of the same menu, so a
`⋯` beside it would be a second control opening a menu you can already reach.

- **Rest** is the hairline fill with a chevron; **open** takes the rail's
  documented cream state, and the menu drops below, right-aligned, 224px inside
  a 340px pane so it never asks for room the drawer does not have.
- **Selection is a check, not a fill** — the sort menu's rule, and for the same
  reason: with the fill doing both jobs a hovered row looks selected. This is
  that rule's second user.
- **Nothing in it is disabled.** Demoting the household's only owner is refused
  server-side and is unreachable here anyway: you have to be an owner to see the
  menu and it never appears on your own row, so the person in front of you is
  never the last owner. The old panel disabled those rows, which is the thing
  D36 already decided against — a disabled control cannot explain itself.
- **Your own row has no trigger.** Demoting yourself while you are the only
  owner is the blocked dialog that already exists for leaving.

**Two alternatives lost.** Reusing the sort menu's cream popover was free and
already consistent, and it broke the first rule of the theming section: the
brightest thing on the screen opening over the darkest panel in the app. Putting
everything behind a `⋯` kept the surface right and named the role twice, once on
the row and once in the menu. What shipped is the second one's colours with the
first one's mechanics.

### The account row opens a menu, not a section

The row at the foot of the drawer — avatar, display name, email, chevron — opens
**the same component the collapsed rail's Account flyout opens**. That is why
the pane needs no Account block at all: the thing it held already had to exist
for the rail.

Two rows, and that is all. The identity row's pencil flips it **in place** into
the composer's field with a *Done* pill — no modal, no profile screen, Escape
cancels, and **no toast**, because the row coming back read-only with the new
name in it is the whole confirmation. That is the same argument the old Account
section made (D46), moved to where you already were. Then a hairline, then
*Sign out*.

**Not in v1: *Change your picture*.** The board draws a third row handing off to
Gravatar with the outbound arrow that means *this leaves the app*, and marks it
a mockup. It is drawn so the menu's proportions are known before there is
anywhere to send people; the build ships two rows.

### Making an invite is the term composer again

The dashed *New invite* row **stays put and drops the composer in below itself**
— the Filter tab's editing panel at drawer scale, so this is a component that
already exists rather than a new interaction. Header with a *Create* pill and a
ghost `×`, a hairline, three role chips with *Editor* preselected, and a
sentence that changes with the chip. Then *The link will work for 14 days.*

Three role names are meaningless words on their own and *Viewer* is the one
nobody can guess, which is what the sentence is for — and it is the same
sentence the invite landing will need when the Viewer pass is designed, so the
Gaps entry for that role is narrower than it was.

**The board's sentence for Editor was wrong, and it shipped once.** *"Can add,
edit and remove items. Can't invite anyone or rename the pantry."* — but
`editor` holds `invite:create` and `invite:revoke`, and `invitableRoles` lets
them mint Viewer invites (D21); it also holds `taxonomy:write`, which "items"
omits. The rule is worth stating plainly: **copy that describes a permission is
as wrong as code that gets it wrong, and it is the half nothing typechecks.**
`ROLE_BLURBS` now carries the capability table it is claiming, in a comment,
beside the sentences.

**The link is not single-use, and the copy now says so.** `redeemInvite`
neither consumes nor revokes the row, so a code works for everyone holding it
until it expires or is revoked — which is what "bearer credential" means and
what D21 and D43 already say. The first copy read *"It works once and expires
in two weeks"*, wrong twice over; replacing it with the bare TTL fixed half.
The number is interpolated from `INVITE_TTL_DAYS` rather than typed, so the
sentence cannot drift from the rule the server enforces.

The `?join=` landing's own role sentence is a **positive** list — what you will
be able to do — so it omits rather than denies, and stays accurate. It is still
worth a pass when the Viewer role is designed.

**Expiry is a countdown, not a date** — *Expires in 12 days*. It answers the
question the date was standing in for and needs no year, no locale and no
format. The `?join=` landing still spells a date, and that is deliberate rather
than missed: on a link someone opens cold, a date may be the thing they can act
on. It is the one place the two spellings coexist.

**A card collapses to its header once it is not the newest.** Four live invites
is otherwise four link fields stacked in a 340px pane, and the one you are about
to copy is the one you just made.

### What this leaves unreconciled, on purpose

- **The composer's role chips are a third answer to the drawer's off-state
  chip.** The boards draw a `drawer-dashed` outline with no fill, where the
  filter chips are `drawer-raised` and the page's are surface-on-line. Built as
  drawn, and written up rather than quietly normalised — see *Product questions*
  in `notes.md`.
- **The household name still appears twice**, in the switcher and in the
  Household row. Much quieter than before, since the second tile and the
  Playfair size are gone, and the argument for keeping it is that the switcher
  *chooses* a household while Settings *renames* one. If that does not hold up,
  the fix is to drop the name from the row and show it only inside the field
  once the pencil is pressed.

### One knowing departure from the boards

**The rail's account flyout keeps the rail's own flyout surface**, not the
drawer menu's fill, and only its width moves to the 292 the boards give it. The
household and appearance flyouts sit a few pixels above it on that surface, and
one flyout in three wearing a different fill reads as a different kind of thing.
The shared *component* is the contents — identity row, hairline, sign out —
which is the arrangement `HouseholdSwitcher` already has, where each host owns
its box and its own dismissal.

### Rejected

- **Keeping Members and Invites as folding sections.** They fold because they
  run long, which is a symptom of a pane holding two subjects at once.
- **A `⋯` overflow menu on the member row.** Above.
- **Disabling the last-owner rows.** Above, and D36.
- **A modal for the display name.** The Filter tab's pencil idiom already
  exists, and a modal over a menu over a drawer is three surfaces deep.
- **Boxing the Filter tab's chip groups the same way.** Built and reverted the
  same day, on the reasoning that the two tabs should not read as two
  interfaces. They should not, and this was the wrong lever: a settings block
  holds rows of one value each and earns an edge, while a filter group is a
  cloud of chips that already has an edge per chip — three cards of chips read
  as clutter. It also cost the chips their own step, since `drawer-raised` is
  what the card is made of, so they had to move to the hairline fill to have any
  edge at all. **The tabs converge through the micro-label header and the
  editing panel, not through the box.**

---

## D50. The seeded types are a supermarket, and the other two taxonomies are not

**Decided:** 2026-08-27

**Amended 2026-08-31 — there are fifteen, and the fifteenth is `Dry Goods`.**
It is the bulk shelf: dried beans and lentils, nuts and seeds bought by the bag,
dried fruit — the things that are neither a *grain* (rice, pasta, oats) nor a
*baking* ingredient (flour, sugar, leaveners), and which the first pass put in
`Grains` because that was the closest thing there was. It passes this decision's
own test — *would a household hold two or more things that fit here and fit
nowhere else?* — and **Grains, Baking and Canned Goods keep everything they
already held**; an item can carry two types where the line is genuinely blurred,
which is what a 5lb sack of rice does. It takes `color-11`, so **the headroom
this decision reserved is down from two unspent tokens to one**: a sixteenth
seeded type would take it to nothing and make a household's own first type
arrive wearing Produce's olive, which is a decision rather than a list edit.
**This reaches new households only** — nothing backfills, for the reason below,
so an existing household adds it once by hand.

**Amends [D40](#d40-seeded-terms-are-generic-and-there-are-still-three-stores)**,
which treated all three seeded taxonomies as one problem. They are not.

D40's rule was *generic, so a household renames rather than deletes*, and for
locations and stores it holds: a shelf is one you name yourself, and where you
shop is yours. It quietly carried types along with it — nine, kept from the
design's sample data because they were "already generic". Generic they were;
complete they were not. **Produce · Dairy · Protein · Grain · Condiment ·
Beverage · Snack · Baking · Spice** has no home for bread, canned tomatoes,
cereal, cooking oil, or a frozen pizza — five of them in a normal week's
shopping.

**A type is not like the other two.** It is a kind of food, and kinds of food
are the same in every kitchen. Nobody needs to *personalise* the fact that
tinned beans are canned goods. So the seeding aim for types is the opposite of
D40's: not a starting vocabulary to make your own, but **coverage** — enough
that the first twenty items go in without ever opening the composer.

**Fourteen**, and each earned its place against one question: *would a real
household hold two or more things that fit here and fit nowhere else?*

| | | |
|---|---|---|
| Produce | Dairy | Meat |
| Baked Goods | Grains | Canned Goods |
| Condiments | Oils & Vinegars | Spices |
| Baking | Breakfast | Snacks |
| Beverages | Frozen Meals | |

**The names stay short.** Every one of the nine survives its own wording, and
only **Protein → Meat** is a real rename: *Protein* read as an ingredient label
rather than as something you buy. The others merely pluralised — *Condiment*,
*Grain*, *Snack*, *Spice*, *Beverage* — since a type names a shelf's worth of
things rather than one of them.

A first pass widened six of them into pairs (*Dairy & Eggs*, *Meat & Seafood*,
*Bread & Bakery*, *Grains & Pasta*, *Condiments & Sauces*, *Herbs & Spices*) on
the reasoning that a vague edge is what sends someone to the composer. **Reverted
the same day.** The pairs bought nothing: nobody wonders where eggs go, and the
chip is read at a glance in a filter row and a sheet, where the shorter word
wins. The two-word names that remain — *Baked Goods*, *Canned Goods*, *Frozen
Meals*, *Oils & Vinegars* — are each one idea that has no one-word name, not a
pair of ideas joined.

**Two colour tokens are left unused on purpose** — `color-11` and `color-16`.
`proposeColor()` hands out the first token a group has not taken and falls back
to `color-1` when they are all spoken for, so a fifteenth type would arrive
wearing Produce's olive. Fourteen keeps two in reserve, and `color-16` is the
palette's neutral fallback anyway, which is the wrong thing for a term somebody
chose.

**This only reaches new households.** `createHousehold` seeds once; there is no
backfill and adding one would mean re-inserting terms into households that have
since renamed and recoloured them. Existing pantries keep the nine they were
built with, and adding the missing five by hand is five composer trips, once.

### Rejected

- **Non-food types — Household, Cleaning, Paper Goods, Pet.** Real things on
  real pantry shelves, and out of scope for now: the data model's own
  vocabulary says a type is "what kind of *food* it is"
  ([overview](overview.md#concepts)). Adding them is a product decision about
  what the app is for, not a seeding decision, and it would want
  `.docs/overview.md` changed in the same breath. Cheap to revisit — one line
  each.
- **Sweets, Soups, Deli, Baby.** Each fails the two-or-more-and-nowhere-else
  test: cookies and candy are snacks, tinned soup is canned goods, and the
  other two are not what this app tracks.
- **A separate `Seafood`.** Fish and shrimp sit under **Meat** with everything
  else you thaw. Two chips where one does, and a household that buys enough
  seafood to want the split can make it in one composer trip.
- **Seeding all sixteen colours' worth.** The palette headroom above, and a
  chip row long enough to scroll in the item sheet is its own tax on the add
  flow the coverage was meant to speed up.
- **A backfill mutation for existing households.** It would have to reason
  about terms a household has already renamed, recoloured, or deleted on
  purpose, and "your pantry grew five categories overnight" is a worse surprise
  than a gap you can fill yourself.

---

## D51. The app opens where you left it, and where you left it is a property of the device

**Decided:** 2026-08-27

Closing the app and coming back put you at the top of an unfiltered pantry with
the drawer in its default state, every time. That is wrong in one place more
than the rest: **someone standing in a shop who backgrounds the app and comes
back to a phone that has forgotten they were shopping.**

So the view is restored. **A fourth `localStorage` key**, `larder.v4.<userId>.view`,
after the theme (D25), the household (D33) and the trip's ticks (D41), and it is
there for the reason all three are: this is a property of *this device*, not of
the account. Two people in one household filter to different shelves, and the
phone in the kitchen is not looking at what the desktop was.

**What is restored:**

| | |
|---|---|
| `drawerCollapsed` | Desktop: the drawer folded to the 68px rail. |
| `drawerTab` | Filter or Settings. |
| The term filters | All three groups, as ids. |
| The status pill | `ok` / `low` / `out`, or none. |

**The shopping-list mode was already restored and did not change.** D41 put it
in the trip record beside the ticks, where it inherits both of that record's
rules — it expires 24 hours after the last tick, and a household switch clears
it. It belongs there rather than here: the mode and the ticks are one answer to
one question, and splitting them across two keys would let the app come back
into list mode with an empty cart it had been told about.

**Restoring a filter is only safe because [D45](#d45-the-applied-filters-are-a-row-of-the-top-bar-not-a-badge-on-the-drawer) shipped first.** Before the
applied-filter bar, an app that reopened three filters deep would have been an
app that hides most of your pantry and does not say why — a filter you cannot
see is a filter you cannot remove, and one you did not just set is worse than
one you did. Row 3 is what makes the state legible on arrival, so this decision
is downstream of that one rather than independent of it.

**The prune effect is what validates the restored ids, and its `ready` guard is
the load-bearing line.** A stored id can name a term someone else has since
deleted, or a household this device is no longer pointed at. `Pantry` already
had an effect for the first case — live queries make a deleted term a real race
— and it answers the second identically, since a row id belongs to exactly one
household. What it could not survive is *timing*: the three term lists are `[]`
while the pantry query is in flight, so without `if (! ready) return` the effect
runs once against nothing and prunes every restored filter before the household
it belongs to has arrived. **One rule for stale ids, and it already existed.**

**The restore happens during render, not in an effect.** `readViewState()` is a
plain function feeding the `useState` initialisers, because an effect runs after
paint: the grid would show unfiltered for a frame and then snap. It costs
nothing here — the shell does not render until `api.status` is `ready`, so the
first painted grid is already the restored one.

**Nothing read back is trusted.** It is a string a person can edit and a shape
from a version of the app that no longer exists. A non-array where `locations`
belongs would throw inside `.includes` on the first render, which is a blank
screen rather than a lost filter.

### Rejected

- **Restoring `drawerOpen`, the mobile slide-over.** Every other flag in the
  record describes a layout you come back to; that one describes a panel
  covering the thing you opened the app to see. It is also the flag whose
  persistence `Pantry`'s dock effect exists to undo — it means nothing above the
  dock and everything below it, and seeding it true hands that effect a
  slide-over the layout does not account for.
- **Restoring the search text.** *Clear filters* does not take it either (D45):
  search has its own `×` and you can watch it work. A field that refills itself
  on load reads as a bug rather than as a filter.
- **Restoring the sort.** Not asked for. One line in the same record when it is.
- **Storing the household id beside the filters,** the way the trip record does.
  The trip needs it because a tick means *in my cart right now* and must not
  come back on a switch away and back. Filter ids need no such rule: they are
  already self-invalidating, since an id from another household names no term in
  this one and the prune drops it. A second rule to keep in sync, for a case the
  first one already covers.
- **Writing on `beforeunload` or `visibilitychange` instead of on change.** A
  backgrounded phone tab is killed without firing either, and being in a shop is
  exactly when that happens. Writing on change costs one `setItem` per filter
  press, which is why the search text — the one high-frequency field — is
  excluded from the record entirely rather than merely from the restore.
- **Putting any of it in the database.** It is not data. Two members of one
  household would fight over one row, and one person's phone and desktop would
  fight over it with themselves.


---

## D52. An item has a size, and a size is a pair that is never half-set

**Decided:** 2026-08-28

A household buys a quart of milk and a gallon of milk and wants them tracked
apart. `qty` cannot answer that: *how much butter do I have* and *how big is one
pack of butter* are two questions and one field cannot ask both. So an item
carries an optional **size** — a number and a unit, describing **one** of the
thing. You have three of them, and each one is a quart.

**The fourth additive schema change since Phase 2**, after `households.ink`
(D42), D44's nine stamp columns and D46's `profiles` table. Two columns on
`items`, `size` and `unit`, both `string().default('')`; ten tables, five
queries and seventeen mutations still.

### The pair is never half-set, and that is the whole of the validation

A bare `20` means nothing and a bare `quart` is not a size. `shared/size.ts`
owns one function, `normalizeSize`, and between it and the sheet's two rules
there is **no invalid state left to validate or explain**:

1. **Picking a unit against an empty number fills the number with 1.** So *1
   pint* is one tap, which is the commonest size there is.
2. ***No size*, the first row of the unit menu, clears both halves.** That is why
   the row carries no separate `×` — one control already does it.

A number with no unit clears both on the way into the database, and so does an
unknown unit key. The server calls the same function the sheet does, for a
client that never came through the sheet.

### The unit key is a slug, not the abbreviation

`quart`, never `qt` — the same reasoning [D32](#d32-a-term-stores-a-color-token-not-a-color)
gives for term colours: what a household stores has to survive us changing what
it prints. **Half pint printing as `cup` is exactly the case that would
otherwise be unfixable.**

Fourteen units in three groups. *Half pint* is the one row where the word and
the abbreviation disagree on purpose: a US half-pint carton is the common size
and *half pint* is what anybody would look for in the list, but `1 ½ pt` reads
as one and a half pints, which is a different quantity and the commonest case of
this unit. `cup` is the same measure, it is what the carton says, and it cannot
be misread. The menu shows the abbreviation on every row, so nothing about it is
a surprise.

**Abbreviations never pluralise** — *2 lb*, *2 qt*, *6 pack*. Nothing has to
decide whether two dozen is `2 dz` or `2 dzs`.

**There is no `each`.** *1 each* is not a size; it is the absence of one, which
is what *No size* already says.

### Where it shows, and where it deliberately does not

**On the item card, beneath the name in meta 13** — not beside it. Names are
long and the shopping list's own 460px name-and-badge collision is already on
record; beneath is safe at every card width.

**In the shopping-list row it rides with the name**, before the status badge. At
the shelf *"Butter, 1 lb"* is one phrase, and moving the size across the row to
sit with `have 2 · low at 4` would take that phrase apart to save a measurement.
The name truncates inside the `min-width: 0` flex; the size does not, because
half a unit is worse than no unit.

**Not in the top bar, not in the filter pane, and not sortable.** A size is a
property of an item, not a term: it has no colour, no chip, and nothing to
filter by. If sizes ever need grouping they have to become terms first, which is
a different design.

### Rejected

- **Calling it an *amount*,** which is what the ask called it. *Amount* collides
  with the on-hand count, and the collision is the exact confusion the field
  exists to remove. Flagged rather than settled: it is a one-word change if
  *size* reads wrong.
- **A household-level unit system in *Pantry settings*.** It would halve the
  menu to seven rows and remove the *is it oz or ml* pause, at the cost of a
  setting nobody asked for and a household that buys both. The menu scrolls,
  which is the honest admission that it is long.
- **Making units terms.** Then two people entering *1 qt* and *32 fl oz* for the
  same bottle would be reconcilable, and the shopping list could one day answer
  *how much olive oil do we have*. It is also a fourth taxonomy, with colours and
  chips and a composer, for a field that is optional. **This is the decision to
  revisit first if that question ever gets asked** — nothing about the size is
  shared vocabulary today, and that is the price.
- **A decimal size.** `1.5 lb` is a real thing to buy. Digits only, for now, for
  the same reason `qty` is: the platform has no numeric column, string ordering
  is a trap, and every parse in the app goes through `toInt`.
- **Suppressing the number when it is 1**, so *Half pint* could print `½ pt`.
  One rule this sheet otherwise does not need, to recover an abbreviation that
  is already ambiguous.

---

## D53. Some things are never shopped for, and that is a property of the item

**Decided:** 2026-08-28

A household that grows its own black beans wants them in the pantry and never on
a shopping list. Before this the two were the same statement: an item joined the
list when it dropped under its low-at, and the only way to keep it off was to
set a threshold of zero — which lies about the item on its own card.

So `items.offShoppingList`, a `boolean().default(false)` — the **fifth** additive schema
change since Phase 2, landing with D52's two columns.

### The column is `offShoppingList`, spelled out

Named `offList` first, and renamed the same day — **while it was still free.**
The column had never been published, so the rename was an edit; after the next
`sf publish` it would have needed `sf db migrate --rename`, which is one of the
two destructive flags this project has deliberately never had to use.

The short name is unambiguous everywhere it is *read* — `item.offList` inside
`needsBuying` in `shared/shoppingList.ts` (now `shared/runList.ts` — D58, where it
gates all three bands rather than one list) names the only list the app has. It is
ambiguous in the one place that has no surrounding context, which is the schema
literal itself, and that is the place a person meets it first. It also stops
matching the checkbox's own words, *Keep off the shopping list*, which is the
sentence the column exists to store.

Eight characters, in about a dozen places, against a name that explains itself
in the file where nothing else does.

### It hides an item from one view; it does not change what is true about it

**`needsBuying` is the only function that reads it.** `statusKeyFor` is
untouched, and that split is the whole idea:

| | Excluded item that is out |
|---|---|
| The card's status | still **Out** |
| The three status pills | still count it |
| The store card, and its count | drops it |
| The top bar's cart count | drops it |

The pills count *stock*; the list counts *shopping*. An app where excluding an
item also made it look stocked would be an app you cannot trust about your own
pantry.

### The control lives in Count, and the marker on the card is the unsettled part

**A single checkbox, last row of the `COUNT` section, under the two steppers** —
not a section of its own. *Low at* is the sentence *put this on the list when I
am down to N*; this is *…except don't*. It modifies the threshold, so it sits
where the threshold is set, and putting it anywhere else would make it a fifth
section for one checkbox.

The box is the shopping list's own checkbox at its own size, extracted to
`CheckBox.tsx` rather than drawn twice. **The rhyme is deliberate**: the box that
takes a row off the list you are shopping, and the box that keeps an item off
every list.

**The card carries a struck cart in meta, left of the status.** Without
something there, *why isn't the olive oil on my list* has no answer anywhere in
the grid. It is a glyph nobody has been taught, on a card that deliberately
carries no icons beside the name, and it is **the first thing to challenge** —
the design document drew it as a mockup and said so.

### What this leaves open, on purpose

- **Whether an excluded item should still be counted somewhere.** A household
  could quietly exclude half its pantry and the shopping trigger would go quiet
  with it, with nothing on screen saying why.
- **Whether the exclusion is the household's or yours.** It is the household's,
  because every other property of an item is — but a shared list where one
  person silently mutes a row is worth watching. Making it personal is a join
  table, not a column, and therefore not a decision to take by accident.

### Rejected

- **A threshold of zero as the idiom.** It is what people would have reached for,
  and it makes the card say *Out* forever. The card has to keep telling the
  truth.
- **A `neverBuy` taxonomy term.** A term is a thing you filter and colour by;
  this is a flag on one item, and it would have been the app's fourth taxonomy
  for a checkbox.
- **Hiding excluded items from the pantry grid too.** They are in the pantry.
  The whole point is that you still want to know you have them.

## D54: the offer to install is one row in Settings, and there is no banner

**28 Aug 2026.** The app has been a PWA since `site.webmanifest` shipped and
nothing in it has ever said so. This adds **one row** — *Add to home screen*, in
Settings › Preferences under Appearance — that installs it: a real prompt where
a browser offers one, and two written steps where none exists. There is no
banner, no interstitial and no badge anywhere else.

Client only. No schema change, no handler moved, no new `theme.json` token.

### Two rules, and everything follows from them

**Nothing offers to install what is already open.** In standalone the row does
not exist — four `display-mode` queries, plus `navigator.standalone`, which is
iOS's own and the only answer there is on a home-screen Safari.

**The row appears only where a path to install actually exists.** A control that
can only disappoint is what the sort trigger and the shopping-list trigger
already refuse to be.

| Context | The row | The path |
|---|---|---|
| Running as the installed app | — | |
| A prompt was captured | **Install** | fires it |
| iOS / iPadOS | **Show me** | Share ▸ Add to Home Screen |
| Chrome on Android | **Show me** | ⋮ ▸ Add to Home screen |
| Chrome on the desktop | **Show me** | ⋮ ▸ Cast, save, and share ▸ Install page as app |
| Safari on macOS | **Show me** | File ▸ Add to Dock |
| Anything else | — | none we can name |
| Viewer role, empty household | shown, unchanged | |

**One control, two labels** — the shopping-list trigger's rule, where the label
carries the difference and the treatment does not. Same pill, same geometry,
same position.

### Amended the same day: a prompt is one path, not the definition of one

The first cut had three modes and read `beforeinstallprompt` as the proxy for
*a path exists*. **That is wrong, and wrong in the direction that hides the row
from people who can install perfectly well.** Chrome offers *Install page as
app* on **any** page from its own menu — no manifest, no service worker, no
prompt — and **the page is never told about it**: there is no API to ask, and
`getInstalledRelatedApps()` answers a different question on one platform. Found
by the obvious route, which is someone installing the app from the menu while
the row that offers to install it was not on screen.

So the rule holds and its reading changes: **the row appears wherever a path
exists, and the pill fires a prompt only where there is one.** Four `steps`
modes instead of one, because four different menus say four different things.

**The label follows the platform**, which is this build's one departure from the
boards: *Add to home screen* on a phone, **Install as an app** on a desktop. A
desktop has no home screen, and the steps under it end in *Install page as app*
or *Add to Dock* — a label saying otherwise would be exactly the paraphrase the
steps refuse to make. The boards drew *Add to home screen* on the 1440 board,
written before the row had any desktop steps to be wrong about.

**Only browsers whose wording can be named are claimed.** Edge, Opera, Samsung
Internet and Vivaldi all carry `Chrome/` in the user agent and all put the
command somewhere else; claiming them would print instructions for a menu that
is not there, which is the one thing the steps must never do. They answer
`none`. Firefox has no install path on the desktop and answers `none` too.

**The cost of the table is drift**, and it is real: a menu can be reorganised in
a release with nothing to tell us. That is the risk D47 declined to take when it
refused to name the sign-in lanes, taken here on the opposite balance — a lane
nobody can see is a different thing from a menu the person is looking at while
they read the step.

**Detection is exercised against eleven real user agents**, including the two
that are easy to get wrong: iPadOS 17 reports itself as a Mac, and Chrome's own
user agent contains `Safari/`. It lives in `client/lib/install.ts` and **cannot
move to `shared/`** — it reads `navigator`, which is on the capsule compiler's
server denylist — so it is checked by driving the compiled module rather than by
`npm test`.

### There was a banner, and the cut is the decision

A dismissible bar at the top of the content column, on the drawer surface, with
the app tile and a cream *Install* pill — the toast's construction, in the flow.
It was drawn at 358 × 127 and it worked.

- **It cost about 125px at the top of a 390 screen**, where the top bar already
  takes three rows and four with a term filter on. The first card started around
  315px down, and 370px while filtering — the most chrome anywhere in the app,
  on the screen with the least of it.
- **It needed a dismissal design to be tolerable at all**: a permanent `×`, a
  stored key against the account, and a rule holding it back until the household
  had its first item so it could not land on an empty state. Three decisions in
  service of an interruption nobody asked for.
- **It made the already-installed case worse.** No browser reliably tells the
  page it is installed, so both surfaces keep offering; in Settings that is
  invisible, in a banner it is a nuisance you have to dismiss.

**What the cut costs, stated plainly: nobody opens Settings to see what is in
it.** Installing is now reachable only by someone who already suspects it is
possible — which, on iOS, is the person who least needs telling. **This does not
solve discovery; it declines to**, and that is the first thing to revisit if
nobody ever installs it.

### Scope is in the label, and it survives

*Preferences* are yours; *Pantry settings* are the household's. Installing is
yours. It does not follow you between **devices** — but nothing in this pane
ever claimed to, so the row carries `On this device.` in meta and the rule
holds. A fourth block for one row is what D52's off-list checkbox already
argued against.

**Owners, editors and viewers all see it**, exactly as Appearance does (D30).
Installing is a fact about your browser, not a power over the household.

### The event is captured at boot, not when Settings opens

`beforeinstallprompt` fires once and early, and a page with no listener
registered by then never hears it. So `watchInstall()` runs from the entry
beside `installFonts()` and `installAppIcon()`, and the saved event is held in
`client/lib/install.ts` until something presses the pill. Waiting for the drawer
would mean the row could only ever appear on a reload after the one that
mattered.

**The event is dropped before the dialog opens**, not after. It can be prompted
once — a second press throws — and a pill that fires nothing is the worst
version of this row.

### The steps panel is the inline composer, on a fourth surface

It drops in below the row and **the row stays put**: the Filter tab's editing
panel, the item sheet's term composer and the invite composer already work
exactly this way. No modal, no pushed pane. 180ms in, 140ms out — the applied
chip's exit — and instant under `prefers-reduced-motion`.

**The words are Safari's own.** *Share* and *Add to Home Screen* are what the
buttons say; anything paraphrased sends people looking for a control that is not
there. The share mark is drawn **beside** the word rather than instead of it —
an icon nobody has been taught is not an instruction, and it is the only thing
in the app borrowed from another vendor's interface.

### Two contrast findings leave this row

**Drawer meta on the raised fill does not clear 4.5:1.** `#9E8C74` — the rail's
rest colour — had been standing in for drawer meta text everywhere, and it
measures **4.28:1** on the light theme's raised fill. It is fine on the drawer
gradient (5.02:1) and fails on the card that sits on it, which is where every
meta line in the Settings pane actually lives. `Theme.drawer` gains **`inkMeta`
= `#A5937A`** — 4.67:1 light, 5.61:1 dark — and `drawerTheme()`'s `textMuted`
resolves to it, which is the one place inline-painted meta inside the drawer
comes from. Same shape as D52's finding that faint text never clears 4.5:1 as a
hint, one surface over.

**The composer panel's hairline is invisible on drawer-raised.** The panel is a
recessed fill on a 1px inset hairline, and on this surface that reads `#3B3126`
on `#332B22` — **1.10:1**; the fill alone is 1.31:1, so the panel has no edge at
all. `#6E5F4B` takes it to **2.25:1** from outside and 2.94:1 from inside, and it
is what `Toast` already leans on for the same reason. **The invite composer and
the Filter tab's term composer have the same bug and are deliberately not
changed** — one row should not quietly restyle three components.

### What it does not get

- **No toast on install.** The app appearing on the home screen is the
  confirmation, and you have left the browser to see it.
- **No confirm.** Nothing is destroyed.
- **No *Installed ✓* state.** No browser reliably tells the page it is already
  installed — `getInstalledRelatedApps()` is Android-only — and a badge that
  lies on iOS is worse than no badge. In Settings the row simply keeps offering,
  harmlessly.

### Rejected

- **The banner**, above.
- **A marker on the Settings tab that clears once seen.** The drawer has no
  vocabulary for one, and the mobile menu button's crimson badge is already
  spoken for by D45's filter count.
- **A line in the account menu.** Wrong scope — that menu is about who you are.
- **A mention on the marketing page.** It would be describing a browser feature
  to someone who has not signed up.
- **Keying the row to `beforeinstallprompt` alone.** Built first, and it is what
  the amendment above undoes. It hid the row on every desktop Chrome where the
  prompt does not fire — which may be all of them, since this app has no service
  worker — while the browser's own menu installed it happily.
- **Naming Edge, Opera, Samsung Internet or Vivaldi.** Each has a real path and
  none of them has been checked. Naming a menu nobody has opened is worse than
  staying quiet, which is the rule that kept *Add to Dock* out of the first cut
  and now lets it in: macOS Safari's File menu is checkable and stable.

### Open

- **Discovery**, above. The trade is recorded rather than solved.
- **Where *Share* is.** On iPhone it is the bar at the bottom; on iPad the
  toolbar at the top. Step 1 names the button and not its place, which is one
  clause short on the platform that needs it most — and adding the clause costs
  a line wrap at 340.
- **Whether the row belongs above or below Appearance.** Built below, on the
  argument that Appearance is the one anyone actually changes. If install is
  meant to be found, above is the cheaper half of a discovery fix.
- **Non-Safari browsers on iOS.** All of them are WebKit and all of them have a
  Share menu, but only some carry *Add to Home Screen*. The row treats iOS as
  one platform.
- **Whether this app is installable at all in Chromium's eyes.** There is **no
  service worker anywhere in the project**, which has historically been part of
  Chrome's installability criteria — so `beforeinstallprompt` may never fire and
  the `Install` branch may be dead everywhere. The manifest itself is complete
  and its three icons serve. Settled by reading DevTools ▸ Application ▸
  Manifest ▸ Installability on the published space; the steps variant means the
  row works either way, which is the other reason the amendment was worth
  making.

## D55: a member's face is a copy on the membership, and the letter is not a fallback to be ashamed of

**A household is the one screen in this app where several people appear at
once, and until now every one of them was a letter on a brown circle.** Only
your *own* avatar was ever a picture, in the drawer's foot row, the collapsed
rail, the account menu and the first-run card.

**Nothing decided that**, which is the finding that opened this. `DrawerAvatar`
has taken a `picture` prop since the hour it was written (Phase 4.12) and its own
doc comment calls the initial "the fallback" — the members' rows were simply the
one caller that never had anything to pass. It read as deliberate because
[the boards draw a letter for **everyone**, your own row included](../.claude/docs/design/larderlogdrawerpreview.html):
every circle in that file is an initial on `#4A3E2E`. So the members matching the
boards was never the departure. **Your own face was**, and it is there because
`auth.picture` happened to be in the entry's hand when `Pantry` was wired up.

**The sixth additive schema change since Phase 2**, after `households.ink`
(D42), D44's nine stamp columns, the `profiles` table (D46) and D52/D53's three
item fields. `memberships.picture`, a string defaulting to `''`. Ten tables and
five queries still; **eighteen mutations**, the new one being
`syncAccountAvatar`. It applies on the next publish with no flag.

### It stores a URL, and therefore not an email

The first sketch stored the address, or a hash of it, so the server could call
`ctx.gravatar.avatarUrl(email)` — which is pure, synchronous, needs no key and
makes no network call, and was the obvious tool. It is the wrong one here.
**`ctx.auth.picture` is already the finished URL**, the platform derives it from
the identity's Gravatar, and the server had simply never read it.

That difference is the whole privacy argument. An email is more identifying than
a name and every member of a household would have been able to read every other
member's; the URL is a SHA-256 with a query string, and the image behind it
follows the person's Gravatar for free. **Storing the address was the only real
reason to keep drawing letters, and it turned out to be unnecessary.**

### The column is a copy, for the reason `displayName` is one

`memberships.displayName` is denormalized so the member list — a live query —
never joins a row per member (D46). A picture is the same shape of value with
the same constraint, so it goes in the same place rather than onto `profiles`
with a join per member behind it.

**The platform tells a handler about its *caller* and never about a third
party.** So the two moments a membership row is written, `createHousehold` and
`redeemInvite`, are the only two moments the value is in reach — and both stamp
it through `accountAvatar(ctx)`, beside the `accountName(ctx)` that was already
there.

### `syncAccountAvatar` is what makes it visible at all

Stamped at join and left alone, the column would be **write-once**, and wrong for
the ordinary case: somebody joins, then sets up their Gravatar afterwards. Worse,
**every membership row on the published space today holds `''` and nothing
backfills** (D44's rule) — so without a reconcile the feature would be invisible
to everyone already using the app, which is very nearly the same as not shipping
it.

So there is an eighteenth mutation, called on load from
`client/hooks/useAvatarSync.ts`. It takes no household argument and authorizes
nothing beyond being signed in, because it can only ever write
`ctx.auth.picture` onto rows keyed by `ctx.auth.userId`. It reads the caller's
own rows and writes **only the ones that disagree**; the steady state is a
handful of index reads, no writes, and — deliberately — **no `invalidate`**,
since an unconditional one would refetch the household for every member of it on
each other member's page load. Verified: a second call in a row reports
`changedTables: []` and `changedQueries: []`.

It is not folded into `setDisplayName`, which is the *other* write-through:
that one fires on a rename, and a picture changing has nothing to do with a name
changing.

### `onError` is load-bearing, not defensive

The platform's avatar URL carries **`d=404`** — on purpose, so that an account
*without* a Gravatar serves no image at all and the consumer draws its own
initial. Both avatar components rendered `<img src={picture}>` with no error
path, so that account got the browser's **broken-image glyph**, which is the one
outcome worse than the letter. This was already true of your own avatar and had
simply never been hit.

Both now hold the URL that failed rather than a boolean, so a member whose
picture changes gets a fresh attempt with no effect to reset a flag.

### `normalizeAvatarUrl` is one line and belongs in `shared/`

The value is written by a mutation and rendered into somebody else's
`<img src>`. `https:` only — `javascript:` and `data:` are refused at the write
rather than trusted to be impossible upstream, and the length is capped because a
string column has no ceiling of its own. The platform would never send either;
the column is permanent and the check is cheap. `npm test` is at **295
assertions**.

### The stack was already capped, and stays capped at three

Settings' Household card draws `members.slice(0, 3)` and the meta line carries
the real count, which is the boards' own construction. Faces make the cap matter
more rather than less — three overlapping pictures at 28px is already the most a
row that width can say — so it did not move, and there is deliberately **no
"+2" bubble**: the count is one line below it in words.

### Rejected

- *Store the email, or a hash of it, and derive the URL server-side.* The tool
  fits (`ctx.gravatar.avatarUrl` is free) and the input is the problem. See
  above.
- *Join `profiles` per member in the `household` query.* Live query, one index
  read per member per emission, against a column that changes about never. It
  also needs `profiles` to carry a picture it does not have, and `profiles` rows
  only exist for accounts that set a name after D46.
- *Write the reconcile on every load unconditionally.* One write per member per
  page load, and an `invalidate` storm across a household, to save a comparison.
- *A "+2 more" bubble on the stacked trio.* The count is already written beside
  it in words, and a fourth circle that is not a person is a worse thing to
  overlap than a person.

### Open

- **Whether a mixed row reads worse than a uniform one.** A household where two
  people have Gravatars and one does not now shows two faces and a letter, and
  that may be uglier than three letters. It is a taste call that wants looking
  at, not reasoning about — which is why `?members` seeds one stand-in with a
  picture and one without.
- **Drift between reconciles.** Your picture updates on *your* next load, not on
  theirs, so a household can hold a stale face for a while. Acceptable: the
  alternative is a write on somebody else's read.
- **Nobody has clicked it.** The stamping path needs a real identity with a real
  `auth.picture`, which `sf dev` does not issue.

**One risk under this closed on the same day.** `auth.picture` could have been
absent from the production identity the way `auth.email` turned out to be
([D56](#d56-the-account-row-shows-a-name-and-a-face-never-an-address--and-change-your-picture-leaves-the-app)),
in which case `memberships.picture` would take `''` for everyone and this would
have been dead on arrival with no way to find out before publishing. **It is
present** — the account's own avatar renders on the published space today. The
mixed row was also looked at and is fine, which settles the one open question
above.

## D56: the account row shows a name and a face, never an address — and *Change your picture* leaves the app

**`auth.email` is empty on the published space, and that is the platform's
design rather than a bug to route around.** The value is nothing but the
identity token's `email` claim — `createAuthFromToken` in the SDK reads it
straight off the JWT with no lookup and no fallback — and a Spacefast account
token does not carry one. Two things in the same file say it is deliberate:
`pairwise_sub` is preferred over `sub` for the user id, which is the OIDC
per-relying-party opaque subject and exists precisely so an app cannot identify
the person; and the one comment on the subject reads *"A Gravatar avatar URL
carries the profile's own hash, so the public profile page is derivable without
ever touching the email behind it."* The app is given a face, not an address.

`docs/zero.md` lists `email` among what `useAuth()` returns and never says it can
be absent, which is how this got built around in the first place. Logged as a
docs gap in `.claude/docs/spacefast.md`.

**So the dev guest stopped showing one.** D14's dev identity was briefly given
`justintadlock@gmail.com`, and it showed an email in the drawer's account row
that production has never shown — making the one local preview of that row a row
taller than the real thing. The address is still there and still hashed, because
the avatar needs it; it is simply never rendered. **The rule that came out of it
is worth more than the fix: a dev switch may reveal what production hides, and
must never invent what production lacks.**

Both render sites were already `{email && …}` — *absent, not blank* — so nothing
changed in production, and nothing needs to: a name and a face identify a person
in a five-person household perfectly well.

### *Change your picture* is the board's third row, and it ships now

`larderlogdrawerpreview.html` drew it dashed and marked it **"Do not build
yet — there is nowhere to send anyone."** There is now: `auth.picture` is a
`gravatar.com/avatar/…` URL, so gravatar.com is exactly where the image behind
it is changed, and D55 made every member's face depend on it.

- **Its own block between the identity row and *Sign out***, a `DrawerMenuRule`
  on each side, with the outbound arrow that means *this leaves the app*.
- **Naming Gravatar here is right where naming it on the sign-in button was
  wrong** (D47). That button went to a Spacefast account and merely looked like
  it went to Gravatar; this genuinely is Gravatar.
- **The label is the board's four words**, because the menu is 292px and
  *Change your picture on Gravatar* does not fit a line. The destination rides
  the accessible name — `"Change your picture on Gravatar (opens in a new
  tab)"` — which **contains** the visible label rather than replacing it.
- **`/profile/avatars`, not the profile root.** It is the editor, and Gravatar
  bounces a signed-out visitor through sign-in and back to it (verified: 302 to
  `/connect/?redirect_to=%2Fprofile%2Favatars`).
- **No `onDone()`.** It opens a tab beside the app rather than navigating away,
  and a menu that shut itself would make coming back feel like the app had
  forgotten where you were.
- **The app's first external link**, hence its first `target="_blank"` and first
  `rel="noopener noreferrer"`.

### Rejected

- *Fetch the address from somewhere else so the row can show it.* There is no
  route to one, and building it would be undoing a privacy decision the platform
  made on the person's behalf.
- *Say "no email on file" in the slot.* It explains an absence nobody asked
  about, and the slot's rule is already *absent, not blank*.
- *Link to `gravatar.com/<hash>`* — the SDK's `gravatarProfileUrl()` builds it,
  but it is the **public profile**, not the editor. The row says *change*.

## D57: the beta badge is on the front door only, and not in the app

`.claude/docs/design/beta-badge.md`, drawn on
`.claude/docs/design/larderlogbetabadgeboards.html`. Client only: no schema
change, no handler moved, no new `theme.json` token.

**The marketing page discloses the stage; the app shell does not repeat it.**
The nav and the footer carry a `BETA` pill beside the wordmark, and nothing
inside the signed-in app does — not the drawer header, not the mobile header
row, not the `<title>`, not the manifest name, not the icon.

**This overrules the spec's own rule**, which is worth recording because the
rule is a good one and it is the scope it was applied at that was wrong. The
spec says *the wordmark never appears without it*: a marker that shows up on
some screens and not others stops being a disclosure and becomes decoration,
because the reader has to work out whether its absence means anything. Built
that way — five call sites, the drawer header and the top bar included — it was
rejected on sight. The reason it fails is that **it answers a question nobody
in the app is still asking.** A caveat is read once, when you are deciding; a
permanent pill above the item grid is that caveat re-served on every load, to
somebody who has already signed up, in the two places the app is least able to
spare the width. The front door is where the decision is made, so the front
door is where the disclosure belongs.

The rule survives *within* the page it applies to, which is why the footer keeps
it: dropping the marker 900px below the nav on one page really would invite the
reader to work out what the absence means.

**One component, two call sites, three instances** — `BetaBadge` in
`Brand.tsx`, drawn twice in the nav because the wordmark there is responsive and
the badge derives its metrics from a number, and once in the footer. Ending the
beta is deleting the component and three lines.

**It is not a control.** No press state, no tooltip, no link, no 44px target,
not focusable. It is the tag component — read-only, bounded, sitting beside a
thing it labels — with no dot, exactly as the invite composer's role chips are
the chip component with no dot.

### The construction, and why the edge is the whole component

A fill one step off the ground, a `meta` edge, a `body` label: `border`,
`textMuted`, `text`, all read off the theme so both themes come from one
expression.

**The fill does none of the separating** — 1.10:1 against the light ground and
1.45:1 against the dark. The pill is invisible without its border in either
theme, which is the thing a re-render will get wrong: drop the edge to a
hairline "because it looked heavy" and the badge stops existing.

`border` for the fill is **D45's finding reused** — an object on the ground
moves *away* from the ground, darker on the cream and lighter on the dark, and
`border` is the one token that does both from a single name. `surfaceAlt` would
be the ground gradient's own middle stop. The `meta` edge is **the
shopping-list checkbox's finding reused**: a text token, because the strongest
border in the palette falls under 3:1 on the surface it actually sits on. This
is the second component to borrow a text token for its border, which is starting
to look like the answer to the standing *top-bar controls have almost no edge*
question rather than two exceptions to it.

Measured: label 6.78:1 light and 7.90:1 dark; edge 4.63:1 light and 5.85:1 dark.

The boards also draw the drawer pairing — `drawer.raised` / `drawer.inkMeta` /
`drawer.inkMuted`, 8.70:1 and 10.44:1 — and it is **not built**. The values are
recorded in `BetaBadge`'s own comment so that surface is a trio rather than a
measuring exercise if it is ever wanted. (The boards' `#DCD0BA` label there is
the *page* dark theme's body colour; the drawer has its own, `inkMuted`.)

### It scales off the wordmark, and the floor is on the input

Height = 0.66 × the wordmark's set size, label = 0.55 × height, padding =
0.39 × height, gap = 0.37 × set size, radius 999. Derived rather than tabled,
the way `HouseholdTile` derives its radius and letter, so a third call site is a
number rather than a new entry.

**The gap belongs to the badge**, as a `marginLeft`, so a caller cannot get it
wrong — which is why both call sites wrap the wordmark and badge in a gapless
flex row of their own rather than letting the surrounding row's `gap` add to it.

**The 9px label floor is applied to the input, not to the label.** The 18px
footer wordmark asks for an 8px label — below the smallest type in the app, the
`OUT` / `LOW` badges at 9.5, and below where 0.12em tracking stops separating
letters and starts dissolving them. `Math.max(24, size)` is what the spec's
*"the footer takes Small unchanged and sits fractionally large"* amounts to, in
one expression rather than a cascade of clamps.

**The nav is 20/24, not the spec's assumed 27**, so both of its badges are
small rather than one being regular. That is the derivation doing its job rather
than a departure.

### Rejected

- **The whole app, welded to the wordmark.** Built first, and the reason it lost
  is above. The spec's rule is sound about disclosure and wrong about audience.
- **`<title>` as `Larder Log (Beta)`.** Built and reverted with the rest. The tab
  strip is the app, not the front door, and it is read on every load by exactly
  the people who no longer need telling.
- **The manifest `name` and the home-screen label.** Never built. iOS truncates
  past roughly twelve characters and *Larder Log (Beta)* would ellipsize into
  something worse than either version.
- **The app icon and favicon.** The 16px face is a hand-cut drawing whose stem is
  3px and whose arm is 2px; a corner ribbon has nowhere to go, and *the icon does
  not vary by theme* would become *the icon varies by release stage*, which is a
  promise to redraw eight files twice.
- **Crimson fill**, the filter-count badge's construction. Crimson is
  brand-and-out — it already means *gone* on the status ramp and *something is
  filtering* on the rail — and the wordmark beside it is **already crimson**, so
  a crimson pill 10px from an italic crimson *Log* doubles the only accent on
  screen inside a 200px span.
- **Amber**, the low tokens. *Hold on* is nearly the right sentence, but the ramp
  is about **stock** — putting the pantry's status vocabulary on the product's
  name says the pantry is running low. The shopping-list trigger lost the same
  argument for the same reason.
- **Inverted — ink fill, cream label.** It reads beautifully and breaks rule 3 of
  *Theming* outright: near-black ink is the only thing you press.
- **A term colour.** Sixteen exist and one would look good. Term colours mean
  *term*, which is the argument that keeps a person off the palette.
- **Bare superscript text with no container.** Cheapest, and it has no bounded
  form — on the ground it is small text with no edge, the one failure mode this
  system already knows it has.
- **A version number.** Nobody in a pantry app can act on one, and a number
  invites the question of what changed between two of them, which is a changelog,
  which is a page that does not exist.

### Open

- **The sign-in card and the `?join=` landing still have no marker**, and now
  they are the *only* signed-out surfaces without one. `SignInCard` sets the
  wordmark at 32/38 — the largest it ever appears, on the last screen before an
  account is created — and someone who lands on a bounced URL or an invite link
  never sees the marketing nav. Under this decision they are the strongest
  remaining candidates rather than a deliberate exclusion: the component is
  ready, and 38 gives 25/14/14. The invite landing needs a prior answer — its
  header is the household tile and it has **no wordmark at all**, so either the
  card gains one or it gains nothing.
- **It has never been seen next to the wordmark.** The cap-height alignment (a
  flat `-top-px` at both sizes) and the italic-`g` gap that reads wider than it
  measures are arguments made on paper.
- **Nothing says when it comes off.** Trivial to remove, impossible to remember
  to remove. Worth attaching to something — the Viewer role, or the restock flow.

---

## D58. A source carries a kind, and the group is named for what it holds

**Decided:** 2026-08-29

`.claude/docs/design/garden-and-kitchen.md`, drawn on
`.claude/docs/design/larderloggardenkitchenboards.html`.

**A store carries a kind — shop, grow or make.** *The Garden* is a source of
kind `grow`; *The Kitchen* is one of kind `make`. It is a property of the
**term**: not of the item, not a fourth term group, and not a mode. Both take a
term colour, both appear in the filter group, and both tag an item card exactly
as Costco does.

**The seventh additive schema change since Phase 2**: `stores.kind`, a string
defaulting to `''`, after `households.ink` (D42), D44's nine stamp columns, the
`profiles` table (D46), `items.size` / `items.unit` / `items.offShoppingList`
(D52/D53) and `memberships.picture` (D55). Ten tables and five queries still;
**nineteen mutations**, the new one being `setSourceKind`. It applies on the
next publish with no flag.

### Why it exists: an empty store was carrying two opposite meanings

*Shopping list*'s `NO STORE` card says *"Opening one of its rows is how you give
it a store"* — copy that assumes an empty store is a **gap**, something not
filled in yet. Baking Soda has no store because nobody set one. Frozen Peaches
may have none because *there isn't one*. The list drew those identically, and
the moment a household grows or cooks anything they have to come apart:

| Case | What it means | What happens when it runs low |
|---|---|---|
| Not set yet | A gap | Sits in `NO STORE` asking to be filled in — unchanged |
| We grow it | There is no shop | It belongs on a harvest list, never a shopping list |
| We make it | There is no shop | It belongs on a list that says what to cook |

### Why the kind is on the source rather than the item

A source is already a coloured, named thing you filter and tag with, so one more
property costs **one glyph in one panel**. Putting it on the item would mean a
fourth chip group, a fourth colour list, and a second thing to set every time
you add anything. It is also what leaves the item card untouched: tags already
carry their term's colour, so a fern *The Garden* says where a thing comes from
with no new component and nothing taught.

**The counter-argument, recorded because it is the one that could sink this.**
You buy tomatoes at Publix in February and pick them in July, so an *item* can
have two sources. Under this scheme that is either two items or one item whose
source you change twice a year. Nobody has lived with it.

**`Calfee Cattle` stays a shop**, and that is the tell that the rule is right: a
rancher is not a shop, but you still drive there.

### The group's name follows what's in it

`Store` while every source is a shop; `Source` once one of them is not. It moves
in four places at once — the Filter tab's heading, the dashed chip that ends the
list, the editing panel's micro-label, and the same group's label on the Add /
Edit sheet — **plus the blocked-delete dialog**, which is a fifth the design doc
does not name and which would otherwise say *"A store can only be deleted…"*
under a heading reading `SOURCE`. `sourceGroupWord()` in `shared/source.ts` owns
the rule and both halves call it, so the sentence the server throws and the one
the client draws stay one string.

**The rule is "does anything here fail to be a shop", not "how many distinct
kinds are there"** — which is where the build departs from the design doc's
prose. That prose says *one kind and it is a Store, more than one and it is a
Source*; its own table then says *any grow or make source exists → SOURCE*. A
household whose every source is a garden has exactly one kind, and calling that
group *Store* is the precise confusion the kind exists to remove. The table
wins, and an empty list is `Store`.

**Nothing else in this app renames itself, so this is the exception and it earns
it**: the alternative is calling The Garden a store. It changes only when you
change the *list* — adding a grow source is a deliberate act inside the editing
panel, and the heading directly above your hands is what moves.

### The kind is set in the editing panel, and nowhere else

`SourceKindMenu` is **`RoleMenu` with different words in it** — three rows on
`drawer.menu`, radius 9, the current one at 600 with a crimson check rather than
a fill, and a trigger that takes the swatch's cream open state. Nothing new is
drawn, which is most of the argument for putting the kind on a term.

**The trigger is the glyph, not a word**: a cart for shop, a sprout for grow, a
pot for make. A shop's cart sits at the drawer's rest colour `inkFaint` and grow
and make brighten to `inkMuted`, so a glance down the panel says which rows are
not shops without reading any of them. `DRAWER_KIND` is `DRAWER_TRASH`'s
geometry with **no colour of its own** — the glyph's colour arrives as an inline
style, which would beat a class's `:hover` colour, so the hover here is the fill
alone.

**A new source is always a shop — amended 2026-08-29, and this one was wrong.**
D58 shipped with no kind control on any composer, on the reasoning that one
control on the row you are naming is enough and the menu belongs on the row once
it exists. **The kind is not something you discover afterwards.** You know as
you type *The Garden* that it is not a shop, and under that rule saying so meant
naming it, pressing *Done*, re-opening the group with the pencil and finding the
row again — four steps to record a fact you held before you started typing, on
the one taxonomy where the fact changes what the app does with it.

So **every draft row carries the glyph now**, in the slot it already occupies on
an editing row: the Filter tab's `NEW` panel, the same tab's add row inside the
editing panel, and the item sheet's `+ Source` composer. Same glyph, same menu,
same three words. **It defaults to shop**, which is both the common case and
what `toSourceKind` already resolves an absent value to, so the row a household
composes without touching it is byte-identical to the row D58 composed.

**That put the menu on cream for the first time**, since one of the three
composers is on the item sheet. `SourceKindMenu` takes an `onDark` and re-skins
exactly as `TermRow` and `panelSkin` do: the drawer keeps `DrawerMenu`, the
sheet gets `PAGE_MENU` — the sort menu's popover, and therefore the box the unit
menu opens a few pixels away on the same sheet. Reusing the drawer's surface
there would be the mirror of the mistake `DrawerMenu`'s own note records, which
is a cream popover over the darkest panel in the app.

**`PAGE_KIND` is `DRAWER_KIND`'s light twin and fills to `surface`, not
`surface-alt`.** The composer panel *is* `surface-alt`, so the app's usual ghost
hover would move the control to exactly the colour it is already sitting on —
D45's rule about an interaction state moving away from the ground, met on a
different ground.

**Undo carries the kind back**, and is why `createTerm`'s draft took an optional
`kind` before any composer sent one — the same trade the stamps make (D44) and
for the same reason. Undo is a re-insert (D17), so without it a restored garden
would come back a shop: a silent change to a row somebody asked to have back
exactly as it was. Composing is the second caller of an argument that already
existed, which is most of why the amendment costs nothing server-side.

**`setSourceKind` is its own mutation rather than a `kind` on `updateTerm`'s
patch.** That handler's second argument is already called `kind` and means the
taxonomy; `updateTerm(id, 'store', x, { kind: 'grow' })` reads as a
contradiction and would be one to maintain. It short-circuits when the value has
not changed and therefore **invalidates nothing** — the menu is a radio group
where pressing the current row is the ordinary way to close it, and an
unconditional invalidate would refetch every subscriber's pantry for a no-op.

### Delta: the item count leaves the editing row

D36 put the item count between the field and the trash *"so the outcome is
predictable before you reach for it"*. **It is removed.** At 340px the row was
already swatch · field · count · trash, and a fifth slot left the field around
150px — where *Calfee Cattle* starts truncating. A source you cannot read is
worse than a delete whose outcome you discover one press later. **The kind glyph
is what took the space**, so this is a consequence of the feature rather than a
change of mind about the count.

**What it costs:** the blocked dialog is now the only place you learn a term is
in use. It already names the number (*Pantry holds 3 items*) and already offers
*Show the 3 items*, so nothing is unreachable — it takes a press. **Counts stay
on the chips at rest**, where the chip is the thing you press and the number is
what pressing it will do. D16's widening to all three kinds stands without the
count; that rule was never about the count, only argued from it.

### The item card carries one glyph, and a bought item carries none

Added when the spec was revised on 2026-08-29; the first version of it said the
item card changed **not at all**, and that was the strongest argument for
putting the kind on the source. It still is — the tags already carry their
term's colour, so a fern *The Garden* says *which* source with no new component.
What the glyph adds is *what kind*, and that matters because a household can
call a grow source anything and colour it anything, so nothing about the tag
says at a glance that it is something you pick.

The top-right cluster becomes **glyph · dot · chevron** — what kind of thing,
what state it is in, then the control. Sprout for grow, pot for make, 15px in
`textMuted`. **A shop item has nothing there and the absence is the point**:
most of a pantry is bought, so the two kinds that are not are the ones worth
spotting from across a grid.

- **Meta grey, never the term's colour.** The status dot stays the only coloured
  thing in that corner, because colour is what status is for. A term's hue is
  whatever the household picked, so tinting by it would imply the hue says
  something about the kind.
- **It does not break *Item card*'s rule**, which is *"Name (no icons beside
  it)"*. The top-right is a different place and already carries two things.
- **The objection that nearly killed the off-list cart does not apply.** That was
  *a glyph nobody has been taught*; this one is taught three times before a card
  ever shows it — the run list's band headers, the segment tabs, and the source
  editing row all draw the same two marks.
- **It does not go on the run list's row.** The row sits inside a source card
  whose header names the source and whose band names the kind; a third statement
  of one fact on one screen is noise.
- **`itemSourceKind()` returns `null` far more often than not**, and that is the
  shape of the function: it answers *is this something other than bought*, not
  *what are its sources*. **Grow wins a tie**, and the tiebreak is the run list's
  own band order rather than a coin toss — an item naming a grow source *and a
  shop* is exactly the case this decision records as the one that could sink it
  (tomatoes bought in February, picked in July), and *grown* is the more useful
  of the two things to say about it.
- **A make item kept off the shopping list draws both this and the struck cart**,
  and that pairing will be common — the things you make are often the things you
  never shop for. Worth watching on a real grid.

### One gap fixed on the way, and it was not this feature's

**Every editing panel now has a way to add a term**, a dashed row at its foot.
The dashed chip is hidden while editing — the panel *is* the group — which left
the Filter pane as **the one place in the app where you could rename, recolour
and delete a term but not make one**. Pressing *Done* to reach an add
affordance is a trip out of the thing you are already in.

It predates this feature and applies to all three groups, not just sources. Both
add affordances are the same draft row on two surfaces and are never both open:
opening the composer closes editing, and the add row only exists inside it. This
panel's own *Done* commits it, because a second confirm inside a panel that
already has one is two answers to one question.

### Rejected

- **A fourth term group, `Kind`, on the item.** The alternative this decision is
  chosen against. A fourth chip row, a fourth colour list, and a decision to make
  on every single add.
- **`Where from` as the group's word.** Plainer, and closer to this app's voice.
  Two words in a slot built for one, not drawn anywhere, and every one of the
  five places would need re-measuring. *Origin* and *Supply* were both colder
  than anything else in the interface. `Source` is the working word and this
  decision does not claim it is the settled one.
- **A `kind` field on `Term`.** `Source` is a separate type instead. A field that
  is meaningfully `''` on two taxonomies out of three is a field every reader has
  to remember not to trust — and `Source extends Term`, so every component that
  takes a `Term` takes one unchanged.
- **Renaming the rail's storefront glyph.** The label follows the group word;
  the glyph does not. A storefront means *shop* and is wrong in a Source
  household, but the neutral mark that would replace it has not been drawn, and
  inventing one here would put a glyph nobody has been taught on the one surface
  that is nothing but glyphs. Recorded rather than guessed at.

### Open

- **`Source` vs `Where from`.** The working word against the plainer one.
- **The rail's glyph**, above. And **the marketing page's band still says
  *Location, Store, Type*** and its Store column describes shopping, which is
  wrong for a household that grows anything — user-facing copy, which is the
  worst place for a contradiction.
- **The seeded sources are all shops** — Grocery, Warehouse, Market — so a new
  household is a `Store` household on day one and stays one until it isn't. That
  is correct, and it means most people never meet the word *Source*.
- **The run list is built** — see *The run list* below.
- **`?demo` seeds nothing but shops**, so the bands are unreachable under
  `sf dev` without hand-building a grow source and re-tagging two items. Cheap
  to fix and not fixed: `DEMO_ITEMS`' distribution is pinned by `npm test` on
  purpose, and adding rows moves eight assertions.
- **A season is stored on an item that no longer names a grow source.** Changing
  the source hides the panel and keeps the two months, so putting the source
  back brings them with it. Discarding what somebody typed because they touched
  a different control would be a silent write, and the value is inert —
  `runBands` reads it in the harvest band and nowhere else.

### The item side — built 2026-08-29

**The eighth additive schema change since Phase 2**: `items.seasonFrom` and
`items.seasonTo`, both defaulting to `''`. Ten tables, five queries, nineteen
mutations. It is the whole schema cost of the item side, because **the
ingredients are not here and never will be** (D59).

- **Months, not dates**, and a pair that is never half-set — `shared/season.ts`
  owns both rules, and `normalizeSeason` **discards a half rather than
  completing it**. Completing would mean guessing a value the household never
  typed, which D48 settled once already for names. Both item mutations run it,
  and a patch naming one month reads the other off the row, exactly as the size
  pair does.
- **The range wraps, and that is the case worth a test.** November to February
  is a real season and reads as one on the sheet; read literally as
  `11 <= m <= 2` it is empty, which would move an item to `NOT YET` in every
  month of the year including the ones it is ready in.
- **An unset season is always in season**, which is what makes it safe to ask
  about every item. A household that has said nothing about when its basil is
  ready has not said it is unavailable.
- **`NOT YET` is a sub-group at the foot of a harvest card.** Its rows keep the
  56px height and lose exactly two things: the checkbox, because there is
  nothing to pick, and the status badge, because the slot says *Ready in
  September* instead. Not focusable and not in the tab order — a focusable row
  that does nothing is worse than a row that says so.
- **An out-of-season row does not count** — not toward its band, not toward the
  trigger. But **the item is unchanged**: it still reads *out* on its card and
  still counts toward the three status pills. That is the one place those two
  numbers deliberately disagree, and it is `runIds` reading off the bands rather
  than filtering in parallel that keeps them from drifting.
- **Only the harvest card is affected.** An item you buy at Publix *and* pick in
  July is still on the Buy card in February — the season says nothing about the
  shop — and it is counted once, by the band it is really on.
- **A card whose every row is out of season still draws.** Seeing what is coming
  is the whole point of the group.
- **The season panel is the inline composer's construction**, taken from
  `panelSkin` rather than from the two hexes the boards name: it *is* the
  composer, a few pixels from where a `+ Source` opens one, so two literals
  would mean a panel that stopped matching its neighbour the first time either
  was re-themed. **`MonthMenu` is `UnitMenu` with twelve rows** and no *no
  month* row — a season is a pair, so clearing one end would have to reach
  across to the other.
- **`MADE BY` is a statement, not an empty state and not a disabled control.**
  Nothing is wrong and nothing is pending on the reader, so no icon, no amber
  and nothing to press — *a disabled control cannot explain itself* (D36) rules
  out the alternative. Make items only.

### The item card wears every kind it has

Amending this decision's own first pass, which drew **one** glyph and broke a tie
toward grow. It now draws **one per distinct kind**, in band order — so an item
bought at Publix *and* picked from the garden carries a cart and a sprout, which
is the honest answer to a question the tags below it cannot answer.

**An item naming no source still draws nothing**, even though it lands on the
Buy band. This decision's own table splits an empty source three ways and the
first of them is *not set yet* — a gap. A cart there would answer a question
nobody has answered. The glyphs mirror the tags: what is on the card is what is
on the item.

**The off-list marker stopped being a struck cart**, for two reasons that
arrived together. A cart is now the *shop* kind's own glyph, and a cart beside a
struck cart in one cluster is the worst pair of marks on the screen. And the
strike was claiming the wrong thing anyway: `needsBuying` gates every band, so
it keeps an item off Harvest and Make as well — it means *off the list*, not
*never bought*. `ListX` says that and collides with nothing. It stays fainter
than the kind glyphs: the kinds are facts about the item, this is a rule
somebody set about it.

### The run list — built 2026-08-29

`shoppingList.ts` **is** `runList.ts` now, and `shoppingGroups` is `runBands`.
The list groups by **kind first, source second**, and nothing about a *card*
changed: same 460px `auto-fill` grid, same header, same rows, same trip bar.

- **A band is present only when it holds something**, always in the order Buy ·
  Harvest · Make. A household with nothing but shops gets one band, no headers
  and no segment — **today's shopping list byte for byte**, which is most of why
  this shape won.
- **An item appears under every source it names, which now means two bands.**
  Tomatoes bought at Publix in February and picked in July are on the Buy card
  and the Harvest card, and each band counts them once — so the bands need not
  add up to the total, exactly as the store cards never summed to it either.
- **The storeless group is Buy's, and the test for it is against every source**,
  not the band's own: an item naming only The Garden *has* a source, so it must
  not also turn up in Buy asking to be given a shop.
- **`needsBuying` gates every band, not only Buy.** What *Keep off the list*
  says is *never remind me about this*, and a harvest list is a reminder. That
  narrows what D53's checkbox is **for**: it was written for "the things a
  household grows or brews", and a grow source now says that better and says
  which. What is left is the genuine override — the salt you never restock. The
  label lost the word *shopping* with it.
- **`All` is the default and the whole design**, and it carries no glyph —
  the drawer's `All items` chip's argument, reused. **The active tab is not the
  ink primary**: *Add item* is on screen in row 1 and ink is the thing you press,
  so a tab is `surface` on `borderStrong`, a raised tab on a sunk track.
- **The segment's counts are of the filtered set; the trigger's is the
  household's.** That pair has always been allowed to disagree.
- **The trip line shrinks to the cart clause when the segment is up.**
  `12 to buy · 4 stores` is what the segment now says in tabs you can press, and
  printing it twice a gap apart is one question answered two ways. What the
  segment cannot say is how much is already in your hand.
- **The active tab is resolved once and read three times.** A chosen band can
  empty out under you — tick the last thing on Harvest — so it falls back to
  `All`. Reading the raw tab in one place and the fallback in another is exactly
  how the screen ends up drawing every band with no headers over them; that bug
  was built and caught before it shipped.

**Two departures from the boards, both forced.**

**The Make card is a Buy card.** The doc's own refinement says a make row is
56px "until a recipe gives it something to say", and recipes are not being built
(D59) — so there is no second line, no 76px row and no *short 3 carrots*.
**Board 1 draws it in the taller form**, which is the mockup.

**Below the measured column the segment gets its own row.** Row 2's left slot
holds its width in both modes so the trigger never moves when pressed, and in
compact that slot *is* the row's slack — there is nothing for a fourth control
to take, and taking it would move the trigger, which is the one thing this row
cannot do. So the segment drops to a scrolling row beneath, with row 3's bleed.
The doc guesses "it probably scrolls horizontally like the applied-filter chips
do", which it does; what it does not say is that it needs a row. **That costs a
fifth row at 390 in list mode and wants a real phone.**

---

## D59. Processes depend on the pantry; the pantry depends on nothing

**Decided:** 2026-08-29

From the *Where this goes* section of
`.claude/docs/design/garden-and-kitchen.md`, drawn on board 6.

**Nothing here is built, and that is the point of writing it down.** It governs
what a make item's sheet may and may not carry, which is a decision the very
next build has to respect.

A make source implies a **recipe**; a grow source implies a **planting**. Both
are *processes*, and the pantry tracks their *outputs*. The reference runs one
way only:

| | Holds a reference to | Is referenced by |
|---|---|---|
| A recipe | the items it uses, and the item it yields | nothing |
| A planting | the item it yields | nothing |
| A pantry item | nothing | — |

**So a pantry item gains no field at all** — no `madeFrom`, no `madeBy`, no
`recipeId`. A row on an item sheet reading *Made by **Chicken Stock*** is a
**derived pointer, not an edited field**; display is not ownership, and
conflating the two is how the pantry ends up knowing about cooking.

**Model B settled, Model A rejected.** Model A grew the item into the recipe —
the sheet gains *Makes*, *Takes*, *Steps*, and nothing new is created. Its
ceiling is hard and arrives at the first recipe you do not put in a jar:
**every recipe would have to stock something**. Chili gets eaten, not shelved,
and holding a chili recipe would mean a pantry item called *Chili* sitting at 0
for ever — on the shopping list, in the grid, in every count.

Three consequences fall straight out of the direction, and all three beat A:

- **Two recipes can yield one item.** Under A there is exactly one, because the
  recipe *is* the item.
- **Deleting a recipe leaves the pantry untouched.** Under A it deletes an item,
  its count, and its place in every list.
- **Deleting an item leaves the recipe standing**, minus its yield.

**One place the rule bends, deliberately.** The run list's Make band would have
to show *short 3 carrots*, which means looking up which recipe yields an item —
a reverse lookup the model does not store. That is a **view doing a join**, not
the pantry holding a reference. Views may join freely; the model stays
one-directional.

### What this rules out of the current work

**Ingredients are not on the item, and no interim version puts them there.** An
earlier pass of the design drew the panel on the item sheet and planned to move
it onto a recipe later; that plan teaches a mental model the app then has to
take away, and it puts the pantry in the business of knowing about cooking for
one release.

So the item side ships **`items.seasonFrom` / `items.seasonTo` and a static
`MADE BY` panel** — a sunk statement reading *Recipes are coming*, explaining
that marking something as made rather than bought already puts it on the Make
band instead of a shopping list. **A statement, not an empty state and not a
disabled control**: nothing is wrong and nothing is pending on the reader, and
*a disabled control cannot explain itself* (D36) rules out the alternative.
Drawn only for make items.

**The kind is not made redundant by recipes**, which is the obvious next thought
and is wrong. **You can be low on something you make and not have written the
recipe down.** Under a Make band derived from *items some recipe yields*, that
item silently falls out of Make and into `NO STORE`, and the only fix is a stub
recipe with no ingredients — the phantom that lost Model A the argument. The
kind says *how a thing arrives* and is always known; the recipe says *how to
make it* and is optional. The kind also carries the group's name and the item
card's glyph, which no recipe can.

### Open

- **The season is borrowed.** It sits on the item because there is only one
  object today; it belongs on a planting. Two fields to move, and worth knowing
  it is on loan.
- **Deduction blocks a third feature now.** Both models can say you have enough
  and neither can take it out. Restock already gated trends and the
  *Always on the list* override; cooking joins the queue.
- **"What can I cook tonight?" is not the Make band.** That band answers a
  *restocking* question. A cook wants every recipe they have the ingredients
  for, whether or not its output is tracked and running low. Different screen.
- **Can one recipe yield more than one item?** A batch of dough is two loaves
  and a pizza base. Drawn as a single yield.

---

## D60. The off-list checkbox is retired, and the column is kept

**Decided:** 2026-08-29 — amends
[D53](#d53-some-things-are-never-shopped-for-and-that-is-a-property-of-the-item).

**A source's kind answers the question the checkbox was invented for.** D53's
own sentence was *"some things are never shopped for, and that is a property of
the item"* — written for the things a household grows or brews. Under
[D58](#d58-a-source-carries-a-kind-and-the-group-is-named-for-what-it-holds)
that is a property of the **source**, and it is answered better: you grow it,
you make it, or you buy it, and the first two go to their own bands without
anybody ticking anything.

**The checkbox says it worse than the kind does**, and that is the argument
rather than mere duplication. It hides an item from the list *without saying
where it went*: the card reads *out*, the list does not hold it, and nothing on
either screen explains why. A grow source answers the same question and puts the
item on a Harvest card while it does so.

### What changes, and what deliberately does not

**No migration.** `items.offShoppingList` stays exactly where it is. Dropping a
column needs `sf db migrate --drop`; filling one again is additive — the same
trade [D34](#d34-term-icons-are-cut-and-the-column-is-kept) made for `icon`, and
the reason that column is still there holding `''`.

**`needsBuying` still reads it.** A row ticked before today behaves exactly as
it did: off every band, with the card's marker explaining it. Nothing about
existing data moves, which is the whole point of keeping the column.

**The control is a way out, not a way in.** The sheet draws it **only on an item
that already carries the flag**, and pressing it clears the flag and unmounts the
row. So it can be cleared and never set, and the flag drains out of the database
as people meet it rather than being migrated out from under them.

**Absent rather than disabled where it would create a new one; present where it
is the only way out of an old one.** That is D30's rule doing a job it was not
written for. A legacy row with no control at all would be stuck off every band
for good — a worse thing to ship than a control that only subtracts.

**The card's marker stays and is a legacy marker.** It draws only for rows that
were ticked before the retirement, which is exactly when *"why isn't the olive
oil on my list"* still gets asked. It goes on its own when the last such row is
cleared. (It stopped being a struck cart under D58 for an unrelated reason: a
cart is now the shop kind's own glyph.)

**Putting it back is deleting one condition.** The column, the normalisation in
both item mutations, the `ItemDraft` field, the undo path and `needsBuying` are
all untouched — only the sheet's `value.offShoppingList &&` guard stands between
today and the control returning. That is what "in case I want to re-add it" is
worth in code.

**`?demo` still seeds three flagged rows, on purpose.** Nothing in the UI can
set the flag any more, so seeded rows are the only way to reach the legacy state
locally: the card's marker, the clear-only checkbox, and the two-item gap
between the status pills and the run list's total that made D53's split
countable in the first place.

### Rejected

- **Dropping the column.** It is one `sf db migrate --drop` and it is
  irreversible against live data, for a saving of nothing — an unread boolean
  costs a byte a row.
- **Migrating the flagged rows to a grow or make source.** It would have to
  guess which, and *Honey from Dale's hives* is neither grown nor made by this
  household. A wrong guess is a silent rewrite of somebody's pantry.
- **Leaving the control in and letting the two overlap.** Two ways to say one
  thing, and the worse one is the one with no explanation attached.
- **Removing the control outright, legacy rows included.** Cheapest, and it
  strands every ticked row off every band with no way back. The escape hatch is
  three lines.

---

## D61. First run asks where your food comes from, and the answer is what seeds the sources

**Amends [D40](#d40-seeded-terms-are-generic-and-there-are-still-three-stores)
and [D58](#d58-a-source-carries-a-kind), and retires D58's line that a new
household is a `STORE` household on day one.**

Spec: `.claude/docs/design/garden-and-kitchen.md`, *First run asks where your
food comes from*, drawn on board 1 of
`.claude/docs/design/larderloggardenkitchenboards.html`.

**Three checkboxes on the household-creation card**, under the name field and
above the primary, under the micro-label `WHERE YOUR FOOD COMES FROM`:

| Row | Description | Default | Seeds |
|---|---|---|---|
| We buy it | *Groceries, the warehouse, the farm stand.* | **on** | Grocery, Warehouse, Market — all `shop` |
| We grow some of it | *A garden, a plot, a few pots on the step.* | off | **Garden**, `grow`, fern (`color-11`) |
| We make some of it | *Stock, bread, jam — things you'd otherwise buy.* | off | **Kitchen**, `make`, mulberry (`color-5`) |

### Why the question exists at all

D58 gave a source a kind and then left every household to discover it. The kind
is not something you learn about your own pantry afterwards: saying *Garden* is
a garden meant naming it, pressing *Done*, re-opening the group with the pencil
and finding the row again — a detour into a drawer you do not yet know is
there, to reach a menu you do not yet know exists.

**It is the one thing about a new household the app cannot infer and would
otherwise never ask.** Everything else on the card is a name and a colour, both
of which the household supplies by existing.

### Why it is allowed on a card whose rule is "one field, one button, nothing else"

That rule was written against a **preview** — a recessed panel showing fifteen
seeded chips, explaining what a household is before you had made one. It went
because the drawer explains itself a second later and better.

**This is a question, not an explanation.** The answer changes what gets
*written*, not what gets shown.

**The test it has to pass is that Enter still finishes the screen**, and it
does: buy on, grow and make off is exactly the household that existed before the
question did. Someone who ignores the three rows loses nothing.

**This is not the prefill [D48](#d48-a-name-nobody-typed-is-not-an-answer)
forbids.** D48 is about a *name*: a name nobody typed is not an answer, and a
filled field submits as though it were. A tick is not a name — it is a closed
question whose commonest answer is knowably yes, it is legible without reading
a field, and the hint under it says what it will do.

### Nothing is required and nothing is disabled

Untick all three and the primary stays live: you get the locations and types and
no sources at all. **That is not a dead end the way no locations would be** —
`itemStores` is a join table, so an item can name no source, while `locationId`
is a required column and D16 refuses to delete the last location anything
references. Sources are the one taxonomy that can start empty.

It is also the cleanest version of the *seed no stores* argument that has been
open since D40: someone who does not want Grocery / Warehouse / Market now has a
way to not be given them, rather than three chips to delete.

A disabled primary could not explain itself here any more than the editing row's
trash could ([D36](#d36-undo-what-comes-back-confirm-what-doesnt)).

### What is on both creation surfaces, which the design doc does not draw

The board is the first-run card. The rows also go in **`NewHouseholdDialog`** —
the switcher's and the rail's *New household* — because the second household
somebody makes is as likely to be the one with the garden as the first, and
asking on only one of them leaves the other seeding three shops and pointing
back at the kind menu. One component, `SourceMixRows`, on both.

### An absent answer and an empty one are different, and the distinction is load-bearing

`toSourceMix(undefined)` is the buy-only default — a caller that never asked the
question, which is every caller that predates it. `toSourceMix({})` and an
explicit all-false are **somebody unticking all three**, and mean *seed no
sources*. Collapsing the two would either force shops on a household that
refused them or drop the seed for every caller that omitted the argument. Each
field is compared against `true` rather than coerced, so a string or a number in
the payload reads as *not ticked* rather than as yes.

Normalized server-side, like every other client-supplied value: `kind` reaches
the column that decides which band a row lands in.

### No definite article

*Garden*, not *The Garden*; *Kitchen*, not *The Kitchen* — a change from how
this doc and D58 wrote them in prose. Every other seeded term is a bare noun —
Pantry, Refrigerator, Freezer, Grocery, Warehouse, Market — and a chip reading
*The Garden* beside one reading *Market* is one term written as a phrase and the
rest written as labels. It also keeps `householdLetter()`'s article rule where it
belongs: that exists because household names are phrases people write, and a
seeded term should never need it.

### What this changes elsewhere

- **Whether a household ever meets the word *Source* is an answer, not a
  property of the seed.** D58 said the seeded stores are all shops, so every new
  household is a `STORE` household on day one. Tick *We grow some of it* and the
  drawer heading reads `SOURCE` before there is a single item in the larder —
  verified against the real handler.
- **No schema change.** `stores.kind` shipped with D58; this writes it at seed
  time. Ten tables, five queries, nineteen mutations, `db.migrations` empty.
- **`createHousehold` gained a third argument**, optional, so a caller that
  omits it gets exactly today's household.
- **The seeded shops now carry `kind: 'shop'` explicitly** rather than leaning
  on `toSourceKind`'s `''` fallback. Nothing behaves differently; the seed table
  is read beside two rows that state their kind, and a row that states its own
  is one less thing to reason about.
- **This reaches new households only.** Nothing backfills, exactly as D50's
  types do not — the published household keeps the three shops it has.

### Open

- **The naming rule does not cover grow-only, no shop.** `Store` is the heading
  when everything is a shop and `Source` once anything is not, so a household
  whose only source is a garden reads `Source` — correct, and reached by the
  `sourceGroupWord` table rather than by the doc's prose about counting kinds.
  A household that ticked *nothing* reads `Store` on an empty list, which is the
  word it has always shown before anything exists.
- **`?demo` needs a buy household.** Its sixty items name Grocery, Warehouse and
  Market, so a household that unticked *We buy it* gets demo rows with no source.
  Not fixed: `DEMO_ITEMS`' distribution is pinned by `npm test` on purpose.
- **Every chip in the seeded drawer still reads `0`.** True before this too, and
  more visible when the drawer is the payoff for a question asked ten seconds
  ago. Hiding counts at zero items is easy and is not decided here.

### Rejected

- **A second step** — `NEW HOUSEHOLD · STEP 2 OF 2`, *How do you stock it?*
  Drawn on the board so the cost is visible. It reads better, because a question
  with its own screen gets a title, a subtitle and all the room it wants. It
  turns *one screen, not a wizard* into a wizard, over a question most
  households answer by leaving the defaults alone — and it has to grow a *Back*
  and a step count, after which there is an argument for a third step.
- **Requiring at least one tick.** Considered and dropped: it removes the
  seed-nothing path this decision argues for, and buys almost nothing, since Buy
  ships ticked and only a deliberate untick-all could reach the block.
- **A fourth term group, or a mode.** Both are D58's rejected list, unchanged.
- **Backfilling the published household.** Same reasoning as D50: it would have
  to reason about terms a household has already renamed, recoloured or deleted.

---

## D62. The console is a pane in the app drawer, and an administrator is a name in the environment

**Decided:** 2026-08-29 — supersedes the opening claim of *future-ideas → The
administrator page*, which called the console "a fourth surface, not a screen".

**The design document is
[`.claude/docs/design/admin-console.md`](../.claude/docs/design/admin-console.md),
drawn on `larderlogadminconsoleboards.html` — twenty-six boards on three pages.**

**It is built, in seven stages on 2026-08-29**: the way in and the pushed pane,
Overview, the household list, the household page and its three writes, People,
the account page, ownership transfer, the account deletion pre-flight, the audit
log, retention, export, the orphan dialog, the list states and the Mobile page.

**Board 10 — *seeing inside a household* — is decided against**, deliberately
and with a threshold for reopening it; see below. Three further things the
boards draw cannot be built at all, and none is a later stage: every **email**,
**storage**, and **last seen**. The rest of this decision is why each of those
went the way it did.

### The console is a pane, not a surface

*Administration* is pushed into the app drawer exactly as *Members* is — the
same 36px back button on `drawer-raised`, the same Playfair 600 21 heading with
its scope in the meta beneath. So the way out is the gesture the app already
teaches, and the console inherits collapse, the rail, the account row and the
account menu for free.

**There is no admin shell to design.** There is the app, with one more pane in
it, and the content column swapped for the console's. Almost nothing is a new
component: the drawer is the drawer, the confirms will be `ConfirmDialog`, the
sort menu is the sort menu, and the household tile is already specced at four
sizes. What changed against the design's own claim is that the console shares
**the whole drawer** rather than "tokens and nothing else".

### An administrator is a name in `LARDER_ADMIN_IDS`, and nothing else

`ctx.env` reaches **query** handlers, not only mutations and endpoints —
confirmed against a running capsule. So the flag is a comma-or-whitespace list
of account user ids in `.env.server`, which syncs to the platform as a secret
variable on publish exactly as `INVITE_SECRET` does.

**Fail-closed in every direction.** An absent variable, an empty one, and one
full of ids that are not yours all give the same answer. There is no bootstrap
path and no first administrator: on a space with nothing set, nobody is one.

**There is no admin *role*.** Roles are per household (D33) and say what you may
do inside one; this says whether you may look at all of them, which is not a
stronger version of the same thing. **Nothing in the UI grants it and nothing
ever should** — the console can delete a household, and a console that can also
mint administrators is one compromised account away from being the only account.
The Activity log is where a grant will show up, attributed to *Out of band*,
because that is the only place it can be seen at all.

`shared/admin.ts` owns the rule, in `shared/` for the reason `shared/identity.ts`
is: it is an authentication decision and it should be unit-testable without a
running capsule. `npm test` is at **548 assertions**, of which 79 are the
console's: the admin rule, the console's arithmetic, the audit log's encoding
and retention, and the relevance ladder.

**`sf dev`'s guest is an administrator, and that is the app's third deliberate
hole** after D14's client gate and `isSignedIn`'s server-side twin. Without it
the console cannot be clicked at all — `sf dev` issues one fixed identity that
no production `LARDER_ADMIN_IDS` would ever name. It is **not** conditioned on
the list being empty: writing a real id into a local `.env.server` to check the
parsing must not lock the dev guest out of the thing it was checking. Take it
out with D14, alongside `?signedout`, `?demo` and `?members`.

### `/admin` cannot exist, and the platform's own 404 is better than ours

The published space serves nothing at an unknown path — `SPA false`, the same
fact that made an invite link `/?join=<code>` (D28). So `/admin` is answered by
the edge before the app is reached.

The design asks for the app's own 404 there, on the grounds that a 403 would
confirm the console exists and that there is a flag worth getting. **An edge 404
for an unrouted path says even less, and says it identically to everybody** —
including to an administrator who typed it. `?admin` is the deep link, in the
app's own `?join=` / `?demo` / `?members` idiom, and it is **not a gate**: every
console query re-checks the flag server-side, so arriving with the parameter and
without the flag opens a pane whose sections answer `denied` and draw nothing.

### The metadata-only rule

**Everything on a household page is a count, a name, or a date. If a field is
ever not one of those three, it does not belong there.** It is stated on the
page rather than merely observed by not drawing items, and it is the spine of
the whole console. `AdminHouseholdRow` is where it is enforceable in code.

### What the boards ask for and the platform cannot give

Three of them, and none is a gap to fill later:

- **Every email.** `nora@example.com`, *"Search by name, member or email"*, and
  the Activity entry's *"actor with their email"*. `auth.email` is empty on a
  Spacefast account by design (D56) and a handler is told about its **caller**
  and never a third party, so no part of this app has ever held another person's
  address. Search covers names and ids, and the placeholder says so.
- **Storage** — `2.4 GB` on Overview, `1.1 MB` per household. The server context
  is `{auth, content, db, env, gravatar, log, spam}` and carries no storage
  handle in either direction. *Live invites* takes the fourth card instead:
  real, administrative, and it keeps the row four across.
- **"Last seen" on an account.** Nothing records a session, and nothing in the
  schema can be made to imply one.

### Counting is a scan, and that is the thing to watch

Zero's query builder is `collect` / `take` / `first` / `paginate` with **no
aggregate at all**, so a count is a scan and there is nothing to push down.
Overview reads four tables end to end and the list reads six; `by_creation` is
what makes it possible with no schema change, since every table has one —
including `households`, which declares no index of its own.

It is linear in the whole database and fine at this app's size. **It stops being
fine somewhere in the low thousands**, and the fix then is a denormalised counts
row per household maintained by the mutations that already invalidate, not a
smarter query — there is no smarter query to write.

### Last-active is computed, not stored, and `households` still has no `changedAt`

D44 gave `households` an `addedAt` and deliberately no `changedAt`, because
nothing orders households by recency and a rename is not an event anything
reacts to. That is still true of the app; the console is the first thing to want
an answer, and it computes one — the newest `changedAtOf()` across a household's
items and its three taxonomies — rather than making every mutation in the
capsule maintain a column for a screen almost nobody opens.

**An unknown last-active is not dormant.** Every pre-D44 row holds `''`, so the
alternative would flag the app's oldest households — the ones most likely to be
real — as abandoned, on the strength of a column that did not exist when they
were written.

### The deltas say *new*, not `+`

They count what arrived in the window and cannot count what left, because
nothing records a deletion until the Activity log exists. `+34` would be a claim
about the net; `34 new` is what is true.

### The console never shows an invite code

**Added with stage 2, and it is the sharpest thing the metadata-only rule
turned out to imply.** The boards print
`larderlog.app/?join=k3f9d2a7b1c8…` on the household page, beside the invite's
role and expiry.

A code **is** the authorization ([D39](#d39-an-invite-preview-is-the-one-query-that-answers-a-guest)):
whoever holds one can join the household it belongs to. So printing it in the
console would hand every administrator a silent route into any pantry in the
space — and reading someone's shelves is the one thing the refusal card in the
*other column of the same page* promises the console does not do. The card and
the code cannot both be on that screen.

The objection that an administrator can already delete a household does not
rescue it, and stating why is the point: **deleting is loud, recorded and
irreversible, and joining is none of the three.** The powers are not comparable
just because one sounds larger. `AdminInvite` therefore carries a role, two
dates and the name of whoever issued it, and the handler that builds it says in
a comment why the fifth field is missing.

### An administrator is exempt from none of the household's own rules

Stage 3's four writes — `adminSetRole`, `adminRemoveMember`, `adminRevokeInvite`
and `adminDeleteHousehold` — are the only mutations in this capsule that reach a
household the caller is **not** a member of. Every one starts with
`requireAdmin`, and there is no second line of defence beneath it: Zero has no
row-level security, and an administrator has no membership row to resolve
against. `requireAdmin` is therefore the single most load-bearing line in
`server/`, which is why `shared/admin.ts` is fail-closed in every direction and
unit tested for each of them.

Three rules are carried over rather than reimplemented, and the reason each
survives is worth stating:

- **[D22](#d22-a-household-always-keeps-an-owner)'s last-owner guard.** An admin
  cannot demote or remove a household's only owner. That is not a limitation but
  the flow: the fix for an ownerless household is to *promote* somebody, and a
  console that could strand one would be manufacturing the very state its own
  Overview flags as needing attention.
- **[D21](#d21-a-demotion-revokes-the-invites-that-person-made)'s invite
  revocation.** A demotion or a removal kills the invites that person minted, or
  an owner dropped to editor keeps minting editors through a link already out.
- **The delete cascade**, children first, verbatim from `deleteHousehold` —
  Zero has none of its own, so a table missed is rows that outlive every route
  to them. Verified by scanning all nine tables for rows still naming a deleted
  household: zero, in every one.

**The console reaches the last-owner case the app never can.** In the drawer's
Members pane the role menu only ever appears on somebody else's row and only to
an owner, so the person you are looking at is never the last one — which is why
that menu can honestly say nothing in it is disabled. An administrator is in
neither position, so a demotion here really is refusable, and it is refused
server-side with a sentence rather than hidden behind a disabled row (D36: a
disabled control cannot explain itself).

**A refusal lands in a banner on the page, not a toast.** The one that matters
says *make someone else an owner first*, which is an instruction about a control
two hundred pixels below it, and a message that dismisses itself after six
seconds is the wrong shape for an instruction.

### Deleting a household is the app's second typed confirmation

The first — deleting your own last household — earned the exception by
destroying data belonging to more than one screen. **This destroys data
belonging to people who are not in the room**, and it is the only place in
Larder Log where that is possible at all.

`requireText` is the household's **name**, not its id: a name is the only string
in this app that identifies a household to a human, and the id is a value to be
copied rather than read. The typing is client-side, because the server cannot
tell a deliberate call from a careless one and should not pretend to.

**Crimson is still never a button.** Both the *Delete household* trigger and
*Revoke* are crimson text on nothing — the way this app *offers* something
destructive — and the confirm behind each takes the ordinary ink primary (D36).

### Transferring ownership is a real hand-over, and deletion is what forced it

The design doc says *"transferring ownership is a capability the app does not
have yet — the role menu can promote someone to Owner, but nothing **hands
over** a household."* Both halves are true, and the difference is two writes
rather than one: promoting **adds** an owner, transferring **moves** ownership,
and if the second is done as the first the household briefly has two owners and
may well keep them.

`adminTransferOwnership` promotes the target and demotes every other owner, in
that order — so there is never an instant with no owner, which is the state it
exists to get a household *out* of. It takes no `from`: a client that had to
name the current owner is a client that could name it wrong, and the ownerless
case has nobody to name at all. D21 applies to each demotion, so a handed-over
household does not leave the previous owner minting editors through a link
already out.

**I was wrong about this one turn earlier**, having said the pre-flight's
transfer was just a promotion inside the deletion. It is not: the same button
has to work for the orphan case, where the account is not going anywhere.

### The account pre-flight

**Deleting an account removes it from Larder Log and cannot remove the
Spacefast account itself.** What this app owns is the rows keyed to a `userId` —
every membership, and the profile. That belongs in the copy rather than being
left to be discovered, because signing in again produces a stranger with the
same id and no history.

**The pre-flight is what makes deletion reachable at all.** D22 blocks a sole
owner from leaving a household; run that rule against every household at once
and deleting an account becomes a wall for exactly the people most likely to
want it. One row per solely-owned household, hand it over or delete it, and a
tail line for the households where nothing has to be decided — so the dialog
accounts for **every** household rather than only the ones with a question
attached.

Three things the handler does that are not obvious:

- **It recomputes which households need an answer** rather than trusting the
  list the dialog was built from.
- **A decision about a household that needed none is refused, not ignored.** It
  means the client and the server disagree about the state, and quietly dropping
  it would let a stale dialog delete a household nobody chose.
- **Everything is validated before anything is written.** A half-applied
  deletion leaves one household transferred and an account still present, with
  no record of either.

**520 rather than 420 is the console's one deliberate deviation from the confirm
shell**, and the design doc names it as such: a confirm asks one question and
420 is right for it; a pre-flight asks two and has to show you what you are
answering about. `ModalShell` gained a `width` prop — a number, not a class,
because Tailwind resolves a class by scanning for a static string.

**The disabled primary is right here and nowhere else.** D36's rule is that a
disabled control cannot explain itself — which is about a control whose reason
is off-screen. Here the reason **is** the screen: the unanswered rows are
directly above the button.

### What board 4 and board 5 could not have

Three more, on top of the household page's:

- **`LAST SEEN`, on both.** Nothing records a session. The nearest derivable
  value — the newest activity across the households somebody belongs to — is
  activity by *anyone* in them, so it would attribute another member's edit to
  this person and be confidently wrong on exactly the screen an administrator
  would trust. `JOINED` takes the column, which is a date the app really holds.
- **`Awaiting deletion`**, the board's fourth People chip, which needs a
  deletion hold and therefore a column. *Sole owner* takes its place and is the
  more useful of the two: it is exactly the set of people whose account cannot
  be deleted without answering a question first.
- **`Signs in with`.** `auth.provider` describes the caller, and D47 settled
  that this app does not name authentication lanes anyway.

**The `Admin` flag is the one flag the console can really see**, and it is the
only place in Larder Log where the flag is visible at all — nothing grants it
and nothing else displays it. It reads `LARDER_ADMIN_IDS`, plus the caller's own
row: `sf dev`'s guest administers by bypass rather than by being listed, so
without that second clause the person reading the console would find their own
row saying they are not an administrator.

### The Activity log, and the one thing an audit log has to get right

**The eleventh table, and the console's only schema change.** `activity`, on a
`by_at` index, applying on the next publish with no flag as `profiles` did.

**What belongs in it and what does not.** Administration — a household or an
account deleted, ownership handed over, a role changed, an invite revoked.
**Nothing a household does to its own pantry**: adding an item is not
administration, and a console that logged it would be the surveillance the
household page refuses to be. Verified rather than assumed — an item add and an
invite mint both wrote zero rows.

**And it does not record where you were.** No address, no device, no session.
An address is a location and this is a log of actions, which is the same
instinct that keeps items off the household page. If that turns out to be too
little during a real incident it is a decision to revisit out loud, not a field
to add quietly.

**This is the one place in Larder Log where an observed timestamp is the
point.** *Edit item* deliberately has none anywhere; that rule is about items,
and a log whose rows cannot be placed in time is not a log. An opened entry
gives the time to the second **and names the zone** — every stamp in this app is
ISO 8601 UTC, and printing a local time without saying so is how two people
reading the same incident disagree about when it happened.

**A millisecond stamp was not enough, and finding out cost nothing but reading
the rows back.** `adminDeleteAccount` writes a `household.transfer` and then an
`account.delete`; both landed on the same millisecond, at which point `by_at`
descending put the transfer **above the deletion that caused it**. So a stamp is
never reused — if the clock has not moved, the next row takes the previous plus
one — which makes `at` strictly increasing and `by_at` a true order. It is
per-isolate, so two concurrent requests can still tie; at this scale nothing
writes concurrently, and the alternative is a sequence row and a write per
write.

**A deletion entry denormalises and nothing else does.** Every other row can
point at something that still exists; a deletion row is the only surviving
record of the thing it describes, so it carries its own copy — the name, the
colour, the id, and the counts as they stood — and the counts are taken
**before** the cascade, because afterwards there is nothing to count. The card
says so on its own face: *this household no longer exists; everything above is
the log's own copy.*

**`held` is JSON in a string, and that is a platform constraint.** Zero has no
array or JSON type and no numeric type. The alternative is five string columns
only a deletion row ever fills, which is five permanent columns (D44) bought for
one row shape. `shared/activity.ts` owns the encoding, and its decoder **never
throws** — a row is written once and read forever, so it has to survive `''`,
a value written by a later version, and a corrupt string. A log entry that
renders three of its four counts is worth more than one that renders a stack
trace.

**The action is a stored slug and the sentence is assembled.** D32's rule about
term colours applied to a log: a row that stored *"Changed Nora's role to
Editor"* could never be reworded or translated, and an unrecognised slug still
reads as a time and a person, which is most of what an entry is for.

**`actorName` is a copy and it stays after the account is gone.** An audit log
you can erase by deleting yourself is not an audit log. **Erasure and an audit
log pull in opposite directions and this picks a side**, which is a reason to
say so on the deletion screen — both the account page and the pre-flight do —
rather than a reason to leave it unsaid. It wants a lawyer's read before it
ships.

**Retention is stated, not enforced, and nothing prunes anything.** The design
makes it the console's one real setting and pairs it with export, because they
are one question. Both need somewhere to store the answer and a sweep to apply
it, and this app has no schedule. `RETENTION_MONTHS` is a constant the log
*reports*; making it true is the next thing this feature owes.

**Two actor kinds are reserved and unwritten.** *Automatic* waits on a deletion
hold; *Out of band* waits on grant detection, which would mean storing the
last-seen `LARDER_ADMIN_IDS` to diff against. Both are in the vocabulary so the
renderer handles them from the first row rather than being taught later, and
both draw a blank disc with an italic label — a row is never attributed to
somebody who did not do it.

### Retention is enforced, and it is not a control in the console

**This is a deliberate narrowing of the design**, which makes retention *"the
only control in the console that is a setting rather than a list or a record"*
and pairs it with export because they are one question: how long do you keep
this, and how do you get it out.

Reading is not destroying, so **export stays in the console**. Retention does
not, and the argument is this decision's own, one shape along: **an
administrator who can shorten retention can erase the record of what
administrators did.** Dropping it from 24 months to one deletes twenty-three
months of history, with the deletion itself being the only thing the log would
have to say about it. That is the same failure as a console that could mint
administrators — one compromised account away from being the only account — and
it gets the same answer. `LARDER_RETENTION_MONTHS` sits beside
`LARDER_ADMIN_IDS` in `.env.server`, and the console **reports** it.

**Enforcement is append-time, because this app has no schedule.** `logActivity`
prunes what has expired immediately after it appends, a bounded number per
write so a retention change that suddenly expires ten thousand rows does not
turn the next role change into a ten thousand row delete. One consequence,
stated rather than discovered: **a log nothing is adding to is a log nothing is
pruning**, so the last rows before a quiet period outlive their retention until
something else happens. Acceptable — rows nobody is adding to are rows nobody is
reading either, and the alternative is a scheduler this platform has not been
asked for.

Everything unparseable falls back to the default rather than refusing: a log
that stops working over a typo in an environment variable is worse than one that
keeps its rows a little longer than intended. **Zero is a real answer** and
means keep nothing; a negative is not, and must not read as *keep forever*
through the cutoff arithmetic.

**The cutoff clamps the day of the month.** 31 March minus one month is 28
February, not 3 March. A cutoff that overshoots by three days deletes three days
of records nobody asked it to, and it would only do so on a 31st.

### Export is a range, and it says when it was capped

**A button that hands over all 2,904 rows invites the habit of handing over all
of them**, so the menu offers months and a year and has no *everything* row.
Bounds are `[from, to)` so consecutive months compose — the next month's `from`
is this month's `to`, and no row is counted twice or missed at the boundary.

**Bad bounds return an empty range, never the whole table.** Reversed, absent
and unparseable all yield nothing: the failure mode of the opposite default is
handing over everything.

**A truncated audit export that looks complete is worse than no export**, so the
cap rides the result as a flag rather than being inferred from the row count,
which nobody could check without knowing the limit.

CSV rather than JSON, because an export exists to be opened by something that is
not this app — JSON is the better shape and the worse deliverable. It carries
the **stored stamp**, not a rendering of one: an export is read by something
that wants to sort and compare, and *3 days ago* cannot be either.

`client/lib/activityCsv.ts` rather than `shared/`, and the boundary is the one
this project already draws: the *shape* of a log row is shared because both
halves speak it, but turning one into a file reaches `Blob`, `URL` and
`document` — three identifiers the capsule compiler's denylist rejects outright.

### The orphan dialog is what ownership transfer was for

**Amber, because nothing is gone yet.** A household whose last owner left is
stuck, not destroyed: until somebody is promoted nobody can rename it, invite
anyone, or manage its locations and sources. Amber is *hold on* and crimson is
*gone*, which is the blocked dialog's existing rule — and the primary goes where
the problem is rather than doing anything itself, exactly as *Open Members*
already does.

**It opens on arrival**, which is what the board draws and the only arrangement
that works: an ownerless household is broken in a way nobody looking at it would
otherwise notice, and the whole point of Overview flagging the count is that
somebody arrives here to fix it. Dismissal is per household, so leaving and
coming back to a *different* broken one still asks.

**With no members at all it asks a different question** — there is nobody to
promote, so the only thing left to decide is whether to delete it, and the
dialog says so rather than offering a primary that cannot work.

### The list states, and the console at 390

**Searching adds a sort option and takes the chips away.** *Best match* means
nothing without a query, so offering it on an unsearched list would be a sort
option that silently does nothing. Typing switches to it and **clearing the
field restores the sort the list had before**, rather than leaving it on an
option that has stopped existing. `matchScore` is the ladder — exact, prefix,
anywhere in the name, then the same three against member or household names,
then the id last. Nobody types an id hoping to sort by it, and a row that
matched only because its id contains `ab` must never outrank one whose name
starts with it.

**The server checks the needle as well as the sort.** `relevance` is only
reachable while something is typed, but a stale argument must not leave every
row scoring zero and the list in id order — which on the hosted runtime is
sequential integers sorted as strings, an order nobody could predict.

**Day one has no search, no chips and no button**, and it returns before any of
them are drawn. It is `total === 0`, **not** `matching === 0`: a filter that
rules everything out is a different screen and keeps its controls, because the
controls are how you get back. The empty state points at the thing that can
create a household — a person signing in — because the console cannot.

**At 390 the chips scroll and nothing is pinned.** The applied-filter row pins
its clear because that row is a set you are dismantling; these are one status
filter with one value on at a time, so there is nothing to keep in reach. The
split is `md:` rather than the measured column, and that is D45's rule rather
than the exception row 2's note warns about: row 2 asks whether its labels
*fit*, which a docked drawer changes without the viewport moving, and this asks
whether there is a **scroll gesture** — a mouse has none, so a docked drawer at
1280 must still wrap.

**Every control clears 44px below `md`** — the chips, both sort triggers, the
pagers, the export, the role trigger, and both crimson ghosts — and the list
rows clear 78. A 32px control inside a 78px row is the hit area the shopping
list already corrected once.

**Three things stack at 390 rather than truncating**: an invite row (a role, a
date and a countdown do not share 358px), the account page's key/value rows (a
132px label column leaves 226 for the value), and an opened log entry's fields.

**Activity is deliberately not drawn at 390 and is not made to be.** A log row
is a time, a person, an action and a target, and three of those are long. It may
simply not belong on a phone — a thing to decide, not a layout to shrink into —
so it stacks rather than truncating, which is the least-wrong version of
undecided.

### Seeing inside a household is decided, and the answer is no

**Decided 2026-08-29, and recorded as a decision rather than left as an
omission**, which is what the design document asks for in so many words:
*"if it is never built, say so as a decision rather than an omission."*

Board 10 draws both answers side by side so the choice would be visible rather
than implied. **Metadata-only holds. Support means asking somebody inside the
household.**

The alternative was fully specified and is not being built: an explicit,
recorded, expiring look — a required free-text reason, a duration, a persistent
amber banner on the household page while it is open, read-only access, and the
household being told. It is a good design. What settles it against building it
*now* is that its load-bearing part is the one most likely to be dropped: **the
household being told.** Without that, this is a console that reads people's
shelves quietly, which is exactly what the refusal card on the household page
promises it is not — and the card would have to come down, or become a lie.

So the position the console already takes becomes the position it holds:

- **The household page shows how much a household holds, never what.** Its
  refusal card stays, and stays true.
- **The console never shows an invite code** (above), which is the same rule
  enforced against the back door rather than the front one. Both would have to
  be revisited together.
- **Support is a person, not a permission.** The console can tell you a
  household has 41 items and 4 locations and has not been touched in eleven
  days. It cannot tell you which jar is missing, and the answer to somebody who
  needs that is somebody who is already inside.

**What would reopen it**, stated so it is a threshold rather than a mood: the
first real support request that metadata cannot answer — and the design's own
line is the honest version of when that arrives, *"the first person who emails
at 11pm saying their items vanished."* If it is reopened, the banner and the
household's notification are not negotiable parts, because they are the whole
difference between a recorded look and a quiet one.

**One consequence to keep in view:** an administrator can already *delete* a
household, so this is not a claim that the console is powerless over one. It is
a claim about a specific asymmetry — **deleting is loud, recorded and
irreversible; looking is none of the three** — which is the same argument that
keeps invite codes out of the console, and it is the sentence to re-read if
either is ever revisited.

### Rejected

- **A separate admin app, route or shell.** The design's own first claim, and
  the boards disprove it: the drawer, the account row, collapse and the rail are
  all wanted, and all of them already exist one level up.
- **An `admins` table.** It survives an env change and an Activity row could
  point at it, but nothing in the UI can write it either — so the grant path is
  out of band regardless, and this way it is not also a schema change.
- **`usePaginatedQuery`.** It pages the raw table cheaply and cannot answer
  *matching*, the three chip counts, or a sort by a derived column. The boards
  draw a pager with `Showing 1–25 of 412`, not infinite scroll.
- **`formatCompactValue`.** `38.2K` saves eleven pixels and loses the count.
  This app has never abbreviated a number anywhere.
- **Hiding the People and Activity rows until they are built.** D30 removes a
  control rather than disabling it, and that rule is about a permission you do
  not have — where a disabled control cannot explain itself. A section that does
  not exist *yet* is a different fact, and hiding it would quietly unmake a
  promise the design's own nav block makes. They are drawn, disabled, and say
  *Soon*, with their counts suppressed so the tag is not read as a near-miss.
- **The invite code on the household card.** See above — it is the one field
  on the boards that would make the refusal card beside it untrue.
- **Letting an administrator override the last-owner guard.** Tempting, because
  the console is the only place that can see an ownerless household — and wrong
  for the same reason: it would be the only thing in the app able to *create*
  one. Promoting is always allowed, which is the whole fix.
- **Treating the pre-flight's transfer as a promotion.** Considered and wrong:
  the same control has to serve the orphan case, where nobody is leaving, and
  promoting there would add a second owner rather than hand the household over.
- **Shipping `candidates` on every household row.** It is a list of names per
  household per person, so it would be most of the membership table arriving to
  answer a question almost nobody asks. It rides only the solely-owned rows,
  which are the only ones the pre-flight offers a menu for.
- **A toast for a refused write.** See above: the useful refusal is an
  instruction, and an instruction must not time out.
- **Logging anything a household does to its own pantry.** The line the whole
  console rests on, and the log is where it would be easiest to cross.
- **Five columns for a deletion's counts.** A column is permanent and nothing
  backfills; one documented encoding with a guarded decoder is the smaller
  commitment.
- **Storing the sentence rather than the slug.** It could never be reworded.
- **Retention as a setting, for now.** It needs storage and a sweep, and a
  number that claims to be enforced and is not is worse than one that says what
  the policy is.
- **Retention as a console control.** See above — it is the one setting whose
  own audit trail it would destroy.
- **A scheduled sweep.** There is no scheduler, and append-time pruning needs
  none. The cost is one stated caveat rather than a platform dependency.
- **An *everything* row on the export menu.** The habit it invites is the
  problem, not the volume.
- **Resolving `targetGone` in an export.** It means *true when you asked*, which
  is not a fact about the event — it would read as data and age into a lie.
- **Offering *Best match* on an unsearched list.** A sort that does nothing.
- **Keeping the search and chips on an empty space.** Three controls over
  nothing, in front of the one sentence that says why there is nothing.
- **Pinning anything in the mobile chip row.** These are not a set being
  dismantled; there is nothing to keep in reach while scrolling past the rest.
- **The recorded, expiring look inside a household (board 10).** Decided
  against for now, above — not forgotten, and with a stated threshold for
  reopening it.
- **Restoring the console in `useViewState` (D51).** Everything that record
  restores is a way of looking at *your* pantry. An app that reopens on a list
  of every household in the space has forgotten what it is for — and a
  `LARDER_ADMIN_IDS` that loses an id would leave a device restoring a section
  it can no longer be shown.

---

## D63. A suggestion menu answers the question its field asks

**Decided:** 2026-08-31.

**The design document is
[`.claude/docs/design/autofill.md`](../.claude/docs/design/autofill.md), drawn
on `larderlognameautofill.html` — twelve boards on four pages, both themes.**

**Built, all of it**: the shared menu, the name field's two groups, the search
field's two, the picking rule, the `×` and the two-step Escape, and the grid's
matching brought into line with the menu's.

### One component, two questions

The Add / Edit sheet's name field asks *what is this item called*. The top bar's
search field asks *what are you looking for*. **They open the same menu** —
`SuggestMenu`, the sort menu's construction at the sort menu's tokens, its third
user after the unit menu — and everything that differs between them is which
groups they build.

**Nothing in either menu is ever *selected*, and that is what frees the fill.**
The sort menu and the unit menu both mark the current row with a crimson check
rather than a fill, because with a fill doing both jobs a hovered row looks
chosen. A suggestion has no current value, so there is nothing for a check to
mark and `surface-alt` can mean highlight outright — **one treatment for the
pointer and the keyboard cursor alike**, driven from an index rather than from
`:hover`, so a pointer resting on row three and an arrow key sitting on row one
cannot paint the menu twice.

Sunk works here where D45 found it fails on the page ground: a control on the
ground hovering to `surface-alt` reads as disappearing, because that token *is*
the ground's middle stop. **A menu is a card**, so sunk is a real step down from
it. The rule generalises exactly as it was written.

### The name field answers about names, and nothing else

**Two groups: `IN YOUR PANTRY`, then `COMMON ITEMS`.** A terms group was drawn
here and cut on 31 Aug, and the reason is the decision's own title: *Baking* the
type and *Baking Soda* the item collided in a field labelled `ITEM`, and setting
a chip from the name field was a second subject in one control. The term **row**
survives unchanged — it is a search component now, in a group whose whole job is
to apply one.

**Search's field asks a wider question, so it gets wider answers**: item names,
item **sizes**, and term names. Never notes — a row in the list for a reason
that is invisible in the row is worse than a shorter list. **Its second group is
`FILTERS`** — see the reversal in *Rejected*.

### One row shape, three kinds of row

**Amended 2026-08-31, and it is the last of that day's reversals.** The item row
was 56px and stacked — the name over `3 on hand · Pantry` — while a catalog row
and a term row were single 38px lines, the term row with its scope and its
number right-aligned in meta. **Two constructions inside one 440px menu read as
two different kinds of control**, and the stacked one was spending a whole line
on a sentence rather than on a fact: *on hand* is what the number in that slot
has always meant.

So the item row **is** the term row, with a status dot and a size in it:

| Kind | Height (desktop / 390) | Content |
|---|---|---|
| **Item** | 38 / 48 | status dot · name · size in meta · right-aligned `Location · N` |
| **Catalog** | 38 / 48 | the name, nothing else |
| **Term** | 38 / 48 | term dot · name · right-aligned `Store · 6` |

**The size stays with the name rather than taking the meta slot** — at the shelf
*"Butter, 1 lb"* is one phrase, which is the run list row's own rule, and it is
the only place a size-only match can show why the row is there.

**The boards draw the two-line form**, and the design doc's own table gives the
item row 56 at both widths. Both describe the shape that was built first.
**One consequence worth having**: the menu's worst case is now six 38px rows
rather than two 56s and three 38s, so it covers meaningfully less of the sheet
than the doc's *~299px at 480* estimate.

### A match is a prefix of any word

`be` finds Ground **Be**ef and Black **Be**ans; `eef` finds nothing.
Case-insensitive. **The matched characters going to 700 is the whole explanation
of the rule** — it is never written on screen — which is why `matchAt` in
`shared/suggest.ts` returns an offset rather than a boolean.

**The grid behind obeys the same rule.** It was `name.toLowerCase().includes()`,
so `eef` found Ground Beef and `pint` found nothing at all. The menu is a
shortcut into results that are already on screen underneath it, and a menu
listing a row the grid has ruled out is a menu nobody can trust.

**It opens at two characters and never on focus.** An empty name field offering
six common groceries is the app guessing at what you came to do. Six rows, at
most three per group on the sheet and five items plus three terms in search, and
**it never scrolls**: the unit menu scrolls because fifteen units are a fixed set
you are choosing from, and this is a guess you can improve by typing one more
letter.

**Nothing matches, so nothing opens.** No *No matches* row and no *see all* row.
A menu that opens to report an absence covers the surface to say what the empty
list already said — and in search the grid behind is already narrowed to the
same set, so everything the menu could list is on screen underneath it.

### Picking carries properties, never counts — and only while adding

**Amended 2026-08-31, before any of it shipped.**

**Editing fills the name and nothing else.** An edit sheet is open on a whole
item somebody already described — its shelf, its chips and its size are answers,
not blanks — and a menu that overwrote five of them because the name happened to
prefix-match another row would be a silent write to fix a typo in one. Adding is
the opposite: every field is empty, and filling them is the entire point. **The
menu is the same on both sheets; only what a press does changes.**

**Adding from a pantry row brings across the name, the size, and the Location /
Store / Type chips. It never brings a count.** *Low at* is a count rather than a
property of the thing: copying it would carry Ground Beef's 15 onto a jar of
anything, and the household default is the number a new item should start
from — which settles the question the *Household default.* hint left open.

**Adding from a catalog row brings across the name, the type and the shelf.**
The catalog was a list of bare strings and is now a list of `{ name, type,
place }`: *Half and Half* is Dairy and it goes in the refrigerator, in every
household there has ever been, and a word list that knows that and asks anyway
is the app declining to use what it has. Those two are the same everywhere for
the reason D50 gives for seeding types at all.

**Never a source.** Where you buy a thing *is* one household's own vocabulary
(D40), the seeded shops are shapes of shop rather than shops, and a household
that ticked *grow* may not buy it at all. Guessing there would be the app
inventing an answer, which is what D48 settled about names.

**Both are matched by name, exactly and case-insensitively, against terms that
already exist.** A household that renamed *Dairy* to *Dairy & Eggs* gets nothing
filled rather than something wrong, and **a catalog pick never creates a term** —
absent rather than wrong, which is D30's instinct applied to a value instead of a
control.

**A bean is sold two ways, so it is two rows.** Thirteen common US-market beans
appear twice: the bare name is the can (`Canned Goods`, the cupboard) and
`<Bean>, Dry` is the bag (`Dry Goods`, the bulk shelf). They are genuinely
different things to keep — they run out independently and their sizes are not
comparable — so one row could not serve both, and this is the one place the
catalog carries a pair. **The suffix is not decoration**: a comma is a word
separator to `matchAt`, so typing `dry` lists the bulk shelf and typing the
bean's name finds both of its forms.

**`Garbanzo Beans` and `Chickpeas` are both there, and that is a knowing
duplicate.** One bean under the two names US cans actually print; somebody
typing either has to find something. The cost is that picking one and picking
the other produce two different items — the *Berries* versus *berries* hazard
already on the open list — and a real fix needs the catalog to carry aliases
that resolve to one entry, which is a shape change rather than a list edit.

**The watch-out, and nothing in this design catches it**: picking Ground Beef
when you already have Ground Beef makes the duplicate *one tap*, faster than
typing it. Exploration **C** — a pantry match as a signpost, replacing the Add
sheet with that item's own Edit sheet — is the only drawn answer that stops a
duplicate rather than describing one, and it is what to reach for if this bites.

### Nothing in either menu leaves the screen you are on

**Amended 2026-08-31, before any of it shipped.** The rule this section used to
state — *a chevron means the row leaves the screen you are on* — was true of a
search menu whose item row opened that item's Edit sheet. **It no longer does**,
so the rule has no user and **the chevron is gone from both menus**.

- **An item row finishes the query for you.** It fills the search field with
  that item's name, which narrows the grid to it. The row is a shortcut through
  typing, not a way into the item — and putting a form over the pantry from a
  control whose whole job is finding things *in* the pantry was the wrong verb
  for it. **This also removes the one place a viewer had to be gated**: filling
  a search field is a read, so the pantry group is now theirs in full.
- **A term row applies the filter and clears the query.** The two are
  alternative ways of narrowing the same grid, and leaving a stale query on top
  of a fresh filter narrows it twice — usually to nothing. Clearing empties the
  menu, which is what closes it: with no query there are no rows.

**That retires *terms are a set you work through*** as well. It was the reason a
term row kept the menu open, and it cannot survive a press that clears the
field. Applying two filters is two queries now, which is one more keystroke and
one less thing to explain.

**The applied term still lands in D45's filter row**, where *Clear filters* can
take it off again — no new component, and that bar was built for exactly this.
**A term already applied is dropped from the menu rather than marked**, which is
what keeps *nothing is ever selected* true.

### Escape has two steps, and the field has an `×`

**Escape closes the menu and keeps what you typed**, joining the unit menu and
the composer ahead of the sheet in Escape's order. **A second Escape clears the
search field** — the two steps its `×` collapses into one. That `×` is new:
D45 has said since it was written that *search has its own `×`*, and it did not.

**Search is still not touched by `Clear filters`**, and now doubly right: the
menu's term rows put chips in that bar, and clearing them must not clear the
query that found them.

### What is open, and one thing that is not

- **The catalog is a hand-written word list** with no source, no locale and no
  plurals policy, it is US-centric, and **it does not learn**. Making it learn
  makes it household data, which is a schema change and a different design.
- **Search reaches past the applied filters on purpose.** Filtered to *Pantry*
  and searching for something in the freezer, the menu finds it and the grid
  does not. A search that cannot reach past a filter you forgot you set is the
  worse failure — but nothing on screen says so.
- **`0 in stock · 0 out` under a query.** D45 already recorded that a pill
  reading `0 out` is a control that can only disappoint. A query makes that
  ordinary rather than rare, and nobody has looked at one on a real screen.
- **Six rows was chosen, not measured**, and so was five-plus-three.

**Not open:** whether the menu is debounced. It is not, on either field, and the
grid narrows on every keystroke. At twenty items that is free; it becomes a
question at a few hundred, not before.

### Rejected

- **A `TERMS` group on the name field.** Built, and cut the same day. A
  suggestion menu answers the question its field asks, and `ITEM` asks one.
- ~~**`FILTERS` as the search group's heading.**~~ **Reversed 2026-08-31.** The
  argument was that *filters* names the verb while *terms* names the thing, and
  that *terms* is the app's own word. It is — everywhere a term is a thing you
  are looking *at*. This menu is the one place it is a thing you are about to
  *do*, and the row does the same job as a chip in the drawer two panes away.
  The "one heading the two menus could not have shared" objection also died with
  the change: they no longer share the group at all.
- **Bare hairlines between the groups**, as the sort and unit menus use. Those
  group variants of one thing, where a heading would name what the trigger
  already names. Here the groups are different *kinds of answer*, and which kind
  a row is changes what pressing it does. A hairline cannot say that.
- **Letting search's menu take the field's real width** (~1221px at a 1372
  column). It would put a two-word item name in an acre of nothing. At 440 it
  covers exactly one column of the grid and never clips a neighbour mid-word.
- **A pre-selected first row.** Enter would then commit a guess nobody made,
  which is D48's rule one control over. Down lands on the first row, Up on the
  last.
- **A *No matches* row, and a *see all* row.** Both describe an absence the
  screen behind already carries.
- **Searching the notes.** A row in the list for a reason invisible in the row.
- **A `0 out` pill's disappointment, solved here.** It belongs to the status
  pills, not to this menu, and solving it in passing would restyle a control on
  a screen this feature only happens to cover.
