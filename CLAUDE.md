# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

Toolchain scaffolded; **PRD §5.1 onboarding is implemented** (first feature). The `extension/` build pipeline (TypeScript + React + Vite + `@crxjs/vite-plugin`, MV3) is set up and verified end-to-end — `npm run build` produces a loadable unpacked extension in `extension/dist/`. Done: a typed `chrome.storage.local` state layer (PRD §7.2 schema) in `src/lib/`, and the onboarding flow as a **3-step** flow (welcome+transparency+consent → timezone → working hours) — note this consolidates the PRD's original 5 steps; PRD §5.1.3 has been updated to match. Settings (§5.8) and compose integration (§5.2) are still placeholder stubs. The `backend/` is untouched (not needed until Unschedule-on-Reply / Maps proxy). The MV3 manifest is generated from a typed `extension/manifest.config.ts` (the old 4-field `manifest.json` stub was superseded and removed); permissions remain minimal/just-in-time — `storage` plus `host_permissions` scoped to `https://mail.google.com/*` only (no `tabs`, no OAuth/`identity` yet). Onboarding launch is owned by the service worker via lifecycle events + a content-script trigger + the toolbar icon. See the Commands section below.

## Commands

All commands run from `extension/` (the only component with tooling so far; `backend/` has none yet). Example: `npm --prefix extension run build`.

- `npm install` — install dependencies (first-time setup).
- `npm run dev` — Vite dev server with CRXJS hot-reload, for live development against Gmail.
- `npm run build` — typecheck (`tsc --noEmit`) then production build to `extension/dist/` (the loadable unpacked extension).
- `npm run typecheck` — type-check only, no build.
- `npm run lint` — ESLint (typescript-eslint + react-hooks + react-refresh; Prettier-compatible).
- `npm run format` / `npm run format:check` — Prettier (default config) write / check.
- `npm run test` — Vitest (jsdom + React Testing Library), single run.
- `npm run icons` — regenerate the throwaway placeholder dev icons (real brand work is in `PRE_LAUNCH_CHECKLIST.md`).

**Load the unpacked extension:** Chrome → `chrome://extensions` → enable Developer mode → "Load unpacked" → select `extension/dist/`.

**Non-obvious gotchas (encoded here so future sessions don't rediscover them):**
- `npm audit` flags 2 high-severity advisories in **dev-only** transitive deps (`rollup` via `@crxjs/vite-plugin`). `npm audit --omit=dev` is clean — nothing vulnerable ships in the extension. Do **not** run `npm audit fix --force` (it breaks the build). This is the accepted CRXJS community-plugin tax (a locked, eyes-open trade-off — see Locked tech decisions).
- The build prints a benign CRXJS-on-Vite-8 warning ("Both `rollupOptions` and `rolldownOptions` … will be ignored"). Content scripts still build and wire up correctly; it is cosmetic and internal to CRXJS.
- `vitest.config.ts` is intentionally excluded from `tsconfig.json`'s `include` (a Vite 8 ↔ Vitest-nested-Vite types skew, not a code defect). Test code under `src/` is still fully type-checked.
- **MV3 entry files must have distinct basenames.** Under Vite 8/Rolldown, CRXJS collapses two entries that share a basename (e.g. `src/background/index.ts` + `src/content/index.ts`) into one chunk, and the service worker silently ends up running the content script's code (no error; onboarding just never opens). The fix already applied: the entries are `src/background/service-worker.ts` and `src/content/content-script.ts`. Do not rename them back to `index.ts`. To sanity-check after a build: `dist/service-worker-loader.js` must import the `service-worker.ts-*` chunk, not the `content-script.ts-*` one.

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

- **Extension:** React + Vite, **TypeScript**, Manifest V3. Build tooling is **Vite + `@crxjs/vite-plugin`**, chosen for content-script hot-reload during development; we explicitly accept that CRXJS is a community plugin that may occasionally lag Vite releases. The TypeScript language layer and the CRXJS build tool were locked on 2026-05-15 — like the other items here, do not re-litigate the language or build-tool choice without explicit user input. (Rationale for TypeScript: the project owner is non-technical and relies on Claude Code for implementation, so compile-time error-catching and explicit code architecture matter more here than for a team that debugs runtime issues fluently.)
- **Backend:** Node + Hono on Fly.io, EU region.
- **Database:** Supabase, EU region.
- **License:** All-rights-reserved / proprietary during v1 development (changed from MIT on 2026-05-15 when the repo went public for portfolio visibility — public to read, no reuse rights granted). The eventual public-launch commercial model (open-source, royalty-on-commercial-use, dual-license, source-available) remains a pre-launch decision. Do not "restore" MIT assuming it's the locked default — the all-rights-reserved choice is deliberate.
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
