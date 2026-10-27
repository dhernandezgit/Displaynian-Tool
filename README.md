# Displaynian

**Versión 0.4.1** · Displays plegables, modulares y paramétricos para ferias, mercados y tiendas.

Displaynian genera estructuras de exposición a partir de parámetros. El motor de geometría está escrito en **Python** y se ejecuta en el navegador con **Pyodide/WebAssembly**. El frontend usa **React + Three.js**. No hay servidor, no se suben archivos y no hace falta cuenta.

- **Web:** `https://dhernandezgit.github.io/Displaynian-Tool/web/`
- **Repo:** `https://github.com/dhernandezgit/Displaynian-Tool`
- **Modos:** impresión 3D FDM y corte láser.
- **Salidas:** STL por pieza, 3MF, OBJ, SVG, DXF, ZIP láser, CSV/BOM, proyecto `.displaynian.json` y mockup PNG.

## Qué hace

Displaynian no es un catálogo de modelos cerrados: es un generador. Cambias medidas, niveles, panel, accesorios y mecánica, y todas las piezas se recalculan.

### Sistemas de partida

- **Llaveros y colgantes** con bandejas de compartimentos o contenedores individuales, enlaces y pasadores. El panel SKÅDIS es opcional y está apagado por defecto.
- **Pegatinas, postales y tarjetas** con bandejas amplias y poco profundas.
- **Joyería** con insertos de anillos, pendientes, pulseras y collares.
- **Posavasos** con raíles y topes.
- **Marcapáginas** con divisores de cuatro compartimentos.
- **Bolígrafos y herramientas** con inserto de seis huecos.
- **Sistema mixto** para combinar todo.
- **Formato compacto 170 × 160 mm** por defecto, **Wide 340 / Narrow 230** y **3/4/5 bandejas** como variantes rápidas. Wide 340 se divide automáticamente para camas de 256 mm.
- **Auto-división** de base, bandejas y tapa para camas pequeñas, con placas de unión y tornillos M3.

### Todo es opcional y editable

Puedes activar o desactivar base, panel trasero, enlaces, uniones de panel, pies, tapa, asa, cartel y ganchos. Las bandejas se activan una a una y cada una tiene su inserto.

Cada pieza generada se puede seleccionar en el visor y editar por separado:

- Color.
- Escala.
- Visibilidad.
- Nombre y grupo.
- Inserto y configuración de su nivel.
- Orientación de impresión sugerida.

La altura y el fondo de bandeja se controlan de forma global para que los enlaces y pasadores queden alineados. El cartel acepta una etiqueta de papel de 80 × 20 mm con el texto que escribas.

### Plegado y transporte

- **Acordeón real** con cuatro enlaces por nivel y pasadores impresos. Los enlaces y pasadores **no desaparecen**: siguen montados en Desplegado y Plegado.
- **Auto-división** de base, bandejas y caja si superan la cama, con placas de unión.
- Vistas **Desplegado**, **Plegado**, **Transporte** y **Despiece**.
- **Plegado** muestra el mecanismo y las uniones, con cinemática exacta de enlaces y pasadores; **Transporte** muestra una caja cerrada con asa, más compacta y protectora.
- Separación **independiente por nivel**.
- Contenedores individuales extraíbles, con tapa opcional, en lugar de separadores.
- Panel trasero SKÅDIS **opcional**, apagado por defecto.
- Ganchos SKÅDIS y de rejilla metálica cuando se activa el panel.

### Modo 3D

- Bandejas de **2,4 mm** de pared, divisoras de **1,6 mm**, enlaces de **4 mm** y pasadores de **4,2 mm**.
- Contenedores individuales de pared fina con tapas opcionales.
- Caja de transporte cerrada que cubre el conjunto plegado.
- Perfiles de impresora A1 Mini, 220 genérica, A1/P1S/X1C, H2D/H2S y cama personalizada.
- Materiales PLA, PETG y ASA.
- Avisos de cama, paredes finas, divisores, panel, estabilidad, enlaces y pasadores.
- STL por pieza, 3MF montado, OBJ y etiqueta de cartel SVG.

### Modo láser

- Materiales de 3 a 6 mm, espesor real y kerf configurables.
- Flat-pack de bandejas/paneles con finger joints y encajes.
- **Laterales con alas plegables** unidas por línea de plegado; las bandejas se apoyan en ellas.
- Separación por nivel compatible con los laterales.
- **Divisores de bandeja** para separar producto.
- SVGs y DXF por hoja con capas de corte y líneas de plegado.
- Nesting en hojas A4, A3, 600 × 400, 900 × 600 o personalizadas.
- Galga de kerf y cupón de prueba de gancho SKÅDIS incluidos.
- Cartel de papel y kit impreso opcional con enlaces, pasadores y ganchos.
- Avisos de hoja, kerf, espesor real y alas plegables.

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
  foldable.py     bandejas, enlaces, pasadores, panel, auto-división y plegado acordeón
  engine.py       parámetros de fabricación, checks, BOM y exportadores
  laser.py        paneles 2D, cupones, signo, nesting, SVG y DXF
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
- Imprime un enlace y un pasador de prueba antes del set completo.
- El panel SKÅDIS no es necesario para el sistema de bandejas; si lo activas, comprueba que los ganchos quedan accesibles.
- Las alas del modo láser se pliegan mejor en chapa de 3–4 mm; en 6 mm pueden agrietarse.
- Los enlaces se imprimen tumbados y los pasadores en vertical.
- Los ganchos se imprimen de lado para que las capas recorran la dirección de carga.
- La bisagra viva es fiable en chapa de 3–4 mm; para 6 mm usa el kit de bisagras impresas.
- Revisa siempre el laminador: orientación, soportes, adhesión y temperatura.

## Inspiración

La app está inspirada en la categoría de displays plegables de mercado de **RKDesignATDigital** y en sistemas como IKEA SKÅDIS, rejillas metálicas y stands láser flat-pack. También se estudió un SVG de ejemplo de rack plegable para entender sus variantes wide/narrow, 3/4 niveles, cartel, cupones y encajes; no se ha copiado su geometría. La geometría, el código y los generadores de Displaynian son originales.

- SKÅDIS es una marca de Inter IKEA Systems B.V. Displaynian no está afiliado a IKEA.
- Código: MIT.
- React, Three.js, Pyodide, NumPy y Shapely conservan sus licencias.

Hecho para que un display quepa en el coche, se monte en segundos y se vea profesional.
