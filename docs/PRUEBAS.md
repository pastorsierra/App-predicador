# Registro de pruebas

Fecha: 23 de noviembre de 2026 · Versión 0.1.0 · Herramienta: `tests/e2e.mjs` (Playwright + Chromium) con tamaño, pantalla táctil y escala de **iPad Pro 11 (horizontal)** y **iPhone 13**.

**Resultado: 52/52 pruebas correctas.**

| Función | Resultado esperado | Resultado real | Estado |
|---|---|---|---|
| [iPad] Carga inicial | Se muestra Inicio sin errores | Inicio visible | OK |
| [iPad] Ir a pasaje desde Inicio | Jn 3:16 abre Juan 3 con el v. 16 señalado | Juan 3 con 36 versículos | OK |
| [iPad] Texto bíblico correcto | Juan 3:16 RV1909 comienza «Porque de tal manera amó Dios al mundo» | 16Porque de tal manera amó Dios al mundo, que ha dado á su H… | OK |
| [iPad] Seleccionar versículo abre panel | Panel con acciones y palabras originales | 24 palabras con Strong | OK |
| [iPad] Léxico Strong | Tocar «amó» abre G25 con lema griego | G25 ἀγαπάω | OK |
| [iPad] Resaltar y persistir | Juan 3:16 queda resaltado tras recargar | resaltado dorado persistente | OK |
| [iPad] Favorito y marcador | Aparecen en el Cuaderno | favorito Juan 3:17; marcador Juan 3:17 | OK |
| [iPad] Nota por versículo | Se guarda, aparece marca en el versículo y en el Cuaderno | nota en Hechos 2:38 | OK |
| [iPad] Editar y eliminar nota | La edición se guarda; la eliminación pide confirmación | editada y eliminada | OK |
| [iPad] Búsqueda por palabras | «gracia fe» devuelve versículos con ambas palabras | 18 versículos en la RV1909 | OK |
| [iPad] Búsqueda de frase exacta | "nombre de Jesucristo" incluye Hechos 2:38 | 5 versículos en la RV1909 | OK |
| [iPad] Búsqueda en datos personales | La nota aparece en la búsqueda global | 1 resultado(s) propios | OK |
| [iPad] Concordancia Strong | G3686 (ὄνομα) lista apariciones y traducciones | 227 apariciones en 212 versículos (RV1909). | OK |
| [iPad] Referencias cruzadas | Juan 3:16 muestra referencias con vista previa | 15 referencias | OK |
| [iPad] Comparar traducciones | Pestaña Comparar muestra RV1909 y BES | ambas versiones visibles | OK |
| [iPad] Opciones de lectura | Paralelo BES, Strong en línea y tema oscuro funcionan | paralelo, Strong y oscuro aplicados | OK |
| [iPad] Navegación entre capítulos y libros | Malaquías 4 → Mateo 1 con «Continuar» | Mateo 1 | OK |
| [iPad] Selector de libro y capítulo | Abrir Salmos 23 desde el selector | 1Salmo de David. JEHOVÁ es mi pastor; nada me falt | OK |
| [iPad] Crear estudio desde pasaje | Hch 2:36-41 crea estudio con 22 secciones y datos automáticos | 22 secciones, 30 palabras Strong, 60 referencias | OK |
| [iPad] Guardado automático del estudio | El texto escrito persiste tras recargar | persistente | OK |
| [iPad] Afirmación clasificada | Se añade una «Inferencia» a la sección | añadida | OK |
| [iPad] Exportar estudio | Descarga un archivo .md con el contenido | Estudio de Hechos 2.36-41.md (10943 caracteres) | OK |
| [iPad] Añadir pasaje a estudio existente | Ro 6:4 queda vinculado al estudio | vinculado | OK |
| [iPad] Respaldo exportar/importar | El respaldo descarga JSON válido y se puede importar | escudrinad-respaldo-2026-11-23.json · Respaldo importado: 0 registros actualizados | OK |
| [iPad] Descargar textos para uso sin conexión | Los 4 paquetes quedan completos | 66/66 archivos · 66/66 archivos · 66/66 archivos · 2/2 archivos | OK |
| [iPad] Funcionamiento sin conexión | Sin internet: abre la app, lee, busca, crea notas | Isaías 53:5 leído; búsqueda: 1 versículo en la RV1909; nota y léxico sin conexión | OK |
| [iPad] Errores de consola | Ningún error de JavaScript durante las pruebas | 0 errores | OK |
| [iPhone] Carga inicial | Se muestra Inicio sin errores | Inicio visible | OK |
| [iPhone] Ir a pasaje desde Inicio | Jn 3:16 abre Juan 3 con el v. 16 señalado | Juan 3 con 36 versículos | OK |
| [iPhone] Texto bíblico correcto | Juan 3:16 RV1909 comienza «Porque de tal manera amó Dios al mundo» | 16Porque de tal manera amó Dios al mundo, que ha dado á su H… | OK |
| [iPhone] Seleccionar versículo abre panel | Panel con acciones y palabras originales | 24 palabras con Strong | OK |
| [iPhone] Léxico Strong | Tocar «amó» abre G25 con lema griego | G25 ἀγαπάω | OK |
| [iPhone] Resaltar y persistir | Juan 3:16 queda resaltado tras recargar | resaltado dorado persistente | OK |
| [iPhone] Favorito y marcador | Aparecen en el Cuaderno | favorito Juan 3:17; marcador Juan 3:17 | OK |
| [iPhone] Nota por versículo | Se guarda, aparece marca en el versículo y en el Cuaderno | nota en Hechos 2:38 | OK |
| [iPhone] Editar y eliminar nota | La edición se guarda; la eliminación pide confirmación | editada y eliminada | OK |
| [iPhone] Búsqueda por palabras | «gracia fe» devuelve versículos con ambas palabras | 18 versículos en la RV1909 | OK |
| [iPhone] Búsqueda de frase exacta | "nombre de Jesucristo" incluye Hechos 2:38 | 5 versículos en la RV1909 | OK |
| [iPhone] Búsqueda en datos personales | La nota aparece en la búsqueda global | 1 resultado(s) propios | OK |
| [iPhone] Concordancia Strong | G3686 (ὄνομα) lista apariciones y traducciones | 227 apariciones en 212 versículos (RV1909). | OK |
| [iPhone] Referencias cruzadas | Juan 3:16 muestra referencias con vista previa | 15 referencias | OK |
| [iPhone] Comparar traducciones | Pestaña Comparar muestra RV1909 y BES | ambas versiones visibles | OK |
| [iPhone] Opciones de lectura | Paralelo BES, Strong en línea y tema oscuro funcionan | paralelo, Strong y oscuro aplicados | OK |
| [iPhone] Navegación entre capítulos y libros | Malaquías 4 → Mateo 1 con «Continuar» | Mateo 1 | OK |
| [iPhone] Selector de libro y capítulo | Abrir Salmos 23 desde el selector | 1Salmo de David. JEHOVÁ es mi pastor; nada me falt | OK |
| [iPhone] Crear estudio desde pasaje | Hch 2:36-41 crea estudio con 22 secciones y datos automáticos | 22 secciones, 30 palabras Strong, 60 referencias | OK |
| [iPhone] Guardado automático del estudio | El texto escrito persiste tras recargar | persistente | OK |
| [iPhone] Afirmación clasificada | Se añade una «Inferencia» a la sección | añadida | OK |
| [iPhone] Exportar estudio | Descarga un archivo .md con el contenido | Estudio de Hechos 2.36-41.md (10943 caracteres) | OK |
| [iPhone] Añadir pasaje a estudio existente | Ro 6:4 queda vinculado al estudio | vinculado | OK |
| [iPhone] Respaldo exportar/importar | El respaldo descarga JSON válido y se puede importar | escudrinad-respaldo-2026-11-23.json · Respaldo importado: 0 registros actualizados | OK |
| [iPhone] Errores de consola | Ningún error de JavaScript durante las pruebas | 0 errores | OK |

## Errores encontrados durante las pruebas y corregidos

| # | Error | Causa | Corrección |
|---|---|---|---|
| 1 | La app se quedaba en «Cargando…» | Los íconos SVG intentaban asignar `width` como propiedad (solo lectura en SVG) | `ui.js`: en elementos SVG se usan siempre atributos |
| 2 | Aparecía la palabra «null» entre versículos | `append(null)` nativo inserta el texto «null» | `reader.js`: el espacio solo se añade en modo párrafo |
| 3 | En iPhone el panel se veía transparente al abrir | La animación partía de opacidad 0,4 | La animación ahora solo desplaza el panel |
| 4 | «Añadir a estudio» podía perderse | El guardado automático pendiente del estudio sobrescribía el registro con una copia vieja | `studies.js`: el guardado lee la versión actual y solo actualiza los campos editados; además se guarda al salir de la pantalla |
| 5 | Nombre de archivo exportado «Hechos 236-41» | Se eliminaban los dos puntos | Se reemplazan por punto: «Hechos 2.36-41» |
| 6 | Ajustes de prueba (no de la app) | Comparaciones de mayúsculas en Salmos 23 («JEHOVÁ») y espera del cambio de tema | Pruebas corregidas |

## Pendiente de verificar manualmente en Safari real (iPhone y iPad)

Las pruebas automáticas usan el motor de Chrome. Safari (WebKit) puede diferir. Lista para la primera revisión en sus dispositivos:

| Verificar | Esperado |
|---|---|
| Agregar a inicio y abrir desde el ícono | Abre a pantalla completa, con el ícono azul y dorado |
| Descargar los 4 paquetes en Ajustes, activar modo avión y abrir la app | Lee, busca y abre el léxico sin internet |
| Crear una nota en modo avión, cerrar la app y volver a abrirla | La nota sigue ahí |
| Compartir un versículo | Abre la hoja de compartir de iOS |
| Exportar respaldo | Ofrece guardar el archivo en Archivos |
| Imprimir / PDF de un estudio | Muestra la vista de impresión; se puede guardar como PDF |
| Girar el iPad (vertical/horizontal) | El diseño se adapta; panel lateral en horizontal |
| Teclado sobre los campos del estudio | El campo activo queda visible |
