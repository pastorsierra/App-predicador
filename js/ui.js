// Utilidades de interfaz: creación segura de nodos (sin innerHTML con datos del usuario), íconos, avisos, diálogos.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElementNS(tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'line' || tag === 'polyline' || tag === 'rect' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v; // solo para contenido estático propio
    else if (k === 'value' || k === 'checked' || k === 'selected') el[k] = v;
    else if (k in el && typeof v !== 'string' && k !== 'list' && !(el instanceof SVGElement)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

// Íconos de trazo fino (propios)
const P = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H20v16H5.5A1.5 1.5 0 0 0 4 20.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H20v-3',
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5',
  study: 'M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14',
  notebook: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9 7h7M9 11h7M9 15h4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.3 1 2-3.4z',
  left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', close: 'M6 6l12 12M18 6 6 18', down: 'M6 9l6 6 6-6',
  bookmark: 'M6 3h12v18l-6-4-6 4z', star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6',
  copy: 'M8 8h12v12H8zM4 16V4h12', share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  plus: 'M12 5v14M5 12h14', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  layers: 'M12 3 2 8l10 5 10-5zM2 13l10 5 10-5', words: 'M4 6h16M4 12h10M4 18h7M17 15l3 3-3 3',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14', print: 'M7 9V3h10v6M7 18H4v-8h16v8h-3M7 14h10v7H7z',
  check: 'M5 12l5 5 9-10', map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14', type: 'M5 6V4h14v2M12 4v16M9 20h6', moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
};
export function icon(name, size = 20) {
  return h('svg', { class: 'icon', viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    h('path', { d: P[name] || '' }));
}

let toastTimer;
export function toast(msg, kind = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

// Diálogo modal accesible. content: Node. actions: [{label, primary, danger, onClick -> bool|Promise}]
export function modal({ title, content, actions = [], wide = false }) {
  const root = document.getElementById('modal-root');
  return new Promise(resolve => {
    const close = (val) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const box = h('div', { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', { class: 'modal-head' }, h('h2', {}, title),
        h('button', { class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => close(null) }, icon('close'))),
      h('div', { class: 'modal-body' }, content),
      actions.length ? h('footer', { class: 'modal-foot' }, actions.map(a =>
        h('button', { class: `btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}`, onclick: async () => {
          const r = a.onClick ? await a.onClick() : a.value;
          if (r !== false) close(r === undefined ? a.value ?? true : r);
        } }, a.label))) : null);
    const wrap = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(null); } }, box);
    root.append(wrap);
    document.addEventListener('keydown', onKey);
    const f = box.querySelector('textarea, input, select');
    setTimeout(() => (f || box.querySelector('button')).focus(), 30);
  });
}

export async function confirmDialog(title, text, okLabel = 'Eliminar') {
  return !!(await modal({ title, content: h('p', {}, text), actions: [
    { label: 'Cancelar', value: false }, { label: okLabel, danger: true, value: true }] }));
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Nombre de archivo seguro: sin tildes ni caracteres prohibidos (algunos navegadores descartan el nombre si los lleva).
// El contenido del archivo sí conserva sus tildes.
export function safeFileName(name) {
  return String(name || 'archivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ñÑ]/g, m => (m === 'ñ' ? 'n' : 'N'))
    .replace(/[^\w.()\- ]+/g, '').replace(/\s+/g, ' ').trim() || 'archivo';
}

export function download(filename, text, type = 'application/json') {
  filename = safeFileName(filename);
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click();
  // Quitar el enlace de inmediato hace que algunos navegadores pierdan el nombre del archivo
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text;
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

export function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
