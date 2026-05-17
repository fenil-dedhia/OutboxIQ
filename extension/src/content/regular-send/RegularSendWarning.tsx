// PRD §5.5.1 — the regular-Send soft warning (thin wrapper).
//
// Renders the SAME locked-pattern WorkingHoursWarning the §5.3 Schedule Send
// path uses (3 explicit choices, verbatim "why"), only with context="send"
// so the lead sentence and proceed-button copy describe sending *now* rather
// than a picked future time. This wrapper adds exactly two things and no
// product logic: (1) a once-only latch so a double-click can't fire two
// irreversible actions (Entry-13 spirit); (2) Escape = Cancel (§8.9), with
// propagation stopped so Gmail's own compose-Escape doesn't also fire.
//
// The snap/proceed/cancel handlers are supplied final by the guard (they
// close the host, then drive Gmail); this component never touches the DOM.

import { useEffect, useRef, useState } from "react";
import { WorkingHoursWarning } from "../schedule-modal/WorkingHoursWarning";
import type { WorkingHoursVerdict } from "../../lib/schedule/working-hours";

export interface RegularSendWarningProps {
  verdict: WorkingHoursVerdict;
  /** Timezone abbreviation for §8.4 adjacency (e.g. "EDT"). */
  tzAbbr: string;
  /** "Reschedule to [boundary]" — convert this Send into a Schedule Send. */
  onSnap: () => void;
  /** "Send now anyway" — replay the native Send. */
  onProceed: () => void;
  /** "Cancel" — dismiss; nothing sent or scheduled. */
  onCancel: () => void;
}

export function RegularSendWarning({
  verdict,
  tzAbbr,
  onSnap,
  onProceed,
  onCancel,
}: RegularSendWarningProps) {
  const [busy, setBusy] = useState(false);
  // Latch in a ref (not just state) so the very next synchronous click is
  // rejected before React re-renders. The chosen handler tears down the host
  // synchronously, so we never setState after unmount.
  const doneRef = useRef(false);
  const once =
    (fn: () => void): (() => void) =>
    () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setBusy(true);
      fn();
    };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape" || doneRef.current) return;
      // Don't let Gmail's compose also see this Escape (it would
      // minimise/discard the draft). Capture-phase + stop here.
      e.preventDefault();
      e.stopPropagation();
      doneRef.current = true;
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return (
    <WorkingHoursWarning
      verdict={verdict}
      tzAbbr={tzAbbr}
      context="send"
      busy={busy}
      onSnap={once(onSnap)}
      onProceed={once(onProceed)}
      onCancel={once(onCancel)}
    />
  );
}
