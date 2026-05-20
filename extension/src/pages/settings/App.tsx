import { useState } from "react";
import { useSettings } from "./useSettings";
import { ProfileSection } from "./sections/ProfileSection";
import { PinnedSection } from "./sections/PinnedSection";
import { CacheSection } from "./sections/CacheSection";

// PRD §5.8 Settings panel. Sidebar nav + content pane: each §5.8.2 section is a
// nav item; clicking switches the active section in the main pane. Chosen over
// top-tabs because the section list grows (Phases 2–3 add Working Hours,
// Feature Toggles, Privacy & Data, About) and a vertical list stays readable at
// any count on a wide settings page. Visual language matches onboarding (same
// TimezonePicker, chips, accent colour).
//
// Free v1 carve-outs (Entry 39 / §5.8.2): no email field, no "Refresh from
// Calendar", no "Unschedule on Reply" / "Schedule confirmation toast" toggles —
// omitted, not stubbed. Phase 1 ships the three sections that unblock launch
// (Profile/Timezone, Pinned Timezones, Recipient Timezone Cache).

type SectionId = "profile" | "pinned" | "cache";

const NAV: { id: SectionId; label: string }[] = [
  { id: "profile", label: "Profile & timezone" },
  { id: "pinned", label: "Pinned timezones" },
  { id: "cache", label: "Recipient timezone cache" },
];

export function App() {
  const settings = useSettings();
  const [active, setActive] = useState<SectionId>("profile");

  // §6.7 graceful degradation: getState() default-merges, so `state` is always
  // well-formed once loaded; until then, a plain loading line (never blow up).
  if (settings.status === "loading" || !settings.state) {
    return (
      <main className="fl-set-shell">
        <p className="fl-set-loading">Loading&hellip;</p>
      </main>
    );
  }

  const { state } = settings;

  return (
    <div className="fl-set-shell">
      <header className="fl-set-header">
        <h1>Fashionably Late — Settings</h1>
      </header>
      <div className="fl-set-body">
        <nav className="fl-set-nav" aria-label="Settings sections">
          <ul>
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    "fl-set-nav-item" + (active === item.id ? " is-active" : "")
                  }
                  aria-current={active === item.id ? "page" : undefined}
                  onClick={() => setActive(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="fl-set-main">
          {active === "profile" && (
            <ProfileSection
              timezone={state.user.timezone}
              pinned={state.pinnedTimezones}
              onTimezoneChange={settings.setTimezone}
            />
          )}
          {active === "pinned" && (
            <PinnedSection
              pinned={state.pinnedTimezones}
              onChange={settings.setPinned}
            />
          )}
          {active === "cache" && (
            <CacheSection
              entries={state.recipientCache}
              pinned={state.pinnedTimezones}
              onEdit={settings.editCacheTimezone}
              onDelete={settings.deleteCacheEntry}
              onClearAll={settings.clearCache}
            />
          )}
        </main>
      </div>
    </div>
  );
}
