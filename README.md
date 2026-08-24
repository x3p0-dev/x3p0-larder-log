# Larder Log

A pantry and freezer inventory tracker for a household. Track what you have,
how much, and where it lives; see what's low or out; build a shopping list per
store.

Built for [Spacefast Zero](https://spacefast.com/docs/zero) — Preact client,
typed server capsule, database and Gravatar sign-in included.

## Status

**Phase 2 — real data layer, done.** A Preact + TypeScript client in `client/`,
pure domain logic in `shared/`, and a server capsule in `server/` holding the
full schema, two live queries, and sixteen mutations. Data lives in the
database; the only thing still in `localStorage` is the per-device theme
override, which belongs there.

The React + Vite prototype has been deleted — it settled the interaction design
and had no job left.

Next is Phase 3: households, members, and invites. See the
[roadmap](docs/roadmap.md).

**Two things stay unverified locally**, both because `sf dev` ships no sign-in
flow: real Gravatar sign-in, and anything needing two different identities at
once. Those have to be checked against the published space.

## Running

```bash
npm install
npm run dev          # the Zero app — http://localhost:4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm test             # unit tests over shared/, no runner needed
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
