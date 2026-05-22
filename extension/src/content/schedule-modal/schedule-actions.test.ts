// Regression tests for the §5.3.4 custom "Pick date & time" path's
// multi-dialog disambiguation (findPickerFields). These guard the Session-13
// live-Gmail bug: Gmail keeps several [role="dialog"] nodes mounted at once
// (the compose window is itself a role=dialog) and mounts the picker as a
// fresh dialog, so scheduling intermittently grabbed the wrong dialog — once
// failing to find "Pick date & time", once timing out reading inputs from a
// stale/compose dialog. findPickerFields pins the picker by its CONTENTS
// (a date-shaped + a time-shaped input value), independent of node identity
// or dialog order. The DOM-driving recipe itself needs live Gmail; this covers
// the pure disambiguation logic that the bug lived in.

import { describe, it, expect } from "vitest";
import { findPickerFields } from "./schedule-actions";

function dialogWithInputs(values: string[]): HTMLElement {
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  for (const v of values) {
    const input = document.createElement("input");
    input.value = v;
    dialog.appendChild(input);
  }
  return dialog;
}

describe("findPickerFields — §5.3.4 multi-dialog disambiguation", () => {
  it("returns the picker's date+time inputs, ignoring the compose dialog", () => {
    const compose = dialogWithInputs(["bob@example.com", ""]); // To + Subject
    const picker = dialogWithInputs(["May 23, 2026", "4:00 AM"]); // date + time

    const result = findPickerFields([compose, picker]);

    expect(result).not.toBeNull();
    expect(result!.dialog).toBe(picker);
    expect(result!.dateInput.value).toBe("May 23, 2026");
    expect(result!.timeInput.value).toBe("4:00 AM");
  });

  it("finds the picker regardless of dialog order", () => {
    const compose = dialogWithInputs(["alice@example.com", "Subject text"]);
    const picker = dialogWithInputs(["Dec 31, 2026", "9:00 AM"]);

    expect(findPickerFields([picker, compose])?.dialog).toBe(picker);
    expect(findPickerFields([compose, picker])?.dialog).toBe(picker);
  });

  it("returns null while no picker dialog exists yet (caller keeps polling)", () => {
    const compose = dialogWithInputs(["bob@example.com", ""]);
    const menuOnly = document.createElement("div"); // schedule menu, no inputs
    menuOnly.setAttribute("role", "dialog");

    expect(findPickerFields([compose, menuOnly])).toBeNull();
  });

  it("requires BOTH a date and a time input (not just one)", () => {
    expect(findPickerFields([dialogWithInputs(["4:00 AM"])])).toBeNull();
    expect(findPickerFields([dialogWithInputs(["May 23, 2026"])])).toBeNull();
  });

  it("does not treat a subject that merely mentions a time as the picker", () => {
    // "Call at 3:30 PM" matches the time shape, but with no date-shaped input
    // in the same dialog it must not be mistaken for the picker.
    const compose = dialogWithInputs(["bob@example.com", "Call at 3:30 PM"]);
    expect(findPickerFields([compose])).toBeNull();
  });

  it("requires date and time in SEPARATE inputs, not one combined value", () => {
    const combined = dialogWithInputs(["Meeting May 23, 2026 at 3:30 PM"]);
    expect(findPickerFields([combined])).toBeNull();
  });
});
