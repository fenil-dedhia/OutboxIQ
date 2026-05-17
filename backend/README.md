# OutboxIQ — Backend (Reply Relay)

The EU-hosted backend service that powers the **Unschedule-on-Reply** feature. This is the *only* server-side component of OutboxIQ — every other feature runs entirely in the browser.

## Status

> **Premium v1 only (2026-05-17, owner-directed — `../notes/owner-decisions-log.md` Entry 32; PRD §13).** OutboxIQ split into **Free v1** (extension-only, no backend — the public-launch target and the active track) and **Premium v1** (extension + backend, paid, later). **This backend is Premium v1 scope and is NOT the next work** — Free v1 ships with no backend at all. The full preserved design is PRD **§13**; launch gates are in [`../PREMIUM_LAUNCH_CHECKLIST.md`](../PREMIUM_LAUNCH_CHECKLIST.md). The single-purpose discipline, the Maps-removal narrowing (Entry 26), and the Option-B OAuth-token architecture (Entry 31, below) all **carry forward to the Premium v1 backend intact — preserved, not reopened**.

Not started. No feature code yet (Premium v1 build scope).

## Purpose

When a user schedules an email via OutboxIQ, the extension registers the scheduled message with this backend. The backend subscribes to Gmail push notifications via Google Cloud Pub/Sub, watches for replies in the relevant threads, and cancels the scheduled email if a recipient replies before delivery.

> **OAuth token management is part of this one purpose (2026-05-17 — owner-decisions-log Entry 31; the design is preserved in PRD §13.3 / §13.2 after the Entry-32 tier split, where §7.5/§7.3 now stub).** Cancelling a scheduled send when the extension is not running structurally requires a backend-held, per-user-encrypted **refresh token**. So the backend also owns the OAuth server-side authorization-code exchange (`POST /auth/exchange`), access-token minting (`POST /auth/token`), and revocation (`POST /auth/revoke`); the Client Secret lives only in this backend's env vars. This is **infrastructure the one purpose requires** (necessarily reused by the extension's other Google API calls since there is one OAuth grant per user) — **not a second purpose** and not a reversal of the single-purpose / Maps-removal narrowing. Not-Unschedule-and-not-its-OAuth-plumbing still does not belong here.

## Deployment

- **Region:** EU (Frankfurt, Dublin, Amsterdam, or equivalent) for GDPR data-residency.
- **Storage:** Encrypted at rest. OAuth refresh tokens encrypted with per-user keys.
- **Data retained:** user email, encrypted refresh token, and active scheduled-message records. **No email content is ever stored.**
- Deployed independently from the extension.

## Planned structure

- `src/` — service source code (HTTP endpoints, Pub/Sub webhook handler, WebSocket events, encryption helpers).

See **§13** of [`../OutboxIQ_PRD.md`](../OutboxIQ_PRD.md) for the full preserved Premium v1 spec (§13.1 Unschedule-on-Reply — was §5.6; §13.2 backend service — was §7.3; §13.3 Premium Option-B OAuth — the Entry-31 design). §5.6/§7.3 are now stubs that point to §13.
