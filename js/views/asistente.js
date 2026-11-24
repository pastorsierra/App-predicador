// Asistente de IA: pregunta, modo y profundidad; muestra las fuentes reales enviadas, la respuesta (marcada como IA)
// y la verificación de citas. Solo aparece en la navegación cuando la conexión con el servidor se probó con éxito.
import { h, clear, icon, toast, copyText } from '../ui.js';
import { put } from '../db.js';
import { label, parseRef, refToKey, splitKey, ckey } from '../ref.js';
import { hrefFor } from './verse.js';
import { aiConfig, gatherSources, ask, MODOS, PROFUNDIDADES } from '../ai.js';

const md = (t) => {
  // Markdown mínimo y seguro (sin HTML): títulos, negritas, listas y párrafos
  const out = h('div', { class: 'ai-text' });
  for (const block of t.split(/\n{2,}/)) {
    const lines = block.split('\n');
    const inline = (s) => s.split(/(\*\*[^*]+\*\*)/).map(x => /^\*\*[^*]+\*\*$/.test(x) ? h('strong', {}, x.slice(2, -2)) : x);
    if (lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l))) out.append(h(/^\s*\d/.test(lines[0]) ? 'ol' : 'ul', {}, lines.map(l => h('li', {}, inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))))));
    else if (/^#{1,4}\s/.test(lines[0])) { out.append(h('h3', {}, inline(lines[0].replace(/^#+\s*/, '')))); if (lines.length > 1) out.append(h('p', {}, inline(lines.slice(1).join(' ')))); }
    else out.append(h('p', {}, inline(lines.join(' '))));
  }
  return out;
};

export async function renderAsistente(view, params) {
  const cfg = await aiConfig();
  const headEl = h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Asistente de IA')));
  if (!cfg.ready) {
    view.append(headEl, h('div', { class: 'empty' }, 'El asistente todavía no está conectado. Cuando tenga su clave de Anthropic, siga los pasos de Ajustes → Asistente de IA.'), h('a', { class: 'btn', href: '#/ajustes' }, 'Ir a Ajustes'));
    return;
  }
  const refIn = h('input', { type: 'text', placeholder: 'Pasaje (opcional): Jn 3:16, Hch 2:38-41, Ro 6…', 'aria-label': 'Pasaje', value: params.get('ref') ? label(params.get('ref')) : '' });
  const qIn = h('textarea', { rows: 4, placeholder: 'Escriba su pregunta…', 'aria-label': 'Pregunta' });
  const mode = h('select', { 'aria-label': 'Modo' }, MODOS.map(([v, n]) => h('option', { value: v }, n)));
  const depth = h('select', { 'aria-label': 'Profundidad' }, PROFUNDIDADES.map(([v, n]) => h('option', { value: v, selected: v === 'explicativa' }, n)));
  const chk = (n, on = true) => { const c = h('input', { type: 'checkbox', checked: on }); return [c, h('label', { class: 'check' }, c, n)]; };
  const [cRefs, lRefs] = chk('Referencias cruzadas'), [cStr, lStr] = chk('Palabras originales'), [cDocs, lDocs] = chk('Mi biblioteca'), [cNotes, lNotes] = chk('Mis notas');
  const out = h('div', { class: 'ai-out' });
  const btn = h('button', { class: 'btn primary', type: 'submit' }, icon('spark', 18), 'Preguntar');

  const form = h('form', { class: 'ai-form', onsubmit: async (e) => {
    e.preventDefault();
    const question = qIn.value.trim(); if (question.length < 3) { toast('Escriba su pregunta'); return; }
    let key = null;
    if (refIn.value.trim()) { const r = parseRef(refIn.value); key = r && !r.error ? refToKey(r) : null; if (!key) { toast(r?.error || 'No reconozco ese pasaje'); return; } }
    btn.disabled = true; clear(out).append(h('div', { class: 'loading small' }, 'Reuniendo las fuentes…'));
    try {
      const sources = await gatherSources({ key, question, refs: cRefs.checked, strong: cStr.checked, docs: cDocs.checked, notes: cNotes.checked });
      clear(out).append(h('div', { class: 'loading small' }, `Consultando con ${sources.length} fuente${sources.length === 1 ? '' : 's'}…`));
      const r = await ask({ question, key, mode: mode.value, depth: depth.value, sources });
      showAnswer(question, key, sources, r);
    } catch (err) { clear(out).append(h('div', { class: 'error-box' }, err.message)); }
    btn.disabled = false;
  } },
    h('label', {}, 'Pasaje', refIn), h('label', {}, 'Pregunta', qIn),
    h('div', { class: 'form-row' }, h('label', {}, 'Modo', mode), h('label', {}, 'Profundidad', depth)),
    h('div', { class: 'checks' }, h('span', { class: 'hint' }, 'Fuentes que se envían:'), lRefs, lStr, lDocs, lNotes), btn);

  function showAnswer(question, key, sources, r) {
    clear(out);
    const c = r.check;
    const srcList = h('ol', { class: 'ai-sources' }, sources.map(s => h('li', {}, s.key ? h('a', { href: hrefFor(s.key) }, s.titulo) : s.doc ? h('a', { href: `#/documento/${s.doc}/${s.page}` }, s.titulo) : s.titulo)));
    const warn = [];
    if (c.badNums.length) warn.push(`La respuesta menciona fuentes que no existen: ${c.badNums.map(n => `[${n}]`).join(', ')}.`);
    if (c.invalid.length) warn.push(`Citas que no existen en la Biblia: ${c.invalid.join(', ')}.`);
    if (r.cortada) warn.push('La respuesta se cortó por su longitud; elija una profundidad mayor o haga una pregunta más concreta.');
    const body = `${r.texto}\n\n— Respuesta generada por IA (${r.modelo}). Fuentes: ${sources.map((s, i) => `[${i + 1}] ${s.titulo}`).join('; ')}`;
    out.append(
      h('article', { class: 'ai-answer' },
        h('p', { class: 'ai-badge' }, icon('spark', 14), `Generado por IA · ${r.modelo}${r.uso ? ` · ${r.uso.input_tokens + r.uso.output_tokens} tokens` : ''}`),
        md(r.texto || '(sin texto)'),
        warn.length ? h('div', { class: 'error-box' }, warn.map(w => h('p', {}, w))) : null,
        c.outside.length ? h('div', { class: 'ai-check' }, h('strong', {}, 'Citas que no estaban en las fuentes enviadas — compruebe su texto: '),
          h('span', { class: 'chips' }, c.outside.map(k => h('a', { class: 'chip', href: hrefFor(k) }, label(k, true))))) : null,
        h('p', { class: 'hint' }, c.cited.length && !c.outside.length && !c.invalid.length ? `Las ${c.cited.length} citas bíblicas de la respuesta están entre las fuentes enviadas.` : 'Revise siempre la respuesta contra el texto bíblico. La IA puede equivocarse.'),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn small', onclick: async () => { const k = key || null; const rk = k ? splitKey(k) : null;
            await put('notes', { ref: k, chap: rk ? ckey(rk.book, rk.ch) : null, refLabel: k ? label(k) : '', title: `IA: ${question.slice(0, 80)}`, body, kind: 'observación', folder: 'Asistente IA', tags: ['IA'] });
            toast('Guardado en el Cuaderno (marcado como IA)'); } }, icon('note', 16), 'Guardar en el Cuaderno'),
          h('button', { class: 'btn small', onclick: async () => { await copyText(body); toast('Copiado'); } }, icon('copy', 16), 'Copiar'))),
      h('details', { class: 'ai-src-box', open: true }, h('summary', {}, `Fuentes enviadas (${sources.length})`), sources.length ? srcList : h('p', { class: 'hint' }, 'No se envió ninguna fuente: la respuesta no se apoya en textos de la app.')));
  }

  view.append(headEl,
    h('p', { class: 'hint' }, 'La app reúne primero los textos reales (versículos, referencias, palabras originales, sus documentos y notas) y el asistente responde citándolos. Su perfil doctrinal se envía como marco de estudio. Cada consulta tiene un costo en su cuenta de Anthropic.'),
    form, out);
}
