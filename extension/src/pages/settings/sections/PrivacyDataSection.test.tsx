import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrivacyDataSection } from "./PrivacyDataSection";
import { downloadJsonFile } from "../../../lib/data-management";

// PRD §5.8.2 Privacy & Data. Phase 1 (Session 13): Export My Data is wired to a
// real local JSON download (§6.1.1 right to access). Delete My Data is still
// "coming soon" until Phase 2. Privacy/ToS links remain inert placeholders.

// Mock only the DOM download trigger; the rest of the export pipeline
// (buildDataExport → serializeDataExport) runs for real over the chrome mock.
vi.mock("../../../lib/data-management", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../lib/data-management")>();
  return { ...actual, downloadJsonFile: vi.fn() };
});

describe("PrivacyDataSection (PRD §5.8.2)", () => {
  it("renders Export and Delete buttons", () => {
    render(<PrivacyDataSection />);
    expect(
      screen.getByRole("button", { name: /export my data/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete my data/i }),
    ).toBeInTheDocument();
  });

  it("Export downloads a local JSON file and confirms (no network)", async () => {
    render(<PrivacyDataSection />);
    fireEvent.click(screen.getByRole("button", { name: /export my data/i }));

    // Success notice is shown once the async export resolves.
    await screen.findByText(/downloaded as a json file/i);

    expect(vi.mocked(downloadJsonFile)).toHaveBeenCalledTimes(1);
    const call = vi.mocked(downloadJsonFile).mock.calls[0];
    expect(call).toBeDefined();
    const [filename, contents] = call!;
    expect(filename).toMatch(
      /^fashionably-late-data-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
    // The exported payload carries the schema version (re-importable later).
    expect(contents).toContain('"schemaVersion"');
  });

  it("Delete still shows a 'coming soon' notice (wired in Phase 2)", () => {
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
