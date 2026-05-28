// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";
import { seedStorage } from "../../test/chrome-mock";
import {
  STORAGE_KEY_STATE,
  DEFAULT_PINNED_TIMEZONES,
} from "../../lib/constants";
import { createDefaultState, getState } from "../../lib/storage";

// PRD §5.8 Settings page shell: sidebar nav + switching content pane. The
// section internals are covered by their own tests; this is the scaffold +
// navigation smoke.

describe("Settings App (PRD §5.8)", () => {
  it("renders the three Free-v1 sections in the nav, Profile active first", async () => {
    render(<App />);
    // Loads asynchronously from storage.
    expect(
      await screen.findByRole("heading", { name: /profile & timezone/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /profile & timezone/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pinned timezones/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /recipient timezone cache/i }),
    ).toBeInTheDocument();
  });

  it("switches sections when a nav item is clicked", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: /pinned timezones/i }),
    );
    expect(
      screen.getByRole("heading", { name: /pinned timezones/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /recipient timezone cache/i }),
    );
    expect(
      screen.getByRole("heading", { name: /recipient timezone cache/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /working hours/i }));
    expect(
      screen.getByRole("heading", { name: /working hours/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /feature toggles/i }));
    expect(
      screen.getByRole("heading", { name: /feature toggles/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /privacy & data/i }));
    expect(
      screen.getByRole("heading", { name: /privacy & data/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^about$/i }));
    expect(
      screen.getByRole("heading", { name: /^about$/i }),
    ).toBeInTheDocument();
  });

  it("shows the user's stored timezone in the Profile picker", async () => {
    seedStorage({
      [STORAGE_KEY_STATE]: {
        ...createDefaultState(),
        user: {
          ...createDefaultState().user,
          timezone: "Asia/Tokyo",
          timezoneSource: "manual",
        },
      },
    });
    render(<App />);
    const picker = await screen.findByRole("combobox", {
      name: /your timezone/i,
    });
    expect(picker).toHaveTextContent(/Japan/);
  });

  // Reproduces the owner's cross-section concern: reorder pins, then check the
  // Profile picker reflects the new order WITHOUT a refresh (same-page, same
  // React state). The Gmail modal is a separate context — see below.
  it("reordering pins reflects immediately in the Profile picker (same page)", async () => {
    seedStorage({
      [STORAGE_KEY_STATE]: {
        ...createDefaultState(),
        // [Pacific, Eastern, UK, CET, India]
        pinnedTimezones: [...DEFAULT_PINNED_TIMEZONES],
      },
    });
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: /pinned timezones/i }),
    );
    const grips = screen.getAllByRole("button", { name: /^Reorder/ });
    expect(grips).toHaveLength(5);
    // Move Pacific (index 0) down one → Eastern becomes first.
    fireEvent.keyDown(grips[0]!, { key: "ArrowDown" });
    await waitFor(async () => {
      expect((await getState()).pinnedTimezones[0]).toBe("America/New_York");
    });

    // Back to Profile, open the picker — its Pinned section must show the new
    // order (Eastern before Pacific), no refresh.
    fireEvent.click(
      screen.getByRole("button", { name: /profile & timezone/i }),
    );
    fireEvent.click(screen.getByRole("combobox", { name: /your timezone/i }));
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Eastern Time");
    expect(options[1]).toHaveTextContent("Pacific Time");
  });

  // §6.1.1 right to erasure: after a confirmed wipe the page swaps to a
  // terminal confirmation (un-onboarded), not the editable sections.
  it("shows a post-delete confirmation screen after erasing all data", async () => {
    seedStorage({ [STORAGE_KEY_STATE]: createDefaultState() });
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: /privacy & data/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /delete my data/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "delete" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /delete my data/i }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /your data has been deleted/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /set up fashionably late again/i }),
    ).toBeInTheDocument();
    // The editable sections are gone.
    expect(
      screen.queryByRole("heading", { name: /privacy & data/i }),
    ).toBeNull();
  });

  // Session 14 a11y (Gap D — PRD §6.3): focus must move to the terminal
  // heading so a keyboard/SR user is notified of the irreversible state
  // change. The trigger button is now detached, so the delete-modal's
  // focus-restore can't help — this is the substitute.
  it("focuses the 'data has been deleted' heading on transition", async () => {
    seedStorage({ [STORAGE_KEY_STATE]: createDefaultState() });
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: /privacy & data/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /delete my data/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "delete" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /delete my data/i }),
    );

    const deletedH2 = await screen.findByRole("heading", {
      name: /your data has been deleted/i,
    });
    expect(deletedH2).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(document.activeElement).toBe(deletedH2));
  });
});
