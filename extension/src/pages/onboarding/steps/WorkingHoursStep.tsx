// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from "react";
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

// PRD §5.1.3 step 3: working days/times. (The global "Default boundaries"
// captured here through SCHEMA_VERSION 3 were removed in v4, Session 17 —
// per-day working hours is now the sole send-time window.)
export function WorkingHoursStep({ workingHours, onChange }: Props) {
  function patchDay(day: Weekday, patch: Partial<WorkingHours[Weekday]>): void {
    onChange({
      ...workingHours,
      [day]: { ...workingHours[day], ...patch },
    });
  }

  const errors = validateWorkingHours(workingHours);

  // Session 14 a11y: focus the step heading on mount (advance/Back lands here).
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="oq-step" aria-labelledby="oq-wh-title">
      <h1 id="oq-wh-title" ref={headingRef} tabIndex={-1}>
        Set your working hours
      </h1>
      <fieldset className="oq-days">
        <legend>Working days and times</legend>
        <p className="oq-help">
          We&rsquo;ll double-check before sending outside these hours in
          real-time.
          <br />
          Scheduling for later is always fine.
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
    </section>
  );
}
