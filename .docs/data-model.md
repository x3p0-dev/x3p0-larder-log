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
  createdBy: string(),                    // ctx.auth.userId of the creator
  defaultThreshold: string().default("1"), // numeric-as-string
})
```

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
}).index("by_household", ["householdId"]),

types: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // color token — D32
  icon: string(),                // key from shared/icons.ts
}).index("by_household", ["householdId"]),

stores: table({
  householdId: id("households"),
  name: string(),
  ink: string(),                 // color token — D32
}).index("by_household", ["householdId"])
```

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
| `households` | query | Every household the caller belongs to — name, their role there, item count. Takes no argument |
| `household` | query | The named household + members + live invites |
| `pantry` | query | Items with their types/stores joined, plus all three taxonomies |
| `addItem` | mutation | Create an item and its join rows |
| `updateItem` | mutation | Patch fields and reconcile join rows |
| `adjustQty` | mutation | `+1` / `-1`, clamped at 0 — the hottest path |
| `removeItem` | mutation | Delete an item and its joins |
| `createTerm` / `renameTerm` / `recolorTerm` / `deleteTerm` | mutation | Taxonomy CRUD, parameterized by kind |
| `updateHousehold` | mutation | Name and `defaultThreshold` — owner only |
| `createInvite` / `revokeInvite` / `redeemInvite` | mutation | Membership; the invite carries its role |
| `changeRole` | mutation | Promote or demote a member — owner only, last-owner guarded |
| `removeMember` / `leaveHousehold` | mutation | Membership removal, last-owner guarded |
| `deleteHousehold` | mutation | Owner only; cascades through every child table |

`pantry` returning one denormalized payload keeps the client to a single live
subscription. Whether that stays practical as the item count grows is an
[open question](notes.md).
