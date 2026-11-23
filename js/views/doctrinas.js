// Biblioteca doctrinal (Módulo 5). Diseño propio de Escudriñad.
import { h, clear, icon, toast, confirmDialog, download, fmtDate } from '../ui.js';
import { BOOK } from '../books.js';
import { parseRef, refToKey, label, splitKey } from '../ref.js';
import { getChapter, plain, verLabel } from '../bible.js';
import { S, PROFILES } from '../state.js';
import { all } from '../db.js';
import { CATEGORIES, SUGGESTED, SECTIONS, getDoctrine, saveDoctrine, listDoctrines, deleteDoctrine } from '../doctrines.js';
import { hrefFor } from './verse.js';

export function studyTabs(active) {
  return h('nav', { class: 'tabs page-tabs' },
    h('a', { href: '#/estudios', 'aria-selected': active === 'pasajes' ? 'true' : 'false' }, 'Pasajes y exégesis'),
    h('a', { href: '#/doctrinas', 'aria-selected': active === 'doctrinas' ? 'true' : 'false' }, 'Doctrinas'),
    h('a', { href: '#/hermeneutica', 'aria-selected': active === 'hermeneutica' ? 'true' : 'false' }, 'Hermenéutica'));
}

export async function renderDoctrinas(view) {
  const saved = new Map((await listDoctrines()).map(d => [d.id, d]));
  const custom = [...saved.values()].filter(d => !CATEGORIES.some(c => c[0] === d.id));
  const card = (id, title) => {
    const d = saved.get(id);
    const n = d ? (d.principal?.length || 0) + (d.complementary?.length || 0) : 0;
    const filled = d ? SECTIONS.filter(s => (d.sections?.[s.id] || '').trim()).length : 0;
    return h('a', { class: 'card doc-card', href: `#/doctrina/${encodeURIComponent(id)}` },
      h('span', { class: 'card-title small' }, title),
      h('span', { class: 'card-sub' }, d ? `${n} pasajes · ${filled} de ${SECTIONS.length} secciones` : (SUGGESTED[id] ? `${SUGGESTED[id].length} pasajes sugeridos para empezar` : 'Sin comenzar')));
  };
  const profile = PROFILES[S.doctrinalProfile] || PROFILES.ninguno;
  const newIn = h('input', { type: 'text', placeholder: 'Nueva doctrina o tema (ej.: El nombre de Jesús)', 'aria-label': 'Nueva doctrina' });
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Estudios')), studyTabs('doctrinas'),
    h('p', { class: 'hint' }, `Biblioteca doctrinal personal. Perfil activo: ${profile.name}. Usted escribe la doctrina; la app muestra los textos reales, los ordena a lo largo de la Escritura y los relaciona con sus enseñanzas.`),
    h('section', { class: 'cards doc-grid' }, CATEGORIES.map(([id, t]) => card(id, t)), custom.map(d => card(d.id, d.title))),
    h('form', { class: 'new-study', onsubmit: async (e) => {
      e.preventDefault(); const t = newIn.value.trim(); if (!t) return;
      const id = 'd-' + Date.now().toString(36);
      await saveDoctrine({ id, title: t, category: 'personal', sections: {}, principal: [], complementary: [], related: [] });
      location.hash = `#/doctrina/${id}`;
    } }, newIn, h('button', { class: 'btn primary', type: 'submit' }, icon('plus', 18), 'Crear')));
}

export async function renderDoctrina(view, id) {
  const d = await getDoctrine(id);
  if (!d) { view.append(h('div', { class: 'empty' }, 'Doctrina no encontrada. ', h('a', { href: '#/doctrinas' }, 'Volver'))); return; }
  d.sections = d.sections || {}; d.principal = d.principal || []; d.complementary = d.complementary || [];
  const status = h('span', { class: 'save-state' }, d.isNew ? 'Sin guardar' : 'Guardado');
  let timer = null;
  const save = (now = false) => {
    status.textContent = 'Guardando…'; status.className = 'save-state busy'; clearTimeout(timer);
    const run = async () => { try { const r = await saveDoctrine(d); d.isNew = false; d.updatedAt = r.updatedAt; status.textContent = 'Guardado'; status.className = 'save-state'; } catch (e) { status.textContent = 'Error al guardar'; status.className = 'save-state err'; } };
    if (now) return run(); timer = setTimeout(run, 500);
  };
  const onLeave = () => { if (timer) { clearTimeout(timer); saveDoctrine(d); } window.removeEventListener('hashchange', onLeave); };
  window.addEventListener('hashchange', onLeave);

  const ver = S.version || 'rv1909';
  const passList = (key, title, hint) => {
    const box = h('section', { class: 'sec', id: `sec-${key}` }, h('header', {}, h('h2', {}, title)), h('p', { class: 'hint' }, hint));
    const ul = h('ul', { class: 'ref-list doc-refs' });
    const inp = h('input', { type: 'text', placeholder: 'Añadir pasaje (ej.: Hch 2:38 o Col 2:9-10)', 'aria-label': `Añadir a ${title}` });
    const msg = h('p', { class: 'hint' });
    const draw = async () => {
      clear(ul);
      if (!d[key].length) ul.append(h('li', { class: 'hint' }, 'Todavía no hay pasajes.'));
      for (const k of d[key]) {
        const li = h('li', {}, h('div', { class: 'doc-ref-head' }, h('a', { href: hrefFor(k) }, label(k)),
          h('span', { class: 'doc-ref-actions' },
            h('button', { class: 'link', onclick: async () => { const other = key === 'principal' ? 'complementary' : 'principal'; d[key] = d[key].filter(x => x !== k); if (!d[other].includes(k)) d[other].push(k); await save(true); drawAll(); } }, key === 'principal' ? 'Pasar a complementarios' : 'Pasar a principales'),
            h('button', { class: 'icon-btn small', 'aria-label': `Quitar ${label(k)}`, onclick: async () => { d[key] = d[key].filter(x => x !== k); await save(true); drawAll(); } }, icon('close', 16)))),
          h('p', { class: 'ref-preview' }, '…'));
        ul.append(li);
        passageText(ver, k).then(t => { li.querySelector('.ref-preview').textContent = t; });
      }
    };
    box.append(ul, h('form', { class: 'new-study', onsubmit: async (e) => {
      e.preventDefault(); const r = parseRef(inp.value);
      if (!r || !r.ch || r.error || !r.v) { msg.textContent = r?.error || 'Escriba un pasaje con versículo, por ejemplo: Hechos 2:38'; return; }
      const k = refToKey(r); if (!d[key].includes(k)) d[key].push(k); inp.value = ''; msg.textContent = '';
      await save(true); drawAll();
    } }, inp, h('button', { class: 'btn', type: 'submit' }, icon('plus', 16), 'Añadir')), msg);
    box._draw = draw; return box;
  };
  const principal = passList('principal', 'Pasajes principales', 'Los textos que fundamentan la doctrina directamente.');
  const complementary = passList('complementary', 'Pasajes complementarios', 'Textos que la amplían, ilustran o explican.');

  // Desarrollo a lo largo de la Escritura: todos los pasajes en orden canónico, agrupados
  const timeline = h('section', { class: 'sec', id: 'sec-recorrido' }, h('header', {}, h('h2', {}, 'Recorrido por la Escritura'), h('span', { class: 'badge' }, 'automática')),
    h('p', { class: 'hint' }, 'Todos los pasajes de esta doctrina en el orden de la Biblia, para ver cómo se desarrolla del Antiguo al Nuevo Testamento.'));
  const tlBody = h('div', {}); timeline.append(tlBody);
  const drawTimeline = async () => {
    clear(tlBody);
    const keys = [...new Set([...d.principal, ...d.complementary])].sort((a, b) => { const x = splitKey(a), y = splitKey(b); return BOOK[x.book].index - BOOK[y.book].index || x.ch - y.ch || x.v - y.v; });
    if (!keys.length) { tlBody.append(h('p', { class: 'hint' }, 'Añada pasajes para ver el recorrido.')); return; }
    let group = null, ul = null;
    for (const k of keys) {
      const b = BOOK[splitKey(k).book]; const g = `${b.t === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento'} · ${b.group}`;
      if (g !== group) { group = g; tlBody.append(h('h4', { class: 'tl-group' }, g)); ul = h('ul', { class: 'ref-list' }); tlBody.append(ul); }
      const li = h('li', {}, h('a', { href: hrefFor(k) }, label(k), d.principal.includes(k) ? h('span', { class: 'tag' }, 'principal') : null), h('span', { class: 'ref-preview' }, '…'));
      ul.append(li); passageText(ver, k).then(t => { li.querySelector('.ref-preview').textContent = t; });
    }
    tlBody.append(h('p', { class: 'hint' }, `Texto: ${verLabel(ver)}.`));
  };

  // Enseñanzas propias que citan alguno de estos pasajes o mencionan el tema
  const related = h('section', { class: 'sec', id: 'sec-ensenanzas' }, h('header', {}, h('h2', {}, 'Sus enseñanzas sobre este tema'), h('span', { class: 'badge' }, 'automática')));
  const relBody = h('div', {}); related.append(relBody);
  const drawRelated = async () => {
    clear(relBody);
    const sermons = await all('sermons');
    const labels = [...new Set([...d.principal, ...d.complementary])].map(k => [label(k), label(k, true)]).flat().map(s => s.toLowerCase());
    const title = d.title.toLowerCase();
    const hits = sermons.map(s => {
      const txt = `${s.titulo || ''} ${s.texto || ''} ${s.ensenanza || ''}`.toLowerCase();
      const refs = labels.filter(l => txt.includes(l)).length; const byTitle = txt.includes(title) ? 1 : 0;
      return { s, score: refs * 2 + byTitle * 3 };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 15);
    if (!hits.length) { relBody.append(h('p', { class: 'hint' }, sermons.length ? 'Ninguna de sus enseñanzas cita estos pasajes o menciona el tema por su nombre.' : 'Cuando sus enseñanzas estén en la app, aquí aparecerán las que citan estos pasajes.')); return; }
    relBody.append(h('ul', { class: 'list compact' }, hits.map(({ s }) => h('li', {}, h('a', { href: `#/ensenanza/${encodeURIComponent(s.id)}` }, h('strong', {}, s.titulo || 'Sin título'), h('span', {}, s.texto || ''))))));
  };

  const drawAll = () => { principal._draw(); complementary._draw(); drawTimeline(); drawRelated(); };

  const sections = SECTIONS.map(s => {
    const ta = h('textarea', { rows: s.id === 'definicion' ? 3 : 6, placeholder: s.hint, 'aria-label': s.title, oninput: (e) => { d.sections[s.id] = e.target.value; save(); } });
    ta.value = d.sections[s.id] || '';
    return h('section', { class: 'sec', id: `sec-${s.id}` }, h('header', {}, h('h2', {}, s.title)), ta);
  });
  const order = ['definicion', 'fundamento'];
  const secBy = Object.fromEntries(SECTIONS.map((s, i) => [s.id, sections[i]]));

  const sug = SUGGESTED[d.category] || SUGGESTED[d.id];
  const sugBox = sug && !d.principal.length && !d.complementary.length ? h('div', { class: 'settings-block' },
    h('p', {}, `Para empezar puede añadir ${sug.length} pasajes que se estudian tradicionalmente en esta doctrina. Puede quitarlos, cambiarlos o añadir otros.`),
    h('p', { class: 'hint' }, sug.map(k => label(k, true)).join(' · ')),
    h('button', { class: 'btn primary', onclick: async (e) => { const box = e.currentTarget.closest('.settings-block'); d.principal = [...sug]; await save(true); box.remove(); drawAll(); } }, 'Añadir pasajes sugeridos')) : null;

  const title = h('input', { class: 'study-title', value: d.title, 'aria-label': 'Nombre de la doctrina', oninput: (e) => { d.title = e.target.value; save(); } });
  view.append(
    h('header', { class: 'study-head' }, h('a', { class: 'back', href: '#/doctrinas' }, icon('left', 18), 'Doctrinas'), title,
      h('div', { class: 'study-meta' }, status, d.updatedAt ? h('span', { class: 'hint' }, `Actualizada ${fmtDate(d.updatedAt)}`) : null),
      h('div', { class: 'study-tools' },
        h('button', { class: 'btn ghost small', onclick: async () => { download(`Doctrina - ${d.title}.md`, await doctrineToMarkdown(d, ver), 'text/markdown'); toast('Archivo exportado'); } }, icon('download', 18), 'Exportar texto'),
        h('button', { class: 'btn ghost small', onclick: () => { document.querySelectorAll('.study-sections textarea').forEach(t => { t.style.height = `${t.scrollHeight + 4}px`; }); window.print(); } }, icon('print', 18), 'Imprimir / PDF'),
        !CATEGORIES.some(c => c[0] === d.id) ? h('button', { class: 'btn ghost small danger', onclick: async () => { if (await confirmDialog('Eliminar doctrina', `¿Eliminar «${d.title}»?`)) { await deleteDoctrine(d.id); location.hash = '#/doctrinas'; } } }, icon('trash', 18), 'Eliminar') : null),
      h('p', { class: 'hint' }, 'Usted redacta la doctrina; los pasajes muestran el texto bíblico real. Distinga siempre lo que el texto dice, lo que se infiere y la formulación doctrinal.')),
    sugBox,
    h('div', { class: 'study-sections doc-sections' }, order.map(id => secBy[id]), principal, complementary, timeline, related,
      SECTIONS.filter(s => !order.includes(s.id)).map(s => secBy[s.id])));
  drawAll();
}

async function passageText(ver, k) {
  const r = splitKey(k);
  try {
    let c; try { c = await getChapter(ver, r.book, r.ch); } catch (e) { c = await getChapter('rv1909', r.book, r.ch); }
    const out = []; for (let v = r.v; v <= (r.v2 || r.v); v++) out.push(`${r.v2 ? v + ' ' : ''}${plain(c[v - 1])}`);
    return out.join(' ');
  } catch (e) { return 'Texto no disponible sin conexión.'; }
}

async function doctrineToMarkdown(d, ver) {
  const L = [`# ${d.title}`, ''];
  const put = (t, v) => { L.push(`## ${t}`, '', v || '_(sin completar)_', ''); };
  put('Definición', d.sections.definicion); put('Fundamento bíblico', d.sections.fundamento);
  for (const [key, t] of [['principal', 'Pasajes principales'], ['complementary', 'Pasajes complementarios']]) {
    L.push(`## ${t}`, '');
    for (const k of d[key]) L.push(`**${label(k)}** — ${await passageText(ver, k)}`, '');
    if (!d[key].length) L.push('_(ninguno)_', '');
  }
  for (const s of SECTIONS.filter(s => !['definicion', 'fundamento'].includes(s.id))) put(s.title, d.sections[s.id]);
  L.push(`_Texto bíblico: ${verLabel(ver)}._`);
  return L.join('\n');
}
