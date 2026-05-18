// Copy-safe self-check for the OAuth smoke build (research/oauth-smoke.md).
//
// Why this exists: the equivalent one-liner, pasted from chat, wrapped and
// corrupted the grep string → a false "BUILD BAD". Run as a single short
// npm command instead (`npm run smoke:check`) so there is nothing long to
// copy. Does a clean `build:smoke` and proves the __oqAuth harness landed
// in the exact service-worker chunk Chrome loads.

import { execSync } from "node:child_process";
import { rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const extDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(extDir, "dist");

function fail(msg) {
  console.error(
    `\n❌ BUILD BAD — ${msg}\n   Send this whole output to Claude.`,
  );
  process.exit(1);
}

console.log("• Removing old dist/ …");
rmSync(dist, { recursive: true, force: true });

console.log("• Running build:smoke (clean one-shot) …");
try {
  execSync("npm run build:smoke", { cwd: extDir, stdio: "pipe" });
} catch (e) {
  fail(`the build itself errored:\n${e.stdout?.toString() ?? e.message}`);
}

let loader;
try {
  loader = readFileSync(join(dist, "service-worker-loader.js"), "utf8");
} catch {
  fail("dist/service-worker-loader.js was not produced.");
}

const m = loader.match(/assets\/service-worker\.ts-[^"']+/);
if (!m) fail("could not find the service-worker chunk in the loader.");

const swChunk = readFileSync(join(dist, m[0]), "utf8");
const hasMarker = swChunk.includes("OAuth smoke harness ready");
const hasAssign = swChunk.includes("self.__oqAuth=");

if (hasMarker && hasAssign) {
  console.log(
    `\n✅ BUILD OK — the __oqAuth harness is in the service-worker chunk` +
      `\n   (${m[0]}). The dist/ is correct.` +
      `\n   If Chrome still says "__oqAuth is not defined", it is a STALE` +
      `\n   cached service worker: Remove the extension, FULLY QUIT Chrome` +
      `\n   (Cmd+Q), reopen, Load unpacked dist/ again.\n`,
  );
} else {
  fail(
    `harness missing from the SW chunk ` +
      `(marker:${hasMarker}, assign:${hasAssign}).`,
  );
}
