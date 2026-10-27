import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Layers,
  Palette,
  RotateCcw,
  Ruler,
  Scale3D,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { AppSettings, BuildPart, BuildResult, PrintCheck } from "../types";
import { NumberField } from "./Field";

function checkIcon(level: string) {
  if (level === "ok") return <CheckCircle2 size={15} />;
  if (level === "warn") return <AlertTriangle size={15} />;
  if (level === "error") return <XCircle size={15} />;
  return <Info size={15} />;
}

function printHint(category: string): string {
  if (category === "joint") return "Enlaces: imprimir tumbados, 4 mm de grosor, sin soportes. El pasador va aparte.";
  if (category === "hook") return "Ganchos: imprimir de lado, con las capas recorriendo el brazo.";
  if (category === "shelf") return "Bandejas: base en la cama, paredes de 2,4 mm y sin soportes.";
  if (category === "panel") return "Panel: 3 mm, en plano. Divide en filas/columnas si supera la cama.";
  if (category === "insert") return "Insertos: base plana; conos y cilindros en vertical.";
  if (category === "transport") return "Caja: imprimir con la abertura hacia abajo y el asa arriba; sin soportes.";
  if (category === "hardware") return "Pasadores: verticales, cabeza en la cama. Pies: en plano.";
  return "Apoya la cara más grande en la cama y revisa los voladizos.";
}

export default function PartInspector({
  build,
  settings,
  selectedId,
  onSelect,
  onPatch,
}: {
  build: BuildResult | null;
  settings: AppSettings;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (patch: Partial<AppSettings>) => void;
}) {
  const selected: BuildPart | null = build?.laser ? null : build?.parts.find((part) => part.id === selectedId) || null;
  const laser = build?.laser;
  const groups = new Map<string, BuildPart[]>();
  for (const part of build?.parts || []) {
    const list = groups.get(part.group) || [];
    list.push(part);
    groups.set(part.group, list);
  }
  const warnings = build?.checks.filter((check) => check.level === "warn" || check.level === "error") || [];
  const ok = build?.checks.filter((check) => check.level === "ok") || [];

  const setPartColor = (id: string, color: string) => {
    onPatch({ partColors: { ...settings.partColors, [id]: color } });
  };
  const setPartScale = (id: string, scale: number) => {
    onPatch({ partScales: { ...settings.partScales, [id]: scale } });
  };
  const togglePart = (id: string) => {
    const disabled = new Set(settings.disabledParts);
    if (disabled.has(id)) disabled.delete(id);
    else disabled.add(id);
    onPatch({ disabledParts: Array.from(disabled) });
  };
  const resetPart = (id: string) => {
    const colors = { ...settings.partColors };
    const scales = { ...settings.partScales };
    delete colors[id];
    delete scales[id];
    const disabled = settings.disabledParts.filter((value) => value !== id);
    onPatch({ partColors: colors, partScales: scales, disabledParts: disabled });
  };

  return (
    <div className="inspector">
      {laser ? (
        <section className="inspector-card">
          <div className="inspector-title">
            <span className="inspector-icon"><Layers size={18} /></span>
            <div>
              <small>Corte láser</small>
              <h3>{laser.sheets.length} hoja(s) · {laser.thickness} mm</h3>
            </div>
          </div>
          <div className="summary-grid">
            <div><b>{laser.sheets.length}</b><span>hojas</span></div>
            <div><b>{laser.sheets.reduce((total, sheet) => total + sheet.parts.length, 0)}</b><span>piezas</span></div>
            <div><b>{laser.kerf.toFixed(2)}</b><span>mm kerf</span></div>
            <div><b>{laser.printedKit ? "Sí" : "No"}</b><span>kit 3D</span></div>
          </div>
          <p className="panel-note">Las láminas son el flat-pack de corte. Los enlaces y pasadores del modo 3D se incluyen como kit impreso opcional.</p>
          {laser.overflow.length ? <p className="panel-note">No caben: {laser.overflow.join(", ")}</p> : null}
        </section>
      ) : selected ? (
        <section className="inspector-card selected-part">
          <div className="inspector-title">
            <span className="part-swatch" style={{ background: selected.color }} />
            <div>
              <small>{selected.group} · {selected.category}</small>
              <h3>{selected.name}</h3>
            </div>
            <button className="icon-button" type="button" onClick={() => onSelect(null)} title="Cerrar selección">
              <XCircle size={17} />
            </button>
          </div>
          <div className="part-metrics">
            <span><Ruler size={13} /> {selected.dimensions.width.toFixed(1)} × {selected.dimensions.depth.toFixed(1)} × {selected.dimensions.height.toFixed(1)} mm</span>
            <span><Box size={13} /> {(selected.volume / 1000).toFixed(1)} cm³</span>
            <span><Layers size={13} /> {selected.triangles.toLocaleString("es-ES")} triángulos</span>
          </div>
          <label className="field inline-color">
            <span className="field-label"><span><Palette size={13} /> Color de la pieza</span></span>
            <span className="color-wrap">
              <input
                type="color"
                value={settings.partColors[selected.id] || selected.color}
                onChange={(event) => setPartColor(selected.id, event.target.value)}
              />
              <code>{settings.partColors[selected.id] || selected.color}</code>
            </span>
          </label>
          <NumberField
            label="Escala de la pieza"
            value={settings.partScales[selected.id] || 1}
            min={0.2}
            max={3}
            step={0.01}
            unit="×"
            onChange={(value) => setPartScale(selected.id, value)}
          />
          <div className="part-actions">
            <button type="button" className="ghost-button" onClick={() => resetPart(selected.id)}>
              <RotateCcw size={14} /> Restablecer
            </button>
            <button type="button" className="ghost-button" onClick={() => togglePart(selected.id)}>
              {settings.disabledParts.includes(selected.id) ? <Eye size={14} /> : <EyeOff size={14} />}
              {settings.disabledParts.includes(selected.id) ? "Mostrar" : "Ocultar"}
            </button>
          </div>
          <p className="panel-note">{printHint(selected.category)}</p>
        </section>
      ) : !laser ? (
        <section className="inspector-card">
          <div className="inspector-title">
            <span className="inspector-icon"><ShieldAlert size={18} /></span>
            <div>
              <small>Resumen del proyecto</small>
              <h3>{build ? `${build.dimensions.width.toFixed(0)} × ${build.dimensions.depth.toFixed(0)} × ${build.dimensions.height.toFixed(0)} mm` : "Sin geometría"}</h3>
            </div>
          </div>
          {build ? (
            <div className="summary-grid">
              <div><b>{build.parts.length}</b><span>piezas</span></div>
              <div><b>{build.dimensions.levels}</b><span>niveles</span></div>
              <div><b>{(build.dimensions.foldedHeight / 10).toFixed(1)}</b><span>cm plegado</span></div>
              <div><b>{build.material_grams >= 1000 ? `${(build.material_grams / 1000).toFixed(1)} kg` : `${build.material_grams.toFixed(0)} g`}</b><span>material</span></div>
            </div>
          ) : null}
          <p className="panel-note">Haz clic en cualquier pieza del visor o de la lista para editarla por separado.</p>
        </section>
      ) : null}

      {build ? (
        <section className="inspector-card">
          <div className="card-head">
            <strong>Comprobaciones</strong>
            <span className={`badge ${warnings.length ? "is-warn" : "is-ok"}`}>{warnings.length ? `${warnings.length} aviso(s)` : "Todo listo"}</span>
          </div>
          <div className="check-list">
            {[...warnings, ...ok].slice(0, 6).map((check: PrintCheck) => (
              <div key={`${check.code}-${check.title}`} className={`check-row is-${check.level}`}>
                {checkIcon(check.level)}
                <span><b>{check.title}</b><small>{check.detail}</small></span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!laser ? <section className="inspector-card parts-card">
        <div className="card-head">
          <strong>Piezas generadas</strong>
          <span className="badge">{build?.parts.length || 0}</span>
        </div>
        <div className="parts-scroll">
          {Array.from(groups.entries()).map(([group, parts]) => (
            <div key={group} className="part-group">
              <small>{group.replace("shelf-", "Nivel ")}</small>
              {parts.map((part) => {
                const hidden = settings.disabledParts.includes(part.id);
                return (
                  <div key={part.id} className={`part-row ${selectedId === part.id ? "is-selected" : ""} ${hidden ? "is-hidden" : ""}`}>
                    <button type="button" className="part-main" onClick={() => onSelect(part.id)}>
                      <span className="part-swatch" style={{ background: part.color }} />
                      <span>{part.name}</span>
                    </button>
                    <button type="button" className="part-eye" onClick={() => togglePart(part.id)} title={hidden ? "Mostrar" : "Ocultar"}>
                      {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section> : null}

      {!laser && build && build.bom.length ? (
        <section className="inspector-card">
          <div className="card-head"><strong>Material adicional</strong><span className="badge">{build.bom.length}</span></div>
          <div className="bom-list">
            {build.bom.map((item) => (
              <div key={item.name}>
                <span><b>{item.quantity}×</b> {item.name}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="inspector-footer">
        <Scale3D size={14} />
        <span>Edición por pieza activa</span>
      </div>
    </div>
  );
}
