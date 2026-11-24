// Inicio: la mesa de estudio. Lo primero que se ve es el texto bíblico donde quedó, tipografiado como en un libro;
// al lado, lo que tiene entre manos (estudios y notas) y, debajo, el índice de herramientas.
import { h, fmtDate } from '../ui.js';
import { BOOK } from '../books.js';
import { recentHistory, counts, all, getSetting } from '../db.js';
import { listStudies } from '../study.js';
import { getChapter, segments, verLabel } from '../bible.js';
import { splitKey, label } from '../ref.js';
import { S } from '../state.js';
import { hrefFor } from './verse.js';
import { offlineStatus } from '../offline.js';
import { TOOLS } from '../tools.js';

async function passageText(key) {
  const r = splitKey(key); if (!r) return null;
  const ver = S.version || 'rv1909';
  let c; try { c = await getChapter(ver, r.book, r.ch); } catch (e) { c = await getChapter('rv1909', r.book, r.ch); }
  const from = r.v || 1, to = Math.min(r.v ? (r.v2 || r.v) : 1, from + 2);
  const out = [];
  for (let v = from; v <= to && c[v - 1] != null; v++) out.push(h('span', { class: 'vn' }, String(v)), segments(c[v - 1]).map(s => s.t).join(''), ' ');
  return { nodes: out, ver, more: r.v2 && r.v2 > to };
}

export async function renderHome(view) {
  const [pasajes, studies, c, off, notes, aiReady] = await Promise.all([recentHistory('pasaje', 1), listStudies(), counts(), offlineStatus(), all('notes'), getSetting('aiReady', false)]);
  const pos = S.lastPos;
  // Pasaje del texto central: el último versículo consultado; si no hay, el comienzo del capítulo donde quedó la lectura
  const key = pasajes[0]?.key || `${pos.book}.${pos.ch}.1`;
  const t = await passageText(key).catch(() => null);
  const r = splitKey(key);

  const recentNotes = notes.filter(n => !n.deletedAt).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 4);
  view.append(
    h('section', { class: 'desk' },
      h('div', { class: 'desk-text' },
        h('a', { class: 'desk-ref', href: hrefFor(key) }, `${label(key)}${t ? `, ${verLabel(t.ver)}` : ''}`),
        t ? h('p', { class: 'desk-verse' }, t.nodes, t.more ? '…' : '') : h('p', { class: 'desk-verse' }, 'Escudriñad las Escrituras.'),
        h('div', { class: 'desk-actions' },
          h('a', { class: 'btn primary', href: `#/biblia/${r.book}/${r.ch}` }, `Seguir en ${BOOK[r.book].name} ${r.ch}`),
          h('a', { class: 'btn', href: hrefFor(key) }, 'Abrir el panel de estudio'))),
      h('aside', { class: 'desk-aside' },
        h('div', { class: 'block' }, h('h2', {}, 'Estudios en curso'),
          studies.length ? h('ul', { class: 'list compact' }, studies.slice(0, 4).map(s => h('li', {}, h('a', { href: `#/estudio/${s.id}` }, h('strong', {}, s.title), h('span', {}, `${s.passageLabel}, ${fmtDate(s.updatedAt)}`)))))
            : h('p', { class: 'hint' }, 'Todavía no tiene estudios. ', h('a', { href: '#/estudios' }, 'Empiece uno'), ' a partir de cualquier pasaje.')),
        h('div', { class: 'block' }, h('h2', {}, 'Últimas notas'),
          recentNotes.length ? h('ul', { class: 'list compact' }, recentNotes.map(n => h('li', {}, h('a', { href: n.ref ? hrefFor(n.ref) : '#/cuaderno/notas' }, h('strong', {}, n.title || n.refLabel || 'Nota'), h('span', {}, (n.body || '').slice(0, 90))))))
            : h('p', { class: 'hint' }, 'Toque un versículo y elija «Nota» para escribir la primera.')))),
    h('section', { class: 'block' }, h('h2', {}, 'Herramientas'),
      h('nav', { class: 'tools-index', 'aria-label': 'Herramientas' },
        TOOLS.filter(([id]) => id !== 'asistente' || aiReady).map(([id, n, d]) => h('a', { href: `#/${id}` }, h('strong', {}, n), h('span', {}, d))),
        h('a', { href: '#/mensajes' }, h('strong', {}, 'Mis mensajes'), h('span', {}, c.sermons ? `${c.sermons} ${c.sermons === 1 ? 'mensaje' : 'mensajes'} del Taller, para buscar y citar` : 'Traiga sus mensajes del Taller para consultarlos')),
        h('a', { href: '#/ajustes' }, h('strong', {}, 'Ajustes'), h('span', {}, 'Versiones, apariencia, descargas y respaldo')))),
    h('p', { class: 'desk-foot' },
      off.complete ? 'Todos los textos están guardados en este equipo: puede leer y buscar sin internet. ' : off.supported ? `${off.cachedBooks} de ${off.totalBooks} libros guardados para usar sin internet (Ajustes → Uso sin conexión). ` : '',
      `En este equipo: ${c.studies} estudios, ${c.notes} notas, ${c.highlights} resaltados, ${c.docs} documentos.`),
  );
}
