# Open Questions

Things we haven't settled. Move each one to [decisions.md](decisions.md) when it
gets answered.

## Blocked: we cannot publish (2026-08-25) — *half resolved 2026-08-26*

> **Still true 2026-08-27**, after the v8 publish. npm `latest` is
> `spacefast@0.0.26` with no `next`/`beta`; `sf publish --help` on it lists no
> `--rationale`; grepping the installed CLI for `SPACEFAST_RATIONALE`,
> `--rationale` and `x-spacefast-rationale` returns nothing. The shim was
> rebuilt from scratch for that publish, as it will have to be for the next one.

> **Update, 2026-08-26.** `sf publish` completed: **v4**, 71 files, 18 seconds.
> Problem 4 below — the broken `finalize` — **is fixed on Spacefast's side**, and
> nothing here changed to cause that. Problems 1–3 stand: npm's `latest` is
> still `spacefast@0.0.26`, the binary channel is still 0.0.27, and that binary
> still cannot compile a Zero capsule. The only reason the publish went through
> is that the rationale header was attached out of band, by a `fetch` wrapper
> loaded with `NODE_OPTIONS=--import`. **The shim is not in the repo** — it lives
> in the session scratchpad and has to be rewritten each time. Check npm before
> publishing again; 0.0.27, or `--rationale` / `SPACEFAST_RATIONALE` on 0.0.26,
> retires it. The rationale must be **true**: it exists so an agent-driven
> mutation is attributable, and supplying the metadata is compliance while
> hiding it is not.
>
> The rest of this section is kept as the record of what the lockout was.

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
- **Can `createdAt` be supplied on insert? No** (2026-08-27). The docs say the
  name is "reserved", which reads as *you cannot declare a column called that*.
  It also means the runtime refuses a value: *"Zero manages items.createdAt; app
  code cannot set it directly"*. The same holds for `updatedAt`, which is
  rewritten on every `update()` regardless. **This is why the app carries its own
  `addedAt` / `changedAt`** — a stamp that cannot be written cannot survive
  undo's re-insert
  ([D44](decisions.md#d44-the-app-writes-its-own-timestamps-because-the-platforms-cannot-survive-an-undo)).

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
  `QueryState` (`ready` / `guest` / `no-household`) instead. Before this, a
  first-run user with no household would have sat on a blank screen forever with
  nothing to route them to setup. A fourth arm, `blocked`, existed to report
  D18's one-household violation and went away with it
  ([D33](decisions.md#d33-a-user-may-belong-to-several-households)).

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

### Answered while building the signed-out flows (2026-08-26)

- **There is an HTTP way to call a query by name.**
  `POST /__spacefast/zero/run` with `{"op":"query.run","name":…,"args":[…]}`
  returns `{"op":"query.result","ok":true,"data":…}` — the same envelope the
  websocket carries, and the same handler `useQuery` reaches. It wants the
  bearer capability **and** the bootstrap cookie; the cookie alone answers
  `{"error":"unauthorized"}`. `mutation.run` works the same way. This is now the
  cheapest honest check in the box and it retires most of the
  throwaway-endpoint pattern. Undocumented — written up in
  `.claude/docs/spacefast.md`.
- **Zero's sign-in is a full-page redirect, and it reports no failures.**
  `hostedSignIn` ends in `location.assign`, so its promise never settles
  observably and the app is torn down. On the way back nothing on `useAuth()`
  separates "abandoned a sign-in ten seconds ago" from "never pressed
  anything" — both are `isGuest: true`. The *didn't come back* state is
  therefore our own bookkeeping: a timestamped marker in `sessionStorage`, in
  `client/lib/signInAttempt.ts`. The **one** auth failure an app can catch is
  the public wrapper throwing *"Gravatar sign-in is unavailable for this
  Spacefast runtime"*, which is every `sf dev`.
- **`@spacefast/zero/client` exports the sign-in function under one name, and
  it is the wrong one.** The `exports` map resolves `./client` to
  `dist/public-client.d.ts`, which re-exports only the Lakebed-compatible
  `signInWithGoogle`. It goes nowhere near Google: the redirect lands on the
  Spacefast account screen. Aliased to `hostedSignIn` at the import in
  `client/index.tsx` (D47) — **not** `startSignIn`, which is already the app's
  own handler in the same file.
- **A query can answer a guest.** Nothing at the framework level gates a query
  on authentication; `isSignedIn` is our own check, applied per handler.
  `invitePreview` is the first read in the app that deliberately does not apply
  it (D39).
- **A new query needs no ceremony in the artifact.** D27's regex trap is
  specifically a *schema* trap — `invitePreview` appeared on the next
  `--dry-run` with tables and migrations untouched.

### Still open after that round

- **The two Gravatar handoff states cannot be reached locally.** *Returning*
  and *didn't come back* both need a real sign-in round trip, which `sf dev`
  has no way to perform. They are built from the marker above and have never
  rendered. Add them to the list of things the published space has to confirm.

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

- **Can we ship a webfont? Yes — settled in
  [D31](decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google).**
  Every route this section used to list is still closed: `theme.json`'s
  `fontFace` is discarded by `zero-compile`'s `presetRecord()`, there is no
  authored `index.html` (the shell is a fixed template in `compile.js`), no CSS
  entry point, `@plugin` / `@config` are rejected, and `zero.css` ships zero
  `@font-face` rules. The conclusion drawn from that was wrong. What Zero is
  missing is the `@font-face` *rule*, and a rule is a DOM node — so the client
  appends a Google Fonts `<link>` at boot.

  **Self-hosting was built first and rejected**, because `sf dev` does not
  serve project static files at all — it answers every unrecognized path with
  the SPA shell, so a self-hosted face is invisible locally and appears only
  after a publish. `sf dev --help` has no static-directory flag. A remote URL
  behaves the same in both environments; D31 records the self-hosted recipe in
  full if that ever changes.

## Open after the admin console (2026-08-29)

D62 built the whole of the console's design except board 10, which it settles
against. These are what it left behind — none blocking, all worth a decision
before somebody rediscovers them.

**Owed by the feature itself:**

- **Nothing has been clicked.** The console is a whole surface verified entirely
  by compiling, curling and reading rows back. The Phase 4.9 entry already
  records what that is worth: one real session found six defects no such check
  could catch. The unclicked list here is the pane, six screens, three confirms,
  a pre-flight, a chart and a CSV download.

  **The 2026-08-30 states sweep is the strongest argument yet for clicking it.**
  Ten controls were missing a hover, a press, a focus ring or an open state, and
  every one of them passed typecheck, passed the class diff, and would have
  passed a browserless check of any kind — because the classes were all
  *present*, and an inline style was quietly beating them. That is the same
  shape as the `ResizeObserver` that never attached: a control that compiles,
  serves, and does not respond.

  **And the sweep itself shipped two dead controls**, found by a real session
  the same day: both *Delete* buttons hovered to the colour of the strip they
  sat on. A class-literal diff proves a rule is in the sheet and cannot see what
  is painted behind it. The ground-aware check written in response reports 0
  across the console, and four real bugs outside it — **all fixed**: both drawer
  segmented controls (whose selected tab also had a focus ring measuring
  **1.00:1**, the same cream as its own fill), `SortMenu`'s rows, the Filter
  tab's add row inside the editing card, and the invite card's *Copy link*.

- **A ring offset cannot resolve against a fill that is not a `theme.json`
  token**, and that is where the remaining ones are. `AccountMenu`'s *Save*, the
  household switcher's four controls and the invite composer's *Create* all sit
  on `drawer.menu` (`#15110B`) or a `panelSkin` panel (`#262019`), neither of
  which any `ring-offset-*` class can name — and the switcher is hosted by **two**
  surfaces with different fills, so no single offset could serve it anyway.
  `DRAWER_MENU_ROW` already answers this with `ring-inset`. Doing it everywhere
  is a decision — inset throughout, or promote `menu` to a token — and it has
  not been made.

  **The chart's tooltip (2026-08-30) is the sharpest case of this on the
  unclicked list.** Nothing browserless can see a hover at all, and its
  positioning depends on a scale the browser computes — `xMidYMid meet` picking
  the smaller of two, and centring the slack. The arithmetic is right on paper
  and on paper is where it has stayed.

- **Concurrent edits are unhandled and unspoken.** Two administrators can act on
  one household at once. The console re-reads on every invalidate, so the second
  one sees the first's result — it just never learns that is what happened, and
  a role menu that silently answers a different question than the one you opened
  it on is worse than a refusal.
- **`LARDER_ADMIN_IDS` is empty in production**, so the console is unreachable
  there. Setting it needs an `account:…` id, and **there is currently no way to
  learn your own** — a throwaway endpoint, `sf db console`, or adding it to a
  screen. Deciding which is the last step before the console exists anywhere but
  locally.
- **The retention sweep only runs when something is written.** Append-time
  pruning needs no scheduler, and the cost is that a quiet space keeps expired
  rows until the next administrative action. Fine now; a real answer needs a
  schedule this platform has not been asked for.
- **Six of the eight console queries scan whole tables.** Zero has no aggregate,
  so a count is a scan. It is linear in the whole database and stops being fine
  somewhere in the low thousands — at which point the fix is a denormalised
  counts row per household, not a smarter query.

**Reserved and unwritten**, both in the log's vocabulary so the renderer handles
them from the first row:

- **`automatic`** waits on a deletion hold — the boards' *awaiting deletion*,
  which needs a column.
- **`system` / out of band** waits on detecting an administrator grant, which
  would mean storing the last-seen `LARDER_ADMIN_IDS` to diff against. Until
  then the log cannot show the one event only it could show.

**Wants somebody who is not us:**

- **An audit log that survives the account it names.** `actorName` is a copy
  taken at write time and stays after deletion, because a log you can erase by
  deleting yourself is not a log. Both deletion screens now say so. The design
  doc asks for a lawyer's read before it ships, and that has not happened.

**Answered, so it does not get re-asked:**

- ~~**Should an administrator be able to see inside a household?**~~ **No**, and
  D62 records it as a decision with a stated threshold for reopening rather than
  as an omission — which is what the design document asks for.

## Product questions

All settled as of 2026-08-24 — see [decisions.md](decisions.md), D16-D26.
Nothing product-shaped is blocking Phase 3; what remains open above is platform
behavior and the source-exposure decision.

Two more were opened and left open on purpose by the signed-out flows
(D37, D40), both named in the design spec's own *Open questions*. **One of them
is now answered**:

- **What does `/` do for someone already signed in?** Straight through to the
  app is what is built. Showing them the marketing page is the answer that lets
  them find the pitch again to send to somebody.
- ~~**Should a new household seed any stores at all?**~~ **Settled by
  [D61](decisions.md#d61-first-run-asks-where-your-food-comes-from-and-the-answer-is-what-seeds-the-sources)
  on 2026-08-29 — the household answers it.** First run asks *where your food
  comes from*, and unticking *We buy it* seeds no shops at all, which is the
  version of "seed none" this note was reaching for. The trade it named —
  a Store filter that opens empty on day one — is now a consequence somebody
  chose rather than one imposed on everybody.

One more was opened by the household colour (D42) and deliberately left for
later:

- **A term's dot on the drawer is not the palette, and now nothing else is.**
  Every picker draws the palette following the theme — light `base` in light,
  `darkDot` in dark. A term *chip* on the drawer does not: `chipDot()` at rest
  returns `drawerDot(c)`, which is the `onDrawer` override where the theme
  specifies one and `darkDot` where it does not, in **both** themes. So in light
  mode the Filter tab now shows a light base in the picker and a bright
  drawer ink on the chip two rows below it.

  That is deliberate as far as it goes — the drawer is near-black in both themes
  and the light bases were tuned for cream — but it means the drawer carries a
  seventeenth-through-thirty-second set of values that the picker no longer
  admits exists. Three ways out, none obviously right:

  1. **Leave it.** The chip's dot is legible against the drawer, which is the
     job. The picker answers "what will this look like on an item card", which
     is where a term is mostly seen.
  2. **Draw `drawerDot(c)` in the picker when it is on the drawer.** Matches the
     chip beside it exactly, and reintroduces the surface-dependent dot the
     palette rule was adopted to remove.
  3. **Make `chipDot()` theme-driven too** and drop `onDrawer` entirely. One
     palette everywhere, at the cost of the eight hand-tuned drawer inks and
     some contrast on near-black.

  Only **eight of sixteen** `onDrawer` values are specified in the first place
  (see the roadmap), so the divergence is already partial. Worth settling when
  those eight are finished rather than before.

  **A data point for option 3, from 2026-08-27.** The item sheet's selected
  chips had the same shape of bug and it was fixed by deriving rather than
  tabling: a selected chip is filled with `inkBg`, the page's *inverse*, so its
  dot takes the other theme's value — `entityColorFor(id, terms, on ? ! dark :
  dark)`. That is not a compromise, it is measurably better, because the two
  palettes are tuned against exactly those two grounds: across all sixteen
  colours the worst dot-on-fill contrast went from 1.98:1 to 3.09:1, clearing
  the 3:1 non-text floor everywhere. **The rule that emerged is "the dot reads
  against the surface it sits on"**, which is what the drawer chip is *also*
  doing — `drawerDot` exists because near-black is a third ground. So the
  divergence may be correct and the picker may be the thing that is wrong, which
  is a fourth option this list did not have: draw the picker's dots against the
  panel they open on. Still not worth settling until the eight are finished.

Three more were opened by the add/edit item redesign
([D52](decisions.md#d52-an-item-has-a-size-and-a-size-is-a-pair-that-is-never-half-set),
[D53](decisions.md#d53-some-things-are-never-shopped-for-and-that-is-a-property-of-the-item))
and left open on purpose:

- **Is *size* the right word?** The ask called it an *amount*, and the design
  rejected that because *amount* collides with the on-hand count. It is a
  one-word change if *size* reads wrong on a real screen. Related: nothing about
  the size is shared vocabulary, so two people can enter *1 qt* and *32 fl oz*
  for the same bottle and the app will never notice. That is the price of not
  making units terms, and it is the right price — until the shopping list is
  asked *how much olive oil do we have*, at which point D52 is the decision to
  revisit first.
- **The struck cart on a card is a glyph nobody has been taught.** It is the one
  place an excluded item explains itself in the grid, and it sits on a card that
  otherwise carries no icons beside the name. The design document drew it as a
  mockup and said so; **it is the first thing to challenge.** Two questions ride
  with it: whether an excluded item should still be *counted* somewhere — a
  household could quietly exclude half its pantry and the shopping trigger would
  go quiet with it — and whether the exclusion is the household's or yours. It is
  the household's today, because every other property of an item is.
- **The shopping-list row's stacking floor is still 460, and the size probably
  moves it.** The design derives roughly **520** by scaling off the recorded 460,
  and says in as many words that it is derived rather than measured. The build
  left it at 460: the row already wraps on measured content rather than at a hard
  breakpoint, and 520 changes the grid's `minmax()` and so the column count at
  1440. **Wants one look on a real screen, with a long name and a size.**

- **The drawer now has three off-state chips, not two.** The Filter tab's chips
  are `drawer-raised` with a coloured dot; the page's are surface-on-line; and
  the invite composer's role chips, drawn 2026-08-27 and built as drawn
  ([D49](decisions.md#d49-settings-is-three-blocks-and-members-are-a-level-down)),
  are a `drawer-dashed` **outline with no fill at all**. All three read fine.
  They are not the same idea, and the third is either the drawer's off-state
  finally written down or a fourth thing to reconcile. The on-state agrees
  everywhere — cream, in both themes — which is the half that was already
  settled by the shopping list's tokens note.

One was opened by restoring the view (D51), and it is really a list:

- **What else should the app remember about where you were?** D51 restores the
  drawer's collapsed state, its tab, the term filters and the status pill; the
  shopping mode and its ticks were already in the trip record (D41). Everything
  below was left out on purpose, and none of it is settled. **Anything on this
  list that stays per-device is a field in the same record and costs a line;
  anything that should follow the account is a schema change**, which is the
  real fork.

  1. **The sort.** The cheapest one here — not household-scoped, not sensitive,
     one field. It was left out only because it was not asked for. The argument
     for it is that a sort is a way of reading the pantry, exactly like a
     filter. The argument against is that *Recently added* is the default
     precisely because it is the one most likely to be right after a gap.
  2. **An add or edit in progress.** The strongest case and the hardest, and it
     is the same argument that put the ticks in `localStorage`: a phone in a
     shop is killed in the background, and losing a half-typed item is worse
     than losing a filter. But a draft is *nearly* data. Restoring one means
     deciding what arrival looks like — the sheet reopens over the grid by
     itself, or something offers it back — and a draft for an item somebody else
     has since added is a duplicate waiting to be saved. Wants a decision, not
     a field.
  3. **How far down you were.** `visibleCount` resets to one page and the grid
     returns to the top, which only matters once a pantry is big enough to
     scroll. True scroll restoration is hard here — the grid is fluid, a card
     changes height when it expands, and the infinite scroll means the position
     cannot be restored until the pages are. The cheap half is to restore
     `visibleCount` alone, so the items are at least *there* to scroll back to.
     `openId`, the expanded card, is trivial to store and probably not worth it:
     an accordion left open is not a place you were.
  4. **Filters per household, rather than one set.** Today the record holds one,
     so switching away and back gives you an unfiltered pantry. The trip record
     deliberately does not do this (D41), for a reason that does not transfer —
     a cart is a moment, a filter is a habit, and *Freezer* is plausibly where
     you always are in one household. The cost is a map that grows without
     bound and hands back a filter for a household last opened in April.
  5. **Should a restored filter expire?** The ticks lapse after 24 hours because
     a stale state misleads. A filter set three weeks ago is arguably the same
     problem — the answer D51 leaned on is that row 3 makes it *visible*, which
     the ticks never were. Open question: is visible enough, or does a filter
     older than some window deserve to lapse anyway?
  6. **Is any of it account-level rather than device-level?** D51 says all of it
     is a property of the device, and that is clearly right for the drawer and
     the filters. It is less obviously right for the sort. Anything that should
     follow a person across their phone and their desktop needs a `preferences`
     table or columns on `profiles` — a schema change, and therefore D27 — which
     is the main reason nothing is there today.

- **The storage keys have no migration story, and the validator hides that.**
  `readViewState()` checks every field independently, so *adding* one is free
  and a field that disappears is ignored — both directions degrade to the
  default. What is not covered is a field whose **meaning** changes while its
  name and type stay put. The only tool for that is bumping the `larder.v4.`
  prefix, which silently discards the theme, the household, the trip and the
  view on every device at once. Worth knowing before changing what a field
  means rather than after.

Four were opened by the applied filter bar (D45) and **three were settled the
same day** — see D45 for what was built. One is left:

- **`Showing X of Y` means two different things.** Row 2 says
  rendered-so-far of matching, because it sits above a grid that grows as you
  scroll: at 42 matches it reads `Showing 20 of 42` and becomes `Showing 40 of
  42` without anything being filtered. The design boards — and the bar's
  screen-reader announcement, which follows them — say matching of household:
  `Showing 12 of 20`, where 20 never moves. Both are useful and they are not the
  same sentence. Nothing has decided which one row 2 should say, or whether it
  needs two.

Settled: filtering is **multi-select** (OR inside a group, AND across groups);
the bar **stays visible** with the drawer open; and focus moves to
**`Clear filters`** when a chip is removed.

One was opened on 2026-08-28, by looking at where avatars are drawn, and
**settled the same day** — see [D55](decisions.md#d55-a-members-face-is-a-copy-on-the-membership-and-the-letter-is-not-a-fallback-to-be-ashamed-of)
for what was built. Members have faces now: `memberships.picture`, stamped from
`ctx.auth.picture` at the two moments a row is written and reconciled on load by
`syncAccountAvatar`. It stores a URL and therefore no email, which is what
removed the only real argument against it.

**The mixed row was looked at the same day and is fine** — two faces and a
letter reads as a household, not as a rendering fault. One is left:

- **How stale is too stale?** Your picture reaches the rest of your household on
  *your* next load, not on theirs. The alternative is a write on somebody else's
  read, which is worse — but nothing has watched how long the lag actually is.

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
