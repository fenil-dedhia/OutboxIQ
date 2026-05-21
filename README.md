# Fashionably Late

> **Status:** v1 in active development — not yet released. Nothing in this repository is production-ready, and APIs, structure, and behavior may change without notice.

**Fashionably Late** is a Chrome extension that makes Gmail's built-in **Schedule Send** smarter. Instead of sending an email the moment you write it, it helps your message land at the *right* moment — in your recipient's local time, during their working day — so it gets seen and answered rather than buried.

It does this without replacing anything you already know. The extension **enhances** Gmail's native scheduling rather than rebuilding it: the "Schedule send" option becomes "Schedule Send (powered by Fashionably Late)", the modal gains new options, and Gmail's familiar interaction patterns and native **Scheduled** label are preserved. The goal is a native feel, not a branded one.

## What it does

- **Recipient-aware scheduling.** When you schedule an email, Fashionably Late reads the recipients from your compose window and offers to deliver at an optimal moment — a research-backed morning or midday slot — in the *recipient's* local timezone, not yours.
- **Working-hours awareness.** If you try to send (or schedule) outside the hours you set during onboarding, a gentle prompt offers to delay delivery to your next working window. It's a soft warning with explicit choices — proceed anyway, snap to your boundary, or cancel — never a hard block or a silent change. You stay in control.
- **A friendly timezone picker.** A searchable, plain-language timezone selector (search by city, country, abbreviation, or UTC offset) with a **Pinned** section for the zones you work across most often.
- **A full settings panel.** Manage your own timezone, pinned timezones, working hours, the locally-cached recipient timezones, and feature toggles — all editable after onboarding.

## Privacy & data

Fashionably Late is **privacy-first, local-first, and GDPR-aligned by design.**

- **Everything is stored locally** in the browser (`chrome.storage.local`). There is no Fashionably Late server, no account, and no backend.
- **It makes no Google API calls and requests no OAuth scopes.** Recipients are read directly from the compose window; recipient timezones come from a local cache or are entered by you. The only permissions it requests are local storage and access to `mail.google.com` (so it can work inside Gmail).
- **No tracking, no telemetry, no analytics.** Fashionably Late never tracks opens, never builds engagement profiles, and never collects usage data.
- **Email content is never read, stored, or transmitted** beyond what's strictly required to inject the scheduling UI into the compose window.

> **A note on the name.** This project was developed under the working name **"OutboxIQ"** before being renamed **"Fashionably Late"** ahead of launch. If you come across "OutboxIQ" in commit history, older notes, or some internal identifiers, it's the same product.

## Repository layout

- [`extension/`](./extension) — the Chrome extension (Manifest V3). The whole product, running entirely in your browser.
- [`backend/`](./backend) — placeholder for a future, separately-deployed server component. Not part of the current extension, and not started yet.
- [`Fashionably_Late_PRD.md`](./Fashionably_Late_PRD.md) — the full product requirements document and source of truth.
- [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md) — launch obligations and open pre-release items.
- [`notes/`](./notes) — design history and decision log.

## Tech stack

TypeScript + React + Vite (with `@crxjs/vite-plugin`), Manifest V3.

### Running it locally

From the `extension/` directory:

```bash
npm install      # first-time setup
npm run build    # type-check + production build to extension/dist/
```

Then load it in Chrome: go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `extension/dist/`.

## License

**All rights reserved.** This repository is public for portfolio and evaluation purposes only — see [`LICENSE`](./LICENSE). No reuse, copying, modification, or distribution is permitted without prior written permission. The eventual public-launch licensing model is a separate decision tracked in [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md).
