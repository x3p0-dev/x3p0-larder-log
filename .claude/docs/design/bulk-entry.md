# Bulk entry — the adoption wall, 31 Aug

Canvas — eleven boards on three pages, light theme:
https://claude.ai/code/artifact/8132543d-7a3c-4bc7-8801-06eb762aa975

> **This is a sketch, not a spec.** It was drawn quickly and deliberately, and about half of it is settled: the way in, the shape of the review, and what the Add sheet gains. The parse rules, the duplicate matching and the undo question are all named below and none of them are decided.
>
> It answers *The cost of getting started* in `future-ideas.md` — *"twenty items is the sample dataset; a real pantry is two hundred… that's the adoption wall, and it's invisible from inside a design doc."* Two of the four ideas listed there are drawn (a paste importer, a common-items list); barcode is not.

## The shape, in one line

**Paste and the common-items checklist are both just *sources*. The review table is the destination, and nothing is written until you press Add.**

That is the whole structure, and it is what stops the two features being two features. A checklist that committed on its own would put 31 items into the pantry at 0 on hand — which, by *Shopping list*'s own rule, is 31 rows on your shopping list on day one. Routing it through the same review the paste uses, where counts default to 1, avoids that without a special case.

---

## Getting in — the primary splits

**Settled 31 Aug, after three rounds of trying to fit it somewhere else.**

The `Add item` primary grows a chevron. **Pressing the label opens the sheet exactly as it does today; pressing the chevron opens a menu holding the other routes.** The Add sheet itself carries none of this.

| Route | Reached by |
|---|---|
| One item | The label. Unchanged |
| Paste a list | The chevron menu |
| Start from common items | The chevron menu |

**Three rounds went into the sheet first, and all three lost to the same objection once it was named.** A ghost row under the header, a `One item / A list` segmented control in the header, and a footer link on the far left — each of them makes the sheet you open for one item carry a permanent argument about many. The sheet is for one item; the button is for choosing.

> **The default is deliberately absent from the menu.** Pressing the label already does it, and a menu that repeats its own button's action is a second way to do the same thing three pixels away.

### The control

**It is the primary, unchanged, with a second cell.** Fill `#241E17`, radius 14, height 52 — nothing new. What is new is the split.

| Part | Treatment |
|---|---|
| Label cell | `+` glyph 16 + *Add item* at Karla 600 16 in `#F2E9DA`, padding `0 16 0 20` |
| Rule | 1px `#6F6049`, inset 13px top and bottom |
| Chevron cell | 44 wide, 14px chevron in `#F2E9DA`, flipping on open |

| State | Treatment |
|---|---|
| Rest | `#241E17` |
| Hover — label | Label cell only to `#332B22` |
| Hover — chevron | Chevron cell only to `#332B22` |
| Focus-visible | 2px `#BE3346`, 2px offset in the ground, **around the whole control** |
| Open | Chevron cell `#332B22`, chevron flipped |

**Each half lights on its own, and that is the entire affordance.** Two hit areas, one shape — hovering the label must never light the chevron. And *open* is a state the **chevron** holds, not the button, because the button did not open anything.

**Hover is `#332B22`, one step lighter than ink.** Derived rather than looked up: nothing in `ui-designs.md` gives the primary a hover, and `#332B22` is the drawer-raised token, which is the same one-step-lighter move the drawer's ghost hover already makes.

**There is one focus stop, not two.** The ring goes round the whole control; `↓` opens the menu from it. Two tab stops on one button is how a split control becomes annoying with a keyboard.

### The menu

**The sort menu's construction, minus the check.** 248 wide, radius 14, surface on `line`, shadow `0 14px 30px rgba(36,30,23,.20)`, 6px padding, rows 36px desktop / 44 mobile at radius 9, 14px ink.

**No check and no selected row.** Nothing here is a current value — these are two actions — so the hover fill is free to mean hover, which is the one thing the sort menu's own rule says a fill cannot do when it is also marking selection.

**Right-aligned to the button's right edge**, 8px below. The control sits at the end of row 1, so a left-aligned menu hangs off the column. It closes on a pick: each row is a choice made once, which is the household/appearance/account rule rather than the quick-filter one.

---

## Save and add another

**A separate decision that arrived with this work and is worth keeping regardless of it.** The Add sheet's footer gains a second commit: save, clear, stay open.

**It is not the bulk answer and should not be sold as one.** It solves nine things from one shop very well and two hundred from a list not at all. What it does solve is the part the review table has to guess at — the terms.

### Four decisions it forces

**1. Location, Store, Type and the low-at carry over. Name, size and on-hand clear.**

The sub-label says so, beside the group's micro-label: *Kept from the last one*. Nine things out of one freezer should not cost nine passes through three chip groups — which is the same insight the rejected "repeating rows" concept had, without the sheet having to grow rows. On-hand returns to the household default and focus returns to the name field, so the next item starts with a keystroke rather than a tap.

**2. The confirmation is the header, not a toast.**

*Add an item · 3 saved*, in meta beside the Playfair title. Same argument the invite composer makes — the thing you did is visible on the screen you are on — plus a practical one: a toast firing nine times in ninety seconds is noise, not feedback.

**3. Cancel has to stop saying Cancel.**

Once anything has been saved, the sheet cannot be cancelled: those items are in the grid behind it. **The ghost relabels to `Done` on the first save.** Same rule as *Leave household* relabelling to *Delete household* when you are the last member — a control must not promise something softer than it does.

**4. The footer restacks at 390.**

Three controls do not fit across 326px, and shortening the label to *Save & add another* buys about 20px — not enough. The repeat takes a **full-width row above the pair**, which also puts the thumb-reachable control on the action you are about to press eight more times.

---

## Paste your list

**A 520 dialog on the confirm shell on desktop; a bottom sheet at 390.** The width follows the admin console's deletion pre-flight rather than the 420 confirm, because this one holds a text field.

> **At 390 it is not the centred confirm shell, and the reason generalises.** *Destructive actions* centres the confirm on mobile because *"a confirm is a question, and centring keeps it out of the thumb zone the Add sheet owns."* This is not a question — it is an entry surface with a keyboard about to cover half the screen. So it takes the Add sheet's shape: near-full-height bottom sheet with a grabber.

**The parse reads a name, a count, and a size.** One item per line; a bare number after the name is the count; a number with a unit is the size. It **never guesses a location, store or type**, because a paste cannot know them.

**The dialog carries the other route in its foot** — *Start from common items* — under a hairline, as a ghost row with the chevron. That is how the checklist is reached without the chevron menu being the only door.

**The primary counts what it will do**: *Read 24 lines*.

---

## The review

**A mode that replaces the content column, exactly as the shopping list is a mode.** Row 1 does not change. Row 2 becomes `‹ Back to items` on the left and `24 lines · 22 new · 2 already here` pushed right, in the slot `Showing X of Y` occupies.

### The table

One card, radius 20, surface on `line`. A sunk header band carries `PASTED LIST · 24 LINES` on the left and, on the right, the thing that decides whether any of this works:

**`Set for all` — three triggers, one per term group.** Bulk entry that leaves you assigning three chips per row two hundred times has not solved the wall it was built for. This is the one control on the screen that has to be right.

### The row

62px desktop, hairline between:

| Slot | Content |
|---|---|
| Left, 44 | The checkbox — 22px, radius 7, the chip rule |
| Name | Playfair 600 17, with the parsed size in meta beside it |
| Count | A 76 × 38 field at radius 11, `meta` border, numeral in Playfair |
| Chips | The three groups — dashed `+ Location` where nothing was set |
| Right, 120 | `NEW` in the stocked tokens, or `ALREADY HERE` in the low ones |

**A duplicate arrives unchecked, in amber, showing what you already have.** *4 on hand · low at 6*, its real tags rather than dashed chips, and no count field — nothing is going to be written to it. Amber because **amber is "hold on" and crimson is "gone"**; nothing here is being destroyed.

**Below 460 the row stacks two-deep** — name and badge above, count and chips below. That is the same shape that made "put the review inside the 480 sheet" unworkable on desktop; at 358 there is no other shape available, so on a phone it stops being a compromise and is simply the row.

### The commit bar

Below the card, 24px down: the trip bar's construction — sunk fill, `line` border, radius 15, 56px. Left, in meta: *2 lines skipped · nothing is written until you press Add*. Right: ghost *Cancel* and the ink primary, *Add 22 items*.

---

## Start from common items

**The same review surface, seeded from the catalog instead of from a paste.** Grouped by type, **one card per type**, in the shopping list's own `repeat(auto-fill, minmax(min(460px, 100%), 1fr))` grid — the store card's construction with a type tag in the header band. Zero new components.

Rows are 48px: a 22px checkbox and the name in Playfair 600 17.

**Its primary reads `Review 31 items`, not `Add`.** That is the whole reason it is drawn this way — see *The shape, in one line*.

**It is the phone-shaped route.** Nobody pastes two hundred lines one-handed; ticking boxes is exactly what a thumb is for. Which suggests the chevron menu's row order should flip at 390 — noted below rather than decided.

---

## The empty larder

**Option 1, settled: the primary, then a ghost beneath.** `+ Add item` in ink, and under it *Add several at once ›* as a pressable sentence rather than a button.

**Day one keeps both routes spelled out** rather than taking the chevron, because this is the one screen in the app with room and nothing else competing for it. It is a deliberate second idiom for the same job, and the argument for it is only as good as the screen — worth revisiting if the app grows another empty state.

> **This board is drawn from the build, not from this document, and the two disagree.** At zero items the live app has **no top bar at all**, and the empty state **does** carry a primary. `ui-designs.md` says the opposite twice — *"Row 1 does not change… search and Add item are permanent and the same in every mode"* and *"the empty state carries no primary… No button."* The rule about not duplicating row 1's primary cannot apply on a screen where row 1 is absent. This is the fifth component caught drifting; see *Deltas*.

---

## Mobile

Six screens at 390 on their own page. What changes, beyond the two decisions already recorded above (the paste bottom sheet, the stacked review row):

- **The split loses its label and keeps its chevron** — 52px square plus a 34px chevron cell, costing search about 35px. The alternative, a long-press, is a gesture nobody discovers.
- **Menu rows go to 44px** and stay an anchored popover, per the sort menu's precedent at this width.
- **The review's commit bar keeps the primary and drops the prose** to `2 skipped`.
- **Common items is one column** of type cards.

---

## Deltas — what leaves this section

**`ui-designs.md` is wrong about the empty state, in two places.** Recorded under *The empty larder* above. It belongs in *Gaps → The document has drifted from the build*, which already lists four; this is the fifth, and unlike the others it was actively load-bearing in an argument.

**The split button is the first of its kind in the app.** Everything it needs is derived from tokens that already exist — no new colour — but the *component* is new, and the derivations (hover at `#332B22`, one focus stop, per-half hover) are recorded above rather than assumed.

**A 34px chevron cell at 390 is under the 44px floor.** Every other mobile control in these docs clears 44. Growing this one to 44 costs search another 10px, which puts the field around 240 on a phone. It is a real trade and nobody has held it in their hand. It is the one number in this document most likely to be wrong.

---

## Open questions

- **What does undo mean for a bulk write?** Nine rapid `Save and add another` presses are nine writes; a review commit is one write of twenty-two. Whether either is undoable as a *run*, or only as twenty-two ordinary removals, is the same question in two places and should get one answer. It also lands squarely in *Gaps* — *"which non-destructive events earn a plain toast"* is still unsettled, and "22 items added" is the strongest candidate on that list.
- **Does the parse claim sizes at all?** `Basmati Rice, 5 lb, 2` is drawn as name + size + count, but `Butter 1 lb 2` and `Butter 1 2` are a coin flip. The stated rule — a bare number is the count, a number with a unit is the size — is the honest fallback, and it makes `Chickpeas 15 oz, 6` the only shape that reliably works.
- **The duplicate check is name-only**, matching autofill's rule. It will not catch *Butter* against *Salted Butter*, and nothing on the screen says so.
- **Does `Set for all` need an undo?** Setting a location on 22 unsaved rows is not a record yet, so by *undo what comes back, confirm what doesn't* it should get neither a toast nor a confirm. Worth confirming that reading.
- **Should the chevron menu's row order flip at 390?** Paste leads on desktop; on a phone the checklist is the plausible one.
- **Does the empty larder eventually take the chevron too?** Two idioms for one job is how a system frays. Settled as *no* for now, on the strength of that screen having room.
- **Barcode is not drawn.** It was scoped out of this round. It is the only one of `future-ideas.md`'s four suggestions that needs something the app does not have — a product database and a camera permission flow — and it fails differently from everything here: silently, on a bad lookup.

---

## What blocks what

| This | Needs first | Why |
|---|---|---|
| The review's commit | **An answer on bulk undo** | One write of 22 items with no undo is the largest single action in the app |
| `Save and add another` | Nothing | It is a footer button and a rule about what carries over |
| The split primary | Nothing | Derived entirely from existing tokens |
| The common-items checklist | **The catalog** | `autofill.md` already records that its source, locale and plurals policy are undecided |
| Paste, at all | Nothing | Which is most of the argument for doing it first |
| The 390 chevron | **A real phone** | 34 against a 44 floor is not a decision anyone can make on a canvas |

---

## Boards

Three pages on the canvas above.

**The flow** — seven boards:

1. **Getting in** — the empty larder, the split primary in the top bar, and the three that lost
2. **Where each way in lands** — the map, including `Save and add another` looping the sheet back on itself
3. **The split primary** — in place, five states, the menu, 390, and the empty-larder question
4. **Save and add another** — the footer, the sheet after the third press, 390, and the four rules
5. **Paste your list** — the dialog on the confirm shell, over the empty larder
6. **Review** — the table, part-corrected, with the commit bar
7. **Start from common items** — the checklist, four type cards

**Mobile** — one board, six screens at 390.

**Explorations** — three boards, nothing on them is a spec: five splits for the empty larder, five ways the sheet could have offered many, and four concepts that questioned whether "many" needs to be a mode at all.

> **Drawn in light theme only.** Every token used has a dark counterpart already in `ui-designs.md`, so the dark boards are a hex-for-hex map away and have not been rendered.
