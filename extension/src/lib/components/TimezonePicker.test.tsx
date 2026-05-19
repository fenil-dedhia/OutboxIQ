import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TimezonePicker } from "./TimezonePicker";

describe("TimezonePicker (PRD §5.3.5 (k) shared component)", () => {
  it("renders a populated IANA list", () => {
    render(
      <TimezonePicker
        value="Europe/London"
        onChange={vi.fn()}
        ariaLabel="tz"
      />,
    );
    expect(
      screen.getByRole("option", { name: "Europe/London" }),
    ).toBeInTheDocument();
    // At least one other common zone — proves we're feeding the full list.
    expect(screen.queryByRole("option", { name: "Asia/Tokyo" })).not.toBeNull();
  });

  it("value === null renders the placeholder pre-selected (no default tz)", () => {
    render(
      <TimezonePicker
        value={null}
        onChange={vi.fn()}
        ariaLabel="picker"
        placeholder="Choose their timezone"
      />,
    );
    const select = screen.getByRole("combobox", {
      name: "picker",
    }) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(
      screen.getByRole("option", { name: "Choose their timezone" }),
    ).toBeInTheDocument();
  });

  it("fires onChange with the picked IANA zone, never empty", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker
        value={null}
        onChange={onChange}
        ariaLabel="picker"
        placeholder="Choose their timezone"
      />,
    );
    const select = screen.getByRole("combobox", { name: "picker" });
    fireEvent.change(select, { target: { value: "Asia/Tokyo" } });
    expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
    // The placeholder option is disabled and cannot be re-selected by users;
    // but if a synthetic event ever produced "", we MUST NOT fire onChange.
    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("works when a non-null value is provided (onboarding case — no placeholder option)", () => {
    render(
      <TimezonePicker
        value="America/New_York"
        onChange={vi.fn()}
        ariaLabel="picker"
        placeholder="Choose their timezone"
      />,
    );
    const select = screen.getByRole("combobox", {
      name: "picker",
    }) as HTMLSelectElement;
    expect(select.value).toBe("America/New_York");
    expect(
      screen.queryByRole("option", { name: "Choose their timezone" }),
    ).not.toBeInTheDocument();
  });
});
