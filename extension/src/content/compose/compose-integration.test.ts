// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  installComposeIntegration,
  desiredScheduleLabel,
} from "./compose-integration";
import { SCHEDULE_SEND_LABEL } from "../../lib/constants";

// PRD §5.2 coverage. These exercise the deterministic core — relabel, the
// capture-phase interception, scoping (never act on unrelated clicks), and
// the §5.2.3 "our failure must not break Gmail" guarantee. Whether Gmail
// itself responds to the recipe is integration-level and lives in the
// hands-on probe (research/pick-date-time-probe.md), not here.

function makeScheduleMenuItem(label = "Schedule send"): HTMLElement {
  const item = document.createElement("div");
  item.setAttribute("role", "menuitem");
  item.setAttribute("selector", "scheduledSend");
  // Nested like Gmail's real markup: the visible text sits on an inner leaf.
  const wrap = document.createElement("div");
  const leaf = document.createElement("div");
  leaf.textContent = label;
  wrap.appendChild(leaf);
  item.appendChild(wrap);
  return item;
}

function makeChevron(): HTMLElement {
  const c = document.createElement("div");
  c.setAttribute("role", "button");
  c.setAttribute("aria-label", "More send options");
  return c;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0)); // flush MutationObserver + guards

let teardown: (() => void) | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  teardown?.();
  teardown = null;
  vi.restoreAllMocks();
});

describe("§5.2.1 relabel", () => {
  it("relabels a menuitem already present at install", () => {
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL);
  });

  it("relabels a menuitem injected after install (MutationObserver)", async () => {
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    await tick();
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL);
  });

  it("is idempotent — does not stack the label on re-processing", async () => {
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    await tick();
    // A second mutation touching the subtree must not re-append.
    item.appendChild(document.createElement("span"));
    await tick();
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL);
  });

  it("multi-compose: leaves Gmail's native text (no Fashionably Late relabel)", () => {
    document.body.appendChild(makeChevron());
    document.body.appendChild(makeChevron()); // 2 composes
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    expect(item.textContent).toBe("Schedule send"); // untouched
    expect(item.textContent).not.toBe(SCHEDULE_SEND_LABEL);
  });

  // Smoke Bug 1 (Session 5.5): a label set while single must REVERT to
  // native when a second compose opens — not freeze (the old one-way latch
  // + skip-without-revert is what froze it).
  it("reverts to native when a 2nd compose opens (reactive — Bug 1)", async () => {
    document.body.appendChild(makeChevron()); // 1 compose
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL); // single → Fashionably Late

    document.body.appendChild(makeChevron()); // compose B opens → 2
    await tick();
    expect(item.textContent).toBe("Schedule send"); // SAME item reverted
  });

  // Smoke Bug 2 (Session 5.5): when the count drops back to 1 the surviving
  // compose's label must revert to Fashionably Late — locale-safely (the captured
  // original, not a hardcoded string).
  it("restores Fashionably Late when compose count drops to 1 (reactive — Bug 2)", async () => {
    document.body.appendChild(makeChevron());
    const c2 = makeChevron();
    document.body.appendChild(c2); // 2 composes
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    expect(item.textContent).toBe("Schedule send"); // multi → native

    c2.remove(); // compose B closes → 1
    await tick();
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL); // SAME item restored
  });

  it("a non-count mutation does not flip the label (anti-flicker)", async () => {
    document.body.appendChild(makeChevron());
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL);

    // Unrelated DOM churn (no chevron added/removed) must not re-label.
    document.body.appendChild(document.createElement("div"));
    await tick();
    expect(item.textContent).toBe(SCHEDULE_SEND_LABEL); // unchanged
  });

  it("skips silently when the item has no text leaf (cosmetic, never throws)", () => {
    const bare = document.createElement("div");
    bare.setAttribute("role", "menuitem");
    bare.setAttribute("selector", "scheduledSend");
    document.body.appendChild(bare);
    expect(() => {
      teardown = installComposeIntegration({ onScheduleSend: vi.fn() });
    }).not.toThrow();
  });
});

describe("§5.2.2 interception", () => {
  it("intercepts activation of the scheduledSend item and opens Fashionably Late", () => {
    let received: HTMLElement | null = null;
    const onScheduleSend = vi.fn((ctx: { menuItem: HTMLElement }) => {
      received = ctx.menuItem;
    });
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend });

    const inner = item.querySelector("div div") as HTMLElement;
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    inner.dispatchEvent(ev);

    expect(onScheduleSend).toHaveBeenCalledTimes(1);
    expect(received).toBe(item);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("never acts on unrelated clicks (PRD §5.2.3 — don't touch Gmail)", () => {
    const onScheduleSend = vi.fn();
    document.body.appendChild(makeScheduleMenuItem());
    teardown = installComposeIntegration({ onScheduleSend });

    const other = document.createElement("button");
    document.body.appendChild(other);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    other.dispatchEvent(ev);

    expect(onScheduleSend).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it("coalesces mousedown+click of one gesture into a single open", () => {
    const onScheduleSend = vi.fn();
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend });

    const inner = item.querySelector("div div") as HTMLElement;
    inner.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    inner.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onScheduleSend).toHaveBeenCalledTimes(1);
  });

  it("a thrown modal error does not escape (§5.2.3 native fallback path)", async () => {
    const onScheduleSend = vi.fn(() => {
      throw new Error("modal mount failed");
    });
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend });

    const inner = item.querySelector("div div") as HTMLElement;
    expect(() =>
      inner.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    ).not.toThrow();
    expect(onScheduleSend).toHaveBeenCalledTimes(1);
    // The catch fires the async native-replay fallback, which briefly sets
    // the module suppression flag; wait for it to settle so the suite stays
    // order-independent (the replay window is ~120ms in real Gmail).
    await new Promise((r) => setTimeout(r, 200));
  });

  it("multi-compose: hands off to native instead of opening Fashionably Late (Session 5 safety net)", async () => {
    const onScheduleSend = vi.fn();
    // Two composes → two chevrons → ambiguous; must NOT open our modal.
    document.body.appendChild(makeChevron());
    document.body.appendChild(makeChevron());
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend });

    const inner = item.querySelector("div div") as HTMLElement;
    expect(() =>
      inner.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    ).not.toThrow();
    expect(onScheduleSend).not.toHaveBeenCalled();
    // The native replay is async + briefly toggles the suppression flag;
    // settle it so the suite stays order-independent (cf. the §5.2.3 test).
    await new Promise((r) => setTimeout(r, 200));
  });

  it("single compose still opens Fashionably Late (safety net does not over-fire)", () => {
    const onScheduleSend = vi.fn();
    document.body.appendChild(makeChevron()); // exactly one compose
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    teardown = installComposeIntegration({ onScheduleSend });

    const inner = item.querySelector("div div") as HTMLElement;
    inner.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onScheduleSend).toHaveBeenCalledTimes(1);
  });

  it("teardown removes the interceptor", () => {
    const onScheduleSend = vi.fn();
    const item = makeScheduleMenuItem();
    document.body.appendChild(item);
    const down = installComposeIntegration({ onScheduleSend });
    down();
    teardown = null;

    const inner = item.querySelector("div div") as HTMLElement;
    inner.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onScheduleSend).not.toHaveBeenCalled();
  });
});

describe("desiredScheduleLabel (pure decision)", () => {
  it("single compose → the Fashionably Late brand label", () => {
    expect(desiredScheduleLabel(false, "Schedule send")).toBe(
      SCHEDULE_SEND_LABEL,
    );
  });
  it("multi compose → Gmail's own original (locale-safe, passed in)", () => {
    expect(desiredScheduleLabel(true, "Programmer une réponse")).toBe(
      "Programmer une réponse",
    );
  });
});
