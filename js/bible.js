// Acceso a los textos bíblicos (archivos JSON estáticos por libro, cacheados por el Service Worker).
// Formato de verso: string, o arreglo de segmentos: "texto" | ["texto","G25 G26"] | ["texto","H430",1] (1 = añadido/cursiva).
import { BOOKS } from './books.js';

let MANIFEST = null;
const cache = new Map(); // `${ver}/${book}` -> Promise<book>

export async function loadManifest() {
  if (MANIFEST) return MANIFEST;
  const r = await fetch('data/manifest.json');
  if (!r.ok) throw new Error('No se pudo cargar el inventario de textos bíblicos.');
  MANIFEST = await r.json();
  return MANIFEST;
}
export const manifest = () => MANIFEST;
export const versions = () => Object.entries(MANIFEST.versions).map(([code, m]) => ({ code, ...m }));
export const chapterCount = (book) => MANIFEST.versions.rv1909.chapters[book].length;
export const verseCount = (book, ch) => MANIFEST.versions.rv1909.chapters[book][ch - 1] || 0;

export function loadBook(ver, book) {
  const k = `${ver}/${book}`;
  if (!cache.has(k)) {
    const p = fetch(`data/${ver}/${book}.json`).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${book} (${ver}).`);
      return r.json();
    }).catch(e => { cache.delete(k); throw e; });
    cache.set(k, p);
  }
  return cache.get(k);
}

export async function getChapter(ver, book, ch) {
  const b = await loadBook(ver, book);
  return b.c[ch - 1] || [];
}

export async function getVerse(ver, book, ch, v) {
  const c = await getChapter(ver, book, ch);
  return c[v - 1] ?? null;
}

export function plain(verse) {
  if (verse == null) return '';
  if (typeof verse === 'string') return verse;
  return verse.map(s => (typeof s === 'string' ? s : s[0])).join('');
}

export function segments(verse) {
  if (verse == null) return [];
  if (typeof verse === 'string') return [{ t: verse, s: '', add: false }];
  return verse.map(s => (typeof s === 'string' ? { t: s, s: '', add: false } : { t: s[0], s: s[1] || '', add: !!s[2] }));
}

// Texto plano de una clave (verso o rango del mismo capítulo)
export async function passageText(ver, book, ch, v1, v2) {
  const c = await getChapter(ver, book, ch);
  const out = [];
  for (let v = v1; v <= (v2 || v1); v++) if (c[v - 1] != null) out.push({ v, text: plain(c[v - 1]) });
  return out;
}

// Carga todos los libros de una versión (para búsqueda y concordancia) con progreso.
export async function loadAll(ver, onProgress) {
  let done = 0;
  const ids = BOOKS.map(b => b.id);
  const out = {};
  const queue = [...ids];
  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      out[id] = await loadBook(ver, id);
      done++;
      onProgress && onProgress(done, ids.length);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

// Referencias cruzadas
const xcache = new Map();
export function loadXref(book) {
  if (!xcache.has(book)) {
    xcache.set(book, fetch(`data/xref/${book}.json`).then(r => {
      if (!r.ok) throw new Error('No se pudieron cargar las referencias cruzadas.');
      return r.json();
    }).catch(e => { xcache.delete(book); throw e; }));
  }
  return xcache.get(book);
}

// Léxico Strong
const scache = {};
export function loadStrong(prefix) {
  if (!scache[prefix]) {
    scache[prefix] = fetch(`data/strong/${prefix}.json`).then(r => {
      if (!r.ok) throw new Error('No se pudo cargar el léxico Strong.');
      return r.json();
    }).catch(e => { delete scache[prefix]; throw e; });
  }
  return scache[prefix];
}
export async function strongEntry(num) {
  const lex = await loadStrong(num[0]);
  const e = lex[num];
  if (!e) return null;
  const [lemma, xlit, pron, deriv, def, kjv, freq] = e;
  return { num, lemma, xlit, pron, deriv, def: (def || '').trim(), kjv: (kjv || '').trim(), freq: freq || 0 };
}
