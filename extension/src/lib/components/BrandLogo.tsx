// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Inline-SVG brand marks (Entry 57). Inline (not <img>) so they render crisply
// at any zoom AND work inside the §5.3 modal's Shadow DOM, where extension-path
// <img src> can resolve oddly (per the Shadow-DOM gotcha). The teal is the
// brand #5EB1BF; the symbol's secondary art is black. Both default to
// DECORATIVE (aria-hidden) because every placement sits beside text that
// already names the product — pass `title` to make a mark announce itself.

import { WORDMARK_PATH } from "./brand-wordmark-path";

interface MarkProps {
  /** Rendered height in px (the symbol is square, so width == size). */
  size?: number;
  className?: string;
  /** If given, the mark is exposed to AT as an image with this label;
   *  otherwise it is decorative (aria-hidden). */
  title?: string;
}

// The clock/arrow symbol alone — teal hands + black face-arc, ticks, and motion
// lines. Square viewBox with light padding (matches media/logo/symbol-only.svg).
export function SymbolMark({ size = 32, className, title }: MarkProps) {
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="11.3 3.3 108.2 108.2"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...a11y}
    >
      <polygon
        points="61.8,95.9 57.8,97.7 53.8,95.9 55.2,19 57.8,17.1 60.3,19"
        fill="#5EB1BF"
      />
      <polygon
        points="48.5,92.4 45.2,89.4 45.3,85 94.6,65.2 96.8,67 96.6,69.9"
        fill="#5EB1BF"
      />
      <polygon points="49.9,20 15.3,25.6 49.9,23" fill="#000000" />
      <polygon points="49.9,29.1 23.7,32.7 49.9,32.1" fill="#000000" />
      <polygon points="49.9,37.5 29.3,39.7 49.9,40.5" fill="#000000" />
      <path
        d="M94.5,36.7l-4.7,4.7l0.5,1.7l1.7,0.6l4.8-4.3C96,38.5,95.3,37.6,94.5,36.7z"
        fill="#000000"
      />
      <path
        d="M76.4,25.4l-2.8,6l1,1.4l1.8,0l3.1-5.7C78.4,26.6,77.4,26,76.4,25.4z"
        fill="#000000"
      />
      <path
        d="M108,53.7l-6,2.8l-0.1,1.8l1.4,1.1l6-2.4C108.8,55.9,108.4,54.8,108,53.7z"
        fill="#000000"
      />
      <path
        d="M111.3,66.8l4.2-1.7c-6.9-23.5-26.7-41.6-51.3-45.9l0,4.6C86.8,28.1,105,44.9,111.3,66.8z"
        fill="#000000"
      />
    </svg>
  );
}

// Aspect ratio of the full lockup (outer viewBox 463.46 × 321.16).
const LOCKUP_RATIO = 463.46 / 321.16;

// Symbol + "FASHIONABLY LATE" wordmark, in the original lockup layout. Symbol
// and wordmark are positioned via nested <svg> offsets exactly as in
// media/logo/logo.svg.
export function FullLogo({
  size = 40,
  className,
  title,
}: Omit<MarkProps, "size"> & { size?: number }) {
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };
  return (
    <svg
      width={Math.round(size * LOCKUP_RATIO)}
      height={size}
      viewBox="55.77 126.92 463.46 321.16"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...a11y}
    >
      {/* symbol */}
      <svg
        x="231"
        y="196.92"
        width="142"
        height="114.22356786483373"
        viewBox="15.3 17.1 100.2 80.6"
        preserveAspectRatio="xMinYMin"
      >
        <polygon
          points="61.8,95.9 57.8,97.7 53.8,95.9 55.2,19 57.8,17.1 60.3,19"
          fill="#5EB1BF"
        />
        <polygon
          points="48.5,92.4 45.2,89.4 45.3,85 94.6,65.2 96.8,67 96.6,69.9"
          fill="#5EB1BF"
        />
        <polygon points="49.9,20 15.3,25.6 49.9,23" fill="#000000" />
        <polygon points="49.9,29.1 23.7,32.7 49.9,32.1" fill="#000000" />
        <polygon points="49.9,37.5 29.3,39.7 49.9,40.5" fill="#000000" />
        <path
          d="M94.5,36.7l-4.7,4.7l0.5,1.7l1.7,0.6l4.8-4.3C96,38.5,95.3,37.6,94.5,36.7z"
          fill="#000000"
        />
        <path
          d="M76.4,25.4l-2.8,6l1,1.4l1.8,0l3.1-5.7C78.4,26.6,77.4,26,76.4,25.4z"
          fill="#000000"
        />
        <path
          d="M108,53.7l-6,2.8l-0.1,1.8l1.4,1.1l6-2.4C108.8,55.9,108.4,54.8,108,53.7z"
          fill="#000000"
        />
        <path
          d="M111.3,66.8l4.2-1.7c-6.9-23.5-26.7-41.6-51.3-45.9l0,4.6C86.8,28.1,105,44.9,111.3,66.8z"
          fill="#000000"
        />
      </svg>
      {/* wordmark */}
      <svg
        x="125.77"
        y="339.92"
        width="323.46"
        height="38.16"
        viewBox="2.17 10.07 323.46 38.16"
      >
        <path d={WORDMARK_PATH} fill="#5EB1BF" />
      </svg>
    </svg>
  );
}
