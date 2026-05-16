// PRD §5.2 — Compose Window Integration.
//
// Two responsibilities, both anchored on the locale-independent
// `selector="scheduledSend"` menuitem (the only stable hook the spike found):
//
//   §5.2.1  Relabel the native "Schedule send" dropdown item to
//           "Schedule Send (powered by OutboxIQ)". Cosmetic, best-effort.
//   §5.2.2  Intercept its activation and open OutboxIQ's modal instead of
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
  fireFull,
} from "../../lib/schedule/gmail-recipe";
import { SCHEDULE_SEND_LABEL } from "../../lib/constants";

/** Passed to the modal opener. §5.2 only needs the triggering item; §5.3 will
 * extend this (recipients, subject) when it reads the compose window. */
export interface ScheduleSendContext {
  menuItem: HTMLElement;
}

export interface ComposeIntegrationOptions {
  /** Open the OutboxIQ modal (§5.3). Thrown errors trigger native fallback. */
  onScheduleSend: (ctx: ScheduleSendContext) => void;
}

const RELABELLED_ATTR = "data-outboxiq-relabelled";
const isDev = (): boolean => import.meta.env.DEV;

// ---- §5.2.1 Relabel (defensive, best-effort) ------------------------------
// The scheduledSend menuitem's internal structure is confirmed via
// research/pick-date-time-probe.md (dumpRelabelTarget). Until that hands-on
// dump lands we target the leaf element that owns the most visible text and
// overwrite it. If the shape is unexpected we SKIP silently — a missing
// "powered by OutboxIQ" suffix is cosmetic; never let it break Gmail.
// TODO(post-probe): tighten the leaf selection against the dumped structure.
function relabelScheduleSendItem(menuItem: HTMLElement): void {
  if (menuItem.getAttribute(RELABELLED_ATTR) === "1") return;
  menuItem.setAttribute(RELABELLED_ATTR, "1");

  let best: { el: Element; len: number } | null = null;
  const walk = (n: Element): void => {
    for (const child of Array.from(n.children)) {
      const ownText = Array.from(child.childNodes)
        .filter((x) => x.nodeType === Node.TEXT_NODE)
        .map((x) => (x.textContent ?? "").trim())
        .join("");
      if (ownText && (!best || ownText.length > best.len)) {
        best = { el: child, len: ownText.length };
      }
      walk(child);
    }
  };
  walk(menuItem);

  if (best) {
    (best as { el: Element }).el.textContent = SCHEDULE_SEND_LABEL;
  } else if (isDev()) {
    console.warn(
      "[OutboxIQ] §5.2 relabel: no text leaf in scheduledSend item — " +
        "skipped (cosmetic; interception unaffected). Confirm via probe.",
    );
  }
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
 * Run `fn` with our own capture interceptor disabled. Used whenever OutboxIQ
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

// One user activation is mousedown → mouseup → click. We block native at the
// earliest event we see (mousedown) so Gmail's jsaction delegate never fires,
// but we COMMIT to opening only on `click` — the unambiguous "activate"
// signal (also what keyboard Enter dispatches). This needs no cross-event
// guard, so there is no leaky module state to reset.
function makeInterceptor(onScheduleSend: (ctx: ScheduleSendContext) => void) {
  return (e: Event): void => {
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

    dismissGmailMenu();
    try {
      onScheduleSend({ menuItem });
    } catch (err) {
      if (isDev()) {
        console.warn(
          "[OutboxIQ] §5.2 modal open failed — falling back to native:",
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

  const relabelAll = (): void => {
    try {
      document
        .querySelectorAll<HTMLElement>(SEL_SCHEDULE_MENUITEM)
        .forEach(relabelScheduleSendItem);
    } catch {
      /* relabel is best-effort; never throw into Gmail */
    }
  };

  let observer: MutationObserver | null = null;
  try {
    for (const ev of events) {
      document.addEventListener(ev, interceptor, true);
    }

    observer = new MutationObserver((mutations) => {
      try {
        for (const m of mutations) {
          for (const node of Array.from(m.addedNodes)) {
            if (!(node instanceof HTMLElement)) continue;
            if (node.matches?.(SEL_SCHEDULE_MENUITEM)) {
              relabelScheduleSendItem(node);
            }
            node
              .querySelectorAll?.<HTMLElement>(SEL_SCHEDULE_MENUITEM)
              .forEach(relabelScheduleSendItem);
          }
        }
      } catch {
        /* observer must never throw into Gmail */
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    relabelAll(); // menu may already be open at install time
  } catch (err) {
    if (isDev()) {
      console.warn("[OutboxIQ] §5.2 install failed (Gmail unaffected):", err);
    }
  }

  return (): void => {
    for (const ev of events) {
      document.removeEventListener(ev, interceptor, true);
    }
    observer?.disconnect();
  };
}
