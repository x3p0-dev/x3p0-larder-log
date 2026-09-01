# Delete account — 1 Sep

> **This is a section of `claude/ui-designs.md`, kept as its own doc** — the arrangement `add-edit-item.md`, `install-app.md`, `beta-badge.md`, `garden-and-kitchen.md`, `restock.md` and `announcements-and-blog.md` already use, for the same reason: that file has no patch operation and has lost sections to two wholesale rewrites.
>
> It amends **Settings tab → Your account** (the menu becomes a door, and the section becomes a pane), **Settings tab → The root pane** (Pantry settings gains a row), **Settings tab → Changing a role** (the role menu gains a row), **Destructive actions** (a third typed confirmation, and the icon-disc ramp generalised), and **Flows outside the shell** (one new card). It is the in-app twin of `admin-console.md → Deletion flows`, and it **contradicts two lines of that doc** — see the deltas. It closes `future-ideas.md → Delete account` and its sibling **export**, and removes the **Delete account** row from `future-ideas.md → What blocks what` by designing the thing that blocked it.

Canvas — **six boards, light theme**, desktop except board 6:
https://claude.ai/code/artifact/e1c7f01e-c947-411a-888e-917930c311d1

> **Two things were settled while drawing rather than deferred.** **Where it lives** is the pushed pane, and the crimson menu row that lost is kept on board 1 with its costs. **There is no grace period**: deleting is immediate, and a hold that was drawn in full has been cut. Both are recorded below with the arguments, including the ones against.

---

## The shape of the thing

**Account deletion is *leave household* run against every household at once**, and `future-ideas` had already worked out that the tree does not survive the trip:

| Your position | What *Destructive actions* does today | What deletion needs |
|---|---|---|
| One of several members | Leave. Confirm modal | Unchanged — no decision, so no screen |
| The only owner, others remain | **Blocked dialog** — *Make someone else an owner first* | A choice: hand it over, or destroy it |
| The only member | Typed confirmation, deletes the household | A statement, not a choice — but it must be visible |

**One blocked dialog is a step; five is a wall.** That is the whole argument for a pre-flight: it turns every block into a choice and every choice into one row, then asks once at the end rather than five times on the way.

**Sample throughout:** Justin Tadlock, in five households — owner of three, two of those shared with other people.

---

## I · Where it lives — a pushed *Your account* pane

`future-ideas` left three options. The third (a settings page outside the drawer) was dismissed there and stays dismissed: the app does not have one and should not grow one for this. Of the other two, **the pane wins**.

The identity row in the account menu **loses its pencil, gains a chevron, and becomes the door.** The pane holds the display name, *Change your picture* when it exists, **Download your data**, and **Delete account** at the foot of the account card under a hairline. The account row stays visible beneath it, as it does beneath Members and Announcements.

- **It is the fourth use of a construction that already exists** — Members, Administration, Announcements, and now this. `announcements-and-blog` priced the second at *nothing new except a dot*; the fourth costs nothing at all.
- **`Delete account` sits inside the account's own card, under a hairline — exactly where *Leave household* sits inside the Household card.** That parallel is the argument, not a coincidence: this *is* leaving, at the scale of every household at once.
- **It answers the menu's ceiling instead of walking into it.** *Announcements* put the menu at four rows and named the fifth as the point where the construction stops being a menu — naming account deletion as the thing that would bring the question back. It came back; this is the answer.
- **Export needed the same home.** Two account-scoped rows arrived in one week (section V). A menu absorbs one at a push; a pane absorbs both without being asked.

### The cost, and it is one thing

**The display name moves out of the menu.** *Settings tab* put it there on purpose — *no modal, no profile screen; it is where you already were* — and the pencil cannot live in two places.

**The idiom survives intact**: a read-only row that flips in place, no modal, Escape cancels, no toast. What changes is the surface it happens on, one push further in. That is the trade, and it is the thing to watch on a real screen.

### What lost — a crimson row in the menu

Kept on board 1, drawn, with its costs:

- **Five rows and an identity block, about 305px**, opening upward from a drawer foot already 72px off the bottom of the window. It is precisely the fifth row the ceiling was about.
- **Three hairlines in a 292px panel** — the grouping *Announcements* refused. *Sign out* cannot share a group with this, and this cannot sit above it: the app puts its most destructive row at the foot, under a rule, everywhere it has one.
- **The most destructive action in the app ends up one row from the most routine one.** Nothing else in Larder Log puts those two within 36px of each other.
- It was the cheap answer, and it stays on the record as the fallback if the pane's one cost turns out to be the worse trade.

---

## II · The pre-flight

**520 rather than the confirm's 420**, because it carries a list.

### Two groups, not a tail line

`admin-console.md` describes *a tail line for the ones where nothing has to be decided*. In the app that flattens three different facts into one sentence, so it becomes two groups:

**`NEEDS A DECISION`** — one row per household you own that other people use. Tile, name, `4 members · 47 items`, and one trigger.

**`NOTHING TO DECIDE`** — on the sunk fill, quieter, and still visible:
- *The Lake Cabin* — **Only you are in it, so it goes with your account. 34 items.** In the **out text** colour, on a screen where nothing is pressable to fix it.
- *The Shop* and *Mom's Pantry*, on one row — **You'll leave both. Nothing in them changes.**

**A household being destroyed is not the same fact as a household being left**, and a sole-member household is destroyed. It gets a row and a number.

### One trigger, not two chips

*Transfer* and *Delete* look like a pair until you notice that transfer needs a **name** — so it is one question with several answers, which is a menu.

- At rest the trigger reads **Choose ⌄**, surface fill on a `line strong` edge.
- Chosen, it takes the inversion every selected control in this app uses and **says what was chosen** — *Sarah Calfee* with an 18px avatar, or *Delete it*.
- **The row's meta line becomes the consequence**: *Sarah Calfee becomes the owner.* / *128 items, 4 locations and 9 types go permanently.* — the second in the out text colour. The body naming what is lost is the confirm's own rule, applied per row.
- **A row set to delete gains a ghost `Export it first`** beside its trigger. Section V.

### The footer

`Cancel` · **Continue**, disabled until every row has an answer, with *Both decisions are needed before you can go on.* in meta beside it.

> **The primary is the one in the app that does not name a destructive verb.** Every other confirm says *Revoke invite*, *Leave household*, *Delete household*. Pressing this one destroys nothing — the verb is on the next screen, and putting it here would make the pre-flight a second confirmation.

> **The disc is amber, not crimson.** This screen is the blocked dialog turned into a choice, so it keeps the blocked dialog's disc. Amber is *hold on*; this is the last screen where that is still true.

**When there is nothing to decide at all** — you own nothing, or you are in no households — **the pre-flight does not appear** and the confirmation is the whole flow. A screen whose only content is *nothing to decide* is the control that can only disappoint, one level up.

---

## III · Ownership transfer

**The capability the app does not have.** The role menu can *add* an owner; nothing hands one over, and your own row carries no control at all — so there is nowhere to step yourself back from. Deletion forces it, and once it exists the console's **orphan dialog** has something to call, which is why `future-ideas` records it as blocking two things.

### Promote is not transfer

Setting someone to **Owner** adds an owner. **Transfer ownership** hands it over: they become Owner and *you* become an Editor.

**It is a row in the role menu**, under its own hairline, above *Remove from household*. Ordinary drawer body text, **not crimson** — nothing is destroyed, and ghost-plus-crimson-text is how this app *offers* destruction.

> **Both in one menu is the risk, and the label carries it:** *Owner* is a role you set, *Transfer ownership* is a thing you do. If that is too fine a distinction on a real screen, transfer moves to the Household card beside *Leave household*, where the verbs already live.

### The picker, in the pre-flight

**Cream, because it opens on a card** — the console's rule already decides this. 284px, the sort menu's construction: 6px padding, radius-9 rows, hover fill.

- **No row is marked as current, because there is no current value.** The sort menu and the role menu both check the value you are on; a transfer has no incumbent — every row is a thing that has not happened yet. The check comes off and hover is the only state the rows have.
- A **micro-label header**, `TRANSFER IT TO`, which **no menu in the app has**. Two kinds of row — three people and one destruction — and without it the delete row reads as a fourth person. The hairline alone was not enough on the board.
- **Every member is offered, whatever their role.** Receiving it promotes them, and the confirm says so. Filtering to existing owners would hide the only candidate in a household that has exactly one.

### Its confirm

420 shell. Title **Make Sarah Calfee the owner?** Body: *She'll be able to rename Calfee Household, invite people, change roles and remove members — including you. You become an Editor, and only she can hand it back.* Footer: `Cancel` · **Transfer ownership**.

> **The disc is crimson, though nothing is destroyed — and that generalises the ramp.** A **blocked** dialog is amber because it is a *precondition*. A confirm is crimson because it is *final*. Losing ownership passes the second test and fails the first, so the ramp is picked by **finality**, not by data loss. The existing two users generalised, not a new rule.

**Nobody tells Sarah.** There is no person-to-person channel in the app — announcements are app-to-person, toasts are for what *you* did, and email is a pipe `future-ideas` has priced and nobody has built. She finds out in Members. Recorded as a gap, and sharper now that a transfer can arrive because someone deleted their account and left.

---

## IV · The confirmation, and what it leaves

**One confirmation over the whole thing rather than a sequence of them** — the reason the pre-flight exists. 520, matching the pre-flight, because they are one flow.

- **Title:** *Delete your account?*
- **Body:** *Your display name, email and picture go permanently. You leave five households, and two of them go with you.*
- **A recap block** on the sunk fill — the pre-flight's own rows, read-only, triggers gone.
- **Three meta lines**, each answering a thing everyone will assume:
	- *The two pantries other people keep are untouched — nothing in Larder Log records who added what, so there is nothing of yours in them to remove.*
	- *This does not touch your Gravatar account. Signing in with it created this one; deleting this one doesn't reach back.*
	- **It happens straight away. There's no waiting period and nothing to undo.**
- **The field:** *Type `Justin Tadlock` to confirm.* — the composer's 40px field at radius 11.
- **Footer:** `Cancel` · **Delete account**, disabled until it matches exactly.

> **The display name, not the email.** A typed confirmation buys a beat of deliberation, not authentication — it is a rhythm-breaker, and nobody has ever been stopped by one they could paste. So it takes the name a person thinks of as theirs, and the one the rest of the household has been seeing. The email would be more precise about *which* account and worse at the only job the field has.

> **The body is a list, which is new.** Every other confirm's body is *two lines at most*, because it names one thing that is lost. This one names five households in three fates, and a sentence that tried would be the worst paragraph in the app.

### There is no hold, and that is a decision

**Deleting is immediate.** The industry default is a thirty-day grace period, and it was drawn in full: three cards, a countdown, a *Keep my account* primary. It is gone.

**If someone wants to delete their account, that is their decision — the app does not hold onto people who have said no.**

> **The design cost of the hold was never the three cards.** A held account is *already out* of its households — the alternative, holding the memberships too, would have left Sarah owning a household provisionally for a month and Granny's in limbo waiting to find out whether it still exists, and **a grace period that reaches other people is not a grace period.** So the honest version gives you back, thirty days later, an account with nothing in it. A month of ambiguity for a consolation prize is the worse trade, and the typed confirmation is where the deliberation belongs.

**The accepted cost, stated:** someone who deletes by mistake has no recourse, and there is no support path because there is nothing left to restore. That is the same trade the app already makes for *Delete household*, one level up.

### The card it leaves you on

The 440 shell, outside the app. Eyebrow `ACCOUNT DELETED`, a **neutral** disc — sunk fill, `line` ring, meta glyph, the console's 404 rule that a disc takes no status colour when it is making no claim about a pantry. *Your account is gone.* · *Calfee Household is Sarah Calfee's now. Granny's and The Lake Cabin have been deleted. Nothing here is recoverable.* · *Signing in with Gravatar again would start a new account, with nothing in it.* · **Back to larderlog.com**.

**No toast** — there is no app left to show one in. The card is the confirmation, and it is the fifth settled case under *States an SPA hits constantly*.

---

## V · Export is two features

`future-ideas` pairs export with deletion and calls it *here is your pantry as a CSV*. Drawing it against the deletion rules **splits it in half**, because the pantry is the one thing this flow has established **is not yours**.

| | Where | What it is |
|---|---|---|
| **Download your data** | The account pane, `YOUR DATA` | `display_name`, `email`, `member_of[]`, `invites_issued[]`. **Four fields, because there is nothing else** — no per-item authorship means an account has almost no data to hand back. A legal obligation, not a feature |
| **Export the pantry** | Settings → **Pantry settings**, under the low-at default | The household's rows as CSV. The one anybody wants, and it belongs to the household — so it survives your deletion |

**Pantry settings, not Preferences**: *scope is in the label* already decides it. **Owners and editors** — a Viewer reading a household is not the same as a Viewer taking a copy of it away, and that is the one place in the app where reading and exporting come apart. It joins the Viewer gap.

**One file, no picker.** A format choice is a question nobody has an opinion about. Terms come out as their names rather than their ids, and an empty store is an empty cell, exactly as `NO STORE` is a real state.

> **These are the columns *Paste your list* should read.** `bulk-entry.md` parses a name, a count and a size and deliberately never guesses a location, store or type. Export is the shape an import could accept — moving a pantry between households, which nothing today can do.

> **Neither is a backup, because nothing imports one back.** Saying so is cheap; the alternative is someone deleting a household they thought they had saved.

**Where the two meet:** a pre-flight row set to **Delete it** carries a ghost **Export it first**. It appears only on a row set to delete — the only moment in the app where a pantry is about to stop existing and someone is looking straight at it. A row set to transfer does not get it: the household keeps its own copy and its own export row.

---

## Motion, keyboard and screen readers

- Both dialogs take the confirm shell's motion unchanged — scrim 160ms, dialog 180ms `scale(.96) → 1`, out 120ms fade, reduced motion → fade.
- **The pre-flight is `role="dialog"`, not `alertdialog`.** It is a form with a decision in it; the confirmation is the alert. That distinction has not been needed before, because every modal in the app was a question with two answers.
- **Initial focus on the pre-flight is the first trigger**, not Cancel — the disabled *Continue* is already the guard, the same reasoning the typed confirm uses to focus its field.
- The picker is the sort menu's keyboard behaviour, which `ui-designs` lists as still only *implied*. This is the third menu waiting on that pass.
- The recap block is a `<ul>`, and each row's consequence is in its text rather than in its colour: *Granny's — deleted, 128 items* reads the same to a screen reader as it does on the screen.

## Tokens

**No new colours and no new type.** Out tokens for the destructive discs and the consequence lines, low tokens for the pre-flight, the neutral sunk/`line` disc for the card at the end. The trigger is the shopping-list trigger's shell; the picker is the sort menu; the field, the pill and the disabled primary are the typed confirm's, unchanged.

## Deltas that leave this doc

1. **`Settings tab → Your account` becomes a pane.** The identity row in the menu loses its pencil and gains a chevron; the display-name composer moves into the pane. The menu is identity-as-door, Announcements, Admin, *Change your picture*, Sign out.
2. **`Settings tab → Changing a role` gains a row**: *Transfer ownership*, under its own hairline above *Remove from household*.
3. **`Settings tab → The root pane` gains a row** under Pantry settings: *Export the pantry*.
4. **`Destructive actions` gains a third typed confirmation**, and its table gains two rows — *delete account* (pre-flight, then typed confirm, no undo) and *transfer ownership* (confirm modal).
5. **`Destructive actions` — the icon-disc ramp is generalised**: amber for a precondition, crimson for anything final, whether or not data is destroyed.
6. **`Flows outside the shell` gains one card** — *Your account is gone* — and with it the app's first screen that is neither signed out nor signed in, and the second to carry a disc with no status colour.
7. **`admin-console.md` is contradicted in two places, and this doc wins.** *Needs attention* lists **awaiting deletion**, and the Activity log's *Automatic* actor is defined as *an account deleted after its hold*. **There is no hold**, so neither state exists: the console's stat card drops that row, and *Automatic* is left with nothing to attribute — unless the console's own admin-initiated deletions keep one, which is a decision for that doc rather than this one.
8. **`admin-console.md → Deletion flows` needs one correction.** *Same dialog, two places. Only the title changes* is no longer true: the app's pre-flight has two labelled groups where the console's has a tail line.
9. **`future-ideas.md → What blocks what` loses the Delete account row.** Ownership transfer is designed.
10. **`Gaps → Viewer role` gains a line.** A Viewer can delete their account, owns nothing, and therefore never sees a pre-flight — the one flow the read-only cut simplifies. The Viewer's *export* is the open half.
11. **`Gaps → States an SPA hits constantly` gains a fifth settled toast case**: account deletion gets none, because there is no app left to show one in.

## Gaps and open questions

- **A pre-flight that has to scroll.** Five households is drawn. Eleven scroll, and a dialog that scrolls has to decide whether its footer is pinned. First thing to draw if this ships.
- **Display names are neither unique nor stable**, which the typed confirm now leans on. Someone called *J* gets a one-character confirmation; someone who renamed themselves this morning types the new one. Both are fine for a rhythm-breaker and neither is fine for anything more — worth stating out loud so nobody later mistakes the field for a check. It also collides with **display-name validation**, which `ui-designs` already lists as undecided: a length floor was optional before and is load-bearing now.
- **The typed confirm with a keyboard up at 390.** It is the taller of the two dialogs and its field sits near the bottom, above the footer pair. The one place in this flow where the centred choice may not hold, and it is not drawn.
- **Concurrency.** Sarah leaves the household between the pre-flight and the confirmation; another owner deletes the household you just chose to transfer; two owners delete their accounts the same afternoon. All of it lands with the rest of `Gaps → Failure`.
- **Nobody is told they now own a household.** Named above; no channel exists.
- **Does an administrator deleting someone else's account get the same pre-flight?** The console draws it, so structurally yes — but choosing a transfer target on someone else's behalf is a decision the console has never claimed the right to make.
- **Retention beyond the account.** `admin-console` keeps Activity rows for 24 months with the actor rewritten to *Deleted account*, and `future-ideas` asks whether trends history dies with the account. Both land here, and both want the lawyer's read the console already flagged — more urgently now that there is no hold to soften an immediate erasure.
- **Deleting the last account in a household that has live invites out.** The invites belong to a person who no longer exists; presumably they die with the membership, and nothing says so.

## Boards

| # | Board | What it holds |
|---|---|---|
| 1 | **Where it lives — the account pane** | The four-row menu, the pane at 340, and the crimson menu row that lost with its costs |
| 2 | **The pre-flight** | As it arrives and decided; the two groups; the disabled primary; *Export it first* |
| 3 | **Ownership transfer** | The picker open on a pre-flight row, the role menu's new row, and the transfer confirm |
| 4 | **The confirmation, and what it leaves** | Empty field and matched, the recap block, the card you land on, and why there is no hold |
| 5 | **Export** | Both rows in their two homes, the CSV, and *Export it first* |
| 6 | **390** | The pre-flight, and the pane in the slide-over |

**Sample data:** Justin Tadlock and five households — Calfee Household (terracotta, 4 members, 47 items), Granny's (brick, 3 members, 128 items), The Lake Cabin (slate, sole member, 34 items), The Shop (teal) and Mom's Pantry (olive). Member names are invented; the counts agree across all six boards.
