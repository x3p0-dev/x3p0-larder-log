# Larder Log

A pantry and freezer inventory tracker for a household. Track what you have,
how much, and where it lives; see what's low or out; build a shopping list per
store.

Built for [Spacefast Zero](https://spacefast.com/docs/zero) — Preact client,
typed server capsule, database and Gravatar sign-in included.

## Status

**Phase 0 — UI prototype.** The app in `src/` is a React + Vite prototype with
localStorage persistence, used to settle the interaction design. The port to
Zero has not started. See the [roadmap](docs/roadmap.md).

## Running the prototype

```bash
npm install
npm run dev      # http://localhost:5173
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
