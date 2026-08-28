# Beta badge — 28 Aug

> **This is a section of `claude/ui-designs.md`, kept as its own doc for the same reason `add-edit-item.md` and `install-app.md` are.** It touches *Structure* (the drawer header), *The top bar* (a mobile header row that document has never recorded), and *The marketing page* (nav and footer). Paste it in when you next touch that file by hand — `ui-designs.md` has no patch operation and has already lost sections to two wholesale rewrites.

Not drawn. Everything below is specced from the tokens and measured, and the lesson at the foot of *Gaps* applies to it in full: **anything not drawn on a canvas drifts out of this document silently.**

## The rule

**The wordmark never appears without it.** A stage marker that shows up on some screens and not others stops being a disclosure and becomes decoration — the reader has to work out whether its absence means anything, and it never does. So the badge is not placed screen by screen; it is welded to the wordmark, and every surface that draws the wordmark gets it for free.

Two consequences, both good. It is **one component in one place in the code**, so ending the beta is a deletion rather than a pass over five screens. And it needs **no per-surface decision** — the questions that normally eat a design of this size (does the marketing page get one? the footer?) are answered before they are asked.

**It is not a control.** No press state, no tooltip, no link, no 44px target. It is the **tag** component — read-only, bounded, sitting beside a thing it labels — with no dot, exactly as the invite composer's role chips are the chip component with no dot. Nothing new.

## Where it appears

| Surface | Wordmark | Badge |
|---|---|---|
| Drawer header — docked 340 | Playfair 27 | ✔ regular |
| Drawer header — 328 slide-over | Playfair 27 | ✔ regular |
| Mobile header row — see *Deltas* | Playfair 24 (observed) | ✔ small |
| Marketing nav — desktop | Playfair 27 | ✔ regular |
| Marketing nav — 390 | Playfair 24 | ✔ small |
| Marketing footer | Playfair ~22 | ✔ small, at the floor |
| Collapsed rail | none | — no wordmark to sit beside |
| App icon, favicon, PWA name | not a wordmark | — see *Deltas* |
| Sign-in card, Gravatar handoff, `?join=` landing | Playfair 38 / 32 | **not yet** — see *Gaps* |

**The rail is not an exception.** There is no wordmark at 68px, so there is nothing for the badge to attach to, and a free-floating one would land in the same corner as the crimson filter-count badges. Collapsing the drawer hides the beta marker, which is the correct trade: the rail is for someone who already knows what they are in.

**On mobile with the drawer open, the badge is not drawn twice.** The 328 slide-over covers the left edge of a 390 screen, and both the header row's wordmark and its badge sit inside that 328. The duplicate resolves itself; nothing has to suppress anything.

## Anatomy

`BETA` in a pill, to the right of the wordmark.

**It scales off the wordmark's set size, not off a fixed table** — the same idea the household tile already uses, where radius is 30% of the side and the letter 42%:

- **Badge height** = 0.66 × the wordmark's set size
- **Label** = 0.55 × the badge height, Karla 700, 0.12em tracking, uppercase
- **Gap** = 0.37 × the wordmark's set size, measured from the wordmark's advance width
- Radius 999, horizontal padding = 0.39 × the badge height, border 1px

Rounded to whole pixels, which gives the two drawn sizes:

| | Wordmark | Height | Label | Padding | Gap | Width |
|---|---|---|---|---|---|---|
| **Regular** | 27 | 18 | 10 | 0 7 | 10 | ~44 |
| **Small** | 24 | 16 | 9 | 0 6 | 9 | ~39 |

> **The ratio has a floor at 9px, and the marketing footer is the one place it bites.** A ~22px footer wordmark asks for an 8px label, which is below the smallest type anywhere in the app — the `OUT` / `LOW` badges at 9.5. Below 9 the tracking stops separating letters and starts dissolving them. The footer badge therefore takes **Small unchanged** and sits fractionally large against its wordmark, which is the right way to be wrong.

### Alignment — the one fiddly part

**The badge aligns to the wordmark's cap height, not to its baseline and not to the line box.** Playfair Display at 700 sets a cap height of about 0.70em — 19px at 27 — and *Larder Log* carries a descender in the italic **g**. Baseline alignment would hang the badge off the bottom of that descender and read as falling off the word; line-box alignment centres it on a box the eye cannot see.

So: **the badge's box is optically centred on the cap band**, top edge at the cap line, which at Regular puts an 18px pill against a 19px cap and leaves it looking level with `L` and `d`. In CSS this is a nudge on an `inline-flex` row with `align-items: baseline` overridden — not `align-items: center`, which is what the line box gives you and what will look a pixel and a half low.

> **The gap is metric, and it will read wider than it measures.** The wordmark ends on an italic **g** whose rightmost ink is below the x-height, so the space beside the badge's left edge is largely empty at cap level. 10px measured reads as roughly 12. Tightening it to compensate is the wrong fix — it would collide the moment the wordmark is ever set roman.

## One construction, four surfaces

**Fill one step off the surface · a `meta` edge · a `body` label.** That is the whole component, and it maps onto every surface the wordmark appears on without a special case.

| | Drawer (both themes) | Ground — light | Ground — dark |
|---|---|---|---|
| Fill | drawer raised `#332B22` / `#231D15` | line `#E2D5C0` | line `#3E3527` |
| Edge, 1px | meta `#A5937A` | meta `#6F6049` | meta `#A5937A` |
| Label | body `#DCD0BA` | body `#4C4237` | body `#DCD0BA` |

The drawer column carries two fills because the drawer's own tokens differ by theme even though the drawer is dark in both; the treatment does not change.

**The `line` fill on the ground is the applied-filter finding, reused.** *An interaction state on the ground moves away from the ground, not toward it* — darker on the cream, lighter on the dark — and `line` is the one token that does both from a single name. A `sunk` fill would be the ground's own middle stop and the badge would have no body at all.

**The `meta` edge is the shopping-list checkbox's finding, reused.** That component takes meta rather than the strongest border in the palette because the strongest border falls under 3:1 on the surface it actually sits on, and an outline you cannot see is the worst failure in a component whose job is to be a bounded object.

### Measured

| Pair | Ratio |
|---|---|
| Label on fill — drawer, light theme | **9.13** |
| Label on fill — drawer, dark theme | **10.95** |
| Label on fill — ground, light | **6.78** |
| Label on fill — ground, dark | **7.90** |
| Edge vs the drawer gradient, light (top → bottom) | 5.15 → 5.80 |
| Edge vs the drawer gradient, dark | 6.32 → 6.56 |
| Edge vs the ground, light | **5.11** |
| Edge vs the ground, dark | **5.85** |
| Edge read from inside the fill | 4.67 / 5.61 drawer · 4.21 / 4.05 ground |
| Fill alone vs its surface — *why the edge is load-bearing* | 1.10 drawer · 1.21 ground |

**The fill does none of the separating anywhere.** 1.10:1 on the drawer and 1.21:1 on the ground — the pill is invisible without its border in every theme and on every surface. That is stated here because it is the thing a re-render will get wrong: drop the edge to a hairline "because it looked heavy" and the badge stops existing.

> **This is the first component in the app whose edge clears 4.5:1 on both sides.** The standing open question — *top-bar controls have almost no edge against the ground*, at 1.53:1 — does not reach the badge, because the badge escaped it the way the shopping-list trigger did, by borrowing a text token for its border. It is now the second component to do that, which is starting to look like the answer to that open question rather than two exceptions to it.

## Copy

**`BETA`, uppercase, tracked** — the app's established voice for a label *about* a thing rather than a thing itself: section headers, `LOCATION · NEW`, `HOUSEHOLD · EDITING`, `OUT`, `LOW`. Sentence case would make it a word in a sentence, and *Larder Log Beta* would read as the product's name.

**The markup says `Beta`; the uppercase is CSS.** `text-transform: uppercase` on a `<span>` whose text content is `Beta`, so a screen reader is handed a word rather than four letters to consider spelling out.

**No version number, no `v0.9`, no build id.** Nobody in a pantry app can act on one, and a number invites the question of what changed between two of them — which is a changelog, which is a page that does not exist.

## Motion, keyboard, screen readers

- **No motion.** It never enters, leaves or changes; it is part of the wordmark's own layout. Nothing to animate and nothing for `prefers-reduced-motion` to reduce.
- **Not focusable, not in the tab order.** It is not a control.
- **Not `aria-hidden`.** It is inside the same element as the wordmark, so the drawer header announces *Larder Log Beta* — which is what a sighted reader gets, and the whole point of the disclosure.
- **No `title` and no tooltip.** A tooltip would be an explanation the app cannot give without a page to link to, and a tooltip on a non-focusable element is unreachable by keyboard anyway.

**Removing it must not move anything.** The drawer header right-aligns its collapse button and the marketing nav right-aligns its CTA, so both are safe; the mobile header row is a left-packed flex row and is also safe. Deleting the span at the end of beta should be a one-line diff with no reflow anywhere.

## What lost, and why

**Crimson fill — the filter-count badge's construction.** `#BE3346` with `#FDFAF4` text is the app's existing badge, and reusing it was the obvious first move. Three reasons it is wrong here. **Crimson is brand-and-out** — it already means *gone* on the status ramp and *something is filtering* on the rail and the mobile menu button, and neither is what beta means. **The wordmark is already crimson** — `Log` is italic 600 crimson, so a crimson pill 10px away doubles the only accent on the screen inside a 200px span and the two fight rather than pair. And on the drawer, a `#BE3346` fill separates from the raised card at **2.49:1**, so it would need the cream text to carry it and would land as the brightest thing in the header.

**Amber — the low tokens.** *Amber is "hold on"*, which is nearly the right sentence for a beta. It loses on scope: the ramp is about **stock**, and its three rungs are the item badges, the blocked dialog and the sign-in failure. Putting the pantry's status vocabulary on the product's name says the pantry is running low. The shopping-list trigger already lost the same argument for the same reason and became secondary.

**Inverted — ink fill, cream label.** It is the app's selected-chip treatment and it reads beautifully at this size. It breaks rule 3 of *Theming* outright: **near-black ink is the only thing you press**, and *Add item* holds the only ink fill on screen. An unpressable ink pill in the header would be the app teaching its own rule wrong on the first screen.

**A term colour.** Sixteen exist and one of them would look good. Term colours mean *term* — the same argument that keeps a person off the palette and the role out of a tag.

**Playfair italic `beta`, set to rhyme with `Log`.** Drawn in the head and abandoned there: it makes the badge part of the name rather than a marker on it, which is precisely backwards. The badge should look like something attached to the wordmark by the team, not something the designer typed.

**Bare superscript text, no container.** Cheapest option, and it has no bounded form — on the ground it would be small text with no edge, which is the one failure mode this system already knows it has.

## Deltas

**`ui-designs.md` has no mobile header row, and there is one.** That document says the top bar has no title and that the wordmark lives only in the drawer — *"There is no title in the right pane, and there never was."* The build has a header row above row 1 carrying the top-left menu button and the wordmark. This is the same class of drift as search, the filter-chip counts, the `All items` chip and the drawer's collapse button: **built, never written down.** Treat the 24px figure above as observed rather than decided, and confirm it on a real screen before anything is drawn.

> **That row now carries two badges.** The menu button already takes the crimson filter-count badge whenever a term filter is on, and the beta badge lands about 10px to its right. They are different shapes (a ringed circle on a button, versus a bordered pill in the row), different colours, and only one of them is ever transient — but they are the app's only two badges and they will be side by side on its smallest screen. Worth looking at with six filters applied before accepting it.

**The PWA name does not get it.** `install-app.md` ships *Add to home screen* this week; the manifest `name` and the home-screen label stay **Larder Log**. iOS truncates a home-screen label past roughly 12 characters, and *Larder Log (Beta)* would ellipsize into something worse than either version. The app announces its own stage the moment it opens, which is soon enough.

**The app icon does not get it either.** The 16px favicon is a hand-cut drawing where a 3px stem and a 2px arm are already at the limit of the grid; a corner ribbon or a second glyph has nowhere to go, and *the icon does not vary by theme* would become *the icon varies by release stage*, which is a promise to redraw eight files twice.

**The document title does**, as the one non-visual surface where the wordmark effectively appears: `Larder Log (Beta)` in `<title>`, parenthetical rather than tracked caps because a tab strip is not a design surface. Whether the `(Beta)` should lead or trail when the title ever becomes contextual is not a question yet.

## Gaps and open questions

- **The signed-out cards are the notable exclusion, and it should be revisited first.** The sign-in card, the Gravatar handoff and its failure state all set the wordmark at Playfair 38 — the largest it ever appears — and they are the last screen someone sees before creating an account. Scoping them out is defensible only if the marketing nav has already done the disclosing, which holds for someone arriving at `/` and fails for anyone landing on a bounced URL or an invite link. **This is the one place the rule at the top of this document is not being applied**, and it is deliberate rather than missed. Regular scales to 25/14/14 at that size, so the component is ready when the decision is.
- **The `?join=` landing has no wordmark at all** — its header is the household tile. Someone accepting an invite can therefore reach a signed-in app without ever seeing the marker, which is the exact person least likely to know what they have joined. Either the card gains the wordmark or it gains nothing; a badge with nothing to attach to is not an option.
- **Does the badge ever become a link?** Not now, because there is nowhere to send anyone — *Privacy and terms have no home* is already a recorded gap, and a *what's in beta* note would be a third homeless page. If one ever exists, the badge is the obvious trigger, and at that point it stops being a tag and becomes a chip, with a press state, a focus ring and a 44px target on mobile. Designing that now would be designing for a page nobody has agreed to write.
- **Nothing says when it comes off.** The badge is trivial to remove and impossible to remember to remove. Worth attaching to something — the Viewer role shipping, or the restock flow, both of which are recorded gaps that a reasonable person would call blockers on calling this v1.
- **Tablet, 768–1024, is undrawn here as it is everywhere else.** The badge scales off the wordmark, so it needs no breakpoint of its own — but the mobile header row's own existence between 768 and 1024 is unknown, because that row is undocumented at every width.
- **It has never been seen next to the wordmark at all.** No board carries it. The cap-height alignment, the italic-`g` gap and the two-badges-on-one-row collision are all arguments made on paper, and each of the three is the kind that survives measurement and fails on a screen.
