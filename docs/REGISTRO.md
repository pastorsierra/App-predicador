# Registro del proyecto

Documento para continuar el trabajo en cualquier sesión sin perder el hilo.

## Estado actual
- **Versión:** 0.2.0 — 23 nov 2026. Incluye la etapa 1 de la unión con el Taller del Predicador (Enseñanzas).
- **Pruebas:** 52/52 funcionales y 7/7 de actualización correctas; producción verificada (ver `PRUEBAS.md`). Falta la revisión manual en Safari real.
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
3. Fase 2: exégesis guiada, hermenéutica, biblioteca doctrinal.

## Requisitos externos que faltan
| Para | Qué se necesita del usuario |
|---|---|
| Publicar | Autorizar a Claude para crear el repositorio, o usar Working Copy |
| Sincronización (1b) | Crear cuenta gratuita en supabase.com (Claude guía paso a paso) |
| IA (Fase 4) | Cuenta en console.anthropic.com con método de pago y límite mensual |
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
