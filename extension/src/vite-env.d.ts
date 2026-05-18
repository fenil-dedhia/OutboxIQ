/// <reference types="vite/client" />

// Build-time flag injected by vite.config.ts `define`. True ONLY for the
// `npm run build:smoke` build (hands-on OAuth verification); false for the
// normal `npm run build` and therefore for any shippable artifact, so the
// DEV/smoke-only `__oqAuth` console harness is dead-code-eliminated from
// production. See research/oauth-smoke.md and CLAUDE.md Commands.
declare const __OQ_SMOKE__: boolean;
