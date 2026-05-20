import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FeatureTogglesSection } from "./FeatureTogglesSection";
import { createDefaultState } from "../../../lib/storage";

// PRD §5.8.2 Feature Toggles — Free-v1 scope: exactly two toggles, and the
// other two (Unschedule on Reply, Schedule confirmation toast) must NOT appear.

function renderSection() {
  const onToggle = vi.fn();
  render(
    <FeatureTogglesSection
      toggles={createDefaultState().featureToggles}
      onToggle={onToggle}
    />,
  );
  return { onToggle };
}

describe("FeatureTogglesSection (PRD §5.8.2, Free v1)", () => {
  it("renders exactly the two Free-v1 toggles, both on by default", () => {
    renderSection();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    expect(
      screen.getByRole("switch", { name: /recipient optimized scheduling/i }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: /auto-reschedule prompt/i }),
    ).toBeChecked();
  });

  it("does NOT render the Premium / moot toggles", () => {
    renderSection();
    expect(screen.queryByText(/unschedule on reply/i)).toBeNull();
    expect(screen.queryByText(/confirmation toast/i)).toBeNull();
  });

  it("toggling recipient optimization off calls onToggle(key, false)", () => {
    const { onToggle } = renderSection();
    fireEvent.click(
      screen.getByRole("switch", { name: /recipient optimized scheduling/i }),
    );
    expect(onToggle).toHaveBeenCalledWith("recipientOptimization", false);
  });

  it("toggling the auto-reschedule prompt off calls onToggle(key, false)", () => {
    const { onToggle } = renderSection();
    fireEvent.click(
      screen.getByRole("switch", { name: /auto-reschedule prompt/i }),
    );
    expect(onToggle).toHaveBeenCalledWith(
      "autoRescheduleOnOutsideHours",
      false,
    );
  });
});
