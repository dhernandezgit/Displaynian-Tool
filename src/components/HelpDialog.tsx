import { X } from "lucide-react";

export default function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal help-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><small>Guía rápida</small><h2>Cómo usar Displaynian</h2></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="help-body">
          <h3>1. Elige el sistema</h3>
          <p>Llaveros, pegatinas, joyería, posavasos, marcapáginas, bolígrafos o mixto. Después ajusta ancho, fondo, niveles y panel. Todo es opcional: puedes desactivar cualquier pieza desde el catálogo o desde la lista de piezas.</p>
          <h3>2. Personaliza por partes</h3>
          <p>Cada bandeja tiene su inserto. Haz clic en una pieza del visor para cambiar color, escala o visibilidad. Los enlaces y pasadores son piezas reales, no decoración.</p>
          <h3>3. Comprueba el montaje</h3>
          <p>Usa <b>Abierto</b>, <b>Plegado</b>, <b>Transporte</b> y <b>Despiece</b>. En plegado, las bandejas se apilan en acordeón y la tapa cubre el conjunto.</p>
          <h3>4. Modo 3D</h3>
          <p>El sistema usa bandejas de 2,4 mm, enlaces de 4 mm y pasadores de 4,2 mm. Imprime los enlaces tumbados y los pasadores en vertical. Haz una prueba de encaje antes del set completo.</p>
          <h3>5. Modo láser</h3>
          <p>Genera SVG y DXF por hoja con capas de corte. Mide el espesor real y el kerf, corta una galga y ajusta la holgura. La bisagra viva solo es recomendable en chapa de 3–4 mm con la veta paralela al eje de flexión.</p>
          <h3>Skadis y rejilla</h3>
          <p>El panel SKÅDIS usa ranuras de 5 × 15 mm, paso 40 mm y desfase 20 mm. Los ganchos de rejilla se adaptan al paso y diámetro de alambre. Haz una prueba de encaje antes de imprimir el set completo.</p>
          <h3>Transporte</h3>
          <p>Los enlaces giran en acordeón, las bandejas se apilan y el panel se guarda plano bajo la tapa. Para producto suelto, retíralo antes de plegar; los ganchos pueden quedarse en el panel.</p>
        </div>
      </div>
    </div>
  );
}
