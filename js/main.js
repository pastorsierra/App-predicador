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
import { renderDoctrinas, renderDoctrina } from './views/doctrinas.js';
import { renderHermeneutica, renderEvaluacion } from './views/hermeneutica.js';
import { renderEnsenanzas, renderEnsenanza, renderArchivoItem, renderEditor } from './views/ensenanzas.js';

const NAV = [
  ['inicio', 'Inicio', 'home'],
  ['biblia', 'Biblia', 'book'],
  ['ensenanzas', 'Enseñanzas', 'note'],
  ['estudios', 'Estudios', 'study'],
  ['buscar', 'Buscar', 'search'],
  ['cuaderno', 'Cuaderno', 'notebook'],
  ['atlas', 'Atlas', 'map'],
  ['ajustes', 'Ajustes', 'settings'],
];

function buildNav() {
  const nav = document.getElementById('nav');
  const tab = document.getElementById('tabbar');
  clear(nav); clear(tab);
  for (const [id, name, ic] of NAV) {
    nav.append(h('li', {}, h('a', { href: `#/${id}`, 'data-route': id }, icon(ic), h('span', {}, name))));
    if (id !== 'ajustes' && id !== 'atlas') tab.append(h('a', { href: `#/${id}`, 'data-route': id }, icon(ic, 22), h('span', {}, name)));
  }
  updateOnline();
}

function updateOnline() {
  const foot = document.getElementById('sidebar-foot');
  clear(foot).append(h('span', { class: `dot ${navigator.onLine ? 'on' : 'off'}` }), navigator.onLine ? 'En línea' : 'Sin conexión');
}

function markActive(route) {
  document.querySelectorAll('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === route));
}

export function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  const name = parts[0] || 'inicio';
  const view = document.getElementById('view');
  closePanel();
  markActive({ estudio: 'estudios', doctrinas: 'estudios', doctrina: 'estudios', hermeneutica: 'estudios', evaluacion: 'estudios', ensenanza: 'ensenanzas', archivo: 'ensenanzas' }[name] || name);
  clear(view);
  view.className = `view view-${name}`;
  try {
    switch (name) {
      case 'inicio': await renderHome(view); break;
      case 'biblia': await renderReader(view, parts[1], parts[2] ? +parts[2] : null, params.get('v')); break;
      case 'buscar': await renderSearch(view, params); break;
      case 'estudios': await renderStudies(view); break;
      case 'estudio': await renderStudy(view, parts[1]); break;
      case 'cuaderno': await renderNotebook(view, parts[1] || 'notas'); break;
      case 'ensenanzas': await renderEnsenanzas(view, parts[1] || 'mis'); break;
      case 'ensenanza': if (parts[2] === 'editar') await renderEditor(view, parts[1]); else await renderEnsenanza(view, parts[1]); break;
      case 'archivo': await renderArchivoItem(view, parts[1]); break;
      case 'atlas': await renderAtlas(view, parts[1]); break;
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
  if (!parts[2] || !params.get('v')) view.scrollTop = 0;
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
  buildNav();
  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => { updateOnline(); toast('Conexión restablecida'); });
  window.addEventListener('offline', () => { updateOnline(); toast('Sin conexión: se usan los textos descargados'); });
  await route();
  requestPersistence();
  // Trae solo lo nuevo del Taller (mismo equipo y GitHub), sin pedir nada al usuario
  import('./taller/sync.js').then(m => m.autoSync()).then(r => {
    if (!r) return;
    const parts = [];
    if (r.nuevas || r.actualizadas) parts.push(`${r.nuevas} enseñanzas nuevas y ${r.actualizadas} actualizadas`);
    if (r.biblias.length) parts.push(`Biblias: ${r.biblias.join(', ')}`);
    if (r.clave) parts.push('archivo de enseñanzas abierto');
    if (parts.length) { toast(`Traído del Taller: ${parts.join(' · ')}`); if ((/^#\/(inicio|ensenanzas)(\/(mis|series|calendario))?$/.test(location.hash) || !location.hash || location.hash === '#/') && !document.querySelector('.modal-wrap')) route(); }
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
