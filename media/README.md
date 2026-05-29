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
| `symbol-only.png` | The clock/arrow symbol alone (from `Original Logo Symbol.png`). | Small-size marks where the wordmark would be illegible (toolbar icon, inline header marks). |

**Missing input:** the session brief referenced a `Wordpress.png` dark-mode
variant for `logo-dark.png`; that file was not in `_branding-inputs/`, so the
dark-mode raster is not produced. Flagged at the Phase 1 gate.

## web-store/

Populated in Phase 6: store icon, small promo tile (440×280), marquee
(1400×560), and `screenshots/` (owner captures these from live Gmail).

## social/

Optional social-profile crops; not produced this session unless requested.
