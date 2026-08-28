# Add / Edit item — redesigned 28 Aug

> **This is a section of `claude/ui-designs.md`, kept as its own doc for now.** It replaces **Add item** in *Structure* and the whole of **Edit item + inline term creation** except *The inline composer*, which is unchanged. It also amends *Item card*, *Shopping list → The row*, *Sample dataset*, *Chips and tags*, and adds two findings that reach components outside this sheet.
>
> It is separate for one reason: `ui-designs.md` has no patch operation — folding a section in means rewriting all 60KB of it, and that file has already lost sections to two wholesale rewrites, which is the lesson recorded in its own merge note. Paste this in when you next touch the file by hand, or say the word and I'll do the merge and diff the section headers to prove nothing dropped.

Canvas — nine boards, both themes:
https://claude.ai/code/artifact/ad4ef00a-9b16-44f1-8d64-b18b46a9a953

Three changes, plus a mockup: the sheet gets **sections**, *Low at* gets **its own stepper**, an item gets an optional **size** — and there is a drawn-but-undecided way to keep an item **off the shopping list**.

## The sheet reads as four sections, not one stack

The old sheet was a flat run of fields — name, steppers, three chip groups, notes — every one at the same weight, with the low-at hanging off the on-hand stepper as a footnote. Adding a fifth field to that would have made it worse.

**Four sections, each a micro-label over its content, separated by a full-width hairline in the `divider` token.** Order: **Item** (name, size) → **Count** (the two steppers) → **Location / Store / Type** → **Notes**. Header, then body at 20px padding, then the sticky footer.

**The grouping is done with labels and rules, never with a fill.** The Settings pane groups with a raised fill on the drawer, and the obvious move was to borrow it. It is wrong here: on the sheet a recessed panel already *means* "you are editing something" — it is the inline composer, which drops in below a `+ …` chip. A second recessed thing that only groups would make the composer stop meaning anything. The type ramp already carries section labels and the palette already carries a card divider; both were sitting unused on this surface.

**Location, Store and Type are three labelled groups under one rule, not three sections.** They are one question — where and what — asked three times, and three hairlines would say they were three subjects.

### One field treatment

**Everything you can change on this sheet is a bordered control on the sheet surface, at one border colour.** The name field, the size number, the unit trigger, both steppers and the notes box are the same object at different widths. That is most of what makes the redesigned sheet read as calmer than the old one — it is not that anything got quieter, it is that six controls stopped being four different kinds of thing.

The border is **meta**, and that is a contrast finding rather than a preference — see *Deltas* below.

| Part | Desktop | Mobile 390 |
|---|---|---|
| Sheet | 480 from the right | full-width bottom sheet, grabber, ~84px of scrim above |
| Body padding | 20 | 16 |
| Header / footer | 68 / 76 | 58 + 20 grabber / 80 |
| Name field | 48 high, radius 11 | 48 |
| Size number / unit trigger | 76 × 44 / 140 × 44, 8 apart | 76 × 46 / 148 × 46 |
| Stepper | 214 × 56, radius 13 | 173 × 56 |
| Chips | 32 | 44 |
| Notes | 88 high, radius 11 | 88 |
| Section rule | `divider`, 22 above / 20 below | 20 / 18 |

## The size

An optional **number and unit** on its own row under the name field: *1 quart*, *20 ounces*, *12 count*. It is the size of **one** of the thing, which is what makes it different from the count — you have three of them, and each one is a quart.

> **The UI calls it a size, and the ask called it an amount.** *Amount* collides with the on-hand count — "how much butter do I have" and "how big is one pack of butter" are different questions and one word cannot ask both. Flagged rather than settled: it is a one-word change if *size* reads wrong.

**It is never half-set.** Both halves are filled or neither is — a bare `20` means nothing and a bare `quart` is not a size. Two rules hold it there, and between them there is no invalid state to validate or explain:

1. **Picking a unit against an empty number fills the number with 1.** So *1 pint* is one tap, which is the commonest size there is.
2. **`No size`, the first row of the unit menu, clears both halves.** That is why the row carries no separate `×` — one control already does it.

**At rest the number field shows a meta `1` placeholder** and the unit reads *Unit*. The placeholder is doing real work — it is what says the field takes *one quart* rather than *32 ounces of stock*. It clears on focus. Clearing the *number* back to empty while a unit is set returns it to 1 on blur. Nothing about the sheet's saving depends on any of this: the size is optional and Save never blocks on it.

**The hint line sits under the row**, meta 12.5: *Optional — it shows with the name on cards and in the shopping list.* It says *with* rather than *beside* on purpose: the size sits **beneath** the name on a card and **beside** it in the list, and a hint that picks one is wrong half the time. Hints live under their control on this sheet, which is the same place the low-at's *Household default.* sits.

### The unit list

Fifteen rows in four groups. **The menu says the word, the app prints the abbreviation** — a menu row has space for *Fluid ounce* and a 56px shopping-list row does not, which is the same trade `Clear all filters` and `Clear filters` already make.

**Menu labels are sentence case, abbreviations are not.** *Quart*, *Half pint*, *Fluid ounce* — these are words in a list and they get a capital like every other menu row in the app. `oz`, `lb`, `qt`, `mL` are unit symbols, and a unit symbol has a fixed casing that is not ours to change.

| Group | Menu row | Prints |
|---|---|---|
| — | **No size** | clears |
| Count | Pack · Dozen · Count | pack · dz · ct |
| Weight | Ounce · Pound · Gram · Kilogram | oz · lb · g · kg |
| Volume | Fluid ounce · **Half pint** · Pint · Quart · Gallon · Millilitre · Litre | fl oz · **cup** · pt · qt · gal · ml · L |

> **Half pint prints as `cup`, and that is the one place the word and the abbreviation disagree on purpose.** A US half-pint carton is the common size and *half pint* is what anybody would look for in the list, so that is the label. But the printed form sits immediately after the count — *1 ½ pt* reads as one and a half pints, which is a different quantity and the commonest case of this unit. `cup` is the same measure, it is what the carton itself says, and it cannot be misread. The menu's abbreviation column shows `cup` beside *Half pint* before you pick it, so nothing is a surprise. If `½ pt` is wanted anyway, the fix is to suppress the number when it is 1 — a rule this sheet otherwise does not need.

**Abbreviations never pluralise** — *2 lb*, *2 qt*, *6 pack*. Nothing has to decide whether two dozen is *2 dz* or *2 dzs*.

**There is no `each`.** *1 each* is not a size; it is the absence of one, which is what `No size` already says.

### The menu

**The sort menu's construction, unchanged**: 200px wide, radius 14, surface on `line`, shadow `0 14px 30px rgba(36,30,23,.20)` / `0 14px 30px rgba(0,0,0,.55)`, 6px padding, rows 36px desktop / 44 mobile at radius 9, groups split by `divider` hairlines rather than headings. The current unit takes 600 weight, ink, and a **crimson check on the right — never a fill**, for the reason that rule already exists: with a fill doing both jobs a hovered row looks selected.

**The abbreviation sits where the check goes**, in meta, on every row but the current one. It is how you learn that *Quart* prints as *qt* before you commit to it, and it costs no vertical space because the check's slot was already reserved.

**Max-height 320, scrolling, opened scrolled to the current unit.** Fifteen rows is 593px of menu — 15 × 36, three 13px dividers, 12px of padding and the border — and nothing in this app opens a panel half that tall.

**The trigger is a field, not a ghost.** It carries the same border as everything else on the sheet, the chevron flips on open, and the focus halo is the composer's. The sort trigger's ghost treatment is for a control sitting on the ground; this one sits on a form.

### Where the size shows

**On the item card, beneath the name in meta 13.** Not beside it: names are long, and the shopping list's own 460px name-and-badge collision is already on record. Beneath is safe at every card width.

**In the shopping-list row it rides with the name**, meta 13, 8px after it and before the status badge. At the shelf *"Butter, 1 lb"* is one phrase; moving the size across the row to sit with `have 2 · low at 4` would take the phrase apart to save a measurement. The name truncates inside the `min-width: 0` flex; the size does not. Below the stacking breakpoint the size rides with the name onto the top line.

> **It raises that breakpoint.** The row stacks below 460 because *Shredded Cheese* + badge collides with `have 0 · low at 2`; a size adds roughly 42px to the left side, which puts the collision at about **520**. Derived by scaling off the recorded 460, not measured — check it on a real screen before writing 520 into the grid's `minmax()`, since it also moves the shopping list's column count.

**Search should match it** — typing *pint* finding your pints is the obvious behaviour — but what search matches at all is still open in *Gaps*, so this joins that question rather than answering it.

**Not in the top bar, not in the filter pane, and not sortable.** A size is a property of an item, not a term: it has no colour, no chip, and nothing to filter by. If sizes ever need grouping they need to become terms first, which is a different design.

## On hand and low at

**Two matched steppers, side by side, equal weight.** *Low at* stops being a footnote on the on-hand control and becomes its peer, which is the whole answer to it being hard to update.

**Both are symmetric and neutral** — `−` and `+` as equal cells inside the field, glyphs in `body`, hairline dividers between the three cells. **Neither carries the ink fill the item card's plus does**, and the reason generalises: the card's stepper is asymmetric because a card has no primary at all, so the plus has to be one. The sheet already has exactly one ink control and it is *Save*. Two ink pluses and an ink Save would be three primaries on a form with one action.

**The numeral is a text field.** Tap it, type it. This is the largest single win in the section and it closes an open question — *Typing a quantity directly rather than stepping to it* under *Robustness* — for the sheet at least. Stepping Ground Beef's low-at from 2 to 15 is thirteen taps; typing is one gesture.

**Press-and-hold repeats**, accelerating after 400ms, on both steppers and both buttons. For anyone who does not find the typeable numeral.

**Four digits is the ceiling.** At 390 each stepper is 173px — two 44px buttons and an 85px numeral cell — and Playfair 700 at **26px** (desktop keeps 28) puts four digits at 62.4px inside 69px of usable cell. Five digits overflows. A pantry does not need 10,000 of anything, and the field should refuse the fifth character rather than let it collide.

> **The sheet's numeral is 28/26, where the card's is 42/28.** The card's numeral is that card's hero. On the sheet the two steppers are peers and the name is the thing you came for, so the numerals lead the body without outrunning the Playfair header.

### The live status line

**Right of the `COUNT` micro-label, updating as either stepper moves**: a 7px status dot and the word, in the status ramp's own dot and text colours.

| On hand | Line |
|---|---|
| 0 | ● **Out** |
| ≤ low at | ● **Running low** |
| above | ● **In stock** |

**This is the reason the low threshold is now easy rather than just bigger.** A threshold is an abstraction until you can see what it does to the item in front of you; setting *low at 6* on an item with 4 on hand and watching the line say *Running low* is the whole explanation of the field, and it costs no vertical space because the label row was half empty.

Same three words as the top bar's status pills, same three tints, no new colour.

> **It forces a rule the document never wrote down: is `on hand == low at` low?** Nothing in the sample dataset has the two equal, so the app has never had to say. Settled here as **≤ — equal is low**, because *low at 2* reads as "it's low when you're down to 2". One line in `shared/filter.ts` where the OR/AND rule already lives, and worth confirming against what the build actually does before it ships.

### Where the default comes from

On the Add sheet, *Low at* arrives at the household default from *Settings › Pantry settings* and carries **`Household default.`** in meta beneath it. The line disappears the moment the number is changed and never appears on the Edit sheet.

It answers the question the number raises — *why 2, and did someone choose that?* — without adding a control, and it is a quiet pointer to the setting that governs every new item.

> **What a new item's on-hand starts at is still open.** Drawn as **1** — you are usually adding a thing you have. **0** is defensible and is the case *Shopping list* already describes, where you notice at the shelf that you need something untracked and it lands straight on the list you are standing in. One line either way.

## Keeping an item off the shopping list

**Mockup, not a decision.** Drawn on board 9 in both themes; nothing below is specced as settled, and nothing else in this document depends on it.

**A single checkbox, last row of the `COUNT` section, under the two steppers.** *Keep off the shopping list*, with meta beneath: *It still shows as low or out on its card — it just never joins the list.*

**It belongs in Count rather than in a section of its own.** *Low at* is the sentence *put this on the list when I am down to N*; this is *…except don't*. It modifies the threshold, so it sits where the threshold is set — and putting it anywhere else would make it a fifth section for one checkbox.

**The control is the shopping list's own checkbox at its own size** — 22px, radius 7, surface on a 2px meta border, inverting to the ink/cream fill with the opposite check. Nothing new, and the rhyme is deliberate: the box that takes a row off the list you are shopping, and the box that keeps it off every list.

**It hides the item from one view; it does not change what is true about it.** The card still reads *running low*, because it is. The store card's count and the top bar's cart count both drop. **The three status pills do not move** — they count stock, not shopping. That split is the whole idea, and it is the thing to get right first if this ships.

> **The card marker is the unsettled part.** Without something on the card, *why isn't the olive oil on my list* has no answer anywhere in the grid. Drawn as a struck cart glyph in meta, left of the status dot — the same cart the mobile shopping-list trigger uses. It is a glyph nobody has been taught, on a card that deliberately carries no icons beside the name, and it is the first thing to challenge.

**Two questions this raises and does not answer.** Whether an excluded item should still be *counted* somewhere — a household could quietly exclude half its pantry and the trigger would go quiet with it. And whether the exclusion is the household's or yours; every other property of an item is the household's, so it probably is, but a shared list where one person silently mutes a row is worth thinking about before it ships.

## Tokens

Nothing new. Two existing tokens move — see *Deltas*.

| Part | Light | Dark |
|---|---|---|
| Sheet | `#FDFAF4` on `#E2D5C0`, radius 20 | `#2C251B` on `#544737` |
| Section rule | `#EEE4D2` | `#3E3527` |
| Field / stepper fill · border | `#FDFAF4` · `#6F6049` | `#2C251B` · `#A5937A` |
| Focus halo | `0 0 0 3px rgba(190,51,70,.14)` | `rgba(212,99,107,.18)` |
| Stepper cell hairlines | `#EEE4D2` | `#3E3527` |
| Stepper glyphs · numeral | `#4C4237` · `#241E17` | `#DCD0BA` · `#F2E9DA` |
| Numeral selection while typing | `rgba(190,51,70,.18)` | `rgba(212,99,107,.22)` |
| Micro-labels · sub-labels · hints | `#6F6049` | `#A5937A` |
| Unit menu | surface on `line`, `0 14px 30px rgba(36,30,23,.20)` | surface on `line`, `0 14px 30px rgba(0,0,0,.55)` |
| Menu check | `#BE3346` | `#D4636B` |
| Status dot · text — out | `#9A2E3B` · `#9A2E3B` | `#E5878D` · `#E5878D` |
| Status dot · text — low | `#C4901F` · `#855A0F` | `#D8A63F` · `#E2B85E` |
| Status dot · text — stocked | `#5F7546` · `#47592F` | `#8FAE6D` · `#A9C486` |
| Off-list checkbox — off · on | surface on 2px `#6F6049` · `#241E17` fill, `#F2E9DA` check | surface on 2px `#A5937A` · `#EFE3CE` fill, `#241E17` check |
| Dashed `+ …` chip border | `#C9B79B` | `#544737` |
| Primary · ghost · remove | ink/cream · body label · crimson label | cream/ink · body label · crimson label |

**The dashed chip's dark value is new by omission** — *Edit item* gave `#C9B79B` with no counterpart, and `line strong` is the step that matches it against the dark surface. Small, but it was going to be invented by whoever built it first.

## Motion, keyboard and screen readers

- Section rules and layout do not animate. The unit menu takes the sort menu's motion unchanged.
- Stepping is 120ms on the numeral; the live status line **crossfades in 140ms** and does not move the label row. Under `prefers-reduced-motion` it swaps instantly.
- Tab order: name → number → unit → on hand `−` / numeral / `+` → low at `−` / numeral / `+` → chips, group by group → notes → Remove → Cancel → Save. The steppers are the app's primary control and their labelling is an open item in *Robustness*; this is where it gets settled — each stepper is a `group` labelled *On hand* / *Low at*, the numeral is a `spinbutton` with `aria-valuenow` / `aria-valuemin="0"`, and the buttons are `Add one` / `Remove one` within it.
- The status line is `aria-live="polite"` and `aria-atomic`, announcing *Running low* when it changes — not on every step, only when the state does.
- The unit trigger is a `combobox` with `aria-expanded`; the menu is a `listbox`, Escape closes to the trigger, type-ahead jumps by first letter.
- Escape closes the sheet unless the unit menu or a composer panel is open, in which case it closes that first.

## Deltas — two findings that leave this sheet

**The composer's field border does not clear 3:1, and in three of four cases it never did.** *Edit item → The inline composer* gives the field as `#FDFAF4` on `#9B8B75` light and `#2C251B` on `#6E5F4B` dark. Measured against the surfaces those fields actually sit on:

| Field on | Current | Ratio | `meta` instead |
|---|---|---|---|
| Composer panel, light | `#9B8B75` on `#F3EBDD` | **2.80** | `#6F6049` — 5.15 |
| Composer panel, dark | `#6E5F4B` on `#221C14` | **2.73** | `#A5937A` — 5.67 |
| Sheet surface, dark | `#6E5F4B` on `#2C251B` | **2.45** | `#A5937A` — 5.08 |
| Sheet surface, light | `#9B8B75` on `#FDFAF4` | 3.18 | `#6F6049` — 5.85 |

**`meta` fixes all four, and it is the answer this document already reached once** — *Shopping list → The row* rejected `#6E5F4B` for the checkbox at exactly **2.45:1** and took meta instead, in both themes, on the argument that a control outline you cannot see is the worst failure the component has. A text field is the same argument with more at stake. So this sheet uses meta throughout, and the composer's own field should follow; the *Household colour* identity row and the account menu's rename field inherit it.

**Faint text does not clear 4.5:1 anywhere it is used as a hint** — `#9B8B75` reads **3.18** on the light surface and `#7E6E58` reads **3.07** on the dark. That is the drawer's *The link will work for 14 days*, the first-run hints, and it would have been this sheet's two hint lines. They use **meta** instead. Not fixed here beyond this sheet, but it is a real doc-wide finding and belongs in *Gaps → Robustness* rather than in this section.

## Sample dataset

Sizes for the twenty items, so the boards and any future list work have something real to draw:

| Item | Size | Item | Size |
|---|---|---|---|
| Ground Beef | 1 lb | Chicken Breast | — |
| Ribeye | — | Coffee | 12 oz |
| Chicken Thighs | — | Tortillas | 10 ct |
| Butter | 1 lb | Peanut Butter | 16 oz |
| Black Beans | 15 oz | Frozen Corn | 12 oz |
| Jasmine Rice | 5 lb | Pasta | 1 lb |
| Frozen Peaches | — | Ground Chuck | 1 lb |
| Marinara | 24 oz | Shredded Cheese | 8 oz |
| Olive Oil | 1 qt | Baking Soda | 1 lb |
| Bacon | 12 oz | Cinnamon | — |

**Five carry no size on purpose.** Cuts of meat and loose fruit are counted, not packaged, and a dataset where every row has one would never draw the case where the meta line under a card name is absent — which is most of the reason the size sits under the name rather than beside it.

## Open questions

- **Metric and imperial both, in one fourteen-row menu.** A household-level unit system in *Pantry settings* would halve it to seven rows and remove the *is it oz or ml* pause, at the cost of a setting nobody asked for and a household that buys both. Left whole for now; the menu scrolls, which is the honest admission that it is long.
- **`size` vs `amount`** — the naming call above, made against the ask.
- **`cup` vs `½ pt`** for the half-pint size — the note above; the ambiguity is real but so is the mismatch between what you pick and what prints.
- **Does an item's on-hand start at 1 or 0?** Drawn as 1.
- **Is `on hand == low at` low?** Settled here as yes; confirm against the build.
- **The shopping-list stacking breakpoint moves from 460 to roughly 520** — derived, not measured, and it changes the grid's `minmax()` and so the column count at 1440.
- **The steppers stay side by side at 390 and that is the tightest thing on the screen** — 85px numeral cells with 6.6px of slack at four digits. It holds on paper. Nobody has typed 1000 into one on a real phone.
- **Nothing about the size is shared vocabulary.** Two people can enter *1 qt* and *32 fl oz* for the same bottle and the app will never notice. That is the price of not making units terms, and it is the right price — but if the shopping list ever wants to add up *how much olive oil do we have*, this is the decision that has to be revisited first.

## Boards

Own canvas — nine boards:
https://claude.ai/code/artifact/ad4ef00a-9b16-44f1-8d64-b18b46a9a953

1. **Add an item** — desktop 480, light — the fresh sheet, defaults showing
2. Add an item — dark
3. **Edit item** — light — prefilled, the name and size preview in the header, *Remove item* in the footer
4. Edit item — dark
5. **The size row** — at rest, set, and the unit menu open, both themes
6. **On hand and low at** — the two steppers, the numeral as a field, the three status lines, and the field-border finding drawn for all four surface-and-theme cases
7. **Where the size shows** — item card and shopping-list row, with and without, both themes
8. **Add an item at 390** — the bottom sheet, steppers side by side
9. **Keeping an item off the list** — the checkbox off and on, the card marker, the list row leaving. **Mockup, both themes**

Boards 1–4 draw the sheet at full height rather than scrolled, so every section is visible at once; on a 1440 screen the sheet is viewport height and the chip groups are below the fold.
