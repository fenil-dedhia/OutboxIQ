import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// PRD §5.5.1 coverage — the deterministic core of the highest-criticality
// module. We assert the §5.2.3 invariant hardest: an in-hours Send (and
// anything we can't confidently classify) is NEVER preventDefaulted, and
// every failure path falls toward sending. The verdict math itself is
// already covered by working-hours.test.ts and is mocked here so each guard
// branch can be exercised in isolation.
//
// jsdom proves the decision/scoping logic against a DOM the test builds; it
// CANNOT prove Gmail's real selectors or that Gmail finalises the send on
// the events we block — that is the hands-on probe
// (research/send-button-probe.md, gate cleared Session 6). Green ≠ verified.

import type { WorkingHoursVerdict } from "../../lib/schedule/working-hours";
import type { WallTime } from "../../lib/schedule/gmail-format";

// --- Mocks (only the seams; gmail-recipe DOM helpers stay REAL) -------------
const getCachedConfig = vi.fn();
vi.mock("./config-cache", () => ({
  getCachedConfig: () => getCachedConfig(),
}));

const checkWorkingHours = vi.fn();
vi.mock("../../lib/schedule/working-hours", () => ({
  checkWorkingHours: (...a: unknown[]) => checkWorkingHours(...a),
  // The guard mocks the verdict math (see header); ensureFutureSnap is part
  // of it — identity here keeps each guard branch isolated to guard logic.
  // Its forward-roll correctness is covered in working-hours.test.ts.
  ensureFutureSnap: (v: unknown) => v,
}));

const openRegularSendWarning = vi.fn();
vi.mock("./warning-mount", () => ({
  openRegularSendWarning: (...a: unknown[]) => openRegularSendWarning(...a),
}));

const scheduleAt = vi.fn();
const openNativeScheduleDialog = vi.fn();
vi.mock("../schedule-modal/schedule-actions", () => ({
  scheduleAt: (...a: unknown[]) => scheduleAt(...a),
  openNativeScheduleDialog: () => openNativeScheduleDialog(),
}));

const fireFull = vi.fn();
vi.mock("../../lib/schedule/gmail-recipe", async (orig) => {
  const actual = await orig<typeof import("../../lib/schedule/gmail-recipe")>();
  return { ...actual, fireFull: (...a: unknown[]) => fireFull(...a) };
});

import { installRegularSendGuard } from "./regular-send-guard";

// --- Fake Gmail send-group (chevron + its sibling Send button) --------------
function buildCompose(): { send: HTMLElement; group: HTMLElement } {
  const group = document.createElement("div"); // the "div.dC" send group
  const chevron = document.createElement("div");
  chevron.setAttribute("role", "button");
  chevron.setAttribute("aria-label", "More send options");
  const send = document.createElement("div");
  send.setAttribute("role", "button");
  send.setAttribute("aria-label", "Send ‪(Ctrl-Enter)‬");
  // Inner node like Gmail's real markup (clicks land on a child).
  const inner = document.createElement("span");
  inner.textContent = "Send";
  send.appendChild(inner);
  group.append(chevron, send);
  document.body.appendChild(group);
  return { send, group };
}

const SNAP: WallTime = {
  year: 2026,
  month: 5,
  day: 18,
  hour: 9,
  minute: 0,
};
const violation = (
  kind: "absolute" | "working-hours",
): WorkingHoursVerdict => ({
  ok: false,
  kind,
  detail: kind === "absolute" ? "before-earliest" : "before-start",
  requested: { year: 2026, month: 5, day: 16, hour: 3, minute: 33 },
  snap: SNAP,
});
const okVerdict: WorkingHoursVerdict = {
  ok: true,
  kind: null,
  detail: null,
  requested: { year: 2026, month: 5, day: 16, hour: 10, minute: 0 },
  snap: null,
};

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const fire = (el: Element, type: string, init: EventInit = {}): Event => {
  const ev =
    type === "keydown"
      ? new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
      : new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  return ev;
};

let teardown: (() => void) | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetAllMocks(); // reset impls too, so a mockImplementation can't leak
  getCachedConfig.mockReturnValue({
    timezone: "America/New_York",
    workingHours: {} as never,
  });
  openRegularSendWarning.mockReturnValue({ close: vi.fn() });
  scheduleAt.mockResolvedValue(undefined);
  openNativeScheduleDialog.mockResolvedValue(undefined);
  fireFull.mockResolvedValue(undefined);
});
afterEach(() => {
  teardown?.();
  teardown = null;
});

describe("§5.5.1 — never block an in-hours / unclassifiable Send (§5.2.3)", () => {
  it("in-hours verdict → does NOT preventDefault the gesture", () => {
    checkWorkingHours.mockReturnValue(okVerdict);
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    const inner = send.querySelector("span") as HTMLElement;
    const evs = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    for (const t of evs) expect(fire(inner, t).defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });

  it("no cached config → fail-open (native Send proceeds)", () => {
    getCachedConfig.mockReturnValue(null);
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    expect(fire(send, "pointerdown").defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });

  it("≥2 composes → safety net: does NOT intercept", () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const a = buildCompose();
    buildCompose(); // 2nd chevron → ambiguous
    teardown = installRegularSendGuard();
    expect(fire(a.send, "pointerdown").defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });

  it("calc throws → fail-toward-send (no block)", () => {
    checkWorkingHours.mockImplementation(() => {
      throw new Error("boom");
    });
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    expect(fire(send, "click").defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });

  it("never acts on unrelated clicks", () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    buildCompose();
    const other = document.createElement("button");
    document.body.appendChild(other);
    teardown = installRegularSendGuard();
    expect(fire(other, "click").defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });

  it("teardown removes the listeners", () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const { send } = buildCompose();
    const down = installRegularSendGuard();
    down();
    teardown = null;
    expect(fire(send, "pointerdown").defaultPrevented).toBe(false);
    expect(openRegularSendWarning).not.toHaveBeenCalled();
  });
});

describe("§5.5.1 — violation blocks the WHOLE gesture, warns once (FULL verdict)", () => {
  it.each(["absolute", "working-hours"] as const)(
    "%s violation → blocks every gesture event + opens the warning once",
    (kind) => {
      checkWorkingHours.mockReturnValue(violation(kind));
      const { send } = buildCompose();
      teardown = installRegularSendGuard();
      const inner = send.querySelector("span") as HTMLElement;
      for (const t of [
        "pointerdown",
        "mousedown",
        "pointerup",
        "mouseup",
        "click",
      ]) {
        expect(fire(inner, t).defaultPrevented).toBe(true);
      }
      // FULL verdict: working-hours ALSO warns here (contrast §5.3
      // absolute-only) — and the modal opens exactly once for the gesture.
      expect(openRegularSendWarning).toHaveBeenCalledTimes(1);
    },
  );

  it("⌘/Ctrl+Enter keydown is intercepted (keyboard path)", () => {
    checkWorkingHours.mockReturnValue(violation("working-hours"));
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    const ev = fire(send, "keydown", {
      key: "Enter",
      ctrlKey: true,
    } as KeyboardEventInit);
    expect(ev.defaultPrevented).toBe(true);
    expect(openRegularSendWarning).toHaveBeenCalledTimes(1);
  });

  it("while the modal is open, further Send attempts stay blocked but don't re-open it", () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    fire(send, "pointerdown");
    expect(openRegularSendWarning).toHaveBeenCalledTimes(1);
    expect(fire(send, "click").defaultPrevented).toBe(true);
    expect(openRegularSendWarning).toHaveBeenCalledTimes(1); // not re-opened
  });

  it("passes context-appropriate verdict + a snap to the warning", () => {
    checkWorkingHours.mockReturnValue(violation("working-hours"));
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    fire(send, "pointerdown");
    const args = openRegularSendWarning.mock.calls[0]?.[0] as {
      verdict: WorkingHoursVerdict;
      tzAbbr: string;
    };
    expect(args.verdict.kind).toBe("working-hours");
    expect(args.verdict.snap).toEqual(SNAP);
    expect(typeof args.tzAbbr).toBe("string");
  });
});

describe("§5.5.1 — the three choices", () => {
  type Args = {
    onSnap: () => void;
    onProceed: () => void;
    onCancel: () => void;
    onRenderError: () => void;
  };
  const openAndGetArgs = (): Args => {
    const { send } = buildCompose();
    teardown = installRegularSendGuard({ onScheduled: vi.fn() });
    fire(send, "pointerdown");
    return openRegularSendWarning.mock.calls[0]?.[0] as Args;
  };

  it("Send now anyway → replays the native Send via fireFull", async () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const onScheduled = vi.fn();
    const { send } = buildCompose();
    teardown = installRegularSendGuard({ onScheduled });
    fire(send, "pointerdown");
    const args = openRegularSendWarning.mock.calls[0]?.[0] as Args;
    args.onProceed();
    await tick();
    expect(fireFull).toHaveBeenCalledTimes(1);
    expect(scheduleAt).not.toHaveBeenCalled();
    expect(onScheduled).not.toHaveBeenCalled();
  });

  it("Reschedule → schedules the snap time and persists it", async () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const onScheduled = vi.fn();
    const { send } = buildCompose();
    teardown = installRegularSendGuard({ onScheduled });
    fire(send, "pointerdown");
    const args = openRegularSendWarning.mock.calls[0]?.[0] as Args;
    args.onSnap();
    await tick();
    // formatForGmail(SNAP) → Mon May 18, 9:00 AM (real, not mocked).
    expect(scheduleAt).toHaveBeenCalledWith({
      gmailDate: "May 18, 2026",
      gmailTime: "9:00 AM",
    });
    expect(onScheduled).toHaveBeenCalledTimes(1);
    expect(fireFull).not.toHaveBeenCalled();
  });

  it("Reschedule failing → opens Gmail's native scheduler, never sends now", async () => {
    checkWorkingHours.mockReturnValue(violation("working-hours"));
    scheduleAt.mockRejectedValue(new Error("recipe broke"));
    const a = openAndGetArgs();
    a.onSnap();
    await tick();
    await tick();
    expect(openNativeScheduleDialog).toHaveBeenCalledTimes(1);
    expect(fireFull).not.toHaveBeenCalled(); // must NOT fail toward sending
  });

  it("Cancel → nothing sent or scheduled; a later violation re-opens", async () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    fire(send, "pointerdown");
    (openRegularSendWarning.mock.calls[0]?.[0] as Args).onCancel();
    await tick();
    expect(fireFull).not.toHaveBeenCalled();
    expect(scheduleAt).not.toHaveBeenCalled();
    // latch reset → the next violating gesture opens the warning again.
    fire(send, "pointerdown");
    expect(openRegularSendWarning).toHaveBeenCalledTimes(2);
  });
});

describe("§5.5.1 — modal failure falls toward sending (§5.2.3)", () => {
  it("synchronous mount throw → replays the native Send", async () => {
    checkWorkingHours.mockReturnValue(violation("absolute"));
    openRegularSendWarning.mockImplementation(() => {
      throw new Error("mount failed");
    });
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    expect(() => fire(send, "pointerdown")).not.toThrow();
    await tick();
    expect(fireFull).toHaveBeenCalledTimes(1);
  });

  it("render-time throw (onRenderError) → replays the native Send", async () => {
    checkWorkingHours.mockReturnValue(violation("working-hours"));
    let captured: { onRenderError: () => void } | null = null;
    openRegularSendWarning.mockImplementation((a: unknown) => {
      captured = a as { onRenderError: () => void };
      return { close: vi.fn() };
    });
    const { send } = buildCompose();
    teardown = installRegularSendGuard();
    fire(send, "pointerdown");
    captured!.onRenderError();
    await tick();
    expect(fireFull).toHaveBeenCalledTimes(1);
  });
});
