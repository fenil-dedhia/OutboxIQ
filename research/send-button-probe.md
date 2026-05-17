# §5.5.1 Regular "Send" Button Probe

**Date:** 2026-05-16
**Status:** ⏳ Written, not yet run. **Gates §5.5.1 implementation** — no
interception code is written until this probe runs clean on live Gmail
(Entry-2 / Entry-23 spike-gating: §5.5.1 is the single highest-criticality
change in the product — a bug means users cannot send email).
**Depends on:** `research/scheduled-send-api-spike.md` (the verified
`jsaction` recipe + the locale-independent-anchor lesson) and
`research/pick-date-time-probe.md` (probe artifact shape, Entry 9). This
probe reuses the spike's recipe primitives 1:1.
**Why this matters:** §5.3 intercepts *Schedule Send* — blocking it early
and opening a dialog late is safe and fully reversible (nothing is sent).
§5.5.1 intercepts the **primary Send button and Ctrl/⌘+Enter**, where the
action is **irreversible**: if we block too late, or fail to replay, or
suppress the wrong thing, the user either can't send or sends something
they didn't mean to. PRD §5.2.3 ("never block native Gmail") is a hard
rule. Every branch of the interception must either complete the user's
intent or fall through to native Send. The primary-Send DOM and its event
timing are **completely unverified** — this probe de-risks that before any
code.

This document is a **canonical recipe reference**, same role as the spike
doc and the pick-date-time probe. When Gmail breaks the Send path
post-launch, re-run this probe to rediscover selectors and event timing.

The runnable script is **`research/send-button-probe.js`** (single source).
This file is the how-to-run + context + planned-design + result log; it
does not duplicate the script.

---

## What this probe answers

The five unknowns §5.5.1 cannot be designed around until they are verified:

1. **Primary Send button selector**, across **new compose**, **inline
   reply**, and **pop-out compose**. Is one selector stable across all
   three, or are context-aware variants needed? (`discover()` anchors off
   the *already-verified* chevron — Send is the chevron's sibling
   role=button in their shared group — and also cross-checks an independent
   attribute heuristic; it reports the `jsaction` so we can pick a
   locale-independent anchor, per the §5.2 lesson.)
2. **Ctrl/⌘+Enter keyboard path.** Where does the keydown fire, does it
   reach a document-level capture listener before Gmail sends, and does
   Gmail act on `keydown` (vs `keyup`)? (`watch()` + `armSuppress()` cover
   keydown/keyup at document capture and bubble.)
3. **Send click vs. Schedule-Send chevron click.** They are sibling
   elements in one control. `discover()` shows them as distinct siblings
   with distinct attributes so the interceptor can match Send and never the
   chevron.
4. **Capture-phase interception behaviour.** Does a capture-phase document
   listener fire before Gmail's own handler? What is the **earliest event
   Gmail acts on for Send** (`pointerdown`? `mousedown`? `click`?) — we
   must intercept at or before it. Does `preventDefault()` +
   `stopImmediatePropagation()` actually suppress the send? What does
   "replay native Send" look like in practice (the fail-toward-send path
   and the "Send now anyway" choice)? (`watch()` reveals the event
   ordering; `armSuppress()` proves suppression; `testReplay()` proves
   replay.)
5. **Multi-compose scoping.** Each Send button lives inside its own compose
   pane, so this should be simpler than the chevron's detached-menu anchor
   problem (the §5.2 launch-blocker). `discover()` enumerates every
   compose, shows each Send button's compose-scoping ancestor, and prints a
   verdict on whether they are distinct subtrees.

---

## The planned interception design (this is what the probe gates)

Recorded here so the **probe-gate checkpoint** has a concrete spec to
judge findings against. If the probe contradicts a load-bearing assumption
below, **stop and re-clear — do not improvise** (see Success/failure).

- **Synchronous decision, cached config.** §5.5.1's verdict must be made
  *synchronously inside the event handler* — we cannot `await
  chrome.storage` before deciding whether to `preventDefault`, because by
  then Gmail may have sent. So working-hours/timezone config is read once
  at install and kept in memory (refreshed via `chrome.storage.onChanged`).
  "Now" is computed fresh at click time (`nowWallInTimeZone`). This means
  we only ever touch a Send when we are *certain* there is a violation —
  the overwhelming majority of in-hours Sends are never intercepted (true
  §5.2.3 compliance).
- **Capture-phase, compose-scoped, at the earliest event Gmail acts on.**
  A document capture-phase listener on the event(s) the probe identifies as
  load-bearing (expected: `mousedown` + `click` like the §5.2 interceptor;
  plus `keydown` for Ctrl/⌘+Enter). Match the clicked Send button via
  `e.target.closest(<send selector>)`, scoped to the owning compose pane
  (probe Q5). Never match the chevron (probe Q3).
- **Reuse the §5.5 calc unchanged.** `checkWorkingHours(now,
  workingHours)` — the module already computes the full verdict and its
  CONSUMERS doc-block already lists §5.5.1. **§5.5.1 acts on the FULL
  verdict (working-hours OR absolute)** — the locked split: contrast §5.3
  Schedule Send, which acts on absolute only. An *immediate* off-hours Send
  is plausibly unintended; a deliberate off-hours *schedule* is the point.
- **`verdict.ok` → do nothing.** No `preventDefault`; native Send proceeds
  untouched. Zero added friction to the core action.
- **Violation → soft-warning modal** (the existing `WorkingHoursWarning`
  component, locked 3-option pattern). `requested` = now. The three
  choices:
  - **(1) Reschedule to [boundary]** — converts the immediate Send into a
    *Schedule Send* at the snap time, driving the existing
    `scheduleAt`/`schedulePreset` recipe. This inherits the §5.2
    multi-compose caveat (the schedule recipe uses the detached
    chevron→menu→dialog path); with ≥2 composes it falls back exactly as
    §5.2's safety net does.
  - **(2) Send now anyway** — **replay the native Send** (probe Q4's
    replay path) with our interception suppressed, so Gmail sends
    immediately. This is the user's explicit original intent.
  - **(3) Cancel** — dismiss; the Send stays prevented; the user is back
    in compose to adjust. Nothing is sent or scheduled.
- **Fail-toward-send.** This is the inverse of §5.3's default. §5.3 fails
  toward the native *Schedule* dialog (the user wanted to schedule).
  §5.5.1's user clicked **Send** — so *any* failure in our path (config
  unavailable, modal mount/render throws, recipe error) must **replay the
  native Send** so the email goes. The user is never stranded and never
  silently blocked from sending. The error boundary already around the
  modal (Session 5) routes a render-throw to this replay rather than the
  Schedule-dialog handoff used for §5.3.

The two assumptions in this design that the probe MUST confirm before any
code: **(a)** a capture-phase document listener fires before Gmail's Send
and can suppress it (`armSuppress()` → "NO send"); **(b)** replaying the
Send (plain or full recipe) actually sends (`testReplay()` → "sent"). If
either fails, the design does not hold — stop and re-clear.

---

## Prerequisites (read before running)

- **Use a throwaway / test Gmail account** for `armSuppress()` and
  **especially** `testReplay()`. `testReplay()` sends a real email;
  `armSuppress()` fails in the safe direction (a send that doesn't happen)
  but sends for real if suppression *fails*.
- **Gmail UI language = English.** The chevron anchor
  (`aria-label="More send options"`) is locale-dependent — the same
  accepted risk §5.2 already carries. The probe reports the Send button's
  `jsaction` precisely so we can judge whether a locale-independent anchor
  exists for the shipped code.
- For `armSuppress()` / `testReplay()`: open **one** compose with **To,
  Subject, and Body filled** (a fully-composed draft; addressed to
  yourself). An empty subject/body makes Gmail throw a native
  `window.confirm()` we can't drive.
- For `watch()`'s safe first run: **empty the To field** — Gmail runs its
  send handler then aborts on the missing recipient, so you observe the
  full event ordering with no email sent.
- The script is `research/send-button-probe.js` — open it, Select All,
  Copy. It defines `window.OutboxIQSendProbe` and prints usage on paste;
  it does **nothing** until you call a function.

---

## How to run

Run the four steps in order and paste **all** console output back to
Claude after each. **Do not guess or improvise if anything is ambiguous —
report it and stop** (the §5.5.1 risk does not tolerate improvisation).

### Step 1 — `discover()` (SAFE: dumps DOM, never sends)

```text
OutboxIQSendProbe.discover()
```

Run it **once with a single compose open**, then **again with two composes
open** (for the multi-compose verdict). Then run it once **in an inline
reply** and once in a **pop-out compose**. Report, for each context, the
`MULTI-COMPOSE VERDICT` line (when 2 composes), the `AGREE` line, the Send
button's `jsaction` / `aria-label` / `data-tooltip`, and the table.

### Step 2 — `watch()` (SAFE with empty-To: observe the event sequence)

```text
OutboxIQSendProbe.watch()
```

Then, while it's watching: **(a)** empty the To field and click **Send** —
observe the logged `CAPTURE`/`BUBBLE` sequence; **(b)** press
**Ctrl+Enter** (or **⌘+Enter** on Mac) — observe the keyboard path. Copy
every `[sendprobe]` line. The load-bearing facts: which event type Gmail
acts on, and that a `CAPTURE`-phase line appears *before* any send.
`OutboxIQSendProbe.stop()` ends it early.

### Step 3 — `armSuppress()` (suppression test; throwaway account)

```text
OutboxIQSendProbe.armSuppress()
```

With one fully-composed throwaway draft: click **Send** once (or press
Ctrl/⌘+Enter). Report the `SUPPRESSED at:` line **and** whether the email
actually sent (expected: **NO** — compose still open, no "Message sent"
toast). This is the single most important result: it proves a capture-phase
listener can stop Gmail's Send.

### Step 4 — `testReplay()` (DESTRUCTIVE: sends a real email)

```text
OutboxIQSendProbe.testReplay()
```

On a fully-composed throwaway draft. Confirm whether the email sent. If it
did **not** with the plain path, escalate:

```text
OutboxIQSendProbe.testReplay({ full: true })
```

Report which path (plain vs full recipe) actually sent the email. This
proves the "Send now anyway" + fail-toward-send path is realisable.

---

## Success / failure / fallback

- **Success:** `discover()` yields a stable Send anchor (ideally
  locale-independent via `jsaction`) distinct from the chevron and
  compose-scoped; `watch()` shows a capture-phase document listener fires
  before Gmail's send and identifies the earliest load-bearing event;
  `armSuppress()` confirms suppression (**NO send**); `testReplay()`
  confirms replay sends. → The planned design holds; Claude implements
  §5.5.1 against the reported anchor + event(s).
- **Partial:** e.g. the Send button is found and suppressible but only a
  context-aware selector works, or only the full recipe replays. → We have
  a viable path with a documented complication; Claude folds the
  complication into the design and proceeds (no re-clearance needed if the
  two load-bearing assumptions both hold).
- **Failure (any of these → STOP, do not write §5.5.1 code, surface to
  Fenil for re-clearance — Entry-2 discipline mid-session):**
  - Capture-phase does **not** fire before Gmail's send / cannot suppress
    it (`armSuppress()` → email sent anyway).
  - Gmail acts on an event we can't intercept cleanly (e.g. sends on
    `pointerdown` before `mousedown`, or the keyboard path bypasses
    document listeners).
  - Replaying the Send does **not** send by any path (`testReplay()` both
    modes fail) — "Send now anyway" / fail-toward-send would be
    unimplementable.
  - The Send button is **not** compose-scoped (shares the detached-menu
    failure mode), making safe multi-compose targeting impossible.
  Any of these **invalidates the planned interception design**. Per the
  task's probe-gate clause and Entry 2: Claude **stops and brings the gap
  to Fenil** with options — it does **not** improvise an alternative
  interception strategy under implementation pressure.

---

## Result log

### 2026-05-16 — Session 6, Fenil hands-on (consumer Gmail, English, macOS) — IN PROGRESS

**Discovery (Q1, Q3, Q5) — verified, clean:**

- Send button found in **new-compose, two-compose, and inline-reply**
  contexts (pop-out run still owed). In every run the two independent
  heuristics **AGREE ✅** (chevron's sibling `[role="button"]` in the shared
  `div.dC` group == the attribute match). Send is a `div[role="button"]`,
  classes `T-I J-J5-Ji aoO v7 T-I-atl L3` (vs chevron `… hG …`; only the
  obfuscated `aoO`/`hG` differ — too fragile to anchor on alone),
  **no `jsaction`**, `aria-label`/`data-tooltip` = `"Send ‪(⌘Enter)‬"`
  (locale-dependent, same accepted risk as the chevron anchor). Has a
  `jslog` (logging, not an action hook). **Anchor decision: structural —
  the non-chevron `[role="button"]` in the chevron's `div.dC` group**
  (locale-tied only to the already-accepted chevron anchor), `aria-label`
  ~ `/^Send/i` as a secondary cross-check.
- **MULTI-COMPOSE VERDICT: ✅ DISTINCT.** Two composes → each Send button in
  its own `table.aoP.*` subtree (`table#:8a` vs `table#:gx`). Send is
  in-pane / compose-scoped — **not** the §5.2 detached-popup problem. Q5
  resolved favourably.

**Event timing (`watch()`, Q2/Q4) — capture fires first, but not proof:**

- Mouse on Send: `CAPTURE mousedown defaultPrevented=false` →
  `BUBBLE mousedown defaultPrevented=true`. Gmail reacts at **mousedown**,
  in target/bubble, *after* our document-capture listener. `click`/`mouseup`
  stayed `defaultPrevented=false`.
- Keyboard: `CAPTURE keydown key="Enter" meta=true defaultPrevented=false`,
  then **no bubble keydown** (Gmail consumed it after our capture listener).
- ⇒ A capture-phase document listener *sees* both paths before Gmail acts.
  Predicts (does not prove) suppression is possible.

**Suppression (`armSuppress()`, Q4) — AMBIGUOUS (one-shot too blunt):**

- B1 (button): probe ARMED (1 compose), `SUPPRESSED at: mousedown (capture)`
  `defaultPrevented=true` — **yet the email sent.**
- Not Interpretation A (it did arm + catch). Either **B** (capture-phase
  fundamentally cannot stop Gmail's Send → design-invalidating) or **C**
  (one-shot `armSuppress` killed only `mousedown` then *disarmed*; Gmail's
  `T-I…L3` button finalises on a later event of the same gesture —
  consistent with the spike's chevron "needs the full mouse sequence" —
  which the disarmed probe let through). `watch()` leans C (Gmail acts in
  bubble, which capture-stop *should* prevent) but a lean is not proof.
- **Action taken:** added `armBlockGesture()` — blocks the **whole** gesture
  (all pointer/mouse events on Send + ⌘/Ctrl+Enter) at capture for N
  seconds, not one-shot. This is the B-vs-C disambiguator. Diagnostic-only
  change (Entry-9 re-runnable-probe discipline; mirrors the pick-date-time
  probe's mid-session `live()` fix). **No §5.5.1 implementation code
  written — probe-gate held.**

**Gesture-block (`armBlockGesture()`, Q4) — ✅ C CONFIRMED, suppression works:**

- Run ×2, full gesture blocked at capture (pointerdown/pointerup/click ×N +
  ⌘+Enter keydown ×N), all `defaultPrevented=true`. **No email sent either
  time** — not by button, not by keyboard. (Note: blocking `pointerdown` at
  capture cascades to suppress the compat `mousedown`/`mouseup`; the real
  gesture Gmail uses is **pointerdown → pointerup → click**, and Gmail
  finalises the send on the *later* event — which is why one-shot
  `armSuppress` (mousedown-then-disarm) leaked.)
- ⇒ **Capture-phase document interception reliably stops Gmail's Send (mouse
  AND ⌘/Ctrl+Enter).** Interpretation **C** (one-shot was too blunt), not B.
  The §5.5.1 planned design **HOLDS**. Production requirement: intercept the
  **whole gesture** (pointerdown/mousedown + pointerup/mouseup + click) +
  keydown, not a single event — a superset of what the §5.2 interceptor
  already does (mousedown+click).

**Gate status:** the make-or-break unknown (can capture-phase suppress
Gmail's Send?) is **resolved YES**. Q1 (new/2-compose/inline ✅, pop-out
owed), Q3 ✅, Q5 ✅, Q4-suppress ✅. **Still owed before code:** pop-out
`discover()` (Q1 completeness, safe) and **`testReplay()`** (Q4 replay path
— load-bearing: "Send now anyway" + fail-toward-send both require
re-driving the native Send; destructive, throwaway acct). No §5.5.1
implementation written until those two close.
