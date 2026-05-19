// Shared IANA timezone picker (PRD §5.3.5 item (k) — BINDING ARCHITECTURAL
// CONSTRAINT). The same component implementation is used by:
//
//   1. Onboarding §5.1.3 Step 2 (TimezoneStep.tsx) — wraps this with the
//      "Detected from your browser" / "Set by you" source pill.
//   2. §5.3.5 Optimize-for-X inline picker (ScheduleModal.tsx) — wraps this
//      with the "What timezone is [recipient] in?" prompt and the
//      "Remember for future emails" checkbox.
//
// Both pickers share UI, behaviour, search interface, and content. Any
// improvement to one applies to the other automatically. This is the
// "shared component" lock — Session 10 introduction; do NOT duplicate the
// dropdown into either consumer.
//
// Intentionally framework-light: a plain native <select> over the IANA list
// from getTimezoneList(). No styles of its own — each consumer's parent
// (onboarding page CSS vs the modal's Shadow-DOM styles) controls the look.
// `value === null` renders the placeholder option pre-selected; useful for
// the §5.3.5 case where (l) requires NO default ("Choose their timezone"),
// distinct from onboarding which always has a pre-filled value.

import { useMemo } from "react";
import { getTimezoneList } from "../timezones";

export interface TimezonePickerProps {
  /** IANA zone, or null when the consumer requires "no default" (§5.3.5 (i)/(l)). */
  value: string | null;
  /** Fired with the chosen IANA zone. Placeholder selection is not emitted. */
  onChange: (timezone: string) => void;
  /** Shown only when `value === null`. e.g. "Choose their timezone". */
  placeholder?: string;
  /** Forwarded to the `<select>` so consumers can wire a <label htmlFor>. */
  id?: string;
  /** Accessible name when the consumer doesn't render a visible <label>. */
  ariaLabel?: string;
  disabled?: boolean;
  /** Optional className applied to the <select> — consumer-owned styling. */
  className?: string;
}

export function TimezonePicker({
  value,
  onChange,
  placeholder,
  id,
  ariaLabel,
  disabled,
  className,
}: TimezonePickerProps) {
  const zones = useMemo(() => getTimezoneList(), []);
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(v);
      }}
    >
      {value === null && (
        <option value="" disabled>
          {placeholder ?? "Select a timezone"}
        </option>
      )}
      {zones.map((z) => (
        <option key={z} value={z}>
          {z}
        </option>
      ))}
    </select>
  );
}
