# Garden and Kitchen — sources you grow and cook from, 28 Aug

> **This is a section of `claude/ui-designs.md`, kept as its own doc for now** — the same arrangement `add-edit-item.md` uses, and for the same reason: that file has no patch operation, and it has already lost sections to two wholesale rewrites.
>
> It replaces **Shopping list** wholesale, amends *Structure*, *Collapsed rail*, *Chips and tags*, *Item card*, *Sample dataset*, *The marketing page* and *Gaps*, and adds one delta that reaches back into *Destructive actions*.

Canvas — **Sources and Recipes**, eight boards on two pages, both drawn light-theme only:
https://claude.ai/code/artifact/4062beb8-260b-4d73-906f-534fe813ed12

> **This replaces the earlier *Garden and Kitchen Modes* canvas**, which took a save from somewhere this session could not read back and could no longer be merged onto. That one is stale from the ingredient-quantity work onward; nothing after it is on there. The name changed with it, because eight boards in the canvas now cover source kinds, the run list, ingredients and the recipe direction — more than the two modes it started as.

> **What is in v1 and what is a mockup.** Source kinds, the run list with its bands and segment, the group's naming rule, the season field and the item-card glyph are **specced to build**. Everything about **recipes** — the ingredient panel, quantities, units, the picker, the *See recipe* link, and both models on board 6 — is a **marked mockup**. A make item ships with a `MADE BY` panel that says recipes are coming and explains what marking it as made already buys.

Four things, and they are all one thing: **a source carries a kind**, the shopping list becomes a **run list** of three bands with a segment over it, and an item gains a **season** or a set of **ingredients with quantities** depending on which kind it comes from.

---

## The rule: a source carries a kind

**Shop · Grow · Make.** It is a property of the term, not of the item, not a fourth term group, and not a mode.

*The Garden* is a source of kind **grow**. *The Kitchen* is a source of kind **make**. Both take a term colour, both appear in the filter group, both tag an item card exactly as Costco does. **The drawer never learns what a kind is** — filtering by The Garden works identically to filtering by Publix, and the chip, the dot, the count and the quick-filter flyout are all untouched.

Everything below falls out of that one property.

### Why it exists: `NO STORE` was carrying two meanings

*Shopping list → The store card* draws `NO STORE` in the sunk fill with no dot and says *"Opening one of its rows is how you give it a store."* That copy assumes an empty store is a **gap** — something you have not filled in yet.

Four of the twenty sample items had no store. Baking Soda has none because nobody set it. Frozen Peaches may have none because *there isn't one*. Those are opposite facts and the list drew them identically. The moment you grow or cook anything, the empty store splits three ways:

| Case | What it means | What happens when it runs low |
|---|---|---|
| Not set yet | A gap | Sits in `NO STORE` asking to be filled in — unchanged |
| We grow it | There is no shop | It belongs on a harvest list, never a shopping list |
| We make it | There is no shop | It belongs on a list that says what to cook |

### Why the kind sits on the source rather than the item

A source is already a coloured, named thing in a list that you filter and tag with. Adding one property to it costs one glyph in one panel. Putting the kind on the *item* would mean a fourth chip group, a fourth colour list, and a second thing to set every time you add anything.

> **The counter-argument, recorded because it is the one that could sink this.** You buy tomatoes at Publix in February and pick them in July, so an *item* can have two sources. Under this scheme that is either two items or one item whose source you change twice a year. Nobody has lived with it.

> **`Calfee Cattle` was always a slightly odd store, and this is the tell.** A rancher is not a shop, but it is a place you get beef from, so it went in the store list because there was nowhere else. It stays a **shop** under this scheme, which is right — you still drive there.

---

## The group's name follows what's in it

**One kind and it is a Store. More than one and it is a Source.**

| Household | Group header | Dashed chip | Composer header |
|---|---|---|---|
| Every source is a shop | `STORE` | `+ Store` | `STORE · EDITING` |
| Any grow or make source exists | `SOURCE` | `+ Source` | `SOURCE · EDITING` |

It applies in four places at once — the Filter tab header, the dashed chip that ends the list, the editing panel's micro-label, and the same group's label on the Add / Edit sheet. They move together or the app contradicts itself in the space of one screen.

**Nothing else in this app renames itself, so this is the exception and it has to earn it.** It does: the alternative is calling The Garden a store, which is exactly the confusion the kind exists to remove.

**And it changes only when you change the list.** Adding a grow or make source is a deliberate act inside the editing panel, and the heading directly above your hands is what changes. That is what separates it from a control that renames itself while you watch — the failure mode the shopping-list trigger is still stuck with under *Open questions*.

> **`Source` is the working word, not the settled one.** *Where from* is the plainer alternative and reads closer to this app's voice, at the cost of being two words in a slot built for one; it has not been drawn. *Origin* and *Supply* were both colder than anything else in the interface.

---

## The run list

**The shopping list becomes the run list.** It is still a *view* of the items and still authored by nothing — an item arrives when its count drops under its low-at and leaves when someone puts the count back up. What changes is that it now groups by **kind first, source second**.

### Bands

Three, in this order, each present only when it has something in it:

| Band | Holds | Label |
|---|---|---|
| **Buy** | Every low-or-out item whose source is a shop, or has no source | `BUY · 12` |
| **Harvest** | Sources of kind grow | `HARVEST · 3` |
| **Make** | Sources of kind make | `MAKE · 2` |

The band header is a **micro-label** — Karla 700 10.5 / 0.15em uppercase in meta — with a 15px stroke glyph before it and a 1px `line` rule filling the remaining width. 12px beneath the header, 34px between bands.

**Inside a band nothing changes.** The same `repeat(auto-fill, minmax(min(460px, 100%), 1fr))` grid at 24px, `align-items: start`, source cards A–Z with `NO STORE` last, out before low then A–Z inside a card.

> **`auto-fill` earns its keep again, and this time by accident.** The Harvest and Make bands usually hold one card each. In a two-column grid that card stays 642px rather than stretching across the column — which is precisely the behaviour *Shopping list* chose auto-fill for: *"with one store card left after a filter, auto-fit would stretch it across the whole screen."* The bands got it for free.

### The segment

**Row 2 of list mode, immediately after `‹ Back to items`:** `All 17 · Buy 12 · Harvest 3 · Make 2`.

- Track: 40px, radius 13, **sunk** `#F2EADC` on `line` `#E2D5C0`, 3px padding, 3px gaps.
- Item: 32px, radius 10, padding `0 13`, Karla 500 13.5 in body, count in meta 12.5.
- Active: **surface `#FDFAF4` on `line strong` `#CFBEA3`**, ink label at 600, count in ink.
- Every item but `All` carries its band's 15px glyph.

**`All` is the default, and that is the whole design.** It renders the banded screen, so the first thing you see is every kind at once — *you're out of stock, and the carrots for it are on the Publix card two bands up*. The other three tabs are there for the moments the activities actually separate: at the shop, in the garden, at the stove.

**The active state is not the ink primary.** *Add item* is still on screen in row 1 and ink is the thing you press; a second ink fill would be two primaries on one screen. Surface-on-`line strong` is a third answer to the drawer-chip question the docs already have two answers to, and it is recorded as such.

**`All` carries no glyph**, because it is the absence of a choice rather than a member of the set — the same argument the drawer's `All items` chip already runs on.

**The segment appears only when more than one band has content.** A household with no grow or make source sees no segment, no bands, and today's shopping list byte for byte. That degradation is most of why this shape won.

### Row 2, in full

`‹ Back to items` · the segment · then `2 in the cart` pushed right. The three status pills and the sort trigger still leave when you enter list mode, which is the room the segment lands in. Row 1 is unchanged in every mode. Row 3 — the applied filters — still comes with you.

### The way in

The top-bar trigger is unchanged: the amber-bordered control after the status pills, its count the **total across all bands** (17, not 12).

> **Its label is the one thing this structure still costs.** *Shopping list* stops being literally true the moment three of the seventeen are things you pick. The segment takes some of the pressure off — *Buy* is now a tab with its own name and count — but the word on the way in is still wrong. `To get` is drawn beside it on the anatomy board. Neither is chosen.

---

## Three kinds of card

One component. Two additions, both small.

### Buy — unchanged

Every rule in *Shopping list* holds: the header is the tag component stretched to the card's width, rows are 56px with a hairline between, the checkbox is the chip rule at 22px on a 2px `meta` border.

### Harvest — one sub-group

The rows are identical. What is added is **`NOT YET`**: a sub-group at the foot of the card for sources in the wrong season.

- A `subhead` band — sunk fill, 1px `divider` top border, micro-label at 10px in meta, inset past the checkbox column to 56px left padding.
- Its rows keep the 56px height and lose two things: **the checkbox** (there is nothing to pick) and **the status badge** (the count slot says *Ready in September* instead). The name drops to meta.

**An out-of-season item still reads low or out on its card.** The season moves it between groups on this screen; it does not change what is true about the item, and the three status pills do not move.

### Make — the row that grows when there is a recipe

**56px until something can answer *can I make this now*, then 76**, carrying one extra line under the name:

| Case | Line | Colour |
|---|---|---|
| Every ingredient in stock | *You have everything — milk* | stocked text `#47592F` |
| Something missing | *Missing carrots — the rest is in stock* | out text `#9A2E3B` |

The name, size and badge sit on the top line exactly as they do in a 56px row; the counts stay right-aligned and vertically centred against the whole row.

> **The missing ingredient is usually already on the Buy band above**, because it is an item like any other and it is out. That adjacency is the argument for `All` being the default, and it is the one thing neither of the losing options could reproduce.

---

## Setting the kind

**The Filter tab's editing panel, and nowhere else.** The pencil flips the source section into the panel it already flips into; the row gains one 30px ghost glyph between the field and the trash.

| Row, before | Row, now |
|---|---|
| swatch 24 · field · **count** · trash 30 | swatch 24 · field · **kind 30** · trash 30 |

Gap 9px throughout. The dashed row at the foot reads `+ Add a source`.

**The glyph is the kind**: a cart for shop, a sprout for grow, a pot for make. A shop's cart sits at the drawer's rest colour `#9E8C74`; grow and make brighten to `#D8CBB6` — the two kinds that change what the row does, marked so you can see at a glance which rows are not shops.

Pressing it opens a **three-row menu on the drawer's own surface** — `#241E17` on `#4A4031`, radius 14, 6px padding, 36px rows at radius 9, shadow `0 16px 40px rgba(10,8,5,.44)`, the current kind at 600 cream with a `#D4636B` check rather than a fill. That is the Members pane's role menu with different words in it, and the trigger takes the same cream open state. **Nothing new is drawn.**

### Delta — the item count leaves the editing row

*Destructive actions* added it: *"The row also gains the item count in meta text between the field and the trash, so the outcome is predictable before you reach for it."* **It is removed.**

At 340px the row was already swatch · field · count · trash. A fifth slot leaves the field around 150px, which is where *Calfee Cattle* starts truncating — and a source you cannot read is worse than a delete whose outcome you have to discover. **The kind glyph is what took the space**, so this is a consequence of the feature rather than a change of mind about the count.

**What it costs:** the blocked dialog is now the only place you learn a term is in use. That dialog already exists, already names the number (*Pantry holds 3 items*), and already offers *Show the 3 items* — so nothing is unreachable, it just takes a press. **Counts stay on the chips at rest**, where the chip is the thing you press and the number is what pressing it will do.

---

## The item side

### Season, on a grow item

A recessed panel drops in **below the source chips**, using the inline composer's construction on a cream sheet — `#F3EBDD` on a 1px inset `#DFD2BC`, radius 14, 14px padding — with an `IN SEASON` micro-label and two 44px month triggers separated by the word *to*.

**It appears because of the source, not beside it.** Pick a grow source and the panel is there; pick a shop and it never existed.

**Months, not dates.** No year, no locale, no format — a season repeats and a date does not. It is the same argument the Members pane's *Expires in 12 days* countdown already makes, one step further.

Hint beneath, in meta 12.5: *Only asked because the source you picked is one you grow. Out of season the item still reads low or out on its card — it just moves to Not yet on the harvest list.*

### Ingredients — on the recipe, never on the item

> **Mockup — not in v1.** Recipes are not being built yet. Everything in this subsection is drawn on board 3 and specced here so the shape is known, but nothing that ships depends on it. What ships is the **source kind and the Make band**; what an item sheet says in the meantime is under *Made by* below.

**A make item carries no ingredients.** It answers *do we need more* from its own count and its own low-at. Drawing an ingredient list on an item sheet would be the pantry knowing about cooking, which is the one thing the direction rule forbids.

The panel below lives on the **recipe sheet**, under an `INGREDIENTS` label and a hint reading *What one batch uses. A stepper means the app can check it.*

**Rows, not chips — a chip cannot carry a number.** A chip is a toggle; an ingredient is a record with two fields. The row is the Filter tab's editing row with the size field's number box in front of it, so nothing new is drawn.

**Three kinds of row, and the rule that tells them apart: a row with a stepper is one the app can check.**

| Row | Shape | Example |
|---|---|---|
| **Counted** | stepper · name · size · have · `×` | *2 Chicken Carcasses — have 6* |
| **Measured** | stepper · **unit** · name · size · have · `×` | *2 cup Milk · 1 gal — have 32 cup* |
| **Untracked** | indented free text · *not tracked* · `×` | *A good pinch of salt* |

| Slot | Spec |
|---|---|
| Quantity | **82 × 38 stepper**, radius 10, `#FDFAF4` on `meta` `#6F6049` — 26px cells either side of a 30px numeral, `divider` hairlines between |
| Unit | 38px trigger at radius 10 on the same border, **present only when the item carries a size** |
| Name + size | flex, `min-width: 0`. Name ink 14.5 and **truncating**; size meta 12.5, 7px after it, **not truncating** |
| Have | auto, 12.5px, **stocked `#47592F` when it covers the quantity, out `#9A2E3B` when it doesn't** |
| Remove | 26px ghost `×`, the composer's abandon glyph |

44px rows, 10px gaps, inside the composer's `#F3EBDD` on inset `#DFD2BC` at radius 14.

**The stepper is symmetric and neutral** — both cells in body ink, neither carrying the fill the item card's plus does. That is the sheet's own rule for its two big steppers, and the reason is the same: this sheet already has exactly one ink control and it is *Save*. **The numeral is a field**, so a quantity of 12 is typed rather than tapped twelve times, and press-and-hold repeats after 400ms.

### The name is not an identifier

**A pantry routinely holds "the same" thing in two sizes** — the quart jars of tomatoes you put up and the 15 oz cans you buy are two tracked items with one name. In a list of ingredients that is not a cosmetic problem: *2 Tomatoes* is two different sentences.

**So the size rides with the name**, in meta at 13, 8px after it — which is not a new rule, it is *Shopping list → The row* applied where it was always going to be needed: *"At the shelf 'Butter, 1 lb' is one phrase."* The name truncates inside the flex; the size does not, because the size is often the only thing telling two rows apart.

> **This is what retired the dot problem.** The chip version carried stock in the dot, which broke the rule that a chip's dot is its term's colour. A row has room for *have 6* in words, so the dot is gone and *Chips and tags* stays as written.

#### Untracked ingredients

**Salt is never going to be a pantry item.** Nor is pepper, nor the oregano. A recipe that cannot name them is not a recipe, and forcing them into the pantry to be nameable puts them on a shopping list for ever.

So an ingredient may be **free text**: no stepper, no unit, no *have* reading, and it never reaches the batch count. It carries its own quantity in its own words — *a good pinch*, *2 bay leaves* — because there is no count to step and no measure the app shares.

**The absences are the signal, and they sit in the two slots that would otherwise be filled.** No stepper where the stepper goes; *not tracked* in faint where *have 6* goes. The text indents to the name column so the list still reads as one list, in the order you would cook it.

**The batch line names them rather than ignoring them**: *Salt isn't tracked, so nothing checks it*, in faint under the count. The figure never implies a check it did not do.

**The picker gains a second door.** When nothing matches, the menu offers both, lighter one first:

| Option | Meaning |
|---|---|
| `Add "Salt" as an ingredient` | *not counted* — free text on this recipe only |
| `Track "Salt" as a pantry item` | *counted, can run low* — a real item, at 0 on hand |

That also settles the worry the single-door version carried: creating a pantry item from inside a sheet is now the deliberate heavier choice rather than the only one.

#### Measured ingredients, and the unit arithmetic

**A recipe wants a cup of milk, and the pantry holds two one-gallon containers. The app can and should work out that this is plenty.**

`add-edit-item.md` flagged this as *"the decision that has to be revisited first"*, and revisiting it is cheaper than that sentence implies: **the vocabulary already exists.** Units come from a fixed fifteen-row menu, so `qt` and `fl oz` are both known symbols. What the doc actually said is that the app "will never notice" they are the same measure — a statement about it not doing the sum, not about it being unable to.

**On hand × size is the whole mechanism.** Two containers at 1 gal is 2 gal is 32 cups. No new field is needed on the item; the size has been there since 28 Aug.

The row gains a **unit trigger** beside the stepper, and the menu it opens is built from the item, not from the fifteen:

- **`Whole containers`** first, above a hairline, showing the plain count. This is the default and the only option for an item with no size.
- Then **the dimension the item's size belongs to, and only that one.** Milk is sized in gallons, so the menu lists volume — gal, qt, pt, cup, fl oz, L, mL — and no weight at all.

| Dimension | Units | Convertible |
|---|---|---|
| Volume | gal · qt · pt · cup · fl oz · L · mL | Yes, all |
| Weight | lb · oz · kg · g | Yes, all |
| Count | count · dozen | Yes. **`pack` is not** — a pack of what? |
| **Across dimensions** | — | **Never.** Two cups of flour is not eight ounces without knowing its density, and the app does not know |

**An item with no size can only be counted.** Its unit trigger never appears, and *2 cups of Chicken Carcasses* is a sentence the app will not let you write. Five of the thirty-one sample items are like this on purpose.

> **Half pint prints as `cup`, and that lands well here.** The unit recipes actually want was already in the menu, already spelled the way a carton spells it, and already argued for. Nothing had to be added to the vocabulary for cooking to work.

> **Checking works. Deducting does not.** The app can say two gallons covers a two-cup recipe. It cannot take the two cups out, because on hand is a whole number of containers and there is no such thing as 1.94 gallons in this model. That belongs to the **Restock** flow — and the useful half is the cheap half.

#### The quantity is a count of the item, not a cooking measure

**`3 carrots` means three of the thing whose on-hand count is 0** — the same integer the stepper already manages, in the item's own units.

That is the whole reason this is cheap. *Two cups of stock* would need a shared unit vocabulary, conversion, and fractional counts — the revisit `add-edit-item.md` warned about (*"if the shopping list ever wants to add up how much olive oil do we have, this is the decision that has to be revisited first"*), plus the problem that doc does not mention: **the count is a count of packages, not a measure of contents.** None of it is asked for here.

**The price is real and belongs in the copy, not in a footnote.** Half an onion is 1. A pinch of anything is 1. The model says how many of a thing a batch eats and cannot say how much of it.

#### Adding one

**The dashed `+ Add an ingredient` row becomes the search in place** — the same drop-in-and-stay-put move the term composer and the invite composer already make.

1. Pressing it replaces the dashed row with a **40px search field** at radius 11 on `meta`, focused, carrying the composer's crimson halo `0 0 0 3px rgba(190,51,70,.14)` and a ghost `×` to abandon.
2. A **menu drops below it** in the sort menu's construction — surface on `line`, radius 14, 6px padding, shadow `0 14px 30px rgba(36,30,23,.20)`. Each row reads **name · size · source** on the left and `have N` in meta on the right.
	- **Rows are 40px here rather than the sort menu's 36.** Three pieces of text in one row need the extra four; nothing else about the construction changes.
	- **The source appears only in the menu.** It is the tiebreaker when two items share a name and a similar size — *Tomatoes · 1 qt · The Garden* against *Tomatoes · 15 oz · Publix* — and it is dropped from the committed row, where you have already chosen.
3. **Picking lands the row at quantity 1 and puts the search back**, empty and still focused. Four ingredients is four keystrokes-and-a-tap, not four round trips to a dashed row.
4. **Escape closes it** and the panel keeps everything already added.

**Two exclusions, both worth writing down.** Ingredients already in the list are filtered out of the menu, and so is the item being edited — chicken stock cannot be made from chicken stock, and offering it is how somebody finds that out the hard way.

**When nothing matches**, the menu says so — *No tracked item called **Celery*** — over a single row: `+ Track "Celery" as a new item`. The create row appears **only** in that case. Offering it under two real matches is how a typo becomes a duplicate item.

> **The create row is drawn, not settled.** It writes to the pantry from inside a sheet about a different item. The term composer already creates terms this way, but an item is a bigger thing to conjure — it lands with 0 on hand, which puts it straight onto the shopping list. The alternative is a dead end telling you to go and add it first, which the docs already dislike on principle.

#### What the quantities buy

Beneath the panel, a sunk strip repeats the make row's line, and with quantities it can be specific rather than vague:

| Case | Line |
|---|---|
| Nothing short | *Enough for **2 batches*** — the smallest whole number over every **checkable** row, counted and measured alike |
| One short | *Short **3 carrots** — enough of everything else for 3 batches* |
| Two short | *Short 3 carrots and 1 onion* |
| Three or more | *Short 4 ingredients* |

**Without quantities the row could only ever manage *missing carrots*.** Batches are the thing the feature is actually for: it is the question you ask standing at the freezer.

**Adding an ingredient never changes its count.** This is a reference, not a deduction. What happens when you actually make a batch is the Restock flow, and it is not designed.

> **Where the model stops, and it is worth knowing before it bites.** Short a quart jar of tomatoes but holding four 15 oz cans, the app says short — they are different items and it has no way to know one stands in for the other. **Substitution is the feature this is missing**, and it needs a real notion of equivalence between items. Not a bigger picker.

### The item card — one glyph, beside the dot

**A grow or make item carries its kind glyph in the top-right cluster**, which becomes **glyph · dot · chevron** — what kind of thing, what state it is in, then the control. Sprout for grow, pot for make. 15px, `meta` `#6F6049`, 9px gaps.

**A shop item has nothing there, and the absence is the point.** Most of a pantry is bought; the two kinds that are not are the ones worth spotting from across a grid.

> **It does not break *Item card*'s rule.** That rule is *"Name (no icons beside it)"* — the top-right is a different place and already carries two things. The name is still clean.

> **Meta grey, not the term's colour.** The status dot stays the only coloured thing in that corner, because colour is what status is for. A term's colour is whatever the household picked, so tinting the glyph by it would imply the hue says something about the kind. It does not.

> **And the objection that killed the off-list cart marker does not apply.** That was *"a glyph nobody has been taught, on a card that deliberately carries no icons beside the name."* This one is taught three times before a card ever shows it — the run list's band headers, the segment tabs, and the source editing row all use the same two glyphs.

**It does not go on the run list's row.** The row already sits inside a source card whose header names the source and whose band names the kind; a third statement of the same fact in one screen is noise.

**The tags still do the work they always did.** A fern *The Garden* and a mulberry *The Kitchen* say *which* source, with no new component. What the glyph adds is *what kind* — and that matters because a household can call a grow source anything and colour it anything, so nothing about the tag says at a glance that it is something you pick.

---

## Tokens

**No new colours.** Sources take term colours from the existing sixteen; bands, rows, badges and cards take the tokens *Shopping list* already specifies. Two assignments and one addition:

| Part | Light |
|---|---|
| The Garden | **fern** — `#3F7A4C` / tint `#E8F0EA` / border `#D0DFD3` / text `#3C7549` |
| The Kitchen | **mulberry** — `#8E4468` / tint `#F0E8EC` / border `#E0CFD7` / text `#8E4468` |
| Band label + glyph | meta `#6F6049` |
| Band rule | `line` `#E2D5C0` |
| Segment track / border | `#F2EADC` on `#E2D5C0` |
| Segment item, rest | body `#4C4237`, count meta `#6F6049` |
| Segment item, active | `#FDFAF4` on `#CFBEA3`, ink label 600, count ink |
| `NOT YET` subhead | sunk `#F2EADC`, `divider` top border, meta label |
| Make line — can | stocked text `#47592F` |
| Make line — cannot | out text `#9A2E3B` |
| Ingredient stepper | `#FDFAF4` on `meta` `#6F6049`, radius 11, `divider` `#EEE4D2` cell hairlines, glyphs in body `#4C4237` |
| Ingredient size, on the row | meta `#6F6049` at 13 |
| Ingredient source, in the menu | faint `#9B8B75` at 12 |
| Ingredient *have*, covered / short | stocked `#47592F` / out `#9A2E3B` |
| Ingredient picker menu | surface on `line`, `0 14px 30px rgba(36,30,23,.20)` |
| Kind glyph, shop | `#9E8C74` |
| Kind glyph, grow / make | `#D8CBB6` |
| Kind glyph on the item card | `meta` `#6F6049`, 15px, left of the status dot |

Dark counterparts are a hex-for-hex map away and have not been rendered — the Settings canvas precedent.

---

## Motion, keyboard and screen readers

- Bands do not animate in or out; the grid reflows at 160ms as it already does. Switching a segment tab is the existing grid → list crossfade at 160ms with cards rising 8px, staggered 20ms.
- The segment is a `tablist` of four `tab`s controlling one panel; arrow keys move between them, and the panel keeps its own tab order. Entering list mode announces `Run list, 17 to get across three kinds` through the polite region `Pantry` already owns.
- The `NOT YET` group is a labelled `<section>` inside the card's `<ul>`; its rows are not checkboxes and are not in the tab order.
- The make row's second line is part of the row's accessible name: *"Chicken Stock — low — missing carrots"*.
- The kind menu takes the role menu's keyboard behaviour unchanged: Escape closes to the trigger, focus returns on close.
- The card's kind glyph is decorative to the eye and named to a screen reader: it joins the card's accessible name as *grown* or *made*, before the status word.
- The ingredient search is a `combobox` over a `listbox`, the same contract the unit trigger already uses: arrows move the active option, Enter picks it, Escape closes to the panel. Picking announces *Carrots added, 1 needed, have 0* through the polite region.
- Each ingredient row is a `group` labelled by its item name **and size** — *Tomatoes, 1 qt* — because the name alone does not identify it. The quantity is a `spinbutton` with `aria-valuemin="1"` inside a group labelled *Quantity*, its buttons *Add one* / *Remove one*; the `×` is *Remove Tomatoes, 1 qt*.

---

## Deltas that leave this doc

1. **The editing row loses its item count** — amends *Destructive actions*, argued above.
2. **`Store` is not always the group's name** — amends *Structure*, *Chips and tags*, *Edit item + inline term creation*, and the seeded-terms table in *Flows outside the shell*.
3. **The collapsed rail's storefront glyph means "shop"** and is wrong in a Source household. Not redrawn. A neutral glyph is needed, or the rail keeps a shop icon for a group that is no longer only shops.
4. **The marketing page's band says *Location, Store, Type*** and its Store column describes shopping. Both are wrong for a household that grows anything. This is user-facing copy, which the 27 Aug merge note already identifies as the worst place for a contradiction.
5. **The seeded stores are all shops** — Grocery, Warehouse, Market — so a new household is a `STORE` household on day one and stays one until it isn't. That is correct, and it means most people never meet the word *Source*.

---

## Sample dataset

Eleven items added to the twenty, so the bands have something real to draw. Totals become **31 items — 13 in stock, 9 running low, 9 out**, and the run list is **12 to buy · 3 to pick · 2 to make = 17**, plus one out-of-season.

| # | Item | On hand | Low at | Location | Source | Type | Size |
|---|---|---|---|---|---|---|---|
| 21 | Tomatoes | 1 | 4 | Pantry | The Garden | Produce | 1 qt |
| 22 | Basil | 0 | 1 | Pantry | The Garden | Spice | — |
| 23 | Green Beans | 2 | 6 | Chest Freezer | The Garden | Produce | 1 lb |
| 24 | Butternut Squash | 0 | 2 | Pantry | The Garden | Produce | — |
| 25 | Chicken Stock | 1 | 4 | Chest Freezer | The Kitchen | Condiment | 1 qt |
| 26 | Yogurt | 0 | 2 | Refrigerator | The Kitchen | Dairy | 1 qt |
| 27 | Chicken Carcasses | 6 | 2 | Chest Freezer | — | Protein | — |
| 28 | Carrots | 0 | 2 | Refrigerator | Publix | Produce | — |
| 29 | Onion | 5 | 2 | Pantry | Publix | Produce | — |
| 30 | Milk | 2 | 1 | Refrigerator | Publix | Dairy | 1 gal |
| 31 | Tomatoes | 4 | 2 | Pantry | Publix | Produce | 15 oz |

**Frozen Peaches (7) moves from no source to The Garden.** It is in stock, so it never appears on the run list — it exists to draw the assignment.

**Marinara (8) moves from no source to The Kitchen** and is made from **2 Tomatoes · 1 qt · 1 Onion**. It is in stock at 6, so the Make band still holds two — it exists to draw an ingredient list whose items carry sizes.

**Two items are called Tomatoes**, and that is the point of item 31: the quart jars from The Garden (have 1) and the 15 oz cans from Publix (have 4). They are the picker's hard case and the only reason the size is on the row.

**Butternut Squash is out and out of season** (ready in September), which is what puts a row in `NOT YET`. It is counted in the nine out and *not* counted in the seventeen — the one place those two numbers deliberately disagree.

**Chicken Stock is made from 2 Chicken Carcasses · 3 Carrots · 1 Onion.** Carcasses (have 6) and onion (have 5) cover it three and five times over; carrots is out, so the line reads *Short 3 carrots — enough of everything else for 3 batches*. **Yogurt is made from 1 Milk** and milk is at 2, so it reads *Enough for 2 batches*.

Source assignments: The Garden **fern**, The Kitchen **mulberry**. Chip counts — Aldi 3 · Calfee Cattle 3 · Costco 6 · Publix 8 · The Garden 5 · The Kitchen 3 · no source 3 = 31.

---

## Where this goes

**Recipes and gardening are the destination, not a scope risk.** That reverses the test proposed in `future-ideas.md`, which asked whether a feature answered *what do we have* or *what do we need* and concluded meal planning was a different product. With the ambition stated, the question stops being where the boundary is and becomes **whether today's design leaves room**.

### What today's work already bought

**The kind on the source is the seam.** Shop, Grow and Make were never three list bands — they are three *ways a thing arrives*, and two of them want a real object behind them eventually:

| Kind | The process behind it | Object |
|---|---|---|
| Shop | Buying | None. Not worth modelling |
| Make | Cooking | A **recipe** |
| Grow | Planting | A **planting** — and it is where the season now sitting on the item really belongs |

**The pantry tracks outputs. Recipes and plantings are the processes that make them.** That sentence is what the kind bought, and it holds whichever way the recipe question goes.

### Two ways a make item becomes a recipe card

Both are drawn, side by side, on the *Where this goes* board.

**Model A — the item grows into the recipe.** The sheet gains *Makes*, *Takes* and *Steps*; the item is the recipe. Nothing becomes a new object, and every screen already drawn keeps working because it was always reading the item.

Its ceiling is hard and it arrives at the first recipe you do not put in a jar: **every recipe would have to stock something.** Chili gets eaten, not shelved. Holding a chili recipe would mean a pantry item called Chili sitting at 0 for ever — on the shopping list, in the item grid, in every count.

**Model B — a recipe is its own object, and it holds the link.** Recipes live in their own list. A recipe optionally *yields* a tracked item and says how many per batch; making one raises that item's count.

**The direction is the whole point, and it is worth being strict about: the recipe points at the pantry, and the pantry points at nothing.**

| | Holds a reference to | Is referenced by |
|---|---|---|
| A recipe | the items it uses, and the item it yields | nothing |
| A planting | the item it yields | nothing |
| A pantry item | nothing | — |

**So the item gains no field at all.** No *made from*, no *made by*. The row on the item sheet reading *Made by **Chicken Stock*** is a **derived pointer, not an edited field** — display is not ownership, and conflating the two is how the pantry ends up knowing about cooking.

**Three consequences fall straight out of the direction**, and all three are better than Model A's:

- **Two recipes can yield the same item.** Two ways to make stock, both pointing at one jar. Under A there is exactly one, because the recipe *is* the jar.
- **Deleting a recipe leaves the pantry untouched.** Under A it deletes an item, its count, and its place in every list.
- **Deleting an item leaves the recipe standing**, minus its yield. Under A the recipe goes with it.

**The ingredient panel does not change under B. It moves.** Rows, steppers, units, untracked lines and the picker all lift onto the recipe unaltered. The cost is a second object, a second place to look, and a drawer that has to hold recipes alongside filters and settings — the first real change to the shell since it was drawn.

> **The rule this gives the roadmap: processes depend on the pantry, and the pantry depends on nothing.** A recipe references items; a planting references items; neither is referenced back. That is what lets recipes and gardening be built without reopening the pantry — and it is the strongest reason to prefer B over the smaller-looking option.

> **One place the rule bends, deliberately.** The run list's Make band has to show *short 3 carrots*, which means looking up which recipe yields an item — a reverse lookup the model does not store. That is a **view** doing a join, not the pantry holding a reference. Views may join freely; the model stays one-directional.

### Two questions, two owners

**A make item exists to answer one question: do we need more?** On hand against low at — the same arithmetic as a jar of peanut butter from Publix, and it needs nothing else to answer it. That is what puts the item in the Make band.

*Can I make some right now?* is a **second** question, and it belongs to the recipe, because answering it needs the ingredients and their counts.

| Question | Answered by | Needs |
|---|---|---|
| Do we need more Chicken Stock? | **the item** | on hand, low at |
| Can we make some now? | **the recipe** | its ingredients and their counts |
| How many batches? | **the recipe** | the same, plus quantities |

**So the Make band is not blocked on recipes.** With no recipe written anywhere, the band still works: *Chicken Stock · 1 qt · LOW · have 1 · low at 4*, in a Kitchen card, telling you to go and make some. Everything the recipe adds is the **second line**.

> **Which refines the row spec.** The make row is **56px, like every other row, until a recipe gives it something to say** — then it grows to 76 and carries *short 3 carrots* or *enough for 2 batches*. Drawn only in its taller form; the plain one is the case a household starts in.

### What a make item actually knows

**Nothing about stock but its own, and it never did.**

The *short 3 carrots* line was always computed, never stored — the item held a list of references and something else did the arithmetic. Move that list onto the recipe and the item is left holding exactly what a Publix item holds: a name, a size, a count, a low-at, a location, a source and a type. **There is no make-shaped field on it at all.**

So the answer to *does the make thing need to know what's in stock* is no, and the answer to *should it point at a recipe* is **no — the recipe points at it.**

| | Item holds `recipe` | Recipe holds `yields` |
|---|---|---|
| Delete the recipe | a dangling pointer on the item | item untouched |
| Delete the item | recipe untouched | recipe stands, minus its yield |
| Two ways to make one thing | impossible, it is one field | fine, both point at the same item |
| The pantry's dependencies | now depends on recipes | still none |
| The Make band's lookup | free | a reverse join in a **view**, which is free anyway |

**And `yields` is not a description of the item — it is a write target.** Its only job is to say what "I made a batch" should increment, and by how many. Instructions for an action belong with the action.

### The kind is not made redundant by recipes

Worth stating, because the obvious next thought is that the Make band could be derived from *items some recipe yields* and the source kind dropped.

It cannot. **You can be low on something you make and not have written the recipe down.** Under a derived band that item silently falls out of Make and into `NO STORE`, and the only fix is a stub recipe with no ingredients — a phantom, which is the exact thing that lost Model A the argument.

**The kind says how a thing arrives. The recipe says how to make it.** The first is always known and costs one glyph; the second is optional and richer. The kind also carries the group's name and the item card's tag, which no recipe can.

### Made by — what ships, and what it becomes

**In v1 the section exists and says so.** A make item's sheet carries a `MADE BY` micro-label over a sunk panel on `line`, and the copy does real work rather than apologising:

> **Recipes are coming**
> Marking this as made rather than bought already does the useful half: it puts Chicken Stock on the **Make** band instead of a shopping list when it runs low.

**It is a statement, not an empty state and not a disabled control.** Sunk fill, no icon, no amber — nothing is wrong and nothing is pending on the reader. *A disabled control cannot explain itself*, which is the rule that rules out the alternative.

**And it is only drawn for make items.** A shop or grow item's sheet has no `MADE BY` section at all.

### What the section becomes — mockup

> **Mockup — not in v1.** Drawn on board 5 beneath the shipping state, marked.

### The item's recipe surface is one row

**A link, not a field.** Once recipes exist, the make item's *Made from* panel is replaced by a single row in the Members row's construction — glyph, label, a line of meta, chevron:

| State | Row |
|---|---|
| A recipe yields this item | **See recipe — Chicken Stock** · *4 ingredients · short 3 carrots* · `›` |
| None does | dashed **+ Write a recipe for this** |

**The item stores neither.** Both are read off the recipes, which is what makes the row a view rather than a relationship.

**And the dashed row is the migration path**: it is how a recipe gets written from the pantry side, so today's inline panel becomes tomorrow's recipe card and the item's affordance shrinks from a section to a line.

> **It does not go on the run list's row.** *Shopping list → The row* allows exactly two targets — the checkbox and everything else — *"no way to open a sheet when you meant to tick something, which on a phone in a shop is the whole game."* A third target would spend that rule on a convenience. The recipe is one tap further, from the sheet.

> **Two recipes yielding one item** turns the row into *2 recipes ›* and a pushed list. Cheap, and not drawn.

### What this means for building it

**The recipe is an object from day one — there is no interim where the item holds ingredients.** An earlier pass drew the panel on the item sheet and planned to move it later; that plan taught a mental model the app would then have to take away, and it put the pantry in the business of knowing about cooking for one release.

The staging that avoids it:

| | What exists | How you reach a recipe |
|---|---|---|
| **First** | Recipes as objects, with ingredients, quantities, units and a `yields` pointer. No name is required, no steps, no time | Only from the item it yields — *See recipe* / *Write a recipe for this* |
| **Later** | Names, steps, yield size, time. Recipes that yield nothing | A Recipes section of its own, and *what can I cook tonight* |

**The first row costs barely more than drawing the panel on the item did**, because the panel is the same panel — it is a sheet instead of a section, plus a link row. What it buys is that there is never a migration and never a model to unteach.

**The one thing not to do** is put a recipe-shaped field on the item. That is the move that would have to be unwound.

### What is missing from both, and is not a drawing problem

**"What can I cook tonight?" is not the Make band.** The make band answers a *restocking* question — what am I low on that I make. A cook wants *every recipe I have the ingredients for*, whether or not its output is a tracked item running low. Those are different screens and only one of them exists.

**Deduction blocks three features now, not one.** Both models can say you have enough; neither can take it out. Restock already gated trends and the `Always on the list` override; cooking joins the queue.

### Gardening — the question, sharpened

Nothing is designed here, because nothing is decided. What the recipe work makes clear is the shape the answer will take: **if a make source wants a recipe, a grow source wants a planting** — an object with a variety, a place, a sowing date and a season, of which the pantry item is the *output*.

That reframes the season we put on the item. It is on the item today because there was only one object; it belongs on the planting. Cheap to move — two fields — but worth knowing it is borrowed.

The four questions worth answering before anything is drawn: whether the garden is a **place with contents** (beds, varieties, how many of each); whether it needs a **calendar** (sowing, succession, frost dates, days to maturity); whether **yield** is tracked per planting; and whether **preserving** is modelled, which is where forty pounds of tomatoes become fourteen jars — the point at which the garden's output becomes a recipe's input and the two ambitions meet.

---

## Open questions

- **`Source` vs `Where from`.** The working word against the plainer one. Two words in a one-word slot is the cost.
- **What the trigger is called on the way in.** *Shopping list* or *To get*. The segment reduced the pressure; it did not remove it.
- **Dropping the editing count is a real loss** and the blocked dialog is now the only place you learn a term is in use. Worth watching before it ships.
- **`Track "X" as a new item`** writes to the pantry from inside a sheet about a different item, and the new item lands with 0 on hand — straight onto the shopping list. Drawn, not settled.
- **Should wanting to make something pull its ingredients onto the buy list?** Stock needs 3 carrots and you have 1: today the list says nothing, because it is a view of counts against low-at and nothing else. Demand-driven restocking is a real feature and a real change to that rule.
- ~~**Model A or Model B.**~~ **Settled: B.** A recipe that stocks nothing has to exist, and the one-directional reference is what keeps the pantry closed to change. Model A stays on the canvas as the record of what lost.
- **Can one recipe yield more than one item?** A batch of dough becomes two loaves and a pizza base. Drawn as a single yield; a list is a small change to the model and a larger one to the card.
- **A make item with no recipe is the ordinary case at first**, and the band row shows with no second line. Not drawn.
- **What a make source with no recipe does.** The band row appears with no second line, which is quieter than an empty state and has not been drawn.
- **Fractions have no answer.** Half an onion is 1. Measured rows soften this — half a cup is expressible — but only for items that carry a size.
- **Cross-dimension conversion is refused, not solved.** A recipe in cups against an item sized in pounds cannot be checked. For baking that is most of the recipe.
- **Substitution does not exist.** Four 15 oz cans do not satisfy a recipe that asks for a quart jar, and nothing in the model can say they might.
- **Two items sharing a name is a doc-wide gap, not an ingredient one.** They are indistinguishable in the item grid, in search results and on the applied-filter chips; the size line under a card name is the only thing separating them anywhere. Belongs in *Gaps → Robustness* beside long names.
- **What checking a Harvest or Make row does.** In Buy it means *in the cart* and expires in 24 hours. Picking and cooking are both **restocks** — a write to the item — which makes the check shared rather than local. That is the reserved right half of the trip bar, and **Restock blocks this** the same way it blocks trends.
- **Season is per item.** It could belong to the grow source instead — one range for the whole garden is wrong, but so is asking for one on every row.
- **Mobile is not drawn.** At 390 the top bar is already at a documented four-row worst case, and the segment is a fifth element in list mode's row 2. It probably scrolls horizontally like the applied-filter chips do; nobody has measured it.
- **Nothing says what a `make` source does when it has no ingredients set.** Probably the same row without its second line, which is a quieter answer than an empty state.

---

## Boards

Own canvas, two pages, desktop 1440, light theme only.

**Settled** — five boards:

1. **The run list — 1440.** Three bands, the segment on `All`, two rows checked, the trip bar.
2. **Entry and the three cards.** Row 2 in grid mode with both trigger spellings, then Buy / Harvest / Make side by side with their anatomy.
3. **Ingredients — marked mockup.** The recipe sheet: three kinds of row in one panel, the unit menu open on a measured ingredient, the two-door picker, and the conversion rules.
4. **Setting the kind.** The source section at rest, in editing without counts, and the kind menu open — plus the `STORE` / `SOURCE` naming rule drawn as two households.
5. **Item side.** The season panel on a grow item, the shipping *Recipes are coming* panel on a make item with the marked mockup of what it becomes beneath it, and three item cards — grown, made, and a bought one with no glyph at all.

**Where this goes, and what lost** — three boards:

6. **Where this goes — marked mockup.** Model B settled as a direction, Model A kept as the record of what lost, a diagram of which way the references point, and what is missing from both.
7. **Option B — separate modes.** Lost outright: row 2's composition would depend on the household.
8. **Option C — one trigger, a segment inside.** Adopted in part. Its segment is on the settled run list; what it lacked was the `All` tab.
