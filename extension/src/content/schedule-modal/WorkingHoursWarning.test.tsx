// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkingHoursWarning } from "./WorkingHoursWarning";
import { checkWorkingHours } from "../../lib/schedule/working-hours";
import { createDefaultState } from "../../lib/storage";
import type { WorkingHoursVerdict } from "../../lib/schedule/working-hours";

const WH = createDefaultState().workingHours; // Mon–Fri 9–17, Sat/Sun off
const at = (day: number, hour: number) => ({
  year: 2026,
  month: 5,
  day,
  hour,
  minute: 0,
});

describe("WorkingHoursWarning (PRD §5.5 soft-warning — working hours only since v4)", () => {
  it("before-start: names it, shows all three options, tz abbr adjacent", () => {
    const verdict = checkWorkingHours(at(18, 8), WH); // Mon 08:00 → before-start
    const onSnap = vi.fn();
    const onProceed = vi.fn();
    render(
      <WorkingHoursWarning
        verdict={verdict}
        tzAbbr="EDT"
        busy={false}
        onSnap={onSnap}
        onProceed={onProceed}
        onCancel={vi.fn()}
      />,
    );
    // §8.4: timezone abbreviation adjacent to the time.
    expect(
      screen.getByText(/before your working hours start/i),
    ).toHaveTextContent("EDT");
    fireEvent.click(screen.getByRole("button", { name: /reschedule to/i }));
    fireEvent.click(screen.getByRole("button", { name: /anyway/i }));
    expect(onSnap).toHaveBeenCalledTimes(1);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it("after-end (regular Send): copy reads 'past your working hours'", () => {
    const verdict = checkWorkingHours(at(18, 21), WH); // Mon 21:00 → after-end
    render(
      <WorkingHoursWarning
        verdict={verdict}
        tzAbbr="EDT"
        context="send"
        busy={false}
        onSnap={vi.fn()}
        onProceed={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const lead = screen.getByText(/past your working hours/i);
    expect(lead.textContent).toMatch(/^It's /);
    expect(lead).toHaveTextContent("EDT");
    // Reschedule offers the next working morning (Tue 9:00 AM), strictly future.
    expect(
      screen.getByRole("button", { name: /reschedule to/i }),
    ).toHaveTextContent(/9:00 AM/);
  });

  it("non-working-day: phrases it as not a working day", () => {
    const verdict = checkWorkingHours(at(23, 10), WH); // Sat 10:00
    render(
      <WorkingHoursWarning
        verdict={verdict}
        tzAbbr="EDT"
        busy={false}
        onSnap={vi.fn()}
        onProceed={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/isn't one of your working days/i),
    ).toBeInTheDocument();
  });

  it("context='send' (§5.5.1): present-tense lead + 'Send now anyway'", () => {
    const verdict = checkWorkingHours(at(18, 8), WH); // Mon 08:00 → before-start
    render(
      <WorkingHoursWarning
        verdict={verdict}
        tzAbbr="EDT"
        context="send"
        busy={false}
        onSnap={vi.fn()}
        onProceed={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    // §5.5.1 sends NOW — copy must say so, not "is scheduled for".
    const lead = screen.getByText(/before your working hours start/i);
    expect(lead.textContent).toMatch(/^It's /);
    expect(lead.textContent).not.toMatch(/is scheduled for/i);
    expect(
      screen.getByRole("button", { name: /^send now anyway$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send on .* anyway/i }),
    ).not.toBeInTheDocument();
  });

  it("no Reschedule button when there is no snap (defensive)", () => {
    const verdict: WorkingHoursVerdict = {
      ok: false,
      kind: "working-hours",
      detail: "non-working-day",
      requested: at(23, 10),
      snap: null,
    };
    const onCancel = vi.fn();
    render(
      <WorkingHoursWarning
        verdict={verdict}
        tzAbbr="EDT"
        busy={false}
        onSnap={vi.fn()}
        onProceed={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /reschedule to/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
