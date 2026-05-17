// PRD §5.5 — the soft-warning modal (locked pattern, CLAUDE.md "Locked
// product decisions"). NOT a hard block and NOT a silent auto-snap: it
// names the specific violation and offers exactly three explicit choices —
//   • Reschedule to [boundary]  (the recommended/primary action)
//   • Send … anyway             (override the rule just this once)
//   • Cancel                    (back to the schedule modal to adjust)
// Absolute-limit violations are surfaced ahead of working-hours ones (the
// harder constraint) — that precedence lives in checkWorkingHours; this
// component just renders whatever verdict it is handed.
//
// §8.4: every time shown carries the timezone abbreviation adjacent.
// §8.5: the "why" paragraph (verbatim PRD §5.5.2 rationale) is kept.

import { formatForGmail } from "../../lib/schedule/gmail-format";
import type { WorkingHoursVerdict } from "../../lib/schedule/working-hours";

export interface WorkingHoursWarningProps {
  verdict: WorkingHoursVerdict;
  /** Timezone abbreviation for §8.4 adjacency (e.g. "EDT"). */
  tzAbbr: string;
  busy: boolean;
  /** Schedule the snapped (corrected) time. Only rendered if a snap exists. */
  onSnap: () => void;
  /** Schedule the user's originally chosen time, overriding the rule once. */
  onProceed: () => void;
  /** Dismiss the warning and return to the schedule modal (selection kept). */
  onCancel: () => void;
}

function leadText(v: WorkingHoursVerdict, abbr: string): string {
  const req = `${formatForGmail(v.requested).display} ${abbr}`;
  const boundary = v.snap ? `${formatForGmail(v.snap).gmailTime} ${abbr}` : "";
  switch (v.detail) {
    case "before-earliest":
      return `This email is scheduled for ${req} — before ${boundary}, the earliest you said you'd ever send an email.`;
    case "after-latest":
      return `This email is scheduled for ${req} — after ${boundary}, the latest you said you'd ever send an email.`;
    case "non-working-day":
      return `${req} isn't one of your working days.`;
    case "before-start":
      return `This email is scheduled for ${req}, before your working hours start.`;
    case "after-end":
      return `This email is scheduled for ${req}, after your working hours end.`;
    default:
      return `This email is scheduled for ${req}.`;
  }
}

export function WorkingHoursWarning({
  verdict,
  tzAbbr,
  busy,
  onSnap,
  onProceed,
  onCancel,
}: WorkingHoursWarningProps) {
  const req = `${formatForGmail(verdict.requested).display} ${tzAbbr}`;
  const snap = verdict.snap
    ? `${formatForGmail(verdict.snap).display} ${tzAbbr}`
    : null;

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="card"
        role="alertdialog"
        aria-modal="true"
        aria-label="Outside your working hours"
      >
        <h1>Send this email later?</h1>
        <p className="warn-lead">{leadText(verdict, tzAbbr)}</p>
        <p className="warn-why">
          Emails sent late at night or on weekends are statistically less
          likely to be opened or replied to, and may signal poor work-life
          boundaries to your recipients. Scheduling for your next working
          window helps maximize visibility and protects your professional
          brand.
        </p>

        <div className="warn-actions">
          {snap && (
            <button
              className="primary"
              disabled={busy}
              onClick={onSnap}
              autoFocus
            >
              Reschedule to {snap}
            </button>
          )}
          <button className="secondary" disabled={busy} onClick={onProceed}>
            Send on {req} anyway
          </button>
          <button className="text" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
