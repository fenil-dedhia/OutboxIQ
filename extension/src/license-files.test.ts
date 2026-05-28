// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Regression guard against accidental deletion of the repo-root LICENSE and
// NOTICE files. Apache 2.0 obligations (its §4 redistribution clause) hinge
// on both files being present in distributions; this is the cheapest, most
// visible signal that a refactor accidentally removed them.
//
// The SPDX-identifier spot-check (added alongside per-file headers in a
// follow-up commit) lives lower in this file — kept here rather than in a
// separate file because the trip-wire purpose is the same: prove the
// licensing surface didn't quietly regress.

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

describe("repo-root license files", () => {
  it("LICENSE exists and is Apache License Version 2.0", () => {
    const text = read("LICENSE");
    expect(text).toContain("Apache License");
    expect(text).toContain("Version 2.0");
  });

  it("LICENSE carries the project's copyright notice", () => {
    const text = read("LICENSE");
    expect(text).toContain("Copyright 2026 Fenil Dedhia");
  });

  it("NOTICE exists with the project name and copyright line", () => {
    const text = read("NOTICE");
    expect(text).toContain("Fashionably Late");
    expect(text).toContain("Copyright 2026 Fenil Dedhia");
    expect(text).toContain("Apache License, Version 2.0");
  });

  it("docs/COMMERCIAL.md exists (signals commercial-licensing channel)", () => {
    const text = read("docs/COMMERCIAL.md");
    expect(text).toContain("Commercial Licensing");
    expect(text).toContain("Apache License, Version 2.0");
  });
});

// Spot-check: a handful of representative source files carry the SPDX
// identifier at the top. Not exhaustive (overkill for ~100 files) — five
// files across src/lib, src/pages, src/content, plus one test file and one
// top-level config file. Catches a refactor that strips the header from
// the most-edited files without becoming maintenance noise itself.
describe("SPDX-License-Identifier headers on representative files", () => {
  const reps = [
    "extension/src/lib/constants.ts",
    "extension/src/pages/settings/App.tsx",
    "extension/src/content/content-script.ts",
    "extension/src/background/service-worker.ts",
    "extension/src/lib/constants.test.ts",
    "extension/vite.config.ts",
  ];

  for (const path of reps) {
    it(`${path} starts with the SPDX identifier`, () => {
      const text = read(path);
      // First ~120 chars cover the two-line header + a blank line.
      const head = text.slice(0, 120);
      expect(head).toContain("Copyright 2026 Fenil Dedhia");
      expect(head).toContain("SPDX-License-Identifier: Apache-2.0");
    });
  }
});
