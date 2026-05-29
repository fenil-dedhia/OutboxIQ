# media/ — brand & marketing assets (NOT shipped)

Version-controlled source assets for branding, the GitHub Pages site, and the
Chrome Web Store listing. **None of this ships inside the extension `.crx`** —
shipped icons live in `extension/public/icons/`. This folder is the source of
truth those are derived from.

Brand primary: **Moonstone `#5EB1BF`** (Entry 57). The provided logo art used
`#40bfc1`; both working SVGs below are recolored to `#5EB1BF` so logo and UI
match. Full palette + role assignments: see Phase 1 of `session-18`.

## logo/

| File | What it is | When to use |
|------|------------|-------------|
| `logo.svg` | Symbol + wordmark, transparent bg, recolored to `#5EB1BF`. **Working source.** | Anywhere the full lockup is needed on a light/unknown bg. Scales cleanly. |
| `logo-on-white.svg` | Same lockup with a baked white background, recolored. | Contexts that need an opaque white plate behind the mark. |
| `logo-on-white.png` | Raster fallback of the white-bg lockup (from `Original Logo.png`). | Fallback where SVG isn't accepted. |
| `logo-transparent.png` | Raster fallback of the transparent lockup (from `Transparent Logo.png`). Note: original `#40bfc1` teal, not recolored. | Fallback only; prefer the recolored SVG. |
| `icon-source.svg` | **App/extension icon source.** Moonstone `#5EB1BF` rounded-square plate + the symbol in WHITE. **Source for icon-16/32/48/128 + favicon.ico.** | The shipped Chrome icon (toolbar, extensions page, Web Store) + the site favicon. |
| `symbol-only.svg` | The clock/arrow symbol alone (teal hands + black art), transparent, square viewBox. | In-product inline marks (onboarding, Settings header, modal) where a transparent symbol sits on the page. |
| `symbol-only.png` | Raster of the symbol alone (from `Original Logo Symbol.png`, original teal). | Fallback; prefer `symbol-only.svg`. |

**Missing input:** the session brief referenced a `Wordpress.png` dark-mode
variant for `logo-dark.png`; that file was not in `_branding-inputs/`, so the
dark-mode raster is not produced. Flagged at the Phase 1 gate.

## web-store/

Chrome Web Store listing assets (teal `#5EB1BF` background, white logo —
owner-chosen; tagline "Schedule emails at their perfect time.").

| File | Size | Use |
|------|------|-----|
| `icon-128.png` | 128×128 | Store listing icon (teal plate, white symbol; slightly more padding than the shipped `extension/public/icons/icon-128.png`). |
| `promo-small-440x280.png` | 440×280 | Small promo tile. **Exact** dims required. |
| `promo-marquee-1400x560.png` | 1400×560 | Marquee promo. **Exact** dims required. |
| `screenshots/README.md` | — | Capture guide for the 1–5 listing screenshots (owner captures from live Gmail). |

Honest note: the promo tiles are algorithmically composed (correct dims,
colors, crisp logo + tagline) but not designer-grade. Redo in Canva if they
don't pass the eye-test — the source palette/logo are here to reuse.

## social/

Optional social-profile crops; not produced this session unless requested.
