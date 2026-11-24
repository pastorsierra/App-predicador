// Módulo 4 — Hermenéutica: guía de principios, géneros y errores, y herramienta para evaluar una interpretación.
// La guía es material de formación general; la evaluación la hace el usuario con ayudas tomadas del texto real.
import { h, clear, icon, toast, confirmDialog, fmtDate } from '../ui.js';
import { BOOK } from '../books.js';
import { parseRef, refToKey, label, splitKey } from '../ref.js';
import { getChapter, plain, verseCount, loadXref, verLabel } from '../bible.js';
import { put, get, all, remove, uid } from '../db.js';
import { S } from '../state.js';
import { studyTabs } from './doctrinas.js';
import { hrefFor } from './verse.js';

const PRINCIPIOS = [
  ['El texto tiene un sentido que su autor quiso comunicar', 'Antes de preguntar «¿qué significa para mí?», pregunte «¿qué quiso decir el autor a sus primeros lectores?». La aplicación correcta nace de ese sentido.'],
  ['El contexto manda', 'Lea siempre los versículos anteriores y posteriores, el capítulo y el argumento del libro. Un versículo separado de su contexto puede hacerse decir lo contrario de lo que dice.'],
  ['Sentido histórico-gramatical', 'Atienda a las palabras, la gramática (quién hace qué, tiempos verbales, conectores) y la situación histórica y cultural en que se escribió.'],
  ['Respetar el género literario', 'Una narración, un salmo, un proverbio, una profecía o una carta se leen de manera distinta. Identifique el género antes de interpretar.'],
  ['La Escritura interpreta a la Escritura', 'Los pasajes claros ayudan a entender los difíciles. Una interpretación que contradice textos claros debe revisarse.'],
  ['Distinguir descripción y mandato', 'Que la Biblia narre algo no significa que lo apruebe o lo ordene para todos. Busque si el propio texto lo presenta como modelo o como mandato.'],
  ['Las palabras significan según su contexto', 'Una palabra no significa a la vez todos sus sentidos posibles. El contexto decide cuál de ellos usa el autor en ese lugar.'],
  ['Separar texto, inferencia, interpretación y aplicación', 'Diga con honestidad qué afirma el texto, qué se deduce, qué es su interpretación y qué es aplicación. Así otros pueden verificar su estudio.'],
];

const GENEROS = {
  'Narrativa': ['Génesis a Ester, partes de los profetas, Evangelios y Hechos', 'Cuenta lo que pasó. Busque el punto de la historia en su conjunto; no convierta cada detalle en símbolo ni cada acción en norma. Pregunte qué revela de Dios y de su obra.'],
  'Ley': ['Éxodo a Deuteronomio', 'Instrucciones dadas a Israel dentro del pacto. Lea a la luz de su propósito y de cómo el Nuevo Testamento la presenta cumplida en Cristo.'],
  'Poesía': ['Salmos, Cantares, Lamentaciones y muchos pasajes proféticos', 'Usa paralelismo e imágenes. Las figuras expresan verdades reales, pero no se leen como descripciones técnicas.'],
  'Sabiduría': ['Job, Proverbios, Eclesiastés', 'Los proverbios expresan principios generales, no promesas sin excepción. Job y Eclesiastés deben leerse completos para entender su conclusión.'],
  'Profecía': ['Isaías a Malaquías', 'Mensajes a un pueblo en su situación, con anuncios cercanos y lejanos. Identifique a quién se habla y qué parte se cumplió según el propio Nuevo Testamento.'],
  'Evangelios': ['Mateo, Marcos, Lucas y Juan', 'Narran la vida, enseñanza, muerte y resurrección de Jesucristo. Compare los relatos paralelos y atienda al propósito de cada evangelista.'],
  'Parábolas': ['En los Evangelios', 'Suelen enseñar un punto central. No convierta cada detalle en alegoría; busque la reacción que Jesús buscaba en sus oyentes.'],
  'Epístolas': ['Romanos a Judas', 'Cartas a iglesias y personas con situaciones concretas. Siga el argumento del autor párrafo por párrafo y reconstruya la situación que responde.'],
  'Apocalíptica': ['Apocalipsis y partes de Daniel', 'Lenguaje simbólico y visiones. Interprete los símbolos con lo que el propio libro y el Antiguo Testamento explican; evite precisiones que el texto no da.'],
};
const GENRE_OF_GROUP = { 'Pentateuco': 'Narrativa y Ley', 'Históricos': 'Narrativa', 'Poéticos': 'Poesía y Sabiduría', 'Profetas mayores': 'Profecía', 'Profetas menores': 'Profecía', 'Evangelios': 'Evangelios', 'Historia': 'Narrativa', 'Epístolas paulinas': 'Epístolas', 'Epístolas generales': 'Epístolas', 'Profecía': 'Apocalíptica' };

const ERRORES = [
  ['Texto fuera de contexto', 'Usar un versículo para apoyar algo que su contexto no enseña.'],
  ['Eiségesis', 'Poner en el texto una idea previa en lugar de sacar del texto lo que dice (exégesis).'],
  ['Falacia de la raíz', 'Suponer que el significado de una palabra es siempre el de su raíz o de sus partes.'],
  ['Sumar todos los significados', 'Cargar una palabra con todos los sentidos que tiene en el diccionario a la vez.'],
  ['Anacronismo', 'Leer una palabra con el sentido que tiene hoy y no con el que tenía cuando se escribió.'],
  ['Alegorizar sin control', 'Dar sentidos simbólicos a detalles que el texto presenta como hechos, sin apoyo del propio texto.'],
  ['Convertir una narración en norma', 'Tomar lo que alguien hizo en una historia como mandato para todos, sin que el texto lo indique.'],
  ['Argumento del silencio', 'Concluir algo solo porque el texto no dice lo contrario.'],
  ['Generalizar una promesa particular', 'Aplicar a todos una promesa hecha a una persona o situación concreta.'],
  ['Ignorar los pasajes que no encajan', 'Construir una conclusión con algunos textos y dejar de lado los que la matizan.'],
];
const TIPOLOGIA = ['El Nuevo Testamento la señala o la sustenta claramente.', 'Hay correspondencia real e histórica, no solo un parecido de palabras.', 'La figura apunta a Cristo o a su obra de forma coherente con todo el texto.', 'No se construye doctrina solo sobre la figura; se confirma con enseñanza directa.'];

const PREGUNTAS = [
  ['contexto', '¿Leí el contexto inmediato (antes y después) y la interpretación encaja con él?'],
  ['genero', '¿Identifiqué el género del pasaje y lo leí conforme a él?'],
  ['autor', '¿Puedo decir qué quiso comunicar el autor a sus primeros lectores?'],
  ['historico', '¿Tuve en cuenta la situación histórica y cultural?'],
  ['palabras', '¿El sentido de las palabras clave lo decide su contexto (y no solo una raíz o un diccionario)?'],
  ['claros', '¿La interpretación concuerda con los pasajes claros sobre el mismo tema?'],
  ['descriptivo', 'Si es una narración, ¿distinguí lo que se describe de lo que se ordena?'],
  ['silencio', '¿La conclusión se apoya en lo que el texto dice, no en lo que calla?'],
  ['contrarios', '¿Revisé los textos que parecen decir otra cosa y les di respuesta?'],
  ['separacion', '¿Separé claramente texto, inferencia, interpretación y aplicación?'],
];

export async function renderHermeneutica(view) {
  const evals = (await all('studies')).filter(s => s.kind === 'evaluacion').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ref = h('input', { type: 'text', placeholder: 'Pasaje (ej.: Mt 16:18-19)', 'aria-label': 'Pasaje a evaluar' });
  const interp = h('textarea', { rows: 3, placeholder: 'Escriba la interpretación que quiere examinar…', 'aria-label': 'Interpretación' });
  const msg = h('p', { class: 'hint' });
  const acc = (title, body, open = false) => h('details', { class: 'sec herm-acc', open }, h('summary', {}, h('h2', {}, title)), body);
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Estudios')), studyTabs('hermeneutica'),
    h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Evaluar una interpretación')),
      h('p', { class: 'hint' }, 'Examine si una interpretación respeta el texto y su contexto. La app le muestra el pasaje, su contexto, su género y pasajes relacionados; usted responde las preguntas y obtiene los puntos que conviene revisar.'),
      h('form', { class: 'form', onsubmit: async (e) => {
        e.preventDefault(); const r = parseRef(ref.value);
        if (!r || !r.ch || r.error || !r.v) { msg.textContent = r?.error || 'Escriba un pasaje con versículo, por ejemplo: Mateo 16:18'; return; }
        if (!interp.value.trim()) { msg.textContent = 'Escriba la interpretación que quiere evaluar.'; return; }
        const key = refToKey(r);
        const rec = await put('studies', { id: uid(), kind: 'evaluacion', title: `Evaluación: ${label(key)}`, passage: key, passageLabel: label(key), interpretation: interp.value.trim(), answers: {}, notes: {}, conclusion: '', tags: [], status: 'borrador' });
        location.hash = `#/evaluacion/${rec.id}`;
      } }, ref, interp, h('button', { class: 'btn primary', type: 'submit' }, 'Evaluar'), msg),
      evals.length ? h('ul', { class: 'list compact' }, evals.map(e => h('li', {}, h('a', { href: `#/evaluacion/${e.id}` }, h('strong', {}, e.passageLabel), h('span', {}, `${e.interpretation.slice(0, 90)} · ${fmtDate(e.updatedAt)}`))))) : null),
    acc('Principios de interpretación', h('ol', { class: 'herm-list' }, PRINCIPIOS.map(([t, d]) => h('li', {}, h('strong', {}, t), h('p', {}, d)))), true),
    acc('Cómo leer cada género', h('div', {}, Object.entries(GENEROS).map(([g, [w, d]]) => h('div', { class: 'herm-gen' }, h('h3', {}, g), h('p', { class: 'hint' }, w), h('p', {}, d))))),
    acc('Errores y falacias frecuentes', h('ul', { class: 'herm-list' }, ERRORES.map(([t, d]) => h('li', {}, h('strong', {}, t), h('p', {}, d))))),
    acc('Tipología con criterios responsables', h('div', {}, h('p', {}, 'Una tipología (persona, hecho o institución que prefigura a Cristo) es más segura cuando:'), h('ul', { class: 'herm-list' }, TIPOLOGIA.map(t => h('li', {}, t))))),
    h('p', { class: 'hint' }, 'Esta guía resume principios generales de interpretación; amplíela con sus propios libros de hermenéutica en la Biblioteca (próximamente).'));
}

export async function renderEvaluacion(view, id) {
  const ev = await get('studies', id);
  if (!ev || ev.kind !== 'evaluacion') { view.append(h('div', { class: 'empty' }, 'Evaluación no encontrada. ', h('a', { href: '#/hermeneutica' }, 'Volver'))); return; }
  ev.answers = ev.answers || {}; ev.notes = ev.notes || {};
  const r = splitKey(ev.passage); const b = BOOK[r.book];
  const ver = S.version || 'rv1909';
  let c; try { c = await getChapter(ver, r.book, r.ch); } catch (e) { c = await getChapter('rv1909', r.book, r.ch); }
  const v2 = r.v2 || r.v;
  const text = []; for (let v = r.v; v <= v2; v++) text.push([h('sup', {}, v), plain(c[v - 1]), ' ']);
  const before = [], after = [];
  for (let v = Math.max(1, r.v - 5); v < r.v; v++) before.push([h('sup', {}, v), plain(c[v - 1]), ' ']);
  for (let v = v2 + 1; v <= Math.min(verseCount(r.book, r.ch), v2 + 5); v++) after.push([h('sup', {}, v), plain(c[v - 1]), ' ']);
  let xrefs = []; try { const x = await loadXref(r.book); const seen = new Set(); for (let v = r.v; v <= v2; v++) for (const k of (x[`${r.ch}.${v}`] || [])) if (!seen.has(k)) { seen.add(k); xrefs.push(k); } } catch (e) { xrefs = []; }

  const status = h('span', { class: 'save-state' }, 'Guardado'); let timer;
  const save = () => { status.textContent = 'Guardando…'; status.className = 'save-state busy'; clearTimeout(timer); timer = setTimeout(async () => { await put('studies', ev); status.textContent = 'Guardado'; status.className = 'save-state'; drawSummary(); }, 400); };
  const summary = h('div', { class: 'settings-block herm-sum' });
  const drawSummary = () => {
    clear(summary);
    const no = PREGUNTAS.filter(([k]) => ev.answers[k] === 'no'), dk = PREGUNTAS.filter(([k]) => ev.answers[k] === 'nose'), yes = PREGUNTAS.filter(([k]) => ev.answers[k] === 'si');
    const pend = PREGUNTAS.length - no.length - dk.length - yes.length;
    summary.append(h('h2', {}, 'Resultado'),
      h('p', {}, `${yes.length} criterios cumplidos · ${no.length} no cumplidos · ${dk.length} por investigar${pend ? ` · ${pend} sin responder` : ''}.`),
      no.length || dk.length ? h('div', {}, h('p', { class: 'hint' }, 'Puntos que conviene revisar antes de enseñar esta interpretación:'), h('ul', {}, [...no, ...dk].map(([, q]) => h('li', {}, q)))) : null,
      !no.length && !dk.length && !pend ? h('p', {}, 'La interpretación supera todos los criterios que usted evaluó. Aun así, compárela con los pasajes relacionados y, si es posible, con buenos comentarios.') : null);
  };
  const qs = PREGUNTAS.map(([k, q]) => {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': q }, [['si', 'Sí'], ['no', 'No'], ['nose', 'No sé']].map(([val, n]) =>
      h('button', { class: ev.answers[k] === val ? 'on' : '', onclick: (e) => { ev.answers[k] = val; seg.querySelectorAll('button').forEach(b2 => b2.classList.toggle('on', b2 === e.currentTarget)); save(); } }, n)));
    const note = h('input', { type: 'text', placeholder: 'Nota (opcional)', value: ev.notes[k] || '', 'aria-label': `Nota: ${q}`, oninput: (e) => { ev.notes[k] = e.target.value; save(); } });
    return h('div', { class: 'herm-q' }, h('p', {}, q), seg, note);
  });
  const concl = h('textarea', { rows: 4, placeholder: 'Su conclusión: ¿la interpretación se sostiene, se debe matizar o se descarta? ¿Por qué?', 'aria-label': 'Conclusión', oninput: (e) => { ev.conclusion = e.target.value; save(); } }); concl.value = ev.conclusion || '';
  const genre = GENRE_OF_GROUP[b.group] || b.group;
  view.append(h('header', { class: 'study-head' }, h('a', { class: 'back', href: '#/hermeneutica' }, icon('left', 18), 'Hermenéutica'),
    h('h1', { class: 'ens-title' }, ev.passageLabel),
    h('div', { class: 'study-meta' }, status, h('a', { class: 'btn ghost small', href: hrefFor(ev.passage) }, icon('book', 16), 'Abrir en la Biblia'),
      h('button', { class: 'btn ghost small danger', onclick: async () => { if (await confirmDialog('Eliminar evaluación', '¿Eliminar esta evaluación?')) { await remove('studies', ev.id); location.hash = '#/hermeneutica'; } } }, icon('trash', 16), 'Eliminar'))),
    h('div', { class: 'study-sections' },
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Interpretación que se evalúa')), h('blockquote', { class: 'sel-text' }, ev.interpretation)),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'El texto'), h('span', { class: 'badge' }, 'automática')),
        h('p', { class: 'bible' }, text), h('p', { class: 'hint' }, `${verLabel(ver)} · Libro: ${b.name} · Género: ${genre}. ${GENEROS[genre.split(' y ')[0]]?.[1] || ''}`),
        before.length ? [h('h4', {}, 'Antes'), h('p', { class: 'bible muted' }, before)] : null,
        after.length ? [h('h4', {}, 'Después'), h('p', { class: 'bible muted' }, after)] : null,
        h('h4', {}, `Pasajes relacionados (${xrefs.length})`),
        xrefs.length ? h('ul', { class: 'chip-list' }, xrefs.slice(0, 20).map(k => h('li', {}, h('a', { class: 'chip', href: hrefFor(k) }, label(k, true))))) : h('p', { class: 'hint' }, 'Sin referencias registradas.')),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Preguntas de verificación')), qs),
      summary,
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Conclusión')), concl)));
  drawSummary();
}
