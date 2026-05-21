import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AboutSection } from "./AboutSection";
import { GITHUB_REPO_URL } from "../../../lib/constants";

// PRD §5.8.2 About — version (from the live manifest), GitHub link, feedback.

describe("AboutSection (PRD §5.8.2)", () => {
  const origGetManifest = chrome.runtime.getManifest;
  afterEach(() => {
    chrome.runtime.getManifest = origGetManifest;
  });

  it("shows the version read from the manifest (dynamic, not hardcoded)", () => {
    // Prove it reads getManifest() rather than a baked-in string.
    chrome.runtime.getManifest = () =>
      ({ version: "4.2.0" }) as chrome.runtime.Manifest;
    render(<AboutSection />);
    expect(screen.getByText("4.2.0")).toBeInTheDocument();
  });

  it("falls back to '—' if the manifest is unavailable (§6.7)", () => {
    chrome.runtime.getManifest = (() => {
      throw new Error("no manifest");
    }) as typeof chrome.runtime.getManifest;
    render(<AboutSection />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("links to the GitHub repository", () => {
    render(<AboutSection />);
    const link = screen.getByRole("link", { name: /github\.com/i });
    expect(link).toHaveAttribute("href", GITHUB_REPO_URL);
  });

  it("feedback is a placeholder until a channel is decided", () => {
    render(<AboutSection />);
    const feedback = screen.getByRole("link", { name: /coming soon/i });
    expect(feedback).toHaveAttribute("aria-disabled", "true");
    expect(feedback.getAttribute("href") ?? "").not.toMatch(/^https?:/);
  });
});
