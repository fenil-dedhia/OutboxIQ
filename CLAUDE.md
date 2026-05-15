# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

Pre-code scaffolding. The repo contains the PRD, READMEs, license, a pre-launch checklist, an MV3 manifest stub, and empty `src/` trees. **No feature code, no `package.json`, no build/lint/test commands exist yet.** When you add tooling, update this file with the resulting commands.

## Source-of-truth documents

Read these before making non-trivial decisions — they encode constraints that aren't visible in the code:

- `OutboxIQ_PRD.md` — full v1 spec. **§11 "Out of Scope: Do Not Build"** is unusually load-bearing: it explicitly forbids 20 plausible-sounding features (email tracking, AI rewriting, analytics dashboards, separate scheduled-emails view, multi-account, holiday awareness, Firefox support, telemetry, etc.). Treat it as a hard constraint, not a suggestion — do not infer or add features outside it.
- `PRE_LAUNCH_CHECKLIST.md` — obligations deferred until public launch (CASA Tier 2, OAuth Production, Privacy/Terms drafting, brand work, Web Store submission). Anything you'd otherwise spend time on for "launch readiness" probably belongs here, not in feature code.
- `notes/session-1-summary.md` — current state and what the next session should start with.

## Architecture

Two independently-deployed components, kept deliberately small:

### `extension/` — Chrome MV3 (does almost everything)

Local-first by design. All recipient-timezone detection, scheduling UI, working-hours logic, and storage runs in the browser. The extension **enhances** Gmail's native Schedule Send rather than replacing it — the native dropdown is rebranded and the native modal is enriched, but Gmail's interaction patterns and the Scheduled label are preserved (PRD §8.1 "native feel over branded feel"). Planned layout: `src/background/` (service worker, OAuth, backend messaging), `src/content/` (Gmail DOM injection), `src/pages/{onboarding,settings}/`, `src/lib/` (shared utilities), `public/icons/`.

### `backend/` — EU-hosted relay (exists for exactly two reasons)

The backend is **not** a general server. It exists for two specific server-side concerns and nothing else:

1. **Unschedule-on-Reply relay** — subscribes to Gmail push notifications via Google Cloud Pub/Sub and cancels scheduled emails when a reply arrives (PRD §5.6, §7.3).
2. **Maps API proxy** — keeps the paid Maps key out of client code (PRD §5.4.1, §7.3).

Do not add other endpoints, telemetry sinks, user-data storage, or "while we're here" features. If you find yourself wanting to, that's a signal to push the logic back into the extension or to stop.

**Data rules:** no email content is ever stored. Stored data is limited to user email, encrypted OAuth refresh token (per-user keys), and active scheduled-message records. EU region (Frankfurt/Amsterdam) for GDPR data-residency.

## Locked tech decisions

Already decided — do not re-litigate without explicit user input:

- **Extension:** React + Vite, Manifest V3.
- **Backend:** Node + Hono on Fly.io, EU region.
- **Database:** Supabase, EU region.
- **License:** MIT during v1 development (royalty-on-commercial-use intent is a pre-launch decision, not a now decision).
- **Telemetry:** zero. No analytics SDKs, no usage events, no opt-in hedge. Success metrics are qualitative for v1.
- **Privacy/ToS docs:** drafting deferred; will live in `docs/` and be served from GitHub Pages.
- **Brand assets:** placeholder "OQ" mark during dev; real brand work happens just before Web Store submission.

## Gating constraint: Gmail scheduled-send spike

The Gmail API does not expose third-party scheduled sends directly. A **half-day technical spike** must produce `research/scheduled-send-api-spike.md` answering: (a) which approach works, (b) constraints, (c) accepted trade-offs, (d) open questions. **No Schedule Send feature code, backend Pub/Sub wiring, or recipient-cache code may begin until that spike is complete and reviewed.** The onboarding flow (PRD §5.1) is the safe starting point — it doesn't depend on the scheduling mechanism.

## Google Cloud / OAuth

Fresh GCP project, **just-in-time setup** — wire up Cloud APIs only when a feature actually needs them. OAuth stays in **Testing mode** with an explicit test-user allowlist during development; switching to Production requires the CASA Tier 2 assessment tracked in the pre-launch checklist (4–8 week lead time, several-thousand-USD cost).

## Working in this repo

- The user (Fenil) is non-technical for implementation details. Narrate decisions in plain English, and confirm before destructive or hard-to-reverse actions.
- When a feature touches privacy, OAuth scopes, data residency, or anything the PRD §11 list could conceivably bear on, re-read the relevant PRD section before writing code rather than working from memory.
- If you add tooling (package manager, build, lint, test, deploy), record the resulting commands in this file in a new "Commands" section so future sessions don't have to rediscover them.
