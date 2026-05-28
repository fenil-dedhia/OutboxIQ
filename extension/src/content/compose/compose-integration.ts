// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.2 — Compose Window Integration.
//
// Two responsibilities, both anchored on the locale-independent
// `selector="scheduledSend"` menuitem (the only stable hook the spike found):
//
//   §5.2.1  Relabel the native "Schedule send" dropdown item to
//           "Schedule Send (powered by Fashionably Late)". Cosmetic, best-effort.
//   §5.2.2  Intercept its activation and open Fashionably Late's modal instead of
//           Gmail's native scheduling modal.
//
// §5.2.3 is the hard rule that shapes everything here: if anything we do
// throws, Gmail's native Schedule Send MUST keep working. We therefore (a)
// keep relabel and interception independent (a broken relabel never affects
// interception, and vice-versa), (b) only ever call preventDefault once we
// have positively matched the scheduledSend item, and (c) on any failure in
// our own modal path, replay the activation to Gmail so the user is never
// stranded.
//
// The menu that contains the item is a popup Gmail (re)creates on every open
// of the "More send options" dropdown — it does NOT exist at compose-open
// time — so we observe the document for it appearing rather than scanning
// once. All Gmail DOM knowledge lives in ../../lib/schedule/gmail-recipe.

import {
  SEL_SCHEDULE_MENUITEM,
  composeCount,
  fireFull,
} from "../../lib/schedule/gmail-recipe";
import { SCHEDULE_SEND_LABEL } from "../../lib/constants";
import { isCurrentOwner } from "../page-install-latch";

/** Passed to the modal opener. §5.2 only needs the triggering item; §5.3 will
 * extend this (recipients, subject) when it reads the compose window. */
export interface ScheduleSendContext {
  menuItem: HTMLElement;
}

export interface ComposeIntegrationOptions {
  /** Open the Fashionably Late modal (§5.3). Thrown errors trigger native fallback. */
  onScheduleSend: (ctx: ScheduleSendContext) => void;
}

// Where we stash each menuitem's ORIGINAL visible text the first time we see
// it, so the label can be reverted locale-safely (never hardcode "Schedule
// send" — spike locale-risk rule). Replaces the old one-way "relabelled=1"
// latch (Session 5.5 fix): the latch + skip-without-revert is exactly why
// the label froze and disagreed across composes (smoke Bug 1 + Bug 2).
const ORIG_LABEL_ATTR = "data-outboxiq-orig";
const isDev = (): boolean => import.meta.env.DEV;

// ---- §5.2.1 Relabel (defensive, best-effort) ------------------------------
// Structure confirmed by research/pick-date-time-probe.md (Result log):
//   div.J-N.yr[selector="scheduledSend"]
//     └ div.J-N-Jz
//         ├ img.v5.J-N-JX        (cleardot.gif spacer — MUST be preserved)
//         └ #text "Schedule send"  ← the visible label is THIS text node
//
// We replace the single longest visible TEXT NODE in place, never an
// element's textContent (that would delete the spacer img). Unexpected
// shape → SKIP silently (a missing suffix is cosmetic; never break Gmail).
//
// THE LABEL IS REACTIVE TO COMPOSE COUNT. In multi-compose the safety net
// hands Schedule Send to native, so the Fashionably Late label would be a lie —
// the item must read Gmail's native text instead. This is driven by the
// SAME predicate the safety net uses (multipleComposeWindows()), so the
// visible label can never disagree with what a click actually does
// (invariant — do not introduce a second source of truth). applied both
// on menuitem insertion AND on every compose-count boundary cross (see the
// observer in installComposeIntegration). The earlier Session 5.5 comment
// here ("ephemeral menu re-evaluates every open, no listener needed") was
// WRONG — falsified by the hands-on 4-state smoke test; the label is NOT
// re-evaluated on compose open/close without the observer trigger below.
//
// NOTE: the jsdom tests exercise this decision/reactivity logic only. They
// CANNOT prove the real Gmail selectors match or that Gmail emits the
// childList mutations assumed here — that is the hands-on 4-state Chrome
// test, which is the load-bearing verification. Green jsdom ≠ verified.

/** Pure decision: the label this menuitem should show right now. Single
 * compose → the Fashionably Late brand; multi-compose → Gmail's own original
 * (safety net is active, so Fashionably Late won't run — don't claim it will). */
export function desiredScheduleLabel(
  multiCompose: boolean,
  originalLabel: string,
): string {
  return multiCompose ? originalLabel : SCHEDULE_SEND_LABEL;
}

function longestTextNode(menuItem: HTMLElement): Text | null {
  const textNodes: Text[] = [];
  const visit = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if ((child.textContent ?? "").trim().length > 0) {
          textNodes.push(child as Text);
        }
      } else {
        visit(child);
      }
    }
  };
  visit(menuItem);
  return textNodes.reduce<Text | null>(
    (best, n) =>
      (n.textContent ?? "").trim().length >
      (best?.textContent ?? "").trim().length
        ? n
        : best,
    null,
  );
}

/**
 * Apply the correct Schedule-send label for the CURRENT compose count.
 * Idempotent and bidirectional: writes only when the text differs, so
 * re-running it in a stable state is a no-op (this is the anti-flicker
 * guard — the label changes exactly once, at a real 1↔≥2 transition, and
 * only if it isn't already correct). Setting nodeValue does not retrigger
 * the observer (it watches childList, not characterData) — no self-loop.
 */
function applyScheduleSendLabel(menuItem: HTMLElement): void {
  const bestNode = longestTextNode(menuItem);
  if (!bestNode) {
    if (isDev()) {
      console.warn(
        "[Fashionably Late] §5.2 relabel: no text node in scheduledSend item — " +
          "skipped (cosmetic; interception unaffected).",
      );
    }
    return;
  }
  // Capture the original (native) text exactly once, before any overwrite,
  // so a revert restores Gmail's real string in any locale.
  if (!menuItem.hasAttribute(ORIG_LABEL_ATTR)) {
    menuItem.setAttribute(ORIG_LABEL_ATTR, bestNode.nodeValue ?? "");
  }
  const original = menuItem.getAttribute(ORIG_LABEL_ATTR) ?? "";
  const desired = desiredScheduleLabel(multipleComposeWindows(), original);
  if (bestNode.nodeValue !== desired) bestNode.nodeValue = desired;
}

// ---- §5.2.2 Interception ---------------------------------------------------

/** Set while WE drive Gmail natively (fallback) so our own capture listener
 * ignores the synthetic activation it would otherwise re-intercept. */
let suppressInterception = false;

// Gmail's menu is light DOM (not shadow), so the event target's ancestor
// chain is sufficient — no composedPath needed. We climb from the deepest
// target via closest(), which finds the menuitem whether the user clicked
// the wrapper or an inner content node (the recipe dispatches on the inner
// node; real users may hit either).
function matchedScheduleItem(e: Event): HTMLElement | null {
  const t = e.target;
  if (!(t instanceof Element) || typeof t.closest !== "function") return null;
  return t.closest<HTMLElement>(SEL_SCHEDULE_MENUITEM);
}

/**
 * Run `fn` with our own capture interceptor disabled. Used whenever Fashionably Late
 * itself drives Gmail's native Schedule UI (the modal's scheduling actions,
 * the §5.2.3 fallback) so the synthetic activation we generate is not
 * re-intercepted into an infinite loop.
 */
export async function withInterceptionSuppressed<T>(
  fn: () => Promise<T>,
): Promise<T> {
  suppressInterception = true;
  try {
    return await fn();
  } finally {
    suppressInterception = false;
  }
}

/** Best-effort tidy: close Gmail's lingering popup menu. Not load-bearing. */
function dismissGmailMenu(): void {
  try {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  } catch {
    /* tidy-up only; ignore */
  }
}

/** If our modal path fails, replay the activation to Gmail so native
 * Schedule Send still opens (PRD §5.2.3). Suppressed so we don't re-intercept
 * our own synthetic events. */
async function fallbackToNative(menuItem: HTMLElement): Promise<void> {
  try {
    await withInterceptionSuppressed(() =>
      fireFull(menuItem, "§5.2.3 native fallback"),
    );
  } catch {
    /* nothing more we can safely do; native menu is still user-clickable */
  }
}

// ---- Multi-compose safety net (Session 5 owner decision) -------------------
// When two+ compose windows are open in the same document, Fashionably Late's
// scheduling path cannot safely tell which one the user acted on: the native
// driver in schedule-actions resolves the chevron via a global
// `document.querySelector(SEL_CHEVRON)`, which deterministically targets the
// LEFTMOST compose — silently scheduling the wrong email (smoke-test
// Scenario 4, Session 5). Until the full compose-scoping fix lands (its own
// session — the detached-popup anchor problem), we detect this case and hand
// off to Gmail's own Schedule Send by replaying activation on the REAL
// clicked menuItem, which IS compose-scoped (Gmail's jsaction binds it to the
// originating compose), so Gmail schedules the CORRECT email. Graceful
// degradation: the user simply gets Gmail's native scheduler, no message.
//
// Each compose's Send button carries exactly one chevron ("More send
// options"); counting them measures the exact ambiguity surface. A
// popped-out compose is a separate document, so this correctly fires only
// for same-window multi-compose (smoke-test Scenarios 1/3 were single-chevron
// per document and are unaffected). composeCount() is the single source of
// truth (gmail-recipe.ts), shared with the §5.5.1 guard so the two can never
// disagree about "how many composes".
function multipleComposeWindows(): boolean {
  return composeCount() >= 2;
}

// One user activation is mousedown → mouseup → click. We block native at the
// earliest event we see (mousedown) so Gmail's jsaction delegate never fires,
// but we COMMIT to opening only on `click` — the unambiguous "activate"
// signal (also what keyboard Enter dispatches). This needs no cross-event
// guard, so there is no leaky module state to reset.
function makeInterceptor(onScheduleSend: (ctx: ScheduleSendContext) => void) {
  return (e: Event): void => {
    // Orphaned/superseded copy (post-reload) — stay inert so the newest live
    // instance owns interception (page-install-latch). Never block here.
    if (!isCurrentOwner()) return;
    if (suppressInterception) return;
    let menuItem: HTMLElement | null;
    try {
      menuItem = matchedScheduleItem(e);
    } catch {
      return; // matching failed → let Gmail handle it natively
    }
    if (!menuItem) return;

    // Positively matched: now (and only now) block native, both events.
    e.preventDefault();
    e.stopImmediatePropagation();

    if (e.type !== "click") return; // mousedown: block only, don't open

    // Multi-compose safety net (Session 5). Don't risk the silent wrong-email
    // mis-target: replay activation on the real (compose-scoped) menuItem so
    // Gmail's native Schedule Send handles the correct compose. Note: we do
    // NOT dismissGmailMenu() here — the menuItem must stay live for the
    // native replay to land on it.
    if (multipleComposeWindows()) {
      // Intentionally NOT isDev()-gated: the owner wants visibility into how
      // often this path fires with real test users (a single, deliberate
      // diagnostic line — not the DEV-gated debug noise; console output is
      // local, so no conflict with the zero-telemetry rule).
      console.info(
        "[Fashionably Late] multi-compose detected, falling back to native Schedule Send",
      );
      void fallbackToNative(menuItem);
      return;
    }

    dismissGmailMenu();
    try {
      onScheduleSend({ menuItem });
    } catch (err) {
      if (isDev()) {
        console.warn(
          "[Fashionably Late] §5.2 modal open failed — falling back to native:",
          err,
        );
      }
      void fallbackToNative(menuItem);
    }
  };
}

// ---- Install ---------------------------------------------------------------

/**
 * Wire §5.2 into the live Gmail page. Returns a teardown (used by tests; the
 * content script installs once for the page lifetime). Fully guarded: a
 * failure to install must never break Gmail.
 */
export function installComposeIntegration(
  opts: ComposeIntegrationOptions,
): () => void {
  const interceptor = makeInterceptor(opts.onScheduleSend);

  // Capture phase, document level: runs before Gmail's bubble-phase jsaction
  // delegate, and our stopImmediatePropagation prevents that delegate from
  // ever seeing the event. Both events: mousedown (Gmail may activate early)
  // and click. Scoped tightly in matchedScheduleItem so nothing else is
  // ever affected (§5.2.3).
  const events: Array<keyof DocumentEventMap> = ["mousedown", "click"];

  const applyLabelToAllMenuItems = (): void => {
    try {
      document
        .querySelectorAll<HTMLElement>(SEL_SCHEDULE_MENUITEM)
        .forEach(applyScheduleSendLabel);
    } catch {
      /* relabel is best-effort; never throw into Gmail */
    }
  };

  // The compose count when we last re-applied. The label only needs
  // re-applying when this crosses the 1↔≥2 boundary (a compose opened or
  // closed) — gating on the boundary is what stops per-mutation churn and
  // flicker. The observer fires on compose open AND close (subtree add/
  // remove), so this reuses the one existing watcher rather than adding a
  // second observer or a poller.
  let lastMulti = false;

  let observer: MutationObserver | null = null;
  try {
    for (const ev of events) {
      document.addEventListener(ev, interceptor, true);
    }

    observer = new MutationObserver((mutations) => {
      try {
        // Orphaned/superseded copy — let the active instance's observer relabel.
        if (!isCurrentOwner()) return;
        // 1. Newly inserted menuitems get the correct CURRENT label
        //    immediately (a freshly opened dropdown never flashes wrong).
        for (const m of mutations) {
          for (const node of Array.from(m.addedNodes)) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches?.(SEL_SCHEDULE_MENUITEM)) {
              applyScheduleSendLabel(node);
            }
            node
              .querySelectorAll?.<HTMLElement>(SEL_SCHEDULE_MENUITEM)
              .forEach(applyScheduleSendLabel);
          }
        }
        // 2. A compose opened/closed (childList add/remove anywhere) →
        //    if the 1↔≥2 boundary actually flipped, re-apply to EVERY
        //    present menuitem so all composes agree. Boundary-gated so
        //    intra-state mutations are no-ops (anti-flicker).
        const nowMulti = multipleComposeWindows();
        if (nowMulti !== lastMulti) {
          lastMulti = nowMulti;
          applyLabelToAllMenuItems();
        }
      } catch {
        /* observer must never throw into Gmail */
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    lastMulti = multipleComposeWindows();
    applyLabelToAllMenuItems(); // menu may already be open at install time
  } catch (err) {
    if (isDev()) {
      console.warn(
        "[Fashionably Late] §5.2 install failed (Gmail unaffected):",
        err,
      );
    }
  }

  return (): void => {
    for (const ev of events) {
      document.removeEventListener(ev, interceptor, true);
    }
    observer?.disconnect();
  };
}
