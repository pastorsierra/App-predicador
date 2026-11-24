// Personajes bíblicos (búsqueda, ficha, familia y versículos) y Cronología bíblica (períodos con rangos y aclaraciones).
import { h, clear, icon } from '../ui.js';
import { norm } from '../books.js';
import { label } from '../ref.js';
import { getVerse, plain } from '../bible.js';
import { hrefFor } from './verse.js';
import { S } from '../state.js';
import { loadPeople, person, people, personByEn, who } from '../people.js';
import { PERIODOS } from '../chronology.js';

const head = (t, sub) => h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, t), sub ? h('p', { class: 'hint' }, sub) : null));
const toolTabs = (a) => h('nav', { class: 'tabs page-tabs', 'aria-label': 'Herramientas' },
  [['personajes', 'Personajes'], ['cronologia', 'Cronología'], ['atlas', 'Atlas']].map(([id, n]) => h('a', { href: `#/${id}`, 'aria-selected': id === a ? 'true' : 'false' }, n)));
const SRC = 'Datos de personas y parentescos: Theographic Bible Metadata (CC BY-SA 4.0), construidos a partir de los nombres propios del texto bíblico. Nombres en español tomados de la Reina-Valera 1909.';

function refList(keys, max = 40) {
  const ul = h('ul', { class: 'ref-list' });
  for (const k of keys.slice(0, max)) {
    const li = h('li', {}, h('a', { href: hrefFor(k) }, label(k)), h('span', { class: 'ref-preview' }, '…')); ul.append(li);
    const [b, c, v] = k.split('.'); const vv = String(v).split('-')[0];
    const put = (t) => { li.querySelector('.ref-preview').textContent = plain(t); };
    getVerse(S.version || 'rv1909', b, +c, +vv).then(put).catch(() => getVerse('rv1909', b, +c, +vv).then(put).catch(() => {}));
  }
  return ul;
}

export async function renderPersonajes(view) {
  view.append(head('Personajes bíblicos'), h('div', { class: 'loading small' }, 'Cargando personajes…'));
  const P = await loadPeople();
  clear(view);
  const q = h('input', { type: 'search', placeholder: 'Buscar: Abraham, Débora, Bernabé…', 'aria-label': 'Buscar un personaje', value: sessionStorage.getItem('pq') || '' });
  const g = h('select', { 'aria-label': 'Filtrar' }, h('option', { value: '' }, 'Hombres y mujeres'), h('option', { value: 'H' }, 'Hombres'), h('option', { value: 'M' }, 'Mujeres'));
  const list = h('ul', { class: 'list compact' }); const count = h('p', { class: 'hint' });
  const draw = () => {
    const t = norm(q.value.trim()); const tc = t.replace(/[^a-z0-9]/g, ''); sessionStorage.setItem('pq', q.value);
    const all = P.filter(p => (!g.value || p.g === g.value) && (!t || p._n.includes(t) || (tc && p._c.includes(tc))));
    all.sort((a, b) => (t ? (norm(b.n) === t) - (norm(a.n) === t) : 0) || b.k - a.k);
    clear(list);
    for (const p of all.slice(0, 80)) list.append(h('li', {}, h('a', { href: `#/personaje/${p.id}` },
      h('strong', {}, p.n), h('span', {}, [who(p), `${p.k} ${p.k === 1 ? 'mención' : 'menciones'}`, p.v[0] ? `aparece en ${label(p.v[0], true)}` : ''].filter(Boolean).join(' · ')))));
    if (!all.length) list.append(h('li', { class: 'empty' }, 'Ningún personaje coincide.'));
    count.textContent = t ? `${all.length} coincidencia${all.length === 1 ? '' : 's'}${all.length > 80 ? ' (se muestran 80)' : ''}` : `${P.length} personas registradas. Se muestran las más mencionadas.`;
  };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 150); }); g.addEventListener('change', draw);
  view.append(head('Personajes bíblicos'), toolTabs('personajes'), h('div', { class: 'toolbar' }, q, g), count, list, h('p', { class: 'hint' }, SRC));
  draw();
}

export async function renderPersonaje(view, id) {
  await loadPeople();
  const p = person(id);
  if (!p) { view.append(head('Personajes bíblicos'), h('div', { class: 'empty' }, 'No se encontró ese personaje.'), h('a', { class: 'btn', href: '#/personajes' }, 'Ver todos')); return; }
  const fam = (t, ids) => { const L = people(ids); return L.length ? h('div', { class: 'fam-row' }, h('span', { class: 'fam-k' }, t), h('span', { class: 'chips' }, L.map(x => h('a', { class: 'chip', href: `#/personaje/${x.id}` }, x.n)))) : null; };
  const G = p.g === 'M';
  const famBox = [fam(G ? 'Padre' : 'Padre', p.fa), fam('Madre', p.mo), fam(G ? 'Esposo' : (p.pa.length > 1 ? 'Esposas' : 'Esposa'), p.pa), fam('Hermanos', p.si), fam('Hijos', p.ch)].filter(Boolean);
  // Abuelos y nietos: una generación más arriba y abajo, solo si la fuente los registra
  const abuelos = [...new Set([...people(p.fa), ...people(p.mo)].flatMap(x => [...x.fa, ...x.mo]))];
  const nietos = [...new Set(people(p.ch).flatMap(x => x.ch))];
  const per = PERIODOS.filter(x => x.gente.some(g => personByEn(g) === p));
  const homon = (await loadPeople()).filter(x => x !== p && x.n === p.n).length;
  view.append(...[head(p.n, [p.en !== p.n ? `en inglés: ${p.en}` : '', p.aka ? `también llamado: ${p.aka.split(',').map(x => x.trim()).join(', ')}` : '', `${p.k} ${p.k === 1 ? 'mención' : 'menciones'} en la Biblia`].filter(Boolean).join(' · ')), toolTabs('personajes'),
    homon ? h('p', { class: 'hint' }, `Hay otras ${homon} persona${homon === 1 ? '' : 's'} con el nombre ${p.n} en la Biblia. `, h('a', { href: '#/personajes', onclick: () => sessionStorage.setItem('pq', p.n) }, 'Verlas')) : null,
    h('section', { class: 'block' }, h('h2', {}, 'Familia'),
      famBox.length ? h('div', { class: 'fam' }, famBox, fam('Abuelos', abuelos), fam('Nietos', nietos)) : h('p', { class: 'hint' }, 'La fuente no registra parientes de esta persona.')),
    per.length ? h('section', { class: 'block' }, h('h2', {}, 'Época'), h('ul', { class: 'list compact' }, per.map(x => h('li', {}, h('a', { href: `#/cronologia/${x.id}` }, h('strong', {}, x.t), h('span', {}, x.rango)))))) : null,
    h('section', { class: 'block' }, h('h2', {}, 'Dónde aparece'), refList(p.v),
      p.v.length > 40 ? h('p', { class: 'hint' }, `Se muestran 40 de ${p.v.length} versículos.`) : null,
      h('a', { class: 'btn small', href: `#/buscar?q=${encodeURIComponent(p.n)}` }, icon('search', 16), `Buscar «${p.n}» en toda la Biblia`)),
    h('p', { class: 'hint' }, SRC, ' Los parentescos siguen las genealogías bíblicas; cuando un nombre lo llevan varias personas, la fuente decide a cuál se refiere cada versículo y puede haber casos discutidos.')].filter(Boolean));
}

export async function renderCronologia(view, anchor) {
  await loadPeople().catch(() => null);
  const min = -2200, max = 100, pos = (y) => `${((y - min) / (max - min)) * 100}%`;
  const bar = h('div', { class: 'chrono-bar', 'aria-hidden': 'true' },
    PERIODOS.filter(x => x.a != null).map(x => h('a', { href: `#/cronologia/${x.id}`, class: 'chrono-seg', title: `${x.t} (${x.rango})`, style: `left:${pos(x.a)};width:max(3px, calc(${pos(x.b)} - ${pos(x.a)}))` })),
    [-2000, -1500, -1000, -500, 1].map(y => h('span', { class: 'chrono-tick', style: `left:${pos(y)}` }, y < 0 ? `${-y} a.C.` : '1 d.C.')));
  const items = PERIODOS.map(x => {
    const gente = x.gente.map(personByEn).filter(Boolean);
    return h('li', { class: 'chrono-item', id: x.id },
      h('div', { class: 'chrono-date' }, x.rango),
      h('div', { class: 'chrono-body' }, h('h3', {}, x.t), h('p', {}, x.nota),
        h('p', { class: 'chips' }, x.refs.map(k => h('a', { class: 'chip', href: hrefFor(k) }, label(k, true)))),
        gente.length ? h('p', { class: 'chips' }, gente.map(p => h('a', { class: 'chip person', href: `#/personaje/${p.id}` }, icon('user', 14), p.n))) : null));
  });
  view.append(head('Cronología bíblica', 'Fechas aproximadas. Donde los eruditos no coinciden se dan los rangos y el motivo del desacuerdo.'), toolTabs('cronologia'), bar,
    h('ol', { class: 'chrono' }, items),
    h('p', { class: 'hint' }, 'Las fechas anteriores a 931 a.C. dependen de la fecha que se adopte para el éxodo (temprana c. 1446 a.C. según 1 Reyes 6:1, o tardía c. 1270 a.C.); aquí se muestra la temprana y se indica la otra. Las fechas de los reyes y del Nuevo Testamento se apoyan en sincronismos con fuentes asirias, babilónicas, persas y romanas. Ninguna fecha anterior a Abraham es comprobable.'));
  if (anchor) requestAnimationFrame(() => { const el = document.getElementById(anchor); if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'start' }); } });
}
