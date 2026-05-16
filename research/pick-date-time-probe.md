# "Pick date & time" Custom-Path Probe

**Date:** 2026-05-16
**Status:** ⏳ Awaiting hands-on run (Session 4)
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

_(filled in after the hands-on run — append findings here, same as the spike doc's Verification section, so this stays the canonical custom-path reference)_
