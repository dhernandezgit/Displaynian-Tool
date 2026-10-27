import {
  Anchor,
  BookMarked,
  Cable,
  CircleDot,
  CircleStop,
  CornerDownRight,
  Footprints,
  Gem,
  Hand,
  Image,
  KeyRound,
  LayoutGrid,
  Layers,
  Link2,
  LockKeyhole,
  Luggage,
  Package,
  PanelLeft,
  PanelRight,
  PenTool,
  Signpost,
  Square,
  Sticker,
  Store,
  Tag,
  Triangle,
  Type,
  Weight,
} from "lucide-react";
import type { AppSettings } from "../types";
import { CATALOG, CATALOG_GROUPS, INSERT_OPTIONS } from "../lib/defaults";
import { NumberField, Section, SelectField, Stepper, Toggle } from "./Field";

const ICONS: Record<string, typeof Square> = {
  KeyRound,
  Sticker,
  Gem,
  CircleDot,
  BookMarked,
  PenTool,
  LayoutGrid,
  Square,
  PanelRight,
  PanelLeft,
  LockKeyhole,
  CornerDownRight,
  Link2,
  Triangle,
  CircleStop,
  Image,
  Anchor,
  Package,
  Tag,
  Type,
  Signpost,
  Store,
  Luggage,
  Hand,
  Weight,
  Cable,
  Footprints,
  Layers,
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
                  <NumberField label="Largo de gancho" value={settings.hookLength} min={12} max={100} step={1} onChange={(value) => onPatch({ hookLength: value })} />
                  <NumberField label="Filas de ganchos" value={settings.hookRows} min={1} max={6} step={1} unit="" onChange={(value) => onPatch({ hookRows: value })} />
                </div>
                {settings.hookType !== "skadis" ? (
                  <div className="two-col">
                    <NumberField label="Paso de rejilla" value={settings.wirePitch} min={15} max={120} step={1} onChange={(value) => onPatch({ wirePitch: value })} />
                    <NumberField label="Alambre" value={settings.wireDiameter} min={1} max={10} step={0.1} onChange={(value) => onPatch({ wireDiameter: value })} />
                  </div>
                ) : null}
                <Toggle label="Seguros de gancho" checked={settings.hookLocks} onChange={(value) => onPatch({ hookLocks: value })} />
                <Toggle label="Tapas de bandeja" checked={settings.binLids} onChange={(value) => onPatch({ binLids: value })} />
                <Toggle label="Tapa de transporte" checked={settings.transportLid} onChange={(value) => onPatch({ transportLid: value })} />
                <Toggle label="Asa de transporte" checked={settings.transportHandle} onChange={(value) => onPatch({ transportHandle: value })} />
                <SelectField
                  label="Inserto rápido"
                  value={settings.insert}
                  options={INSERT_OPTIONS}
                  onChange={(value) => onPatch({ insert: value })}
                  hint="Se aplica al nivel 1 desde Diseño"
                />
                <label className="field">
                  <span className="field-label"><span>Texto de letras y cartel</span><small>Hasta 24 caracteres</small></span>
                  <input
                    className="text-input"
                    value={settings.letterText}
                    maxLength={24}
                    onChange={(event) => onPatch({ letterText: event.target.value.toUpperCase() })}
                  />
                </label>
              </div>
            ) : null}
          </Section>
        );
      })}
    </div>
  );
}
