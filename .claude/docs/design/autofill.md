# Autofill — the name field and search, 31 Aug

Canvas — twelve boards on four pages, both themes:
https://claude.ai/code/artifact/236fa393-e09c-41f4-9ed8-19216008a071

Two suggestion menus: one under the item name on the **Add / Edit sheet**, one under the **top-bar search field**. They are the same component pointed at two questions, and most of this section is written once for both.

It also closes four of the questions standing under *Gaps → The document has drifted from the build* — what search matches, whether it reaches the term lists, its focus state, and whether it is debounced.

## One menu, two places

**The menu is the sort menu's construction at the sort menu's tokens** — surface on `line`, radius 14, 6px padding, rows at radius 9, groups split by `divider` hairlines. It is the third user of that construction after the unit menu, and it needed no new colour.

**Both menus are 440 wide.** On the sheet that is the name field's width, because a 440 field is already a list width. In the top bar the field is a banner — roughly 1221px at a 1372 column — and a 1221-wide menu would put a two-word item name in an acre of nothing, so search takes 440 too and aligns to the field's left edge. It lands on exactly one column of the item grid, which is the second reason: at 560 it covered part of the neighbouring card and clipped *Frozen Corn* mid-word.

| Part | Both menus |
|---|---|
| Width | 440 desktop · the column at 390 (358) |
| Offset below the field | 8 |
| Padding · row radius | 6 · 9 |
| Row inset | 12 |
| Group label | Karla 700 10.5 / 0.15em uppercase in `meta`, padding `10px 12px 6px` |
| Divider | `divider` hairline, `margin: 5px 12px` |
| Shadow | `0 14px 30px rgba(36,30,23,.20)` / `0 14px 30px rgba(0,0,0,.55)` |

**Nothing in either menu is ever *selected*, and that is what frees the fill.** The sort menu and the unit menu both use a crimson check rather than a fill, because with a fill doing both jobs a hovered row looks selected. A suggestion menu has no current value, so there is nothing for a check to mark and the fill can mean highlight outright — `sunk` in both themes, one treatment for hover and the keyboard cursor alike.

> **Sunk works here where it fails on the ground.** *Applied filters* found that a control on the ground hovering to sunk reads as disappearing, because sunk **is** the ground's middle stop. A menu is a card, so sunk is a real step down from it. The rule generalises as it was written: an interaction state moves away from the surface it sits on, and which token does that depends on the surface.

## The group headings

**Three labels, one vocabulary; each menu uses the two that apply to it.** The labels name what the rows *are*, never what pressing one does — the same rows do different things in the two menus, and a label that described the verb would have to change between them.

| Label | Rows | Name field | Search |
|---|---|---|---|
| `IN YOUR PANTRY` | items the household already tracks | ● | ● |
| `COMMON ITEMS` | the built-in grocery catalog | ● | — |
| `TERMS` | locations, stores and types | — | ● |

**Two groups each, and the shared one leads.** Name field: pantry, then catalog. Search: pantry, then terms. The most consequential match leads in both.

> **Terms were cut from the name field on 31 Aug.** *Baking* the type and *Baking Soda* the item collided in a field labelled `ITEM`, and setting a chip from the name field was a second subject in one control. Search gives terms the home they wanted, in a group whose whole job is to apply one. The term **row** survives unchanged — it is drawn on the row-anatomy board, and it is a search component now.

> **These get headings where the sort and unit menus get bare hairlines, and the difference is real.** Those menus group six sorts and fifteen units — variants of one thing, where a heading would name what the trigger already names. Here the groups are different *kinds of answer*, and which kind a row is changes what pressing it does. A hairline cannot say that.

**`TERMS`, not `FILTERS`.** *Filters* describes what pressing one does; *terms* is what they are, it is the app's own word, and it is what the drawer, the chips and the whole of `ui-designs.md` already say. Naming the group for the verb would also have made it the one heading that could not be shared.

## The row — three kinds

| Kind | Height (desktop / 390) | Content |
|---|---|---|
| **Item** | 56 / 56 | status dot · name · size in meta · second line `N on hand · Location` · chevron in search only |
| **Catalog** | 38 / 48 | the name, nothing else |
| **Term** | 38 / 48 | term dot · name · right-aligned `Store · 6` — **search only** |

**The matched characters go to 700 and the rest stays 400.** That single change is the whole explanation of the matching rule, and it costs nothing: typing `be` and seeing Ground **Be**ef and Black **Be**ans is how you learn that a match is a prefix of *any word*, not just the first.

**An item row carries the status dot from the sheet's own live status ramp**, and a term row carries the term dot it carries everywhere else. No new marks.

**Item rows stack their meta under the name in both menus.** The one-line form fits at 560 and not at 440, and 440 won for the reasons above.

> **Dark term dots, not the light bases.** *Household colour* records that the Filter tab's drawn picker uses dark-variant dots in both themes, so in light mode you press one colour and get another. That is a bug in those boards; it is not repeated here.

## Opening, matching, absence

**It opens at two characters, and never on focus.** An empty name field offering six common groceries is the app guessing at what you came to do.

**A match is a prefix of any word.** `be` finds Ground Beef and Black Beans; `eef` finds nothing. Case-insensitive.

**Six rows, at most three per group, and it never scrolls.** The unit menu scrolls because fifteen units are a fixed set you are choosing from; this is a guess you can improve, and typing one more letter is the way to a shorter list. Search's cap is **five items and three terms** — it has a larger set to draw from and only one group to share the space with.

**Nothing matches, so nothing opens.** There is no *No matches* row and no *see all* row. A menu that opens to report an absence covers the surface to say what the empty list already said; and in search the grid behind it is already narrowed to the same set, so everything the menu could list is on screen underneath it.

**The item you are editing never appears in its own menu.** True of both menus and needed by all of them.

## Picking — the sheet, settled 31 Aug

**A row that matches something you already have brings across its name, its size, and its Location / Store / Type chips. It never brings a count.** A catalog row fills only the name, because a word in a list knows nothing else. Those are the only two kinds of row this menu has.

**On hand and low at do not move.** *Low at* is a count, not a property — copying it would carry Ground Beef's 15 onto a jar of anything, and the household default is the number a new item should start from. This settles the question the Add / Edit sheet left open when it drew the *Household default.* hint.

> **The watch-out, and nothing in this design catches it.** Picking Ground Beef when you already have Ground Beef makes the duplicate *one tap*, faster than typing it. Two alternatives were drawn and are kept on the Explorations page: **A**, which fills only the name and says nothing about the duplicate either, and **C**, which turns a pantry match into a signpost — press it and the Add sheet is replaced by that item's own Edit sheet. C is the only one of the three that stops a duplicate rather than describing it, and it is the answer to reach for if this bites on a real household.

## Search — where the two menus differ

Exactly one rule, and it is worth stating as a rule rather than a detail:

**A chevron means the row leaves the screen you are on.**

- **An item row opens that item's Edit sheet**, and closes the menu, because it has taken you somewhere. It carries the chevron.
- **A term row applies the term** and appears in the applied-filter row, where `Clear filters` can already take it off again. No new component — that bar was built for exactly this. It carries no chevron, and it **does not close the menu**: terms are a set you work through, which is the rule the rail's quick filters already hold.

The name field's menu has no row that navigates, so it never draws a chevron.

### What search matches — closing an open question

**Item names, item sizes, and term names. Never notes.** Typing *pint* finding your pints is what the size section asked for; notes stay out because a row in the list for a reason invisible in the row is worse than a shorter list.

**Matching is name-shaped, and that is why there are two groups.** Typing `co` does not return Costco's six items — it returns the things *called* co-something, and offers **Costco** as a term beside them. Pressing that row is how you get the six. The grid behind obeys the same rule, so what the menu lists and what the grid shows never disagree.

### Three more, answered

- **The focus state.** Border to `line strong`, plus the crimson halo every other field in the app takes. Nothing new.
- **Debounce.** The menu opens at two characters and the grid narrows on every keystroke; neither is debounced. At twenty items that is free. It becomes a question at a few hundred, not before.
- **Whether search reaches the term lists.** It does, through the `TERMS` group — but only to *offer* them, never to fold their items into the results.

### The mode's own edges

- **Search is still not touched by `Clear filters`** — unchanged from *Applied filters*, and now doubly right: the menu's term rows put chips in that bar, and clearing them should not clear the query that found them.
- **Escape closes the menu and keeps the query. A second Escape clears the field** — the two steps the field's own `×` collapses into one.
- **No results** takes the item-grid empty state's form: Playfair italic 500 27px over a meta line and one ghost control. Not the shopping list's status disc — a disc would be the status ramp saying something about stock, and this is about a query. This also settles the shape for *no filter matches*, which *Gaps → Empty states* has open.

## Motion, keyboard and screen readers

- Menu in 140ms — fade plus a 4px rise. Rows do not animate individually. Under `prefers-reduced-motion` it appears instantly.
- ↓ ↑ move the highlight and wrap; Enter takes it; **Escape closes the menu and keeps what you typed**, joining the unit menu and the composer ahead of the sheet in Escape's order; Tab commits the typed text, not the highlight.
- The field becomes a `combobox` with `aria-autocomplete="list"` and `aria-expanded` over a `listbox` of `option`s — the same shape the unit trigger already takes, two controls apart on the same sheet.
- The count is announced politely on change: *6 suggestions.* Not on every keystroke, only when the number moves.

## Tokens

Nothing new. Every value below is already in `ui-designs.md`.

| Part | Light | Dark |
|---|---|---|
| Menu surface · border | `#FDFAF4` · `#E2D5C0` | `#2C251B` · `#3E3527` |
| Row highlight | `#F2EADC` | `#221C14` |
| Group label · meta line | `#6F6049` | `#A5937A` |
| Row name · matched characters | `#241E17` | `#F2E9DA` |
| Divider | `#EEE4D2` | `#3E3527` |
| Shadow | `0 14px 30px rgba(36,30,23,.20)` | `0 14px 30px rgba(0,0,0,.55)` |
| Search field, focused | `#FDFAF4` on `#CFBEA3` + `rgba(190,51,70,.14)` | `#2C251B` on `#544737` + `rgba(212,99,107,.18)` |
| Status dots | out `#9A2E3B` · low `#C4901F` · stocked `#5F7546` | `#E5878D` · `#D8A63F` · `#8FAE6D` |

**The menu takes `line` in dark, where a card takes `line strong`.** A menu is not a card — it is the sort menu's construction, and the sort menu's border is `line` in both themes. The item cards behind it keep `line strong` per the shopping list's finding. Both are on the boards, a few pixels apart, and they are meant to differ.

## Deltas — what leaves this section

**The name field's menu covers a good deal of the sheet, and that is the argument for the six-row cap.** Five rows and two labels is **~299px** at 480 — Size, both steppers and the top of the Location group go behind it. At 390 it is **~341px** of a 602px body, a little over half. Cutting the terms group took roughly 79px off each; before it, the figures were ~378 and ~430.

**Search's menu covers row 2 entirely** on desktop, including the three status pills. Nothing is lost — the grid behind is already narrowed — but it means the filtered pill counts are invisible exactly when they change.

**One thing this section drew and then removed, kept because the reasoning generalises.** The name field's menu carried a `TERMS` group for one day. It came out because a menu attached to a field labelled `ITEM` should answer *what is this item called* and nothing else — the collision between *Baking* and *Baking Soda* was the symptom, not the argument. The rule worth keeping: **a suggestion menu answers the question its field asks.** Search's field asks *what are you looking for*, and a location is a legitimate answer to that.

## Open questions

- **`0 in stock · 0 out` under a query.** *Applied filters* already recorded that the build recounts the status pills, and that a pill reading `0 out` is a control that can only disappoint. A search query makes that state ordinary rather than rare — it is on the light search board — and nobody has looked at one on a real screen.
- **Where the catalog comes from, and what is in it.** Drawn as a bundled word list with no source, no locale and no plurals policy. *Beets*, *Bell Peppers*, *Berries* are placeholders. A US-centric list in a household that shops elsewhere is worse than no list.
- **The catalog does not learn.** Adding *Gochujang* three times never puts it in the catalog, and every household starts from the same list. Making it learn makes it household data, which is a different design.
- **Nothing about the catalog is shared vocabulary either.** Picking *Berries* and typing *berries* produce two different items, exactly as the size section's units do.
- **Whether an item row in search should respect the applied filters.** Drawn as searching everything: if you have filtered to *Pantry* and search for something in the freezer, the menu still finds it. The grid does not. That disagreement is deliberate — a search that cannot reach past a filter you forgot you set is the worse failure — but it is not obvious from the screen, and nothing says so.
- **Six rows was chosen, not measured.** So was five-plus-three in search. With terms gone from the sheet, its menu can only reach six anyway — three pantry and three catalog — so the cap and the content now agree by accident rather than by design.
- **Long names have no drawn truncation** in either menu, which is the same gap the applied chip and the list row already carry.

## Boards

Own canvas — twelve boards on four pages:
https://claude.ai/code/artifact/236fa393-e09c-41f4-9ed8-19216008a071

**Name field** — 1. Add an item, 480, light · 2. the same, dark · 3. row anatomy, both themes · 4. mobile 390, both themes · 5. the rules

**Picking** — 6. the settled behaviour, before and after, with the watch-out

**Search** — 7. desktop 1372, light · 8. dark · 9. at 390, menu open in both themes and the no-match state · 10. what the search menu does

**Explorations** — 11. A, just the name · 12. C, the signpost. Neither is a spec.

Search boards draw the top bar and one row of the grid only. The no-match phone is the one board carrying the empty state, and it is drawn in light alone.
