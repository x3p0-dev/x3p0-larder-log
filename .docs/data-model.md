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
which is how a restored item ended up at the top of *Recently added*. Six
tables carry `addedAt`, and five of those carry `changedAt` as well — the sixth
pair arrived with `profiles`, created after D44 and so stamped from birth; every
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

### `profiles`

The account's own name. One row per signed-in identity, at most.

```ts
profiles: table({
  userId: string(),                // ctx.auth.userId — the only way in
  displayName: string(),
  addedAt: string().default(""),   // ours, ISO 8601 UTC — D44
  changedAt: string().default(""),
})
  .index("by_user", ["userId"])
```

**Why this exists at all**: `ctx.auth.displayName` is a *suggestion*. A lot of
accounts arrive through the my.spacefast.com signup carrying no profile name,
and the ones that do carry one did not set it here. So the app collects its own
([D46](decisions.md#d46-the-display-name-is-on-the-account-and-it-is-asked-before-the-fork)),
before the path forks into create-a-household and accept-an-invite — the person
following an invite link has no membership to hang a name on and is exactly the
person whose name other people need.

There is **no unique constraint** to lean on, any more than `id()` is a foreign
key. `setDisplayName` reads through `by_user` before it inserts, and that read
is the whole of the "one row per account" rule.

The stamps are here from birth deliberately. Nothing orders profiles by time, but
[D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)'s
own note is the argument: a column is permanent, a row written without one never
gets one, and this table had no rows yet.

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
  picture: string().default(""),       // ditto, the avatar URL — "" for none
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

`displayName` is a **denormalized copy of `profiles.displayName`**, not a second
name (D46). It is what the member list and the invite card's inviter line read,
so neither has to join a profile row per member on a live query that re-runs
whole. Two rules keep the copy honest, and both are load-bearing:

- every path that inserts a membership stamps it through `accountName()` in the
  capsule, which walks the profile → membership → identity chain;
- `setDisplayName` writes back through **every** membership the account holds. A
  rename that skipped that would show the new name to the person who typed it
  and the old one to everybody else, which is worse than having no column.

`picture` is the same kind of copy for the same reason, and holds the account's
avatar URL or `""` ([D55](decisions.md#d55-a-members-face-is-a-copy-on-the-membership-and-the-letter-is-not-a-fallback-to-be-ashamed-of)).
It is **a URL and not an email**: `ctx.auth.picture` is already the finished
address, so nothing here stores or exposes a member's email to the rest of their
household. The same two inserts stamp it, through `accountAvatar()`.

Its write-back is **not** `setDisplayName` but `syncAccountAvatar`, a mutation
the client calls on load — a picture changing has nothing to do with a name
changing, and the copy has two ways of starting out stale that a rename would
never fix: an account that sets up its Gravatar *after* joining, and every row
written before the column existed (`""` forever, since nothing backfills — see
[D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)).
It writes only rows that disagree and invalidates only when it wrote.

**Every reader must handle `""`**, and the fallback is the initial the avatar
components already draw. Note that the platform's avatar URL carries `d=404`, so
an account with no Gravatar serves *no image* rather than a placeholder — an
`<img>` without an `onError` shows a broken-image glyph instead of falling
back.

A row written before `profiles` existed holds the Gravatar name the account
joined under, and that is not dead weight: it is what grandfathers an existing
account past the required first-run screen.

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
  kind: string().default(""),    // "shop" | "grow" | "make"; "" is shop — D58
  addedAt: string().default(""),
  changedAt: string().default(""),
}).index("by_household", ["householdId"])
```

**A store carries a kind, and that is what makes it a *source*
([D58](decisions.md#d58-a-source-carries-a-kind-and-the-group-is-named-for-what-it-holds)).**
`shop`, `grow` or `make` — *The Garden* is one you pick from, *The Kitchen* is
one you cook from. `''` is what every row written before the column holds and
resolves to `shop`, which is not a placeholder: every source in the app was a
shop until this column existed. `toSourceKind()` in `shared/source.ts` does the
resolving, and the `pantry` query does it once server-side so no render site has
to remember to.

It is the only taxonomy with the column, which is why the DTO is `Source` rather
than a `kind` on `Term`. It is written by `setSourceKind` — its own mutation,
because `updateTerm`'s second argument is *already* called `kind` and means the
taxonomy — and by `createTerm`, on the undo path only.

**The group renames itself**: `Store` while every source is a shop, `Source`
once one of them is not. `sourceGroupWord()` owns that rule, and it asks *does
anything here fail to be a shop* rather than counting distinct kinds — a
household whose every source is a garden has one kind and is emphatically not a
`Store` household.

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
  size: string().default(""),       // how big ONE of them is — D52
  unit: string().default(""),       // its unit KEY, a slug: "quart", not "qt"
  offShoppingList: boolean().default(false),   // retired TWICE — D60, then D65
  listRule: string().default(""),   // "" | "always" | "never" — D65
  seasonFrom: string().default(""),    // month 1-12 as a string; "" for none — D58
  seasonTo: string().default(""),      // both, or neither — shared/season.ts
                                    // never joins the shopping list — D53
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

`size` and `unit` are **one value in two columns** and are never half-set
([D52](decisions.md#d52-an-item-has-a-size-and-a-size-is-a-pair-that-is-never-half-set)).
`normalizeSize` in `shared/size.ts` is the only thing that writes either, and
both `addItem` and `updateItem` go through it — a unit with no number becomes
`1`, and a number with no unit becomes neither. `unit` holds a **slug**, so what
a household stored survives us changing what it prints.

`listRule` is the **list override**, and it is read by exactly one function,
`needsBuying`
([D65](decisions.md#d65-the-list-override-is-a-tri-state-and-it-lives-where-low-at-is-set)).
*Low at* is the sentence *put this on the list when I'm down to N*; `always` and
`never` amend that sentence, and `""` is the absence of an override rather than a
third literal to keep in step with the default.

**`offShoppingList` folds into it as `never`.** D53 gave *some things are never
shopped for* a checkbox, D58's source kinds answered that better, D60 retired the
control and kept the column, and D65 replaced it with three states — so the two
columns say overlapping things and **`listRuleOf` in `shared/listRule.ts` is the
one place they are reconciled**. The new column wins, and writing it clears the
old flag in the same patch, so a row written before D65 stops being legacy the
first time anybody edits it. The column stays for the reason `icon` does (D34).

**Neither reaches `statusKeyFor`**, so an item kept off the list still reads
*Out* on its card and still counts toward the status pills — the pills count
stock, the list counts shopping. `always` is the same split from the other side:
a pinned item on the list while nothing is wrong with it reads `EXTRA` where its
status badge would be.

**`always` is permanent.** Nothing ends it but somebody setting it back — not the
put-away, not `adjustQty`, not an ordinary edit. D64 specified that a put-away
should clear it and that was overruled: a control labelled *Always* that stops
after one trip makes the word lie.

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

### `restocks`

One trip's worth of counts, written once each by the put-away
([D64](decisions.md#d64-a-check-is-a-claim-and-the-count-is-written-once-at-the-shelf)).
**The twelfth table, and the second added for a reader that does not exist yet.**

```ts
restocks: table({
  householdId: id("households"),
  itemId: id("items"),
  tripId: string().default(""),   // the trip these arrived with; opaque
  fromQty: string(),              // the count before
  toQty: string(),                // the count after
  kind: string().default(""),     // the source's kind; "" for a storeless row
  at: string(),                   // ISO 8601 UTC — ours, not createdAt (D44)
})
  .index("by_item", ["itemId"])
  .index("by_household", ["householdId"])
```

`profiles` was the first table written ahead of its reader and
[D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)
is the argument for both: a table is permanent, nothing backfills it, and every
put-away that happens before this exists is a data point nobody can recover. The
intended reader is *trends, tier 2* — with three or more rows against an item,
the sheet's *Low at* hint could say how often it is restocked.

**It is not built, and there is a finding in the way.** Only `restockItems`
writes here. `adjustQty` (the `+` on a card) and `updateItem` (the sheet's *On
hand* stepper) also raise a count and write nothing — so this table records
**put-aways, not restocks**, and a household that mostly taps `+` would get
intervals that are systematically too long rather than merely noisy. Settle that
before reading these rows for anything.

**No `userId`, and that is the privacy line rather than an omission.** A name
rides the *trip*, which is transient and dies with the account that owns it;
nothing in the larder itself ever records who touched a thing, so deleting an
account stays a clean operation rather than a scrubbing job. `tripId` says only
that several rows arrived together.

**`kind` is copied, not joined**, so a reader can tell a shop run from a harvest
without asking whether the source still exists or still carries the kind it had
that day. `""` is a real answer there — a row that named no source — so it is
validated with `isSourceKind` and never with `toSourceKind`, which resolves
everything it does not recognise to `shop`.

**The quantities are stored and are not trustworthy.** A put-away doubles as
drift correction, so `toQty − fromQty` is sometimes a purchase and sometimes a
fix and nothing can tell them apart. They are kept anyway because a row is
written once and read forever, and a column that turns out to be needed cannot
be added to rows that already exist. **The dates are the trustworthy part.**

No `changedAt`: a restock is an event and is never edited.

**There is no retention and no pruning**, unlike `activity`. That is deliberate —
this is data rather than an audit log — but it grows without bound, at roughly
780 rows a year for a household restocking fifteen items a week, and nothing has
a plan for it.

### `activity`

The admin console's audit log
([D62](decisions.md#d62-the-console-is-a-pane-in-the-app-drawer-and-an-administrator-is-a-name-in-the-environment)).
**The eleventh table**, and the first new one after `profiles`. `restocks` above is the twelfth.

| Field | Type | Notes |
|---|---|---|
| `at` | `string()` | ISO 8601 UTC. Ours, not `createdAt` — see below |
| `actorId` | `string().default('')` | The `userId` who did it. `''` when the actor is not a person |
| `actorName` | `string().default('')` | A **copy**, taken at write time, that outlives the account |
| `actorKind` | `string().default('person')` | `person` \| `automatic` \| `system` |
| `action` | `string()` | A stable slug — `household.delete`, `member.role`, … |
| `targetKind` | `string().default('')` | `household` \| `account` \| `membership` \| `invite` |
| `targetId` | `string()` | Deliberately **not** `id()` — see below |
| `targetName` | `string().default('')` | A copy, for the same reason `actorName` is |
| `targetInk` | `string().default('')` | A household's colour token, so a deleted one's tile still draws |
| `fromValue` / `toValue` | `string().default('')` | Whatever the action moved between — a role, a name |
| `held` | `string().default('')` | JSON. What a deleted thing held, at the moment it went |

Index: `by_at` — the log's order, its pager, and its export range.

**Four things about this table are unlike every other one.**

**`targetId` is a plain `string()`, not an `id()`.** Every other reference in
this schema is a type hint pointing at a row that exists. This one points at
rows that are *supposed* to stop existing: a deletion entry outlives its target
by design, and `id('households')` would be a hint that resolves to nothing
forever after.

**It denormalises, and only a deletion row needs it to.** `targetName`,
`targetInk` and `held` are the row's own copy of a thing that is gone — it is
the only surviving record of it, so a join is not available at any price. Every
other row could join and denormalises anyway, so one read answers.

**`held` is JSON in a string.** Zero has no array or JSON type and no numeric
type, so the alternative is five string columns that only one action ever fills
— five permanent columns (D44) bought for one row shape. `shared/activity.ts`
owns the encoding and its decoder **never throws**: a row is written once and
read forever, so it survives `''`, a value written by a later version, and a
corrupt string alike.

**`at` is ours and it is strictly increasing.** D44's reason applies — a stamp
this app sorts by is a stamp this app writes — and one more that only a log has:
two rows written by one mutation landed on the same millisecond, at which point
`by_at` descending put a transfer *above the deletion that caused it*.
`logActivity` never reuses a stamp, so `by_at` is a true order. It is
per-isolate, so concurrent requests can still tie.

**There is no `changedAt`**, because an audit row is never edited.

**Rows expire and nothing schedules it.** `LARDER_RETENTION_MONTHS` (default 24)
sets the window, and the log prunes what has expired every time it is appended
to — a bounded number per write. A log nothing is adding to is a log nothing is
pruning. Retention is **not** a control in the console: an administrator who
could shorten it could erase the record of what administrators did.

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
| `item` | its `itemTypes`, `itemStores` **and `restocks`** rows | — |
| `type` | its `itemTypes` rows | — |
| `store` | its `itemStores` rows | — |
| `location` | — | **refused** if any item references it; see [D16](decisions.md#d16-deleting-a-location-is-blocked-while-items-reference-it) |
| `member` (demote or remove) | — | revoke the `invites` they created ([D21](decisions.md#d21-invites-carry-the-role-they-grant)) |
| `household` | everything scoped to it, `memberships` and `invites` included | last, after all children. **Its `activity` rows survive** |
| `account` (console only) | every `membership` it holds, and its `profiles` row | its solely-owned households are transferred or deleted first, one decision each. **Its `activity` rows survive** |

The location case is not a cascade at all. Zero has no nullable fields, so an
item cannot be left without a location; `deleteTerm` refuses to delete a
location while any item points at it and reports the count instead
([D16](decisions.md#d16-deleting-a-location-is-blocked-while-items-reference-it)).

Deleting an **item** is a hard delete — undo is a client-held tombstone that
re-inserts, not a `deletedAt` flag, so no query filters on deletion state
([D17](decisions.md#d17-undo-is-a-client-held-tombstone-not-a-soft-delete)).
Undo therefore produces a new row `id`.

**`activity` is the one table nothing cascades into**, and that is the point of
it: an audit row is the surviving record of a deletion, so a cascade that
reached it would erase exactly what it exists to keep. It expires on its own
clock and on nothing else's.

**`restocks` makes the opposite choice deliberately.** A restock row dies with
its item and with its household, because there is nothing to say about how often
you restock a row that no longer exists. The audit log denormalises so it can
outlive its subject; this does not, and does not need to.

**Deleting an account is a cascade this app can perform and a deletion it cannot
complete.** It removes every row keyed to a `userId` — the memberships, the
profile — and it cannot remove the Spacefast account itself, which lives on the
platform. Signing in again produces a stranger with the same id and no history.

## Query surface (initial)

The caller is resolved from `ctx.auth`. A **household id does cross the wire**
since [D33](decisions.md#d33-a-user-may-belong-to-several-households) — every
query and every scoped mutation names one — but it is a selector, not authority:
the handler resolves it against the caller's own memberships or refuses. Every
mutation checks a capability from [Roles](#roles) before it writes.

| Handler | Kind | Purpose |
|---|---|---|
| `profile` | query | The caller's own display name, and whether they still owe one — [D46](decisions.md#d46-the-display-name-is-on-the-account-and-it-is-asked-before-the-fork). Takes no argument, and answers before a household exists |
| `households` | query | Every household the caller belongs to — name, colour, their role there, item count. Takes no argument |
| `household` | query | The named household + members + live invites |
| `pantry` | query | Items with their types/stores joined, plus all three taxonomies, **A–Z** |
| `invitePreview` | query | What an invite link says about itself, to a signed-out guest — [D39](decisions.md#d39-an-invite-preview-is-the-one-query-that-answers-a-guest) |
| `setDisplayName` | mutation | Upsert the account's name and write it through every membership. One of two writes not scoped to a household |
| `syncAccountAvatar` | mutation | Reconcile `ctx.auth.picture` into every membership the caller holds, writing only the rows that disagree — [D55](decisions.md#d55-a-members-face-is-a-copy-on-the-membership-and-the-letter-is-not-a-fallback-to-be-ashamed-of). Takes no argument, called on load, and the other unscoped write |
| `addItem` | mutation | Create an item and its join rows. Takes optional `addedAt` / `changedAt` — **undo only** |
| `updateItem` | mutation | Patch fields and reconcile join rows; bumps `changedAt` |
| `adjustQty` | mutation | `+1` / `-1`, clamped at 0 — the hottest path; bumps `changedAt` |
| `restockItems` | mutation | A whole trip's counts at once, plus one `restocks` row each. Resolves every entry before writing any — a put-away must not half-commit |
| `removeItem` | mutation | Delete an item, its joins and its `restocks` rows |
| `createTerm` / `updateTerm` / `deleteTerm` | mutation | Taxonomy CRUD, parameterized by kind. `createTerm` takes the same optional stamps, plus a source's `kind` — **undo only** |
| `setSourceKind` | mutation | A store's `shop` / `grow` / `make` — [D58](decisions.md#d58-a-source-carries-a-kind-and-the-group-is-named-for-what-it-holds). Stores only, and a no-op write invalidates nothing |
| `updateHousehold` | mutation | Name, colour and `defaultThreshold` — owner only |
| `createInvite` / `revokeInvite` / `redeemInvite` | mutation | Membership; the invite carries its role |
| `changeRole` | mutation | Promote or demote a member — owner only, last-owner guarded |
| `removeMember` / `leaveHousehold` | mutation | Membership removal, last-owner guarded |
| `deleteHousehold` | mutation | Owner only; cascades through every child table |

### The admin console's surface

Eight queries and six mutations, all gated on `LARDER_ADMIN_IDS`
([D62](decisions.md#d62-the-console-is-a-pane-in-the-app-drawer-and-an-administrator-is-a-name-in-the-environment)).
**They are the only handlers in the capsule that reach a household the caller is
not a member of**, so the household id here really is only a selector — there is
no membership to resolve it against, and `requireAdmin` is the only check
beneath them.

| Name | Kind | What it does |
|---|---|---|
| `adminAccess` | query | One boolean. The only console query anybody who is not an administrator ever runs |
| `adminSummary` | query | Overview — four counts, three 30-day deltas, twelve months of households, and what needs attention |
| `adminHouseholds` | query | The household list — searched, chipped, sorted, paged |
| `adminHousehold` | query | One household's metadata: counts, members, live invites |
| `adminPeople` | query | The people list, on the same four axes |
| `adminAccount` | query | One account: where they are a member and what they can do there |
| `adminActivity` | query | The audit log, newest first, paged |
| `adminActivityExport` | query | A **range** of the log, capped, for CSV |
| `adminSetRole` | mutation | A member's role in a household the caller is not in. Last-owner guarded |
| `adminRemoveMember` | mutation | Same, and revokes their invites (D21) |
| `adminRevokeInvite` | mutation | Kills a link somebody else is holding |
| `adminDeleteHousehold` | mutation | The full cascade, plus the audit row that records what it held |
| `adminTransferOwnership` | mutation | Promotes one member and demotes every other owner, in that order |
| `adminDeleteAccount` | mutation | Every membership and the profile, after one decision per solely-owned household |

**A console query answers `{ state: 'denied' }` and never throws**, for the
reason every query here reports rather than throwing. A console *mutation*
throws, because a mutation's rejection reaches the client.

**An administrator is exempt from none of the household's own rules** — D22's
last owner, D21's invite revocation, and the cascade above all apply unchanged.
A console that could strand a household would be manufacturing the state its own
Overview flags as needing attention.

**Six of the eight queries scan whole tables**, because Zero's query builder is
`collect` / `take` / `first` / `paginate` with no aggregate at all — a count is
a scan and there is nothing to push down. `by_creation`, which every table has
whether or not it declares an index, is what makes it possible with no schema
change. It is linear in the whole database and fine at this size; **it stops
being fine somewhere in the low thousands**, and the fix then is a denormalised
counts row per household maintained by the mutations that already invalidate,
not a smarter query. `adminHousehold` and `adminActivity` are the exceptions —
one reads `by_household`, the other `by_at`.

`pantry` returning one denormalized payload keeps the client to a single live
subscription. Whether that stays practical as the item count grows is an
[open question](notes.md).

**Filtering never reaches the server.** `pantry` hands over the household's
whole set and the client narrows it, which is why multi-select term filters
([D45](decisions.md#d45-the-applied-filters-are-a-row-of-the-top-bar-not-a-badge-on-the-drawer))
needed no query change, no argument, and no index. The rule they apply lives in
`shared/filter.ts`. The same trade-off as above applies: it is the item count,
not the filter, that would eventually force a server-side query.
