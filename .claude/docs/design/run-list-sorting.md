# Run list sorting — Source or Type, 2 Sep

> **This is a section of `claude/ui-designs.md`, kept as its own doc** — the arrangement `add-edit-item.md`, `garden-and-kitchen.md` and `restock.md` already use, for the same reason: that file has no patch operation and has lost sections to two wholesale rewrites.
>
> It amends **Shopping list → The store card** (*"out before low, then A–Z"*), **Shopping list → Entry and exit** (the sort trigger is hidden in list mode), **Garden and Kitchen → The run list**, **Structure → Filter tab**, and **Sort menu**. It adds one optional property to a term and one optional change to an item.

Canvas — **Run List · Type Sorting**, two pages, desktop, light theme:
https://claude.ai/code/artifact/330807f5-ac2d-42c5-9971-69224d866151

- **States** — the whole run list at each sort, and scoped to a band.
- **Design** — the sort control, where the order lives, multi-type, deltas.

Working mockup: `larder-log-run-list.html` — the finalised screen, with the sort, the segment, checking and the trip bar live.

> **What is specced to build and what is a consequence.** The **sort menu**, the **type subhead**, the **term order** and the **scoped-band header rule** are specced. **Multi-type** is specced far enough to build but is a separate feature this one exposes — take it or leave it; nothing here depends on it. **The type editing row's drag handle** is specced with a measurement that says something has to give.

**One sentence: the run list's sort picks the deepest term that organises it — source only, or source then type.**

---

## The rule: source is the card, the sort is what happens inside it

*Shopping list* says the list is a **view** of the items and nothing is authored into it. That survives untouched, and it is the constraint everything below is shaped by.

Today a source card sorts its rows **out before low, then A–Z**. A–Z is not an order anybody chose; it is the order that is cheapest to compute. Every household has already told the app an order — the one its **Type** terms sit in — and the run list has never read it.

| Sort | The card | Inside the card |
|---|---|---|
| **By source** | a card per source | out before low, then A–Z. **Today's list, unchanged** |
| **By type** | the same card per source | **type → out before low → A–Z**, with a subhead per type |

**One term is inserted at the front of the sort the card already runs.** Nothing is removed: out-before-low is not dropped, it **demotes from the card to the group**. Heavy Cream still leads Dairy; Apple Cider Vinegar still leads Condiments.

### The app has no opinion about what the order means

This is the part to hold on to, because it is the part that is easy to lose.

Some households will order their types by how they walk a shop. Others by meal, by how often something runs out, by who eats it, or not at all. **Types are already the household's own vocabulary** — sixteen colours, yours to name and assign — and the order is the same kind of thing. The app never learns what it is for.

All the run list claims is: **if you put your types in an order, it will use it.**

> **Which is why no default ordering ships.** Seeding types in a "sensible" order would be the app guessing at a reason, and a guess that is wrong is worse than A–Z, because A–Z is at least predictable. See *Open questions*.

### Source stays the card, and that is structure rather than sort

A trip is bounded by one place you go. Grouping by type instead — a card per type, with the source moved into the row — was drawn and lost: twenty-two rows over nine types averages 2.4 rows a card, two of the nine hold a single row, and every card mixes three shops so each row has to carry a source dot and a source name. That is the grouping relocated, not removed.

---

## The sort control

**The trigger returns to list mode.** *Shopping list → Entry and exit* removed it on a stated reason:

> *"The sort trigger goes, because the list has one fixed order and offering to change it would be a lie."*

There are now two orders, so the reason expires. **Nothing new is drawn** — the trigger, the menu, the crimson check and the trigger-names-its-value behaviour are the item grid's, unchanged.

### Where it sits

Row 2 of list mode, pushed right, after the count text: `‹ Back to items` · the segment · `28 to get · 5 sources` · **the trigger**. That is the slot `Sort · Recent` occupies in grid mode.

### The menu

Two rows, no dividers, in the build's simplified shell:

| Row | Meaning |
|---|---|
| **By source** | out before low, then A–Z |
| **By type** | type → out before low → A–Z |

The trigger carries the short form — **`Source`**, **`Type`** — the way the grid's carries *Recent*.

> **Two rows is a thin menu and it is still the right component.** A segment would be a second segment on a row that already has one. A bare toggle would not name the state it is in, and naming the active sort on the trigger is the whole reason the grid's menu works.

### Delta — the trigger as built

*Sort menu* specs the open state as `#F2EADC` fill on `#CFBEA3`. **The build is a plain pill that names its value**: cream `#FDFAF4` on `line strong` `#CFBEA3`, radius 13, 40px, Karla 600 14.5 in ink, a 15px chevron — no `⇅` glyph, not the word *Sort*. **Open takes an ink `#241E17` border** rather than the sunk fill.

Recorded as observed and kept. It also quietly answers a standing open question: *"Top-bar controls have almost no edge against the ground"* — an ink border is the only state in that bar that unambiguously does.

---

## The subhead

**It is `garden-and-kitchen.md`'s `NOT YET` band with a dot on it.** Nothing new is drawn.

| Part | Light | Dark |
|---|---|---|
| Height | **26px**, plus a 1px `divider` top border | same |
| Fill | sunk `#F2EADC` | `#221C14` |
| Top border | `divider` `#EEE4D2` | `#3E3527` |
| Label | Karla **700 10 / 0.12em** uppercase, meta `#6F6049` | `#A5937A` |
| Dot | **7px**, the term's **base** | the term's **dark dot** |
| Inset | **56px** left, past the checkbox column | same |

**One coloured band per card, and it names the source.** The card header keeps the only term *fill* in the component — the one place in the app a term's colour fills a whole band. The subhead carries its hue in the dot alone, so the two never compete.

**A card costs 208px** at fourteen rows over eight types: eight subheads at 26 plus seven of their borders, less the seven row borders the first-of-group rows give back.

### `NO TYPE`

Last in the card, **sunk fill, no dot**, label *No type*. Quieter by having no hue at all, which is the argument `NO STORE` and `EXTRA` already run on. Opening one of its rows is how you give it a type.

### Every card takes it, and there is no minimum

A small card gets three subheads over three rows, and that is accepted rather than fixed.

> **The threshold question was live and the sort control closed it.** A rule about *runs* (a subhead heads two or more rows; a card with no runs draws none) and a row-count minimum (`7+`) produce the **same three answers** on the real data — Grocery keeps them, Market and Warehouse lose them. Neither is worth having once the sort is a choice: Market's three subheads stop being something the app imposed and become the shape of the answer you asked for. **Nothing has to decide when a subhead is worth it, because the household already did.**

---

## Where the order lives

**On the terms, not on the items and not on the sources.**

An order authored per item, or per item × per source, is an N×M relation and the one thing that would stop the run list being a pure view of item properties. **A type order is one ordered list per household** — a property of a term list that already has an order, a pencil, an editing panel and a row. It is the same move the source's `kind` made: one thing on a term that changes how the list groups.

### The editing row

The Filter tab's Type section gains a **20px drag handle** at the head of the row: handle · swatch 24 · field · count · trash 30, 9px gaps.

> **Measured, and tight.** That leaves the field about **172px** inside 340. `garden-and-kitchen.md` dropped the source row's count at roughly 150 because *Calfee Cattle* truncated. **Either the count goes from the type row too** — the same trade, the same justification, the blocked dialog still names the number — **or there is no handle and the whole row drags.** Not settled.

### What becomes visible

**The Type chip list stops being alphabetical** — in the Filter tab, in the rail's quick-filter flyout, and in the Add / Edit sheet. That is a consequence in three places nobody asked to change, and it is also the only thing that makes the order discoverable. Drag Produce to the top and the chips reorder under your hands.

### One list, not one per source

An order per source is a second ordered list on a row that has already lost its count to make room for a glyph, and it is only worth having if a household's reason for its order is source-specific — **which is a guess about why they ordered it, and the app does not get to make that guess.**

---

## One item, several types

> **Specced, not required.** Turning an item's type from a value into a set is the only change here that touches the model. Everything above works with types exactly as they are.

**A single list needs exactly one position per item.** Several types is a fine thing to *be* and an impossible thing to *place*.

**The rule: one row, under the first of its types in the household's order.** The rest filter and tag; they do not place.

The order already ranks them, so it already answers the question — **no primary-type field, no second decision when you add an item, nothing new on the sheet.** Almonds tagged Baking + Snacks sits under Baking, because that is where this household ranked it. There is no cleverness in it and there should not be: the app does not know what Baking means here, only that it sits above Snacks.

**A band that would head nothing does not appear.** With the only snack on the card already under Baking, there is no `SNACKS` subhead — the bands' own rule, one level down.

### The sheet is the whole teaching surface

A hint under the Type group, meta 12.5, present only while more than one chip is on:

> *Sorted by type, this sits under **Baking** — the first of the two in your order.*

It appears at the moment you create the ambiguity, names the answer, and disappears when only one type is on. The chips are unchanged — the group is already multi-select and the inversion already means *on*.

### Showing the row twice is the version that loses

Every number on the screen would become a choice between counting items and counting appearances — the card count, `22 to buy`, the segment, `Put N away`. A check is a claim about an **item**, so ticking one Yogurt has to tick the other or the list contradicts itself in one screen; *Restock*'s put-away sheet would show it once, and the two surfaces would disagree about how many things are on the trip. And the failure it is really named for: **you come home with two bags of almonds.**

### Two costs

**The item card runs out of room.** It has carried three tags since it was drawn — location, source, type — and three is what fits at 310px. A second type is a fourth tag and there is no ceiling. The cheap give is the placing type and a count — *Baking +1* — keeping the card at three and pushing the rest into the sheet. A different decision; not drawn.

**A filter-chip invariant breaks.** A group's counts have always summed to the item total. `Baking 10` and `Snacks 5` both count the almonds. Nothing on screen states the invariant, but `All items 75` heads the Location group and a Type group summing past it is noticed once and never unseen. **Location and Source stay single-valued**, so it is contained to one group.

---

## States

### The segment is unchanged

`All 28 · Buy 22 · Harvest 3 · Make 4`, and the sort applies inside every band.

**Harvest and Make are where the sort does nothing, and that is correct degradation.** Everything you pick is Produce, so a Garden card by type is the same card plus one header. The sort applies everywhere and only shows up where there is something to separate.

> **Make is Market again, and it is worth knowing before this ships.** Things you make get typed by what they *are* — a yogurt, a granola, two things in jars — so a kitchen spreads thin across types the way a small shop run does. Three headers over four rows, only one heading more than one. **The band the sort helps least is the band it will look worst in.**

### Scoped to one band — the tab is the header

**Picking a band renders that band alone, and its band header goes.** The lit tab six pixels above already says *Harvest 3*; a rule and a micro-label repeating the control that produced them is the one thing a scoped view should not do.

> **New, and not in any doc.** `garden-and-kitchen.md` says a tab "renders that band" and stops. This is the obvious reading and it has never been written down or drawn until now.

`NOT YET` is unaffected by either sort — it is a sub-group at the foot of the card, below whatever the sort did above it. Its rows keep the 56px height and lose the checkbox and the badge.

### A count that does not reconcile

The build's segment reads **`All 28`** against `Buy 22 · Harvest 3 · Make 4` = **29**. The mockup computes *All* as the sum of the bands and gets 29.

`garden-and-kitchen.md`'s stated reason for the two disagreeing is the out-of-season Harvest row: it is counted in the *out* pill but not in the run-list total. **But under that rule the band count excludes it too, so the two should agree.** Either `All` is off by one, or a band count is, or there is a rule nothing has written down. **Worth checking against the build before either number is treated as spec.**

---

## Tokens

**No new colours.** Everything is already in the palette. Two term assignments are new and need confirming — see *Open questions*.

| Part | Light | Dark |
|---|---|---|
| Subhead fill / top border | `#F2EADC` / `#EEE4D2` | `#221C14` / `#3E3527` |
| Subhead label | meta `#6F6049` | `#A5937A` |
| Subhead dot | the term's **base** | the term's **dark dot** |
| `NO TYPE` subhead | `#F2EADC`, label `#6F6049`, no dot | `#221C14`, `#A5937A` |
| Sort trigger, rest | `#FDFAF4` on `#CFBEA3`, label `#241E17` | `#2C251B` on `#544737`, `#F2E9DA` |
| Sort trigger, open | `#FDFAF4` on **`#241E17`** | `#2C251B` on **`#F2E9DA`** |
| Menu | `#FDFAF4` on `#E2D5C0`, `0 14px 30px rgba(36,30,23,.20)` | `#2C251B` on `#544737` |
| Menu row, selected | ink 600 + `#BE3346` check, **no fill** | cream 600 + `#D4636B` check |
| Handle glyph, editing row | drawer rest `#9E8C74`, hover `#D8CBB6` | same |

---

## Motion, keyboard and screen readers

- Changing the sort is the existing grid → list crossfade: 160ms, cards rising 8px, staggered 20ms. Rows do not animate between positions — there is no FLIP anywhere in this app and this is not the place to add one.
- Subheads do not animate in or out; the card reflows at 160ms as it already does.
- Under `prefers-reduced-motion` all of it becomes a fade.
- **The menu takes the sort menu's keyboard behaviour unchanged**: Escape closes to the trigger, focus returns on close, arrows move between rows.
- **Each type group is a labelled `<section>` inside the card's `<ul>`** — the `NOT YET` contract, reused. A subhead is not a control and does not enter the tab order.
- Changing the sort announces `Sorted by type.` through the polite region `Pantry` owns.
- **Reordering terms needs a keyboard path.** The handle has to take arrow-key move with an announcement per step — *Produce, position 1 of 9* — and nothing in this app has one yet. Cheapest thing here to get wrong.

---

## Deltas that leave this doc

1. **Terms gain an order.** Today a term is a name and a colour; sources also carry a kind. Amends *Structure → Filter tab* and *Chips and tags*.
2. **The Type chip list stops being A–Z** in the Filter tab, the quick-filter flyout and the Add / Edit sheet.
3. **The type editing row gains a handle** and probably loses its count — the same trade `garden-and-kitchen.md` already made on the source row.
4. **The sort trigger returns in list mode**, closing *Shopping list*'s "one fixed order" line, and the trigger is recorded as the build's simplified pill with an ink-bordered open state rather than *Sort menu*'s sunk fill.
5. **`Shopping list → The store card`'s ordering rule gains a term** — *type → out before low → A–Z* under one of the two sorts.
6. **A scoped band drops its header.** New; amends *Garden and Kitchen → The segment*.
7. **The item may carry a set of types** — optional, and the only model change here.
8. **`Gaps → Robustness` gains a line:** a subhead at 26px between 64px stacked rows on mobile has never been looked at.

---

## Sample data

The 75-item household, run list only. **22 to buy · 3 to pick · 4 to make.**

| Source | Kind | Rows | Types present |
|---|---|---|---|
| Grocery | shop | 14 | Produce 2 · Baked Goods 1 · Dairy 3 · Breakfast 1 · Protein 2 · Baking 1 · Beverages 2 · Condiments 2 |
| Market | shop | 3 | Produce 1 · Baked Goods 1 · Condiments 1 |
| Warehouse | shop | 5 | Produce 1 · Dairy 1 · Breakfast 1 · Baking 1 · Condiments 1 |
| Garden | grow | 3 | Produce 3, plus one `NOT YET` |
| Kitchen | make | 4 | Dairy 1 · Breakfast 1 · Condiments 2 |

Household type order: **Produce · Baked Goods · Dairy · Breakfast · Protein · Baking · Beverages · Condiments · Snacks**.

**Grocery is what the sort is for** — fourteen rows in eight clusters instead of one alphabetical run of fourteen. **Market is what it costs** — three headers over three rows, saying nothing. Both are the same treatment applied consistently.

**Almonds is the multi-type case**: Baking + Snacks, in Warehouse, sitting under Baking. It is drawn on the finished screen with no explanation at all, which is the point.

**Butternut Squash is out and out of season**, in Garden's `NOT YET`.

---

## Open questions

- **Which sort is the default.** *By source* is today's behaviour and the safe start; a household whose types are nine untouched seed terms would otherwise get an order nobody chose. But a feature nobody finds is a feature nobody has.
- **Whether the sort is yours or the household's.** Appearance is a *Preference*; the low-at default is a *Pantry setting*. A sort sits closer to Appearance — but two people on one trip seeing two different orders is its own confusion.
- **Losing the OUT rows off the top of the card.** Out-before-low demotes to the group, so Apple Cider Vinegar is the thirteenth row. Argued; **unmeasured on a real trip**, and the case it hurts is triage rather than working down the list.
- **The handle, or the count.** The type editing row cannot comfortably hold both at 340px.
- **`All 28` against 29.** Reconcile against the build before either is spec.
- **Two new term colours.** *Baked Goods* is drawn **cocoa** `#5E4A3C` and *Breakfast* **indigo** `#5A548C`; *Snacks* is drawn **stone** `#6E6A5F` rather than clay, because clay is Market's and a type sharing a source's hue reads as a relationship. None of the three is in the seed table.
- **Mobile is not drawn.** The subhead is not a control so it does not owe 44px, but a 26px band between 64px stacked rows has never been looked at — and row 2 gains an element it has not been measured with. The trigger's short labels (*Source*, *Type*) are shorter than the grid's *Recent*, which helps.
- **Whether a type becomes a set at all.** The one model change. Worth being sure the motivating examples are real category questions — *Frozen* is not one, that is a Location and the app already has it.

---

## Boards

Canvas above, two pages, desktop 1440, light theme only.

**States** — three:

1. **All · sorted by source** — today's run list, three bands, five cards.
2. **All · sorted by type** — the same twenty-eight rows, the same cards, the sort flipped.
3. **Scoped to one band** — Harvest and Make with their tab lit, no band header.

**Design** — five:

1. The run list, sorted by type — the finished screen.
2. The sort — the grid's menu as built beside the run list's two-row one.
3. Where the order lives — the Type section in editing, with handles.
4. One item, several types.
5. Deltas, and what's open.

**Dark is not drawn** — a hex-for-hex map away, the Settings and Garden canvases' precedent. **Mobile is not drawn.**
