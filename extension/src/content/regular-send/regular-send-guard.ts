// ============================================================================
// PRD §5.5.1 — regular "Send" button guard. THE HIGHEST-CRITICALITY MODULE.
//
// A bug here = users cannot send email. §5.2.3 ("never block native Gmail")
// is a hard rule. The invariant every branch obeys: EITHER complete the
// user's intent OR fall through to native Send. We only ever preventDefault
// when we are CERTAIN there is a real working-hours/absolute violation AND
// the soft-warning modal is taking over; every other path returns without
// touching the event, so an in-hours Send is never even observed.
//
// Verified against live Gmail by research/send-button-probe.{js,md}
// (Session 6, hands-on, gate cleared):
//   • Gmail finalises the send on a LATER event of the gesture (pointerup/
//     click), not mousedown — so we must intercept the WHOLE gesture, not a
//     single event. Confirmed: blocking pointerdown+pointerup+click+keydown
//     at document capture stopped every send (mouse AND ⌘/Ctrl+Enter), 2×.
//   • Replaying via fireFull (and even plain) re-sends — so "Send now
//     anyway" / fail-toward-send is realisable.
//   • The Send button is compose-scoped per pane (not the detached-popup
//     problem). We still defer entirely on ≥2 composes: the snap path drives
//     the Schedule recipe whose global chevron query mis-targets multi-
//     compose (the §5.2 safety net / launch-blocking item) — so multi-
//     compose falls through to native Send (fail-toward-send).
//
// Locked split (CLAUDE.md "Locked product decisions"): §5.5.1 acts on the
// FULL verdict — working-hours OR absolute. An *immediate* off-hours send is
// plausibly unintended; contrast §5.3 Schedule Send, which warns on absolute
// only (a deliberate off-hours *schedule* is the core use case).
// ============================================================================

import {
  singleComposeSendButton,
  fireFull,
} from "../../lib/schedule/gmail-recipe";
import {
  formatForGmail,
  nowWallInTimeZone,
} from "../../lib/schedule/gmail-format";
import { formatTimezoneLabel } from "../../lib/schedule/timezone-format";
import { checkWorkingHours } from "../../lib/schedule/working-hours";
import {
  scheduleAt,
  openNativeScheduleDialog,
} from "../schedule-modal/schedule-actions";
import { getCachedConfig } from "./config-cache";
import {
  openRegularSendWarning,
  type RegularSendWarningHandle,
} from "./warning-mount";
import type { LastScheduled } from "../../lib/storage";
import type { WallTime } from "../../lib/schedule/gmail-format";

export interface RegularSendGuardOptions {
  /** Persist a freshly-scheduled time (the snap path) so it becomes the
   * "Last scheduled time" row next open — same wiring as handleScheduleSend.
   * Fire-and-forget; a storage failure must not break the flow. */
  onScheduled?: (v: LastScheduled) => void;
}

const isDev = (): boolean => import.meta.env.DEV;

// Whole-gesture coverage (probe finding): mousedown alone leaks because
// Gmail finalises on pointerup/click. keydown covers ⌘/Ctrl+Enter.
const SEND_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
  "pointerdown",
  "mousedown",
  "pointerup",
  "mouseup",
  "click",
  "keydown",
];

// State is PER-INSTALL (closure-scoped via GuardState), never module-global:
// the content script installs exactly one guard for the page lifetime, but
// module-global latches leak across re-installs and — more importantly — a
// latch that must be perfectly reset is itself the §5.2.3 hazard (a single
// missed reset would wedge the guard into blocking every Send forever).
interface GuardState {
  /** Our soft-warning modal is up — hold the line until the user chooses. */
  modalOpen: boolean;
  /** True only while WE replay the native Send, so our own synthetic gesture
   * isn't re-intercepted into a loop. */
  suppressed: boolean;
  /** Watchdog: force-clears modalOpen if the modal host ever vanished
   * WITHOUT one of its handlers running (e.g. Gmail nuked the DOM). The
   * normal exits reset immediately; this only guarantees the guard can
   * never permanently wedge sending — the §5.2.3 catastrophe. */
  watchdog: ReturnType<typeof setTimeout> | null;
}

// Far longer than any real "schedule or send?" decision, but bounded so a
// vanished modal can never block Send indefinitely.
const WATCHDOG_MS = 30_000;

function clearWatchdog(s: GuardState): void {
  if (s.watchdog !== null) {
    clearTimeout(s.watchdog);
    s.watchdog = null;
  }
}

/** Modal is done (chosen / errored / torn down): release the line. */
function releaseModal(s: GuardState): void {
  s.modalOpen = false;
  clearWatchdog(s);
}

function isKbdSend(e: Event): boolean {
  return (
    e instanceof KeyboardEvent &&
    e.type === "keydown" &&
    e.key === "Enter" &&
    (e.ctrlKey || e.metaKey)
  );
}

/** The single compose's Send button IF this event is activating it, else
 * null. Returns null for 0 or ≥2 composes (multi-compose safety net) so
 * §5.5.1 simply doesn't intercept — native Send proceeds. */
function sendButtonForEvent(e: Event): HTMLElement | null {
  const btn = singleComposeSendButton();
  if (!btn) return null;
  if (isKbdSend(e)) return btn; // ⌘/Ctrl+Enter sends the one open compose
  const t = e.target;
  if (t instanceof Node && (t === btn || btn.contains(t))) return btn;
  return null;
}

function block(e: Event): void {
  e.preventDefault();
  e.stopImmediatePropagation();
}

async function replayNativeSend(
  s: GuardState,
  btn: HTMLElement,
): Promise<void> {
  s.suppressed = true;
  try {
    await fireFull(btn, "§5.5.1 replay (Send now anyway / fail-toward-send)");
  } catch {
    // Replay IS the send mechanism; if it fails the email simply didn't go
    // and the compose is intact (the user can retry). There is nothing to
    // fall back TO — never escalate this into a different action.
  } finally {
    s.suppressed = false;
  }
}

async function doSnap(
  snap: WallTime,
  onScheduled?: (v: LastScheduled) => void,
): Promise<void> {
  const f = formatForGmail(snap);
  try {
    await scheduleAt({ gmailDate: f.gmailDate, gmailTime: f.gmailTime });
    try {
      onScheduled?.({
        display: f.display,
        gmailDate: f.gmailDate,
        gmailTime: f.gmailTime,
      });
    } catch {
      /* persistence is best-effort; never break the flow */
    }
  } catch (err) {
    if (isDev()) {
      console.warn("[OutboxIQ] §5.5.1 snap failed → native scheduler:", err);
    }
    // The user chose to RESCHEDULE, not send now. Failing toward an immediate
    // send would deliver exactly what they asked to delay — so the only safe
    // fallback is Gmail's own scheduler (let them finish manually). If even
    // that can't open, do nothing: the Send was prevented, the compose is
    // intact, nothing wrong was sent.
    try {
      await openNativeScheduleDialog();
    } catch {
      /* compose intact; user can act manually */
    }
  }
}

function makeHandler(opts: RegularSendGuardOptions, s: GuardState) {
  return (e: Event): void => {
    if (s.suppressed) return; // our own replay gesture

    // While our modal is up, keep blocking native send attempts only — never
    // unrelated events (the modal lives in a Shadow DOM, so its own clicks
    // retarget to the host and never match sendButtonForEvent).
    if (s.modalOpen) {
      try {
        if (sendButtonForEvent(e)) block(e);
      } catch {
        /* detection must never break Gmail */
      }
      return;
    }

    let btn: HTMLElement | null;
    try {
      btn = sendButtonForEvent(e);
    } catch {
      return; // matching failed → let Gmail send natively
    }
    if (!btn) return;

    const cfg = getCachedConfig();
    if (!cfg) return; // rules not loaded yet → fail-OPEN: native Send proceeds

    let snap: WallTime | null;
    let verdict;
    try {
      verdict = checkWorkingHours(
        nowWallInTimeZone(cfg.timezone),
        cfg.workingHours,
      );
      snap = verdict.snap;
    } catch {
      return; // calc threw → fail-toward-send
    }
    if (verdict.ok) return; // in-hours: the common case, never touched (§5.2.3)
    if (!snap) return; // unreachable for a real violation; if so, don't block

    // Certain violation → block THIS gesture event; open the soft warning
    // once. Every subsequent event of the same gesture re-enters here, sees
    // modalOpen, and is blocked too (whole-gesture suppression — the probe
    // proved a single event leaks).
    block(e);
    s.modalOpen = true;
    clearWatchdog(s);
    s.watchdog = setTimeout(() => {
      s.modalOpen = false;
      s.watchdog = null;
    }, WATCHDOG_MS);

    const tzAbbr = formatTimezoneLabel(cfg.timezone, new Date()).abbr;
    const sendBtn = btn;
    const snapWall = snap;
    let handle: RegularSendWarningHandle | null = null;

    // Each choice: close the host FIRST (so the backdrop can't obstruct the
    // Gmail DOM the recipe drives — elementFromPoint), release the line,
    // then run the async action on the next tick.
    const choose =
      (after: () => void): (() => void) =>
      () => {
        handle?.close();
        releaseModal(s);
        setTimeout(after, 0);
      };

    try {
      handle = openRegularSendWarning({
        verdict,
        tzAbbr,
        onSnap: choose(() => {
          void doSnap(snapWall, opts.onScheduled);
        }),
        onProceed: choose(() => {
          void replayNativeSend(s, sendBtn);
        }),
        onCancel: choose(() => {
          /* dismissed: Send was prevented, compose intact, nothing sent */
        }),
        // Render-time throw: we already blocked this gesture but no modal —
        // MUST fail toward send so the user is never stranded (§5.2.3).
        onRenderError: () => {
          releaseModal(s);
          void replayNativeSend(s, sendBtn);
        },
      });
    } catch (err) {
      // Synchronous mount failure: same hole as a render throw. The user
      // clicked Send — honour it.
      if (isDev()) {
        console.warn("[OutboxIQ] §5.5.1 modal mount failed → send:", err);
      }
      releaseModal(s);
      void replayNativeSend(s, sendBtn);
    }
  };
}

/**
 * Install the §5.5.1 guard. Returns a teardown (used by tests; the content
 * script installs once for the page lifetime). Fully guarded — a failure to
 * install must never break Gmail.
 */
export function installRegularSendGuard(
  opts: RegularSendGuardOptions = {},
): () => void {
  const s: GuardState = {
    modalOpen: false,
    suppressed: false,
    watchdog: null,
  };
  const handler = makeHandler(opts, s);
  try {
    for (const ev of SEND_EVENTS) {
      document.addEventListener(ev, handler, true);
    }
  } catch (err) {
    if (isDev()) {
      console.warn("[OutboxIQ] §5.5.1 install failed (Gmail unaffected):", err);
    }
  }
  return (): void => {
    for (const ev of SEND_EVENTS) {
      document.removeEventListener(ev, handler, true);
    }
    clearWatchdog(s);
  };
}
