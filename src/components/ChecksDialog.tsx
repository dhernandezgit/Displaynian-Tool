import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { BuildResult } from "../types";

export default function ChecksDialog({ open, build, onClose }: { open: boolean; build: BuildResult | null; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal checks-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Preflight</small><h2>Comprobaciones</h2></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="checks-full">
          {build?.checks.map((check) => (
            <div key={`${check.code}-${check.title}`} className={`check-full is-${check.level}`}>
              {check.level === "ok" ? <CheckCircle2 size={18} /> : check.level === "warn" ? <AlertTriangle size={18} /> : check.level === "error" ? <XCircle size={18} /> : <Info size={18} />}
              <div><strong>{check.title}</strong><p>{check.detail}</p></div>
            </div>
          ))}
        </div>
        <p className="modal-note">Las comprobaciones son orientativas. Haz una prueba de encaje y una primera impresión/corte antes de producción.</p>
      </div>
    </div>
  );
}
