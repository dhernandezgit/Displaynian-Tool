import { Box, Download, FileArchive, FileBox, FileCode2, FileDown, FileSpreadsheet, Layers, Scissors, Store, X } from "lucide-react";
import type { BuildResult, StandPlan } from "../types";
import { standSummary } from "../lib/stand";

export type ExportKind = "3mf" | "stlzip" | "obj" | "laserzip" | "project" | "mockup" | "stand3mf" | "standobj" | "standcsv";

export default function ExportDialog({
  open,
  build,
  standMode = false,
  stand,
  standBuilds = {},
  busy,
  onClose,
  onExport,
}: {
  open: boolean;
  build: BuildResult | null;
  standMode?: boolean;
  stand?: StandPlan;
  standBuilds?: Record<string, BuildResult>;
  busy: boolean;
  onClose: () => void;
  onExport: (kind: ExportKind) => void;
}) {
  if (!open) return null;
  const laser = !standMode && build?.mode === "laser";
  const summary = stand && standMode ? standSummary(stand, standBuilds) : null;
  const hasVisibleStand = Boolean(stand?.units.some((unit) => !unit.hidden));
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal export-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <small>Salida del proyecto</small>
            <h2>{standMode ? "Exportar stand" : "Exportar Displaynian"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="export-summary">
          {standMode && summary ? (
            <>
              <span><Store size={14} /> {summary.modules} módulos</span>
              <span><Box size={14} /> {summary.footprint}</span>
              <span><Layers size={14} /> {summary.pieces} piezas</span>
              <span>{summary.material >= 1000 ? `${(summary.material / 1000).toFixed(2)} kg` : `${summary.material.toFixed(0)} g`}</span>
            </>
          ) : (
            <>
              <span><Layers size={14} /> {build?.parts.length || 0} piezas</span>
              <span><Box size={14} /> {build ? `${build.dimensions.width.toFixed(0)} × ${build.dimensions.depth.toFixed(0)} × ${build.dimensions.height.toFixed(0)} mm` : "—"}</span>
              <span>{laser ? `${build?.laser?.sheets.length || 0} hojas láser` : `${(build?.material_grams || 0).toFixed(0)} g estimados`}</span>
            </>
          )}
        </div>
        <div className="export-grid">
          {standMode ? (
            <>
              <button type="button" disabled={busy || !hasVisibleStand} onClick={() => onExport("stand3mf")}>
                <FileBox size={22} /><strong>Stand 3MF</strong><small>Todos los módulos montados</small><Download size={15} />
              </button>
              <button type="button" disabled={busy || !hasVisibleStand} onClick={() => onExport("standobj")}>
                <FileCode2 size={22} /><strong>Stand OBJ</strong><small>Vista ensamblada para revisar</small><Download size={15} />
              </button>
              <button type="button" disabled={busy} onClick={() => onExport("standcsv")}>
                <FileSpreadsheet size={22} /><strong>Plan CSV</strong><small>Módulos, celdas y material</small><Download size={15} />
              </button>
            </>
          ) : !laser ? (
            <>
              <button type="button" disabled={busy} onClick={() => onExport("3mf")}>
                <FileBox size={22} /><strong>3MF montado</strong><small>Ensamblado, objetos y colores</small><Download size={15} />
              </button>
              <button type="button" disabled={busy} onClick={() => onExport("stlzip")}>
                <FileArchive size={22} /><strong>STL por pieza</strong><small>ZIP con CSV de piezas</small><Download size={15} />
              </button>
              <button type="button" disabled={busy} onClick={() => onExport("obj")}>
                <FileCode2 size={22} /><strong>OBJ</strong><small>Ensamblado para revisar</small><Download size={15} />
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => onExport("laserzip")}>
              <Scissors size={22} /><strong>Láser ZIP</strong><small>SVG + DXF + CSV + ajustes</small><Download size={15} />
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onExport("project")}>
            <FileDown size={22} /><strong>Proyecto</strong><small>JSON importable con todo</small><Download size={15} />
          </button>
          <button type="button" disabled={busy} onClick={() => onExport("mockup")}>
            <FileArchive size={22} /><strong>Mockup PNG</strong><small>{standMode ? "Vista actual del stand" : "Vista actual del visor"}</small><Download size={15} />
          </button>
        </div>
        <p className="modal-note">
          Todo se genera en tu navegador. Los archivos no se suben a ningún servidor.
          {standMode ? " El 3MF/OBJ incluye los expositores; el merch decorativo solo aparece en el mockup." : ""}
        </p>
      </div>
    </div>
  );
}
