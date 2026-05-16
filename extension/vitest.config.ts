import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// A separate config from vite.config.ts on purpose: the CRXJS plugin builds an
// extension bundle and interferes with the unit-test runner, so tests use a
// plain React + jsdom setup with no CRXJS in the pipeline.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
