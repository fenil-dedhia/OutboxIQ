// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from "react";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "../../../lib/constants";
import { SymbolMark } from "../../../lib/components/BrandLogo";

interface Props {
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  onGetStarted: () => void;
}

// Step 1 (restructured): welcome + the transparency content formerly in its
// own "Why we ask" step + the consent gate formerly in the "Consent" step.
// The transparency/consent copy is reproduced verbatim from PRD §5.1.3 — it
// is privacy/consent-facing; do not paraphrase it.
export function Welcome({
  consentChecked,
  onConsentChange,
  onGetStarted,
}: Props) {
  // Session 14 a11y: on mount, move focus to this step's heading so a
  // keyboard/screen-reader user advancing from a previous step (or arriving
  // on initial load) lands here. Paired with the aria-live announcement in
  // App.tsx — both signal the step change. tabIndex=-1 makes the h1
  // programmatically focusable without exposing it in tab order.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="oq-step" aria-labelledby="oq-welcome-title">
      {/* Decorative: the headline below already names the product. */}
      <div className="oq-welcome-logo">
        <SymbolMark size={60} />
      </div>
      <h1 id="oq-welcome-title" ref={headingRef} tabIndex={-1}>
        Welcome to Fashionably Late
      </h1>
      <p className="oq-lede">
        Fashionably Late helps your emails land at the right moment, in your
        recipients&rsquo; time, not yours. We&rsquo;ll need your timezone and
        working hours to make that happen.
      </p>

      <h2>Your data, your control:</h2>
      <ul className="oq-bullets">
        <li>
          This information stays on your device, we don&rsquo;t have servers.
        </li>
        <li>We never share your data with third parties.</li>
        <li>
          You can edit, export, or delete everything in Settings at any time.
        </li>
      </ul>

      <h2>What you get in return:</h2>
      <ul className="oq-bullets">
        <li>
          Send emails at the right moment for each recipient, learned once and
          remembered.
        </li>
        <li>
          Avoid sending after-hours emails that hurt your professional brand.
        </li>
        <li>Your data stays on your device, no account, no tracking.</li>
      </ul>

      {/* Combined Privacy Policy + Terms of Service consent (PRD §6.1: both
          documents linked at install/onboarding; Pattern 1 — one combined
          checkbox, owner-chosen 2026-05-28). The legal links live INSIDE the
          label so the consent sentence reads as one gesture (no separate
          "Read the…" line — the inline links are the access point); each link
          calls stopPropagation on click so opening a document does NOT also
          toggle the checkbox (clicking a label otherwise activates its
          control). Consent still registers via the checkbox's own onChange. */}
      <div className="oq-consent">
        <input
          id="oq-consent-checkbox"
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <label htmlFor="oq-consent-checkbox">
          I agree to the{" "}
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href={TERMS_OF_SERVICE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </a>
          , and understand how Fashionably Late uses my data.
        </label>
      </div>

      <div className="oq-actions">
        <button
          type="button"
          className="oq-primary"
          onClick={onGetStarted}
          disabled={!consentChecked}
        >
          Get Started
        </button>
      </div>
    </section>
  );
}
