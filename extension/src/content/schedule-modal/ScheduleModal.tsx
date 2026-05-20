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
// picker ("Pick custom"), §5.3.5 Optimize-for-X (Session 10 — items a–n),
// and the §5.3.6 → §5.5 check.
//
// §5.5 trigger split (Locked product decisions / Entry 40):
//   • **Quick Options / Pick Custom / Last scheduled time** → §5.5 warns on
//     **Default-boundaries** violations (Entry 40 Case 2 — manual selection).
//   • **§5.3.5 Optimize-for-X-computed times** → §5.5 warning SUPPRESSED
//     (Entry 40 Case 1 — algorithmic, feature-mediated intent). The
//     four-step engagement (open modal → check Optimize → pick recipient
//     → pick timing) constitutes explicit intent; surfacing the warning at
//     the *result* of that engagement would train users to dismiss it.
//   • Working-hours violations on Schedule Send remain ignored (the core
//     use case is deliberate off-hours scheduling — Entry 21); they are
//     still computed by checkWorkingHours and consumed by §5.5.1.
//
// Implementation: Optimize is routed through `commitOptimize()` which
// computes the send time then calls `run()` directly (no `gate()`). Every
// other path goes through `gate()` so the warning fires as before.

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
  checkWorkingHours,
  ensureFutureSnap,
  type WorkingHoursVerdict,
} from "../../lib/schedule/working-hours";
import {
  schedulePreset,
  scheduleAt,
  openNativeScheduleDialog,
} from "./schedule-actions";
import { WorkingHoursWarning } from "./WorkingHoursWarning";
import { OptimizeSection, type OptimizeChoice } from "./OptimizeSection";
import { useLivePinnedTimezones } from "./use-live-pinned-timezones";
import { computeOptimizeSendTime } from "../../lib/schedule/optimize-time";
import { setManualRecipientTimezone } from "../../lib/recipient-cache";
import type { ComposeRecipient } from "../compose/compose-recipients";
import type { LastScheduled, WorkingHours } from "../../lib/storage";

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
  /** The user's working hours + Default boundaries (PRD §7.2). §5.5 input. */
  workingHours: WorkingHours;
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

// A scheduling attempt held back by the §5.5 soft-warning modal: `proceed`
// schedules the user's chosen time as-is; `snap` schedules the corrected
// time (null only in the unreachable zero-days working-hours case).
interface PendingWarning {
  verdict: WorkingHoursVerdict;
  proceed: { action: ScheduleAction; remember: LastScheduled };
  snap: { action: ScheduleAction; remember: LastScheduled } | null;
}

function lastToRemember(ls: LastScheduled): LastScheduled {
  return {
    display: ls.display,
    gmailDate: ls.gmailDate,
    gmailTime: ls.gmailTime,
  };
}

export function ScheduleModal({
  timezone,
  workingHours,
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
  const [warning, setWarning] = useState<PendingWarning | null>(null);
  // §5.3.5 Optimize-for-X state. When non-null the user has a complete
  // Optimize choice (recipient + tz + timing); the Schedule button reads
  // EITHER this OR `selection`, and commits via `commitOptimize` (which
  // bypasses §5.5 per Entry 40 Case 1).
  const [optimize, setOptimize] = useState<OptimizeChoice | null>(null);
  // Bumped each time the user touches a preset / custom row so the
  // OptimizeSection clears its own checkbox (one-decision-at-a-time, §8.7).
  const [optimizeReset, setOptimizeReset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Latest `warning` for the keydown handler without re-subscribing or a
  // state-updater side effect (StrictMode-safe).
  const warningRef = useRef<PendingWarning | null>(null);
  warningRef.current = warning;

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
      // §8.9: Escape closes the §5.5 warning back to the modal (selection
      // kept); only closes the whole modal when no warning is showing.
      if (warningRef.current) setWarning(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

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
  async function run(
    action: () => Promise<void>,
    remember: LastScheduled,
  ): Promise<void> {
    if (status.kind === "busy") return;
    setStatus({ kind: "busy" });
    try {
      await action();
      onScheduled(remember);
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(
          "[Fashionably Late] §5.3 scheduling failed → native:",
          err,
        );
      }
      try {
        await openNativeScheduleDialog();
        onClose();
      } catch {
        setStatus({
          kind: "error",
          message:
            "Couldn't open scheduling. Use Gmail's own Schedule send instead.",
        });
      }
    }
  }

  // §5.3.6 → §5.5 seam: gate a resolved wall time through the check before
  // scheduling. Locked Session 5.5: on the **Schedule Send** path only an
  // **absolute-limit** violation raises the soft warning — a working-hours
  // "violation" here is the product working as intended (deliberately
  // scheduling off-hours to land in a recipient's window), so warning on
  // it would train users to dismiss the modal and gut its value for the
  // absolute case. So: not absolute → schedule directly; absolute → the
  // soft-warning modal (proceed / reschedule / cancel).
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
    // The picked time is future, but its computed snap can still be in the
    // past in the latent case: picking a later-today time while the clock is
    // already past the absolute ceiling (after-latest → today's ceiling,
    // which has elapsed). ensureFutureSnap rolls only that one case forward;
    // the locked same-day snap for a genuinely future picked day is
    // untouched. Same fresh `now` as the past-time guard above.
    const verdict = ensureFutureSnap(
      checkWorkingHours(wall, workingHours),
      freshNow,
      workingHours,
    );
    if (verdict.kind !== "absolute") {
      void run(action, remember);
      return;
    }
    let snap: PendingWarning["snap"] = null;
    if (verdict.snap) {
      const f = formatForGmail(verdict.snap);
      snap = {
        action: () =>
          scheduleAt({ gmailDate: f.gmailDate, gmailTime: f.gmailTime }),
        remember: {
          display: f.display,
          gmailDate: f.gmailDate,
          gmailTime: f.gmailTime,
        },
      };
    }
    setWarning({ verdict, proceed: { action, remember }, snap });
  }

  // §5.3.5 Optimize-for-X commit path. Bypasses gate() per Entry 40 Case 1:
  // an Optimize-computed time crossing the user's Default boundaries is the
  // intended output of the feature; surfacing the §5.5 warning at the result
  // of the four-step engagement would train users to dismiss the modal
  // (extending Entry 21's "warnings fire for unintended actions, not the
  // core use case" line of reasoning). Working-hours and Default-boundaries
  // calc still runs unconditionally elsewhere — only the trigger predicate
  // narrows here; the warning is not invoked.
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

  // §5.5 soft-warning resolutions.
  function proceedAnyway(): void {
    const w = warning;
    if (!w) return;
    setWarning(null);
    void run(w.proceed.action, w.proceed.remember);
  }
  function takeSnap(): void {
    const w = warning;
    if (!w || !w.snap) return;
    setWarning(null);
    void run(w.snap.action, w.snap.remember);
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

  // §8.7 one decision per screen: the §5.5 warning replaces the schedule
  // card (same Shadow-DOM backdrop) rather than stacking on top of it.
  if (warning) {
    return (
      <WorkingHoursWarning
        verdict={warning.verdict}
        tzAbbr={tzLabel.abbr}
        busy={busy}
        onSnap={takeSnap}
        onProceed={proceedAnyway}
        onCancel={() => setWarning(null)}
      />
    );
  }

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
      >
        <div className="modal-header">
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
          <button className="text" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy || (!selection && !optimize)}
            onClick={commit}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
