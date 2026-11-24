import { h, clear, icon, toast, modal, fmtDate, confirmDialog, download } from '../ui.js';
import { parseRef, refToKey, label } from '../ref.js';
import { get, put, remove } from '../db.js';
import { CLAIMS, KINDS, sectionsFor, buildAuto, createStudy, listStudies, studyToMarkdown } from '../study.js';
import { hrefFor, strongPanel } from './verse.js';
import { S, PROFILES } from '../state.js';
import { studyTabs } from './doctrinas.js';

export async function renderStudies(view) {
  const studies = await listStudies();
  const input = h('input', { type: 'text', placeholder: 'Pasaje a estudiar (ej.: Hch 2:36-41, Jn 1:1-14, Is 9)', 'aria-label': 'Pasaje' });
  const kindSel = h('select', { 'aria-label': 'Tipo de estudio' }, Object.entries(KINDS).map(([k, v]) => h('option', { value: k }, v.name)));
  const msg = h('p', { class: 'hint' });
  const form = h('form', { class: 'new-study', onsubmit: async (e) => {
    e.preventDefault();
    const r = parseRef(input.value);
    if (!r || !r.ch || r.error) { msg.textContent = r?.error || 'No se reconoció la referencia. Ejemplo: Romanos 10:9-13'; return; }
    const s = await createStudy(refToKey(r), null, kindSel.value);
    location.hash = `#/estudio/${s.id}`;
  } }, input, kindSel, h('button', { class: 'btn primary', type: 'submit' }, icon('plus', 18), 'Nuevo estudio'));
  const filter = h('input', { type: 'search', placeholder: 'Filtrar estudios', 'aria-label': 'Filtrar' });
  const list = h('ul', { class: 'list study-list' });
  const draw = () => {
    const f = filter.value.toLowerCase();
    clear(list);
    const shown = studies.filter(s => !f || `${s.title} ${s.passageLabel} ${(s.tags || []).join(' ')}`.toLowerCase().includes(f));
    for (const s of shown) list.append(h('li', {}, h('a', { href: `#/estudio/${s.id}` }, h('strong', {}, s.title),
      h('span', {}, `${(KINDS[s.kind] || KINDS.pasaje).name} · ${s.passageLabel} · ${s.status} · ${fmtDate(s.updatedAt)}`), s.tags?.length ? h('span', { class: 'tags' }, s.tags.map(t => h('span', { class: 'tag' }, t))) : null)));
    if (!shown.length) list.append(h('li', { class: 'empty' }, studies.length ? 'Ningún estudio coincide.' : 'Aún no hay estudios. Escriba un pasaje arriba, o seleccione un versículo en la Biblia y toque «Estudiar».'));
  };
  filter.addEventListener('input', draw);
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Estudios')), studyTabs('pasajes'), form, msg, studies.length ? filter : null, list);
  draw();
}

export async function renderStudy(view, id) {
  const study = await get('studies', id);
  if (!study) { view.append(h('div', { class: 'empty' }, 'Este estudio no existe o fue eliminado. ', h('a', { href: '#/estudios' }, 'Volver a estudios'))); return; }
  const auto = await buildAuto(study.passage);
  const status = h('span', { class: 'save-state' }, 'Guardado');
  let timer = null;
  // Guarda solo los campos que edita esta pantalla, sobre la versión actual del registro
  // (así no se pierden cambios hechos desde otra parte, p. ej. «Añadir a estudio»).
  const flush = async () => {
    clearTimeout(timer); timer = null;
    try {
      const cur = (await get('studies', study.id)) || study;
      const r = await put('studies', { ...cur, title: study.title, status: study.status, tags: study.tags, sections: study.sections });
      study.updatedAt = r.updatedAt; study.related = r.related;
      status.textContent = 'Guardado'; status.className = 'save-state';
    } catch (e) { status.textContent = 'Error al guardar'; status.className = 'save-state err'; console.error(e); }
  };
  const save = () => {
    status.textContent = 'Guardando…'; status.className = 'save-state busy';
    clearTimeout(timer);
    timer = setTimeout(flush, 500);
  };
  const onLeave = () => { if (timer) flush(); window.removeEventListener('hashchange', onLeave); };
  window.addEventListener('hashchange', onLeave);

  const title = h('input', { class: 'study-title', value: study.title, 'aria-label': 'Título del estudio', oninput: (e) => { study.title = e.target.value; save(); } });
  const statusSel = h('select', { 'aria-label': 'Estado', onchange: (e) => { study.status = e.target.value; save(); } },
    ['borrador', 'en progreso', 'terminado'].map(s => h('option', { value: s, selected: study.status === s }, s)));
  const tags = h('input', { type: 'text', value: (study.tags || []).join(', '), placeholder: 'Etiquetas (coma)', 'aria-label': 'Etiquetas', oninput: (e) => { study.tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean); save(); } });

  const toolbar = h('div', { class: 'study-tools' },
    h('a', { class: 'btn ghost small', href: hrefFor(study.passage) }, icon('book', 18), 'Abrir en la Biblia'),
    h('button', { class: 'btn ghost small', onclick: async () => {
      const md = await studyToMarkdown(study);
      download(`${study.title.replace(/:/g, '.').replace(/[^\wáéíóúñü.\- ]+/gi, '').trim() || 'estudio'}.md`, md, 'text/markdown');
      toast('Archivo exportado');
    } }, icon('download', 18), 'Exportar texto'),
    h('button', { class: 'btn ghost small', onclick: () => { document.querySelectorAll('.study-sections textarea').forEach(t => { t.style.height = `${t.scrollHeight + 4}px`; }); window.print(); } }, icon('print', 18), 'Imprimir / PDF'),
    h('button', { class: 'btn ghost small danger', onclick: async () => {
      if (await confirmDialog('Eliminar estudio', `¿Eliminar «${study.title}»? Puede recuperarlo importando un respaldo anterior.`)) {
        await remove('studies', study.id); toast('Estudio eliminado'); location.hash = '#/estudios';
      }
    } }, icon('trash', 18), 'Eliminar'));

  const index = h('nav', { class: 'study-index', 'aria-label': 'Secciones' }, sectionsFor(study).map(s => h('a', { href: `javascript:void(0)`, onclick: () => document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, `${s.n}. ${s.title}`)));

  const profile = PROFILES[S.doctrinalProfile] || PROFILES.ninguno;
  view.append(
    h('header', { class: 'study-head' },
      h('a', { class: 'back', href: '#/estudios' }, icon('left', 18), 'Estudios'),
      title,
      h('div', { class: 'study-meta' }, h('span', { class: 'passage' }, study.passageLabel), statusSel, tags, status),
      toolbar,
      h('p', { class: 'hint' }, (KINDS[study.kind] || KINDS.pasaje).name),
      h('p', { class: 'hint' }, `Perfil doctrinal activo: ${profile.name}. `, 'Las secciones marcadas como «automática» se construyen con datos reales de las fuentes integradas; las demás son su trabajo de estudio. Use las etiquetas de afirmación para distinguir texto, inferencia, interpretación, aplicación y opinión.')),
    h('div', { class: 'study-layout' }, index, h('div', { class: 'study-sections' }, sectionsFor(study).map(s => section(s, study, auto, save)))),
  );
  if (study.related?.length) {
    view.querySelector('.study-sections').append(h('section', { class: 'sec' }, h('h2', {}, 'Pasajes añadidos a este estudio'),
      h('ul', { class: 'chip-list' }, study.related.map(k => h('li', {}, h('a', { class: 'chip', href: hrefFor(k) }, label(k)))))));
  }
}

function section(s, study, auto, save) {
  const sec = study.sections[s.id] || (study.sections[s.id] = { text: '', claims: [] });
  sec.claims = sec.claims || [];
  const autoBox = autoContent(s.id, auto, study, save);
  const ta = h('textarea', { rows: s.mode === 'auto' ? 3 : 5, placeholder: s.mode === 'auto' ? 'Observaciones propias (opcional)…' : s.hint, 'aria-label': s.title, oninput: (e) => { sec.text = e.target.value; save(); } });
  ta.value = sec.text || '';
  const claimsList = h('ul', { class: 'claims' });
  const drawClaims = () => {
    clear(claimsList);
    sec.claims.forEach((c, i) => claimsList.append(h('li', { class: `claim c-${c.type}` },
      h('span', { class: 'claim-type' }, (CLAIMS.find(k => k[0] === c.type) || [, c.type])[1]), h('span', { class: 'claim-text' }, c.text),
      h('button', { class: 'icon-btn small', 'aria-label': 'Quitar', onclick: () => { sec.claims.splice(i, 1); drawClaims(); save(); } }, icon('close', 16)))));
  };
  drawClaims();
  const addClaim = h('button', { class: 'btn small ghost', onclick: async () => {
    const type = h('select', { 'aria-label': 'Tipo de afirmación' }, CLAIMS.map(([v, n]) => h('option', { value: v }, n)));
    const text = h('textarea', { rows: 4, placeholder: 'Escriba la afirmación…', 'aria-label': 'Afirmación' });
    const r = await modal({ title: `Añadir a «${s.title}»`, content: h('div', { class: 'form' }, type, text), actions: [
      { label: 'Cancelar', value: null }, { label: 'Añadir', primary: true, onClick: () => text.value.trim() ? { type: type.value, text: text.value.trim() } : false }] });
    if (r) { sec.claims.push(r); drawClaims(); save(); }
  } }, icon('plus', 16), 'Afirmación clasificada');

  return h('section', { class: 'sec', id: `sec-${s.id}` },
    h('header', {}, h('h2', {}, h('span', { class: 'sec-n' }, s.n), s.title), s.mode.startsWith('auto') ? h('span', { class: 'badge' }, 'automática') : null),
    s.mode !== 'user' ? h('p', { class: 'hint' }, s.hint) : null,
    autoBox, ta, claimsList, addClaim);
}

function autoContent(id, auto, study, save) {
  if (id === 'texto') {
    return h('div', { class: 'auto' },
      h('div', { class: 'cmp' },
        h('div', {}, h('div', { class: 'cmp-ver' }, 'RV1909'), h('p', { class: 'bible' }, auto.verses.map(x => [h('sup', {}, x.v), x.rv, ' ']))),
        auto.verses.some(x => x.bes) ? h('div', {}, h('div', { class: 'cmp-ver' }, 'BES'), h('p', { class: 'bible' }, auto.verses.map(x => [h('sup', {}, x.v), x.bes, ' ']))) : null,
        (auto.others || []).map(o => h('div', {}, h('div', { class: 'cmp-ver' }, o.abbr), h('p', { class: 'bible' }, o.verses.map(x => [h('sup', {}, x.v), x.t, ' ']))))));
  }
  if (id === 'traducciones') {
    const tr = auto.translations || [];
    if (!tr.length) return h('p', { class: 'hint' }, 'Solo hay una versión disponible.');
    return h('div', { class: 'auto trad' }, auto.verses.map((x, i) => h('div', { class: 'trad-v' },
      h('p', { class: 'bible' }, h('sup', {}, x.v), h('b', { class: 'trad-ab' }, 'RV1909 '), x.rv),
      tr.map(t => h('p', { class: 'bible trad-row' }, h('b', { class: 'trad-ab' }, `${t.abbr} `), t.verses[i].t || '—')))),
      h('p', { class: 'hint' }, 'Puede elegir qué versiones aparecen: toque un versículo en la Biblia → Comparar → Elegir versiones.'));
  }
  if (id === 'inmediato') {
    if (!auto.before.length && !auto.after.length) return h('p', { class: 'hint' }, 'El pasaje abarca todo el capítulo; revise el capítulo anterior y el siguiente.');
    return h('div', { class: 'auto' },
      auto.before.length ? [h('h4', {}, 'Antes'), h('p', { class: 'bible muted' }, auto.before.map(x => [h('sup', {}, x.v), x.text, ' ']))] : null,
      auto.after.length ? [h('h4', {}, 'Después'), h('p', { class: 'bible muted' }, auto.after.map(x => [h('sup', {}, x.v), x.text, ' ']))] : null);
  }
  if (id === 'versiculos') {
    const box = h('div', { class: 'auto vbv' });
    for (const x of auto.verses) {
      const ta = h('textarea', { rows: 2, placeholder: `Observaciones sobre el v. ${x.v}`, 'aria-label': `Versículo ${x.v}`, oninput: (e) => { study.sections.versiculos[`v${x.v}`] = e.target.value; save(); } });
      ta.value = study.sections.versiculos?.[`v${x.v}`] || '';
      box.append(h('div', { class: 'vbv-row' }, h('p', { class: 'bible' }, h('sup', {}, x.v), x.rv), ta));
    }
    return box;
  }
  if (id === 'palabras') {
    if (!auto.words.length) return h('p', { class: 'hint' }, 'No hay datos Strong para este pasaje.');
    const shown = auto.words.slice(0, 30);
    return h('div', { class: 'auto' }, h('table', { class: 'words-table' },
      h('thead', {}, h('tr', {}, h('th', {}, 'RV1909'), h('th', {}, 'Original'), h('th', {}, 'Strong'), h('th', {}, 'Definición (Strong, inglés)'))),
      h('tbody', {}, shown.map(w => h('tr', {},
        h('td', {}, w.renderings.join(' / '), h('small', {}, ` v. ${w.verses.join(', ')} · ${w.freq} veces en la Biblia`)),
        h('td', {}, h('span', { class: `lemma ${w.num[0] === 'H' ? 'heb' : 'grc'}` }, w.lemma), h('small', {}, w.xlit)),
        h('td', {}, h('button', { class: 'link', onclick: () => strongPanel(w.num) }, w.num)),
        h('td', { lang: 'en', class: 'def' }, w.def))))),
      auto.words.length > shown.length ? h('p', { class: 'hint' }, `Se muestran ${shown.length} de ${auto.words.length} palabras (primero las menos frecuentes en la Biblia, que suelen ser las más significativas). Abra el pasaje en la Biblia → «Palabras originales» para verlas todas.`) : null);
  }
  if (id === 'referencias') {
    if (!auto.xrefs.length) return h('p', { class: 'hint' }, 'No hay referencias registradas para este pasaje.');
    return h('div', { class: 'auto' }, h('ul', { class: 'chip-list' }, auto.xrefs.slice(0, 60).map(x => h('li', {}, h('a', { class: 'chip', href: hrefFor(x.key) }, label(x.key, true), h('small', {}, ` (v. ${x.from})`))))));
  }
  if (id === 'fuentes') return h('ul', { class: 'auto sources' }, auto.sources.map(s => h('li', {}, s)));
  return null;
}
