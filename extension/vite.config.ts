import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // CRXJS owns manifest-referenced assets (icons), so Vite's `public/`
  // static passthrough is redundant and would emit a duplicate copy.
  // Disabling it keeps a single, clean set of icons under dist/.
  publicDir: false,
  // `npm run build:smoke` sets OQ_SMOKE=1 → the DEV-only __oqAuth OAuth
  // console harness is ALSO included in that (otherwise production-quality)
  // build, so the owner can hands-on verify OAuth from a CLEAN one-shot
  // build instead of the fragile CRXJS dev server. Plain `npm run build`
  // leaves this false, so the harness is dead-code-eliminated from any
  // shippable artifact (the security stance is preserved).
  define: {
    __OQ_SMOKE__: JSON.stringify(process.env.OQ_SMOKE === "1"),
  },
  build: {
    rollupOptions: {
      input: {
        // The settings page is picked up automatically via manifest
        // `options_page`. The onboarding page is opened programmatically
        // (PRD §5.1.2), so it must be declared as an explicit build input.
        onboarding: "src/pages/onboarding/index.html",
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
