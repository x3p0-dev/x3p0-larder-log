# Building for a million households

**Status:** stages 0 and 1 are **built** (D70). Stages 2–4 are design.
2026-09-02.

Larder Log is being built for **tens of thousands of households, and possibly
1,000,000+**. Almost nothing in the app is wrong at that scale. Almost
everything in the **admin console** is, and the way it is wrong is worth stating
precisely, because it is not the way the code's own comments predict.

This document is the constraint set, the design that follows from it, and the
three questions that have to be answered before any of it is built.

---

## What the platform actually gives us

Measured on 2026-09-02, not inferred. The database is **MySQL** — `sf db
console` is phpMyAdmin — but Zero's typed surface exposes almost none of it.

| | |
|---|---|
| Read verbs | `get(id)`, `withIndex(name, eq/gt/gte/lt/lte).order(asc/desc)` then `collect()` / `take(n)` / `first()` / `paginate({numItems, cursor})` |
| Aggregates | **None.** No `COUNT`, no `SUM`, no `GROUP BY` |
| Column types | `string()`, `boolean()`, `id(table)` — **no numeric type** |
| Arrays / JSON | None |
| Scheduler | None |
| Row-level security | None |
| `collect()` ceiling | **1,000 rows per result set, silently truncated** |
| `paginate()` | walks past it, ≤1,000 per page, cursor-driven |

### The three that decide the architecture

**1. A count is a scan, and a scan stops at 1,000.** With no aggregate, counting
anything means materialising it; with a 1,000-row ceiling, materialising it
stops early and says nothing. Measured: a space holding 3,045 items answers
`1000` to one `collect()`, and the console named a **40-item** household as the
biggest in a space containing a 1,200-item one.

**2. There is no numeric type, so a stored count is a string.** `"10" < "2"`
lexicographically, so any count the console *sorts* by has to be **zero-padded
to a fixed width**. That is not a workaround to be tidied later — it is the
storage format, and it is permanent once rows exist (D27).

**3. `households` declares no index at all.** Every read of it goes through
`by_creation`. At 1M rows there is no sort, no filter and no search that is not
a full walk. **This is the single largest schema gap.**

### And one thing we do not know

**Whether a read-modify-write counter is safe in production.** `ctx.transaction`
exists and is documented only as *"commit both or neither"* — nothing says
whether it takes a row lock. Twenty concurrent increments against `sf dev`
produced no lost update, and that result is **worthless**: the same run took
1.05s for 20 × 50ms spins, so the dev runtime serialised them and there was
never a race to lose. Production is a different engine (see CLAUDE.md's own
QuickJS divergences), and `logActivity`'s comment — *"per-isolate, so concurrent
requests can still tie"* — implies isolates really do run side by side there.

**This is the same trap as the dev-guest identity**, which looked safe by local
evidence and leaked the console to anonymous callers in v15. It cannot be
settled from here. It has to be asked.

---

## The principle

> **Every number the console shows is read from a row. None is derived from
> rows.**

One row read per number, or one small indexed range. Nothing that grows with the
size of the space appears on a page load.

That is a bigger change than it sounds, because it inverts where the work
happens: counting moves out of the query and into **the mutations that cause the
count to change**. The console's docblock already predicts this — *"the fix is a
denormalised counts row per household maintained by the mutations that already
invalidate, not a smarter query"* — and it was right about the remedy while
being wrong about the symptom. It says the scan *"stops being fine somewhere in
the low thousands"*. It never gets slow. It gets **wrong at exactly 1,000**, and
silently.

---

## The design, in four layers

### Layer 1 — the per-household rollup

`households` gains four maintained columns and four indexes. This is the layer
that does the most work for the least risk, because every one of these numbers
is written only by that household's own members.

```ts
households: table({
  …,
  itemCount:   string().default(''),   // zero-padded, 12 wide
  memberCount: string().default(''),   // ditto
  ownerCount:  string().default(''),   // ditto — drives `noOwner` with no membership scan
  changedAt:   string().default(''),   // last activity anywhere in the household
})
  .index('by_name',    ['name'])
  .index('by_added',   ['addedAt'])
  .index('by_items',   ['itemCount'])
  .index('by_changed', ['changedAt'])
```

What each buys:

| index | what it makes possible without a scan |
|---|---|
| `by_name` | A–Z sort, and **prefix search** via `gte(name, q)` + `lt(name, q + '￿')` |
| `by_added` | *Newest* sort, and *new households per month* as twelve range reads |
| `by_items` | *Biggest pantry* sort, and the *Pantry sizes* bands as five ranges |
| `by_changed` | *Last active* sort, and `dormant` as one range against a cutoff |

**`changedAt` reverses a D44 decision deliberately.** D44 gave `households` no
`changedAt` because *"nothing orders households by recency and a rename is not an
event anything reacts to."* The console orders by exactly that, and computes it
today by scanning **four whole tables** (`items`, `locations`, `types`,
`stores`) via `lastActiveByHousehold`. One maintained column deletes that
function.

**Contention is low here by construction.** These rows are written by the
handful of people in one household. A lost update costs that household's count
one, which a repair pass can fix, and which corrupts nothing else.

### Layer 2 — band counters, so a distribution is O(1)

*Pantry sizes* (D69) buckets households by item count into five bands. Even with
`by_items`, counting a band means materialising it.

So the bands are **counters, moved when a household crosses a floor**. `addItem`
already knows the count before and after, so it knows whether the band changed —
and `ITEM_BUCKET_FLOORS` is already the one place a boundary is written down.
Exact, O(1), and it reuses the rule rather than restating it.

The same shape serves `noOwner`, `dormant` and `empty` on *Needs attention*.

### Layer 3 — month buckets, written when the month happens

*New households per month* is twelve numbers. Do not derive them from 1M rows:
keep a `stats` table keyed `(metric, bucket)` and let `createHousehold`
increment `households:2026-09`. Reading Overview is one indexed range of twelve
rows.

At 1M households over three years that is ~28,000 increments a month on one row
— about one a minute, and bursty. **Shard it if the answer to the concurrency
question is bad**: N rows per bucket, increment a random one, sum N on read.

### Layer 4 — space totals, which are the one honest compromise

*Households*, *People* and *Items tracked* are single numbers over the whole
space. There are three ways to get them and no good one:

| | cost | verdict |
|---|---|---|
| Sharded counters | one extra write on **every** `addItem` | **rejected for `items`** — that is the app's hottest path, doubled, to serve one stat card |
| Snapshot row, recomputed by a paginated walk | 1,000 pages at 1M households, but off the page load | **preferred**, needs a trigger |
| Show `1,000,000+` and an as-of time | free | the honest fallback |

Sharded counters are fine for **households** and **people**, which change orders
of magnitude less often than items do.

**There is no scheduler**, so a recomputed snapshot needs an endpoint and an
external cron hitting it. That is real operational surface and it should be a
deliberate choice rather than something discovered later — retention already
works this way (append-time, *"because there is no scheduler"*), and this is the
second feature to want one.

---

## What this costs, stated plainly

**Every mutation that adds or removes a row becomes a mutation that also
maintains counters.** `addItem`, `addItems`, `removeItem`, `deleteHousehold`,
`redeemInvite`, `removeMember`, `changeRole`, `transferOwnership`,
`deleteMyAccount`, and the console's six writes. That is write amplification on
paths that are currently single-purpose, and **a missed one is a number that is
wrong forever with nothing to detect it**.

Two things make that survivable and both should be built with the first counter,
not after:

1. **One helper, not thirty call sites.** A `bumpHousehold(ctx, id, delta)` that
   owns the padding, the band move and the `changedAt` bump together. Thirty
   hand-written increments will disagree exactly once.
2. **A repair endpoint that recomputes a household from its rows**, so drift is
   fixable without a migration. It is also the only way to backfill the columns
   onto the households that already exist.

---

## The app itself is nearly fine, with one exception

Nothing outside the console scans the space. `pantry` reads one household, which
is correct at any number of households.

**But it is capped at 1,000 rows per result set, and the join tables hit that
first.** An item may name several types and several sources, so `itemStores`
reaches 1,000 well before `items` does — store chips would start silently
vanishing from cards at roughly **600–700 items**, and the item list itself
truncates at 1,000. At the scale named, some households will get there.

So `pantry` needs a paginate-until-done read regardless of everything above.
That is free: under the cap it is one call with `isDone` already true, identical
to `collect()`.

**And a 2,000-item pantry is a product question this design does not answer** —
the grid renders every card it is given.

---

## Three questions before anything is built

1. **Does a read-modify-write survive concurrency in production?** Everything in
   Layers 1–3 is a counter. If `ctx.transaction` does not take a row lock, every
   counter needs sharding or a different design, and that is a schema decision
   (D27) rather than a refactor. **Ask Spacefast.** Local evidence cannot answer
   it and looks like it can.
2. **Does the hosted runtime cap reads at 1,000 too?** The constants are named
   `MAX_LOCAL_*`, which suggests dev-only, and that is a guess of exactly the
   kind that has burned this project before. It changes how urgent the
   `paginate` sweep is, not whether it is right.
3. **Is exactness worth its price on the space totals?** *Items tracked* is the
   one number that cannot be maintained cheaply. Deciding it is
   `1,000,000+ (as of 04:00)` is a legitimate answer and much cheaper than the
   alternatives.

---

## Staging

Each stage is independently useful and independently publishable.

| stage | what | why now |
|---|---|---|
| **0** ✅ | `paginate` sweep — all 89 `collect()` calls are `collectAll()` | fixes silent wrong data today; costs nothing; no schema change |
| **1** ✅ | `households` gains four indexes, plus `changedAt` and `itemCount` unmaintained, plus `shared/counts.ts` | **done before the rows exist.** Additive and cheap now; at 1M rows an index build is an outage |
| **2** | `changedAt` + `itemCount` + the helper + the repair endpoint | deletes `lastActiveByHousehold`, makes two sorts real |
| **3** | band and month counters | makes Overview O(1) |
| **4** | space totals — whichever answer question 3 gets | last, because it is the one with a product decision in it |

**Stage 2 is the next one, and it is blocked on question 1.** Every column it
adds is a counter, and whether a counter survives concurrency in production is
the thing local evidence cannot tell us.

**Stage 1 was the one with a deadline** and it is done. Everything else can be built when it is
needed. Indexes and stamps cannot: a column is permanent, nothing backfills, and
every household created between now and then is a row the console will have to
special-case forever.
