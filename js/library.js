// Módulo 7 — Biblioteca: documentos propios (PDF, texto). El archivo y su texto se guardan solo en el dispositivo
// (almacén «docfiles», fuera de los respaldos por su tamaño); la ficha (título, etiquetas, notas, citas) sí va en los respaldos.
import { put, get, all, remove, uid, now } from './db.js';
import { findBookExact, norm, BOOK } from './books.js';
import { chapterCount, verseCount } from './bible.js';

let pdfjsP = null;
export function pdfjs() {
  if (!pdfjsP) pdfjsP = import('../vendor/pdfjs/pdf.min.mjs').then(m => {
    m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
    return m;
  });
  return pdfjsP;
}
export const pdfOptions = () => ({ standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', document.baseURI).href, isEvalSupported: false });

// --- Archivos (IndexedDB «docfiles») ---
function rawDB() {
  return new Promise((res, rej) => { const r = indexedDB.open('escudrinad'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function fileOp(mode, fn) {
  await all('docs'); // asegura que la base esté abierta y migrada
  const db = await rawDB();
  return new Promise((res, rej) => {
    const t = db.transaction('docfiles', mode); const s = t.objectStore('docfiles'); let out;
    const r = fn(s); if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => { db.close(); res(out); }; t.onerror = () => { db.close(); rej(t.error); };
  });
}
export const getFile = (id) => fileOp('readonly', s => s.get(id));
const putFile = (rec) => fileOp('readwrite', s => s.put(rec));
const delFile = (id) => fileOp('readwrite', s => s.delete(id));
export const allFiles = () => fileOp('readonly', s => s.getAll());

// --- Citas bíblicas dentro de un texto ---
const REF_RE = /(?:^|[^\p{L}\d])((?:[1-3]\s?)?\p{Lu}[\p{L}.]{0,14}(?:\s(?:de\s)?\p{Lu}\p{Ll}+)?)\.?\s+(\d{1,3})\s?[:.]\s?(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?/gu;
export function findRefs(text, invalid = null) {
  const out = [];
  for (const m of text.matchAll(REF_RE)) {
    // «En Hch 2:38»: si la palabra anterior no es un libro, se prueba solo con la última
    const book = findBookExact(m[1]) || (/\s/.test(m[1]) ? findBookExact(m[1].replace(/^.*\s(?=\S+$)/, '')) : null); if (!book) continue;
    const ch = +m[2], v = +m[3], v2 = m[4] ? +m[4] : null;
    if (ch < 1 || ch > chapterCount(book) || v < 1 || v > verseCount(book, ch) || (v2 && (v2 <= v || v2 > verseCount(book, ch)))) { if (invalid) invalid.push(`${BOOK[book].name} ${ch}:${v}${v2 ? '-' + v2 : ''}`); continue; }
    out.push(`${book}.${ch}.${v}${v2 ? '-' + v2 : ''}`);
  }
  return out;
}

// --- Importar ---
async function pdfPages(buf, onProgress) {
  const lib = await pdfjs();
  const task = lib.getDocument({ data: buf, ...pdfOptions() }); const doc = await task.promise;
  const pages = []; let info = {};
  try { info = (await doc.getMetadata()).info || {}; } catch (e) { /* sin metadatos */ }
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    let s = ''; for (const it of tc.items) { s += it.str; s += it.hasEOL ? '\n' : (it.str && !/\s$/.test(it.str) ? ' ' : ''); }
    pages.push(s.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim());
    onProgress && onProgress(i, doc.numPages);
  }
  await task.destroy();
  return { pages, title: (info.Title || '').trim(), author: (info.Author || '').trim() };
}

export async function importDocument(file, onProgress) {
  const name = file.name.replace(/\.[^.]+$/, '');
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  const isText = /\.(txt|md)$/i.test(file.name) || /^text\//.test(file.type);
  if (!isPdf && !isText) throw new Error(`«${file.name}»: solo se aceptan PDF, .txt y .md.`);
  const buf = await file.arrayBuffer();
  let pages, title = '', author = '';
  if (isPdf) {
    const head = new TextDecoder().decode(new Uint8Array(buf.slice(0, 5)));
    if (head !== '%PDF-') throw new Error(`«${file.name}» no es un PDF válido.`);
    ({ pages, title, author } = await pdfPages(buf.slice(0), onProgress));
  } else {
    const txt = new TextDecoder().decode(buf);
    // Los textos largos se parten en «páginas» de unas 3.000 letras por párrafos, para ubicar resultados
    pages = []; let cur = '';
    for (const par of txt.split(/\n(?=\s*\n)/)) { if (cur.length + par.length > 3000 && cur) { pages.push(cur.trim()); cur = ''; } cur += par + '\n'; }
    if (cur.trim()) pages.push(cur.trim());
  }
  const refs = {};
  pages.forEach((t, i) => { for (const k of findRefs(t)) (refs[k] = refs[k] || []).includes(i + 1) || refs[k].push(i + 1); });
  const id = uid();
  const textChars = pages.reduce((a, p) => a + p.length, 0);
  await putFile({ id, blob: new Blob([buf], { type: isPdf ? 'application/pdf' : 'text/plain' }), pages });
  return put('docs', { id, fileId: id, title: title && title.length > 3 ? title : name, author, fileName: file.name, kind: isPdf ? 'pdf' : 'texto',
    size: file.size, pageCount: pages.length, textChars, tags: [], notes: [], refs, addedAt: now() });
}

export async function deleteDocument(id) { await remove('docs', id); await delFile(id).catch(() => {}); }

// --- Búsqueda en los textos ---
export function snippet(text, i, len, pad = 70) {
  const a = Math.max(0, i - pad), b = Math.min(text.length, i + len + pad);
  return { pre: (a ? '…' : '') + text.slice(a, i), hit: text.slice(i, i + len), post: text.slice(i + len, b) + (b < text.length ? '…' : '') };
}
// Busca sin distinguir tildes ni mayúsculas; devuelve [{doc, page, snip}]
export async function searchDocs(q, { limit = 200, docId = null } = {}) {
  const nq = norm(q.trim()); if (nq.length < 2) return [];
  const docs = new Map((await all('docs')).map(d => [d.id, d]));
  const files = docId ? [await getFile(docId)].filter(Boolean) : await allFiles();
  const out = [];
  for (const f of files) {
    const d = docs.get(f.id); if (!d) continue;
    f.pages.forEach((t, pi) => {
      const nt = norm(t); let i = nt.indexOf(nq), n = 0;
      while (i >= 0 && n < 5 && out.length < limit) { out.push({ doc: d, page: pi + 1, snip: snippet(t, i, nq.length) }); n++; i = nt.indexOf(nq, i + nq.length); }
    });
  }
  return out;
}

// Documentos que citan un versículo (para el panel del versículo)
export async function docsForVerse(book, ch, v) {
  const out = [];
  for (const d of await all('docs')) {
    const pages = new Set();
    for (const [k, pp] of Object.entries(d.refs || {})) {
      const m = /^(\w{3})\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(k); if (!m || m[1] !== book || +m[2] !== ch) continue;
      if (v >= +m[3] && v <= +(m[4] || m[3])) pp.forEach(p => pages.add(p));
    }
    if (pages.size) out.push({ doc: d, pages: [...pages].sort((a, b) => a - b) });
  }
  return out;
}

export const saveDoc = (d) => put('docs', d);
export const getDoc = (id) => get('docs', id);
export const listDocs = () => all('docs');
