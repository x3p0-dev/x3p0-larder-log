# Open Questions

Things we haven't settled. Move each one to [decisions.md](decisions.md) when it
gets answered.

## Platform behavior we haven't confirmed

- **Does the space's public visibility survive a publish?** The space was made
  publicly viewable from the Spacefast dashboard, but `sf spaces get` still
  reports `config: {}` — so that setting lives outside the published config.
  `sf.jsonc` has its own `access` field (`"access": "public"` is shorthand for
  `{ "public": ["/**"] }`), which we have **not** set. Unknown whether the next
  `sf publish` from a config without `access` reverts the space to private. If
  it does, the app silently becomes unreachable for everyone but the owner —
  which is exactly the failure Phase 3's invite flow cannot survive. **Check the
  live URL from a signed-out browser after the next publish**, and if it broke,
  declare `access` in `sf.jsonc` and treat the dashboard toggle as a fallback.
- **Can we ship a webfont at all? No — confirmed on a published space.**
  `theme.json`'s `fontFace` is ignored; the compile reads only `slug` and
  `fontFamily`. There is no `index.html` to add a `<link>` to, no CSS entry
  point, and `@plugin` / `@config` are rejected.
  `/__spacefast_generated/theme.css` 404s on the published space just as it does
  under `sf dev`, and the shipped `zero.css` contains **zero `@font-face`
  rules** — it defines `--font-disp` / `--font-sans` / `--font-mono` as tokens
  and nothing ever loads a face for them. So Fraunces and IBM Plex Mono fall
  back to `ui-serif` / `ui-monospace`, and the prototype's typographic identity
  is lost until Spacefast offers a font mechanism. This is the Phase 4
  typography decision, and it now has an answer rather than an unknown.
- **What does a handler throwing actually do to the client?** Our
  `requireHousehold()` helper will throw. Unclear how that surfaces in
  `useQuery` / `useMutation` — exception, rejected promise, silent empty result?
  Affects all error handling, and it is the first thing Phase 2 will hit.
- **Are there compound index ranges?** Docs only show `range.eq("field", value)`
  on a single field. If `.eq().eq()` chains work, some queries get cheaper.
- **Migration granularity.** "Normal additive changes apply during `sf publish`"
  — is adding an index additive? Is widening a default?

## Product questions

- **Deleting a location.** The prototype leaves items pointing at a deleted
  location (they fall back to a hashed color and a box icon). Options: block the
  delete while items reference it, reassign those items to another location, or
  clear the field and render "no location". The Settings copy currently promises
  "deleting doesn't remove items", which is true of all three.
- **Undo after a live query.** The prototype's undo holds the removed item in
  memory for 6 seconds. With server-backed live queries, a delete propagates
  immediately to every tab. Do we need a soft-delete (`deletedAt` / `archived`
  boolean) so undo is real, or is a client-held tombstone plus a re-insert good
  enough? A re-insert changes the row `id`, which matters if anything ever
  references items.
- **Does the `pantry` query stay one payload?** Returning items + joins + all
  three taxonomies in one live subscription is simple and fine for hundreds of
  rows. At what point does it stop being fine, and do we care?
- **Should invite codes expire?** They're bearer credentials. Revocable is
  decided; time-limited is not.
- **Can one person belong to multiple households?** The schema allows it —
  `memberships` is a plain join. But `requireHousehold()` takes `.first()`,
  which silently picks one. Either enforce one-household-per-user for now or
  design the switcher sooner. (Now unblocked either way: queries *can* take
  arguments, so a household id can be a query parameter rather than server-side
  "active household" state.)
- **Per-user vs per-household settings.** `defaultThreshold` is on the household
  (shared). Theme override is per-device (localStorage). Is there anything that
  should be per-user-but-synced? If so, we need a `preferences` table.
- **Quantity granularity.** Everything is integer counts. "Half a bag of rice"
  has no representation. Is that fine? (Probably — but it's the kind of thing
  that gets discovered in week three of real use.)

## Known cost carried into Phase 2

- **Taxonomies are still joined by name, not by id.** `Item.category` is a
  location *name*, and `types` / `stores` are arrays of names. The real schema
  joins by `id("locations")` and through the `itemTypes` / `itemStores` tables.
  That conversion touches every filter, every lookup, and the whole taxonomy
  rename path — renaming a term stops rewriting every item that references it
  and becomes a single-row update. This was the deliberate cost of keeping the
  Phase 1 port mechanical; it is the largest single piece of Phase 2.
- **`makeTaxonomyActions` writes to two stores at once** (the term list and the
  items that reference it) because renames cascade by name. Once terms have ids,
  most of that function disappears rather than being ported to mutations.

## Technical debt carried in from the prototype

- The stale-closure duplicate guard bug fixed in `src/lib/taxonomy.js` also
  exists in `.claude/docs/pantry-tracker-mockup.jsx`. The mockup is a design
  reference, not code we run, so it's cosmetic — but don't copy from it blindly.
  The fix carried into `client/lib/taxonomy.ts`.
- `LICENSE.md` is GPL-3.0, inherited from the WordPress plugin convention.
  Worth deciding deliberately for a hosted app.
