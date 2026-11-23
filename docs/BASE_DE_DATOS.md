# Base de datos

## Local (implementada) — IndexedDB `escudrinad`, versión 1

| Almacén | Clave | Índices | Campos principales |
|---|---|---|---|
| `notes` | uuid | chap, ref, updatedAt | ref (`JHN.3.16`, `JHN.3.16-18`, `JHN.3` o null), chap, refLabel, kind, title, body, folder, tags[] |
| `highlights` | `hl:<ref>` | chap | ref, chap, color (oro, azul, verde, rosa, gris) |
| `favorites` | `fav:<ref>` | chap | ref, chap, refLabel |
| `bookmarks` | uuid | updatedAt | ref, chap, refLabel, title |
| `studies` | uuid | updatedAt | title, passage, passageLabel, book, status, tags[], sections{id:{text, claims[{type,text}]}}, related[] |
| `history` | `<tipo>:<clave>` | at | kind (lectura, pasaje, estudio), key, title, at |
| `settings` | nombre | — | value (tema, tamaño, perfil doctrinal, última posición…) |

Todos los registros (salvo `settings`) llevan `createdAt`, `updatedAt` y `deletedAt` (borrado lógico), preparados para sincronizar.

## Nube (diseñada) — PostgreSQL en Supabase
Archivo completo: `supabase/schema.sql`. Incluye las tablas anteriores más doctrinas, biblioteca (documentos y fragmentos con búsqueda en español), sermones y series, vínculos genéricos entre entidades y pasajes, datos de referencia (personajes, lugares con grado de certeza, eventos con rangos de fecha) y conversaciones de IA con fuentes verificables. Todas con seguridad por filas: cada usuario solo puede leer y modificar sus propios registros.

## Datos bíblicos (archivos estáticos)
- `data/<versión>/<LIBRO>.json`: `{ id, n, c: [ [verso1, verso2, …], … ] }`. Cada verso es texto o una lista de segmentos `"texto"`, `["texto","G25"]`, `["texto","H430",1]` (1 = palabra añadida por los traductores, en cursiva).
- `data/xref/<LIBRO>.json`: `{ "3.16": ["ROM.5.8", "1JN.4.9-10", …] }` ordenadas por relevancia.
- `data/strong/H.json`, `G.json`: `{ "G25": [lema, transliteración, pronunciación, derivación, definición, traducciones KJV, frecuencia en RV1909] }`.
