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
- **Is `Date` available inside a capsule handler?** Every `Date` call in the Zero
  docs is client-side, and server code may import only `@spacefast/zero/server`
  and its own files. [D24](decisions.md#d24-invites-expire-after-14-days)
  computes invite expiry server-side and depends on this. If the server runtime
  has no clock, that design has to change.
- **What format are `createdAt` / `updatedAt`?** Undocumented. Zero's examples
  only ever pass them to `new Date()` client-side, which parses non-ISO formats
  in implementation-defined ways. D24 sidesteps this by writing its own ISO 8601
  `expiresAt`, but anything else that compares or sorts by row timestamps needs
  the answer first.
- **Do live queries diff, or re-send the whole result set on every change?**
  This is what decides whether
  [D26](decisions.md#d26-pantry-stays-one-payload) holds: if `pantry` re-sends
  everything, the hottest path in the app (`adjustQty`, a `+1`) re-transmits the
  entire pantry. Cheapest thing to measure in the spike, and the most consequential.
- **Migration granularity.** "Normal additive changes apply during `sf publish`"
  — is adding an index additive? Is widening a default?

## Product questions

All settled as of 2026-08-24 — see [decisions.md](decisions.md), D16-D26.
Nothing product-shaped is currently blocking Phase 2.

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
