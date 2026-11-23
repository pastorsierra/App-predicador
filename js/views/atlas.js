// Atlas bíblico: mapa sin conexión, búsqueda de lugares y ficha con los versículos donde aparecen.
import { h, clear, icon } from '../ui.js';
import { norm } from '../books.js';
import { label } from '../ref.js';
import { getVerse, plain } from '../bible.js';
import { loadAtlas, refKey, xy, typeName } from '../atlas.js';
import { hrefFor } from './verse.js';
import { S } from '../state.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
let VB = null; // vista del mapa recordada entre pantallas

export async function renderAtlas(view, sel) {
  view.append(h('header', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Herramientas'), h('h1', {}, 'Atlas bíblico'))),
    h('div', { class: 'loading small' }, 'Abriendo el mapa…'));
  const { L, M } = await loadAtlas();
  clear(view);
  const q = h('input', { type: 'search', placeholder: 'Buscar un lugar: Nínive, Betel, Galacia…', 'aria-label': 'Buscar un lugar' });
  const types = [...new Set(L.map(p => p.t))].sort((a, b) => typeName(a).localeCompare(typeName(b), 'es'));
  const tsel = h('select', { 'aria-label': 'Tipo de lugar' }, h('option', { value: '' }, 'Todos los tipos'), types.map(t => h('option', { value: t }, typeName(t))));
  const list = h('ul', { class: 'list compact atlas-list' });
  const detail = h('div', { class: 'atlas-detail' });
  const svg = svgEl('svg', { class: 'atlas-map', role: 'img', 'aria-label': 'Mapa de las tierras bíblicas', viewBox: `0 0 ${M.w} ${M.h}` });
  svg.append(svgEl('rect', { class: 'sea', x: -M.w, y: -M.h, width: M.w * 3, height: M.h * 3 }), svgEl('path', { class: 'land', d: M.land }), svgEl('path', { class: 'lake', d: M.lakes }), svgEl('path', { class: 'river', d: M.rivers }));
  const gPts = svgEl('g'); svg.append(gPts);
  const full = { x: 0, y: 0, w: M.w, h: M.h };
  const [x1, y1] = xy({ x: 33.6, y: 33.6 }, M), [x2, y2] = xy({ x: 36.6, y: 29.6 }, M);
  const holy = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  let selected = sel != null ? L[+sel] : null;
  if (!VB) VB = { ...holy };

  const fit = (b) => {
    const r = (svg.clientWidth / svg.clientHeight) || 1.4; let { x, y, w, h: hh } = b;
    if (w / hh > r) { const nh = w / r; y -= (nh - hh) / 2; hh = nh; } else { const nw = hh * r; x -= (nw - w) / 2; w = nw; }
    w = Math.max(3, Math.min(w, M.w * 1.2)); hh = w / r;
    return { x: Math.max(-w * 0.3, Math.min(x, M.w - w * 0.7)), y: Math.max(-hh * 0.3, Math.min(y, M.h - hh * 0.7)), w, h: hh };
  };
  const draw = () => {
    VB = fit(VB);
    svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
    while (gPts.firstChild) gPts.removeChild(gPts.firstChild);
    const px = VB.w / (svg.clientWidth || 600);
    const t = tsel.value;
    const vis = L.filter(p => { const [X, Y] = xy(p, M); return X >= VB.x && X <= VB.x + VB.w && Y >= VB.y && Y <= VB.y + VB.h && (!t || p.t === t); })
      .sort((a, b) => b.k - a.k).slice(0, 220);
    // Etiquetas sin superponerse: primero el lugar elegido, luego los más mencionados
    const labels = new Set(); const boxes = [];
    for (const p of (selected ? [selected] : []).concat(vis)) {
      if (labels.size >= 40) break;
      const [X, Y] = xy(p, M); const w = (p.n.length * 7 + 10) * px, hh = 15 * px;
      const bx = { x: X + 5 * px, y: Y - 10 * px, w, h: hh };
      if (boxes.some(o => bx.x < o.x + o.w && o.x < bx.x + bx.w && bx.y < o.y + o.h && o.y < bx.y + bx.h)) continue;
      boxes.push(bx); labels.add(p.i);
    }
    for (const p of vis.concat(selected && !vis.includes(selected) ? [selected] : [])) {
      const [X, Y] = xy(p, M); const isSel = selected && p.i === selected.i;
      const c = svgEl('circle', { cx: X, cy: Y, r: (isSel ? 6 : p.k > 50 ? 4.5 : 3.5) * px, 'stroke-width': 1.2 * px, class: `pt ${isSel ? 'sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': p.n });
      c.addEventListener('click', () => select(p)); c.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(p); });
      gPts.append(c);
      if (labels.has(p.i)) { const tx = svgEl('text', { x: X + 7 * px, y: Y + 4 * px, 'font-size': 12.5 * px, 'stroke-width': 3 * px, class: `lbl ${isSel ? 'sel' : ''}` }); tx.textContent = p.n; gPts.append(tx); }
    }
  };
  const zoom = (f, cx, cy) => { const nx = cx ?? VB.x + VB.w / 2, ny = cy ?? VB.y + VB.h / 2; VB = { x: nx - (nx - VB.x) * f, y: ny - (ny - VB.y) * f, w: VB.w * f, h: VB.h * f }; draw(); };
  // Arrastrar para mover (dedo o ratón)
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { if (e.target.tagName === 'circle') return; drag = { x: e.clientX, y: e.clientY, vb: { ...VB } }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => { if (!drag) return; const s = VB.w / svg.clientWidth; VB = { ...drag.vb, x: drag.vb.x - (e.clientX - drag.x) * s, y: drag.vb.y - (e.clientY - drag.y) * s }; draw(); });
  svg.addEventListener('pointerup', () => { drag = null; }); svg.addEventListener('pointercancel', () => { drag = null; });
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const r = svg.getBoundingClientRect(); const s = VB.w / r.width; zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, VB.x + (e.clientX - r.left) * s, VB.y + (e.clientY - r.top) * s); }, { passive: false });

  async function select(p, center = false) {
    selected = p;
    if (center) { const [X, Y] = xy(p, M); const w = Math.min(VB.w, holy.w * 0.45); VB = { x: X - w / 2, y: Y - w / 3, w, h: w / 1.4 }; }
    draw(); drawList();
    history.replaceState(null, '', `#/atlas/${p.i}`);
    clear(detail).append(h('h2', {}, p.n), h('p', { class: 'hint' }, [typeName(p.t), p.en && p.en !== p.n ? `en inglés: ${p.en}` : '', `${p.k} mención${p.k === 1 ? '' : 'es'} en la Biblia`, `${p.y.toFixed(3)}°, ${p.x.toFixed(3)}°`].filter(Boolean).join(' · ')));
    const ul = h('ul', { class: 'ref-list' });
    for (const r of p.v.slice(0, 40)) {
      const k = refKey(r); if (!k) continue;
      const li = h('li', {}, h('a', { href: hrefFor(k) }, label(k)), h('span', { class: 'ref-preview' }, '…')); ul.append(li);
      const [b, c, v] = k.split('.');
      getVerse(S.version || 'rv1909', b, +c, +v).then(t => { li.querySelector('.ref-preview').textContent = plain(t); }).catch(() => getVerse('rv1909', b, +c, +v).then(t => { li.querySelector('.ref-preview').textContent = plain(t); }).catch(() => {}));
    }
    detail.append(ul);
    if (p.k > Math.min(40, p.v.length)) detail.append(h('p', { class: 'hint' }, `Se muestran ${Math.min(40, p.v.length)} de ${p.k} menciones. Para verlas todas, busque «${p.n}» en Buscar.`), h('a', { class: 'btn small', href: `#/buscar?q=${encodeURIComponent(p.n)}` }, icon('search', 16), `Buscar «${p.n}»`));
    detail.append(h('p', { class: 'hint' }, 'Ubicación según OpenBible.info. Muchas ubicaciones antiguas son aproximadas o debatidas; esta fuente no indica el grado de certeza de cada una, así que tómela como referencia, no como dato arqueológico confirmado.'));
  }

  const drawList = () => {
    const t = norm(q.value.trim()), ty = tsel.value;
    const tc = t.replace(/[^a-z0-9]/g, '');
    const shown = L.filter(p => (!ty || p.t === ty) && (!t || p._n.includes(t) || (tc && p._c.includes(tc)))).sort((a, b) => b.k - a.k).slice(0, 60);
    clear(list);
    shown.forEach(p => list.append(h('li', {}, h('a', { href: `javascript:void(0)`, class: selected && selected.i === p.i ? 'current' : '', onclick: () => select(p, true) }, h('strong', {}, p.n), h('span', {}, `${typeName(p.t)} · ${p.k} menciones`)))));
    if (!shown.length) list.append(h('li', { class: 'empty' }, 'Ningún lugar coincide.'));
  };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(drawList, 150); });
  tsel.addEventListener('change', () => { drawList(); draw(); });

  view.append(
    h('header', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Herramientas'), h('h1', {}, 'Atlas bíblico'))),
    h('div', { class: 'atlas' },
      h('div', { class: 'atlas-mapbox' }, svg,
        h('div', { class: 'atlas-ctl' },
          h('button', { class: 'btn small', 'aria-label': 'Acercar', onclick: () => zoom(1 / 1.5) }, '+'),
          h('button', { class: 'btn small', 'aria-label': 'Alejar', onclick: () => zoom(1.5) }, '−'),
          h('button', { class: 'btn small', onclick: () => { VB = { ...holy }; draw(); } }, 'Tierra Santa'),
          h('button', { class: 'btn small', onclick: () => { VB = { ...full }; draw(); } }, 'Todo')),
        h('p', { class: 'hint atlas-src' }, 'Lugares: OpenBible.info (CC BY 4.0). Mapa: Natural Earth (dominio público). Funciona sin conexión.')),
      h('div', { class: 'atlas-side' }, h('div', { class: 'toolbar' }, q, tsel), detail, list)));
  requestAnimationFrame(() => { draw(); drawList(); if (selected) select(selected, true); });
  new ResizeObserver(() => draw()).observe(svg);
}
