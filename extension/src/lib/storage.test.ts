import { describe, it, expect } from "vitest";
import {
  completeOnboarding,
  createDefaultDraft,
  createDefaultState,
  getOnboardingDraft,
  getState,
  isOnboardingComplete,
  saveOnboardingDraft,
} from "./storage";
import { PRIVACY_POLICY_VERSION } from "./constants";

describe("storage defaults (PRD §7.2)", () => {
  it("defaults to Mon–Fri 09:00–17:00 with 07:00/19:00 absolute bounds", () => {
    const s = createDefaultState();
    expect(s.workingHours.monday).toEqual({
      enabled: true,
      start: "09:00",
      end: "17:00",
    });
    expect(s.workingHours.saturday.enabled).toBe(false);
    expect(s.workingHours.absoluteEarliest).toBe("07:00");
    expect(s.workingHours.absoluteLatest).toBe("19:00");
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
