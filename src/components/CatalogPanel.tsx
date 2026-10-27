import {
  Anchor,
  Cable,
  FoldHorizontal,
  Footprints,
  Hand,
  Layers,
  Link,
  Link2,
  LockKeyhole,
  Luggage,
  Package,
  PanelRight,
  Signpost,
  Square,
} from "lucide-react";
import type { AppSettings } from "../types";
import { CATALOG, CATALOG_GROUPS, INSERT_OPTIONS } from "../lib/defaults";
import { NumberField, Section, SelectField, Stepper } from "./Field";

const ICONS: Record<string, typeof Square> = {
  Square,
  PanelRight,
  Link2,
  Link,
  Footprints,
  Anchor,
  Package,
  LockKeyhole,
  FoldHorizontal,
  Luggage,
  Hand,
  Cable,
  Layers,
  Signpost,
};

export default function CatalogPanel({
  settings,
  onPatch,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
}) {
  return (
    <div className="catalog-panel">
      {CATALOG_GROUPS.map((group) => {
        const items = CATALOG.filter((item) => item.group === group.id);
        if (!items.length) return null;
        return (
          <Section key={group.id} title={group.label} subtitle={group.description} icon={<Layers size={15} />} defaultOpen={group.id === "estructura"}>
            <div className="catalog-list">
              {items.map((item) => {
                const Icon = ICONS[item.icon] || Square;
                const value = settings[item.key];
                const active = item.kind === "bool" ? Boolean(value) : Number(value) > 0;
                return (
                  <div key={item.key} className={`catalog-item ${active ? "is-on" : ""}`}>
                    <span className="catalog-icon"><Icon size={17} /></span>
                    <span className="catalog-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    {item.kind === "bool" ? (
                      <label className="mini-switch">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) => onPatch({ [item.key]: event.target.checked })}
                        />
                        <span />
                      </label>
                    ) : (
                      <Stepper
                        value={Number(value) || 0}
                        min={item.min ?? 0}
                        max={item.max ?? 20}
                        onChange={(next) => onPatch({ [item.key]: next })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {group.id === "accesorios" ? (
              <div className="catalog-extra">
                <SelectField
                  label="Tipo de gancho"
                  value={settings.hookType}
                  options={[
                    { value: "skadis", label: "SKÅDIS" },
                    { value: "wire", label: "Rejilla metálica" },
                    { value: "combo", label: "Combinado" },
                  ]}
                  onChange={(value) => onPatch({ hookType: value })}
                />
                <div className="two-col">
                  <NumberField label="Largo de gancho" value={settings.hookLength} min={18} max={80} step={1} onChange={(value) => onPatch({ hookLength: value })} />
                  <NumberField label="Filas de ganchos" value={settings.hookRows} min={1} max={5} step={1} unit="" onChange={(value) => onPatch({ hookRows: value })} />
                </div>
                {settings.hookType !== "skadis" ? (
                  <div className="two-col">
                    <NumberField label="Paso de rejilla" value={settings.wirePitch} min={15} max={120} step={1} onChange={(value) => onPatch({ wirePitch: value })} />
                    <NumberField label="Alambre" value={settings.wireDiameter} min={1} max={10} step={0.1} onChange={(value) => onPatch({ wireDiameter: value })} />
                  </div>
                ) : null}
                <SelectField
                  label="Inserto rápido"
                  value={settings.insert}
                  options={INSERT_OPTIONS}
                  onChange={(value) => onPatch({ insert: value })}
                  hint="Se aplica al nivel 1"
                />
              </div>
            ) : null}
          </Section>
        );
      })}
    </div>
  );
}
