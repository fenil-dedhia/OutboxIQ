import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrivacyDataSection } from "./PrivacyDataSection";
import { downloadJsonFile } from "../../../lib/data-management";
import { createDefaultState } from "../../../lib/storage";
import { seedStorage } from "../../../test/chrome-mock";
import {
  STORAGE_KEY_STATE,
  STORAGE_KEY_ONBOARDING_DRAFT,
} from "../../../lib/constants";

// PRD §5.8.2 Privacy & Data. Session 13: Export My Data is a real local JSON
// download (§6.1.1 right to access); Delete My Data is a typed-confirmation
// irreversible local wipe (§6.1.1 right to erasure). Privacy/ToS links remain
// inert placeholders.

// Mock only the DOM download trigger; the rest of export (buildDataExport →
// serializeDataExport) and ALL of deleteAllData run for real over the chrome
// mock — so the delete tests assert the keys are actually cleared.
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

  describe("Delete My Data (§6.1.1 right to erasure)", () => {
    function openDeleteModal() {
      fireEvent.click(screen.getByRole("button", { name: /delete my data/i }));
      return screen.getByRole("dialog");
    }

    it("opens a confirmation modal rather than deleting immediately", () => {
      render(<PrivacyDataSection />);
      expect(screen.queryByRole("dialog")).toBeNull();
      openDeleteModal();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("keeps the destructive button disabled until 'delete' is typed (case-insensitive, trimmed)", () => {
      render(<PrivacyDataSection />);
      const dialog = openDeleteModal();
      const confirm = within(dialog).getByRole("button", {
        name: /delete my data/i,
      });
      const input = within(dialog).getByRole("textbox");

      expect(confirm).toBeDisabled();
      fireEvent.change(input, { target: { value: "nope" } });
      expect(confirm).toBeDisabled();
      fireEvent.change(input, { target: { value: "  DELETE  " } });
      expect(confirm).toBeEnabled();
    });

    it("Cancel closes the modal and deletes nothing", async () => {
      seedStorage({ [STORAGE_KEY_STATE]: createDefaultState() });
      render(<PrivacyDataSection />);
      const dialog = openDeleteModal();
      fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(await chrome.storage.local.get(STORAGE_KEY_STATE)).not.toEqual({});
    });

    it("confirming wipes all owned data and notifies the page (onDataDeleted)", async () => {
      seedStorage({
        [STORAGE_KEY_STATE]: createDefaultState(),
        [STORAGE_KEY_ONBOARDING_DRAFT]: { stepIndex: 1 },
      });
      const onDataDeleted = vi.fn();
      render(<PrivacyDataSection onDataDeleted={onDataDeleted} />);
      const dialog = openDeleteModal();
      fireEvent.change(within(dialog).getByRole("textbox"), {
        target: { value: "delete" },
      });
      fireEvent.click(
        within(dialog).getByRole("button", { name: /delete my data/i }),
      );

      await waitFor(() => expect(onDataDeleted).toHaveBeenCalledTimes(1));
      expect(await chrome.storage.local.get(STORAGE_KEY_STATE)).toEqual({});
      expect(
        await chrome.storage.local.get(STORAGE_KEY_ONBOARDING_DRAFT),
      ).toEqual({});
    });

    it("uses local-only copy — no backend / server / revoke / token language (§6.1.2)", () => {
      render(<PrivacyDataSection />);
      const dialog = openDeleteModal();
      expect(dialog.textContent ?? "").not.toMatch(
        /backend|server|revoke|account|token/i,
      );
    });

    it("surfaces an error (and does NOT claim success) if the wipe fails", async () => {
      seedStorage({ [STORAGE_KEY_STATE]: createDefaultState() });
      const onDataDeleted = vi.fn();
      const realRemove = chrome.storage.local.remove;
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      chrome.storage.local.remove = vi.fn(() =>
        Promise.reject(new Error("boom")),
      ) as typeof chrome.storage.local.remove;

      try {
        render(<PrivacyDataSection onDataDeleted={onDataDeleted} />);
        const dialog = openDeleteModal();
        fireEvent.change(within(dialog).getByRole("textbox"), {
          target: { value: "delete" },
        });
        fireEvent.click(
          within(dialog).getByRole("button", { name: /delete my data/i }),
        );

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(/couldn't delete/i);
        expect(onDataDeleted).not.toHaveBeenCalled();
      } finally {
        chrome.storage.local.remove = realRemove;
        errorSpy.mockRestore();
      }
    });
  });
});
