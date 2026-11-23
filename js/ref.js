// Referencias bíblicas. Formato interno: "JHN.3.16" (verso), "JHN.3" (capítulo), "JHN.3.16-18" (rango).
import { BOOK, findBook } from './books.js';
import { chapterCount, verseCount } from './bible.js';

export function vkey(book, ch, v) { return `${book}.${ch}.${v}`; }
export function ckey(book, ch) { return `${book}.${ch}`; }

export function splitKey(key) {
  const m = /^([1-3A-Z]{3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/.exec(key || '');
  if (!m) return null;
  return { book: m[1], ch: +m[2], v: m[3] ? +m[3] : null, v2: m[4] ? +m[4] : null };
}

// Rango entre capítulos de las referencias cruzadas: "PRO.8.22-PRO.8.30"
export function splitAny(key) {
  const cross = /^([1-3A-Z]{3})\.(\d+)\.(\d+)-([1-3A-Z]{3})\.(\d+)\.(\d+)$/.exec(key);
  if (cross) return { book: cross[1], ch: +cross[2], v: +cross[3], v2: null, end: { book: cross[4], ch: +cross[5], v: +cross[6] } };
  return splitKey(key);
}

export function label(key, short = false) {
  const r = splitAny(key);
  if (!r) return key;
  const b = BOOK[r.book];
  const name = short ? b.abbr : b.name;
  let s = `${name} ${r.ch}`;
  if (r.v) s += `:${r.v}`;
  if (r.v2) s += `-${r.v2}`;
  if (r.end) s += r.end.ch === r.ch ? `-${r.end.v}` : `–${r.end.ch}:${r.end.v}`;
  return s;
}

// Interpreta textos como "Jn 3:16", "juan 3 16-18", "1 Co 13", "Hch 2.38", "Sal 23".
export function parseRef(input) {
  const s = (input || '').trim();
  const m = /^((?:[1-3]|i{1,3})?\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+(?:\s+(?:de\s+)?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)?)\s*(\d+)?(?:\s*[:.,\s]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/i.exec(s);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const nch = chapterCount(book);
  let ch = m[2] ? +m[2] : 1;
  if (ch < 1 || ch > nch) return { book, ch: null, error: `${BOOK[book].name} tiene ${nch} capítulos.` };
  let v = m[3] ? +m[3] : null, v2 = m[4] ? +m[4] : null;
  const nv = verseCount(book, ch);
  if (v && (v < 1 || v > nv)) return { book, ch, v: null, error: `${BOOK[book].name} ${ch} tiene ${nv} versículos.` };
  if (v2 && (!v || v2 <= v)) v2 = null;
  if (v2 && v2 > nv) v2 = nv;
  // Un libro de un solo capítulo con un número: "Judas 3" = versículo 3
  if (nch === 1 && m[2] && !m[3] && +m[2] <= verseCount(book, 1) && +m[2] > 1) { v = +m[2]; ch = 1; }
  return { book, ch, v, v2 };
}

export function refToKey(r) {
  if (!r || !r.ch) return null;
  if (!r.v) return ckey(r.book, r.ch);
  return r.v2 ? `${r.book}.${r.ch}.${r.v}-${r.v2}` : vkey(r.book, r.ch, r.v);
}

// Lista de claves de versos de una selección (mismo capítulo)
export function versesOf(key) {
  const r = splitKey(key);
  if (!r || !r.v) return [];
  const out = [];
  for (let v = r.v; v <= (r.v2 || r.v); v++) out.push(vkey(r.book, r.ch, v));
  return out;
}

// Compacta una lista de números de verso de un capítulo en una clave: [16,17,18] -> JHN.3.16-18
export function keyFromSelection(book, ch, nums) {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return null;
  const contiguous = s.every((n, i) => i === 0 || n === s[i - 1] + 1);
  if (s.length === 1) return vkey(book, ch, s[0]);
  if (contiguous) return `${book}.${ch}.${s[0]}-${s[s.length - 1]}`;
  return null; // selección discontinua: se maneja como lista
}

export function selectionLabel(book, ch, nums) {
  const s = [...nums].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
    i = j;
  }
  return `${BOOK[book].name} ${ch}:${parts.join(', ')}`;
}
