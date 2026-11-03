import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { BuildResult, StandCheck } from "../types";

export default function ChecksDialog({
  open,
  build,
  standMode = false,
  standChecks = [],
  onClose,
}: {
  open: boolean;
  build: BuildResult | null;
  standMode?: boolean;
  standChecks?: StandCheck[];
  onClose: () => void;
}) {
  if (!open) return null;
  const checks = standMode ? standChecks : build?.checks || [];
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal checks-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Preflight</small><h2>{standMode ? "Comprobaciones del stand" : "Comprobaciones"}</h2></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="checks-full">
          {checks.map((check, index) => (
            <div key={`${check.title}-${index}`} className={`check-full is-${check.level}`}>
              {check.level === "ok" ? <CheckCircle2 size={18} /> : check.level === "warn" ? <AlertTriangle size={18} /> : check.level === "error" ? <XCircle size={18} /> : <Info size={18} />}
              <div><strong>{check.title}</strong><p>{check.detail}</p></div>
            </div>
          ))}
        </div>
        <p className="modal-note">{standMode ? "Separa los módulos para que las bandejas puedan abrirse y revisa que todos quepan en el stand." : "Las comprobaciones son orientativas. Haz una prueba de encaje y una primera impresión/corte antes de producción."}</p>
      </div>
    </div>
  );
}
