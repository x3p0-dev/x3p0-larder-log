# Open Questions

Things we haven't settled. Move each one to [decisions.md](decisions.md) when it
gets answered.

## Platform behavior we haven't confirmed

**Spike run 2026-08-24** against `sf dev` (schema compiled, probes curled
through temporary `/api/spike/*` endpoints, since endpoints get a writable
`ctx.db`). Six questions answered, one still open, one new risk found. The
answers are in [decisions.md](decisions.md) where they changed a decision, and
summarized here.

### Answered

- **Is `Date` available in a capsule handler? Yes.** `new Date()`, `Date.now()`,
  and `.toISOString()` all work server-side.
  [D24](decisions.md#d24-invites-expire-after-14-days)'s server-computed expiry
  is safe as designed.
- **What format are `createdAt` / `updatedAt`? ISO 8601 UTC.** Confirmed exactly:
  `new Date(row.createdAt).toISOString() === row.createdAt` is **true**, so they
  round-trip and compare correctly as plain strings. Row ids are UUIDs.
- **Are there compound index ranges? Yes.** `.index("by_a_b", ["a","b"])` with
  `range.eq("a", x).eq("b", y)` filters on **both** fields — verified by seeding
  three rows and getting exactly the one match back, not the two that a silently
  ignored second `.eq()` would return. `IndexRange` also exposes `.gt()`,
  `.gte()`, `.lt()`, `.lte()`, all chainable.
- **What does a throwing handler do?** On the endpoint path it becomes
  **HTTP 500** with an RFC 7807 `application/problem+json` body — and the thrown
  message is copied verbatim into `detail`. **Error messages are visible to the
  client, so they must be safe to show and must not leak internals.** The
  `useQuery` / `useMutation` side is not proven by this; see below.
- **`insert()` returns the whole row**, not an id — `createdAt` and the new `id`
  come back without a follow-up `get()`.

### The new risk

- **`id("table")` does not enforce referential integrity.** An `items` row
  inserted with `householdId` and `locationId` both pointing at nonexistent rows
  **succeeded**. `id()` is a type hint, not a foreign key. Consequences:
  - [D16](decisions.md#d16-deleting-a-location-is-blocked-while-items-reference-it)'s
    blocked location delete is enforced by our handler **or not at all** — the
    database will not catch a bug that lets one through.
  - The same is true of every `householdId` on every row. There is no backstop
    under the authorization model, only the hand-written checks.

### Answered by the Phase 2 client work (2026-08-24)

- **What does a handler throwing do to the client? It depends on the handler
  kind, and the difference is load-bearing.**
  - **Mutations reject.** `useMutation` returns a promise that rejects with
    `new Error(serverMessage)` — the message survives intact, so a `try/catch`
    at the call site can show it. This is why every `throw` in a handler is
    written as user-facing copy.
  - **Queries fail silently, and there is no way to detect it.** The client
    handles `query.result` **only**; there is no `query.error` branch anywhere.
    A query that throws simply never emits, and `useQuery` keeps returning its
    initial value forever — indistinguishable from "still loading".

  Consequence, and it shaped the whole query layer: **a query must never throw
  for an expected condition.** `household` and `pantry` return a discriminated
  `QueryState` (`ready` / `guest` / `no-household` / `blocked`) instead. Before
  this, a first-run user with no household would have sat on a blank screen
  forever with nothing to route them to setup.

- **What does `useQuery` return before the first result?** A hardcoded empty
  **array** — `useState(() => getQueryValue(name, ...args) ?? [])` — regardless
  of the query's actual return type. Our queries return objects, so
  `Array.isArray(result)` is the loading check, and it is the only one
  available. A query that legitimately returns an array would have no way at all
  to tell "loading" from "empty".

### Still open

- **Is the server-side dev-guest bypass inert in production?** `sf dev` has no
  sign-in, so `ctx.auth.isGuest` is permanently true locally and a strict guest
  check locks the app out of its own dev environment — the server half of the
  problem [D14](decisions.md#d14-a-loopback-only-bypass-in-the-sign-in-gate)
  solved for the client. `shared/identity.ts` therefore accepts the exact
  identity `sf dev` issues (`guest:local` / `Local` / `guest` / not
  authenticated, all four matched).

  That value comes from `zeroGuestAuth()` in the **`spacefast` CLI** and from
  the client's no-auth fallback — dev tooling, not the hosted runtime — so it
  should never appear on a published space. **But unlike D14's client bypass,
  this has not been verified against the live space.** D14 was confirmed inert
  by loading the published URL signed out; this needs the same check, and until
  it has one it is the weaker of the two holes. If a published space ever did
  issue `guest:local`, every anonymous visitor would share one household.
  `ctx.env` is empty under `sf dev` and the CLI has no env-injection flag, so a
  cleaner environment-keyed switch was not available.

- **Migration granularity.** "Normal additive changes apply during `sf publish`"
  — is adding an index additive? Is widening a default? Not answerable on
  `sf dev`, whose state is in-memory and resets; it needs a deliberate publish
  against the live space, which would replace the working Phase 1 app.
- **Does a *query* throw surface like an endpoint throw?** The 500 +
  problem+json result above is the endpoint path. How it reaches `useQuery` /
  `useMutation` — thrown, rejected promise, empty result — still needs a
  browser.
- **Does the space's public visibility survive a publish?** Unchanged from
  before; see below.

### Unchanged from earlier

- **Does the space's public visibility survive a publish?** The space was made
  publicly viewable from the Spacefast dashboard, but `sf spaces get` still
  reports `config: {}` — so that setting lives outside the published config.
  `sf.jsonc` has its own `access` field (`"access": "public"` is shorthand for
  `{ "public": ["/**"] }`), which we have **not** set. Unknown whether the next
  `sf publish` from a config without `access` reverts the space to private. If
  it does, the app silently becomes unreachable for everyone but the owner —
  which is exactly the failure Phase 3's invite flow cannot survive. **Check the
  live URL from a signed-out browser after the next publish**, and if it broke,
  declare `access` in `sf.jsonc` and treat the dashboard toggle as a fallback.
- **Can we ship a webfont at all? No — confirmed on a published space.**
  `theme.json`'s `fontFace` is ignored; the compile reads only `slug` and
  `fontFamily`. There is no `index.html` to add a `<link>` to, no CSS entry
  point, and `@plugin` / `@config` are rejected.
  `/__spacefast_generated/theme.css` 404s on the published space just as it does
  under `sf dev`, and the shipped `zero.css` contains **zero `@font-face`
  rules**. Fraunces and IBM Plex Mono fall back to `ui-serif` / `ui-monospace`.
  This is the Phase 4 typography decision, and it has an answer rather than an
  unknown.

## Product questions

All settled as of 2026-08-24 — see [decisions.md](decisions.md), D16-D26.
Nothing product-shaped is currently blocking Phase 2.

## Paid off in Phase 2

Both of the costs this section used to track are gone.

- **Taxonomies join by id, not by name.** `items.locationId` is an
  `id("locations")` and types/stores go through the `itemTypes` / `itemStores`
  join tables. The client speaks ids everywhere — filters, chips, item forms,
  cards, the taxonomy manager, the shopping list. Renaming a term is now a
  single-row update instead of a rewrite of every item that mentioned it.

  One bug came out of the conversion and is worth remembering, because the class
  of it will recur: `FacetSection` rendered its active filter by printing the
  value directly, which was a name and became an id. **It typechecked perfectly**
  — both are `string` — and only showed up as a UUID on screen. Anywhere a term
  reference reaches the DOM, it has to go through `termNameFor()`.

- **`makeTaxonomyActions` is gone**, along with `client/lib/taxonomy.ts` and
  `client/data/seed.ts`. The twelve flattened taxonomy callbacks collapsed to
  three server mutations parameterized by kind, exactly as predicted.

## Technical debt carried in from the prototype

- The stale-closure duplicate guard bug still exists in
  `.claude/docs/pantry-tracker-mockup.jsx`. Both files that once carried the fix
  — `src/lib/taxonomy.js` and `client/lib/taxonomy.ts` — are now deleted:
  duplicate checking moved server-side into `createTerm` / `updateTerm`, where
  it is a query against the household's existing terms rather than a closure
  over client state. The mockup is a design reference, not code we run, so this
  is cosmetic — but don't copy from it blindly.
- `LICENSE.md` is GPL-3.0, inherited from the WordPress plugin convention.
  Worth deciding deliberately for a hosted app.
