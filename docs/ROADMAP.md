# Hoja de ruta

Estado: ✔ terminado y probado · ◐ en curso · ○ pendiente

## Fase 0 — Planificación y arquitectura ✔
Arquitectura, tecnologías, estructura de módulos, base de datos local y en la nube (`supabase/schema.sql`), navegación, estrategia de sincronización y sin conexión, diseño de IA, licencias, costos, criterios de prueba. Ver `ARQUITECTURA.md`.

## Fase 1 — MVP funcional ✔ (versión 0.1.0)
- ✔ Biblia RV1909 completa (66 libros, 31.087 versos) con navegación por libro/capítulo/verso, selector, lectura continua.
- ✔ Comparación con la Biblia en Español Sencillo (panel y lectura en paralelo).
- ✔ Búsqueda de pasajes, palabras, frases exactas, números Strong (concordancia) y datos personales.
- ✔ Panel contextual de versículo: estudiar, nota, marcador, favorito, copiar, compartir, añadir a estudio, resaltar (5 colores), palabras originales, referencias, comparar, notas.
- ✔ Léxico Strong hebreo/griego con frecuencia y concordancia en la RV1909.
- ✔ Referencias cruzadas (OpenBible.info) con vista previa.
- ✔ Notas por versículo, capítulo y generales; tipos, carpetas, etiquetas; Cuaderno con filtros.
- ✔ Motor de estudio de 22 secciones, con secciones automáticas basadas en datos reales y afirmaciones clasificadas (texto / inferencia / interpretación / aplicación / comentarista); guardado automático; exportación a texto e impresión a PDF.
- ✔ Historial de lectura, pasajes consultados y pasajes estudiados.
- ✔ Temas claro, sepia y oscuro; tamaño de letra; Strong en línea.
- ✔ PWA instalable, sin conexión, descargas gestionadas, almacenamiento persistente.
- ✔ Respaldo y restauración (exportar/importar con fusión).
- ✔ Perfil doctrinal configurable (IPUC unicitario por defecto) y marco doctrinal personal guardado.

## Unión con el Taller del Predicador ◐ (en curso)
Etapa 1 ✔ (v0.2.0): Enseñanzas, archivo cifrado, series, calendario, Word/PDF, editor e importación. Etapas siguientes en `REGISTRO.md`.

## Fase 1b — Cuenta y sincronización ○
Requiere: crear proyecto gratuito en Supabase y pegar la URL y la clave pública en la app (la clave pública es segura en el navegador; la secreta nunca).
- Inicio de sesión (correo o Apple), sincronización iPhone ↔ iPad, estado visible, recuperación.
- Bloqueo de la app con Face ID (passkey).
- Planes de lectura (con progreso sincronizado).

## Fase 2 — Estudio avanzado ○
- Exégesis guiada: plantilla con análisis gramatical por palabra (con morfología cuando se integre), argumento del autor, comparación de interpretaciones.
- Hermenéutica: centro de formación (géneros, figuras, falacias) y herramienta de evaluación de una interpretación (lista de verificación contra el contexto).
- Doctrinas: biblioteca doctrinal con las categorías iniciales, pasajes principales/complementarios, objeciones y respuestas, desarrollo a lo largo de la Escritura.
- Estudios temáticos y comparación de pasajes lado a lado.

## Fase 3 — Biblioteca ○
Importar PDF y documentos propios, lector, búsqueda en el texto, etiquetas, notas y resaltado, vínculos con pasajes/doctrinas/estudios. Comentarios y diccionarios de dominio público (por ejemplo, obras clásicas sin derechos) tras verificar cada licencia.

## Fase 4 — Inteligencia artificial ○
Requiere: cuenta en la consola de Anthropic y clave de API guardada como secreto en Supabase. Asistente con 8 modos y 4 niveles de profundidad, respuestas basadas en recursos recuperados, citas verificadas contra el texto, control doctrinal según el perfil.

## Fase 5 — Taller del predicador ○
Editor de sermones y enseñanzas con bosquejo reordenable, plantillas, series, conversión estudio → sermón, exportación a PDF/Word y diapositivas desde el bosquejo.

## Fase 6 — Herramientas avanzadas ○
Morfología e interlineal (fuentes candidatas con licencia libre: OpenScriptures Hebrew Bible/morphhb — CC BY; SBL Greek New Testament / MorphGNT — CC BY-SA), búsqueda por raíz, atlas (OpenBible.info geodatos — CC BY, con grado de certeza), cronología con rangos y aclaraciones, personajes y genealogías.
