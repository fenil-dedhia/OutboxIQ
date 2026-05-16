// OutboxIQ Gmail content script (PRD §7.1.2) — toolchain scaffold.
//
// Next (PRD §5.1.2): on first Gmail load with no completed onboarding in
// extension storage, open the onboarding page. Compose-window integration
// (PRD §5.2) and the enhanced modal (PRD §5.3) come after that. None of that
// is wired yet — this only proves the content-script entry point injects.
console.info(
  "[OutboxIQ] content script loaded on",
  location.host,
  "(scaffold)",
);

export {};
