import { useMemo } from "react";
import type { TimezoneSource } from "../../../lib/storage";
import { getTimezoneList } from "../../../lib/timezones";

interface Props {
  timezone: string;
  timezoneSource: TimezoneSource;
  onChange: (timezone: string, source: TimezoneSource) => void;
}

function detectedLabel(source: TimezoneSource): string {
  switch (source) {
    case "calendar_api":
      return "Detected from your Google Calendar settings";
    case "browser":
      // OAuth/Calendar is wired just-in-time later; until then §6.7's
      // documented fallback (browser timezone) is what we detect.
      return "Detected from your browser";
    case "manual":
      return "Set by you";
  }
}

// PRD §5.1 step 2: confirm or override the detected timezone.
export function TimezoneStep({ timezone, timezoneSource, onChange }: Props) {
  const zones = useMemo(() => getTimezoneList(), []);

  return (
    <section className="oq-step" aria-labelledby="oq-tz-title">
      <h1 id="oq-tz-title">Confirm your timezone</h1>
      <p className="oq-detected">{detectedLabel(timezoneSource)}</p>
      <label className="oq-field">
        <span>Your timezone</span>
        <select
          value={timezone}
          onChange={(e) => onChange(e.target.value, "manual")}
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>
      <p className="oq-help">
        This is the timezone we&rsquo;ll use when you don&rsquo;t specify one
        explicitly. You can change it any time in Settings.
      </p>
    </section>
  );
}
