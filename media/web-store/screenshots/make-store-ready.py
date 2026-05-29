#!/usr/bin/env python3
# Copyright 2026 Fenil Dedhia
# SPDX-License-Identifier: Apache-2.0
#
# Standalone asset utility (NOT a build step, NOT a project dependency).
# Makes the raw Web Store screenshots store-ready: exactly 1280x800, 24-bit RGB
# PNG (no alpha), output to store-ready/.
#
# Strategy: CONTAIN (scale-to-fit, no crop) + SOLID #616065 padding.
# The screenshot is scaled to fit fully inside 1280x800 (nothing cropped), and
# the leftover letterbox is filled with a single flat color, #616065 — which is
# Gmail's own chrome grey, so the pad reads as a clean extension of the app
# background rather than an obvious bar (owner-chosen color).
#
# Two things make it look clean rather than sloppy:
#  - The vertical slack is split bottom-heavy (TOP_FRAC) so low-sitting content
#    like an open dropdown gets comfortable breathing room beneath it.
#  - EDGE_TRIM shaves a margin off each raw edge. The LEFT/RIGHT trim is wider
#    (EDGE_TRIM_X) specifically to cut past the browser window's ROUNDED BOTTOM
#    CORNERS — without it, the white page-background captured outside the corner
#    curve survives as little white triangles sitting against the grey pad
#    (the "rounding / white spots on the padding" we were chasing). White-page
#    screenshots (onboarding/settings) have legitimately white corners and are
#    unaffected — there's no artifact to remove there.
#
# (Supersedes the flat-median pad, the full-bleed cover crop, and the blurred
# edge-extension — owner settled on this solid #616065 fill.)
#
# Originals are never modified — outputs go to a NEW subfolder.

import sys
from pathlib import Path

from PIL import Image

TARGET_W, TARGET_H = 1280, 800
FILL = (0x61, 0x60, 0x65)   # #616065 — Gmail chrome grey (owner-chosen pad color)
EDGE_TRIM_Y = 2             # px shaved off top & bottom raw edges (border/AA)
EDGE_TRIM_X = 14            # px shaved off left & right — clears the rounded
                            # browser-window corners (white spots) at the bottom
TOP_FRAC = 0.40             # share of vertical slack put ABOVE the image (rest below)
SRC_DIR = Path(__file__).resolve().parent
OUT_DIR = SRC_DIR / "store-ready"
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}


def process(src_path: Path) -> dict:
    with Image.open(src_path) as im:
        img = im.convert("RGB")  # drops any alpha

        # Trim the noisy outermost ring; wider on the sides to clear the
        # window's rounded bottom corners (see header note).
        w, h = img.size
        if w > 2 * EDGE_TRIM_X and h > 2 * EDGE_TRIM_Y:
            img = img.crop(
                (EDGE_TRIM_X, EDGE_TRIM_Y, w - EDGE_TRIM_X, h - EDGE_TRIM_Y)
            )
        w, h = img.size

        # CONTAIN: fit fully inside the target, nothing cropped.
        factor = min(TARGET_W / w, TARGET_H / h)
        new_w, new_h = max(1, round(w * factor)), max(1, round(h * factor))
        scaled = img.resize((new_w, new_h), Image.LANCZOS)

        # Solid #616065 canvas; paste the screenshot bottom-heavy.
        canvas = Image.new("RGB", (TARGET_W, TARGET_H), FILL)
        off_x = round((TARGET_W - new_w) * 0.5)
        off_y = round((TARGET_H - new_h) * TOP_FRAC)
        canvas.paste(scaled, (off_x, off_y))

        out_path = OUT_DIR / f"{src_path.stem}-1280x800.png"
        canvas.save(out_path, format="PNG")

    top_bar = off_y
    bottom_bar = TARGET_H - (off_y + new_h)
    left_bar = off_x
    right_bar = TARGET_W - (off_x + new_w)
    return {
        "src": src_path.name,
        "out": out_path,
        "scaled_to": (new_w, new_h),
        "pad": (top_bar, bottom_bar, left_bar, right_bar),  # t,b,l,r px
    }


def main() -> int:
    if not SRC_DIR.is_dir():
        print(f"✗ source dir missing: {SRC_DIR}", file=sys.stderr)
        return 1

    originals_before = sorted(
        p.name for p in SRC_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )

    OUT_DIR.mkdir(exist_ok=True)

    sources = sorted(
        p
        for p in SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not sources:
        print(f"✗ no images found in {SRC_DIR}", file=sys.stderr)
        return 1

    print(f"→ Processing {len(sources)} image(s) → {OUT_DIR}\n")

    results = []
    failures = []
    for src in sources:
        info = process(src)
        # Verify each output immediately, fail loudly.
        with Image.open(info["out"]) as out_im:
            size_ok = out_im.size == (TARGET_W, TARGET_H)
            mode_ok = out_im.mode == "RGB"
            has_alpha = "A" in out_im.getbands() or out_im.mode in ("RGBA", "LA", "PA")
        ok = size_ok and mode_ok and not has_alpha
        info.update(size=out_im.size, mode=out_im.mode, has_alpha=has_alpha, ok=ok)
        results.append(info)
        if not ok:
            failures.append(info)

    # ── Summary table ──────────────────────────────────────────────────────
    print("── Output summary ───────────────────────────────────────────────")
    name_w = max(len(r["out"].name) for r in results)
    print(f"{'file'.ljust(name_w)}  {'size':>11}  {'mode':>4}  {'alpha':>5}  pad(t,b,l,r px)")
    for r in results:
        flag = "✓" if r["ok"] else "✗"
        print(
            f"{r['out'].name.ljust(name_w)}  {str(r['size']):>11}  "
            f"{r['mode']:>4}  {str(r['has_alpha']):>5}  {str(r['pad'])}  {flag}"
        )
    print("─────────────────────────────────────────────────────────────────")

    # ── Originals-unchanged check ────────────────────────────────────────────
    originals_after = sorted(
        p.name for p in SRC_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if originals_after != originals_before:
        print(
            f"\n✗ ORIGINALS CHANGED!\n  before: {originals_before}\n  after:  {originals_after}",
            file=sys.stderr,
        )
        return 1
    print(
        f"\n✓ Originals unchanged: {len(originals_after)} files in parent "
        f"({', '.join(originals_after)})"
    )

    if failures:
        print(f"\n✗ {len(failures)} output(s) FAILED spec checks.", file=sys.stderr)
        return 1

    print(f"\n✓ All {len(results)} outputs are exactly 1280x800, RGB, no alpha.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
