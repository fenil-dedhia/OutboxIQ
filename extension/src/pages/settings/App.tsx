// Placeholder stub (PRD §5.8). When the real Settings panel is built it must
// include a "Pinned Timezones" surface to view / reorder / remove the user's
// pinned zones (state.pinnedTimezones, PRD §5.1.3 Step 2 — Session 11), since
// onboarding is currently the ONLY place to set them. The picker already
// renders a "Pinned" section from this field; Settings just needs the
// add/remove UI (the same chips + add-picker pattern as onboarding Step 2).
// Tracked in PRE_LAUNCH_CHECKLIST.md.
export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Fashionably Late — Settings</h1>
      <p>
        Toolchain scaffold. The settings &amp; preferences panel (PRD §5.8) is
        built here later — including Pinned Timezones management.
      </p>
    </main>
  );
}
