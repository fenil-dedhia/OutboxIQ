// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from "react";
import { PRIVACY_POLICY_URL } from "../../../lib/constants";

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
      <h1 id="oq-welcome-title" ref={headingRef} tabIndex={-1}>
        Welcome to Fashionably Late
      </h1>
      <p className="oq-lede">
        Fashionably Late helps your emails land at the right moment, in your
        recipients&rsquo; time, not yours. To power our intelligent features,
        we&rsquo;ll require information about your timezone and working hours.
      </p>

      <h2>Why do we need this information?</h2>
      <p>
        Google&rsquo;s APIs don&rsquo;t expose your working hours to third-party
        plugins, and we can&rsquo;t always determine a recipient&rsquo;s
        timezone automatically. To power our smart scheduling features, we need
        to ask you directly.
      </p>

      <h2>Your data, your control:</h2>
      <ul className="oq-bullets">
        <li>
          This information is stored locally on your device, not on our servers.
        </li>
        <li>We never share your data with third parties.</li>
        <li>
          You can edit, export, or delete everything in Settings at any time.
        </li>
      </ul>

      <h2>What you get in return:</h2>
      <ul className="oq-bullets">
        <li>
          Send emails at the optimal moment for each recipient, automatically.
        </li>
        <li>
          Avoid sending after-hours emails that hurt your professional brand.
        </li>
        <li>
          Cancel scheduled emails when someone replies, so you never send a
          stale message.
        </li>
      </ul>

      {/* The Privacy Policy link is intentionally OUTSIDE the label: a label
          must not contain interactive content, and nesting the link inside it
          let a link click also toggle consent. Consent now registers ONLY via
          the checkbox's own onChange. */}
      <div className="oq-consent">
        <input
          id="oq-consent-checkbox"
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => onConsentChange(e.target.checked)}
        />
        <label htmlFor="oq-consent-checkbox">
          I understand how Fashionably Late uses my data and agree to the
          Privacy Policy.
        </label>
      </div>
      <p className="oq-consent-link">
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
          Read the Privacy Policy
        </a>
      </p>

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
