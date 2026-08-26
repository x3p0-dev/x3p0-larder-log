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

**Phase 3 is built. Phase 4 is largely built too. Neither can be published
right now — see the blocker below.** A real Spacefast Zero project: `sf.jsonc`,
`theme.json`, a Preact + TypeScript client in `client/`, pure domain logic in
`shared/`, and a capsule in `server/` holding the full schema from
`.docs/data-model.md`, two live queries, and sixteen mutations. The schema is
declared inline in `server/index.ts` and **has to be** — see
[D27](../.docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry)
before editing it.

Data lives in the database. **Two** `localStorage` call sites remain, both
correct: the per-device theme override (D25) and which household this device is
pointed at (D33). Same reasoning for both — a dark-mode choice on a phone should
not follow you to a desktop, and neither should which pantry you were last
looking at.

**A user may belong to several households** as of 2026-08-25
([D33](../.docs/decisions.md#d33-a-user-may-belong-to-several-households),
which supersedes D18). Every query and scoped mutation names a household, and
the id is a **selector, never an authority** — handlers resolve it against the
caller's own memberships. Reads heal (`selectMembership` falls back to a
deterministic default when the requested household is not yours), writes refuse
(`findMembership` matches exactly or throws). Roles are per household: the same
person can be an owner in one pantry and a viewer in another. It needed **no
migration** — D3 built the schema for this.

The React/Vite prototype in `src/` is **deleted**, along with `index.html`,
`vite.config.js`, and the react/vite/tailwind dependencies. Zero compiles
Tailwind itself. There is no `npm run prototype` any more.

Phase 3 added the client half of households, members, and invites — the six
server handlers had shipped with Phase 2. Invite links are `/?join=<code>`
rather than `/join/<code>`, because the published space serves nothing at an
unknown path and `sf publish --dry-run` prints `SPA false`
([D28](../.docs/decisions.md#d28-an-invite-link-is-joincode-not-joincode)).
The project's own docs are no longer in the publish payload: `docs/` is `.docs/`
and this file is `.claude/CLAUDE.md`, both behind the serving layer's 403 on
dot-prefixed paths
([D29](../.docs/decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload)).
**None of Phase 3 has been exercised by a second person** — that needs the
published space. The same is now true of D33: one identity in two households is
verified server-side, but two *people* sharing one household is not.

Phase 4's read-only pass landed on 2026-08-25: every write affordance is gated
on `can()` and is **absent rather than disabled**, with one "View only" chip
explaining it ([D30](../.docs/decisions.md#d30-a-viewers-missing-controls-are-absent-not-disabled),
which amends D20). Verified locally against the real code path — `sf dev` makes
you an owner, so a throwaway endpoint rewrote the caller's own role, and it has
been removed. The rest of Phase 4 was already built and the roadmap now says so.

### The Cellar reskin (Phase 4.5) is built, and is the bulk of the current diff

Everything structural in `.claude/docs/design/ui-directions.md` is implemented,
the household switcher included — it was the last one deferred, and D33 settled
the decision it was waiting on. What landed on 2026-08-25:

- **Tokens.** `theme.json` carries the warm-brown palette and an 8-step type
  scale as `light-dark()` pairs. Term colors became *tokens* rather than hexes
  ([D32](../.docs/decisions.md#d32-a-term-stores-a-color-token-not-a-color));
  `shared/palette.ts` says which exist, `client/lib/palette.ts` says what they
  look like.
- **Both themes.** Light and dark come from the same table, including a full
  dark quad for all sixteen term colors.
- **New surfaces.** Item card, the dark left drawer (docked / slide-over /
  68px collapsed rail with flyouts), the Filter and Settings panes, the item
  sheet for add *and* edit, the sort menu, and the contextual shopping list.
- **Interaction states** live in `client/lib/controlStyles.ts` as literal class
  strings — `DRAWER_*` and `PAGE_*`. Inline styles cannot express `:hover`,
  which is why the drawer shipped once with no feedback at all.
- **Nine components were replaced and deleted**: `Sidebar`, `FacetSection`,
  `SettingsDrawer`, `TaxonomyManager`, `ItemFields`, `ChipPicker`,
  `IconPicker`, plus the `createTermFor` adapter.
- **The household switcher is built** (2026-08-25) — the drawer's household row
  and the rail's household flyout both open it: every household you belong to
  with your role and item count, a check on the current one, then *New
  household* and *Join with a link*. `HouseholdSwitcher` is the contents; each
  host owns its own dismissal.
- **Term icons were cut** and the `icon` column kept, holding `''`
  ([D34](../.docs/decisions.md#d34-term-icons-are-cut-and-the-column-is-kept)).
  `shared/icons.ts` and `client/lib/icons.ts` are gone. Do not "clean up" the
  column: dropping it needs `sf db migrate --drop`, refilling it is additive.

**Nothing here has been seen by a second person, or published** — see the
blocker below. Ten `font-mono` sites remain, on the surfaces not yet redrawn:
the sign-in gate, `JoinBox`, `ShoppingListModal`, and two loading strings.

### Destructive actions (Phase 4.6) are built — 2026-08-26

The spec's *Destructive actions* section, governed by
[D36](../.docs/decisions.md#d36-undo-what-comes-back-confirm-what-doesnt):
**undo what comes back, confirm what doesn't**. Two components replace the three
idioms that were there before.

- **`Toast.tsx` / `useToasts.ts`** — actionable (6s, Undo, dismiss) and plain
  (3.5s, no controls); the drawer surface in both themes; a timer bar that
  pauses on hover and focus; max 3 stacked; Cmd/Ctrl+Z from anywhere. Each row
  owns its own countdown, so hovering one pauses only that one. `UndoToast` is
  deleted.
- **`ConfirmDialog.tsx`** — one shell for confirm, blocked, and the app's only
  typed confirmation. **Crimson is never a button**: the primary is the ordinary
  ink/cream fill, and crimson appears once as the icon tint.
- **Every term kind now blocks while in use**, widening D16 from locations
  alone. `termBlock` in `shared/term.ts` is one rule the server throws and the
  client renders — do not write that sentence twice. The trash on an editing row
  is **live in every case and neutral, never disabled** (a disabled control
  cannot explain itself), with the item count beside it.
- **Leave household** moved to the foot of the Household section and relabels to
  *Delete household* for the last member. `deleteHousehold` finally has a client
  caller.
- ***Recently added* sorts on `createdAt`** (D35). It previously applied no sort
  at all, so it rendered oldest-first — the opposite of its label.

`theme.json` gained `focus-dark` and `drawer-danger`. **`theme.json` is strict
JSON — no comments**, unlike `sf.jsonc`; a `//` line stops `sf dev` from
starting at all.

**Verified without a browser** (there isn't one): the capsule compiles and
reloads, every new utility class and both tokens are in `/zero.css`, the term
counts and refusal sentence were exercised through a throwaway endpoint, and the
artifact still shows nine tables, sixteen mutations, **zero migrations**.
**Nobody has clicked any of it.**

Phase 4's typography question is also closed, in the opposite direction from
the one the notes predicted. Zero has no webfont mechanism — `theme.json`'s
`fontFace` is discarded silently — but the `--font-disp` / `--font-sans` /
`--font-mono` tokens it emits are already complete stacks, so the only missing
piece is a stylesheet. `client/lib/fonts.ts` appends a Google Fonts `<link>`
for Playfair Display and Karla at boot (plus IBM Plex Mono, interim — the
Cellar spec has no monospace, but ten `font-mono` sites still reference one)
([D31](../.docs/decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google)).
The Cellar reskin's token layer is in for **both** themes — see Phase 4.5 in
the roadmap. Layout is untouched: the drawer, item card, and add-item sheet are
still the pre-Cellar components, so the app currently reads as the same
interface in a new palette.
The family names there must keep matching the `theme.json` literals exactly —
that is the entire contract between the two files. `client/lib/appIcon.ts` does
the same trick for the page title, favicons and `theme-color`: the generated
shell exposes only a title, and `sf dev` hardcodes even that, so all of it is
appended to `document.head` at boot. The icons are inlined as data URIs
because `sf dev` serves no project static files. Self-hosting was built first
and rejected: `sf dev` serves no project static files, so a self-hosted face is
invisible locally and appears only after a publish. **Confirmed rendering under
`sf dev` on 2026-08-25** — the whole reason for choosing a remote URL was that
this check is possible at all.

### Publishing is blocked, and it is not our bug

**Do not attempt a publish before re-reading this.** As of 2026-08-25:

1. The API now rejects publishes from agent-attributed credentials unless they
   carry an `x-spacefast-rationale` header. **npm's `spacefast@0.0.26` cannot
   send it** — no flag, no env var.
2. The CLI that can is **0.0.27, released to the binary channel only**
   (`install.sh` / GitHub releases). npm is still on 0.0.26.
3. That standalone 0.0.27 binary **cannot compile a Zero capsule**: it resolves
   esbuild's native helper and `@spacefast/zero/client` relative to its own Bun
   virtual filesystem. `ESBUILD_BINARY_PATH` gets past the first, nothing gets
   past the second.
4. The one run that reached the platform (0.0.26 with the header injected)
   created a version, uploaded, then **failed at `finalize` with
   `runtime_api_not_found`** — the same stage that broke on 2026-08-24.

Net: **v2 is still live**, v3 is recorded `status=failed`, and the space is
healthy (`Status: active`). The way out is npm shipping 0.0.27, or Spacefast
fixing finalize. The full write-up, with exact errors and version ids, is in
[`.claude/docs/spacefast.md`](docs/spacefast.md) — Justin intends to send it.

**Phase 2 is live at <https://larderlog.view.fast/>** as v2 (space slug
`larderlog`, team `justin-team-2`), published 2026-08-24. The first real
migration ran with it: all nine tables exist and are empty. Verify a publish
with `GET /api/status` and `sf db dump --table <name>`; ignore `sf db`'s
"Pending operations" count, which shows the artifact's full plan rather than a
diff against live state.

### Two auth bypasses, and they are not equally safe

`sf dev` ships no sign-in flow (`signInPath` and `signInUrl` are both null), so
`auth.isGuest` never goes false locally. Two separate holes exist because of it:

1. **The client gate** (`client/index.tsx`) lets a guest through on loopback
   hostnames only — D14. **Confirmed inert in production**: a signed-out
   visitor on the published space gets the sign-in screen. The orange
   "Dev guest · not signed in" chip that used to mark this was removed on
   2026-08-25; the drawer's Account section names the dev guest instead, which
   is where someone looks to find out who they are. If that ever stops being
   true, put a marker back.
2. **The server** (`shared/identity.ts`) accepts the exact identity `sf dev`
   issues — `guest:local` / `Local` / `guest` / not authenticated, all four
   matched. That value comes from `zeroGuestAuth()` in the `spacefast` CLI, so
   it should never appear on a hosted runtime. **This one is still NOT
   verified** — v2 shipped on 2026-08-24 and the check needs a real sign-in,
   which nobody has done yet. Until then, treat it as the weaker hole. If a
   published space ever issued `guest:local`, every anonymous visitor would
   share one household. **How to close it:** sign in on the published space,
   create the household, then `npx sf db dump --table memberships` and read the
   `userId`. A Gravatar identity clears it; `guest:local` is an emergency.

Don't widen either one, and take both out if Spacefast ships a local sign-in
stub.

**`sf dev` issues one fixed identity**, so a second local tab is the same user.
That is enough to watch a mutation propagate; it is not enough to test two
members of a household. Anything touching sign-in, invites, or roles has to be
checked against the published space.

See `.docs/roadmap.md` for the phases.

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

A plain `curl` works — **the 403 to programmatic fetches was fixed on
2026-08-25**, so the browser User-Agent this file used to insist on is no longer
needed:

```bash
curl -sL https://spacefast.com/docs/zero.md
```

Every docs page has a `.md` twin at the same path. Prefer it over the HTML. If a
page ever 403s again, a desktop browser User-Agent was the old workaround.

**But read `.claude/docs/zero-agent-rules.md` first.** It is the `AGENTS.md`
that `sf init --runtime zero` scaffolds, and it is denser and more accurate than
the public docs — it is the only place that documents the static-class-names
rule, the semantic token vocabulary, the server's import restrictions, and the
fact that platform modules don't count against the client bundle budget.

## Documentation map

Depth lives in `.docs/`. Read the relevant one before proposing architecture —
most of it is already decided.

| File | What's in it |
|---|---|
| `.docs/overview.md` | What the app is, concept vocabulary, goals, **non-goals** |
| `.docs/architecture.md` | Zero's shape, project layout, data flow, auth, constraints |
| `.docs/data-model.md` | Schema, indexes, ownership rules, cascade deletes, query surface |
| `.docs/roadmap.md` | Phases 0–5 in dependency order, each with a "done when" |
| `.docs/decisions.md` | D1–D36, with reasoning and rejected alternatives. **D27 governs every schema edit**; **D32 governs term colors**; **D35 governs row timestamps**; **D36 governs destructive actions** |
| `.docs/notes.md` | Open platform questions, and what the v2 publish and Phase 3 answered |
| `.claude/docs/design/ui-directions.md` | **The current design spec** (Aug 2026, "Cellar") — palette, type, structure |
| `.claude/docs/design/larderlogdesigns-4.html` | The rendered final mockup that spec describes |
| `.claude/docs/pantry-tracker-mockup.jsx` | The **superseded** design reference (see below) |
| `.claude/docs/spacefast.md` | Running feedback log on the platform |
| `.claude/docs/zero-agent-rules.md` | Zero's own `AGENTS.md`, verbatim — the best runtime reference |

**Keep these current.** When a decision gets made, add it to `.docs/decisions.md`
and remove the corresponding entry from `.docs/notes.md`. When a phase completes,
update `.docs/roadmap.md` and the status section here.

## Standing instructions

- **Ignore `/.ideas/`.** Abandoned WordPress prototyping. It is gitignored and
  untracked; do not read it for conventions, extend it, or cite it.
- **Append to `.claude/docs/spacefast.md`** after any notable interaction with
  Spacefast — docs, CLI, `sf dev`, publishing, migrations. Dated entries tagged
  good / friction / unclear / bug. Justin intends to send this feedback to the
  Spacefast team, so record concrete detail: exact errors, HTTP codes, what was
  tried. Do this as you go, not at the end.
- **The design spec is `.claude/docs/design/ui-directions.md`.** It supersedes
  `pantry-tracker-mockup.jsx`, which describes the pre-Cellar interface and is
  now history. `larderlogdesigns-4.html` is the rendered final design; page 2 of
  the linked canvas holds three rejected explorations — **ignore those**. Where
  the spec and the HTML disagree, the HTML wins; they were checked against each
  other and currently agree.
- **The old mockup is a design reference, not source.** `pantry-tracker-mockup.jsx`
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

- **`npm test`** — 129 assertions over `shared/`, compiled with the project's
  `tsc` and run on plain Node. No runner, no dependencies. It covers the things
  that are invisible when wrong: the D20 capability matrix, D18's
  one-household rule, D22's last-owner guard, invite expiry boundaries, D28's
  invite-link parsing, and the dev-guest bypass in `shared/identity.ts`. **Add
  to it** when you touch any of those — that file is the app's only
  authorization test.
- **`npm run typecheck`** — `strict` over `client/`, `server/`, `shared/`. Still
  the fastest way to catch string-encoded numbers used as numbers.
  **It will not catch a term id rendered where a name belongs** — both are
  `string`. That bug shipped once already; see `.docs/notes.md`.
- **`npx sf publish --dry-run`, then read `.spacefast/zero/artifact.json`** —
  the only way to see what a publish would actually install: the schema,
  queries, mutations, endpoints, and migrations. **Mandatory after any schema
  edit.** The capsule compiler finds tables by regex over `server/index.ts`
  alone, so a table can vanish from the artifact while typechecking perfectly
  ([D27](../.docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry)).
  Note that `--dry-run` is not read-only: it rewrites the build under
  `.spacefast/zero/`.
- **`sf dev`** compiles the capsule for real. A clean start plus `GET /` and
  `GET /api/status` proves the client and server entries both resolve.
- **An unused `theme.json` token is pruned from `zero.css`, and that looks
  exactly like a rejected one.** The compiler reads every palette and
  `fontSizes` entry, but Tailwind emits a `--color-*` / `--text-*` var only
  once a class actually uses it — so `bg-drawer` compiles to nothing until
  something references it, and grepping for the var proves nothing either way.
  To check a token was *read*, run the compiler's own reader instead:

  ```bash
  node --input-type=module -e "
  import { zeroThemeSettingsFromThemeJson } from './node_modules/@spacefast/zero-compile/dist/tailwind-core.js';
  import { readFileSync } from 'fs';
  console.log(zeroThemeSettingsFromThemeJson(JSON.parse(readFileSync('theme.json','utf8'))));"
  ```
- **Curl the compiled assets** to confirm styling shipped. Zero finds Tailwind
  classes by scanning source for static strings, so "it typechecks" says nothing
  about whether a class exists. Fetch `/zero.css` (see the bootstrap dance
  above) and grep. The file escapes **both brackets and colons**: `max-h-[80vh]`
  appears as `max-h-\[80vh\]` and `md:grid-cols-[190px_1fr]` as
  `.md\:grid-cols-\[190px_1fr\]`. Grepping the half-escaped form returns
  nothing and looks exactly like a missing class — search for a distinctive
  substring (`190px`) when in doubt. **Use `grep -F`**: the escaped form
  contains a literal backslash, so `grep 'z-\[55\]'` reads it as a regex for
  `z-[55]` and matches nothing, which looks identical to the class being
  absent. This trap has now caught us twice.
- **Curl the published space** for anything auth-related; it needs no bootstrap
  token. `https://larderlog.view.fast/api/status` returning `ok` is the cheapest
  proof that a publish's server half landed.
- **`sf dev` does not serve the publish payload**, so it cannot verify a static
  asset. It returns the SPA shell — `200 text/html`, 1829 bytes — for every
  unrecognized path, including `/fonts/*.woff2` and `/LICENSE.md`, the latter
  of which demonstrably *does* serve in production. Only `/`, `/zero.css`, and
  `/client.js` are real locally. This is the exact inverse of D28's routing
  asymmetry, and both times the local answer is the misleading one. To check
  what would actually ship, read `.spacefast/zero/public/` after a dry run
  rather than curling `sf dev`.

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

- **The project's documentation is dot-prefixed on purpose.** `sf publish`
  mirrors the project root into the upload and does not honor `.gitignore`, but
  the serving layer refuses dot-prefixed paths with 403. That is why the docs
  live in `.docs/` and these instructions live in `.claude/CLAUDE.md` — one of
  Claude Code's two project-instruction locations, so nothing is lost. **Do not
  move either back to the root**; see
  [D29](../.docs/decisions.md#d29-the-projects-own-documentation-is-kept-out-of-the-publish-payload).
  Markdown links in this file are relative to `.claude/`, hence the `../.docs/`.
- **`.gitignore`** is written for this project, not the old plugin. It ignores
  `node_modules`, `dist`, editor dirs, and `.ideas` — plus, pre-emptively,
  `.env*` and `/.spacefast`, both of which hold credentials (`.env.server` is
  synced to the platform on publish and still does not exist; `.spacefast` holds
  the space id and claim key and **does** exist now — publishing created it, and
  it also carries the build output the publish uploads). `.env.example` is
  deliberately un-ignored.
  (The old warning about not re-adding `/public` was a Vite concern; Vite is
  gone and no `public/` directory exists. Nothing to preserve there now.)
- **`.gitattributes`** keeps only line-ending normalization and binary
  denotes. The old `export-ignore` block was for building WordPress plugin ZIPs
  with `git archive` and had `.docs/` and `CLAUDE.md` in it; the original is at
  `.ideas/plugin-code/.gitattributes.wp-original`.
- **`.phpstorm.meta.php`** moved to `.ideas/plugin-code/`.

Still open:

- Git history starts at `c6e8901` "Phase 0." — the Vite prototype plus all
  project docs. The prototype itself was deleted in Phase 2; it is still in
  history if it is ever needed. Branch is `master`.
- **`LICENSE.md` is GPL-3.0**, inherited from the WordPress plugin convention.
  Worth a deliberate choice for a hosted app rather than a default.
