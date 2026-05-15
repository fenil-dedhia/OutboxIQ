# Session 1 — Summary

**Date:** 2026-05-14

## What we did

1. **Read the full OutboxIQ PRD** and aligned on the v1 shape: a Manifest V3 Chrome extension that enhances Gmail's "Schedule send", plus a small EU-hosted backend for two specific server-side concerns. The §11 "Do Not Build" list is unusually load-bearing — it explicitly rules out 20 plausible-sounding extensions (no email tracking, no AI rewriting, no analytics dashboards, no separate scheduled-emails view, etc.).
2. **Initialized git locally** and connected the pre-existing empty private GitHub repo at `git@github.com:fenil-dedhia/OutboxIQ.git`. Made the first push. (SSH auth was already set up before the session — no infra work needed there.)
3. **Scaffolded a minimal project structure**, no feature code:
   - `extension/` — Chrome MV3, with planned subfolders `src/background`, `src/content`, `src/pages/{onboarding,settings}`, `src/lib`, `public/icons`, and a minimal `manifest.json` stub.
   - `backend/` — placeholder for the EU-hosted relay service.
   - Project README, per-folder READMEs, and a `.gitignore` covering Node + Chrome extension + Claude Code's local settings.
4. **Resolved 8 clarifying questions**, locking each decision into both the PRD and persistent project memory so they carry into future sessions:
   - **Tech stack** → React + Vite (extension), Node + Hono (backend), Fly.io EU region, Supabase EU. Chosen partly because training-data density for AI-assisted development is itself a first-class criterion.
   - **Google Cloud** → fresh project, just-in-time setup (only when a feature needs it), OAuth in Testing mode, CASA Tier 2 assessment deferred to pre-launch.
   - **Maps APIs** → proxied through the backend (keeps the paid API key out of client code). PRD §7.3.1, §6.1.1, §5.4.1, §7.3.3 all updated for internal consistency.
   - **Privacy Policy & Terms of Service** → drafting deferred until v1 is feature-complete (data flows still in flux); when ready, will host on GitHub Pages from a `docs/` folder in this same repo.
   - **Brand assets** → placeholder icons ("OQ" on a colored square) during dev; real brand work just before Chrome Web Store submission.
   - **Gmail scheduled-send API** → half-day technical spike scheduled. **Not yet started** — but it's the first thing next session. Output to `research/scheduled-send-api-spike.md`.
   - **License** → MIT during development (`LICENSE` added, © 2026 Fenil Dedhia). Royalty-on-commercial-use is the long-term intent; the actual licensing mechanism is a separate decision at pre-launch.
   - **Telemetry** → zero. PRD §9 rewritten to remove the "opt-in telemetry (if implemented)" hedge. Success metrics measured qualitatively.
5. **Created `PRE_LAUNCH_CHECKLIST.md`** capturing all deferred-until-public-launch obligations: CASA assessment, OAuth Production status, Privacy/Terms drafting + hosting, license review, brand & design, Chrome Web Store assets and submission, and production infrastructure cutover.
6. **Added `LICENSE`** (standard MIT, © 2026 Fenil Dedhia).

## Where the repo sits at session end

- `main` is current with GitHub. Three commits total.
- Repo contents: `OutboxIQ_PRD.md` (updated this session), `README.md`, `LICENSE`, `PRE_LAUNCH_CHECKLIST.md`, `.gitignore`, `extension/` (skeleton + manifest stub + README), `backend/` (skeleton + README), `notes/session-1-summary.md`.
- No feature code yet — deliberately.

## What session 2 should start with

1. **Run the Gmail scheduled-send API technical spike.** Half-day. Output goes to `research/scheduled-send-api-spike.md`. Must answer four questions: (a) which approach works for third-party scheduled sends, (b) what its constraints are, (c) what trade-offs we are accepting, (d) what open questions remain. This is **gating** — no Schedule Send feature code, no backend Pub/Sub wiring, and no recipient-cache code may begin until the spike is complete and Fenil has reviewed the output.
2. **Once the spike is reviewed**, begin **PRD §5.1 — first-time user onboarding flow** (welcome → timezone confirmation → working hours → transparency screen → consent and finish). This is the natural starting point because it's self-contained, doesn't depend on the scheduling mechanism the spike will determine, and produces the local-storage state that every other feature reads from.

## Where things live

- **Pre-launch obligations:** `PRE_LAUNCH_CHECKLIST.md` at repo root.
- **Persistent project memory** (loaded automatically next session): `~/.claude/projects/-Users-fenildedhia-Code-Projects-OutboxIQ/memory/`, indexed by `MEMORY.md`.
- **Product spec source of truth:** `OutboxIQ_PRD.md`.
