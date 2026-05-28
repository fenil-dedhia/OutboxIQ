// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import {
  WEEKDAYS,
  createDefaultState,
  validateWorkingHours,
  type Weekday,
  type WorkingHours,
} from "../../../lib/storage";

// PRD §5.8.2 "Working Hours" — per-day toggle + times, plus the Default
// boundaries (Entry-40 framing; the schema fields stay absoluteEarliest/
// absoluteLatest, Entry-30 stable identifiers). This section edits STATE only;
// it does NOT touch §5.5 enforcement (the three-choice soft-warning pattern +
// the Optimize-for-X exception are locked — Entries 19/40).
//
// Same time-picker pattern as onboarding Step 3 (native <input type="time"> +
// per-day checkbox). A section-local buffer holds the edit so an invalid
// intermediate (end before start) shows an inline error but is NOT autosaved
// until valid — keeping an invalid value out of the global state that §5.5
// reads. Valid edits autosave immediately (PRD §5.8, no Save button).

const DAY_LABEL: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

interface Props {
  workingHours: WorkingHours;
  /** Autosave — called only with VALID working hours. */
  onChange: (next: WorkingHours) => void;
}

export function WorkingHoursSection({ workingHours, onChange }: Props) {
  // Section-local buffer (see header). Re-syncs when the global value changes
  // (e.g. Reset), but an invalid in-progress edit doesn't change the global, so
  // this effect won't clobber it.
  const [wh, setWh] = useState<WorkingHours>(workingHours);
  const [confirmingReset, setConfirmingReset] = useState(false);
  useEffect(() => {
    setWh(workingHours);
  }, [workingHours]);

  const errors = validateWorkingHours(wh);

  // Apply an edit locally; autosave only when the result is valid.
  function apply(next: WorkingHours): void {
    setWh(next);
    const e = validateWorkingHours(next);
    if (Object.keys(e.days).length === 0 && e.bounds === null) onChange(next);
  }

  function patchDay(day: Weekday, patch: Partial<WorkingHours[Weekday]>): void {
    apply({ ...wh, [day]: { ...wh[day], ...patch } });
  }

  function doReset(): void {
    const defaults = createDefaultState().workingHours;
    setWh(defaults);
    onChange(defaults); // defaults are always valid
    setConfirmingReset(false);
  }

  return (
    <section className="fl-set-section" aria-labelledby="fl-set-wh-h">
      <h2 id="fl-set-wh-h">Working hours</h2>
      <p className="fl-set-help">
        When you&rsquo;d normally send — your regular send-time pattern, in your
        local time. If you click Send outside these hours, Fashionably Late will
        gently confirm before sending.
      </p>

      <fieldset className="fl-set-wh-days">
        <legend>Working days and times</legend>
        {WEEKDAYS.map((day) => {
          const d = wh[day];
          const dayError = errors.days[day];
          return (
            <div key={day}>
              <div className="fl-set-wh-row">
                <label className="fl-set-wh-toggle">
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
                  <span className="fl-set-sr-only">{DAY_LABEL[day]} start</span>
                  <input
                    type="time"
                    value={d.start}
                    disabled={!d.enabled}
                    onChange={(e) => patchDay(day, { start: e.target.value })}
                  />
                </label>
                <span aria-hidden="true">&ndash;</span>
                <label>
                  <span className="fl-set-sr-only">{DAY_LABEL[day]} end</span>
                  <input
                    type="time"
                    value={d.end}
                    disabled={!d.enabled}
                    onChange={(e) => patchDay(day, { end: e.target.value })}
                  />
                </label>
              </div>
              {dayError && (
                <p className="fl-set-error" role="alert">
                  {DAY_LABEL[day]}: {dayError}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="fl-set-wh-bounds">
        <legend>Default boundaries (your local time)</legend>
        <p className="fl-set-help">
          Times when you usually don&rsquo;t want emails going out. We&rsquo;ll
          check in if you schedule outside these hours — unless you&rsquo;re
          using Optimize-for-X, where we respect your choice to reach recipients
          in their working hours.
        </p>
        <label className="fl-set-wh-field">
          <span>Default boundaries &mdash; Earliest send</span>
          <input
            type="time"
            value={wh.absoluteEarliest}
            onChange={(e) => apply({ ...wh, absoluteEarliest: e.target.value })}
          />
        </label>
        <label className="fl-set-wh-field">
          <span>Default boundaries &mdash; Latest send</span>
          <input
            type="time"
            value={wh.absoluteLatest}
            onChange={(e) => apply({ ...wh, absoluteLatest: e.target.value })}
          />
        </label>
        {errors.bounds && (
          <p className="fl-set-error" role="alert">
            {errors.bounds}
          </p>
        )}
      </fieldset>

      {confirmingReset ? (
        <div
          className="fl-set-confirm"
          role="alertdialog"
          aria-label="Confirm reset working hours"
        >
          <span>
            Reset working hours and Default boundaries to their defaults
            (Mon–Fri 9:00 AM–5:00 PM, 7:00 AM–7:00 PM)?
          </span>
          <div className="fl-set-confirm-actions">
            <button
              type="button"
              className="fl-set-btn fl-set-btn-danger"
              onClick={doReset}
            >
              Reset to defaults
            </button>
            <button
              type="button"
              className="fl-set-btn"
              onClick={() => setConfirmingReset(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="fl-set-btn"
          onClick={() => setConfirmingReset(true)}
        >
          Reset to defaults
        </button>
      )}
    </section>
  );
}
