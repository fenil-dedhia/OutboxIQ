# OutboxIQ — Pre-Launch Checklist

Items that must be completed **before** OutboxIQ can be made publicly available (e.g., listed on the Chrome Web Store, or made available to users beyond an explicitly-allowlisted test group). This file is intentionally a living document — items get added as decisions are made during development.

> **Status:** v1 is in early development. None of the items below are blocking day-to-day feature work, but several have multi-week lead times, so they must be tracked.

---

## Google / OAuth

### CASA security assessment (Tier 2) — required, deferred

Google classifies the Gmail scopes OutboxIQ uses (`gmail.compose`, `gmail.modify`) as **restricted scopes**. Any app requesting restricted scopes from users outside the test-user list must pass a **CASA Tier 2** security assessment, which is conducted by a Google-approved third-party auditor (e.g., Bishop Fox, NCC Group, Leviathan).

- **Why Tier 2 specifically:** OutboxIQ both (a) uses restricted scopes and (b) operates a backend (the Unschedule-on-Reply relay) that handles user data and OAuth refresh tokens. That combination places it in Tier 2, not Tier 1.
- **Typical cost:** several thousand USD.
- **Typical turnaround:** 4–8 weeks.
- **Trigger to begin:** when v1 is feature-complete and we are ready to invite real users beyond the OAuth test-user allowlist.
- **Until then:** we operate in **OAuth Testing mode** with a small set of explicitly-added test users. This is fully functional for development; it just can't be used by the general public.
- **Reference:** https://support.google.com/cloud/answer/13465431

### OAuth consent screen — Production status

- Currently in **Testing mode**.
- Switching to **Production** requires Google verification of the app's homepage, Privacy Policy URL, Terms of Service URL, and authorized domains.

### App branding for OAuth consent screen

- Verified app name, logo, support email, and authorized domains.

---

## Legal

- **Privacy Policy.** Draft is intentionally deferred until v1 is feature-complete — the exact data flows (Maps proxy specifics, refresh-token encryption scheme, backend storage shape) may still shift, and the policy must accurately describe what the software actually does. When drafted, host as `docs/privacy.md` on **GitHub Pages** from this same repository. The OAuth consent screen, the extension's onboarding flow, and the Settings panel will hard-code the resulting stable URL.
- **Terms of Service.** Same deferral and same hosting plan: `docs/terms.md` on GitHub Pages.
- **License review.** v1 ships under **MIT** during development (see `LICENSE` at repo root). The long-term intent is a **royalty-on-commercial-use** model — free for personal/non-commercial use, paid for commercial use. MIT does not encode that. Before public launch, pick the actual mechanism: custom license, dual-licensing (e.g., MIT + commercial), source-available license (Elastic v2, BUSL), or a paid hosted SaaS layer on top of MIT. Decision should be made with awareness of contributor expectations and any contributions accepted under MIT to date.
- Privacy Policy and Terms of Service are linked from the extension's onboarding flow and the Settings panel, per PRD §5.1.3 and §5.8.2.

---

## Brand & Design

- **Brand identity finalized.** Logo, color palette, typography direction. v1 development uses **placeholder icons** (a colored square with "OQ" text or similar minimal mark). PRD §8.1 ("native feel over branded feel") means OutboxIQ's in-Gmail surface intentionally does not lean on brand — brand mainly shows up in the Chrome Web Store listing, the OAuth consent screen, and the onboarding flow.
- **Extension icons (16, 48, 128 PNG).** Production-quality artwork, replacing the placeholders in `extension/public/icons/`.
- **Scheduled-email badge artwork.** The small indicator on OutboxIQ-scheduled emails in Gmail's Scheduled label (PRD §5.7.2). Final, polished version.
- **OAuth consent screen logo.** 120×120 minimum, follows Google's OAuth branding requirements.
- **Chrome Web Store listing assets.** Promotional images (440×280 small tile, 920×680 marquee), screenshots (1280×800 or 640×400, up to 5), short description, detailed description, support email.
- **Trigger:** before Chrome Web Store submission. Fenil intends to commission or design these assets — does not need to happen during feature development.

---

## Chrome Web Store

- Chrome Web Store developer account created and verified.
- Store listing prepared: description, screenshots, promotional images, support links.
- Submission and review. Extensions requesting sensitive permissions typically take 1–3 weeks to review.

---

## Infrastructure

- Production Fly.io app deployed in confirmed EU region (Frankfurt or Amsterdam).
- Production Supabase project in EU region.
- Per-user encryption-key strategy for OAuth refresh tokens reviewed and documented.
- Backup and disaster-recovery plan for the backend database documented.
- Custom domain configured for the backend and listed in Google OAuth authorized domains.

---

*Items get added to this file as development surfaces new launch requirements. If you're reading this years from now and something feels missing — it probably is.*
