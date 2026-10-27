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
  const fitPanel = (printer: { width: number; depth: number }, width = settings.width, levels = settings.levels, spacing = settings.levelSpacing) => {
    const panelW = width - 2 * settings.sideThickness - 4;
    const panelH = settings.backHeight || (settings.baseHeight + (levels - 1) * spacing + settings.lipHeight + 80);
    return {
      panelSplit: Math.max(1, Math.ceil(panelW / Math.max(60, printer.width - 12))),
      panelRows: Math.max(1, Math.ceil(panelH / Math.max(60, printer.depth - 12))),
    };
  };

  const printerPatch = (printer: { id: string; width: number; depth: number; height: number }) => {
    if (printer.id === "a1mini") {
      return {
        printer: printer.id,
        bedWidth: printer.width,
        bedDepth: printer.depth,
        bedHeight: printer.height,
        width: 150,
        depth: 120,
        shelfDepth: 95,
        levelSpacing: 45,
        levels: 2,
        lipHeight: 22,
        cantileverStep: 20,
        cantileverClosedGap: 28,
        backPanel: "none",
        hooks: 0,
        ...fitPanel(printer, 150, 2, 45),
      };
    }
    return { printer: printer.id, bedWidth: printer.width, bedDepth: printer.depth, bedHeight: printer.height, ...fitPanel(printer) };
  };

  return (
    <div className="design-panel">
      <Section title="Sistema" subtitle="Elige el punto de partida cantilever" icon={<LayoutGrid size={15} />} defaultOpen>
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

      <Section title="Dimensiones" subtitle="Bandejas y recorrido cantilever" icon={<Ruler size={15} />} defaultOpen>
        <NumberField label="Ancho total" value={settings.width} min={120} max={500} step={5} slider onChange={(value) => onPatch({ width: value })} />
        <NumberField label="Fondo total" value={settings.depth} min={120} max={400} step={5} slider onChange={(value) => onPatch({ depth: value })} />
        <NumberField label="Niveles" value={settings.levels} min={1} max={6} step={1} unit="" slider onChange={(value) => onPatch({ levels: value })} />
        <NumberField label="Separación entre niveles" value={settings.levelSpacing} min={38} max={110} step={1} slider onChange={(value) => onPatch({ levelSpacing: value })} />
        <NumberField label="Fondo de bandeja" value={settings.shelfDepth} min={60} max={settings.depth - 16} step={1} onChange={(value) => onPatch({ shelfDepth: value })} />
        <NumberField label="Altura de bandeja" value={settings.lipHeight} min={16} max={60} step={1} onChange={(value) => onPatch({ lipHeight: value })} hint="Mínimo 16 mm para los pasadores" />
        <NumberField label="Grosor de pared" value={settings.shelfThickness} min={1.6} max={5} step={0.2} onChange={(value) => onPatch({ shelfThickness: value })} hint="2–3 mm recomendado" />
        <NumberField label="Separación de divisiones" value={settings.dividerSpacing} min={20} max={80} step={1} onChange={(value) => onPatch({ dividerSpacing: value })} />
        <NumberField label="Grosor de divisor" value={settings.dividerThickness} min={1.2} max={4} step={0.1} onChange={(value) => onPatch({ dividerThickness: value })} />
        <NumberField label="Radio de bandeja" value={settings.trayRadius} min={0} max={15} step={0.5} onChange={(value) => onPatch({ trayRadius: value })} />
        <div className="quick-row">
          {PRINTERS.filter((printer) => printer.id !== "custom").map((printer) => (
            <button
              key={printer.id}
              type="button"
              className="chip-button"
              onClick={() => onPatch(printerPatch(printer))}
            >
              {printer.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Variantes" subtitle="Ancho y número de bandejas" icon={<LayoutGrid size={15} />} defaultOpen>
        <div className="quick-row">
          <button type="button" className="ghost-button" onClick={() => onPatch({ width: 340, depth: 170, shelfDepth: 140, levelSpacing: 50, levels: 4, cantileverStep: 26, panelSplit: 2, panelRows: 2 })}>Wide 340</button>
          <button type="button" className="ghost-button" onClick={() => onPatch({ width: 230, depth: 160, shelfDepth: 125, levels: 4, cantileverStep: 24, panelSplit: 1 })}>Narrow 230</button>
          <button type="button" className="chip-button" onClick={() => onPatch({ levels: 3 })}>3 bandejas</button>
          <button type="button" className="chip-button" onClick={() => onPatch({ levels: 4 })}>4 bandejas</button>
          <button type="button" className="chip-button" onClick={() => onPatch({ levels: 5 })}>5 bandejas</button>
        </div>
        <p className="panel-note">Wide 340 necesita una cama grande; el formato 170 × 150 cabe en A1 y A1 Mini. Los brazos crecen con la separación entre niveles.</p>
      </Section>

      <Section title="Panel trasero" subtitle="SKÅDIS, panal, marca o liso" icon={<PanelTop size={15} />} defaultOpen>
        <SelectField label="Tipo de panel" value={settings.backPanel} options={BACK_PANELS} onChange={(value) => onPatch({ backPanel: value })} />
        <NumberField label="Altura del panel" value={settings.backHeight || Math.round(settings.baseHeight + (settings.levels - 1) * settings.levelSpacing + settings.lipHeight + 80)} min={80} max={650} step={5} onChange={(value) => onPatch({ backHeight: value })} hint="0 = automática" />
        <NumberField label="Grosor" value={settings.panelThickness} min={1.5} max={8} step={0.5} onChange={(value) => onPatch({ panelThickness: value })} />
        <NumberField label="Columnas" value={settings.panelSplit} min={1} max={4} step={1} unit="" onChange={(value) => onPatch({ panelSplit: value })} />
        <NumberField label="Filas" value={settings.panelRows} min={1} max={4} step={1} unit="" onChange={(value) => onPatch({ panelRows: value })} />
        <label className="field">
          <span className="field-label"><span>Texto del cartel</span><small>Etiqueta de papel 80 × 20 mm</small></span>
          <input className="text-input" value={settings.signText} maxLength={24} onChange={(event) => onPatch({ signText: event.target.value })} />
        </label>
      </Section>

      <LevelsEditor settings={settings} onPatch={onPatch} onLevel={onLevel} />

      <Section title="Plegado y transporte" subtitle="Brazos, pila y caja cerrada" icon={<FoldHorizontal size={15} />}>
        <Toggle label="Modo transporte" checked={settings.transport} onChange={(value) => onPatch({ transport: value })} />
        <Toggle label="Tapa" checked={settings.transportLid} onChange={(value) => onPatch({ transportLid: value })} />
        <Toggle label="Asa" checked={settings.transportHandle} onChange={(value) => onPatch({ transportHandle: value })} />
      </Section>

      <Section title="Mecanismo cantilever" subtitle="Brazos ranurados, pasadores y pila" icon={<Box size={15} />} defaultOpen>
        <NumberField label="Paso cantilever" value={settings.cantileverStep} min={8} max={70} step={1} slider onChange={(value) => onPatch({ cantileverStep: value })} hint="Cuánto avanza cada bandeja al abrir" />
        <NumberField label="Separación plegada" value={settings.cantileverClosedGap} min={12} max={80} step={1} onChange={(value) => onPatch({ cantileverClosedGap: value })} hint="Se ajusta si las bandejas chocan" />
        <NumberField label="Grosor de brazo" value={settings.sideThickness} min={2} max={8} step={0.5} onChange={(value) => onPatch({ sideThickness: value })} />
        <NumberField label="Ancho de brazo" value={settings.postDepth} min={18} max={50} step={1} onChange={(value) => onPatch({ postDepth: value })} hint="Máximo; se reduce en bandejas poco profundas" />
        <NumberField label="Diámetro de pasador" value={settings.pinDiameter} min={3} max={8} step={0.1} onChange={(value) => onPatch({ pinDiameter: value })} hint="4–5 mm recomendado" />
        <NumberField label="Grosor de base" value={settings.baseHeight} min={2} max={10} step={0.5} onChange={(value) => onPatch({ baseHeight: value })} />
        <NumberField label="Grosor de bandeja" value={settings.shelfThickness} min={1.6} max={5} step={0.2} onChange={(value) => onPatch({ shelfThickness: value })} />
        <Toggle label="Pies" checked={settings.feet} onChange={(value) => onPatch({ feet: value })} />
        <p className="panel-note">Dos brazos por hueco, alternando delante, centro y detrás para que no choquen al plegar. Los pasadores quedan montados.</p>
      </Section>

      <Section title="Perfil de impresora" subtitle="Para avisos de cama" icon={<Settings2 size={15} />}>
        <SelectField
          label="Impresora"
          value={settings.printer}
          options={PRINTERS.map((printer) => ({ value: printer.id, label: printer.label }))}
          onChange={(value) => {
            const printer = PRINTERS.find((item) => item.id === value);
            if (!printer) return;
            onPatch(printerPatch(printer));
          }}
        />
        <NumberField label="Cama X" value={settings.bedWidth} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedWidth: value })} />
        <NumberField label="Cama Y" value={settings.bedDepth} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedDepth: value })} />
        <NumberField label="Cama Z" value={settings.bedHeight} min={80} max={1200} step={1} onChange={(value) => onPatch({ bedHeight: value })} />
      </Section>
    </div>
  );
}
