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

## 2026-08-24 — pre-publish check on Phase 2: the capsule shipped an empty schema

Caught by running `sf publish --dry-run` before the first Phase 2 publish and
reading `.spacefast/zero/artifact.json` rather than trusting the exit code.
Nothing else in the toolchain says a word about any of this.

### 🐞 The schema compiler reads only the server entry, and never follows an import

Our schema lived in `server/schema.ts` and was imported into `server/index.ts`:

```ts
import { schema } from './schema';
export default capsule({ name: 'Larder Log', schema, queries: {…}, mutations: {…} });
```

`tsc --noEmit` passes. `sf publish --dry-run` reports a successful plan. The
compiled artifact:

```json
{ "server": { "schema": {}, "queries": ["household", "pantry"], "mutations": [ …16… ] },
  "db": { "backend": "mysql", "migrations": [] } }
```

**Sixteen mutations and two live queries, against zero tables and zero
migrations.** Publishing that would have deployed a working-looking app whose
every write fails at runtime, and the version history would show it as a clean
publish.

The cause is in `zero-publish.js`. `analyzeZeroSource()` reads the single entry
file and calls `extractCapsuleSurface(serverSource)`, which finds tables with a
regex:

```js
var TABLE_PATTERN = /([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*table\s*\(\s*\{([\s\S]*?)\}\s*\)((?:\s*\.index\s*\(\s*["'][A-Za-z_$][A-Za-z0-9_$]*["']\s*,\s*\[[^\]]*\]\s*\))*)/g;
```

There is no module resolution anywhere in that path. Queries and mutations were
found because they are written inline in the entry; the tables were not because
they were one `import` away.

Confirmed by experiment, not by reading: adding a throwaway
`const __probe = { probeTable: table({ hello: string() }) }` to `server/index.ts`
made `probeTable` appear in the artifact, while the nine real tables stayed
missing. Removing it and moving the real schema literal into the entry produced
all nine, with columns, defaults, and indexes intact.

**Why this is the worst failure mode we have hit.** Every other sharp edge in
this log announces itself — a 406, a 403, a scanner error, a blank screen.
This one is silent at every stage: it typechecks, it compiles, it dry-runs
clean, it publishes, and the damage only appears when a user tries to save
something. And the fix is invisible from the outside: splitting a schema into
its own module is such ordinary TypeScript that nothing suggests it is the
problem.

**Suggestions, cheapest first:**

1. **Fail the build when `capsule()` declares a schema the extractor could not
   resolve to at least one table.** A capsule with mutations and no tables is
   never intentional. One error message would have saved the whole
   investigation.
2. Warn when the entry's `schema` value is an identifier rather than an object
   literal — that is the exact shape that silently produces `{}`.
3. Document the constraint. The docs say "Declare the schema in the capsule" and
   every example is inline, but nothing states that inline is *required*. Read
   as prose, "in the capsule" reasonably describes a schema imported into it.
4. Longer term: resolve the entry's imports, or execute the capsule module the
   way `sf dev` evidently does, instead of pattern-matching source text.

### 🐞 A comment inside a table's `.index()` chain silently drops indexes

Same regex, second bug. The index chain is captured as
`((?:\s*\.index\(…\))*)` — whitespace only, no comments. So this:

```ts
invites: table({ … })
    .index('by_code', ['code'])
    .index('by_household', ['householdId'])
    // Demoting a member has to revoke the invites they created (D21).
    .index('by_creator', ['createdBy']),
```

compiles to a table with **`by_code` and `by_household` only**. `by_creator` is
gone. Moving the comment up one line, to between `})` and the first `.index()`,
drops **all three**.

A dropped index is not a build error and not a type error. It is a query that
still returns correct results and quietly stops using an index — or, if the
platform validates `withIndex()` names at runtime, a handler that fails only on
the code path that uses it. Ours would have been D21's invite revocation, which
does not run until Phase 3.

This one also bit us in the opposite direction: a doc comment we wrote
containing the example text `` `name: table({ ... })` `` minted a **phantom
empty table called `name`** in the artifact, because the extractor scans raw
source and does not strip comments. So comments can both delete real tables'
indexes and invent tables that do not exist.

**Suggestion:** strip comments before matching, at minimum. Better, parse the
entry rather than regex it — every problem in this entry is downstream of
pattern-matching TypeScript with a regular expression.

### 😕 `--dry-run` is not read-only

`sf publish --dry-run` rebuilds the capsule and prunes/rewrites
`.spacefast/zero/public/`, `artifact.json`, `finalize.json`, and
`server.qjs.mjs`. That turned out to be useful — it is the only way we found to
inspect a compiled artifact without publishing — but "dry run" implies no side
effects, and it silently rewrote build state on disk. Worth either documenting
or renaming.

### 😕 The publish payload mirrors the whole project directory

`sf publish` for a Zero runtime copies the project root into
`.spacefast/zero/public/` and uploads it. The Phase 2 plan is 53 files, of which
about 17 are the app (`client.js`, `zero.css`, `index.html`, `_spacefast/…`).
The other 36 are source and local editor state: `CLAUDE.md`, all of `docs/`,
`.claude/docs/` (including this file), `.idea/` including `workspace.xml`,
`.test-out/`, `tsconfig.json`, `package-lock.json`.

`publishPathIgnored()` in `publish-policy.js` denies a fixed list — `.git`,
`node_modules`, `.env*`, key and cert patterns, `.DS_Store`, `.gitignore` — and
nothing else. **`.gitignore` itself is excluded from the upload but not honored
as a rule**, so `.idea/` and `.test-out/`, both gitignored and untracked here,
are staged for upload anyway.

The serving layer does appear to refuse dot-prefixed paths (`/.claude/docs/…`
returns 403 on the live space, while a missing non-dot path returns 404), and
the docs state "Spacefast does not expose the source as static files." So this
may be inert in practice. But the files are still uploaded and stored in the
version artifact, and non-dot paths like `docs/notes.md` have no dot-rule
protecting them.

**Suggestion:** honor `.gitignore` by default, or support a `.spacefastignore`,
or add an `ignore` array to `sf.jsonc`. `--source-include` exists for the
inverse case (pulling ignored files *into* a remote build) but there is no way
to exclude.

### 👍 The dry-run artifact is the best verification surface the platform has

Credit where it is due: `.spacefast/zero/artifact.json` is exactly the right
artifact to expose — a complete, readable manifest of the schema, queries,
mutations, endpoints, and migrations that a publish would install. Every bug in
this entry was found by reading it. It deserves to be a first-class command
(`sf inspect` / `sf artifact`) rather than a file you have to know is there
after a dry run rewrites it.

## 2026-08-24 — the v2 publish itself: what worked and what to watch

The fixes from the previous entry went out as v2. Recording the publish
behavior separately, because most of it was good.

### 👍 The migration applied exactly as documented, with no ceremony

60 operations — 9 `create_table`, 36 `add_column`, 15 `add_index` — applied
during `sf publish` with no flags, no prompt, and no separate `sf db migrate`
step. Total publish time 133s. Afterwards every table answers `sf db dump` with
`No rows`, and a made-up table name errors with `zero_db_table_not_found`, so
the distinction between "exists and empty" and "does not exist" is legible from
the CLI. That is the whole promise of "migrations on publish" and it was kept.

Also worth noting after the Phase 1 ordeal: **no 406.** `version_finalize`
succeeded on the first attempt. The fix held.

### 👍 Publishing did not touch the space's public visibility

An open question since Phase 1, now closed. The dashboard's public toggle lives
outside the published config, and `sf publish` from an `sf.jsonc` with no
`access` field left it alone — `GET /` and `GET /api/status` both answer 200
unauthenticated after v2. The `config: {}` patch a publish sends merges rather
than replaces.

### 😕 `sf db` reports "Pending operations: 60" for a migration it already ran

Immediately after the successful publish, and with all nine tables live and
queryable:

```
Backend: mysql
Migration mode: safe
Pending operations: 60
```

Those 60 are the same create-from-empty operations the publish just applied. The
JSON output makes the cause visible — `sf db --json` returns `tables` (the
artifact's declared schema) and `migrations` (the artifact's plan), and has no
field for the *live* schema at all. So the count is "operations in this
artifact's plan", not "operations outstanding".

Read literally it says the database is unmigrated, which is alarming and wrong,
and there is no obvious way to tell the difference without falling back to
`sf db dump` on a table you expect to exist.

**Suggestion:** diff the plan against live state, and say `Pending operations: 0`
when there is nothing to do. If the live schema is genuinely not queryable from
the control plane, label the line `Planned operations` instead.

### 👎 The publish exposed the project's documentation on a public URL

Following on from the payload note in the previous entry — this is no longer
hypothetical. After v2, all of these return **200** to any anonymous visitor:

```
/CLAUDE.md  /LICENSE.md  /package-lock.json  /tsconfig.json  /tsconfig.test.json
/docs/notes.md  /docs/decisions.md  /docs/architecture.md
/docs/data-model.md  /docs/overview.md  /docs/roadmap.md
```

Dot-prefixed paths are refused with 403, so `.claude/` (this file included),
`.idea/`, and `.test-out/` were uploaded but are not reachable. `/sf.jsonc` and
`/theme.json` return 404 — the runtime appears to shadow those two names
specifically.

Nothing here is a credential, and the docs do say "Spacefast does not expose the
source as static files" — which is true of `server/index.ts` and `client/`, but
plainly not true of everything else in the directory. A `.md` file in `docs/` is
not source, so nothing excludes it, and it gets served as a static asset.

The publish output also says `Ignored 0` while uploading files that `.gitignore`
lists, which reads as a promise the tool is not making.

**Suggestion:** honor `.gitignore` by default. Failing that, a
`.spacefastignore` or an `ignore` array in `sf.jsonc`. Right now the only
levers are `access` — whose allowlist, if wrong, breaks the signed-out sign-in
page — or physically moving files out of the project root before each publish.

### 😕 Two files were rejected by plan limits, silently mid-publish

```
Warning: ignored 2 unsupported file(s) on this plan:
  .claude/docs/pantry-tracker-mockup.jsx, .idea/x3p0-larder-log.iml
```

Harmless here — both are files we never wanted uploaded. But "unsupported on
this plan" does not say *why* (extension? size? count?), it appeared as a
warning inside a spinner rather than in the final summary, and the final summary
then reports `Files 53` when 35 were uploaded. If a rejected file had been part
of the app, this is the notice that would have to catch it, and it is easy to
scroll past.

---

## 2026-08-25 — Client routing exists, but nothing serves a deep path

Context: Phase 3 needed an invite link. The plan was `/join/<code>`, a client
route, because the runtime reference advertises one.

### 👎 `Router` is documented; the fallback that makes it usable is not

`https://spacefast.com/docs/zero.md` says the client exports `Router`, `Routes`,
`Route`, `Link`, `useNavigate()`, `useParams()`, and `useLocation()`, and the
complete-app example ships a two-route guestbook with a `<Link to="/stats">`.
Nothing on that page mentions that those routes are only reachable if the
visitor is already inside the app.

On our published space, every unknown path returns the platform's own 404 page:

```
/              200  text/html  3030
/join/TEST     404  text/html  8496
/nonexistent   404  text/html  8503
/api/status    200  text/plain
```

So `client.js` is never fetched and the router never runs. A link mailed to
someone — the entire reason an app has a `/join/:code` route — cannot work. The
example app hides this, because `/stats` is only ever reached by clicking a
`<Link>` from `/`, where the bundle is already loaded. Deep-link it and it 404s.

The compiled artifact explains why the runtime can't do better on its own: the
`client` section is `{ "bundlePath": "client.js", "basePathAware": true }` and
carries no route declarations. The server has no way to know which paths the
client would have handled.

**Where the answer actually is:** `sf publish --dry-run` prints it as one line
of the plan —

```
Mode            website
SPA             false
```

— and `sf publish --help` lists `--spa auto|true|false`. Neither `SPA` nor
`--spa` appears in `zero.md`, and `sf.jsonc`'s documented surface doesn't
mention it either. A capsule app with a client router is presumably always meant
to be `--spa true`; if so, `auto` should detect a `<Router>` in the client entry
and say so, and the runtime reference's routing paragraph should say which
setting makes those routes reachable.

### 🐛 `sf dev` serves deep paths; the published space does not

The worst part of the above, found while verifying the fix. Against a freshly
started `sf dev`, the client shell is served at **any** path:

```
/                   200  1829
/?join=ABC23DEFGH   200  1829
/join/ABC23DEFGH    200  1829   <- the same shell, byte for byte
/api/status         200  ok
```

Against the published space, the same three paths are 200 / 200 / **404**.

So `sf dev` behaves as `--spa true` while a default publish is `--spa false`.
A `/join/:code` route written against the dev server works perfectly, passes
every local check, and 404s for the first person who clicks the link — the same
shape of failure as the D27 schema-extraction bug: local success, silent
production breakage, and nothing in between that catches it. Whatever the
default ends up being, dev and production should agree on it.

We shipped around it — the invite code rides in `?join=` on the root path, which
works under either setting and survives sign-in in `sessionStorage`. But the
detour cost a probe and a read of the artifact to be sure, and the shape of the
feature changed because of a flag we found by accident.

### 👍 The dot-path rule is a usable exclude, once you know it

Following up on the 2026-08-24 source-exposure entry: `publishPathIgnored()`
still uploads everything `.gitignore` lists, but the serving layer refuses
dot-prefixed paths with 403. That turned out to be the practical fix. Renaming
`docs/` to `.docs/` and moving `CLAUDE.md` to `.claude/CLAUDE.md` removed both
from the payload root entirely — confirmed in `.spacefast/zero/public/`, which
now contains neither.

It works, and it needed no flags. But it is an accident of the serving layer
rather than a feature, and it means "keep this out of the web root" is spelled
"rename your directories." The suggestion from the previous entry stands:
honor `.gitignore`, or give `sf.jsonc` an `ignore` array.

---

## 2026-08-25 — `sf publish` is blocked by a header the CLI cannot send

Context: publishing Phase 3 (client-only; no schema change). Dry run clean —
nine tables, two queries, sixteen mutations, zero migrations.

### 🐛 Publishing fails on an undocumented `x-spacefast-rationale` requirement

```
✓ Updating space  larderlog (spc_7770744a870a43f5927213fa397c780e)
⠋ Creating version
Agent mutations require a rationale of 1 to 1024 characters in the
x-spacefast-rationale request header.
Learn more: https://spacefast.com/docs/errors/validation_error
```

Deterministic — identical on two attempts, several minutes apart. The command
was `sf publish -y --wait -m "Phase 3: households, members, and invites"`, so a
changelog message *was* supplied; whatever `-m` maps to, it is not this header.

**The CLI has no way to satisfy this.** Pinned at `spacefast@0.0.26`, which is
also the latest on npm:

- `sf publish --help` lists no `--rationale`.
- No `SPACEFAST_*RATIONALE*` environment variable exists anywhere in
  `node_modules/spacefast/dist/`.
- The only `extraHeaders` merge in the bundle is in the MCP client, not the
  publish path. There is no generic header-injection lever.

**And it is undocumented.** `rationale` does not appear in
`https://spacefast.com/docs/zero.md`, `/docs/agents.md`,
`/docs/agents/publishing.md`, or the bundled offline docs — `sf docs rationale
--all` answers "No reference docs match rationale." The error's `Learn more`
link goes to the generic `validation_error` page, which explains the RFC 9457
envelope and says nothing about this header, what an "agent mutation" is, or how
to supply a rationale.

**We are not authenticated as an agent.** `sf whoami` reports
`Justin Tadlock (justintadlock@gmail.com)`, a human account with a device
login, and the CLI sends `x-spacefast-client: spacefast-cli/0.0.26`. So the
"agent mutation" classification is being made somewhere on the platform side,
for a plain human CLI publish, and the CLI it is classifying cannot answer it.
Net effect: **the space cannot be published to at all.**

### 👍 The failure is clean this time

Worth saying, because the 2026-08-24 publish bug was not. The space came out
healthy:

```
Space: Larder Log   Status: active   Live URL: https://larderlog.view.fast/
* v2 (live) status=ready source=git@91b1999
  v1          status=ready source=git@216003f
```

No orphan v3, no unreconciled operation, no wedge. `/`, `/api/status`, and
`/client.js` all still answer 200 from v2. Failing *before* creating a version
is the right place to fail.

**One wrinkle:** the `Updating space` step succeeds before the version step
refuses, so a publish that cannot possibly complete still patches the space
config. A precondition this absolute should be checked first, before anything is
written.

**Suggestions.**

1. Give the CLI a `--rationale` flag and a `SPACEFAST_RATIONALE` env var — or,
   simpler, send the `-m` changelog message as the rationale, since it is
   already a human-written explanation of the publish.
2. Point the error at a page that documents the header, what counts as an
   "agent mutation", and which principals it applies to. `validation_error` is
   the right *code* and the wrong *destination*.
3. Don't let a released CLI be locked out by a policy it predates. If agent
   attribution is now required, the CLI that agents are told to use needs to
   ship the field in the same release.

### 🐛 …because the npm channel is a release behind the binary channel

Follow-up, same day. The fix exists; it is just not where the project gets its
CLI from.

| Channel | Latest | Published |
|---|---|---|
| npm `spacefast` | **0.0.26** | 2026-08-22 |
| `github.com/spacefast/cli` releases (what `install.sh` uses) | **0.0.27** | 2026-08-25 01:24Z |

Our publish attempts were a few hours after 0.0.27 shipped. Verified by
downloading the release artifact and checking it against the manifest —
`spacefast-darwin-arm64.gz` matched both the packed and unpacked sha256 in
`latest.json` — then reading its strings:

```
sf publish --target preview --rationale "Share the reviewed preview" --json
  "Publish a preview with the audit rationale required by agent credentials."

rationale: string().trim().min(1).max(1024)
  .describe("State in your own words why this execution is necessary.
             Spacefast stores this text in the audit record.")
```

So 0.0.27 adds the `--rationale` flag that satisfies the policy, and the phrase
"required by **agent credentials**" says the requirement is keyed to the
credential rather than the environment — consistent with what we saw, where the
publish failed identically inside and outside an agent shell.

**The real bug is the channel split.** A server-side policy landed that rejects
every publish from 0.0.26, and the CLI release that answers it went to the
binary channel only. Anyone pinned to the npm package — which is how a
JavaScript project naturally installs a JavaScript tool, and what `sf init`
leaves you with — is locked out of publishing with no upgrade path on that
channel and no error message that names the version.

**Suggestions.**

1. Publish both channels in the same release. If npm is a supported way to get
   the CLI, a policy that requires a newer CLI cannot ship before npm has it.
2. Name the fix in the error: "this account requires `--rationale`, added in
   CLI 0.0.27; you are running 0.0.26" turns a dead end into a one-line fix.
   The CLI already sends `x-spacefast-client: spacefast-cli/0.0.26`, so the API
   knows the version it is refusing.
3. Document `--rationale` and what an "agent mutation" is. It appears in the
   0.0.27 binary's own help and nowhere on the docs site.

### 🐛 The 0.0.27 standalone binary cannot compile a Zero capsule

Having installed 0.0.27 to get `--rationale`, the publish fails earlier than
before:

```
Error: ResolveMessage: Cannot find package 'esbuild' from
'/$bunfs/root/spacefast-darwin-arm64'
Code: unexpected_error
```

The standalone CLI is a Bun single-file executable. esbuild's **JavaScript** is
bundled into it — the binary's strings still carry
`// ../../node_modules/.pnpm/esbuild@0.27.7/node_modules/esbuild/lib/main.js` —
but esbuild resolves its own package directory at runtime to locate its
**native** helper binary, and that resolution fails inside Bun's virtual
filesystem (`/$bunfs/root/`). Bundling esbuild this way cannot work; the native
half has to exist on disk.

This lands on Zero projects specifically, since the capsule compile is what
needs esbuild. The same binary presumably publishes a static site fine, which is
how it passed whatever testing it had.

**The two bugs compose into a lockout.** A server policy rejects publishes from
0.0.26. The CLI that answers it, 0.0.27, is on the binary channel only. And the
binary channel's build cannot compile the runtime the policy is blocking. A Zero
project installed from npm — the way `sf init` leaves you — has no working
publish path at all today.

**Workaround.** esbuild honors `ESBUILD_BINARY_PATH`, and the binary's bundled
copy still reads it (`ESBUILD_BINARY_PATH = process.env.ESBUILD_BINARY_PATH || …`).
Pointing it at the native esbuild that the npm CLI already installed —
`node_modules/spacefast/node_modules/@esbuild/darwin-arm64/bin/esbuild`,
version 0.27.7, matching the version compiled into 0.0.27 exactly — should let
the standalone binary compile. Which means the fix depends on having the npm
package installed alongside the standalone binary that replaced it.

**Suggestion.** Ship the native esbuild beside the standalone binary and set
`ESBUILD_BINARY_PATH` at startup, or drop the standalone build's claim to
support Zero until it can compile one.

### 😕 0.0.27 also changed credential storage, and the migration prompts

First run of 0.0.27 stopped at a bare `password data for new item:` prompt —
macOS `security` asking for a value on stdin. The binary shells out to
`security add-generic-password … -U -w` and feeds the token in; from an
interactive terminal it hung there instead, with no explanation of what was
being asked for or why. It reads exactly like the tool asking for your Mac
login password, which is the one thing you must not type into it.

`SPACEFAST_CREDENTIAL_STORE=plaintext` restores the 0.0.26 file-based store and
skips it — discovered in the binary's own error text, documented nowhere.
Moving credentials into the OS keyring is a good change; doing it silently
during an unrelated publish, on a release that a server policy has just made
mandatory, is a lot of new failure surface at once.

### 🐛 …and finalize fails again, at the same stage as yesterday

With the header attached, the publish gets all the way through and then dies at
the last step:

```
✓ Updating space   larderlog (spc_7770744a870a43f5927213fa397c780e)
✓ Creating version ver_da36789d34044bbd9e95466c13235913
✓ Uploading files  16 files
⠋ Finalizing version
Not found.
Learn more: https://spacefast.com/docs/errors/runtime_api_not_found
```

The version record:

```json
{ "ref": "v3", "status": "failed",
  "failureCode": "runtime_api_not_found", "failureMessage": "Not found.",
  "failedStage": null, "manifestHash": null,
  "fileCount": 16, "filesAddedCount": 0, "filesChangedCount": 0,
  "pendingUploads": [ "__spacefast/zero/deploy.json", ".claude/CLAUDE.md", … ] }
```

`POST /v1/spaces/{id}/versions/{id}/finalize` is the call. The documented
resolution for `runtime_api_not_found` — *"Send the request with the management
hostname as the Host header. Spacefast does not serve management routes on
public hostnames."* — is advice for a caller hitting the runtime management API
directly, which is not what the CLI is doing here; it is posting to
`api.spacefast.com` exactly as it did for the successful v2. So this reads as
the platform failing to reach its own runtime management endpoint while
installing the capsule.

**This is the same stage that broke on 2026-08-24**, when every publish failed
at `version_finalize` with an internal 406 and the failed operations never
reconciled, wedging three spaces. Today it is a 404 with a different code. The
finalize stage has now been the failure point on two of the three days this
project has existed.

**Better than yesterday:** the space did not wedge. `Status: active`, v2 is
still live and serving, and the failed v3 is recorded as `status=failed` rather
than left dangling. Whatever reconciliation was added since yesterday is
working. `filesAddedCount: 0` with a non-empty `pendingUploads` does suggest the
version's manifest never reconciled, but it is marked failed rather than
pretending otherwise.

Not retried, deliberately — yesterday's wedge came from repeated attempts
through a broken finalize.

## 2026-08-25 — Docs review: one fix, and the gap the day's bugs sit in

Checked the docs against what this log recorded on 2026-08-24.

### 👍 The programmatic-fetch 403 is fixed

Yesterday's first entry: `https://spacefast.com/docs/zero.md` and `/setup.md`
returned **403** to a plain `curl`, so the page an agent is explicitly told to
fetch was the one page it could not read, and every fetch here needed a spoofed
desktop User-Agent.

Both now return **200** with no User-Agent games, and the content is
byte-identical to what the spoofed fetch returns. That was the single biggest
day-one friction and it is gone. Thank you.

*(Project note: the browser-UA workaround in `CLAUDE.md` can be simplified when
someone next touches it. Left in place for now — a plain `curl` works, so the
instruction is merely redundant rather than wrong.)*

### 😕 Nothing about today's blockers has reached the docs

Searched `zero.md`, `cli.md`, `publish.md`, `agents/publishing.md`, and
`llms.txt`:

| Term | zero.md | cli.md | publish.md | llms.txt |
|---|---|---|---|---|
| `rationale` | 0 | 0 | 0 | 0 |
| "agent mutation" | 0 | 0 | 0 | 0 |
| `SPACEFAST_CREDENTIAL_STORE` / keyring | 0 | 0 | 0 | 0 |
| `--spa` / "SPA fallback" | **0** | yes | yes | yes |

So the requirement that blocked every publish today is documented nowhere, and
neither is the credential-store change that stopped the CLI at a bare
`password data for new item:` prompt.

The 0.0.27 binary also references an error page that does not exist:
`errors/invalid_elevation_request` returns **404** on the docs site, as do
`elevation_required` and `rationale_required`. The CLI ships pointing at
documentation for a system the site has not published.

**The `--spa` row is its own small lesson.** The flag *is* documented — in
`cli.md` and `publish.md`. It is `zero.md`, the one file a Zero developer is
told is "the whole runtime reference", that advertises `Router`, `Routes`,
`Route`, and `useParams` and never mentions that unmatched paths 404 unless SPA
fallback is on. The fact was published; it just wasn't where the person who
needs it is reading.

### Dating any of this is not possible from outside

No `Last-Modified` header on any docs page — only content-hash ETags — and
`sitemap.xml` carries no `<lastmod>`. So "what changed since yesterday" can only
be answered by diffing against copies you kept. A `lastmod` in the sitemap, or a
visible "updated" date on each page, would make the docs auditable for anyone
tracking a moving platform.

## 2026-08-25 — Shipping a webfont: possible, but every signpost says otherwise

Zero has no webfont mechanism. Working around that took four dead ends and one
piece of luck, and three of the four dead ends are silent.

### 🐛 `theme.json`'s `fontFace` is discarded without a warning

`theme.json` is WordPress theme.json v3, and in WordPress a `fontFamilies`
entry carries a `fontFace` array that self-hosts the files:

```json
{
  "fontFamily": "Fraunces, ui-serif, Georgia, serif",
  "slug": "disp",
  "fontFace": [
    { "fontFamily": "Fraunces", "fontWeight": "100 900",
      "src": ["file:./fonts/fraunces.woff2"] }
  ]
}
```

`zero-compile` reads `slug` and `fontFamily` and drops everything else on the
floor — `tailwind-core.js`, `presetRecord(typography, "fontFamilies",
"fontFamily")`. No warning at compile, none in `sf publish --dry-run`, nothing
in `artifact.json`. The block simply evaporates.

This is the worst shape a limitation can take: the format is borrowed from a
system where the key means something, and the key is accepted and ignored. A
developer who writes it has no way to learn it did nothing except by loading the
page and squinting at the letterforms.

**Suggestion:** either honor `fontFace`, or warn on an ignored key. The compiler
already validates — `isSafePresetValue()` drops values containing `;{}`, also
silently. One `console.warn` per dropped key would have saved the whole
investigation.

### 😕 Three more routes closed, which is what made the limit look absolute

For completeness, because each was checked before the workaround was found:

| Route | Result |
|---|---|
| `theme.json` → `fontFace` | ignored, silently |
| A `<link>` in `index.html` | no authored shell; `compile.js` generates it from a fixed template |
| A CSS entry point / `@import` | none exists; `@plugin` and `@config` are rejected |
| `/__spacefast_generated/theme.css` | 404 on both `sf dev` and the published space |

The docs' own summary — "a `theme.json` at the project root adjusts the palette
and typography the utilities compile against" — reads as though typography is
fully covered. Four of the five things a developer would try are closed and none
of them says so.

### 👍 The tokens the compiler *does* emit are exactly right

The one piece of luck, and it is genuinely good design. Each family becomes:

```css
--font-disp: var(--wp--preset--font-family--disp, Fraunces, ui-serif, Georgia, serif);
```

That is a complete `font-family` stack. `font-disp` is a working utility
already; the only missing link is a rule telling the browser where "Fraunces"
lives. And an `@font-face` rule is a DOM node, which nothing in the compile
pipeline can take away. So a ~40-line client module that appends a `<style>`
to `document.head` at boot closes the gap, with **no change to `theme.json` and
no change to any component**.

The workaround is small because the token design is good. Worth saying, since
the rest of this entry is complaints.

### 🐛 `sf dev` does not serve the publish payload — the inverse of the SPA bug

The font files ship as static assets in `fonts/` at the project root. That works
on a published space: confirmed against live v2, where `/LICENSE.md`,
`/package-lock.json`, and `/tsconfig.json` all return 200 with correct content
types. (`/sf.jsonc` and `/theme.json` 404 — shadowed by name — and dot-paths
403, both already logged.) The uploader even sniffs magic bytes and tags a
`wOF2` file as `font/woff2` with no configuration.

Under `sf dev`, none of it serves. Every unrecognized path returns the SPA
shell:

```
$ curl -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
    http://127.0.0.1:4174/fonts/inter-latin-wght.woff2
200 text/html; charset=utf-8 1829

$ # …and a path that does not exist at all:
$ curl … http://127.0.0.1:4174/fonts/nope.woff2
200 text/html; charset=utf-8 1829

$ # …and a file that demonstrably serves in production:
$ curl … http://127.0.0.1:4174/LICENSE.md
200 text/html; charset=utf-8 1829
```

Only the generated assets are real locally: `/zero.css` (40715b, `text/css`)
and `/client.js` (124702b, `application/javascript`).

**This is precisely the inverse of the deep-path bug logged on 2026-08-25
above.** There, `sf dev` served paths the published space 404s. Here, `sf dev`
404s — well, shells — files the published space serves. Same root cause, a dev
server whose routing is unrelated to production's, pointing opposite ways on
consecutive features. Both times the local result is the *misleading* one, and
both times the only way to find out is to publish.

**Suggestion:** serve the publish payload from `sf dev`, or at minimum make the
shell fallback conditional on `--spa` so an unmatched path 404s locally exactly
as it will in production. A `200 text/html` for a `.woff2` request is a
uniquely unhelpful answer: the browser rejects it as a font, and the network tab
shows a success.

### 😕 Net cost

Roughly an hour, almost all of it spent establishing that four documented-looking
routes do nothing. The actual fix is 40 lines and four files. A single line in
`zero.md` — "Zero does not load webfonts; `fontFace` is ignored; ship files as
static assets and declare `@font-face` yourself" — would have made it fifteen
minutes.

### Coda: we went with Google Fonts, and the reason is the dev server

Every finding above stands — the silent `fontFace` discard, the closed routes,
the payload asymmetry. But the self-hosted approach they add up to was **built,
verified, and then abandoned**, because of the one thing that matters most in
practice: it does not work in local development.

Fonts are one of the easiest things on the web. One `<link>`, or one
`@font-face`. Zero removes both files, which is defensible on its own — the
tokens it emits in exchange are well designed. What is not defensible is that
the workaround still doesn't work locally, because `sf dev` serves no project
static file at all and has no flag to make it. `sf dev --help` lists
`--state-backend`, `--watch-interval`, and `--allow-network`; nothing for static
assets.

So a developer restyling their app cannot see their own typography until they
publish. On this project that is worse than it sounds, since publishing has been
blocked for two days by the `x-spacefast-rationale` issue logged above. The only
way to see a self-hosted font was to fix an unrelated platform bug first.

Pointing at `fonts.googleapis.com` sidesteps all of it in one line — a remote
URL is a remote URL in both environments. That is a fine outcome for this app
and a poor advertisement for the platform: the escape hatch that works is the
one that sends your users to a third party, and the one that keeps them on your
own origin is the one you cannot test.

**Two changes would close this, in order of value:**

1. **Serve the publish payload from `sf dev`.** Whatever `sf publish
   --dry-run` would upload should be reachable locally at the same path. This
   is the fix; everything else is mitigation.
2. **Say so in `zero.md`.** One line — "Zero does not load webfonts;
   `theme.json`'s `fontFace` is ignored; declare `@font-face` yourself and
   serve the files from a URL" — turns an hour into fifteen minutes. Ideally
   with the caveat that a self-hosted path won't resolve under `sf dev`.

## 2026-08-25 — Checked for movement: none on our blocker, but a rebrand is in preview

Re-checked everything this project depends on. Nothing that blocks us has moved.

### The docs have not changed

`https://spacefast.com/docs/zero.md` is **byte-identical** (19126 bytes) to the
copy fetched at 11:37 today. Since the site still exposes no `Last-Modified`
and no sitemap `lastmod`, diffing a kept copy remains the only way to answer
"did this change" — the point made at the end of the docs-review entry above.

### The publish blocker is unchanged

- **npm is still on `0.0.26`.** Published versions end `0.0.23, 0.0.24, 0.0.26`.
  `0.0.27` — the only CLI that can send `x-spacefast-rationale` — remains
  binary-channel only. Publishing is still blocked for exactly the reason
  logged yesterday.
- **`rationale` still appears in no documentation.** Zero hits across `/ai`,
  `/docs/cli.md`, `/docs/publish.md`, and `/docs/errors.md`. A requirement that
  hard-fails every agent-attributed publish is now two days old and documented
  nowhere.

### A rebrand is in preview: "Stattic"

Found at `https://space-xzbpj0kbj.view.fast/` — a Spacefast-hosted space
carrying a proposed replacement marketing site. Canonical `https://stattic.net/`,
which currently 301s to `https://spacefast.com/?ref=stattic.net`. Branded "By
Automattic", and it carries an internal notice: *"Automatticians: Stattic is
experimental… do not promise availability or move customer workloads here
without talking to the Stattic team."*

Recording it because the positioning is a straight repositioning to static
publishing — "The publishing layer for AI-made stuff", permanent URLs,
immutable versions, claim — and **the Zero runtime does not appear in it at
all**. The site's full route table has `/docs`, `/docs/errors`, and
`/docs/platform-api`; there is no `/docs/zero`. Searching the compiled bundle
finds no `capsule`, no `sf publish`, no `sf dev`, no `view.fast` — the only
"Zero" hit is the marketing phrase "Zero tools".

**This is not evidence that Zero is going away**, and it should not be read as
such. The live `/ai` document still states plainly: *"Spaces serve static files;
app code runs only through a declared Zero or Functions runtime."* Zero remains
a declared, supported runtime. A marketing site omitting a developer runtime is
a marketing decision.

Two smaller notes:

- **"Functions" is a runtime we have never seen mentioned** — it appears in
  `/ai` and nowhere in this project's notes or in `zero.md`. Unknown whether it
  is shipped, planned, or the successor to something.
- If the rebrand lands, the hostnames change: `stattic.net`,
  `api.stattic.net`, and `*.stattic.site` replace `spacefast.com` and
  `*.view.fast`. `larderlog.view.fast` is a published, claimed URL whose entire
  pitch is that it never moves.

### Speculation, flagged as such

Our publish has failed twice at `finalize` with **`runtime_api_not_found`** —
the stage that activates a *runtime* version. That error, unresolved across two
days, alongside a rebrand whose story is static-only, is at least worth holding
as a hypothesis: the runtime API may be mid-migration rather than briefly
broken. No evidence either way, and the docs assert Zero is supported. But it
would explain a two-day failure better than a transient fault, and it is a
question worth asking the team directly rather than waiting out.

### 😕 `sf dev` hardcodes the page title and ignores `sf.jsonc#meta.title`

Small, but it is the tab you look at all day. The **built** shell honours the
config — `.spacefast/zero/public/index.html` carries `<title>Larder Log</title>`
after adding `meta.title` to `sf.jsonc`. The shell `sf dev` serves does not:

```
$ grep -o '<title>[^<]*</title>' .spacefast/zero/public/index.html
<title>Larder Log</title>

$ curl -s -b "spacefast_zero_dev_4173=$CAP" http://127.0.0.1:4173/ | grep -o '<title>[^<]*</title>'
<title>Spacefast Zero dev</title>
```

The two shells differ in more than the title — 1829 bytes served against 1889
built — so `sf dev` is generating its own rather than serving the compiled one.
That is defensible for a dev harness, but it means the one identity setting the
platform *does* expose is invisible in development and only correct after a
publish. Same shape as the static-asset gap logged above: local and production
disagree, and local is the misleading one.

**Suggestion:** read `meta.title` in the dev shell too. It is one string, and it
is the difference between a tab that says what you are building and one that
says what tool you are building it with.

### 😕 …and there is still no way to declare an icon

`zeroHostedAppShell()` takes a title and nothing else. No favicon, no
`apple-touch-icon`, no `theme-color`, no manifest link — and no head hook to add
them. Declaring an app icon is table stakes for something whose pitch is
"publish a page and keep it", and it is the second thing after webfonts (D31)
that has to be injected into `document.head` from client code to exist at all.

**Suggestion:** let `sf.jsonc#meta` carry `icon`, `themeColor`, and `manifest`,
and emit the corresponding tags. The config block already exists; it just stops
at `title`.

## 2026-08-25 (evening) — Re-checked the publish blockers: nothing has moved

All four checks from this morning, run again at the end of the day.

| Check | This morning | Now |
|---|---|---|
| npm `spacefast` latest | 0.0.26 | **0.0.26** |
| `rationale` in the docs | 0 hits | **0 hits** (`/ai`, `cli.md`, `publish.md`, `errors.md`, `zero.md`) |
| `docs/zero.md` | 19126 bytes | **19126, byte-identical** |
| `larderlog.view.fast` | live, v2 | **live, v2** — `/api/status` returns `ok` |

The published bundle still carries the pre-Cellar palette (7 hits for the old
hexes), which is the cleanest confirmation that nothing has shipped since
2026-08-24.

`sf publish --help` still exposes no rationale flag and no environment variable
that could carry one — the full env surface is `SPACEFAST_{API_URL,
CLAIM_TOKEN, GIT_*, PROFILE, PUBLISH_MESSAGE, SOURCE_TYPE, SPACE, TEAM, TOKEN,
YES}`. `PUBLISH_MESSAGE` is the closest thing by name and is not the same
header.

**So the position is unchanged:** the only ways out remain npm shipping 0.0.27,
or the platform dropping the `x-spacefast-rationale` requirement, or fixing
`finalize`'s `runtime_api_not_found`. Two days now, and none of it is written
down anywhere a developer would look.

Worth noting what has accumulated behind this: the entire Cellar reskin — new
palette, dark mode, typography, drawer, collapsed rail, item sheet, sort menu,
icons — is built and unpublishable. The gap between what runs locally and what
is live grows every day the blocker stands, and none of it can be verified by a
second person until a publish succeeds.

---

## 2026-08-25 (late) — Multi-household work: three good notes, one sharp edge

Nothing publish-related was attempted; the blocker above is unchanged. This is
what a day of ordinary capsule work turned up.

### 👍 Query arguments work exactly as the type declarations promised

`useQuery(name, ...args)` and `query(async (ctx, householdId: string) => …)`
compose without ceremony. Three queries now, one of which takes an argument that
changes on a click, and the client re-subscribes with no extra plumbing. This is
the feature that was invisible in the docs (see the 2026-08-24 entry) — **one
example with an argument in `/docs/zero.md` would still be worth writing**,
because every example there still takes only `ctx`.

### 👍 `ctx.invalidate()` addresses a query by name, and that is the right call

A query that takes an argument is still invalidated by its name alone, so a
mutation does not have to know which household ids are currently subscribed.
Worth documenting explicitly — the alternative design (invalidate one argument
variant) is plausible enough that a reader has to guess.

### 👍 Endpoints remain the only way to test server logic without a browser

`endpoint()` with a writable `ctx.db` and a real `ctx.auth` let us verify the
multi-household authorization path — a user who is `owner` in one household and
`viewer` in another, `item:write` allowed in the first and refused in the second
— in one request, then delete the endpoint. There is no other way to exercise a
handler locally: there is no test harness for capsule code, no way to invoke a
mutation from a script, and `sf dev` issues a single fixed identity. **A
first-class way to call a query or mutation from the CLI — `sf dev invoke
<name> [args…]` — would replace this whole dance.**

### 😕 `sf dev` has `--port` but the failure mode does not mention it

Starting a second dev server while one is running prints a bare
`EADDRINUSE: address already in use 127.0.0.1:4173` with an eight-frame oclif
stack trace and no hint that `-p/--port` exists. The flag is in `sf dev --help`
(which itself is not discoverable from `sf --help`, per the earlier entry). A
one-line "another dev server is already on 4173 — pass `--port` to run a second"
would cost nothing.

Two dev servers on different ports coexist cleanly otherwise, with separate
in-memory state and separate capability tokens. That is genuinely useful and
nowhere documented.

---

## 2026-08-26 — Built-in row timestamps: what they actually guarantee

Context: a feature request to store a created and a last-modified date on
items, terms, and households. The answer turned out to be "Zero already does
this", but the docs state it in one clause and never say what the semantics
are, so we verified them against a running `sf dev` before relying on them.

### 👍 `createdAt` / `updatedAt` exist on every row, and the reservation is enforced early

`sf init`'s own `AGENTS.md` says every row "gets `id`, `createdAt`, and
`updatedAt` for free (those names are reserved)". Both halves hold, and the
reservation is enforced at three separate layers rather than silently:

- `table()` throws `Field name "createdAt" is reserved for Lakebed metadata.`
- `insert()`'s parameter type is `Omit<Row, "createdAt" | "id" | "updatedAt">`,
  so a stray write is a typecheck error, not a runtime surprise.
- The dev runtime throws `Zero manages households.createdAt; app code cannot
  set it directly.` if you get past both.

Failing at schema-definition time is the right call — this is exactly the class
of mistake that would otherwise ship as a column that silently never updates.

### ❓ …but the update semantics are documented nowhere, and they are the whole feature

"Gets them for free" does not say whether `updatedAt` is stamped once at insert
or bumped on every write — and a *created* date and a *modified* date that are
permanently equal is a common enough platform wart that we could not assume.
Neither `/docs/zero.md` nor the scaffolded `AGENTS.md` answers it.

Verified by hand, via a throwaway endpoint that inserted a row, spun 25 ms, and
patched it (endpoints are still the only way to exercise a handler without a
browser — see the 2026-08-25 entry):

```
before  createdAt 2026-08-26T13:52:23.457Z   updatedAt 2026-08-26T13:52:23.457Z
after   createdAt 2026-08-26T13:52:23.457Z   updatedAt 2026-08-26T13:52:23.482Z
```

So: both stamped at insert, `createdAt` immutable across `update()`, `updatedAt`
bumped by exactly the elapsed time. ISO 8601 UTC with millisecond precision, so
it string-compares correctly — the same encoding `invites.expiresAt` already
leans on (D24).

**One sentence in the limits list would remove the need for any of this:**
"`createdAt` is stamped at insert; `updatedAt` is rewritten on every `update()`."

### 👍 An empty patch still bumps `updatedAt`

`update(id, {})` rewrites `updatedAt` rather than short-circuiting. That is
load-bearing for us and not obviously intended, so it is worth stating in the
docs either way: our `updateItem` always calls `items.update()` even when the
edit only touched join-table rows, which means an item's "last modified" moves
when you retag it. Had the empty patch been a no-op, that would have been a
silent hole.

Both local state adapters agree, for what it's worth — the in-memory store sets
`updatedAt: nowIso()` unconditionally, and the SQL-backed one folds `updatedAt`
into the entry list before its `if (entries.length === 0)` early return, so the
early return is unreachable whenever the column exists.

**Not verified on a hosted runtime**, because publishing is still blocked (see
the 2026-08-25 entries). Local only.

### 🐛 `sf db dump` fails with `zero_db_connect_failed` while the space itself is healthy

Tried to confirm the timestamps on real rows in the live v2 space. Every dump
fails:

```
$ npx sf db dump --table items
Zero database dump failed.
```

`--json` gives the useful part, which the human-readable output withholds
entirely:

```json
"details": {
  "runtimeDetails": { "table": "items", "zero_db_code": "zero_db_connect_failed" },
  "runtimeCode": "zero_db_dump_failed",
  "status": 500, "attempts": 1
}
```

- space `spc_7770744a870a43f5927213fa397c780e`, version
  `ver_ee0c717d360d428692c066e6ffd7e340`
- requestId `b4503d08-4ba1-4fcb-9bfc-64bcecf2453f`
- HTTP 500, marked `retryable: true`; retries do not help
- **`https://larderlog.view.fast/api/status` returns `200 ok` throughout**, so
  the runtime is serving fine and only the admin dump path cannot reach the
  database

Two things worth fixing: the bare message should carry `zero_db_connect_failed`
without needing `--json`, and `retryable: true` on a persistent connect failure
sends you into a retry loop that cannot succeed. The recovery hint (`sf doctor`)
does not mention that the space may be perfectly healthy while this fails.

---

## 2026-08-26 — Building the destructive-actions pass: three sharp edges, all self-inflicted but all avoidable

Context: implementing undo toasts, confirm modals and a typed confirmation.
Touched `theme.json`, `server/index.ts`, and a dozen client components. Nothing
here blocked us for long, but each cost a full dev-server restart cycle to
diagnose because the failure surfaces nowhere near the cause.

### 👎 `theme.json` is strict JSON while `sf.jsonc` is JSONC, and nothing says so

Added two palette entries with a `//` comment above them explaining why they are
theme-independent — the same commenting style `sf.jsonc` uses two files away.
`sf dev` refuses to start:

```
theme.json is not valid JSON: Unexpected token '/', ..."" },

				// The foc"... is not valid JSON
```

The message is clear once you see it, and it fails fast, which is right. But the
asymmetry is not documented anywhere: `sf.jsonc` announces its dialect in its
own extension, and `theme.json` looks like the same class of hand-edited config
file. **Either accept comments in `theme.json` too, or say "strict JSON, no
comments" in the styling docs.** A design token is exactly the kind of value
that wants a note explaining why it exists.

### 🐛 The `location:` scanner false positive fires on an *object key*, again

Known from 2026-08-24 and still worth reporting, because it caught us a second
time in a file that already carries a comment warning about it. A throwaway
endpoint returned a plain object:

```js
const out = { location: await countLoc(loc.id), type: ..., store: ... };
```

`sf dev` refused to reload:

```
Zero dev reload failed: Zero source server/index.ts references unsupported
server global location.
```

`const loc = ...` was fine; the bare `location:` **object key** was not.
Quoting it (`'location':`) is the entire fix. The scanner is doing a text match
rather than resolving identifiers, so any property, method or shorthand named
`location`, `document` or `window` trips it.

Two things would fix this without a real parser: **say which line it found**, and
**say that quoting resolves it**. Right now the error names the file and the
global and nothing else, and the natural reading — "you referenced the browser
`location`" — is false, which sends you looking in the wrong place. This is a
pantry app; `location` is one of its three core nouns, so it will keep happening.

### 👍 A reload failure leaves the previous runtime serving, and says so every poll

Worth calling out as a good decision. When the reload failed, `sf dev` kept the
last good runtime up and repeated the error once per watch interval. So `GET /`
still worked, the client kept running, and the log made it obvious the source
was not live. Compare with the failure mode it avoids: an endpoint that returns
the SPA shell for an unrecognized path (see 2026-08-25) looks *identical* to an
endpoint whose file failed to compile. The repeated log line is the only thing
that distinguishes them — **keep it**.

### 😕 A `--dry-run` artifact hides the schema one level down, and an empty read looks like D27's disaster

Checked the artifact after editing `server/index.ts`, per our own rule that a
table can vanish while typechecking perfectly. Read `artifact.json` looking for
a top-level `schema`, got nothing, and briefly believed the capsule had shipped
empty again — the exact failure that cost us a publish on 2026-08-24.

It had not: the schema is under `server.schema`, and all nine tables were there.
But **"no tables" and "I looked in the wrong place" produce the same output**,
and the consequence of the first is severe enough that the tooling should make
them distinguishable. `sf publish --dry-run` prints a six-line summary — folder,
files, bytes, mode, SPA, target — and **none of it mentions the capsule**. One
more line, `Schema 9 tables · 3 queries · 16 mutations · 1 endpoint`, would make
the check we are told to do unnecessary, and would have caught the original bug
at the moment it happened.

### 👍 Endpoints remain the way to prove a handler rule, and the in-memory backend makes it cheap

Verified the new "a term is deletable only once nothing references it" rule by
inserting a household, two items, a type and a store, counting through the
`by_type` / `by_store` indexes, and deleting it all again in one request. In
memory, so nothing survived the restart and no cleanup could be forgotten. The
counts came back right and the refusal sentence came back verbatim.

Still the only way to do this — restating the ask from 2026-08-25: **`sf dev
invoke <name> [args…]`** would replace the whole dance.
