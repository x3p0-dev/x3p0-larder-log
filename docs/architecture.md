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
    index.tsx          # exports App; the Preact UI
    components/        # ported from the Vite prototype
    lib/               # theme tokens, status derivation, icon maps
  server/
    index.ts           # default-exports capsule(): schema + handlers
  shared/              # types used by both sides
  docs/                # these documents
  .claude/docs/        # mockup + platform feedback log
  sf.jsonc             # runtime config
  theme.json           # palette/typography the Tailwind utilities compile against
  .env.server          # server-only secrets, synced on publish
```

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

1. **Never accept a `householdId` from client arguments as authority.** Resolve
   the caller's household server-side from `ctx.auth.userId` via `memberships`.
2. **Re-read before you write.** For any update or delete, `get()` the row,
   confirm its `householdId` matches the caller's, then write.
3. **Reject guests** in every handler that writes. Check `ctx.auth.isGuest`.

A single shared helper enforces this so it can't be forgotten per-handler:

```ts
// Resolves the caller's household, or throws.
async function requireHousehold(ctx) {
  if (ctx.auth.isGuest) throw new Error("Sign in required");
  const membership = await ctx.db.memberships
    .withIndex("by_user", (r) => r.eq("userId", ctx.auth.userId))
    .first();
  if (!membership) throw new Error("No household");
  return membership.householdId;
}
```

## Platform constraints that shape the design

These are hard limits of the runtime, not preferences:

| Constraint | Consequence |
|---|---|
| Schema fields are only `string()`, `boolean()`, `id(table)` | **No number type.** `qty` and `threshold` are strings, parsed at the edges. See [D4](decisions.md#d4-numbers-are-strings). |
| No array or JSON field type | Item→Type and Item→Store are **join tables**, not arrays. See [D5](decisions.md#d5-join-tables-for-many-to-many). |
| No row-level security | Ownership checks are hand-written in every handler. |
| Destructive migrations need an explicit flag | Renaming or dropping a field is `sf db migrate --rename` / `--drop`. Additive changes apply on publish. Get the schema right early. |
| Server bundle ≤ 768 KiB, client ≤ 8 MiB | Not a concern at this size, but rules out heavy dependencies. |
| Storage: 5 MiB per object | Fine if we ever add item photos. |
| Rollback moves code, not data | A rollback across a migration can leave code and schema mismatched. |

## Styling

Tailwind utility classes go directly in JSX on the `class` attribute — nothing
to install or configure. Zero compiles every class used in `client/`, `server/`,
and `shared/`, light and dark variants included.

We keep the prototype's hand-rolled theme tokens (the "ink → tint/ring"
derivation in `lib/theme.js`) rather than adopting `@spacefast/zero/kit`
wholesale, because that color system *is* the app's visual identity. The kit and
`@spacefast/zero/charts` remain available for anything generic.

## Porting from the Vite prototype

The current React 19 + Vite app in `src/` is a UI prototype built from
`.claude/docs/pantry-tracker-mockup.jsx`. It gets ported into `client/` and then
retired. Mechanical differences:

- `className` → `class`
- `useState` etc. from `preact/hooks`
- `onChange` on text inputs → `onInput`
- `lucide-react` → `Icon` from `@spacefast/zero/kit` (same Lucide set)
- `usePersistentState` (localStorage) → `useQuery` / `useMutation`
- Item `open` state stays client-side; it is UI state, not data

The component tree, theme system, and status derivation carry over intact.
