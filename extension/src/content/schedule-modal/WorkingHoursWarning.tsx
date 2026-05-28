// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

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

/**
 * Which trigger raised this warning. "schedule" = §5.3 Schedule Send (a
 * future time the user picked). "send" = §5.5.1 regular Send (the user is
 * sending *now*). Only the lead sentence's verb and the proceed-button label
 * differ; the locked 3-option pattern and the verbatim "why" are identical.
 * Defaults to "schedule" so §5.3's existing callsite is unchanged.
 */
export type WarningContext = "schedule" | "send";

export interface WorkingHoursWarningProps {
  verdict: WorkingHoursVerdict;
  /** Timezone abbreviation for §8.4 adjacency (e.g. "EDT"). */
  tzAbbr: string;
  /** §5.3 (default) vs §5.5.1 regular-Send copy. */
  context?: WarningContext;
  busy: boolean;
  /** Schedule the snapped (corrected) time. Only rendered if a snap exists. */
  onSnap: () => void;
  /** Schedule the user's originally chosen time, overriding the rule once. */
  onProceed: () => void;
  /** Dismiss the warning and return to the schedule modal (selection kept). */
  onCancel: () => void;
}

function leadText(
  v: WorkingHoursVerdict,
  abbr: string,
  context: WarningContext,
): string {
  const req = `${formatForGmail(v.requested).display} ${abbr}`;
  const boundary = v.snap ? `${formatForGmail(v.snap).gmailTime} ${abbr}` : "";
  // §5.3: a future time was *picked* ("This email is scheduled for …").
  // §5.5.1: the user is sending *now* ("It's … — before/after …").
  const at =
    context === "send" ? `It's ${req}` : `This email is scheduled for ${req}`;
  switch (v.detail) {
    case "before-earliest":
      return `${at} — before ${boundary}, the earliest you said you'd ever send an email.`;
    case "after-latest":
      return `${at} — after ${boundary}, the latest you said you'd ever send an email.`;
    case "non-working-day":
      return `${req} isn't one of your working days.`;
    case "before-start":
      return `${at}, before your working hours start.`;
    case "after-end":
      return `${at}, after your working hours end.`;
    default:
      return `${at}.`;
  }
}

export function WorkingHoursWarning({
  verdict,
  tzAbbr,
  context = "schedule",
  busy,
  onSnap,
  onProceed,
  onCancel,
}: WorkingHoursWarningProps) {
  const req = `${formatForGmail(verdict.requested).display} ${tzAbbr}`;
  const snap = verdict.snap
    ? `${formatForGmail(verdict.snap).display} ${tzAbbr}`
    : null;
  // §5.5.1 sends now → "Send now anyway"; §5.3 honours the picked time.
  const proceedLabel =
    context === "send" ? "Send now anyway" : `Send on ${req} anyway`;

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
        <p className="warn-lead">{leadText(verdict, tzAbbr, context)}</p>
        <p className="warn-why">
          Emails sent late at night or on weekends are statistically less likely
          to be opened or replied to, and may signal poor work-life boundaries
          to your recipients. Scheduling for your next working window helps
          maximize visibility and protects your professional brand.
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
            {proceedLabel}
          </button>
          <button className="text" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
