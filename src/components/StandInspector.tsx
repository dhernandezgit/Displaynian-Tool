import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Info,
  LayoutGrid,
  MapPin,
  PencilRuler,
  RotateCw,
  Ruler,
  Sparkles,
  Store,
  Trash2,
  Undo2,
  Redo2,
  Maximize2,
  XCircle,
} from "lucide-react";
import type { BuildResult, StandCheck, StandPlan, StandUnit } from "../types";
import { estimatedUnitHeight, standChecks, standSummary, systemAccent, systemLabel } from "../lib/stand";

function checkIcon(level: string) {
  if (level === "ok") return <CheckCircle2 size={15} />;
  if (level === "warn") return <AlertTriangle size={15} />;
  if (level === "error") return <XCircle size={15} />;
  return <Info size={15} />;
}

export default function StandInspector({
  plan,
  builds,
  selected,
  canUndo,
  canRedo,
  onEdit,
  onDuplicate,
  onRotate,
  onDelete,
  onToggleMerch,
  onToggleHidden,
  onRename,
  onUndo,
  onRedo,
  onFit,
}: {
  plan: StandPlan;
  builds: Record<string, BuildResult>;
  selected: StandUnit | null;
  canUndo: boolean;
  canRedo: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onToggleMerch: () => void;
  onToggleHidden: () => void;
  onRename: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFit: () => void;
}) {
  const summary = standSummary(plan, builds);
  const checks: StandCheck[] = standChecks(plan, builds);
  const warnings = checks.filter((check) => check.level === "warn");
  const build = selected ? builds[selected.id] : null;
  const unitChecks = build?.checks.filter((check) => check.level === "warn" || check.level === "error") || [];
  const width = build?.dimensions.width || selected?.settings.width || 0;
  const depth = build?.dimensions.depth || selected?.settings.depth || 0;
  const height = build?.dimensions.height || (selected ? estimatedUnitHeight(selected) : 0);

  return (
    <div className="inspector stand-inspector">
      {selected ? (
        <section className="inspector-card selected-part">
          <div className="inspector-title">
            <span className="part-swatch" style={{ background: systemAccent(selected.system) }} />
            <div>
              <small>{systemLabel(selected.system)} · módulo</small>
              <h3>{selected.name}</h3>
            </div>
            <button type="button" className="icon-button" title="Editar módulo" onClick={onEdit}><PencilRuler size={16} /></button>
          </div>
          <div className="part-metrics">
            <span><Ruler size={13} /> {width.toFixed(0)} × {depth.toFixed(0)} × {height.toFixed(0)} mm</span>
            <span><LayoutGrid size={13} /> {selected.settings.levels} niveles</span>
            <span><MapPin size={13} /> celda {selected.cellX + 1} · {selected.cellZ + 1}</span>
          </div>
          <label className="field">
            <span className="field-label"><span>Nombre del módulo</span><small>Se guarda con el stand</small></span>
            <input className="text-input" value={selected.name} maxLength={48} onChange={(event) => onRename(event.target.value)} />
          </label>
          <div className="summary-grid">
            <div><b>{build ? `${(build.material_grams).toFixed(0)} g` : "—"}</b><span>material</span></div>
            <div><b>{selected.rotation}°</b><span>rotación</span></div>
            <div><b>{build ? build.parts.length : "—"}</b><span>piezas</span></div>
            <div><b>{selected.hidden ? "No" : "Sí"}</b><span>visible</span></div>
          </div>
          <div className="stand-inspector-actions">
            <button type="button" className="ghost-button" onClick={onDuplicate}><Copy size={14} /> Duplicar</button>
            <button type="button" className="ghost-button" onClick={onRotate}><RotateCw size={14} /> Girar</button>
            <button type="button" className="ghost-button" onClick={onToggleHidden}>{selected.hidden ? <Eye size={14} /> : <EyeOff size={14} />} {selected.hidden ? "Mostrar" : "Ocultar"}</button>
            <button type="button" className="ghost-button is-danger" onClick={onDelete}><Trash2 size={14} /> Borrar</button>
          </div>
          <label className="toggle-row">
            <span>
              <strong>Merch decorativo</strong>
              <small>Llena las bandejas de este módulo</small>
            </span>
            <input type="checkbox" checked={selected.merch} onChange={onToggleMerch} />
            <span className="switch" aria-hidden="true" />
          </label>
          <p className="panel-note">Puedes cambiar sistema, medidas, niveles, insertos, colores y piezas desde <b>Diseño</b>.</p>
        </section>
      ) : (
        <section className="inspector-card">
          <div className="inspector-title">
            <span className="inspector-icon"><Store size={18} /></span>
            <div>
              <small>Resumen del stand</small>
              <h3>{summary.modules} módulo{summary.modules === 1 ? "" : "s"} · {summary.footprint}</h3>
            </div>
          </div>
          <div className="summary-grid">
            <div><b>{summary.pieces}</b><span>piezas</span></div>
            <div><b>{summary.height ? `${(summary.height / 10).toFixed(0)} cm` : "—"}</b><span>alto</span></div>
            <div><b>{summary.material >= 1000 ? `${(summary.material / 1000).toFixed(1)} kg` : `${summary.material.toFixed(0)} g`}</b><span>material</span></div>
            <div><b>{plan.units.length}</b><span>módulos</span></div>
          </div>
          <p className="panel-note">Selecciona un módulo en el visor o en la lista para editarlo. Arrastra para moverlo por la rejilla.</p>
          <div className="stand-inspector-actions">
            <button type="button" className="ghost-button" onClick={onUndo} disabled={!canUndo}><Undo2 size={14} /> Deshacer</button>
            <button type="button" className="ghost-button" onClick={onRedo} disabled={!canRedo}><Redo2 size={14} /> Rehacer</button>
            <button type="button" className="ghost-button" onClick={onFit}><Maximize2 size={14} /> Centrar</button>
          </div>
        </section>
      )}

      <section className="inspector-card">
        <div className="card-head">
          <strong>Comprobaciones del stand</strong>
          <span className={`badge ${warnings.length ? "is-warn" : "is-ok"}`}>{warnings.length ? `${warnings.length} aviso(s)` : "Todo listo"}</span>
        </div>
        <div className="check-list">
          {checks.slice(0, 7).map((check) => (
            <div key={`${check.title}-${check.detail}`} className={`check-row is-${check.level}`}>
              {checkIcon(check.level)}
              <span><b>{check.title}</b><small>{check.detail}</small></span>
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="inspector-card">
          <div className="card-head">
            <strong>Preflight del módulo</strong>
            <span className={`badge ${!build ? "" : unitChecks.length ? "is-warn" : "is-ok"}`}>{!build ? "Calculando" : unitChecks.length ? `${unitChecks.length} aviso(s)` : "Sin avisos"}</span>
          </div>
          <div className="check-list">
            {!build ? (
              <div className="check-row">
                <Info size={15} />
                <span><b>Generando geometría</b><small>El preflight aparecerá al terminar.</small></span>
              </div>
            ) : unitChecks.length ? unitChecks.slice(0, 6).map((check, index) => (
              <div key={`${check.code}-${index}`} className={`check-row is-${check.level}`}>
                {checkIcon(check.level)}
                <span><b>{check.title}</b><small>{check.detail}</small></span>
              </div>
            )) : (
              <div className="check-row is-ok">
                <CheckCircle2 size={15} />
                <span><b>Módulo listo</b><small>Sin avisos de impresión para este expositor.</small></span>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="inspector-card">
        <div className="card-head"><strong>Ideas para el stand</strong><span className="badge"><Sparkles size={11} /></span></div>
        <div className="bom-list">
          <div><span><b>·</b> Mezcla sistemas</span><small>Llaveros y pegatinas atraen a públicos distintos.</small></div>
          <div><span><b>·</b> Deja pasillo</span><small>Separa una celda entre módulos para abrir bandejas.</small></div>
          <div><span><b>·</b> Gira el módulo</span><small>Las esquinas quedan mejor con expositores a 90°.</small></div>
        </div>
      </section>
    </div>
  );
}
