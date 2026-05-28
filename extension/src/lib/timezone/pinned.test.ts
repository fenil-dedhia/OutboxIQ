// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { movePinned, reorderPinned, resolvePinnedEntries } from "./pinned";

// PRD §5.1.3 Step 2 / §5.8.2 — pinned-timezone ordering helpers (Session 12).

describe("movePinned (pure reorder)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves an item one slot toward the start", () => {
    expect(movePinned(ids, 2, -1)).toEqual(["a", "c", "b", "d"]);
  });

  it("moves an item one slot toward the end", () => {
    expect(movePinned(ids, 1, 1)).toEqual(["a", "c", "b", "d"]);
  });

  it("is a no-op at the start boundary (up)", () => {
    expect(movePinned(ids, 0, -1)).toEqual(ids);
  });

  it("is a no-op at the end boundary (down)", () => {
    expect(movePinned(ids, 3, 1)).toEqual(ids);
  });

  it("returns a NEW array (does not mutate the input)", () => {
    const input = [...ids];
    const out = movePinned(input, 1, 1);
    expect(out).not.toBe(input);
    expect(input).toEqual(ids); // unchanged
  });

  it("is a no-op for an out-of-range index", () => {
    expect(movePinned(ids, 9, -1)).toEqual(ids);
  });
});

describe("reorderPinned (pure drag move)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves an item forward to an arbitrary index", () => {
    expect(reorderPinned(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item backward to an arbitrary index", () => {
    expect(reorderPinned(ids, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("is a no-op when from === to", () => {
    expect(reorderPinned(ids, 2, 2)).toEqual(ids);
  });

  it("is a no-op for out-of-range indices", () => {
    expect(reorderPinned(ids, -1, 2)).toEqual(ids);
    expect(reorderPinned(ids, 1, 9)).toEqual(ids);
  });

  it("returns a NEW array (does not mutate the input)", () => {
    const input = [...ids];
    const out = reorderPinned(input, 0, 3);
    expect(out).not.toBe(input);
    expect(input).toEqual(ids);
  });
});

describe("resolvePinnedEntries (preserves array order — Session 12)", () => {
  it("returns curated entries in the SAME order as the input ids", () => {
    // Deliberately NOT offset-sorted: Kolkata (+5:30) before LA (-8) before
    // Berlin (+1). The result must mirror this user-chosen order.
    const out = resolvePinnedEntries([
      "Asia/Kolkata",
      "America/Los_Angeles",
      "Europe/Berlin",
    ]);
    expect(out.map((e) => e.ianaIdentifier)).toEqual([
      "Asia/Kolkata",
      "America/Los_Angeles",
      "Europe/Berlin",
    ]);
  });

  it("dedupes by curated group while keeping first-seen order", () => {
    const out = resolvePinnedEntries([
      "America/Los_Angeles",
      "Asia/Kolkata",
      "Asia/Calcutta", // legacy alias of the India group → duplicate
    ]);
    expect(out.map((e) => e.ianaIdentifier)).toEqual([
      "America/Los_Angeles",
      "Asia/Kolkata",
    ]);
  });

  it("drops unresolvable ids (§6.7) without reordering the rest", () => {
    const out = resolvePinnedEntries([
      "America/Los_Angeles",
      "Not/AZone",
      "Asia/Kolkata",
    ]);
    expect(out.map((e) => e.ianaIdentifier)).toEqual([
      "America/Los_Angeles",
      "Asia/Kolkata",
    ]);
  });
});
