# OutboxIQ

> **Status:** v1 in development. Not yet released. Nothing in this repository is production-ready, and APIs, structure, and behavior may change without notice.

OutboxIQ is a browser extension for Gmail that enhances the native "Schedule Send" feature with intelligent, data-backed send-time recommendations. It helps users maximize email visibility by suggesting optimal delivery times based on the recipient's timezone, automatically prompts users when they attempt to send emails outside their working hours, and cancels scheduled emails when a reply is received before delivery.

The plugin extends Gmail's existing UX rather than replacing it. When installed, the native "Schedule send" dropdown is rebranded to "Schedule Send (powered by OutboxIQ)" and the modal that appears is enriched with new options, while preserving Gmail's familiar interaction patterns and the scheduled-emails view.

OutboxIQ is privacy-first, GDPR-compliant, and local-first by default. The only feature that requires a backend service is Unschedule-on-Reply, which is implemented as a lightweight EU-hosted relay for Gmail push notifications.

## Repository layout

- [`extension/`](./extension) — the Chrome extension (Manifest V3). Runs entirely in the user's browser.
- [`backend/`](./backend) — the EU-hosted relay service that powers Unschedule-on-Reply via Gmail push notifications. Deployed independently from the extension.
- [`OutboxIQ_PRD.md`](./OutboxIQ_PRD.md) — the full product requirements document. The source of truth for v1 scope.

## Current state

The repository currently contains:

- The PRD.
- A minimal folder structure for the extension and backend.
- No feature code yet.

The next milestone is to begin implementing the onboarding flow and the Schedule Send modal injection, in line with the PRD.

## License

To be determined.
