import type { TimezoneSource } from "../../../lib/storage";
import { TimezonePicker } from "../../../lib/components/TimezonePicker";
import { PinnedTimezonesEditor } from "../../../lib/components/PinnedTimezonesEditor";
import { MAX_PINNED_TIMEZONES } from "../../../lib/timezone/pinned";

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
// "Pinned" section. The user's-own timezone is visually primary (it's the
// required setting); pinned is the optional, secondary block below it. The
// chips + add-picker are the shared <PinnedTimezonesEditor> (Session 12) so
// onboarding and the §5.8.2 Settings section render the same control;
// onboarding leaves reorder off.
export function TimezoneStep({
  timezone,
  timezoneSource,
  pinned,
  onChange,
  onPinnedChange,
}: Props) {
  return (
    <section className="oq-step" aria-labelledby="oq-tz-title">
      <h1 id="oq-tz-title">Set up your timezones</h1>

      {/* Primary, required setting — visually emphasised so it reads first. */}
      <div className="oq-primary-tz">
        <label
          className="oq-field-label oq-field-label--primary"
          htmlFor="oq-tz-select"
        >
          Your timezone
        </label>
        <p className="oq-detected">{detectedLabel(timezoneSource)}</p>
        <TimezonePicker
          id="oq-tz-select"
          className="oq-tz-picker"
          value={timezone}
          pinnedIanaIds={pinned}
          onChange={(tz) => onChange(tz, "manual")}
        />
        <p className="oq-help oq-help--tight">
          Used by default when you don&rsquo;t pick a specific timezone.
        </p>
      </div>

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

        <PinnedTimezonesEditor pinned={pinned} onChange={onPinnedChange} />
      </div>
    </section>
  );
}
