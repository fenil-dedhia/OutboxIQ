# Fashionably Late

> **Status:** v1 in development. Not yet released. Nothing in this repository is production-ready, and APIs, structure, and behavior may change without notice.

Fashionably Late is a browser extension for Gmail that enhances the native "Schedule Send" feature with intelligent, data-backed send-time recommendations. It helps users maximize email visibility by suggesting optimal delivery times based on the recipient's timezone, automatically prompts users when they attempt to send emails outside their working hours, and cancels scheduled emails when a reply is received before delivery.

The plugin extends Gmail's existing UX rather than replacing it. When installed, the native "Schedule send" dropdown is rebranded to "Schedule Send (powered by Fashionably Late)" and the modal that appears is enriched with new options, while preserving Gmail's familiar interaction patterns and the scheduled-emails view.

Fashionably Late is privacy-first, GDPR-compliant, and local-first by default.

> **Two tiers (2026-05-17 — `notes/owner-decisions-log.md` Entry 32).** Fashionably Late ships as two tiers of the same generation: **Free v1** — extension-only, **no backend**, free, the public-launch target and the active development track — and **Premium v1** — extension + backend, paid, built later, adding Unschedule-on-Reply (the only feature that needs a backend). They are parallel tiers (a Free v1 user *upgrades*), **not** sequential versions and **not** "v2". The full Premium design is preserved, not deleted, in **PRD §13**; its launch gates are in [`PREMIUM_LAUNCH_CHECKLIST.md`](./PREMIUM_LAUNCH_CHECKLIST.md).

## Repository layout

- [`extension/`](./extension) — the Chrome extension (Manifest V3). Runs entirely in the user's browser. **This is all of Free v1.**
- [`backend/`](./backend) — the EU-hosted relay that powers Unschedule-on-Reply. **Premium v1 only** — not part of Free v1, a separate later track. Deployed independently from the extension.
- [`Fashionably Late_PRD.md`](./Fashionably Late_PRD.md) — the full product requirements document (source of truth; §13 holds the preserved Premium v1 scope).

## Current state

The repository currently contains:

- The PRD and supporting design docs.
- The extension build toolchain (TypeScript + React + Vite, Manifest V3).
- The first feature: the first-run onboarding flow (PRD §5.1) — a typed local-storage state layer plus a three-step onboarding UI.
- The EU relay backend is not started — it is **Premium v1 scope** (only needed for Unschedule-on-Reply, the sole backend purpose; Google Maps was removed from product scope, so there is no Maps proxy). Free v1 ships with no backend.

The next milestone is the compose-window integration and the Schedule Send modal injection (PRD §5.2–§5.3), in line with the PRD.

## License

**All rights reserved.** This repository is public for portfolio and evaluation purposes only — see [`LICENSE`](./LICENSE). No reuse, copying, modification, or distribution is permitted without prior written permission. The eventual public-launch licensing model (open-source, royalty-on-commercial-use, dual-licensing, or source-available) is a separate decision tracked in [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md).
