import {
  AUTHOR_NAME,
  AUTHOR_URL,
  GITHUB_REPO_URL,
  SUPPORT_EMAIL,
} from "../../../lib/constants";

// PRD §5.8.2 "About" — plugin version, author credit, GitHub repo link, and a
// feedback/support channel (the founder's email — owner decision, Session 13).

// Version from the live manifest (single source of truth — manifest.config.ts
// `version`). Guarded: if getManifest is unavailable, show "—" rather than
// crash (§6.7). Computed per render, but the manifest is static so that's fine.
function manifestVersion(): string {
  try {
    return chrome.runtime?.getManifest?.().version ?? "—";
  } catch {
    return "—";
  }
}

export function AboutSection() {
  const version = manifestVersion();

  return (
    <section className="fl-set-section" aria-labelledby="fl-set-about-h">
      <h2 id="fl-set-about-h">About</h2>

      <dl className="fl-set-about">
        <div className="fl-set-about-row">
          <dt>Version</dt>
          <dd>{version}</dd>
        </div>
        <div className="fl-set-about-row">
          <dt>Built by</dt>
          <dd>
            <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
              {AUTHOR_NAME}
            </a>
          </dd>
        </div>
        <div className="fl-set-about-row">
          <dt>Source code</dt>
          <dd>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              github.com/fenil-dedhia/fashionably-late
            </a>
          </dd>
        </div>
        <div className="fl-set-about-row">
          <dt>Feedback &amp; support</dt>
          <dd>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Fashionably%20Late%20feedback`}
            >
              {SUPPORT_EMAIL}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
