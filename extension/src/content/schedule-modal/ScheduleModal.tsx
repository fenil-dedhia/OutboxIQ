// PRD §5.3 — Enhanced Schedule Send Modal.
//
// In scope: §5.3.1 layout, §5.3.2 header + timezone subtitle, §5.3.3 Quick
// Options + a "Last scheduled time" row (PRD §5.3.3 amendment 2026-05-16,
// mirrors Gmail), §5.3.4 functional custom date/time picker. All paths
// produce real native scheduled sends by driving Gmail's own UI.
// Deferred (owner-directed): §5.3.5 Optimize-for-recipient + §5.3.7.
// §5.3.6 working-hours check is a documented no-op hook for §5.5.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computePresets,
  type SchedulePreset,
} from "../../lib/schedule/presets";
import { formatTimezoneLabel } from "../../lib/schedule/timezone-format";
import {
  formatForGmail,
  parsePickerInputs,
} from "../../lib/schedule/gmail-format";
import {
  schedulePreset,
  scheduleAt,
  openNativeScheduleDialog,
} from "./schedule-actions";
import type { LastScheduled } from "../../lib/storage";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string };

export interface ScheduleModalProps {
  /** The user's configured IANA timezone (PRD §7.2 user.timezone). */
  timezone: string;
  /** Last time scheduled via OutboxIQ, or null (PRD §5.3.3 amendment). */
  lastScheduled: LastScheduled | null;
  /** Persist a freshly-scheduled time so it becomes "Last scheduled time". */
  onScheduled: (v: LastScheduled) => void;
  onClose: () => void;
}

// §5.3.6 hook point. When §5.5 is built this will, if the computed time is
// outside the user's working hours, surface the secondary modal before
// scheduling. Explicit pass-through for now so the call site exists.
// DO NOT inline this away — it marks where §5.5 attaches.
function applyWorkingHoursCheck(): { proceed: boolean } {
  return { proceed: true }; // TODO(§5.5): working-hours reschedule modal
}

export function ScheduleModal({
  timezone,
  lastScheduled,
  onScheduled,
  onClose,
}: ScheduleModalProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const now = useMemo(() => new Date(), []);
  const presets = useMemo(() => computePresets(now, timezone), [now, timezone]);
  const tzLabel = useMemo(
    () => formatTimezoneLabel(timezone, now),
    [timezone, now],
  );

  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Runs `action`, then persists `remember` as the new "Last scheduled
  // time". Any failure hands off to Gmail's own scheduler so the user is
  // never stranded (PRD §5.2.3).
  async function run(
    action: () => Promise<void>,
    remember: LastScheduled | null,
  ): Promise<void> {
    if (status.kind === "busy") return;
    if (!applyWorkingHoursCheck().proceed) return; // §5.3.6 / §5.5 seam
    setStatus({ kind: "busy" });
    try {
      await action();
      if (remember) onScheduled(remember);
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

  const busy = status.kind === "busy";
  const parsed = parsePickerInputs(date, time);

  function scheduleCustom(): void {
    if (!parsed) return;
    const f = formatForGmail(parsed);
    void run(
      () => scheduleAt({ gmailDate: f.gmailDate, gmailTime: f.gmailTime }),
      {
        display: f.display,
        gmailDate: f.gmailDate,
        gmailTime: f.gmailTime,
      },
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
              className="preset"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    scheduleAt({
                      gmailDate: lastScheduled.gmailDate,
                      gmailTime: lastScheduled.gmailTime,
                    }),
                  lastScheduled,
                )
              }
            >
              <span>Last scheduled time</span>
              <span className="when">{lastScheduled.display}</span>
            </button>
            <hr className="divider" />
          </>
        )}

        <div className="section-label">Quick options</div>
        {presets.map((p: SchedulePreset) => {
          const f = formatForGmail(p.wall);
          return (
            <button
              key={p.id}
              className="preset"
              disabled={busy}
              onClick={() =>
                void run(() => schedulePreset(p), {
                  display: f.display,
                  gmailDate: f.gmailDate,
                  gmailTime: f.gmailTime,
                })
              }
            >
              <span>{p.label}</span>
              <span className="when">{p.display}</span>
            </button>
          );
        })}

        <hr className="divider" />

        <div className="section-label">
          Pick date &amp; time ({tzLabel.abbr})
        </div>
        <div className="pick">
          <input
            type="date"
            aria-label="Date"
            value={date}
            disabled={busy}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            type="time"
            aria-label="Time"
            value={time}
            disabled={busy}
            onChange={(e) => setTime(e.target.value)}
          />
          <button
            className="primary"
            disabled={busy || !parsed}
            onClick={scheduleCustom}
          >
            Schedule
          </button>
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
        </div>
      </div>
    </div>
  );
}
