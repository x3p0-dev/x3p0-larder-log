# Larder Log — Project Overview

## What this is

A pantry and freezer inventory tracker for a household. You keep a list of what
you have, how much of it, and where it lives; the app tells you what's low and
what's out, and turns that into a shopping list per store.

The starting point is one household — Justin and his wife — but the data model
is multi-household from day one so anyone can sign in and keep their own
separate pantry.

## Who it's for

1. **Primary:** our own household. Two people, both signed in, both editing the
   same shared pantry from phones and desktops.
2. **Eventually:** anyone else who signs in. Each gets their own household,
   invisible to and isolated from every other household.

There is no notion of a public pantry, a shared marketplace, or cross-household
anything. Households are islands.

## The core loop

Someone opens the app, sees what's low or out, adjusts quantities as they cook
or unpack groceries, and pulls up a store-specific shopping list before going
out. Everything else exists to serve that loop.

## Concepts

| Concept      | What it is                                                            |
|--------------|-----------------------------------------------------------------------|
| **Household**| The container for everything. One pantry. Has members.                 |
| **Member**   | A signed-in person with access to a household.                        |
| **Item**     | A thing you have some quantity of. "Ground Beef (1lb pkgs)", qty 6.   |
| **Location** | Where the item physically is. "Chest Freezer", "Pantry". One per item.|
| **Type**     | What kind of food it is. "Meat", "Baking". Many per item.             |
| **Source**   | Where it comes from. A shop, a garden or a kitchen ([D58](decisions.md#d58-a-source-carries-a-kind-and-the-group-is-named-for-what-it-holds)). Many per item. Called *Store* until a household has one that is not a shop |
| **Status**   | Derived, never stored: `out` (qty 0), `low` (qty ≤ threshold), `ok`.  |
| **Administrator** | Somebody who can see **every** household in the space — how much each holds, never what ([D62](decisions.md#d62-the-console-is-a-pane-in-the-app-drawer-and-an-administrator-is-a-name-in-the-environment)). Not a role: it is a name in the server environment, and nothing in the app grants it |

Locations, Types, and Sources are per-household taxonomies — each household
names and colors its own.

**An administrator is not a member of anything they administer**, and the
console is deliberately narrow about what that buys: counts, names and dates
across every household, and no route to a single item. See the non-goals.

## Goals

- Fast enough to use one-handed while standing in front of a freezer.
- Two people editing at once without stepping on each other. Zero's live
  queries give us this for free.
- Adding an item takes seconds, not a form-filling ordeal.
- Works in light and dark, on a phone and on a desktop.

## Non-goals

Explicitly out of scope, so we stop relitigating them:

- **Barcode scanning.** Maybe someday; not what makes or breaks daily use.
- **Expiration dates and spoilage tracking.** Adds per-unit tracking to every
  item, which changes the data model fundamentally. Revisit only if the basic
  version proves itself.
- **Recipes, meal planning, nutrition.** Different app.
- **Price history or budgeting.** Different app.
- **Offline-first / sync conflict resolution.** Zero is server-backed and live.
  If you're offline, you're offline.
- **Native mobile apps.** It's a responsive web app.
- **Cross-household sharing or social features.** Households are islands.
- **An administrator reading a household's items.** The admin console shows how
  much a household holds, never what — *"support is not a reason to read
  someone's shelves"*. A recorded, expiring, household-notified look was fully
  designed and **decided against** on 2026-08-29
  ([D62](decisions.md#d62-the-console-is-a-pane-in-the-app-drawer-and-an-administrator-is-a-name-in-the-environment)),
  which also records what would reopen it. Support means asking somebody inside
  the household. This is the one non-goal here that is a **decision with a
  stated threshold** rather than a permanent no.

## Success criteria

We use it. If we're still using it after a month of real grocery trips without
falling back to a mental list, it works.

## Related documents

- [Architecture](architecture.md) — the platform and its constraints
- [Data model](data-model.md) — tables, indexes, ownership rules
- [Roadmap](roadmap.md) — what gets built in what order
- [Decisions](decisions.md) — choices made and why
- [Open questions](notes.md) — what we haven't settled
