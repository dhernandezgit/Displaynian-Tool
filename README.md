# Displaynian

**Versión 0.6.0** · Expositor cantilever modular para ferias, mercados y tiendas.

Displaynian genera un expositor **cantilever plegable** a partir de parámetros. El motor de geometría está escrito en **Python** y se ejecuta en el navegador con **Pyodide/WebAssembly**; el frontend usa **React + Three.js**. No hay servidor, no se suben archivos y no hace falta cuenta.

- **Web:** `https://dhernandezgit.github.io/Displaynian-Tool/web/`
- **Repo:** `https://github.com/dhernandezgit/Displaynian-Tool`
- **Modos:** impresión 3D FDM y corte láser.
- **Salidas:** STL por pieza, 3MF, OBJ, SVG, DXF, ZIP láser, BOM CSV, proyecto `.displaynian.json` y mockup PNG.

## Qué hace

No es un catálogo de modelos cerrados: cambias medidas, número de niveles, paso, contenido, panel y accesorios, y todas las piezas se recalculan.

### Mecanismo cantilever

- **Dos brazos ranurados por hueco**, uno a cada lado, alternando delante, centro y detrás para que no choquen al plegar.
- **Pasadores impresos** que quedan montados en las bandejas y deslizan por la ranura del brazo.
- **Abierto:** cada bandeja avanza `cantileverStep` respecto a la anterior.
- **Plegado:** los brazos quedan verticales y las bandejas se apilan con una separación mínima de seguridad.
- **Sin desmontar:** el mecanismo no se separa para plegar o transportar.
- **Caja de transporte cerrada** que cubre la pila plegada y los brazos.

### Sistemas de partida

Cada tarjeta cambia de verdad la geometría, no solo el color:

- **Llaveros:** tres bandejas cantilever con contenedores individuales extraíbles y tapas.
- **Pegatinas y tarjetas:** tres bandejas bajas y amplias, con labio mínimo.
- **Joyería:** insertos de conos de anillos, tarjetas de pendientes y collares.
- **Posavasos:** bandejas con raíles.
- **Marcapáginas:** bandejas con cuatro divisores.
- **Bolígrafos:** inserto de seis huecos.
- **Sistema mixto:** contenedores, divisores y raíles de tarjetas.

### Estructura

- **Bandejas de 2,4 mm** con labio frontal, contenedores o insertos.
- **Brazos de 4 mm** con ranura y agujero de pivote.
- **Base de 3 mm** con pies y espacio para la pila plegada.
- **Panel trasero SKÅDIS opcional** (apagado por defecto) con ganchos y cartel.
- El panel se retira y se guarda plano sobre la pila para transportarlo.
- **Caja de transporte** con asa; crece lo necesario para cubrir brazos y panel.

### Vistas

- **Montado:** bandejas escalonadas y mecanismo en posición abierta.
- **Plegado:** brazos verticales, bandejas apiladas y panel encima.
- **Transporte:** caja cerrada con asa.
- **Despiece:** piezas separadas para revisar el montaje.

Las vistas Montado/Plegado usan posiciones finales exactas; no hay interpolación que desalinee pasadores y ranuras.

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
- Brazos y bandejas planos, sin soportes.
- Avisos de cama, paredes, estabilidad, panel, pasadores, recorrido y choques al plegar.
- STL por pieza, 3MF montado y OBJ.

### Modo láser

- Materiales de 3 a 6 mm, espesor real y kerf configurables.
- SVG y DXF por hoja con capas de corte.
- Nesting en A4, A3, 600 × 400, 900 × 600 o personalizadas.
- Galga de kerf y cupón de gancho SKÅDIS.
- Cartel de papel y kit impreso opcional con bandejas, brazos y ganchos 3D.

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
  cantilever.py   base, bandejas, brazos ranurados, pasadores, panel y caja
  foldable.py     helpers de bandejas, contenedores, paneles y ganchos
  engine.py       checks, BOM y exportadores
  laser.py        paneles 2D, cupones, nesting, SVG y DXF
  webapi.py       puente JSON para Pyodide
src/
  App.tsx         estado, modos, vistas y exportación
  components/     visor, paneles, inspector y diálogos
  hooks/          motor Python en Web Worker
  workers/        carga de Pyodide y del paquete Python
tests/            pruebas de geometría, cinemática, exportadores y parámetros
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
- Imprime un brazo y un pasador de prueba; ajusta la holgura antes del set completo.
- Mide el grosor real del material y comprueba que la ranura desliza sin juego lateral.
- Imprime brazos y bandejas planos, sin soportes.
- PETG o ASA si vas a abrir y cerrar el display muchas veces.
- Revisa siempre el laminador: orientación, adhesión y temperatura.

## Inspiración

La app está inspirada en la categoría de expositores de mercado de **RKDesignATDigital**, en el SVG de rack plegable aportado por el usuario y en generadores paramétricos como **MarketCraft 3D**, **Display Shelf Generator** y los sistemas cantilever de **Layer by Layer** y **Alexander Kladov**. No se ha copiado geometría ni código propietario.

- SKÅDIS es una marca de Inter IKEA Systems B.V. Displaynian no está afiliado a IKEA.
- Código: MIT.
- React, Three.js, Pyodide, NumPy y Shapely conservan sus licencias.

Hecho para imprimir plano, abrir en segundos y transportar cerrado.
