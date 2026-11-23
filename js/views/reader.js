// Lector bíblico
import { h, clear, icon, modal, toast } from '../ui.js';
import { BOOKS, BOOK } from '../books.js';
import { getChapter, segments, chapterCount } from '../bible.js';
import { ckey, vkey, label } from '../ref.js';
import { byIndex, touchHistory, put } from '../db.js';
import { S, setPref } from '../state.js';
import { openVersePanel, strongPanel, noteEditor } from './verse.js';
import { closePanel } from './panel.js';

export async function renderReader(view, book, ch, vParam) {
  if (!book || !BOOK[book]) { book = S.lastPos.book; ch = S.lastPos.ch; }
  ch = Math.min(Math.max(1, ch || 1), chapterCount(book));
  await setPref('lastPos', { book, ch });
  touchHistory('lectura', ckey(book, ch), `${BOOK[book].name} ${ch}`);

  const selected = new Set();
  const target = parseTarget(vParam);

  const head = h('header', { class: 'reader-head' },
    h('button', { class: 'icon-btn', 'aria-label': 'Capítulo anterior', onclick: () => step(-1) }, icon('left')),
    h('button', { class: 'chapter-btn', onclick: () => pickBook(book), 'aria-label': 'Elegir libro y capítulo' }, `${BOOK[book].name} ${ch}`, icon('down', 16)),
    h('button', { class: 'icon-btn', 'aria-label': 'Capítulo siguiente', onclick: () => step(1) }, icon('right')),
    h('div', { class: 'spacer' }),
    h('button', { class: 'icon-btn', 'aria-label': 'Nota del capítulo', title: 'Nota del capítulo', onclick: () => noteEditor({ ref: ckey(book, ch), chap: ckey(book, ch), refLabel: `${BOOK[book].name} ${ch}` }).then(r => r && refresh()) }, icon('note')),
    h('button', { class: 'icon-btn', 'aria-label': 'Marcar este capítulo', title: 'Marcar este capítulo', onclick: async () => { await put('bookmarks', { ref: ckey(book, ch), chap: ckey(book, ch), refLabel: `${BOOK[book].name} ${ch}`, title: '' }); toast('Capítulo marcado'); } }, icon('bookmark')),
    h('button', { class: 'icon-btn', 'aria-label': 'Opciones de lectura', title: 'Opciones de lectura', onclick: () => readingOptions(() => draw()) }, icon('type')));

  const article = h('article', { class: 'reader', lang: 'es' });
  const foot = h('footer', { class: 'reader-foot' });
  view.append(head, article, foot);

  async function step(d) {
    let b = BOOK[book].index, c = ch + d;
    if (c < 1) { b--; if (b < 0) return; c = chapterCount(BOOKS[b].id); }
    else if (c > chapterCount(book)) { b++; if (b >= BOOKS.length) return; c = 1; }
    location.hash = `#/biblia/${BOOKS[b].id}/${c}`;
  }

  let decor = { hl: new Map(), fav: new Set(), notes: new Set(), chapNotes: 0 };
  async function loadDecor() {
    const chap = ckey(book, ch);
    const [hl, fav, notes] = await Promise.all([byIndex('highlights', 'chap', chap), byIndex('favorites', 'chap', chap), byIndex('notes', 'chap', chap)]);
    decor = { hl: new Map(hl.map(x => [x.ref, x.color])), fav: new Set(fav.map(x => x.ref)), notes: new Set(), chapNotes: 0 };
    for (const n of notes) {
      const m = /^([1-3A-Z]{3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(n.ref || '');
      if (!m) { decor.chapNotes++; continue; }
      for (let v = +m[3]; v <= +(m[4] || m[3]); v++) decor.notes.add(vkey(book, ch, v));
    }
  }

  let rv = [], bes = null;
  async function draw() {
    article.className = `reader ${S.verseBreaks ? 'breaks' : 'flow'} ${S.parallel ? 'parallel' : ''} ${S.showStrong ? 'strong-on' : ''}`;
    rv = await getChapter('rv1909', book, ch);
    bes = null;
    if (S.parallel) { try { bes = await getChapter('bes', book, ch); } catch (e) { bes = null; toast('BES no disponible sin conexión'); } }
    await loadDecor();
    clear(article);
    article.append(h('h1', { class: 'chapter-title' }, h('span', { class: 'ct-book' }, BOOK[book].name), h('span', { class: 'ct-ch' }, `Capítulo ${ch}`)));
    if (decor.chapNotes) article.append(h('a', { class: 'chap-notes', href: `#/cuaderno/notas?chap=${ckey(book, ch)}` }, `${decor.chapNotes} nota${decor.chapNotes > 1 ? 's' : ''} de este capítulo`));
    if (S.parallel) article.append(h('div', { class: 'par-head' }, h('span', {}, 'Reina-Valera 1909'), h('span', {}, 'Biblia en Español Sencillo')));
    const body = h('div', { class: 'verses' });
    rv.forEach((verse, i) => {
      const v = i + 1, key = vkey(book, ch, v);
      const el = h('span', { class: verseClass(key, v), 'data-v': v, id: `v${v}`, role: 'button', tabindex: '0', 'aria-label': `Versículo ${v}` },
        h('sup', { class: 'vn' }, v), ...renderSegs(verse), decor.notes.has(key) ? h('span', { class: 'note-dot', title: 'Tiene nota' }) : null);
      el.addEventListener('click', (e) => onVerseTap(e, v));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVerseTap(e, v); } });
      if (S.parallel) body.append(h('div', { class: 'par-row' }, el, h('span', { class: 'par-bes' }, h('sup', { class: 'vn' }, v), bes ? (bes[i] || '') : '—')));
      else { body.append(el); if (!S.verseBreaks) body.append(' '); }
    });
    article.append(body, h('p', { class: 'reader-source' }, 'Reina-Valera 1909 · Dominio público'));
    drawFoot();
  }

  function verseClass(key, v) {
    const c = ['verse'];
    if (decor.hl.has(key)) c.push(`hl-${decor.hl.get(key)}`);
    if (decor.fav.has(key)) c.push('fav');
    if (selected.has(v)) c.push('selected');
    if (target && v >= target[0] && v <= target[1]) c.push('target');
    return c.join(' ');
  }

  function renderSegs(verse) {
    return segments(verse).map(s => {
      if (!s.s || !S.showStrong) return h('span', { class: s.add ? 'add' : null }, s.t);
      return h('span', { class: `sw ${s.add ? 'add' : ''}`, 'data-s': s.s }, s.t, h('sup', { class: 'sn' }, s.s.replace(/ /g, '·')));
    });
  }

  function onVerseTap(e, v) {
    const sn = e.target.closest('.sw');
    if (S.showStrong && sn && e.target.classList.contains('sn')) {
      const nums = sn.dataset.s.split(' ');
      strongPanel(nums[0], nums); return;
    }
    if (selected.has(v)) selected.delete(v); else selected.add(v);
    article.querySelectorAll('.verse').forEach(el => el.classList.toggle('selected', selected.has(+el.dataset.v)));
    if (selected.size) openVersePanel(book, ch, selected, refresh);
    else closePanel();
    drawFoot();
  }

  async function refresh() {
    await loadDecor();
    article.querySelectorAll('.verse').forEach(el => {
      const v = +el.dataset.v, key = vkey(book, ch, v);
      el.className = verseClass(key, v);
      const dot = el.querySelector('.note-dot');
      if (decor.notes.has(key) && !dot) el.append(h('span', { class: 'note-dot', title: 'Tiene nota' }));
      if (!decor.notes.has(key) && dot) dot.remove();
    });
  }

  function drawFoot() {
    clear(foot);
    if (selected.size) foot.append(h('button', { class: 'btn ghost', onclick: () => { selected.clear(); closePanel(); article.querySelectorAll('.verse.selected').forEach(el => el.classList.remove('selected')); drawFoot(); } }, 'Quitar selección'));
    const last = BOOK[book].index === BOOKS.length - 1 && ch === chapterCount(book);
    if (!last) {
      const nb = ch < chapterCount(book) ? `${BOOK[book].name} ${ch + 1}` : `${BOOKS[BOOK[book].index + 1].name} 1`;
      foot.append(h('button', { class: 'btn primary', onclick: () => step(1) }, `Continuar: ${nb}`, icon('right', 18)));
    }
  }

  await draw();
  if (target) {
    const el = article.querySelector(`#v${target[0]}`);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 60);
  }
}

function parseTarget(v) {
  if (!v) return null;
  const m = /^(\d+)(?:-(\d+))?$/.exec(v);
  return m ? [+m[1], +(m[2] || m[1])] : null;
}

// Selector de libro y capítulo
function pickBook(current) {
  const grid = h('div', { class: 'book-picker' });
  const close = () => document.querySelector('.modal-wrap')?.remove();
  const showBooks = () => {
    clear(grid);
    for (const t of ['AT', 'NT']) {
      grid.append(h('h3', {}, t === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento'));
      let group = null, row;
      for (const b of BOOKS.filter(x => x.t === t)) {
        if (b.group !== group) { group = b.group; grid.append(h('div', { class: 'group-label' }, group)); row = h('div', { class: 'book-grid' }); grid.append(row); }
        row.append(h('button', { class: `book-cell ${b.id === current ? 'current' : ''}`, onclick: () => showChapters(b.id) }, b.name));
      }
    }
  };
  const showChapters = (id) => {
    clear(grid);
    grid.append(h('button', { class: 'btn ghost small', onclick: showBooks }, icon('left', 16), 'Libros'), h('h3', {}, BOOK[id].name));
    const g = h('div', { class: 'ch-grid' });
    for (let c = 1; c <= chapterCount(id); c++) g.append(h('a', { class: 'ch-cell', href: `#/biblia/${id}/${c}`, onclick: close }, c));
    grid.append(g);
  };
  showBooks();
  modal({ title: 'Ir a', content: grid, wide: true });
}

function readingOptions(redraw) {
  const size = h('input', { type: 'range', min: 14, max: 30, step: 1, value: S.fontSize, 'aria-label': 'Tamaño de letra', oninput: async (e) => { await setPref('fontSize', +e.target.value); sizeVal.textContent = `${e.target.value} px`; } });
  const sizeVal = h('span', { class: 'val' }, `${S.fontSize} px`);
  const toggle = (k, name, desc) => h('label', { class: 'switch-row' },
    h('span', {}, h('strong', {}, name), desc ? h('small', {}, desc) : null),
    h('input', { type: 'checkbox', checked: S[k], onchange: async (e) => { await setPref(k, e.target.checked); redraw(); } }));
  const themes = h('div', { class: 'seg' }, ['claro', 'sepia', 'oscuro'].map(t =>
    h('button', { class: S.theme === t ? 'on' : '', onclick: async (e) => { await setPref('theme', t); themes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, t[0].toUpperCase() + t.slice(1))));
  modal({ title: 'Opciones de lectura', content: h('div', { class: 'form' },
    h('div', { class: 'opt-row' }, h('span', {}, 'Tamaño de letra'), size, sizeVal),
    h('div', { class: 'opt-row' }, h('span', {}, 'Apariencia'), themes),
    toggle('verseBreaks', 'Un versículo por línea', 'Desactívelo para lectura continua en párrafo.'),
    toggle('parallel', 'Comparar con BES', 'Muestra la Biblia en Español Sencillo al lado.'),
    toggle('showStrong', 'Números Strong', 'Muestra el número hebreo/griego de cada palabra. Toque el número para abrir el léxico.')) });
}
