# Restock — the trip that ends, 31 Aug

> **This is a section of `claude/ui-designs.md`, kept as its own doc** — the arrangement `add-edit-item.md` and `garden-and-kitchen.md` already use, for the same reason: that file has no patch operation and has lost sections to two wholesale rewrites.
>
> It replaces **Shopping list → Checks are local, and they expire** wholesale, amends **Shopping list → The trip bar**, **The row**, **Entry and exit**, **Add / Edit item → On hand and low at**, and closes **Gaps → Restock**. It also settles two things `future-ideas.md` recorded as blocked, and narrows a third.

Canvas — **Restock**, six boards on one page, light theme, desktop:
https://claude.ai/code/artifact/c9d56a9a-6331-488d-bcc6-abf664f259db

> **What is specced to build and what is a consequence.** The **claim**, the **trip**, the **trip bar's right half**, the **put-away sheet** and the **Clear checks** delta are specced. The **`Always` / `Never` tri-state** and **trends tier 2** are specced far enough to build but are separate features that this one unblocks — take them or leave them. **Deduction is not here**, because a make item carries no ingredients; it waits for recipes.

**One sentence: a check is a claim, and the count is written once, at the shelf.**

Everything below falls out of that.

---

## The rule: a check is a claim, not a write

*Shopping list* says the list is a **view** of the items and nothing is authored into it. That survives untouched. What changes is what a tick means.

Today a tick means *it's in my cart*, it lives in `localStorage`, it expires in twenty-four hours, and it never touches the item. The honest end of that sentence — the one the doc has been carrying as a reserved half of a bar since the list was drawn — is **setting the count when you unpack.**

The reason it was never designed is a real one: **the app cannot know how many you bought.** The row says *have 0 · low at 4*; you came home with a four-pack or a single, and nothing on the screen can tell. Every design that makes a check write a count is guessing.

So the check does not write. It **claims** — *I am getting this* — and the write happens once, deliberately, on a screen where you are standing in front of the shelf.

### Three objects where there was one

| | What it is | Lives |
|---|---|---|
| **A claim** | one person saying they are getting one row | on the item, held by a trip |
| **A trip** | one person's claims, from the first tick to the put-away | the household |
| **A restock** | the write — an item, a new count, a moment | the item, and an event log |

---

## Claims are shared, and that is the feature

*Checks are local, and they expire* rejected sharing for a good reason: *"a tick that means 'in my cart' cannot be read by someone else without saying whose."*

**So it says whose.** And the collision the old rule was avoiding becomes the thing the shared list has been missing: **it stops the double-buy.**

### A row someone else has claimed

| Slot | Treatment |
|---|---|
| Checkbox column | **Empty.** It is not yours to tick |
| Name | drops to `meta` `#6F6049`, **not struck** — nothing is done yet |
| Badge | holds its status at 55%, as a checked row's does |
| Count slot | an **18px avatar** — neutral fill `#F2EADC` on `line strong` `#CFBEA3`, initial in Karla 600 9 meta — then *In Sarah's cart* in meta 13 |

**A claimed row is not a checked row**, and the distinction is load-bearing: `Hide N checked` and `Put N away` both count **yours only**. Sarah's rows stay visible because they are still on the list until she buys them, and you cannot put away something you do not have.

> **The name rides the trip, never the item.** This is the boundary `future-ideas.md` was protecting when it argued against attribution: *"the moment items carry an author, account deletion goes from a clean operation to a scrubbing job."* A trip is transient, dies when it is put away or abandoned, and goes with the account when it is deleted. **Nothing in the larder ever records who touched it.** Delete account still removes a display name, an email, an avatar, membership rows and invites — plus any live trips, which nobody will miss.

> **Taking over someone else's row is not drawn.** You cannot claim a row that is already claimed. Whether you should be able to — *she is at Publix and forgot* — is under *Open questions*.

---

## The trip

**A trip begins with the first check and ends when it is put away.** It belongs to one person and to one household.

### What clears a claim

The old section's three rules become four, and none of them needs a button either:

| | Rule |
|---|---|
| 1 | **The item leaves the list.** Anyone restocks it and the claim goes with the row — unchanged |
| 2 | **The trip is put away.** The counts are written and the trip is over |
| 3 | **The trip is abandoned.** Twenty-four hours with no put-away. A shopping trip does not last a day, and a week-old claim is a lie someone else is reading |
| 4 | **`Clear checks`.** The one deliberate one, and the reason it now earns an undo |

**Switching households no longer clears anything.** The old rule 3 existed because checks were local to a device; a trip belongs to the household, so leaving and coming back finds it where you left it. That is strictly better and it costs nothing.

### `localStorage` keeps its job and changes its meaning

The reason for it was *"the single most likely thing to go wrong on a phone with two bars of signal."* That reason is stronger now, not weaker, because a claim is a network write at the worst possible moment.

**It stops being the storage and becomes the queue.** A tick paints immediately, is stashed locally, and is published when there is signal. A put-away is the one write that must not half-commit — it is several items at once — and it is the only place in the app where a spinner is the honest answer.

---

## The trip bar

The shell is unchanged: full width of the content column, **24px below the grid**, sunk `#F2EADC` on `line` `#E2D5C0`, radius **15**, 52px desktop / 56 mobile. It appears with the first check.

**What changes is that it now has three controls and a rule about them: trip management groups left, the trip's one action sits right.**

| Slot | Control | Spec |
|---|---|---|
| Left | **`Hide N checked`** / `Show N checked` | ghost, 34px at radius 11, padding `0 12`, Karla 600 14.5 in body `#4C4237`, a 16px stroke glyph 8px before the label |
| Left, +6px | **`Clear checks`** | the same ghost, the same glyph treatment |
| Right | **`Put N away`** | the ink primary — 38px at radius 13, padding `0 18`, Karla 600 15, `#241E17` on `#F2E9DA`, cream on ink in dark |

**The separation is carried by the fill, not by a divider.** Two ghosts and one filled control is already three weights; a hairline between the ghosts would be a fourth statement about a bar 52px tall.

> **Two ink controls on one screen, and it earns it.** *Add item* holds the only ink fill in row 1. The rule this bar is really following is the sheet's — one primary per surface, and a bar below the grid is its own surface the way the sheet's footer is. It is also 700px away from row 1 and it is the terminal action of the whole mode.

### Mobile

Every control clears 44px: the ghosts go 34 → 44 and the primary 38 → 46. At 390 there is not room for three labels, so **the two ghosts drop to glyph-only 44px squares** with `aria-label`s — 44 + 6 + 44 + 118 + 24 = 236 of 358, with room.

**That is what the glyphs are for.** They are not decoration on desktop; they are the thing that survives at 390, which is the width where this bar matters most.

---

## `Clear checks` — the delta

**It already exists in the build**, sitting alone in the right half of the bar. It moves to the left group beside `Hide`, because the right half is where the write goes and the two ghosts are one subject: *what to do about the ticks*.

**And it now earns an undo toast.** Today a check is local, free and cheap. Under restock it is a claim other people can read, and re-ticking a shop's worth of rows is not one tap.

- Actionable toast, 6s: *Cleared **3 checks**.* · **Undo**
- The component is *Destructive actions → Toast* unchanged — drawer surface, cream `Undo` pill, draining timer, `Cmd/Ctrl+Z` from anywhere.
- **No confirm.** The rule is *undo what comes back, confirm what doesn't*, and this comes back exactly.
- **It clears only your claims.** Sarah's rows are untouched, and nothing you press can release someone else's cart.

---

## Put away — the write

**A 480px sheet from the right on desktop**, a near-full-height bottom sheet with a grabber at 390. Card tokens, radius 20, the scrim and the motion the Add / Edit sheet already uses. It is the same component in a different job, which is most of why it costs so little.

### Header — 68px

Title in Playfair 600 21 — **`Put away`** — with meta 13 beneath: *3 from this trip*. A 30px ghost `×` on the right, the composer's abandon glyph. `Escape` closes it and nothing is written.

### The rows

One per claimed row, ordered as the list orders them — kind, then source, then out before low.

| Slot | Content |
|---|---|
| Line 1 | name in Playfair 600 17, then the **size** in meta 13 riding with it — *Shopping list → The row*'s rule, because *"Butter, 1 lb" is one phrase* |
| Line 2 | a 7px source dot, then `Source · was N · low at N` in meta 13 |
| Right | the **stepper** |

`divider` `#EEE4D2` hairline between rows, 13px padding above and below.

**The stepper is 132 × 44 at radius 11** — `#FDFAF4` on `meta` `#6F6049`, 42px cells either side of the numeral, `divider` hairlines between the three, glyphs in body, numeral **Playfair 700 20** in ink.

> **One size down from the sheet's own, and the reason generalises.** On Add / Edit the two steppers at 214 × 56 are the heroes of their section. Here every row has a name to read and there are several of them, so the stepper is a peer of the row rather than the point of it. **The numeral is still a field** — tap it, type it — and press-and-hold still repeats after 400ms, because a glut is typed and not tapped forty times.

### The prefill — the smallest thing that is certainly true

**`max(low at + 1, on hand + 1)`.**

Two things are certainly true when you get home: you have **at least one more than before**, and you are **no longer low**. The prefill is whichever of those is larger, and nothing else is inferred.

`low at + 1` rather than `low at` because *on hand == low at* is low — settled in `add-edit-item.md` and load-bearing here, since a default that leaves the row on the list would be a default that undoes the trip.

The hint under the header says what it did, in meta 12.5:

> *Each one starts at the smallest count that clears its threshold. Correct anything that's wrong — this is the one moment you're standing in front of the shelf.*

> **Two of the three rows on the board are corrected, on purpose.** Tomatoes went in at 14 because a garden glut is not a number anyone could have guessed, and Chicken Stock at 6 because a batch made four. The prefill is a floor that saves you the ordinary rows; it is not a claim to know what you did.

### Set, not add

**The stepper asks *how many do you have now*** — the question every other stepper in the app asks. An *added* quantity would be a second mental model for the same control, and the sheet would have to say which it meant.

**Which makes this the only self-correcting moment in the product.** Counts drift; nobody opens the app to audit a shelf. The one time you are guaranteed to be looking at the shelf with the app open is when you are putting things away, and the flow that ends the trip is the flow that fixes the drift. That is worth more than anything else in this doc.

### Footer — 76px

Ghost **`Cancel`**, then the primary **`Update 3 counts`**. The verb and the number, because the button is committing several writes at once and *Save* would undersell it.

### After

The rows leave the list, because every one of them was put away to a count that clears its threshold. **A finished trip empties the list by arithmetic rather than by rule.**

**No toast.** Four toast triggers are already settled on the grounds that *the thing you did is visible on the screen you are on*, and three rows vanishing from the list you are looking at is the most visible confirmation in the app.

> **The 70px completion note goes.** *Shopping list → The trip bar* grows the bar to 70px with a stocked disc and *Everything's checked off. / Update your counts when you unpack.* once every row is ticked. Under restock that is green for something that is still pending — and its own meta line is a description of the button now sitting beside it. **The bar keeps one shape at every count**, and the stocked disc moves to the screen after the put-away, where nothing is pending and the claim is true.

---

## The three bands share one control

`garden-and-kitchen.md` left this open: *"What checking a Harvest or Make row does. Picking and cooking are both restocks — a write to the item — which makes the check shared rather than local. That is the reserved right half of the trip bar, and **Restock blocks this**."*

**Settled: one checkbox, one trip, all three bands.**

| Band | A check means | Written |
|---|---|---|
| **Buy** | it's in the cart | at the put-away |
| **Harvest** | I'm picking these | at the put-away |
| **Make** | I'm making some | at the put-away |

Buy and Harvest were never in doubt — a harvest is a shopping trip in your own garden, and you do not know how many pounds until you are at the sink either.

**Make is settled by the ingredient decision rather than by this doc.** A make item carries no ingredients, so making a batch has nothing to deduct and nothing to check; it raises one count, exactly as buying does. The put-away row for Chicken Stock reads *Kitchen · was 2 · low at 4* and behaves like every other row.

> **An earlier pass drew Make with its own control** — a pot glyph in the checkbox column, opening a batch sheet on the spot, on the argument that a batch writes to four other items while you are standing at the stove. That argument only exists once ingredients do. It is recorded here so that whoever builds recipes knows the question comes back: **deduction is the thing that would take Make out of the trip**, and nothing before it will.

---

## Row 2 — one word

The list mode's count line reads `1 in the cart` today. With claims it becomes **`1 in your cart`**, because there may be someone else's.

**It does not count Sarah's.** A second number in the top bar for rows you cannot act on would be chrome about somebody else's afternoon. Her claims are visible where they matter, on the rows themselves.

---

## What this unblocks

Both were recorded as blocked in `future-ideas.md → What blocks what`. Neither has to ship with restock; both are cheap once it exists.

### `Always` on the list — the tri-state

**One control, in the `COUNT` section, under the two steppers**, where the *Keep off the shopping list* mockup put its checkbox and for the reason that mockup gave: *low at* is the sentence *put this on the list when I'm down to N*, and both overrides amend it.

**It is the run list's segment**, not a new component: track 40px at radius 13, sunk `#F2EADC` on `line` `#E2D5C0`, 3px padding, 3px gaps; items 32px at radius 10, padding `0 13`, Karla 500 13.5 in body; active **surface `#FDFAF4` on `line strong` `#CFBEA3`**, ink at 600.

> **Not the ink fill**, because the sheet already has exactly one ink control and it is *Save*. That is the third answer the run list's segment already reached, arriving here with its argument intact.

The hint beneath changes with the choice, meta 12.5:

| State | Hint |
|---|---|
| **Automatic** | *On the list when you're down to **4**.* — reads the live *low at*, the way the status line reads the live count |
| **Always** | *On the list until you buy it, whatever the count says.* |
| **Never** | *Never on the list. It still shows as low or out on its card.* |

**`Always` clears on the put-away, not on the check.** `future-ideas` guessed at the check; the spine sharpens it. A check is a claim and can be abandoned; a purchase cannot. So an abandoned trip leaves the flag standing, which is correct, and an item never quietly loses its override because somebody mis-tapped in a shop.

**An `Always` row that isn't low needs to say why it is there.** Its badge slot is free — it has no status to report — so it takes a neutral badge in the same construction: **`EXTRA`**, Karla 700 9.5 / 0.1em uppercase, sunk `#F2EADC` on `line` `#E2D5C0`, label in meta. Quiet by having no hue at all, which is the argument `NO STORE` already runs on.

**And the muted-pantry worry closes itself.** A `Never` item that is low still counts in the `6 running low` pill, because *the pills count stock, not shopping*. The safety valve was already there.

> **The card marker is the unsettled part, and the cluster is now contested.** `garden-and-kitchen.md` put the source-kind glyph in the item card's top-right — *glyph · dot · chevron*. A `Never` marker would make it four. The cheap give is that only `Never` needs one — an `Always` item is visible on the list, which is where you are looking for it — and it lands on exactly the grow and make items least likely to be muted. Priced, not solved.

### Trends, tier 2 — restock intervals

A put-away writes one event per row: **item, trip, previous count, new count, moment, and the source's kind.** Discrete, deliberate, one per trip. No stepper press is ever interpreted, which is the whole reason `future-ideas` said *trends should follow restock, not precede it*.

**It lands in the hint slot that already exists** — the one under *Low at* that reads `Household default.` and disappears the moment you touch the number. With three or more restocks on record it reads instead:

> *You restock this about every **three weeks**. The last one was 16 days ago.*

**No button.** It is a line of copy with a number in it, the numeral beside it is already typeable, and a suggestion that also acts is a suggestion that gets tapped by accident.

> **The date is trustworthy and the quantity is not**, and this is the finding that changes what tier 2 may promise. Put-away doubles as drift correction, so *new minus old* is sometimes a purchase and sometimes a fix, and nothing can tell them apart. So tier 2 promises **intervals**, not rates — and stops short of *you go through four a month*, which is the sentence `future-ideas` reaches for and the data cannot support.

> **It is a household fact, not a personal one**, which sidesteps that section's own worry about a chart mixing what you eat with what your wife eats. The person is on the trip; the interval is the household's.

---

## Tokens

**No new colours.** Everything below is already in the palette.

| Part | Light | Dark |
|---|---|---|
| Trip bar fill / border | `#F2EADC` on `#E2D5C0` | `#221C14` on `#3E3527` |
| Bar ghost label / hover fill | `#4C4237` / `#F2EADC` | `#DCD0BA` / `#221C14` |
| Bar ghost glyph | `#4C4237` | `#DCD0BA` |
| `Put N away` fill / label | `#241E17` · `#F2E9DA` | `#EFE3CE` · `#241E17` |
| Claimed-row avatar | `#F2EADC` on `#CFBEA3`, initial `#6F6049` | `#221C14` on `#544737`, initial `#A5937A` |
| Claimed-row name / note | `#6F6049`, not struck | `#A5937A`, not struck |
| Sheet | `#FDFAF4` on `#E2D5C0`, radius 20 | `#2C251B` on `#544737` |
| Put-away stepper | `#FDFAF4` on `#6F6049` | `#2C251B` on `#A5937A` |
| Stepper cell hairlines · numeral | `#EEE4D2` · `#241E17` | `#3E3527` · `#F2E9DA` |
| Row source dot | the term's **base** | the term's **dark dot** |
| Row hairline | `#EEE4D2` | `#3E3527` |
| Hint / meta | `#6F6049` | `#A5937A` |
| `EXTRA` badge | `#F2EADC` on `#E2D5C0`, label `#6F6049` | `#221C14` on `#3E3527`, label `#A5937A` |
| Tri-state track / border | `#F2EADC` on `#E2D5C0` | `#221C14` on `#3E3527` |
| Tri-state item, active | `#FDFAF4` on `#CFBEA3`, ink 600 | `#2C251B` on `#544737`, cream 600 |
| Clear-checks toast | *Destructive actions → Toast*, unchanged | unchanged |

Dark counterparts are a hex-for-hex map away and have not been rendered — the Settings and Garden canvases' precedent.

---

## Motion, keyboard and screen readers

- Checking is unchanged: 120ms on the box, 140ms on the row's treatment. A claim arriving from someone else fades its row's count slot at 140ms and does **not** move the row.
- The bar appears with a 160ms fade and the grid reflows; it does not slide.
- The put-away sheet takes the Add / Edit sheet's motion unchanged. Under `prefers-reduced-motion` everything here becomes a fade.
- Tab order in the sheet: `×` → row 1 `−` / numeral / `+` → row 2 … → Cancel → Update. Each row is a `group` labelled by **name and size** — *Tomatoes, 1 qt* — because two items can share a name; the numeral is a `spinbutton` with `aria-valuemin="0"` and its buttons are *Add one* / *Remove one*.
- The bar is a `group` labelled *This trip*. On mobile the two glyph-only ghosts carry *Hide 3 checked* and *Clear checks* as `aria-label`s.
- A claimed row's accessible name ends with the claim: *"Tortillas, 10 ct — out — in Sarah's cart"*, and its list item is not in the tab order, because there is nothing on it to press.
- Committing announces `Three counts updated. 4 left to get.` through the polite region `Pantry` owns. Clearing announces `3 checks cleared.`
- `Escape` closes the sheet; with the sheet closed it still returns to the grid.

---

## Deltas that leave this doc

1. **`Shopping list → Checks are local, and they expire` is replaced wholesale** by *The trip* above. The section title was the giveaway: both halves of it stop being true.
2. **The trip bar's 70px completion variant is removed.** One shape at every count; the stocked disc moves to the after-the-trip empty state.
3. **`Clear checks` moves from the bar's right half to the left group** and gains an undo toast. It is the only existing control this doc touches.
4. **`N in the cart` becomes `N in your cart`** in list mode's row 2.
5. **`Gaps → Restock` is closed.** *"Until it exists, coming home from the shop means stepping every item by hand — the actual chore the app leaves on the table."*
6. **`Gaps → Viewer role` gains a line.** A Viewer already gets no checkboxes; they also get no trip bar, no put-away and no clear. The list stays a pure read surface, which is thinner still and worth confirming is worth reaching.
7. **The item gains one optional property** — the list override — and nothing else. No timestamps on the item; the restock log is its own table and the item does not point at it.
8. **`future-ideas.md → What blocks what` loses three rows**: trends tier 2, `Always on the list`, and checking a Harvest or Make row.

---

## Sample data

Against the 31-item set, with three claims by Justin and one by Sarah:

| Row | Source | Band | Was | Low at | Prefill | Drawn as |
|---|---|---|---|---|---|---|
| Black Beans · 15 oz | Publix | Buy | 0 | 4 | **5** | 5 |
| Tomatoes · 1 qt | Garden | Harvest | 1 | 4 | **5** | **14** — a glut, typed |
| Chicken Stock · 1 qt | Kitchen | Make | 2 | 4 | **5** | **6** — a batch made four |
| Tortillas · 10 ct | Publix | Buy | 0 | 2 | — | **In Sarah's cart** |
| Peanut Butter · 16 oz | Publix | Buy | 3 | 2 | 4 | `EXTRA` — forced on by `Always` |

Peanut Butter is the case the prefill's second half exists for: already above its threshold, so `low at + 1` would be a step **down**.

---

## Open questions

- **Can you take over a claim?** She is at Publix, she checked the butter, she has left. Nothing releases it but twenty-four hours or her own *Clear checks*. A *take it over* affordance on a claimed row is one control and a small pile of etiquette.
- **Two people put the same item away**, five minutes apart, from two shops. Last write wins is wrong and a merge is worse. This is the concurrent-edit case in *Gaps → States* with real money behind it.
- **Twenty-four hours is still a guess**, and it is now a guess that other people can see. The old failure mode was a tick vanishing while you were still in the shop; the new one is a claim vanishing while someone else is relying on it.
- **Does the put-away sheet scroll well at twenty rows?** Drawn at three. A weekly shop is not three, and a sheet of twenty steppers is a different screen from the one drawn here — possibly a grouped one, by source, the way the list is.
- **Nothing says what happens to a claim on an item someone deletes** mid-trip. The undo toast on a removal and a live claim on the same row are two features that have never met.
- **Should the trip be visible anywhere but the list?** Sarah's four claims are invisible from the item grid, which is where you are when you wonder whether anyone is already out.
- **Offline put-away is the one write that must not half-commit**, and it is the one most likely to happen on a bad connection in a car park.
- **`Put N away` is the second ink control on the screen.** Argued above; unmeasured on a real one.
- **The `Never` card marker**, and the four-item top-right cluster it would make.
- **Whether the list override is yours or the household's.** Every other property of an item is the household's, so it probably is — inherited unchanged from the mockup's two unanswered questions, and this doc does not answer it either.

---

## Boards

Own canvas, one page, desktop, light theme only:
https://claude.ai/code/artifact/c9d56a9a-6331-488d-bcc6-abf664f259db

1. **The run list, three checked** — 1440 in the shell, three bands, one claim of Sarah's, the trip bar below the grid.
2. **Put away** — the sheet over the same screen, three rows, two of them corrected.
3. **After** — the rows gone, the counts right, no bar and no toast.
4. **The trip bar — anatomy** — four states, the clear-checks undo toast, and where the green went.
5. **Always / Never** — the segment in `COUNT`, all three states with their hints.
6. **Trends, tier 2** — the *low at* hint slot, before and after.

**Mobile is not drawn.** The bar's three controls at 390 are specced above and nobody has measured them; the put-away sheet as a bottom sheet is asserted rather than drawn.
