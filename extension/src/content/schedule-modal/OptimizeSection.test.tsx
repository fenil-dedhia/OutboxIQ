import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OptimizeSection, type OptimizeChoice } from "./OptimizeSection";
import { setManualRecipientTimezone } from "../../lib/recipient-cache";
import type { ComposeRecipient } from "../compose/compose-recipients";

// The confirmation line is split across multiple text nodes by inline
// expressions, so a single text matcher won't find it. Read the body of
// .optimize-confirm directly instead.
function confirmLine(): string | null {
  const el = document.querySelector(".optimize-confirm");
  return el ? (el.textContent ?? "").replace(/\s+/g, " ").trim() : null;
}

const sarah: ComposeRecipient = {
  email: "sarah@example.com",
  displayName: "Sarah Chen",
  field: "To",
};
const mike: ComposeRecipient = {
  email: "mike@example.com",
  displayName: "Mike Johnson",
  field: "CC",
};
const stranger: ComposeRecipient = {
  email: "first-contact@example.com",
  displayName: null,
  field: "To",
};

describe("OptimizeSection (PRD §5.3.5 a–n)", () => {
  it("(a) hides entirely when there are no recipients (covers §6.7 fail-open)", () => {
    const { container } = render(
      <OptimizeSection
        recipients={[]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("(a) checkbox starts UNCHECKED on open (opt-in per send)", () => {
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    const cb = screen.getByRole("checkbox", { name: /optimize delivery for/i });
    expect(cb).not.toBeChecked();
  });

  it("(d) single recipient pre-selected; multi → 'Choose recipient…' placeholder", () => {
    // Single
    const { unmount } = render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    const dropdown = screen.getByRole("combobox", {
      name: /optimize recipient/i,
    }) as HTMLSelectElement;
    expect(dropdown.value).toBe("sarah@example.com");
    unmount();

    // Multi
    render(
      <OptimizeSection
        recipients={[sarah, mike]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    const multi = screen.getByRole("combobox", {
      name: /optimize recipient/i,
    }) as HTMLSelectElement;
    expect(multi.value).toBe("");
    expect(
      screen.getByRole("option", { name: /choose recipient/i }),
    ).toBeInTheDocument();
  });

  it("(c) per-entry label is the name only — NO (To)/(CC) suffix (owner UX call)", () => {
    render(
      <OptimizeSection
        recipients={[sarah, mike]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    // Exact-match the option text so a stray "(To)" suffix would fail.
    expect(
      screen.getByRole("option", { name: "Sarah Chen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Mike Johnson" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /\((to|cc)\)/i }),
    ).not.toBeInTheDocument();
  });

  it("(e) never-emailed recipient: email is shown as the display label (no suffix)", () => {
    render(
      <OptimizeSection
        recipients={[stranger]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("option", { name: "first-contact@example.com" }),
    ).toBeInTheDocument();
  });

  it("(h) cache hit: confirmation line renders, no inline picker", async () => {
    await setManualRecipientTimezone(
      sarah.email,
      "America/Los_Angeles",
      "Sarah Chen",
    );
    const onChange = vi.fn();
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    // (h): confirmation line appears. Read body directly — split by inline expressions.
    await waitFor(() => {
      const line = confirmLine();
      expect(line).toMatch(/we['’]ll send this at .* in .* your time/i);
    });
    // (i): NO inline tz picker on a cache hit.
    expect(
      screen.queryByText(/what timezone is sarah chen in\?/i),
    ).not.toBeInTheDocument();
    // Choice bubbled up: cacheHit=true, rememberTz=false (no manual pick).
    const last = onChange.mock.calls.at(-1)?.[0] as OptimizeChoice | null;
    expect(last?.cacheHit).toBe(true);
    expect(last?.rememberTz).toBe(false);
    expect(last?.recipientTz).toBe("America/Los_Angeles");
    expect(last?.timing).toBe("morning");
  });

  it("(i) cache miss: inline picker appears, Schedule-ready only after tz pick", async () => {
    const onChange = vi.fn();
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    // Inline picker visible, prompt names the recipient.
    await waitFor(() =>
      expect(
        screen.getByText(/what timezone is sarah chen in\?/i),
      ).toBeInTheDocument(),
    );
    // Default selection is the placeholder (NOT user's own tz — spec (i)).
    // The picker (Session 11) is a searchable combobox: its trigger is
    // anchored by the <label>, and shows the placeholder until a pick.
    const tzTrigger = screen.getByRole("combobox", {
      name: /what timezone is sarah chen in/i,
    });
    expect(tzTrigger).toHaveTextContent(/choose their timezone/i);
    // (i): "Remember…" checkbox is default-checked.
    const remember = screen.getByRole("checkbox", {
      name: /remember for future emails to sarah chen/i,
    });
    expect(remember).toBeChecked();
    // Until the user picks, no complete choice is bubbled up.
    const lastBefore = onChange.mock.calls.at(-1)?.[0];
    expect(lastBefore).toBeNull();
    // Pick a tz: open the combobox, search, choose the UK group → Europe/London.
    fireEvent.click(tzTrigger);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "london" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: /london/i }));
    await waitFor(() => {
      const last = onChange.mock.calls.at(-1)?.[0] as OptimizeChoice | null;
      expect(last).not.toBeNull();
      expect(last?.cacheHit).toBe(false);
      expect(last?.rememberTz).toBe(true);
      expect(last?.recipientTz).toBe("Europe/London");
    });
  });

  it("(i) Remember toggle off → rememberTz=false (cache write suppressed by parent)", async () => {
    const onChange = vi.fn();
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    const tzTrigger = await screen.findByRole("combobox", {
      name: /what timezone is sarah chen in/i,
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /remember for future emails/i }),
    );
    fireEvent.click(tzTrigger);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search timezones" }),
      {
        target: { value: "london" },
      },
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: /london/i }));
    await waitFor(() => {
      const last = onChange.mock.calls.at(-1)?.[0] as OptimizeChoice | null;
      expect(last?.rememberTz).toBe(false);
    });
  });

  it("(f) timing dropdown lists exactly Morning + Midday (no End-of-day)", () => {
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    const opts = screen
      .getAllByRole("option")
      .map((o) => o.textContent?.toLowerCase() ?? "");
    expect(opts.some((t) => t.includes("morning peak"))).toBe(true);
    expect(opts.some((t) => t.includes("midday engagement"))).toBe(true);
    expect(opts.some((t) => t.includes("end of day"))).toBe(false);
  });

  it("(g) info button toggles the open-rate tooltip (no tracking-disclaimer copy)", () => {
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    const info = screen.getByRole("button", {
      name: /what do these timings mean/i,
    });
    fireEvent.click(info);
    expect(
      screen.getByText(/morning typically sees the highest open rate/i),
    ).toBeInTheDocument();
    // The awkward "based on general research, not Fashionably Late tracking"
    // justification was dropped (owner UX call); §11 stays binding on
    // behaviour, never was a copy requirement.
    expect(screen.queryByText(/general research/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/fashionably late tracking/i),
    ).not.toBeInTheDocument();
  });

  it("(m) multi-recipient + no selection: timing panel gated until a recipient is picked", async () => {
    const onChange = vi.fn();
    render(
      <OptimizeSection
        recipients={[sarah, mike]}
        userTimezone="America/New_York"
        onChange={onChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    // Engaged but no recipient selected → the WHOLE "Optimize timing for"
    // panel is hidden (pick the person first — owner UX call). Neither the
    // timing dropdown nor the tz prompt should be present.
    expect(
      screen.queryByRole("combobox", { name: /optimize timing for/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/optimize timing for/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/what timezone is/i)).not.toBeInTheDocument();
    // Latest bubbled choice is null (Schedule disabled in the parent).
    expect(onChange.mock.calls.at(-1)?.[0]).toBeNull();

    // Pick a recipient → the panel appears.
    fireEvent.change(
      screen.getByRole("combobox", { name: /optimize recipient/i }),
      { target: { value: "sarah@example.com" } },
    );
    await waitFor(() =>
      expect(screen.getByText(/optimize timing for/i)).toBeInTheDocument(),
    );
  });

  it("(k) shared TimezonePicker: uses the same component as onboarding (no duplicate dropdown)", async () => {
    render(
      <OptimizeSection
        recipients={[sarah]}
        userTimezone="America/New_York"
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /optimize delivery for/i }),
    );
    // The shared picker is a searchable combobox: the trigger shows the
    // placeholder bound by (i), and opening reveals the curated search box —
    // both unique to the shared TimezonePicker (proving no duplicate dropdown).
    const trigger = await screen.findByRole("combobox", {
      name: /what timezone is sarah chen in/i,
    });
    expect(trigger).toHaveTextContent(/choose their timezone/i);
    fireEvent.click(trigger);
    expect(
      screen.getByRole("textbox", { name: "Search timezones" }),
    ).toBeInTheDocument();
  });
});
