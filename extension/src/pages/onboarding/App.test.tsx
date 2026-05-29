// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";
import { getState, isOnboardingComplete } from "../../lib/storage";
import { seedStorage } from "../../test/chrome-mock";
import {
  STORAGE_KEY_ONBOARDING_DRAFT,
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
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

  // Regression guard (PRD §6.1, 2026-05-28): the consent gesture must link
  // BOTH legal documents. A future refactor must not silently drop one.
  it("links both the Privacy Policy and the Terms of Service from the consent line", async () => {
    render(<App />);
    await screen.findByRole("checkbox");

    const privacyLinks = screen.getAllByRole("link", {
      name: /privacy policy/i,
    });
    const tosLinks = screen.getAllByRole("link", { name: /terms of service/i });

    // Both appear as inline links inside the consent label.
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(tosLinks.length).toBeGreaterThanOrEqual(1);

    // Every legal link points at the right URL and opens safely in a new tab.
    for (const a of privacyLinks) {
      expect(a).toHaveAttribute("href", PRIVACY_POLICY_URL);
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
    for (const a of tosLinks) {
      expect(a).toHaveAttribute("href", TERMS_OF_SERVICE_URL);
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
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

  // Session 14 a11y (Gap A — PRD §6.3 live regions, §8.9):
  describe("a11y: step focus + aria-live announcement (Session 14)", () => {
    it("focuses the welcome heading on initial mount", async () => {
      render(<App />);
      const h1 = await screen.findByRole("heading", {
        name: /welcome to fashionably late/i,
      });
      // The h1 is programmatically focusable via tabIndex=-1, and the step
      // mount effect focuses it so screen readers announce the new step.
      expect(h1).toHaveAttribute("tabindex", "-1");
      expect(document.activeElement).toBe(h1);
    });

    it("moves focus to the new step heading on advance", async () => {
      render(<App />);
      fireEvent.click(await screen.findByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: /get started/i }));

      const tzH1 = await screen.findByRole("heading", {
        name: /set up your timezones/i,
      });
      expect(tzH1).toHaveAttribute("tabindex", "-1");
      expect(document.activeElement).toBe(tzH1);
    });

    it("renders a polite aria-live region that is silent on initial mount", async () => {
      render(<App />);
      // The region is in the DOM (role=status / aria-live=polite) for AT,
      // but its initial content is empty so it doesn't announce on load.
      await screen.findByRole("heading", { name: /welcome/i });
      const live = document.querySelector(
        '[role="status"][aria-live="polite"]',
      );
      expect(live).not.toBeNull();
      expect(live?.textContent?.trim()).toBe("");
    });

    it("announces the step on advance", async () => {
      render(<App />);
      fireEvent.click(await screen.findByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: /get started/i }));
      await screen.findByRole("heading", { name: /set up your timezones/i });

      const live = document.querySelector(
        '[role="status"][aria-live="polite"]',
      );
      expect(live?.textContent).toMatch(/Step 2 of 3:.*Set up your timezones/i);
    });

    it("announces the done state and focuses the done heading on completion", async () => {
      render(<App />);
      fireEvent.click(await screen.findByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: /get started/i }));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      fireEvent.click(screen.getByRole("button", { name: /finish setup/i }));

      const doneH1 = await screen.findByRole("heading", { name: /all set/i });
      expect(doneH1).toHaveAttribute("tabindex", "-1");
      expect(document.activeElement).toBe(doneH1);

      // The done-state announcement may settle a render after the heading
      // mounts (status-change effect schedules setAnnouncement → new render).
      await waitFor(() => {
        const live = document.querySelector(
          '[role="status"][aria-live="polite"]',
        );
        expect(live?.textContent).toMatch(/all set/i);
      });
    });
  });
});
