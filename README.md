# Fashionably Late

> **Schedule emails at their perfect time.**

Smarter Gmail scheduling: send at the right local time for your recipients, never outside your own working hours.

Fashionably Late **enhances** Gmail's own **Schedule Send** rather than replacing it — native feel, not a branded rebuild. The "Schedule send" option becomes "Schedule Send (powered by Fashionably Late)", the modal gains a few timezone-aware options, and Gmail's familiar interactions and native **Scheduled** label are preserved. It helps your emails land at the right moment, in your recipients' time, not yours.

## What it does

- **Right local time, per recipient.** When you schedule an email, Fashionably Late reads the recipients from your compose window and offers to deliver at a research-backed morning or midday slot in *their* local timezone — so your message arrives during their working day, gets seen, and gets answered instead of buried. Pick a recipient's timezone once and it's remembered, so you never re-pick the timezone for the same person.
- - **A friendly timezone picker.** A searchable, plain-language timezone selector (search by city, country, abbreviation, or UTC offset) with a **Pinned** section for the zones you work across most often.
- **A working-hours guard that stays out of your way.** We'll double-check before sending outside the hours you set. The gentle warning fires **only** on a regular Send that would go out past your working hours — with three clear choices: proceed anyway, snap to your working hours, or cancel. **Scheduling for later is always fine** and never warns — deliberately timing a message for a recipient's window is exactly what the product is for. Avoiding stray after-hours emails protects your professional brand; you stay in control either way.
- **A full settings panel.** Manage your own timezone, pinned timezones, working hours, the locally-cached recipient timezones, and feature toggles — all editable after onboarding.

## Privacy & data

Fashionably Late is **local-first and privacy-first by design.** Everything runs in your browser; nothing leaves your device.

- **Everything is stored locally** in the browser (`chrome.storage.local`). There is no Fashionably Late server, no account, and no backend.
- **No OAuth, no Google API calls.** Recipients are read directly from the compose window; recipient timezones come from a local cache or are entered by you. The only permissions it requests are local storage and access to `mail.google.com` (so it can work inside Gmail).
- **No tracking, no telemetry, no analytics.** Fashionably Late never tracks opens, never builds engagement profiles, and never collects usage data.
- **Email content is never read, stored, or transmitted** beyond what's strictly required to inject the scheduling UI into the compose window.

> **A note on the name.** This project was developed under the working name **"OutboxIQ"** before being renamed **"Fashionably Late"** ahead of launch. If you come across "OutboxIQ" in commit history, older notes, or some internal identifiers, it's the same product.

## Status

Fashionably Late (Free) will be listed on the Chrome Web Store very soon.

## Repository layout

- [`extension/`](./extension) — the Chrome extension (Manifest V3). The whole product, running entirely in your browser.
- [`Fashionably_Late_PRD.md`](./Fashionably_Late_PRD.md) — the full product requirements document and source of truth.
- [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md) — launch obligations and open pre-release items.
- [`notes/`](./notes) — design history and decision log.

This repository is the **Free version** of Fashionably Late — the canonical, open-source, public codebase. A paid Premium tier (with a server-side component) is **out of scope of this project**; if it is ever built, it will be a separate, private project with its own Chrome Web Store listing, not part of this repo.

## Tech stack

TypeScript + React + Vite (with `@crxjs/vite-plugin`), Manifest V3.

## License

Fashionably Late is licensed under the **Apache License, Version 2.0** — see [`LICENSE`](./LICENSE) for the full text and [`NOTICE`](./NOTICE) for the copyright notice. You're free to use, modify, fork, and commercialize the code under the terms of that license.

For commercial inquiries beyond what Apache 2.0 already permits (custom support, indemnification beyond Apache's terms, co-branded distribution, etc.), see [`docs/COMMERCIAL.md`](./docs/COMMERCIAL.md).
