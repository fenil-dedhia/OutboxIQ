import {
  WEEKDAYS,
  validateWorkingHours,
  type Weekday,
  type WorkingHours,
} from "../../../lib/storage";

interface Props {
  workingHours: WorkingHours;
  onChange: (next: WorkingHours) => void;
}

const DAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

// PRD §5.1.3 step 3 (Entry-40 rename, 2026-05-19): working days/times +
// Default boundaries (formerly "hard limits"). The schema fields
// `absoluteEarliest`/`absoluteLatest` are deliberately kept as stable
// internal identifiers per Entry-30 — only user-facing copy renamed.
export function WorkingHoursStep({ workingHours, onChange }: Props) {
  function patchDay(day: Weekday, patch: Partial<WorkingHours[Weekday]>): void {
    onChange({
      ...workingHours,
      [day]: { ...workingHours[day], ...patch },
    });
  }

  const errors = validateWorkingHours(workingHours);

  return (
    <section className="oq-step" aria-labelledby="oq-wh-title">
      <h1 id="oq-wh-title">Set your working hours</h1>
      <fieldset className="oq-days">
        <legend>Working days and times</legend>
        <p className="oq-help">
          When you&rsquo;d normally send &mdash; your regular send-time pattern,
          in your local time. If you click Send outside these hours, Fashionably
          Late will gently confirm before sending.
        </p>
        {WEEKDAYS.map((day) => {
          const d = workingHours[day];
          const dayError = errors.days[day];
          return (
            <div key={day}>
              <div className="oq-day-row">
                <label className="oq-day-toggle">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) =>
                      patchDay(day, { enabled: e.target.checked })
                    }
                  />
                  <span>{DAY_LABEL[day]}</span>
                </label>
                <label>
                  <span className="oq-sr-only">{DAY_LABEL[day]} start</span>
                  <input
                    type="time"
                    value={d.start}
                    disabled={!d.enabled}
                    onChange={(e) => patchDay(day, { start: e.target.value })}
                  />
                </label>
                <span aria-hidden="true">&ndash;</span>
                <label>
                  <span className="oq-sr-only">{DAY_LABEL[day]} end</span>
                  <input
                    type="time"
                    value={d.end}
                    disabled={!d.enabled}
                    onChange={(e) => patchDay(day, { end: e.target.value })}
                  />
                </label>
              </div>
              {dayError && (
                <p className="oq-error" role="alert">
                  {DAY_LABEL[day]}: {dayError}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="oq-bounds">
        <legend>Default boundaries (your local time)</legend>
        <p className="oq-help">
          Times when you usually don&rsquo;t want emails going out. We&rsquo;ll
          check in if you schedule outside these hours &mdash; unless
          you&rsquo;re using Optimize-for-X, where we respect your choice to
          reach recipients in their working hours.
        </p>
        <label className="oq-field">
          <span>Default boundaries &mdash; Earliest send</span>
          <input
            type="time"
            value={workingHours.absoluteEarliest}
            onChange={(e) =>
              onChange({ ...workingHours, absoluteEarliest: e.target.value })
            }
          />
        </label>
        <label className="oq-field">
          <span>Default boundaries &mdash; Latest send</span>
          <input
            type="time"
            value={workingHours.absoluteLatest}
            onChange={(e) =>
              onChange({ ...workingHours, absoluteLatest: e.target.value })
            }
          />
        </label>
      </fieldset>

      {errors.bounds && (
        <p className="oq-error" role="alert">
          {errors.bounds}
        </p>
      )}
    </section>
  );
}
