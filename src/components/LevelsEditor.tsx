import { Layers } from "lucide-react";
import type { AppSettings, LevelConfig } from "../types";
import { INSERT_OPTIONS } from "../lib/defaults";
import { Section, SelectField } from "./Field";

export default function LevelsEditor({
  settings,
  onLevel,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
  onLevel: (index: number, patch: Partial<LevelConfig>) => void;
}) {
  return (
    <Section title="Bandejas" subtitle="Insertos por nivel" icon={<Layers size={15} />} defaultOpen>
      <div className="levels-list">
        {settings.levelConfigs.map((level, index) => (
          <div key={level.id} className={`level-card ${level.enabled ? "" : "is-off"}`}>
            <div className="level-head">
              <label className="level-toggle">
                <input
                  type="checkbox"
                  checked={level.enabled}
                  onChange={(event) => onLevel(index, { enabled: event.target.checked })}
                />
                <span />
              </label>
              <b>{level.name}</b>
              <span className="level-badge">{level.insert === "none" ? "compartimentos" : INSERT_OPTIONS.find((item) => item.value === level.insert)?.label}</span>
            </div>
            {level.enabled ? (
              <div className="level-body level-body-simple">
                <SelectField
                  label="Inserto"
                  value={level.insert}
                  options={INSERT_OPTIONS}
                  onChange={(value) => onLevel(index, { insert: value })}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="panel-note">La altura de las bandejas y la separación entre niveles se controlan en Dimensiones.</p>
    </Section>
  );
}
