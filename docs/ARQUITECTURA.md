# Escudriñad — Documento maestro de arquitectura

Versión 0.1.0 · 23 de noviembre de 2026 · Fase 0 terminada y Fase 1 (MVP) implementada y probada.

> Nombre de trabajo: **Escudriñad** (Juan 5:39). Es propio y no se parece a ninguna marca comercial; se puede cambiar en `index.html` y `manifest.webmanifest`.

## 1. Análisis del proyecto

La plataforma pedida reúne, a largo plazo, doce módulos: Biblia, motor de estudio, exégesis, hermenéutica, doctrina, lenguas originales, biblioteca, personajes, atlas, cronología, taller del predicador y asistente de IA. Hay tres condiciones que guían todas las decisiones:

1. **El usuario no programa y trabaja desde iPhone y iPad.** Todo debe poder publicarse y actualizarse sin computador, sin instalar herramientas y sin compilar.
2. **Nada simulado.** Una función aparece en la interfaz solo cuando funciona de verdad. Lo pendiente se explica como texto, no como botón.
3. **Datos legítimos.** Solo textos y recursos de dominio público o con licencia libre comprobada. Nada inventado: ni versículos, ni datos lingüísticos, ni bibliografía.

## 2. Decisiones técnicas (y por qué)

| Decisión | Elección | Motivo |
|---|---|---|
| Tipo de aplicación | PWA (aplicación web instalable) | Funciona en iPhone y iPad desde Safari, se instala en la pantalla de inicio, trabaja sin conexión y no necesita la App Store. |
| Frontend | HTML + CSS + JavaScript moderno (módulos ES), **sin paso de compilación** | React/Next.js exigen un entorno de compilación (Node, terminal) que el usuario no tiene en el iPad. Con módulos ES, los archivos que se suben a GitHub son exactamente los que se ejecutan: se pueden revisar y reemplazar desde el iPad. La arquitectura modular (un archivo por responsabilidad) da el mismo orden que un framework. Si en el futuro hay un computador, migrar a TypeScript + Vite es directo porque los módulos ya están separados. |
| Hospedaje | GitHub Pages | Gratuito, HTTPS (necesario para PWA), y el usuario ya publica allí desde el iPad (cuenta `pastorsierra`). |
| Datos bíblicos | Archivos JSON estáticos por libro | No requieren servidor ni base de datos; se cachean para uso sin conexión; se cargan bajo demanda (un capítulo abre solo su libro). |
| Datos del usuario (ahora) | IndexedDB en el dispositivo | Persistencia real, funciona sin conexión, gran capacidad. |
| Datos del usuario (Fase 1b) | Supabase (PostgreSQL + autenticación + almacenamiento) | Plan gratuito suficiente, seguridad por filas (cada usuario solo ve lo suyo), autenticación con correo/Apple, almacenamiento para PDF. Esquema ya diseñado en `supabase/schema.sql`. |
| Sin conexión | Service Worker + Cache API | La interfaz se guarda al instalar; los textos se descargan desde Ajustes (o quedan guardados al consultarlos). |
| IA (Fase 4) | API de Claude (Anthropic) a través de una función de servidor (Supabase Edge Function) | La clave de la API **nunca** va en el navegador ni en GitHub: vive como secreto en el servidor. La función recibe la pregunta, adjunta los textos bíblicos y documentos reales consultados y devuelve la respuesta con sus fuentes. |

## 3. Estructura del proyecto

```
escudrinad/
├── (raíz)                    ← la app que se publica (GitHub Pages)
│   ├── index.html            estructura de la página
│   ├── manifest.webmanifest  datos de instalación (nombre, íconos)
│   ├── sw.js                 Service Worker (funcionamiento sin conexión)
│   ├── css/app.css           diseño completo (claro, sepia, oscuro; iPhone/iPad; impresión)
│   ├── icons/                íconos de la app
│   ├── data/                 textos y recursos bíblicos (JSON)
│   │   ├── manifest.json     inventario: versiones, capítulos, versos, licencias
│   │   ├── rv1909/GEN.json…  Reina-Valera 1909 con números Strong por palabra
│   │   ├── bes/GEN.json…     Biblia en Español Sencillo
│   │   ├── xref/GEN.json…    referencias cruzadas por versículo
│   │   └── strong/H.json G.json  léxico Strong hebreo y griego (+ frecuencia en la RV1909)
│   └── js/
│       ├── main.js           arranque y navegación (rutas #/…)
│       ├── books.js          canon de 66 libros, nombres y abreviaturas en español
│       ├── ref.js            lectura e interpretación de referencias ("Hch 2:38-41")
│       ├── bible.js          acceso a textos, Strong, referencias
│       ├── db.js             base de datos local (IndexedDB), respaldo e importación
│       ├── search.js         búsqueda de palabras, frases, Strong y datos personales
│       ├── study.js          motor de estudio (22 secciones) y exportación
│       ├── offline.js        descargas para uso sin conexión
│       ├── state.js          preferencias y perfil doctrinal
│       ├── ui.js             utilidades de interfaz (diálogos, íconos, avisos)
│       ├── taller/           enseñanzas del Taller: diseño de página, Word, archivo cifrado, importación
│       └── views/            pantallas: inicio, lector, enseñanzas, panel de versículo, búsqueda, estudios, cuaderno, ajustes
├── supabase/schema.sql       base de datos en la nube (diseñada, para la Fase 1b)
├── tools/                    scripts que generan data/ a partir de las fuentes originales
├── tests/e2e.mjs             pruebas automáticas en navegador (iPad y iPhone)
└── docs/                     esta documentación
```

## 4. Módulos y cómo crecen

Cada módulo futuro se añade como: (a) un archivo en `js/views/`, (b) su lógica en `js/`, (c) una entrada en la navegación de `main.js` **solo cuando funcione**, y (d) sus tablas ya previstas en `schema.sql`. No hay que reconstruir lo existente.

Navegación principal actual: **Inicio · Biblia · Enseñanzas · Estudios · Buscar · Cuaderno · Ajustes**. Cuando existan, se añadirán **Biblioteca** y **Predicación** (como pidió la especificación); exégesis, hermenéutica, doctrina y lenguas originales vivirán dentro de *Estudios*; atlas, cronología y personajes dentro de *Biblia/Estudios*, para no saturar el menú.

## 5. Modelo de datos

- **Clave bíblica universal:** `LIBRO.CAP.VERSO` con código USFM (`JHN.3.16`, `ACT.2.36-41`, `JHN.3`). Es la misma en textos, notas, estudios, referencias cruzadas y en la base de datos de la nube, así que cualquier módulo puede encontrar «todo lo vinculado a un pasaje».
- **Local (IndexedDB, implementado):** `notes`, `highlights`, `favorites`, `bookmarks`, `studies`, `history`, `settings`. Detalle en `docs/BASE_DE_DATOS.md`.
- **Nube (diseñado):** las mismas tablas más `doctrines`, `documents`, `document_chunks`, `sermons`, `series`, `links`, `ref_people`, `ref_places`, `ref_events`, `ai_conversations`, `ai_messages`, con seguridad por filas.

## 6. Sincronización (Fase 1b)

Todos los registros ya llevan `id` único generado en el dispositivo, `updatedAt` y borrado lógico (`deletedAt`). La sincronización será:
1. Al abrir la app o recuperar conexión: subir los registros locales modificados desde la última sincronización; descargar los remotos modificados.
2. Conflictos: gana el `updatedAt` más reciente por registro (los estudios guardan por secciones, así que la pérdida posible es mínima).
3. Estado visible en la barra lateral: «Sincronizado», «Pendiente», «Error».

Mientras tanto, **Ajustes → Respaldo** exporta e importa todo (fusionando por fecha), y sirve para pasar datos entre iPhone e iPad.

## 7. Funcionamiento sin conexión

| Funciona sin internet | Requiere internet |
|---|---|
| Abrir la app instalada | Primera carga |
| Leer, comparar con BES, referencias, léxico Strong (si se descargaron en Ajustes o ya se consultaron) | Descargar textos por primera vez |
| Buscar en toda la Biblia y concordancia Strong (con la RV1909 descargada) | Sincronización (Fase 1b) |
| Crear y editar notas, marcadores, favoritos, resaltados y estudios | Asistente de IA (Fase 4) |
| Exportar estudios y respaldos | |

## 8. Asistente de IA (diseño para la Fase 4)

- **Flujo:** la app envía a la función de servidor la pregunta, el modo (exegeta, hermeneuta, teólogo, investigador, predicador, preguntas, biblioteca, estudio personal), la profundidad (breve, explicativa, profunda, investigación avanzada) y el perfil doctrinal. El servidor **recupera primero** los textos reales (versículos, referencias, entradas Strong, fragmentos de documentos del usuario) y se los entrega al modelo con la instrucción de citar solo eso.
- **Verificación:** cada cita bíblica que devuelva el modelo se comprueba contra el texto local antes de mostrarse; si no existe, se marca como no verificada. Las fuentes se muestran como enlaces que abren el pasaje o la página del documento.
- **Perfil IPUC/unicitario:** se envía como marco de investigación (ver `state.js`): respuestas fundadas en el texto, sin formulaciones trinitarias como si fueran la doctrina del usuario, distinguiendo texto, inferencia, interpretación y formulación doctrinal. El perfil nunca altera el texto bíblico.
- **Honestidad:** el asistente no dirá que consultó recursos que no se le entregaron; la respuesta lleva la lista exacta de fuentes recuperadas.

## 9. Seguridad y privacidad

- Ninguna clave, contraseña ni secreto en el código ni en GitHub. La clave de IA vivirá en los secretos del servidor (Supabase).
- Datos personales solo en el dispositivo (hoy) y, desde la Fase 1b, en la cuenta propia protegida por seguridad por filas.
- Contenido del usuario insertado siempre como texto (nunca como HTML), para evitar inyección de código.
- **Bloqueo de la app** (pedido antes: contraseña / Face ID): se implementará con *passkeys* (WebAuthn), que en iPhone/iPad usan Face ID. Importante: un bloqueo en una PWA protege la pantalla, pero el cifrado real de los datos llegará con la cuenta en la nube y el cifrado de iOS del dispositivo.
- Repositorio: puede ser público (solo contiene la app y textos libres). Sus estudios y notas **no** van al repositorio; se quedan en el dispositivo o en su cuenta privada.

## 10. Recursos bíblicos y licencias

Ver `docs/LICENCIAS.md`. Integrados hoy: Reina-Valera 1909 (dominio público, con Strong), Biblia en Español Sencillo (CC BY 4.0), referencias cruzadas de OpenBible.info (CC BY), diccionarios de Strong (dominio público; edición Open Scriptures CC BY-SA). **No** se incluye la RVR1960 (derechos de Sociedades Bíblicas Unidas).

## 11. Limitaciones técnicas conocidas

- iOS puede borrar datos de sitios web no instalados que no se usan en semanas. Mitigación: instalar en la pantalla de inicio, pedir almacenamiento persistente (ya implementado) y respaldos.
- El léxico Strong libre está en inglés. Un léxico en español de calidad y con licencia libre no está disponible; se evaluará traducir definiciones con revisión humana, marcándolas como traducción.
- La división de versos de la BES difiere en algunos lugares de la RV1909 (31.102 frente a 31.087 versos); la comparación se hace por número de verso.
- Las pruebas automáticas usan Chromium con tamaños de iPhone e iPad; falta una ronda de pruebas manuales en Safari real (lista en `docs/PRUEBAS.md`).

## 12. Costos potenciales

| Servicio | Costo |
|---|---|
| GitHub Pages | Gratis |
| Supabase (Fase 1b) | Plan gratuito suficiente para uso personal (base de datos, autenticación, archivos). Plan pago solo si la biblioteca de PDF crece mucho. |
| IA (Fase 4) | Pago por uso de la API de Claude, según cantidad de preguntas y su longitud. Se configurará un límite de gasto mensual en la consola de Anthropic. Es independiente de la suscripción de claude.ai. |
| Dominio propio (opcional) | Pago anual del dominio; no es necesario. |

## 13. Criterios de prueba

Una función se considera terminada cuando: funciona en tamaño iPhone y iPad; sus datos persisten tras recargar; no produce errores en la consola; funciona sin conexión si su diseño lo permite; y está registrada en `docs/PRUEBAS.md` con resultado esperado y real.
