import type { FeatureToggles } from "../../../lib/storage";

// PRD §5.8.2 "Feature Toggles" — Free-v1 scope. Exactly TWO toggles:
//   • Recipient Optimized Scheduling   → featureToggles.recipientOptimization
//   • Auto-reschedule prompt …         → featureToggles.autoRescheduleOnOutsideHours
// The other two §5.8.2 toggles are OMITTED (not stubbed): "Unschedule on
// Reply" is Premium-only, and "Schedule confirmation toast" is moot (§5.9
// removed, Entry 37 — the native Gmail toast is what users see; its schema
// field stays inert per Entry 30). Each toggle autosaves (PRD §5.8) and is
// honoured by its consumer (the §5.3.5 Optimize section / the §5.5.1 guard).

interface ToggleDef {
  key: keyof FeatureToggles;
  label: string;
  description: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "recipientOptimization",
    label: "Recipient optimized scheduling",
    description:
      "Show the “Optimize delivery for …” option in Schedule Send, so you can land an email in a recipient’s working hours.",
  },
  {
    key: "autoRescheduleOnOutsideHours",
    label: "Auto-reschedule prompt outside working hours",
    description:
      "When you click Send outside your working hours, offer to reschedule it for your next working window.",
  },
];

interface Props {
  toggles: FeatureToggles;
  onToggle: (key: keyof FeatureToggles, value: boolean) => void;
}

export function FeatureTogglesSection({ toggles, onToggle }: Props) {
  return (
    <section className="fl-set-section" aria-labelledby="fl-set-toggles-h">
      <h2 id="fl-set-toggles-h">Feature toggles</h2>
      <p className="fl-set-help">
        Turn Fashionably Late&rsquo;s scheduling helpers on or off. Changes take
        effect right away.
      </p>

      <ul className="fl-set-toggle-list">
        {TOGGLES.map((t) => (
          <li key={t.key} className="fl-set-toggle-row">
            <label className="fl-set-toggle">
              <input
                type="checkbox"
                role="switch"
                checked={toggles[t.key]}
                onChange={(e) => onToggle(t.key, e.target.checked)}
              />
              <span className="fl-set-toggle-text">
                <span className="fl-set-toggle-label">{t.label}</span>
                <span className="fl-set-toggle-desc">{t.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
