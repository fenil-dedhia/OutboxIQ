# OAuth smoke runbook (Free v1 — Phase 2 verification)

**What this verifies:** the Free v1 OAuth implicit-grant flow
(`src/background/oauth.ts`, PRD §7.5) end-to-end against live Google,
before any Calendar/People code (Phase 3) is built on top of it. Same
"committed, re-runnable, copy-paste" discipline as
`research/regular-send-smoke.md` (owner-decisions-log Entry 9).

You run this hands-on; it can't be unit-tested (real Google consent,
real Chrome `identity` API). It is **DEV-only** — the `__oqAuth` helper
is stripped from production builds.

> **Account note:** OAuth is in **Testing mode** with an explicit
> allowlist. Use a test-list account (`fenil.h.dedhia@gmail.com` or the
> throwaway). A non-allowlisted account will be refused by Google — that
> is expected, not a bug.

---

## Setup (once)

1. `npm --prefix extension run build`
2. Chrome → `chrome://extensions` → Developer mode ON → **Load unpacked**
   → `extension/dist/` (or **Reload** if already loaded).
3. On the extensions card, click the blue **"Service worker"** link →
   its **Console** tab opens. **Run every command below in that
   console.** (If the link says "Inactive", click it to wake the worker.)

---

## Tests (run in order; copy-paste each line)

### A. First authorization (interactive — the consent screen)

```js
await __oqAuth.clear();           // start clean
await __oqAuth.authorize();
```

A Google window opens. **Expected:**

- It shows an **account chooser** (because `prompt=select_account`). If
  you have **multiple Google accounts signed in, all are listed and you
  can pick** — this is the multi-account requirement; confirm it.
- Pick a test-list account → consent screen lists the **4 scopes**
  (Gmail compose, Gmail modify, Calendar settings readonly, Contacts
  readonly) → **Allow**.
- The console result is `{ ok: true, token: "ya29.…" }`.

✅ Pass: `ok: true` and a token string.
❌ If `{ ok:false, reason:"denied" }` only when you actually clicked
   Allow → record it and stop (surface).

### B. The token actually works (Calendar API)

```js
await __oqAuth.testCalendar();
```

**Expected:** `{ status: 200, body: { value: "America/New_York", … } }`
(your real Calendar timezone). This proves the access token is valid
against a real Google API — the Phase 3 dependency.

✅ Pass: `status: 200` and a plausible IANA `value`.

### C. Cached token is reused (no second prompt)

```js
await __oqAuth.authorize();       // again, immediately
```

**Expected:** returns `{ ok:true, token }` **with no Google window**
(the cached token is still valid). Same token value as test A.

### D. Silent re-issue after expiry

```js
await __oqAuth.expireNow();       // artificially expire the cached token
await __oqAuth.silent();          // silent-only attempt (interactive:false)
```

**Expected:** `{ ok:true, token: "ya29.…" }` **with no window** — Chrome
silently re-issued because your Google session + consent still hold.
The token value should be **new** (differs from test A).

✅ Pass: `ok:true`, no UI, fresh token.
⚠️ If it returns `{ ok:false, reason:"needs_interactive" }`: silent
   re-auth needs UI in your setup (e.g. session cookie cleared). Note
   it — the design escalates correctly (`authorize()` would fix it),
   but record the environment.

### E. Revocation degrades cleanly (no crash)

```js
// Revoke at https://myaccount.google.com/permissions (remove "OutboxIQ"),
// then back in the console:
await __oqAuth.clear();
await __oqAuth.silent();
```

**Expected:** `{ ok:false, reason:"needs_interactive" }` — a clean
typed failure, **no exception**. (`authorize()` then re-consents.)

---

## Result log (fill in when you run it)

```
Date:
Chrome version:
Account(s) used:

A first authorize  :  PASS / FAIL  — notes:
B testCalendar     :  PASS / FAIL  — tz returned:
C cached reuse     :  PASS / FAIL
D silent re-issue  :  PASS / FAIL
E revoke degrade   :  PASS / FAIL
Multi-account chooser seen with >1 account signed in:  YES / NO / N/A (only 1 account)
```

> Phase 3 (Calendar/People cascade) is **gated on A–D passing**. If
> anything fails, paste the console output back — do not proceed.
