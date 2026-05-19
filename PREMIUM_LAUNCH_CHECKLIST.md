# Fashionably Late — Premium v1 Launch Checklist

Gates that must be completed **before Fashionably Late *Premium v1* can be made
publicly available**. Premium v1 is the **extension + backend, paid** tier
— a parallel tier of the *same* generation as Free v1, **not "v2"** and
**not a sequential version**. It is built **after Free v1 launches and
validates demand**; a Free v1 user *upgrades* to Premium (no forced
migration). This file is a living document.

> **Origin (2026-05-17, owner-directed — `notes/owner-decisions-log.md`
> Entry 32; PRD §13).** Fashionably Late was split into Free v1 (extension-only,
> no backend — the public-launch target, `PRE_LAUNCH_CHECKLIST.md`) and
> Premium v1 (this file). Implementation work across Sessions 5–7
> surfaced that the cost-to-ship of the full PRD scope (CASA Tier 2;
> backend infra; per-user encryption; ongoing hosting; EU compliance
> posture) is substantial, while the PRD's **core value proposition —
> recipient-aware Schedule Send with Optimize-for-recipient — is fully
> deliverable with no backend**. Unschedule-on-Reply (PRD §13.1) is the
> only PRD-specified feature requiring backend-initiated Gmail calls, so
> it (and the backend it needs) tier-gates cleanly to Premium v1.
> **Nothing here is deleted scope** — the full design is preserved intact
> in **PRD §13**. Prior locked decisions (Entry 26 single-purpose /
> Maps-removal; Entry 31 Option-B token architecture) are **not reopened
> or rewritten** — they remain the binding design for the Premium v1
> backend (Entry-4 discipline: locked against drift, not against the new
> fact that Unschedule-on-Reply is tier-gated).

> **Status:** Premium v1 is **not started and is not the next work**.
> Free v1 is the active track. This checklist exists so the Premium gates
> (several of which have multi-week / several-thousand-USD lead times)
> are tracked from now, not discovered late.

> **Scope discipline (carried from CLAUDE.md / PRD §13.2.1).** The
> Premium backend exists for **exactly one purpose — Unschedule-on-Reply
> and the OAuth token management that structurally enables it**. No
> analytics, telemetry, profiles, or content storage. Do not add "while
> we're here" endpoints. The single-purpose boundary and the
> Maps-removal narrowing carry forward intact.

---

## CASA security assessment — Tier 2 (required, deferred)

Google classifies the Gmail scopes Fashionably Late uses (`gmail.compose`,
`gmail.modify`) as **restricted scopes**. Any app requesting restricted
scopes from users outside the test-user list must pass a CASA security
assessment by a Google-approved third-party auditor (e.g., Bishop Fox,
NCC Group, Leviathan).

- **Why Tier 2 specifically (Premium):** Premium v1 both (a) uses
  restricted scopes **and** (b) operates a backend (the
  Unschedule-on-Reply relay) that handles user data and OAuth **refresh
  tokens**. That combination places Premium v1 in **Tier 2, not Tier 1**.
  (Free v1, with no backend and no refresh tokens, is plausibly only
  Tier 1 — that lighter assessment is tracked in
  `PRE_LAUNCH_CHECKLIST.md` and is a *separate*, Free-v1 gate.)
- **Typical cost:** several thousand USD.
- **Typical turnaround:** 4–8 weeks.
- **Audited surface:** primarily **backend token storage** — the
  per-user-encrypted refresh-token scheme (PRD §13.2.4 / §13.3). The
  per-user encryption-key strategy below is *central* to passing.
- **Trigger to begin:** when Premium v1 is feature-complete and we are
  ready to invite real users to the paid tier beyond the test allowlist.
- **Reference:** https://support.google.com/cloud/answer/13465431

---

## Backend infrastructure

> Moved from `PRE_LAUNCH_CHECKLIST.md` "Infrastructure" by the tier split
> (Entry 32). The **first working dev/staging instance** is Premium v1
> *build* scope (a Premium build session); the items below are the
> **production-hardened** deployment that gates Premium v1 *launch*.
> (Under the pre-tier-split Entry-31 assumption a working backend was a
> "Session-8 prerequisite for OAuth"; that prerequisite framing now
> belongs to the Premium build, since Free v1's OAuth is extension-side
> `access_type=online` with no backend — see PRD §7.5.)

- Production **Fly.io** app deployed in a confirmed **EU** region
  (Frankfurt or Amsterdam) — GDPR data-residency. (Locked tech: Node +
  Hono on Fly.io EU — CLAUDE.md "Locked tech decisions", Premium-tier.)
- Production **Supabase** project in an **EU** region. (Locked tech:
  Supabase EU — same.)
- **Per-user encryption-key strategy** for OAuth refresh tokens reviewed
  and documented. **Central to CASA Tier 2** — the audited surface is
  backend token storage (PRD §13.2.4).
- **Backup and disaster-recovery** plan for the backend database
  documented.
- **Custom domain** configured for the backend and listed in Google
  OAuth authorized domains. *(Distinct from the owned domain Free v1
  needs for its consent-screen Privacy/ToS URLs — that one is a Free v1
  concern under `PRE_LAUNCH_CHECKLIST.md` "Naming / rebrand readiness"
  and needs no backend.)*

---

## OAuth — switch from `access_type=online` (Free v1) to `access_type=offline` (Premium v1, Option B)

Free v1 ships with the **Session-7 Web-application OAuth client** used
with `access_type=online` — access tokens only, **no refresh token, no
backend** (PRD §7.5). Premium v1 keeps the **same client** and switches
**only** `access_type` online→offline, activating the **Entry-31 Option
B** flow (preserved verbatim and **still locked** in **PRD §13.3**):

- Switch the OAuth request to `access_type=offline` (+ `prompt=consent`
  as needed to guarantee a refresh token is issued).
- Stand up the backend `POST /auth/exchange` (server-side code→token
  exchange; **Client Secret in backend env only** — PRD §6.5 binding
  here, no exception), `POST /auth/token` (mint short-lived access
  tokens from the stored refresh token), `POST /auth/revoke`.
- Refresh tokens stored **only on the backend**, per-user-encrypted.
  The extension still **never** persists a refresh token.
- **Do NOT relitigate Option A (PKCE-in-extension) vs Option B** — that
  remains rejected/locked (Entry 31, Entry-4 discipline). The tier split
  did not reopen it.
- Re-verify the Entry-31 graceful-degradation consequence in the Premium
  context: a backend outage degrades Calendar/People to the §6.7
  fallbacks (browser tz / manual) and disables Unschedule-on-Reply for
  the session — it must never block the user (PRD §13.3 / §6.7).

---

## Legal — backend-processing addendum

Free v1's Privacy Policy / Terms of Service describe **local-first-only**
processing (`PRE_LAUNCH_CHECKLIST.md` "Legal"). Premium v1 **adds**
language for the backend processing — it is an *addendum layered on*
the Free v1 docs, not a rewrite:

- Backend storage: per-user-encrypted OAuth **refresh token**, user
  email, active scheduled-message records (`{ message_id, thread_id,
  recipient_emails[], scheduled_send_time, … }`) — **no email content**
  (PRD §13.2.4).
- **EU data residency** (Frankfurt/Amsterdam) and encryption-at-rest.
- The Unschedule-on-Reply data flow and Gmail push-notification
  subscription (PRD §13.1).
- Lawful basis: **explicit consent** at Premium feature opt-in (PRD
  §6.1.2). GDPR rights to access/erasure cover backend data too
  (`GET /export`, `DELETE /user`).
- This is **correct legal framing for the additional data Premium
  touches — not a tiering of compliance** (Entry 32 / PRD §6.1
  amendment). Both tiers are GDPR-compliant.

---

## Free → Premium upgrade / migration story

A Free v1 user upgrading to Premium is **not** a forced version
migration — it is an in-place tier upgrade. Define and build:

- **Re-authorization:** the user must re-consent to grant the **offline**
  access the backend needs (Free v1 only ever held an online grant; no
  refresh token exists to migrate). Same OAuth client, same scopes
  (§6.6) — the change is `access_type` + backend refresh-token storage,
  so the user sees a fresh consent. Make this a clear, explained step
  (PRD §8.5 "explain the why").
- **State carry-over:** local `chrome.storage.local` state (preferences,
  working hours, recipient cache) is unchanged and carries over as-is —
  Premium adds the backend, it does not move local data to it.
- **Downgrade / cancellation:** on downgrade or Premium cancellation,
  revoke the backend grant (`POST /auth/revoke`), delete the stored
  refresh token and scheduled-message records, and fall back cleanly to
  Free v1 behaviour (extension-side online OAuth) with no data loss of
  local state.
- **No dark patterns:** upgrading must not degrade or hold hostage any
  Free v1 capability (Free v1 stays fully featured and self-contained —
  the single-user-value invariant, `PRE_LAUNCH_CHECKLIST.md`
  "v1 vs. v2 decisions" network-effect entry, applies to tiering too).

---

## Subscription / billing infrastructure

- Payment processor selection (Stripe or equivalent) and integration.
- Plan / pricing definition (pricing **TBD** — owner decision, not yet
  made).
- Entitlement check: the extension/backend must gate Premium features on
  an active subscription, failing **safe** (a billing/entitlement
  outage must not break Free v1 behaviour or block the user — same
  graceful-degradation discipline as §6.7).
- Billing-related data is subject to the same minimization and the
  single-purpose boundary (no analytics/telemetry piggy-backed on it).
- Refund / dunning / cancellation flows.

---

## Other Premium-specific gates

- **Premium OAuth consent screen review.** The offline grant + backend
  may surface additional Google verification requirements beyond Free
  v1's (the backend authorized domain, the offline access justification).
  Re-check at the Premium Production switch.
- **Workspace compatibility for the backend path.** Free v1's Workspace
  check (`PRE_LAUNCH_CHECKLIST.md`) covers Schedule Send; Premium adds
  Gmail push-notification (`users.watch`) behaviour on Workspace tenants
  — verify separately (admin-controlled Pub/Sub / push constraints).
- **Backend security hardening:** refresh-token rotation (PRD §6.5),
  CSP, secrets in env only, rate-limit / abuse protection on the public
  `/push/gmail` webhook.

---

*Items get added as the Premium v1 track is planned. Free v1 launch gates
live in `PRE_LAUNCH_CHECKLIST.md`; the full preserved Premium design is
PRD §13.*
