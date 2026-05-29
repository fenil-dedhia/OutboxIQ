// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Integration test for the Schedule Send modal. As of SCHEMA_VERSION 4
// (Session 17) the Schedule Send path raises NO §5.5 soft warning at all —
// deliberately scheduling outside your working hours is the core use case
// (Entry 21), and the global "Default boundaries" that were its only warning
// trigger have been removed. So every path here schedules directly. (The
// working-hours warning now lives only on §5.5.1 regular Send.)
//
// We mock the schedule-actions module so neither path tries to drive Gmail's
// real DOM under jsdom; we only need to observe which one was invoked.

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleModal } from "./ScheduleModal";
import { setManualRecipientTimezone } from "../../lib/recipient-cache";
import type { ComposeRecipient } from "../compose/compose-recipients";

vi.mock("./schedule-actions", () => ({
  scheduleAt: vi.fn(async () => undefined),
  schedulePreset: vi.fn(async () => undefined),
  openNativeScheduleDialog: vi.fn(async () => undefined),
}));

// Imported AFTER vi.mock so we get the spy versions.
import { scheduleAt, schedulePreset } from "./schedule-actions";

const sarah: ComposeRecipient = {
  email: "sarah@example.com",
  displayName: "Sarah Chen",
  field: "To",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScheduleModal — no §5.5 warning on Schedule Send (v4)", () => {
  it("Optimize-for-X schedules directly, no warning dialog", async () => {
    // Tokyo recipient cached → "Morning peak" lands far outside the user's
    // hours, but Schedule Send never warns: it schedules directly.
    await setManualRecipientTimezone(sarah.email, "Asia/Tokyo", "Sarah Chen");

    render(
      <ScheduleModal
        timezone="America/New_York"
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
    // Wait for both: the confirmation line is rendered AND the Schedule button
    // is enabled (the bubbled choice has propagated up via useEffect).
    await waitFor(() => {
      expect(document.querySelector(".optimize-confirm")).not.toBeNull();
      const btn = screen.getByRole("button", { name: /^schedule$/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /^schedule$/i }));

    await waitFor(() => {
      expect(scheduleAt).toHaveBeenCalledTimes(1);
    });
    // No soft-warning modal anywhere.
    expect(
      screen.queryByRole("alertdialog", {
        name: /outside your working hours/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/past your working hours/i),
    ).not.toBeInTheDocument();
  });

  it("a Quick Option schedules directly, no warning dialog", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={true}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The standard Quick Options sit at 8:00 AM / 1:00 PM — outside the default
    // 9–5 working hours — but Schedule Send no longer warns; it schedules.
    const presetRows = screen.getAllByRole("button", {
      name: /tomorrow|next monday/i,
    });
    expect(presetRows.length).toBeGreaterThan(0);
    fireEvent.click(presetRows[0]!);
    fireEvent.click(screen.getByRole("button", { name: /^schedule$/i }));

    // No warning, and the preset is scheduled directly.
    expect(
      screen.queryByRole("alertdialog", {
        name: /outside your working hours/i,
      }),
    ).not.toBeInTheDocument();
    expect(schedulePreset).toHaveBeenCalledTimes(1);
  });
});

// Session 14 a11y (Gap E — PRD §6.3, §8.9):
describe("ScheduleModal a11y — focus trap (Session 14)", () => {
  it("dialog role + aria-modal + accessible name are in place", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={false}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: /schedule send with fashionably late/i,
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("Tab from the last focusable element in the dialog wraps to the first", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={false}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusables.length).toBeGreaterThan(2);
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("Shift+Tab from the first focusable wraps to the last", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={false}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("ordinary Tab in the middle of the dialog is NOT intercepted", () => {
    // The trap only fires at the boundaries — interior Tab presses must
    // fall through to the browser's default focus navigation so we don't
    // fight Gmail's focus handling on every keystroke.
    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[sarah]}
        pinnedTimezones={[]}
        optimizeEnabled={false}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const middle = focusables[Math.floor(focusables.length / 2)]!;
    middle.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    middle.dispatchEvent(event);
    // The trap's preventDefault is only called at boundaries.
    expect(event.defaultPrevented).toBe(false);
  });
});

// Session 16 security audit: affirmative XSS guard. The recipient name flows
// from Gmail's compose DOM (the chip's `data-name` attribute), and a SENDER
// controls their own display name — so recipient data is attacker-influenceable
// in principle. The full audit found no `innerHTML` / `dangerouslySetInnerHTML`
// / other unsafe sinks in production source: every render of recipient data
// goes through React `{value}` text rendering, which escapes by default. This
// regression test pins that property so a future refactor that introduced an
// unsafe sink (e.g. a markdown renderer, or `dangerouslySetInnerHTML` for
// formatting) would fail loudly here.
describe("ScheduleModal — XSS guard (Session 16 security audit)", () => {
  it("renders an attacker-flavored recipient display name as escaped text, never HTML", () => {
    const malicious: ComposeRecipient = {
      email: "attacker@example.com",
      displayName:
        '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>',
      field: "To",
    };
    delete (window as unknown as { __xss?: number }).__xss;

    render(
      <ScheduleModal
        timezone="America/New_York"
        lastScheduled={null}
        recipients={[malicious]}
        pinnedTimezones={[]}
        optimizeEnabled={true}
        onScheduled={vi.fn()}
        onOpenSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The malicious display name appears in the Optimize recipient <select> as
    // an <option>'s text content. React must have escaped the angle brackets.
    expect(
      screen.getByText(malicious.displayName as string),
    ).toBeInTheDocument();

    // The rendered DOM must NOT have parsed an <img> or <script> element.
    const injectedImg = document.querySelector('img[src="x"]');
    const injectedScript = Array.from(document.querySelectorAll("script")).find(
      (s) => /window\.__xss/.test(s.textContent ?? ""),
    );
    expect(injectedImg).toBeNull();
    expect(injectedScript).toBeUndefined();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });
});

describe("ScheduleModal — §5.8.2 recipientOptimization toggle", () => {
  it("renders the Optimize section when enabled", () => {
    render(
      <ScheduleModal
        timezone="America/New_York"
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
