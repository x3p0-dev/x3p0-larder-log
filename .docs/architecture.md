# Architecture

## Platform: Spacefast Zero

The app targets [Spacefast Zero](https://spacefast.com/docs/zero), a full-stack
runtime where one project holds a Preact client, a typed server "capsule", a
database schema, authentication, and storage. `sf publish` compiles the capsule,
applies database migrations, uploads the client, and activates the version.

This is a deliberate bet: Zero supplies the three things this app would
otherwise need a backend for — **a database, sign-in, and live multi-client
updates** — with no infrastructure to run.

## Project layout

```
larder-log/
  client/
    index.tsx          # exports App: the sign-in gate and nothing else
    Pantry.tsx         # the signed-in application
    components/
    hooks/
      usePantryData.ts # the ONLY module importing @spacefast/zero/client
      usePersistentState.ts  # theme override only — everything else is server
      useSystemTheme.ts
    lib/
      theme.ts         # the Theme object, status colors, chip styles
      palette.ts       # what each color token LOOKS like in this theme (D32)
      controlStyles.ts # hover/active/focus class names — DRAWER_* and PAGE_*
      fonts.ts         # the Google Fonts <link>, injected at boot (D31)
      appIcon.ts       # title, favicons and theme-color, injected at boot
      icons.ts         # the lucide components behind shared/icons.ts keys (D23)
      actions.ts       # the taxonomy action shape
      pendingInvite.ts # holds an invite code across sign-in (D28)
  server/
    index.ts           # capsule(): the schema, 2 queries, 16 mutations
    schema.ts          # ReadDb / WriteDb only — the tables CANNOT live here (D27)
    auth.ts            # membershipState / requireMembership / requireCapability
  shared/              # imports NOTHING — see below
    types.ts           # Item, Term, QueryState — the domain vocabulary
    roles.ts           # the D20 capability matrix; can()
    identity.ts        # who counts as signed in (the dev-guest bypass)
    membership.ts      # D33's read-heals/write-refuses rule; D22's last-owner guard
    invite.ts          # code generation, 14-day expiry (D24)
    joinLink.ts        # ?join=<code> links: build, parse, strip, group (D28)
    palette.ts         # WHICH color tokens exist — no colors in it (D32)
    term.ts            # name/ink validation
    icons.ts           # icon KEYS (the components live in client/lib) (D23)
    seed.ts            # starter taxonomies for a new household
    qty.ts             # the string <-> integer boundary (D4)
    status.ts          # out / low / ok derivation (D9)
  tests/shared.test.ts # 111 assertions; `npm test`, no runner
  icons/               # favicons and PWA icons; served at /icons/ in production
  theme.json           # the palette and type scale, as light-dark() pairs
  .docs/               # these documents — dot-prefixed to stay out of the
                       #   publish payload's web root (D29)
  .claude/CLAUDE.md    # project instructions, dot-prefixed for the same reason
  .claude/docs/        # mockup, platform feedback log, Zero's own AGENTS.md
  sf.jsonc             # runtime config
  theme.json           # WordPress theme.json v3 — see Styling
  tsconfig.json        # strict; `npm run typecheck`
  .env.server          # server-only secrets, synced on publish (none yet)
```

`shared/` is the important one. It imports nothing — not Preact, not the Zero
runtime — so the capsule can use the same `normalizeQty` the form uses instead
of a second copy of the rule that drifts from it. It is also the only part of
the app that is directly testable, which is why the authorization matrix, the
one-household rule, the last-owner guard, and the dev-guest bypass all live
there rather than in `server/`.

`client/hooks/usePantryData.ts` is the other boundary worth protecting: it is
the only module that imports `@spacefast/zero/client`. Components take plain
data and callbacks, so nothing below it knows the platform exists.

`sf.jsonc` must name both entries or the publish fails:

```jsonc
{
  "$schema": "https://spacefast.com/schemas/sf.json",
  "name": "Larder Log",
  "runtime": {
    "kind": "zero",
    "server": "server/index.ts",
    "client": "client/index.tsx"
  }
}
```

## How data flows

There is no REST layer and no client-side cache to wire up.

```
client                          server capsule                database
------                          --------------                --------
useQuery("items")      ────►    query(ctx => ctx.db...)  ────► rows
   ▲                                                            │
   └──── live re-render ◄──── subscription ◄────────────────────┘

useMutation("addItem") ────►    mutation(ctx, args)      ────► write
```

`useQuery()` subscribes. Any mutation that touches the underlying rows
re-renders every open tab — which is exactly the two-people-editing-at-once
requirement, for free.

**Queries take arguments.** Every `query()` example in the public docs takes
only `ctx`, which made this look impossible and shaped an early design detour.
The type declarations settle it: `useQuery(name, ...args)` is supported, as is
`usePaginatedQuery(name, argsRecord)`. Household switching can therefore take a
household id as a parameter rather than needing server-side "active household"
state.

**All validation lives on the server.** The client never writes rows directly.
Every mutation trims, clamps, and authorizes before it touches `ctx.db`.

## Authentication

Zero gives every visitor a stable **guest identity** that can own rows, and
hosted **Gravatar** sign-in upgrades that same browser session to an
authenticated identity. `useAuth()` returns `userId`, `displayName`, `provider`,
`isGuest`, `isAuthenticated`, `email`, `picture`, `isLoading`. The same identity
is `ctx.auth` in every server handler.

**We require sign-in.** Guests see a sign-in screen and nothing else. See
[decisions](decisions.md#d2-require-sign-in-no-guest-mode).

## Authorization

Zero has **no row-level security**. Ownership is entirely our job, and it is the
single largest correctness risk in this app.

The rules, which every handler must follow without exception:

1. **A `householdId` from client arguments is a selector, never an authority.**
   Since [D33](decisions.md#d33-a-user-may-belong-to-several-households) a
   caller may belong to several households, so one has to be named — but naming
   it proves nothing. Look the id up among the caller's own memberships
   (`ctx.auth.userId` via `memberships`) and work from the row you find, or
   refuse.
2. **Re-read before you write.** For any update or delete, `get()` the row,
   confirm its `householdId` matches the caller's, then write.
3. **Reject guests** in every handler that writes. Check `ctx.auth.isGuest`.

4. **Never `.first()` a membership lookup.** A user's memberships come back in
   whatever order the index returns, so `.first()` is a coin toss dressed as an
   answer. Which household a request is about is decided by one of two pure
   functions in `shared/membership.ts`, and which one you call depends on
   whether you are reading or writing.

**A read heals, a write refuses**
([D33](decisions.md#d33-a-user-may-belong-to-several-households)). A query
honors the household the client asked for, and falls back to a deterministic
default when the caller is no longer a member of it — a stale selection should
repair itself, not strand someone. A mutation matches exactly or throws, because
a write redirected to a household the caller did not name is silent corruption.

Two shared helpers in `server/auth.ts` enforce this so it can't be forgotten
per-handler:

```ts
// Queries. Reports rather than throws — see QueryState in shared/types.ts.
const state = await membershipState(ctx, householdId);   // 'ok' | 'guest' | 'none'

// Mutations. Throws, and never falls back.
const membership = await requireMembership(ctx, householdId);
const membership = await requireCapability(ctx, householdId, 'item:write');
```

`requireCapability` reads the role from the membership row it resolved, so
[D20](decisions.md#d20-three-roles-owner-editor-viewer)'s matrix applies **per
household**: the same person can be an owner in one pantry and a viewer in
another.

First run is a separate path, not a branch inside these helpers: `createHousehold`
creates a household and an owner membership, and every other handler resolves an
existing one.

### Roles

Membership decides *reach*; `role` decides *permission*. A handler that writes
checks both — `requireMembership()` for the boundary, then a capability — and
`requireCapability()` is the two in one call:

```ts
// The whole check, for the household this request named.
const membership = await requireCapability(ctx, householdId, 'item:write');
```

The role comes off the membership row that was resolved, so it is the caller's
role **in that household** — not a property of the person
([D33](decisions.md#d33-a-user-may-belong-to-several-households)).

`can()` is a pure function over the matrix in
[data-model.md](data-model.md#roles), living in `shared/roles.ts` so the server
enforces and the client renders from the same table
([D20](decisions.md#d20-three-roles-owner-editor-viewer)). Writing the rules
inline per handler is how a three-role matrix across a dozen handlers drifts.

**On the client, the matrix is read once.** `Pantry.tsx` computes
`mayEditItems` / `mayEditTaxonomy` from `can()` and passes plain booleans down;
no component knows what a role *is*, so none can invent a rule of its own. A
`false` means the control is **not rendered** — absent, not disabled — with one
"View only" chip carrying the explanation
([D30](decisions.md#d30-a-viewers-missing-controls-are-absent-not-disabled)).
The server check is the enforcement; the client's job is to be honest about
what it will accept.

Two invariants the helper can't express, which their own mutations must guard:

- **Every household retains at least one owner.** The last owner cannot be
  demoted or removed and cannot leave
  ([D22](decisions.md#d22-ownership-is-a-role-not-a-column)).
- **No invite grants a role above its creator's**, and demoting or removing a
  member revokes the invites they created
  ([D21](decisions.md#d21-invites-carry-the-role-they-grant)).

## Platform constraints that shape the design

These are hard limits of the runtime, not preferences:

| Constraint | Consequence |
|---|---|
| Schema fields are only `string()`, `boolean()`, `id(table)` | **No number type.** `qty` and `threshold` are strings, parsed at the edges. See [D4](decisions.md#d4-numbers-are-strings). |
| No array or JSON field type | Item→Type and Item→Store are **join tables**, not arrays. See [D5](decisions.md#d5-join-tables-for-many-to-many). |
| No row-level security | Household **and role** checks are hand-written in every handler. See [D20](decisions.md#d20-three-roles-owner-editor-viewer). |
| The schema is found by **regex over the server entry** | Tables must be literals in `server/index.ts`. An imported schema compiles to **zero tables**, silently. See [D27](decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry). |
| Destructive migrations need an explicit flag | Renaming or dropping a field is `sf db migrate --rename` / `--drop`. Additive changes apply on publish — confirmed by v2, which created 9 tables, 36 columns and 15 indexes with no flags. Get the schema right early. |
| Server bundle ≤ 768 KiB, client ≤ 8 MiB | Not a concern at this size, but rules out heavy dependencies. |
| Storage: 5 MiB per object | Fine if we ever add item photos. |
| Rollback moves code, not data | A rollback across a migration can leave code and schema mismatched. |

## Styling

Tailwind utility classes go directly in JSX on the `class` attribute — nothing
to install or configure. Zero compiles every class used in `client/`, `server/`,
and `shared/`, light and dark variants included. Arbitrary values and responsive
variants both work: `md:grid-cols-[190px_1fr]` and `tracking-[0.02em]` compile.

**Class names must be static strings.** Zero finds classes by *scanning source
text*, so a computed `bg-${tone}-500` produces no CSS and the app ships
unstyled. Branch to whole literals instead. `theme.json`'s `settings.safelist`
is the escape hatch for classes only ever assembled at runtime.

That rule is why [D7](decisions.md#d7-keep-the-prototypes-theme-system-dont-adopt-the-kit-wholesale)
survived the port intact rather than becoming a problem: **a term's color can
never be a utility class here.** Every location, type, store, and status gets
its palette from inline `style` objects with nothing to compile.

Since the Cellar reskin the stored value is a *token* rather than a hex
([D32](decisions.md#d32-a-term-stores-a-color-token-not-a-color)), resolved
through `client/lib/palette.ts`. Two consequences worth holding on to:

- **Static class names still matter, for a different reason.** A `:hover` or
  `:focus-visible` cannot be written in a style object at all, so every
  interactive control's states live in `client/lib/controlStyles.ts` as literal
  class strings resolving against `theme.json` tokens. That file exists because
  the drawer shipped once with no hover feedback anywhere.
- **`theme.json` values are `light-dark()` pairs**, so one slug serves both
  themes the way Zero's own platform tokens do. An unused token is pruned from
  `zero.css` and looks identical to a rejected one — see CLAUDE.md's
  verification notes for how to tell the difference.

`theme.json` is **WordPress theme.json v3** — undocumented publicly; we
recovered the shape from `@spacefast/zero-compile`. Palette entries become
color tokens, `fontFamilies` become font tokens, each reading the runtime custom
property with the literal as a fallback:

```
--font-disp: var(--wp--preset--font-family--disp, Fraunces, ui-serif, Georgia, serif);
```

Its `fontFace` block is **ignored** — `presetRecord()` reads `slug` and
`fontFamily` and nothing else — so the tokens above are a complete stack
pointing at a family the browser cannot find. `client/lib/fonts.ts` appends a
Google Fonts `<link>` at boot to supply what is missing, which is why
`font-disp` / `font-sans` / `font-mono` resolve at all
([D31](decisions.md#d31-webfonts-are-declared-by-the-client-at-boot-and-served-by-google)). Note also that Zero's semantic palette uses
`ink` for body text, which collides with this app's older use of "ink" to mean a
term's base hex. Ours are inline styles, so nothing actually conflicts.

The kit and `@spacefast/zero/charts` remain available for anything generic.
Icons come from `lucide-preact` directly rather than the kit's `Icon`
([D11](decisions.md#d11-lucide-preact-directly-not-the-kits-icon)).

## Porting from the Vite prototype

Complete. The React 19 + Vite app in `src/` was deleted at the end of Phase 2,
along with `index.html`, `vite.config.js`, and the react / react-dom /
lucide-react / tailwindcss / vite dependencies — Zero compiles Tailwind itself,
so nothing was left needing them. It remains in git history from `c6e8901`.

Recorded because the same conversions apply to anything still being read from
`.claude/docs/pantry-tracker-mockup.jsx`, which is React and name-based:

- `className` → `class`
- `useState` etc. from `preact/hooks`
- `onChange` on text inputs → `onInput`; `e.target` → `e.currentTarget`
- `lucide-react` → `lucide-preact` (same icon names, Preact build)
- `.disp` / `.mono` CSS classes → `font-disp` / `font-mono` from `theme.json`
- JS → TypeScript, with the domain types in `shared/`
  ([D10](decisions.md#d10-typescript-for-the-port-with-the-domain-types-in-shared))
- `qty` / `threshold` → decimal strings, parsed at the edges
  ([D12](decisions.md#d12-quantities-become-strings-in-phase-1-not-phase-2))
- Item `open` → a single `openId` in component state
  ([D13](decisions.md#d13-accordion-state-is-not-part-of-an-item))

Phase 2 then changed the two things the port had deliberately deferred:

- `usePersistentState` (localStorage) → `useQuery` / `useMutation`, via
  `client/hooks/usePantryData.ts`. The one surviving call site is the per-device
  theme override ([D25](decisions.md#d25-no-preferences-table))
- Taxonomy references by **name** → by **id**, which was the bulk of the work.
  Watch for the failure mode it introduced: an id rendered where a name belongs
  **typechecks**, because both are `string`, and only shows up as a UUID on
  screen. Term references reaching the DOM go through `termNameFor()`

The component tree, theme system, and status derivation carried over intact.
