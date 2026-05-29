// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0
//
// `npm run package` — build the extension cleanly and emit an upload-ready
// Chrome Web Store zip, with the manifest `key` stripped from the COPY that
// gets zipped (the store ignores/rejects a `key` on a brand-new first upload),
// while leaving source + the locally-loadable `dist/` untouched so the unpacked
// dev build keeps its stable ID (dicnmcmhapcfceodecocnkaacjdpplnm, Entry 30).
//
// Steps, in order (see notes/owner-decisions-log + CLAUDE.md gotchas):
//   1. CLEAN BUILD   — rm -rf dist && npm run build (never zip a dev-corrupted
//                      dist; `npm run build` also runs tsc as the typecheck gate)
//   2. STAGE         — copy the fresh dist/ to .store-staging/ (work on the copy)
//   3. STRIP KEY     — delete `key` from the STAGING manifest.json only
//   4. ZIP           — zip the CONTENTS of staging so manifest.json is at the
//                      zip root; exclude macOS junk; name from manifest version
//   5. CLEAN UP      — remove the staging dir
// Every verification check fails loudly (non-zero exit) if it doesn't hold.

import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = join(EXT_ROOT, "dist");
const STAGING_DIR = join(EXT_ROOT, ".store-staging");
const RELEASE_DIR = join(EXT_ROOT, "release");

const log = (msg) => console.log(msg);
const fail = (msg) => {
  console.error(`\n✗ PACKAGE FAILED: ${msg}\n`);
  // Best-effort staging cleanup so a failed run doesn't leave a stale copy.
  try {
    rmSync(STAGING_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  process.exit(1);
};

const readManifest = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`could not read/parse ${path}: ${e.message}`);
  }
};

// ── 1. CLEAN BUILD ──────────────────────────────────────────────────────────
log("→ [1/5] Clean build (rm -rf dist && npm run build)…");
rmSync(DIST_DIR, { recursive: true, force: true });
try {
  execSync("npm run build", { cwd: EXT_ROOT, stdio: "inherit" });
} catch {
  fail(
    "`npm run build` failed (typecheck or bundle error) — nothing was zipped.",
  );
}
if (!existsSync(join(DIST_DIR, "manifest.json"))) {
  fail("build did not produce dist/manifest.json.");
}

// MV3 entry-basename sanity (CLAUDE.md gotcha): service-worker-loader.js must
// import the service-worker chunk, NOT the content-script chunk — otherwise the
// SW silently runs the content script and onboarding never opens.
const swLoaderPath = join(DIST_DIR, "service-worker-loader.js");
if (!existsSync(swLoaderPath)) {
  fail(
    "dist/service-worker-loader.js missing — MV3 background entry did not build.",
  );
}
const swLoader = readFileSync(swLoaderPath, "utf8");
if (!/service-worker/.test(swLoader) || /content-script/.test(swLoader)) {
  fail(
    "service-worker-loader.js does not import the service-worker chunk " +
      "(MV3 entry-basename collapse — see CLAUDE.md gotcha).",
  );
}

// ── 2. STAGE ────────────────────────────────────────────────────────────────
log("→ [2/5] Staging a copy of dist/ → .store-staging/…");
rmSync(STAGING_DIR, { recursive: true, force: true });
mkdirSync(STAGING_DIR, { recursive: true });
cpSync(DIST_DIR, STAGING_DIR, { recursive: true });

// Scrub macOS junk from the staging copy before zipping.
try {
  execSync(`find "${STAGING_DIR}" -name '.DS_Store' -type f -delete`, {
    stdio: "ignore",
  });
} catch {
  /* ignore — absence is fine */
}

// ── 3. STRIP KEY (staging copy only) ─────────────────────────────────────────
log("→ [3/5] Stripping `key` from the staged manifest.json…");
const stagedManifestPath = join(STAGING_DIR, "manifest.json");
const stagedManifest = readManifest(stagedManifestPath);
delete stagedManifest.key;
writeFileSync(
  stagedManifestPath,
  JSON.stringify(stagedManifest, null, 2) + "\n",
  "utf8",
);

// ── 4. ZIP ──────────────────────────────────────────────────────────────────
const version = stagedManifest.version;
if (!version) fail("staged manifest has no `version` — cannot name the zip.");
mkdirSync(RELEASE_DIR, { recursive: true });
const zipName = `fashionably-late-${version}.zip`;
const zipPath = join(RELEASE_DIR, zipName);
rmSync(zipPath, { force: true });

log(
  `→ [4/5] Zipping staging contents → release/${zipName} (manifest.json at root)…`,
);
// Run from inside staging so paths are relative → manifest.json lands at the
// zip ROOT (not nested under a folder). -r recurse, -X strip extra OS attrs,
// -q quiet; exclude any macOS junk defensively.
try {
  execFileSync(
    "zip",
    ["-r", "-X", "-q", zipPath, ".", "-x", "*.DS_Store", "-x", "__MACOSX*"],
    { cwd: STAGING_DIR, stdio: "inherit" },
  );
} catch {
  fail("`zip` invocation failed.");
}
if (!existsSync(zipPath)) fail("zip was not created.");

// ── 5. CLEAN UP staging ──────────────────────────────────────────────────────
log("→ [5/5] Removing staging dir…");
rmSync(STAGING_DIR, { recursive: true, force: true });

// ── VERIFICATION (fail loudly) ───────────────────────────────────────────────
log("\n── Verification ─────────────────────────────────────────────");

// (a) staged manifest (re-read from inside the zip is overkill; we verify the
//     in-memory object we just wrote AND that dist still has its key below).
if ("key" in stagedManifest)
  fail("staged manifest STILL has a `key` after strip.");
log("✓ Staged manifest has NO `key` field.");

// (b) source/dist untouched: dist/manifest.json still has its key.
const distManifest = readManifest(join(DIST_DIR, "manifest.json"));
if (!distManifest.key) {
  fail(
    "dist/manifest.json lost its `key` — the local dev build's stable ID would break.",
  );
}
log("✓ dist/manifest.json STILL has its `key` (source + dev build untouched).");

// (c) zip top-level + contents: manifest.json at root, no node_modules/.pem/dist.
let entries;
try {
  entries = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
} catch {
  fail("could not list zip contents with `unzip -Z1`.");
}
if (!entries.includes("manifest.json")) {
  fail("manifest.json is NOT at the zip root.");
}
const badEntry = entries.find(
  (e) =>
    e === "node_modules" ||
    e.startsWith("node_modules/") ||
    e.endsWith(".pem") ||
    e === "dist" ||
    e.startsWith("dist/") ||
    e.includes("/dist/") ||
    e === ".DS_Store" ||
    e.endsWith("/.DS_Store") ||
    e.startsWith("__MACOSX"),
);
if (badEntry) fail(`zip contains a forbidden entry: ${badEntry}`);
log(
  "✓ manifest.json at zip root; no node_modules, no .pem, no nested dist/, no macOS junk.",
);

// (d) manifest sanity.
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (stagedManifest.manifest_version !== 3) fail("manifest_version is not 3.");
if (stagedManifest.name !== "Fashionably Late")
  fail(`name is not "Fashionably Late" (got "${stagedManifest.name}").`);
if (!stagedManifest.version) fail("version missing.");
if (!eq(stagedManifest.permissions, ["storage", "scripting"])) {
  fail(
    `permissions are not exactly ["storage","scripting"] (got ${JSON.stringify(stagedManifest.permissions)}).`,
  );
}
if (!eq(stagedManifest.host_permissions, ["https://mail.google.com/*"])) {
  fail(
    `host_permissions are not exactly ["https://mail.google.com/*"] (got ${JSON.stringify(stagedManifest.host_permissions)}).`,
  );
}
log(
  `✓ Manifest sanity: mv3, name "Fashionably Late", version ${stagedManifest.version}, ` +
    `permissions ${JSON.stringify(stagedManifest.permissions)}, host ${JSON.stringify(stagedManifest.host_permissions)}.`,
);

// (e) final zip path + size.
const sizeKb = (statSync(zipPath).size / 1024).toFixed(1);
log("\n─────────────────────────────────────────────────────────────");
log(`✓ Store-ready zip: ${zipPath}`);
log(`  Size: ${sizeKb} KB  (${entries.length} entries)`);
log("─────────────────────────────────────────────────────────────\n");
