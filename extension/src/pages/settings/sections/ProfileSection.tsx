import { TimezonePicker } from "../../../lib/components/TimezonePicker";

// PRD §5.8.2 "Profile and Timezone" — Free v1 scope (Entry 39). The user's
// email (read-only) and the "Refresh from Google Calendar" button are
// Premium-only (Free v1 has no OAuth and no Calendar API), so they are omitted
// here entirely — not stubbed. What remains is the editable own-timezone, via
// the SAME shared TimezonePicker as onboarding (§5.3.5 (k)). Pinned zones are
// threaded so they surface in the picker's "Pinned" section. Autosaves on
// selection (no separate Save button — PRD §5.8 "edits autosave per field").

interface Props {
  timezone: string;
  pinned: string[];
  onTimezoneChange: (timezone: string) => void;
}

export function ProfileSection({ timezone, pinned, onTimezoneChange }: Props) {
  return (
    <section className="fl-set-section" aria-labelledby="fl-set-profile-h">
      <h2 id="fl-set-profile-h">Profile &amp; timezone</h2>
      <p className="fl-set-help">
        Your default timezone — used when scheduling unless you pick a specific
        one. It auto-detects from your browser; override it here if needed.
      </p>
      <label className="fl-set-field-label" htmlFor="fl-set-tz">
        Your timezone
      </label>
      <TimezonePicker
        id="fl-set-tz"
        ariaLabel="Your timezone"
        className="fl-set-tz-picker"
        value={timezone}
        pinnedIanaIds={pinned}
        onChange={onTimezoneChange}
      />
    </section>
  );
}
