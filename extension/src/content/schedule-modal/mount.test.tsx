// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Session 14 a11y (Gap E — PRD §8.9): verify the modal mounts inside a
// Shadow DOM, exposes role=dialog + aria-modal to AT, and restores focus to
// the previously-focused element on close (so a keyboard user lands back on
// Gmail's Send chevron / wherever they were before, rather than document
// body). These are the parts that ARE testable in jsdom; the
// inside-real-Gmail behavior (focus trap not fighting compose, AT reaching
// id-referenced ARIA inside the shadow root) is owner real-AT hands-on.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { openScheduleModal } from "./mount";
import { createDefaultState } from "../../lib/storage";

function defaultArgs(
  overrides: Partial<Parameters<typeof openScheduleModal>[0]> = {},
) {
  return {
    timezone: "America/New_York",
    workingHours: createDefaultState().workingHours,
    lastScheduled: null,
    recipients: [],
    pinnedTimezones: [],
    optimizeEnabled: false,
    onScheduled: vi.fn(),
    onRenderError: vi.fn(),
    ...overrides,
  };
}

function getModalHost(): HTMLElement | null {
  return document.getElementById("outboxiq-schedule-modal-host");
}

beforeEach(() => {
  // Ensure clean state — no leftover host or trigger in document.body.
  document.body.innerHTML = "";
});

afterEach(() => {
  getModalHost()?.remove();
});

describe("openScheduleModal — Shadow DOM mount", () => {
  it("mounts the modal into a Shadow DOM under a single host element", async () => {
    await act(async () => {
      openScheduleModal(defaultArgs());
    });
    const host = getModalHost();
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    const dialog =
      host?.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("only one host exists at a time (re-opening replaces the prior host)", async () => {
    await act(async () => {
      openScheduleModal(defaultArgs());
    });
    await act(async () => {
      openScheduleModal(defaultArgs());
    });
    expect(
      document.querySelectorAll("#outboxiq-schedule-modal-host"),
    ).toHaveLength(1);
  });
});

describe("openScheduleModal — focus restore on close (Session 14 a11y)", () => {
  it("restores focus to the previously-focused element when the modal closes", async () => {
    // Simulate Gmail's Send chevron / dropdown trigger having focus at the
    // moment the modal opens.
    const trigger = document.createElement("button");
    trigger.textContent = "Send chevron";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await act(async () => {
      openScheduleModal(defaultArgs());
    });

    // After mount, focus is inside the modal (the card autofocuses).
    expect(document.activeElement).not.toBe(trigger);

    // Find and click Cancel to close the modal.
    const host = getModalHost();
    const cancel =
      host?.shadowRoot?.querySelector<HTMLButtonElement>("button.text");
    expect(cancel).not.toBeNull();
    await act(async () => {
      cancel!.click();
    });

    // Modal is gone…
    expect(getModalHost()).toBeNull();
    // …and focus has been restored to the original trigger.
    expect(document.activeElement).toBe(trigger);
  });

  it("focus restore is a no-op when the original trigger is no longer focusable", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    await act(async () => {
      openScheduleModal(defaultArgs());
    });

    // Simulate Gmail tearing down the trigger while the modal is open
    // (e.g. the compose dialog closed under it).
    trigger.remove();

    // Closing must not throw.
    const host = getModalHost();
    const cancel =
      host?.shadowRoot?.querySelector<HTMLButtonElement>("button.text");
    let threw = false;
    try {
      await act(async () => {
        cancel!.click();
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(getModalHost()).toBeNull();
  });
});
