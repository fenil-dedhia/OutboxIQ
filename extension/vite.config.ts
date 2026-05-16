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
