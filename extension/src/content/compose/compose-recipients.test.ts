// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import { readComposeRecipients } from "./compose-recipients";

// Synthetic compose pane mirroring the live-Gmail DOM verified by
// `research/compose-recipients-probe.js` (2026-05-19):
//
//   <div class="aSs">                                  ← compose pane
//     <div aria-label="To recipients">                 ← To row
//       <div peoplekit-id="ubaLBe">
//         <div role="option" data-hovercard-id="…" data-name="…">…</div>
//       </div>
//     </div>
//     <div aria-label="CC recipients">                 ← CC row
//       <div peoplekit-id="ubaLBe">
//         <div role="option" data-hovercard-id="…">…</div>
//       </div>
//     </div>
//     <div contenteditable="true">…body…</div>         ← compose body anchor
//     <div role="button" aria-label="More send options"/>  ← chevron
//   </div>
//
// We don't depend on the obfuscated classes — only the structural
// anchors the module actually reads.
function seedCompose(rows: {
  to?: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
}): void {
  const pane = document.createElement("div");
  pane.className = "aSs";

  const addRow = (
    label: string,
    chips: Array<{ email: string; name?: string }>,
  ): void => {
    const row = document.createElement("div");
    row.setAttribute("aria-label", label);
    const chipList = document.createElement("div");
    chipList.setAttribute("peoplekit-id", "ubaLBe");
    for (const { email, name } of chips) {
      const chip = document.createElement("div");
      chip.setAttribute("role", "option");
      chip.setAttribute("data-hovercard-id", email);
      if (name !== undefined) chip.setAttribute("data-name", name);
      chipList.appendChild(chip);
    }
    row.appendChild(chipList);
    pane.appendChild(row);
  };

  if (rows.to) addRow("To recipients", rows.to);
  if (rows.cc) addRow("Cc recipients", rows.cc);
  if (rows.bcc) addRow("Bcc recipients", rows.bcc);

  // Compose-body anchor + chevron, both required for composePaneFor /
  // chevron-based detection to resolve this subtree as the pane.
  const body = document.createElement("div");
  body.setAttribute("contenteditable", "true");
  pane.appendChild(body);

  const chevron = document.createElement("div");
  chevron.setAttribute("role", "button");
  chevron.setAttribute("aria-label", "More send options");
  pane.appendChild(chevron);

  document.body.appendChild(pane);
}

describe("readComposeRecipients (PRD §5.3.5 b/c/e — probe-verified anchors)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns [] when no compose is open (§6.7)", () => {
    expect(readComposeRecipients()).toEqual([]);
  });

  it("returns [] when the compose has no chips yet", () => {
    seedCompose({ to: [], cc: [] });
    expect(readComposeRecipients()).toEqual([]);
  });

  it("reads To chips and labels them as 'To' (spec (c))", () => {
    seedCompose({
      to: [
        { email: "sarah@example.com", name: "Sarah Chen" },
        { email: "mike@example.com", name: "Mike Johnson" },
      ],
    });
    const out = readComposeRecipients();
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      email: "sarah@example.com",
      displayName: "Sarah Chen",
      field: "To",
    });
    expect(out[1]).toMatchObject({
      email: "mike@example.com",
      displayName: "Mike Johnson",
      field: "To",
    });
  });

  it("reads CC chips and labels them as 'CC' (spec (c))", () => {
    seedCompose({
      to: [{ email: "sarah@example.com", name: "Sarah Chen" }],
      cc: [{ email: "alex@example.com", name: "Alex" }],
    });
    const out = readComposeRecipients();
    expect(out.find((r) => r.email === "alex@example.com")?.field).toBe("CC");
    expect(out.find((r) => r.email === "sarah@example.com")?.field).toBe("To");
  });

  it("EXCLUDES BCC entirely (spec (b) — BCC privacy contract)", () => {
    seedCompose({
      to: [{ email: "sarah@example.com" }],
      bcc: [{ email: "secret@example.com", name: "Hidden" }],
    });
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out.find((r) => r.email === "secret@example.com")).toBeUndefined();
  });

  it("never-emailed recipient: data-name absent → displayName is null (spec (e))", () => {
    // The probe verified this in Chip #2 of the live capture: a never-
    // emailed recipient has `data-name` empty (just the attribute, no
    // value). Our DOM helper omits the attribute entirely to mirror.
    seedCompose({ to: [{ email: "first-contact@example.com" }] });
    const out = readComposeRecipients();
    expect(out[0]?.displayName).toBeNull();
    expect(out[0]?.email).toBe("first-contact@example.com");
  });

  it("data-name equal to email → displayName is null (no echo)", () => {
    seedCompose({
      to: [
        {
          email: "first-contact@example.com",
          name: "first-contact@example.com",
        },
      ],
    });
    expect(readComposeRecipients()[0]?.displayName).toBeNull();
  });

  it("To order is preserved; CC is appended after To", () => {
    seedCompose({
      to: [
        { email: "a@example.com", name: "A" },
        { email: "b@example.com", name: "B" },
        { email: "c@example.com", name: "C" },
      ],
      cc: [
        { email: "x@example.com", name: "X" },
        { email: "y@example.com", name: "Y" },
      ],
    });
    const out = readComposeRecipients();
    expect(out.map((r) => r.email)).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
      "x@example.com",
      "y@example.com",
    ]);
  });

  it("dedupes case-insensitively across To/CC (To wins)", () => {
    seedCompose({
      to: [{ email: "Pat@example.com", name: "Pat" }],
      cc: [{ email: "pat@example.com", name: "Pat (cc)" }],
    });
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.field).toBe("To");
  });

  it("skips chips with empty data-hovercard-id", () => {
    seedCompose({
      to: [
        { email: "real@example.com", name: "Real" },
        { email: "", name: "Empty" },
      ],
    });
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.email).toBe("real@example.com");
  });

  it("ignores stray [data-hovercard-id] outside the compose pane (e.g. inbox sender chips)", () => {
    // The original v1 bug: `[email]` matched 477 elements doc-wide.
    // The fix anchors on `div[role="option"][data-hovercard-id]` INSIDE
    // the chevron's compose pane. Inbox sender chips with
    // data-hovercard-id but no role=option (or in a different subtree)
    // must not contaminate the result.
    const strayInbox = document.createElement("span");
    strayInbox.setAttribute("data-hovercard-id", "noisy@example.com");
    strayInbox.setAttribute("email", "noisy@example.com");
    strayInbox.textContent = "Inbox Sender";
    document.body.appendChild(strayInbox);

    seedCompose({ to: [{ email: "real@example.com", name: "Real" }] });

    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.email).toBe("real@example.com");
  });

  it("ignores role=option without data-hovercard-id (autocomplete suggestions etc.)", () => {
    seedCompose({ to: [{ email: "real@example.com", name: "Real" }] });
    // Simulate an autocomplete suggestion popover inside the pane: a
    // role=option without a hovercard-id (probe showed 3 role=option
    // matches when only 2 were chips — the 3rd is something else).
    const pane = document.querySelector(".aSs")!;
    const suggestion = document.createElement("div");
    suggestion.setAttribute("role", "option");
    suggestion.textContent = "Suggested contact";
    pane.appendChild(suggestion);

    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.email).toBe("real@example.com");
  });

  it("BCC chip whose aria-label happens to contain 'to' is still tagged BCC", () => {
    // Defensive against word-boundary slippage: "Bcc recipients" doesn't
    // contain "to", but a future Gmail variant might say "Recipients to
    // copy blindly" — the BCC check must win because it's tested first
    // in fieldOfChip().
    seedCompose({
      to: [{ email: "visible@example.com", name: "Visible" }],
    });
    const pane = document.querySelector(".aSs")!;
    const oddRow = document.createElement("div");
    // An aria-label that contains both "to" and "bcc" must be classified
    // as BCC (the binding rule per spec (b) + Entry-21 conservatism).
    oddRow.setAttribute("aria-label", "to bcc");
    const chipList = document.createElement("div");
    const chip = document.createElement("div");
    chip.setAttribute("role", "option");
    chip.setAttribute("data-hovercard-id", "ambiguous@example.com");
    chipList.appendChild(chip);
    oddRow.appendChild(chipList);
    pane.appendChild(oddRow);

    const out = readComposeRecipients();
    expect(
      out.find((r) => r.email === "ambiguous@example.com"),
    ).toBeUndefined();
  });
});
