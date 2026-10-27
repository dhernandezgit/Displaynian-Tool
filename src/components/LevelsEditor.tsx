import { ArrowDown, ArrowUp, Layers } from "lucide-react";
import type { AppSettings, LevelConfig } from "../types";
import { INSERT_OPTIONS, SHELF_TYPES } from "../lib/defaults";
import { NumberField, Section, SelectField, Toggle } from "./Field";

export default function LevelsEditor({
  settings,
  onPatch,
  onLevel,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
  onLevel: (index: number, patch: Partial<LevelConfig>) => void;
}) {
  return (
    <Section title="Niveles" subtitle="Cada bandeja es independiente" icon={<Layers size={15} />} defaultOpen>
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
              <span className="level-badge">{SHELF_TYPES.find((item) => item.value === level.type)?.label || level.type}</span>
              <div className="level-actions">
                <button
                  type="button"
                  title="Subir nivel"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...settings.levelConfigs];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onPatch({ levelConfigs: next });
                  }}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  title="Bajar nivel"
                  disabled={index === settings.levelConfigs.length - 1}
                  onClick={() => {
                    const next = [...settings.levelConfigs];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onPatch({ levelConfigs: next });
                  }}
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>
            {level.enabled ? (
              <div className="level-body">
                <SelectField
                  label="Tipo"
                  value={level.type}
                  options={SHELF_TYPES}
                  onChange={(value) => onLevel(index, { type: value })}
                />
                <SelectField
                  label="Inserto"
                  value={level.insert}
                  options={INSERT_OPTIONS}
                  onChange={(value) => onLevel(index, { insert: value })}
                />
                <NumberField label="Altura" value={level.height} min={20} max={600} step={1} onChange={(value) => onLevel(index, { height: value })} />
                <NumberField label="Fondo" value={level.depth} min={40} max={settings.depth - 8} step={1} onChange={(value) => onLevel(index, { depth: value })} />
                <NumberField label="Inclinación" value={level.angle} min={-15} max={30} step={1} unit="°" onChange={(value) => onLevel(index, { angle: value })} />
                <NumberField label="Labio" value={level.lipHeight} min={0} max={60} step={1} onChange={(value) => onLevel(index, { lipHeight: value })} />
                <Toggle label="Labio frontal" checked={level.lip} onChange={(value) => onLevel(index, { lip: value })} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
