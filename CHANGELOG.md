# Changelog

## 0.3.0 — 2026-10-27

Auto-división 3D y alas plegables en el modo láser.

### 3D

- División automática de base, bandejas y tapa cuando superan la cama.
- Placas de unión bajo las costuras y tornillos M3 + tuercas.
- Bandejas modulares con paredes dobles en las costuras.
- Tapa modular con asa puente.
- Wide 340 ahora se puede imprimir en cama de 256 dividiendo piezas.
- Ajuste automático de filas/columnas del panel al cambiar de impresora.

### Láser

- Laterales completos con **alas plegables** y líneas de plegado para sostener bandejas.
- Cortes en U para liberar las alas y marcado de bisagra.
- Divisores de bandeja con pestañas y ranuras.
- Cartel de papel, cupón de gancho y galga de kerf.
- Aviso de alas plegables en espesores mayores de 4 mm.

### Calidad

- 26 tests, typecheck y build.
- BOM de tornillos M3 para uniones.
- README y ayuda actualizados.

## 0.2.0 — 2026-10-27


Rediseño completo de la geometría 3D y del modo láser.

### Geometría 3D

- Bandejas finas de 2,4 mm con compartimentos y divisores de 1,8 mm.
- Enlaces de plegado de 4 mm con ranura y bloqueo.
- Pasadores impresos de 4,2 mm como unión real, sin tornillos.
- Plegado acordeón con cuatro enlaces por nivel.
- Panel trasero SKÅDIS de 3 mm, rail inferior y clips superiores.
- Tapa de transporte con asa y paquete plegado compacto.
- Variantes Wide 340 / Narrow 230 y 3/4/5 bandejas.
- Cartel opcional con etiqueta de papel de 80 × 20 mm.

### Modo láser

- Flat-pack de bandejas/paneles con finger joints.
- Cupón de prueba de gancho SKÅDIS.
- Galga de kerf y encaje.
- Cartel de papel y kit impreso opcional.
- Panel dividido por filas y columnas.

### Interfaz y calidad

- Catálogo reducido a las piezas reales del sistema.
- Inspector por pieza con orientación de impresión.
- Preflight de paredes, divisores, panel, enlaces y pasadores.
- BOM de enlaces, pasadores, bandejas, paneles y tapa.
- 23 tests, typecheck y build.

## 0.1.1 — 2026-10-27


### Añadido

- Apoyos de apilado en la tapa de transporte.
- Pasadores impresos Ø6 mm generados como piezas y reflejados en el BOM.
- Cuatro tipos de esquina configurables: L, clip en U, placa plana y cartela triangular.
- Ajuste rápido del display a la cama de la impresora.
- Seguros de gancho SKÅDIS y avisos de orientación de impresión por pieza.

### Mejorado

- BOM de herrajes, esquinas, pared, patas y seguros.
- Preflight por pieza en lugar de solo por conjunto.
- Vista previa láser con relleno y capas más legibles.

## 0.1.0 — 2026-10-27


Primera versión pública de Displaynian.

### Añadido

- Motor Python paramétrico ejecutado en el navegador con Pyodide.
- Frontend React + Three.js con visor 3D, cama, cuadrícula, aristas, rayos X y captura.
- Modos separados de impresión 3D y corte láser.
- Sistemas de llaveros, pegatinas/tarjetas, joyería, posavasos, marcapáginas, bolígrafos y mixto.
- Estructura Z-fold con bandejas extraíbles, bloqueos, lastre, correas, tapa y asa.
- Variante acordeón experimental.
- Panel trasero liso, SKÅDIS, panal y marca; división y clips de unión.
- Ganchos SKÅDIS y de rejilla metálica, seguros, portaprecios y letras A–Z + ÄÖÜ.
- Insertos de marcapáginas, bolígrafos, anillos, pendientes, pulseras, collares, panal, posavasos, tarjetas y bandejas.
- Esquinas, escuadras de bandeja, topes de raíl y colgadores de pared configurables.
- Vistas Abierto, Plegado, Transporte y Despiece con animación.
- Edición por pieza: color, escala, visibilidad y orientación sugerida.
- Catálogo opcional con interruptores y contadores.
- Preflight de cama, estabilidad, ganchos, kerf, hojas y bisagra.
- Exportación STL por pieza, 3MF, OBJ, SVG, DXF, ZIP láser, CSV, proyecto y mockup.
- Bisagra viva y kit impreso opcional en el ZIP láser.
- Guardado automático, importación/exportación de proyecto, tema claro/oscuro y búsqueda.
- Tests de geometría, sistemas, láser, exportadores y parámetros.
- CI y despliegue automático en GitHub Pages.
