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

**Phase 1 is done. Phase 2 is next.** This is a real Spacefast Zero project:
`sf.jsonc`, `theme.json`, a Preact + TypeScript client in `client/`, the domain
types and pure helpers in `shared/`, and a capsule in `server/` that declares
**no schema yet** (`capsule({ schema: {} })` compiles fine). Data still lives in
`localStorage`, namespaced per signed-in identity — replacing that is Phase 2.

**It is live at <https://larderlog.view.fast/>** (space slug `larderlog`, team
`justin-team-2`, published 2026-08-24). Gravatar sign-in, sign-out, and the gate
were exercised end to end on that space, and `GET /api/status` returns `ok`, so
the capsule's server half is genuinely deployed.

The React/Vite prototype in `src/` is still on disk and still runs
(`npm run prototype`). It gets deleted in Phase 2, not before — don't remove it
early, and don't edit it: `client/` is the live code.

**Know this about the gate.** `sf dev` has no sign-in flow (`signInPath` and
`signInUrl` are both null), so `auth.isGuest` never goes false locally. The gate
in `client/index.tsx` therefore lets a guest through **on loopback hostnames
only**, and shows a persistent orange "Dev guest · not signed in" badge while it
does — see D14. The bypass is **confirmed inert in production**: the badge does
not appear on the published space, and a signed-out visitor there gets the
sign-in screen. Don't widen it to LAN addresses, and take it out if Spacefast
ever ships a local sign-in stub.

Still true locally: sign-in cannot be exercised on `sf dev`. Anything touching
auth has to be checked against the published space.

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
  known bug (a stale-closure duplicate guard, fixed in `client/lib/taxonomy.ts`
  and in the soon-to-be-deleted `src/lib/taxonomy.js`, but not in the mockup),
  so don't copy from it blindly.

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
npm run prototype    # the old React/Vite prototype on http://localhost:5173
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

For the prototype, `file://` will never work — `index.html` references raw JSX
that Vite must transform. Use the dev server.

## Verifying work

There is no test runner configured. What works, cheapest first:

- **`npm run typecheck`** is the primary check. It covers `client/`, `server/`,
  and `shared/` under `strict`, and it is the only thing that catches the
  mistakes this codebase is prone to — string-encoded numbers used as numbers,
  taxonomy names used where ids belong.
- **`sf dev`** compiles the capsule for real. A clean start plus `GET /` and
  `GET /api/status` proves the client and server entries both resolve.
- **Curl the compiled assets** to confirm styling actually shipped. Because Zero
  finds Tailwind classes by scanning source for static strings, "it typechecks"
  says nothing about whether a class exists. Fetch `/zero.css` (see the
  bootstrap dance above) and grep for the class. The file escapes **both
  brackets and colons**: `max-h-[80vh]` appears as `max-h-\[80vh\]`, and
  `md:grid-cols-[190px_1fr]` as `.md\:grid-cols-\[190px_1fr\]`. Grepping the
  half-escaped form returns nothing and looks exactly like a missing class —
  search for a distinctive substring (`190px`) when in doubt.
- **Curl the published space** for anything auth-related; it needs no bootstrap
  token. `https://larderlog.view.fast/api/status` returning `ok` is the cheapest
  proof that the server half of a publish actually landed.
- **Plain Node unit tests** for pure logic. `shared/` has no dependencies at
  all, so `shared/qty.ts` and `shared/status.ts` can be checked by compiling
  them with `tsc` and running the output directly.

Do not claim something works because it compiled. Two hard limits:

- **There is no browser in this environment**, so clicks, the
  IntersectionObserver infinite scroll, drawer animation, and dark mode are
  still unverified. Justin has to check those.
- **There is no sign-in on `sf dev`.** D14's loopback bypass makes the app
  reachable locally, but it sidesteps authentication rather than exercising it.
  Auth was verified once, on the published space (2026-08-24) — so anything that
  touches `useAuth()`, `signOut()`, or the gate has to be re-checked there, not
  locally.

Say both plainly rather than implying otherwise.

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
  **Do not add `/public`, `/vendor`, or `/packages` back** — `public/` is Vite's
  static-asset directory and must stay tracked.
- **`.gitattributes`** keeps only line-ending normalization and binary
  denotes. The old `export-ignore` block was for building WordPress plugin ZIPs
  with `git archive` and had `docs/` and `CLAUDE.md` in it; the original is at
  `.ideas/plugin-code/.gitattributes.wp-original`.
- **`.phpstorm.meta.php`** moved to `.ideas/plugin-code/`.

Still open:

- Git history starts at `c6e8901` "Phase 0." — the Vite prototype plus all
  project docs. Branch is `master`.
- **`LICENSE.md` is GPL-3.0**, inherited from the WordPress plugin convention.
  Worth a deliberate choice for a hosted app rather than a default.
