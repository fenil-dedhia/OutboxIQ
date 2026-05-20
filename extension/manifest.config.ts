import { defineManifest } from "@crxjs/vite-plugin";

// MV3 manifest. **Free v1 holds NO OAuth and makes NO Google API calls**
// (owner-decisions-log Entry 39): `identity` and the `people.googleapis.com`
// host permission were removed — the recipient cascade is now cache→manual,
// purely on-device. Minimal footprint: `storage` + the Gmail content-script
// origin, nothing else. The OAuth/People infrastructure (which DID need
// `identity` + that host) is preserved inert in `src/premium-v1/`; Premium
// v1 re-adds these manifest entries when it wires that up. This is a
// material install-prompt reduction vs. the Session-8 OAuth baseline.
export default defineManifest({
  manifest_version: 3,
  name: "Fashionably Late",
  version: "0.0.1",
  // Pins a STABLE unpacked-extension ID (dicnmcmhapcfceodecocnkaacjdpplnm).
  // Without this the dev ID changes every load, which would break the OAuth
  // redirect URI (https://<id>.chromiumapp.org/) on every reload (Session 7
  // Phase 2). This is the base64 DER public key; the matching private key is
  // `extension-key.pem` at the repo root, *.pem-gitignored (the repo is
  // public). Losing the .pem only matters if a signed .crx with this same
  // identity is ever needed — unpacked dev only needs this `key` string.
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4AZSr7n5Hi5rEDEQaIi+CCl5pVs6KYJCNMKtzzIN7hX1aIPufs7yBKhVp8f+6g1/PYJKVe3MO8XZpsOVLAVOVnba36ynTrBO8cCR6mg8f+LRWddE5qESuV3zNbY1RmAqERg2PVSQPfGZEU+qi8Y2hXjwfARWS0bYm1kZ6hPINypsqslh5qVdaS44fXm+qRltNU/fe3GR7XXI/PmW6u3qe0FGGuI6+P79PZ7lU26rQChfdzpyoP+H+29wzpPr648PMo4iXuSOhfMkZpb8Lm7lBPtDRxKLlwwCX20tXT7hGjoz8SjQSaexSRj5B8RmMCA6YevFwafr1qTkK9UYI97YGQIDAQAB",
  description:
    "Enhances Gmail's Schedule Send with intelligent, data-backed send-time recommendations.",
  icons: {
    16: "public/icons/icon-16.png",
    32: "public/icons/icon-32.png",
    48: "public/icons/icon-48.png",
    128: "public/icons/icon-128.png",
  },
  action: {
    default_title: "Fashionably Late",
  },
  options_page: "src/pages/settings/index.html",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://mail.google.com/*"],
      js: ["src/content/content-script.ts"],
      run_at: "document_idle",
    },
  ],
  // `storage` + `scripting`. NO `identity` (Free v1 has no OAuth —
  // Entry 39), NO `tabs` (we use host_permissions for tab access).
  // `scripting` is needed so the service worker can inject the
  // content-script into Gmail tabs that were ALREADY open at install
  // time — Chrome's static `content_scripts` manifest declaration only
  // injects on subsequent page loads, not retroactively into existing
  // tabs (MV3 model). Without this, a user who has Gmail open and then
  // installs the extension would have to manually refresh Gmail before
  // the extension does anything. Premium v1 re-adds `identity` for its
  // OAuth (preserved in src/premium-v1/); not requested here.
  permissions: ["storage", "scripting"],
  // mail.google.com ONLY: the content-script origin; also lets the
  // onboarding page focus the user's Gmail tab on finish (PRD §5.1.4).
  // `people.googleapis.com` was REMOVED — Free v1 makes no Google API
  // call (Entry 39; cascade is cache→manual). Premium v1 re-adds the
  // People host when it wires up src/premium-v1/. Minimal by design
  // (PRD §6.1.1) — this is now the smallest the extension can be.
  host_permissions: ["https://mail.google.com/*"],
});
