import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TimezoneStep } from "./TimezoneStep";
import { DEFAULT_PINNED_TIMEZONES } from "../../../lib/constants";

// PRD §5.1.3 Step 2 (Session 11): the combined timezone + pinned-timezones
// step. TimezoneStep is controlled (pinned comes from props), so add/remove/
// skip/cap are verified through the onPinnedChange callback.

function renderStep(pinned: string[]) {
  const onChange = vi.fn();
  const onPinnedChange = vi.fn();
  render(
    <TimezoneStep
      timezone="America/New_York"
      timezoneSource="browser"
      pinned={pinned}
      onChange={onChange}
      onPinnedChange={onPinnedChange}
    />,
  );
  return { onChange, onPinnedChange };
}

describe("TimezoneStep — Pinned Timezones (PRD §5.1.3 Step 2)", () => {
  it("renders the pre-selected default pins as removable chips", () => {
    renderStep([...DEFAULT_PINNED_TIMEZONES]);
    const removeButtons = screen.getAllByRole("button", { name: /^Remove/ });
    expect(removeButtons).toHaveLength(DEFAULT_PINNED_TIMEZONES.length);
  });

  it("removing a chip calls onPinnedChange without that id", () => {
    const { onPinnedChange } = renderStep([
      "America/Los_Angeles",
      "Asia/Kolkata",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Remove India/ }));
    expect(onPinnedChange).toHaveBeenCalledWith(["America/Los_Angeles"]);
  });

  it("adding from the picker appends the chosen canonical IANA id", () => {
    const { onPinnedChange } = renderStep(["America/Los_Angeles"]);
    fireEvent.click(screen.getByRole("combobox", { name: /add a timezone/i }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "tokyo" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: /Japan/ }));
    expect(onPinnedChange).toHaveBeenCalledWith([
      "America/Los_Angeles",
      "Asia/Tokyo",
    ]);
  });

  it("at the 5-pin cap: shows the max message and hides the add picker", () => {
    renderStep([...DEFAULT_PINNED_TIMEZONES]); // exactly 5
    expect(screen.getByText(/Maximum 5 pinned timezones/i)).toBeInTheDocument();
    expect(screen.queryByText("Add a timezone")).toBeNull();
    // The "Your timezone" picker is still present (only the add picker is gone).
    expect(
      screen.getByRole("combobox", { name: /your timezone/i }),
    ).toBeInTheDocument();
  });

  it("'remove all' (in the at-cap message) clears pins to an empty array", () => {
    const { onPinnedChange } = renderStep([...DEFAULT_PINNED_TIMEZONES]);
    fireEvent.click(screen.getByRole("button", { name: /remove all/i }));
    expect(onPinnedChange).toHaveBeenCalledWith([]);
  });

  it("with no pins: no chips, no 'remove all', add picker available", () => {
    renderStep([]);
    expect(screen.queryAllByRole("button", { name: /^Remove/ })).toHaveLength(
      0,
    );
    expect(screen.queryByRole("button", { name: /remove all/i })).toBeNull();
    expect(
      screen.getByRole("combobox", { name: /add a timezone/i }),
    ).toBeInTheDocument();
  });
});
