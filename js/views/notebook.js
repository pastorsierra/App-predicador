import { h, clear, icon, fmtDate, toast, confirmDialog, modal } from '../ui.js';
import { BOOK } from '../books.js';
import { all, remove, recentHistory, put } from '../db.js';
import { label, splitAny } from '../ref.js';
import { noteCard, noteEditor, hrefFor, HL_COLORS } from './verse.js';
import { norm } from '../books.js';

const TABS = [['notas', 'Notas'], ['favoritos', 'Favoritos'], ['resaltados', 'Resaltados'], ['marcadores', 'Marcadores'], ['historial', 'Historial']];

const canonOrder = (a, b) => {
  const x = splitAny(a.ref), y = splitAny(b.ref);
  if (!x || !y) return 0;
  return BOOK[x.book].index - BOOK[y.book].index || x.ch - y.ch || (x.v || 0) - (y.v || 0);
};

export async function renderNotebook(view, tab) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Cuaderno')),
    h('nav', { class: 'tabs page-tabs' }, TABS.map(([id, n]) => h('a', { href: `#/cuaderno/${id}`, 'aria-selected': id === tab ? 'true' : 'false' }, n))));
  const body = h('div', { class: 'nb-body' });
  view.append(body);
  const draw = async () => {
    clear(body);
    if (tab === 'notas') await notes(body, params, draw);
    else if (tab === 'favoritos') await simpleList(body, 'favorites', 'No hay favoritos. Seleccione un versículo y toque «Favorito».', draw);
    else if (tab === 'resaltados') await highlights(body, draw);
    else if (tab === 'marcadores') await bookmarks(body, draw);
    else if (tab === 'historial') await history(body);
  };
  await draw();
}

async function notes(body, params, draw) {
  let list = (await all('notes')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const chap = params.get('chap');
  const folders = [...new Set(list.map(n => n.folder).filter(Boolean))].sort();
  const kinds = [...new Set(list.map(n => n.kind || 'nota'))];
  const q = h('input', { type: 'search', placeholder: 'Buscar en notas', 'aria-label': 'Buscar en notas' });
  const fsel = h('select', { 'aria-label': 'Carpeta' }, h('option', { value: '' }, 'Todas las carpetas'), folders.map(f => h('option', { value: f }, f)));
  const ksel = h('select', { 'aria-label': 'Tipo' }, h('option', { value: '' }, 'Todos los tipos'), kinds.map(k => h('option', { value: k }, k)));
  const out = h('div', { class: 'notes-grid' });
  const redraw = () => {
    clear(out);
    const t = norm(q.value);
    const shown = list.filter(n => (!chap || n.chap === chap) && (!fsel.value || n.folder === fsel.value) && (!ksel.value || (n.kind || 'nota') === ksel.value)
      && (!t || norm(`${n.title} ${n.body} ${n.refLabel} ${(n.tags || []).join(' ')}`).includes(t)));
    shown.forEach(n => out.append(noteCard(n, draw)));
    if (!shown.length) out.append(h('p', { class: 'empty' }, list.length ? 'Ninguna nota coincide.' : 'Aún no hay notas. Seleccione un versículo en la Biblia y toque «Nota», o cree una nota general.'));
  };
  [q, fsel, ksel].forEach(x => x.addEventListener('input', redraw));
  body.append(h('div', { class: 'toolbar' }, q, fsel, ksel,
    h('button', { class: 'btn primary', onclick: () => noteEditor({ ref: null, chap: null, refLabel: 'Nota general' }).then(r => r && draw()) }, icon('plus', 18), 'Nota general')),
    chap ? h('p', { class: 'hint' }, `Mostrando notas de ${label(chap)}. `, h('a', { href: '#/cuaderno/notas' }, 'Ver todas')) : null, out);
  redraw();
}

async function simpleList(body, store, empty, draw) {
  const list = (await all(store)).sort(canonOrder);
  if (!list.length) { body.append(h('p', { class: 'empty' }, empty)); return; }
  body.append(h('ul', { class: 'list' }, list.map(x => h('li', { class: 'row' },
    h('a', { href: hrefFor(x.ref) }, h('strong', {}, x.refLabel || label(x.ref)), h('span', {}, fmtDate(x.updatedAt))),
    h('button', { class: 'icon-btn', 'aria-label': 'Quitar', onclick: async () => { await remove(store, x.id); draw(); } }, icon('trash', 18))))));
}

async function highlights(body, draw) {
  const list = (await all('highlights')).sort(canonOrder);
  if (!list.length) { body.append(h('p', { class: 'empty' }, 'No hay resaltados. Seleccione un versículo y elija un color.')); return; }
  const by = h('select', { 'aria-label': 'Color' }, h('option', { value: '' }, 'Todos los colores'), HL_COLORS.map(([c, n]) => h('option', { value: c }, n)));
  const ul = h('ul', { class: 'list' });
  const redraw = () => {
    clear(ul);
    for (const x of list.filter(x => !by.value || x.color === by.value)) ul.append(h('li', { class: 'row' },
      h('span', { class: `swatch static hl-${x.color}` }),
      h('a', { href: hrefFor(x.ref) }, h('strong', {}, x.refLabel || label(x.ref)), h('span', {}, fmtDate(x.updatedAt))),
      h('button', { class: 'icon-btn', 'aria-label': 'Quitar', onclick: async () => { await remove('highlights', x.id); draw(); } }, icon('trash', 18))));
  };
  by.addEventListener('change', redraw);
  body.append(h('div', { class: 'toolbar' }, by), ul); redraw();
}

async function bookmarks(body, draw) {
  const list = (await all('bookmarks')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!list.length) { body.append(h('p', { class: 'empty' }, 'No hay marcadores. Use el ícono de marcador en el lector o en un versículo.')); return; }
  body.append(h('ul', { class: 'list' }, list.map(x => {
    const r = splitAny(x.ref);
    const href = r.v ? hrefFor(x.ref) : `#/biblia/${r.book}/${r.ch}`;
    return h('li', { class: 'row' },
      h('a', { href }, h('strong', {}, x.title || x.refLabel), h('span', {}, `${x.title ? x.refLabel + ' · ' : ''}${fmtDate(x.updatedAt)}`)),
      h('button', { class: 'icon-btn', 'aria-label': 'Renombrar', onclick: async () => {
        const inp = h('input', { type: 'text', value: x.title || '', placeholder: 'Nombre del marcador' });
        const ok = await modal({ title: 'Renombrar marcador', content: inp, actions: [{ label: 'Cancelar', value: null }, { label: 'Guardar', primary: true, value: true }] });
        if (ok) { await put('bookmarks', { ...x, title: inp.value.trim() }); draw(); }
      } }, icon('pen', 18)),
      h('button', { class: 'icon-btn', 'aria-label': 'Eliminar', onclick: async () => { if (await confirmDialog('Eliminar marcador', '¿Eliminar este marcador?')) { await remove('bookmarks', x.id); toast('Marcador eliminado'); draw(); } } }, icon('trash', 18)));
  })));
}

async function history(body) {
  const [reading, passages, studies] = await Promise.all([recentHistory('lectura', 40), recentHistory('pasaje', 40), recentHistory('estudio', 40)]);
  const col = (title, items, hrefOf) => h('section', { class: 'block' }, h('h2', {}, title),
    items.length ? h('ul', { class: 'list compact' }, items.map(x => h('li', {}, h('a', { href: hrefOf(x) }, h('strong', {}, x.title), h('span', {}, fmtDate(x.at))))))
      : h('p', { class: 'hint' }, 'Sin registros todavía.'));
  body.append(h('div', { class: 'cols' },
    col('Lectura', reading, x => `#/biblia/${x.key.replace('.', '/')}`),
    col('Pasajes consultados', passages, x => hrefFor(x.key)),
    col('Pasajes estudiados', studies, x => hrefFor(x.key))));
}
