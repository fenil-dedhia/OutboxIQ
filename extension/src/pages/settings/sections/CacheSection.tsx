import { useEffect, useMemo, useState } from "react";
import { TimezonePicker } from "../../../lib/components/TimezonePicker";
import { resolveCuratedEntry } from "../../../lib/timezone/search";
import type { RecipientCacheEntry } from "../../../lib/storage";

// PRD §5.8.2 "Recipient Timezone Cache" — the only surface to view / edit /
// delete the manual recipient-timezone cache (entries are kept indefinitely,
// §5.3.5 (j), so without this a wrong pick can never be corrected). Free v1's
// only source is "manual"; an auto-detected entry would mean a premium-v1
// schema leak, so we surface it loudly (a dev warning + a visible marker)
// rather than hide it.

interface Props {
  entries: RecipientCacheEntry[];
  pinned: string[];
  onEdit: (entry: RecipientCacheEntry, timezone: string) => void;
  onDelete: (email: string) => void;
  onClearAll: () => void;
}

/** Curated group label for display (reuses the picker's resolver); falls back
 * to the raw IANA id for an unknown zone (§6.7) — never blank. */
function tzLabel(iana: string): string {
  return resolveCuratedEntry(iana)?.label ?? iana;
}

function dateLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CacheSection({
  entries,
  pinned,
  onEdit,
  onDelete,
  onClearAll,
}: Props) {
  const [query, setQuery] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Tripwire: Free v1 only ever writes "manual". A non-manual source here is a
  // premium-v1 schema leak (Entry 39) — make it loud, don't swallow it.
  useEffect(() => {
    const leaked = entries.filter((e) => e.source !== "manual");
    if (leaked.length > 0) {
      console.warn(
        "[Fashionably Late] non-manual recipient-cache entries found (Free v1 should only have 'manual' — possible premium-v1 leak):",
        leaked.map((e) => `${e.email} (${e.source})`),
      );
    }
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.email.toLowerCase().includes(q) ||
        (e.name?.toLowerCase().includes(q) ?? false) ||
        tzLabel(e.timezone).toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <section className="fl-set-section" aria-labelledby="fl-set-cache-h">
      <h2 id="fl-set-cache-h">Recipient timezone cache</h2>
      <p className="fl-set-help">
        Timezones you&rsquo;ve picked for recipients when scheduling with
        Optimize-for-X. They&rsquo;re saved on this device and kept until you
        remove them.
      </p>

      {entries.length === 0 ? (
        <p className="fl-set-empty">
          No cached recipient timezones yet. When you use Optimize-for-X to
          schedule an email to someone new, the timezone you pick for them is
          saved here so we don&rsquo;t ask again.
        </p>
      ) : (
        <>
          <div className="fl-set-cache-toolbar">
            <input
              type="search"
              className="fl-set-cache-search"
              placeholder="Search by name, email, or timezone"
              aria-label="Search cached recipients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {confirmingClear ? (
              <div
                className="fl-set-confirm"
                role="alertdialog"
                aria-label="Confirm clear cache"
              >
                <span>
                  This will remove all {entries.length} cached recipient
                  timezones. You&rsquo;ll be re-prompted next time you schedule
                  an email to them.
                </span>
                <div className="fl-set-confirm-actions">
                  <button
                    type="button"
                    className="fl-set-btn fl-set-btn-danger"
                    onClick={() => {
                      onClearAll();
                      setConfirmingClear(false);
                    }}
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    className="fl-set-btn"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="fl-set-btn"
                onClick={() => setConfirmingClear(true)}
              >
                Clear all cached recipient timezones
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="fl-set-empty">No recipients match “{query}”.</p>
          ) : (
            <ul className="fl-set-cache-list">
              {filtered.map((entry) => {
                const editing = editingEmail === entry.email;
                return (
                  <li key={entry.email} className="fl-set-cache-row">
                    <div className="fl-set-cache-id">
                      <span className="fl-set-cache-name">
                        {entry.name ?? entry.email}
                      </span>
                      {entry.name && (
                        <span className="fl-set-cache-email">
                          {entry.email}
                        </span>
                      )}
                    </div>

                    <div className="fl-set-cache-tz">
                      {editing ? (
                        <div className="fl-set-cache-edit">
                          <TimezonePicker
                            ariaLabel={`Timezone for ${entry.email}`}
                            className="fl-set-cache-picker"
                            value={entry.timezone}
                            pinnedIanaIds={pinned}
                            onChange={(tz) => {
                              onEdit(entry, tz);
                              setEditingEmail(null);
                            }}
                          />
                          <button
                            type="button"
                            className="fl-set-linkbtn"
                            onClick={() => setEditingEmail(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="fl-set-cache-tz-label">
                          {tzLabel(entry.timezone)}
                        </span>
                      )}
                    </div>

                    <div className="fl-set-cache-meta">
                      <span
                        className={
                          "fl-set-cache-source" +
                          (entry.source !== "manual"
                            ? " fl-set-cache-source--leak"
                            : "")
                        }
                      >
                        {entry.source === "manual" ? "Manual" : entry.source}
                      </span>
                      <span className="fl-set-cache-date">
                        {dateLabel(entry.resolvedAt)}
                      </span>
                    </div>

                    {!editing && (
                      <div className="fl-set-cache-actions">
                        <button
                          type="button"
                          className="fl-set-linkbtn"
                          aria-label={`Edit timezone for ${entry.email}`}
                          onClick={() => setEditingEmail(entry.email)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="fl-set-linkbtn fl-set-linkbtn-danger"
                          aria-label={`Delete ${entry.email}`}
                          onClick={() => onDelete(entry.email)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
