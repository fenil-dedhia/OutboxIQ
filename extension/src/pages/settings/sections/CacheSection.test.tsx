import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CacheSection } from "./CacheSection";
import type { RecipientCacheEntry } from "../../../lib/storage";

// PRD §5.8.2 Recipient Timezone Cache — the section UI (list / search / edit /
// delete / clear-all / empty). State persistence is covered in
// useSettings.test.tsx; this covers the rendered controls + handler wiring.

const entries: RecipientCacheEntry[] = [
  {
    email: "sarah@example.com",
    name: "Sarah Chen",
    timezone: "America/Los_Angeles",
    source: "manual",
    resolvedAt: "2026-05-01T10:00:00.000Z",
  },
  {
    email: "kenji@example.co.jp",
    name: null,
    timezone: "Asia/Tokyo",
    source: "manual",
    resolvedAt: "2026-05-02T10:00:00.000Z",
  },
];

function renderSection(rows: RecipientCacheEntry[] = entries) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onClearAll = vi.fn();
  render(
    <CacheSection
      entries={rows}
      pinned={[]}
      onEdit={onEdit}
      onDelete={onDelete}
      onClearAll={onClearAll}
    />,
  );
  return { onEdit, onDelete, onClearAll };
}

describe("CacheSection (PRD §5.8.2)", () => {
  it("renders the empty state when there are no entries", () => {
    renderSection([]);
    expect(
      screen.getByText(/No cached recipient timezones yet/i),
    ).toBeInTheDocument();
    // No toolbar / clear-all when empty.
    expect(screen.queryByRole("button", { name: /clear all/i })).toBeNull();
  });

  it("renders a row per entry with the curated timezone label", () => {
    renderSection();
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
    // Never-named recipient shows its email as the primary line.
    expect(screen.getByText("kenji@example.co.jp")).toBeInTheDocument();
    // Curated label, not the raw IANA id.
    expect(screen.getByText(/Pacific Time/)).toBeInTheDocument();
    expect(screen.getByText(/Japan/)).toBeInTheDocument();
  });

  it("search filters the list by name / email / timezone", () => {
    renderSection();
    fireEvent.change(
      screen.getByRole("searchbox", { name: /search cached recipients/i }),
      { target: { value: "sarah" } },
    );
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.queryByText("kenji@example.co.jp")).toBeNull();
  });

  it("per-row delete calls onDelete with the email", () => {
    const { onDelete } = renderSection();
    fireEvent.click(
      screen.getByRole("button", { name: /Delete sarah@example\.com/ }),
    );
    expect(onDelete).toHaveBeenCalledWith("sarah@example.com");
  });

  it("Edit reveals the inline timezone picker for that row", () => {
    renderSection();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Edit timezone for sarah@example\.com/,
      }),
    );
    expect(
      screen.getByRole("combobox", { name: /Timezone for sarah@example\.com/ }),
    ).toBeInTheDocument();
  });

  it("Clear all asks for confirmation, then calls onClearAll", () => {
    const { onClearAll } = renderSection();
    fireEvent.click(
      screen.getByRole("button", {
        name: /clear all cached recipient timezones/i,
      }),
    );
    // Confirmation surfaces, naming the count; nothing cleared yet.
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/remove all 2/i);
    expect(onClearAll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Clear all$/ }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("Clear all can be cancelled without clearing", () => {
    const { onClearAll } = renderSection();
    fireEvent.click(
      screen.getByRole("button", {
        name: /clear all cached recipient timezones/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClearAll).not.toHaveBeenCalled();
  });
});
