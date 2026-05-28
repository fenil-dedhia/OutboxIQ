// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Integration test for the §5.5 trigger split locked by Entry 40:
//   • Case 1 — Optimize-for-X computed time crosses Default boundaries:
//     §5.5 warning is SUPPRESSED; the schedule fires directly.
//   • Case 2 — manual selection (Quick Option) crosses Default boundaries:
//     §5.5 warning fires (existing behaviour, regression-guarded).
//
// We mock the schedule-actions module so neither path tries to drive Gmail's
// real DOM under jsdom; we only need to observe which one was invoked.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleModal } from "./ScheduleModal";
import { setManualRecipientTimezone } from "../../lib/recipient-cache";
import { createDefaultState } from "../../lib/storage";
import type { WorkingHours } from "../../lib/storage";
import type { ComposeRecipient } from "../compose/compose-recipients";

vi.mock("./schedule-actions", () => ({
  scheduleAt: vi.fn(async () => undefined),
  schedulePreset: vi.fn(async () => undefined),
  openNativeScheduleDialog: vi.fn(async () => undefined),
}));

// Imported AFTER vi.mock so we get the spy versions.
import { scheduleAt, schedulePreset } from "./schedule-actions";

// User in New York; Default boundaries clamp 8 AM–5 PM so 9 AM Tokyo
// (= 8 PM previous day NYC EDT in summer) falls OUTSIDE the user's latest.
const narrowBoundaries: WorkingHours = {
  ...createDefaultState().workingHours,
  absoluteEarliest: "08:00",
  absoluteLatest: "17:00",
};

const sarah: ComposeRecipient = {
  email: "sarah@example.com",
  displayName: "Sarah Chen",
  field: "To",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScheduleModal §5.5 trigger split (Entry 40)", () => {
  it("Case 1: Optimize-for-X SUPPRESSES the §5.5 Default-boundaries warning", async () => {
    // Recipient in Tokyo cached → cache hit; "Morning peak" = 9 AM JST =
    // 20:00 NYC EDT the previous day → outside the user's 08:00–17:00
    // Default boundaries. Under the old rule this would fire §5.5; under
    // Entry 40 Case 1 it must NOT.
    await setManualRecipientTimezone(sarah.email, "Asia/Tokyo", "Sarah Chen");

    render(
      <ScheduleModal
        timezone="America/New_York"
        workingHours={narrowBoundaries}
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={true}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    // Wait for both: (1) the confirmation line is rendered (the section's
    // own state is ready) AND (2) the parent's Schedule button is enabled
    // (the bubbled choice has propagated up via useEffect → setOptimize).
    // These commit on separate render passes — the section renders before
    // its useEffect fires onChange, so testing only #1 races the click.
    await waitFor(() => {
      expect(document.querySelector(".optimize-confirm")).not.toBeNull();
      const btn = screen.getByRole("button", { name: /^schedule$/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /^schedule$/i }));

    // The §5.5 warning modal MUST NOT appear (Case 1 exception).
    await waitFor(() => {
      expect(scheduleAt).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole("alertdialog", {
        name: /outside your working hours/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/earliest you said you'd ever send/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/latest you said you'd ever send/i),
    ).not.toBeInTheDocument();
  });

  it("Case 2: a Quick Option violating Default boundaries STILL fires §5.5", () => {
    // Compute presets with a real `new Date()` — we don't control the date,
    // so we use a workingHours config that's guaranteed to be violated by
    // ANY of the standard presets. The standard Quick Options sit at 8:00
    // AM and 1:00 PM; clamp Default boundaries to 14:00–16:00 so the 8:00
    // AM "Tomorrow morning" and "Next Monday morning" presets are both
    // before-earliest violations (8:00 < 14:00). "Tomorrow afternoon" at
    // 13:00 is also before 14:00 — every preset is guaranteed-violating.
    const clamped: WorkingHours = {
      ...createDefaultState().workingHours,
      absoluteEarliest: "14:00",
      absoluteLatest: "16:00",
    };

    render(
      <ScheduleModal
        timezone="America/New_York"
        workingHours={clamped}
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={true}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Click any Quick Option preset row — they're all violating under
    // these boundaries.
    const presetRows = screen.getAllByRole("button", {
      name: /tomorrow|next monday/i,
    });
    expect(presetRows.length).toBeGreaterThan(0);
    fireEvent.click(presetRows[0]!);
    fireEvent.click(screen.getByRole("button", { name: /^schedule$/i }));

    // The §5.5 warning MUST appear (manual selection — Case 2 unchanged).
    expect(
      screen.getByRole("alertdialog", { name: /outside your working hours/i }),
    ).toBeInTheDocument();
    // Preset must NOT have been scheduled — the warning is gating it.
    expect(schedulePreset).not.toHaveBeenCalled();
  });
});

describe("ScheduleModal — §5.8.2 recipientOptimization toggle", () => {
  it("renders the Optimize section when enabled", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        workingHours={createDefaultState().workingHours}
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={true}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    ).toBeInTheDocument();
  });

  it("hides the Optimize section when disabled (rest of the modal still works)", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        workingHours={createDefaultState().workingHours}
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={false}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("checkbox", { name: /optimize delivery for/i }),
    ).toBeNull();
    // Quick Options are unaffected.
    expect(
      screen.getAllByRole("button", { name: /tomorrow|next monday/i }).length,
    ).toBeGreaterThan(0);
  });
});
