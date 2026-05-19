import { describe, it, expect, beforeEach } from "vitest";
import { readComposeRecipients } from "./compose-recipients";

// Synthetic compose: tr.row with a hidden <input name="to|cc|bcc"> next to
// a chip area containing zero-or-more <span email="…">Name</span> chips.
// Mirrors the structural anchors the module relies on (compose-model input
// names + the chip `email` attribute) without coupling to Gmail's exact
// obfuscated class names — those would change tomorrow and are not the
// contract the module reads.
function makeComposeRow(
  field: "to" | "cc" | "bcc",
  chips: Array<{ email: string; name?: string }>,
): HTMLElement {
  const row = document.createElement("tr");
  const inputCell = document.createElement("td");
  const input = document.createElement("input");
  input.name = field;
  input.type = "text";
  inputCell.appendChild(input);
  row.appendChild(inputCell);

  const chipCell = document.createElement("td");
  for (const { email, name } of chips) {
    const chip = document.createElement("span");
    chip.setAttribute("email", email);
    chip.textContent = name ?? email;
    chipCell.appendChild(chip);
  }
  row.appendChild(chipCell);
  return row;
}

function seedCompose(
  rows: Array<{
    field: "to" | "cc" | "bcc";
    chips: Array<{ email: string; name?: string }>;
  }>,
): void {
  const table = document.createElement("table");
  for (const r of rows) table.appendChild(makeComposeRow(r.field, r.chips));
  document.body.appendChild(table);
}

describe("readComposeRecipients (PRD §5.3.5 b/c/e)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns [] when the compose has no To/CC chips yet", () => {
    seedCompose([
      { field: "to", chips: [] },
      { field: "cc", chips: [] },
    ]);
    expect(readComposeRecipients()).toEqual([]);
  });

  it("returns [] on a document with no compose inputs at all (§6.7)", () => {
    expect(readComposeRecipients()).toEqual([]);
  });

  it("reads To chips and labels them as 'To' (spec (c))", () => {
    seedCompose([
      {
        field: "to",
        chips: [
          { email: "sarah@example.com", name: "Sarah Chen" },
          { email: "mike@example.com", name: "Mike Johnson" },
        ],
      },
    ]);
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
    seedCompose([
      { field: "to", chips: [{ email: "sarah@example.com", name: "Sarah" }] },
      { field: "cc", chips: [{ email: "alex@example.com", name: "Alex" }] },
    ]);
    const out = readComposeRecipients();
    expect(out.find((r) => r.email === "alex@example.com")?.field).toBe("CC");
    expect(out.find((r) => r.email === "sarah@example.com")?.field).toBe("To");
  });

  it("EXCLUDES BCC entirely (spec (b) — BCC privacy contract)", () => {
    seedCompose([
      { field: "to", chips: [{ email: "sarah@example.com" }] },
      {
        field: "bcc",
        chips: [{ email: "secret@example.com", name: "Hidden" }],
      },
    ]);
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out.find((r) => r.email === "secret@example.com")).toBeUndefined();
  });

  it("never-emailed recipient: displayName is null (spec (e) — email shown)", () => {
    seedCompose([
      {
        field: "to",
        chips: [{ email: "first-contact@example.com" }], // textContent === email
      },
    ]);
    const out = readComposeRecipients();
    expect(out[0]?.displayName).toBeNull();
    expect(out[0]?.email).toBe("first-contact@example.com");
  });

  it("dedupes case-insensitively across To/CC (To wins)", () => {
    seedCompose([
      { field: "to", chips: [{ email: "Pat@example.com", name: "Pat" }] },
      { field: "cc", chips: [{ email: "pat@example.com", name: "Pat (cc)" }] },
    ]);
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.field).toBe("To");
  });

  it("preserves compose order within a field", () => {
    seedCompose([
      {
        field: "to",
        chips: [
          { email: "first@example.com", name: "First" },
          { email: "second@example.com", name: "Second" },
          { email: "third@example.com", name: "Third" },
        ],
      },
    ]);
    const out = readComposeRecipients();
    expect(out.map((r) => r.email)).toEqual([
      "first@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });

  it("skips chips with empty/missing email attribute", () => {
    seedCompose([
      {
        field: "to",
        chips: [
          { email: "real@example.com", name: "Real" },
          { email: "", name: "Empty" },
        ],
      },
    ]);
    const out = readComposeRecipients();
    expect(out).toHaveLength(1);
    expect(out[0]?.email).toBe("real@example.com");
  });
});
