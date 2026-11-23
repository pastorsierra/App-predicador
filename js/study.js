// Motor de estudio bíblico (Fase 1): plantilla de 22 secciones.
// Solo se rellenan automáticamente las secciones que pueden construirse con datos reales disponibles
// (texto bíblico, contexto inmediato, palabras con Strong, referencias cruzadas, fuentes).
// El resto queda para el estudio del usuario, con una guía metodológica. Nada se inventa.
import { BOOK } from './books.js';
import { getChapter, plain, segments, strongEntry, loadXref, manifest, verseCount } from './bible.js';
import { label, splitKey } from './ref.js';
import { put, get, all, uid, touchHistory } from './db.js';
import { allVersions } from './bible.js';
import { S } from './state.js';

export const SECTIONS = [
  ['texto', 'Texto bíblico', 'auto', 'Texto del pasaje en las versiones disponibles.'],
  ['historico', 'Contexto histórico', 'user', 'Situación histórica del autor y de los destinatarios. Anote la fuente de cada dato.'],
  ['cultural', 'Contexto cultural', 'user', 'Costumbres, instituciones y prácticas que iluminan el pasaje.'],
  ['geografico', 'Contexto geográfico', 'user', 'Lugares mencionados o implicados.'],
  ['autor', 'Autor', 'user', 'Lo que el texto y la tradición dicen del autor. Distinga lo explícito de lo tradicional.'],
  ['destinatarios', 'Destinatarios', 'user', 'A quién se escribió originalmente.'],
  ['fecha', 'Fecha aproximada', 'user', 'Solo si es pertinente y sustentada. Indique rangos cuando haya debate.'],
  ['proposito', 'Propósito del libro', 'user', 'Por qué se escribió el libro; cite los versos donde el autor lo declara, si existen.'],
  ['literario', 'Contexto literario', 'user', 'Género del libro y del pasaje (narrativa, poesía, profecía, epístola, parábola).'],
  ['inmediato', 'Contexto inmediato', 'auto', 'Versículos anteriores y posteriores al pasaje.'],
  ['general', 'Contexto general', 'user', 'Lugar del pasaje en el argumento del libro y de toda la Escritura.'],
  ['estructura', 'Estructura del pasaje', 'user', 'Divisiones, conectores, repeticiones y progresión del argumento.'],
  ['versiculos', 'Análisis versículo por versículo', 'auto-user', 'Observaciones sobre cada versículo.'],
  ['palabras', 'Palabras importantes', 'auto', 'Palabras del pasaje con número Strong (RV1909) y su entrada léxica.'],
  ['temas', 'Temas principales', 'user', 'Temas que el propio texto desarrolla.'],
  ['referencias', 'Referencias cruzadas', 'auto', 'Pasajes relacionados (OpenBible.info). Verifique cada relación en su contexto.'],
  ['interpretacion', 'Interpretación', 'user', 'Qué significó para los primeros lectores. Marque qué es afirmación explícita, inferencia o interpretación.'],
  ['doctrina', 'Enseñanza doctrinal', 'user', 'Doctrina que el texto enseña o apoya, con su fundamento.'],
  ['aplicacion', 'Aplicación práctica', 'user', 'Aplicaciones que se derivan del sentido del texto.'],
  ['preguntas', 'Preguntas de profundización', 'user', 'Preguntas abiertas para seguir investigando.'],
  ['conclusiones', 'Conclusiones', 'user', 'Síntesis del estudio.'],
  ['fuentes', 'Fuentes consultadas', 'auto-user', 'Recursos usados. Añada libros o comentarios con autor, título y página.'],
].map(([id, title, mode, hint], i) => ({ id, n: i + 1, title, mode, hint }));

// Módulo 3 — Exégesis guiada: plantilla propia
export const EXEGESIS = [
  ['texto', 'Texto bíblico', 'auto', 'Texto del pasaje.'],
  ['traducciones', 'Comparación de traducciones', 'auto', 'Cada versículo en todas las versiones disponibles. Fíjese dónde difieren: allí suele haber una decisión de traducción que conviene estudiar.'],
  ['inmediato', 'Contexto inmediato', 'auto', 'Versículos anteriores y posteriores.'],
  ['historico', 'Contexto histórico', 'user', 'Situación del autor y de los destinatarios. Anote la fuente de cada dato.'],
  ['literario', 'Contexto literario y género', 'user', 'Género del libro y del pasaje; lugar que ocupa en el argumento del libro.'],
  ['gramatical', 'Contexto gramatical', 'user', 'Verbos (tiempo, modo, quién actúa), conectores (porque, pues, pero, por tanto), sujetos y complementos.'],
  ['estructura', 'Estructura del pasaje', 'user', 'Divisiones, repeticiones, contrastes y progresión.'],
  ['palabras', 'Palabras importantes (análisis léxico)', 'auto', 'Palabras con número Strong. El sentido de cada palabra lo decide su contexto, no todos sus significados posibles.'],
  ['versiculos', 'Análisis versículo por versículo', 'auto-user', 'Observaciones sobre cada versículo.'],
  ['referencias', 'Relación con otros pasajes', 'auto', 'Pasajes relacionados. Verifique cada relación en su propio contexto.'],
  ['argumento', 'Argumento del autor', 'user', '¿Qué quiere lograr el autor con este pasaje? Resúmalo en una frase.'],
  ['interpretaciones', 'Interpretaciones', 'user', 'Exponga las interpretaciones posibles y en qué se apoya cada una. Marque como «Opinión de comentarista» lo que venga de otros autores.'],
  ['conclusiones', 'Conclusiones exegéticas', 'user', 'Qué afirma el texto, con qué grado de certeza.'],
  ['aplicaciones', 'Aplicaciones derivadas del texto', 'user', 'Solo las que se siguen del sentido del texto.'],
  ['fuentes', 'Fuentes consultadas', 'auto-user', 'Recursos usados. Añada libros o comentarios con autor, título y página.'],
].map(([id, title, mode, hint], i) => ({ id, n: i + 1, title, mode, hint }));

export const KINDS = { pasaje: { name: 'Estudio de pasaje', sections: SECTIONS }, exegesis: { name: 'Exégesis guiada', sections: EXEGESIS } };
export const sectionsFor = (study) => (KINDS[study.kind] || KINDS.pasaje).sections;

// Categorías de afirmación (Módulo 3): para marcar cada observación del usuario
export const CLAIMS = [
  ['texto', 'Afirmación del texto'], ['inferencia', 'Inferencia'], ['interpretacion', 'Interpretación'],
  ['aplicacion', 'Aplicación'], ['comentarista', 'Opinión de comentarista'],
];

export async function buildAuto(passageKey) {
  const r = splitKey(passageKey);
  const v1 = r.v || 1;
  const v2 = r.v ? (r.v2 || r.v) : verseCount(r.book, r.ch);
  const rv = await getChapter('rv1909', r.book, r.ch);
  let bes = [];
  try { bes = await getChapter('bes', r.book, r.ch); } catch (e) { bes = []; }
  const verses = [];
  for (let v = v1; v <= v2; v++) verses.push({ v, rv: plain(rv[v - 1]), bes: bes[v - 1] || '' });
  // Todas las traducciones disponibles (incluidas las Biblias personales del usuario, solo si están en este equipo)
  const hidden = new Set(S.compareHide || []);
  const translations = [];
  for (const x of await allVersions()) {
    if (x.code === 'rv1909' || hidden.has(x.code)) continue;
    try { const c = x.code === 'bes' ? bes : await getChapter(x.code, r.book, r.ch); translations.push({ code: x.code, abbr: x.abbr, own: x.own, verses: verses.map(y => ({ v: y.v, t: plain(c[y.v - 1]) })) }); } catch (e) { /* no disponible */ }
  }
  // En «Texto bíblico» se muestra además la versión principal del usuario (si no es la RV1909 ni la BES)
  const others = translations.filter(t => t.code === S.version && t.code !== 'bes');

  // Contexto inmediato: hasta 5 versículos antes y después dentro del capítulo
  const before = [], after = [];
  for (let v = Math.max(1, v1 - 5); v < v1; v++) before.push({ v, text: plain(rv[v - 1]) });
  for (let v = v2 + 1; v <= Math.min(rv.length, v2 + 5); v++) after.push({ v, text: plain(rv[v - 1]) });

  // Palabras con Strong (agrupadas por número, con su traducción en la RV1909)
  const words = new Map();
  for (let v = v1; v <= v2; v++) {
    for (const s of segments(rv[v - 1])) {
      if (!s.s) continue;
      for (const num of s.s.split(' ')) {
        const w = words.get(num) || { num, renderings: new Set(), verses: new Set() };
        w.renderings.add(s.t.trim()); w.verses.add(v); words.set(num, w);
      }
    }
  }
  const wordList = [];
  for (const w of words.values()) {
    const e = await strongEntry(w.num).catch(() => null);
    wordList.push({ num: w.num, renderings: [...w.renderings], verses: [...w.verses], lemma: e?.lemma || '', xlit: e?.xlit || '', def: e?.def || '', freq: e?.freq || 0 });
  }
  // Orden: las palabras menos frecuentes en toda la Biblia primero (más significativas);
  // las muy frecuentes (artículos, conjunciones, preposiciones) quedan al final.
  wordList.sort((a, b) => a.freq - b.freq);

  // Referencias cruzadas
  let xrefs = [];
  try {
    const x = await loadXref(r.book);
    const seen = new Set();
    for (let v = v1; v <= v2; v++) for (const k of (x[`${r.ch}.${v}`] || [])) if (!seen.has(k)) { seen.add(k); xrefs.push({ from: v, key: k }); }
  } catch (e) { xrefs = []; }

  const m = manifest();
  const sources = [
    `${m.versions.rv1909.name} — ${m.versions.rv1909.license}.`,
    `${m.versions.bes.name} — ${m.versions.bes.license}.`,
    'Diccionarios hebreo (1894) y griego (1890) de James Strong — dominio público; edición digital de Open Scriptures (CC BY-SA).',
    `${m.xref.name} — ${m.xref.license}.`,
  ];
  const own = translations.filter(t => t.own);
  if (own.length) sources.push(`Biblias personales del usuario (solo en su equipo): ${own.map(o => o.abbr).join(', ')}.`);
  return { v1, v2, verses, others, translations, before, after, words: wordList, xrefs, sources };
}

export async function createStudy(passageKey, title, kind = 'pasaje') {
  const r = splitKey(passageKey);
  const key = r.v ? passageKey : `${r.book}.${r.ch}.1-${verseCount(r.book, r.ch)}`;
  const auto = await buildAuto(key);
  const sections = {};
  for (const s of (KINDS[kind] || KINDS.pasaje).sections) sections[s.id] = { text: '', claims: [] };
  auto.verses.forEach(x => { sections.versiculos[`v${x.v}`] = ''; });
  const rec = await put('studies', {
    id: uid(), kind, title: title || `${kind === 'exegesis' ? 'Exégesis' : 'Estudio'} de ${label(key)}`,
    passage: key, passageLabel: label(key), book: r.book, tags: [], status: 'borrador',
    doctrinalProfile: null, sections, related: [],
  });
  await touchHistory('estudio', key, rec.title);
  return rec;
}

export async function addPassageToStudy(studyId, key) {
  const s = await get('studies', studyId);
  if (!s) throw new Error('Estudio no encontrado');
  s.related = [...new Set([...(s.related || []), key])];
  return put('studies', s);
}

export async function listStudies() {
  return (await all('studies')).filter(s => s.kind !== 'evaluacion').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Exportación a texto (Markdown) — contenido real del estudio
export async function studyToMarkdown(study) {
  const auto = await buildAuto(study.passage);
  const L = [];
  L.push(`# ${study.title}`, '', `**Pasaje:** ${study.passageLabel}  `, `**Estado:** ${study.status}  `, `**Actualizado:** ${new Date(study.updatedAt).toLocaleString('es-CO')}`, '');
  if (study.tags?.length) L.push(`**Etiquetas:** ${study.tags.join(', ')}`, '');
  for (const s of sectionsFor(study)) {
    L.push(`## ${s.n}. ${s.title}`, '');
    if (s.id === 'traducciones') auto.verses.forEach((x, i) => { L.push(`**v. ${x.v}** RV1909: ${x.rv}`); (auto.translations || []).forEach(t => L.push(`- ${t.abbr}: ${t.verses[i].t}`)); L.push(''); });
    if (s.id === 'texto') { auto.verses.forEach(x => L.push(`${x.v} ${x.rv}`)); L.push('', `_(RV1909)_`, ''); if (auto.verses.some(x => x.bes)) { auto.verses.forEach(x => L.push(`${x.v} ${x.bes}`)); L.push('', '_(BES)_', ''); } (auto.others || []).forEach(o => { o.verses.forEach(x => L.push(`${x.v} ${x.t}`)); L.push('', `_(${o.abbr})_`, ''); }); }
    if (s.id === 'inmediato') { if (auto.before.length) L.push('**Antes:** ' + auto.before.map(x => `${x.v} ${x.text}`).join(' '), ''); if (auto.after.length) L.push('**Después:** ' + auto.after.map(x => `${x.v} ${x.text}`).join(' '), ''); }
    if (s.id === 'versiculos') auto.verses.forEach(x => { const t = study.sections.versiculos?.[`v${x.v}`]; L.push(`**v. ${x.v}** — ${x.rv}`, '', t ? t : '_(sin observaciones)_', ''); });
    if (s.id === 'palabras') auto.words.slice(0, 40).forEach(w => L.push(`- **${w.renderings.join(' / ')}** — ${w.num} ${w.lemma} (${w.xlit}), ${w.freq} veces en la RV1909: ${w.def}`));
    if (s.id === 'referencias') L.push(auto.xrefs.map(x => label(x.key, true)).join('; ') || '_(sin referencias)_', '');
    if (s.id === 'fuentes') auto.sources.forEach(x => L.push(`- ${x}`));
    const sec = study.sections[s.id];
    if (sec?.text) L.push('', sec.text, '');
    if (sec?.claims?.length) sec.claims.forEach(c => L.push(`- _[${(CLAIMS.find(k => k[0] === c.type) || [, c.type])[1]}]_ ${c.text}`));
    L.push('');
  }
  if (study.related?.length) L.push('## Pasajes relacionados añadidos', '', study.related.map(k => label(k)).join('; '), '');
  return L.join('\n');
}

export const bookInfo = (id) => BOOK[id];
