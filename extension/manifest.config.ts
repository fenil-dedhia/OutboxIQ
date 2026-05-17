import { defineManifest } from "@crxjs/vite-plugin";

// Minimal, just-in-time MV3 manifest. Only what the onboarding flow (PRD §5.1)
// needs is declared here. OAuth scopes (PRD §6.6), the `identity` permission,
// and googleapis host permissions are deliberately NOT requested yet — they are
// wired in just-in-time when the Calendar/Gmail features that need them begin.
export default defineManifest({
  manifest_version: 3,
  name: "OutboxIQ",
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
    default_title: "OutboxIQ",
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
  permissions: ["storage"],
  // Scoped to the one origin the extension already runs its content script
  // in. Lets the onboarding page query/focus the user's Gmail tab on finish
  // (PRD §5.1.4 "lands in Gmail"). Deliberately NOT the broad "tabs"
  // permission, which would expose every tab's URL/title.
  host_permissions: ["https://mail.google.com/*"],
});
