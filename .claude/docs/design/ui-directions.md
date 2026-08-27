# Larder Log — interface (Aug 2026)

Canvas: https://claude.ai/code/artifact/9921008e-ee6c-4075-9379-6bf265cc1683
Pages: **Light** (14 artboards) · **Dark** (13 generated counterparts). 27 boards total. The early exploration boards have been removed.
Stack: Tailwind, SPA, one layout that flexes mobile ↔ desktop.

> **Merge note, 27 Aug — three branches, one day.** This document forked twice. The first fork: one branch added *Settings tab* and *First run — the display name*, the other added *Household colour*, *Shopping list*, the twenty-item dataset and *Applied filters*. The second: a branch carrying the build-observed *As built — 27 Aug* findings, the multi-select rule and two settled open questions, taken from a base that predated the reconciliation pass. This is the union of all three.
>
> Where they disagreed the later decision won — the household row carries **name and colour**, the top bar has **no title**, the sample set is **twenty items**, the marketing page's third benefit describes the shopping list **as it now is**, and the zero-items rule follows the **real** top bar rather than an imagined one.
>
> Three lessons now, not one. **Anything not drawn on a canvas drifts out of this document silently.** **Anything rewritten wholesale can drop a section without anyone noticing** — edit sections, not the file. And: **a union merge leaves the branches contradicting each other**, in exactly the places two branches happened to describe the same screen.

## Structure — one left drawer, two tabs
340px, dark, **always on the left** — docked and collapsible on desktop, a 328px slide-over with a scrim on mobile. Mobile's menu button is **top-left**, the same side the drawer comes from.

Above the tabs: wordmark, then the **household switcher** — a full-width button opening a popover of every household (name, role, item count, check on the current) plus *New household* and *Join with a link*. Bottom of the drawer: the account row — avatar, display name, email, chevron. **It opens a menu, not a section** — see *Settings tab → Your account*.

**Filter tab** — Location, Store, Type. Each section header has a pencil + chevron; the pencil flips *that section only* into editing (`color swatch · name field · delete`, an "Add …" row, **Done** in the header). The swatch opens the 16-colour picker (8 × 2). A dashed `+ …` chip also ends each chip list. `Clear all filters` last.

**The chips toggle, and several can be on at once** — OR inside a group, AND across groups; see *Applied filters*. `All items` is the *absence* of a selection rather than a member of it, so it lights when the group is empty. `Clear all filters` is the same action the top bar's `Clear filters` is, with the longer label it can afford: inside the Filter tab the word "all" has a list to refer to.

**Settings tab** — three blocks and a row, redesigned 27 Aug: **Household** (name **and colour** behind a pencil — see *Household colour* — then a **Members** row that pushes a second-level pane, then *Leave household*) → **Preferences**, which are yours (Appearance) → **Pantry settings**, which are the household's (the default low-stock threshold) → the account row at the foot. Members **and** invites live in the pushed pane. No Account section, no terms block, no shopping list. Fully specced under *Settings tab*.

**Add item** is a sheet: 480px from the right on desktop, a near-full-height bottom sheet with a grabber on mobile. Name → on-hand stepper + low-at → Location / Type / Store chip pickers (selected chip fills with its own term colour and takes ink text; unselected is neutral with a coloured dot; each group carries its `+ …` chip) → notes → sticky Cancel / Save item.

**The shopping list is a mode, not a surface.** A control in the top bar swaps the content column for the list, grouped by store — see *Shopping list*. (An earlier line here said it was a store-filtered banner and modal. That design is gone; the reasons are recorded in *Shopping list*.)

### The top bar — three rows

Rows 1 and 2 are recorded here from the build, because the document never described them and had drifted into describing something else. Row 3 is designed — see *Applied filters*.

**Row 1** is search and the primary, and it is the same in every mode: a full-width **search field** — 52px, radius 16, surface fill on `line`, a 20px search glyph in meta, placeholder *What are you looking for?* at Karla 400 16px meta — with **Add item** at the same 52px height beside it. At 390 the primary drops its label and becomes a 52px square.

**Row 2** is the state of what you are looking at. In the item grid: three **status pills** (`9 in stock` · `6 running low` · `5 out` — status tint, border, text and dot, 40px, radius 999, and each one filters), then the shopping-list control, then `Showing 20 of 20` and the sort trigger pushed right.

**Row 3 is the applied filters** — `Clear filters`, then one chip per active term. It exists only while a term filter is on, so most of the time the bar is still two rows. Full spec under *Applied filters*.

> **There is no title in the right pane, and there never was.** The zero-items rule under *Flows outside the shell* used to say the top bar "keeps the title and the count", which described a component that does not exist — the count lives in `Showing X of Y` on row 2. Corrected in both places, twice now, and the board that still drew a title has since been re-rendered.

## Collapsed rail
68px. Eight controls in three groups, `aria-label` on every one and a tooltip to the right after ~400 ms.

| # | Control | Glyph | Click |
|---|---|---|---|
| 1 | Expand | panel-right-open | Opens the drawer on the last pane |
| 2 | Household | the household's initial on its term colour, set in Settings — see *Household colour* | Flyout — switch, new, join |
| 3 | Location | map pin | Flyout — quick filter |
| 4 | Store | storefront | Flyout — quick filter |
| 5 | Type | tag | Flyout — quick filter |
| 6 | Appearance | sun / crescent / half-disc | Flyout — Auto, Light, Dark |
| 7 | Settings | sliders | Expands the drawer onto Settings |
| 8 | Account | avatar, pinned to the bottom | Flyout — **the account menu**, the same component the drawer's foot row opens |

Dividers after 2 and after 5.

**The rule: a pane expands the drawer, a menu flies out.** Filter groups and Settings need width, so they animate the rail 68px → 340px and the icon you pressed is the one lit on arrival. Household, Appearance and Account are menus — they fly out beside the rail, the rail does not move, and the button takes a cream ring to mark itself as the source. Escape or an outside click closes.

> **Account is now one component in two places.** The rail's flyout and the menu above the drawer's foot row are the same 292px panel — identity row with a pencil, hairline, sign out. It is why the Settings pane no longer needs an Account section at all: the thing it held already had to exist for the rail. See *Settings tab → Your account*.

**Quick filter ≠ the full set.** A flyout picks from one term list and nothing else: no pencil, no "+ Add", no clearing across groups. It ends with *Open full filters*, which expands the drawer to the whole pane.

**It is the one menu that stays open on a pick.** Household, Appearance and Account each close on the choice, because each is a choice made once. A filter group holds several terms, so closing after the first would mean reopening the same panel to add the second — the panel is a list you work through. Escape, an outside press, or the rail button itself still closes it.

**Appearance** opens the same three choices the Settings pane shows rather than cycling, so there is one source of truth. Its icon renders whatever the theme currently resolves to, making it a status indicator as well as a control.

**Badges** count active filters *in that group only*, sitting top-right of the icon: `#BE3346` fill, `#FDFAF4` text, 2px ring in the rail colour. Collapsed is the one place crimson touches the rail, and always as a badge, never a fill.

> **The badges are no longer the only answer, and the rail is unchanged because of it.** They still count per group. What they never did was say *which* term, or clear anything across groups — you had to expand the drawer for both. That is now row 3 of the top bar. Nothing on the rail moves.

### Control states
| State | Icon buttons | Household tile | Avatar |
|---|---|---|---|
| Rest | transparent · `#9E8C74` | `#A85E33` | `#4A3E2E`, inset ring `#63533E` |
| Hover | `#332B22` · `#D8CBB6` | `#B96A3C` | `#574934` |
| Pressed | `#3B3227` · `#F2E9DA`, `scale(.94)` | `#98522B`, `scale(.94)` | `#413628`, `scale(.94)` |
| Focus-visible | rest + 2px `#D4636B` ring, 2px offset in the rail colour | same | same |
| Open / active | `#F2E9DA` · `#241E17` | fill + 2px cream ring | fill + 2px cream ring |

Expand is the exception — it carries `#332B22` at rest (hover `#3D3429`, pressed `#453A2C`) and has no active state.

> **The Household tile's three fills above are terracotta because that is the sample household's colour, not because they are tokens.** They are derived from whatever colour the household is set to — see *Household colour*.

Desktop only: expanding reflows the content column rather than covering it, so nothing overlaps the grid.

## Applied filters

**The rule: a filter you cannot see is a filter you cannot remove.** With the drawer closed the applied set was invisible on mobile and merely countable on the collapsed rail — the badges said *1* and *2* without saying which, and nothing cleared across groups from out there. A third top-bar row closes it.

**Filtering is OR inside a group, AND across groups.** This document had never written that down, and every count below assumes it. **Nor did the app do it** — every group was single-select until this row was built, so the boards below drew a state the build could not reach. That was the right way round in the end: a row whose whole argument is *see what is on and take one off* implies there can be more than one on. Multi-select landed with it on 27 Aug, and the rule now lives in `shared/filter.ts` where `npm test` can see it. See [D45](../../../.docs/decisions.md).

### Where it lives

Last row of the top bar, full width of the content column, present only while at least one **term** filter is on.

**It is not conditional on the drawer.** The applied set is a fact about the content column, not about the drawer, and appearing on collapse would reflow the grid for a reason unrelated to what you pressed. It is drawn with the drawer expanded on purpose, redundant with the Filter tab and harmless.

**`Clear filters` leads, chips follow.** Reading order gives you the escape before the list, and on mobile it means the clear never scrolls away.

**Desktop wraps; mobile scrolls.** Vertical room is cheap on desktop and there is no scroll gesture, so the chips wrap to a second line — thirteen filters is past what anyone will set and two lines is the ceiling in practice. At 390 the clear is pinned, the chips scroll past the right edge with **no gutter on that side**, which is what says there is more.

**The mobile menu button takes the crimson badge**, carrying the total across all three groups, so the fact that something is filtering survives scrolling past the row. Same construction as the rail badges — crimson fill, `#FDFAF4` text, 2px ring — but the ring is in the **ground**, so it changes with the theme where the rail's does not.

### The chip

**It is the Filter tab's off chip with an `×` on it.** Surface fill, `line strong` edge, 7px term dot, label at Karla 500 13.5, `×` in faint. Nothing new.

Not inverted: in a row where every chip is on by definition, inversion says nothing, and a row of ink fills would take *Add item*'s only-ink-on-screen rule apart.

**One action, so one target.** The whole chip removes its term; there is no separate `×` hit area. 30px desktop, 44px mobile.

Group order — location, store, type — so the bar reads in the order the drawer sets them.

> **The coloured version is gone, and why is worth keeping.** The first draft gave each chip a 1.5px border in its term's *text* colour, which solved the ground-contrast problem outright and made the dot redundant. It read as too loud — sixteen possible hues in one row, all shouting at rest, and the row became the busiest thing on the screen. The neutral edge is quieter and puts the chips at the same weight as the sort trigger beside them, at the price recorded under *Open questions*.

### States

**Hover, pressed and focus share one treatment.** The chip is on its way out the moment you press it, so a separate press state has nothing left to report. **No transform either**: with hover and press merged, a `scale()` would fire on hover, and a chip that flinches when you point at it is worse than no press feedback.

| Part | Rest | Hover · pressed · focus |
|---|---|---|
| Chip fill | `surface` | **`line`** |
| Chip edge | `line strong` | `faint` |
| Chip label / dot | ink / term base | unchanged |
| Chip `×` | `faint` | ink |
| Clear | ghost, body label, no edge | `line` fill, `faint` edge, ink label |
| Focus adds | — | 2px crimson, 2px offset in the ground |

Both controls take the same active treatment, so the row reads as one thing rather than a button and some chips. Borders are declared transparent at rest on `border-box`, so nothing shifts when one appears.

> **The active fill is `line` in both themes, and that is the whole finding.** The app's usual ghost hover is the sunk fill — and sunk is the ground gradient's own middle stop, so a chip hovering to sunk goes from slightly lighter than the ground to *exactly* the ground, and the hover reads as the chip disappearing. Out here the state has to move **away** from the ground: darker on the cream, lighter on the dark. `line` does both — `#E2D5C0` light, `#3E3527` dark. One token, mirrored. Drawn first as a step *down* in both, which is exactly why the dark states came out indistinguishable from rest.

**On touch there is no hover**, so this same treatment is the only thing that happens between finger-down and the chip going. That is the argument for the fill being a full step off the ground rather than a whisper.

**Removal is neither undoable nor confirmed.** Nothing is lost, the term is still in the drawer, and one tap puts it back. It gets no toast: *undo what comes back, confirm what doesn't* is about records, and a filter is neither.

### What `Clear filters` clears

Every term chip **and the active status pill** — everything narrowing the grid invisibly. **Search is not touched**: it has its own `×` in the field, and you can see it working.

**The status pill is not mirrored into the bar.** It is already on screen in row 2 and already its own toggle; a second copy would be two controls for one filter. The consequence is that `Clear filters` clears something that is not in the row it sits in, which is why it carries **no count** — `Showing X of Y` is the count.

The drawer's own `Clear all filters` keeps its longer label and its place at the foot of the Filter tab. It is the same action from inside, where the word "all" has a list to refer to.

### Motion, keyboard and screen readers

Chip out 140ms — fade plus a 4px rise; the row reflows in 160ms and collapses when the last chip goes. Under `prefers-reduced-motion` it is a fade and the row reflows instantly.

The bar is a group labelled *Applied filters*; each chip is a real `<button>` with `aria-label` *"Remove filter Pantry"*. Removing announces `Pantry filter removed. Showing 12 of 20.` through the existing polite region; clearing announces `Filters cleared. Showing 20 of 20.`

### As built — 27 Aug

Four places the implementation is not what this section says, and one it could not have said.

**`Clear filters` is padded symmetrically at every width.** The live page gives it `padding: 0 12px 0 2px` on mobile so the label sits flush with the column edge. On a phone the hover fill is the only press feedback there is, and 2px put that fill hard against the *C*. At 12px the label lines up with the status pills' labels one row above, which is the alignment that was actually wanted. The chips beside it keep 4px of their own, uncancelled, because the two boxes otherwise touch — the live page's outer `gap: 8px` was lost in translation and both bugs were found in the same pass.

**The row does not reflow in 160ms.** The chip's own 140ms fade-and-rise is there; its neighbours snap into place rather than sliding. That needs FLIP or measured widths, and the live page does not do it either.

**Desktop-wraps / mobile-scrolls is a `md:` breakpoint, not the measured content column.** Row 2 sizes off a `ResizeObserver` because its question is whether its labels fit, and a docked drawer costs 340px without the viewport moving. This row's question is different — whether there is a **scroll gesture** at all. A mouse has none, so a docked drawer on a 1280 screen must still wrap even though its column is as cramped as a phone's. Different question, different axis.

**Focus moves to `Clear filters`** when a chip is removed and the row survives. Nothing here specified it and the live page does the same as the build originally did — nothing — which drops focus to the body and restarts a keyboard user at the top of the document. It paints no ring after a mouse press: a programmatic `focus()` matches `:focus-visible` only when the interaction that led to it was itself keyboard-driven.

**There was no "existing polite region" to announce through.** The one this section names belongs to the shopping list, which is a different mode; the grid had none. It lives in `Pantry` rather than in the bar, because the bar unmounts with its last chip and *Filters cleared* announced from a removed node is silence.

> **A fifth thing this section did not know it was answering.** *Open questions* asks whether the status pills should recount under a filter, and notes the boards keep them at household totals. **The build has always recounted them** — they count everything the term filters and the search admit, and only the status filter itself is excluded, so that picking *out* cannot collapse the other two to zero. So row 2 and row 3 already agree, and the question is settled by observation rather than by decision. Worth checking on a real screen before closing it.

### Boards

Own canvas — the states board carries both themes; the top-bar views are paired light over dark:
https://claude.ai/code/artifact/17c200fa-f8b1-437a-9996-48b36c5f1b35

1. Chip and clear — rest, active, focus, on the real ground in both themes
2. Desktop 1372 — three filters, one of them active
3. Desktop 1372 — thirteen filters, wrapped
4. Mobile 390 — six filters, chips scrolling under the pinned clear
5. Mobile 390 — two filters, fitting

**Right pane only, top bar only** — no rail, no drawer, nothing below the bar. The boards are deliberately 1372 rather than 1440: that is the content column at 1440 with the rail collapsed.

## Theming
Three rules hold in both themes:
1. **The drawer is the darkest surface** — in dark mode it drops *below* the content ground rather than inverting.
2. **Cards sit one step above the ground.**
3. **Near-black ink is the only thing you press** — in dark mode the primary button flips to cream `#EFE3CE` with ink text, still the single lightest control on screen. **Crimson is brand-and-out, never a button.**

The general form of rule 3, which the drawer and the toast both need: **the primary control is the lightest thing on a dark surface and the darkest thing on a light one.** So the drawer's *Done* / *Add* pill and the toast's *Undo* are cream-filled with ink labels in **both** themes — the drawer is dark in both, and an ink-filled pill on it would vanish. It is the rail's Open / active treatment, one step up.

A fourth rule the applied filters made explicit, and it generalises: **an interaction state on the ground moves away from the ground, not toward it.** Darker on the cream, lighter on the dark. Controls that sit on a *card* can keep hovering to `sunk`, because there the sunk fill is a real step; controls on the ground cannot, because sunk *is* the ground.

Type, spacing, radii and layout are identical across themes; only the tokens below change. The dark artboards were generated from the light ones by a hex-for-hex map, so any visual difference is a token difference.

Ground is a gradient in both: `radial-gradient(135% 105% at 10% -12%, …)`.

## Tokens

| Role | Light | Dark |
|---|---|---|
| Ground (grad) | `#F9F3E9 → #F3EADC → #EADFCD` | `#241E16 → #1F1912 → #191410` |
| Surface / card | `#FDFAF4` | `#2C251B` |
| Sunk / well | `#F2EADC` | `#221C14` |
| Line | `#E2D5C0` | `#3E3527` |
| Line strong | `#CFBEA3` | `#544737` |
| Divider, inside a card | `#EEE4D2` | `#3E3527` |
| Drawer (grad) | `#2B2419 → #1F1A13` | `#15110B → #0F0C07` |
| Drawer raised | `#332B22` | `#231D15` |
| Drawer well | `#191510` | `#0A0805` |
| Drawer hairline | `#3B3126` | `#2C2419` |
| Drawer dashed | `#4A4031` | `#3A3025` |
| Ink / primary text | `#241E17` | `#F2E9DA` |
| Body text | `#4C4237` | `#DCD0BA` |
| Meta text | `#6F6049` | `#A5937A` |
| Faint text | `#9B8B75` | `#7E6E58` |
| Primary button | `#241E17 on #F2E9DA` | `#EFE3CE on #241E17` |
| Crimson | `#BE3346` | `#D4636B` |
| Out tint / border / text | `#F6E2DD / #EBCFC5 / #9A2E3B` | `#31201E / #4E2E2C / #E5878D` |
| Low dot / tint / border / text | `#C4901F / #F7EEDA / #E9DAB9 / #855A0F` | `#D8A63F / #2E2614 / #4B3E1E / #E2B85E` |
| Stocked dot / tint / border / text | `#5F7546 / #EDEFE1 / #DCE0CB / #47592F` | `#8FAE6D / #232A1B / #39482C / #A9C486` |
| Grain | `4% multiply` | `5% overlay` |

| Term | Base | L tint | L border | L text | Dark dot | D tint | D border | D text |
|---|---|---|---|---|---|---|---|---|
| Slate | `#456B80` | `#E8EDEF` | `#D0DADF` | `#456B80` | `#6A92A7` | `#30302B` | `#364041` | `#7CA0B4` |
| Denim | `#42618F` | `#E8EBF0` | `#CFD6E0` | `#42618F` | `#708CB5` | `#302F2E` | `#343C47` | `#839CC1` |
| Indigo | `#5A548C` | `#EAE9EF` | `#D3D2DD` | `#5A548C` | `#8984B0` | `#332D2D` | `#3D3746` | `#9A96BD` |
| Plum | `#6D4A69` | `#EEEAEE` | `#DCD3DB` | `#6D4A69` | `#A37F9F` | `#362B27` | `#453339` | `#AD8CAA` |
| Mulberry | `#8E4468` | `#F0E8EC` | `#E0CFD7` | `#8E4468` | `#B67796` | `#3C2A27` | `#513138` | `#C28AA5` |
| Brick | `#A03B36` | `#F1E7E7` | `#E1CECE` | `#A03B36` | `#C77773` | `#3F291F` | `#582D25` | `#CF8582` |
| Terracotta | `#A85E33` | `#F1EBE7` | `#E1D5CE` | `#9C572F` | `#BF7A52` | `#402E1F` | `#5B3B24` | `#CB8F6C` |
| Ochre | `#A5791D` | `#F1EEE7` | `#E1DBCE` | `#846117` | `#AE842B` | `#3F321B` | `#5A451C` | `#CA972E` |
| Mustard | `#8C7C22` | `#F1EFE7` | `#E1DECE` | `#7A6C1E` | `#9C8C31` | `#3B331C` | `#50461E` | `#B09D33` |
| Olive | `#5F7542` | `#ECEFE9` | `#D8DED1` | `#5B703F` | `#7A935A` | `#343221` | `#3F432A` | `#8AA467` |
| Fern | `#3F7A4C` | `#E8F0EA` | `#D0DFD3` | `#3C7549` | `#579865` | `#2F3323` | `#33452E` | `#64A973` |
| Teal | `#3E6D68` | `#E9EFEE` | `#D1DEDD` | `#3E6D68` | `#5C948E` | `#2F3127` | `#334038` | `#6AA59F` |
| Aqua | `#2F6E7C` | `#E7EFF1` | `#CEDEE1` | `#2F6E7C` | `#4995A6` | `#2C312B` | `#2D4140` | `#51A3B5` |
| Clay | `#87694C` | `#EFECE9` | `#DED7D1` | `#7D6146` | `#A28467` | `#3B3023` | `#4F3F2E` | `#B1977D` |
| Cocoa | `#5E4A3C` | `#EEEBE9` | `#DDD7D2` | `#5E4A3C` | `#A08674` | `#342B20` | `#3F3328` | `#AB9281` |
| Stone | `#6E6A5F` | `#EDECEB` | `#D9D8D6` | `#6A665B` | `#908C81` | `#373026` | `#453F35` | `#9F9B91` |


## Type
- Playfair Display — wordmark 700 27px ("Log" italic 600 crimson), quantities 700 42px / 28px mobile, item names 600 21px / 18.5px, empty-state italic 500
- Karla — body 400 15px, meta 400 13px, section labels 700 10.5px / 0.15em uppercase, buttons 600 15–16px
- Radii: cards 18–20, controls 13–15, chips 999. Tap targets ≥44px on mobile.

## Term colours
Sixteen, assignable per location / store / type. Contrast-checked in both themes: every light `L text` on `L tint` and every dark `D text` on `D tint` clears 4.6:1. Assignments: Pantry olive · Meat Freezer terracotta · Upright Freezer slate · Chest Freezer teal · Calfee Cattle brick · Costco olive · Publix slate · Aldi clay · Produce olive · Dairy slate · Condiment plum · Beverage teal · Grain ochre · Snack clay · Baking terracotta · Spice mulberry · Protein brick.

> **These are the boards' sample data.** What a new household is *seeded* with diverged from it under D40 for locations and stores, and under D50 for types — see *What gets seeded* under **First run**.

## Chips and tags — two components, one rule

A term appears in the UI in exactly two forms. They look different on purpose, because one is a label and the other is a switch.

**Tag** — read-only, on item cards and in the shopping list. Term tint background, term border, term text, plus the solid dot. This is the only place a term's own colour fills anything. It is not pressable, so it does not need a selected state.

**Chip** — a control: the filter pane, the quick-filter flyouts on the collapsed rail, and the add / edit sheets. Two states only:

| Chip state | Treatment |
|---|---|
| Off | Surface `#FDFAF4` on `#E2D5C0`, ink label, term-coloured dot on the left |
| On | Inverted — ink `#241E17` fill, cream `#F2E9DA` label, **no dot**, 600 weight |

Dark mode inverts the inversion: `#EFE3CE` fill, `#241E17` label. It is the same token pair the drawer's primary button uses, so it comes free from the theme map.

The rule behind it: **the colour identifies the term, inversion says it is on.** Selection is a neutral event and looks the same everywhere — the drawer, the flyouts, the mobile "All" chip and the sheets. Filling a chip with the term's own saturated colour was the one place that broke this: it made an on-state that changed hue per row, competed with the tags on the cards behind the sheet, and left no headroom for hover or focus on top of it. The dot disappears when a chip is on because the fill has already said the only thing the dot was there to help with.

The `+ Location / + Store / + Type` chip is a third, deliberately weaker form: dashed `#C9B79B` border, no fill, muted label. It reads as an affordance rather than a term.

> **The applied-filter chip is the Off form with an `×`, and it does not contradict the rule above.** Inversion says "on" only where there is an off to contrast with. In the applied bar every chip is on by definition, so inversion would carry no information and would only make the row loud. See *Applied filters*.

> **The role chips in the invite composer are the same component with no dot.** A role is not a term, so there is nothing for a dot to identify — but three mutually exclusive options with an on-state is exactly what the chip is, and the inversion carries over unchanged. On the drawer that inversion is the *cream* one, per the note under *Shopping list → Tokens*. See *Settings tab → Making an invite*.

## Edit item + inline term creation
Same 480px sheet as Add, prefilled. Differences:

- Header carries the **item's name** rather than "Add an item" — the only place it is set in Playfair at that size, so there is no doubt which row you opened.
- **No timestamps on items.** Nothing in the UI shows when an item was added, changed or last counted. *Recently added* sorts on insertion order, not on a date anyone sees; if that ordering should go too, the sort's default moves to *Needs restocking*.
- **Remove item** sits far left in the footer: ghost, crimson text, never a crimson fill. Always reachable without scrolling, and the width of the footer away from Save.
- **Removal is undoable, not confirmed.** The sheet closes, the item goes, and a toast holds it for six seconds — see *Destructive actions*. A confirm modal on every edit is the worse trade in a shared list.
- Save changes is the only filled control; Cancel and Remove are both ghost.

### The inline composer
Creating a term from a sheet uses **the Filter tab's editing panel, re-skinned for the cream sheet** — not a second interaction. One component, two surfaces.

1. The dashed `+ Location / + Store / + Type` chip sits at the end of its group. Editors and owners only.
2. Pressing it **drops the panel in below the group** — it does not replace the chip. Recessed fill on a 1px inset hairline, radius 14, a micro-label header (`LOCATION · NEW`) and a pill on the right, exactly the construction the Filter tab uses for `STORE · EDITING` + *Done*.
3. The row inside is the drawer's row: a **26px circular swatch** ringed in its own colour, a **40px field at radius 11**, and a 30px ghost icon on the right — `×` here to abandon, a trash there to delete. The swatch arrives pre-filled with the next unused term colour.
4. The swatch opens the sixteen **inline**, in the same 8 × 2 grid on a further-recessed sub-panel that pushes the panel taller. Nothing floats over the sheet. Optional: Enter commits without ever opening it, Escape closes the panel.
5. The new term **lands created and selected** when made from a sheet — that is why you made it. Made from the filter pane it lands unselected, since filtering by a brand-new empty term would blank the list.

**Same panel, less of it.** The sheet's copy only creates: one row, and an *Add* pill where the Filter tab has *Done*. Renaming, recolouring and deleting stay in the Filter tab, which remains the one place terms are managed.

| Part | Light | Dark |
|---|---|---|
| Panel fill / hairline | `#F3EBDD` / `#DFD2BC` | `#221C14` / `#453B2B` |
| Field | `#FDFAF4` on `#9B8B75` + `rgba(190,51,70,.14)` halo | `#2C251B` on `#6E5F4B` + `rgba(212,99,107,.18)` halo |
| Picker sub-panel | `#EBE1D0` | `#1C170F` |
| Selection ring on the current colour | ink `#241E17` | cream `#F2E9DA` |
| Add pill | ink / cream — `#EBE1D0` / `#B0A088` while the field is empty | cream / ink |

The earlier design had this as a floating pill-shaped capsule with a popover — a shape that existed nowhere else in the app. It is gone.

> **A third surface for the same panel: the invite composer.** *Settings tab → Making an invite* uses this construction on the drawer well, with role chips in place of the swatch-and-field row and a *Create* pill where the sheet has *Add*. Same header, same hairline, same drop-in-below-the-dashed-row rule.

## Settings tab

**Redesigned 27 Aug.** The pane had six labelled sections in a 340px column and printed the same two facts three times over — you in Account, again in Members, again in the row at the foot; the household in the switcher and again under its own heading. The role controls were a segmented strip that appeared under whichever member you last tapped, anchored to nothing. What replaced it is three blocks, a pushed pane, and two menus.

Canvas — two pages, **Settled** and **Explorations**:
https://claude.ai/code/artifact/3d0bd7d6-6659-4641-a5f3-434aa22b8f68

### Three rules

1. **The household tile appears once**, in the switcher. Nothing else in the pane draws it.
2. **You appear once**, in the row at the foot. There is no Account section, and nothing anywhere says whether you are signed in — if you are reading it, you are.
3. **Scope is in the label.** *Preferences* are yours and follow you between households; *Pantry settings* belong to the household you are in. The two words do not say which is which on their own, so the pane keeps them apart and names the second for what it governs.

### The root pane

| Block | Content |
|---|---|
| **Household** | The identity row — name and colour behind a pencil, per *Household colour → Settings › Household* — with the item count in meta · a **Members** row: three stacked 28px avatars ringed in the card fill, *3 people · 1 invite out*, chevron · ghost crimson *Leave household*, inside the same card under a hairline |
| **Preferences** | Appearance — Auto / Light / Dark, the segmented control the tabs already use, on the well fill with a cream active |
| **Pantry settings** | *New items are low at* with the drawer-scale stepper, meta *Change it per item any time*. Anything pantry-wide lands here |
| The account row | Avatar, display name, email, chevron, under a hairline at the foot. It opens a menu — see *Your account* |

Every block is still a micro-label header in drawer-meta over content on the **drawer raised** fill at radius 13. The construction did not change; there is less of it.

**The threshold moved out of Preferences.** It is a fact about the pantry, not about the person looking at it — two people in one household who disagree about it are disagreeing about the household, which is what makes it a setting rather than a preference.

**Leave household is contained by the block it belongs to**, inside the Household card under a hairline, rather than floating between two sections as a crimson row two rows into the pane.

> **Preferences sits above Pantry settings, which leaves Household and Pantry settings non-adjacent** even though both are household-scoped. Ordered yours-first on purpose — Appearance is the one anyone actually changes — and the labels are carrying the distinction rather than the grouping. The one place the new order costs something; worth a look on a real screen.

### The Members pane

The chevron pushes a second-level pane: a 36px back button on drawer-raised, *Members* in Playfair 600 21 with the household name in meta beneath, the member list, then **Invites**.

**Members and invites are one subject and get the full 340 together.** That closes the standing question about invite links being cramped — the link now has a field of its own to sit in before you copy it.

Member rows are 58px inside one raised group, hairlines inset past the avatar: 36px avatar, name at body 15, then the role. Your own row reads *Owner · You* in meta and carries no control.

**There is no overflow menu on a member row.** The role is the only thing an owner changes, and *Remove from household* already lives at the foot of the role menu. A `⋯` beside the role would be a second control opening a menu you can already reach.

**The pane drops the Filter / Settings tabs while pushed**; back is the only way out. A decision rather than an oversight, and the first thing to revisit if it reads as a trap.

### Changing a role

**The role word is the trigger, and the menu is the drawer's own surface.** Owner only.

- **Rest** — the role is a control on the row: `#3B3126` fill, `#DCD0BA` label at 13.5, radius 13, 30px, with a 13px chevron.
- **Open** — the trigger takes the rail's documented open state (cream `#F2E9DA` fill, ink `#241E17` label, 600) and the menu drops **below** it, **right-aligned to the card's edge** — 224px inside the 340px pane, so it never asks for room the drawer does not have.
- **Menu** — `#241E17` on `#4A4031`, radius 14, 6px padding, shadow `0 16px 40px rgba(10,8,5,.44)`. Rows 36px at radius 9, 14px. Owner / Editor / Viewer, the current one at 600 cream with a `#D4636B` check — **a check, not a fill**, the sort menu's rule, so a hovered row still reads. Hairline, then *Remove from household* in `#D4636B`.

> **Two alternatives lost, and both are on the Explorations page.** Reusing the sort menu itself — a cream popover — was free and already consistent, and it broke rule 1 of *Theming*: the brightest thing on the screen opening over the darkest panel in the app. Putting everything behind a `⋯` kept the surface right but named the role twice, once on the row and once in the menu. What shipped is the second one's colours with the first one's mechanics.

**Your own row has no trigger.** Demoting yourself while you are the only owner is the blocked dialog that already exists for leaving, not a disabled menu row.

### Invites

One card per live invite, then a dashed *+ New invite* row, both inside the Members pane.

**Expiry is a countdown, not a date** — *Expires in 12 days*. It answers the question the date was standing in for, and needs no year, no locale and no format. And the role is the card's own heading — **Editor**, not *Joins as Editor*; the card is about one invite, so the sentence has nothing to disambiguate.

| Card part | Treatment |
|---|---|
| Card | Drawer raised on `#3B3126`, radius 13, padding 14, 12px gaps |
| Header row | Role at body 15 / 600 on the left, *Expires in N days* at meta 13 on the right |
| Link | 40px row at radius 11 on the drawer well with a `#3B3126` edge, 13px monospace in meta, truncating |
| Footer | *Copy link* — the drawer's primary, cream on ink, 36px at radius 11, flex-grown — beside a ghost crimson *Revoke* |

**A card collapses to its header** once it is not the newest — one row per invite, expanded only for the one you just made. Four live invites is otherwise four link fields stacked in a 340px pane.

### Making an invite

**The dashed row drops the composer in below itself and stays put** — the Filter tab's term composer at drawer scale, so this is a component that already exists rather than a new interaction. No modal.

1. **Panel** — drawer well on a 1px inset `#3B3126` hairline, radius 14.
2. **Header** — `NEW INVITE` micro-label, a cream **Create** pill (30px at radius 10) and a 30px ghost `×` to abandon, with a hairline beneath. The hairline is what puts the panel at the same rhythm as the card above it.
3. **Chips** — Owner / Editor / Viewer, 34px at radius 999, 8px apart. Off is a `#4A4031` outline with a `#DCD0BA` label; on is the drawer's cream primary. **Editor is preselected**, because it is the ordinary case.
4. **A sentence that changes with the chip**, at 13.5 / 1.5 in meta: *Can add, edit and remove items. Can't invite anyone or rename the pantry.* Then, in faint: *The link will work for 14 days.* Three role names are meaningless words on their own, and Viewer is the one nobody can guess.
5. **Create** closes the panel; the new invite lands at the top of the list with its link already showing.

**No toast on create.** The row appearing with the thing you asked for in it is the confirmation, and you have to stay on the screen to copy the link anyway.

### Your account

The row at the foot **opens a menu above itself** — the same component the collapsed rail's Account flyout uses, so one thing serves both states of the drawer. 292px, `#241E17` on `#4A4031`, radius 14, the role menu's shadow. The avatar takes the 2px cream ring that marks it as what opened this.

Two rows, and that is all:

1. **Identity** — 38px avatar, display name, email, and a pencil. The pencil flips the row *inside the menu* into the composer's 40px field at radius 11 on the drawer well, with the crimson focus halo and a cream **Done** pill. No modal, no profile screen. Escape cancels. **No toast** — the row returning to read-only with the new name in it is the whole confirmation, which is the same argument the old Account section made.
2. **Sign out**, under a hairline.

> **Not in v1: *Change your picture*.** A third row handing off to Gravatar is drawn — its own block between identity and sign out, carrying the outbound arrow that means *this leaves the app* — **as a mockup only**, so the menu's proportions are known before there is somewhere to send people. It ships with two rows. The board marks it.

> **Two names, two places, one idiom — restated.** The display name is on the account and is changed in the account menu; the household name is on the household and is changed in Settings › Household. Both are a read-only row with a pencil that flips it in place, and neither is a modal. The switcher is still the only place a household is *chosen*. What changed is that the account half is no longer a section of the Settings pane — it is where you already were.

**Mobile** is the same pane and the same menus in the 328px slide-over. Every pencil, pill, chip and menu row takes a 44px hit area; the glyphs stay their drawn size.

### Boards

Two pages on the canvas above. **Settled** — five boards:

1. The drawer — the root pane, three blocks and the account row
2. Members pane — the list and Invites at full width
3. Changing a role — at rest and open
4. Making an invite — at rest, choosing the role, created
5. Your account — at rest, the menu to build, and the planned variant, marked

**Explorations** keeps the pane as it was, the two directions that lost (a tightened version of the old order, and one household card holding members and invites), and the option sheets the role menu and the account menu were chosen from. Nothing on that page is a spec.

**Drawn in light theme only.** The drawer is dark in both, but its tokens still differ — `#2B2419 → #1F1A13` against `#15110B → #0F0C07` — so the dark counterparts are a hex-for-hex map away and have not been rendered. **The sample household is *Granny's* in brick**, not Calfee's terracotta, and the member names are invented.

> **Board 10 on the *Flows outside the shell* canvas is superseded.** It draws Settings · Account, rest and editing — a section that no longer exists. The display-name flow it shows is intact; it just happens in a menu now.

## Household colour

Every household carries one of the sixteen term colours. It is not decoration: on the 68px rail the tile is the **only** thing naming which household you are in, and four households called *The Tadlock House*, *The Lake Cabin*, *Mom's Pantry* and *Apartment 4B* are told apart by hue long before anyone reads them.

The rail, the switcher and the invite landing all drew that tile already. Nothing set it. This closes that.

> **A household gets a term colour; a person does not.** The member avatar falls back to initials on the neutral avatar fill — see *Flows outside the shell → First run — the display name*. Term colours mean *term* everywhere else in the app, a household is a named thing you filter and switch between, and a person is not. Same argument that keeps the role out of a tag on the invite card.

### The identity row

**It is the inline composer, not a new component** — a 26px swatch ringed in its own colour, a 40–44px field at radius 11, and the same 8 × 2 picker opening *inline*, pushing the panel taller rather than floating over anything. A household is a coloured, named thing in a list, which is exactly what every location, store and type already is.

One row, two surfaces, the way the composer already works:

| Part | On the drawer (Settings) | On a card (creation) |
|---|---|---|
| Panel fill / hairline | `#262019` / `#3B3126` | `#F3EBDD` / `#DFD2BC` |
| Field | `#191510` on `#3B3126`, `#6E5F4B` focused | `#FDFAF4` on `#9B8B75` |
| Focus halo | `rgba(190,51,70,.14)` | same |
| Picker sub-panel | `#1B1610` | `#EBE1D0` |
| Ring on the current colour | cream `#F2E9DA` | ink `#241E17`, cream in dark |
| Commit | *Done* pill, ink on cream | the *Create household* primary |

The ring follows the general form of rule 3 — the marker has to beat the surface it sits on — so it is cream on the drawer in **both** themes, and ink on a card in light, cream in dark.

**Picking a colour another of your households already wears is allowed**, and the line under the picker says so: *Aqua — also used by **The Shop**.* Nothing is disabled, for the reason the enabled trash already carries: a disabled control cannot explain itself. There is **no uniqueness rule** — it would fail the moment someone belongs to seventeen households, and a household you do not own should not get to dictate what yours looks like.

> **The picker's dots are the values the tile will take** — light bases in light mode, dark variants in dark. The Filter tab's drawn picker uses dark-variant dots in *both*, so in light mode you press one colour and get another. That is a bug in that board rather than a rule; fix it when those boards are next re-rendered.

### The tile

One shape at four sizes — 68 on the rail, 44 on the invite card and the switcher header, 34 in a list row, 26 as the composer swatch. Radius is **30% of the side**; the letter is Playfair 700 at **42%** of the side in `#FDFAF4`, which the term-base rule flips to `#17130D` on the dark variants.

**The letter is the first letter of the first word that is not an article.** *The Tadlock House* gives T, *The Lake Cabin* gives L. Taking the literal first character would make every household beginning "The" a T — precisely the case the colour exists to disambiguate. A household with no name yet, in the dialog before you type, shows the colour alone and no letter.

Rail states, all derived from the chosen colour so that none of the sixteen needs a hand-picked pair:

| State | Fill |
|---|---|
| Rest | the colour |
| Hover | mixed **10% toward white** |
| Pressed | mixed **9% toward black**, `scale(.94)` |
| Focus-visible | rest + 2px `#D4636B`, 2px offset in the rail colour |
| Open | rest + a 2px cream ring |

This replaces the hard-coded `#A85E33 / #B96A3C / #98522B` in *Collapsed rail → Control states*, which was one household's terracotta written down as though it were a token.

### Settings › Household

The pencil already existed and had nothing to edit but the name. It now flips the section into the identity row — the Filter tab's editing panel, one row deep: same recessed fill on a hairline, same micro-label header (`HOUSEHOLD · EDITING`), same *Done* pill. No add row and no trash, because a household is one row rather than a list; **leaving is a different verb** and keeps its own ghost crimson row below, inside the same card under a hairline.

**The panel carries a live 34px tile preview.** Every other picker in the app recolours something already on screen. The household tile lives on the rail and in the switcher, both of which are somewhere else while you are in Settings, so the panel shows the thing it is about to change.

**Owners only**, the same rule the term pencils follow. An Editor sees the rest state and *Leave household*, and no pencil. The block order is unchanged — the colour lives inside Household, not in a new block.

### Creating a household

Both entry points use the same row.

**First run** keeps its shape: eyebrow → title → body → micro-label → row → hint → *Create household* → the signed-in row. The micro-label becomes **`HOUSEHOLD NAME AND COLOUR`**, which is the whole disclosure a 26px circle beside a text field needs; without it, it reads as decoration.

> **This does not break "one field, one button, nothing else."** The swatch is *part of* the field row, exactly as it is in the term composer — not a second question. Enter still finishes the screen without the picker ever opening.

**New household**, reached from the switcher and from the rail's household flyout, opens a **420px dialog on the confirm shell** — radius 18, ghost *Cancel* plus the ink/cream primary right-aligned, Escape and scrim both cancel. Its header tile is the live preview, so it needs no separate preview row. *Create household* is disabled until the field has a name.

**The colour arrives already chosen** — the first unused across the households you are in, walking the sixteen in order. Nobody has to decide something they have no opinion about, and two of your own households never land on the same colour by default.

### What does not get a picker

**Not the rail's household flyout.** It switches, creates and joins. Recolouring is management, and management expands the drawer — the same line the quick filters already hold.

### Boards

Own canvas — four boards, each with its dark counterpart, 8 total:
https://claude.ai/code/artifact/e1f6b350-f914-48ee-a721-a29be7a80f24

1. The identity row — both surfaces, three states each, plus the tile and letter rules
2. Settings › Household — rest, editing, picker open
3. Creating a household — first run and the dialog, each with the picker open
4. Where the colour shows — switcher, rail flyout, the five rail-tile states, invite card

## Destructive actions
Specced here and drawn — canvas link under *Boards* at the end of the section. Scope is Owner and Editor; the Viewer variant is still open and does not block this.

**The rule: undo what comes back, confirm what doesn't.**

An action gets an **undo toast** when the record can be restored and you are the only person affected. It gets a **confirm modal** when the effect can't be reversed, or when it reaches someone who isn't looking at your screen. Nothing gets both, and nothing gets a confirm *and* a toast that claims an undo it can't honour.

| Action | Treatment | Why |
|---|---|---|
| Remove item | Undo toast | Restorable, and a shared list is edited constantly |
| Delete a term — unused | Undo toast | Restorable, and only reachable when nothing references it |
| Delete a term — in use | Blocked dialog | Not a decision, a precondition |
| Revoke an invite | Confirm modal | The link dies for someone else the moment you press it |
| Remove a member | Confirm modal | Same reason, one rung up |
| Leave household | Confirm modal | You lose access and can't put yourself back |
| Leave — last owner, others remain | Blocked dialog | Would orphan the household |
| Leave — last member | Confirm modal + typed name | This isn't leaving, it destroys the household |

**Removing a member inherits the invite pattern**, and its trigger is *Remove from household* at the foot of the role menu — see *Settings tab → Changing a role*. Undo pressed on something another member has since changed is a concurrency problem, not a destructive-action one — it stays in the failure states.

**Neither treatment reaches filters.** Removing a filter chip and pressing *Clear filters* change what you are looking at, not what exists — no toast, no confirm. The rule is about records.

**Crimson is still never a button.** The confirm's primary control is the ordinary ink/cream primary. Destructiveness is carried by three things that cost nothing: the title asks the question, the body names what is lost, and the button says the verb — *Revoke invite*, *Leave household* — never *Confirm*, *OK* or *Yes*. Crimson appears once per dialog as the icon tint, which is the tag treatment applied to a glyph and comes free from the out tokens. Ghost + crimson text stays what it already is on the Edit sheet and on the invite card's *Revoke*: the way a destructive action is **offered**, never the way it is **executed**.

### Toast — one component, two variants

**Actionable** (`Removed Ground Beef` · *Undo*) holds for **6s**. **Plain** (`Invite revoked.`) holds for **3.5s**, carries no action and no dismiss — there is nothing to decide.

The toast is the **drawer surface**, in both themes. It is transient chrome, and borrowing the app's darkest layer keeps rule 1 intact, separates it hard from the cream ground, and comes free from the theme map. It is dark in dark mode too, sitting below the ground exactly as the drawer does; the shadow and a heavier hairline do the separating.

- **Placement.** Bottom-centre of the **content column** on desktop, 24px up — the column reflows when the drawer expands, so the toast can never sit over the drawer. Bottom-centre on mobile, 16px above the safe area.
- **Size.** Height 52 desktop / 56 mobile, min-width 280, max-width 460, padding `14px 14px 14px 18px`, radius **15**. Controls radius, not card radius: a toast is a transient bar, not a surface you are meant to settle on.
- **Message.** Karla 400 15px, the object's name at 600 so the row is identifiable at a glance. One line; the name truncates, the sentence does not.
- **Undo pill.** 34px, radius 11, padding `0 14`, Karla 600 14px. It is the drawer's primary — cream fill, ink label — because the toast is dark in both themes. A `#332B22` pill was the first draft and it disappeared into the toast: the one control the component exists for cannot be the quietest thing on it.
- **Dismiss `×`.** 30px ghost icon, the composer's abandon glyph. Pressing it **commits** the removal and clears the toast — the only way to get it off screen early.
- **Timer.** 2px bar along the bottom edge, draining left → right. It answers "how long do I have" without asking anyone to guess. Pauses on hover and on focus within.
- **Stacking.** Max 3, newest at the bottom, 8px gaps, older ones shift up. A fourth removal commits the oldest immediately.
- **Motion.** In 180ms — 12px rise + fade, ease-out. Out 140ms fade. Stack reflow 160ms. Under `prefers-reduced-motion`, transitions become fades; the timer bar stays, because it is information rather than decoration.
- **Keyboard and SR.** `role="status"`, `aria-live="polite"`, `aria-atomic="true"`. Focus is never stolen. The toast enters the tab order at the end of the document; Escape while focus is inside it commits and closes. **Cmd/Ctrl+Z undoes the newest live toast** from anywhere, which is the path most people will actually use.

| Toast part | Light | Dark |
|---|---|---|
| Fill (grad) | `#2B2419 → #1F1A13` | `#15110B → #0F0C07` |
| Hairline | `#3B3126` | `#6E5F4B` |
| Shadow | `0 16px 40px rgba(36,30,23,.30)` | `0 16px 40px rgba(0,0,0,.55)` |
| Dark-only top highlight | — | inset `0 1px 0 rgba(242,233,218,.07)` |
| Message / name | `#F2E9DA` | `#F2E9DA` |
| Dismiss rest / hover | `#9E8C74` / `#D8CBB6` | `#9E8C74` / `#D8CBB6` |
| Undo pill fill / label | `#F2E9DA` · `#241E17` | `#EFE3CE` · `#241E17` |
| Undo hover / pressed | `#FDFAF4` / `#E2D5C0` | `#FDFAF4` / `#DCCFB6` |
| Timer track / fill | `#3B3126` / `#9E8C74` | `#2C2419` / `#7E6E58` |
| Focus-visible | 2px `#D4636B`, 2px offset in the toast fill | same |

The focus ring uses the **dark-mode** crimson in both themes, for the same reason the rail does — the surface underneath it is dark either way.

> **The dark hairline is heavier than any other hairline in the app, on purpose.** In light mode the toast fill separates from the ground at 14.5:1 and the shadow is a nicety. In dark mode the same fill separates at **1.18:1** and the shadow does nothing — black on near-black. `#6E5F4B` is the strongest border already in the dark palette (the composer's field takes it) and gets the edge to 2.67:1 against the ground; the 1px top highlight covers the rest. Nothing lighter exists in the system, and inventing one for a 52px bar isn't worth breaking the palette. Docked chrome doesn't need this — the drawer's own hairline stays `#2C2419`, because a full-height panel is separated by the layout.

### Confirm modal

- **Shell.** 420px desktop, `100% − 32px` mobile, centred in both. Radius 18 — this one *is* a card. Padding 22. Not a bottom sheet on mobile: a confirm is a question, and centring keeps it out of the thumb zone the Add sheet owns.
- **Order.** 40px icon disc → title → body → footer. Title Playfair 600 21px, the same size item names take. Body Karla 400 15px, two lines at most.
- **Footer.** Right-aligned pair, Cancel then the action. Buttons 40px desktop / 44px mobile, radius 13. The action is the ink/cream primary; Cancel is ghost. Side by side at 390 — two 44px buttons fit.
- **Dismissal.** Escape, scrim click and Cancel are identical and all non-destructive.
- **Focus.** Trapped. Initial focus on **Cancel** — on the typed variant it goes to the field instead, since the disabled button is already the guard. Focus returns to the trigger on close.
- **SR.** `role="alertdialog"`, `aria-labelledby` the title, `aria-describedby` the body.
- **Motion.** Scrim 160ms fade; dialog 180ms `scale(.96) → 1` + fade. Out 120ms fade, no scale. Reduced motion → fade only.

| Modal part | Light | Dark |
|---|---|---|
| Scrim | `rgba(36,30,23,.44)` | `rgba(10,8,5,.64)` |
| Surface / border | `#FDFAF4` on `#E2D5C0` | `#2C251B` on `#544737` |
| Shadow | `0 24px 60px rgba(36,30,23,.28)` | `0 24px 60px rgba(0,0,0,.60)` |
| Icon disc fill / ring / glyph | `#F6E2DD` / `#EBCFC5` / `#9A2E3B` | `#31201E` / `#4E2E2C` / `#E5878D` |
| Title | `#241E17` | `#F2E9DA` |
| Body | `#4C4237` | `#DCD0BA` |
| Primary fill / label | `#241E17` · `#F2E9DA` | `#EFE3CE` · `#241E17` |
| Primary disabled | `#EBE1D0` · `#B0A088` | `#3E3527` · `#7E6E58` |
| Ghost label / hover | `#4C4237` / `#F2EADC` | `#DCD0BA` / `#221C14` |
| Typed-confirm field | `#FDFAF4` on `#9B8B75` | `#2C251B` on `#6E5F4B` |
| Focus-visible | 2px `#BE3346`, 2px offset in the surface | 2px `#D4636B` |

> **In dark mode the scrim can't lift the modal — the border has to.** Scrimming the ground from `#1F1912` toward black moves the card's separation from **1.27:1 to 1.30:1** across every opacity from .64 to .86, because both sides are already near-black. Deepening the scrim is wasted effort; it stays at `.64` for the dimming, and `#544737` (line strong) carries the edge instead of the `#3E3527` a card would normally take. Light mode has the opposite situation — the scrim alone gets it to 3.03:1 and the border is trim.

**Blocked dialog** is the same shell with the destructive half removed: icon, title, body, and a single pair — Cancel plus a button that goes where the problem is. It never has a destructive action, because there is nothing to decide. Its icon disc takes the **low** tokens rather than the out ones (`#F7EEDA / #E9DAB9 / #855A0F`, dark `#2E2614 / #4B3E1E / #E2B85E`): amber is "hold on", crimson is "gone", and a blocked dialog is the first. It comes off the same status ramp as the item badges, so it needs no new colour.

### Per action

**Remove item.** Fires from the Edit sheet footer (sheet closes first) and from the expanded card's Remove. Same toast either way: *Removed **Ground Beef**.* · Undo.

> **Undo has to restore position, not just the record.** There are no timestamps, so *Recently added* sorts on insertion order. An undo that appends puts the item back in the wrong place and silently reorders the list — which is worse than not undoing, because nobody will notice.

**Delete a term.** Unused → deletes on press, toast *Deleted **Condiment**.* · Undo, restoring name, colour and position in the chip list. If that term was an active filter, deleting clears the filter and undo restores it too — which now also means its chip leaves the applied bar and comes back.

In use → blocked dialog.
- Title: **Move these 3 items first**
- Body: *Pantry holds 3 items. A location can only be deleted once nothing is stored there.*
- Footer: Cancel · **Show the 3 items** — applies that term as the only active filter and drops the section out of editing.

> **Delta from what's drawn:** the trash on a term row is **enabled in every case**. A disabled control cannot explain itself — it takes no hover on touch, screen readers skip it by default, and the reason is the one thing you want at that moment. The row also gains the item count in meta text between the field and the trash, so the outcome is predictable before you reach for it.

**Revoke an invite.** Trigger is the ghost crimson-text *Revoke* in the invite card's footer, in the Members pane.
- Title: **Revoke this invite?**
- Body: *The link stops working immediately. Anyone who hasn't accepted it yet will need a new one.*
- Footer: Cancel · **Revoke invite**
- After: the card leaves, plain toast *Invite revoked.* No undo — there is nothing to restore, only a new link to issue.

**Remove a member.** Trigger is the last row of the role menu.
- Title: **Remove Sarah Calfee?**
- Body: *They lose access to this pantry immediately. You can invite them back with a new link.*
- Footer: Cancel · **Remove member**
- After: the row leaves, plain toast *Member removed.*

**Leave household.** Lives as a ghost row with crimson text **inside the Household card**, under a hairline — contained by the block it belongs to rather than floating between two sections. Three cases.

*Others can still own it:*
- Title: **Leave Calfee Household?**
- Body: *You'll lose access to its 47 items. An owner can invite you back.*
- Footer: Cancel · **Leave household**
- After: switch to the next household in the switcher, or to first run if it was your only one.

*You're the only owner and members remain* — blocked:
- Title: **Make someone else an owner first**
- Body: *You're the only owner of Calfee Household. Promote another member, then you can leave.*
- Footer: Cancel · **Open Members** — which now pushes the Members pane rather than scrolling the Settings pane.

*You're the only member* — the row itself relabels to **Delete household**, so it never promises something softer than it does.
- Title: **Delete Calfee Household?**
- Body: *You're its only member, so leaving deletes it. 47 items, 4 locations, 3 stores and 6 types go permanently.*
- A 40px field at radius 11 — the composer's field: *Type Calfee Household to confirm.*
- Footer: Cancel · **Delete household**, disabled until the name matches exactly.
- No undo, no toast.

This is the **only** typed confirmation in the app, and it earns the exception by being the only action that destroys data belonging to more than one screen. Anywhere else it would be theatre.

### Boards
Drawn on their own canvas — five desktop, two mobile, each with its dark counterpart, 14 total:
https://claude.ai/code/artifact/90919b0d-9995-4153-b096-ee9bbb10cd40

1. Toast — actionable, plain, and a 3-high stack
2. Confirm — Revoke invite and Leave household side by side
3. Blocked — term in use and last owner side by side
4. Typed confirm — Delete household, empty field and matched field
5. Filter tab editing row with the item count and the enabled trash
6. Mobile 390 — toast above the safe area
7. Mobile 390 — confirm at `100% − 32px`

Kept separate from the 27-board app canvas because these are component states, not screens; the two mobile boards are the only ones that show them in place.

> **Remove a member is specced above but not drawn.** It reuses the Revoke shell exactly — same width, same icon disc, same footer pair — so it is a copy rather than a design, and it can join board 2 when that canvas is next re-rendered.

## Flows outside the shell
Everything before the app: the public page, sign-in, the display name, the first household, and the `?join=` landing. Drawn — canvas link under *Boards* at the end of the section. Owner and Editor only, as with destructive actions; what a Viewer sees on the invite landing stays under *Gaps*.

**The rule: the signed-out surface is two pages, not one.** `/` is a marketing page for someone who has never heard of Larder Log. Any other URL, hit while signed out, is a bounce — it shows the sign-in card, and the card's eyebrow says why. Collapsing them into one page makes the front door either a wall for visitors or a sales pitch for someone who only wanted their pantry.

### Sign-in — one button, one provider
Gravatar, and nothing else. No password field, so no sign-up form, no forgot-password, no reset, and no strength rules — four screens that never have to exist. Signing in for the first time creates the account, which is why the card says so out loud: a single-button auth page with no visible *Sign up* reads as broken otherwise.

**The card.** 440px, radius 20, card tokens, centred on the ground gradient. Text is centred — this is the one surface in the app that greets rather than asks. Order: eyebrow → app icon → wordmark → tagline → instruction → button → footnote.

| Part | Treatment |
|---|---|
| Eyebrow | `SIGN-IN REQUIRED`, section-label type (Karla 700 10.5 / 0.15em uppercase), meta |
| App icon | 56px, the Oat tile, unchanged by theme |
| Wordmark | Playfair 38px, "Log" italic 600 crimson |
| Tagline | Body 15.5 — *What's in the pantry and the freezer, who's running low, and what to buy where.* |
| Instruction | Meta 13.5 — *Sign in to open your household.* |
| Button | Full width, 48px, radius 13, ink/cream primary, Gravatar mark 20px on the left |
| Footnote | Meta 13 — *New here? Signing in creates your account.* |

**Crimson is still never a button.** The one control on the page is the ordinary primary.

### The handoff, three states
| State | Treatment |
|---|---|
| Pressed | The button takes the disabled tokens, the mark becomes a spinner, label *Opening Gravatar…* Nothing else on the card moves. |
| Returning | The card's contents are replaced: a 44px spinner disc on the sunk fill, *Signing you in…*, meta *One moment — bringing your household across.* Same card, same width, so nothing jumps. |
| Didn't come back | Amber icon disc (**low** tokens) + clock, *Sign-in didn't finish*, body *The Gravatar window closed before it came back. Nothing was changed, and nothing was shared.*, full-width *Try again*. |

> **The failure is amber, not crimson.** Same rule the blocked dialog runs on: amber is "hold on", crimson is "gone". A closed OAuth window destroyed nothing, so it does not get the out tokens. It also isn't a modal — there is nothing underneath it to go back to.

The failure card is left-aligned where the sign-in card is centred: it is a message with a body to read, and the confirm modal's icon → title → body → action order already exists for exactly that shape.

### First run — the display name
**The account carries a name; the household does not carry it for them.** Gravatar is the identity provider, but a lot of accounts arrive through the my.spacefast.com signup with no profile name on them — so the name cannot be assumed to exist. Larder Log collects its own **display name**, stored on the account.

**It is its own step, before the fork.** Someone accepting an invite never sees *Name your household*, and they are exactly the person whose name other people need to see. So the display name is asked once, immediately after first sign-in, before the path splits into create-a-household and accept-an-invite.

**The card.** 440px, left-aligned. Eyebrow `NEW ACCOUNT` → a 52px avatar beside the email and *Signed in with Gravatar* → title Playfair 600 26 *What should we call you?* → body → `DISPLAY NAME` micro-label → field → hint → *Continue*.

Body: *This is the name everyone else in your household sees — on invites, in Members, and beside anything you change. It belongs to your account, not to one household.* The second sentence is doing real work: it is the answer to "do I have to do this again for the next household".

| State | Field | Hint | Continue |
|---|---|---|---|
| Gravatar had a name | Prefilled, selected | *From your Gravatar profile. Change it if you'd rather be called something else.* | Enabled |
| It didn't | Empty, focused, **no placeholder** | *Gravatar didn't have a name for you. Pick one — it's the only thing the rest of your household will see.* | **Disabled** until something is typed |

> **Required, not skippable.** A blank display name puts an unnamed row in Members and an unsigned change in a shared list, and the only fallbacks are an email address (which is not a name, and exposes one) or a generated label nobody recognises. It is one field, once, and it is the single thing the rest of the household sees. The alternative — optional, falling back to the email local-part — is one line to change if the friction proves worse than the ambiguity.

**The avatar fallback is initials on the neutral avatar fill**, not a term colour: `#4A3E2E` with the inset ring on the drawer, sunk-on-line on a cream surface. Term colours mean *term* everywhere else, and a person is not a term — the same argument that keeps the role out of a tag, and the reason the household tile gets a colour where the account row does not. Where Gravatar has an image, the image renders instead. The initial comes from the display name, or from the email local-part before one is set.

Once set, the household name prefills from it — *Justin Tadlock* → *Justin's Household*. **Changing it later happens in the account menu**, not in a Settings section — see *Settings tab → Your account*.

### First run — name it, then land in it
Sign-in and the display name come first; there is no anonymous mode. A signed-in, named account with no household gets one screen, not a wizard.

**The card.** 440px, the same width as every other card outside the shell. Left-aligned. Eyebrow `NEW HOUSEHOLD` → title Playfair 600 26 *Name your household* → body → `HOUSEHOLD NAME AND COLOUR` micro-label → the identity row (swatch + field) → hint → *Create household* → the signed-in row.

- **Field**: the composer's field — 44px, radius 11, focused on arrival with the crimson halo. Prefilled with the display name plus *'s Household*, selected, so Enter alone finishes the screen. The swatch beside it arrives pre-picked with the first colour unused across your households — see *Household colour*. For a first household that is **slate**, the first of the sixteen.
- **Hint**, meta 12.5: *Built from your display name — change it to whatever you call the place.*
- **Signed-in row** under a hairline: avatar, name, email in meta, ghost *Sign out*. It answers "which account am I attaching this to" before the household exists rather than after.

**One field, one button, nothing else.** An earlier draft previewed the seeded terms here in a recessed panel — fifteen chips explaining what a household is before you had made one. It is gone. The screen asks for a name; the terms explain themselves in the drawer a second later, where they are also editable. The colour swatch that now sits in the field row is not a counter-example: it is part of the field, not a second question.

### The empty household
Creating drops straight into the app, seeds already in the drawer, no items.

**What gets seeded:**

| Group | Seeded |
|---|---|
| Locations | Pantry olive · Refrigerator slate · Freezer teal |
| Stores | Grocery denim · Warehouse mustard · Market clay |
| Types | Produce olive · Dairy slate · Meat brick · Baked Goods cocoa · Grains ochre · Canned Goods denim · Condiments plum · Oils & Vinegars mustard · Spices mulberry · Baking terracotta · Breakfast indigo · Snacks clay · Beverages teal · Frozen Meals aqua |

Locations and stores are generic on purpose — the sample data's Meat Freezer, Calfee Cattle and Publix are one household's vocabulary, not a default.

> **Types are no longer the *Term colours* assignments, and no longer aim to be generic** ([D50](../../../.docs/decisions.md#d50-the-seeded-types-are-a-supermarket-and-the-other-two-taxonomies-are-not)). The nine that table names had no home for bread, canned goods, cereal, cooking oil or a frozen pizza. A kind of food is the same in every kitchen, so these are seeded for **coverage** rather than as a vocabulary to make your own: fourteen, so the first twenty items need no new type. Two tokens — fern and stone — are left unspent so a household's own first two types still arrive in a colour nothing else is wearing. The *Term colours* table and the sample dataset below are unchanged: they are the boards' data, not the seed.

- **Empty state**, centred in the content column: Playfair **italic 500 27px** *Nothing in the larder yet.* + meta *Add your first item. Your locations, stores and types are already set up in Filters — rename or recolour them whenever you like.* No button.
- **At zero items the sort trigger is hidden and the empty state carries no primary.** Sorting nothing is a control that can only disappoint. **Row 1 does not change** — search and *Add item* are permanent and the same in every mode — so the empty state says what to do and lets row 1's primary be the button it points at. Two *Add item* buttons on one screen is one too many, and the one that goes is the one that isn't always there. Row 2 is down to `Showing 0 of 0`. The applied-filter row cannot appear here either — with no items there is nothing to have filtered.

> **This bullet used to say the top bar carried no *Add item* at zero, which contradicted row 1 being the same in every mode.** Both halves came out of the 27 Aug fork — one branch described a top bar it had imagined, the other recorded the real one. The real one wins. The duplicate primary was always the actual problem, and it is solved in the direction of the build rather than against it.

### Invite accept — the `?join=` landing
Four cases, all on the 440px card, all left-aligned. The header is shared: eyebrow `INVITATION` → 44px household tile (the initial on the household's term colour, exactly as the collapsed rail draws it) → *Join Calfee Household* → the role sentence.

The role is a **bold word in the sentence**, not a pill. A role is not a term, and the tag component means "term" everywhere else in the app.

| Case | Body | Footer |
|---|---|---|
| Valid, signed out | Role sentence + *This invite expires 9 September.* | *Sign in with Gravatar to join* |
| Valid, signed in | Same, plus the signed-in row | Ghost *Not now* · **Join household**, right-aligned pair |
| Expired or revoked | Amber disc + clock, *This invite has expired*, *Invites last 14 days. Ask Sarah Calfee for a new link — the old one won't start working again.* | Signed in: *Open Larder Log*. Signed out: *Sign in with Gravatar* |
| Already a member | **Stocked** disc + check, *You're already in Calfee Household*, *This invite is for a household you're already a member of, so there's nothing to accept.* | *Open Calfee Household* |

> **Already-a-member is green, not amber.** It is the third rung of the same status ramp the item badges use — nothing is wrong, nothing is pending, the thing you wanted is already true. Amber would ask someone to fix a problem they don't have.

> **This is the one place a date survives.** The Members pane now spells expiry as a countdown — *Expires in 12 days* — and this card still says *9 September*. Deliberate for now, and listed under *Open questions*: inside the app the countdown is plainly better, but on a link someone opens cold a date may be the thing they can act on.

Revoked shares the expired screen with one line changed (*This invite is no longer valid.*). From outside the household, a revoked link and an expired one are the same event, and telling them apart would tell a stranger something about the household.

Signed out on a valid invite, **signing in is the accept** — the join applies on return rather than showing the same card a second time. The display-name step comes first if the account is new, since the household is about to see that name.

### Mobile
Same cards at `100% − 32px`, centred — the confirm modal's mobile width. Buttons go to 48–50px and every affordance inside a card clears 44px, *Sign out* included: at 13.5px text it was an 18px target.

No layout adaptations beyond that. Every card outside the shell is now short enough to sit inside 390 × 844 without scrolling, which is the whole reason to keep these screens down to one decision each.

### Deltas and additions
- **Card borders take `line strong` in dark, `line` in light.** Inherited from the confirm modal's finding: at `#2C251B` on `#1F1912` a card separates at 1.27:1 and the shadow does nothing. Every card outside the shell follows the modal, not the item card.
- **A dark focus halo for the composer field** — `rgba(212,99,107,.18)`, the light halo's alpha in the dark crimson. The token table gave light only; it is now in the composer table above.
- **The wordmark scales to 38px** on the sign-in card and 32px on mobile — the first time it leaves 27px.
- **A marketing headline scale**, Playfair 600 at 56px desktop / 34px mobile, above anything the type ramp currently carries. Public page only.
- **The household tile is drawn from the household's colour**, not from a constant — Playfair 700 at 42% of the side, radius 30%, per *Household colour*. The first-run boards use slate; the invite and Settings boards use Calfee's terracotta.
- The **Gravatar mark is a placeholder** on every board: a ring with an inner dot. Swap the official asset in before build.

## The marketing page
Public, at `/`. One offer, one call to action, repeated three times — nav, hero, close.

**Anatomy.** Nav (icon + wordmark left, *Sign in with Gravatar* right) → hero → three benefit cards → the *Three ways to slice it* band → closing CTA → footer. Content column 1120 inside 160px margins at 1440; 22px gutters at 390. Same ground gradient, same cards, same tokens as the app — this is an extension of the system, not a separate brand.

- **Hero.** Headline *Know what's in the freezer before you get to the store.* over the sub-paragraph, CTA at 268 × 52, then *Signing in creates your account. There's no separate sign-up.* On the right, a real mock: three item cards from the sample data, one stocked, one low, one out. The status ramp doing its job **is** the product demo, so the hero image is the app rather than a picture of a pantry.
- **Benefits**, three cards, each answering a doubt rather than naming a feature: *A count, not a hunch.* / *The whole household, one list.* / *Nothing to write down before you go.*
- **The band** explains the data model — Location, Store, Type — one column each with a live chip row under it, and *Sixteen colours, yours to name and assign* on a hairline below. Someone deciding whether to sign up needs to understand the model, and three chip rows do it faster than a paragraph.
- **Footer.** Icon, wordmark, `© 2026 Larder Log`. Nothing else — no legal links, no nav, no second column. A footer on a one-page site whose only action is at the top of the page has no work to do.

> **The third benefit used to sell the shopping list as a store filter — the design *Shopping list* replaced.** It read *The shopping list is a filter, not a chore*, and its body told visitors to "pick a store". It now describes the mode: everything under its number, already grouped by the shop you buy it at, ticked off as you go. The band's Store column made the same promise and was corrected with it. This was the one place the 27 Aug fork contradicted itself in **user-facing copy** rather than in spec, which is the worst place for it — a spec disagreement costs a conversation, a marketing page that describes a feature you don't have costs a signup.

**No proof section.** No testimonials, no logos, no counts. There is nothing real to put there yet, and invented quotes on a public page are worse than a shorter page. The slot sits between the benefits and the band for whenever there is something true to fill it with.

**The store in the hero mock is "Grocery", not a real chain.** Publix and Costco are fine in a spec; on a public page a named chain inside a screenshot reads as a partnership.

At 390 the page stacks, the hero mock uses the **mobile item-card ramp** (names 18.5, quantities 28) and 44px steppers, and the band's three columns become three stacked blocks.

### Boards
Own canvas — eleven boards, each with its dark counterpart, 22 total, on **Light** and **Dark** pages:
https://claude.ai/code/artifact/5c742401-cc59-44bc-9f49-2c9c1af8ee93

1. Marketing · desktop 1440
2. Marketing · 390
3. Sign-in required
4. Gravatar handoff — pressed, returning, didn't come back
5. First run · display name — Gravatar had a name, and it didn't
6. First run · name it
7. First run · the seeded, empty app
8. Invite · valid — signed out and signed in
9. Invite · expired and already a member
10. ~~Settings · Account — rest and editing~~ **superseded 27 Aug**
11. Flows · 390 — sign-in, display name, name it, invite

> **Board 10 draws a section that no longer exists.** Account is not a block in the Settings pane any more; the display-name flow it shows is intact but happens inside the account menu. See *Settings tab → Your account*, and the board on that section's own canvas.

> **Boards 6 and 7 were re-rendered on 27 Aug to catch up with the merge.** Board 6 now carries the identity row — `HOUSEHOLD NAME AND COLOUR`, the 26px swatch pre-picked at slate — instead of a bare name field. Board 7's top bar lost the title it never should have had: it is search + *Add item* over `Showing 0 of 0`, and the empty state no longer carries a second primary. The household tile on both is **slate**, not the hard-coded terracotta, because terracotta is Calfee's colour and these boards are a household being made.

## Sort menu
The trigger names the active sort — `⇅ Sort  Recently added ⌄` — so the menu is only opened to change it. Ghost at rest; `#FDFAF4` + `#E2D5C0` on hover; `#F2EADC` + `#CFBEA3` when open; crimson focus ring.

Menu: 248px wide, radius 14, `#FDFAF4` on `#E2D5C0`, shadow `0 14px 30px rgba(36,30,23,.20)`, 6px padding. Rows 36px desktop / 44px mobile, radius 9, 14px text.

Options in order, split into three groups by hairlines (`#EEE4D2`) rather than group headings:

1. **Recently added** — the default
2. Needs restocking — out, then low, then stocked
3. Name · A to Z
4. Name · Z to A
5. Quantity · fewest first
6. Quantity · most first

Dividers after 2 and after 4.

| Row state | Treatment |
|---|---|
| Selected | 600 weight, ink `#241E17`, crimson check on the right, **no fill** |
| Hover | `#F2EADC` |
| Focus-visible | 2px `#BE3346` ring, 2px offset in the surface |

Selection is a check rather than a fill so hover still reads on the selected row — with a fill doing both jobs, a hovered row looks selected and the selected row can't show hover.

Mobile keeps the same anchored popover (six rows don't earn a sheet) at 44px rows, with the trigger label shortened to "Recent".

**Deltas from the shipped markup:** 248px not 176px (`w-44` was clipping *Quantity · fewest first*), rows 14px not 12px, radius 14 not 6, check instead of `#F2EADC` fill, and the trigger names the sort.

**The sort trigger is hidden at zero items** — see *Flows outside the shell*. It is also hidden in list mode — see *Shopping list*.

> **The check-not-fill rule now has a second user.** The role menu in the Members pane takes the same construction on the drawer's surface — 6px padding, radius 9 rows, a crimson check on the current value — for the same reason: with a fill doing both jobs, a hovered row looks selected. See *Settings tab → Changing a role*.

> **The trigger's own hover fill is `#F2EADC` on the ground, which is the case *Applied filters* found to be invisible out there.** It is the same sunk-is-the-ground problem, in a control that already shipped. Left as observed rather than quietly corrected; it belongs with the top-bar edge question under *Open questions*.

## Shopping list

**The rule: the shopping list is a *view* of the items, not a thing you keep.** It is every item currently low or out, grouped by where you'd buy it. Nothing is authored into it and nothing is authored out of it — an item arrives when its count drops under its low-at and leaves when someone puts the count back up. That is why there is no shopping-list tab, no "add to list", and no way for the list and the pantry to disagree.

It replaces the content column rather than covering it, at the **full width of the column minus the 32px gutters** — one card per store, laid out in a grid.

> **Why not the modal that was specced here.** Three reasons, all of them already rules in this document. A modal is a *question* — centred, focus-trapped, dismissed to continue — and the confirm spec says so out loud; a shopping list is a reference you read while doing something else. A modal had no interaction at all, so there was nothing to check off, which is the one thing a shopping list is for. And it was a dead end: no way to change store, fix a wrong count, or reach the item without closing it first. The modal was never designed, only assumed.

> **And why not the single 720px document that replaced it.** One card with headers ruled across it made the stores too easy to miss — a hairline and a small label are not enough separation when you are scanning four shops at once — and it left most of a 1440 screen empty. Giving each store its own card fixes both at once: the store becomes a *bounded object* rather than a label, and the width finally has something to do with itself.

### Entry and exit — one control, two labels

The control sits on **row 2, immediately after the three status pills**, and it has two states whose labels say which:

| Mode | Label | Treatment |
|---|---|---|
| Grid | `Shopping list` + an ink count pill | Surface fill, `line strong` border, ink label — secondary |
| List | `‹ Back to items` | The same treatment |

**Placement is doing the work that colour was doing.** The eye crosses `9 in stock · 6 running low · 5 out` and lands on the thing to do about it. That sequence is the on-ramp, and it only exists because row 2 already summarises status.

> **An earlier draft made this amber, wearing the low tokens, and that was wrong for a reason worth keeping.** It was designed against a top bar that had a title and no status pills — an invention. Against the real one it lands a gap away from `6 running low`, which is already amber and means something else. Two amber controls side by side saying different things is worse than neither. It is secondary now, and **Add item** keeps the only ink fill on screen.

> The finding underneath it still stands and will bite again: **the status tints were designed to sit on a card.** On the ground the low tint reads **1.03:1** and the low border **1.16:1**. Anything that wants to be amber out there needs the low *text* colour as its border — 5.08 light, 9.33 dark — not the border token.

**It is hidden when nothing is low or out**, the same argument the sort trigger is hidden at zero items: a control that can only disappoint.

**Its count is the unfiltered total, always.** Scope to a store with nothing to buy and the top bar reads `0 to buy at Costco` while the trigger still holds 11. The trigger answers *is there shopping to do*, which is a fact about the household; the top bar answers *what is on this screen*.

> **The store banner is gone.** It existed to ring the modal's doorbell. With a permanent trigger that carries its own count, a second prompt above the grid pushes the grid down every time you filter a store and says what the top bar already said.

**Row 1 does not change at all** — search and *Add item* stay exactly where they were, so the mode switch reads as the content changing rather than the app changing. *Add item* earns its place there: noticing at the shelf that you need something untracked is the most likely reason you'd add one, and an item added with 0 on hand lands on the list you're standing in.

**Row 2 empties out and re-fills.** The three status pills go — you are already filtered to low and out, so `9 in stock` has nothing to say. The sort trigger goes, because the list has one fixed order and offering to change it would be a lie. What is left is `‹ Back to items` on the left and `11 to buy · 4 stores · 3 in the cart` pushed right, in the slot `Showing X of Y` occupies in the grid.

**Row 3 stays.** The list obeys the same filters, so the applied bar and its clear come with you into list mode unchanged — see *The list obeys the filters*, and *Applied filters* for the component.

**Search persists and narrows the cards.** It is the one row-1 element that could have gone either way; keeping it costs nothing, and a household with forty items low needs it more than the grid does.

**Escape returns to the grid** when focus is inside the list and no sheet or dialog is open. The mode is not an overlay, so nothing else claims the key.

### The list obeys the filters

It is a view of the same filtered set, narrowed to low and out. A Type filter of *Produce* gives you the produce run; a Store filter collapses it to that one card. When any filter is hiding something, the count says so — `6 of 11 to buy` — rather than quietly showing you a short list.

The scoped empty state's ghost *Clear the store filter* and *Clear all filters* now have a visible partner in row 3 — the same actions, one of them a chip away.

### The grid

`repeat(auto-fill, minmax(min(460px, 100%), 1fr))`, 24px gap, `align-items: start` so each card keeps its natural height and the bottoms run ragged. At 1440 with the drawer docked that is **two columns**; it drops to one below about 940 and would take a third past ~1470 of column width. **`auto-fill`, not `auto-fit`** — with one store card left after a filter, auto-fit would stretch it across the whole screen; auto-fill leaves the empty track and the card stays one column wide.

> **460 is the width at which the row stops working, measured rather than chosen.** Below it *Shredded Cheese* and its badge collide with `have 0 · low at 2`. Drawn at 340 in an early anatomy board and the two ran straight through each other. Below 460 the row takes its stacked form.

Cards are ordered A–Z with `NO STORE` last, reading left to right.

### The store card

Card tokens, radius 20, `line` border in light and **`line strong` in dark** — the confirm modal's rule. The fill separates from the dark ground at 1.27:1, so the border is the edge.

**The header is the tag component, stretched to the card's width.** Term tint fill, term border along the bottom, an 8px term-base dot, the store name in term text at Karla 700 12px / 0.12em uppercase, the count on the right. This is the one place a term's colour has ever filled a whole band, and it earns it: the store is the organising fact of the entire screen, and the doc already sanctions tags in the shopping list.

Every pairing clears 4.5:1 on its own tint — tightest are Olive at 4.72 light and Clay at 4.65 dark.

`NO STORE` takes the **sunk** fill with a `line` bottom border and a meta label, and has no dot — no term means no colour. It reads quieter by having no hue at all rather than by being dimmer. Opening one of its rows is how you give it a store.

**Order inside a card:** out before low, then A–Z. That is the existing *Needs restocking* sort, reused rather than reinvented.

### The row

56px desktop, hairline between, no border above the first (the header's own border does that job):

| Slot | Content |
|---|---|
| Left, 56px | The checkbox — 22px, radius 7, its own tap target |
| Name | Playfair 600 17px, ink |
| Status | `OUT` / `LOW` badge — Karla 700 9.5 / 0.1em uppercase in the status tint, border and text |
| Right | `have 0 · low at 4`, meta 13px, right-aligned |

**The row is not a click target.** The left 56px checks; the name and meta open the Edit sheet. Two controls, both over 44px, and no way to open a sheet when you meant to tick something — which on a phone in a shop is the whole game.

**Below 460 the row stacks** — name and badge above, counts below, height 64, checkbox column 52. See the grid note for why.

**The checkbox is the chip rule at 22px.** Off is surface on a 2px **meta** border; on is the inversion every selected control in this app uses — ink fill and cream check, cream fill and ink check in dark. Nothing new.

> **It takes `meta`, not the composer field's border, and that is a contrast finding rather than a preference.** `#6E5F4B` is the strongest border in the dark palette and the toast leans on it — but the toast sits on the *ground*. On the card surface it falls to **2.45:1**, under the 3:1 a control outline needs, and an unchecked box you cannot see is the worst possible failure in this component. Meta gets it to 5.08 dark and 5.85 light, and holds 5.10 and 5.67 through row hover.

**Checked rows do not move.** Strike the name, hold the badge at 55%, fill the box. Reordering a list under someone's thumb is the same failure the undo rule already names — an item that silently changes place is worse than one that doesn't respond.

> **A checked row drops to `meta`, not to `faint`.** Faint reads at 3.18:1 on the surface and **2.77:1** once the row is hovered, and "did I already get the butter?" is a question you ask *about the checked rows*. The filled box and the strike have already said it is done; taking the legibility as well is punishment, not hierarchy.

### The trip bar — where the trip lives

A full-width bar **below** the grid, 24px down: sunk fill, `line` border, radius **15** (controls radius, not card radius — it is a bar, the same argument the toast makes). 52px desktop, 56px mobile. Left: ghost **`Hide 3 checked`** / `Show 3 checked`. Right: reserved.

It appears only once something is checked. **A list with a checked row in it always has this bar** — if a board shows one without the other, the board is wrong.

> **It used to be a footer inside the card, and the split into store cards is what moved it.** *Hide checked* is a fact about the trip, not about Costco. With several cards there is no one card for it to sit in, and putting a copy in each would be five controls doing one job.

When everything is checked the bar becomes the completion note and grows to **70px** — the one variant carrying a disc and two lines rather than a single control. A **stocked**-token disc and check, *Everything's checked off.*, meta *Update your counts when you unpack.*, and a ghost *Back to items*. Green because nothing is wrong and nothing is pending — the third rung of the same ramp the item badges use, the same argument as *already a member*.

> **The right half of the bar is deliberately empty, and it is reserved for restocking.** Checking a row means "it's in the cart", and the honest end of that sentence is setting the count when you unpack — which is a write to the item, which makes it shared, which is a different design. The bar exists now so that flow has somewhere to land later instead of arriving as a new surface.

### Checks are local, and they expire

Check state lives in `localStorage` against the household id, along with the fact that you were in list mode. **Reloading in a shop returns you to the list with your ticks intact** — the single most likely thing to go wrong on a phone with two bars of signal.

Three rules clear a check, and none of them need a button:

1. The item leaves the list — anyone restocks it, and the check goes with the row.
2. Twenty-four hours pass. A shopping trip does not last a day, and a week-old tick is a lie.
3. The household is switched. Checks belong to a list, not to you.

They are **not shared**. Two people at two different stores would collide on the same rows, and a tick that means "in *my* cart" cannot be read by someone else without saying whose. That is a real feature and it belongs with restocking, not before it.

### Empty and zero

| Case | Screen |
|---|---|
| Nothing low or out | Unreachable — the trigger is hidden |
| A store filter with nothing to buy | Stocked disc + check, *Nothing to buy at Costco.*, meta *Other stores have 7 items to buy.*, ghost *Clear the store filter* |
| Filters hide everything to buy | Stocked disc, *Nothing to buy in this filter.*, ghost *Clear all filters* |

One card, max-width 520, sitting in the grid's first track — an empty state stretched across 1036px would be absurd. Green in every case, never amber: amber is "hold on", and nothing here is being asked of anyone.

### Mobile

The grid collapses to one column at 16px gutters, cards 16px apart, rows stacked at 64. **Every control clears 44px**: the trip bar's ghost goes 34 → 44, and the top bar's *Add* goes 38 → 46. The rows and the checkbox column already cleared it; those did not, and they are the controls you press with one hand holding a basket.

**The trigger drops its label and keeps the glyph and the count** — a shopping-cart SVG at 20px in ink, then the same inverted ink count pill, in the same surface-on-`line strong` shell. 74px instead of 165. It is the only element on that row with a fixed cost, and *Shopping list* is the most expendable word on the screen when the pill already says 11 and the icon already says what kind of 11.

**The top bar takes three rows in grid mode**, because row 2's desktop contents cannot share 358px: search + *Add* (label dropped, a 52px square), then the status pills, then the cart trigger with `20 of 20` and a shortened `Sort · Recent` pushed right. In list mode it is back to two — search + *Add*, then `‹ Back to items` with the count — because the pills and the sort are both gone. **`‹ Back to items` keeps its words on mobile**: it is the exit, and an unlabelled back arrow on a screen with no title is a guess.

> **With a term filter applied it is four rows in grid mode, and three in list.** The applied bar lands last either way — about 236px of chrome before the first card in the grid. It only appears while you are filtering, which is the moment you care; the cost is recorded under *Open questions* rather than designed around.

> **The status pills tighten rather than truncate.** At desktop padding the three of them measure 368px against 358 available and wrap onto two lines each, which looks broken rather than tight. Padding 16 → 13, gap 9 → 7, label 14 → 13.5 brings them to 332 with room. Shortening the copy was the other option and it is worse — *running low* is the phrase, and *low* is a different, vaguer claim.

### Motion

Grid → list is a 160ms crossfade with the cards rising 8px, ease-out, staggered 20ms apart. Checking is 120ms on the box and 140ms on the row's treatment. Hiding checked rows collapses in 180ms and the grid reflows in 160ms. Under `prefers-reduced-motion` all of it becomes a fade and the row treatment applies instantly.

### Keyboard and screen readers

Each store card is a `<section>` labelled by its header (`<h3>`), holding a `<ul>` of `<li>`. The checkbox is a real checkbox with `aria-label` *"Chicken Thighs — in the cart"* and its own `aria-checked`. Tab order runs card by card, checkbox → name down each; the trip bar comes last. Entering the mode announces `Shopping list, 11 items to buy across 4 stores` through the existing polite live region. Hiding checked rows announces the new count.

### Tokens

| Part | Light | Dark |
|---|---|---|
| Card fill / border | `#FDFAF4` on `#E2D5C0` | `#2C251B` on `#544737` |
| Store header fill / border / label | term `L tint` / `L border` / `L text` | term `D tint` / `D border` / `D text` |
| `NO STORE` header | `#F2EADC` on `#E2D5C0`, label `#6F6049` | `#221C14` on `#3E3527`, label `#A5937A` |
| Row hairline | `#EEE4D2` | `#3E3527` |
| Row hover | `#F2EADC` | `#221C14` |
| Name | `#241E17` | `#F2E9DA` |
| Meta counts | `#6F6049` | `#A5937A` |
| Checked name | `#6F6049`, struck | `#A5937A`, struck |
| Checked counts | `#6F6049`, not struck | `#A5937A`, not struck |
| Checkbox off | `#FDFAF4` on 2px `#6F6049` | `#2C251B` on 2px `#A5937A` |
| Checkbox on | `#241E17` fill, `#F2E9DA` check | `#EFE3CE` fill, `#241E17` check |
| Trigger, grid mode | `#F7EEDA` on 1.5px `#855A0F`, label `#855A0F` | `#2E2614` on 1.5px `#E2B85E`, label `#E2B85E` |
| Trigger count pill | `#855A0F` fill, `#F7EEDA` text | `#E2B85E` fill, `#2E2614` text |
| Trigger, list mode | `#FDFAF4` on `#CFBEA3`, `#241E17` | `#2C251B` on `#544737`, `#F2E9DA` |
| Trigger, mobile grid | cart glyph `#241E17`, same shell | cart glyph `#F2E9DA`, same shell |
| Trip bar fill / border | `#F2EADC` on `#E2D5C0` | `#221C14` on `#3E3527` |
| Ghost label / hover | `#4C4237` / `#F2EADC` | `#DCD0BA` / `#221C14` |
| Focus-visible | 2px `#BE3346`, 2px offset in the surface | 2px `#D4636B` |

Status badges take the out and low tokens unchanged; the completion disc and the empty states take the stocked tokens unchanged. **No new colours.**

> **A selected chip inside the drawer is cream-filled in both themes, not ink.** Drawn ink-on-dark first, per the chip table, and it vanished — the active *Costco* chip read as bare text. The chip table is written for chips on a light surface; the drawer is dark in both themes, so its selected chip takes the drawer's primary treatment exactly as the *Done* / *Add* pill and the toast's *Undo* already do. This settles half of the standing open question about drawer chips; the off-state half is still open. **The invite composer's role chips follow it** — see *Settings tab → Making an invite*.

> **The light row hairline is the sort menu's divider, not `line`.** At `#E2D5C0` a rule every 56px stripes the card into a ladder — the border is doing edge work and cannot also do interior work. Dark has the opposite problem and keeps `#3E3527`: anything softer disappears at that fill.

### Boards

Own canvas — eight boards, each with its dark counterpart, 16 total:

https://claude.ai/code/artifact/888ae656-3714-455c-ba43-b172e5fda94a

1. **Entry** — desktop 1440 in grid mode, drawn against the real top bar, so the trigger is shown where you would actually find it
2. Shopping list — desktop 1440, full width, two columns, part-checked, trip bar
3. Scoped to Costco — one card in its own track
4. Trip bar, all checked, beside the scoped empty state
5. Row, checkbox, trigger and card-header anatomy
6. **Mobile 390 — grid mode**, so the cart trigger is shown where it is found
7. Mobile 390 — the list, one column
8. Mobile 390 — hide-checked with the trip bar, and the empty state

## Item card
Name (no icons beside it) · status badge or dot + expand chevron · term **tags** in their own colours (see Chips and tags — cards carry tags, never chips) · big numeral + "low at N" + stepper. Expands in place to notes + Edit / Remove.

## Sample dataset

Twenty items. Insertion order is the list order, so **Recently added** runs bottom-up from here.

| # | Item | On hand | Low at | Location | Store | Type | Status |
|---|---|---|---|---|---|---|---|
| 1 | Ground Beef | 75 | 15 | Meat Freezer | Calfee Cattle | Protein | — |
| 2 | Ribeye | 12 | 6 | Meat Freezer | Calfee Cattle | Protein | — |
| 3 | Chicken Thighs | 4 | 6 | Upright Freezer | Aldi | Protein | **LOW** |
| 4 | Butter | 2 | 4 | Upright Freezer | Costco | Dairy | **LOW** |
| 5 | Black Beans | 0 | 4 | Pantry | Publix | Protein | **OUT** |
| 6 | Jasmine Rice | 3 | 2 | Pantry | Costco | Grain | — |
| 7 | Frozen Peaches | 8 | 3 | Chest Freezer | — | Produce | — |
| 8 | Marinara | 6 | 3 | Pantry | — | Condiment | — |
| 9 | Olive Oil | 1 | 2 | Pantry | Costco | Condiment | **LOW** |
| 10 | Bacon | 0 | 2 | Upright Freezer | Costco | Protein | **OUT** |
| 11 | Chicken Breast | 14 | 8 | Upright Freezer | Costco | Protein | — |
| 12 | Coffee | 1 | 2 | Pantry | Publix | Beverage | **LOW** |
| 13 | Tortillas | 0 | 2 | Pantry | Publix | Grain | **OUT** |
| 14 | Peanut Butter | 3 | 2 | Pantry | Publix | Condiment | — |
| 15 | Frozen Corn | 2 | 4 | Chest Freezer | Aldi | Produce | **LOW** |
| 16 | Pasta | 5 | 3 | Pantry | Aldi | Grain | — |
| 17 | Ground Chuck | 8 | 10 | Meat Freezer | Calfee Cattle | Protein | **LOW** |
| 18 | Shredded Cheese | 0 | 2 | Upright Freezer | Costco | Dairy | **OUT** |
| 19 | Baking Soda | 0 | 1 | Pantry | — | Baking | **OUT** |
| 20 | Cinnamon | 4 | 1 | Pantry | — | Spice | — |

**Totals 9 stocked / 6 low / 5 out.** Default sort: recently added.

**The shopping list it produces** — 11 to buy across five groups, which is the point of the extension:

| Group | To buy |
|---|---|
| Aldi | Chicken Thighs · Frozen Corn |
| Calfee Cattle | Ground Chuck |
| Costco | Bacon · Shredded Cheese · Butter · Olive Oil |
| Publix | Black Beans · Tortillas · Coffee |
| `NO STORE` | Baking Soda |

**Filter sets used on the applied-filter boards**, so the counts can be checked: `Pantry + Grain + Condiment` gives 6 of 20; `Pantry + Upright Freezer + Publix + Costco + Protein + Dairy` gives 5 of 20; the thirteen-chip board gives 15 of 20. Filtering is **OR inside a group, AND across groups**.

> **Why it grew from eight.** Every store in the old set had at most one low or out item, so the shopping list was five groups of one row and there was nothing to judge — no grouping to test, no scroll, no reason to hide checked rows, and the one flow that most needed sample data was the one the data couldn't exercise. The extension also gets a store with two *out* and two *low* (Costco) so within-group ordering is visible, and one storeless item so `NO STORE` is drawn rather than described.

> **Knock-on:** items 9–20 are appended, and *Recently added* is newest-first, so they land at the **top** of the default grid. The app canvas's 27 boards were drawn against the original eight and would need a re-render to match. Nothing about their layout changes — only which rows appear — so this is a redraw, not a redesign. The marketing page's hero mock is unaffected: it shows items 1, 3 and 5, whose numbers did not change.

> **The Settings boards use a different household on purpose.** *Granny's* in brick, with three invented members, because the settled Settings work needed a members list and an invite that the Calfee sample never carried. Nothing else on that canvas depends on the dataset.

## App icon
**Oat** — ground `#E2D5C0`, L in ink `#241E17`, **Playfair Display roman 800 at 66% cap height**. 11.4:1.

Replaces the original crimson italic on the drawer gradient, which was a 3.4:1 pairing carried by the thinnest strokes in a Didone: below about 32px the entry stroke and the serif brackets went sub-pixel and the tile read as a dark square with a pink smudge. Three changes fixed it — dark-on-light instead of light-on-dark, roman instead of italic, and 66% cap instead of 58%.

The L is a converted outline, not `<text>` — icons render without webfont access, so a text element would silently fall back to Georgia.

**The 16px is a separate drawing.** Playfair's arm is the thinnest stroke in the letter; below ~20px it antialiases to grey at any weight. `favicon-16.png` is the same silhouette snapped to whole pixels — 3px stem, 2px arm, 1px top serif, a 2 × 2 terminal flare. The real outline takes over from 20px up and the handover is invisible.

**Do not link an SVG favicon.** Browsers that accept one prefer it at every size including 16px, which is exactly the case the hand-cut version exists for. Link `favicon.ico` (it carries 16 / 32 / 48) and keep the SVGs for the app-icon sizes.

| File | Use |
|---|---|
| `favicon.ico` | tab icon — hand-cut 16 plus rendered 32 and 48 |
| `favicon-16.png` / `favicon-16.svg` | the hand-cut 16, and its source |
| `favicon-32.png`, `favicon-48.png` | rendered from the outline |
| `apple-touch-icon.png` | 180, full bleed — iOS applies its own rounding |
| `icon-192.png`, `icon-512.png` | PWA, rounded at 22% |
| `icon-maskable-512.png` | full bleed, cap 44% so the glyph sits inside the 80% safe zone |
| `larder-log-icon.svg` | 512 master, rounded |
| `larder-log-icon-maskable.svg` | 512 full bleed |

`theme-color` is `#E2D5C0`, manifest `background_color` `#F3EADC`. The icon does not vary by theme.

## Gaps — not yet designed

### Changes existing screens (decide before building more)
- **Viewer role.** Invites can issue Viewer, but no read-only variant exists. Steppers, Add item, the term pencils, the `+ …` chips, Edit/Remove and the whole Invites block all have to disappear or disable. This is a modifier on every screen, not a new one — cheapest to settle now. Parked for the current test round, which is Owner / Editor only. The invite landing's role sentence is written for Editor; the Viewer wording ("you'll be able to see everything, and nothing you do changes it") comes with that decision. **Viewer is now issuable from a drawn control** — the invite composer offers it as a chip and the role menu as a row, and the composer's hint line already carries a short version of that wording — so the gap is narrower than it was, and more visible. **The shopping list adds two more:** a Viewer gets no checkboxes and no *Add item*, which leaves the list a pure read surface — worth confirming it is still worth reaching. **The applied bar survives the cut untouched** — filtering is reading, so a Viewer keeps every chip and the clear. **Settings** goes to the household identity without its pencil, a Members pane with no role triggers and no Invites, Preferences, and the account row.
- **Restock — the flow the shopping-list footer reserves space for.** Checking a row means "it's in the cart"; the honest end of that sentence is setting the count when you unpack. That is a write to the item, so check state goes from local to shared, and the whole *checks expire* section is replaced by a trip that ends. The right half of the list footer is empty and waiting for it. Until it exists, coming home from the shop means stepping every item by hand — the actual chore the app leaves on the table.

### States an SPA hits constantly
- Loading / skeleton on first paint; optimistic feedback on a stepper tap.
- Failure: save failed, offline, and the concurrent-edit case — two household members changing one item, including Undo pressed on a removal someone else has since acted on. **A filter on a term another member has just deleted belongs here too** — the chip is in the bar and the term is gone. **So does a role menu opened on a member another owner is removing at the same moment.**
- Which non-destructive events earn a **plain toast**. The component is specced under *Destructive actions*; the trigger list (saved, copied, invite sent, term added) is not settled, and a toast on every save would be noise. Four are settled: filter changes get none, the display-name save gets none, creating an invite gets none, and changing a role gets none — in all four the thing you did is visible on the screen you are on.
- **Session expiry.** What happens when the token dies with the app open — the sign-in card exists, but nothing says whether you get bounced to it, get it as a modal over your work, or keep reading a stale list until you touch something.

### The document has drifted from the build
Search **is** built — it is row 1 of the top bar — and this document simply never recorded it. It is written down now under *The top bar*, from a screenshot rather than from the canvas, so treat the numbers there as observed and not as decided. Still open on it: the focus state, what it matches (name only, or tags too), whether it is debounced, the no-results screen, and whether it reaches the term lists in the drawer. **`Clear filters` deliberately does not touch it** — see *Applied filters*.

Four more components are in the build and were never in this document, found the same way. They are listed rather than specced, because one screenshot is not a spec:

- **Filter chips carry counts** — `Pantry 10`, `Snack 0` — including zeroes. The applied chips do **not**: out there the count would be the count before this filter, or after it, and both are wrong.
- **A leading `All items 20` chip** heads the Location group, selected, acting as that group's clear. How it interacts with `Clear filters` is undecided — clearing from row 3 presumably re-selects it. *Structure* now specs its behaviour (it lights when the group is empty), but **the front-door canvas's drawer boards do not draw it** — they were rendered before that line existed, so a first-run drawer shows three location chips and no `All items 0` ahead of them.
- **The drawer has a collapse button** beside the wordmark, which is how the rail is reached; the rail spec describes the return trip but not the outbound one.
- **The Filter and Settings tabs carry icons**, and the item card's stepper is asymmetric — minus on the sunk fill, plus on the ink primary.

**The Settings pane was a fifth**, and it is the reason that section was redesigned rather than corrected: the build had an Account block saying *Not signed in* above a *Sign out* button, a raw account id where a display name goes, and a role strip floating under whichever member you last tapped. What is drawn now is a design, not a record — treat *Settings tab* as decided and the build as behind it.

The lesson is the one worth writing down: **anything not drawn on a canvas drifts out of this document silently.** Two turns of shopping-list work were specced against a top bar with a title that does not exist — and, on 27 Aug, three branches of this file each dropped the others' sections. See the merge note at the top. The reconciliation passes added a third lesson: **a union merge leaves the branches contradicting each other**, and the contradictions hide in the places two branches happened to describe the same screen — the marketing copy, the zero-items rule, and two boards.

### Flows outside the app shell
Specced and drawn — see *Flows outside the shell* and *The marketing page*. What is left in that area:

- **The real Gravatar mark.** Every CTA on the canvas carries a placeholder glyph.
- **A proof section for the marketing page** — the slot is left open between the benefits and the band.
- **Privacy and terms have no home.** They are deliberately out of the footer and out of Settings, so if either page ever has to exist, where it is linked from is undecided.
- **Wrong-account-on-invite.** Signed in as someone the invite wasn't issued to. Probably the *already a member* shell with a "switch accounts" action, but it isn't drawn.
- Sign-out confirmation, if any. Currently a plain ghost action in the account menu with nothing behind it.
- **Display-name validation.** Length ceiling, whether two members may share a name, and what the field does with an empty-after-trim value. The button is drawn disabled on empty; nothing else is decided. The field is now the account menu's, which is 292px rather than the pane's 340 — one more reason a ceiling matters.
- **Renaming propagation.** Changing the display name changes it everywhere it is rendered — the Members pane, invites you issued, the drawer row. Whether that is instant for other members or arrives on their next load is a data question the UI currently doesn't acknowledge.
- **Change your picture.** Drawn as a mockup in the account menu and explicitly not in v1 — see *Settings tab → Your account*. What it hands off to, and what comes back, is undesigned.
- **The marketing page has never mentioned the shopping list's best argument** — that you never write the list, because the pantry already knows. The third benefit card now says it; whether the hero should is untested, and the hero mock still shows the item grid rather than the list.

### Empty states
Zero items in a new household is drawn (*Flows outside the shell*), and the shopping list's *scoped, nothing to buy* is drawn (*Shopping list*). Still open: no filter matches · a location with nothing in it · the shopping list's other empty, *Nothing to buy in this filter* — specced but not drawn, and near-identical to the one that is. **No search results** may already exist in the build; check before drawing it. **A household with no invites out** is a new one: the Members pane's Invites block is drawn with one card, and nothing says whether the label survives with only the dashed row under it.

> **No filter matches now has its escape hatch without being drawn** — the applied bar is on screen above it with a clear in reach, so the screen only has to say what happened. It should take the item-grid empty state's form (Playfair italic 500 27px + meta + one secondary control), not the shopping list's disc: a disc would be the status ramp saying something about stock, and this is about the filters.

### Robustness
- Tablet, 768–1024px. Only 1440 and 390 are drawn — for the app, the marketing page **and** the shopping list; the drawer's auto-collapse point, the grid's column count, whether the marketing hero's two columns stack before 1024, and which side of 720 the list row stops stacking are all undecided. **The applied bar adds one:** where it stops wrapping and starts scrolling.
- Long content: long item and household names, 20+ terms in one group, four-digit quantities. The first-run field takes a long household name and the invite card takes a long inviter name — neither is drawn truncating. The list row sets `white-space: nowrap` on both the name and the counts, so a long name has no drawn behaviour either. **The applied chip does the same** — a very long term name has no drawn truncation, and on mobile one chip could fill the scroller. **The Settings boards do truncate** — every name cell in the pane, the Members list and both menus is `min-width: 0` with an ellipsis, which at 340px with an avatar and a role trigger leaves a member's name about 105px before it clips.
- **A household with a lot of members.** The Members pane is drawn with three and the root pane's stacked avatars with three; nothing says what six or twelve do to either.
- Keyboard: focus trap in the drawer and sheets, Escape behaviour, and screen-reader labelling for the steppers — the app's primary control. **The two new menus need the same pass** — the role menu and the account menu are drawn but their focus, Escape and return-focus behaviour is only implied by the sort menu's.
- Typing a quantity directly rather than stepping to it.

## Open questions
- Three filter glyphs (pin / storefront / tag) are not self-evident until hovered once. Reverting to a single funnel that always expands is the cheaper alternative if the learning cost bites. An earlier draft of the applied chip carried the group glyph beside the term name, which would have taught all three; it came off with the rest of the loud version.
- ~~**Invite links are cramped at 340px.**~~ **Settled 27 Aug: they got a pane.** Members and invites moved behind a chevron into a second-level pane, where the link has a full-width field of its own. See *Settings tab → The Members pane*.
- **The `?join=` landing still gives a date** — *This invite expires 9 September* — where the Members pane now gives a countdown. Inside the app the countdown is plainly better: no year, no locale, no format. On a link someone opens cold, a date may be the thing they can act on. It is the one place the two spellings coexist, and it is deliberate rather than missed.
- **The household name still appears twice** — once in the switcher, once in the Settings household row. The second tile and the Playfair size are gone, so it is much quieter, and the argument for keeping it is that the switcher *chooses* a household while Settings *renames* one, which makes the second instance the target of an edit rather than a repeat. If that does not hold up, the fix is to drop the name from the row and show it only inside the rename field once the pencil is pressed.
- **The Members pane drops the Filter / Settings tabs while pushed.** Back is the only way out. Cheap to change — the tabs could stay and switching could pop the pane — but a second-level pane that keeps a tab bar it does not belong to is its own kind of lie.
- Does the undo toast survive a route change or a household switch? Committing on navigation is the simpler rule; holding it across is the kinder one. The shopping list raises the same question one level up — the mode itself is remembered across a reload but nothing says what a household switch does to it beyond clearing the checks. **Filters raise it a third time:** nothing says whether an applied set survives a household switch, and it cannot — the terms belong to the household you left. **The Members pane raises a fourth:** switching households while pushed presumably pops it, since the members you were looking at are gone.
- **Seeded stores are the weakest of the three groups.** Locations and types are near-universal; where someone shops is not, and Grocery / Warehouse / Market may just be three chips a new user deletes. Seeding no stores at all is defensible — the trade is that the Store filter then opens empty on day one, and that every item lands in the shopping list's `NO STORE` group until someone makes one.
- **Off-state chips inside the drawer change brightness by theme, but the drawer doesn't.** Chip Off is surface-on-line, which maps to `#FDFAF4` in light and `#2C251B` in dark — yet the drawer is dark in both. Both read fine; they just aren't the same idea. First visible on the first-run board. Either the drawer gets its own chip pair, or the rule becomes "chips take the surface of the pane they sit in" and the light-mode drawer keeps its bright chips on purpose. **The invite composer's role chips take a third answer** — a `#4A4031` outline with no fill at all — which is either the drawer's off-state finally written down, or a fourth thing to reconcile.
- **Top-bar controls have almost no edge against the ground.** The sort trigger's open state (`#F2EADC` on `#CFBEA3`) separates from the ground at **1.00:1 fill / 1.53:1 border**, and *Back to items* at 1.14 / 1.53. The shopping-list trigger only escapes it by taking a 1.5px `low text` border. Either the whole top bar sits on its own surface, or every control in it borrows that trick. Left alone for now because nothing in the bar is hard to find once you know it is there — which is exactly the assumption that made the shopping list hard to find. **The applied chips now join this at rest** — surface on `line strong` is the same 1.53:1 — and it was the reason the first draft gave them a term-coloured edge. Their *active* state is fine, because it moves to `line`. The whole row now shares one answer instead of the chips being the exception, but it is still the open one.
- ~~**Should the applied bar hide while the drawer is expanded?**~~ **Settled 27 Aug: it stays.** The alternative reflows the grid on a drawer toggle, for a reason unrelated to the toggle. The redundancy with the Filter tab is accepted.
- **Four top-bar rows at 390 is a lot of chrome** — about 236px before the first card, on the screen with the least of it. The fallback if it bites is a single `Filters 6 ⌄` pill in row 3 that opens the same chips in a popover, which costs a tap and gets a row back.
- **`Clear filters` keeps its full label on mobile**, at about 110px of a 390 screen, which leaves roughly one and a half chips visible at rest. Shortening it to `Clear` buys back ~48px. The sort trigger already shortens to *Recent* at that width, so there is precedent either way.
- ~~**Do the status pills recount under a filter?**~~ **Answered by the build, 27 Aug — they always have.** The boards keep them at household totals, but the app counts everything the term filters and the search admit, excluding only the status filter itself so that picking *out* cannot collapse the other two to zero. So row 2 and row 3 already agree. What the question was really weighing is still live and is now a question about the boards rather than the code: a pill reading `0 out` is a control that can only disappoint, and nobody has looked at one on a real screen.
- **What does `/` do for someone already signed in?** Straight through to the app is the obvious answer; showing them the marketing page is the one that lets them find the pitch again to send to someone.
- **Twenty-four hours is a guess.** It is the interval that clears a stale shopping-list check, picked because a trip does not last a day. Nothing has tested it, and the failure mode is silent: a tick that vanishes while you are still in the shop.
