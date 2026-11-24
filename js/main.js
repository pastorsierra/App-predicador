import { loadManifest } from './bible.js';
import { loadSettings } from './state.js';
import { requestPersistence } from './db.js';
import { h, clear, icon, toast } from './ui.js';
import { closePanel } from './views/panel.js';
import { renderHome } from './views/home.js';
import { renderReader } from './views/reader.js';
import { renderSearch } from './views/search.js';
import { renderStudies, renderStudy } from './views/studies.js';
import { renderNotebook } from './views/notebook.js';
import { renderSettings } from './views/settings.js';
import { renderAtlas } from './views/atlas.js';
import { renderBiblioteca, renderDocumento } from './views/biblioteca.js';
import { renderAsistente } from './views/asistente.js';
import { getSetting } from './db.js';
import { parseRef, refToKey } from './ref.js';
import { TOOLS } from './tools.js';
import { hrefFor } from './views/verse.js';
import { renderPersonajes, renderPersonaje, renderCronologia } from './views/personajes.js';
import { renderDoctrinas, renderDoctrina } from './views/doctrinas.js';
import { renderHermeneutica, renderEvaluacion } from './views/hermeneutica.js';
import { renderMensajes, renderMensaje } from './views/mensajes.js';

// Secciones principales (barra superior en iPad, barra inferior en iPhone)
const NAV = [['biblia', 'Biblia', 'book'], ['estudios', 'Estudios', 'study'], ['biblioteca', 'Biblioteca', 'library'], ['cuaderno', 'Cuaderno', 'notebook']];
const TABS = [['biblia', 'Biblia', 'book'], ['estudios', 'Estudios', 'study'], ['buscar', 'Buscar', 'search'], ['biblioteca', 'Biblioteca', 'library'], ['cuaderno', 'Cuaderno', 'notebook']];
export async function buildNav() {
  const aiReady = await getSetting('aiReady', false);
  const nav = document.getElementById('nav');
  const tab = document.getElementById('tabbar');
  clear(nav); clear(tab);
  for (const [id, name] of NAV) nav.append(h('li', {}, h('a', { href: `#/${id}`, 'data-route': id }, name)));
  const det = h('details', { class: 'tools-menu' }, h('summary', {}, 'Herramientas', icon('down', 14)),
    h('ul', { class: 'menu' }, TOOLS.filter(([id]) => id !== 'asistente' || aiReady).map(([id, n, d]) => h('li', {}, h('a', { href: `#/${id}`, 'data-route': id }, n, h('small', {}, d))))));
  det.addEventListener('click', (e) => { if (e.target.closest('.menu a')) det.open = false; });
  document.addEventListener('click', (e) => { if (!det.contains(e.target)) det.open = false; });
  nav.append(h('li', {}, det), h('li', {}, h('a', { href: '#/ajustes', 'data-route': 'ajustes', class: 'icon-only', 'aria-label': 'Ajustes', title: 'Ajustes' }, icon('settings', 20))));
  for (const [id, name, ic] of TABS) tab.append(h('a', { href: `#/${id}`, 'data-route': id }, icon(ic, 22), h('span', {}, name)));
  updateOnline();
}

function updateOnline() {
  const el = document.getElementById('net');
  if (navigator.onLine) { clear(el); el.hidden = true; return; }
  el.hidden = false; clear(el).append(h('span', { class: 'dot off' }), 'Sin conexión');
}

function wireOmni() {
  const f = document.getElementById('omni'), q = document.getElementById('omni-q');
  f.addEventListener('submit', (e) => {
    e.preventDefault(); const v = q.value.trim(); if (!v) return;
    const r = parseRef(v);
    if (r && r.ch && !r.error) location.hash = r.v ? hrefFor(refToKey(r)) : `#/biblia/${r.book}/${r.ch}`;
    else location.hash = `#/buscar?q=${encodeURIComponent(v)}`;
    q.value = ''; q.blur();
  });
}

function markActive(route) {
  document.querySelectorAll('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  const tm = document.querySelector('.tools-menu'); if (tm) tm.classList.toggle('active', !!tm.querySelector('a.active'));
}

export function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  const name = parts[0] || 'inicio';
  const host = document.getElementById('view');
  closePanel();
  markActive({ estudio: 'estudios', doctrinas: 'estudios', doctrina: 'estudios', hermeneutica: 'estudios', evaluacion: 'estudios', personaje: 'personajes', documento: 'biblioteca', mensajes: 'biblioteca', mensaje: 'biblioteca' }[name] || name);
  clear(host);
  host.className = `view view-${name}`;
  // Cada pantalla se dibuja en su propio contenedor: si el usuario cambia de pantalla antes de que la
  // anterior termine de cargar, esa quedará desconectada y no se mezclará con la nueva.
  const view = h('div', { class: 'view-inner' });
  host.append(view);
  try {
    switch (name) {
      case 'inicio': await renderHome(view); break;
      case 'biblia': await renderReader(view, parts[1], parts[2] ? +parts[2] : null, params.get('v')); break;
      case 'buscar': await renderSearch(view, params); break;
      case 'estudios': await renderStudies(view); break;
      case 'estudio': await renderStudy(view, parts[1]); break;
      case 'cuaderno': await renderNotebook(view, parts[1] || 'notas'); break;
      case 'mensajes': await renderMensajes(view); break;
      case 'mensaje': await renderMensaje(view, parts[1], parts.slice(2).join('/'), params); break;
      case 'atlas': await renderAtlas(view, parts[1]); break;
      case 'biblioteca': await renderBiblioteca(view, params); break;
      case 'asistente': await renderAsistente(view, params); break;
      case 'documento': await renderDocumento(view, parts[1], parts[2], params); break;
      case 'personajes': await renderPersonajes(view); break;
      case 'personaje': await renderPersonaje(view, parts[1]); break;
      case 'cronologia': await renderCronologia(view, parts[1]); break;
      case 'doctrinas': await renderDoctrinas(view); break;
      case 'doctrina': await renderDoctrina(view, parts[1]); break;
      case 'hermeneutica': await renderHermeneutica(view); break;
      case 'evaluacion': await renderEvaluacion(view, parts[1]); break;
      case 'ajustes': await renderSettings(view); break;
      default: view.append(h('div', { class: 'empty' }, 'Página no encontrada.'));
    }
  } catch (e) {
    console.error(e);
    view.append(h('div', { class: 'error-box' }, h('strong', {}, 'No se pudo abrir esta sección. '), e.message || String(e)));
  }
  if (!parts[2] || !params.get('v')) host.scrollTop = 0;
}

async function start() {
  const view = document.getElementById('view');
  view.append(h('div', { class: 'loading' }, 'Cargando…'));
  try {
    await loadManifest();
    await loadSettings();
  } catch (e) {
    clear(view).append(h('div', { class: 'error-box' }, 'No se pudieron cargar los datos iniciales. ', e.message));
    return;
  }
  await buildNav();
  wireOmni();
  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => { updateOnline(); toast('Conexión restablecida'); });
  window.addEventListener('offline', () => { updateOnline(); toast('Sin conexión: se usan los textos descargados'); });
  await route();
  requestPersistence();
  // Trae solo lo nuevo del Taller (mismo equipo y GitHub), sin pedir nada al usuario
  import('./taller/sync.js').then(m => m.autoSync()).then(r => {
    if (!r) return;
    const parts = [];
    if (r.nuevas || r.actualizadas) parts.push(`${r.nuevas} mensajes nuevos y ${r.actualizadas} actualizados`);
    if (r.biblias.length) parts.push(`Biblias: ${r.biblias.join(', ')}`);
    if (r.clave) parts.push('archivo de mensajes abierto');
    if (parts.length) { toast(`Traído del Taller: ${parts.join(' · ')}`); if ((/^#\/(inicio|mensajes)$/.test(location.hash) || !location.hash || location.hash === '#/') && !document.querySelector('.modal-wrap')) route(); }
  }).catch(e => console.warn('Sincronización con el Taller', e));
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js');
      // Al publicar una versión nueva, el Service Worker nuevo toma el control: se avisa y se recarga la interfaz.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) return; // primera instalación: no hace falta recargar
        toast('Se instaló una versión nueva de la aplicación');
        setTimeout(() => location.reload(), 1500);
      });
      // Buscar actualizaciones al volver a la app
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    } catch (e) { console.warn('Service Worker no registrado', e); }
  }
}

start();
