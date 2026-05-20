import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";
import { seedStorage } from "../../test/chrome-mock";
import { STORAGE_KEY_STATE } from "../../lib/constants";
import { createDefaultState } from "../../lib/storage";

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
});
