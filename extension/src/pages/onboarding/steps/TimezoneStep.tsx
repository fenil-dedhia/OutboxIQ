import type { TimezoneSource } from "../../../lib/storage";
import { TimezonePicker } from "../../../lib/components/TimezonePicker";
import {
  MAX_PINNED_TIMEZONES,
  pinnedChipLabel,
  resolvePinnedEntries,
} from "../../../lib/timezone/pinned";

interface Props {
  timezone: string;
  timezoneSource: TimezoneSource;
  /** Up to MAX_PINNED_TIMEZONES canonical IANA ids (PRD §5.1.3 Step 2). */
  pinned: string[];
  onChange: (timezone: string, source: TimezoneSource) => void;
  onPinnedChange: (pinned: string[]) => void;
}

function detectedLabel(source: TimezoneSource): string {
  // v1 (PRD §5.1.3, 2026-05-17 amendment): the browser timezone is THE
  // source — not a fallback. It reads the OS zone, which auto-updates as
  // the user travels (their real "current working context"); Google
  // Calendar's manually-set zone does not, so it can be stale. Onboarding
  // therefore only ever produces "browser" (auto-detected) or "manual"
  // (user override via the dropdown). `calendar_api` stays in the
  // TimezoneSource type for a possible FUTURE §5.8 Settings override and is
  // NOT produced by v1 onboarding.
  return source === "manual" ? "Set by you" : "Detected from your browser";
}

// PRD §5.1.3 Step 2 (Session 11): one step covering BOTH the user's own
// timezone AND their pinned timezones. The dropdowns are the shared
// <TimezonePicker> (§5.3.5 item (k) — the §5.3.5 Optimize-for-X inline picker
// MUST use the same component); the pinned set surfaces in every picker's
// "Pinned" section.
export function TimezoneStep({
  timezone,
  timezoneSource,
  pinned,
  onChange,
  onPinnedChange,
}: Props) {
  const chips = resolvePinnedEntries(pinned);
  const atCap = pinned.length >= MAX_PINNED_TIMEZONES;

  function addPinned(tz: string) {
    if (atCap || pinned.includes(tz)) return;
    onPinnedChange([...pinned, tz]);
  }
  function removePinned(iana: string) {
    onPinnedChange(pinned.filter((p) => p !== iana));
  }

  return (
    <section className="oq-step" aria-labelledby="oq-tz-title">
      <h1 id="oq-tz-title">Set up your timezones</h1>

      <label className="oq-field" htmlFor="oq-tz-select">
        <span>Your timezone</span>
        <p className="oq-detected">{detectedLabel(timezoneSource)}</p>
        <TimezonePicker
          id="oq-tz-select"
          className="oq-tz-picker"
          value={timezone}
          pinnedIanaIds={pinned}
          onChange={(tz) => onChange(tz, "manual")}
        />
      </label>

      <div className="oq-pinned" aria-labelledby="oq-pinned-label">
        <span id="oq-pinned-label" className="oq-field-label">
          Pinned timezones (optional)
        </span>
        <p className="oq-help">
          Pick up to {MAX_PINNED_TIMEZONES} timezones for the people you email
          most. We&rsquo;ll surface these first when you&rsquo;re scheduling.
        </p>
        <p className="oq-help">
          We&rsquo;ve pre-selected the most common picks. Adjust now or update
          later in Settings.
        </p>

        {chips.length > 0 && (
          <ul className="oq-pinned-chips">
            {chips.map((e) => {
              const label = pinnedChipLabel(e);
              return (
                <li key={e.ianaIdentifier} className="oq-chip">
                  <span>{label}</span>
                  <button
                    type="button"
                    className="oq-chip-remove"
                    aria-label={`Remove ${label}`}
                    onClick={() => removePinned(e.ianaIdentifier)}
                  >
                    &times;
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {atCap ? (
          <p className="oq-pinned-max" role="status">
            Maximum {MAX_PINNED_TIMEZONES} pinned timezones. Remove one to add
            another.
          </p>
        ) : (
          <label className="oq-field" htmlFor="oq-pin-add">
            <span>Add a timezone</span>
            <TimezonePicker
              id="oq-pin-add"
              className="oq-tz-picker"
              value={null}
              placeholder="Add a timezone&hellip;"
              onChange={addPinned}
            />
          </label>
        )}

        {pinned.length > 0 && (
          <button
            type="button"
            className="oq-skip"
            onClick={() => onPinnedChange([])}
          >
            Skip &mdash; no pinned timezones
          </button>
        )}
      </div>

      <p className="oq-help">
        We use your timezone when you don&rsquo;t specify one explicitly. You
        can change any of this in Settings.
      </p>
    </section>
  );
}
