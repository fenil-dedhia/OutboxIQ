// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

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
  it("renders one removable chip per pinned id (no drag handles by default)", () => {
    renderEditor(["America/Los_Angeles", "Asia/Kolkata"]);
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
    expect(screen.queryAllByRole("button", { name: /^Reorder/ })).toHaveLength(
      0,
    );
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
  const grips = () => screen.getAllByRole("button", { name: /^Reorder/ });

  it("renders a vertical list with a drag handle per row when reorderable", () => {
    renderEditor(pins, true);
    expect(grips()).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("ArrowDown on a handle moves that row down (array order)", () => {
    const { onChange } = renderEditor(pins, true);
    fireEvent.keyDown(grips()[0]!, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith([
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Kolkata",
    ]);
  });

  it("ArrowUp on a handle moves that row up", () => {
    const { onChange } = renderEditor(pins, true);
    fireEvent.keyDown(grips()[2]!, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith([
      "America/Los_Angeles",
      "Asia/Kolkata",
      "America/New_York",
    ]);
  });

  it("ArrowUp on the first row and ArrowDown on the last are no-ops (no write)", () => {
    const { onChange } = renderEditor(pins, true);
    fireEvent.keyDown(grips()[0]!, { key: "ArrowUp" });
    fireEvent.keyDown(grips()[2]!, { key: "ArrowDown" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("drag-and-drop reorders from the dragged row to the drop target", () => {
    const { onChange } = renderEditor(pins, true);
    const items = screen.getAllByRole("listitem");
    fireEvent.dragStart(items[0]!);
    fireEvent.dragOver(items[2]!);
    fireEvent.drop(items[2]!);
    expect(onChange).toHaveBeenCalledWith([
      "America/New_York",
      "Asia/Kolkata",
      "America/Los_Angeles",
    ]);
  });
});
