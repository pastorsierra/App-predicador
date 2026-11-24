// Persistencia local real en IndexedDB.
// Cada registro lleva: id, createdAt, updatedAt, deletedAt (borrado lógico) — listo para sincronizar en la Fase de nube.
const DB_NAME = 'escudrinad';
const DB_VERSION = 6;
export const SECRET_SETTINGS = ['tallerLibKey', 'githubTaller', 'aiUrl', 'aiCode', 'aiAnon', 'aiReady', 'aiModel'];
export const STORES = ['notes', 'highlights', 'favorites', 'bookmarks', 'studies', 'history', 'settings', 'sermons', 'doctrines', 'outlines', 'docs'];

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      const mk = (name, idx = []) => {
        const s = db.createObjectStore(name, { keyPath: 'id' });
        for (const i of idx) s.createIndex(i, i, { unique: false });
      };
      // Migraciones por versión: nunca se borra ni se recrea un almacén existente
      if (e.oldVersion < 1) {
        mk('notes', ['chap', 'ref', 'updatedAt']);
        mk('highlights', ['chap']);
        mk('favorites', ['chap']);
        mk('bookmarks', ['updatedAt']);
        mk('studies', ['updatedAt']);
        mk('history', ['at']);
        mk('settings');
      }
      if (e.oldVersion < 2) mk('sermons', ['updatedAt']); // Enseñanzas (Taller del Predicador)
      if (e.oldVersion < 4) mk('doctrines', ['updatedAt']); // Biblioteca doctrinal
      if (e.oldVersion < 5) mk('outlines', ['updatedAt']); // Bosquejos (Taller del predicador)
      if (e.oldVersion < 6) { mk('docs', ['updatedAt']); mk('docfiles'); } // Biblioteca: ficha (en respaldos) y archivo + texto (solo en el dispositivo)
      if (e.oldVersion < 3) mk('bibles'); // Biblias personales del usuario (no se publican ni van en respaldos)
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña abierta.'));
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Operación cancelada'));
  }));
}
const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
export const now = () => new Date().toISOString();

export async function put(store, obj) {
  const rec = { ...obj };
  rec.id = rec.id || uid();
  rec.createdAt = rec.createdAt || now();
  rec.updatedAt = now();
  if (!('deletedAt' in rec)) rec.deletedAt = null;
  await tx(store, 'readwrite', s => req2p(s.put(rec)));
  notify(store);
  return rec;
}

export async function get(store, id) {
  const r = await tx(store, 'readonly', s => req2p(s.get(id)));
  return r && !r.deletedAt ? r : null;
}

export async function all(store, { includeDeleted = false } = {}) {
  const r = await tx(store, 'readonly', s => req2p(s.getAll()));
  return includeDeleted ? r : r.filter(x => !x.deletedAt);
}

export async function byIndex(store, index, value) {
  const r = await tx(store, 'readonly', s => req2p(s.index(index).getAll(value)));
  return r.filter(x => !x.deletedAt);
}

// Borrado lógico (se conserva la marca para sincronización y recuperación)
export async function remove(store, id) {
  const r = await tx(store, 'readonly', s => req2p(s.get(id)));
  if (!r) return;
  r.deletedAt = now(); r.updatedAt = now();
  await tx(store, 'readwrite', s => req2p(s.put(r)));
  notify(store);
}

// Ajustes (clave/valor)
export async function getSetting(key, fallback = null) {
  const r = await tx('settings', 'readonly', s => req2p(s.get(key)));
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  await tx('settings', 'readwrite', s => req2p(s.put({ id: key, value, updatedAt: now() })));
}

// Historial: un registro por clave, se actualiza la fecha de visita
export async function touchHistory(kind, key, title) {
  const id = `${kind}:${key}`;
  await tx('history', 'readwrite', s => req2p(s.put({ id, kind, key, title, at: now(), updatedAt: now(), deletedAt: null })));
}
export async function recentHistory(kind, limit = 20) {
  const r = await all('history');
  return r.filter(x => !kind || x.kind === kind).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// Respaldo completo
export async function exportAll() {
  const data = { app: 'escudrinad', format: 1, exportedAt: now(), stores: {} };
  for (const s of STORES) data.stores[s] = await all(s, { includeDeleted: true });
  // Las claves nunca salen del dispositivo (ni en respaldos)
  data.stores.settings = data.stores.settings.filter(x => !SECRET_SETTINGS.includes(x.id));
  return data;
}

// Importa un respaldo: fusiona por id conservando la versión más reciente
export async function importAll(data) {
  if (!data || data.app !== 'escudrinad' || !data.stores) throw new Error('El archivo no es un respaldo válido de Escudriñad.');
  let n = 0;
  for (const s of STORES) {
    const incoming = data.stores[s] || [];
    if (!incoming.length) continue;
    await tx(s, 'readwrite', async store => {
      for (const rec of incoming) {
        if (!rec || !rec.id) continue;
        if (s === 'settings' && SECRET_SETTINGS.includes(rec.id)) continue;
        const cur = await req2p(store.get(rec.id));
        if (!cur || (rec.updatedAt || '') > (cur.updatedAt || '')) { store.put(rec); n++; }
      }
    });
    notify(s);
  }
  return n;
}

export async function counts() {
  const out = {};
  for (const s of ['notes', 'highlights', 'favorites', 'bookmarks', 'studies', 'sermons', 'docs']) out[s] = (await all(s)).length;
  return out;
}

// Suscripción a cambios (para refrescar vistas)
const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify(store) { for (const fn of listeners) try { fn(store); } catch (e) { console.error(e); } }

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) { /* no disponible */ }
  return false;
}
