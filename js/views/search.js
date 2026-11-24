import { h, clear, icon, fmtDate } from '../ui.js';
import { BOOKS, BOOK } from '../books.js';
import { parseRef, refToKey, label } from '../ref.js';
import { searchText, concordance, parseQuery, searchUserData } from '../search.js';
import { strongEntry, allVersions, verLabel } from '../bible.js';
import { S } from '../state.js';
import { hrefFor, strongPanel } from './verse.js';

export async function renderSearch(view, params) {
  const q0 = params.get('q') || '';
  const scope0 = params.get('en') || 'all';
  const vers = await allVersions();
  const ver0 = vers.some(x => x.code === params.get('v')) ? params.get('v') : (vers.some(x => x.code === S.version) ? S.version : 'rv1909');
  const verSel = h('select', { 'aria-label': 'Versión' }, vers.map(x => h('option', { value: x.code, selected: x.code === ver0 }, x.abbr)));
  const q = h('input', { type: 'search', value: q0, placeholder: 'Ej.: Hch 2:38 · gracia fe · "nombre de Jesucristo" · G3686', 'aria-label': 'Buscar', enterkeyhint: 'search' });
  const scope = h('select', { 'aria-label': 'Ámbito' },
    h('option', { value: 'all' }, 'Toda la Biblia'), h('option', { value: 'AT' }, 'Antiguo Testamento'), h('option', { value: 'NT' }, 'Nuevo Testamento'),
    BOOKS.map(b => h('option', { value: b.id }, b.name)));
  scope.value = scope0;
  const form = h('form', { class: 'search-bar', onsubmit: (e) => {
    e.preventDefault();
    location.hash = `#/buscar?q=${encodeURIComponent(q.value.trim())}&en=${scope.value}&v=${encodeURIComponent(verSel.value)}`;
  } }, icon('search'), q, scope, verSel, h('button', { class: 'btn primary', type: 'submit' }, 'Buscar'));
  const out = h('div', { class: 'search-out' });
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Buscar')), form, out);

  if (!q0) {
    out.append(h('div', { class: 'help' },
      h('h2', {}, 'Cómo buscar'),
      h('ul', {},
        h('li', {}, h('strong', {}, 'Pasaje: '), 'Jn 3:16, Hechos 2:38-41, Sal 23, 1 Co 13.'),
        h('li', {}, h('strong', {}, 'Palabras: '), 'gracia fe — versículos que contienen todas las palabras (sin importar tildes).'),
        h('li', {}, h('strong', {}, 'Frase exacta: '), '"nombre de Jesucristo" — entre comillas.'),
        h('li', {}, h('strong', {}, 'Número Strong: '), 'G3686 (griego) o H430 (hebreo) — todos los lugares donde aparece la palabra original en la RV1909.')),
      h('p', { class: 'hint' }, 'La búsqueda se hace sobre el texto completo de la Reina-Valera 1909. La primera búsqueda descarga los 66 libros (unos 2,5 MB comprimidos); después funciona sin conexión.')));
    return;
  }

  // ¿Es una referencia?
  const r = parseRef(q0);
  if (r && r.ch && !r.error) {
    const key = refToKey(r);
    out.append(h('a', { class: 'ref-jump', href: r.v ? hrefFor(key) : `#/biblia/${r.book}/${r.ch}` }, icon('book'), `Abrir ${label(key)}`));
  } else if (r && r.error) out.append(h('p', { class: 'hint' }, r.error));

  const progress = h('div', { class: 'progress' }, h('div', { class: 'bar' }), h('span', {}, 'Preparando texto…'));
  out.append(progress);
  const onProgress = (d, t) => { progress.querySelector('.bar').style.width = `${(d / t) * 100}%`; progress.querySelector('span').textContent = `Cargando libros ${d}/${t}`; };

  const pq = parseQuery(q0);
  try {
    if (pq.kind === 'strong') {
      const [e, res] = await Promise.all([strongEntry(pq.num), concordance(pq.num, { scope: scope0, onProgress })]);
      progress.remove();
      out.append(h('section', { class: 'conc-head' },
        h('div', {}, h('h2', {}, e ? h('span', { class: `lemma ${pq.num[0] === 'H' ? 'heb' : 'grc'}` }, e.lemma) : pq.num, ' ', h('small', {}, `${pq.num}${e?.xlit ? ' · ' + e.xlit : ''}`)),
          e?.def ? h('p', { lang: 'en', class: 'def' }, e.def) : null,
          h('button', { class: 'btn small ghost', onclick: () => strongPanel(pq.num) }, 'Ver entrada léxica completa')),
        h('p', {}, `${res.occurrences} apariciones en ${res.total} versículos (RV1909${scope0 !== 'all' ? ', ámbito filtrado' : ''}).`),
        res.renderings.length ? h('div', { class: 'renderings' }, h('h3', {}, 'Cómo se tradujo en la RV1909'),
          h('ul', { class: 'chip-list' }, res.renderings.map(([w, n]) => h('li', {}, h('span', { class: 'chip static' }, `${w} `, h('b', {}, n)))))) : null));
      out.append(byBookBar(res.byBook), results(res.results, res.total));
    } else {
      const [res, mine, docs] = await Promise.all([searchText(ver0, q0, { scope: scope0, onProgress }), searchUserData(q0), import('../library.js').then(m => m.searchDocs(q0, { limit: 30 })).catch(() => [])]);
      progress.remove();
      if (mine.notes.length || mine.studies.length || mine.sermons.length) {
        out.append(h('section', { class: 'mine' }, h('h2', {}, 'En sus datos'),
          h('ul', { class: 'list' },
            mine.sermons.slice(0, 30).map(s => h('li', {}, h('a', { href: `#/mensaje/s/${encodeURIComponent(s.id)}` }, h('strong', {}, `Mensaje: ${s.titulo || 'sin título'}`), h('span', {}, s.texto || '')))),
            mine.studies.map(s => h('li', {}, h('a', { href: `#/estudio/${s.id}` }, h('strong', {}, `Estudio: ${s.title}`), h('span', {}, `${s.passageLabel} · ${fmtDate(s.updatedAt)}`)))),
            mine.notes.map(n => h('li', {}, h('a', { href: n.ref ? hrefFor(n.ref) : '#/cuaderno/notas' }, h('strong', {}, `Nota: ${n.title || n.refLabel || 'sin título'}`), h('span', {}, (n.body || '').slice(0, 120))))))));
      }
      if (docs.length) {
        out.append(h('section', { class: 'mine' }, h('h2', {}, 'En su biblioteca'),
          h('ul', { class: 'list compact' }, docs.slice(0, 10).map(r => h('li', {}, h('a', { href: `#/documento/${r.doc.id}/${r.page}?q=${encodeURIComponent(q0)}` }, h('strong', {}, `${r.doc.title} · pág. ${r.page}`), h('span', { class: 'snip' }, r.snip.pre, h('mark', {}, r.snip.hit), r.snip.post))))),
          docs.length > 10 ? h('a', { class: 'btn small', href: `#/biblioteca?q=${encodeURIComponent(q0)}` }, `Ver los ${docs.length >= 30 ? 'más de 30' : docs.length} resultados en la biblioteca`) : null));
      }
      out.append(h('h2', { class: 'res-count' }, `${res.total} versículo${res.total === 1 ? '' : 's'} en la ${verLabel(ver0)}`));
      if (!res.total) out.append(h('p', { class: 'hint' }, 'Sin resultados. Pruebe con menos palabras o revise la ortografía (la RV1909 usa formas antiguas como «fué», «á», «crió»; las tildes se ignoran).'));
      out.append(byBookBar(res.byBook), results(res.results, res.total));
    }
  } catch (e) {
    progress.remove();
    out.append(h('div', { class: 'error-box' }, 'No se pudo completar la búsqueda: ', e.message, navigator.onLine ? '' : ' (sin conexión: descargue la Biblia en Ajustes para buscar sin internet).'));
  }
}

function byBookBar(byBook) {
  const entries = Object.entries(byBook);
  if (entries.length < 2) return null;
  return h('details', { class: 'bybook' }, h('summary', {}, `Distribución por libro (${entries.length} libros)`),
    h('ul', { class: 'chip-list' }, entries.map(([b, n]) => h('li', {}, h('span', { class: 'chip static' }, `${BOOK[b].abbr} `, h('b', {}, n))))));
}

function results(list, total) {
  const ul = h('ol', { class: 'results' });
  for (const r of list) {
    const p = h('p', {});
    let pos = 0;
    for (const [a, b] of r.ranges) { p.append(r.text.slice(pos, a), h('mark', {}, r.text.slice(a, b))); pos = b; }
    p.append(r.text.slice(pos));
    ul.append(h('li', {}, h('a', { href: hrefFor(r.key) }, h('span', { class: 'res-ref' }, label(r.key)), p)));
  }
  const wrap = h('div', {}, ul);
  if (total > list.length) wrap.append(h('p', { class: 'hint' }, `Se muestran los primeros ${list.length} de ${total}. Restrinja el ámbito para ver más.`));
  return wrap;
}
