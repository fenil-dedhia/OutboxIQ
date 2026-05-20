// Fashionably Late §5.3.5 compose-recipients DOM discovery probe.
//
// Status: 2026-05-19 — discovery, written for Session 10 hands-on after
// the shipped `compose-recipients.ts` anchors (`input[name="to"|"cc"]` +
// `[email]`) returned empty on live Gmail (user confirmed in DevTools:
//   document.querySelectorAll('input[name="to"]').length === 0
//   document.querySelectorAll('[email]').length === 477  (inbox-wide, not compose)
// ). This probe maps the *real* compose recipient DOM so the shipped
// module can be re-anchored on stable, compose-scoped selectors.
//
// Safe to run: read-only. Nothing is dispatched, nothing is sent. Just
// querySelectorAll + getAttribute. Open a compose with at least one
// recipient typed in To: (and ideally one in CC:), then paste this whole
// file into the DevTools console and call `__flComposeProbe.discover()`.
//
// Output: a structured table showing, per detected compose pane:
//   • The compose-pane root + chevron-anchored ancestor chain
//   • Every promising chip selector that matched something INSIDE the
//     compose pane (so inbox-wide noise is filtered)
//   • For each chip: tag, all attributes, text, parent-row attributes
//   • Inferred To/CC/BCC partition (by row-label or aria-label)
//   • A copy/pasteable "recommended anchor" summary at the end
//
// Recipe primitives below are deliberately read-only (no fireFull /
// firePlain — that family belongs in send-button-probe.js). When this
// probe identifies the right anchors, the shipped module in
// extension/src/content/compose/compose-recipients.ts is updated to
// match and the probe stays as a canonical reference.

(() => {
  "use strict";

  // ---- compose-pane detection -------------------------------------------
  // Mirror the same anchor §5.2 / §5.5.1 already trust: the chevron.
  // composeCount() is the single source of truth for "how many composes",
  // shared between §5.2 safety net + §5.5.1 guard. Same selector here.
  const SEL_CHEVRON = 'div[role="button"][aria-label="More send options"]';

  /** All chevrons in this document — one per compose pane. */
  function chevrons() {
    return Array.from(document.querySelectorAll(SEL_CHEVRON));
  }

  /** Walk up until we find a stable compose-pane root: a self-contained
   * subtree that contains BOTH the chevron AND a recipient-looking input.
   * We don't anchor on a specific class — Gmail's obfuscated classes drift.
   * Heuristic: the highest ancestor that contains exactly ONE chevron and
   * at least one [contenteditable] (the body) or input/textarea. */
  function composePaneFor(chevron) {
    let el = chevron.parentElement;
    let best = chevron;
    while (el && el !== document.body) {
      const inChev = el.querySelectorAll(SEL_CHEVRON).length;
      const hasBody = el.querySelector(
        '[contenteditable="true"], textarea, input[type="text"]',
      );
      if (inChev === 1 && hasBody) best = el;
      if (inChev > 1) break; // crossed into a region that holds multiple composes
      el = el.parentElement;
    }
    return best;
  }

  // ---- chip-candidate heuristics ----------------------------------------
  // Modern Gmail compose recipient chips have changed shape multiple times.
  // We cast a wide net and report what actually exists inside the compose
  // pane — readable output > clever single selector.
  const CHIP_HEURISTICS = [
    // Email-attribute-bearing nodes (the original — proven too broad
    // doc-wide, but scoped to the compose pane it may still be useful).
    { name: '[email]', sel: "[email]" },
    // Modern Gmail often uses data-hovercard-id (the canonical email
    // identity for hover cards across the product).
    { name: "[data-hovercard-id]", sel: "[data-hovercard-id]" },
    // role=option with a name attribute (recipient autocomplete + chips).
    { name: 'div[role="option"]', sel: 'div[role="option"]' },
    // span[name]: another historical chip shape.
    { name: "span[name]", sel: "span[name]" },
    // [data-name] (rendered display name).
    { name: "[data-name]", sel: "[data-name]" },
    // Anything with @ in its aria-label is probably a chip.
    { name: '[aria-label*="@"]', sel: '[aria-label*="@"]' },
    // role=listbox often wraps recipient lists; chips are its options.
    { name: '[role="listbox"]', sel: '[role="listbox"]' },
    // tabindex=-1 chip pattern (some versions).
    {
      name: 'div[tabindex="-1"][role="listbox"] > div',
      sel: 'div[tabindex="-1"][role="listbox"] > div',
    },
  ];

  // ---- recipient-row partition (To / CC / BCC) --------------------------
  // We don't know exact classes; we look for labelled regions whose aria
  // / visible text starts with "To" / "Cc" / "Bcc". Each chip is bucketed
  // by walking up to the nearest such labelled ancestor.
  function fieldOfOrigin(chip) {
    let el = chip;
    while (el && el !== document.body) {
      const aria = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      const role = (el.getAttribute("role") || "").trim().toLowerCase();
      if (aria) {
        if (/^to\b|recipients\b/i.test(aria) && !/cc|bcc/i.test(aria))
          return "To";
        if (/^cc\b|carbon copy/i.test(aria)) return "CC";
        if (/^bcc\b|blind/i.test(aria)) return "BCC";
      }
      // Some implementations use role="region" with a labelledby pointing
      // to a visible "To"/"Cc"/"Bcc" header. Walk up but don't go too far.
      void role;
      el = el.parentElement;
    }
    return "?";
  }

  // Read attributes as { name: value } dict, capping long values for output.
  function attrsOf(el) {
    const out = {};
    for (const a of Array.from(el.attributes)) {
      out[a.name] = a.value.length > 80 ? a.value.slice(0, 77) + "…" : a.value;
    }
    return out;
  }

  function trimText(el, n = 60) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n - 1) + "…" : t;
  }

  // Try to extract an email address from a chip via any plausible attribute
  // or its textContent. Returns null if nothing email-shaped is found.
  function extractEmail(el) {
    const candidates = [
      el.getAttribute("email"),
      el.getAttribute("data-hovercard-id"),
      el.getAttribute("name"),
      el.getAttribute("data-name"),
      el.getAttribute("aria-label"),
      el.textContent,
    ];
    for (const c of candidates) {
      if (!c) continue;
      const m = c.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      if (m) return m[0];
    }
    return null;
  }

  // ---- discover() -------------------------------------------------------

  function discover() {
    const chevs = chevrons();
    console.group(
      `%c[FL compose-recipients probe] %ccomposeCount=${chevs.length}`,
      "color:#1a73e8;font-weight:600",
      "color:#5f6368",
    );
    if (chevs.length === 0) {
      console.warn(
        "No compose detected. Open a compose with at least one To: recipient typed, then re-run __flComposeProbe.discover().",
      );
      console.groupEnd();
      return;
    }
    if (chevs.length > 1) {
      console.info(
        `${chevs.length} composes detected — §5.2/§5.5.1 safety net hands off to native Gmail at ≥2 composes, so Optimize-for-X would also be inactive in this state. Probe will still report all panes for reference.`,
      );
    }

    chevs.forEach((chev, i) => {
      const pane = composePaneFor(chev);
      console.group(
        `%cCompose #${i + 1}`,
        "color:#0b8043;font-weight:600",
        pane,
      );

      // Heuristic results — count matches scoped to THIS pane.
      const heur = CHIP_HEURISTICS.map(({ name, sel }) => {
        let found = [];
        try {
          found = Array.from(pane.querySelectorAll(sel));
        } catch {
          found = [];
        }
        return { name, count: found.length, sample: found.slice(0, 4) };
      });

      console.group("%cSelector survey (pane-scoped)", "color:#5f6368");
      console.table(
        heur.map((h) => ({ selector: h.name, matches: h.count })),
      );
      console.groupEnd();

      // Pick the best candidate to dump in detail: highest-signal
      // (data-hovercard-id usually wins on modern Gmail; falls back to
      // any non-empty heuristic).
      const detailFor =
        heur.find((h) => h.name === "[data-hovercard-id]" && h.count > 0) ??
        heur.find((h) => h.count > 0 && h.count < 20) ??
        heur.find((h) => h.count > 0);
      if (!detailFor) {
        console.warn(
          "No chip-like elements matched inside this compose pane. Drag-select a recipient chip in the To: field, right-click → Inspect, and share the element tree.",
        );
      } else {
        console.group(
          `%cChip detail (matched by %c${detailFor.name}%c, dumping up to 12)`,
          "color:#5f6368",
          "color:#1a73e8;font-family:monospace",
          "color:#5f6368",
        );
        const all = Array.from(pane.querySelectorAll(detailFor.name === "[email]" ? "[email]" : detailFor.name)).slice(
          0,
          12,
        );
        all.forEach((chip, j) => {
          console.group(
            `chip #${j + 1} → ${chip.tagName.toLowerCase()}.${chip.className || "(no class)"}`,
            chip,
          );
          console.log("attrs:", attrsOf(chip));
          console.log("text:", trimText(chip));
          console.log("extracted email:", extractEmail(chip));
          console.log("inferred field:", fieldOfOrigin(chip));
          console.log("parent attrs:", chip.parentElement ? attrsOf(chip.parentElement) : "(no parent)");
          console.groupEnd();
        });
        console.groupEnd();
      }

      // Recommended anchor: prefer the heuristic that returned a small,
      // pane-scoped set AND yielded an extractable email on the first
      // sample. This is the "next selector to try in compose-recipients.ts".
      const ranked = heur
        .filter((h) => h.count > 0)
        .map((h) => {
          const sample = h.sample[0];
          const email = sample ? extractEmail(sample) : null;
          return { ...h, email };
        })
        .sort((a, b) => {
          // Prefer selectors that yielded an email; then prefer smaller
          // (more compose-scoped) counts.
          if (Boolean(a.email) !== Boolean(b.email))
            return a.email ? -1 : 1;
          return a.count - b.count;
        });

      console.group("%cRanked anchor recommendations", "color:#b06000");
      console.table(
        ranked.map((r) => ({
          selector: r.name,
          matches: r.count,
          "first email": r.email ?? "(none)",
        })),
      );
      console.groupEnd();

      console.groupEnd(); // compose #i
    });

    console.groupEnd();
    console.info(
      "Done. Copy the entire output (right-click → 'Save as…' on the console, or just screenshot) and share it back.",
    );
  }

  // Expose: discover() is the only entry point; the helpers are namespaced
  // so a curious user can poke at them without re-pasting the file.
  window.__flComposeProbe = {
    discover,
    chevrons,
    composePaneFor,
    fieldOfOrigin,
    extractEmail,
  };

  console.log(
    "%c[FL compose-recipients probe] loaded. Call __flComposeProbe.discover() with a compose open (and ≥1 recipient in To:).",
    "color:#1a73e8;font-weight:600",
  );
})();
