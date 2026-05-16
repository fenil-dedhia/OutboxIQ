// PRD §5.3 — Enhanced Schedule Send Modal (shell + Quick Options).
//
// In scope this session: §5.3.1 layout, §5.3.2 header + timezone subtitle,
// §5.3.3 Quick Options (real native scheduled sends), §5.3.4 custom picker
// UI (handed off to Gmail's own picker — driving it directly is the
// probe-gated stretch goal). Deliberately OUT (deferred, owner-directed):
// §5.3.5 Optimize-for-recipient and §5.3.7 fallback picker (need OAuth +
// People API + Maps proxy — next session). §5.3.6 working-hours check is a
// documented no-op hook for §5.5 (not built this session).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computePresets,
  type SchedulePreset,
} from "../../lib/schedule/presets";
import { formatTimezoneLabel } from "../../lib/schedule/timezone-format";
import { schedulePreset, openNativeScheduleDialog } from "./schedule-actions";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string };

export interface ScheduleModalProps {
  /** The user's configured IANA timezone (PRD §7.2 user.timezone). */
  timezone: string;
  onClose: () => void;
}

// §5.3.6 hook point. When §5.5 is built this will, if the computed time is
// outside the user's working hours, surface the secondary modal before
// scheduling. For now it is an explicit pass-through so the call site is
// already in place. DO NOT inline this away — it marks where §5.5 attaches.
function applyWorkingHoursCheck(): { proceed: boolean } {
  return { proceed: true }; // TODO(§5.5): working-hours reschedule modal
}

export function ScheduleModal({ timezone, onClose }: ScheduleModalProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
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

  async function runScheduling(action: () => Promise<void>): Promise<void> {
    if (status.kind === "busy") return;
    if (!applyWorkingHoursCheck().proceed) return; // §5.3.6 / §5.5 seam
    setStatus({ kind: "busy" });
    try {
      await action();
      onClose();
    } catch (err) {
      // Never strand the user (PRD §5.2.3): on failure, hand off to Gmail's
      // own native picker so they can still schedule.
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

        <div className="section-label">Quick options</div>
        {presets.map((p: SchedulePreset) => (
          <button
            key={p.id}
            className="preset"
            disabled={busy}
            onClick={() => void runScheduling(() => schedulePreset(p))}
          >
            <span>{p.label}</span>
            <span className="when">{p.display}</span>
          </button>
        ))}

        <hr className="divider" />

        <div className="section-label">Pick date &amp; time</div>
        <div className="pick">
          <button
            className="text"
            disabled={busy}
            onClick={() => void runScheduling(() => openNativeScheduleDialog())}
          >
            Open Gmail&apos;s date &amp; time picker →
          </button>
        </div>
        <p className="note">
          For a custom time we open Gmail&apos;s own picker. (OutboxIQ&apos;s
          inline picker arrives once the custom-path is verified.)
        </p>

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
