// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SymbolMark, FullLogo } from "./BrandLogo";
import { WORDMARK_PATH } from "./brand-wordmark-path";

describe("SymbolMark", () => {
  it("renders an svg sized to the `size` prop", () => {
    const { container } = render(<SymbolMark size={26} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("26");
    expect(svg?.getAttribute("height")).toBe("26");
  });

  it("is decorative (aria-hidden) by default", () => {
    const { container } = render(<SymbolMark />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
  });

  it("exposes itself as a labelled image when given a title", () => {
    const { container } = render(<SymbolMark title="Fashionably Late" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Fashionably Late");
    expect(svg?.getAttribute("aria-hidden")).toBeNull();
  });

  it("uses the brand teal #5EB1BF for the hands", () => {
    const { container } = render(<SymbolMark />);
    const teal = container.querySelectorAll('[fill="#5EB1BF"]');
    expect(teal.length).toBeGreaterThan(0);
  });
});

describe("FullLogo", () => {
  it("renders the symbol + wordmark lockup with the extracted wordmark path", () => {
    const { container } = render(<FullLogo size={48} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("height")).toBe("48");
    // Wordmark path is present and teal.
    const word = container.querySelector(`path[d="${WORDMARK_PATH}"]`);
    expect(word).not.toBeNull();
    expect(word?.getAttribute("fill")).toBe("#5EB1BF");
  });
});
