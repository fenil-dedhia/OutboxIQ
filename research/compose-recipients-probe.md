# §5.3.5 Compose-Recipients DOM Probe

**Date:** 2026-05-19
**Status:** ✅ Run hands-on against live Gmail (Session 10 follow-up).
**Result:** `extension/src/content/compose/compose-recipients.ts`
re-anchored on probe-verified selectors; replaced the broken v1 anchors
(`input[name="to"|"cc"]` + doc-wide `[email]`).
**Depends on:** `research/scheduled-send-api-spike.md` (chevron anchor),
`research/send-button-probe.md` (probe artifact shape).
**Why this matters:** §5.3.5 Optimize-for-X is invisible if recipient
enumeration returns `[]`. Free v1 has no Google API, so the compose DOM
**is** the recipient source — getting these anchors right is the whole
gating piece for §5.3.5 working at all.

This document is a canonical recipe reference, same role as the spike
and the send-button probes. When Gmail breaks the compose-recipient
shape post-launch, re-run this probe to rediscover anchors.

The runnable script is **`research/compose-recipients-probe.js`** (single
source). This file is the how-to-run + context + the original-shape
result log; it does not duplicate the script.

---

## What this probe answers

1. **Where do recipient chips live in modern Gmail compose?** Scoped to
   the compose pane (not the whole document — the v1 mistake was a
   doc-wide `[email]` matching 477 inbox sender chips).
2. **Which attributes are stable identity?** `data-hovercard-id` for
   email, `data-name` for display name.
3. **Are there multiple representations of the same chip?** Yes —
   `div[role="option"]` interactive chips AND `span[email]` hidden
   a11y twins. We anchor on the divs; the spans have no walkable
   field-of-origin ancestor and would conflate To/BCC.
4. **How to partition To / CC / BCC?** Walk up to the nearest ancestor
   with an `aria-label` whose lowercased text matches `bcc|blind`
   (checked first), `cc|carbon`, or `to|recipients`. Locale-DEPENDENT
   — accepted, same trade-off the chevron `aria-label` already takes.

---

## How to run

1. Open Gmail, open a fresh compose window.
2. Add at least one address to **To:** (and ideally one to **CC:** so
   both partitions are exercised). Add at least one fresh-typed address
   so we see the "never-emailed" (`data-name` empty) shape too.
3. DevTools (⌘⌥I) → Console.
4. Paste the entire contents of `compose-recipients-probe.js` into the
   console, hit Enter.
5. Run `__flComposeProbe.discover()`.

The probe prints, scoped to each compose pane:
- a **Selector survey** table (which heuristics matched, how many),
- **Chip detail** for the highest-signal heuristic (every attribute,
  extracted email, inferred To/CC, parent attributes),
- a **Ranked anchor recommendations** table.

It is **read-only** — no events dispatched, no storage writes, no
network. Safe on any account.

---

## Original-shape result log (2026-05-19)

Account: a personal Gmail. One compose pane open. To: one resolved
recipient (Gmail history → display name present), CC: one
fresh-typed recipient (never emailed → display name absent).

```
composeCount = 1

Selector survey (pane-scoped):
  [email]                                   2
  [data-hovercard-id]                       4   ← 2 div chips + 2 span a11y twins
  div[role="option"]                        3   ← 2 chips + 1 autocomplete artifact
  span[name]                                0
  [data-name]                               2
  [aria-label*="@"]                         0
  [role="listbox"]                          5
  div[tabindex="-1"][role="listbox"] > div  4

Chip detail (matched by [data-hovercard-id]):
  chip #1   div[role="option"][peoplekit-id="XPtOyb"]
            data-hovercard-id = "fenil.h.dedhia@gmail.com"
            data-name         = "Fenil Dedhia"
            inferred field    = To
            parent            = div[peoplekit-id="ubaLBe"].agb

  chip #2   div[role="option"][peoplekit-id="XPtOyb"]
            data-hovercard-id = "anonymouslooneyhat@gmail.com"
            data-name         = ""               ← never-emailed
            inferred field    = CC
            parent            = div[peoplekit-id="ubaLBe"].agb

  chip #3   span[email][data-hovercard-id]       ← hidden a11y twin
            (parent #:1a6 class="oL aDm az9" — the collapsed-summary
             container; no walkable aria-label ancestor; do NOT anchor here)

  chip #4   span[email][data-hovercard-id]       ← hidden a11y twin (CC)
```

---

## Locked anchors (current — implemented in `compose-recipients.ts`)

```
SEL_CHEVRON  = 'div[role="button"][aria-label="More send options"]'
               (re-used from gmail-recipe.ts — single source of truth)

SEL_CHIP     = 'div[role="option"][data-hovercard-id]'
               (probe-verified: exactly one match per To/CC chip
                inside the compose pane; no doubles via the hidden
                a11y span twin; no peoplekit-id coupling)

email        = chip.getAttribute("data-hovercard-id")
displayName  = chip.getAttribute("data-name") || null
field        = walk-up aria-label test:
                 /\bbcc\b|\bblind\b/   → BCC  (checked FIRST — privacy)
                 /\bcc\b|\bcarbon\b/   → CC
                 /\bto\b|\brecipients\b/ → To
                 (else null — chip is dropped, never bucketed wrong)
```

## What we deliberately do NOT anchor on

- **`peoplekit-id="XPtOyb"`** — Google-internal widget identity, looks
  obfuscated, likely to drift.
- **`class="afV"` / `class="agb"`** — Gmail's obfuscated CSS classes
  drift even more.
- **`span[email]` a11y twins** — present, but their parent is the
  collapsed-summary container with no aria-label, so field-of-origin
  is unknowable. Anchoring there would conflate To/BCC and break the
  spec (b) privacy contract.
- **Doc-wide `[email]`** — the v1 mistake. The inbox sender chips,
  conversation list, etc. all carry the `email` attribute too; outside
  the compose pane they are noise (477 matches in the live capture).

## When Gmail breaks this

Re-run the probe. If `SEL_CHIP` count drops to 0 in a compose with
known recipients, find the new chip shape in the **Chip detail** dump
(the probe walks several heuristics and shows whichever still works).
Update `compose-recipients.ts:SEL_CHIP` in one place. The
`fieldOfChip()` walk-up logic is independent and very likely still
works as long as the row container keeps an aria-label.
