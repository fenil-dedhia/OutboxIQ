// PRD §5.3.5 (b)/(c)/(e) — read the compose's To+CC recipients from Gmail's
// compose DOM. BCC is excluded by spec (preserves the BCC privacy contract;
// §11). No People API, no autocomplete enrichment beyond what Gmail already
// rendered into the chips — Free v1 is OAuth-free (Entry 39).
//
// The chip data comes from THE compose Gmail itself is rendering, so the
// `[email]` attribute on each chip is the address verbatim and the chip's
// textContent is whatever name Gmail's autocomplete resolved into the chip
// (or the email-as-name when Gmail had no display name for it — spec (e)).
//
// Anchor strategy (locale-independent, structural):
//   • `input[name="to"]` / `input[name="cc"]` — these `name` values are
//     compose-model attributes, not localised UI strings. BCC is anchored
//     the same way but DELIBERATELY NOT QUERIED (spec (b)).
//   • From each input, walk up to the row container, then collect all
//     descendants carrying an `[email]` attribute. The `email` attribute
//     on chips IS the canonical recipient identity in Gmail's compose DOM.
//
// SINGLE-COMPOSE CONTRACT (matches §5.2 + §5.5.1):
// The §5.2 multi-compose safety net hands off to native when ≥2 composes
// are open, so by the time the §5.3 modal opens there is exactly one
// compose. We therefore query globally — same assumption as the existing
// chevron / Send-button paths (gmail-recipe.ts). If somehow two composes
// are present anyway, this returns the chips from ALL of them; the spec's
// recipient dropdown still works (a wrong/extra recipient is far less
// dangerous than silently failing).
//
// FAIL-OPEN (§6.7): any throw → empty array. The §5.3.5 OptimizeSection
// treats empty-array as "no recipients yet" and hides the section (spec
// (a) — visible only when there's a recipient). Quick Options / Pick
// Custom remain fully usable; Gmail's own UI already signals the missing
// recipients (Send disabled), so the user is never silently stranded.
//
// PROBE STATUS (Session 10): the selectors below are based on Gmail's
// well-documented compose model (`input[name="to"|"cc"|"bcc"]` + chip
// `[email]` attribute). A live-Gmail confirmation probe is tracked in
// PRE_LAUNCH_CHECKLIST.md (Gmail-DOM probes); selectors here are isolated
// to this single module so a future Gmail UI change has one place to fix
// (same pattern as gmail-recipe.ts).

export interface ComposeRecipient {
  /** Verbatim from the chip's [email] attribute. Case preserved as Gmail
   * rendered it; matching/dedupe is case-insensitive (see normalize). */
  email: string;
  /** Display name from the chip's textContent if different from `email`,
   * else null. Spec (e): never-emailed recipients show email-as-name; we
   * return null here so the consumer can decide how to render "Email"
   * vs "Name (email)" without ambiguity. */
  displayName: string | null;
  /** Field of origin — surfaced as "(To)" / "(CC)" in the dropdown (spec (c)). */
  field: "To" | "CC";
}

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/** The chip's visible textContent, cleaned. May equal the email when Gmail
 * had no display name — caller normalises that to null. */
function chipText(chip: Element): string {
  return (chip.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Collect chips from a single row (the input's row container). The row
 * container is the nearest ancestor that ALSO contains the chip list —
 * Gmail's structure has the input adjacent to the chip area in a shared
 * row, so the input's grandparent is generally a safe container. We use
 * `.closest('tr')` first (Gmail compose historically uses table rows for
 * recipient sections), and fall back to two-levels-up. */
function chipsForInput(input: HTMLElement): Element[] {
  const row =
    input.closest("tr") ??
    input.parentElement?.parentElement ??
    input.parentElement;
  if (!row) return [];
  return Array.from(row.querySelectorAll<HTMLElement>("[email]"));
}

function readField(
  fieldName: "to" | "cc",
  label: "To" | "CC",
): ComposeRecipient[] {
  const inputs = document.querySelectorAll<HTMLElement>(
    `input[name="${fieldName}"]`,
  );
  const out: ComposeRecipient[] = [];
  const seen = new Set<string>();
  for (const input of inputs) {
    for (const chip of chipsForInput(input)) {
      const email = (chip.getAttribute("email") ?? "").trim();
      if (!email) continue;
      const key = normalizeEmail(email);
      if (seen.has(key)) continue;
      seen.add(key);
      const text = chipText(chip);
      const displayName = text && normalizeEmail(text) !== key ? text : null;
      out.push({ email, displayName, field: label });
    }
  }
  return out;
}

/**
 * Read the active compose's To + CC recipients. BCC is excluded by spec.
 * Order: all To chips first (in compose order), then all CC chips. Dedupes
 * across To/CC by email — if the same address is in both (rare), the To
 * entry wins (spec doesn't say; To-first is the user's primary intent).
 *
 * Returns an EMPTY array on any DOM read failure (§6.7 graceful
 * degradation). The §5.3.5 UI treats empty-array as "Unable to detect
 * recipients" and remains fully usable via Quick Options / Pick Custom.
 */
export function readComposeRecipients(): ComposeRecipient[] {
  try {
    const to = readField("to", "To");
    const cc = readField("cc", "CC");
    const toEmails = new Set(to.map((r) => normalizeEmail(r.email)));
    const merged = [...to];
    for (const r of cc) {
      if (!toEmails.has(normalizeEmail(r.email))) merged.push(r);
    }
    return merged;
  } catch {
    return [];
  }
}
