import { Box, Download, FileArchive, FileBox, FileCode2, FileDown, Layers, Scissors, X } from "lucide-react";
import type { BuildResult } from "../types";

export type ExportKind = "3mf" | "stlzip" | "obj" | "laserzip" | "project" | "mockup";

export default function ExportDialog({
  open,
  build,
  busy,
  onClose,
  onExport,
}: {
  open: boolean;
  build: BuildResult | null;
  busy: boolean;
  onClose: () => void;
  onExport: (kind: ExportKind) => void;
}) {
  if (!open) return null;
  const laser = build?.mode === "laser";
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal export-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <small>Salida del proyecto</small>
            <h2>Exportar Displaynian</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="export-summary">
          <span><Layers size={14} /> {build?.parts.length || 0} piezas</span>
          <span><Box size={14} /> {build ? `${build.dimensions.width.toFixed(0)} × ${build.dimensions.depth.toFixed(0)} × ${build.dimensions.height.toFixed(0)} mm` : "—"}</span>
          <span>{laser ? `${build?.laser?.sheets.length || 0} hojas láser` : `${(build?.material_grams || 0).toFixed(0)} g estimados`}</span>
        </div>
        <div className="export-grid">
          {!laser ? (
            <>
              <button type="button" disabled={busy} onClick={() => onExport("3mf")}>
                <FileBox size={22} /><strong>3MF montado</strong><small>Objetos separados y colores</small><Download size={15} />
              </button>
              <button type="button" disabled={busy} onClick={() => onExport("stlzip")}>
                <FileArchive size={22} /><strong>STL por pieza</strong><small>ZIP con CSV de piezas</small><Download size={15} />
              </button>
              <button type="button" disabled={busy} onClick={() => onExport("obj")}>
                <FileCode2 size={22} /><strong>OBJ</strong><small>Todas las piezas juntas</small><Download size={15} />
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => onExport("laserzip")}>
              <Scissors size={22} /><strong>Láser ZIP</strong><small>SVG + DXF + CSV + ajustes</small><Download size={15} />
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onExport("project")}>
            <FileDown size={22} /><strong>Proyecto</strong><small>JSON importable</small><Download size={15} />
          </button>
          <button type="button" disabled={busy} onClick={() => onExport("mockup")}>
            <FileArchive size={22} /><strong>Mockup PNG</strong><small>Vista actual del visor</small><Download size={15} />
          </button>
        </div>
        <p className="modal-note">Todo se genera en tu navegador. Los archivos no se suben a ningún servidor.</p>
      </div>
    </div>
  );
}
