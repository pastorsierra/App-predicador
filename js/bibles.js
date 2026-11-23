// Biblias personales del usuario (por ejemplo, la RVR1960 que cargó en el Taller del Predicador).
// Formato del Taller: {abbr, name, books:[[nombre, abrev, [[v1, v2…], …]] × 66]} o solo el arreglo de 66 libros.
// Se guardan SOLO en este dispositivo (almacén "bibles"): no se publican, no van en respaldos ni en GitHub.
import { put, get, all, remove } from './db.js';

const mem = new Map(); // id -> registro completo
let listCache = null;

export function validBooks(d) {
  return Array.isArray(d) && d.length === 66 && d.every(b => Array.isArray(b) && Array.isArray(b[2]) && b[2].length > 0 && b[2].every(c => Array.isArray(c) && c.every(v => typeof v === 'string')));
}

// Quita las letras hebreas que algunas ediciones ponen al final de versos del Salmo 119 (misma corrección del Taller)
const RE119 = /\s+(Álef|Alef|Bet|Guímel|Dálet|Dalet|He|Vav|Vau|Zain|Záyin|Zayin|Chet|Jet|Het|Tet|Yod|Caf|Kaf|Lámed|Lamed|Mem|Nun|Sámec|Samec|Sámej|Ayin|Pe|Tsade|Sade|Cof|Qof|Resh|Sin|Shin|Tau|Tav)\.?$/;
function strip119(books) { const ch = books?.[18]?.[2]?.[118]; if (!ch) return; for (let i = 7; i < ch.length; i += 8) if (typeof ch[i] === 'string') ch[i] = ch[i].replace(RE119, ''); }

export function parseBibleJSON(d, fileName = '') {
  let books, abbr, name;
  if (d && Array.isArray(d.books)) { books = d.books; abbr = String(d.abbr || '').trim(); name = String(d.name || abbr); }
  else if (Array.isArray(d)) { books = d; abbr = /1960/.test(fileName) ? 'RVR1960' : fileName.replace(/\.json$/i, '').toUpperCase().slice(0, 12); name = abbr === 'RVR1960' ? 'Reina-Valera 1960' : abbr; }
  if (!abbr) abbr = 'BIBLIA';
  if (!validBooks(books)) throw new Error('El archivo no tiene el formato de Biblia (66 libros con capítulos y versículos).');
  abbr = abbr.replace(/[^\w-]/g, '').toUpperCase() || 'BIBLIA';
  if (abbr === 'RV1909' || abbr === 'BES') abbr += '-PROPIA';
  books = books.map(([n, a, chs]) => [n, a, chs.map(c => c.map(v => v.normalize('NFC')))]);
  strip119(books);
  return { abbr, name: name || abbr, books };
}

export async function installBible({ abbr, name, books }) {
  const rec = { id: abbr, abbr, name, books, verses: books.reduce((n, b) => n + b[2].reduce((m, c) => m + c.length, 0), 0) };
  await put('bibles', rec);
  mem.set(abbr, rec); listCache = null;
  return rec;
}
export async function removeBible(abbr) { await remove('bibles', abbr); mem.delete(abbr); listCache = null; }

export async function listBibles() {
  if (!listCache) listCache = (await all('bibles')).map(b => ({ code: `u:${b.id}`, abbr: b.abbr, name: b.name, verses: b.verses }));
  return listCache;
}
export async function getBible(abbr) {
  if (mem.has(abbr)) return mem.get(abbr);
  const r = await get('bibles', abbr);
  if (r) mem.set(abbr, r);
  return r;
}

// Biblias guardadas por el Taller en ESTE navegador (mismo sitio)
export function readTallerBibles() {
  return new Promise((resolve) => {
    let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => fin([]), 8000);
    try {
      const r = indexedDB.open('taller-predicador');
      r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* no existe */ } fin([]); };
      r.onerror = () => fin([]);
      r.onsuccess = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) { d.close(); return fin([]); }
        const out = []; const q = d.transaction('kv').objectStore('kv').openCursor();
        q.onsuccess = () => {
          const c = q.result;
          if (c) {
            const k = String(c.key);
            if ((k.startsWith('tp_bv_') && !['tp_bv_list', 'tp_bv_main'].includes(k)) || k === 'tp_biblia_user') {
              try { const v = typeof c.value === 'string' ? JSON.parse(c.value) : c.value; if (v) out.push(v.books ? v : { abbr: v.abbr || 'RVR1960', name: v.name, books: v.data }); } catch (e) { /* ignorar */ }
            }
            c.continue();
          } else { d.close(); fin(out); }
        };
        q.onerror = () => { d.close(); fin([]); };
      };
    } catch (e) { fin([]); }
  });
}

export async function importFromTaller() {
  const found = await readTallerBibles();
  const ok = [];
  for (const b of found) { try { ok.push((await installBible(parseBibleJSON(b))).abbr); } catch (e) { /* formato no válido */ } }
  return ok;
}

// Libro en el mismo formato que los archivos de la app: {id, n, c:[[verso…]…]}
export async function userBook(abbr, bookIndex, bookId) {
  const b = await getBible(abbr);
  if (!b) throw new Error(`La Biblia ${abbr} no está en este equipo.`);
  const bk = b.books[bookIndex];
  return { id: bookId, n: bk[0], c: bk[2] };
}
