# Larder Log — interface (Aug 2026)

Canvas: https://claude.ai/code/artifact/9921008e-ee6c-4075-9379-6bf265cc1683
Pages: **Light** (14 artboards) · **Dark** (13 generated counterparts). 27 boards total. The early exploration boards have been removed.
Stack: Tailwind, SPA, one layout that flexes mobile ↔ desktop.

## Structure — one left drawer, two tabs
340px, dark, **always on the left** — docked and collapsible on desktop, a 328px slide-over with a scrim on mobile. Mobile's menu button is **top-left**, the same side the drawer comes from.

Above the tabs: wordmark, then the **household switcher** — a full-width button opening a popover of every household (name, role, item count, check on the current) plus *New household* and *Join with a link*. Bottom of the drawer: the account row (avatar, name, chevron into Settings).

**Filter tab** — Location, Store, Type. Each section header has a pencil + chevron; the pencil flips *that section only* into editing (`color swatch · name field · delete`, an "Add …" row, **Done** in the header). The swatch opens the 16-colour picker (8 × 2). A dashed `+ …` chip also ends each chip list. `Clear all filters` last.

**Settings tab**, in order: Account → Household (name read-only with a pencil; switcher lives in the header) → Members → Appearance → Default low-stock threshold → **Invites last** (Owner / Editor / Viewer, 14-day expiry, copy, revoke). No terms block, no shopping list.

**Add item** is a sheet: 480px from the right on desktop, a near-full-height bottom sheet with a grabber on mobile. Name → on-hand stepper + low-at → Location / Type / Store chip pickers (selected chip fills with its own term colour and takes ink text; unselected is neutral with a coloured dot; each group carries its `+ …` chip) → notes → sticky Cancel / Save item.

**Shopping list is contextual only.** Filter by a store → banner above the list → modal of that store's low and out items.

## Collapsed rail
68px. Eight controls in three groups, `aria-label` on every one and a tooltip to the right after ~400 ms.

| # | Control | Glyph | Click |
|---|---|---|---|
| 1 | Expand | panel-right-open | Opens the drawer on the last pane |
| 2 | Household | the household's initial on its term colour | Flyout — switch, new, join |
| 3 | Location | map pin | Flyout — quick filter |
| 4 | Store | storefront | Flyout — quick filter |
| 5 | Type | tag | Flyout — quick filter |
| 6 | Appearance | sun / crescent / half-disc | Flyout — Auto, Light, Dark |
| 7 | Settings | sliders | Expands the drawer onto Settings |
| 8 | Account | avatar, pinned to the bottom | Flyout — profile, sign out |

Dividers after 2 and after 5.

**The rule: a pane expands the drawer, a menu flies out.** Filter groups and Settings need width, so they animate the rail 68px → 340px and the icon you pressed is the one lit on arrival. Household, Appearance and Account are menus — they fly out beside the rail, the rail does not move, and the button takes a cream ring to mark itself as the source. Escape or an outside click closes.

**Quick filter ≠ the full set.** A flyout picks from one term list and nothing else: no pencil, no "+ Add", no clearing across groups. It ends with *Open full filters*, which expands the drawer to the whole pane.

**Appearance** opens the same three choices the Settings pane shows rather than cycling, so there is one source of truth. Its icon renders whatever the theme currently resolves to, making it a status indicator as well as a control.

**Badges** count active filters *in that group only*, sitting top-right of the icon: `#BE3346` fill, `#FDFAF4` text, 2px ring in the rail colour. Collapsed is the one place crimson touches the rail, and always as a badge, never a fill.

### Control states
| State | Icon buttons | Household tile | Avatar |
|---|---|---|---|
| Rest | transparent · `#9E8C74` | `#A85E33` | `#4A3E2E`, inset ring `#63533E` |
| Hover | `#332B22` · `#D8CBB6` | `#B96A3C` | `#574934` |
| Pressed | `#3B3227` · `#F2E9DA`, `scale(.94)` | `#98522B`, `scale(.94)` | `#413628`, `scale(.94)` |
| Focus-visible | rest + 2px `#D4636B` ring, 2px offset in the rail colour | same | same |
| Open / active | `#F2E9DA` · `#241E17` | fill + 2px cream ring | fill + 2px cream ring |

Expand is the exception — it carries `#332B22` at rest (hover `#3D3429`, pressed `#453A2C`) and has no active state.

Desktop only: expanding reflows the content column rather than covering it, so nothing overlaps the grid.

## Theming
Three rules hold in both themes:
1. **The drawer is the darkest surface** — in dark mode it drops *below* the content ground rather than inverting.
2. **Cards sit one step above the ground.**
3. **Near-black ink is the only thing you press** — in dark mode the primary button flips to cream `#EFE3CE` with ink text, still the single lightest control on screen. **Crimson is brand-and-out, never a button.**

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

## Edit item + inline term creation
Same 480px sheet as Add, prefilled. Differences:

- Header carries the **item's name** rather than "Add an item" — the only place it is set in Playfair at that size, so there is no doubt which row you opened.
- **No timestamps on items.** Nothing in the UI shows when an item was added, changed or last counted. *Recently added* sorts on insertion order, not on a date anyone sees; if that ordering should go too, the sort's default moves to *Needs restocking*.
- **Remove item** sits far left in the footer: ghost, crimson text, never a crimson fill. Always reachable without scrolling, and the width of the footer away from Save.
- **Removal is undoable, not confirmed.** The sheet closes, the item goes, a toast holds it for a few seconds. A confirm modal on every edit is the worse trade in a shared list.
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
| Field | `#FDFAF4` on `#9B8B75` + `rgba(190,51,70,.14)` halo | `#2C251B` on `#6E5F4B` |
| Picker sub-panel | `#EBE1D0` | `#1C170F` |
| Selection ring on the current colour | ink `#241E17` | cream `#F2E9DA` |
| Add pill | ink / cream — `#EBE1D0` / `#B0A088` while the field is empty | cream / ink |

The earlier design had this as a floating pill-shaped capsule with a popover — a shape that existed nowhere else in the app. It is gone.

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

## Item card
Name (no icons beside it) · status badge or dot + expand chevron · term **tags** in their own colours (see Chips and tags — cards carry tags, never chips) · big numeral + "low at N" + stepper. Expands in place to notes + Edit / Remove.

## Sample dataset
Ground Beef 75 (low 15, Meat Freezer, Calfee) · Ribeye 12 (low 6) · Chicken Thighs 4 (low 6, Upright, Aldi) LOW · Butter 2 (low 4, Upright, Costco) LOW · Black Beans 0 (low 4, Pantry, Publix) OUT · Jasmine Rice 3 (low 2, Pantry, Costco) · Frozen Peaches 8 (low 3, Chest) · Marinara 6 (low 3, Pantry). Totals 5 / 2 / 1. Default sort: recently added.

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
- **Viewer role.** Invites can issue Viewer, but no read-only variant exists. Steppers, Add item, the term pencils, the `+ …` chips, Edit/Remove and the whole Invites block all have to disappear or disable. This is a modifier on every screen, not a new one — cheapest to settle now.
- **Destructive confirms + undo.** Remove item now resolves to an undo toast, but that toast is not drawn — and delete a term, revoke an invite and leave a household still have no confirm or undo path.

### States an SPA hits constantly
- Loading / skeleton on first paint; optimistic feedback on a stepper tap.
- Failure: save failed, offline, and the concurrent-edit case — two household members changing one item.
- Toasts for saved / copied / removed.
- Location delete blocked because items are stored there — the trash is drawn disabled, the explanation is not.

### Flows outside the app shell
- Sign-in, and the invite-accept landing page the `?join=` link opens.
- First run: create a household, name it, add the first location and first item.

### Empty states
Zero items in a new household · no filter matches · no search results · a location with nothing in it · a shopping list with nothing low or out.

### Robustness
- Tablet, 768–1024px. Only 1440 and 390 are drawn; the drawer's auto-collapse point and the grid's column count are undecided.
- Long content: long item and household names, 20+ terms in one group, four-digit quantities.
- Keyboard: focus trap in the drawer and sheets, Escape behaviour, and screen-reader labelling for the steppers — the app's primary control.
- Typing a quantity directly rather than stepping to it.

### Content note
Every store in the sample data has at most one low or out item, so the shopping-list modal is always a single row. Worth widening the sample before judging whether it earns a modal.

## Open questions
- Three filter glyphs (pin / storefront / tag) are not self-evident until hovered once. Reverting to a single funnel that always expands is the cheaper alternative if the learning cost bites.
- Invite links are cramped at 340px.
- Each store has ≤1 low/out item in the sample data, so the shopping-list modal is a single row.
