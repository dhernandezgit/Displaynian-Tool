import { Layers } from "lucide-react";
import type { AppSettings, LevelConfig } from "../types";
import { INSERT_OPTIONS } from "../lib/defaults";
import { NumberField, Section, SelectField } from "./Field";

const TRAY_STYLES = [
  { value: "dividers", label: "Separadores fijos" },
  { value: "containers", label: "Contenedores individuales" },
  { value: "empty", label: "Bandeja vacía" },
];

export default function LevelsEditor({
  settings,
  onLevel,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
  onLevel: (index: number, patch: Partial<LevelConfig>) => void;
}) {
  return (
    <Section title="Bandejas" subtitle="Distancia y contenido de cada nivel" icon={<Layers size={15} />} defaultOpen>
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
              <span className="level-badge">{level.style === "containers" ? `${level.containers} contenedores` : level.style === "empty" ? "vacía" : "separadores"}</span>
            </div>
            {level.enabled ? (
              <div className="level-body">
                {index > 0 ? (
                  <NumberField
                    label="Separación desde el nivel anterior"
                    value={level.gap}
                    min={24}
                    max={120}
                    step={1}
                    onChange={(value) => onLevel(index, { gap: value })}
                  />
                ) : null}
                <SelectField
                  label="Contenido"
                  value={level.style}
                  options={TRAY_STYLES}
                  onChange={(value) => onLevel(index, { style: value })}
                />
                {level.style === "containers" ? (
                  <NumberField
                    label="Nº de contenedores"
                    value={level.containers}
                    min={1}
                    max={5}
                    step={1}
                    unit=""
                    onChange={(value) => onLevel(index, { containers: value })}
                  />
                ) : level.style === "dividers" ? (
                  <SelectField
                    label="Inserto"
                    value={level.insert}
                    options={INSERT_OPTIONS}
                    onChange={(value) => onLevel(index, { insert: value })}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="panel-note">Cada nivel puede tener su propia distancia. “Contenedores” sustituye los separadores impresos por cajas individuales extraíbles.</p>
    </Section>
  );
}
