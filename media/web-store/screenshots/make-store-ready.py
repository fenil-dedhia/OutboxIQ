#!/usr/bin/env python3
# Copyright 2026 Fenil Dedhia
# SPDX-License-Identifier: Apache-2.0
#
# Standalone asset utility (NOT a build step, NOT a project dependency).
# Makes the raw Web Store screenshots store-ready: exactly 1280x800, 24-bit RGB
# PNG (no alpha), output to store-ready/.
#
# Strategy: COVER (scale-to-fill + center-crop), NOT contain+letterbox.
# We scale the screenshot up until it fully covers 1280x800, then center-crop
# the overflow. The output therefore has NO letterbox bars — and so none of the
# problems bars cause: no padding seam, no mismatched fill color, no edge
# white-spots bleeding in. The trade-off is a small center-crop of whichever
# axis overflows. For these wide Gmail captures (~1863x1082, aspect ~1.72 vs the
# 1.60 target) that overflow is on the WIDTH — so we trim a few percent of
# peripheral chrome off the left/right (the nav rail / app-panel icons) and
# never touch the top/bottom, where the modal header and action buttons live.
# (Superseded the earlier contain+median-edge-pad approach, whose bottom bar
# picked up the busy inbox/dropdown edge and read as a sloppy light band.)
#
# Originals are never modified — outputs go to a NEW subfolder.

import sys
from pathlib import Path

from PIL import Image

TARGET_W, TARGET_H = 1280, 800
SRC_DIR = Path(__file__).resolve().parent
OUT_DIR = SRC_DIR / "store-ready"
IMAGE_EXTS = {".jpg", ".jpeg", ".png"}


def process(src_path: Path) -> dict:
    with Image.open(src_path) as im:
        img = im.convert("RGB")  # drops any alpha

        w, h = img.size
        # COVER: the larger factor guarantees both dimensions are >= target.
        factor = max(TARGET_W / w, TARGET_H / h)
        new_w = max(TARGET_W, round(w * factor))
        new_h = max(TARGET_H, round(h * factor))
        scaled = img.resize((new_w, new_h), Image.LANCZOS)

        # Center-crop the overflow down to exactly the target.
        left = (new_w - TARGET_W) // 2
        top = (new_h - TARGET_H) // 2
        canvas = scaled.crop((left, top, left + TARGET_W, top + TARGET_H))

        out_path = OUT_DIR / f"{src_path.stem}-1280x800.png"
        canvas.save(out_path, format="PNG")

    return {
        "src": src_path.name,
        "out": out_path,
        "scaled_to": (new_w, new_h),
        "cropped": (new_w - TARGET_W, new_h - TARGET_H),  # (x_trim, y_trim) total
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
    print(f"{'file'.ljust(name_w)}  {'size':>11}  {'mode':>4}  {'alpha':>5}  crop(x,y px)")
    for r in results:
        flag = "✓" if r["ok"] else "✗"
        print(
            f"{r['out'].name.ljust(name_w)}  {str(r['size']):>11}  "
            f"{r['mode']:>4}  {str(r['has_alpha']):>5}  {str(r['cropped'])}  {flag}"
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
