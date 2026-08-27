# Data Model

Every table below lives in the app's Zero database. Zero adds `id`, `createdAt`,
and `updatedAt` (all strings) to every row automatically — they are never
declared. The names are **reserved** in two senses, and the second one took a
while to find:

1. Declaring one throws at schema-definition time.
2. **`insert()` refuses a supplied value** — *"Zero manages items.createdAt; app
   code cannot set it directly"* — confirmed against a running capsule on
   2026-08-27.

Verified 2026-08-26: both are stamped at insert, `createdAt` is never rewritten,
and `updatedAt` is bumped by every `update()` — including an empty one. They are
ISO 8601 UTC with milliseconds, so they string-compare correctly. See
[D35](decisions.md#d35-created-and-modified-dates-are-the-platforms-not-ours).

**The app therefore keeps its own stamps, under its own names.** Because undo
re-inserts rather than un-deletes (D17), a restored row gets a fresh `createdAt`
and a fresh `updatedAt`, so neither can carry a row's real age across an undo —
which is how a restored item ended up at the top of *Recently added*. Five
tables carry `addedAt`, and four of those carry `changedAt` as well; every
ordering in the app reads those, never the built-ins
([D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)).
The rules live in `shared/stamp.ts`. The built-ins survive only as the last
fallback for rows written before those columns existed — nothing backfills, so
that fallback is permanent for those rows.

Field types available: `string()`, `boolean()`, `id(table)`, each with an
optional `.default(value)`. That's the whole vocabulary. No numbers, no arrays,
no timestamps beyond the built-ins — every stamp below is a `string()` holding
ISO 8601 UTC.

## Tables

### `households`

The container for everything. One household is one pantry.

```ts
households: table({
  name: string(),
  createdBy: string(),                    // ctx.auth.userId of the creator
  defaultThreshold: string().default("1"), // numeric-as-string
  ink: string().default(""),              // colour token; "" means unset
  addedAt: string().default(""),          // ours, ISO 8601 UTC — D44
})
```

**No `changedAt` here, deliberately.** Nothing orders households by recency and
a rename is not an event anything in the app reacts to. Adding one later is
additive, so it stays cheap to revisit.

`ink` is a colour **token** (`color-7`), exactly as `terms.ink` is
([D32](decisions.md#d32-a-term-stores-a-color-token-not-a-color)). It was added
after the fact, so every row written before it holds `""` — and nothing
backfills them. `householdInk()` in `shared/household.ts` resolves that to a
default derived from the row **id**, which both the client and the server call
so the rail and the invite card never draw the same household two colours
([D42](decisions.md#d42-a-household-has-a-colour-and-it-is-one-of-the-sixteen)).

`createdBy` is **provenance only and never consulted for access**. Ownership
lives entirely in `memberships.role`, and a household may have several owners
([D22](decisions.md#d22-ownership-is-a-role-not-a-column)). The old `by_owner`
index is gone with it — every authorization path goes through `memberships`.

### `memberships`

Who can see and edit a household. The join between an auth identity and a
household. This table is the authorization source of truth.

```ts
memberships: table({
  householdId: id("households"),
  userId: string(),                    // ctx.auth.userId
  displayName: string(),               // denormalized for the member list
  role: string().default("viewer"),    // "owner" | "editor" | "viewer"
})
  .index("by_user", ["userId"])
  .index("by_household", ["householdId"])
```

`by_user` is the hot path: every request resolves the caller's household through
it, and it now returns **several rows for one user**
([D33](decisions.md#d33-a-user-may-belong-to-several-households)). Never
`.first()` it — a query picks through `selectMembership` (honor the requested
household, fall back to a deterministic default) and a mutation through
`findMembership` (exact match or refuse).

`role` is the authorization level, defaulting to the least privileged value. See
[Roles](#roles) below.

### `invites`

A join code. Someone signed in who opens `/join/<code>` gets a membership row.

```ts
invites: table({
  householdId: id("households"),
  code: string(),                        // random, URL-safe, server-generated
  role: string(),                        // the level this code grants
  expiresAt: string(),                   // ISO 8601 UTC; "" means never
  createdBy: string(),
  revoked: boolean().default(false),
})
  .index("by_code", ["code"])
  .index("by_household", ["householdId"])
  .index("by_creator", ["createdBy"])
```

`role` is fixed when the code is minted: owners mint any level (co-owners
included), editors mint `viewer` only, viewers mint nothing
([D21](decisions.md#d21-invites-carry-the-role-they-grant)).
`by_creator` exists so demoting or removing a member can revoke the invites they
created — without it, an owner demoted to editor keeps minting editors through
codes issued before the demotion.

`expiresAt` is an ISO 8601 UTC timestamp written at mint time as now + 14 days
([D24](decisions.md#d24-invites-expire-after-14-days)). ISO 8601 is chosen
because it is the one date encoding that compares correctly as a plain string —
the [D4](decisions.md#d4-numbers-are-strings) trap does not apply to it.
Redemption checks `revoked` **and** expiry.

Redemption **rejects a caller who is already a member of that invite's
household** — a code must never change a current member's role in either
direction. Joining a *second* household is the ordinary case since
[D33](decisions.md#d33-a-user-may-belong-to-several-households).

### `locations`, `types`, `stores`

The three per-household taxonomies. Structurally near-identical; kept as
separate tables because they attach to items differently (one location per item,
many types and stores) and because merging them into one polymorphic table buys
nothing here.

`icon` is **reserved and unread**. The glyph sets were cut before v1
([D34](decisions.md#d34-term-icons-are-cut-and-the-column-is-kept)); the column
survives because dropping one needs `sf db migrate --drop` while filling it
again is additive. Inserts write `''`. D23's closed-set rule is what it would
come back under.

```ts
locations: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // a color TOKEN (`color-7`), not a hex — D32
  icon: string(),                // reserved, always "" — D34
  addedAt: string().default(""),   // ours — D44
  changedAt: string().default(""), // bumped by updateTerm — D44
}).index("by_household", ["householdId"]),

types: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // color token — D32
  icon: string(),                // reserved, always "" — D34
  addedAt: string().default(""),
  changedAt: string().default(""),
}).index("by_household", ["householdId"]),

stores: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // color token — D32
  addedAt: string().default(""),
  changedAt: string().default(""),
}).index("by_household", ["householdId"])
```

**Terms are ordered A–Z by name, and the ordering is applied once** — in the
`pantry` query, by `byName()` in `shared/term.ts`. The drawer's filters, the item
sheet's chips and the shopping list's store cards all render the same three
lists, so sorting in any one of them would let the other two disagree. They were
previously in `collect()` order, which is seed order for a new household and
creation order after that. A term restored by undo therefore lands where its
name puts it rather than at the end (D44).

**`createHousehold` seeds fifteen terms through `insert`, not `createTerm`**, so
it is the one path that could leave a term unstamped. All fifteen share one
stamp: they arrive together, and staggering them a millisecond apart would imply
an order that isn't real.

**`ink` holds a token, not a color.** A term stores `color-7`; what that looks
like is decided by the active theme in `client/lib/palette.ts`, so re-theming
restyles every term in every household without rewriting a row
([D32](decisions.md#d32-a-term-stores-a-color-token-not-a-color)).
`normalizeInk()` still accepts a legacy `#rrggbb` — rows written before that
decision hold one — but nothing new writes a hex.


### `items`

```ts
items: table({
  householdId: id("households"),
  name: string(),
  locationId: id("locations"),
  qty: string(),                    // non-negative integer, as a string
  threshold: string(),              // non-negative integer, as a string
  notes: string().default(""),
  addedAt: string().default(""),    // when the ITEM entered the pantry — D44
  changedAt: string().default(""),  // bumped by updateItem AND adjustQty — D44
}).index("by_household", ["householdId"])
```

`addedAt` is what *Recently added* sorts on. It is not the same thing as
`createdAt`: the row is new after an undo, the item is not.

`changedAt` is bumped by **every mutation that writes a field a person can
see**, `adjustQty` included — a quantity is information about the item, and the
hot path being hot is not a reason for it to lie. **Nothing reads it yet**, and
that is deliberate: a row written without one never gets one, so the column has
to exist before the rows do.

Note what is **absent**:

- No `status` field. Status is derived from `qty` and `threshold` at render
  time. Storing it would create a second source of truth that drifts.
- No `open` field. The prototype's `open` is accordion UI state and stays in
  client state.
- No `types` / `stores` arrays. See below.

### `itemTypes`, `itemStores`

Many-to-many joins. Without an array type these are the only option.

```ts
itemTypes: table({
  itemId: id("items"),
  typeId: id("types"),
  householdId: id("households"),   // denormalized; see note
})
  .index("by_item", ["itemId"])
  .index("by_type", ["typeId"]),

itemStores: table({
  itemId: id("items"),
  storeId: id("stores"),
  householdId: id("households"),
})
  .index("by_item", ["itemId"])
  .index("by_store", ["storeId"])
```

`householdId` is denormalized onto the join rows so a household's full graph can
be loaded without walking through `items` first, and so orphan cleanup is a
scoped scan rather than a full-table one.

## Relationships

```
households 1──n memberships      n──1 (auth identity)
           1──n invites
           1──n locations
           1──n types
           1──n stores
           1──n items

items      n──1 locations
items      1──n itemTypes  n──1 types
items      1──n itemStores n──1 stores
```

## Ownership and access

Every non-membership table carries `householdId`. The rule is uniform:

> A row is visible and writable **iff** the caller has a `memberships` row for
> that row's `householdId`.

Enforced in handlers, never by the database. See
[architecture](architecture.md#authorization).

Membership grants *reach*; `role` grants *permission*. Both are checked: the
household check decides whether the row is yours to touch at all, the role check
decides what you may do to it.

Both are **per household**. Since
[D33](decisions.md#d33-a-user-may-belong-to-several-households) one person can
hold an owner row in one household and a viewer row in another, so the role that
applies is always the one on the membership the request resolved to — never "the
user's role".

## Roles

`memberships.role` is one of `"owner"`, `"editor"`, `"viewer"` and is the sole
authority for ownership — `households.createdBy` is never consulted
([D20](decisions.md#d20-three-roles-owner-editor-viewer),
[D22](decisions.md#d22-ownership-is-a-role-not-a-column)).

| Capability | owner | editor | viewer |
|---|---|---|---|
| `pantry:read` | ✓ | ✓ | ✓ |
| `item:write` | ✓ | ✓ | — |
| `taxonomy:write` | ✓ | ✓ | — |
| `household:settings` | ✓ | — | — |
| `invite:create` / `invite:revoke` | ✓ | ✓ ¹ | — |
| `member:role` ² | ✓ | — | — |
| `member:remove` | ✓ | — | — |
| `household:delete` | ✓ | — | — |

¹ An editor may mint **viewer invites only**. Owners mint any level, co-owners
included ([D21](decisions.md#d21-invites-carry-the-role-they-grant)).

² Promoting or demoting an existing member is owner-only. Combined with ¹, this
means **the editor tier can only grow by owner action**: neither path to editor
is available to an editor.

The matrix is a pure `can(role, capability)` in **`shared/roles.ts`**, so the
server enforces and the client disables UI from one table rather than two.

**Invariant: every household retains at least one owner.** The last owner cannot
be demoted, cannot demote themselves, and cannot leave; deleting the household is
the only exit.

## Numbers as strings

`qty` and `threshold` hold non-negative integers encoded as decimal strings
("0", "6", "12") — "decimal" means base-10 text, not a fractional value.
Fractional quantities are deliberately not representable
([D19](decisions.md#d19-quantities-stay-whole-numbers)). Consequences to
respect:

- **Parse on read, serialize on write.** One pair of helpers, used everywhere:
  `toInt(value)` and `fromInt(n)`. Never `parseInt` inline.
- **Validate on the server.** Mutations clamp to `>= 0` and reject anything that
  isn't an integer. A client that sends `"abc"` must not be able to store it.
- **Never sort by these fields in the database.** String ordering puts "10"
  before "2". Quantity sorting happens client-side after parsing.
- Zero-padding was considered and rejected — it would make DB sorting work but
  leaks an encoding detail into every read.

## Cascade deletes

Zero has no cascading deletes. Every delete mutation cleans up its own
dependents, in this order:

| Deleting a… | Also delete | Also do |
|---|---|---|
| `item` | its `itemTypes`, `itemStores` rows | — |
| `type` | its `itemTypes` rows | — |
| `store` | its `itemStores` rows | — |
| `location` | — | **refused** if any item references it; see [D16](decisions.md#d16-deleting-a-location-is-blocked-while-items-reference-it) |
| `member` (demote or remove) | — | revoke the `invites` they created ([D21](decisions.md#d21-invites-carry-the-role-they-grant)) |
| `household` | everything scoped to it, `memberships` and `invites` included | last, after all children |

The location case is not a cascade at all. Zero has no nullable fields, so an
item cannot be left without a location; `deleteTerm` refuses to delete a
location while any item points at it and reports the count instead
([D16](decisions.md#d16-deleting-a-location-is-blocked-while-items-reference-it)).

Deleting an **item** is a hard delete — undo is a client-held tombstone that
re-inserts, not a `deletedAt` flag, so no query filters on deletion state
([D17](decisions.md#d17-undo-is-a-client-held-tombstone-not-a-soft-delete)).
Undo therefore produces a new row `id`.

## Query surface (initial)

The caller is resolved from `ctx.auth`. A **household id does cross the wire**
since [D33](decisions.md#d33-a-user-may-belong-to-several-households) — every
query and every scoped mutation names one — but it is a selector, not authority:
the handler resolves it against the caller's own memberships or refuses. Every
mutation checks a capability from [Roles](#roles) before it writes.

| Handler | Kind | Purpose |
|---|---|---|
| `households` | query | Every household the caller belongs to — name, colour, their role there, item count. Takes no argument |
| `household` | query | The named household + members + live invites |
| `pantry` | query | Items with their types/stores joined, plus all three taxonomies, **A–Z** |
| `invitePreview` | query | What an invite link says about itself, to a signed-out guest — [D39](decisions.md#d39-an-invite-preview-is-the-one-query-that-answers-a-guest) |
| `addItem` | mutation | Create an item and its join rows. Takes optional `addedAt` / `changedAt` — **undo only** |
| `updateItem` | mutation | Patch fields and reconcile join rows; bumps `changedAt` |
| `adjustQty` | mutation | `+1` / `-1`, clamped at 0 — the hottest path; bumps `changedAt` |
| `removeItem` | mutation | Delete an item and its joins |
| `createTerm` / `updateTerm` / `deleteTerm` | mutation | Taxonomy CRUD, parameterized by kind. `createTerm` takes the same optional stamps |
| `updateHousehold` | mutation | Name, colour and `defaultThreshold` — owner only |
| `createInvite` / `revokeInvite` / `redeemInvite` | mutation | Membership; the invite carries its role |
| `changeRole` | mutation | Promote or demote a member — owner only, last-owner guarded |
| `removeMember` / `leaveHousehold` | mutation | Membership removal, last-owner guarded |
| `deleteHousehold` | mutation | Owner only; cascades through every child table |

`pantry` returning one denormalized payload keeps the client to a single live
subscription. Whether that stays practical as the item count grows is an
[open question](notes.md).
