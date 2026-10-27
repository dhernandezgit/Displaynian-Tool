import type { BuildResult } from "../types";

export default function StatusBar({
  ready,
  build,
  progress,
  message,
}: {
  ready: boolean;
  build: BuildResult | null;
  progress: string;
  message: string;
}) {
  return (
    <footer className="statusbar">
      <span className={`status-dot ${ready ? "is-ready" : ""}`} />
      <span>{ready ? "Motor Python listo" : progress}</span>
      {message ? <span className="status-message">{message}</span> : null}
      <span className="status-spacer" />
      {build ? (
        <>
          {build.laser ? (
            <>
              <span>{build.laser.sheets.length} hojas</span>
              <span>{build.laser.sheets.reduce((total, sheet) => total + sheet.parts.length, 0)} piezas</span>
              <span>{build.laser.thickness} mm · kerf {build.laser.kerf.toFixed(2)}</span>
            </>
          ) : (
            <>
              <span>{build.parts.length} piezas</span>
              <span>{build.dimensions.width.toFixed(0)} × {build.dimensions.depth.toFixed(0)} × {build.dimensions.height.toFixed(0)} mm</span>
              <span>paquete {(build.dimensions.foldedHeight / 10).toFixed(1)} cm</span>
              <span>{build.material_grams >= 1000 ? `${(build.material_grams / 1000).toFixed(2)} kg` : `${build.material_grams.toFixed(0)} g`}</span>
            </>
          )}
          <span>{build.build_ms.toFixed(0)} ms</span>
        </>
      ) : null}
      <span>v{build?.version || "0.1.0"}</span>
    </footer>
  );
}
