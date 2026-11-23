// Panel contextual: lateral en iPad/pantallas anchas, hoja inferior en iPhone.
import { h, clear, icon } from '../ui.js';

let onCloseCb = null;

export function openPanel(title, content, onClose) {
  const p = document.getElementById('panel');
  const bd = document.getElementById('sheet-backdrop');
  onCloseCb = onClose || null;
  clear(p).append(
    h('div', { class: 'panel-grip', 'aria-hidden': 'true' }),
    h('header', { class: 'panel-head' },
      h('h2', {}, title),
      h('button', { class: 'icon-btn', 'aria-label': 'Cerrar panel', onclick: () => closePanel() }, icon('close'))),
    h('div', { class: 'panel-body' }, content));
  p.hidden = false;
  document.getElementById('app').classList.add('with-panel');
  bd.hidden = false;
  bd.onclick = () => closePanel();
  return p.querySelector('.panel-body');
}

export function setPanelTitle(t) {
  const el = document.querySelector('#panel .panel-head h2'); if (el) el.textContent = t;
}

export function closePanel() {
  const p = document.getElementById('panel');
  if (p.hidden) return;
  p.hidden = true; clear(p);
  document.getElementById('app').classList.remove('with-panel');
  document.getElementById('sheet-backdrop').hidden = true;
  const cb = onCloseCb; onCloseCb = null; if (cb) cb();
}

export const panelOpen = () => !document.getElementById('panel').hidden;
