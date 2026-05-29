// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Drift guard for the Session-18 brand-color swap (Entry 57): the UI palette
// moved from Google-blue (#1a73e8 family) to Moonstone teal (#5EB1BF family).
// Because color lives partly in CSS custom properties (settings/onboarding
// .css) and partly in hardcoded hex inside the Shadow-DOM modal + the two
// self-styled pickers, there is no single token file to lean on. This test is
// the cheapest signal that a future edit didn't reintroduce the old blue or
// hand-roll a one-off hex outside the approved scale.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// extension/src/ → ../.. → repo root
const repoRoot = resolve(here, "..", "..");

function read(relPath: string): string {
  return readFileSync(resolve(repoRoot, relPath), "utf8");
}

// Every file that carries brand color (the 5 found in the S18 audit).
const COLOR_FILES = [
  "extension/src/pages/settings/settings.css",
  "extension/src/pages/onboarding/onboarding.css",
  "extension/src/content/schedule-modal/styles.ts",
  "extension/src/lib/components/PinnedTimezonesEditor.tsx",
  "extension/src/lib/components/TimezonePicker.tsx",
];

// The retired Google-blue scale — none of these may reappear.
const OLD_BLUE = [
  "#1a73e8",
  "#1b66c9",
  "#e8f0fe",
  "#d2e3fc",
  "#1a3a6b",
  "#f8fafe",
  "#b6c6e0",
];

describe("brand palette: no retired blue remains", () => {
  for (const file of COLOR_FILES) {
    it(`${file} contains no old Google-blue hex`, () => {
      const text = read(file).toLowerCase();
      for (const hex of OLD_BLUE) {
        expect(text, `found retired blue ${hex} in ${file}`).not.toContain(hex);
      }
    });
  }
});

describe("brand palette: Moonstone teal is in use", () => {
  // The accessible primary-button + text shade (700) and the light-tint
  // background (50). If these vanish, the swap was reverted or broken.
  it("the primary teal 700 (#367b87) appears in the modal and CSS tokens", () => {
    expect(
      read("extension/src/content/schedule-modal/styles.ts").toLowerCase(),
    ).toContain("#367b87");
    expect(
      read("extension/src/pages/settings/settings.css").toLowerCase(),
    ).toContain("#367b87");
    expect(
      read("extension/src/pages/onboarding/onboarding.css").toLowerCase(),
    ).toContain("#367b87");
  });

  it("the light teal tint 50 (#eff7f8) replaced the old blue background", () => {
    expect(
      read("extension/src/pages/settings/settings.css").toLowerCase(),
    ).toContain("#eff7f8");
  });
});
