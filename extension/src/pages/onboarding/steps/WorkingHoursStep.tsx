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

// PRD §5.1 step 3: working days/times + absolute floor and ceiling.
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
          When you&rsquo;d normally send &mdash; your regular send-time
          pattern, in your local time. If you click Send outside these hours,
          OutboxIQ will gently confirm before sending.
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
        <legend>Hard limits (your local time)</legend>
        <p className="oq-help">
          A hard floor and ceiling in your own local time. OutboxIQ will never
          schedule a send before the earliest or after the latest, even when
          optimizing for a recipient&rsquo;s timezone.
        </p>
        <label className="oq-field">
          <span>Earliest I&rsquo;d ever send an email</span>
          <input
            type="time"
            value={workingHours.absoluteEarliest}
            onChange={(e) =>
              onChange({ ...workingHours, absoluteEarliest: e.target.value })
            }
          />
        </label>
        <label className="oq-field">
          <span>Latest I&rsquo;d ever send an email</span>
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
