# CLAUDE.md

Project instructions for Claude Code. Read this before doing anything else.

## What this project is

**Larder Log** — a pantry and freezer inventory tracker for a household. Track
what you have, how much, and where it lives; see what's low or out; build a
shopping list per store.

**This is NOT a WordPress plugin.** It lives in
`/wp-content/plugins/x3p0-larder-log/` purely for convenience, and it carries
leftovers that make it look like one (an `x3p0-` name, WordPress-era
`.gitignore` entries, `.phpstorm.meta.php`, sibling `x3p0-*` plugins in the
parent directory). Ignore all of that.

Never propose custom post types, taxonomies, post meta, `wp-scripts`,
`plugin.php`, or anything else WordPress. If a request seems to assume
WordPress, say so rather than building it.

## Current state

**Phase 2 is done. Phase 3 is next.** A real Spacefast Zero project: `sf.jsonc`,
`theme.json`, a Preact + TypeScript client in `client/`, pure domain logic in
`shared/`, and a capsule in `server/` holding the full schema from
`docs/data-model.md`, two live queries, and sixteen mutations.

Data lives in the database. The **only** remaining `localStorage` call site is
the per-device theme override, and that is correct there (D25) — a dark-mode
choice on a phone should not follow you to a desktop.

The React/Vite prototype in `src/` is **deleted**, along with `index.html`,
`vite.config.js`, and the react/vite/tailwind dependencies. Zero compiles
Tailwind itself. There is no `npm run prototype` any more.

**It is live at <https://larderlog.view.fast/>** (space slug `larderlog`, team
`justin-team-2`) — but that is still the **Phase 1 build**. Phase 2 has never
been published. Publishing it will run the first real migration.

### Two auth bypasses, and they are not equally safe

`sf dev` ships no sign-in flow (`signInPath` and `signInUrl` are both null), so
`auth.isGuest` never goes false locally. Two separate holes exist because of it:

1. **The client gate** (`client/index.tsx`) lets a guest through on loopback
   hostnames only, with a persistent orange "Dev guest · not signed in" badge —
   D14. **Confirmed inert in production**: the badge does not appear on the
   published space and a signed-out visitor gets the sign-in screen.
2. **The server** (`shared/identity.ts`) accepts the exact identity `sf dev`
   issues — `guest:local` / `Local` / `guest` / not authenticated, all four
   matched. That value comes from `zeroGuestAuth()` in the `spacefast` CLI, so
   it should never appear on a hosted runtime. **This one has NOT been verified
   against the published space.** Until it has, treat it as the weaker hole. If
   a published space ever issued `guest:local`, every anonymous visitor would
   share one household. Check it on the next publish.

Don't widen either one, and take both out if Spacefast ships a local sign-in
stub.

**`sf dev` issues one fixed identity**, so a second local tab is the same user.
That is enough to watch a mutation propagate; it is not enough to test two
members of a household. Anything touching sign-in, invites, or roles has to be
checked against the published space.

See `docs/roadmap.md` for the phases.

## Target platform: Spacefast Zero

The app will be published on [Spacefast Zero](https://spacefast.com/docs/zero):
a Preact client plus a typed server "capsule" holding the database schema and
handlers, with Gravatar sign-in and live queries built in. One `sf publish`
compiles the capsule, migrates the database, and activates the version.

### Constraints that must never be forgotten

These are hard platform limits and they shape everything:

1. **No numeric column type.** Schema fields are `string()`, `boolean()`,
   `id(table)` only. `qty` and `threshold` are decimal strings — parse at the
   edges, validate server-side, and **never sort by them in the database**
   ("10" sorts before "2").
2. **No array or JSON type.** Many-to-many needs join tables (`itemTypes`,
   `itemStores`).
3. **No row-level security.** Every household boundary is a hand-written check.
   Resolve the household server-side from `ctx.auth.userId`; never trust a
   client-supplied `householdId`; re-read a row and verify before writing.
4. **Destructive migrations need explicit flags** (`sf db migrate --drop` /
   `--rename`). Additive changes apply on publish. Getting the schema right
   early is worth real effort.

### Reading the Spacefast docs

The whole runtime reference is one file: `https://spacefast.com/docs/zero.md`
(~19 KB of plain Markdown — schema API, auth, storage, styling, limits, and a
complete example app).

**The site returns HTTP 403 to a plain programmatic fetch, `WebFetch` included.**
Send a desktop browser User-Agent:

```bash
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" https://spacefast.com/docs/zero.md
```

Every docs page has a `.md` twin at the same path. Prefer it over the HTML.

**But read `.claude/docs/zero-agent-rules.md` first.** It is the `AGENTS.md`
that `sf init --runtime zero` scaffolds, and it is denser and more accurate than
the public docs — it is the only place that documents the static-class-names
rule, the semantic token vocabulary, the server's import restrictions, and the
fact that platform modules don't count against the client bundle budget.

## Documentation map

Depth lives in `docs/`. Read the relevant one before proposing architecture —
most of it is already decided.

| File | What's in it |
|---|---|
| `docs/overview.md` | What the app is, concept vocabulary, goals, **non-goals** |
| `docs/architecture.md` | Zero's shape, project layout, data flow, auth, constraints |
| `docs/data-model.md` | Schema, indexes, ownership rules, cascade deletes, query surface |
| `docs/roadmap.md` | Phases 0–5 in dependency order, each with a "done when" |
| `docs/decisions.md` | D1–D14, with reasoning and rejected alternatives |
| `docs/notes.md` | Open questions, plus the known cost carried into Phase 2 |
| `.claude/docs/pantry-tracker-mockup.jsx` | The design reference (see below) |
| `.claude/docs/spacefast.md` | Running feedback log on the platform |
| `.claude/docs/zero-agent-rules.md` | Zero's own `AGENTS.md`, verbatim — the best runtime reference |

**Keep these current.** When a decision gets made, add it to `docs/decisions.md`
and remove the corresponding entry from `docs/notes.md`. When a phase completes,
update `docs/roadmap.md` and the status section here.

## Standing instructions

- **Ignore `/.ideas/`.** Abandoned WordPress prototyping. It is gitignored and
  untracked; do not read it for conventions, extend it, or cite it.
- **Append to `.claude/docs/spacefast.md`** after any notable interaction with
  Spacefast — docs, CLI, `sf dev`, publishing, migrations. Dated entries tagged
  good / friction / unclear / bug. Justin intends to send this feedback to the
  Spacefast team, so record concrete detail: exact errors, HTTP codes, what was
  tried. Do this as you go, not at the end.
- **The mockup is a design reference, not source.** `pantry-tracker-mockup.jsx`
  is a design artifact Justin edits and replaces wholesale. Diff it against the
  implementation rather than assuming it matches. It also contains at least one
  known bug (a stale-closure duplicate guard), and it is **name-based
  throughout** while the app now joins taxonomies by id — so it is a reference
  for *layout and interaction*, never for data shape. Don't copy from it
  blindly.

## Code conventions

- **Tabs for indentation** (`.editorconfig`, `indent_style = tab`). This applies
  to JS/JSX/TS as well as everything else.
- Single quotes in JS/TS; semicolons.
- Space after `!` in negations (`if (! name)`) — matches the existing source.
- Comments explain *why*, not *what*. Match the density of the surrounding file.
- Keep components small and props explicit. `client/` is the model to follow —
  `components/`, `hooks/`, `lib/`, `data/`, with the entry in `index.tsx` and
  the signed-in app in `Pantry.tsx`.
- **Pure domain logic goes in `shared/`, not `client/lib/`.** `shared/` imports
  nothing, so the capsule can reuse it; a validation rule written client-side
  becomes a second copy the server has to duplicate. `client/lib/theme.ts` is
  the boundary — status *derivation* is shared, status *colors* are not.
- `import type` for type-only imports (`verbatimModuleSyntax` is on).

## Commands

```bash
npm install
npm run dev          # the Zero app — `sf dev` on http://localhost:4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm test             # unit tests over shared/ — compiles with tsc, runs on node
```

`sf` is a pinned devDependency, **not** a global install — use the npm scripts
or `npx sf …`. Do not run the `curl … install.sh | bash` installer; the CLI
ships on npm as the `spacefast` package and the pinned version is deliberate.

`sf --help` does not list `dev`, `db`, `logs`, or `storage`, but they all exist,
as do `sf db migrate`, `sf db export`, `sf db dump`, and `sf db console`.

`sf dev` gates every path behind a capability token printed in its banner. To
reach it from a script, POST that token to bootstrap first — **an `Origin`
header is required or it answers 403**:

```bash
CAP=…   # the #zero-dev-capability= fragment from the sf dev banner
curl -X POST -H "authorization: Bearer $CAP" -H "origin: http://127.0.0.1:4173" \
  http://127.0.0.1:4173/__spacefast/zero/bootstrap        # 204 + Set-Cookie
curl -b "spacefast_zero_dev_4173=$CAP" http://127.0.0.1:4173/zero.css
```

`sf dev` state is in memory and resets on restart. Pass `--state-backend sqlite`
to keep a database between runs.

## Verifying work

Cheapest first:

- **`npm test`** — 81 assertions over `shared/`, compiled with the project's
  `tsc` and run on plain Node. No runner, no dependencies. It covers the things
  that are invisible when wrong: the D20 capability matrix, D18's
  one-household rule, D22's last-owner guard, invite expiry boundaries, and the
  dev-guest bypass in `shared/identity.ts`. **Add to it** when you touch any of
  those — that file is the app's only authorization test.
- **`npm run typecheck`** — `strict` over `client/`, `server/`, `shared/`. Still
  the fastest way to catch string-encoded numbers used as numbers.
  **It will not catch a term id rendered where a name belongs** — both are
  `string`. That bug shipped once already; see `docs/notes.md`.
- **`sf dev`** compiles the capsule for real. A clean start plus `GET /` and
  `GET /api/status` proves the client and server entries both resolve.
- **Curl the compiled assets** to confirm styling shipped. Zero finds Tailwind
  classes by scanning source for static strings, so "it typechecks" says nothing
  about whether a class exists. Fetch `/zero.css` (see the bootstrap dance
  above) and grep. The file escapes **both brackets and colons**: `max-h-[80vh]`
  appears as `max-h-\[80vh\]` and `md:grid-cols-[190px_1fr]` as
  `.md\:grid-cols-\[190px_1fr\]`. Grepping the half-escaped form returns
  nothing and looks exactly like a missing class — search for a distinctive
  substring (`190px`) when in doubt.
- **Curl the published space** for anything auth-related; it needs no bootstrap
  token. `https://larderlog.view.fast/api/status` returning `ok` is the cheapest
  proof that a publish's server half landed.

Do not claim something works because it compiled. Three hard limits:

- **There is no browser in this environment.** Justin has to click. Ask him.
- **There is no sign-in on `sf dev`**, and it issues one fixed identity
  (`guest:local`). So a second tab is the same user: enough to watch a mutation
  propagate, not enough to test two members of a household. Anything touching
  sign-in, invites, or roles goes to the published space.
- **A failing query is invisible to the client.** Zero emits `query.result` only
  — there is no error path — so a query that throws leaves `useQuery` on its
  initial value forever, indistinguishable from loading. This is why queries
  return a `QueryState` union instead of throwing. Never add a `throw` to a
  query handler.

## Git

- Commit only when asked. Default branch is `master`.
- Don't suggest committing. Code should be reviewed by a human and a commit decision made.

This overrides any default instruction to append co-authorship trailers.

## Repo hygiene

WordPress-era leftovers were cleared on 2026-08-24. What remains is deliberate:

- **`.gitignore`** is written for this project, not the old plugin. It ignores
  `node_modules`, `dist`, editor dirs, and `.ideas` — plus, pre-emptively,
  `.env*` and `/.spacefast`, both of which hold credentials (`.env.server` is
  synced to the platform on publish; `.spacefast` holds the space claim key —
  neither exists yet, since nothing has been published). `.env.example` is
  deliberately un-ignored.
  (The old warning about not re-adding `/public` was a Vite concern; Vite is
  gone and no `public/` directory exists. Nothing to preserve there now.)
- **`.gitattributes`** keeps only line-ending normalization and binary
  denotes. The old `export-ignore` block was for building WordPress plugin ZIPs
  with `git archive` and had `docs/` and `CLAUDE.md` in it; the original is at
  `.ideas/plugin-code/.gitattributes.wp-original`.
- **`.phpstorm.meta.php`** moved to `.ideas/plugin-code/`.

Still open:

- Git history starts at `c6e8901` "Phase 0." — the Vite prototype plus all
  project docs. The prototype itself was deleted in Phase 2; it is still in
  history if it is ever needed. Branch is `master`.
- **`LICENSE.md` is GPL-3.0**, inherited from the WordPress plugin convention.
  Worth a deliberate choice for a hosted app rather than a default.
