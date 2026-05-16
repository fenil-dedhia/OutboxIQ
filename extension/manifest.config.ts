import { defineManifest } from "@crxjs/vite-plugin";

// Minimal, just-in-time MV3 manifest. Only what the onboarding flow (PRD §5.1)
// needs is declared here. OAuth scopes (PRD §6.6), the `identity` permission,
// and googleapis host permissions are deliberately NOT requested yet — they are
// wired in just-in-time when the Calendar/Gmail features that need them begin.
export default defineManifest({
  manifest_version: 3,
  name: "OutboxIQ",
  version: "0.0.1",
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
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://mail.google.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["storage"],
});
