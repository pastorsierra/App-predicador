# Fuentes y licencias

Cada recurso integrado fue verificado antes de incluirse. El aviso de licencias también viaja con los datos publicados: `data/LICENCIAS.txt` (visible desde Ajustes → Fuentes y licencias). Los scripts de `tools/` regeneran los datos desde las fuentes originales.

| Recurso | Licencia | Fuente | Uso en la app |
|---|---|---|---|
| Reina-Valera 1909 (con números Strong por palabra) | Dominio público | eBible.org, vía github.com/seven1m/open-bibles (`spa-rv1909.usfx.xml`) | Texto principal, búsqueda, concordancia |
| La Biblia en Español Sencillo (BES) | CC BY 4.0 — © 2018 AudioBiblia.org / Irma Flores | eBible.org (SPNBES), vía github.com/seven1m/open-bibles | Comparación de traducciones. Atribución mostrada en la app. |
| Palabra de Dios para ti (PDT) | CC BY-SA 4.0 — © 2017-2022 Asociación Bíblica Latinoamericana | eBible.org (SPAPDT) vía github.com/seven1m/open-bibles | Comparación. Texto sin cambios (solo formato); los versos unidos en la fuente se indican «(incluido en el versículo N)». |
| Versión Biblia Libre (VBL) | CC BY-SA 4.0 — © 2018-2020 Jonathan Gallagher y Shelly Barrios de Avila | eBible.org (SPNVBL) vía github.com/seven1m/open-bibles | Comparación. Mismo tratamiento. |
| Referencias cruzadas | CC BY — OpenBible.info | openbible.info/labs/cross-references (copia en github.com/scrollmapper/bible_databases) | Filtradas: votos ≥ 3, máximo 15 por versículo (171.524 enlaces) |
| Diccionario hebreo de Strong (1894) y griego (1890) | Texto: dominio público. Edición digital JSON: Open Scriptures, CC BY-SA | github.com/openscriptures/strongs | Léxico. Si se redistribuye una versión modificada del léxico, debe conservar la licencia CC BY-SA. |

## Lo que no se incluye y por qué
- **Reina-Valera 1960, NVI, NTV, LBLA, DHH, etc.**: tienen derechos de autor vigentes. Solo podrían añadirse con licencia escrita del titular (p. ej., Sociedades Bíblicas Unidas para la RVR1960).
- **Léxicos y comentarios modernos** (Vine, Tuggy, etc.): con derechos. La biblioteca (Fase 3) permitirá que el usuario importe documentos que posea legítimamente, para su uso personal y sin redistribuirlos.

## Candidatos verificables para fases siguientes
- OpenScriptures Hebrew Bible (morfología hebrea) — CC BY 4.0.
- MorphGNT / SBLGNT (morfología griega) — CC BY-SA.
- OpenBible.info geodatos bíblicos — CC BY.
(Se confirmará cada licencia al momento de integrarlos.)

## Material del Taller del Predicador
- Las enseñanzas, el diseño de página, el generador de Word y el logo de la IPUC provienen de la app del propio usuario (Taller del Predicador). Las enseñanzas se publican solo cifradas.
- `vendor/docx.js`: biblioteca «docx» (licencia MIT), copiada del Taller para generar archivos de Word.

## Atlas
- `data/atlas/lugares.json`: lugares bíblicos de OpenBible.info (CC BY 4.0), con nombres en español, tomados del Taller del Predicador.
- `data/personajes/personas.json`: personas y parentescos de Theographic Bible Metadata (Robert Rouse, CC BY-SA 4.0, github.com/robertrouse/theographic-bible-metadata). Adaptación: nombres en español obtenidos de la RV1909 (palabra con mayúscula más frecuente y parecida en los versículos de cada persona; 194 equivalencias estándar fijadas a mano, 41 quedan en inglés), sin Dios ni el Espíritu Santo como «personajes». Se distribuye con la misma licencia CC BY-SA 4.0. Generado con `tools/build_people.py`.
- Cronología (`js/chronology.js`): períodos y rangos redactados para la app a partir de los datos internos de la Biblia (1 R 6:1, Éx 12:40, Lc 3:1, etc.) y de sincronismos históricos ampliamente aceptados; cada fecha debatida indica las alternativas.
- `data/atlas/mapa.json`: contornos de Natural Earth (dominio público).

## Biblias personales
Las versiones que el usuario carga (por ejemplo, la Reina-Valera 1960) **no forman parte del repositorio**: quedan solo en su dispositivo para uso personal, como en el Taller. Varias tienen derechos de autor y no deben publicarse.

- `vendor/pdfjs/`: pdf.js 6.2.108 (Mozilla), Apache 2.0 — lector y extracción de texto de los PDF de la Biblioteca. Los documentos del usuario se guardan solo en su dispositivo.
- Asistente de IA: no incluye ninguna clave. La función de servidor (`supabase/functions/asistente`) usa la API de Anthropic con la clave del usuario guardada como secreto en su proyecto de Supabase.
