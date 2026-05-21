import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PrivacyDataSection } from "./PrivacyDataSection";

// PRD §5.8.2 Privacy & Data — structure-only for Session 12: buttons exist and
// show a "coming soon" treatment; Privacy/ToS links are inert placeholders.

describe("PrivacyDataSection (PRD §5.8.2, structure-only)", () => {
  it("renders Export and Delete buttons", () => {
    render(<PrivacyDataSection />);
    expect(
      screen.getByRole("button", { name: /export my data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete my data/i }),
    ).toBeInTheDocument();
  });

  it("Export shows a 'coming soon' notice (no real action yet)", () => {
    render(<PrivacyDataSection />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /export my data/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/coming soon/i);
  });

  it("Delete shows a 'coming soon' notice (no real action yet)", () => {
    render(<PrivacyDataSection />);
    fireEvent.click(screen.getByRole("button", { name: /delete my data/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/coming soon/i);
  });

  it("Privacy Policy + Terms links are inert placeholders, not real URLs", () => {
    render(<PrivacyDataSection />);
    const privacy = screen.getByRole("link", { name: /privacy policy/i });
    const terms = screen.getByRole("link", { name: /terms of service/i });
    for (const link of [privacy, terms]) {
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("title", "Available at launch");
      // Placeholder hash, never a real http(s) URL.
      expect(link.getAttribute("href") ?? "").not.toMatch(/^https?:/);
    }
  });
});
