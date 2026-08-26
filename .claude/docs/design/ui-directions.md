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

The general form of rule 3, which the drawer and the toast both need: **the primary control is the lightest thing on a dark surface and the darkest thing on a light one.** So the drawer's *Done* / *Add* pill and the toast's *Undo* are cream-filled with ink labels in **both** themes — the drawer is dark in both, and an ink-filled pill on it would vanish. It is the rail's Open / active treatment, one step up.

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
| Leave household | Confirm modal | You lose access and can't put yourself back |
| Leave — last owner, others remain | Blocked dialog | Would orphan the household |
| Leave — last member | Confirm modal + typed name | This isn't leaving, it destroys the household |

Removing a member inherits the invite pattern. Undo pressed on something another member has since changed is a concurrency problem, not a destructive-action one — it stays in the failure states.

**Crimson is still never a button.** The confirm's primary control is the ordinary ink/cream primary. Destructiveness is carried by three things that cost nothing: the title asks the question, the body names what is lost, and the button says the verb — *Revoke invite*, *Leave household* — never *Confirm*, *OK* or *Yes*. Crimson appears once per dialog as the icon tint, which is the tag treatment applied to a glyph and comes free from the out tokens. Ghost + crimson text stays what it already is on the Edit sheet: the way a destructive action is **offered**, never the way it is **executed**.

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

**Delete a term.** Unused → deletes on press, toast *Deleted **Condiment**.* · Undo, restoring name, colour and position in the chip list. If that term was an active filter, deleting clears the filter and undo restores it too.

In use → blocked dialog.
- Title: **Move these 3 items first**
- Body: *Pantry holds 3 items. A location can only be deleted once nothing is stored there.*
- Footer: Cancel · **Show the 3 items** — applies that term as the only active filter and drops the section out of editing.

> **Delta from what's drawn:** the trash on a term row is **enabled in every case**. A disabled control cannot explain itself — it takes no hover on touch, screen readers skip it by default, and the reason is the one thing you want at that moment. The row also gains the item count in meta text between the field and the trash, so the outcome is predictable before you reach for it.

**Revoke an invite.** Trigger is the small ghost crimson-text button already on the invite row.
- Title: **Revoke this invite?**
- Body: *The link stops working immediately. Anyone who hasn't accepted it yet will need a new one.*
- Footer: Cancel · **Revoke invite**
- After: the row leaves, plain toast *Invite revoked.* No undo — there is nothing to restore, only a new link to issue.

**Leave household.** Lives as a ghost row with crimson text at the foot of the **Household** section — not a new block after Invites, which would break *Invites last*. Three cases.

*Others can still own it:*
- Title: **Leave Calfee Household?**
- Body: *You'll lose access to its 47 items. An owner can invite you back.*
- Footer: Cancel · **Leave household**
- After: switch to the next household in the switcher, or to first run if it was your only one.

*You're the only owner and members remain* — blocked:
- Title: **Make someone else an owner first**
- Body: *You're the only owner of Calfee Household. Promote another member, then you can leave.*
- Footer: Cancel · **Open Members**

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

## Flows outside the shell
Everything before the app: the public page, sign-in, the first household, and the `?join=` landing. Drawn — canvas link under *Boards* at the end of the section. Owner and Editor only, as with destructive actions; what a Viewer sees on the invite landing stays under *Gaps*.

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

### First run — name it, then land in it
Sign-in comes first; there is no anonymous mode. A signed-in account with no household gets one screen, not a wizard.

**The card.** 440px, the same width as every other card outside the shell. Left-aligned. Eyebrow `NEW HOUSEHOLD` → title Playfair 600 26 *Name your household* → body → `HOUSEHOLD NAME` micro-label → field → hint → *Create household* → the signed-in row.

- **Field**: the composer's field — 44px, radius 11, focused on arrival with the crimson halo. Prefilled with the Gravatar display name plus *'s Household*, selected, so Enter alone finishes the screen.
- **Hint**, meta 12.5: *Taken from your Gravatar name — change it to whatever you call the place.*
- **Signed-in row** under a hairline: avatar, name, email in meta, ghost *Sign out*. It answers "which account am I attaching this to" before the household exists rather than after.

**One field, one button, nothing else.** An earlier draft previewed the seeded terms here in a recessed panel — fifteen chips explaining what a household is before you had made one. It is gone. The screen asks for a name; the terms explain themselves in the drawer a second later, where they are also editable.

### The empty household
Creating drops straight into the app, seeds already in the drawer, no items.

**What gets seeded:**

| Group | Seeded |
|---|---|
| Locations | Pantry olive · Refrigerator slate · Freezer teal |
| Stores | Grocery denim · Warehouse mustard · Market clay |
| Types | Produce olive · Dairy slate · Protein brick · Grain ochre · Condiment plum · Beverage teal · Snack clay · Baking terracotta · Spice mulberry |

Types are the existing assignments from *Term colours*, unchanged. Locations and stores are new and generic on purpose — the sample data's Meat Freezer, Calfee Cattle and Publix are one household's vocabulary, not a default.

- **Empty state**, centred in the content column: Playfair **italic 500 27px** *Nothing in the larder yet.* + meta *Add your first item. Your locations, stores and types are already set up in Filters — rename or recolour them whenever you like.* + a single *Add item* primary.
- **At zero items the top bar carries neither the sort trigger nor an Add item button.** Sorting nothing is a control that can only disappoint, and two *Add item* buttons on one screen is one too many. The top bar keeps the title and the count; the empty state owns the screen's only primary. Both come back with the first item.

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

Revoked shares the expired screen with one line changed (*This invite is no longer valid.*). From outside the household, a revoked link and an expired one are the same event, and telling them apart would tell a stranger something about the household.

Signed out on a valid invite, **signing in is the accept** — the join applies on return rather than showing the same card a second time.

### Mobile
Same cards at `100% − 32px`, centred — the confirm modal's mobile width. Buttons go to 48–50px and every affordance inside a card clears 44px, *Sign out* included: at 13.5px text it was an 18px target.

No layout adaptations beyond that. Every card outside the shell is now short enough to sit inside 390 × 844 without scrolling, which is the whole reason to keep these screens down to one decision each.

### Deltas and additions
- **Card borders take `line strong` in dark, `line` in light.** Inherited from the confirm modal's finding: at `#2C251B` on `#1F1912` a card separates at 1.27:1 and the shadow does nothing. Every card outside the shell follows the modal, not the item card.
- **A dark focus halo for the composer field** — `rgba(212,99,107,.18)`, the light halo's alpha in the dark crimson. The token table gave light only; it is now in the composer table above.
- **The wordmark scales to 38px** on the sign-in card and 32px on mobile — the first time it leaves 27px.
- **A marketing headline scale**, Playfair 600 at 56px desktop / 34px mobile, above anything the type ramp currently carries. Public page only.
- The **Gravatar mark is a placeholder on every board**: a ring with an inner dot. The real drawing — a ring broken at the top with a spoke to the centre, on lucide's 24px grid at stroke 2 — is in `Brand.tsx` as of 2026-08-26, so the boards and the build differ here and the build is right. The spinner's radius tracks it.

## The marketing page
Public, at `/`. One offer, one call to action, repeated three times — nav, hero, close.

**Anatomy.** Nav (icon + wordmark left, *Sign in with Gravatar* right) → hero → three benefit cards → the *Three ways to slice it* band → closing CTA → footer. Content column 1120 inside 160px margins at 1440; 22px gutters at 390. Same ground gradient, same cards, same tokens as the app — this is an extension of the system, not a separate brand.

- **Hero.** Headline *Know what's in the freezer before you get to the store.* over the sub-paragraph, CTA at 268 × 52, then *Signing in creates your account. There's no separate sign-up.* On the right, a real mock: three item cards from the sample data, one stocked, one low, one out. The status ramp doing its job **is** the product demo, so the hero image is the app rather than a picture of a pantry.
- **Benefits**, three cards, each answering a doubt rather than naming a feature: *A count, not a hunch.* / *The whole household, one list.* / *The shopping list is a filter, not a chore.*
- **The band** explains the data model — Location, Store, Type — one column each with a live chip row under it, and *Sixteen colours, yours to name and assign* on a hairline below. Someone deciding whether to sign up needs to understand the model, and three chip rows do it faster than a paragraph.
- **Footer.** Icon, wordmark, `© 2026 Larder Log`. Nothing else — no legal links, no nav, no second column. A footer on a one-page site whose only action is at the top of the page has no work to do.

**No proof section.** No testimonials, no logos, no counts. There is nothing real to put there yet, and invented quotes on a public page are worse than a shorter page. The slot sits between the benefits and the band for whenever there is something true to fill it with.

**The store in the hero mock is "Grocery", not a real chain.** Publix and Costco are fine in a spec; on a public page a named chain inside a screenshot reads as a partnership.

At 390 the page stacks, the hero mock uses the **mobile item-card ramp** (names 18.5, quantities 28) and 44px steppers, and the band's three columns become three stacked blocks.

### Boards
Own canvas — nine boards, each with its dark counterpart, 18 total, on **Light** and **Dark** pages:
https://claude.ai/code/artifact/5c742401-cc59-44bc-9f49-2c9c1af8ee93

1. Marketing · desktop 1440
2. Marketing · 390
3. Sign-in required
4. Gravatar handoff — pressed, returning, didn't come back
5. First run · name it, with the seeded panel
6. First run · the seeded, empty app
7. Invite · valid — signed out and signed in
8. Invite · expired and already a member
9. Flows · 390 — sign-in, name it, invite

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

**The sort trigger is hidden at zero items** — see *Flows outside the shell*.

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
- **Viewer role.** Invites can issue Viewer, but no read-only variant exists. Steppers, Add item, the term pencils, the `+ …` chips, Edit/Remove and the whole Invites block all have to disappear or disable. This is a modifier on every screen, not a new one — cheapest to settle now. Parked for the current test round, which is Owner / Editor only. The invite landing's role sentence is written for Editor; the Viewer wording ("you'll be able to see everything, and nothing you do changes it") comes with that decision.

### States an SPA hits constantly
- Loading / skeleton on first paint; optimistic feedback on a stepper tap.
- Failure: save failed, offline, and the concurrent-edit case — two household members changing one item, including Undo pressed on a removal someone else has since acted on.
- Which non-destructive events earn a **plain toast**. The component is specced under *Destructive actions*; the trigger list (saved, copied, invite sent, term added) is not settled, and a toast on every save would be noise.
- **Session expiry.** What happens when the token dies with the app open — the sign-in card exists, but nothing says whether you get bounced to it, get it as a modal over your work, or keep reading a stale list until you touch something.

### Flows outside the app shell
Specced and drawn — see *Flows outside the shell* and *The marketing page*. What is left in that area:

- **A proof section for the marketing page** — the slot is left open between the benefits and the band.
- **Privacy and terms have no home.** They are deliberately out of the footer and out of Settings, so if either page ever has to exist, where it is linked from is undecided.
- **Wrong-account-on-invite.** Signed in as someone the invite wasn't issued to. Probably the *already a member* shell with a "switch accounts" action, but it isn't drawn.
- Sign-out confirmation, if any. Currently a plain ghost action with nothing behind it.

### Empty states
Zero items in a new household is drawn (*Flows outside the shell*). Still open: no filter matches · no search results · a location with nothing in it · a shopping list with nothing low or out.

### Robustness
- Tablet, 768–1024px. Only 1440 and 390 are drawn — for the app **and** the marketing page; the drawer's auto-collapse point, the grid's column count, and whether the marketing hero's two columns stack before 1024 are all undecided.
- Long content: long item and household names, 20+ terms in one group, four-digit quantities. The first-run field takes a long household name and the invite card takes a long inviter name — neither is drawn truncating.
- Keyboard: focus trap in the drawer and sheets, Escape behaviour, and screen-reader labelling for the steppers — the app's primary control.
- Typing a quantity directly rather than stepping to it.

### Content note
Every store in the sample data has at most one low or out item, so the shopping-list modal is always a single row. Worth widening the sample before judging whether it earns a modal.

## Open questions
- Three filter glyphs (pin / storefront / tag) are not self-evident until hovered once. Reverting to a single funnel that always expands is the cheaper alternative if the learning cost bites.
- Invite links are cramped at 340px.
- Each store has ≤1 low/out item in the sample data, so the shopping-list modal is a single row.
- Does the undo toast survive a route change or a household switch? Committing on navigation is the simpler rule; holding it across is the kinder one.
- **Seeded stores are the weakest of the three groups.** Locations and types are near-universal; where someone shops is not, and Grocery / Warehouse / Market may just be three chips a new user deletes. Seeding no stores at all is defensible — the trade is that the Store filter then opens empty on day one.
- **Off-state chips inside the drawer change brightness by theme, but the drawer doesn't.** Chip Off is surface-on-line, which maps to `#FDFAF4` in light and `#2C251B` in dark — yet the drawer is dark in both. Both read fine; they just aren't the same idea. First visible on the first-run board. Either the drawer gets its own chip pair, or the rule becomes "chips take the surface of the pane they sit in" and the light-mode drawer keeps its bright chips on purpose.
- **What does `/` do for someone already signed in?** Straight through to the app is the obvious answer; showing them the marketing page is the one that lets them find the pitch again to send to someone.
