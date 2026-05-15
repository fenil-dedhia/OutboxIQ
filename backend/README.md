# OutboxIQ — Backend (Reply Relay)

The EU-hosted backend service that powers the **Unschedule-on-Reply** feature. This is the *only* server-side component of OutboxIQ — every other feature runs entirely in the browser.

## Status

v1 in development. No feature code yet.

## Purpose

When a user schedules an email via OutboxIQ, the extension registers the scheduled message with this backend. The backend subscribes to Gmail push notifications via Google Cloud Pub/Sub, watches for replies in the relevant threads, and cancels the scheduled email if a recipient replies before delivery.

## Deployment

- **Region:** EU (Frankfurt, Dublin, Amsterdam, or equivalent) for GDPR data-residency.
- **Storage:** Encrypted at rest. OAuth refresh tokens encrypted with per-user keys.
- **Data retained:** user email, encrypted refresh token, and active scheduled-message records. **No email content is ever stored.**
- Deployed independently from the extension.

## Planned structure

- `src/` — service source code (HTTP endpoints, Pub/Sub webhook handler, WebSocket events, encryption helpers).

See section 5.6 and 7.3 of [`../OutboxIQ_PRD.md`](../OutboxIQ_PRD.md) for the full spec.
