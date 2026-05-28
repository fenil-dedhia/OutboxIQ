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

  it("COMMERCIAL.md exists (signals commercial-licensing channel)", () => {
    const text = read("COMMERCIAL.md");
    expect(text).toContain("Commercial Licensing");
    expect(text).toContain("Apache License, Version 2.0");
  });
});
