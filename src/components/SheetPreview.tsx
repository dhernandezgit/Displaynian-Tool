import { Download, FileCode2, Scissors } from "lucide-react";
import { useMemo, useState } from "react";
import type { LaserResult, LaserSheet } from "../types";

export default function SheetPreview({
  laser,
  onDownload,
}: {
  laser: LaserResult;
  onDownload: (sheet: LaserSheet, format: "svg" | "dxf") => void;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(0.9);
  const sheet = laser.sheets[Math.min(active, laser.sheets.length - 1)];
  const src = useMemo(() => {
    if (!sheet) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sheet.svg)}`;
  }, [sheet]);
  if (!sheet) return <div className="sheet-empty">No hay hojas láser.</div>;
  return (
    <div className="sheet-preview">
      <div className="sheet-toolbar">
        <div className="sheet-tabs">
          {laser.sheets.map((item, index) => (
            <button key={item.index} type="button" className={index === active ? "is-active" : ""} onClick={() => setActive(index)}>
              Hoja {item.index}
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          <input type="range" min={0.35} max={2} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <button type="button" onClick={() => onDownload(sheet, "svg")}><Download size={14} /> SVG</button>
          <button type="button" onClick={() => onDownload(sheet, "dxf")}><FileCode2 size={14} /> DXF</button>
        </div>
      </div>
      <div className="sheet-stage">
        <div className="sheet-paper" style={{ width: `${Math.min(100, sheet.width * zoom / 4)}%`, aspectRatio: `${sheet.width} / ${sheet.height}` }}>
          <img src={src} alt={`Hoja ${sheet.index}`} />
        </div>
      </div>
      <div className="sheet-meta">
        <span><Scissors size={14} /> {laser.thickness} mm · kerf {laser.kerf} mm</span>
        <span>{sheet.parts.length} piezas</span>
        <span>{sheet.width} × {sheet.height} mm</span>
        {laser.overflow.length ? <span className="is-warn">{laser.overflow.length} pieza(s) no caben</span> : null}
      </div>
    </div>
  );
}
