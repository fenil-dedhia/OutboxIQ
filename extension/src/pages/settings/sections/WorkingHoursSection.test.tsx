// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkingHoursSection } from "./WorkingHoursSection";
import { createDefaultState } from "../../../lib/storage";

// PRD §5.8.2 Working Hours section. Persistence round-trips are in
// useSettings.test.tsx; this covers the section UI + the validity gate.

function renderSection(overrides = {}) {
  const onChange = vi.fn();
  const workingHours = { ...createDefaultState().workingHours, ...overrides };
  render(
    <WorkingHoursSection workingHours={workingHours} onChange={onChange} />,
  );
  return { onChange };
}

describe("WorkingHoursSection (PRD §5.8.2)", () => {
  it("renders a row per weekday", () => {
    renderSection();
    for (const day of ["Monday", "Friday", "Sunday"]) {
      expect(screen.getByLabelText(day)).toBeInTheDocument();
    }
  });

  it("toggling a day off autosaves with that day disabled", () => {
    const { onChange } = renderSection();
    fireEvent.click(screen.getByLabelText("Monday")); // was enabled → off
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].monday.enabled).toBe(false);
  });

  it("editing a Default boundary autosaves", () => {
    const { onChange } = renderSection();
    fireEvent.change(screen.getByLabelText(/Earliest send/i), {
      target: { value: "06:30" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].absoluteEarliest).toBe("06:30");
  });

  it("an invalid edit (end before start) shows an error and does NOT autosave", () => {
    const { onChange } = renderSection();
    // Monday default is 09:00–17:00; set end before start.
    fireEvent.change(screen.getByLabelText("Monday end"), {
      target: { value: "08:00" },
    });
    expect(
      screen.getByText(/End time must be after start time/i),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("invalid Default boundaries (latest before earliest) shows an error, no autosave", () => {
    const { onChange } = renderSection();
    fireEvent.change(screen.getByLabelText(/Latest send/i), {
      target: { value: "05:00" }, // before the 07:00 earliest
    });
    expect(
      screen.getByText(/Latest send time must be after the earliest/i),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Reset to defaults asks for confirmation, then restores defaults", () => {
    const { onChange } = renderSection({ absoluteEarliest: "06:00" });
    fireEvent.click(screen.getByRole("button", { name: /reset to defaults/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: /^reset to defaults$/i }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].absoluteEarliest).toBe("07:00");
  });
});
