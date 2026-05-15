# OutboxIQ — Chrome Extension

The browser-side of OutboxIQ. This is a Manifest V3 Chrome extension that runs inside the user's browser and integrates with Gmail.

## Status

v1 in development. No feature code yet — this folder currently contains only a minimal `manifest.json` stub and the planned folder layout.

## Planned structure

- `manifest.json` — Manifest V3 manifest. Declares permissions, the service worker, content scripts, and extension pages.
- `src/background/` — the service worker (long-lived background tasks: OAuth, API calls, message passing with the backend).
- `src/content/` — content scripts injected into the Gmail tab (compose-window detection, modal injection, scheduled-email badge).
- `src/pages/onboarding/` — the first-run onboarding page.
- `src/pages/settings/` — the settings panel.
- `src/lib/` — shared utilities (timezone resolution, working-hours logic, storage helpers).
- `public/icons/` — extension icons (16, 48, 128 px).

See [`../OutboxIQ_PRD.md`](../OutboxIQ_PRD.md) for the full spec.
