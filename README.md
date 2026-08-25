# Larder Log

A pantry and freezer inventory tracker for a household. Track what you have,
how much, and where it lives; see what's low or out; build a shopping list per
store.

Built for [Spacefast Zero](https://spacefast.com/docs/zero) — Preact client,
typed server capsule, database and Gravatar sign-in included.

## Status

**Phase 2 — real data layer, done and published.** Live at
<https://larderlog.view.fast/> as v2. A Preact + TypeScript client in `client/`,
pure domain logic in `shared/`, and a server capsule in `server/` holding the
full schema, two live queries, and sixteen mutations. The publish ran the first
real migration, so all nine tables now exist in the hosted database. Data lives
there; the only thing still in `localStorage` is the per-device theme override,
which belongs there.

The React + Vite prototype has been deleted — it settled the interaction design
and had no job left.

Next is Phase 3: households, members, and invites. See the
[roadmap](docs/roadmap.md).

**Two things stay unverified locally**, both because `sf dev` ships no sign-in
flow: real Gravatar sign-in, and anything needing two different identities at
once. Those have to be checked against the published space.

> **Before changing the schema**, read
> [D27](docs/decisions.md#d27-the-schema-has-to-be-a-literal-in-the-server-entry).
> The capsule compiler finds tables by pattern-matching the source of
> `server/index.ts` and never follows an import, so a schema moved into its own
> module compiles to zero tables without a single warning. Neither `tsc` nor a
> publish will tell you.

## Running

```bash
npm install
npm run dev          # the Zero app — http://localhost:4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm test             # unit tests over shared/, no runner needed
```

After any schema change, confirm the tables actually survived compilation —
nothing else will:

```bash
npx sf publish --dry-run           # rebuilds the capsule (this writes to disk)
cat .spacefast/zero/artifact.json  # the schema a publish would install
```

## Documentation

| Document | What's in it |
|---|---|
| [Overview](docs/overview.md) | What the app is, who it's for, goals and non-goals |
| [Architecture](docs/architecture.md) | Spacefast Zero, data flow, auth, platform constraints |
| [Data model](docs/data-model.md) | Tables, indexes, ownership rules, cascade deletes |
| [Roadmap](docs/roadmap.md) | Phases, in dependency order |
| [Decisions](docs/decisions.md) | Choices made and why |
| [Open questions](docs/notes.md) | What's unsettled |

[`CLAUDE.md`](CLAUDE.md) holds the working instructions for Claude Code —
platform constraints, conventions, and how to verify changes.

Working notes on the Spacefast platform itself — what's good, what's rough —
live in [`.claude/docs/spacefast.md`](.claude/docs/spacefast.md).
