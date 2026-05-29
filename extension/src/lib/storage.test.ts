// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  completeOnboarding,
  createDefaultDraft,
  createDefaultState,
  getOnboardingDraft,
  getState,
  isOnboardingComplete,
  saveOnboardingDraft,
  setLastScheduled,
  WEEKDAYS,
} from "./storage";
import {
  PRIVACY_POLICY_VERSION,
  SCHEMA_VERSION,
  DEFAULT_PINNED_TIMEZONES,
  MAX_PINNED_TIMEZONES,
} from "./constants";

describe("storage defaults (PRD §7.2)", () => {
  it("defaults to Mon–Fri 09:00–17:00 (no global boundaries since v4)", () => {
    const s = createDefaultState();
    expect(s.workingHours.monday).toEqual({
      enabled: true,
      start: "09:00",
      end: "17:00",
    });
    expect(s.workingHours.saturday.enabled).toBe(false);
    // Default boundaries removed in v4 — the field must not exist.
    expect(
      (s.workingHours as Record<string, unknown>).absoluteEarliest,
    ).toBeUndefined();
    expect(
      (s.workingHours as Record<string, unknown>).absoluteLatest,
    ).toBeUndefined();
    expect(s.featureToggles.unscheduleOnReply).toBe(true);
    expect(s.featureToggles.alwaysScheduleOutsideHours).toBe(false);
  });

  it("reports onboarding incomplete before completion", async () => {
    expect(await isOnboardingComplete()).toBe(false);
  });
});

describe("completeOnboarding (PRD §5.1.4)", () => {
  it("records consent + timestamp, marks complete, clears the draft", async () => {
    const draft = {
      ...createDefaultDraft(),
      stepIndex: 4,
      timezone: "Europe/Amsterdam",
      timezoneSource: "manual" as const,
      consentChecked: true,
    };
    await saveOnboardingDraft(draft);

    await completeOnboarding(draft, PRIVACY_POLICY_VERSION);

    const state = await getState();
    expect(state.user.timezone).toBe("Europe/Amsterdam");
    expect(state.user.timezoneSource).toBe("manual");
    expect(state.user.onboardingCompletedAt).not.toBeNull();
    expect(state.consent?.privacyPolicyVersion).toBe(PRIVACY_POLICY_VERSION);
    expect(state.consent?.consentedAt).toEqual(
      state.user.onboardingCompletedAt,
    );
    expect(await isOnboardingComplete()).toBe(true);

    // Draft is cleared so a finished flow can't be "resumed".
    const clearedDraft = await getOnboardingDraft();
    expect(clearedDraft.stepIndex).toBe(0);
  });

  it("rejects invalid working hours (defense in depth, commits nothing)", async () => {
    const base = createDefaultDraft();
    const draft = {
      ...base,
      consentChecked: true,
      workingHours: {
        ...base.workingHours,
        // An enabled day whose end is before its start → invalid.
        monday: { enabled: true, start: "17:00", end: "09:00" },
      },
    };
    await expect(
      completeOnboarding(draft, PRIVACY_POLICY_VERSION),
    ).rejects.toThrow(/working hours are invalid/i);
    expect(await isOnboardingComplete()).toBe(false);
  });

  it("accepts zero enabled working days (a no-window config is valid)", async () => {
    const base = createDefaultDraft();
    const workingHours = { ...base.workingHours };
    for (const d of WEEKDAYS) {
      workingHours[d] = { ...workingHours[d], enabled: false };
    }
    await completeOnboarding(
      { ...base, consentChecked: true, workingHours },
      PRIVACY_POLICY_VERSION,
    );
    expect(await isOnboardingComplete()).toBe(true);
  });
});

describe("lastScheduled (PRD §5.3.3 amendment) + schema version", () => {
  it("defaults to null and stamps the current schema version (v4)", () => {
    const s = createDefaultState();
    expect(s.lastScheduled).toBeNull();
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(4);
  });

  it("setLastScheduled persists and is read back by getState", async () => {
    expect((await getState()).lastScheduled).toBeNull();
    await setLastScheduled({
      display: "Thu, May 21, 1:25 PM",
      gmailDate: "May 21, 2026",
      gmailTime: "1:25 PM",
    });
    expect((await getState()).lastScheduled).toEqual({
      display: "Thu, May 21, 1:25 PM",
      gmailDate: "May 21, 2026",
      gmailTime: "1:25 PM",
    });
  });

  it("an older v1 record (no lastScheduled key) migrates to null", async () => {
    // Simulate a pre-v2 stored record lacking the field.
    await chrome.storage.local.set({
      outboxiqState: { schemaVersion: 1, user: { timezone: "UTC" } },
    });
    const s = await getState();
    expect(s.lastScheduled).toBeNull(); // default-merge IS the migration
  });
});

describe("onboarding draft persistence (resume-mid-flow)", () => {
  it("round-trips a partial draft", async () => {
    await saveOnboardingDraft({
      ...createDefaultDraft(),
      stepIndex: 2,
      timezone: "Asia/Tokyo",
    });
    const loaded = await getOnboardingDraft();
    expect(loaded.stepIndex).toBe(2);
    expect(loaded.timezone).toBe("Asia/Tokyo");
  });
});

describe("pinnedTimezones (PRD §5.1.3 Step 2, schema v3)", () => {
  it("state default is empty — existing users are not silently pinned", () => {
    expect(createDefaultState().pinnedTimezones).toEqual([]);
  });

  it("onboarding draft pre-selects the default pins (the common picks)", () => {
    expect(createDefaultDraft().pinnedTimezones).toEqual([
      ...DEFAULT_PINNED_TIMEZONES,
    ]);
    expect(DEFAULT_PINNED_TIMEZONES.length).toBe(MAX_PINNED_TIMEZONES);
  });

  it("completeOnboarding commits the draft's pins into state", async () => {
    await completeOnboarding(
      {
        ...createDefaultDraft(),
        pinnedTimezones: ["Asia/Tokyo", "Europe/Berlin"],
      },
      PRIVACY_POLICY_VERSION,
    );
    expect((await getState()).pinnedTimezones).toEqual([
      "Asia/Tokyo",
      "Europe/Berlin",
    ]);
  });

  it("the Skip path (empty draft pins) commits an empty array", async () => {
    await completeOnboarding(
      { ...createDefaultDraft(), pinnedTimezones: [] },
      PRIVACY_POLICY_VERSION,
    );
    expect((await getState()).pinnedTimezones).toEqual([]);
  });

  it("an older v2 record (no pinnedTimezones key) migrates to empty array", async () => {
    await chrome.storage.local.set({
      outboxiqState: { schemaVersion: 2, user: { timezone: "UTC" } },
    });
    expect((await getState()).pinnedTimezones).toEqual([]);
  });
});

describe("v3→v4 migration: Default boundaries removed (Session 17)", () => {
  it("drops absoluteEarliest/absoluteLatest from a v3 record, keeps everything else, and writes back v4", async () => {
    // A v3 record with the old boundary keys populated + real user data.
    await chrome.storage.local.set({
      outboxiqState: {
        schemaVersion: 3,
        user: { timezone: "Asia/Tokyo", onboardingCompletedAt: "2026-05-01" },
        workingHours: {
          monday: { enabled: true, start: "08:00", end: "16:00" },
          tuesday: { enabled: true, start: "09:00", end: "17:00" },
          wednesday: { enabled: true, start: "09:00", end: "17:00" },
          thursday: { enabled: true, start: "09:00", end: "17:00" },
          friday: { enabled: true, start: "09:00", end: "17:00" },
          saturday: { enabled: false, start: "09:00", end: "17:00" },
          sunday: { enabled: false, start: "09:00", end: "17:00" },
          absoluteEarliest: "06:00",
          absoluteLatest: "22:00",
        },
        pinnedTimezones: ["Asia/Tokyo"],
      },
    });

    const s = await getState();

    // Boundary keys gone; everything else intact.
    const wh = s.workingHours as Record<string, unknown>;
    expect(wh.absoluteEarliest).toBeUndefined();
    expect(wh.absoluteLatest).toBeUndefined();
    expect(s.workingHours.monday).toEqual({
      enabled: true,
      start: "08:00",
      end: "16:00",
    });
    expect(s.user.timezone).toBe("Asia/Tokyo");
    expect(s.pinnedTimezones).toEqual(["Asia/Tokyo"]);
    expect(s.schemaVersion).toBe(4);

    // Written back to storage as a clean v4 record (no boundary keys persisted).
    const raw = (await chrome.storage.local.get("outboxiqState"))
      .outboxiqState as { schemaVersion: number; workingHours: object };
    expect(raw.schemaVersion).toBe(4);
    expect(
      (raw.workingHours as Record<string, unknown>).absoluteEarliest,
    ).toBeUndefined();
  });
});
