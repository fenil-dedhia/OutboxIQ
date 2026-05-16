# "Pick date & time" Custom-Path Probe

**Date:** 2026-05-16
**Status:** ✅✅ Verified end-to-end on consumer Gmail (2026-05-16, Session 4). The custom "Pick date & time" path **schedules a real email** via the recipe (Gmail toast "Send scheduled for Thu, Dec 31, 9:00 AM" + Scheduled-folder count). All three compose contexts pass. See Result log.
**Depends on:** `research/scheduled-send-api-spike.md` — this probe extends the spike's verified preset-path recipe to the **custom "Pick date & time" path**, which the spike explicitly left unverified (Open Question 2 / OQ2 closing note).
**Why this matters:** OutboxIQ almost never schedules at one of Gmail's three native presets — recipient-timezone optimization and working-hours rescheduling produce *arbitrary* timestamps. The custom path is therefore the **primary** scheduling path for this product, not an edge case. If the verified recipe does not drive the custom date/time fields, the entire §5.3 Schedule-button design changes. This probe de-risks that before any custom-path code is written.

This document is a **canonical recipe reference**, same role as the spike doc. When Gmail breaks the custom path post-launch, re-run this probe to rediscover selectors.

The runnable script is **`research/pick-date-time-probe.js`** (single source). This file is the how-to-run + context + result log; it does not duplicate the script.

---

## What this probe answers

1. Does the spike's verified recipe (inner-content target via `elementFromPoint`, real `clientX/clientY`, full pointer→mouse→click sequence) also reach the **"Pick date & time"** control inside the Schedule send dialog?
2. What is the DOM shape of the custom picker — the **date input**, the **time input**, and the **confirm button** — and what stable, ideally locale-independent selectors can we anchor to?
3. Can those inputs accept **programmatic values** (native value setter + `input`/`change`), and does the confirm button, driven by the recipe, produce a **real native scheduled message**?
4. **(§5.2 support)** What is the internal DOM shape of the `div[role="menuitem"][selector="scheduledSend"]` item — specifically *where the visible label text lives* — so the §5.2 relabel ("Schedule Send (powered by OutboxIQ)") targets the right node instead of guessing?
5. **(§5.2 support)** Is the `selector="scheduledSend"` anchor present and reachable identically across the three compose contexts: **(a)** standard new-compose, **(b)** inline reply, **(c)** pop-out compose? Run `anchorCheck()` once in each.

---

## Prerequisites (read before running)

- **Use a throwaway / test Gmail account** if you intend to run the destructive `live()` step — `live()` creates a real scheduled email.
- Open a **compose window with To, Subject, and Body all filled in.** The spike noted that an empty subject/body makes Gmail throw a native `window.confirm()` we cannot suppress; a fully-composed draft avoids it. Address it to yourself or a test address.
- **Gmail UI language = English.** Two anchors the probe uses are locale-dependent and called out in the script (`aria-label="More send options"`, `[role="dialog"]` selection by `aria-label`). The `selector="scheduledSend"` attribute is locale-independent (per the spike). The probe reports which anchor it actually matched so we can judge locale risk for the shipped code.
- The script is `research/pick-date-time-probe.js` — open it, Select All, Copy. It defines `window.OutboxIQProbe` and prints usage on paste; it does **not** do anything until you call a function.

---

## How to run

Two phases. **`discover()` is safe** (navigates menus and dumps DOM; never sets a value, never confirms — no email is scheduled). **`live()` is destructive** (sets a real future date/time and clicks confirm — a real scheduled email is created; cancel it afterward from Gmail's Scheduled label).

```text
OutboxIQProbe.discover()
```

Run that first. It opens the chevron → "Schedule send" → clicks "Pick date & time", then prints a structured report of every candidate input/button in the picker. Copy the **entire console output** back to Claude.

`discover()` also dumps the **`scheduledSend` menuitem's internal structure** (for the §5.2 relabel) right before it clicks it — look for the `MENU ITEM (relabel target)` section in the output.

**For §5.2 compose-context coverage**, run this **once in each** of the three contexts — standard new-compose, inline reply, and pop-out compose (open the relevant compose UI first, then run):

```text
OutboxIQProbe.anchorCheck()
```

It is fully safe (opens the More-send-options menu, reports whether the `selector="scheduledSend"` anchor is present + visible, dumps its structure, and closes nothing destructive). Report the one-line verdict from each of the three contexts.

Then, only if `discover()` cleanly reached the picker, optionally:

```text
OutboxIQProbe.live({ date: "2026-12-31", time: "9:00 AM", confirm: false })
```

`confirm: false` (the default) sets the field values via the recipe and stops **before** clicking the confirm button — so you can eyeball whether Gmail accepted the values without scheduling anything. Re-run with `confirm: true` to drive the full path and actually create the scheduled message. Use a date/time format that matches what `discover()` reported the inputs currently show.

Report back: which anchors matched, the full picker dump, whether values stuck, and (if `confirm: true`) whether a message landed in the Scheduled label.

---

## Success / failure / fallback

- **Success:** `discover()` reaches the picker and reports stable selectors; `live({confirm:true})` produces a real scheduled message at the chosen custom time. → Claude wires §5.3.4 against the reported selectors.
- **Partial:** picker reached and dumped, but values don't stick or confirm doesn't fire with the recipe. → We have selectors but a value-setting problem; bring it back for the fallback-ladder decision.
- **Failure:** the recipe can't even reach "Pick date & time". → Fallback ladder (from the approved Session 4 plan): (a) preset path for preset-aligned times; (b) pre-fill then hand off to Gmail's native picker for the user to confirm; (c) ship presets-only this session and treat custom-path automation as a focused follow-up spike. **Claude stops and brings this decision to Fenil — does not improvise.**

---

## The probe script

The script is **`research/pick-date-time-probe.js`** — the single source. It is self-contained, defines `window.OutboxIQProbe`, and mutates nothing until you call `discover()` / `anchorCheck()` / `live()`. It deliberately mirrors the spike's exact recipe (and `extension/src/lib/schedule/gmail-recipe.ts`) so a clean result genuinely de-risks the shipped module.

---

## Result log

### 2026-05-16 — consumer Gmail, Session 4 (Fenil hands-on, English UI) — ✅ CUSTOM PICKER OPENED

**Headline:** the spike's recipe **did not** reach "Pick date & time" until the
`innerTarget` guard fix. First run: `elementFromPoint(center)` for the
"Pick date & time" row returned a Google top-bar element (`gb_Pd gb_Sd gb_4d`)
— a different DOM subtree — so the dispatched click never bubbled to Gmail's
delegated handler; the dialog stayed on the preset list. After the guard
(commit `01c9b16`: only trust the hit-test if it is/inside the target, else
dispatch on the element itself), the second run resolved the inner target to
`<div class="Aj">` (inside the row) and the **custom date/time view opened**.

**Verified navigation chain (all confirmed this run):**

1. **Chevron** — `div[role="button"][aria-label="More send options"]`. Locale-DEPENDENT (aria-label). `firePlain` works.
2. **"Schedule send" item** — `div[role="menuitem"][selector="scheduledSend"]`. Locale-INDEPENDENT. `fireFull` (full sequence) works. Its `id` is dynamic (`:ba`, `:ep` across runs) — never anchor on it.
3. **Dialog** — found structurally by "contains `[role="menuitem"].Az`" (locale-independent); the `aria-label` path is the locale-dependent fallback.
4. **"Pick date & time"** — **`[role="menuitem"].Az.AM`** — the `.AM` modifier distinguishes it from preset rows (`.Az` without `.AM`). **Locale-independent structural hook** — prefer this over text matching.

**Custom picker structure (inside the same `[role="dialog"]`, after step 4):**

- **Date input** — a plain `<input>`, value formatted `"May 16, 2026"` (≈ `MMM D, YYYY`). Dynamic id (`c3`).
- **Time input** — a plain `<input>`, value formatted `"1:33 PM"` (≈ `h:mm A`). Dynamic id (`c4`).
- Exactly **2 `<input>` elements** in the dialog, order **[date, time]** — anchor by "the dialog's inputs in order", not by id.
- **Confirm button** — `<button>` text **"Schedule send"** (locale-dependent), classes `mUIrbf-I mUIrbf-I-ql-Uw eV8l8d`.
- **Cancel button** — `<button>` text "Cancel", classes `mUIrbf-I mUIrbf-I-ql-Uw Rb6pkf` (shares `mUIrbf-I mUIrbf-I-ql-Uw` with Confirm; the trailing class differs — obfuscated, treat as fragile).
- Also present: a full calendar grid (`<td>` day cells, `«`/`»` month nav, "Today"/"None" buttons). **Not needed** — setting the date `<input>`'s text value is sufficient; ignore the grid.

**Relabel target (§5.2) — confirmed:**

```
div.J-N.yr[selector="scheduledSend"][role="menuitem"]   (dynamic id — do not anchor on it)
  └ div.J-N-Jz
      ├ img.v5.J-N-JX           (cleardot.gif spacer, alt="")
      └ #text "Schedule send"   ← the visible label is THIS text node
```

The relabel must replace **only the text node**, not `div.J-N-Jz`'s
`textContent` (that would delete the spacer `<img>`). Current shipped code
sets `textContent` — **must be tightened** to target the trailing text node.

**Preset rows (§5.3.3) — confirmed:**

- Rows are `[role="menuitem"].Az` (the custom row is the only `.Az.AM`).
- Visible text concatenates label + date + time, e.g. `"Tomorrow morningMay 17, 8:00 AM"`, `"Tomorrow afternoonMay 17, 1:00 PM"`, `"Monday morningMay 18, 8:00 AM"`.
- Order: `[Tomorrow morning, Tomorrow afternoon, Monday morning, Pick date & time(.AM)]`.
- Gmail's preset times **exactly matched** OutboxIQ's `computePresets` output for this date (Sat 2026-05-16). Validates §5.3.3 + decision #3 (mirror Gmail).
- ⚠️ Both "Tomorrow morning" and "Monday morning" contain `"8:00 AM"` — match a row by the **date+time substring** (`"May 17, 8:00 AM"` vs `"May 18, 8:00 AM"`), not the clock time alone. The shipped `schedule-actions.ts` clock-only match is **buggy for the Monday preset — must be fixed.**

**Still NOT verified (no `live()` run this session):** that setting the
inputs + clicking Confirm actually produces a real scheduled message (the
end-to-end commit). Navigation/structure proven; the final write needs a
`live({confirm:true})` or a manual smoke test.

**Action items captured (for the post-pause implementation):**
1. Wire §5.3.4 custom path: open dialog → `.Az.AM` → set the 2 inputs (native setter, formats above) → click the "Schedule send" confirm button. ✅ DONE (`508f240`).
2. Tighten §5.2 relabel to replace only the text node (preserve the spacer img). ✅ DONE (`727c3ea`).
3. Fix §5.3 preset-row matching to use the date+time substring. ✅ DONE (`508f240`).
4. `anchorCheck()` in inline-reply and pop-out compose. ✅ DONE — see below.

### 2026-05-16 — compose-context coverage (Session 4) — ✅ ALL THREE PASS

Ran the full `discover()` (a superset of `anchorCheck()` — it also drives
the whole chain) in each context. **New-compose, inline-reply, and pop-out
compose are byte-for-byte equivalent** for everything we anchor on:

- `scheduledSend` menuitem: identical structure in all three; only the
  Gmail-assigned `id` differs (`:ep` / `:js` / earlier `:ba`) —
  **confirms `id` must never be an anchor** (we don't use it).
- Chevron, dialog (found structurally via `.Az`), the three preset rows,
  the `.Az.AM` "Pick date & time" hook, and the custom picker (2 inputs +
  "Schedule send"/"Cancel" buttons): **identical across contexts.**
- Custom input ids varied across runs (`c3/c4` → `c7/c8` → `c25/c26`) —
  re-confirms ids are per-session dynamic and our **order-based** input
  selection (not id) is correct.
- All three reached **✅ CUSTOM PICKER OPENED**.

No per-context differences touch any selector. §5.2 compose-context
coverage is **complete**; nothing improvised.

**The only remaining unverified item:** the true end-to-end commit — that
clicking the final "Schedule send" actually produces a message in Gmail's
Scheduled label. Needs a `live({confirm:true})` or a manual smoke test of
the real extension. Everything up to (not including) that final click is
now hands-on verified in all three contexts.

### 2026-05-16 — end-to-end `live({confirm:true})` attempt — ⚠️ probe input-format bug (NOT a shipped-code defect)

`live({ date:"2026-12-31", time:"9:00 AM", confirm:true })` ran the full
chain and clicked confirm, but **no email scheduled**. Gmail's date input
showed the raw ISO `2026-12-31` and rendered **"Invalid date"** (Gmail
wants `Dec 31, 2026`), so its confirm was a no-op.

- **Root cause:** the probe's `live()` set the inputs to the raw args
  verbatim; the usage example string was ISO. **The shipped extension is
  correct** — `formatForGmail` (unit-tested) already produces
  `"Dec 31, 2026"` / `"9:00 AM"` and `scheduleAt` feeds those. The defect
  was only in the diagnostic.
- **Fix applied:** `live()` now converts the date/time to Gmail's format
  (mirrors `formatForGmail`) before setting, with a log line showing the
  conversion. Re-running it now genuinely exercises the real transform.
- **Positive signals this run:** the `innerTarget` guard *engaged* on the
  "Schedule send" menuitem (`hit-test escaped target <div.uW2Fw-bHm>`) and
  the chain still completed — the guard proving itself under a real
  escape. Confirm resolved to the inner `<span class="mUIrbf-anl">` of the
  real button (correct).
- The `aria-hidden` console warning is Gmail-internal (its own `div.dw`),
  unrelated to OutboxIQ.

**Status:** end-to-end still not positively observed, but the failure is
fully explained and is *not* in shipped code. A clean re-run of the fixed
`live()` (or a real-extension smoke test) remains the final check.

### 2026-05-16 — `live({confirm:true})` re-run after format fix — ✅ REAL EMAIL SCHEDULED (end-to-end PROVEN)

`live({ date:"2026-12-31", time:"9:00 AM", confirm:true })`. Log:
`formatting for Gmail: date "2026-12-31" → "Dec 31, 2026", time "9:00 AM"
→ "9:00 AM"`. Gmail showed a valid date (no "Invalid date"), accepted
confirm, and displayed its own toast **"Send scheduled for Thu, Dec 31,
9:00 AM"** with the Scheduled folder showing **1**. **The full chain —
open dialog → Pick date & time → set inputs → confirm → real native
scheduled send — is verified end-to-end on consumer Gmail.**

- The `innerTarget` guard engaged again on the scheduledSend menuitem
  (`hit-test escaped target <div.uW2Fw-bHm>`) and the chain still
  completed — third independent confirmation the guard is load-bearing
  and correct.
- Date/time format conversion (mirrors `formatForGmail`) confirmed
  correct against live Gmail.

**Observed artifact (probe-only, NOT a shipped defect):** a stray
"Pick date & time" picker remained open showing the default date/time.
Cause: the operator ran `discover()` *and then* `live()`, but `live()`
itself calls `discover()` internally — so the chain navigated twice
(manual `discover()` opened picker A and left it; `live()`'s internal
`discover()` opened picker B, filled + confirmed it → the scheduled
email). Picker A was the unconfirmed leftover. The shipped extension's
`scheduleAt()` runs the chain **once** and the modal has a `busy`
guard, so this cannot occur via the real OutboxIQ UI. (Probe left
as-is; it's a throwaway diagnostic that has served its purpose.)

**Only residual, for the real-extension smoke test:** visually confirm
that scheduling through the OutboxIQ modal closes both Gmail's dialog
and our modal and produces exactly one scheduled email (expected fine;
not a known bug).
