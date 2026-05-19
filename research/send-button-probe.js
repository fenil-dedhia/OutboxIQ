// Fashionably Late §5.5.1 "regular Send button" probe — RUNNABLE SCRIPT.
//
// This is the single source of the probe script. The how-to-run, context,
// safety notes, the planned interception design it gates, and the result log
// live in send-button-probe.md (which points here). To use: open it, Select
// All, Copy, paste into Gmail's DevTools console (full step-by-step in .md).
//
// WHY THIS PROBE EXISTS: §5.5.1 intercepts Gmail's PRIMARY Send button (and
// Ctrl/Cmd+Enter). A bug = users cannot send email. §5.2.3 ("never block
// native Gmail") is a hard rule. Unlike Schedule Send (where blocking early
// and opening a dialog late is safe and reversible), an immediate Send is
// irreversible — so we must know, against live Gmail, the EARLIEST event
// Gmail acts on for Send, whether a capture-phase document listener fires
// before it, whether suppression actually suppresses, and whether replaying
// the Send actually sends. None of that is verified yet (Entry-2/Entry-23
// spike-gating). This probe answers it before any §5.5.1 code is written.
//
// Safe entry points: FashionablyLateSendProbe.discover(), .watch().
// Suppression test (no email leaves, throwaway acct still advised): .armSuppress().
// Destructive (sends a real email): .testReplay().
// Nothing runs until you call one of those.
//
// Recipe primitives below are mirrored 1:1 from
// extension/src/lib/schedule/gmail-recipe.ts on purpose: a clean replay run
// genuinely de-risks the shipped module, and vice-versa.

(() => {
  "use strict";

  // ---- Recipe primitives (verbatim intent from gmail-recipe.ts) ----

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rect: r };
  }
  // GUARD (Session 4 finding, gmail-recipe.ts innerTarget): only trust the
  // hit-test if it lands inside `el`; otherwise dispatch on `el` itself.
  function innerTarget(el) {
    const { cx, cy } = centerOf(el);
    const hit = document.elementFromPoint(cx, cy);
    if (hit && (hit === el || el.contains(hit))) return hit;
    if (hit) {
      console.log(
        `[sendprobe] innerTarget: hit-test escaped target (<${hit.tagName.toLowerCase()} class="${hit.className}">) — dispatching on the element itself`,
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

  // Full verified sequence (jsaction-delegated activation). Mirrors fireFull.
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
    console.log(`[sendprobe] fireFull → ${why}: target=<${t.tagName.toLowerCase()} class="${t.className}">`);
    await sleep(120);
  }

  // Chevron-style local handler — plain mousedown/up/click. Mirrors firePlain.
  async function firePlain(el, why) {
    const { cx, cy } = centerOf(el);
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(mkMouse(type, cx, cy, true));
    }
    console.log(`[sendprobe] firePlain → ${why}`);
    await sleep(120);
  }

  // ---- DOM dump helpers (mirrors pick-date-time-probe.js) ----

  function cssPath(el) {
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && parts.length < 8) {
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
    if (!el) return null;
    const attrs = {};
    for (const a of el.attributes || []) {
      // jsaction can be very long; keep it — it's the locale-independent
      // anchor candidate (the §5.2 lesson: prefer internal action ids over
      // aria-label). Everything else truncated for console readability.
      attrs[a.name] = a.name === "jsaction" ? a.value : a.value.slice(0, 120);
    }
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 50),
      attrs,
      cssPath: cssPath(el),
    };
  }

  // ---- Anchors ----
  // The chevron selector is ALREADY verified (spike + pick-date-time probe):
  //   div[role="button"][aria-label="More send options"]  (locale-DEPENDENT)
  // We use it as the trustworthy anchor to FIND the Send button: Send is the
  // chevron's sibling role=button inside their shared send-button group. This
  // simultaneously answers "how to tell Send from the chevron" (they are
  // distinct siblings) and gives a locale-independent discovery path even
  // though the chevron's own anchor is locale-dependent.

  const CHEVRON_SEL = 'div[role="button"][aria-label="More send options"]';

  function allChevrons() {
    return [...document.querySelectorAll(CHEVRON_SEL)];
  }

  // The smallest ancestor that contains BOTH the chevron and exactly one
  // OTHER role=button — that other button is the Send button. We climb until
  // we find a container holding a second role=button, and report the chain so
  // a stable scope anchor can be chosen for the shipped code.
  function sendGroupFor(chevron) {
    let n = chevron.parentElement;
    let climbed = 0;
    while (n && climbed < 6) {
      const buttons = [...n.querySelectorAll('[role="button"]')];
      const others = buttons.filter(
        (b) => b !== chevron && !b.contains(chevron) && !chevron.contains(b),
      );
      if (others.length >= 1) {
        return { group: n, sendCandidates: others, climbed };
      }
      n = n.parentElement;
      climbed++;
    }
    return { group: null, sendCandidates: [], climbed };
  }

  // Independent cross-check: a role=button that LOOKS like Send by its own
  // attributes (aria-label / data-tooltip starting "Send", or a jsaction
  // token containing "send"), excluding the known chevron. If this agrees
  // with sendGroupFor()'s sibling, confidence is high.
  function sendByAttributes(scope) {
    const root = scope || document;
    const btns = [...root.querySelectorAll('[role="button"]')];
    return btns.filter((b) => {
      if (b.matches(CHEVRON_SEL)) return false;
      const al = (b.getAttribute("aria-label") || "").trim();
      const tip = (b.getAttribute("data-tooltip") || "").trim();
      const ja = (b.getAttribute("jsaction") || "");
      return (
        /^send\b/i.test(al) ||
        /^send\b/i.test(tip) ||
        /send/i.test(ja)
      );
    });
  }

  // The compose-scoping ancestor for a Send button. §5.5.1 will match the
  // clicked Send via e.target.closest(...) and act compose-scoped, so we must
  // confirm each compose's Send button lives in its OWN subtree (unlike the
  // detached schedule popup that broke §5.2 multi-compose). We report the
  // nearest ancestor that looks like a compose container, plus a divergence
  // depth between two composes when present.
  function composeScopeOf(sendBtn) {
    let n = sendBtn;
    let up = 0;
    while (n && up < 25) {
      const role = n.getAttribute && n.getAttribute("role");
      const cls = (n.className || "").toString();
      // Heuristics, all reported (never silently trusted): a dialog role, or
      // a Gmail compose wrapper class (reported raw so we can pin a stable
      // one). The point is to show the Send button is IN-pane, not detached.
      if (role === "dialog" || /\bnH\b|\bAD\b|\bM9\b|\baoP\b|\bnn\b/.test(cls)) {
        return { container: n, up, why: role === "dialog" ? "role=dialog" : `class~${cls.slice(0, 40)}` };
      }
      n = n.parentElement;
      up++;
    }
    return { container: null, up, why: "no compose-like ancestor found in 25 hops" };
  }

  // ---- Public API ----

  // SAFE. Locates compose container(s), the Send button, the chevron sibling;
  // dumps attributes (incl. jsaction — the locale-independent anchor
  // candidate), the shared group, and the compose-scoping ancestor. Run with
  // ONE compose first, then again with TWO composes open for the multi-
  // compose scoping question. Schedules/sends nothing.
  function discover() {
    console.log("%c[sendprobe] discover() — SAFE: dumps DOM only, never sends.", "font-weight:bold");
    const chevrons = allChevrons();
    console.log(`[sendprobe] chevrons (= compose count) found: ${chevrons.length}`);
    if (chevrons.length === 0) {
      console.warn('[sendprobe] No chevron — open a compose window first. (Anchor: aria-label="More send options", locale-dependent — the SAME anchor §5.2 uses.)');
      return { composes: 0 };
    }

    const report = [];
    chevrons.forEach((chev, i) => {
      console.log(`%c[sendprobe] ===== COMPOSE ${i + 1} / ${chevrons.length} =====`, "font-weight:bold;color:#1a73e8");
      const { group, sendCandidates, climbed } = sendGroupFor(chev);
      console.log(`[sendprobe] shared send-group found ${climbed} hop(s) above the chevron:`, describe(group));
      console.log(`[sendprobe] chevron:`, describe(chev));

      const sibling = sendCandidates[0] || null;
      console.log(`[sendprobe] Send candidate (chevron's sibling role=button):`, describe(sibling));
      if (sendCandidates.length > 1) {
        console.warn(`[sendprobe] >1 sibling role=button in the group — dumping ALL, do not guess:`, sendCandidates.map(describe));
      }

      const attrMatches = sendByAttributes(group || document);
      console.log(`[sendprobe] independent attribute-based Send match(es):`, attrMatches.map(describe));
      const agree = sibling && attrMatches.includes(sibling);
      console.log(`[sendprobe] sibling-of-chevron AND attribute heuristic AGREE: ${agree ? "✅ YES (high confidence)" : "⚠️ NO — report both, pick the stable anchor manually"}`);

      const scope = sibling ? composeScopeOf(sibling) : { container: null };
      console.log(`[sendprobe] Send button's compose-scoping ancestor (${scope.up} hops, ${scope.why}):`, describe(scope.container));

      report.push({
        composeIndex: i + 1,
        chevron: describe(chev),
        send: describe(sibling),
        groupCss: group ? cssPath(group) : null,
        sendJsaction: sibling ? sibling.getAttribute("jsaction") : null,
        sendAriaLabel: sibling ? sibling.getAttribute("aria-label") : null,
        sendDataTooltip: sibling ? sibling.getAttribute("data-tooltip") : null,
        scopeCss: scope.container ? cssPath(scope.container) : null,
      });
    });

    if (chevrons.length >= 2) {
      const scopes = report
        .map((r) => r.scopeCss)
        .filter(Boolean);
      const distinct = new Set(scopes).size === scopes.length && scopes.length === report.length;
      console.log(
        `%c[sendprobe] MULTI-COMPOSE VERDICT: each Send button's compose scope is ${distinct ? "✅ DISTINCT (Send is in-pane / compose-scoped — simpler than the §5.2 detached-menu problem)" : "❌ NOT distinct (report this — Send-button scoping needs design work)"}.`,
        "font-weight:bold",
      );
    } else {
      console.log("[sendprobe] (Run again with TWO composes open to get the MULTI-COMPOSE VERDICT.)");
    }
    console.log("[sendprobe] discover() done. Copy ALL output back to Claude (this whole block + the report table below).");
    console.table(report);
    return report;
  }

  // ---- Event-sequence observation ----

  let watchHandlers = [];
  function stop() {
    watchHandlers.forEach(({ type, fn, cap }) =>
      document.removeEventListener(type, fn, cap),
    );
    watchHandlers = [];
    console.log("[sendprobe] watch() stopped, listeners removed.");
  }

  // SAFE-ish observation. Instruments document-level CAPTURE and BUBBLE
  // listeners for the full pointer/mouse/key sequence and logs each event
  // (phase, type, modifier keys, target, whether the target is within the
  // matched Send button / chevron). Does NOT suppress anything — Gmail's
  // Send WILL proceed.
  //
  // RECOMMENDED FIRST RUN: empty the "To" field, then click Send / press
  // Ctrl(⌘)+Enter. Gmail runs its own send handler then ABORTS on the
  // missing recipient ("Please specify at least one recipient") — you see
  // the full event ordering with NO email sent. Then optionally re-run with
  // a full draft on a throwaway address to see the completed path.
  function watch({ seconds = 60 } = {}) {
    stop();
    console.log(`%c[sendprobe] watch() — observing events for ${seconds}s (NOT suppressing — Send WILL proceed; use empty-To for a safe first run). Call FashionablyLateSendProbe.stop() to end early.`, "font-weight:bold");
    const chevrons = allChevrons();
    const sends = chevrons
      .map((c) => sendGroupFor(c).sendCandidates[0])
      .filter(Boolean);
    console.log(`[sendprobe] watching ${chevrons.length} compose(s); ${sends.length} Send button(s) located for target-tagging.`);

    const within = (target) => {
      const inSend = sends.findIndex((s) => s && (s === target || s.contains(target)));
      if (inSend >= 0) return `SEND#${inSend + 1}`;
      const inChev = chevrons.findIndex((c) => c === target || c.contains(target));
      if (inChev >= 0) return `CHEVRON#${inChev + 1}`;
      return "other";
    };

    const types = [
      "pointerdown", "mousedown", "pointerup", "mouseup", "click",
      "keydown", "keyup",
    ];
    const log = (phase) => (e) => {
      const t = e.target;
      const tag = t && t.tagName ? t.tagName.toLowerCase() : String(t);
      const mod =
        e.type.startsWith("key")
          ? ` key="${e.key}" ctrl=${e.ctrlKey} meta=${e.metaKey}`
          : "";
      const zone = within(t);
      // Highlight the interesting ones: anything on a Send button, or a
      // Ctrl/⌘+Enter keydown anywhere (the keyboard send path).
      const hot =
        zone.startsWith("SEND") ||
        (e.type === "keydown" && e.key === "Enter" && (e.ctrlKey || e.metaKey));
      console.log(
        `%c[sendprobe] ${phase.padEnd(7)} ${e.type.padEnd(11)} zone=${zone.padEnd(10)} <${tag}>${mod} defaultPrevented=${e.defaultPrevented}`,
        hot ? "color:#1a73e8;font-weight:bold" : "color:#888",
      );
    };
    for (const type of types) {
      const capFn = log("CAPTURE");
      const bubFn = log("BUBBLE");
      document.addEventListener(type, capFn, true);
      document.addEventListener(type, bubFn, false);
      watchHandlers.push({ type, fn: capFn, cap: true });
      watchHandlers.push({ type, fn: bubFn, cap: false });
    }
    setTimeout(() => { if (watchHandlers.length) stop(); }, seconds * 1000);
    console.log("[sendprobe] Now: (1) empty the To field and click Send → observe the sequence; (2) press Ctrl+Enter / ⌘+Enter → observe the keyboard path. Copy ALL logged lines back to Claude.");
  }

  // ---- Suppression test ----
  // The real question: can a CAPTURE-phase document listener stop Gmail's
  // Send? Installs a ONE-SHOT capture-phase interceptor on mousedown, click,
  // AND keydown. On the first activation that targets the matched Send
  // button (mouse) OR is Ctrl/⌘+Enter (keyboard), it calls preventDefault()
  // + stopImmediatePropagation(), logs exactly what it caught and at which
  // event, then DISARMS. You then visually confirm NO email was sent
  // (compose still open, no "Message sent" toast).
  //
  // Failure direction is the safe one (a Send that doesn't happen), but use
  // a THROWAWAY account anyway — if suppression FAILS the email sends.

  let armed = null;
  function disarm() {
    if (!armed) { console.log("[sendprobe] not armed."); return; }
    armed.forEach(({ type, fn }) => document.removeEventListener(type, fn, true));
    armed = null;
    console.log("[sendprobe] suppression disarmed.");
  }

  function armSuppress() {
    disarm();
    const chevrons = allChevrons();
    if (chevrons.length !== 1) {
      console.warn(`[sendprobe] armSuppress() expects exactly ONE compose (found ${chevrons.length}). Open a single compose with To+Subject+Body filled (throwaway acct).`);
      return;
    }
    const sendBtn = sendGroupFor(chevrons[0]).sendCandidates[0];
    if (!sendBtn) {
      console.warn("[sendprobe] could not locate the Send button — run discover() and report; do NOT improvise.");
      return;
    }
    console.log("%c[sendprobe] armSuppress() — ARMED. Now click Send (or press Ctrl/⌘+Enter) ONCE.", "font-weight:bold;color:#c5221f");
    console.log("[sendprobe] target Send button:", describe(sendBtn));

    const fired = { done: false };
    const handler = (e) => {
      if (fired.done) return;
      const isMouseOnSend =
        (e.type === "mousedown" || e.type === "click") &&
        (e.target === sendBtn || sendBtn.contains(e.target));
      const isKbd =
        e.type === "keydown" &&
        e.key === "Enter" &&
        (e.ctrlKey || e.metaKey);
      if (!isMouseOnSend && !isKbd) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      fired.done = true;
      console.log(
        `%c[sendprobe] SUPPRESSED at: ${e.type} (capture phase)${isKbd ? ` via Ctrl/⌘+Enter (key="${e.key}")` : " on the Send button"}. defaultPrevented=${e.defaultPrevented}.`,
        "font-weight:bold;color:#c5221f",
      );
      console.log("%c[sendprobe] >>> NOW VISUALLY CONFIRM: did the email send? Expected: NO send — compose still open, no 'Message sent' toast. Report YES/NO + which event suppressed.", "font-weight:bold");
      disarm();
    };
    armed = [
      { type: "mousedown", fn: handler },
      { type: "click", fn: handler },
      { type: "keydown", fn: handler },
    ];
    armed.forEach(({ type, fn }) => document.addEventListener(type, fn, true));
  }

  // ---- Gesture-block test (disambiguates B vs C) ----
  // armSuppress() is ONE-SHOT: it kills only the FIRST matching event then
  // disarms. If Gmail finalises the send on a LATER event of the same click
  // (mouseup/click — the spike found the chevron's local handler needs the
  // full mouse sequence), the disarmed probe lets that through and the email
  // sends even though mousedown was "suppressed". That ambiguity is exactly
  // what was observed (SUPPRESSED at mousedown, yet email sent).
  //
  // This blocks the ENTIRE gesture — every pointer/mouse event whose target
  // is the Send button, PLUS the ⌘/Ctrl+Enter keydown — at capture phase,
  // for `seconds`, NOT one-shot, NOT disarming between events. It is the
  // disambiguating test:
  //   • email does NOT send → capture-phase CAN stop Gmail; armSuppress was
  //     just too blunt. The §5.5.1 design holds; production must block the
  //     whole gesture (mousedown+mouseup+click), as the §5.2 interceptor
  //     already does for mousedown+click. → proceed to the replay test.
  //   • email STILL sends   → capture-phase fundamentally cannot stop Gmail's
  //     Send → design-invalidating → STOP, surface to Fenil, write NO §5.5.1
  //     code (Entry-2 / probe-gate failure clause).
  // Scoped to the Send button only, so the rest of Gmail is unaffected for
  // the window (faithful to the §5.2.3 spirit even in the probe). Throwaway
  // account: if this is the B case, the email sends.

  let blockHandlers = null;
  function unblock() {
    if (!blockHandlers) { console.log("[sendprobe] not blocking."); return; }
    blockHandlers.forEach(({ type, fn }) =>
      document.removeEventListener(type, fn, true),
    );
    blockHandlers = null;
    console.log("[sendprobe] gesture block REMOVED.");
  }

  function armBlockGesture({ seconds = 8 } = {}) {
    unblock();
    const chevrons = allChevrons();
    if (chevrons.length !== 1) {
      console.warn(`[sendprobe] armBlockGesture() expects exactly ONE compose (found ${chevrons.length}). One compose, fully filled, throwaway acct.`);
      return;
    }
    const sendBtn = sendGroupFor(chevrons[0]).sendCandidates[0];
    if (!sendBtn) {
      console.warn("[sendprobe] Send button not found — run discover() and report; do NOT improvise.");
      return;
    }
    console.log(`%c[sendprobe] armBlockGesture() — BLOCKING the full gesture on Send for ${seconds}s (NOT one-shot). If Gmail still sends, that is the design-invalidating result.`, "font-weight:bold;color:#c5221f");
    console.log("[sendprobe] target Send button:", describe(sendBtn));
    let kills = 0;
    const handler = (e) => {
      const onSend =
        e.type !== "keydown" &&
        (e.target === sendBtn || sendBtn.contains(e.target));
      const isKbd =
        e.type === "keydown" &&
        e.key === "Enter" &&
        (e.ctrlKey || e.metaKey);
      if (!onSend && !isKbd) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      kills++;
      console.log(
        `%c[sendprobe] BLOCKED #${kills}: ${e.type}${isKbd ? " (⌘/Ctrl+Enter)" : " on Send"} (capture). defaultPrevented=${e.defaultPrevented}`,
        "color:#c5221f;font-weight:bold",
      );
    };
    const evs = [
      "pointerdown", "mousedown", "pointerup", "mouseup", "click", "keydown",
    ];
    blockHandlers = evs.map((type) => ({ type, fn: handler }));
    blockHandlers.forEach(({ type, fn }) =>
      document.addEventListener(type, fn, true),
    );
    console.log(`%c[sendprobe] ARMED for ${seconds}s. Now click Send 2-3 times AND press ⌘/Ctrl+Enter. Watch for a 'Message sent' toast / the compose closing.`, "font-weight:bold");
    setTimeout(() => {
      if (blockHandlers) {
        unblock();
        console.log(`%c[sendprobe] block window ended. Events blocked: ${kills}. >>> REPORT: did ANY email send during the block? (Yes/No) + paste all BLOCKED lines.`, "font-weight:bold");
      }
    }, seconds * 1000);
  }

  // ---- Replay test (DESTRUCTIVE) ----
  // Verifies the "Send now anyway" + fail-toward-send path: after we've
  // intercepted, can we re-drive Gmail's Send so the email actually goes?
  // Tries firePlain first (Send may have a local handler like the chevron);
  // if you confirm it did NOT send, call testReplay({full:true}) to escalate
  // to the full jsaction recipe (fireFull). Sends a REAL email — throwaway
  // account, draft addressed to yourself.
  async function testReplay({ full = false } = {}) {
    const chevrons = allChevrons();
    if (chevrons.length !== 1) {
      console.warn(`[sendprobe] testReplay() expects exactly ONE compose (found ${chevrons.length}).`);
      return;
    }
    const sendBtn = sendGroupFor(chevrons[0]).sendCandidates[0];
    if (!sendBtn) { console.warn("[sendprobe] Send button not found — run discover()."); return; }
    console.warn(`%c[sendprobe] testReplay() — DESTRUCTIVE: re-driving Send via ${full ? "fireFull (full jsaction recipe)" : "firePlain (plain mouse)"}. A REAL email will send if it works.`, "font-weight:bold;color:#c5221f");
    if (full) await fireFull(sendBtn, "replay Send (full recipe)");
    else await firePlain(sendBtn, "replay Send (plain)");
    console.log("%c[sendprobe] >>> CONFIRM: did the email send (toast + compose closed)? If NOT and you used plain, re-run testReplay({full:true}). Report which one worked.", "font-weight:bold");
  }

  window.FashionablyLateSendProbe = { discover, watch, stop, armSuppress, disarm, armBlockGesture, unblock, testReplay };
  console.log("%c[sendprobe] Fashionably Late §5.5.1 Send-button probe loaded.", "font-weight:bold");
  console.log("Step 1 (SAFE): FashionablyLateSendProbe.discover()        — locate Send button + scope (run with 1 compose, then 2)");
  console.log("Step 2 (SAFE): FashionablyLateSendProbe.watch()           — observe the click & Ctrl/⌘+Enter event sequence (use empty-To)");
  console.log("Step 3 (suppress test): FashionablyLateSendProbe.armSuppress()     — one-shot: does capture-phase stop the FIRST event?");
  console.log("Step 3b (DISAMBIGUATE): FashionablyLateSendProbe.armBlockGesture() — blocks the WHOLE gesture: B (can't stop) vs C (one-shot too blunt)");
  console.log("Step 4 (DESTRUCTIVE): FashionablyLateSendProbe.testReplay()        — does replaying the Send actually send?");
  console.log("Helpers: FashionablyLateSendProbe.stop() / .disarm() / .unblock()");
})();
