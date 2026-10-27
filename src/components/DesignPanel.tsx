import { Box, FoldHorizontal, LayoutGrid, PanelTop, Ruler, Settings2 } from "lucide-react";
import type { AppSettings, LevelConfig } from "../types";
import { BACK_PANELS, PRINTERS, SYSTEM_CARDS } from "../lib/defaults";
import { NumberField, Section, SelectField, Toggle } from "./Field";
import LevelsEditor from "./LevelsEditor";

export default function DesignPanel({
  settings,
  onPatch,
  onSystem,
  onLevel,
}: {
  settings: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
  onSystem: (system: string) => void;
  onLevel: (index: number, patch: Partial<LevelConfig>) => void;
}) {
  return (
    <div className="design-panel">
      <Section title="Sistema" subtitle="Elige el punto de partida" icon={<LayoutGrid size={15} />} defaultOpen>
        <div className="system-grid">
          {SYSTEM_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`system-card ${settings.system === card.id ? "is-active" : ""}`}
              style={{ "--accent": card.accent } as React.CSSProperties}
              onClick={() => onSystem(card.id)}
            >
              <span className="system-dot" />
              <strong>{card.label}</strong>
              <small>{card.description}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Dimensiones" subtitle="La base de todo el sistema" icon={<Ruler size={15} />} defaultOpen>
        <NumberField label="Ancho total" value={settings.width} min={120} max={900} step={5} slider onChange={(value) => onPatch({ width: value })} />
        <NumberField label="Fondo total" value={settings.depth} min={120} max={600} step={5} slider onChange={(value) => onPatch({ depth: value })} />
        <NumberField label="Niveles" value={settings.levels} min={1} max={6} step={1} unit="" slider onChange={(value) => onPatch({ levels: value })} />
        <NumberField label="Separación entre niveles" value={settings.levelSpacing} min={35} max={180} step={1} slider onChange={(value) => onPatch({ levelSpacing: value })} />
        <NumberField label="Fondo de bandeja" value={settings.shelfDepth} min={50} max={settings.depth - 20} step={1} slider onChange={(value) => onPatch({ shelfDepth: value })} />
        <NumberField label="Estrechamiento superior" value={settings.shelfTaper} min={0.55} max={1} step={0.01} unit="" onChange={(value) => onPatch({ shelfTaper: value })} />
        <div className="quick-row">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              const usableWidth = Math.max(120, settings.bedWidth - 16);
              const usableDepth = Math.max(120, settings.bedDepth - 16);
              const levels = Math.max(1, settings.levels);
              const maxSpacing = Math.max(35, (settings.bedHeight - settings.baseHeight - settings.lipHeight - 24) / levels);
              const width = Math.min(settings.width, usableWidth);
              onPatch({
                width,
                depth: Math.min(settings.depth, usableDepth),
                shelfDepth: Math.min(settings.shelfDepth, usableDepth - 20),
                levelSpacing: Math.min(settings.levelSpacing, maxSpacing),
                panelSplit: Math.max(settings.panelSplit, Math.ceil(width / Math.max(40, settings.bedWidth - 12))),
              });
            }}
          >
            Ajustar a mi cama
          </button>
          {PRINTERS.filter((printer) => printer.id !== "custom").map((printer) => (
            <button
              key={printer.id}
              type="button"
              className="chip-button"
              onClick={() => onPatch({ printer: printer.id, bedWidth: printer.width, bedDepth: printer.depth, bedHeight: printer.height })}
            >
              {printer.label}
            </button>
          ))}
        </div>
        <p className="panel-note">Las piezas mayores que la cama se avisan en Preflight. Para paneles grandes usa divisiones y clips de unión.</p>
      </Section>

      <Section title="Panel trasero" subtitle="SKÅDIS, panal, marca o liso" icon={<PanelTop size={15} />}>
        <SelectField label="Tipo de panel" value={settings.backPanel} options={BACK_PANELS} onChange={(value) => onPatch({ backPanel: value })} />
        <NumberField label="Altura del panel" value={settings.backHeight || Math.round(settings.baseHeight + settings.levels * settings.levelSpacing + settings.lipHeight + 24)} min={80} max={900} step={5} onChange={(value) => onPatch({ backHeight: value })} hint="0 = automática" />
        <NumberField label="Grosor" value={settings.panelThickness} min={2} max={20} step={0.5} onChange={(value) => onPatch({ panelThickness: value })} />
        <NumberField label="Divisiones" value={settings.panelSplit} min={1} max={6} step={1} unit="" onChange={(value) => onPatch({ panelSplit: value })} />
        <NumberField label="Margen del panel" value={settings.panelMargin} min={4} max={60} step={1} onChange={(value) => onPatch({ panelMargin: value })} />
      </Section>

      <LevelsEditor settings={settings} onPatch={onPatch} onLevel={onLevel} />

      <Section title="Plegado y transporte" subtitle="Cómo se lleva el display" icon={<FoldHorizontal size={15} />}>
        <SelectField
          label="Mecánica"
          value={settings.foldMode}
          options={[
            { value: "zfold", label: "Z-fold con bandejas extraíbles" },
            { value: "accordion", label: "Acordeón nivelado (experimental)" },
          ]}
          onChange={(value) => onPatch({ foldMode: value })}
        />
        <NumberField label="Ángulo de plegado" value={settings.foldAngle} min={45} max={95} step={1} unit="°" onChange={(value) => onPatch({ foldAngle: value })} />
        <Toggle label="Modo transporte" hint="Tapa, asa y bloqueos" checked={settings.transport} onChange={(value) => onPatch({ transport: value })} />
        <Toggle label="Tapa" checked={settings.transportLid} onChange={(value) => onPatch({ transportLid: value })} />
        <Toggle label="Asa" checked={settings.transportHandle} onChange={(value) => onPatch({ transportHandle: value })} />
        <Toggle label="Apilable plegado" checked={settings.stackable} onChange={(value) => onPatch({ stackable: value })} />
        <Toggle label="Lastre" hint="Hueco para arena o metal" checked={settings.ballast} onChange={(value) => onPatch({ ballast: value })} />
        <Toggle label="Ranuras para correas" checked={settings.strapSlots} onChange={(value) => onPatch({ strapSlots: value })} />
      </Section>

      <Section title="Estructura" subtitle="Activa o simplifica el chasis" icon={<Box size={15} />}>
        <Toggle label="Base" checked={settings.addBase} onChange={(value) => onPatch({ addBase: value })} />
        <Toggle label="Marco trasero" checked={settings.addRear} onChange={(value) => onPatch({ addRear: value })} />
        <Toggle label="Marco delantero" checked={settings.addFront} onChange={(value) => onPatch({ addFront: value })} />
        <Toggle label="Bloqueos" checked={settings.addLocks} onChange={(value) => onPatch({ addLocks: value })} />
        <NumberField label="Grosor de laterales" value={settings.sideThickness} min={3} max={20} step={0.5} onChange={(value) => onPatch({ sideThickness: value })} />
        <NumberField label="Grosor de bandeja" value={settings.shelfThickness} min={2} max={16} step={0.5} onChange={(value) => onPatch({ shelfThickness: value })} />
        <NumberField label="Altura de base" value={settings.baseHeight} min={3} max={30} step={0.5} onChange={(value) => onPatch({ baseHeight: value })} />
        <NumberField label="Radio de base" value={settings.baseRadius} min={0} max={40} step={1} onChange={(value) => onPatch({ baseRadius: value })} />
      </Section>

      <Section title="Perfil de impresora" subtitle="Para avisos de cama y división" icon={<Settings2 size={15} />}>
        <SelectField
          label="Impresora"
          value={settings.printer}
          options={PRINTERS.map((printer) => ({ value: printer.id, label: printer.label }))}
          onChange={(value) => {
            const printer = PRINTERS.find((item) => item.id === value);
            if (!printer) return;
            onPatch({ printer: value, bedWidth: printer.width, bedDepth: printer.depth, bedHeight: printer.height });
          }}
        />
        <NumberField label="Cama X" value={settings.bedWidth} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedWidth: value })} />
        <NumberField label="Cama Y" value={settings.bedDepth} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedDepth: value })} />
        <NumberField label="Cama Z" value={settings.bedHeight} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedHeight: value })} />
      </Section>
    </div>
  );
}
