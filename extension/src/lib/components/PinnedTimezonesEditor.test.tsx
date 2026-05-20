import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PinnedTimezonesEditor } from "./PinnedTimezonesEditor";
import { DEFAULT_PINNED_TIMEZONES } from "../constants";

// Shared editor (Session 12) used by onboarding Step 2 AND the §5.8.2 Settings
// section. Onboarding's behaviour is covered by TimezoneStep.test.tsx; here we
// cover the component itself, including the Settings-only `reorderable` mode.

function renderEditor(pinned: string[], reorderable = false) {
  const onChange = vi.fn();
  render(
    <PinnedTimezonesEditor
      pinned={pinned}
      onChange={onChange}
      reorderable={reorderable}
    />,
  );
  return { onChange };
}

describe("PinnedTimezonesEditor — chips + add + at-cap", () => {
  it("renders one removable chip per pinned id (no reorder controls by default)", () => {
    renderEditor(["America/Los_Angeles", "Asia/Kolkata"]);
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
    expect(screen.queryAllByRole("button", { name: /^Move/ })).toHaveLength(0);
  });

  it("removing a chip calls onChange without that id (by position)", () => {
    const { onChange } = renderEditor(["America/Los_Angeles", "Asia/Kolkata"]);
    fireEvent.click(screen.getByRole("button", { name: /Remove India/ }));
    expect(onChange).toHaveBeenCalledWith(["America/Los_Angeles"]);
  });

  it("adding from the picker appends the chosen canonical IANA id", () => {
    const { onChange } = renderEditor(["America/Los_Angeles"]);
    fireEvent.click(screen.getByRole("combobox", { name: /add a timezone/i }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "tokyo" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: /Japan/ }));
    expect(onChange).toHaveBeenCalledWith([
      "America/Los_Angeles",
      "Asia/Tokyo",
    ]);
  });

  it("at the 5-pin cap: max message + remove-all, add picker hidden", () => {
    const { onChange } = renderEditor([...DEFAULT_PINNED_TIMEZONES]);
    expect(screen.getByText(/Maximum 5 pinned timezones/i)).toBeInTheDocument();
    expect(screen.queryByText("Add a timezone")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /remove all/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("with no pins: no chips, no remove-all, add picker available", () => {
    renderEditor([]);
    expect(screen.queryAllByRole("button", { name: /^Remove/ })).toHaveLength(
      0,
    );
    expect(screen.queryByRole("button", { name: /remove all/i })).toBeNull();
    expect(
      screen.getByRole("combobox", { name: /add a timezone/i }),
    ).toBeInTheDocument();
  });
});

describe("PinnedTimezonesEditor — reorder (Settings §5.8.2)", () => {
  const pins = ["America/Los_Angeles", "America/New_York", "Asia/Kolkata"];

  it("shows up/down controls per chip when reorderable", () => {
    renderEditor(pins, true);
    expect(
      screen.getAllByRole("button", { name: /^Move .* up$/ }),
    ).toHaveLength(3);
    expect(
      screen.getAllByRole("button", { name: /^Move .* down$/ }),
    ).toHaveLength(3);
  });

  it("disables up on the first chip and down on the last", () => {
    renderEditor(pins, true);
    const ups = screen.getAllByRole("button", { name: /^Move .* up$/ });
    const downs = screen.getAllByRole("button", { name: /^Move .* down$/ });
    expect(ups[0]).toBeDisabled();
    expect(ups[2]).toBeEnabled();
    expect(downs[2]).toBeDisabled();
    expect(downs[0]).toBeEnabled();
  });

  it("moving the first chip down swaps it with the second (array order)", () => {
    const { onChange } = renderEditor(pins, true);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Move .* down$/ })[0]!,
    );
    expect(onChange).toHaveBeenCalledWith([
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Kolkata",
    ]);
  });

  it("moving the last chip up swaps it with the previous", () => {
    const { onChange } = renderEditor(pins, true);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Move .* up$/ })[2]!,
    );
    expect(onChange).toHaveBeenCalledWith([
      "America/Los_Angeles",
      "Asia/Kolkata",
      "America/New_York",
    ]);
  });
});
