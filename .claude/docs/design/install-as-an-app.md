# Install as an app — 28 Aug

> **This is a section of `claude/ui-designs.md`, kept as its own doc for the same reason `add-edit-item.md` is.** It adds one row to *Settings tab → The root pane* under **Preferences**, and it carries two contrast findings that reach the inline composer on every surface it appears on. Paste it in when you next touch that file by hand — `ui-designs.md` has no patch operation, and it has already lost sections to two wholesale rewrites.

Canvas — five boards:
https://claude.ai/code/artifact/56e1b203-b065-41bc-a352-a57e9b3bef5f

The app is a PWA and nothing in it has ever said so. This adds **one row**, in Settings › Preferences, that installs it — a real prompt where a browser offers one, and two written steps where none exists. There is no banner, no interstitial and no badge anywhere else in the app.

## The rule

**Nothing offers to install what is already open.** In standalone the row does not exist — `display-mode: standalone`, or `navigator.standalone` on iOS. That is the whole ask, and everything else follows from it plus one more line: **the row appears only where a path to install actually exists.** A control that can only disappoint is the rule the sort trigger and the shopping-list trigger already follow.

## There was a banner, and it is worth writing down why there isn't

A dismissible bar at the top of the content column, on the drawer surface, with the app tile and a cream *Install* pill — the toast's construction, in the flow. It was drawn, at 358 × 127, and it worked. It is gone anyway.

- **It cost about 125px at the top of a 390 screen**, where the top bar already takes three rows in grid mode and four with a term filter applied. The first card started around 315px down, and 370px while filtering. That is the most chrome anywhere in the app, on the screen with the least of it.
- **It needed a dismissal design to be tolerable at all** — a permanent `×`, a stored key against the account, and a rule that held it back until the household had its first item so it could not land on top of an empty state. Three decisions, all of them in service of an interruption nobody asked for.
- **It made the "already installed" case worse.** No browser reliably tells the page it is already installed, so both surfaces keep offering. In Settings that is invisible; in a banner it is a nuisance you have to dismiss.

> **What the cut costs, stated plainly.** Nobody opens Settings to see what is in it. Installing is now reachable only by someone who already suspects it is possible — which, on iOS, is the person who least needs telling. **This design does not solve discovery; it declines to.** That is on the record here rather than left to be noticed later.

**Three prompts were considered and not drawn.** A marker on the Settings tab that clears once seen — the drawer has no vocabulary for one, and the mobile menu button's crimson badge is already spoken for by the filter count. A line in the account menu — wrong scope, that menu is about who you are. A mention on the marketing page — it would be describing a browser feature to someone who has not signed up.

## Where it lives

**Preferences, under Appearance**, separated by the block's own hairline. Not a block of its own.

**Scope is in the label**, and this survives it. *Preferences* are yours; *Pantry settings* are the household's. Installing is yours. It does not follow you between **devices** — but nothing in this pane ever claimed to, so the row carries `On this device.` in meta and the rule holds. A fourth block for one row is what *Add / Edit item* already argued against for the off-list checkbox.

**Owners, editors and viewers all see it.** It survives the read-only cut untouched, exactly as Appearance does: installing is a fact about your browser, not a power over the household. That closes one small corner of the Viewer gap rather than widening it.

**Desktop and mobile are the same pane.** 340 docked, 328 in the slide-over. Every pill and glyph takes a 44px hit area on mobile and keeps its drawn size.

## The row

| Part | Treatment |
|---|---|
| Label | *Add to home screen* — body 15 on drawer-raised |
| Meta | *On this device.* — 13px in **`#A5937A`**, see *Deltas* |
| Control | The drawer's primary — cream `#F2E9DA` fill, ink `#241E17` label, 32px at radius 10 desktop, 36px inside a 44px target on mobile |

**The pill is cream in both themes**, because the drawer is dark in both. It is the same control the drawer's *Done* / *Add*, the invite card's *Copy link* and the toast's *Undo* already are. Hover `#FDFAF4`, pressed `#E2D5C0`, focus 2px `#D4636B` at 2px offset in the raised fill — the dark-mode crimson in both themes, for the reason the rail already gives: the surface underneath it is dark either way.

> **This is also why the banner was on the drawer surface.** A light card would have needed an ink-filled primary, and *Add item* holds the app's only ink fill. The banner is gone and the question went with it — but the row inherits the answer for free, because the drawer's primary was never ink to begin with.

## Two states, one control

| Case | Label | What it does |
|---|---|---|
| Chromium — `beforeinstallprompt` captured | **Install** | Fires the saved event. The browser draws the rest. |
| iOS Safari | **Show me** | Drops the steps in below the row. |

**One control, two labels** — the shopping-list trigger's rule, where the label carries the difference and the treatment does not. Same pill, same geometry, same position.

### The steps panel

**The inline composer's panel, on a fourth surface.** It drops in below the row and the row stays put — the Filter tab's editing panel, the add/edit sheet's term composer and the invite composer already work exactly this way. No modal, no pushed pane.

1. **Panel** — drawer well on a 1px inset **`#6E5F4B`** hairline (see *Deltas*), radius 14, padding 12.
2. **Header** — `ADD TO HOME SCREEN` micro-label and a 30px ghost `×` to close, with a hairline beneath.
3. **Two steps**, numbered in meta: *Tap **Share** in the browser bar* with the iOS share mark at 17px inline, then *Choose **Add to Home Screen***.

**The mark is drawn beside the word, not instead of it.** An icon nobody has been taught is not an instruction, and this one is the only thing in the app borrowed from another vendor's interface.

**The words are Safari's own.** *Share* and *Add to Home Screen* are what the buttons say; anything paraphrased sends people looking for a control that is not there.

## Where the row appears

| Context | The row | Why |
|---|---|---|
| Running as the installed app | — | The rule. Nothing offers to install what is already open |
| Chromium — desktop or mobile | **Install** | The one case where a real prompt exists |
| iOS Safari | **Show me** | No prompt exists, so the steps are the control |
| macOS Safari 17+ — *Add to Dock* | *open* | A third steps variant, or hide the row there. Not drawn |
| Any browser with no install path | — | A control that can only disappoint |
| Signed out — marketing, sign-in, invite landing | n/a | There is no drawer out there |
| A household with no items yet | **Install** | Nothing to wait for; you went to Settings on purpose |
| Viewer role | **Install** | Survives the read-only cut, like Appearance |

**One condition, twice:** a path exists, and you are not already in the app.

## What it does not get

- **No toast on install.** The app appearing on the home screen is the confirmation, and you have left the browser to see it. This joins the four settled cases under *Gaps → States an SPA hits constantly*: filter changes, the display-name save, creating an invite and changing a role all get none, for the same reason.
- **No confirm.** Nothing is destroyed.
- **No *Installed ✓* state.** No browser reliably tells the page it is already installed — `getInstalledRelatedApps()` is Android-only — and a badge that lies on iOS is worse than no badge. In a banner this would have mattered; in Settings the row simply keeps offering, harmlessly.

## Motion, keyboard and screen readers

- The panel drops in over **180ms**, height and fade together, ease-out; it closes in **140ms** — the applied chip's exit, unchanged. The row above does not move; the blocks below reflow with the pane. Under `prefers-reduced-motion` both are instant.
- Nothing animates on install: the prompt is the browser's and it arrives on top of everything.
- The pill is a real `<button>`, carrying `aria-expanded` in the iOS case and labelling the panel by its micro-label. Escape closes the panel back to the pill and focus returns to it.
- The steps are an ordered list. The share mark is decorative — `aria-hidden` — because the word *Share* is already in the sentence.

## Tokens

Nothing new. Two existing tokens move — see *Deltas*.

| Part | Light | Dark |
|---|---|---|
| Block card | `#332B22`, radius 13 | `#231D15` |
| Block hairline | `#3B3126` | `#2C2419` |
| Label | `#DCD0BA` | `#DCD0BA` |
| Meta | `#A5937A` | `#A5937A` |
| Pill fill / label | `#F2E9DA` · `#241E17` | same |
| Pill hover / pressed | `#FDFAF4` / `#E2D5C0` | same |
| Panel fill / hairline | `#191510` / `#6E5F4B` | `#0A0805` / `#6E5F4B` |
| Panel inner hairline | `#3B3126` | `#2C2419` |
| Step numeral | `#A5937A` | `#A5937A` |
| Step text / emphasis | `#DCD0BA` / `#F2E9DA` | same |
| Close `×` rest / hover | `#9E8C74` / `#D8CBB6` | same |
| Focus-visible | 2px `#D4636B`, 2px offset in the raised fill | same |

## Deltas — two findings that leave this row

**Drawer meta on the raised fill does not clear 4.5:1.** `#9E8C74` is the rail's rest colour and has been standing in for drawer meta text everywhere. Measured:

| Text on | Current | Ratio | `#A5937A` instead |
|---|---|---|---|
| Drawer raised, light `#332B22` | `#9E8C74` | **4.28** | 4.67 |
| Drawer raised, dark `#231D15` | `#9E8C74` | 5.13 | 5.61 |
| The drawer gradient itself | `#9E8C74` | 5.02 | 5.48 |

It is fine on the drawer gradient and it fails on the card that sits on it — which is where every meta line in the Settings pane actually lives. These rows take `#A5937A`. It is the same shape as *Add / Edit item*'s finding that faint text never clears 4.5:1 as a hint, one surface over, and it belongs in *Gaps → Robustness* with it.

**The composer panel's hairline is invisible on drawer-raised.** *Edit item → The inline composer* gives the panel as a recessed fill on a 1px inset hairline, and on the drawer that reads `#3B3126` on `#332B22` — **1.10:1**. The fill alone is 1.31:1. The panel has no edge at all.

`#6E5F4B` takes it to **2.25:1** read from outside and 2.94:1 from inside, and it is the token the toast already leans on for exactly this reason: it is the strongest border in the dark palette and nothing lighter exists to invent. This row's panel uses it.

> **The invite composer and the Filter tab's term composer have the same bug**, and are not changed here — one canvas should not quietly restyle three components. It is one line when someone next re-renders those boards.

## Open questions

- **macOS Safari 17+ can *Add to Dock*, from the File menu.** A third steps variant, or hide the row there and accept that Mac Safari users never learn. Drawn as neither.
- **Where *Share* is.** On iPhone it is the bar at the bottom; on iPad it is the toolbar at the top. Step 1 names the button and not its place, which is one clause short on the platform that needs it most. Adding the clause costs a line wrap at 340.
- **Discovery**, above. The trade is recorded rather than solved, and it is the first thing to revisit if install numbers come back at zero.
- **Whether the prompt survives the trip to Settings.** `beforeinstallprompt` must be captured at load and held; some browsers invalidate the saved event after a while, and a pill that fires nothing is the worst version of this row. Worth a look at what the build actually does before it ships.
- **Does the row belong above or below Appearance?** Drawn below, on the argument that Appearance is the one anyone actually changes. If install is meant to be found, above is the cheaper half of a discovery fix.

## Boards

Own canvas — five boards:
https://claude.ai/code/artifact/56e1b203-b065-41bc-a352-a57e9b3bef5f

1. **Desktop 1440** — the drawer docked, Settings open, the row in place against the real top bar and item grid
2. **The row** — pill states, the panel's edge finding drawn both ways, the measured table, motion and screen readers
3. **Settings › Preferences** — three states (installable, iOS at rest, iOS open) × both themes
4. **Mobile 390** — the 328 slide-over, the whole pane, 44px targets
5. **When the row appears** — the matrix above, plus the discovery trade and the prompts not drawn

The sample household is **Calfee's** in terracotta, and the grid is the twenty-item dataset in *Recently added* order, so board 1 can be checked against the real counts: 9 in stock, 6 running low, 5 out, 11 to buy.
