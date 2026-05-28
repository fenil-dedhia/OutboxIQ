// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AboutSection } from "./AboutSection";
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  GITHUB_REPO_URL,
  SUPPORT_EMAIL,
} from "../../../lib/constants";

// PRD §5.8.2 About — version (from the live manifest), author credit, GitHub
// link, feedback (the founder's email).

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

  it("credits the author with a link to their profile", () => {
    render(<AboutSection />);
    const link = screen.getByRole("link", { name: AUTHOR_NAME });
    expect(link).toHaveAttribute("href", AUTHOR_URL);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("feedback is a mailto link to the support email", () => {
    render(<AboutSection />);
    const feedback = screen.getByRole("link", { name: SUPPORT_EMAIL });
    expect(feedback.getAttribute("href") ?? "").toContain(
      `mailto:${SUPPORT_EMAIL}`,
    );
  });
});
