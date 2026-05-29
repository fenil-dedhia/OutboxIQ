// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// PRD §5.3 — Enhanced Schedule Send Modal.
//
// Interaction model (owner-directed refinement 2026-05-16): the modal is
// select-then-confirm. Choosing a Quick Option / "Last scheduled time" /
// entering a custom date+time only *selects* it; nothing is scheduled until
// the user clicks the single primary "Schedule" button (disabled until a
// choice is made). This matches §5.3.5's "Schedule button commits" wording.
//
// In scope: §5.3.1 layout, §5.3.2 header + timezone subtitle, §5.3.3 Quick
// Options + "Last scheduled time" row (§5.3.3 amendment), §5.3.4 custom
// picker ("Pick custom"), §5.3.5 Optimize-for-X (Session 10 — items a–n).
//
// §5.5 soft warning: NONE on the Schedule Send path (as of SCHEMA_VERSION 4,
// Session 17). Deliberately scheduling outside your working hours is the core
// use case (locked Entry 21), so it was never warned; the global "Default
// boundaries" that were the only Schedule-Send warning trigger have been
// removed entirely. So every path here — Quick Options / Pick Custom / Last
// scheduled time / Optimize-for-X — schedules directly. `gate()` is now just a
// past-time guard. (The working-hours soft warning lives only on §5.5.1
// regular Send, where an *immediate* off-hours send is plausibly unintended.)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computePresets,
  type SchedulePreset,
} from "../../lib/schedule/presets";
import { formatTimezoneLabel } from "../../lib/schedule/timezone-format";
import {
  formatForGmail,
  parsePickerInputs,
  parseGmailDateTime,
  nowWallInTimeZone,
  addMinutesToWall,
  isPastWallTime,
  wallToDateInput,
  wallToTimeInput,
  type WallTime,
} from "../../lib/schedule/gmail-format";
import {
  schedulePreset,
  scheduleAt,
  openNativeScheduleDialog,
} from "./schedule-actions";
import { OptimizeSection, type OptimizeChoice } from "./OptimizeSection";
import { useLivePinnedTimezones } from "./use-live-pinned-timezones";
import { computeOptimizeSendTime } from "../../lib/schedule/optimize-time";
import { setManualRecipientTimezone } from "../../lib/recipient-cache";
import type { ComposeRecipient } from "../compose/compose-recipients";
import type { LastScheduled } from "../../lib/storage";
import { SymbolMark } from "../../lib/components/BrandLogo";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string };

// What the user has chosen but not yet committed.
type Selection =
  | { kind: "last" }
  | { kind: "preset"; preset: SchedulePreset }
  | { kind: "custom"; wall: WallTime };

export interface ScheduleModalProps {
  /** The user's configured IANA timezone (PRD §7.2 user.timezone). */
  timezone: string;
  /** Last time scheduled via Fashionably Late, or null (PRD §5.3.3 amendment). */
  lastScheduled: LastScheduled | null;
  /** Compose's current To+CC recipients (PRD §5.3.5 (b); BCC excluded).
   * Empty when the user opened Schedule Send with no recipients yet, or
   * when DOM read failed (§6.7 fail-open). Empty → Optimize section is
   * hidden so the user can still use Quick Options / Pick Custom. */
  recipients: ComposeRecipient[];
  /** User's pinned IANA zones (PRD §5.1.3 Step 2) — forwarded to the §5.3.5 (i)
   * cache-miss timezone picker so it shows the "Pinned" section. */
  pinnedTimezones: string[];
  /** §5.8.2 "Recipient optimized scheduling" toggle. When false, the §5.3.5
   * Optimize section is not rendered at all (the rest of the modal is
   * unaffected). */
  optimizeEnabled: boolean;
  /** Persist a freshly-scheduled time so it becomes "Last scheduled time". */
  onScheduled: (v: LastScheduled) => void;
  /** PRD §5.8.1 access point: the modal-header gear opens the Settings page. */
  onOpenSettings: () => void;
  onClose: () => void;
}

type ScheduleAction = () => Promise<void>;

// (c) reveal-on-stall backstop (Session 19). If a hand-off neither succeeds
// nor fails within this window, our max-z backdrop is torn down so Gmail's
// native surface (already being driven underneath) is visible instead of
// occluding it for the recipe's full ~4s row-wait timeout. Chosen to sit
// safely ABOVE a normal successful hand-off (~1s: chevron→menu→dialog→row
// clicks, each gated by a ~120ms recipe sleep) and BELOW the recipe's 4000ms
// waitFor failure timeout — so a healthy schedule closes on success before
// this fires (no native-menu flash on the happy path), while a genuinely
// stuck hand-off reveals native Gmail promptly. This is the one timing
// coupling here; if the recipe's waitFor timeout changes, revisit this value.
const REVEAL_ON_STALL_MS = 2500;

function lastToRemember(ls: LastScheduled): LastScheduled {
  return {
    display: ls.display,
    gmailDate: ls.gmailDate,
    gmailTime: ls.gmailTime,
  };
}

export function ScheduleModal({
  timezone,
  lastScheduled,
  recipients,
  pinnedTimezones,
  optimizeEnabled,
  onScheduled,
  onOpenSettings,
  onClose,
}: ScheduleModalProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  // §5.3.5 Optimize-for-X state. When non-null the user has a complete
  // Optimize choice (recipient + tz + timing); the Schedule button reads
  // EITHER this OR `selection`, and commits via `commitOptimize` (which
  // bypasses §5.5 per Entry 40 Case 1).
  const [optimize, setOptimize] = useState<OptimizeChoice | null>(null);
  // Bumped each time the user touches a preset / custom row so the
  // OptimizeSection clears its own checkbox (one-decision-at-a-time, §8.7).
  const [optimizeReset, setOptimizeReset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // (b) Recipient guard (Session 19, Entry 59). Whether the compose has at
  // least one TOKENIZED To/CC chip, read ONCE at modal-open time (the
  // `recipients` prop is the single `readComposeRecipients()` snapshot the
  // content script took on open — §5.3.5 (b)). When false, the Schedule action
  // is hard-disabled so we never hand off a send Gmail will reject for "specify
  // at least one recipient" (whose native error would otherwise render BEHIND
  // our max-z backdrop, leaving the user with no visible reason — the bug this
  // fixes). Static for this modal instance by design: no observer/poll — the
  // user Cancels, adds a recipient, and reopens (the same close-fix-reopen flow
  // as Gmail's own scheduler).
  //
  // DOCUMENTED GMAIL-COUPLING ASSUMPTION (Entry 59): this relies on Gmail
  // tokenizing the To field into a chip before the user can reach this action.
  // Owner-tested — writing the subject/body tokenizes a typed To address, and
  // the modal is never opened before a body exists, so the "valid address typed
  // but not yet tokenized into a chip" case (which `readComposeRecipients`, a
  // chip-only reader, cannot distinguish from truly-empty — see
  // research/compose-recipients-probe.md) does not occur in the real flow. If
  // Gmail ever changes tokenization timing, THIS check is the thing to revisit.
  const hasRecipient = recipients.length > 0;

  // §5.8.2 live link: pins reorder/add/remove from the Settings page reflect in
  // this open modal's §5.3.5 (i) picker without reopening (owner UX call,
  // Session 12). Scoped to pins only — timezone/presets/boundaries stay frozen.
  const livePinnedTimezones = useLivePinnedTimezones(pinnedTimezones);

  const now = useMemo(() => new Date(), []);
  const presets = useMemo(() => computePresets(now, timezone), [now, timezone]);
  const tzLabel = useMemo(
    () => formatTimezoneLabel(timezone, now),
    [timezone, now],
  );
  // A2: floor the custom picker at today (user tz). This is the render-time
  // affordance only — the real guard is the FRESH-now check in gate(), so a
  // long-open modal can't slip a now-stale time through.
  const minDate = useMemo(
    () => wallToDateInput(nowWallInTimeZone(timezone, now)),
    [timezone, now],
  );

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      // §8.9: Escape closes the modal. (The §5.5 in-modal warning was removed
      // with Default boundaries in v4 — Schedule Send no longer warns.)
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Session 14 a11y (Gap E — PRD §6.3, §8.9): focus trap. Tab/Shift-Tab
  // cycle within the dialog card so AT can't escape into Gmail's compose
  // behind it. Implemented as a React-level keydown on the card (not a
  // document-level listener) so it doesn't intercept anything outside our
  // shadow root — Gmail's own focus handling stays untouched. Conservative
  // by design: we only re-route Tab when the focus would actually leave
  // the trapped set; ordinary intra-modal Tab navigation is undisturbed.
  function getModalFocusables(): HTMLElement[] {
    const root = cardRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }
  function onCardKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key !== "Tab") return;
    const focusables = getModalFocusables();
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement;
    // The card itself (tabIndex=-1) holds focus on mount; first Tab should
    // jump to the first real focusable — that's what default Tab already
    // does, so we don't need to intercept. We only redirect at the edges.
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Touching a preset / custom / last-row → disengage Optimize so the two
  // can't be simultaneously "ready". One-decision-at-a-time (§8.7).
  function pickSelection(s: Selection): void {
    setSelection(s);
    setOptimizeReset((n) => n + 1);
  }

  // Editing the custom inputs picks "custom" when both are valid; if they
  // become invalid and custom was the active choice, the selection clears.
  function updateCustom(nextDate: string, nextTime: string): void {
    setDate(nextDate);
    setTime(nextTime);
    const wall = parsePickerInputs(nextDate, nextTime);
    if (wall) pickSelection({ kind: "custom", wall });
    else setSelection((s) => (s && s.kind === "custom" ? null : s));
  }

  // Commit `action`, then persist `remember`. Any failure hands off to
  // Gmail's own scheduler so the user is never stranded (PRD §5.2.3).
  //
  // (c) reveal-on-failure / reveal-on-stall backstop (Session 19, Entry 59):
  // our backdrop is z-index max, so while we drive Gmail underneath it any
  // native surface (the schedule dialog, or a validation error) is occluded.
  // On the HAPPY path that's invisible and intended — the recipe completes in
  // ~1s and we close, revealing Gmail's "Message scheduled" confirmation; no
  // native-menu flash. But if the hand-off FAILS (recipe throws) or STALLS
  // (recipe sits in its ~4s waitFor), we tear our modal down promptly so
  // Gmail's own surface is visible rather than stranding the user behind our
  // backdrop. We never setState after a reveal — onClose has unmounted us — so
  // the failure path no longer surfaces an in-modal error (the recipe's own
  // native-dialog fallback is the "never stranded" guarantee, §5.2.3 / §8.1).
  async function run(
    action: () => Promise<void>,
    remember: LastScheduled,
  ): Promise<void> {
    if (status.kind === "busy") return;
    setStatus({ kind: "busy" });

    let revealed = false;
    const reveal = (): void => {
      if (revealed) return;
      revealed = true;
      onClose();
    };
    // Reveal-on-stall: fires only if neither success nor failure has resolved
    // by REVEAL_ON_STALL_MS (well under the recipe's 4s failure timeout, well
    // over a normal ~1s success), so the user never stares at our backdrop for
    // the full timeout. A late success still persists via onScheduled below;
    // onClose is idempotent.
    const stallTimer = setTimeout(reveal, REVEAL_ON_STALL_MS);

    try {
      await action();
      clearTimeout(stallTimer);
      // Success persists "Last scheduled time" even if the stall-reveal already
      // closed us (the schedule did land) — but we only close here if it
      // hasn't already, so the happy path keeps its single seamless close.
      onScheduled(remember);
      if (!revealed) onClose();
    } catch (err) {
      clearTimeout(stallTimer);
      if (import.meta.env.DEV) {
        console.warn(
          "[Fashionably Late] §5.3 scheduling failed → native:",
          err,
        );
      }
      // Reveal-on-failure: drop our backdrop NOW (before the native fallback)
      // so Gmail's surface isn't occluded; never await the fallback first.
      reveal();
      // Best-effort: (re)open Gmail's native scheduler underneath. Fire-and-
      // forget — we've already revealed, so if this also fails Gmail's own
      // state (its error / the compose) is what shows: the correct
      // fail-toward-native outcome (§5.2.3).
      void openNativeScheduleDialog().catch(() => {
        /* nothing more we can do; native state is already visible */
      });
    }
  }

  // §5.3.6 seam: validate a resolved wall time before scheduling. As of v4
  // (Session 17) the **Schedule Send path never raises a working-hours soft
  // warning** — deliberately scheduling outside your hours is the core use
  // case (locked Entry 21), and the global Default boundaries that were its
  // only warning trigger have been removed. The only remaining gate is the
  // past-time guard; everything else schedules directly.
  function gate(
    wall: WallTime,
    action: ScheduleAction,
    remember: LastScheduled,
  ): void {
    // A2 defense-in-depth: a FRESH now (not the mount-time memo) so a
    // long-open modal / "Last scheduled time" that has since elapsed /
    // a preset that went stale across midnight is caught at click time,
    // not silently scheduled in the past. Covers preset/custom/last.
    const freshNow = nowWallInTimeZone(timezone);
    if (isPastWallTime(wall, freshNow)) {
      setStatus({
        kind: "error",
        message:
          "That time has already passed. Refresh Gmail and pick a new time.",
      });
      return;
    }
    void run(action, remember);
  }

  // §5.3.5 Optimize-for-X commit path. Like every Schedule Send path it does
  // not warn; the cache write is its only added concern.
  //
  // Cache write: only when the user picked the tz manually via the inline
  // picker AND left "Remember…" checked (spec (i)/(j)). Cache hits aren't
  // re-written; an unchecked Remember leaves the cache untouched.
  function commitOptimize(c: OptimizeChoice): void {
    const result = computeOptimizeSendTime(
      new Date(),
      timezone,
      c.recipientTz,
      c.timing,
    );
    const f = formatForGmail(result.userWall);
    const remember: LastScheduled = {
      display: f.display,
      gmailDate: f.gmailDate,
      gmailTime: f.gmailTime,
    };
    void run(async () => {
      if (!c.cacheHit && c.rememberTz) {
        // Best-effort persistence; never block the schedule on a cache write.
        try {
          await setManualRecipientTimezone(
            c.recipientEmail,
            c.recipientTz,
            c.recipientName,
          );
        } catch {
          /* §5.3.5 (j) is best-effort; scheduling proceeds regardless */
        }
      }
      await scheduleAt({ gmailDate: f.gmailDate, gmailTime: f.gmailTime });
    }, remember);
  }

  // The single end-of-workflow commit (the primary "Schedule" button).
  // Optimize wins over selection when both are present (defensive — the
  // pickSelection / OptimizeSection engagement contract makes them
  // mutually exclusive in steady state).
  function commit(): void {
    // (b) genuine guard, not just a greyed button: never proceed with zero
    // tokenized recipients, whatever invoked us (click, Enter, a future
    // caller). The Schedule button is also natively `disabled` in this state,
    // which already blocks click + Enter; this is belt-and-suspenders.
    if (!hasRecipient) return;
    if (optimize) {
      commitOptimize(optimize);
      return;
    }
    if (!selection) return;
    if (selection.kind === "last") {
      if (!lastScheduled) return;
      const ls = lastScheduled;
      const remember = lastToRemember(ls);
      const action: ScheduleAction = () =>
        scheduleAt({ gmailDate: ls.gmailDate, gmailTime: ls.gmailTime });
      const wall = parseGmailDateTime(ls.gmailDate, ls.gmailTime);
      // Stored strings that don't parse → we can't run the §5.5 check; fail
      // open and schedule the user's explicit choice rather than block it
      // (never strand the user — §5.2.3 spirit).
      if (!wall) {
        void run(action, remember);
        return;
      }
      gate(wall, action, remember);
    } else if (selection.kind === "preset") {
      const p = selection.preset;
      const f = formatForGmail(p.wall);
      gate(p.wall, () => schedulePreset(p), {
        display: f.display,
        gmailDate: f.gmailDate,
        gmailTime: f.gmailTime,
      });
    } else {
      const f = formatForGmail(selection.wall);
      gate(
        selection.wall,
        () => scheduleAt({ gmailDate: f.gmailDate, gmailTime: f.gmailTime }),
        { display: f.display, gmailDate: f.gmailDate, gmailTime: f.gmailTime },
      );
    }
  }

  const busy = status.kind === "busy";
  const presetSelected = (p: SchedulePreset): boolean =>
    selection?.kind === "preset" && selection.preset.id === p.id;
  const customSelected = selection?.kind === "custom";
  // A2: when the picked date is today, also floor the time at now + 5 min
  // (a time input's min can't couple to the date itself). Render-time hint
  // only; gate()'s fresh-now check is the actual guard.
  const minTime =
    date === minDate
      ? wallToTimeInput(addMinutesToWall(nowWallInTimeZone(timezone, now), 5))
      : undefined;

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Schedule send with Fashionably Late"
        onKeyDown={onCardKeyDown}
      >
        <div className="modal-header">
          {/* Identity-at-a-glance; decorative (the dialog is aria-labelled). */}
          <SymbolMark size={18} className="modal-logo" />
          <div className="modal-header-text">
            <h1>When do you want to send this email?</h1>
            <p className="subtitle">{tzLabel.text}</p>
          </div>
          {/* §5.8.1 access point — a single icon-link, NOT a menu. */}
          <button
            type="button"
            className="gear"
            aria-label="Open Fashionably Late settings"
            title="Settings"
            disabled={busy}
            onClick={onOpenSettings}
          >
            ⚙
          </button>
        </div>

        {lastScheduled && (
          <>
            <div className="section-label">Last scheduled time</div>
            <button
              className={
                "preset" + (selection?.kind === "last" ? " selected" : "")
              }
              aria-pressed={selection?.kind === "last"}
              disabled={busy}
              onClick={() => pickSelection({ kind: "last" })}
            >
              <span>Last scheduled time</span>
              <span className="when">{lastScheduled.display}</span>
            </button>
            <hr className="divider" />
          </>
        )}

        <div className="section-label">Quick options</div>
        {presets.map((p: SchedulePreset) => (
          <button
            key={p.id}
            className={"preset" + (presetSelected(p) ? " selected" : "")}
            aria-pressed={presetSelected(p)}
            disabled={busy}
            onClick={() => pickSelection({ kind: "preset", preset: p })}
          >
            <span>{p.label}</span>
            <span className="when">{p.display}</span>
          </button>
        ))}

        <hr className="divider" />

        <div className="section-label">Pick custom ({tzLabel.abbr})</div>
        <div className={"pick" + (customSelected ? " selected" : "")}>
          <input
            type="date"
            aria-label="Date"
            value={date}
            min={minDate}
            disabled={busy}
            onChange={(e) => updateCustom(e.target.value, time)}
          />
          <input
            type="time"
            aria-label="Time"
            value={time}
            min={minTime}
            disabled={busy}
            onChange={(e) => updateCustom(date, e.target.value)}
          />
        </div>

        {/* §5.8.2 toggle: hide the §5.3.5 Optimize section entirely when the
            feature is off. The rest of the modal (Quick Options / Pick Custom)
            is unaffected. */}
        {optimizeEnabled && (
          <OptimizeSection
            recipients={recipients}
            userTimezone={timezone}
            pinnedTimezones={livePinnedTimezones}
            onChange={setOptimize}
            onEngage={() => setSelection(null)}
            resetSignal={optimizeReset}
            disabled={busy}
          />
        )}

        {status.kind === "busy" && (
          <p className="status">Opening Gmail&apos;s scheduler…</p>
        )}
        {status.kind === "error" && (
          <p className="status error" role="alert">
            {status.message}
          </p>
        )}

        <div className="actions">
          {/* (b) Recipient guard hint — a validation message for the Schedule
              action, so it lives IN the action row (flush-left of the buttons),
              not under Pick custom. Danger-red (#c5221f danger token, 5.8:1 on
              the white card — AA for normal text), role="alert" so it's
              announced on open even though the disabled Schedule button isn't
              focusable; also associated via aria-describedby. Cancel stays the
              obvious working exit (close-fix-reopen). */}
          {!hasRecipient && (
            <p className="actions-hint" id="fl-recipient-hint" role="alert">
              Please add at least one recipient to continue.
            </p>
          )}
          <button className="text" onClick={onClose} disabled={busy}>
            {/* In the no-recipient state the only forward path is to back out,
                add a recipient, and reopen — so the exit reads "Go back" rather
                than "Cancel" (which implies abandoning a scheduling choice). */}
            {hasRecipient ? "Cancel" : "Go back"}
          </button>
          <button
            className="primary"
            disabled={busy || !hasRecipient || (!selection && !optimize)}
            aria-describedby={!hasRecipient ? "fl-recipient-hint" : undefined}
            onClick={commit}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
