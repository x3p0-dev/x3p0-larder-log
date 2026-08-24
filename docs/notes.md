# Open Questions

Things we haven't settled. Move each one to [decisions.md](decisions.md) when it
gets answered.

## Platform behavior we haven't confirmed

- **Can queries take arguments?** The Zero docs show `mutation(async (ctx, text:
  string) => …)` with typed args, but every `query()` example takes only `ctx`,
  and `useQuery("entries")` is always called without arguments. If queries can't
  take arguments, household switching has to work some other way (a server-side
  "active household" on the membership row, most likely). Our current design
  sidesteps this by resolving the household from `ctx.auth`, so it isn't
  blocking — but it decides how Phase "later" household switching works.
- **What does a handler throwing actually do to the client?** Our
  `requireHousehold()` helper throws. Unclear how that surfaces in `useQuery` /
  `useMutation` — exception, rejected promise, silent empty result? Affects all
  error handling.
- **Are there compound index ranges?** Docs only show `range.eq("field", value)`
  on a single field. If `.eq().eq()` chains work, some queries get cheaper.
- **Migration granularity.** "Normal additive changes apply during `sf publish`"
  — is adding an index additive? Is widening a default?
- **Does `sf dev` give a persistent guest identity across restarts?** Docs say
  it "supplies a local guest identity"; unclear whether it's stable, which
  matters for testing multi-member flows locally.

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
  design the switcher sooner.
- **Per-user vs per-household settings.** `defaultThreshold` is on the household
  (shared). Theme override is per-device (localStorage). Is there anything that
  should be per-user-but-synced? If so, we need a `preferences` table.
- **Quantity granularity.** Everything is integer counts. "Half a bag of rice"
  has no representation. Is that fine? (Probably — but it's the kind of thing
  that gets discovered in week three of real use.)

## Technical debt carried in from the prototype

- The stale-closure duplicate guard bug fixed in `src/lib/taxonomy.js` also
  exists in `.claude/docs/pantry-tracker-mockup.jsx`. The mockup is a design
  reference, not code we run, so it's cosmetic — but don't copy from it blindly
  during the port.
- `LICENSE.md` is GPL-3.0, inherited from the WordPress plugin convention.
  Worth deciding deliberately for a hosted app.
