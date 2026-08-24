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

**Phase 0 — UI prototype.** A React 19 + Vite + Tailwind v4 app in `src/`, with
`localStorage` persistence, built from `.claude/docs/pantry-tracker-mockup.jsx`.
It exists to settle the interaction design and will be ported into a Spacefast
Zero `client/` and then deleted.

The port has **not** started. See `docs/roadmap.md` for the phases.

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

## Documentation map

Depth lives in `docs/`. Read the relevant one before proposing architecture —
most of it is already decided.

| File | What's in it |
|---|---|
| `docs/overview.md` | What the app is, concept vocabulary, goals, **non-goals** |
| `docs/architecture.md` | Zero's shape, project layout, data flow, auth, constraints |
| `docs/data-model.md` | Schema, indexes, ownership rules, cascade deletes, query surface |
| `docs/roadmap.md` | Phases 0–5 in dependency order, each with a "done when" |
| `docs/decisions.md` | D1–D9, with reasoning and rejected alternatives |
| `docs/notes.md` | Open questions — platform behavior and product |
| `.claude/docs/pantry-tracker-mockup.jsx` | The design reference (see below) |
| `.claude/docs/spacefast.md` | Running feedback log on the platform |

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
  known bug (a stale-closure duplicate guard, fixed in `src/lib/taxonomy.js`
  but not in the mockup), so don't copy from it blindly.

## Code conventions

- **Tabs for indentation** (`.editorconfig`, `indent_style = tab`). This applies
  to JS/JSX/TS as well as everything else.
- Single quotes in JS/TS; semicolons.
- Space after `!` in negations (`if (! name)`) — matches the existing source.
- Comments explain *why*, not *what*. Match the density of the surrounding file.
- Keep components small and props explicit. The existing `src/` split
  (`components/`, `hooks/`, `lib/`, `data/`) is the model to follow.

## Commands

```bash
npm install
npm run dev       # prototype at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the build at http://localhost:4173
```

`file://` will never work — `index.html` references raw JSX that Vite must
transform, and the built `dist/` uses absolute `/assets/` paths. Use the dev
server.

Once the Zero port begins: `sf init`, `sf dev` (port 4173), `sf publish`,
`sf db export`.

## Verifying work

There is no test runner configured. What has been used so far, and works well:

- **`npm run build`** catches syntax and import errors.
- **SSR smoke test** — render `App` with `react-dom/server` after stubbing
  `window.matchMedia` and `window.localStorage`, then assert expected strings
  appear. Catches runtime errors the build can't. Note React inserts `<!-- -->`
  markers between adjacent text nodes, so strip comments before matching.
- **Plain Node unit tests** for pure logic (see the taxonomy CRUD factory in
  `src/lib/taxonomy.js`). Build with `vite build --ssr` into a directory
  *inside* the project so Node can resolve `react`, then run and delete it.

Do not claim something works because it built. **There is no browser available
in this environment**, so anything requiring real interaction — clicks, the
IntersectionObserver infinite scroll, drawer animation, dark mode — is
unverified. Say so plainly rather than implying otherwise.

## Repo hygiene

WordPress-era leftovers were cleared on 2026-08-24. What remains is deliberate:

- **`.gitignore`** is written for this project, not the old plugin. It ignores
  `node_modules`, `dist`, editor dirs, and `.ideas` — plus, pre-emptively,
  `.env*` and `/.spacefast`, both of which will hold credentials once the Zero
  port starts (`.env.server` is synced to the platform on publish; `.spacefast`
  holds the space claim key). `.env.example` is deliberately un-ignored.
  **Do not add `/public`, `/vendor`, or `/packages` back** — `public/` is Vite's
  static-asset directory and must stay tracked.
- **`.gitattributes`** keeps only line-ending normalization and binary
  denotes. The old `export-ignore` block was for building WordPress plugin ZIPs
  with `git archive` and had `docs/` and `CLAUDE.md` in it; the original is at
  `.ideas/plugin-code/.gitattributes.wp-original`.
- **`.phpstorm.meta.php`** moved to `.ideas/plugin-code/`.

Still open:

- The repo has **no commits yet**. Everything is staged or untracked.
- **`LICENSE.md` is GPL-3.0**, inherited from the WordPress plugin convention.
  Worth a deliberate choice for a hosted app rather than a default.
