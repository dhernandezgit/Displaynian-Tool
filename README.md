# Displaynian

**Versión 0.1.0** · Displays plegables, modulares y paramétricos para ferias, mercados y tiendas.

Displaynian genera estructuras de exposición a partir de parámetros. El motor de geometría está escrito en **Python** y se ejecuta en el navegador con **Pyodide/WebAssembly**. El frontend usa **React + Three.js**. No hay servidor, no se suben archivos y no hace falta cuenta.

- **Web:** `https://dhernandezgit.github.io/Displaynian-Tool/web/`
- **Repo:** `https://github.com/dhernandezgit/Displaynian-Tool`
- **Modos:** impresión 3D FDM y corte láser.
- **Salidas:** STL por pieza, 3MF, OBJ, SVG, DXF, ZIP láser, CSV/BOM, proyecto `.displaynian.json` y mockup PNG.

## Qué hace

Displaynian no es un catálogo de modelos cerrados: es un generador. Cambias medidas, niveles, panel, accesorios y mecánica, y todas las piezas se recalculan.

### Sistemas de partida

- **Llaveros y colgantes** con panel SKÅDIS, ganchos, bandejas y portaprecios.
- **Pegatinas, postales y tarjetas** con niveles profundos y labios.
- **Joyería** con conos de anillos, tarjetas de pendientes, pulseras, collares, panal y panel de marca.
- **Posavasos** con raíles, topes y cubierta de transporte.
- **Marcapáginas** con insertos de cuatro compartimentos.
- **Bolígrafos y herramientas** con inserto de seis huecos.
- **Sistema mixto** para combinar todo.

### Todo es opcional y editable

Puedes activar o desactivar base, marco trasero, marco delantero, bloqueos, panel, niveles, ganchos, bandejas, tapas, precios, letras, cartel, toldo, esquinas, clips, escuadras, topes, colgadores y transporte.

Cada pieza generada se puede seleccionar en el visor y editar por separado:

- Color.
- Escala.
- Visibilidad.
- Nombre y grupo.
- Inserto y configuración de su nivel.
- Orientación de impresión sugerida.

Los niveles tienen altura, fondo, inclinación, labio e inserto independientes. Las esquinas y uniones tienen longitud, separación, radio y diámetro de tornillo configurables.

### Plegado y transporte

- **Z-fold** con bandejas extraíbles y bloqueos de raíl.
- **Acordeón nivelado** como variante experimental.
- Vistas **Abierto**, **Plegado**, **Transporte** y **Despiece**.
- Animación de plegado con control manual.
- Tapa, asa, bloqueos, lastre y ranuras para correas.
- Panel trasero SKÅDIS con ranuras de 5 × 15 mm, paso 40 mm y desfase 20 mm.
- Ganchos SKÅDIS, ganchos para rejilla metálica y seguros de gancho.
- Ganchos con paso y diámetro de alambre ajustables.

### Modo 3D

- Perfiles de impresora A1 Mini, 220 genérica, A1/P1S/X1C, H2D/H2S y cama personalizada.
- Materiales PLA, PETG y ASA.
- Paredes, relleno, boquilla, capa y holgura.
- Uniones por clip, pasadores, tornillos Chicago M5 o híbridas.
- Avisos de cama, estabilidad, vuelco, capacidad de ganchos, panel sin dividir y fatiga de clips.
- STL por pieza, 3MF montado y OBJ.

### Modo láser

- Materiales de 3 a 6 mm, espesor real y kerf configurables.
- SVGs y DXF por hoja con capas de corte, grabado y marcado.
- Nesting en hojas A4, A3, 600 × 400, 900 × 600 o personalizadas.
- Finger joints, encajes, holgura, dogbones y compensación de kerf.
- Bisagra viva opcional para chapa fina, con aviso de veta y espesor.
- Kit impreso opcional con ganchos, insertos, accesorios y herrajes dentro del ZIP láser.
- Avisos de hoja, kerf, espesor real y bisagra.

### Interfaz

- Selector de modo 3D/Láser claramente separado.
- Catálogo por grupos y búsqueda de piezas.
- Inspector por pieza y resumen de material adicional.
- Preflight con avisos y correcciones sugeridas.
- Presets de sistema y de impresora.
- Tema claro y oscuro.
- Guardado automático, exportación e importación de proyecto.
- Todo en español.

## Arquitectura

```text
displaynian/
  params.py       parámetros, presets y normalización
  mesh.py         mallas, extrusión, revolución, STL/3MF/OBJ
  engine.py       estructura, niveles, ganchos, inserts, transporte y checks
  laser.py        paneles 2D, encajes, bisagra viva, nesting, SVG y DXF
  webapi.py       puente JSON para Pyodide
src/
  App.tsx         estado, modos, vistas, exportación
  components/     visor, paneles, inspector, diálogos
  hooks/          motor Python en Web Worker
  workers/        carga de Pyodide y paquete Python
tests/            pruebas de geometría, exportadores y parámetros
```

La geometría se construye con **Shapely + NumPy** y operaciones 2D + extrusión/revolución/barrido. No se usa CSG 3D pesado. Las piezas que se tocan se exportan como objetos separados, y el laminador las une al cortar.

## Desarrollo

Requisitos: Python 3.10+ y Node 22+.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
npm install
npm run dev
```

Abre `http://127.0.0.1:5173/`.

```bash
python3 -m pytest -q
npm run build
```

## Despliegue

GitHub Actions ejecuta tests, compila `dist/` y publica con **GitHub Pages → Source: GitHub Actions**.

La app queda en `https://dhernandezgit.github.io/Displaynian-Tool/web/`.

## Límites y seguridad

- Es un generador paramétrico, no una ingeniería certificada. Haz una **prueba de encaje** y una primera impresión/corte antes de producción.
- Mide el espesor real del material y el kerf de tu máquina.
- Para plegado frecuente usa PETG o ASA; el PLA puede fatigarse.
- Los ganchos se imprimen de lado para que las capas recorran la dirección de carga.
- La bisagra viva es fiable en chapa de 3–4 mm; para 6 mm usa el kit de bisagras impresas.
- Revisa siempre el laminador: orientación, soportes, adhesión y temperatura.

## Inspiración

La app está inspirada en la categoría de displays plegables de mercado de **RKDesignATDigital** y en sistemas como IKEA SKÅDIS, rejillas metálicas y stands láser flat-pack. La geometría, el código y los generadores son originales; no se han copiado archivos ni modelos del catálogo de referencia.

- SKÅDIS es una marca de Inter IKEA Systems B.V. Displaynian no está afiliado a IKEA.
- Código: MIT.
- React, Three.js, Pyodide, NumPy y Shapely conservan sus licencias.

Hecho para que un display quepa en el coche, se monte en segundos y se vea profesional.
