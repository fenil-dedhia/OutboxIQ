import { useMemo } from "react";
import type { TimezoneSource } from "../../../lib/storage";
import { getTimezoneList } from "../../../lib/timezones";

interface Props {
  timezone: string;
  timezoneSource: TimezoneSource;
  onChange: (timezone: string, source: TimezoneSource) => void;
}

function detectedLabel(source: TimezoneSource): string {
  // v1 (PRD §5.1.3, 2026-05-17 amendment): the browser timezone is THE
  // source — not a fallback. It reads the OS zone, which auto-updates as
  // the user travels (their real "current working context"); Google
  // Calendar's manually-set zone does not, so it can be stale. Onboarding
  // therefore only ever produces "browser" (auto-detected) or "manual"
  // (user override via the dropdown). `calendar_api` stays in the
  // TimezoneSource type for a possible FUTURE §5.8 Settings "override
  // with your Google Calendar timezone (requires Google sign-in)" — it is
  // NOT produced by v1 onboarding and is not surfaced here.
  return source === "manual" ? "Set by you" : "Detected from your browser";
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
