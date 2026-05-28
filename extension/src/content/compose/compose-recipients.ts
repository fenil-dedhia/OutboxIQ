// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.3.5 (b)/(c)/(e) — read the compose's To+CC recipients from Gmail's
// compose DOM. BCC is excluded by spec (preserves the BCC privacy contract;
// §11). No People API, no autocomplete enrichment beyond what Gmail already
// rendered into the chips — Free v1 is OAuth-free (Entry 39).
//
// Anchor strategy (verified against live Gmail by
// `research/compose-recipients-probe.{js,md}`, 2026-05-19):
//
//   1. Find the compose pane(s) via the chevron — the same locale-
//      independent anchor §5.2 and §5.5.1 already trust (`SEL_CHEVRON`
//      in gmail-recipe.ts; `composeCount()` is the single source of
//      truth for "how many composes").
//
//   2. Within each compose pane, select
//      `div[role="option"][data-hovercard-id]`. This matches Gmail's
//      interactive recipient chips and nothing else inside the pane.
//      The probe surveyed 8 alternative heuristics; this combo was the
//      unique one that:
//        - returned EXACTLY one node per To/CC chip (no doubles via
//          the hidden a11y span twin, no peoplekit-noise),
//        - carried both the email (`data-hovercard-id`) and the
//          display name (`data-name`) on the same node,
//        - had a walkable ancestor with an aria-label matching
//          `/^to\b|recipients/i` / `/^cc\b/i` / `/^bcc\b/i` so the
//          field-of-origin partition is deterministic.
//
// SINGLE-COMPOSE CONTRACT (matches §5.2 + §5.5.1):
// The §5.2 multi-compose safety net hands off to native at ≥2 composes,
// so by the time the §5.3 modal opens there is exactly one compose. We
// still scope queries to the chevron's compose-pane subtree (not the
// whole document) so a stray ≥2-compose state can't accidentally merge
// recipients from two composes (defense in depth).
//
// FAIL-OPEN (§6.7): any throw → empty array. The §5.3.5 OptimizeSection
// treats empty-array as "no recipients yet" and hides the section (spec
// (a) — visible only when there's a recipient). Quick Options / Pick
// Custom remain fully usable; Gmail's own UI already signals missing
// recipients (Send disabled), so the user is never silently stranded.
//
// SINGLE POINT OF FAILURE: this module owns the compose-recipient DOM
// shape (same pattern as `gmail-recipe.ts` owns the Schedule Send DOM
// shape). When Gmail breaks this, run
// `research/compose-recipients-probe.js` again, identify the new
// stable anchor, and fix it here only.

import { SEL_CHEVRON } from "../../lib/schedule/gmail-recipe";

export interface ComposeRecipient {
  /** Verbatim from the chip's `data-hovercard-id` attribute. Case
   * preserved as Gmail rendered it; matching/dedupe is case-insensitive
   * (see normalizeEmail). */
  email: string;
  /** Display name from the chip's `data-name` attribute; null when the
   * attribute is missing/empty (spec (e): never-emailed recipients —
   * Gmail then has no name to put in `data-name`, and email-as-name
   * is the consumer's responsibility, not ours). */
  displayName: string | null;
  /** Field of origin — surfaced as "(To)" / "(CC)" in the dropdown (spec
   * (c)). BCC chips are filtered out before this struct is constructed,
   * so the type narrows to To/CC. */
  field: "To" | "CC";
}

/** Locale-INDEPENDENT-ish anchor for the recipient chip (verified live
 * 2026-05-19). The role attribute is part of ARIA, the `data-hovercard-id`
 * is Gmail's canonical email identity used across the product. */
const SEL_CHIP = 'div[role="option"][data-hovercard-id]';

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Walk up from a chip looking for the nearest ancestor with an
 * aria-label naming the recipient row. Locale-DEPENDENT (the label
 * values are Gmail's English UI strings) — an accepted, narrow
 * locale risk, mirroring the same trade-off already accepted for
 * the chevron in `gmail-recipe.ts` (`SEL_CHEVRON` aria-label). When
 * Gmail breaks locale, this falls through to null, which excludes
 * the chip (safer than guessing the wrong bucket — BCC privacy).
 *
 * Match rules (probe-verified against live Gmail):
 *   - `bcc` / `blind`  → BCC (checked FIRST so it can't be misread as "to")
 *   - `cc` / `carbon`  → CC
 *   - `to` / `recipients` → To
 */
function fieldOfChip(chip: Element): "To" | "CC" | "BCC" | null {
  let el: Element | null = chip;
  while (el && el !== document.body) {
    const aria = (el.getAttribute("aria-label") ?? "").trim().toLowerCase();
    if (aria) {
      if (/\bbcc\b|\bblind\b/.test(aria)) return "BCC";
      if (/\bcc\b|\bcarbon\b/.test(aria)) return "CC";
      if (/\bto\b|\brecipients\b/.test(aria)) return "To";
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Resolve the compose pane that contains `chevron`. Walks up to the
 * highest ancestor that still contains exactly ONE chevron AND a
 * compose-body anchor (contenteditable / textarea / text input). No
 * coupling to obfuscated Gmail classes — Gmail's class names drift; the
 * structural shape doesn't. Same heuristic the probe uses (canonical
 * reference: `research/compose-recipients-probe.js`).
 */
function composePaneFor(chevron: Element): Element {
  let el = chevron.parentElement;
  let best: Element = chevron;
  while (el && el !== document.body) {
    const inChev = el.querySelectorAll(SEL_CHEVRON).length;
    const hasBody = el.querySelector(
      '[contenteditable="true"], textarea, input[type="text"]',
    );
    if (inChev === 1 && hasBody) best = el;
    if (inChev > 1) break; // crossed into a region holding multiple composes
    el = el.parentElement;
  }
  return best;
}

function chipText(chip: Element): string {
  const raw = chip.getAttribute("data-name");
  return (raw ?? "").trim();
}

/**
 * Read the active compose's To + CC recipients. BCC is excluded by spec
 * (chips inferred as BCC by `fieldOfChip` are dropped). Order: all To
 * chips first (in compose order), then all CC chips. Dedupes
 * case-insensitively by email — if the same address appears in both
 * To and CC (rare), the To entry wins.
 *
 * Returns an EMPTY array on any DOM read failure (§6.7 graceful
 * degradation). The §5.3.5 UI treats empty as "no recipients" and
 * hides the Optimize section.
 */
export function readComposeRecipients(): ComposeRecipient[] {
  try {
    const chevrons = Array.from(
      document.querySelectorAll<HTMLElement>(SEL_CHEVRON),
    );
    if (chevrons.length === 0) return [];

    const to: ComposeRecipient[] = [];
    const cc: ComposeRecipient[] = [];
    const seen = new Set<string>();

    for (const chevron of chevrons) {
      const pane = composePaneFor(chevron);
      const chips = pane.querySelectorAll<HTMLElement>(SEL_CHIP);
      for (const chip of Array.from(chips)) {
        const email = (chip.getAttribute("data-hovercard-id") ?? "").trim();
        if (!email) continue;
        const key = normalizeEmail(email);
        if (seen.has(key)) continue;
        const field = fieldOfChip(chip);
        if (field !== "To" && field !== "CC") continue; // BCC or unknown → skip
        seen.add(key);
        const name = chipText(chip);
        const displayName = name && normalizeEmail(name) !== key ? name : null;
        const rec: ComposeRecipient = { email, displayName, field };
        if (field === "To") to.push(rec);
        else cc.push(rec);
      }
    }
    return [...to, ...cc];
  } catch {
    return [];
  }
}
