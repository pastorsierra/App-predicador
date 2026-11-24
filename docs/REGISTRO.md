# Registro del proyecto

Documento para continuar el trabajo en cualquier sesión sin perder el hilo.

## Estado actual
- **Versión:** 0.9.0 — 23 nov 2026. Enseñanzas del Taller, Mis Biblias, Atlas, conexión automática, versiones PDT y VBL, Doctrinas, Exégesis guiada, Hermenéutica, Taller del predicador propio (bosquejos y diapositivas), Personajes, Cronología, Biblioteca de documentos y Asistente de IA listo para conectar.
- **Pruebas:** 254 automáticas correctas (52 generales, 7 de actualización, 35 enseñanzas, 29 Biblias y atlas, 6 conexión, 20 doctrinas, 16 exégesis, 18 predicación, 20 personajes, 29 biblioteca, 22 asistente); producción verificada (ver `PRUEBAS.md`). Falta la revisión manual en Safari real.
- **Publicación:** https://pastorsierra.github.io/App-predicador/ (ver `PUBLICAR.md`).

## Funciones implementadas (verificadas)
Biblia RV1909 completa · selector libro/capítulo · lectura continua · comparación BES (panel y paralelo) · búsqueda de pasajes, palabras, frases, Strong y datos propios · filtro por testamento/libro · panel de versículo con 7 acciones · resaltado en 5 colores · favoritos · marcadores (renombrables) · notas por versículo, rango, capítulo y generales (tipo, carpeta, etiquetas) · léxico Strong hebreo/griego con frecuencia · concordancia con traducciones de la RV1909 · referencias cruzadas con vista previa · motor de estudio de 22 secciones con secciones automáticas y afirmaciones clasificadas · guardado automático · exportar estudio (.md) · imprimir/PDF · añadir pasajes a estudios · historial (lectura, pasajes, estudios) · temas claro/sepia/oscuro · tamaño de letra · Strong en línea · PWA instalable · funcionamiento sin conexión con descargas gestionadas · almacenamiento persistente · respaldo/importación con fusión · perfil doctrinal y marco personal.

## Unión con el Taller del Predicador
Decisión (23 nov 2026, aprobada por el usuario): unir las dos apps en una sola, con el nombre **Taller del Predicador**, construida sobre la base de Escudriñad, pasando las funciones del Taller por etapas. El Taller actual (repositorio `Assj`) sigue funcionando sin cambios hasta que la app unida haga todo lo que él hace.

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Enseñanzas: mis enseñanzas, archivo cifrado (misma clave), series, calendario, predicadas, lectura con el diseño del Word (clásico, nuevo, minimalista), descarga en Word, imprimir/PDF, editor, importación desde el Taller | ✔ v0.2.0 |
| 2 | Modo púlpito, diapositivas, PDF de series, versiones nuevas (revisión completa) | ○ |
| 3 | Bloqueo con contraseña y Face ID; sincronización entre Safari y el ícono | ○ |
| 4 | Herramientas de IA del Taller (marcadas como IA, con verificación de citas) | ○ |
| 5 | Lugares en mapa, línea de tiempo, plan de lectura, banco de ilustraciones | ○ |
| 6 | Cambio de nombre a «Taller del Predicador» y retiro de la app anterior | ○ |

Notas técnicas de la etapa 1:
- El archivo cifrado se lee del Taller publicado (`../Assj/biblioteca.enc`, mismo sitio). **Antes de retirar o volver privado el repositorio `Assj`, hay que copiar `biblioteca.enc` y `biblioteca-nueva.enc` a este repositorio** y cambiar `ARCHIVE_URLS` en `js/taller/store.js`.
- El diseño de página, el generador de Word (`js/taller/wordgen.js`), el logo y `vendor/docx.js` se tomaron del Taller sin cambios de formato.
- La clave del archivo se guarda solo en el dispositivo (`tallerLibKey`), se excluye de los respaldos y nunca se sube a GitHub.

## Indicación del usuario (23 nov 2026, 5:26 p. m.)
La app nueva **no debe ser una copia del Taller**: debe seguir el plan original (plataforma de estudio con módulos propios y su propio diseño), aprovechando los datos del Taller. Por eso, las etapas siguientes construyen los módulos del plan (doctrinas, exégesis, hermenéutica, taller del predicador propio, personajes, cronología, biblioteca, IA) con diseño nuevo, reutilizando contenido y datos del Taller, no sus pantallas.

## Mis Biblias y Atlas (v0.3.0)
- **Mis Biblias:** usa las Biblias que el usuario cargó en el Taller (p. ej. RVR1960): se traen del Taller en el mismo equipo o se cargan como .json (mismo formato del Taller). Se guardan solo en el dispositivo (almacén `bibles`), no se publican ni van en respaldos. Sirven para leer (versión principal), comparar (todas las versiones en el panel y en paralelo), buscar y en la sección «Texto bíblico» de los estudios.
- **Atlas:** 1.030 lugares de OpenBible.info (CC BY 4.0) y mapa de Natural Earth (dominio público), tomados del Taller (`data/atlas/`). Mapa sin conexión con zoom y arrastre, búsqueda, ficha con versículos y pestaña «Lugares» en el panel de cada versículo. La fuente no indica el grado de certeza de cada ubicación; la app lo advierte.

## Conexión automática con el Taller (v0.4.0)
- Al abrir la app se traen solas (solo lectura) las enseñanzas, las Biblias personales y la clave del archivo que el Taller guardó en el mismo navegador, y el archivo `taller-datos.json` del repositorio privado de GitHub usando la conexión que ya tiene el Taller (o una clave escrita en Ajustes). Lectura de GitHub como máximo cada 10 minutos; «Traer ahora» la fuerza.
- La app nunca escribe en los datos del Taller. Las claves quedan solo en el dispositivo y se excluyen de los respaldos.
- **La RVR1960 no se puede añadir desde aquí:** el archivo solo existe dentro del Taller en el iPad del usuario (no está en ningún repositorio) y tiene derechos de autor. Llega a la app automáticamente desde el Taller del mismo equipo o cargando el .json.
- Versiones libres añadidas: Palabra de Dios para ti (PDT) y Versión Biblia Libre (VBL), CC BY-SA 4.0.

## Doctrinas (v0.5.0)
- Biblioteca doctrinal (Módulo 5) dentro de **Estudios → Doctrinas**: las 20 categorías del plan y doctrinas personales. Cada una con 13 secciones que redacta el usuario, pasajes principales y complementarios con su texto real, recorrido automático por la Escritura (orden canónico, AT → NT) y enseñanzas propias relacionadas (las que citan esos pasajes o nombran el tema).
- La app no redacta doctrina. Para 8 categorías ofrece «pasajes sugeridos»: referencias verificadas contra la RV1909, que el usuario puede quitar o cambiar.


## Exégesis y Hermenéutica (v0.6.0)
- **Exégesis guiada** (Módulo 3): nuevo tipo de estudio con 15 secciones propias (contexto gramatical, argumento del autor, interpretaciones, conclusiones exegéticas…) y una sección automática de **comparación de traducciones** con todas las versiones disponibles.
- **Hermenéutica** (Módulo 4): principios, cómo leer cada género, errores y falacias, criterios de tipología, y la herramienta **Evaluar una interpretación** (texto, contexto, género del libro, pasajes relacionados, 10 preguntas de verificación, resultado con puntos a revisar y conclusión).
- **Elegir versiones para comparar**: con muchas Biblias, el usuario decide cuáles aparecen.
- **Biblias del usuario (RVR1960, NVI, NTV, LBLA, NBLA, RVC, RVA-2015, DHH, TLA):** no se pueden publicar en el repositorio público (derechos de autor). Se intentó guardarlas en el repositorio privado `Taller-datos` para que la app las descargara sola, pero ese permiso de escritura fue denegado en esta sesión. Se cargan una vez por equipo en Ajustes → Mis Biblias → Cargar archivo (se pueden elegir las 9 a la vez), o llegan solas desde el Taller del mismo equipo.

## Taller del predicador propio (v0.7.0)
- **Enseñanzas → Bosquejos**: editor de bosquejos con diseño propio (tipo de mensaje, texto base con su versículo, tema, audiencia, serie, fecha, lugar, duración; introducción, contexto, puntos con números romanos, subpuntos, citas con su texto, ejemplo bíblico y frase de impacto por punto; conclusión, frases centrales, llamado y notas privadas). Subir/bajar/eliminar puntos, duplicar, plantillas propias.
- **Crear enseñanza (Word)**: convierte el bosquejo al formato del Pastor (versículo antes de la introducción, puntos en romanos, citas resaltadas, frases de impacto, conclusión) y lo guarda en Mis enseñanzas, desde donde se descarga en Word o PDF. Volver a convertir actualiza la misma enseñanza.
- **Diapositivas**: generadas del bosquejo (portada, texto base, puntos, citas, frases), temas azul IPUC, claro y negro, navegación con dedo, botones o teclado, pantalla completa y PDF (una diapositiva por página).
- **Convertir un estudio en bosquejo** desde cualquier estudio o exégesis.
- Pendiente del plan: personajes, cronología, biblioteca de PDF, asistente de IA, sincronización propia y bloqueo con Face ID.

## Personajes y Cronología (v0.8.0)
- **Personajes** (`#/personajes`, `#/personaje/ID`): 3.066 personas de Theographic Bible Metadata (CC BY-SA 4.0). Búsqueda con o sin tildes, filtro hombres/mujeres, homónimos distinguidos por su padre y primera mención. Ficha: familia (padre, madre, cónyuge, hermanos, hijos, abuelos, nietos) navegable, época en la cronología, versículos con su texto y enlace a Buscar.
- **Nombres en español**: tomados de la RV1909 (`tools/build_people.py`); 216 fijados a mano (equivalencias como Pedro, Juan, Jacobo, y las personas sin nombre propio: «Esposa de Simón Pedro», «Hija de Faraón»); 29 quedan en inglés por no hallarse en el texto. Dios y el Espíritu Santo no se tratan como «personajes». El patriarca figura como «Jacob (Israel)».
- **Panel del versículo**: nueva pestaña «Personas».
- **Cronología** (`#/cronologia/ID`): 25 períodos desde los orígenes (sin fecha fiable) hasta Patmos. Cada uno con rango, aclaración del debate (fecha temprana y tardía del éxodo, 586/587, Esdras 458/398, etc.), textos y personas enlazadas; barra temporal proporcional. Redacción propia basada en datos bíblicos y sincronismos aceptados; no se usan las fechas de Ussher de la fuente como si fueran exactas.

## Biblioteca (v0.9.0)
- **Módulo 7** (`#/biblioteca`, `#/documento/ID/PÁGINA`): añadir varios PDF, .txt o .md a la vez; extracción del texto con pdf.js (Mozilla, Apache 2.0, en `vendor/pdfjs`, guardado sin conexión tras el primer uso); búsqueda sin tildes en todos los documentos o en uno; lector de PDF por páginas o como texto con la palabra resaltada; notas por página; etiquetas y filtro; detección de citas bíblicas (validadas contra la versificación: descarta «Juan 99:1»).
- Integración: Buscar muestra «En su biblioteca»; el panel del versículo (Referencias) muestra los documentos que lo citan; el asistente de IA puede usar fragmentos.
- Los archivos y su texto quedan solo en el dispositivo (almacén `docfiles`); el respaldo lleva la ficha, etiquetas y notas, no los archivos.

## Asistente de IA (listo para conectar)
- Todo construido y probado; falta solo la cuenta de Anthropic y el proyecto de Supabase del usuario. Guía paso a paso: `docs/IA.md`.
- Función de servidor `supabase/functions/asistente/index.ts`: guarda la clave como secreto, exige `CODIGO_ACCESO`, acepta solo el sitio autorizado, limita el tamaño y los tokens por profundidad, no guarda preguntas ni respuestas; la prueba de conexión no gasta.
- App: Ajustes → Asistente de IA (dirección + código, solo en el dispositivo, fuera de respaldos). «Asistente IA» en el menú y «Preguntar a la IA» en el panel del versículo aparecen solo cuando la prueba de conexión funciona.
- Recuperación previa de fuentes reales numeradas (versiones, contexto, referencias, Strong, notas, documentos), 8 modos, 4 profundidades, perfil doctrinal como marco; respuesta marcada como IA con verificación: fuentes inexistentes, citas inexistentes y citas fuera de las fuentes. Guardar en el Cuaderno (etiqueta IA) o copiar.

## Decisiones técnicas
| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-23 | JavaScript con módulos ES sin compilación (en lugar de React/Next.js) | El usuario trabaja desde iPad, sin computador ni terminal: lo publicado debe ser editable y desplegable tal cual. |
| 2026-11-23 | Datos bíblicos como JSON estático por libro | Sin servidor; carga bajo demanda; caché sin conexión. |
| 2026-11-23 | IndexedDB con ids generados en el dispositivo, `updatedAt` y borrado lógico | Preparado para sincronizar con Supabase sin migraciones de datos. |
| 2026-11-23 | RV1909 como texto principal | Dominio público y con números Strong por palabra. La RVR1960 tiene derechos. |
| 2026-11-23 | Léxico Strong en inglés | Es el único léxico completo con licencia libre disponible; se indica en la interfaz. |
| 2026-11-23 | Referencias OpenBible filtradas (votos ≥ 3, máx. 15 por verso) | Reduce ruido y tamaño (2,3 MB) manteniendo las relaciones más respaldadas. |
| 2026-11-23 | «Palabras importantes» ordenadas por frecuencia en la Biblia (menos frecuentes primero) | Criterio objetivo y verificable; evita poner artículos y preposiciones al inicio. |
| 2026-11-23 | Módulos no construidos no aparecen en la navegación | Regla del proyecto: ningún botón que no funcione. |

## Errores corregidos
Ver tablas en `PRUEBAS.md` (10 registrados).

## Pendiente (por fase)
Ver `ROADMAP.md`. Lo inmediato:
1. Publicar en GitHub Pages y revisar en Safari real (lista en `PRUEBAS.md`).
2. Fase 1b: crear proyecto Supabase → autenticación y sincronización; bloqueo con Face ID; planes de lectura.
3. Activar el asistente de IA cuando el usuario tenga su clave (`docs/IA.md`).

## Requisitos externos que faltan
| Para | Qué se necesita del usuario |
|---|---|
| Publicar | Autorizar a Claude para crear el repositorio, o usar Working Copy |
| Sincronización (1b) | Crear cuenta gratuita en supabase.com (Claude guía paso a paso) |
| IA (Fase 4) | Cuenta en console.anthropic.com con saldo y límite mensual, y proyecto gratuito en Supabase (pasos en `IA.md`) |
| RVR1960 u otras versiones modernas | Licencia del titular de derechos |

## Cómo regenerar los datos
```
python3 tools/build_data.py spa-rv1909.usfx.xml spa-bes.usfx.xml cross_references.txt
python3 tools/build_strong.py strongs-hebrew-dictionary.js strongs-greek-dictionary.js
```
(El segundo script debe ejecutarse después del primero, porque calcula la frecuencia de cada número en la RV1909.)

## Cómo probar
```
python3 -m http.server 8765
node tests/e2e.mjs http://127.0.0.1:8765/
```
