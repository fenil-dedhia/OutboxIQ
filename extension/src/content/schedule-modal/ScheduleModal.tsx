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
// picker ("Pick custom"), and the §5.3.6 → §5.5 check. Per the locked
// decision (CLAUDE.md "Locked product decisions", Session 5.5) the
// **Schedule Send** path only warns on **absolute-limit** violations:
// scheduling outside one's working hours to hit a recipient's window is
// OutboxIQ's core use case, so warning on it trains dismissal. Working-
// hours violations still get computed by checkWorkingHours (consumed by
// §5.5.1 regular-Send and future §5.3.5) — Schedule Send just doesn't act
// on them. Deferred (owner-directed): §5.3.5 Optimize-for-recipient +
// §5.3.7; §5.5.1 regular-Send trigger (Session 5.6).

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
  /** The user's working hours + absolute limits (PRD §7.2). §5.5 input. */
  workingHours: WorkingHours;
  /** Last time scheduled via OutboxIQ, or null (PRD §5.3.3 amendment). */
  lastScheduled: LastScheduled | null;
  /** Persist a freshly-scheduled time so it becomes "Last scheduled time". */
  onScheduled: (v: LastScheduled) => void;
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
  onScheduled,
  onClose,
}: ScheduleModalProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [warning, setWarning] = useState<PendingWarning | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // Latest `warning` for the keydown handler without re-subscribing or a
  // state-updater side effect (StrictMode-safe).
  const warningRef = useRef<PendingWarning | null>(null);
  warningRef.current = warning;

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

  // Editing the custom inputs picks "custom" when both are valid; if they
  // become invalid and custom was the active choice, the selection clears.
  function updateCustom(nextDate: string, nextTime: string): void {
    setDate(nextDate);
    setTime(nextTime);
    const wall = parsePickerInputs(nextDate, nextTime);
    if (wall) setSelection({ kind: "custom", wall });
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
        console.warn("[OutboxIQ] §5.3 scheduling failed → native:", err);
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

  // The single end-of-workflow commit (the primary "Schedule" button).
  function commit(): void {
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
        aria-label="Schedule send with OutboxIQ"
      >
        <h1>When do you want to send this email?</h1>
        <p className="subtitle">{tzLabel.text}</p>

        {lastScheduled && (
          <>
            <div className="section-label">Last scheduled time</div>
            <button
              className={
                "preset" + (selection?.kind === "last" ? " selected" : "")
              }
              aria-pressed={selection?.kind === "last"}
              disabled={busy}
              onClick={() => setSelection({ kind: "last" })}
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
            onClick={() => setSelection({ kind: "preset", preset: p })}
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
            disabled={busy || !selection}
            onClick={commit}
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
