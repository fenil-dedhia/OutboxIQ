import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { App } from "./App";

// Smoke test — proves the Vitest + React Testing Library + jsdom pipeline
// works end to end. Real onboarding behaviour is tested with PRD §5.1.
describe("Onboarding scaffold", () => {
  it("renders the scaffold heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /onboarding/i }),
    ).toBeInTheDocument();
  });
});
