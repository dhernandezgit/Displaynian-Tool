import {
  Copy,
  CornerDownRight,
  Columns2,
  Eye,
  EyeOff,
  LayoutGrid,
  Maximize2,
  PencilRuler,
  Plus,
  Redo2,
  RotateCw,
  Rows3,
  Sparkles,
  SquareDashed,
  Store,
  Trash2,
  Undo2,
} from "lucide-react";
import type { BuildResult, StandPlan, StandTemplate, StandUnit } from "../types";
import { GRID_OPTIONS, MERCH_LEVELS, STAND_TEMPLATES, standSummary, systemAccent, systemLabel } from "../lib/stand";
import { SYSTEM_CARDS } from "../lib/defaults";
import { NumberField, Section, SelectField, Toggle } from "./Field";

const TEMPLATE_ICONS: Record<string, typeof Store> = {
  Store,
  Columns2,
  Rows3,
  CornerDownRight,
  SquareDashed,
  LayoutGrid,
};

export default function StandPanel({
  plan,
  builds,
  selected,
  canUndo,
  canRedo,
  onAdd,
  onSelect,
  onToggleHidden,
  onDuplicate,
  onRotate,
  onDelete,
  onApplyTemplate,
  onRotateStand,
  onFit,
  onUndo,
  onRedo,
  onPatchPlan,
  onEdit,
}: {
  plan: StandPlan;
  builds: Record<string, BuildResult>;
  selected: StandUnit | null;
  canUndo: boolean;
  canRedo: boolean;
  onAdd: (system: string) => void;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onApplyTemplate: (template: StandTemplate) => void;
  onRotateStand: () => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPatchPlan: (patch: Partial<StandPlan>) => void;
  onEdit: () => void;
}) {
  const summary = standSummary(plan, builds);
  const gridOptions = GRID_OPTIONS.some((option) => option.value === plan.grid)
    ? GRID_OPTIONS
    : [{ value: plan.grid, label: `${(plan.grid / 10).toFixed(0)} cm` }, ...GRID_OPTIONS];
  return (
    <div className="stand-panel">
      <section className="stand-hero">
        <div className="stand-hero-head">
          <span className="stand-hero-icon"><Store size={18} /></span>
          <div>
            <small>Planificador de stand</small>
            <h2>{summary.modules} módulo{summary.modules === 1 ? "" : "s"}</h2>
          </div>
          <span className="badge is-ok">{summary.footprint}</span>
        </div>
        <div className="stand-metrics">
          <div><b>{summary.height ? `${(summary.height / 10).toFixed(0)}` : "—"}</b><span>cm alto</span></div>
          <div><b>{summary.pieces}</b><span>piezas</span></div>
          <div><b>{summary.material >= 1000 ? `${(summary.material / 1000).toFixed(1)} kg` : `${summary.material.toFixed(0)} g`}</b><span>material</span></div>
        </div>
        <div className="stand-quick-actions">
          <button type="button" className="ghost-button" onClick={onUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)"><Undo2 size={14} /> Deshacer</button>
          <button type="button" className="ghost-button" onClick={onRedo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)"><Redo2 size={14} /> Rehacer</button>
          <button type="button" className="ghost-button" onClick={onRotateStand} title="Girar todo el stand 90°"><RotateCw size={14} /> Girar stand</button>
          <button type="button" className="ghost-button" onClick={onFit} title="Centrar y ajustar la vista"><Maximize2 size={14} /> Centrar</button>
        </div>
      </section>

      <Section title="Plantillas" subtitle="Empieza en segundos" icon={<Sparkles size={15} />} defaultOpen>
        <div className="template-grid">
          {STAND_TEMPLATES.map((template) => {
            const Icon = TEMPLATE_ICONS[template.icon] || LayoutGrid;
            return (
              <button key={template.id} type="button" className="template-card" onClick={() => onApplyTemplate(template)}>
                <Icon size={18} />
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Añadir módulo" subtitle="Usa los expositores actuales" icon={<Plus size={15} />} defaultOpen>
        <div className="system-grid stand-system-grid">
          {SYSTEM_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className="system-card"
              style={{ "--accent": card.accent } as React.CSSProperties}
              onClick={() => onAdd(card.id)}
            >
              <span className="system-dot" />
              <strong>{card.label}</strong>
              <small>{card.description}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Módulos" subtitle={`${plan.units.length} en el stand`} icon={<LayoutGrid size={15} />} defaultOpen>
        {plan.units.length ? (
          <div className="stand-module-list">
            {plan.units.map((unit) => (
              <div key={unit.id} className={`stand-module ${unit.id === plan.selectedId ? "is-selected" : ""} ${unit.hidden ? "is-hidden" : ""}`}>
                <button type="button" className="stand-module-main" onClick={() => onSelect(unit.id)}>
                  <span className="part-swatch" style={{ background: systemAccent(unit.system) }} />
                  <span>
                    <strong>{unit.name}</strong>
                    <small>{systemLabel(unit.system)} · {Math.round(unit.settings.width)} × {Math.round(unit.settings.depth)} mm · celda {unit.cellX + 1}·{unit.cellZ + 1}</small>
                  </span>
                </button>
                <button type="button" className="icon-button" title={unit.hidden ? "Mostrar" : "Ocultar"} onClick={() => onToggleHidden(unit.id)}>
                  {unit.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="panel-note">Todavía no hay módulos. Elige una plantilla o añade un expositor.</p>
        )}
        {selected ? (
          <div className="stand-module-actions">
            <button type="button" className="ghost-button" onClick={onEdit}><PencilRuler size={14} /> Editar</button>
            <button type="button" className="ghost-button" onClick={onDuplicate}><Copy size={14} /> Duplicar</button>
            <button type="button" className="ghost-button" onClick={onRotate}><RotateCw size={14} /> Girar 90°</button>
            <button type="button" className="ghost-button is-danger" onClick={onDelete}><Trash2 size={14} /> Borrar</button>
          </div>
        ) : null}
      </Section>

      <Section title="Escena" subtitle="Rejilla, tamaño y ayudas" icon={<Rows3 size={15} />} defaultOpen>
        <SelectField
          label="Rejilla"
          value={String(plan.grid)}
          options={gridOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          onChange={(value) => onPatchPlan({ grid: Number(value) })}
          hint="Cada módulo ocupa una celda"
        />
        <div className="two-col">
          <NumberField label="Columnas" value={plan.cols} min={1} max={14} step={1} unit="" onChange={(value) => onPatchPlan({ cols: Math.max(1, Math.min(14, Math.round(value))) })} />
          <NumberField label="Filas" value={plan.rows} min={1} max={10} step={1} unit="" onChange={(value) => onPatchPlan({ rows: Math.max(1, Math.min(10, Math.round(value))) })} />
        </div>
        <SelectField
          label="Merch decorativo"
          value={String(plan.merchLevel)}
          options={MERCH_LEVELS.map((option) => ({ value: String(option.value), label: option.label }))}
          onChange={(value) => onPatchPlan({ merchLevel: Number(value) })}
        />
        <Toggle label="Mostrar merch" hint="Llena las bandejas con producto decorativo" checked={plan.showMerch} onChange={(value) => onPatchPlan({ showMerch: value })} />
        <Toggle label="Mostrar rejilla" hint="Guías de 10 cm y celdas de 30 cm" checked={plan.showGrid} onChange={(value) => onPatchPlan({ showGrid: value })} />
        <Toggle label="Etiquetas" hint="Nombre y sistema sobre cada módulo" checked={plan.showLabels} onChange={(value) => onPatchPlan({ showLabels: value })} />
        <p className="panel-note">Arrastra un módulo para moverlo. <b>R</b> gira, <b>Supr</b> borra y <b>Ctrl+D</b> duplica. El stand se guarda solo.</p>
      </Section>
    </div>
  );
}
