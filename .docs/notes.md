# Open Questions

Things we haven't settled. Move each one to [decisions.md](decisions.md) when it
gets answered.

## Blocked: we cannot publish (2026-08-25)

Three platform problems compose into a lockout. None of them is ours, and the
code is ready.

1. **The API requires an `x-spacefast-rationale` header** on publishes from
   agent-attributed credentials. Undocumented — the word appears nowhere in
   `zero.md`, `cli.md`, `publish.md`, or `llms.txt`. npm's `spacefast@0.0.26`
   has no way to send it.
2. **The CLI that can is 0.0.27, on the binary channel only.** npm still serves
   0.0.26 (published 2026-08-22); 0.0.27 went to GitHub releases on 2026-08-25.
   It adds `sf publish --rationale`, described as "the audit rationale required
   by agent credentials".
3. **The 0.0.27 standalone binary cannot compile a Zero capsule.** It resolves
   esbuild's native helper and `@spacefast/zero/client` through
   `createRequire(import.meta.url)`, where that URL is inside its own Bun
   virtual filesystem (`/$bunfs/root/`). `ESBUILD_BINARY_PATH` clears the first;
   nothing clears the second, because you cannot install a package "alongside" a
   virtual filesystem.

And behind all three, **finalize is broken anyway**. The one run that reached
the platform — 0.0.26 with the header injected by a preload — created
`ver_da36789d34044bbd9e95466c13235913`, uploaded 16 files, then failed with
`runtime_api_not_found`. `failedStage: null`, `manifestHash: null`,
`filesAddedCount: 0` with a non-empty `pendingUploads`: the manifest never
reconciled. This is the same stage that broke on 2026-08-24 with a 406.

**State right now:** space `Status: active`, **v2 still live and serving**, v3
recorded `status=failed`. Nothing wedged, unlike yesterday.

**The way out is one of:** npm ships 0.0.27, or Spacefast fixes finalize. Both
are theirs. Full detail, with exact errors and suggestions, in
[spacefast.md](../.claude/docs/spacefast.md).

**Do not retry repeatedly.** Yesterday's wedge of three spaces came from
hammering a broken finalize.

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

- **Migration granularity — the create-from-nothing case is answered; the
  change cases are not.** The v2 publish applied all 60 operations of the
  Phase 2 schema (9 `create_table`, 36 `add_column`, 15 `add_index`) with no
  flags and no prompt, so **creating tables, columns, and indexes is additive**
  and lands during `sf publish` exactly as documented. All nine tables answer
  `sf db dump` on the live space.

  Still unknown, because nothing has been *changed* yet: is adding an index to
  an existing table additive? Is widening or altering a `.default()`? Those need
  a second publish that modifies the schema rather than introducing it.

  **Watch out for `sf db`'s "Pending operations" line.** After the successful v2
  publish it still reads `Pending operations: 60` — the full create-from-empty
  plan — even though every one of those operations had already been applied and
  the tables are queryable. It appears to be the artifact's plan rather than a
  diff against live state, so do not read it as work outstanding. `sf db dump`
  against a real table (vs. a made-up one, which errors with
  `zero_db_table_not_found`) is the honest check.
- **Does a *query* throw surface like an endpoint throw?** The 500 +
  problem+json result above is the endpoint path. How it reaches `useQuery` /
  `useMutation` — thrown, rejected promise, empty result — still needs a
  browser.

### Answered by the v2 publish (2026-08-24)

- **Does the space's public visibility survive a publish? Yes — confirmed on the
  v2 publish (2026-08-24).** The dashboard's public toggle lives outside the
  published config, and a `sf publish` from an `sf.jsonc` with no `access` field
  left it alone: `GET /` and `GET /api/status` both answer 200 unauthenticated
  after v2. Publishing does send a `config: {}` patch, but it merges rather than
  replaces. `access` stays unset, which is what Phase 3's invite flow needs.
- **Publishing exposes the project's source files — settled, see
  [D29](decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload).**
  `sf publish` mirrors the whole project root into the upload, and after v2
  `/CLAUDE.md` and every file under `/docs/` returned **200** to anyone.

  `publishPathIgnored()` denies only a fixed list (`.git`, `node_modules`,
  `.env*`, key/cert patterns, `.DS_Store`, `.gitignore`), **does not honor
  `.gitignore` itself**, and there is no exclude flag — `--source-include` does
  the inverse. What there *is*, is the dot rule: dot-prefixed paths are uploaded
  but refused by the serving layer with 403, verified on `.claude/`, `.idea/`,
  and `.test-out/`. So `docs/` became `.docs/` and `CLAUDE.md` became
  `.claude/CLAUDE.md`, which is one of Claude Code's two project-instruction
  locations and therefore costs nothing. The payload under
  `.spacefast/zero/public/` now carries neither.

  Still public, and deliberately: `/LICENSE.md`, `/package-lock.json`,
  `/tsconfig.json`, `/tsconfig.test.json`, plus the app itself.
  `/sf.jsonc` and `/theme.json` 404 — the runtime appears to shadow those two
  names.

- **There is no SPA fallback, and it is a publish flag rather than a
  discovery.** Zero's client exports `Router`, `Routes`, `Route`, `Link`,
  `useNavigate`, `useParams`, and `useLocation`, and the public docs show a
  two-route app — but on the published space every unknown path answers with the
  platform's 404 page, `/join/TEST` and `/anything-else` alike, so `client.js`
  is never fetched and no route ever runs. The compiled artifact's `client`
  section is `{ bundlePath, basePathAware }` and carries no route declarations;
  the runtime cannot know what the client would have routed.

  **`sf dev` does not reproduce this**: locally the shell is served at every
  path, `/join/ABC23DEFGH` included, so a path route passes every local check
  and 404s in production. Verified by curling both on 2026-08-25.

  `sf publish --dry-run` prints the answer as one line of its plan: `SPA false`.
  `sf publish` takes `--spa auto|true|false`, undocumented in the runtime
  reference, which presumably turns the fallback on. Untested — Phase 3's invite
  link rides in a query parameter instead
  ([D28](decisions.md#d28-an-invite-link-is-joincode-not-joincode)), so nothing
  needed it. Worth testing before anything in this app wants real routes.

### Unchanged from earlier

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
Nothing product-shaped is blocking Phase 3; what remains open above is platform
behavior and the source-exposure decision.

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
