// Panel contextual de versículo(s): acciones, palabras originales, referencias, comparación y notas.
import { h, clear, icon, toast, modal, copyText, fmtDate, confirmDialog } from '../ui.js';
import { BOOK } from '../books.js';
import { getChapter, plain, segments, strongEntry, loadXref, getVerse, allVersions, verLabel } from '../bible.js';
import { S } from '../state.js';
import { label, vkey, ckey, keyFromSelection, selectionLabel, splitAny } from '../ref.js';
import { put, get, remove, byIndex, all, uid, touchHistory, getSetting } from '../db.js';
import { createStudy, addPassageToStudy, listStudies } from '../study.js';
import { openPanel, setPanelTitle } from './panel.js';

export const HL_COLORS = [['oro', 'Dorado'], ['azul', 'Azul'], ['verde', 'Verde'], ['rosa', 'Rosa'], ['gris', 'Gris']];

export async function openVersePanel(book, ch, nums, onChange) {
  const sel = [...nums].sort((a, b) => a - b);
  const title = selectionLabel(book, ch, sel);
  const rangeKey = keyFromSelection(book, ch, sel);
  const keys = sel.map(v => vkey(book, ch, v));
  const chapter = await getChapter('rv1909', book, ch); // con números Strong
  let mainVer = S.version || 'rv1909', mainCh = chapter;
  if (mainVer !== 'rv1909') { try { mainCh = await getChapter(mainVer, book, ch); } catch (e) { mainVer = 'rv1909'; } }
  const verAbbr = verLabel(mainVer);
  const text = sel.map(v => `${sel.length > 1 ? v + ' ' : ''}${plain(mainCh[v - 1])}`).join(' ');

  const favs = new Set((await byIndex('favorites', 'chap', ckey(book, ch))).map(f => f.ref));
  const allFav = keys.every(k => favs.has(k));

  const changed = () => onChange && onChange();

  const actions = h('div', { class: 'action-grid' },
    act('study', 'Estudiar', async () => {
      const key = rangeKey || keys[0];
      if (!rangeKey && sel.length > 1) toast('Selección discontinua: se estudiará desde el primer versículo');
      const s = await createStudy(key);
      location.hash = `#/estudio/${s.id}`;
    }),
    act('note', 'Nota', () => noteEditor({ ref: rangeKey || keys[0], chap: ckey(book, ch), refLabel: rangeKey ? label(rangeKey) : label(keys[0]) }).then(r => { if (r) { changed(); showTab('notas'); } })),
    act('bookmark', 'Marcador', async () => {
      await put('bookmarks', { ref: keys[0], chap: ckey(book, ch), refLabel: label(keys[0]), title: '' });
      toast('Marcador guardado'); changed();
    }),
    act('star', allFav ? 'Quitar favorito' : 'Favorito', async () => {
      for (const k of keys) {
        const id = `fav:${k}`;
        if (allFav) await remove('favorites', id);
        else await put('favorites', { id, ref: k, chap: ckey(book, ch), refLabel: label(k), deletedAt: null });
      }
      toast(allFav ? 'Quitado de favoritos' : 'Añadido a favoritos'); changed();
      openVersePanel(book, ch, nums, onChange);
    }),
    act('copy', 'Copiar', async () => {
      const ok = await copyText(`${title} — ${text} (${verAbbr})`);
      toast(ok ? 'Texto copiado' : 'No se pudo copiar');
    }),
    act('share', 'Compartir', async () => {
      const payload = `${title}\n${text}\n(${verAbbr})`;
      if (navigator.share) { try { await navigator.share({ title, text: payload }); } catch (e) { /* cancelado */ } }
      else { await copyText(payload); toast('Este dispositivo no permite compartir; el texto se copió'); }
    }),
    act('plus', 'Añadir a estudio', () => addToStudyDialog(rangeKey || keys[0])),
    (await getSetting('aiReady', false)) ? act('spark', 'Preguntar a la IA', () => { location.hash = `#/asistente?ref=${encodeURIComponent(rangeKey || keys[0])}`; }) : null,
  );

  const hl = h('div', { class: 'hl-row', role: 'group', 'aria-label': 'Resaltar' },
    h('span', { class: 'hl-label' }, 'Resaltar'),
    HL_COLORS.map(([c, n]) => h('button', { class: `swatch hl-${c}`, 'aria-label': `Resaltar en ${n}`, title: n, onclick: async () => {
      for (const k of keys) await put('highlights', { id: `hl:${k}`, ref: k, chap: ckey(book, ch), color: c, refLabel: label(k), deletedAt: null });
      changed();
    } })),
    h('button', { class: 'btn small ghost', onclick: async () => { for (const k of keys) await remove('highlights', `hl:${k}`); changed(); } }, 'Quitar'));

  const tabsDef = [['palabras', 'Palabras originales'], ['refs', 'Referencias'], ['comparar', 'Comparar'], ['lugares', 'Lugares'], ['personas', 'Personas'], ['notas', 'Notas']];
  const tabBody = h('div', { class: 'tab-body' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, tabsDef.map(([id, n]) =>
    h('button', { role: 'tab', 'data-tab': id, onclick: () => showTab(id) }, n)));

  async function showTab(id) {
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
    clear(tabBody).append(h('div', { class: 'loading small' }, 'Cargando…'));
    try {
      const content = id === 'palabras' ? await wordsTab(book, ch, sel, chapter)
        : id === 'refs' ? await refsTab(book, ch, sel)
          : id === 'comparar' ? await compareTab(book, ch, sel, chapter)
            : id === 'lugares' ? await placesTab(book, ch, sel)
            : id === 'personas' ? await peopleTab(book, ch, sel)
            : await notesTab(book, ch, keys, rangeKey, () => { changed(); showTab('notas'); });
      clear(tabBody).append(content);
    } catch (e) {
      clear(tabBody).append(h('div', { class: 'error-box' }, e.message));
    }
  }

  const body = openPanel(title, h('div', { class: 'verse-panel' },
    h('blockquote', { class: 'sel-text' }, text, h('cite', {}, verAbbr)), actions, hl, tabs, tabBody));
  touchHistory('pasaje', rangeKey || keys[0], title);
  showTab('palabras');
  return body;
}

function act(ic, name, fn) {
  return h('button', { class: 'action', onclick: fn }, icon(ic, 22), h('span', {}, name));
}

async function wordsTab(book, ch, sel, chapter) {
  const wrap = h('div', { class: 'words' });
  const isNT = BOOK[book].t === 'NT';
  wrap.append(h('p', { class: 'hint' }, `Palabras de la RV1909 enlazadas al ${isNT ? 'griego' : 'hebreo'} mediante números Strong. Toque una palabra para ver su entrada léxica.`));
  for (const v of sel) {
    const segs = segments(chapter[v - 1]);
    const line = h('p', { class: 'interlinear' }, sel.length > 1 ? h('sup', {}, v) : null);
    let any = false;
    for (const s of segs) {
      if (s.s) {
        any = true;
        line.append(h('button', { class: `w ${s.add ? 'add' : ''}`, onclick: () => strongPanel(s.s.split(' ')[0], s.s.split(' ')) },
          h('span', { class: 'w-t' }, s.t), h('span', { class: 'w-s' }, s.s)));
      } else line.append(h('span', { class: s.add ? 'add' : '' }, s.t));
    }
    wrap.append(line);
    if (!any) wrap.append(h('p', { class: 'hint' }, 'Este versículo no tiene números Strong en la fuente.'));
  }
  return wrap;
}

export async function strongPanel(num, all) {
  const entries = [];
  for (const n of (all && all.length ? all : [num])) { const e = await strongEntry(n); if (e) entries.push(e); }
  const content = h('div', { class: 'lex' });
  if (!entries.length) content.append(h('p', {}, `No hay entrada léxica para ${num} en el diccionario disponible.`));
  for (const e of entries) {
    content.append(h('article', { class: 'lex-entry' },
      h('div', { class: 'lex-head' }, h('span', { class: `lemma ${e.num[0] === 'H' ? 'heb' : 'grc'}`, lang: e.num[0] === 'H' ? 'he' : 'grc', dir: e.num[0] === 'H' ? 'rtl' : 'ltr' }, e.lemma),
        h('span', { class: 'lex-num' }, e.num)),
      h('dl', {},
        e.xlit ? [h('dt', {}, 'Transliteración'), h('dd', {}, e.xlit)] : null,
        e.pron ? [h('dt', {}, 'Pronunciación (Strong)'), h('dd', {}, e.pron)] : null,
        e.deriv ? [h('dt', {}, 'Derivación'), h('dd', { lang: 'en' }, e.deriv)] : null,
        e.def ? [h('dt', {}, 'Definición de Strong'), h('dd', { lang: 'en' }, e.def)] : null,
        e.kjv ? [h('dt', {}, 'Traducciones en la KJV'), h('dd', { lang: 'en' }, e.kjv)] : null,
        e.freq ? [h('dt', {}, 'Frecuencia'), h('dd', {}, `${e.freq} veces en la RV1909`)] : null),
      h('a', { class: 'btn', href: `#/buscar?q=${e.num}` }, icon('search', 18), `Ver todos los usos de ${e.num} en la RV1909`)));
  }
  content.append(h('p', { class: 'hint' }, 'Fuente: diccionarios de James Strong (hebreo 1894, griego 1890; dominio público), edición de Open Scriptures. Las definiciones están en inglés porque no existe aún un léxico en español con licencia libre integrado. El significado de una palabra debe establecerse por su contexto, no tomando todos sus sentidos posibles.'));
  openPanel(`Strong ${num}`, content);
}

async function refsTab(book, ch, sel) {
  const x = await loadXref(book);
  const wrap = h('div', { class: 'refs' });
  let n = 0;
  for (const v of sel) {
    const list = x[`${ch}.${v}`] || [];
    if (!list.length) continue;
    if (sel.length > 1) wrap.append(h('h4', {}, `Versículo ${v}`));
    const ul = h('ul', { class: 'ref-list' });
    for (const k of list) {
      n++;
      const li = h('li', {}, h('a', { href: hrefFor(k) }, label(k)), h('span', { class: 'ref-preview' }, '…'));
      ul.append(li);
      previewText(k).then(t => { li.querySelector('.ref-preview').textContent = t; }).catch(() => {});
    }
    wrap.append(ul);
  }
  if (!n) wrap.append(h('p', { class: 'hint' }, 'No hay referencias cruzadas registradas para esta selección.'));
  wrap.append(h('p', { class: 'hint' }, 'Fuente: OpenBible.info (CC BY), filtradas por votos. Una referencia indica relación temática o verbal; compruebe siempre el contexto de cada pasaje.'));
  const { docsForVerse } = await import('../library.js');
  const docs = []; for (const v of sel) for (const x of await docsForVerse(book, ch, v)) if (!docs.some(y => y.doc.id === x.doc.id)) docs.push(x);
  if (docs.length) wrap.append(h('h3', {}, 'En su biblioteca'), h('ul', { class: 'list compact' }, docs.map(x => h('li', {}, h('a', { href: `#/documento/${x.doc.id}/${x.pages[0]}` }, h('strong', {}, x.doc.title), h('span', {}, `página${x.pages.length > 1 ? 's' : ''} ${x.pages.slice(0, 6).join(', ')}`))))));
  return wrap;
}

async function peopleTab(book, ch, sel) {
  const { peopleForVerse, who } = await import('../people.js');
  const wrap = h('div', {}); const seen = new Set(); const ul = h('ul', { class: 'list compact' });
  for (const v of sel) for (const p of await peopleForVerse(book, ch, v)) if (!seen.has(p.id)) { seen.add(p.id); ul.append(h('li', {}, h('a', { href: `#/personaje/${p.id}` }, h('strong', {}, p.n), h('span', {}, [who(p), `${p.k} menciones`].filter(Boolean).join(' · '))))); }
  wrap.append(seen.size ? ul : h('p', { class: 'hint' }, 'No hay personas registradas para esta selección.'));
  wrap.append(h('p', { class: 'hint' }, 'Fuente: Theographic Bible Metadata (CC BY-SA 4.0).'));
  return wrap;
}

async function placesTab(book, ch, sel) {
  const { placesForVerse, typeName } = await import('../atlas.js');
  const wrap = h('div', {});
  const seen = new Set(); const ul = h('ul', { class: 'list compact' });
  for (const v of sel) for (const p of await placesForVerse(book, ch, v)) if (!seen.has(p.i)) { seen.add(p.i); ul.append(h('li', {}, h('a', { href: `#/atlas/${p.i}` }, h('strong', {}, p.n), h('span', {}, `${typeName(p.t)} · ${p.k} menciones · ver en el mapa`)))); }
  wrap.append(seen.size ? ul : h('p', { class: 'hint' }, 'No hay lugares registrados para esta selección.'));
  wrap.append(h('p', { class: 'hint' }, 'Fuente: OpenBible.info (CC BY 4.0). La lista de versículos por lugar de esta fuente puede estar incompleta para lugares muy mencionados.'));
  return wrap;
}

export function hrefFor(k) {
  const r = splitAny(k);
  if (!r) return '#/biblia';
  if (!r.v) return `#/biblia/${r.book}/${r.ch}`;
  return `#/biblia/${r.book}/${r.ch}?v=${r.v}${r.v2 ? '-' + r.v2 : ''}`;
}
async function previewText(k) {
  const r = splitAny(k);
  const t = plain(await getVerse('rv1909', r.book, r.ch, r.v));
  return t.length > 140 ? t.slice(0, 140) + '…' : t;
}

async function pickVersions(allV, wrap) {
  const { setPref } = await import('../state.js');
  const hidden = new Set(S.compareHide || []);
  const boxes = allV.map(x => h('label', { class: 'switch-row' }, h('span', {}, h('strong', {}, x.abbr), h('small', {}, x.name)), h('input', { type: 'checkbox', checked: !hidden.has(x.code), 'data-code': x.code })));
  const r = await modal({ title: 'Versiones para comparar', content: h('div', { class: 'form' }, boxes), actions: [{ label: 'Cancelar', value: null }, { label: 'Guardar', primary: true, value: true }] });
  if (!r) return;
  const hide = boxes.map(b => b.querySelector('input')).filter(i => !i.checked).map(i => i.dataset.code);
  if (hide.length === allV.length) { toast('Deje al menos una versión'); return; }
  await setPref('compareHide', hide);
  const tabBtn = document.querySelector('#panel .tabs button[data-tab="comparar"]'); if (tabBtn) tabBtn.click();
}

async function compareTab(book, ch, sel, chapter) {
  const allV = await allVersions();
  const hidden = new Set(S.compareHide || []);
  const vers = allV.filter(x => !hidden.has(x.code));
  const chs = {};
  for (const x of vers) { try { chs[x.code] = x.code === 'rv1909' ? chapter : await getChapter(x.code, book, ch); } catch (e) { chs[x.code] = null; } }
  const wrap = h('div', { class: 'compare' });
  for (const v of sel) {
    wrap.append(h('div', { class: 'cmp-row' },
      h('div', { class: 'cmp-v' }, `${v}`),
      vers.map(x => h('div', {}, h('div', { class: 'cmp-ver' }, x.abbr), h('p', {}, chs[x.code] ? (plain(chs[x.code][v - 1]) || '(este versículo no existe en esta versión)') : 'No disponible (descargue la versión para usarla sin conexión).')))));
  }
  wrap.prepend(h('div', { class: 'cmp-pick' }, h('span', { class: 'hint' }, `${vers.length} de ${allV.length} versiones`),
    h('button', { class: 'btn small ghost', onclick: () => pickVersions(allV, wrap) }, 'Elegir versiones')));
  if (vers.some(x => x.own)) wrap.append(h('p', { class: 'hint' }, 'Las Biblias personales (cargadas por usted) se guardan solo en este equipo y no se publican.'));
  wrap.append(h('p', { class: 'hint' }, 'BES: La Biblia en Español Sencillo, © 2018 AudioBiblia.org / Irma Flores, CC BY 4.0. Es una traducción de lenguaje sencillo; para estudio formal compare con la RV1909 y, cuando sea posible, con el texto original.'));
  return wrap;
}

async function notesTab(book, ch, keys, rangeKey, refresh) {
  const changed = refresh;
  const notes = (await byIndex('notes', 'chap', ckey(book, ch))).filter(n => keys.includes(n.ref) || n.ref === rangeKey || overlaps(n.ref, keys));
  const wrap = h('div', { class: 'notes-tab' });
  if (!notes.length) wrap.append(h('p', { class: 'hint' }, 'No hay notas para esta selección.'));
  for (const n of notes) wrap.append(noteCard(n, changed));
  wrap.append(h('button', { class: 'btn', onclick: () => noteEditor({ ref: rangeKey || keys[0], chap: ckey(book, ch), refLabel: label(rangeKey || keys[0]) }).then(r => { if (r) refresh(); }) }, icon('plus', 18), 'Nueva nota'));
  return wrap;
}
function overlaps(ref, keys) {
  const r = splitAny(ref); if (!r || !r.v) return false;
  return keys.some(k => { const x = splitAny(k); return x.book === r.book && x.ch === r.ch && x.v >= r.v && x.v <= (r.v2 || r.v); });
}

export function noteCard(n, changed) {
  const card = h('article', { class: 'note-card' },
    h('header', {}, h('a', { href: n.ref ? hrefFor(n.ref) : null, class: 'note-ref' }, n.refLabel || 'Nota general'), h('time', {}, fmtDate(n.updatedAt))),
    n.title ? h('h4', {}, n.title) : null,
    h('p', { class: 'note-body' }, n.body),
    n.tags?.length ? h('div', { class: 'tags' }, n.tags.map(t => h('span', { class: 'tag' }, t))) : null,
    h('footer', {},
      h('button', { class: 'btn small ghost', onclick: () => noteEditor(n).then(r => { if (r) changed && changed(); }) }, 'Editar'),
      h('button', { class: 'btn small ghost danger', onclick: async () => {
        if (await confirmDialog('Eliminar nota', '¿Desea eliminar esta nota?')) { await remove('notes', n.id); card.remove(); changed && changed(); toast('Nota eliminada'); }
      } }, 'Eliminar')));
  return card;
}

// Editor de notas (verso, capítulo o general). Devuelve el registro guardado o null.
export async function noteEditor(n) {
  const title = h('input', { type: 'text', placeholder: 'Título (opcional)', value: n.title || '', 'aria-label': 'Título' });
  const body = h('textarea', { rows: 8, placeholder: 'Escriba su nota…', 'aria-label': 'Nota' }); body.value = n.body || '';
  const folder = h('input', { type: 'text', placeholder: 'Carpeta (opcional)', value: n.folder || '', 'aria-label': 'Carpeta' });
  const tags = h('input', { type: 'text', placeholder: 'Etiquetas separadas por coma', value: (n.tags || []).join(', '), 'aria-label': 'Etiquetas' });
  const kind = h('select', { 'aria-label': 'Tipo' }, ['nota', 'pregunta', 'conclusión', 'idea para sermón', 'frase', 'observación'].map(k => h('option', { value: k, selected: (n.kind || 'nota') === k }, k)));
  const content = h('div', { class: 'form' },
    h('p', { class: 'form-ref' }, n.refLabel || 'Nota general'), title, body, h('div', { class: 'form-row' }, kind, folder), tags);
  return modal({ title: n.id ? 'Editar nota' : 'Nueva nota', content, actions: [
    { label: 'Cancelar', value: null },
    { label: 'Guardar', primary: true, onClick: async () => {
      if (!body.value.trim() && !title.value.trim()) { toast('La nota está vacía'); return false; }
      const rec = await put('notes', { ...n, title: title.value.trim(), body: body.value, folder: folder.value.trim(), kind: kind.value,
        tags: tags.value.split(',').map(t => t.trim()).filter(Boolean) });
      toast('Nota guardada');
      return rec;
    } }] });
}

async function addToStudyDialog(key) {
  const studies = await listStudies();
  if (!studies.length) { toast('Aún no tiene estudios. Use «Estudiar» para crear el primero.'); return; }
  const list = h('ul', { class: 'pick-list' }, studies.map(s => h('li', {}, h('button', { onclick: async () => {
    await addPassageToStudy(s.id, key); toast(`Añadido a «${s.title}»`);
    document.querySelector('.modal-wrap')?.remove();
  } }, h('strong', {}, s.title), h('span', {}, s.passageLabel)))));
  modal({ title: `Añadir ${label(key)} a un estudio`, content: list });
}
