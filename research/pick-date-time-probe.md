# "Pick date & time" Custom-Path Probe

**Date:** 2026-05-16
**Status:** ⏳ Awaiting hands-on run (Session 4)
**Depends on:** `research/scheduled-send-api-spike.md` — this probe extends the spike's verified preset-path recipe to the **custom "Pick date & time" path**, which the spike explicitly left unverified (Open Question 2 / OQ2 closing note).
**Why this matters:** OutboxIQ almost never schedules at one of Gmail's three native presets — recipient-timezone optimization and working-hours rescheduling produce *arbitrary* timestamps. The custom path is therefore the **primary** scheduling path for this product, not an edge case. If the verified recipe does not drive the custom date/time fields, the entire §5.3 Schedule-button design changes. This probe de-risks that before any custom-path code is written.

This document is a **canonical recipe reference**, same role as the spike doc. When Gmail breaks the custom path post-launch, re-run this probe to rediscover selectors.

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
- **Gmail UI language = English.** Two anchors the probe uses are locale-dependent and called out below (`aria-label="More send options"`, `[role="dialog"]` selection by `aria-label`). The `selector="scheduledSend"` attribute is locale-independent (per the spike). The probe reports which anchor it actually matched so we can judge locale risk for the shipped code.
- Open **DevTools → Console** on the Gmail tab. Paste the entire script block below and press Enter. It defines `window.OutboxIQProbe` and prints usage. It does **not** do anything until you call a function.

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

> Paste this whole block into the Gmail tab's DevTools console. It is self-contained, defines `window.OutboxIQProbe`, and mutates nothing until you call `discover()` or `live()`. It deliberately reuses the spike's exact recipe so a clean result genuinely de-risks the shipped module.

```js
(() => {
  "use strict";

  // ---- Recipe primitives (verbatim intent from research/scheduled-send-api-spike.md) ----

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Poll until predicate returns a truthy value or timeout. Gmail renders
  // menus/dialogs async after the triggering event, so every navigation step
  // must wait rather than assume synchronous DOM.
  async function waitFor(fn, { timeout = 4000, interval = 80, label = "" } = {}) {
    const start = Date.now();
    for (;;) {
      let v;
      try { v = fn(); } catch { v = null; }
      if (v) return v;
      if (Date.now() - start > timeout) {
        throw new Error(`waitFor timeout${label ? " (" + label + ")" : ""}`);
      }
      await sleep(interval);
    }
  }

  // The spike's breakthrough: dispatch on the INNERMOST rendered node at the
  // element's center coordinates, not the [role=menuitem] wrapper. The topmost
  // hit at (cx,cy) IS that inner content node.
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rect: r };
  }
  function innerTarget(el) {
    const { cx, cy } = centerOf(el);
    return document.elementFromPoint(cx, cy) || el;
  }

  function mkPointer(type, cx, cy, bubbles) {
    return new PointerEvent(type, {
      bubbles, cancelable: true, composed: true, view: window,
      clientX: cx, clientY: cy, pointerId: 1, pointerType: "mouse",
      isPrimary: true, button: 0, buttons: type === "pointerdown" ? 1 : 0,
    });
  }
  function mkMouse(type, cx, cy, bubbles) {
    return new MouseEvent(type, {
      bubbles, cancelable: true, composed: true, view: window,
      clientX: cx, clientY: cy, button: 0,
      buttons: type === "mousedown" ? 1 : 0,
    });
  }

  // Full verified sequence. enter/over carry hover; down/up/click carry the
  // jsaction-delegated activation. *enter events do not bubble per spec; the
  // rest do (and must, to reach Gmail's delegated ancestor handler).
  async function fireFull(el, why) {
    const { cx, cy } = centerOf(el);
    const t = innerTarget(el);
    const seq = [
      mkPointer("pointerover", cx, cy, true),
      mkPointer("pointerenter", cx, cy, false),
      mkMouse("mouseover", cx, cy, true),
      mkMouse("mouseenter", cx, cy, false),
      mkPointer("pointerdown", cx, cy, true),
      mkMouse("mousedown", cx, cy, true),
      mkPointer("pointerup", cx, cy, true),
      mkMouse("mouseup", cx, cy, true),
      mkMouse("click", cx, cy, true),
    ];
    for (const ev of seq) { t.dispatchEvent(ev); }
    console.log(`[probe] fireFull → ${why}: target=<${t.tagName.toLowerCase()} class="${t.className}">`);
    await sleep(120);
  }

  // The chevron has its own local handler — plain mousedown/up/click is enough
  // (spike). Coordinates included for safety.
  async function firePlain(el, why) {
    const { cx, cy } = centerOf(el);
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(mkMouse(type, cx, cy, true));
    }
    console.log(`[probe] firePlain → ${why}`);
    await sleep(120);
  }

  // ---- DOM dump helpers ----

  function cssPath(el) {
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 6) {
      let s = n.tagName.toLowerCase();
      if (n.id) { s += `#${n.id}`; parts.unshift(s); break; }
      const cls = (n.className || "").toString().trim().split(/\s+/).filter(Boolean);
      if (cls.length) s += "." + cls.slice(0, 3).join(".");
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(" > ");
  }
  function describe(el) {
    const attrs = {};
    for (const a of el.attributes || []) attrs[a.name] = a.value;
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 60),
      value: "value" in el ? el.value : undefined,
      attrs,
      cssPath: cssPath(el),
    };
  }
  function dump(root, label) {
    const els = root.querySelectorAll(
      'input, textarea, [contenteditable="true"], button, [role="button"], [role="menuitem"], [role="spinbutton"], [aria-label]',
    );
    const rows = [...els].map(describe);
    console.log(`[probe] ===== ${label} (${rows.length} candidates) =====`);
    console.table(rows.map((r) => ({ tag: r.tag, text: r.text, value: r.value, css: r.cssPath })));
    console.log(`[probe] full ${label} attrs:`, rows);
    return rows;
  }

  // §5.2 relabel target: show where the visible label text actually lives
  // inside the scheduledSend menuitem, so the shipped relabel targets the
  // right text node instead of guessing. We dump the leaf text nodes (the
  // candidates whose textContent we'd overwrite) plus the raw outerHTML.
  function dumpRelabelTarget(menuItem) {
    const leaves = [];
    const walk = (n) => {
      for (const c of n.children) {
        const ownText = [...c.childNodes]
          .filter((x) => x.nodeType === 3)
          .map((x) => x.textContent.trim())
          .join("");
        if (ownText) leaves.push({ ...describe(c), ownText });
        walk(c);
      }
    };
    walk(menuItem);
    console.log("[probe] ===== MENU ITEM (relabel target) =====");
    console.log("[probe] menuitem describe:", describe(menuItem));
    console.log("[probe] leaf text-bearing nodes (relabel candidates):", leaves);
    console.log("[probe] menuitem.outerHTML:\n", menuItem.outerHTML.slice(0, 1500));
  }

  // ---- Navigation ----

  function findChevron() {
    // Locale-dependent anchor (aria-label). Reported so we can judge risk.
    return document.querySelector('div[role="button"][aria-label="More send options"]');
  }
  function findScheduleMenuItem() {
    // Locale-INDEPENDENT anchor (selector attribute) per the spike.
    return document.querySelector('div[role="menuitem"][selector="scheduledSend"]');
  }
  function findScheduleDialog() {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    // Prefer the dialog that contains the .Az preset menuitems (structural,
    // locale-independent); fall back to aria-label match (locale-dependent).
    const byPreset = dialogs.find((d) => d.querySelector('[role="menuitem"].Az'));
    if (byPreset) return { dialog: byPreset, how: "structural(.Az presets)" };
    const byLabel = dialogs.find((d) =>
      /schedule/i.test(d.getAttribute("aria-label") || ""),
    );
    if (byLabel) return { dialog: byLabel, how: "aria-label(locale-dependent)" };
    return dialogs.length ? { dialog: dialogs[dialogs.length - 1], how: "last-dialog(weak)" } : null;
  }
  function findPickDateTime(dialog) {
    // Unknown anchor — try several heuristics, report all so we can pick a
    // stable one for the shipped code.
    const items = [...dialog.querySelectorAll('[role="menuitem"], [role="button"], button, a')];
    const textMatch = items.find((el) =>
      /pick date|date\s*&\s*time|date and time|custom/i.test((el.textContent || "").trim()),
    );
    const nonPreset = items.filter((el) => !el.classList.contains("Az"));
    return { textMatch, nonPresetCandidates: nonPreset.map(describe) };
  }

  // ---- Public API ----

  async function discover() {
    console.log("[probe] discover() — SAFE: navigates + dumps, never schedules.");
    const chevron = findChevron();
    if (!chevron) throw new Error('No chevron — open a compose window first. Anchor: aria-label="More send options" (locale-dependent)');
    await firePlain(chevron, "chevron (More send options)");

    const menuItem = await waitFor(findScheduleMenuItem, { label: 'menuitem[selector="scheduledSend"]' });
    console.log("[probe] scheduledSend menuitem found (locale-independent anchor OK)");
    dumpRelabelTarget(menuItem);
    await fireFull(menuItem, '"Schedule send" menuitem');

    const dlg = await waitFor(findScheduleDialog, { label: "schedule dialog" });
    console.log(`[probe] dialog found via: ${dlg.how}`);
    dump(dlg.dialog, "DIALOG (preset view)");

    const pdt = findPickDateTime(dlg.dialog);
    console.log("[probe] Pick-date&-time text match:", pdt.textMatch ? describe(pdt.textMatch) : "NONE (locale or different markup — inspect nonPresetCandidates)");
    console.log("[probe] non-preset candidates in dialog:", pdt.nonPresetCandidates);
    if (!pdt.textMatch) {
      console.warn("[probe] Could not auto-locate 'Pick date & time'. Stopping — report the dump above. DO NOT guess.");
      return { reached: "dialog", pickDateTime: false };
    }
    await fireFull(pdt.textMatch, '"Pick date & time"');

    // After clicking, the dialog content swaps to the custom picker. Re-find
    // the dialog (Gmail may re-render a fresh node) and dump it.
    await sleep(250);
    const dlg2 = findScheduleDialog() || dlg;
    dump(dlg2.dialog || dlg2, "PICKER (custom date/time view)");
    console.log("[probe] discover() done. Copy ALL output above back to Claude.");
    return { reached: "picker", pickDateTime: true };
  }

  // Native value setter so React/Closure-controlled inputs actually register.
  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function live({ date, time, confirm = false } = {}) {
    console.warn(`[probe] live() — ${confirm ? "DESTRUCTIVE: will create a real scheduled email." : "sets values only, no confirm."}`);
    if (!date || !time) throw new Error('Pass { date, time }, e.g. { date: "2026-12-31", time: "9:00 AM" }');
    await discover();
    const dlg = findScheduleDialog();
    const root = dlg ? dlg.dialog : document;
    const inputs = [...root.querySelectorAll('input, [contenteditable="true"]')];
    console.log("[probe] picker inputs:", inputs.map(describe));
    if (inputs.length < 2) {
      console.warn("[probe] Expected >=2 inputs (date+time) — markup differs. Report the dump; do not guess which is which.");
      return;
    }
    // Heuristic ordering: report it, let a human confirm against the dump.
    setNativeValue(inputs[0], date);
    setNativeValue(inputs[1], time);
    console.log("[probe] values set. Visually confirm Gmail accepted them.");
    if (!confirm) { console.log("[probe] confirm:false — stopping before scheduling."); return; }
    const btn =
      root.querySelector('[role="button"][selector="scheduledSend"]') ||
      [...root.querySelectorAll('button, [role="button"]')].find((b) =>
        /schedule send|schedule/i.test((b.textContent || "").trim()),
      );
    if (!btn) { console.warn("[probe] No confirm button found — report dump."); return; }
    await fireFull(btn, "confirm Schedule send");
    console.log("[probe] confirm fired. Check Gmail's Scheduled label for a real message, then cancel it.");
  }

  // §5.2 compose-context coverage. SAFE: opens the More-send-options menu,
  // reports whether the locale-independent anchor is present + visible, dumps
  // its structure, schedules nothing. Run once per compose context.
  async function anchorCheck() {
    console.log("[probe] anchorCheck() — SAFE: anchor presence only, no scheduling.");
    const chevron = findChevron();
    if (!chevron) {
      console.warn('[probe] VERDICT: NO CHEVRON in this context (aria-label="More send options" not found — locale-dependent anchor; report this).');
      return { ok: false, reason: "no-chevron" };
    }
    await firePlain(chevron, "chevron (More send options)");
    let menuItem;
    try {
      menuItem = await waitFor(findScheduleMenuItem, { timeout: 3000, label: "scheduledSend" });
    } catch {
      console.warn('[probe] VERDICT: chevron OK but selector="scheduledSend" NOT found in this context — surface this, do not improvise.');
      return { ok: false, reason: "no-anchor" };
    }
    const r = menuItem.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0;
    console.log(`[probe] VERDICT: anchor PRESENT, visible=${visible}, rect=`, r);
    dumpRelabelTarget(menuItem);
    console.log("[probe] anchorCheck() done — report the one-line VERDICT for this compose context.");
    return { ok: true, visible };
  }

  window.OutboxIQProbe = { discover, anchorCheck, live };
  console.log("%c[probe] OutboxIQ pick-date-time probe loaded.", "font-weight:bold");
  console.log('Run: OutboxIQProbe.discover()  (safe — custom-path + relabel-target dump)');
  console.log('Run: OutboxIQProbe.anchorCheck()  (safe — once per compose context: new / reply / pop-out)');
  console.log('Then: OutboxIQProbe.live({ date:"2026-12-31", time:"9:00 AM", confirm:false })  (sets values; confirm:true schedules for real)');
})();
```

---

## Result log

_(filled in after the hands-on run — append findings here, same as the spike doc's Verification section, so this stays the canonical custom-path reference)_
