# Displaynian

**Versión 0.5.0** · Expositor modular flat-pack para ferias, mercados y tiendas.

Displaynian genera un expositor **montable sin tornillos** a partir de parámetros. El motor de geometría está escrito en **Python** y se ejecuta en el navegador con **Pyodide/WebAssembly**; el frontend usa **React + Three.js**. No hay servidor, no se suben archivos y no hace falta cuenta.

- **Web:** `https://dhernandezgit.github.io/Displaynian-Tool/web/`
- **Repo:** `https://github.com/dhernandezgit/Displaynian-Tool`
- **Modos:** impresión 3D FDM y corte láser.
- **Salidas:** STL por pieza, 3MF, OBJ, SVG, DXF, ZIP láser, BOM CSV, proyecto `.displaynian.json` y mockup PNG.

## Qué hace

No es un catálogo de modelos cerrados: cambias medidas, número de niveles, inclinación, contenido, panel y accesorios, y todas las piezas se recalculan.

### Sistemas de partida

Cada tarjeta cambia de verdad la geometría, no solo el color:

- **Llaveros:** tres bandejas con contenedores individuales extraíbles y tapas.
- **Pegatinas y tarjetas:** tres bandejas inclinadas y vacías, con labio bajo.
- **Joyería:** insertos de conos de anillos, tarjetas de pendientes y collares.
- **Posavasos:** bandejas con raíles.
- **Marcapáginas:** bandejas con cuatro divisores.
- **Bolígrafos:** inserto de seis huecos.
- **Sistema mixto:** contenedores, divisores y raíles de tarjetas.

### Estructura flat-pack

- **Laterales de 4 mm** con ranuras inclinadas donde se deslizan las bandejas.
- **Bandejas de 2,4 mm** con labio frontal y contenedores o insertos.
- **Base de 3 mm** con ranuras para los laterales y pies.
- **Panel trasero SKÅDIS opcional** (apagado por defecto) con ganchos.
- **Cartel opcional** con hueco para etiqueta de papel de 80 × 20 mm.
- **Caja de transporte cerrada** con asa; las piezas quedan dentro.
- Sin tornillos, bisagras ni pasadores. Se monta deslizando y se guarda plano.

### Vistas

- **Montado:** estructura completa.
- **Desmontado:** laterales y bandejas apilados en plano.
- **Transporte:** caja cerrada con asa.
- **Despiece:** piezas separadas para revisar el montaje.

### Edición por pieza

Puedes seleccionar cualquier pieza en el visor o en la lista y cambiar:

- Color.
- Escala.
- Visibilidad.
- Inserto y contenido de cada nivel.

Cada nivel tiene su **separación propia** y puede usar contenedores, separadores, insertos o quedar vacío.

### Modo 3D

- Perfiles de impresora A1 Mini, 220 genérica, A1/P1S/X1C, H2D/H2S y cama personalizada.
- Materiales PLA, PETG y ASA.
- Bandejas y laterales planos, sin soportes.
- Avisos de cama, paredes, estabilidad, panel, niveles y estructura.
- STL por pieza, 3MF montado y OBJ.

### Modo láser

- Materiales de 3 a 6 mm, espesor real y kerf configurables.
- SVG y DXF por hoja con capas de corte.
- Nesting en A4, A3, 600 × 400, 900 × 600 o personalizadas.
- Galga de kerf y cupón de gancho SKÅDIS.
- Cartel de papel y kit impreso opcional.

### Interfaz

- Esquema de color pastel rosa/lavanda, como las otras herramientas.
- Selector de modo 3D/Láser.
- Catálogo por grupos.
- Inspector por pieza y resumen de material.
- Preflight con avisos.
- Guardado automático, importación/exportación de proyecto y tema claro/oscuro.

## Arquitectura

```text
displaynian/
  params.py       parámetros, presets y normalización
  mesh.py         mallas, extrusión, STL/3MF/OBJ
  flatpack.py     laterales, bandejas, contenedores, panel, cartel y caja
  engine.py       checks, BOM y exportadores
  laser.py        paneles 2D, cupones, nesting, SVG y DXF
  webapi.py       puente JSON para Pyodide
src/
  App.tsx         estado, modos, vistas y exportación
  components/     visor, paneles, inspector y diálogos
  hooks/          motor Python en Web Worker
  workers/        carga de Pyodide y del paquete Python
tests/            pruebas de geometría, exportadores y parámetros
```

La geometría usa **Shapely + NumPy** y operaciones 2D + extrusión. Las piezas que se tocan se exportan como objetos separados; el laminador las une al cortar.

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

- Es un generador paramétrico, no una ingeniería certificada. Haz una **prueba de encaje** y una primera impresión antes de producción.
- Mide el grosor real de la bandeja y la holgura de la ranura.
- Imprime los laterales y las bandejas planos, sin soportes.
- PETG o ASA si vas a montar y desmontar muchas veces.
- Revisa siempre el laminador: orientación, adhesión y temperatura.

## Inspiración

La app está inspirada en la categoría de expositores de mercado de **RKDesignATDigital**, en el SVG de rack plegable aportado por el usuario y en generadores paramétricos como **MarketCraft 3D**, **Display Shelf Generator** y los sistemas de estanterías con paneles laterales ranurados. No se ha copiado geometría ni código propietario.

- SKÅDIS es una marca de Inter IKEA Systems B.V. Displaynian no está afiliado a IKEA.
- Código: MIT.
- React, Three.js, Pyodide, NumPy y Shapely conservan sus licencias.

Hecho para imprimir plano, montar en segundos y guardar en el coche.
