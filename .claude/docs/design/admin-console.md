# Larder Log — the admin console (Aug 2026)

Canvas: https://claude.ai/code/artifact/0c18a152-b55d-4119-a34e-7b0cf7b3cf4f
Twenty-six boards on three pages — **Light**, **Dark** and **Mobile**. Owner/Editor-era app; the Viewer role is still the standing gap.

> **This supersedes the opening claim of *future-ideas → The administrator page*.** That section says the console is *"a fourth surface, not a screen"*, and that *"an admin console shares tokens with them and nothing else."* Both turned out to be wrong, and in a useful direction: the console shares **the whole drawer**, and it reaches it by being a **pushed pane**. Almost nothing on these boards is a new component.

## The console is a pane, not a surface

*Administration* is pushed into the app drawer exactly as *Members* is — the same 36px back button on drawer-raised, the same Playfair 600 21 heading with its scope in meta beneath. So the way out is the gesture the app already teaches, at the top-left, and the console inherits collapse, the rail, the account row and the account menu for free.

The consequence worth stating: **there is no admin shell to design.** There is the app, with one more pane in it.

| Console part | What it already is |
|---|---|
| The drawer | The app drawer, 340px, unchanged |
| Getting in | A row in the account menu |
| Getting out | The pushed pane's back button |
| The list rows | The shopping-list row with different columns |
| The confirms | The confirm shell from *Destructive actions* |
| Chips, sort trigger, sort menu | Unchanged |
| The role menu | The sort menu's construction — see below |
| The household tile | Already specced at four sizes |

> **The one component that changes surface is the role menu.** In the app it is dark, because it opens on the drawer. In the console it opens on a cream card, so it takes the sort menu's construction instead — cream popover, 36px rows at radius 9, the current value at 600 with a crimson check and no fill. Same component, the other surface, and the existing rule picked which.

## The drawer

Wordmark + collapse header, then the pushed pane, then one raised block of nav rows under a `MANAGE` micro-label, then the account row at the foot.

- **Nav rows** are 46px at radius 10 inside the `#332B22` block at radius 13, 15px labels in drawer-body, counts right-aligned in drawer-faint.
- **The active row is cream on ink** — `#F2E9DA` fill, `#241E17` label at 600, glyph in ink. The drawer's own selected treatment, the same one the Appearance segmented control and the rail's open state already use. Crimson stays brand-and-out, never a fill.
- **Four rows:** Overview · Households `412` · People `1,148` · Activity. Overview and Activity carry no count — one is a summary and the other is a log, and a number on either would be a number nobody asked for.
- **Collapsed** it is the 68px rail. Expand is first and carries `#332B22` at rest, as it does in the app. **Back-to-app takes slot 2** — where the household switcher sits, and for the same reason: it is the control that says which thing you are looking at.

### The way in

A row in the account menu, under the identity row and above the account actions:

1. Identity — 38px avatar, display name, pencil
2. hairline
3. **Admin**
4. Change your picture (still marked not-in-v1 in *ui-designs*)
5. hairline
6. Sign out

**It is a destination, not something you do to your account**, which is why it sits above the actions rather than beside *Sign out*. **It takes no outbound arrow** — that mark means *this leaves the app*, which is why *Change your picture* carries one. Admin is still Larder Log.

**Administrators only.** Everyone else keeps the two-row menu and never learns the console exists.

### And at `/admin`, for everyone else

**A 404, not a 403.** *"There's nothing at this address."* Neutral disc, ordinary primary back to the app.

The app already refuses to tell strangers what it knows: *Invite accept* makes a revoked link and an expired one the same screen, because telling them apart would say something about the household. A 403 leaks the same way — it confirms there is a console, and that there is a flag worth getting. And it cannot offer a next step: nothing in the UI grants admin, so the only honest continuation of *"you don't have access"* is *"ask someone"*, which is not an action the app can hand anybody.

> **The cost, stated:** a demoted administrator, or someone signed into the wrong account, gets a 404 and no explanation. Accepted — the alternative leaks to everyone in order to help a handful.

> **The disc takes no status colour.** Out, low and stocked are claims about a pantry, and this is not one — sunk fill, `line` ring, meta glyph. Amber would ask someone to fix a problem they do not have.

## The metadata-only rule

**Everything on a household page is a count, a name, or a date. If a field is ever not one of those three, it does not belong there.**

It is stated on the page rather than merely observed by not drawing items, and it is the spine of the whole console: it gives the household page a rule anyone can check, and it is the app's own instinct anyway.

The household page therefore carries counts (items, locations, stores, types), facts (members, invites out, storage, created), the member list with roles, live invites — and a card saying out loud that items are not visible and why.

## Boards

| # | Board | What it settles |
|---|---|---|
| 1 | Overview | Four stat cards, a 12-month household line, and *Needs attention* — no owner, awaiting deletion, dormant |
| 2 | Households | Searchable list, status chips, 25 a page |
| 3 | One household | The metadata-only page, members, invites, delete |
| 4 | People | Searchable list, admin and deletion flags |
| 5 | One account | Where someone is a member and what they can do there |
| 6 | Deletion flows | Household typed-confirm, the orphan, the account pre-flight |
| 7 | The drawer, in and out | The way in, the console drawer, the rail |
| 8 | Not an administrator | The 404 that ships, beside the 403 that doesn't |
| 9 | Activity | The audit log |
| 10 | Seeing inside a household | **Undecided** — the escalation drawn beside today's refusal |
| 11 | List states | Search results, no matches, sort open, day one |
| 12 | One entry, and what keeps it | An Activity row opened, plus retention and export |

Every one of the twelve has a dark counterpart on the **Dark** page. The **Mobile** page carries one board in each theme.

## Deletion flows

**Deleting a household from the console is the app's second typed confirmation, and it earns it.** The first — deleting your own last household — earned the exception by destroying data belonging to more than one screen. This destroys data belonging to people who aren't in the room.

**The orphan dialog is amber, not crimson.** A household whose last owner deleted their account is stuck, not destroyed. Amber is "hold on", crimson is "gone" — the blocked dialog's existing rule. The primary goes where the problem is, exactly as *Open Members* already does.

**The account pre-flight is 520 rather than 420, and it is what makes account deletion reachable at all.** *Destructive actions* already blocks a sole owner from leaving a household; run that rule against every household at once and deleting an account becomes a wall for exactly the people most likely to want it. The pre-flight turns each block into a choice — one row per owned household, transfer or delete, and a tail line for the households where nothing has to be decided.

> **Transferring ownership is a capability the app does not have yet.** The role menu can promote someone to Owner, but nothing *hands over* a household. Deletion is what forces it to exist — and once it does, the orphan dialog has something to call.

> **Same dialog, two places.** A person deleting their own account from the account menu sees this screen with the same rows. Only the title changes.

## Activity

The fourth nav row. Every row is a **time, a person, an action and a target**: household and account deletions, ownership transfers, role changes, revoked invites — and administrator grants, which nothing in the console can make, because the flag is set out of band and the log is the only place that shows it happened.

Two actors are not people: *Automatic* (an account deleted after its hold) and *Out of band* (a grant). Both render with a blank disc and an italic meta label, so a row is never attributed to someone who did not do it.

**Nothing a household does to its own pantry appears here.** Adding an item is not administration, and a console that logged it would be the surveillance the household page refuses to be.

> **This is the one place in Larder Log where an observed timestamp is the point.** *Edit item* deliberately has no timestamps anywhere — *"nothing in the UI shows when an item was added, changed or last counted"*. That rule is about items. A log whose rows cannot be placed in time is not a log.

### One entry, opened

A row expands into its full record: the exact time to the second with a zone, the actor with their email and account id, the action, the target with its id, what it held, and who lost access.

> **A deletion entry has to denormalise, and nothing else does.** Every other row can point at a household or an account that still exists. A deletion row is the only surviving record of the thing it describes, so it carries its own copy — name, colour, id, and the counts as they stood at the moment it happened. A foreign key here would resolve to nothing. The card says so on its own face: *this household no longer exists; everything above is the log's own copy.*

> **The log does not record where you were.** No address, no device, no session. An address is a location, and this is a log of actions — the same instinct that keeps items off the household page. If that turns out to be too little during a real incident it is a decision to revisit out loud, not a field to add quietly.

### Retention and export

**Rows are kept 24 months**, set by the only control in the console that is a setting rather than a list or a record. It sits with export because they are one question: how long do you keep this, and how do you get it out.

- **A deleted account keeps its rows.** The actor becomes *Deleted account* with the id. An audit log you can erase by deleting yourself is not an audit log.
- **A deleted household keeps its rows too** — the entry is the only place it still exists.
- **Export is a range, not everything**, defaulting to the month on screen. A button that hands over all 2,904 rows invites the habit of handing over all of them.

> **Erasure and an audit log pull in opposite directions, and this picks a side.** Deleting an account removes the person, not the record of what they did as an administrator. That belongs in the account-deletion copy, and it wants a lawyer's read before it ships.

## Seeing inside a household — undecided

Both answers are drawn, side by side, so the choice is visible rather than implied.

**Today:** the household page refuses and says so. That is a position, not a design, and it is easy to hold until the first person emails at 11pm saying their items vanished.

**The alternative:** an explicit, recorded, expiring look. A confirm-shell dialog on the amber ramp — a **required free-text reason**, a duration (30 minutes / 2 hours / 24 hours), and a primary that names it: *Open for 2 hours*. While it is open, the household page carries a persistent amber banner — *You're looking inside Riverside Kitchen. Ends in 1h 46m.* · **End now** — and the items are **read-only**.

- **The reason is the point.** An audit row that says *an administrator looked* is worth very little; one that says why is the whole reason for writing it down.
- **The household being told is load-bearing**, and the first thing that will be dropped as an implementation detail. Without it this is a console that reads people's shelves quietly, which is exactly what the refusal card promises it is not.
- **It has to expire on its own.** A look you have to remember to close is a look that stays open.
- **The banner borrows the low *text* colour as its 1.5px border**, not the low border token — *Shopping list* already found the status tints were built to sit on a card; on the ground the low border reads 1.16:1.
- **Read-only means the Viewer treatment**, arriving here before it arrives for Viewers. Looking is not the same permission as touching, and an administrator should never have the second one.

**If it is never built, say so as a decision rather than an omission:** metadata-only holds, and support means *ask someone inside the household*.

## List states

- **Searching adds a sort option and takes the chips away.** *Best match* only means anything while there is a query, and a status chip narrowing a result set answers a question nobody asked. The count replaces `Showing 1–25 of 412` in the same slot.
- **No matches takes the item grid's empty state**, not the shopping list's: Playfair italic 500 27px, meta beneath, one secondary control. A status disc would be the ramp saying something about stock, and this is about a query. The meta line names what search covers, because *nothing* is otherwise indistinguishable from *searching the wrong field*.
- **Day one has no button and no search or chips.** The console cannot create a household, so the empty state points at the thing that can — a person signing in.

## Dark

Generated from the light boards by a hex-for-hex map, the method *ui-designs* already describes — so any visual difference between a board and its counterpart is a token difference and nothing else.

**Two maps, not one.** The drawer is dark in *both* themes: its surfaces drop below the content ground (`#2B2419 → #15110B`) but its text does not invert. So drawer regions take their own map, and everything else takes the content map, where ink and cream swap — which is also what flips the primary button, the selected chip and the open role trigger in one move.

**The chart tooltip takes the drawer map too.** It is the toast's argument applied to a tooltip: transient chrome borrows the app's darkest layer, so it stays a near-black box with cream text in both themes rather than inverting into a cream card on a dark chart.

Two rules a flat map cannot express, applied on top:

- **Card borders take `line strong` in dark.** At `#2C251B` on `#1F1912` a card separates at 1.27:1 and the shadow does nothing, so the border is the edge — the confirm modal's finding, applied to every card.
- **A term tile's letter flips to near-black** on the dark variants, per the term-base rule.

> **The failure this method has, and where it bit.** A swap only inverts values that are map *keys*. The count inside a selected chip was `#A5937A` — a map *value* — so the chip's fill inverted to cream underneath it while the count stayed put, at 2.47:1. The drawer's equivalent row got it right by accident. Anything sitting on a surface that inverts has to be checked by hand; the map will not tell you.

## Mobile

Drawn at 390 for the two screens that settle the pattern, plus the drawer. Not a full set — *enough to prove it*.

**The table stops being a table.** Four columns at 1440 become a name and one meta line: members, items and last active, in the order the desktop columns run, separated by middots. Nothing is dropped, because all three are short. The status flag stays on the name line, where it qualifies the thing it is about.

**The drawer is the app's 328px slide-over with its scrim**, menu button top-left — the same side the drawer comes from. The console's back row rides inside it, so leaving admin is still one gesture from the place you came in by.

**The chips scroll and nothing is pinned.** The app's applied-filter row pins its clear because that row is a set you are dismantling; these are one status filter with one value on at a time.

**The household's counts go four-across to 2 × 2.** Playfair at 29 four times does not fit 358px, and shrinking the numeral is the wrong trade — the numeral is what the card is for.

**Every control clears 44px**: the menu button, the chips, the 78px rows, the role triggers.

> **Activity is deliberately not drawn at 390.** A log row is a time, a person, an action and a target, and three of those are long. It may simply not belong on a phone — which is a thing to decide, not a layout to shrink into.

## Gaps

- **The Viewer role** is a modifier on every board here, as it is on every board in the app.
- **Announcements**, which *future-ideas* puts in this console, are not drawn.
- **Running cost.** *future-ideas* wants somewhere to see what the service costs to run; Overview has storage and no spend.
- **Remove-member and revoke-invite confirms reached from the console.** Both triggers are drawn on the household board; only household and account deletion have dialogs.
- **Loading, failure, and concurrent edits** — 412 households is a paginated fetch, and two administrators can act on one household at once.
- **Can a household see the Activity rows that touch it?** The log is drawn admin-only. If the escalation above ever ships, the household has to see at least those rows, and then the question is why it does not see the rest.
- **The rest of mobile.** Overview, People, one account and the component sheets have no 390 counterpart, and Activity may not want one.

## Sample-data inconsistencies to settle

Found by review; all three are in the mock data, not the design.

1. **Justin is missing a household tile on People** — his row shows T, L, S, but Households lists him in Calfee Household too, and the pre-flight offers *Transfer to Justin Tadlock* for it.
2. **People is not in its stated sort** — the trigger says *Recently active*; Nora (11 days) sits above Marcus (3 days).
3. **The orphan dialog and the household page disagree about a live invite.** The dialog says nobody can invite anyone until an owner exists; the household shows an Editor invite issued by Nora, an Editor, expiring in 9 days — about 5 days old on a 14-day TTL, against a household whose page says it was last active 11 days ago. Issuing an invite is activity.
