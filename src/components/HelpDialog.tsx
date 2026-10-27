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
          <p>Cada nivel tiene su altura, fondo, inclinación, labio e inserto. Haz clic en una pieza del visor para cambiar su color, escala o visibilidad. Las esquinas, clips, escuadras y topes son módulos independientes.</p>
          <h3>3. Comprueba el montaje</h3>
          <p>Usa <b>Abierto</b>, <b>Plegado</b>, <b>Transporte</b> y <b>Despiece</b>. El control de plegado anima la transformación. La tapa y el asa solo se muestran en transporte.</p>
          <h3>4. Modo 3D</h3>
          <p>Genera STL por pieza, 3MF con objetos separados y OBJ. Para displays grandes, divide el panel y usa clips de unión. Imprime los ganchos de lado y usa PETG para plegados frecuentes.</p>
          <h3>5. Modo láser</h3>
          <p>Genera SVG y DXF por hoja con capas de corte. Mide el espesor real y el kerf, corta una galga y ajusta la holgura. La bisagra viva solo es recomendable en chapa de 3–4 mm con la veta paralela al eje de flexión.</p>
          <h3>Skadis y rejilla</h3>
          <p>El panel SKÅDIS usa ranuras de 5 × 15 mm, paso 40 mm y desfase 20 mm. Los ganchos de rejilla se adaptan al paso y diámetro de alambre que configures. Haz una prueba de encaje antes de imprimir el set completo.</p>
          <h3>Transporte</h3>
          <p>El Z-fold baja el panel y las patas, apila las bandejas y coloca tapa y asa. Los productos colgados pueden quedarse en los ganchos; para producto suelto usa bandejas con tapa o retíralo antes de plegar.</p>
        </div>
      </div>
    </div>
  );
}
