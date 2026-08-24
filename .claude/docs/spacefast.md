# Spacefast: working notes

A running log of building Larder Log on Spacefast — what worked, what didn't,
and what we'd tell the Spacefast team. Append as we go; keep entries dated so
the feedback stays attributable to a point in time.

**Format:** newest section at the bottom. Tag entries 👍 good / 👎 friction /
❓ unclear / 🐛 bug.

---

## 2026-08-24 — First contact: reading the docs

Context: evaluating Spacefast as the target platform before writing any project
docs. Had not yet installed the CLI or created a space.

### 👎 The docs are unreadable to an agent over plain HTTP

`https://spacefast.com/docs` and `https://spacefast.com/` both return **HTTP 403**
to a normal programmatic fetch. So does `/setup.md` — the page whose entire
stated purpose is "an agent that fetches spacefast.com/setup.md learns the whole
publish flow from one page of plain text."

The block appears to be user-agent based: sending a desktop Chrome UA via `curl`
returns the content immediately. So the first thing an AI agent is told to do is
the thing the edge blocks by default, unless the agent thinks to impersonate a
browser.

This is worth flagging loudly, because it's self-defeating for a product whose
positioning is "where AI-made web things go to live." I found the platform's
capabilities only after working around its own bot protection.

**What we'd suggest:** allowlist `*.md` paths, `/setup.md`, and `/ai.txt` for
any user agent, or serve them from a subdomain that isn't behind the challenge.

### 👍 The `.md` mirror of every docs page is excellent

Once past the 403, every docs page has a plain-Markdown twin
(`/docs/zero.md`, `/docs/index.md`), advertised via
`<link rel="alternate" type="text/markdown">`. `zero.md` is ~19 KB and contains
the *entire* runtime reference — schema API, auth, storage, styling, limits,
a complete two-file example app.

This is the single best docs-for-agents decision on the site. One fetch, no
crawling, no JS rendering, no pagination. More platforms should do this.

### 👍 The runtime is genuinely well-scoped for this app

Zero gives us a database, sign-in, live queries, and storage in one publish
command. For a two-person household app, not having to stand up Postgres +
an auth provider + a sync layer is the whole value proposition. The
`useQuery()`-re-renders-on-any-mutation model means "my wife and I both editing
at once" is free rather than a feature.

### 👎 No numeric column type

Schema fields are `string()`, `boolean()`, `id(table)`. That's it.

For an *inventory* app this lands directly on the primary field: quantity. We
now store `qty` and `threshold` as decimal strings, parse at every boundary,
validate integer-ness server-side, and can't sort by quantity in the database
at all (string ordering puts "10" before "2"), so quantity sorting has to happen
client-side after parsing.

None of that is fatal, but it's a papercut on every single read and write of the
app's most important number. An `int()` type — or even documented guidance on
the intended encoding — would remove a whole category of bugs.

### 👎 No array or JSON field type

Items have many types and many stores. With no array type, that's two join
tables (`itemTypes`, `itemStores`), which turns "read an item" into a join and
"save an item" into a reconcile. Reasonable relational modeling, but it's a real
step up in complexity from the prototype's `types: string[]`.

### 👎 No row-level security

Ownership is entirely hand-written: store the id, re-read before write, compare,
reject. The docs are commendably explicit about this ("never accept an owner id
from client arguments") and even show the pattern. But for a multi-tenant app
it means the correctness of every tenant boundary rests on remembering to call a
helper in every handler. One forgotten check is a cross-household data leak.

A declarative rule layer, or even a lint rule / typed `ctx.db` wrapper that
can't be queried without a scope, would help a lot.

### ❓ Open API questions the docs don't answer

Collected in [`docs/notes.md`](../../docs/notes.md); the ones that actually
block design decisions:

1. **Can `query()` take arguments?** Every `mutation()` example has typed args;
   every `query()` example takes only `ctx`, and `useQuery()` is never called
   with arguments. If queries are argument-less, multi-tenant switching has to
   be server-side state rather than a parameter. We designed around it, but had
   to guess.
2. **What happens when a handler throws?** Our auth helper throws. How that
   surfaces in `useQuery` / `useMutation` — exception, rejected promise, empty
   result — is undocumented, and it determines all client error handling.
3. **Compound index ranges?** Only `range.eq("field", value)` on one field is
   shown. Unclear whether `.eq().eq()` chains.
4. **Is adding an index "additive"?** Publish applies additive changes silently
   and requires flags for destructive ones. Where indexes fall isn't stated.

### 👍 Destructive migrations require an explicit flag

`sf publish` applies additive changes but will not silently drop data;
`sf db migrate --drop` / `--rename` are opt-in. Exactly the right default. It
does mean getting the schema right early is worth real effort, which is why we
committed to `householdId` on every table from day one rather than retrofitting.

### 👍 Honest, specific limits

Server bundle ≤ 768 KiB, client ≤ 8 MiB, storage 5 MiB/object, 200 MiB daily
anonymous upload budget. Stated plainly in the reference rather than buried in
a pricing table. Easy to design against.

### ❓ Auth is Gravatar-only

Hosted sign-in is Gravatar; `SignInWithGoogle` is a compatibility alias that
renders a "Sign in with Gravatar" button — which is a slightly confusing bit of
naming, since the function name says Google and the button says Gravatar.

For our two-person household this is fine. For anything with real user
acquisition, Gravatar-only would be a hard constraint worth knowing before
committing.

---

## 2026-08-24 — Repo setup, before the port

### 👍 The docs are explicit about what must never be published

`setup.md` says plainly: zip "the public output only — never a repository root,
never `.env*`, credentials, `.git`, or `.spacefast`." That's specific enough to
act on, so we pre-emptively gitignored `.env*` and `/.spacefast` before writing
a line of Zero code. Naming the exact paths beats a vague "don't commit
secrets."

### ❓ Should `.spacefast/` be committed or ignored?

Genuinely unclear from the docs, and it cuts both ways. `setup.md` tells agents
to look for `.spacefast/space.json` or `state.json` to find an existing space
and publish a new version to it rather than creating a duplicate — which argues
for committing it so any clone finds the right space.

But the claim key is a bearer credential ("anyone who has it can also publish
over this space and claim it"), which argues hard for ignoring it.

We ignored the whole directory. If space identity and space credentials live in
the same file, that's a design worth splitting: a committable `space.json` with
just the id, and an ignored `state.json` with the key. Worth asking whether
that's already the intent.

---

## Not yet evaluated

Things we'll have opinions about once we actually build:

- `sf init` / `sf dev` developer experience
- Whether local dev state (`--state-backend sqlite`) behaves like production
- Migration ergonomics on a schema change with real rows in it
- `sf publish` speed and failure modes
- The platform kit (`@spacefast/zero/kit`) — how much of it we can actually use
  alongside a custom color system
- Rollback behavior when code and schema disagree
- Backups (`sf db export`) and whether restore is a real path

---

## 2026-08-24 — Phase 1: CLI, scaffold, and the first `sf dev`

Context: installing the toolchain, scaffolding the Zero project into the
existing repo, porting the React prototype to Preact, and running the capsule
locally for the first time. CLI version `spacefast/0.0.26`, Node v24.14.1,
darwin-arm64.

### 👍 The CLI is on npm, so it can be a pinned devDependency

`setup.md` advertises exactly one install path:
`curl -fsSL https://spacefast.com/install.sh | bash`. But the CLI is also
published as the plain `spacefast` package, which exposes both `spacefast` and
`sf` bins:

```bash
npm install --save-dev spacefast@0.0.26   # provides `sf`
```

That is strictly better for a project: the version is pinned in
`package-lock.json`, every clone gets the same CLI, and nothing pipes a remote
script into a shell. **Worth advertising in the docs** — the curl installer is
right for a laptop, but a repo wants the dependency.

### 👎 `sf --help` hides the four commands the Zero docs use most

The top-level command list shows only `publish`, `status`, `versions`,
`rollback`, `spaces claim`, `login`, `init`, `docs`. Missing: **`dev`, `db`,
`logs`, `storage`** — which are the commands `/docs/zero` tells you to run.

They all exist and work (`sf dev --help`, `sf db --help`, …), and `sf db`'s own
help lists its `console` / `dump` / `export` / `migrate` subcommands. But an
agent that reads `sf --help` to discover the surface concludes `sf dev` isn't a
thing. `sf docs "theme.json"` also returns "No essential docs match".

### 👍 `sf init --runtime zero` writes an excellent `AGENTS.md`

The scaffold drops a ~113-line `AGENTS.md` that is **denser and more useful
than `/docs/zero.md`**, and documents constraints that appear nowhere public:

- "Class names must be static strings… a computed class like `bg-${tone}-500`
  produces no CSS and the capsule ships unstyled."
- The semantic token vocabulary (`canvas`, `surface`, `ink`, `ink-muted`,
  `line`, `accent`, `success`, `warning`, `danger`) and the shadcn aliases.
- "Server code imports `@spacefast/zero/server` and its own files, nothing
  else" — npm packages bundle on the client only.
- "Outbound `fetch` works only inside actions."
- Platform modules (kit, charts, preact, recharts, lucide) are served from
  immutable platform URLs and **don't count against the 8 MB client budget**.

Copied to `.claude/docs/zero-agent-rules.md`. **Suggestion: publish this page.**
It is the best single document about the runtime and it is currently only
discoverable by scaffolding a throwaway project.

### ✅ Resolved: queries *can* take arguments

Open question #1 from the first session is answered, though not by the docs —
by the type declarations in `@spacefast/zero/dist/public-client.d.ts`:

> Reads a query. The canonical form takes the query-options object the typed
> client builds — `useQuery(api.messages({ topic }))`; the Lakebed string form
> `useQuery("messages", topic)` stays supported and means the same thing.

So `useQuery(name, ...args)` is real, and `usePaginatedQuery(name, args, …)`
takes an args record outright. Every `query()` example in `/docs/zero.md` takes
only `ctx`, which is what made this look impossible. **One example with an
argument would have saved a design detour** — we architected around the
possibility that queries were argument-less.

### ❓ `theme.json` is WordPress theme.json v3, and that is documented nowhere

This is a genuinely nice decision that no one can find. `/docs/zero.md` says
only "A `theme.json` at the project root adjusts the palette and typography the
utilities compile against." It does not say what shape the file takes, and:

- `https://spacefast.com/schemas/theme.json` → **404**
- `https://spacefast.com/docs/zero/theme.md` → **404**
- `sf docs theme --all` → one error-code page

We recovered the format by reading
`node_modules/@spacefast/zero-compile/dist/tailwind-core.js`, whose comment
says "`theme.json` v3 settings for the utility compile: palette entries become
`colors`, font families `fontFamilies`, font sizes `fontSizes`, and literal
safelist entries cover classes assembled only at runtime."

The working shape:

```json
{
  "version": 3,
  "settings": {
    "color": { "palette": [{ "slug": "canvas", "color": "#F5F2EA" }] },
    "typography": {
      "fontFamilies": [{ "slug": "disp", "fontFamily": "Fraunces, ui-serif, serif" }],
      "fontSizes":    [{ "slug": "step-1", "size": "1.25rem" }]
    },
    "safelist": ["bg-danger", "bg-success"]
  }
}
```

Each preset becomes a Tailwind token that reads the runtime custom property
first and falls back to the literal: `--font-disp: var(--wp--preset--font-family--disp, Fraunces, …)`.
Confirmed working — `font-disp`, `font-mono`, and every color slug compiled.

**Two asks:** publish the schema at the advertised URL, and mention the
`settings.safelist` escape hatch in the Zero docs. It is the documented answer
to the static-class-names rule and it is invisible.

### 🐛 `fontFace` in `theme.json` is silently ignored — no webfont path

WordPress theme.json v3 supports `settings.typography.fontFamilies[].fontFace`
with a `src`, which is how you'd expect to load Fraunces and IBM Plex Mono. The
Zero compile reads only `slug` and `fontFamily` and drops everything else:

- No `@font-face` rule appears in `zero.css`.
- `/__spacefast_generated/theme.css` — the stylesheet `style.d.ts` says the
  runtime emits from `theme.json` — **404s on `sf dev`** (it falls through to
  the SPA shell), and the generated `index.html` never links it.

So on the local dev server there is **no way to load a webfont at all**: no
`index.html` to add a `<link>` to, no CSS file to `@import` from, `@plugin` and
`@config` rejected, and `fontFace` ignored. A font that isn't installed on the
machine simply falls back.

Our prototype's identity is Fraunces + IBM Plex Mono, so this is a real loss.
We've kept the families declared with full fallback stacks and accepted the
fallback for now. **This is the biggest concrete gap we've hit.** Either honor
`fontFace`, or document the intended way to ship a webfont.

### ❓ The `ink` semantic token collides with our domain vocabulary

Zero's palette uses `ink` for body text (`text-ink`, `text-ink-muted`). This app
has used "ink" since the prototype to mean *a taxonomy term's base hex*, the
color every tint and ring derives from. Not Spacefast's fault, and it cost us
nothing — our colors are inline styles, never classes — but it is worth knowing
that `ink` is a reserved-ish name.

### 👍 The static-class-names rule did not bite, and here's why that matters

Our entire visual system derives per-term colors from a user-picked hex. Had
those been Tailwind classes, `bg-${hex}` would have compiled to nothing and the
app would have shipped unstyled — exactly the failure `AGENTS.md` warns about.
They were already inline `style` objects, so the port was unaffected.

The general lesson for the docs: **user-chosen colors can never be utility
classes on this platform.** That deserves to be stated positively ("compute
colors into inline styles") rather than only as a warning about what breaks.

### 👎 `sf dev` has no sign-in: `signInPath` and `signInUrl` are both null

`GET /__spacefast/zero/config` on the local dev server returns:

```json
{ "auth": { "provider": "gravatar", "signInPath": null, "signInUrl": null,
            "signOutPath": null, "signOutUrl": null } }
```

The docs say "`sf dev` supplies a local guest identity, so authorization logic
works the same locally and hosted." That is true for *authorization* — a guest
has a stable `userId` a handler can scope rows to. It is not true for
*authentication*: there is no local sign-in flow, so `auth.isGuest` is
permanently `true` and `<SignInWithGoogle />` has nowhere to go.

For an app that requires sign-in (our D2), that means **the entire signed-in
surface is unreachable on `sf dev`**. Ours is a two-person household app whose
whole point is a shared, authenticated household, and we cannot exercise any of
it locally.

**What we'd suggest:** a `sf dev --sign-in-as <name>` flag, or a dev-only stub
sign-in page that mints an authenticated identity. Without one, every
sign-in-gated Zero app has to build its own local bypass, and each one is a
hand-rolled hole in its own auth gate.

We then did exactly that, which is the point: `client/index.tsx` now lets a
guest through when `location.hostname` is a loopback address, with a permanent
on-screen badge so a local session can't be mistaken for a real one
([D14](../../docs/decisions.md)). It works, and it is inert on a published
space — but it is a hole in the only auth boundary the app has, written by hand,
because the platform gave us no other way to see our own UI. That is a bad thing
to make every developer of a gated app invent for themselves.

Concretely: **`sf dev --sign-in-as "Justin"` would have replaced a security
decision with a flag.**

### 👎 The dev server's capability handshake needs an `Origin` header

`sf dev` prints a private URL with a `#zero-dev-capability=<token>` fragment.
Every path except `/` returns `401 {"error":"unauthorized"}` until the browser
POSTs that token to `/__spacefast/zero/bootstrap`, which sets an `HttpOnly`
`spacefast_zero_dev_<port>` cookie.

Good design — but the bootstrap POST returns **403** unless an `Origin` header
is present (CSRF protection, reasonably). That combination makes the dev server
awkward to inspect from a script or a headless check:

```bash
CAP=...   # from the sf dev banner
curl -X POST -H "authorization: Bearer $CAP" -H "origin: http://127.0.0.1:4173" \
  http://127.0.0.1:4173/__spacefast/zero/bootstrap   # 204 + Set-Cookie
curl -b "spacefast_zero_dev_4173=$CAP" http://127.0.0.1:4173/zero.css
```

Nothing here is wrong, but none of it is documented, and the 403 is opaque —
it says `forbidden` with no hint that the missing `Origin` is the reason. A
`--no-capability` flag for loopback-only dev would help CI and agents a lot.

### 👍 The compile itself is fast and correct

Everything we threw at it worked on the first run: 27 TypeScript files across
`client/`, `server/`, and `shared/`; a 92 KB `client.js`; a 40 KB `zero.css`.
Arbitrary-value utilities compiled correctly, including responsive variants and
underscore-encoded spaces (`md:grid-cols-[190px_1fr]`, `max-h-[80vh]`,
`tracking-[0.02em]`). Editing `theme.json` triggered "Reloaded Zero dev runtime
after 1 file change(s)" within a second.

`capsule({ schema: {} })` is accepted, so a scaffold phase with no tables yet is
a legal capsule — useful for staging a port.

### 👍 The docs inconsistency worth one line

`AGENTS.md` refers to `sf create my-form --runtime zero --template contact`.
The command is `sf init`; there is no `sf create`.

## 2026-08-24 — Planning the first publish (`--dry-run` findings)

Everything below came from `sf publish --dry-run` before anything was uploaded.
Nothing has been published yet. The dry run earned its keep three times over.

### 👎 Framework detection silently beats the `runtime` block

`sf publish --dry-run` at the project root plans this:

```
Framework       vite
Install         npm ci
Build           vite build
Output          dist
```

That is the **wrong artifact entirely**. `sf.jsonc` declares
`runtime: { kind: "zero", server: …, client: … }`, and `sf dev` honours it — but
publish framework-detects Vite and plans to build and deploy the static
prototype instead of compiling the capsule. No warning, no mention of the
capsule anywhere in the plan; a `--dry-run`-less publish would have gone live
with the wrong app and a capsule that was never compiled.

The detection is **`package.json`-driven, not file-driven**. Deleting
`vite.config.js` and `index.html` changed nothing; removing `package.json`
switched it to the capsule build immediately. So any Zero project that keeps
Vite in `devDependencies` — a port in progress, a monorepo, a docs site
alongside the app — is exposed to this.

**What we'd suggest:** an explicit `runtime` block should win over framework
detection, or at minimum the plan should say
`Framework vite (overriding runtime.kind=zero)` so the conflict is visible.

### 👎 Direct publish ignores `.gitignore` and ships the whole directory

With `--prebuilt` (which *does* find the capsule), the plan was **149 files,
3.5 MB**. The capsule sources (`client/`, `server/`, `shared/`) are consumed by
the compiler and correctly not served. Everything else in the directory ships as
public static files:

- `.ideas/` — 82 files of abandoned prototype code, **gitignored**
- `.idea/` — PhpStorm config including `workspace.xml`, **gitignored**
- `.claude/docs/` — including this feedback file
- `CLAUDE.md`, `docs/*` — every internal design document
- `src/`, `dist/`, `package-lock.json`, `tsconfig.json`, `vite.config.js`

(An anonymous space is key-gated, per `setup.md`, so on that path these sit
behind the space key rather than fully public — but on a claimed space, which is
where any real project ends up, they are served to anyone.)

The walker uses a fixed ignore list (`.git`, `node_modules`, `.ssh`, `.aws`,
`.cache`, a few tool dirs) plus sensitive-filename patterns. Credentials are
genuinely well covered — `.env*`, `*.pem`, `*.key`, `id_rsa*` are all pattern-
blocked, and that is good, careful work. But `.gitignore` is never read on this
path, even though the CLI reads it elsewhere (`SOURCE_ARCHIVE_EXCLUDED_*` for
remote builds is a different, stricter code path).

The asymmetry is the problem: `--remote` respects one exclusion policy, direct
publish another, and the looser one is the default. "It's gitignored" is the
assumption every developer will make.

**What we'd suggest:** honour `.gitignore` by default on the direct path too, or
support a `.spacefastignore`. `.vercelignore` / `.nowignore` / `.assetsignore`
already appear as strings in the CLI bundle; none is documented for Zero.

### 😕 The capsule compile needs `node_modules`, but treats the deps as platform

Publishing a staged directory without `node_modules` fails with
`Could not resolve "lucide-preact"` (10 errors). Fair enough — except that
`lucide-preact` is then emitted as
`_spacefast/platform/<hash>/lucide.js`, i.e. the compiler treats it as a
*platform* module in the output while requiring it to be *locally installed* at
build time. Worth documenting which is which; `AGENTS.md` says platform modules
don't count against the bundle budget but doesn't say they must still resolve.

Also emitted: `recharts.js` (928 KB) and `zero-charts.js`, even though nothing
in this app imports `@spacefast/zero/charts` or `/kit`. `AGENTS.md` says
platform modules "aren't in your bundle at all: they're served from the
platform's own immutable URLs" and "anything you don't import is never
fetched" — the *fetched* part is presumably still true, but they are plainly
uploaded per-space rather than served from a shared platform URL. 1.1 MB of our
1.77 MB plan is charts and icons this app never references. Harmless, since
they're outside the bundle cap and a browser won't request them, but "aren't in
your bundle at all" reads as stronger than what the publish plan shows.

### 😕 `statePath` resolves outside the project

The JSON plan reports where publish state — including the anonymous space's
claim key — will be written. From the project root it chose:

```
/Applications/XAMPP/xamppfiles/htdocs/wp/wp-content/plugins/.spacefast/state.json
```

The **parent** directory, not the project, despite `./.spacefast/` already
existing (from `sf dev`). From a staged directory it correctly chose
`<stage>/.spacefast/state.json`. Whatever the walk-up rule is, it put the claim
key for our space one level above the repo, in a directory belonging to
something else entirely. For an anonymous space the claim key *is* the space —
lose it and it's orphaned — so where it lands should be predictable and inside
the project.

### 👍 A staged publish produces exactly what it should

Copying `client/`, `server/`, `shared/`, `sf.jsonc`, `theme.json` into a clean
directory (no `package.json`, `node_modules` symlinked in) gives a 19-file plan:

```
client.js        98,982      zero.css          40,274
index.html        1,889      (generated app shell — the capsule's, not ours)
_spacefast/platform/…        recharts, lucide, preact, zero-client, zero-kit
sf.jsonc, theme.json         (config, served as-is)
```

Total 1.77 MB, well under the 8 MiB client cap. Nothing from the repo leaks.
`--dry-run --json` giving a full per-file manifest with sizes and SHA-256s is
excellent — it is the only reason any of the above was caught before upload.

## 2026-08-24 — First `sf publish`: the CLI dies at finalize

The first real publish. Anonymous space, publishing the staged directory
described above. It got most of the way and then broke, and the failure mode is
bad enough to be the headline of this whole log.

### 🐞 `sf publish` exits mid-finalize with an unsettled top-level await

```
✓ Creating space    stage (spc_dc67347c82b9485f8c9608b72b201aaf)
✓ Creating version  ver_2a43c5fdf29747aa96c30a22748dcf0a
✓ Uploading files   19 files
⠋ Finalizing version
Finalize request is still running; polling version status...
Warning: Detected unsettled top-level await at
file:///…/node_modules/spacefast/dist/cli.js:6
await import("./cli-main.js");
```

The process then exits. Non-zero work completed — space created, version
created, all 19 files uploaded — but the version was never activated, and
`https://stage.view.fast/` serves `503 This space hasn't been published yet.`

This is not a network blip: it reproduces. The moment the CLI has to *poll*
for something, the awaited promise never settles and Node exits with the event
loop empty. Adding `--wait --wait-timeout 420` makes no difference — the exit
happens during finalize, before any wait logic.

Running `sf publish` again to recover hits the same bug one step earlier:

```
✓ Updating space  stage (spc_dc67347c82b9485f8c9608b72b201aaf)
Waiting for the previous publish of stage to settle before creating a version...
Warning: Detected unsettled top-level await at …
```

So the first stuck finalize now blocks every subsequent publish, and the command
that reports the block dies the same way. Environment: `spacefast/0.0.26`,
`darwin-arm64`, `node-v24.14.1`.

### 🐞 An anonymous space cannot be diagnosed at all

With the version stuck, the obvious next move is to look at it. Every route is
closed:

```
$ sf versions ls
Claim this space into a managed principal before using this endpoint.
Your account doesn't have access to this resource.
Learn more: https://spacefast.com/docs/errors/space_unclaimed
```

`sf versions`, `sf rollback`, `sf runtime status`, `sf logs` — all of them
require a claimed space. The anonymous flow is presented as the low-friction way
to try the platform, and it is, right up until something goes wrong; then there
is no `ls`, no status, no log, and no way to cancel a stuck version. The only
tool an anonymous publisher has is `sf publish` again, which is exactly the
command that is jammed.

The error message is also slightly wrong about the remedy: it suggests
`sf teams ls`, which has the same problem.

**What we'd suggest:** let the claim token authorize read-only inspection of its
own space — `versions ls` and `runtime status` at minimum. An anonymous space
you cannot observe is worse than no anonymous space, because it fails silently
and looks like your app is broken.

### 😕 The space slug comes from the directory name

We published a staged copy from a scratch directory, so the space is named
`stage` and lives at `stage.view.fast`. `sf.jsonc` says `"name": "Larder Log"`
and the compiled artifact says `"appName": "larder-log"`; neither was consulted.
Minor, and `--slug` / `-n` would have avoided it — but the config file that
names the app is right there.

### 😕 Anonymous claim tokens expire the same day

`state.json` records `expiresAt` about six hours out:

```json
{ "spaceId": "spc_…", "claimToken": "sfc_…", "expiresAt": "2026-08-24T22:40:47Z" }
```

Reasonable in principle. Worth knowing that it is hours, not days — and worth
printing in the publish output, because right now it is only discoverable by
reading `.spacefast/state.json`. Combined with the finalize bug, the clock is
running on a space that has never served a request.

### 🐞 The finalize bug is not a Node version artifact

Worth ruling out, since Node 24 is newer than the CLI's `engines: ">=20.3"`.
Ran the same publish under Node 20.18.3 and 22.22.0 (both via the CLI's own
`dist/cli.js`, same `spacefast/0.0.26`):

- **Node 24.14.1** — prints `Detected unsettled top-level await` and exits.
- **Node 20.18.3** — no warning at all. Exits silently at exactly the same
  point, after `Waiting for the previous publish of stage to settle…`.

So Node 24 is only *diagnosing* the bug; the awaited promise never settles on
any version. On Node 20 a stuck publish looks like a command that succeeded and
returned, which is worse.

### 🐞 A stuck publish deadlocks the claim flow

The state we're now in:

- The space has a version created and 19 files uploaded, never activated.
- The site serves `503 This space hasn't been published yet.`
- Clicking **Claim** at the claim URL answers:
  *"Finish or cancel the active publish before claiming this space."*
- Every CLI route to finish or cancel it requires a claimed space.

That is a closed loop: **claim requires finishing the publish; finishing the
publish requires the CLI command that crashes; diagnosing it requires the claim.**

`sf api` doesn't break it either — the raw passthrough is authenticated by the
same principal, so the space key gets the same 403:

```
$ sf api GET /v1/spaces/spc_…/versions --include
HTTP 403 Forbidden
{"type":"…/errors/space_unclaimed","title":"Space unclaimed",
 "detail":"Claim this space into a managed principal before using this endpoint."}
```

Meanwhile `sf status` — which *does* work unauthenticated — cheerfully reports
`Claim: pending (expires 2026-08-24T22:40:47.735Z)` without mentioning that
there is an active publish blocking that claim, which is the one fact that
matters.

**What we'd suggest, in priority order:**

1. Fix the poll so `sf publish` cannot exit with an unsettled await.
2. Give the space key read access to its own space's versions and status. An
   anonymous space is not a security boundary against its own key holder.
3. Add `sf publish --cancel` (or let a stuck publish time out server-side) so a
   crashed CLI is recoverable without an account.
4. Have `sf status` report an active publish, since that is what blocks claiming.

For a platform whose anonymous flow is explicitly pitched at agents, this is the
worst possible failure: the happy path is genuinely excellent, and the first
unhappy step leaves an agent with no move that isn't "ask a human to log in".

## 2026-08-24 — The actual cause: `version_finalize` fails, status never updates

The finalize "hang" was never a hang. `sf api GET /v1/operations` — reachable
only once we had an account — tells the truth:

```
failed  version_finalize  2026-08-24T16:57:17.898Z -> 2026-08-24T16:57:35.000Z
   version ver_9910482e36f0456a92387c0ebd43b846
   space   spc_7770744a870a43f5927213fa397c780e
   ! InternalError: Runtime API request failed with 406.   (provider: runtime)
```

**The operation failed 17 seconds after it started.** Everything after that —
the CLI's poll, our 15-minute watch, the dashboard — was observing a version
whose finalize had already died.

### 🐞 The bug: a failed operation never reconciles to the version

Eight minutes after that failure, with the operation recorded as `failed`:

```
$ sf versions ls --space larderlog
> v1 (deploying) status=finalizing …
$ sf runtime status --space larderlog
State: failed          <-- the space knows
Live version: none
Pending version: ver_9910482e36f0456a92387c0ebd43b846   <-- still pending
```

The space flips to `failed` but the version stays `finalizing` forever, and the
pending pointer is never cleared. That single inconsistency causes every
downstream symptom:

- `sf publish` polls a status that will never change → the unsettled top-level
  await, which we spent an hour chasing as if it were the bug.
- `POST …/versions/{id}/finalize` → `409 version_not_ready`
  *"Version … is finalizing and cannot be finalized."*
- `sf versions rm` → `409 version_busy`
  *"Wait for the version to finish finalizing before deleting it."*

The version is simultaneously too busy to finalize and too busy to delete. The
space is wedged with no CLI or API path out. We wedged two spaces this way
before finding the operations endpoint.

**What we'd suggest:** when `version_finalize` fails, mark the version failed and
clear the pending pointer. Everything else here is downstream of that one
missing write. Second: surface the operation's diagnostics in `sf publish`
output — the CLI had a failed operation ID available and instead printed a
spinner. Third: make `versions rm` always work on a version that isn't live.

### 🐞 The 406 is deterministic and unrelated to our code

We suspected our own empty schema (`capsule({ schema: {} })`, `migrations: []`,
`mysql.migrateAtFinalize: true`) — a migrate step handed zero migrations is a
plausible 406. So we published a probe capsule, identical except for one table:

```ts
schema: { probes: table({ note: string() }) }
```

Same failure, to the second:

```
failed  version_finalize  17:17:47.455Z -> 17:18:05.000Z   (probe, one table)
failed  version_finalize  16:57:17.898Z -> 16:57:35.000Z   (empty schema)
   ! InternalError: Runtime API request failed with 406.
```

Both ~17.5 seconds, which reads like a fixed timeout inside the runtime
provisioning call rather than anything about the payload. Three spaces, two
schemas, one anonymous and two owned — every Zero capsule publish today fails
identically at finalize.

**Net for 2026-08-24: Zero publishing is unavailable.** Nothing has been
published, and the app has never served a request. `sf dev` compiles and serves
the same capsule fine, so this is specific to the publish/provision path.

For the record, since it is buried above: the failing request is a `406` from
an internal service the diagnostics call `provider: runtime`, during
`version_finalize`, on `spacefast/0.0.26`.

### ✅ Resolved the same day — and the operation record was rewritten

About 48 minutes after the finalize was recorded `failed`, the space went live
on its own:

```
$ sf versions ls --space larderlog
* v1 (live) status=ready …   updated: 2026-08-24T17:45:28.000Z

$ sf runtime status --space larderlog
State: active
Live version: ver_9910482e36f0456a92387c0ebd43b846
Pending version: none
Capsule     larder-log
Server      quickjs-rust
```

Same version id that had been stuck. And the operation now reads:

```
succeeded  version_finalize  2026-08-24T16:57:17.898Z -> 2026-08-24T16:57:35.000Z   []
```

Identical id and timestamps, but `failed` became `succeeded` and the
`InternalError: Runtime API request failed with 406.` diagnostic is gone. The
probe space `larderlogprobe` was deleted outright ("Space not found"), which is
what our report asked for — so this looks like the Spacefast team intervening
after Justin filed it, not a spontaneous retry.

**What this changes about the bug report:** the 406 was real and reproducible at
the time, and the version genuinely was unrecoverable through the CLI — that part
stands. But "Zero publishing is unavailable" was too strong a conclusion: a
finalize can apparently recover long after it is recorded as failed. The durable
defect is the one we already led with — **version status and operation status
don't track each other** — and this resolution makes it sharper in both
directions: a failed operation left the version pinned at `finalizing`, and a
later recovery rewrote history without any event a client could observe. There
is no way to watch for either transition; we only found out by re-running
`versions ls` an hour later.

Worth adding to any follow-up: an operation whose terminal status can change
from `failed` to `succeeded` after the fact is not a terminal status, and
nothing in the CLI or API notifies on the change.

## 2026-08-24 — Phase 1 closed: what publishing actually verified

Once `larderlog` was live and made publicly viewable, the whole Phase 1 question
answered itself in about five minutes.

### 👍 The gate works exactly as designed, on the first try

- Signed in → the pantry renders.
- Signed out → the sign-in screen, "Sign in with Gravatar", "Sign-in required".
- Sign out → back to the gate.
- The D14 "Dev guest · not signed in" badge does **not** appear on a real
  hostname, so the loopback bypass is confirmed inert in production.

No code changed between `sf dev` and the published space. Whatever else went
wrong today, the runtime honoured `useAuth()` / `signOut()` precisely as the
types promised, and the client we wrote against a dev guest worked unmodified
against a real Gravatar identity. That is the part worth saying out loud.

`GET /api/status` returning `ok` is the cheapest possible proof that the server
half of a capsule deployed — worth recommending in the docs as the one-line
post-publish smoke test.

### 😕 Spaces are private by default, and the app is the last to know

A published Zero app answers `403 This space is private` to every visitor until
someone changes it in the dashboard. For a sign-in-gated app that is a gate in
front of a gate, and the outer one is invisible from the code: `sf.jsonc` has an
`access` field, but `sf spaces get` reports `config: {}` after the dashboard
toggle, so the two mechanisms don't obviously converge. Nothing in `sf publish`
output mentions that the thing it just published cannot be opened.

It also breaks the flow the platform is otherwise built for. Our Phase 3 invite
link is useless if the recipient hits a platform 403 before reaching our join
route — see [D15](../../docs/decisions.md#d15-the-space-is-public-the-apps-own-gate-is-the-boundary).

**What we'd suggest:** say the space is private in the publish receipt, with the
one command or click that changes it. Better still, let `sf.jsonc`'s `access`
be the single source of truth and report it in `sf spaces get`.

### 👎 Webfonts: confirmed impossible, not merely undocumented

Settled on a real publish. The served `zero.css` contains **zero `@font-face`
rules**; it defines `--font-disp`, `--font-sans`, and `--font-mono` from
`theme.json` and never loads a face for any of them.
`/__spacefast_generated/theme.css` 404s on the published space exactly as it
does under `sf dev`.

So `theme.json`'s `fontFamily` can *name* Fraunces, and nothing can ever fetch
it. There is no `index.html` to add a `<link>` to, no CSS entry point, and
`@plugin` / `@config` are rejected. An app on Zero gets system fonts, full stop.

**What we'd suggest:** either honour `fontFace` in `theme.json` (the field name
already implies it) or document plainly that webfonts are unsupported. Right now
the config accepts a font family it cannot deliver, which reads as a bug in your
own app until you go looking.

## 2026-08-24 — Phase 2 spike: schema, handler runtime, and a scanner false positive

Ran a throwaway spike capsule (temporary `/api/spike/*` endpoints, curled via
the documented bootstrap dance) to answer the platform questions Phase 2's
design depended on. Then built the real schema and handler layer on the answers.

### good — endpoints are a usable probe harness

`endpoint()` gets a **writable** `ctx.db`, so a spike can insert, read back, and
report without a browser. That made six open questions answerable in one
`sf dev` session. Worth documenting as a technique — the docs show endpoints
only for webhooks.

### good — the bundled `.d.ts` is better than the published docs

`node_modules/@spacefast/zero/dist/server.d.ts` answered more than
`docs/zero.md` did, and answered it precisely:

- `IndexRange` exposes `.eq()`, `.gt()`, `.gte()`, `.lt()`, `.lte()`, each
  returning `IndexRange` — so range chaining is a supported API, not a guess.
  The public docs only ever show a single `.eq()`.
- `insert()` returns the **whole row**, not an id.
- `ReadDatabaseOf<TDefinition>` / `WriteDatabaseOf<TDefinition>` are exported,
  which is what lets handler helpers live in their own module with real types
  instead of `any`. Neither appears in the public docs.
- The `invalidate()` doc comment is the only place that says live queries
  **refetch rather than diff**. That is a first-order architectural fact — it
  decides whether a one-payload query is viable — and it is not in `zero.md`
  at all.

**Suggestion:** promote the `invalidate()` comment and the `IndexRange` surface
into `docs/zero.md`. A reader who only has the public docs cannot design query
granularity correctly.

### confirmed behaviors (all against `sf dev`)

- **`Date` works server-side.** `new Date()`, `Date.now()`, `.toISOString()`.
- **`createdAt` / `updatedAt` are ISO 8601 UTC.** Verified exactly:
  `new Date(row.createdAt).toISOString() === row.createdAt`. Row ids are UUIDs.
  Undocumented — `zero.md` only says "strings".
- **Compound index ranges filter on every chained field.** `.index("by_a_b",
  ["a","b"])` + `range.eq("a",x).eq("b",y)` returned 1 of 3 seeded rows, not the
  2 that a silently-ignored second `.eq()` would give.

### unclear — `id("table")` is not a foreign key

An `items` insert whose `householdId` **and** `locationId` both pointed at
nonexistent rows **succeeded**. `id(table)` is a type hint only.

Reasonable as a design choice, but it deserves an explicit line in the docs
next to the `id()` description. Combined with "no row-level security", it means
an app has *no* database-level integrity backstop of any kind — every
referential and ownership rule is hand-written or absent. We had assumed `id()`
bought us something; it does not.

### unclear — a thrown handler error is echoed to the client verbatim

`throw new Error("Sign in required")` from an endpoint returns **HTTP 500** with
an RFC 7807 body whose `detail` is the thrown message verbatim:

```json
{"type":"https://spacefast.com/docs/errors/zero_dev_endpoint_failed",
 "title":"Zero dev endpoint failed","status":500,
 "detail":"Sign in required","code":"zero_dev_endpoint_failed"}
```

Convenient, but it means **every thrown string is user-visible**, so an
incidental `throw new Error(someInternalDetail)` leaks. Worth saying out loud in
the docs, and worth a documented way to distinguish "expected, show this" from
"unexpected, log it and show something generic". We ended up with our own
`AccessError` class purely as a discipline marker.

Also unclear whether a `query()` / `mutation()` throw surfaces the same way to
`useQuery` / `useMutation` — that needs a browser, so it is still open for us.

### bug — the server-global scanner false-positives on object literal keys

This cost the most time of anything here. `sf dev` refused to start:

```
Zero source server/index.ts references unsupported server global location.
Error: Zero source server/index.ts references unsupported server global location.
```

The offending line contained no global. It was an object literal **key**:

```ts
const TERM_TABLES = { location: 'locations', type: 'types', store: 'stores' } as const;
```

Quoting the key fixes it completely:

```ts
const TERM_TABLES = { 'location': 'locations', type: 'types', store: 'stores' } as const;
```

So the scanner is matching identifiers textually rather than resolving them —
an object property key named `location` (or presumably `history`, `navigator`,
`document`, `screen`, …) is treated as a reference to the browser global.

Three problems with this, in order of severity:

1. **It is a false positive on valid code.** `{ location: ... }` is an
   extremely natural key name in an inventory app.
2. **The error names a file, not a line or column.** In a 600-line capsule that
   is a manual search for a word appearing 20 times in strings, comments, and
   property accesses — all of which are fine, and only one of which is not.
3. **The message describes the wrong thing.** "references unsupported server
   global location" is false; nothing references a global. It sent us looking
   for an import or a stray browser API.

**Suggestion:** resolve identifiers properly (a property key in a non-computed
member expression or object literal is never a global reference), and failing
that, at minimum report line and column. A one-line fix in the message would
have turned a 20-minute hunt into 20 seconds.

## 2026-08-24 — wiring the client: two client-runtime behaviors worth documenting

Both found by reading `node_modules/@spacefast/zero/dist/client.js`, because
neither is in `docs/zero.md`. Both changed our design rather than merely
informing it.

### bug (or at least a sharp edge) — `useQuery` seeds every query with `[]`

```js
const [value, setValue] = useState(() => getQueryValue(name, ...args) ?? []);
```

The pre-result value is a hardcoded empty **array**, whatever the query's return
type is. The example app in the docs returns `Entry[]`, so `[]` reads as a
natural "nothing yet" — but for a query returning an object it is simply the
wrong type, and `result.items.map(...)` throws on first render.

We settled on `Array.isArray(result)` as the loading check, since our queries
always return objects. That works, but it is a coincidence of our schema, not an
API. **A query that legitimately returns an array has no way to distinguish
"still loading" from "loaded, empty".**

**Suggestion:** seed with `undefined` (typed `T | undefined`), or expose the
subscription state the way every other data library does — `{ data, isLoading }`
or similar. The current shape forces every caller to invent a sentinel.

### bug — a failing query is invisible to the client, forever

`handleMessage` has exactly one query branch:

```js
if (message.op === "query.result" && typeof message.name === "string") { … }
```

There is no `query.error`. A query handler that throws never emits, so
`useQuery` keeps returning its initial `[]` indefinitely. There is no rejection,
no callback, no flag — from the client's side "the query threw" and "the query
hasn't answered yet" are the same observable state.

Mutations are handled properly, for contrast: `mutation.result` with `ok: false`
rejects the promise with the server's message intact, which is exactly right.

This is a genuine asymmetry and it has real consequences. Our natural design was
a `requireHousehold()` helper that throws — reused by both queries and
mutations, one authorization path. That turns out to be **unusable in a query**:
a first-run user with no household would sit on a permanently blank screen with
no signal to route them to setup, and no error anywhere to debug it with.

We had to split the helper in two — `membershipState()` returning a
discriminated union for queries, `requireMembership()` throwing for mutations —
and give every query a `QueryState` return type encoding `ready` / `guest` /
`no-household` / `blocked`. That is a defensible design, but we arrived at it by
reading the client bundle, not from the docs, and only after writing the
throwing version first.

**Suggestion:** deliver query failures. Even a `query.error` message that let
`useQuery` expose a rejection would be enough. Failing that, please document the
behavior loudly — "a query that throws never resolves on the client" is the kind
of thing that produces a blank page and a very long debugging session.

### good — `invalidate()` narrowing works as documented

Now that there are two live queries (`household`, `pantry`), declaring what each
mutation touched keeps an item edit from refetching the member list. The doc
comment on `InvalidateQueries` is the clearest thing in the type definitions;
it deserves to be in the public docs.

## 2026-08-24 — end of Phase 2: dev-server identity

### friction — `sf dev` issues one fixed identity, and no way to change it

`sf dev`'s guest auth is a constant:

```js
function zeroGuestAuth() {
  return { user: null, userId: "guest:local", displayName: "Local",
           provider: "guest", isGuest: true, isAuthenticated: false };
}
```

Two consequences we had to design around.

**1. A strict server-side guest check locks the app out of local development.**
Our capsule refuses guests, per the app's own "sign-in required" rule. That is
correct in production and fatal locally, because `isGuest` is permanently true.
We already had a client-side loopback bypass for the sign-in gate; Phase 2 forced
a second one on the server.

There is no clean signal to key it on. `ctx.env` is **empty** under `sf dev`, and
`sf dev --help` exposes no way to inject a variable — so an environment-keyed
switch was not available. We ended up matching the literal identity above,
field by field, on the reasoning that `guest:local` is produced by the CLI and
by the client's no-auth fallback and therefore should never come from a hosted
runtime.

That reasoning is sound but unverifiable from here, and it is an *authentication*
bypass, which is an uncomfortable thing to ship on an inference.

**Suggestion:** either a `sf dev --sign-in-as <email>` stub that produces a
non-guest identity, or an env var the dev server sets that a capsule can check
(`ctx.env.SPACEFAST_DEV === "1"`). Either removes the guesswork entirely. The
second is a one-line change and would let every app express "guests allowed in
dev only" honestly.

**2. One identity means multi-user behavior cannot be tested locally at all.**
Two browser tabs on `sf dev` are the same `userId`, so they share a household.
That is enough to watch a live query refresh after a mutation, and useless for
anything about membership: invites, roles, the last-owner guard, per-member
permissions. All of it has to go to a published space.

For an app whose whole point is two people sharing a pantry, that pushes the
first real test of the core feature onto production. A second seeded dev identity
— even just `guest:local` and `guest:local2` switchable by a query parameter —
would make Phase 3 testable before it ships.

### good — dependency footprint after dropping the prototype

Retiring the Vite prototype left `package.json` at three runtime dependencies
(`@spacefast/zero`, `lucide-preact`, `preact`) and two dev ones (`spacefast`,
`typescript`). No bundler, no Tailwind install, no PostCSS config — Zero
compiles the CSS itself from classes it scans out of source. For an app with a
real database, live queries, auth, and a full component tree, that is a genuinely
small surface, and it is the clearest thing the platform does well.
