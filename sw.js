// Service Worker: aplicación disponible sin conexión.
// - Interfaz (shell): precache versionado; red primero para actualizar, caché si no hay conexión.
// - Datos bíblicos (data/): caché primero; lo que se consulta queda guardado para uso sin conexión.
const VERSION = 'v0.9.0';
const SHELL = `escudrinad-shell-${VERSION}`;
const DATA = 'escudrinad-datos-v1';
const SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/books.js', 'js/ref.js', 'js/bible.js', 'js/db.js', 'js/ui.js', 'js/search.js', 'js/study.js', 'js/state.js', 'js/offline.js',
  'js/views/panel.js', 'js/views/atlas.js', 'js/atlas.js', 'js/bibles.js', 'js/taller/sync.js', 'js/doctrines.js', 'js/views/doctrinas.js', 'js/views/hermeneutica.js', 'js/outlines.js', 'js/views/predicacion.js', 'data/atlas/lugares.json', 'data/atlas/mapa.json', 'js/people.js', 'js/chronology.js', 'js/views/personajes.js', 'js/library.js', 'js/views/biblioteca.js', 'js/ai.js', 'js/views/asistente.js', 'data/personajes/personas.json', 'js/views/ensenanzas.js', 'js/taller/page.js', 'js/taller/store.js', 'js/taller/wordgen.js', 'js/taller/logo.js', 'css/taller.css', 'vendor/docx.js', 'js/views/home.js', 'js/views/reader.js', 'js/views/verse.js', 'js/views/search.js', 'js/views/studies.js', 'js/views/notebook.js', 'js/views/settings.js',
  'data/manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' evita copiar archivos viejos de la caché HTTP del navegador (GitHub Pages guarda 10 min)
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('escudrinad-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname;
  // Archivo cifrado de enseñanzas del Taller (otra carpeta del mismo sitio): red primero, copia guardada sin conexión
  if (/\.enc$/.test(path)) {
    e.respondWith(caches.open(DATA).then(async c => {
      try { const r = await fetch(e.request, { cache: 'no-cache' }); if (r.ok) c.put(e.request.url, r.clone()); return r; }
      catch (err) { return (await c.match(e.request.url)) || Response.error(); }
    }));
    return;
  }
  // Textos bíblicos y el lector de PDF (pesado): caché primero; se guardan la primera vez que se usan
  if (/\/data\/(rv1909|bes|pdt|vbl|xref|strong)\//.test(path) || /\/vendor\/pdfjs\//.test(path)) {
    e.respondWith(caches.open(DATA).then(async c => {
      const hit = await c.match(e.request.url);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request.url, r.clone());
      return r;
    }));
    return;
  }
  // Shell: red primero (para recibir actualizaciones), caché como respaldo
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
