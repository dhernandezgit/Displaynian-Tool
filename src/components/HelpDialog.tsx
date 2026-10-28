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
          <p>Llaveros, pegatinas, joyería, posavasos, marcapáginas, bolígrafos o mixto. Después ajusta ancho, fondo, niveles, paso cantilever y panel. Todo es opcional: puedes desactivar cualquier pieza desde el catálogo o desde la lista de piezas.</p>
          <h3>2. Personaliza por partes</h3>
          <p>Cada bandeja tiene su separación y su contenido: contenedores individuales, separadores, insertos o bandeja vacía. Haz clic en una pieza del visor para cambiar color, escala o visibilidad.</p>
          <h3>3. Comprueba el montaje</h3>
          <p><b>Montado</b>: bandejas escalonadas unidas por brazos ranurados y pasadores. <b>Plegado</b>: brazos en vertical y bandejas apiladas. <b>Transporte</b>: caja cerrada con asa. <b>Despiece</b>: piezas separadas.</p>
          <p>Este sistema es un <b>cantilever</b> real: cuatro brazos ranurados por hueco (delantero y trasero a cada lado) unen cada bandeja con pasadores; los huecos alternan dos carriles laterales para no chocar al plegar. El mecanismo queda montado; no hay que desmontarlo para plegarlo.</p>
          <h3>4. Montaje</h3>
          <p>Imprime primero <b>un brazo y un pasador</b> y comprueba que el pasador entra en el agujero y desliza en la ranura. Después imprime el set completo.</p>
          <p>Empieza por la bandeja inferior: mete los pasadores inferiores por el agujero de cada brazo hasta la pared de la bandeja. Coloca la bandeja siguiente, alinea su pared con la ranura y mete los pasadores superiores. Repite el proceso hacia arriba. Los brazos quedan fuera de la bandeja y los pasadores no se desmontan.</p>
          <p>Para plegar, retira el panel y déjalo encima; baja las bandejas hasta que los brazos queden verticales. La caja de transporte cubre la pila.</p>
          <h3>5. Modo 3D</h3>
          <p>El sistema usa bandejas de 2,4 mm, brazos de 4 mm y pasadores de 4,2 mm. Imprime los brazos tumbados y los pasadores en horizontal. Haz una prueba de encaje antes del set completo.</p>
          <h3>6. Modo láser</h3>
          <p>Genera SVG y DXF por hoja con capas de corte. Mide el espesor real y el kerf, corta una galga y ajusta la holgura. La bisagra viva solo es recomendable en chapa de 3–4 mm con la veta paralela al eje de flexión.</p>
          <h3>Skadis y rejilla</h3>
          <p>El panel SKÅDIS es opcional y está desactivado por defecto: actívalo en Panel trasero. Usa ranuras de 5 × 15 mm, paso 40 mm y desfase 20 mm. Los ganchos de rejilla se adaptan al paso y diámetro de alambre. Haz una prueba de encaje antes del set completo.</p>
          <h3>Transporte</h3>
          <p>La vista Transporte muestra una caja cerrada con asa: cubre la pila plegada y los brazos. Si quieres ver el mecanismo, usa Plegado; si quieres trabajar, usa Montado.</p>
        </div>
      </div>
    </div>
  );
}
