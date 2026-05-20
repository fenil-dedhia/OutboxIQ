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

  it("search matches an offset string (+5:30 → India)", () => {
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
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent("India");
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
