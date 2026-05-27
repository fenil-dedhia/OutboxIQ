import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assembleDataExport,
  buildDataExport,
  serializeDataExport,
  exportFilename,
  downloadJsonFile,
  EXPORT_APPLICATION_NAME,
  type FashionablyLateDataExport,
} from "./data-management";
import { createDefaultState, type OutboxIQState } from "./storage";
import { seedStorage } from "../test/chrome-mock";
import {
  STORAGE_KEY_STATE,
  STORAGE_KEY_ONBOARDING_DRAFT,
} from "./constants";

// PRD §6.1.1 "right to access" — local-only JSON export (§6.1.2 / §11 / Entry
// 39: nothing transmitted). resetChromeStore runs in the global beforeEach.

const NOW = new Date("2026-05-27T09:15:00.000Z");

function stateOf(overrides: Partial<OutboxIQState> = {}): OutboxIQState {
  return { ...createDefaultState(), ...overrides };
}

describe("assembleDataExport (PRD §6.1.1 export payload)", () => {
  it("embeds the WHOLE state object — a future field appears with no code change (anti-omission)", () => {
    // The export must never enumerate state fields, so a field a later session
    // adds to OutboxIQState is exported automatically. Simulate that here.
    const augmented = {
      ...createDefaultState(),
      someFutureField: "future-value",
    } as unknown as OutboxIQState;

    const file = assembleDataExport(augmented, null, NOW);
    const stateOut = file.data[STORAGE_KEY_STATE] as Record<string, unknown>;
    expect(stateOut.someFutureField).toBe("future-value");
  });

  it("includes the schemaVersion (top level and inside the state)", () => {
    const state = stateOf();
    const file = assembleDataExport(state, null, NOW);
    expect(file.schemaVersion).toBe(state.schemaVersion);
    expect(
      (file.data[STORAGE_KEY_STATE] as OutboxIQState).schemaVersion,
    ).toBe(state.schemaVersion);
  });

  it("is self-describing (application name + export timestamp)", () => {
    const file = assembleDataExport(stateOf(), null, NOW);
    expect(file.application).toBe(EXPORT_APPLICATION_NAME);
    expect(file.exportedAt).toBe(NOW.toISOString());
  });

  it("includes the onboarding draft only when one is present", () => {
    const without = assembleDataExport(stateOf(), null, NOW);
    expect(without.data).not.toHaveProperty(STORAGE_KEY_ONBOARDING_DRAFT);

    const draft = {
      stepIndex: 1,
      timezone: "Europe/Berlin",
      timezoneSource: "manual" as const,
      workingHours: createDefaultState().workingHours,
      consentChecked: false,
      pinnedTimezones: [],
    };
    const withDraft = assembleDataExport(stateOf(), draft, NOW);
    expect(withDraft.data[STORAGE_KEY_ONBOARDING_DRAFT]).toEqual(draft);
  });
});

describe("buildDataExport (reads chrome.storage.local)", () => {
  it("exports the user's real persisted state", async () => {
    seedStorage({
      [STORAGE_KEY_STATE]: stateOf({
        user: {
          email: "",
          timezone: "Asia/Kolkata",
          timezoneSource: "manual",
          onboardingCompletedAt: "2026-05-01T00:00:00.000Z",
        },
        pinnedTimezones: ["America/New_York"],
      }),
    });

    const file = await buildDataExport(NOW);
    const state = file.data[STORAGE_KEY_STATE] as OutboxIQState;
    expect(state.user.timezone).toBe("Asia/Kolkata");
    expect(state.pinnedTimezones).toEqual(["America/New_York"]);
  });

  it("omits the draft key when no onboarding draft is stored", async () => {
    seedStorage({ [STORAGE_KEY_STATE]: stateOf() });
    const file = await buildDataExport(NOW);
    expect(file.data).not.toHaveProperty(STORAGE_KEY_ONBOARDING_DRAFT);
  });

  it("includes the draft when an in-progress onboarding exists", async () => {
    const draft = {
      stepIndex: 2,
      timezone: "Europe/London",
      timezoneSource: "manual" as const,
      workingHours: createDefaultState().workingHours,
      consentChecked: true,
      pinnedTimezones: ["Europe/London"],
    };
    seedStorage({ [STORAGE_KEY_ONBOARDING_DRAFT]: draft });
    const file = await buildDataExport(NOW);
    expect(file.data[STORAGE_KEY_ONBOARDING_DRAFT]).toEqual(draft);
  });

  it("does not transmit anything (no network call)", async () => {
    const original = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      seedStorage({ [STORAGE_KEY_STATE]: stateOf() });
      await buildDataExport(NOW);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("serializeDataExport", () => {
  it("is pretty-printed and round-trips back to the same object", () => {
    const file = assembleDataExport(stateOf(), null, NOW);
    const json = serializeDataExport(file);
    expect(json).toContain("\n"); // multi-line / human-readable
    expect(json).toContain('  "application"'); // 2-space indent
    expect(JSON.parse(json)).toEqual(file as unknown as FashionablyLateDataExport);
  });
});

describe("exportFilename", () => {
  it("is self-describing and date-stamped (local date)", () => {
    // Construct from local components so the assertion is timezone-independent.
    const d = new Date(2026, 4, 7, 23, 59); // 2026-05-07 local
    expect(exportFilename(d)).toBe("fashionably-late-data-export-2026-05-07.json");
  });
});

describe("downloadJsonFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads via a Blob + object URL + synthesized anchor click, then revokes", () => {
    let passedBlob: unknown = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      passedBlob = blob;
      return "blob:mock-url";
    });
    const revokeObjectURL = vi.fn();
    // jsdom doesn't implement these; install spies.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL =
      createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
      revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    // Capture the anchor when it is added to the DOM (spyOn calls through).
    const appendSpy = vi.spyOn(document.body, "appendChild");

    downloadJsonFile("fashionably-late-data-export-2026-05-27.json", "{}");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(passedBlob).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    // The clicked anchor carried the filename + the object URL.
    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement | undefined;
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    expect(anchor!.download).toBe(
      "fashionably-late-data-export-2026-05-27.json",
    );
    expect(anchor!.getAttribute("href")).toBe("blob:mock-url");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    // Anchor is cleaned up (not left in the document).
    expect(document.querySelector("a")).toBeNull();
  });

  it("does not transmit anything (no network call)", () => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
      () => "blob:x",
    );
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const original = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      downloadJsonFile("x.json", "{}");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});
