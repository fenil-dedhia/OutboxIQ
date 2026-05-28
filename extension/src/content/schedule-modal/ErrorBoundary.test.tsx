// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ModalErrorBoundary } from "./ErrorBoundary";

// §5.2.3: a render-time throw must be caught and routed to the native
// fallback, not left as a dead modal with native Schedule Send suppressed.

function Boom(): never {
  throw new Error("render exploded");
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.restoreAllMocks());

describe("ModalErrorBoundary (§5.2.3 render-time hardening)", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ModalErrorBoundary onError={vi.fn()}>
        <div>healthy modal</div>
      </ModalErrorBoundary>,
    );
    expect(screen.getByText("healthy modal")).toBeInTheDocument();
  });

  it("on a child render throw: swallows the UI and invokes onError", async () => {
    // React logs caught boundary errors via console.error in dev — expected.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ModalErrorBoundary onError={onError}>
        <Boom />
        <div>should not show</div>
      </ModalErrorBoundary>,
    );

    // Subtree replaced with null immediately (no half-broken modal flashes).
    expect(screen.queryByText("should not show")).not.toBeInTheDocument();
    // onError is deferred out of React's commit phase (setTimeout 0).
    expect(onError).not.toHaveBeenCalled();
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
