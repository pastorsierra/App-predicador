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

## Pruebas de la versión publicada (producción) — 23 nov 2026

URL: https://pastorsierra.github.io/App-predicador/ · Repositorio: https://github.com/pastorsierra/App-predicador

| Verificación | Resultado |
|---|---|
| Revisión de secretos en los 245 archivos del repositorio (claves, tokens, contraseñas, correos) | Ninguno encontrado |
| Datos personales, respaldos, capturas o resultados de pruebas en el repositorio | Ninguno; excluidos por `.gitignore` |
| La URL publicada responde con la app (título «Escudriñad») | OK |
| `sw.js` publicado es la versión v0.1.0 con descarga forzada (`cache: 'reload'`) | OK |
| `manifest.webmanifest` (nombre, inicio, alcance, modo standalone, íconos) | OK |
| `data/manifest.json` publicado: 31.087 versos RV1909, 31.102 BES, 171.524 referencias | OK |
| Archivo de libros (`data/rv1909/JHN.json`) servido correctamente | OK |
| `data/LICENCIAS.txt` publicado con las cuatro licencias | OK |
| 52 pruebas funcionales con los mismos archivos publicados, servidos bajo `/App-predicador/` (iPad y iPhone): navegación, búsqueda, notas, marcadores, favoritos, resaltado, estudios, exportación, importación, sin conexión | 52/52 OK |
| Actualización de versión del Service Worker (`tests/actualizacion.mjs`): aviso, instalación, borrado de la caché anterior, conservación de textos y datos del usuario | 7/7 OK |

Limitación: el entorno de Claude no puede ejecutar un navegador contra github.io; la URL real se verificó descargando sus archivos, y el comportamiento con un navegador real sobre los mismos archivos y la misma ruta. Queda la revisión manual en Safari (lista de arriba).

## Etapa 1 de la unión con el Taller — Enseñanzas (versión 0.2.0, 23 nov 2026)

Prueba automática `tests/ensenanzas.mjs` (datos ficticios y archivo cifrado de prueba creado con `tests/fixtures/hacer-archivo.mjs`).

**Resultado: 35/35 correctas.** Además: 52/52 de las pruebas anteriores y 7/7 de actualización siguen pasando.

| Función | Resultado | Estado |
|---|---|---|
| [iPad] Sección Enseñanzas visible en el menú | vacía, con guía de importación | OK |
| [iPad] Traer del Taller en este equipo (mismo sitio) | 2 enseñanzas, marcas y clave del archivo traídas | OK |
| [iPad] Lector con el diseño del Word | estilos Nuevo y Clásico (con marca de agua) correctos | OK |
| [iPad] Descargar Word | PRUEBA Uno (clasico).docx (103 KB) | OK |
| [iPad] Marcar como predicada | Predicada el dom, 1 feb 2026 | OK |
| [iPad] Editar y guardar | persistente tras recargar | OK |
| [iPad] Crear enseñanza nueva | creada con frase de impacto | OK |
| [iPad] Importar copia de seguridad del Taller (fusión) | Importadas: 1 nuevas, 1 actualizadas, 1 sin cambios | OK |
| [iPad] Filtro y búsqueda en Mis enseñanzas | 1 resultado por contenido | OK |
| [iPad] Series | Serie de prueba · 2 enseñanzas · 2 predicadas | OK |
| [iPad] Calendario | próximas y predicadas | OK |
| [iPad] Archivo cifrado (clave traída del Taller) | 2 enseñanzas del archivo | OK |
| [iPad] Abrir enseñanza del archivo y versión nueva | original, nueva y copia a Mis enseñanzas | OK |
| [iPad] Clave incorrecta y correcta | rechaza la incorrecta, abre con la correcta (sin distinguir mayúsculas, como el Taller) | OK |
| [iPad] Búsqueda global encuentra enseñanzas | aparece en «En sus datos» | OK |
| [iPad] El respaldo no incluye la clave del archivo | 5 enseñanzas respaldadas, sin clave | OK |
| [iPad] Enseñanzas y archivo sin conexión | archivo y enseñanzas abren sin internet | OK |
| [iPad] Errores de consola | 0 errores | OK |
| [iPhone] Sección Enseñanzas visible en el menú | vacía, con guía de importación | OK |
| [iPhone] Traer del Taller en este equipo (mismo sitio) | 2 enseñanzas, marcas y clave del archivo traídas | OK |
| [iPhone] Lector con el diseño del Word | estilos Nuevo y Clásico (con marca de agua) correctos | OK |
| [iPhone] Descargar Word | PRUEBA Uno (clasico).docx (103 KB) | OK |
| [iPhone] Marcar como predicada | Predicada el dom, 1 feb 2026 | OK |
| [iPhone] Editar y guardar | persistente tras recargar | OK |
| [iPhone] Crear enseñanza nueva | creada con frase de impacto | OK |
| [iPhone] Importar copia de seguridad del Taller (fusión) | Importadas: 1 nuevas, 1 actualizadas, 1 sin cambios | OK |
| [iPhone] Filtro y búsqueda en Mis enseñanzas | 1 resultado por contenido | OK |
| [iPhone] Series | Serie de prueba · 2 enseñanzas · 2 predicadas | OK |
| [iPhone] Calendario | próximas y predicadas | OK |
| [iPhone] Archivo cifrado (clave traída del Taller) | 2 enseñanzas del archivo | OK |
| [iPhone] Abrir enseñanza del archivo y versión nueva | original, nueva y copia a Mis enseñanzas | OK |
| [iPhone] Clave incorrecta y correcta | rechaza la incorrecta, abre con la correcta (sin distinguir mayúsculas, como el Taller) | OK |
| [iPhone] Búsqueda global encuentra enseñanzas | aparece en «En sus datos» | OK |
| [iPhone] El respaldo no incluye la clave del archivo | 5 enseñanzas respaldadas, sin clave | OK |
| [iPhone] Errores de consola | 0 errores | OK |

Verificación con los datos reales del Taller (solo en el entorno de pruebas; nada se subió al repositorio):

- Importación del archivo de sincronización: 72 enseñanzas nuevas, sin errores.
- Las 72 se abren con título y diseño; las 7 series aparecen agrupadas.
- Word generado con una enseñanza real: archivo .docx válido con su contenido.
- Migración de la base de datos de la versión 0.1.0 a la 0.2.0: los datos existentes se conservan.

Errores encontrados y corregidos en esta etapa:

| # | Error | Corrección |
|---|---|---|
| 7 | Error de sintaxis (paréntesis de más) en el calendario | Corregido; detectado por la prueba antes de publicar |
| 8 | «Traer del Taller» fallaba: se perdía la referencia al botón después de esperar | Se guarda la referencia antes de esperar |
| 9 | El botón de tema/diseño activo no se marcaba bien (también existía en Ajustes y en el lector) | Misma corrección en los tres lugares |
| 10 | Las descargas podían perder su nombre («download») | El enlace se retira tras unos segundos y los nombres de archivo van sin tildes |

## Mis Biblias y Atlas bíblico (versión 0.3.0, 23 nov 2026)

Prueba automática `tests/biblias-atlas.mjs` (Biblias ficticias con la misma estructura que las del Taller).

**Resultado: 29/29 correctas.** Regresión: 52/52 generales, 35/35 de Enseñanzas y 7/7 de actualización.

| Función | Resultado | Estado |
|---|---|---|
| [iPad] Cargar Biblia personal (.json) | PRUEBA cargada (31.087 versículos) | OK |
| [iPad] Traer Biblias del Taller (mismo equipo) | SEGUNDA traída del Taller | OK |
| [iPad] Usar como versión principal en el lector | Juan 3:16 en PRUEBA | OK |
| [iPad] Cambiar de versión desde el lector | RV1909 ↔ SEGUNDA | OK |
| [iPad] Comparar todas las versiones en el versículo | 4 versiones lado a lado | OK |
| [iPad] Lectura en paralelo con otra versión | SEGUNDA DE PRUEBA / REINA-VALERA 1909 | OK |
| [iPad] Buscar en una Biblia personal | 879 versículos en la PRUEBA | OK |
| [iPad] El estudio incluye las Biblias personales | RV1909, BES, PRUEBA y SEGUNDA en «Texto bíblico» | OK |
| [iPad] Las Biblias personales no van en el respaldo | respaldo de 2 KB sin Biblias | OK |
| [iPad] Quitar una Biblia personal | quitada; el lector volvió a la RV1909 | OK |
| [iPad] Atlas: mapa y búsqueda | 220 lugares visibles en Tierra Santa; búsqueda «betel» encuentra Bet-el, con sus versículos | OK |
| [iPad] Atlas: zoom y vista general | acercar y ver todo funcionan | OK |
| [iPad] Lugares desde el versículo (Génesis 28:19) | Bet-el aparece y abre el mapa | OK |
| [iPad] Atlas y Biblia personal sin conexión | el atlas y la Biblia personal funcionan sin internet | OK |
| [iPad] Errores de consola | 0 errores | OK |
| [iPhone] Cargar Biblia personal (.json) | PRUEBA cargada (31.087 versículos) | OK |
| [iPhone] Traer Biblias del Taller (mismo equipo) | SEGUNDA traída del Taller | OK |
| [iPhone] Usar como versión principal en el lector | Juan 3:16 en PRUEBA | OK |
| [iPhone] Cambiar de versión desde el lector | RV1909 ↔ SEGUNDA | OK |
| [iPhone] Comparar todas las versiones en el versículo | 4 versiones lado a lado | OK |
| [iPhone] Lectura en paralelo con otra versión | SEGUNDA DE PRUEBA / REINA-VALERA 1909 | OK |
| [iPhone] Buscar en una Biblia personal | 879 versículos en la PRUEBA | OK |
| [iPhone] El estudio incluye las Biblias personales | RV1909, BES, PRUEBA y SEGUNDA en «Texto bíblico» | OK |
| [iPhone] Las Biblias personales no van en el respaldo | respaldo de 2 KB sin Biblias | OK |
| [iPhone] Quitar una Biblia personal | quitada; el lector volvió a la RV1909 | OK |
| [iPhone] Atlas: mapa y búsqueda | 220 lugares visibles en Tierra Santa; búsqueda «betel» encuentra Bet-el, con sus versículos | OK |
| [iPhone] Atlas: zoom y vista general | acercar y ver todo funcionan | OK |
| [iPhone] Lugares desde el versículo (Génesis 28:19) | Bet-el aparece y abre el mapa | OK |
| [iPhone] Errores de consola | 0 errores | OK |

Errores encontrados y corregidos:

| # | Error | Corrección |
|---|---|---|
| 11 | En el mapa, los puntos se veían blancos y las etiquetas se encimaban | Grosor de borde proporcional al zoom y etiquetas que no se superponen |
| 12 | Buscar «betel» no encontraba «Bet-el» | La búsqueda de lugares ignora guiones y espacios |
| 13 | Pruebas antiguas (no la app): textos y selectores cambiados («Comparar con otra versión», varios campos de archivo en Ajustes) | Pruebas actualizadas |

## Conexión automática con el Taller y versiones PDT/VBL (versión 0.4.0)

Prueba `tests/conexion.mjs` (GitHub simulado; datos ficticios).

**Resultado: 6/6 correctas.** Regresión: 52/52 generales, 35/35 Enseñanzas, 29/29 Biblias y Atlas.

| Función | Resultado | Estado |
|---|---|---|
| Traer solo al abrir (Taller en el mismo equipo + GitHub) | Traído del Taller: 2 enseñanzas nuevas y 0 actualizadas · Biblias: AUTO | OK |
| Biblia del Taller disponible en el selector | RV1909, BES, PDT, VBL, AUTO, Agregar versión… | OK |
| Versiones libres nuevas (PDT y VBL) en la comparación | RV1909, BES, PDT, VBL y AUTO | OK |
| Traer ahora desde Ajustes (no duplica) | Listo: 0 enseñanzas nuevas, 0 actualizadas. | OK |
| Clave escrita aquí se usa y no va en el respaldo | clave propia usada; el respaldo no la contiene | OK |
| Errores de consola | 0 errores | OK |
