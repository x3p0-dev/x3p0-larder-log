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
