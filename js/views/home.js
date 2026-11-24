import { h, icon, fmtDate } from '../ui.js';
import { BOOK } from '../books.js';
import { parseRef, refToKey } from '../ref.js';
import { recentHistory, counts } from '../db.js';
import { listStudies } from '../study.js';
import { S } from '../state.js';
import { hrefFor } from './verse.js';
import { offlineStatus } from '../offline.js';

export async function renderHome(view) {
  const q = h('input', { type: 'search', placeholder: 'Pasaje, palabra, frase "entre comillas" o Strong (G26)', 'aria-label': 'Buscar', enterkeyhint: 'search' });
  const form = h('form', { class: 'hero-search', onsubmit: (e) => {
    e.preventDefault();
    const v = q.value.trim(); if (!v) return;
    const r = parseRef(v);
    if (r && r.ch && !r.error) { location.hash = r.v ? hrefFor(refToKey(r)) : `#/biblia/${r.book}/${r.ch}`; return; }
    location.hash = `#/buscar?q=${encodeURIComponent(v)}`;
  } }, icon('search'), q, h('button', { class: 'btn primary', type: 'submit' }, 'Buscar'));

  const pos = S.lastPos;
  const [reading, studies, c, off] = await Promise.all([recentHistory('lectura', 6), listStudies(), counts(), offlineStatus()]);

  view.append(
    h('header', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Escudriñad las Escrituras · Juan 5:39'), h('h1', {}, 'Inicio')),
      h('a', { class: 'icon-btn only-phone', href: '#/ajustes', 'aria-label': 'Ajustes' }, icon('settings'))),
    form,
    h('section', { class: 'cards' },
      h('a', { class: 'card continue', href: `#/biblia/${pos.book}/${pos.ch}` },
        h('span', { class: 'card-label' }, 'Continuar lectura'), h('span', { class: 'card-title' }, `${BOOK[pos.book].name} ${pos.ch}`), h('span', { class: 'card-sub' }, 'Reina-Valera 1909')),
      h('a', { class: 'card', href: '#/ensenanzas/mis' },
        h('span', { class: 'card-label' }, 'Enseñanzas'), h('span', { class: 'card-title' }, `${c.sermons}`), h('span', { class: 'card-sub' }, c.sermons ? 'Sus enseñanzas, series y calendario' : 'Traiga sus enseñanzas del Taller')),
      h('a', { class: 'card', href: '#/estudios' },
        h('span', { class: 'card-label' }, 'Mis estudios'), h('span', { class: 'card-title' }, `${c.studies}`), h('span', { class: 'card-sub' }, studies[0] ? `Último: ${studies[0].title}` : 'Aún no ha creado estudios')),
      h('a', { class: 'card', href: '#/cuaderno/notas' },
        h('span', { class: 'card-label' }, 'Cuaderno'), h('span', { class: 'card-title' }, `${c.notes}`), h('span', { class: 'card-sub' }, `notas · ${c.favorites} favoritos · ${c.highlights} resaltados · ${c.bookmarks} marcadores`)),
      h('a', { class: 'card', href: '#/atlas' },
        h('span', { class: 'card-label' }, 'Atlas bíblico'), h('span', { class: 'card-title small' }, 'Más de mil lugares'), h('span', { class: 'card-sub' }, 'Mapa sin conexión, con los versículos de cada lugar')),
      h('a', { class: 'card', href: '#/biblioteca' },
        h('span', { class: 'card-label' }, 'Biblioteca'), h('span', { class: 'card-title' }, `${c.docs}`), h('span', { class: 'card-sub' }, c.docs ? 'Sus documentos PDF, con búsqueda y citas' : 'Añada sus PDF para leerlos y buscar en ellos')),
      h('a', { class: 'card', href: '#/personajes' },
        h('span', { class: 'card-label' }, 'Personajes'), h('span', { class: 'card-title small' }, 'Más de 3.000 personas'), h('span', { class: 'card-sub' }, 'Familia, genealogía y dónde aparece cada uno')),
      h('a', { class: 'card', href: '#/cronologia' },
        h('span', { class: 'card-label' }, 'Cronología'), h('span', { class: 'card-title small' }, 'De los patriarcas a Patmos'), h('span', { class: 'card-sub' }, 'Períodos con fechas aproximadas y sus debates')),
      h('a', { class: 'card', href: '#/ajustes' },
        h('span', { class: 'card-label' }, 'Uso sin conexión'), h('span', { class: 'card-title small' }, off.complete ? 'Biblioteca descargada' : off.supported ? `${off.cachedBooks} de ${off.totalBooks} libros guardados` : 'No disponible en este navegador'),
        h('span', { class: 'card-sub' }, off.complete ? 'Puede leer y buscar sin internet' : 'Descargue los textos desde Ajustes'))),
    reading.length ? h('section', { class: 'block' }, h('h2', {}, 'Lecturas recientes'),
      h('ul', { class: 'chip-list' }, reading.map(r => h('li', {}, h('a', { class: 'chip', href: `#/biblia/${r.key.replace('.', '/')}` }, r.title))))) : null,
    studies.length ? h('section', { class: 'block' }, h('h2', {}, 'Estudios recientes'),
      h('ul', { class: 'list' }, studies.slice(0, 5).map(s => h('li', {}, h('a', { href: `#/estudio/${s.id}` }, h('strong', {}, s.title), h('span', {}, `${s.passageLabel} · ${fmtDate(s.updatedAt)}`)))))) : null,
    h('section', { class: 'block roadmap-note' }, h('h2', {}, 'En desarrollo'),
      h('p', {}, 'Ya funcionan: lectura y comparación de versiones, palabras originales, estudios y exégesis, hermenéutica, doctrinas, enseñanzas del Taller, bosquejos y diapositivas, biblioteca de documentos, atlas, personajes y cronología. El asistente de IA está listo y se activa en Ajustes cuando tenga su clave de Anthropic. Falta la sincronización propia entre equipos; no aparece como botón hasta que funcione.')),
  );
}
