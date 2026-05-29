# Session 20 — Marketing landing page for fashionablylate.app

> Site/web work, NOT extension code. No changes under `extension/src/`; no §11 /
> manifest / schema impact; test count, `SCHEMA_VERSION` (4), and version
> (`1.0.0`) all unchanged. A deliberate new artifact: the apex landing page at
> `fashionablylate.app`, built with inboxymail.com as a *structural* reference
> (skeleton only, our own content/brand). Built entirely from shipped,
> customer-facing copy — no new product claims invented.

## §a — What landed

1. **`docs/index.html` — standalone marketing landing page.** Front matter
   `layout: null` opts the page OUT of the `_config.yml` `defaults` block (which
   applies the Primer `default` layout to every other page). Fully
   self-contained: its own `<head>`, its own `<style>` block (no Primer CSS, no
   external fonts/CDNs, no analytics, no third-party scripts — mirrors the
   product's no-tracking promise). Every CSS rule is namespaced under `.fl-page`
   as a belt-and-suspenders scope guard. Sections, in inboxy's order with our
   content: header (logo + wordmark / "Open source" GitHub link) → hero
   (tagline + benefit headline + lede + two CTAs + hero screenshot) → "What it
   does" (3 alternating blocks) → Highlights (6-card grid, inline brand-color
   SVG icons) → "Private by design" (4-point checklist + legal links) → "A
   closer look" (3 real screenshots + captions) → footer (repeat CTA + Privacy ·
   Terms · GitHub + "Built by Fenil Dedhia").

2. **Removed the old stub `docs/index.md`** (it held only a one-line blurb +
   legal links). Necessary: Jekyll cannot have both `index.md` and `index.html`
   at the same path. Its legal links are superseded by the richer page's footer
   + privacy section.

3. **Assets copied into `docs/` (GitHub Pages serves only from `docs/`).**
   `docs/assets/symbol.svg` (the teal SymbolMark, from `media/logo/`),
   `docs/assets/og-image.png` (the real 1400×560 promo marquee, reused as the
   OG/Twitter card image), and five **raw** screenshots (NOT the store-ready
   1280×800 padded versions) into `docs/assets/screenshots/`:
   `schedule-optimize`, `schedule-modal`, `pinned-timezones`, `privacy-data`,
   `onboarding`.

4. **Copy is reused/adapted from shipped surfaces** — onboarding Welcome
   ("land at the right moment, in your recipients' time, not yours"; "what you
   get in return"), the README ("right local time, per recipient"; the
   working-hours-guard paragraph; the privacy bullets), the tagline "Schedule
   emails at their perfect time", and the manifest single-purpose framing. Voice:
   warm, plain, benefit-first.

5. **SEO/GEO.** Descriptive `<title>` + meta description using natural search
   terms ("schedule Gmail emails in your recipient's time zone"); honest Open
   Graph + Twitter tags pointing at a real asset; `<link rel="canonical">`.
   Declarative, factual sentences in the hero + privacy section so an AI summary
   gets "what it is / who it's for / privacy posture" right. No keyword-stuffing.

## §b — The CTA decision (honest, per the prompt)

The extension is **not** live on the Chrome Web Store yet, so the primary CTA is
a **non-clickable** "Coming soon to the Chrome Web Store" pending button —
styled as *awaiting launch* (white/muted surface, dashed teal border, clock
icon, `role="button" aria-disabled="true"`, default cursor, **no `href`**), not
a dead link. The genuinely-clickable action is the secondary **"View source on
GitHub"** (real link to `https://github.com/fenil-dedhia/fashionably-late`),
rendered as the solid AA-safe teal button so the real action reads as primary.

**The one pending swap at launch:** replace the pending `<span>` with the live
Web Store link/badge. The exact swap site is marked with a prominent code
comment in `docs/index.html` (hero), and an identical pending CTA in the footer
carries a pointer comment to swap both together. Owner may instead prefer the
official "Available in the Chrome Web Store" badge image — drop-in at the same
spot, a one-element change.

## §c — Brand fidelity

Mirrors the extension per `media/palette.md` (Entry 57/58): **Moonstone
`#5EB1BF`** used only as logo/accent + the hero background (never as white-text
or link color — it fails AA at 2.47:1); **`#367B87` (700)** for buttons, links,
and icons on white (4.84:1 AA); `#295F68` (800) for hover/strong-accent text;
`#EFF7F8` (50) tint backgrounds; `#B6DCE2` (200) borders. The hero uses **dark
ink** on Moonstone (`#0e2c31` on `#5EB1BF` ≈ 8.5:1) — accessible. System font
stack (the wordmark is the only typeset brand element). Real logo SVG reused, not
redrawn.

## §d — Confidence / verification (programmatic vs live — honest split)

- **Verified programmatically:** valid YAML front matter; **no Liquid tokens**
  (`{{`/`{%`) anywhere in the body or CSS (won't break the Jekyll build); HTML
  tag balance (parser, zero unclosed); every `/assets` + `/favicon` reference
  resolves to a file under `docs/`. Rendered the page in headless Chrome (Beta)
  at desktop + mobile widths — layout, palette, type, all six highlight icons,
  the alternating feature blocks, the privacy checklist, the screenshot grid,
  and the dark footer all render correctly. Measured `scrollWidth` to catch
  horizontal overflow; added a ≤480px breakpoint (smaller headline, full-width
  buttons) + `overflow-wrap` so it fits true ~360px phones.
- **NOT verifiable locally (S18 gap, stated honestly):** there is **no Jekyll
  toolchain in this environment**, so the real `layout: null` opt-out, the
  `{% seo %}`-free head, and GitHub Pages routing can only be proven by the live
  Pages rebuild. The headless render used a front-matter-stripped copy with
  rewritten relative asset paths — it proves the HTML/CSS, not the Jekyll build.
  **Owner must confirm on the live site:** (1) `fashionablylate.app` shows the
  new landing page (not the Primer-wrapped stub); (2) `/legal/privacy` and
  `/legal/terms` still render **unchanged** with the Primer layout + logo header.

## §e — Scope discipline

No new product features or claims (§11 still bounds what we can say) — every
benefit on the page maps to a shipped surface. No screenshot is mislabeled: the
after-hours-warning shot isn't in the captured set, so the "gentle nudge" block
uses an inline clock **illustration** (clearly decorative) rather than passing
off an unrelated screenshot. No extension code touched.

## §f — Files added / changed

- **Added:** `docs/index.html`; `docs/assets/symbol.svg`;
  `docs/assets/og-image.png`; `docs/assets/screenshots/{schedule-optimize,
  schedule-modal,pinned-timezones,privacy-data,onboarding}.jpg`.
- **Removed:** `docs/index.md` (stub, superseded).
- **Edited:** `CLAUDE.md` (current-state line — landing page + the one pending
  CTA swap); `notes/owner-decisions-log.md` (close-out line); this summary.
- **Untouched (verified):** `docs/_config.yml`, `docs/_layouts/default.html`,
  `docs/_includes/head-custom.html`, `docs/legal/*`.

## §g — Owner-decisions-log entries this session

**None.** The CTA approach (honest "coming soon" pending button + GitHub
secondary + marked swap site) was specified in the owner's session prompt, not a
mid-build trajectory fork — no counterfactual to record. Logged as
`Session 20 — no entries this session.` per the close-out obligation.

## §h — Post-session: what's left before public launch

Owner-parallel, unchanged from S19 except the site is now built:

1. **Confirm the live Pages rebuild** (the §d two-point check) — this is the
   only outstanding verification for the page itself.
2. Chrome Web Store **listing copy** + **submission** (the screenshots are
   captured; assets generated S18).
3. At launch: **swap the pending CTA** for the live Web Store badge/URL in
   `docs/index.html` (hero + footer; swap site comment-marked).

No code/doc-hardening session is planned; the extension remains
feature-complete at 376 tests, `SCHEMA_VERSION` 4, v1.0.0.
