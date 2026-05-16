// OutboxIQ "Pick date & time" probe — RUNNABLE SCRIPT.
//
// This is the single source of the probe script. The how-to-run, context,
// safety notes, and result log live in pick-date-time-probe.md (which points
// here). To use: open it, Select All, Copy, paste into Gmail's DevTools
// console (see the .md for full step-by-step instructions).
//
// Safe entry points: OutboxIQProbe.discover(), OutboxIQProbe.anchorCheck().
// Destructive (creates a real scheduled email): OutboxIQProbe.live(...).
// Nothing runs until you call one of those.

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
  // GUARD (Session 4 finding): only trust the hit-test if it lands inside
  // `el`. discover() showed elementFromPoint returning a Google top-bar
  // element (gb_*) — a different DOM subtree — so the dispatched click never
  // reached Gmail's delegated handler. When the hit escapes `el`, dispatch
  // on `el` itself. Mirrors extension/src/lib/schedule/gmail-recipe.ts.
  function innerTarget(el) {
    const { cx, cy } = centerOf(el);
    const hit = document.elementFromPoint(cx, cy);
    if (hit && (hit === el || el.contains(hit))) return hit;
    if (hit) {
      console.log(
        `[probe] innerTarget: hit-test escaped target (<${hit.tagName.toLowerCase()} class="${hit.className}">) — dispatching on the element itself`,
      );
    }
    return el;
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

    // After clicking, the dialog content should swap to the custom picker.
    await sleep(300);
    const dlg2 = findScheduleDialog() || dlg;
    const root2 = dlg2.dialog || dlg2;
    dump(root2, "AFTER 'Pick date & time' click");

    // Unambiguous verdict for the report: did the custom date/time view
    // actually open? Preset view still shows the .Az preset rows; the custom
    // view exposes date/time inputs and drops the presets.
    const stillPresets = root2.querySelectorAll(
      '[role="menuitem"].Az:not(.AM)',
    ).length;
    const pickerInputs = root2.querySelectorAll(
      'input, [contenteditable="true"], [role="spinbutton"]',
    ).length;
    if (pickerInputs >= 1 && stillPresets === 0) {
      console.log(
        "%c[probe] PICK-DATE VERDICT: ✅ CUSTOM PICKER OPENED — report this line + the dump above.",
        "font-weight:bold;color:green",
      );
    } else {
      console.log(
        `%c[probe] PICK-DATE VERDICT: ❌ STILL ON PRESET VIEW — custom path did NOT open (presets=${stillPresets}, inputs=${pickerInputs}). Report this line.`,
        "font-weight:bold;color:#c5221f",
      );
    }
    console.log("[probe] discover() done. Copy ALL output above back to Claude.");
    return { reached: "picker", pickDateTime: pickerInputs >= 1 };
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

  // Gmail's date input rejects ISO ("2026-12-31" → "Invalid date"); it wants
  // "Dec 31, 2026". Convert here so the probe exercises the SAME transform
  // the shipped extension does (extension/src/lib/schedule/gmail-format.ts
  // formatForGmail). Accepts ISO date + "9:00 AM" (or "HH:MM" 24h) time.
  function toGmailDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso; // already Gmail-format? pass through
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }
  function toGmailTime(t) {
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(t)) return t; // already Gmail-format
    const m = /^(\d{2}):(\d{2})$/.exec(t);
    if (!m) return t;
    const d = new Date(Date.UTC(2000, 0, 1, +m[1], +m[2]));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }

  async function live({ date, time, confirm = false } = {}) {
    console.warn(`[probe] live() — ${confirm ? "DESTRUCTIVE: will create a real scheduled email." : "sets values only, no confirm."}`);
    if (!date || !time) throw new Error('Pass { date, time }, e.g. { date: "2026-12-31", time: "9:00 AM" }');
    const gmailDate = toGmailDate(date);
    const gmailTime = toGmailTime(time);
    console.log(`[probe] formatting for Gmail: date "${date}" → "${gmailDate}", time "${time}" → "${gmailTime}"`);
    await discover();
    const dlg = findScheduleDialog();
    const root = dlg ? dlg.dialog : document;
    const inputs = [...root.querySelectorAll('input, [contenteditable="true"]')];
    console.log("[probe] picker inputs:", inputs.map(describe));
    if (inputs.length < 2) {
      console.warn("[probe] Expected >=2 inputs (date+time) — markup differs. Report the dump; do not guess which is which.");
      return;
    }
    // Probe-confirmed order: [date, time]. Values formatted as Gmail expects.
    setNativeValue(inputs[0], gmailDate);
    setNativeValue(inputs[1], gmailTime);
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
