import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";
import { getState, isOnboardingComplete } from "../../lib/storage";
import { seedStorage } from "../../test/chrome-mock";
import {
  STORAGE_KEY_ONBOARDING_DRAFT,
  PRIVACY_POLICY_VERSION,
} from "../../lib/constants";

describe("Onboarding flow (PRD §5.1, restructured 3-step)", () => {
  it("starts on the welcome step with consent ungated", async () => {
    render(<App />);
    const getStarted = await screen.findByRole("button", {
      name: /get started/i,
    });
    // Cannot leave step 1 without consent (§5.1.4 AC, enforced earlier now).
    expect(getStarted).toBeDisabled();
  });

  it("gates on consent, then completes via Finish Setup", async () => {
    render(<App />);

    const getStarted = await screen.findByRole("button", {
      name: /get started/i,
    });
    expect(getStarted).toBeDisabled();
    expect(await isOnboardingComplete()).toBe(false);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(getStarted).toBeEnabled();

    fireEvent.click(getStarted); // → step 2: timezone
    fireEvent.click(screen.getByRole("button", { name: /continue/i })); // → step 3: hours

    fireEvent.click(screen.getByRole("button", { name: /finish setup/i }));

    expect(await screen.findByText(/all set/i)).toBeInTheDocument();
    const state = await getState();
    expect(state.user.onboardingCompletedAt).not.toBeNull();
    expect(state.consent?.privacyPolicyVersion).toBe(PRIVACY_POLICY_VERSION);
  });

  it("resumes mid-flow from a persisted draft (§5.1.4)", async () => {
    seedStorage({
      [STORAGE_KEY_ONBOARDING_DRAFT]: {
        stepIndex: 2,
        timezone: "Asia/Tokyo",
        timezoneSource: "manual",
        consentChecked: true,
      },
    });
    render(<App />);
    expect(await screen.findByText(/step 3 of 3/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /working hours/i }),
    ).toBeInTheDocument();
  });

  it("Back discards a step's tentative edits (commit-on-Continue, Session 11)", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("checkbox")); // consent
    fireEvent.click(screen.getByRole("button", { name: /get started/i })); // → step 2

    // Step 2 lands at the 5-pin cap (the pre-selected defaults).
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(5);
    // Clear them by mistake...
    fireEvent.click(screen.getByRole("button", { name: /remove all/i }));
    expect(screen.queryAllByRole("button", { name: /^Remove/ })).toHaveLength(
      0,
    );

    // Back must NOT keep the destructive edit...
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    // ...so re-entering the step shows the defaults restored.
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(5);
  });
});
