# Data Model

Every table below lives in the app's Zero database. Zero adds `id`, `createdAt`,
and `updatedAt` (all strings) to every row automatically — they are never
declared.

Field types available: `string()`, `boolean()`, `id(table)`, each with an
optional `.default(value)`. That's the whole vocabulary. No numbers, no arrays,
no timestamps beyond the built-ins.

## Tables

### `households`

The container for everything. One household is one pantry.

```ts
households: table({
  name: string(),
  ownerId: string(),                      // ctx.auth.userId of the creator
  defaultThreshold: string().default("1"), // numeric-as-string
}).index("by_owner", ["ownerId"])
```

### `memberships`

Who can see and edit a household. The join between an auth identity and a
household. This table is the authorization source of truth.

```ts
memberships: table({
  householdId: id("households"),
  userId: string(),                    // ctx.auth.userId
  displayName: string(),               // denormalized for the member list
  role: string().default("member"),    // "owner" | "member"
})
  .index("by_user", ["userId"])
  .index("by_household", ["householdId"])
```

`by_user` is the hot path: every request resolves the caller's household through
it.

### `invites`

A join code. Someone signed in who opens `/join/<code>` gets a membership row.

```ts
invites: table({
  householdId: id("households"),
  code: string(),                        // random, URL-safe, server-generated
  createdBy: string(),
  revoked: boolean().default(false),
})
  .index("by_code", ["code"])
  .index("by_household", ["householdId"])
```

### `locations`, `types`, `stores`

The three per-household taxonomies. Structurally near-identical; kept as
separate tables because they attach to items differently (one location per item,
many types and stores) and because merging them into one polymorphic table buys
nothing here.

```ts
locations: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // base hex; tints derive from it
  icon: string(),                // key into LOCATION_ICONS
}).index("by_household", ["householdId"]),

types: table({
  householdId: id("households"),
  name: string(),
  ink: string(),
  icon: string(),                // key into TYPE_ICONS
}).index("by_household", ["householdId"]),

stores: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // no icon; stores render as outlined chips
}).index("by_household", ["householdId"])
```

### `items`

```ts
items: table({
  householdId: id("households"),
  name: string(),
  locationId: id("locations"),
  qty: string(),                    // non-negative integer, as a string
  threshold: string(),              // non-negative integer, as a string
  notes: string().default(""),
}).index("by_household", ["householdId"])
```

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

## Numbers as strings

`qty` and `threshold` hold non-negative integers encoded as decimal strings
("0", "6", "12"). Consequences to respect:

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
| `location` | — | items keep a dangling `locationId`; see [open questions](notes.md) |
| `household` | everything scoped to it | last, after all children |

The location case is deliberately unresolved — the prototype leaves items
pointing at a deleted location, and we haven't decided whether that's right.

## Query surface (initial)

Resolved server-side from `ctx.auth`; no household id crosses the wire.

| Handler | Kind | Purpose |
|---|---|---|
| `household` | query | The caller's household + members |
| `pantry` | query | Items with their types/stores joined, plus all three taxonomies |
| `addItem` | mutation | Create an item and its join rows |
| `updateItem` | mutation | Patch fields and reconcile join rows |
| `adjustQty` | mutation | `+1` / `-1`, clamped at 0 — the hottest path |
| `removeItem` | mutation | Delete an item and its joins |
| `createTerm` / `renameTerm` / `recolorTerm` / `deleteTerm` | mutation | Taxonomy CRUD, parameterized by kind |
| `createInvite` / `revokeInvite` / `redeemInvite` | mutation | Membership |

`pantry` returning one denormalized payload keeps the client to a single live
subscription. Whether that stays practical as the item count grows is an
[open question](notes.md).
