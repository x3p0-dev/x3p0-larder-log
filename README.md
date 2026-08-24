# Larder Log

A pantry and freezer inventory tracker for a household. Track what you have,
how much, and where it lives; see what's low or out; build a shopping list per
store.

Built for [Spacefast Zero](https://spacefast.com/docs/zero) — Preact client,
typed server capsule, database and Gravatar sign-in included.

## Status

**Phase 1 — Zero scaffold and sign-in gate.** The app is a Preact + TypeScript
client in `client/`, shared domain logic in `shared/`, and a server capsule in
`server/` that declares no schema yet. Data still lives in localStorage,
namespaced per signed-in identity; the real data layer is Phase 2.

Sign-in is built but **unverified** — `sf dev` has no local sign-in flow, so
Gravatar sign-in has never actually been exercised. See the
[roadmap](docs/roadmap.md).

The React + Vite prototype in `src/` is still on disk and still runs. It settled
the interaction design and gets deleted in Phase 2.

## Running

```bash
npm install
npm run dev          # the Zero app — http://localhost:4173
npm run typecheck    # tsc --noEmit over client/, server/, shared/
npm run prototype    # the old prototype — http://localhost:5173
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
