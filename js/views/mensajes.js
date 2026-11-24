// Biblioteca → Mis mensajes: los mensajes del Taller del Predicador como material de estudio (leer, buscar, citar).
// Aquí no se editan, ni se programan, ni se exportan a Word: eso sigue siendo trabajo del Taller.
import { h, clear, icon, toast, copyText } from '../ui.js';
import { norm } from '../books.js';
import { label } from '../ref.js';
import { hrefFor } from './verse.js';
import * as T from '../taller/store.js';

export const libTabs = (a) => h('nav', { class: 'tabs page-tabs', 'aria-label': 'Biblioteca' },
  [['biblioteca', 'Documentos'], ['mensajes', 'Mis mensajes']].map(([id, n]) => h('a', { href: `#/${id}`, 'aria-selected': id === a ? 'true' : 'false' }, n)));

// Todos los mensajes disponibles: los importados (almacén «sermons») y, si está abierto, el archivo cifrado.
export async function allMessages() {
  const out = (await T.listSermons()).map(s => ({ id: `s/${encodeURIComponent(s.id)}`, title: s.titulo || 'Sin título', ref: s.texto || '', md: s.ensenanza || s.notas || '', src: 'Mis mensajes', date: s.fecha || '' }));
  let archive = null, archiveError = '';
  if (await T.hasKey()) {
    try {
      archive = await T.loadArchive(); const vn = await T.loadNuevas();
      for (const it of archive.items) out.push({ id: `a/${it.i}`, title: it.t, ref: it.r || '', md: vn[it.i] || T.libToMd(it), src: archive.carpetas[it.c]?.t || 'Archivo', date: '' });
    } catch (e) { archiveError = e.message; }
  }
  return { list: out, hasArchive: !!archive, archiveError };
}

function importBox(onDone) {
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const r = await T.importTaller(T.parseTallerData(JSON.parse(await f.text()))); toast(`Mensajes: ${r.nuevas} nuevos, ${r.actualizadas} actualizados`); onDone(); }
    catch (err) { toast(err.message || 'No se pudo leer el archivo', 'err'); }
    e.target.value = '';
  } });
  const key = h('input', { type: 'password', placeholder: 'Clave de su archivo del Taller', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Clave del archivo' });
  const msg = h('p', { class: 'hint', role: 'status' });
  return h('div', { class: 'import-box' },
    h('p', {}, 'Sus mensajes se escriben y se organizan en el Taller del Predicador. Aquí llegan como material para estudiar: puede leerlos, buscar en ellos y ver qué pasajes cita cada uno.'),
    h('ol', { class: 'steps' },
      h('li', {}, 'En el Taller, abra Ajustes y pulse «Descargar copia». Guarde el archivo en Archivos.'),
      h('li', {}, 'Aquí, pulse «Importar copia del Taller» y elija ese archivo.')),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: () => fileIn.click() }, 'Importar copia del Taller'), fileIn,
      h('button', { class: 'btn', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; const r = await T.importTallerLocal(); b.disabled = false;
        if (!r) { msg.textContent = 'En este espacio no hay datos del Taller. Use la copia: en el iPhone y el iPad, cada app de la pantalla de inicio guarda sus datos aparte.'; return; }
        toast(`Del Taller: ${r.nuevas} nuevos, ${r.actualizadas} actualizados`); onDone(); } }, 'Buscar el Taller en este equipo')),
    h('form', { class: 'btn-row', onsubmit: async (e) => { e.preventDefault(); if (!key.value.trim()) return; msg.textContent = 'Abriendo el archivo…';
      try { await T.unlock(key.value); toast('Archivo abierto'); onDone(); } catch (err) { msg.textContent = err.message; } } },
      key, h('button', { class: 'btn', type: 'submit' }, 'Abrir mi archivo')), msg);
}

export async function renderMensajes(view) {
  const head = h('header', { class: 'page-head' }, h('h1', {}, 'Biblioteca'));
  view.append(head, libTabs('mensajes'), h('div', { class: 'loading small' }, 'Cargando sus mensajes…'));
  const { list, hasArchive, archiveError } = await allMessages();
  clear(view).append(head, libTabs('mensajes'));
  const again = () => { clear(view); renderMensajes(view); };
  if (!list.length) { view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Traiga sus mensajes del Taller'), importBox(again))); return; }

  const q = h('input', { type: 'search', placeholder: 'Buscar en títulos y contenido', 'aria-label': 'Buscar en sus mensajes' });
  const srcSel = h('select', { 'aria-label': 'Procedencia' }, h('option', { value: '' }, 'Todos'), [...new Set(list.map(m => m.src))].sort((a, b) => a.localeCompare(b, 'es')).map(s => h('option', { value: s }, s)));
  const ul = h('ul', { class: 'list' }), count = h('p', { class: 'hint' });
  for (const m of list) m._k = norm(`${m.title} ${m.ref}`);
  const draw = () => {
    const t = norm(q.value.trim());
    const shown = list.filter(m => (!srcSel.value || m.src === srcSel.value) && (!t || m._k.includes(t) || (t.length > 2 && norm(m.md).includes(t))));
    clear(ul);
    for (const m of shown.slice(0, 250)) ul.append(h('li', {}, h('a', { href: `#/mensaje/${m.id}${t ? `?q=${encodeURIComponent(q.value.trim())}` : ''}` }, h('strong', {}, m.title), h('span', {}, [m.ref, m.src].filter(Boolean).join(', ')))));
    if (!shown.length) ul.append(h('li', { class: 'empty' }, 'Ningún mensaje coincide.'));
    count.textContent = shown.length > 250 ? `Se muestran 250 de ${shown.length}. Escriba algo más específico.` : `${shown.length} mensaje${shown.length === 1 ? '' : 's'}`;
  };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 180); }); srcSel.addEventListener('change', draw);
  view.append(h('div', { class: 'toolbar' }, q, srcSel), count, ul,
    archiveError ? h('p', { class: 'error-box' }, `No se pudo abrir el archivo del Taller: ${archiveError}`) : null,
    h('details', { class: 'block import-more' }, h('summary', {}, hasArchive ? 'Actualizar desde el Taller' : 'Traer más mensajes del Taller'), importBox(again)));
  draw();
}

// Markdown del Taller → texto de lectura (sin el diseño del Word). Todo se inserta como texto, nunca como HTML.
function inline(s, mark) {
  const parts = []; const re = /\*\*([^*]+)\*\*|==([^=]+)==|\*([^*]+)\*/g; let last = 0, m;
  const txt = (t) => { if (!mark) return t; const out = []; const n = norm(t); let i = 0, p;
    while ((p = n.indexOf(mark, i)) >= 0) { out.push(t.slice(i, p), h('mark', {}, t.slice(p, p + mark.length))); i = p + mark.length; } out.push(t.slice(i)); return out; };
  while ((m = re.exec(s))) { parts.push(txt(s.slice(last, m.index))); parts.push(m[1] ? h('strong', {}, txt(m[1])) : m[2] ? h('em', { class: 'key' }, txt(m[2])) : h('em', {}, txt(m[3]))); last = re.lastIndex; }
  parts.push(txt(s.slice(last))); return parts.flat();
}
function mdBlocks(md, mark) {
  const out = []; let list = null, quote = null;
  const flush = () => { if (list) { out.push(list); list = null; } if (quote) { out.push(quote); quote = null; } };
  for (const raw of String(md).split('\n')) {
    const l = raw.trimEnd();
    if (!l.trim()) { flush(); continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flush(); out.push(h(m[1].length === 1 ? 'h2' : 'h3', {}, inline(m[2], mark))); continue; }
    if ((m = l.match(/^>\s?(.*)/))) { if (list) { out.push(list); list = null; } quote = quote || h('blockquote', {}); quote.append(h('p', {}, inline(m[1], mark))); continue; }
    if ((m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/))) { if (quote) { out.push(quote); quote = null; } list = list || h('ul', {}); list.append(h('li', {}, inline(m[1], mark))); continue; }
    flush(); out.push(h('p', {}, inline(l, mark)));
  }
  flush(); return out;
}

export async function renderMensaje(view, kind, id, params) {
  const { list } = await allMessages();
  const m = list.find(x => x.id === `${kind}/${kind === 's' ? encodeURIComponent(id) : id}`);
  if (!m) { view.append(h('div', { class: 'empty' }, 'Este mensaje no está en esta app. ', h('a', { href: '#/mensajes' }, 'Ver mis mensajes'))); return; }
  const { findRefs } = await import('../library.js');
  const refs = [...new Set(findRefs(m.md))];
  const mark = params?.get('q') ? norm(params.get('q')) : '';
  const plain = m.md.replace(/^#+\s*/gm, '').replace(/==|\*\*/g, '').replace(/^> /gm, '');
  // El título ya va arriba: se omite el «# Título» repetido al comienzo del texto
  const md = m.md.replace(/^\s*#\s+(.+)\n/, (all, t) => norm(t) === norm(m.title) ? '' : all);
  const body = h('div', { class: 'msg-text' }, mdBlocks(md, mark));
  view.append(
    h('a', { class: 'back', href: '#/mensajes' }, icon('left', 18), 'Mis mensajes'),
    h('header', { class: 'msg-head' }, h('h1', {}, m.title), h('p', { class: 'hint' }, [m.ref, m.src].filter(Boolean).join(', '))),
    h('div', { class: 'msg-layout' }, body,
      h('aside', { class: 'msg-side' },
        h('h2', {}, refs.length ? `Pasajes que cita (${refs.length})` : 'Pasajes que cita'),
        refs.length ? h('ul', { class: 'ref-plain' }, refs.map(k => h('li', {}, h('a', { href: hrefFor(k) }, label(k))))) : h('p', { class: 'hint' }, 'No se detectaron citas bíblicas.'),
        h('div', { class: 'btn-col' },
          h('button', { class: 'btn small', onclick: async () => toast((await copyText(`«${m.title}» (Pastor Antonio Sierra J.)${m.ref ? `, sobre ${m.ref}` : ''}`)) ? 'Referencia copiada' : 'No se pudo copiar') }, icon('copy', 16), 'Copiar referencia'),
          h('button', { class: 'btn small', onclick: async () => toast((await copyText(plain)) ? 'Texto copiado' : 'No se pudo copiar') }, icon('copy', 16), 'Copiar texto')),
        h('p', { class: 'hint' }, 'Para editar este mensaje, ábralo en el Taller del Predicador.'))));
  if (mark) requestAnimationFrame(() => body.querySelector('mark')?.scrollIntoView({ block: 'center' }));
}
