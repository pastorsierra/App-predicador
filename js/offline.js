// Gestión de descargas para uso sin conexión (Cache API, compartida con el Service Worker).
import { BOOKS } from './books.js';

export const DATA_CACHE = 'escudrinad-datos-v1';

export const PACKS = [
  { id: 'rv1909', name: 'Reina-Valera 1909 (con números Strong)', files: () => BOOKS.map(b => `data/rv1909/${b.id}.json`) },
  { id: 'bes', name: 'Biblia en Español Sencillo', files: () => BOOKS.map(b => `data/bes/${b.id}.json`) },
  { id: 'xref', name: 'Referencias cruzadas', files: () => BOOKS.map(b => `data/xref/${b.id}.json`) },
  { id: 'strong', name: 'Léxico Strong (hebreo y griego)', files: () => ['data/strong/H.json', 'data/strong/G.json'] },
];

const supported = () => 'caches' in window;
const abs = (p) => new URL(p, location.href).href;

export async function packStatus(pack) {
  if (!supported()) return { have: 0, total: pack.files().length };
  const c = await caches.open(DATA_CACHE);
  const files = pack.files();
  let have = 0;
  for (const f of files) if (await c.match(abs(f))) have++;
  return { have, total: files.length };
}

export async function offlineStatus() {
  if (!supported()) return { supported: false, cachedBooks: 0, totalBooks: BOOKS.length, complete: false };
  const st = await Promise.all(PACKS.map(packStatus));
  return { supported: true, cachedBooks: st[0].have, totalBooks: st[0].total, complete: st.every(s => s.have === s.total), packs: st };
}

export async function downloadPack(pack, onProgress) {
  if (!supported()) throw new Error('Este navegador no permite guardar datos para uso sin conexión.');
  const c = await caches.open(DATA_CACHE);
  const files = pack.files();
  let done = 0, failed = 0;
  const queue = [...files];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      try {
        if (!(await c.match(abs(f)))) {
          const r = await fetch(f, { cache: 'no-cache' });
          if (!r.ok) throw new Error(r.status);
          await c.put(abs(f), r);
        }
      } catch (e) { failed++; }
      done++; onProgress && onProgress(done, files.length);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  if (failed) throw new Error(`${failed} archivo(s) no se pudieron descargar. Verifique la conexión e intente de nuevo.`);
}

export async function removePack(pack) {
  if (!supported()) return;
  const c = await caches.open(DATA_CACHE);
  for (const f of pack.files()) await c.delete(abs(f));
}

export async function storageEstimate() {
  try { return await navigator.storage.estimate(); } catch (e) { return null; }
}
