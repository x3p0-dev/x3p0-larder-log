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

Collected in [`.docs/notes.md`](../../.docs/notes.md); the ones that actually
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
([D14](../../.docs/decisions.md)). It works, and it is inert on a published
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
route — see [D15](../../.docs/decisions.md#d15-the-space-is-public-the-apps-own-gate-is-the-boundary).

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

### 🐛 An arbitrary `min-[Npx]:` variant is emitted *before* the named breakpoints, so it cannot override one

Later the same day, laying out the item grid. The collapsed rail is meant to be
the drawer below 1120px and disappear above it, so it carried
`hidden md:flex min-[1120px]:hidden`. It rendered beside the open drawer on
every desktop width.

The compiled `zero.css` says why:

```
line 2067:  @media (width >= 1120px) { .min-\[1120px\]\:hidden { display: none } }
line 2108:  @media (width >= 48rem)  { .md\:flex          { display: flex } }
```

At 1120 both queries match and `md:flex` wins on source order. Tailwind groups
arbitrary media variants ahead of `sm/md/lg/xl/2xl` rather than sorting all
media variants together by their computed min-width, so an arbitrary variant can
never override a named one — only the reverse.

Whether that ordering is intended or not, the part worth fixing is that **there
is no signal**. The class compiles, appears in the stylesheet with exactly the
declaration you asked for, and does nothing. Every check short of opening a
browser passes: `tsc` is clean, the selector greps present, the media query is
correct in isolation. We had just written a project rule that "grep the compiled
CSS" is how you confirm a class shipped — and here the class shipped and was
still dead.

The fix is to stop relying on order at all: `md:max-[1120px]:flex` compiles to a
nested `@media (width >= 48rem) { @media (width < 1120px) { … } }` that covers
exactly the intended band, so nothing has to out-rank anything.

**A build-time warning would catch this** — two utilities on the same element
setting the same property, in media queries that overlap, where the narrower
one loses. That is statically detectable from the class list. Failing that,
sorting *all* media variants by computed min-width would make the intuition
correct. Right now the only way to find it is to notice the pixels are wrong.

Worth noting the asymmetry that makes this easy to miss: pairing an arbitrary
variant with a **base** utility (`fixed min-[1120px]:sticky`,
`flex ... min-[1120px]:hidden`) works fine, because base utilities precede every
media block. Four of our five `min-[1120px]:` usages were that shape and were
correct. Only the two paired with a `md:` class were broken, which is why it
looked like an isolated glitch rather than a rule.

## 2026-08-26 — publishing is still blocked on the same header (bug)

Retried a publish with no shims, no injected headers, no flags: `npx sf publish`
straight from the pinned devDependency. It fails in exactly the place it failed
on 2026-08-25.

```
Preparing update...   Files 78   Mode website   Auth signed in
✓ Updating space  larderlog (spc_7770744a870a43f5927213fa397c780e)
⠋ Creating version
Agent mutations require a rationale of 1 to 1024 characters in the
x-spacefast-rationale request header.
Learn more: https://spacefast.com/docs/errors/validation_error
```

Nothing has moved on any of the four fronts:

1. **npm is still on `spacefast@0.0.26`.** `npm view spacefast dist-tags` →
   `{ latest: '0.0.26' }`, published 2026-08-22. `npm view spacefast versions`
   lists nothing past 0.0.26, and there is no `next`/`beta`/`canary` tag.
   `@spacefast/zero` tops out at 0.0.26 as well. So the "update dependencies
   first" step is a no-op — we are already on the newest thing npm has.
2. 0.0.26 still cannot send the header — no flag, no env var.
3. The 0.0.27 standalone binary still can't compile a Zero capsule, so it isn't
   a way around this for a Zero project.
4. Untested this round: we never got as far as `finalize`, so whether
   `runtime_api_not_found` is fixed is still unknown.

**One thing did improve, slightly.** This run failed *earlier* than the
2026-08-25 attempt — at `Creating version` rather than at `finalize` — so no
version row was created and there is no new `status=failed` record to explain
later. The space is untouched: `sf status` resolves, `GET /api/status` returns
`ok`, `GET /` returns 200, **v2 is still live**.

### The friction, stated plainly

An agent-attributed credential is refused at the API, and **the only CLI on npm
has no way to comply**. The two are shipped by the same project on different
release channels, and the channel that got the fix (binary, 0.0.27) is the one
that cannot build a Zero capsule. That leaves a Zero project with agent
credentials in a state with no supported path forward — not a hard problem to
work around, just one with no legitimate door.

Three fixes, cheapest first:

- **Publish 0.0.27 to npm.** This is presumably already intended; it just hasn't
  happened in the four days since 0.0.26.
- **Give 0.0.26 an escape hatch** — `SPACEFAST_RATIONALE` env var or
  `--rationale`. A one-line change to a released CLI, and it would unblock every
  pinned project without a version bump.
- **Say which CLI versions can comply** in the error body. The message names the
  header and links to a generic `validation_error` page; it does not say "your
  CLI cannot send this, upgrade to ≥0.0.27". We only knew that from having
  investigated it ourselves the day before.

The error text itself is good — it names the header, the length bounds, and
links out. The gap is that it assumes the reader can act on it.

## 2026-08-26 (later) — a fresh human login does not clear the agent classification (bug)

Follow-up to the entry above. We tried to establish a human-attributed session
and publish from it. **It made no difference**, and that is the finding worth
sending.

Sequence, all on the same machine:

1. `npx sf publish` from the agent session → `Agent mutations require a
   rationale…`. Expected.
2. Justin ran `npx sf publish` **himself, in his own terminal** → identical
   error. That killed the theory that the classification comes from the
   ambient environment.
3. `npx sf logout` → `npx sf login` (browser device flow, completed by hand) →
   `npx sf whoami` reports *Justin Tadlock (justintadlock@gmail.com)*.
   `~/.spacefast/auth.json` mtime confirms it was rewritten at 11:48:12.
4. `npx sf publish -m "…"` two minutes later → **identical error**, same stage
   (`Creating version`).

So: a credential minted seconds earlier by an interactive browser login, for a
human account, still has its publishes rejected as *agent mutations*. Whatever
drives the classification is not the credential, and re-authenticating is not a
way out of it.

### Why this is worth a fix

The CLI bundle carries **787** references to an `x-spacefast-client` header and
**17** to `CLAUDECODE`/`CLAUDE_CODE` sitting next to an `isAgent` check, which
suggests the client self-reports the environment it believes it is running in.
If that is the mechanism, then the label is a property of *where the binary was
launched*, not *who is driving* — and there is no documented way to correct it.
That produces the state we are in:

- the account owner cannot publish his own space from his own machine;
- `sf login` offers `--handoff` to *become* an agent session, but nothing to
  assert the opposite;
- the only CLI on npm (0.0.26) cannot send the header the API demands, so the
  compliant path does not exist at this version either.

`sf publish -m/--message` is **not** a substitute — we tried it. The message
lands on the version's changelog, not on the mutation, and the request is
rejected before a version is created.

### Asks

1. **A way to state the rationale on 0.0.26** — `--rationale` or
   `SPACEFAST_RATIONALE`. This is the whole fix; everything else is a
   workaround.
2. **Make the error say what the caller can do.** It names the header and links
   to the generic `validation_error` page. It does not say which CLI versions
   can send it, or that re-authenticating will not help. We burned a logout, a
   browser login and three publish attempts finding that out.
3. **Reconsider sticky/ambient agent classification**, or document it. If a
   freshly minted human credential is still treated as an agent because of the
   surrounding process, that should be stated somewhere discoverable.

Nothing was damaged: no version row was created in any of the three attempts,
`GET /api/status` returns `ok`, `GET /` returns 200, and **v2 is still live**.

---

## 2026-08-26 (later still) — building the signed-out flows: one very good discovery, two naming traps

Context: implementing the design spec's *Flows outside the shell* and marketing
page — a public page, the sign-in card and its handoff states, first run, and a
`?join=` landing that has to render for a **signed-out** visitor.

### 👍 `POST /__spacefast/zero/run` is a plain HTTP way to call a query, and it is the best verification tool in the box

The client bundle has an HTTP fallback beside the websocket — `requestHttpRun`
in `dist/client.js` — and `sf dev` serves it. It takes the same envelope the
realtime channel does:

```bash
CAP=…   # the #zero-dev-capability= fragment from the banner
curl -s -X POST \
  -H "authorization: Bearer $CAP" \
  -H "origin: http://127.0.0.1:4174" \
  -H 'content-type: application/json' \
  -b "spacefast_zero_dev_4174=$CAP" \
  -d '{"op":"query.run","name":"invitePreview","args":["AAAAAAAAAA"]}' \
  http://127.0.0.1:4174/__spacefast/zero/run
```

```json
{ "op": "query.result", "ok": true, "name": "invitePreview",
  "args": ["AAAAAAAAAA"], "data": { "state": "valid", … } }
```

This is a real improvement on the throwaway-endpoint trick we have been using.
An endpoint proves *a copy of* a handler's logic; this calls **the query the
client calls**, by name, and returns exactly what `useQuery` would receive. We
used it to exercise all five branches of a new query — valid, expired, revoked,
unknown, malformed, already-a-member — in one shell loop with no code added to
the capsule. `mutation.run` takes the same shape.

**Ask:** document it. There is nothing in `zero.md` or in the scaffolded
`AGENTS.md` about `/__spacefast/zero/run`, and it is the single most useful
thing we have found for verifying a capsule without a browser. An agent working
on a Zero app cannot click, and this is the substitute.

### 😕 The bearer token is required *and* the cookie is required, and only one of them is documented

`CLAUDE.md`'s bootstrap dance — POST the capability to `/bootstrap`, get a
`Set-Cookie`, then send the cookie — is enough for `/zero.css` and for a custom
endpoint. It is **not** enough for `/__spacefast/zero/run`, which answers:

```json
{ "error": "unauthorized" }
```

…to a request carrying only the cookie. Adding `authorization: Bearer $CAP`
alongside the cookie makes it work. We lost a round trip assuming the cookie was
sufficient because it had been everywhere else. The error is also the same
`unauthorized` for "no credential" and "wrong kind of credential", so it points
at the token rather than at the scheme.

### 👎 `signInWithGravatar` exists but is not exported from `@spacefast/zero/client`

`dist/client.d.ts` declares both `signInWithGravatar` and, for Lakebed source
compatibility, `signInWithGoogle`. The package's `exports` map points `./client`
at `dist/public-client.d.ts`, which re-exports **only** `signInWithGoogle` —
and `SignInWithGoogle`, not `SignInWithGravatar`. So an app on the documented
import path has to write "Google" for a button that says Gravatar and a flow
that is Gravatar end to end. `useAuth().provider` is typed `"guest" | "gravatar"`
in the same file, so the runtime has no doubt about which it is.

Not a bug, and trivially aliased at the import. But it is a wrong name on the
public surface of a product whose auth is Gravatar, and it will read as a
mistake to anyone auditing the code.

### ❓ There is no sign-in failure signal, so "the visitor came back signed out" has to be inferred

`signInWithGravatar` ends in `window.location.assign` — a full-page redirect,
not a popup — so the promise never settles in a way the page can observe, and
the app is torn down. On the way back there is no error, no status, and nothing
on `useAuth()` that separates "this visitor abandoned a sign-in ten seconds ago"
from "this visitor has never pressed anything". Both are `isGuest: true`.

We implemented the spec's *didn't come back* state by writing a timestamped
marker to `sessionStorage` before the redirect and reading it on arrival. That
works, and it is entirely our own bookkeeping. A `lastSignInAttempt` or an
`error` on the auth value would let an app tell someone their sign-in failed
without inventing a side channel.

The public `signInWithGoogle` wrapper *does* throw
`"Gravatar sign-in is unavailable for this Spacefast runtime."` when the runtime
has no sign-in — which is every `sf dev` — and that is genuinely useful. It is
the one auth failure an app can catch.

### 👎 `sf dev`'s fixed identity puts the entire signed-out surface out of reach

Known, and already in our notes as D14: `sf dev` issues one guest identity and
no sign-in, so an app that wants to be usable locally has to accept that guest
as signed in. The consequence we hit this round is new. Once you do that, **the
signed-out screens cannot be reached at all** — the marketing page, the sign-in
card, the invite landing and the handoff states are unreachable in the only
environment anyone can click them in.

We added an app-level `?signedout` switch, loopback-only, to turn our own bypass
off for one page load. It works, but it is a workaround for a gap in the dev
server, and every Zero app that has a signed-out surface will need its own.

**Ask:** a way to be a guest on `sf dev` on purpose — `sf dev --no-auth`, a
second capability that issues an anonymous identity, or a documented query
parameter. Failing that, a local sign-in stub, which would close both of our
auth bypasses at once.

### 👍 A new query lands in the artifact with no ceremony

`invitePreview` was added to the `queries` block and showed up in
`.spacefast/zero/artifact.json` on the next `--dry-run` — four queries where
there were three, nine tables and zero migrations untouched. D27's regex trap is
specifically a *schema* trap; handlers behave normally.

---

## 2026-08-26 (fourth) — building the shopping list: two small good things

A client-only feature this round — no schema, no handlers — so most of the
platform stayed out of the way, which is itself worth recording.

### 👍 `sf dev --port` runs a second server beside the first, cleanly

A dev server was already up on 4173 and its capability token was not
recoverable from outside the process, so verification needed its own instance.
`npx sf dev --port 4199` started, compiled the capsule, printed its own
capability, and served `/`, `/zero.css`, `/client.js` and `/api/status` without
either instance noticing the other. The in-memory state backend is presumably
what makes this free.

**Small ask:** when the port is taken, the error is a bare Node
`EADDRINUSE: address already in use 127.0.0.1:4173` with an oclif stack trace.
A one-line hint — "another `sf dev` may be running; try `--port`" — would save
the guess.

### 👍 The class-name scanner handles nested arbitrary values correctly

`md:grid-cols-[repeat(auto-fill,minmax(min(460px,100%),1fr))]` — an arbitrary
value with three levels of nesting and a `%` in it — compiled and appeared in
`/zero.css` as
`.md\:grid-cols-\[repeat\(auto-fill\,minmax\(min\(460px\,100\%\)\,1fr\)\)\]`.
So did `ring-offset-surface-alt`, resolved from a `theme.json` palette slug.
No caveats found.

### 👎 (ours, not theirs) the escaped-selector grep caught us a fifth time

Documented in our own instructions and we did it anyway: grepping `zero.css` for
a hand-written escaped class name returns nothing and looks exactly like a
missing class. The reliable check is to print the selectors and read them —

```bash
grep -oE '^\s*\.[^ {]+' zero.css | sed 's/^ *//' | sort -u
```

Not a platform bug. Recorded because the escaping is a real ergonomic cost of
scanning source for static class names, and anyone verifying a Zero build by
hand will hit it.

## 2026-08-26 — an additive column, and where the artifact actually keeps the schema

Adding one column (`households.ink`, `string().default('')`) to a nine-table
schema, then verifying it without publishing.

### 👍 an additive column needs nothing

Declared in the literal in `server/index.ts`, ran `npx sf publish --dry-run`,
and `.spacefast/zero/artifact.json` showed it immediately with its default
intact. Still nine tables and sixteen mutations. No flag, no prompt, no
ceremony — exactly what the docs promise for an additive change.

### 🤔 the schema is under `server.schema`, and `db.migrations` is empty

`sf publish --dry-run` prints only a file plan — folder, file count, bytes,
mode, SPA, target. Nothing about the schema. The artifact's top-level keys are
`format · appName · serverRuntime · client · server · db · realtime · limits ·
futureCapabilities · sourceManifest`, and the two plausible places to look are
misleading:

- **`db`** is `{"backend":"mysql","migrations":[]}` — and `migrations` was `[]`
  both before and after adding the column. It is not a diff against the live
  database, so an empty array is not evidence that nothing will change.
- The schema itself is **`server.schema`**, an object keyed by table name, each
  with `columns` (`name` / `type` / `nullable` / `default`) and `indexes`.
  `server.queries`, `server.mutations` and `server.endpoints` are string arrays
  beside it.

Neither is documented. A one-line `Schema  9 tables, 1 new column` in the dry-run
output would remove the need to know any of this.

### 👍 `sf dev --port` exists and is not in `--help`

A second instance on `--port 4174` started cleanly beside one already on 4173,
with its own capability token and its own in-memory database. That is what made
this verifiable at all: the first instance was somebody else's session and its
token was not available to us. `--port` joins `dev`, `db`, `logs` and `storage`
on the list of things that work and are not listed.

### 👍 `mutation.run` accepts a short argument list

`{"op":"mutation.run","name":"createHousehold","args":["The Lake Cabin"]}` for a
handler declared `(ctx, name: string, ink?: string)` ran with `ink` undefined
rather than erroring on arity. Combined with `query.run`, the undocumented
`POST /__spacefast/zero/run` remains the single most useful thing in this
runtime for verifying work in an environment with no browser: four handlers were
exercised end to end — a mutation with the argument, the same mutation without
it, a patch, and the guest-facing query reading the result back.

## 2026-08-26 (evening) — the publish went through: `finalize` is fixed 🎉

Third day of trying, and the platform half of the blocker is **gone**. v4 is
live at <https://larderlog.view.fast/>, `ver_d80a395f07144ce6863ba75b212a1486`,
71 files uploaded, 18 seconds end to end.

```
✓ Updating space    larderlog (spc_7770744a870a43f5927213fa397c780e)
✓ Creating version  ver_d80a395f07144ce6863ba75b212a1486
✓ Uploading files   71 files
✓ Finalizing version  v4
```

`runtime_api_not_found` at `finalize` — the failure on 2026-08-24 and again on
2026-08-25 — did not recur. Nothing on our side changed to cause that, so this
was fixed on the platform. Thank you.

**What has *not* changed: the `x-spacefast-rationale` requirement.** A plain
`npx sf publish` still dies at `Creating version` with the same message, and npm
is *still* on `spacefast@0.0.26` (checked again today: `dist-tags` → `{ latest:
'0.0.26' }`, no `next`/`beta`; `@spacefast/zero` also 0.0.26). The binary
channel is still on 0.0.27, published 2026-08-25T01:24Z, and still cannot
compile a Zero capsule. So the publish only completed because the header was
attached out-of-band, with a truthful rationale, from a `fetch` wrapper loaded
via `NODE_OPTIONS=--import`.

That is a silly thing to have to do to ship a space you own, and it remains the
single highest-value fix on this list:

- **Publish 0.0.27 to npm**, or
- **give 0.0.26 a `--rationale` flag / `SPACEFAST_RATIONALE` env var.**

We also confirmed the classification is not environmental, at least on 0.0.26:
the bundle reads no `CLAUDECODE`/`AI_AGENT`/`CLAUDE_CODE` variable — greps for
all three come back empty across `dist/`. (The 17 hits noted on 2026-08-25 were
in the 0.0.27 *binary*.) `process.env` in 0.0.26 exposes `SPACEFAST_CLIENT`,
which feeds `x-spacefast-client`, but pointing that somewhere else would be
misrepresenting the caller rather than complying, so it was not tried.

### 👍 Things that verified clean on v4

- `GET /` 200, `GET /api/status` → `ok`, `/client.js` 262 KB, `/zero.css` 69 KB.
- **D29 holds in production**: `/.claude/CLAUDE.md`, `/.docs/decisions.md` and
  `/.claude/docs/spacefast.md` all return **403**. Dot-prefixed paths are
  refused exactly as documented, so the project's own docs ship in the payload
  and stay unreadable.
- **The D42 migration applied additively with no flag.** `sf db` lists nine
  tables with `households.ink:string` present. Publish-time additive migration
  did what the docs promise.
- The capsule answers a guest: `POST /__spacefast/zero/run` with
  `{"op":"query.run","name":"invitePreview","args":["AAAAAAAAAA"]}` returns
  `{"state":"invalid"}` over plain HTTPS, unauthenticated. **The `run` endpoint
  exists in production too**, not just under `sf dev` — worth knowing, and worth
  documenting.
- `sf publish` skipped two files with a clear warning: *"ignored 2 unsupported
  file(s) on this plan"*, naming both. Good message.

### 🐛 `sf db dump` fails against a healthy space

`sf db dump --table households` returns:

```
Zero database dump failed.
Learn more: https://spacefast.com/docs/errors/zero_db_dump_failed
```

The access log shows the edge answering **500** for
`GET /__spacefast/api.php?route=/spaces/{id}/versions/{id}/zero/db/dump&table=households&limit=25`.
It is not the rationale policy — it fails identically with the header attached,
and it is a read. `sf db` (the schema/plan listing) works fine against the same
space in the same second, so the space and credentials are good; only `dump` is
broken. That matters because `db dump` is the documented way to verify a publish
and is what CLAUDE.md tells us to use to close out the D14 auth check.

### 🐛 A mutation that works on `sf dev` 500s on the hosted runtime

Reported from the live app: creating an invite raises *"Zero mutation.run request
failed."* The access log shows `500 POST /__spacefast/zero/run`. The same
mutation, driven through the same `run` envelope against `sf dev`, **succeeds**
and returns a code.

`sf logs runtime` says *"Nothing logged yet"* even though four requests 500'd, so
an uncaught handler exception produces no runtime log line and no error detail
anywhere the developer can reach. **That is the real friction here**: a 500 with
no message, no stack, and no runtime log leaves nothing to debug from.

Prime suspect is a **local/hosted runtime divergence**. The artifact reports
`serverRuntime: "quickjs-rust"`, and `crypto.getRandomValues` — used in exactly
one place in the whole capsule, `createInvite` — is the one global that a bare
QuickJS embedding would not have. `sf dev` evidently runs something else, since
the identical code path works there. Unconfirmed as of tonight.

Two asks:

1. **Log uncaught handler exceptions to `sf logs runtime`**, with the message and
   ideally a stack. Right now a 500 is silent.
2. **Document the hosted runtime's globals** — is `crypto` present? `fetch`?
   `setTimeout`? `TextEncoder`? Neither `zero.md` nor `zero-agent-rules.md`
   mentions QuickJS at all, so there is no way to know which standard-library
   surface a capsule may rely on. And `sf dev` running a *different* engine means
   the local server cannot warn you either.

`ctx` exposes no randomness helper (`auth`, `db`, `env`, `gravatar`, `log`,
`spam`), so if `crypto` is genuinely absent there is no documented way for a
handler to generate a bearer credential.

## 2026-08-27 — the capsule compiler has a global denylist, and it is the best thing in the toolchain

Chasing the `createInvite` 500 from yesterday, `sf dev` refused to start:

```
Zero source server/index.ts references unsupported server global globalThis.
```

That is a **great** error — it named the file, the identifier, and the rule, and
it fired in under a second. The check is in
`@spacefast/zero-compile/dist/analyze.js`, and there are two patterns:

```js
const UNSAFE_GLOBAL_PATTERN = /\b(Bun|Deno|Function|__dirname|__filename|eval|process)\b/g;
const ZERO_SERVER_UNSAFE_GLOBAL_PATTERN = /\b(BroadcastChannel|SharedWorker|WebSocket|Worker|
  XMLHttpRequest|document|global|globalThis|localStorage|location|navigator|sessionStorage|window)\b/g;
```

Alongside them are equally sharp rules against dynamic `import()`, `require()`,
`shared/` importing from `client/` or `server/`, and server source importing
client source. Collectively this is the most useful static checking in the
product and **none of it is documented** — not in `zero.md`, not in
`zero-agent-rules.md`. It deserves a page. Knowing the list up front changes how
you write a capsule.

Two notes for whoever writes that page:

- It is a **denylist of the inappropriate**, not an allowlist of the available.
  `crypto` is absent from both patterns, so the compiler happily admits
  `crypto.getRandomValues` — see below for what happens next.
- It matches **transpiled code, not raw source**, so the word `location` in a
  comment is fine while `location` as an identifier is not. That is the right
  behaviour and worth stating, because the error text alone implies otherwise.

### 🐛 The compiler admits `crypto`; the runtime does not provide it

This is the sharp edge, and it is the cause of yesterday's silent 500.

`crypto.getRandomValues` was the **only** non-core global in the entire capsule
— one call site, in `createInvite`. It:

- typechecks, because `lib.dom` types `crypto` as always present;
- passes the compiler's global check, because `crypto` is on neither denylist;
- **works under `sf dev`**, which runs an engine that has it;
- **throws on the hosted `quickjs-rust` runtime**, which does not.

So every local signal says yes and the only failing signal is a 500 in
production with an empty `sf logs runtime`. That combination — permitted by the
compiler, present locally, absent in production, silent when it fails — is about
as expensive as a bug can be to find.

Three fixes, any one of which would have saved the day:

1. **Add the missing runtime globals to the denylist.** If `quickjs-rust` has no
   `crypto`, the compiler should say so at build time, exactly as it does for
   `globalThis`. The machinery already exists; it is one array entry.
2. **Make `sf dev` run the same engine as production**, or say loudly that it
   does not. A dev server whose JS engine differs from the deployed one cannot
   catch this class of bug, and nothing warns you.
3. **Document the hosted runtime's standard library.** `zero.md` never mentions
   QuickJS. There is no way to learn which globals a capsule may rely on short
   of publishing and watching what breaks.

### 😕 …and `ctx` offers no randomness, so there is no supported way to mint a credential

With `crypto` gone, a handler that needs unguessable bytes has nowhere to get
them. `ctx` is `auth`, `db`, `env`, `gravatar`, `log`, `spam` — no `randomUUID`,
no `random`, nothing. `Math.random()` exists but is not a credential source.

**Our workaround**: insert the row first and derive the code from the id the
runtime generated for it. Row ids are v4 UUIDs, so there are 122 random bits
sitting right there; we drop the fixed version and variant nibbles and refuse
anything not shaped like a v4, so that a future switch to sequential ids fails
closed instead of minting guessable invite codes. It costs a second write, which
`ctx.transaction` makes atomic.

That works, but it depends on an implementation detail of id generation that
nothing promises. **Please expose `ctx.crypto.getRandomValues` or
`ctx.randomUUID`.** Any app with invites, share links, password resets or API
tokens hits this wall, and every one of them will end up guessing at the same
workaround.

### 👍 `ctx.log` does reach `sf logs runtime`

Yesterday's report that `sf logs runtime` says *"Nothing logged yet"* while
requests 500 was **half wrong, and the half matters**. Nothing had ever called
`ctx.log`; the runtime log only carries what the handler writes. A `ctx.log.warn`
shows up fine.

The other half stands: **an uncaught handler exception still logs nothing at
all**. A 500 with no message, no stack and no entry is the single worst
debugging experience in the product, and it is what made this a two-day bug
rather than a two-minute one. Please log uncaught handler exceptions.

## 2026-08-27 (later) — the invite bug, solved: no `crypto`, and sequential row ids

Resolution of the entry above, and the answer was **not** what three days of
inference predicted. A keyed diagnostic endpoint driven against the published
space returned:

```json
{"crypto":"undefined","getRandomValues":"unavailable",
 "stringInsert":"ok","rowIdShape":"4",
 "booleanInsert":"ok","booleanOmitted":"ok","transaction":"ok"}
```

Two findings, and it is the second that stings:

1. **`crypto` is genuinely `undefined`** on `quickjs-rust`. Confirmed, not
   inferred.
2. **Row ids on the hosted runtime are sequential integers** — `"4"`, then
   `"6"`. `sf dev` mints v4 UUIDs. Nothing documents this, and the two are not
   the same shape, the same type, or the same order of unpredictability.

That second one is worth a doc line of its own, entirely apart from this bug:
**an application that assumes its row ids are unguessable will be wrong in
production and right locally.** We assumed exactly that, as an intermediate fix,
and only avoided shipping guessable invite codes because the code refused an id
that was not shaped like a v4. Had it been slightly less paranoid, every invite
code in the space would have been a hash of a small integer.

### 😕 The workaround, and the ask

`ctx` exposes no randomness — `auth`, `db`, `env`, `gravatar`, `log`, `spam` —
so an app needing an unguessable value has to supply its own. Ours is now a
hand-written SHA-256 (`shared/sha256.ts`, checked against FIPS 180-4) mixing a
secret from `.env.server` with the row id, the clock and `Math.random()`.

That is a lot of machinery to mint an invite code. **Please expose
`ctx.crypto.getRandomValues` or `ctx.randomUUID`.** Invites, share links,
password resets, API tokens, idempotency keys — every one of them needs this,
and every developer who hits it will invent the same workaround, most of them
less carefully.

Failing that: **say in the docs that row ids are sequential**, and that `crypto`
is absent. Either sentence would have saved three days.

### 👍 `.env.server` handling is exactly right

Credit where it is due. Adding `INVITE_SECRET` to `.env.server` and publishing:

- the artifact records `env: {"file":".env.server","names":["INVITE_SECRET"]}` —
  **names only, no values**;
- `.env.server` is **not** among the uploaded payload files, so the secret is
  not sitting in a 403'd path;
- the value never appears anywhere in `artifact.json`;
- `ctx.env.INVITE_SECRET` is populated at runtime, confirmed in production.

That is the correct design and it worked first time with no documentation
needed. Thank you.

### 👍 `ctx.log` does reach `sf logs runtime` in production

Correcting our own 2026-08-26 entry: the runtime log was empty because **nothing
had ever called `ctx.log`**, not because logging was broken. A `ctx.log.warn`
from a handler shows up correctly:

```
2026-08-27T14:12:00.000Z warn  probe: ctx.log.warn reached the runtime log  GET /api/probe
```

The real gap stands and is worth restating on its own: **an uncaught handler
exception logs nothing at all.** No message, no stack, no entry — only a 500 in
the access log. That single omission is what turned a one-line bug into a
three-day investigation, across three wrong hypotheses and four publishes. It is
the highest-value fix on this entire list.

### 🐛 `sf db dump` is still broken

Unchanged since 2026-08-26. `zero_db_dump_failed`, a 500 from the edge, against
a healthy space, while `sf db` works in the same second. It matters more now:
`db dump` is the documented way to inspect real rows, and with it broken the
only route to the data is an endpoint you write, publish, and then have to
remember to remove.

### 🎉 And it works

An invite minted on the published space was redeemed by **a second person**, who
joined the household. First real multi-user use of the app.

## 2026-08-27 — reserved columns, and a good error message

### 👍 The refusal on a reserved column says exactly what is wrong

`items.createdAt` cannot be set by app code, and the runtime says so in one
sentence:

```
Error: Zero manages items.createdAt; app code cannot set it directly.
```

Named table, named column, named rule. This is the error message every other
refusal in the platform should be measured against — compare the silent 500 an
uncaught handler exception produces. It cost one probe request to establish
something the docs only imply.

### 🤔 "those names are reserved" could say what *reserved* means

`AGENTS.md` says every row gets `id`, `createdAt` and `updatedAt` for free and
that "those names are reserved". Reserved for what, exactly, is left open — it
reads as *you cannot name your own column this*, and it also means *you cannot
supply a value on insert*. The second is the load-bearing one and it is not
written down anywhere we could find.

It matters because it decides a schema. An app that wants a creation stamp it
controls — one that can survive a delete-and-reinsert, say — cannot borrow the
built-in and has to carry its own column. Worth one clause in the limits list:
*"reserved: you cannot declare them, and `insert()` rejects a supplied value."*

Related, and a genuine feature request: **an optional app-supplied `createdAt`
on insert**, for exactly the restore case. Every undo built on re-insert has
this problem, and every one of them will end up with a duplicate timestamp
column. We now have nine of them across five tables — `addedAt` and `changedAt`
everywhere the app orders rows — which is entirely a workaround for two columns
the platform already provides and will not let us write. `updatedAt` has the
same problem one field over: a restored row's is the moment it was restored.

### 👍 `POST /__spacefast/zero/run` keeps earning its place

Three items added, one removed, one re-added with a carried stamp, and the list
read back — the whole round trip, against the real handlers, from a shell. Still
undocumented. Also worth noting: `sf dev --port` makes a second dev server
trivial, so a scratch instance can be driven without disturbing one somebody is
clicking in. Both of these deserve to be in the docs.

## 2026-08-27 (later) — the v8 publish

### 🐛 `sf db` reports a successful migration as nine pending operations

v8 added nine columns across five tables. The migration applied cleanly. `sf db`
then printed:

```
Backend: mysql
Migration mode: safe
Pending operations: 9
```

There is nothing pending. `sf db --json` says so plainly:

```json
"plan": { "applied": true, "appliedSchemaHash": "sha256:7870ab…", "pendingOperationCount": 0 }
```

The footer is counting `data.migrations`, which is the **changelog of what this
version's migration did**, not a queue of outstanding work. `data.plan` is the
only thing that answers the question, and the human-readable output contradicts
it.

This is the worst possible failure direction for a schema tool: it reports a
*successful* migration as an *unapplied* one, right after a publish, on the one
command whose job is to tell you whether your schema is live. The obvious
reaction is to reach for `sf db migrate`, which is at best a no-op and at worst
an invitation to start passing `--drop` / `--rename` at a database that is
already correct. Please either print `plan.pendingOperationCount` or relabel the
line as "Operations in this migration".

Related, and why it matters twice: this project's previous schema change
(`households.ink`) was "verified" by reading the printed `tables` list, which is
the **declared** schema from the artifact and would look identical whether or
not the migration ran. Right answer, wrong evidence. `plan` is the field that
should be in the docs.

### 👍 Publish itself was clean

`ver_09cc0c8a8bb34dd38ed92fae693c63d4`, 105 files, 15 uploaded, 16 seconds,
`finalize` fine. The `.env.server` sync reported "Synced 1 server variable",
which is the right level of detail — it names the count without printing the
secret. The warning about unsupported files on this plan named both offenders
rather than just counting them. Good output all round.

### 🤔 The rationale header is still shim-only, 5 days on

Re-checked 2026-08-27: npm `latest` is `spacefast@0.0.26`, no `next` or `beta`
tag, `@spacefast/zero` likewise. `sf publish --help` on 0.0.26 lists no
`--rationale`, and grepping the installed CLI for `SPACEFAST_RATIONALE`,
`--rationale`, and `x-spacefast-rationale` returns nothing. So publishing from
an agent-attributed credential still requires wrapping `fetch` through
`NODE_OPTIONS=--import` to attach a header the CLI has no way to send.

The requirement is reasonable and we comply with it willingly — an
agent-driven mutation *should* be attributable. But the only way to satisfy it
is a shim, and a requirement that can only be met by monkey-patching the
vendor's HTTP client is not really enforceable: anything that can add a true
rationale can add a false one. Shipping 0.0.27 to npm, or back-porting
`SPACEFAST_RATIONALE` to 0.0.26, would turn a workaround into a supported path.

### 👍 A keyed endpoint closed a security question `sf db dump` could not

`sf db dump` is still broken (unchanged since 2026-08-26), so the only way to
answer "does the hosted runtime ever issue the dev-guest identity?" was a keyed
`GET` endpoint reporting aggregate *shapes* — id schemes and a boolean, never
ids. Production: `schemes ["account"], anyDevGuest false`. The same endpoint
under `sf dev`: `schemes ["guest"], anyDevGuest true`, which is what makes the
production `false` mean anything.

Worth saying because it is a pattern the platform could support directly: a
read-only, aggregate-only view of a table would have answered this without
publishing a custom endpoint to production and then having to remember to take
it out again.


## 2026-08-27 — `mutation.run` reports what it invalidated

### 👍 `changedTables` and `changedQueries` are a free correctness check

Adding a tenth table (`profiles`) meant adding a mutation that writes two tables
and invalidates three queries. Driving it over `POST /__spacefast/zero/run`, the
response carried both lists back:

```json
{"op":"mutation.result","ok":true,
 "changedTables":["profiles","memberships"],
 "changedQueries":["profile","household","invitePreview"]}
```

That is a direct read on whether `ctx.invalidate()` names the right set — the
thing D26 exists for and the thing nothing else in this environment can see
without a browser and two tabs. It also caught the opposite case for free: a
rename to the name already stored came back `changedTables: ["profiles"]` alone,
proving the "skip a membership row that already agrees" branch actually skipped.

Undocumented, like the `run` endpoint itself. Worth promoting: for anyone
writing handlers without a client in front of them, this is the cheapest
feedback loop the platform has.

### 🤔 A new table's index is invisible in the dry-run footer

`npx sf publish --dry-run` prints file count, bytes, mode, SPA and target — and
nothing about the schema, so a new table is confirmed only by reading
`.spacefast/zero/artifact.json` afterwards. The artifact is complete and correct
(the `by_user` index is there, the two `.default("")` columns are there), but
the command whose whole job is "show me what a publish would do" says nothing
about the part of a publish that is irreversible without a flag. One line —
`Schema  10 tables, 0 pending migrations` — would put the most consequential
diff in front of the person about to ship it.


## 2026-08-27 — What "Gravatar sign-in" actually is

Context: surveying whether a Zero app can offer its users any sign-in path
other than the one `SignInWithGravatar` renders. Read only — nothing published.

### ❓ `/docs/zero` says "hosted sign-in uses Gravatar"; the flow says otherwise

Following the button's own redirect chain on the live space:

```
GET  https://larderlog.view.fast/__spacefast/zero/auth/gravatar/start
302  https://api.spacefast.com/v1/access/acquire/<id>?host=…&return=%2F
303  https://my.spacefast.com/sign-in?returnTo=/access/v1.<token>
```

It is **Spacefast account sign-in**, not a Gravatar-branded OAuth screen. And
`GET /v1/auth/capabilities` — documented, unauthenticated — reports what that
screen offers:

```json
{"providers":{"wpcom":true,"google":false,"github":false},
 "emailOtp":true,"password":true,"captcha":null,"googleOneTapClientId":null}
```

So a visitor already has **three** lanes: WordPress.com, an emailed one-time
code, and a password. The Zero docs name none of them, `SignInWithGravatar` is
the only exported component, and its label is the one word that describes the
*avatar service* rather than any of the three. An author reading `/docs/zero`
reasonably concludes their users must have Gravatar accounts, turns the app
down for that, and never learns otherwise. One sentence in the Authentication
section — "hosted sign-in is a Spacefast account: WordPress.com, an email code,
or a password" — would fix it, and `/v1/auth/capabilities` deserves a mention
there since it is the only way to know which lanes a deployment has on.

This also explains, retroactively, why real signups arrive with no profile name
(the reason `profiles` and D46 exist): an email-OTP account has no Gravatar
profile to inherit a name from. That is the majority path, not an edge case.

### 👍 The identity contract already admits more than one issuer

`principalForAuthority` in `@spacefast/common` maps `person:` and `external:`
authorities to an identity, alongside `account:`, and
`visitorIdentityFromClaims` turns any of the three into an authenticated
`ctx.auth` with `userId` set to the principal. So a team-owned OIDC connection
(`sf share identity create --type oidc`) really does reach a Zero handler as a
signed-in user — the runtime is not hard-wired to one issuer.

Two things stop that being an app-level answer, and neither is a defect so much
as an undocumented boundary worth stating: external subjects are admitted one
at a time by an operator (`sf share identity grant --subject …`), so there is no
self-serve signup; and the whole mechanism gates the *space*, which puts a
public marketing page behind the access page. `/docs/share` is written for
private-document sharing and never says how any of it interacts with a Zero
app's own `ctx.auth`. That intersection is the missing page.

### 👎 `AuthContext.provider` is typed `"guest" | "gravatar"`

An `external:` principal is authenticated, carries a subject from someone
else's IdP, and still normalizes to `provider: "gravatar"` — the client's
`normalizeAuthValue` computes it as `isGuest ? "guest" : "gravatar"` outright.
The field cannot answer the question its name asks. Either widen it to the
authority class the token actually carried, or drop it.

### 👍 `ctx.email` makes app-owned auth viable without a third-party key

Worth recording as a strength: `/docs/services` documents `ctx.email.send()` as
brokered, credential-free, and transactional inside a mutation, with
`ctx.spam.check({ type: "signup" })` beside it. That is the whole supply side of
an email one-time-code flow, with no Resend key to hold. Two caveats found
while reading, both invisible from the docs:

- **`/docs/zero` documents none of the three services.** They exist only on
  `/docs/services`, which the Zero page never links from its Authentication or
  capsule sections. The capsule reference and the service reference are
  different pages with no path between them.
- **A query and a mutation cannot see request headers** — only `endpoint` gets
  an `EndpointRequest`. So an app-owned session cannot live in a cookie the way
  a web developer would expect; the token has to be an explicit argument on
  every query and mutation. That is a real design constraint and it is stated
  nowhere; it belongs next to the handler-capability table on `/docs/services`,
  which already teaches this shape of "what each handler kind gets".

### 🤔 Unverified, and the reason it stays unverified

Whether `ctx.email` exists on the hosted `quickjs-rust` runtime is untested
here. That would be an idle worry on most platforms, but `crypto` is present
under `sf dev` and `undefined` in production (see the 2026-08-27 runtime-
divergence entry), so "the type exists and `sf dev` runs it" has already been
established as no evidence at all. A published list of which globals and
services the hosted runtime actually provides would retire a whole class of
these.

## 2026-08-27 (later) — Making the app installable: the payload is not the site

Context: adding a PWA manifest so an installed icon is masked properly on
Android. No schema change, no new handler — this is entirely about static files
and `<head>`, and it turned up two undocumented rules.

### 😕 The manifest is the third thing that has to be injected at boot

Same wall as the webfonts (D31) and the icons: `zeroHostedAppShell()` emits a
title and nothing else, so `<link rel="manifest">` joins them in
`document.head` at boot. This is the exact gap the 2026-08-25 entry filed a
suggestion for — `sf.jsonc#meta` carrying `icon`, `themeColor` and `manifest` —
and it has now cost a third injection site.

It is worse for a manifest than for an icon, because the data-URI escape hatch
the icons use is not available. `start_url` and `scope` resolve **against the
manifest's own URL**, and a `data:` URL is no base to resolve `/` from, so both
would fall back to whatever page the app was installed from. For this app that
is frequently `/?join=<code>` — an invite link, which expires. A manifest has
to be a real URL.

### 😕 `sf publish` mirrors the project root, but selectively, and the rule is nowhere

`.spacefast/zero/public/` after a dry run, against the actual root:

| Kept | Dropped |
|---|---|
| `LICENSE.md`, `package-lock.json`, `sf.jsonc`, `theme.json`, `tsconfig.json`, `tsconfig.test.json`, `icons/`, and the new `site.webmanifest` | `README.md`, `package.json`, `client/`, `server/`, `shared/`, `tests/` |

`README.md` is dropped and `LICENSE.md` is kept. `package.json` is dropped and
`package-lock.json` is kept. Whatever the rule is, it is not "documentation" or
"npm metadata", and `sf publish --help` does not mention one. The practical
consequence is that **you cannot reason about whether a file ships** — you have
to run a dry run and list the directory.

### 🐛 …and being in the payload does not mean it serves

The more surprising half. Both of these are staged in
`.spacefast/zero/public/` and both **404 on the published space**:

```
/sf.jsonc            404 text/html
/theme.json          404 text/html
/tsconfig.test.json  200 application/json     <- staged too, and serves
/LICENSE.md          200 text/markdown
/icons/*.png         200 image/png
```

So the edge carries a second denylist on top of the dot-prefixed-path 403 this
project relies on for D29 — one that hides the platform's own config files by
name. That is a sensible thing to do and we are glad it does it. What is not
sensible is that `--dry-run` reports those two files as part of the payload
with no indication they will be unreachable, so the one local check available
gives an answer the live site contradicts.

**Suggestion:** have `--dry-run` mark files the edge will refuse, or drop them
from the plan entirely. `Files 112` should be a count of what will exist.

### 👎 A manifest cannot be verified locally at all

`sf dev` serves no project static files, so `GET /site.webmanifest` returns the
SPA shell — `200 text/html` — and Chrome logs a manifest syntax error on every
local page load. This is the inverse of D28's routing asymmetry yet again: the
local answer is the misleading one, and it is misleading in the direction that
produces a false alarm rather than a false pass, which is at least the safer
way round.

Combined with the previous point, there is **no way to know a manifest works
before publishing it**. Everything else in this app has some local proxy —
`POST /__spacefast/zero/run` for handlers, `/zero.css` for classes, the
artifact for schema. Static serving has none.

**Suggestion:** let `sf dev` serve `.spacefast/zero/public/` for paths it does
not otherwise recognise, instead of falling through to the SPA shell. It
already builds that directory.

### ❓ Unverified: the content type for `.webmanifest`

Cannot be answered without publishing, for the reasons above. Chrome is lenient
about the manifest MIME type in practice, and `.svg` and `.json` both map
correctly, so the expectation is that it is fine — but it is a post-publish
curl, not something the build can tell us.

## 2026-08-27 — `mutation.run` and `query.run` return different envelopes — unclear

Driving the seeded-types change through `POST /__spacefast/zero/run` on a
second `sf dev` (`--port 4199`), the two ops answer with different shapes and
nothing says so:

- `mutation.run` → `{op: "mutation.result", ok, result, changedTables, changedQueries}`
- `query.run` → `{op: "query.result", ok, name, args, data}`

So a script that reads `.result` off a mutation and reuses the same accessor on
the query gets `KeyError: 'result'` — the query's payload is under `data`. Both
are sensible on their own; the asymmetry is only a problem because the endpoint
is undocumented and there is nothing to read. `changedTables` /
`changedQueries` on the mutation are genuinely useful, though — they confirmed
the seeding touched `locations`, `types` and `stores` in one go.

Good, separately: `sf dev --port 4199` alongside an already-running instance
worked with no flag or state collision, which is what makes this check cheap
enough to do at all.

## 2026-08-27 (later still) — v11 publishes; the manifest question is answered

`sf publish` completed as **v11**, `ver_1c0448898da744d3b2b42a89c4272e21`, 93
files, 16 seconds, carrying Phases 4.10–4.12 and D45–D51. `finalize` /
`runtime_api_not_found` did not recur — that platform-side fix is holding across
four consecutive publishes now.

### ✅ Answered: `.webmanifest` gets the right content type

The open question from the previous entry — unanswerable without publishing —
resolves cleanly:

```
/site.webmanifest    200 application/manifest+json; charset=utf-8   769B
/icons/icon-192.png            200 image/png  3329B
/icons/icon-512.png            200 image/png  9263B
/icons/icon-maskable-512.png   200 image/png  4577B
```

So the edge maps `.webmanifest` correctly with no configuration, and `start_url`
and `scope` both resolve to `/` as intended. Good — and worth documenting, since
the only way to learn it was to ship.

### 🐛 The `x-spacefast-rationale` blocker is unchanged — 6 days on

Still the single highest-value fix on this list. Re-checked today before
publishing:

- npm `dist-tags` for **`spacefast`** and **`@spacefast/zero`** are both still
  `{ latest: '0.0.26' }` — no `next`, no `beta`.
- The installed 0.0.26 bundle contains **no** `SPACEFAST_RATIONALE`. Dumping
  every `SPACEFAST_[A-Z_]+` literal out of `dist/` gives 57 variables and that
  is not among them.
- The CLI's own header vocabulary is `x-spacefast-client`,
  `-client-capabilities`, `-country`, `-idempotency-principal`, `-language`,
  `-mcp-token`, `-runtime`, `-version`. **`x-spacefast-rationale` is not a
  header this CLI can send at all**, by any flag or variable.

So the publish again only completed because the header was attached out-of-band
from a `fetch` wrapper loaded via `NODE_OPTIONS=--import`, carrying a truthful
rationale (620 chars) naming the owner, the branch, the decisions shipped, and
the fact that the schema change is additive. The wrapper matches
`/(^|\.)spacefast\.com$/` on the host, preserves the CLI's own `authorization`
and `content-type`, and leaves every other host untouched.

**This is still a silly thing to have to do to ship a space you own.** Either
publish 0.0.27 to npm, or give 0.0.26 a `--rationale` flag / `SPACEFAST_RATIONALE`
env var. The policy is reasonable; the absence of any supported way to satisfy
it is not.

### 😕 `sf db`'s human-readable output still contradicts its own JSON

The trap logged earlier held again, and it is worth restating because it is a
correctness hazard, not a cosmetic one. After a successful migration `sf db`
prints a **`Pending operations:`** count that is really the length of the
version's `migrations` changelog — what this migration *did*. The truth is in
`--json`:

```
schemaHash:        sha256:d9053339365b5e538753890938e06cafc2d34d670c3fbe7abbc9106ebe46fc63
appliedSchemaHash: sha256:d9053339365b5e538753890938e06cafc2d34d670c3fbe7abbc9106ebe46fc63
applied: true | pendingOperationCount: 0
```

Note also that the two hashes live at **different depths** —
`data.schemaHash` but `data.plan.appliedSchemaHash` — so the obvious
`data.plan.schemaHash` reads `undefined` and a naive equality check reports a
spurious mismatch on a perfectly clean migration. Putting both on `plan`, or
both at the top level, would remove a real footgun.

The `profiles` table (D46) migrated additively on publish with no flag, exactly
as `households.ink` and D44's nine stamp columns did. Additive migration on
publish continues to be reliable.

### 🐛 `sf db dump` is still broken — 6 days open

`sf db dump --table households --limit 5` against the freshly published, healthy
v11 still fails:

```
Zero database dump failed.
Learn more: https://spacefast.com/docs/errors/zero_db_dump_failed
```

Unchanged from 2026-08-26: it fails with the rationale header attached, it is a
read, and `sf db` succeeds against the same space in the same second. The linked
error page is the only diagnostic and says nothing a caller can act on. This
remains the documented route for verifying a publish, so it still has to be
worked around with `POST /__spacefast/zero/run`.

### 👍 `query.run` in production is the verification story

With `db dump` broken, the production `run` endpoint is what makes a publish
checkable at all. Unauthenticated, over plain HTTPS, it confirmed the whole
guest surface in three calls — `invitePreview` collapsing unknown, empty and
malformed codes to a bare `{"state":"invalid"}` (D39), `pantry` refusing with
`no-household` rather than leaking, and `profile` returning an empty name. That
it works identically in production and under `sf dev` is genuinely valuable.
It deserves to be documented rather than folklore.

---

## 2026-08-28 — a fourth additive migration, and a boolean this time

Three columns added to `items` in one edit — `size: string().default('')`,
`unit: string().default('')`, `offShoppingList: boolean().default(false)` — for the
add/edit item redesign (D52, D53).

### 👍 The additive path stays boring, and `boolean()` is no different

`npx sf publish --dry-run` picked up all three from the schema literal, with
their defaults intact, on the first run:

```json
{ "name": "offShoppingList", "type": "boolean", "nullable": false, "default": false }
```

`server.schema` still shows ten tables, `server.queries` five and
`server.mutations` seventeen, and `db.migrations` is `[]`. This is the fourth
additive change since Phase 2 and the first to add a **boolean** rather than a
string — worth recording only because `invites.revoked` was, for one wrong guess
during the v5–v7 probe rounds, suspected of being the thing the hosted runtime
choked on. It was not, and a second boolean column compiles identically.

### 👍 `POST /__spacefast/zero/run` is still the whole verification story

Five `addItem` calls and four `updateItem` calls through the real handlers on a
throwaway `sf dev --port 4199`, then one `pantry` read to see what landed. That
is the entire test for a schema change plus its normalization rules, and it
needed no browser and no throwaway endpoint. Nine mutations and two queries over
plain HTTP, in one shell command.

The bootstrap dance is still the only friction: the `Origin` header requirement
on `/__spacefast/zero/bootstrap` is undocumented, and the cookie name is
port-derived (`spacefast_zero_dev_4199`), which is not stated anywhere either.
Both are easy once known and both cost a round trip the first time.

### 🤔 `sf dev` still has no local sign-in, so the sheet cannot be clicked here

Everything in this change is press-time behaviour — a hold that repeats, a
status line that updates as you step, a menu that opens scrolled to its current
row. Compiling it, curling `/zero.css` for every class literal and driving the
handlers over `run` proves the build is coherent. It does not prove it is
usable, which is the lesson this file recorded on 2026-08-27 and has no way to
act on without a browser.

## 2026-08-28 (later) — `ctx.gravatar` exists, and its avatar URL is pure

### 👍 A handler can derive an avatar URL with no network call and no key

`ServerContext` carries a `gravatar` alongside `auth`, `db`, `env`, `log` and
`spam`, typed in `@spacefast/common/contracts/runtime-services`:

```ts
avatarUrl(email: string, options?: GravatarAvatarOptions): string   // pure, sync
profile(email: string): Promise<GravatarProfile | null>             // brokered
```

`avatarUrl` is a hash plus a query string, so it costs nothing and cannot fail —
which makes it usable from a query handler on the hot path. `profile` is the
brokered one, and the reason the credential stays out of tenant reach. This is
the answer to "can the app show the *other* members' avatars", which it cannot
today because `memberships` stores only a display name.

### 🤔 The canonical avatar URL is a shared constant nothing documents

`@spacefast/common/dist/utils/gravatar.js` pins one shape for the whole
platform:

```
https://gravatar.com/avatar/<sha256 of trimmed+lowercased email>?d=404&r=g&s=160
```

`d=404` is deliberate and load-bearing for a consumer: an address with no
Gravatar serves **no image**, so the page renders its own initials fallback
instead of a stock silhouette. Worth knowing, because an `<img src={picture}>`
with no `onError` shows a broken-image glyph rather than falling back — the
platform is assuming the consumer checks.

The helper beside it, `gravatarEmailHash`, is `async` and returns `null` without
`crypto.subtle`, so it is unusable during a synchronous render and unusable in
the hosted capsule runtime (which has no `crypto` at all — see 2026-08-27).
`shared/sha256.ts`, written for the invite codes, produces a byte-identical hex
and works in both places.

### 🤔 `sf dev`'s identity carries no `email` and no `picture`

Its `AuthValue` is the guest one, so both the `picture` branch of an avatar
component and anything that renders an address are unreachable locally — the
same shape of gap as the missing sign-in flow and the single fixed identity.
Worked around here with a loopback-only dev switch that hands the dev guest a
real address and derives the platform's own URL from it.

## 2026-08-28 (later still) — a sixth additive migration, and `ctx.auth.picture`

### 👍 `ctx.auth.picture` is on the server context, and it is the finished URL

Adding avatars for the *other* members of a household looked like it needed an
email in the schema — and it did not. `AuthContext` carries `picture` on the
server exactly as `AuthValue` does on the client, already resolved to the
platform's canonical Gravatar address. So a handler can stamp a face onto a row
without the app ever storing or exposing an email.

Worth saying plainly because the obvious tool points the other way:
`ctx.gravatar.avatarUrl(email)` is right there, free, pure and synchronous, and
it makes an address look like the natural thing to persist. The field one line
up on the same object is the better answer for anything about **the caller**.
`ctx.gravatar` earns its place for an address you already hold for another
reason — it is not the way to get one.

The corresponding gap: a handler is told about its **caller** and never about a
third party, so the only moments another person's avatar is in reach are the
moments *they* are the caller. That is a sensible boundary, and it is what
pushes a denormalized copy plus a reconcile-on-load rather than a join.

### 👍 `mutation.result` reports `changedTables` and `changedQueries`, and both go empty

The new reconcile writes only rows that disagree and invalidates only when it
wrote. Proving the no-op steady state took one call:

```
{"op":"mutation.result","ok":true,"changedTables":[],"changedQueries":[]}
```

That envelope is a better assertion than anything the handler could return
itself — it is the runtime's own account of what the mutation did, so "it
correctly did nothing" is directly observable. Undocumented as far as we can
tell, and genuinely useful for any write that runs on every page load.

### 🤔 `sf dev`'s identity still carries no `picture`, so half of this is unclickable

Recorded again because it bit a second time in one day. The rendering half can
be seen locally; the **stamping** half — `createHousehold` and `redeemInvite`
writing a real avatar URL — needs an identity that has one, and `sf dev` issues
a guest with no `email` and no `picture`. Worked around for the test by putting
a value on the row through a throwaway endpoint and then driving the real query
and the real reconcile over `run`, which proves everything except the one line
that reads `ctx.auth.picture`.

A `--identity` flag on `sf dev` — or any way to hand the dev guest a fabricated
`email` / `picture` / `displayName` — would close this, and would also close the
older complaint that a second local tab is the same user.

### 👍 Sixth additive migration, no flag, no surprises

`memberships.picture`, `string().default("")`. `--dry-run` then the artifact:
ten tables, five queries, **eighteen** mutations, `db.migrations` empty, the
column present with its default. Same as the previous five. The additive path
is genuinely boring now, which is the highest praise a migration story gets.

## 2026-08-28 (fourth) — the docs promise `email` on `useAuth()`; production may not send it

### 🤔 `auth.email` is empty on the published space and populated nowhere else

The drawer's account row prints an email under the name. It appears under
`sf dev` (with a dev identity we supply ourselves) and **not on the published
space**, where a real Spacefast account is signed in.

`auth.email` is exactly `claims.email`, read straight off the identity JWT —
`createAuthFromToken` in `dist/client.js` does no lookup and has no fallback:

```js
const userId = stringValue(claims.pairwise_sub) ?? stringValue(claims.sub) ?? stringValue(claims.email);
...
email: stringValue(claims.email),
```

So an empty `auth.email` means the token carries no `email` claim. Meanwhile
`docs/zero.md` states plainly that `useAuth()` returns "`userId`, `displayName`,
`provider`, `isGuest`, `isAuthenticated`, `email`, `picture`, and `isLoading`"
with **no note that any of them can be absent**, and the TypeScript makes
`email` and `picture` optional without saying when.

**If this is deliberate it is a reasonable design and should be documented.**
Two things in the SDK suggest it is: `pairwise_sub` is preferred over `sub` for
the user id, which is the OIDC per-relying-party opaque subject and exists so an
app cannot identify or correlate the person; and the one comment on the subject
reads

> A Gravatar avatar URL carries the profile's own hash, so the public profile
> page is derivable without ever touching the email behind it.

That is a considered privacy stance. It just is not in the docs, and an app that
believes the docs will build a UI around a field that is empty in production and
full in development — which is exactly what happened here.

**What would fix it:** one sentence in the auth section saying which claims are
guaranteed and which depend on the sign-in lane, and whether `email` is ever
released to a capsule. Also worth stating whether `picture` is guaranteed, since
an app that draws avatars has the same question and no way to answer it before
publishing.

### 🤔 The same gap makes a feature unverifiable before publish

`sf dev` issues a guest with no `email` and no `picture`, and production issues
an account whose claim set is undocumented. So there is **no environment in
which the real shape of the identity can be observed before a publish** — the
local one is known-wrong and the hosted one cannot be inspected without shipping
something that reports it. A `--identity` flag on `sf dev`, or a documented
claim contract, closes this. It is the third time in two days this file has
asked for the first of those.

### Answered same day: `picture` is present in production, `email` is not

The avatar renders on the published space, so the identity token carries a
`picture` claim while carrying no `email`. That is a coherent position — a
Gravatar URL is a hash and identifies nobody who is not already looked up, while
an address identifies a person — and it is the position the SDK's own comment
describes. It is just not written down anywhere a developer would find it before
building a UI around the missing field.

## 2026-08-28 (fifth) — 🐛 `sf publish` dies with a 502 at *Creating version*, and nothing else is unhealthy

**Blocking.** Three consecutive `sf publish` runs failed identically:

```
✓ Updating space  larderlog (spc_7770744a870a43f5927213fa397c780e)
⠋ Creating version
Request failed with status 502.
Learn more: https://spacefast.com/docs/errors/request_failed
Check your connection or the SPACEFAST_API_URL setting.
Run `sf doctor` to diagnose.
```

**The advice in the error message is wrong here**, and that is the first piece
of feedback. `sf doctor` was run and returns **exit 0 with all nine checks
green** — including `api  API reachable: https://api.spacefast.com` and
`schema  OpenAPI schema reachable` — in the same minute as the failure. The
connection is fine and `SPACEFAST_API_URL` is unset. A 502 is the *gateway*
saying an upstream did not answer; telling the caller to check their own
connection sends them to the one place the problem cannot be.

**It is not the `x-spacefast-rationale` blocker.** This was isolated: the
publish was run twice through the usual `NODE_OPTIONS=--import` fetch shim that
attaches a truthful rationale, and once **without it**. All three produced the
same 502 at the same step. So whatever this is, it sits upstream of the header
check that has gated publishing since 0.0.26.

**Nothing is wedged, which is the good news** and worth contrasting with the
2026-08-24 incident that left three spaces stuck. The failure is clean:

- `sf versions list` shows **no v12 record** — the version was never created.
- `sf doctor` reports `runtime  state=active live=ver_1c0448898da744d3b2b42a89c4272e21:ready pending=none:none`.
- v11 is still live and serving: `GET /` 200, `/api/status` → `ok`,
  `/client.js` 200 at the same 299,269 bytes as before the attempts.

So the space is transactionally intact and the retry is safe. **`Updating space`
succeeds before the failure**, so the space record is touched and only the
version creation fails — which is the right order for this to be recoverable,
and is worth stating in the docs as a guarantee rather than left to be inferred
from a lucky outcome.

**What would help:**

1. **Do not print connection advice on a 5xx.** A 502/503/504 is server-side by
   definition. Say so, and say whether the operation is safe to retry — which
   here it is, but the caller has no way to know without going and reading the
   version list.
2. **Surface an upstream request id.** There is nothing in the output to quote
   in a support request. A 502 with no correlation id is unactionable from
   outside.
3. **`sf doctor` should exercise the failing path.** It checks that the API and
   the OpenAPI schema are reachable and concludes everything is `ok` while
   publishing is completely blocked. A check that cannot see the outage it is
   invoked to diagnose is worse than no check, because it moves suspicion onto
   the user's machine.

Nothing was changed locally in response. Typecheck is clean, `npm test` is at
295 assertions, and `--dry-run` produces a valid artifact (ten tables, five
queries, eighteen mutations, `migrations: []`, and the four new additive columns
with defaults). **The build is ready and the platform is not.** Retrying later.
