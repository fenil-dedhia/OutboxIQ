// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TimezonePicker } from "./TimezonePicker";

// Session 11: the picker is now a searchable combobox over the curated
// dataset (was a native <select> over raw IANA ids). These assertions were
// rewritten for that contract — DELIBERATELY, not silently:
//   • options are not in the DOM until the menu is opened (a search popup,
//     not a pre-rendered <select>);
//   • the trigger shows the friendly curated *label*, not the raw IANA id;
//   • onChange still emits the canonical IANA id (stored data unchanged).

function openMenu() {
  fireEvent.click(screen.getByRole("combobox"));
}

describe("TimezonePicker (PRD §5.3.5 (k) shared component)", () => {
  it("trigger shows the curated group label for a stored canonical zone", () => {
    render(
      <TimezonePicker value="Asia/Kolkata" onChange={vi.fn()} ariaLabel="tz" />,
    );
    expect(screen.getByRole("combobox", { name: "tz" })).toHaveTextContent(
      "India",
    );
  });

  it("resolves a non-primary stored zone to its group for display (no migration)", () => {
    // Browser-detected zones are usually not curated primaries.
    render(
      <TimezonePicker
        value="Europe/Amsterdam"
        onChange={vi.fn()}
        ariaLabel="tz"
      />,
    );
    expect(screen.getByRole("combobox", { name: "tz" })).toHaveTextContent(
      "Central European",
    );
  });

  it("resolves a deprecated IANA id (Asia/Calcutta) to the India group", () => {
    render(
      <TimezonePicker
        value="Asia/Calcutta"
        onChange={vi.fn()}
        ariaLabel="tz"
      />,
    );
    expect(screen.getByRole("combobox", { name: "tz" })).toHaveTextContent(
      "India",
    );
  });

  it("value === null shows the placeholder (no default tz)", () => {
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        placeholder="Choose their timezone"
      />,
    );
    expect(screen.getByRole("combobox", { name: "picker" })).toHaveTextContent(
      "Choose their timezone",
    );
  });

  it("surfaces an unknown zone as raw text plus an update hint (does not break)", () => {
    render(
      <TimezonePicker value="Not/AZone" onChange={vi.fn()} ariaLabel="tz" />,
    );
    expect(screen.getByRole("combobox", { name: "tz" })).toHaveTextContent(
      "Not/AZone",
    );
    expect(screen.getByText(/pick to update/i)).toBeInTheDocument();
  });

  it("opens on click and lists curated groups (not raw IANA ids)", () => {
    render(
      <TimezonePicker value={null} onChange={vi.fn()} ariaLabel="picker" />,
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    openMenu();
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option").length).toBeGreaterThan(20);
    expect(
      within(list).getByRole("option", { name: /India.*Mumbai/ }),
    ).toBeInTheDocument();
  });

  it("search matches a familiar city not in the IANA id (Mumbai → India)", () => {
    render(
      <TimezonePicker value={null} onChange={vi.fn()} ariaLabel="picker" />,
    );
    openMenu();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "mumbai" },
      },
    );
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent("India");
  });

  it("search matches an offset string (+5:30 → India and Sri Lanka)", () => {
    render(
      <TimezonePicker value={null} onChange={vi.fn()} ariaLabel="picker" />,
    );
    openMenu();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "+5:30" },
      },
    );
    // Both +5:30 rows match (India and Sri Lanka are now separate rows).
    expect(screen.getByRole("option", { name: /India/ })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Sri Lanka/ }),
    ).toBeInTheDocument();
  });

  it("zero matches shows the empty state", () => {
    render(
      <TimezonePicker value={null} onChange={vi.fn()} ariaLabel="picker" />,
    );
    openMenu();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "zzzzz" },
      },
    );
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No timezones found")).toBeInTheDocument();
  });

  it("clicking an option fires onChange with the canonical IANA id", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker value={null} onChange={onChange} ariaLabel="picker" />,
    );
    openMenu();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "kolkata" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option"));
    expect(onChange).toHaveBeenCalledWith("Asia/Kolkata");
    // Menu closes after selection.
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keyboard: type, Enter selects the highlighted option (canonical IANA)", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker value={null} onChange={onChange} ariaLabel="picker" />,
    );
    openMenu();
    const input = screen.getByRole("textbox", { name: "Search timezones" });
    fireEvent.change(input, { target: { value: "india" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("Asia/Kolkata");
  });

  it("Escape closes the menu without selecting", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker value={null} onChange={onChange} ariaLabel="picker" />,
    );
    openMenu();
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Search timezones" }),
      { key: "Escape" },
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not open when disabled", () => {
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        disabled
      />,
    );
    openMenu();
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("TimezonePicker — Pinned section (PRD §5.1.3 Step 2)", () => {
  const pins = ["America/Los_Angeles", "Asia/Kolkata"];

  it("renders Pinned + All timezones sections; an entry appears once", () => {
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        pinnedIanaIds={pins}
      />,
    );
    openMenu();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("All timezones")).toBeInTheDocument();
    // The pinned India entry is NOT duplicated into "All timezones".
    expect(screen.getAllByRole("option", { name: /India/ })).toHaveLength(1);
    expect(
      screen.getAllByRole("option", { name: /Pacific Time/ }),
    ).toHaveLength(1);
  });

  it("omits the Pinned section entirely when no pins are configured", () => {
    render(
      <TimezonePicker value={null} onChange={vi.fn()} ariaLabel="picker" />,
    );
    openMenu();
    expect(screen.queryByText("Pinned")).toBeNull();
    expect(screen.queryByText("All timezones")).toBeNull();
  });

  it("search filters across both sections (no Pinned header when nothing pinned matches)", () => {
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        pinnedIanaIds={pins}
      />,
    );
    openMenu();
    const input = screen.getByRole("textbox", { name: "Search timezones" });
    // "tokyo" matches a NON-pinned entry only → no Pinned header.
    fireEvent.change(input, { target: { value: "tokyo" } });
    expect(screen.queryByText("Pinned")).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("Japan");
  });

  it("renders the Pinned section in pinnedIanaIds array order (not dataset/offset order)", () => {
    // India (+5:30) then Pacific (-8): the OPPOSITE of dataset west→east order,
    // so this only passes if the picker honours the pinned ARRAY order (the
    // §5.8.2 reorder is authoritative — Session 12).
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        pinnedIanaIds={["Asia/Kolkata", "America/Los_Angeles"]}
      />,
    );
    openMenu();
    const options = screen.getAllByRole("option");
    // The pinned entries render first, in array order.
    expect(options[0]).toHaveTextContent("India");
    expect(options[1]).toHaveTextContent("Pacific Time");
  });

  it("scrolls the active option into view on keyboard nav but NOT on mouse hover", () => {
    // Regression (Session 12): hovering a partially-clipped row used to scroll
    // the list and hide the top pinned row. Hover must move the highlight
    // WITHOUT scrolling; only keyboard nav (and the initial open) scrolls.
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: scrollSpy,
      configurable: true,
      writable: true,
    });
    try {
      render(
        <TimezonePicker
          value={null}
          onChange={vi.fn()}
          ariaLabel="picker"
          pinnedIanaIds={["America/Los_Angeles", "Asia/Kolkata"]}
        />,
      );
      openMenu();
      scrollSpy.mockClear(); // ignore the initial open-time scroll

      // Hovering an option highlights it but must not scroll.
      fireEvent.mouseEnter(screen.getAllByRole("option")[3]!);
      expect(scrollSpy).not.toHaveBeenCalled();

      // Arrow-key nav must scroll the newly-active option into view.
      fireEvent.keyDown(
        screen.getByRole("textbox", { name: "Search timezones" }),
        { key: "ArrowDown" },
      );
      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown })
        .scrollIntoView;
    }
  });

  it("selecting a pinned option emits its canonical IANA id", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker
        value={null}
        onChange={onChange}
        ariaLabel="picker"
        pinnedIanaIds={pins}
      />,
    );
    openMenu();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "pacific" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: /Pacific Time/ }));
    expect(onChange).toHaveBeenCalledWith("America/Los_Angeles");
  });
});
