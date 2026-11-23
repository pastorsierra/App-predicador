// Búsqueda real sobre el texto completo (sin servidor): palabras, frase exacta, número Strong.
import { BOOKS, BOOK, norm } from './books.js';
import { loadAll, plain, segments } from './bible.js';
import { all } from './db.js';

// Normaliza conservando un mapa de posiciones hacia el texto original (para resaltar coincidencias)
export function normMap(text) {
  let out = ''; const map = [];
  for (let i = 0; i < text.length; i++) {
    const n = norm(text[i]);
    for (let k = 0; k < n.length; k++) { out += n[k]; map.push(i); }
  }
  map.push(text.length);
  return { out, map };
}

export function parseQuery(q) {
  q = (q || '').trim();
  const strong = /^([HG])0*(\d{1,4})$/i.exec(q.replace(/\s+/g, ''));
  if (strong) return { kind: 'strong', num: strong[1].toUpperCase() + strong[2] };
  const phrases = []; let rest = q.replace(/"([^"]+)"|“([^”]+)”/g, (_, a, b) => { phrases.push(norm(a || b).trim()); return ' '; });
  const words = norm(rest).split(/[^a-z0-9ñ]+/).filter(w => w.length > 0);
  return { kind: 'text', phrases: phrases.filter(Boolean), words };
}

function scopeBooks(scope) {
  if (scope === 'AT' || scope === 'NT') return BOOKS.filter(b => b.t === scope);
  if (scope && BOOK[scope]) return [BOOK[scope]];
  return BOOKS;
}

const isWordChar = (c) => /[a-z0-9]/.test(c || '');

// Busca en una versión. Devuelve { total, results:[{key, book, ch, v, text, ranges}], byBook }
export async function searchText(ver, q, { scope = 'all', limit = 500, onProgress } = {}) {
  const pq = parseQuery(q);
  if (pq.kind !== 'text' || (!pq.words.length && !pq.phrases.length)) return { total: 0, results: [], byBook: {} };
  const data = await loadAll(ver, onProgress);
  const res = []; const byBook = {}; let total = 0;
  const needles = [...pq.phrases.map(p => ({ s: p, phrase: true })), ...pq.words.map(w => ({ s: w, phrase: false }))];
  for (const b of scopeBooks(scope)) {
    const book = data[b.id];
    book.c.forEach((chap, ci) => chap.forEach((verse, vi) => {
      const text = plain(verse);
      const { out, map } = normMap(text);
      const ranges = [];
      for (const n of needles) {
        let found = false, idx = out.indexOf(n.s);
        while (idx !== -1) {
          const startOk = !isWordChar(out[idx - 1]);
          const endOk = n.phrase ? !isWordChar(out[idx + n.s.length]) : true; // palabras: coincide por inicio (amor -> amores)
          if (startOk && endOk) { found = true; ranges.push([map[idx], map[idx + n.s.length]]); }
          idx = out.indexOf(n.s, idx + 1);
        }
        if (!found) return;
      }
      total++;
      byBook[b.id] = (byBook[b.id] || 0) + 1;
      if (res.length < limit) res.push({ key: `${b.id}.${ci + 1}.${vi + 1}`, book: b.id, ch: ci + 1, v: vi + 1, text, ranges: merge(ranges) });
    }));
  }
  return { total, results: res, byBook };
}

function merge(r) {
  r.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const x of r) { if (out.length && x[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], x[1]); else out.push([...x]); }
  return out;
}

// Concordancia Strong: todos los versos donde aparece el número, y cómo se tradujo en la RV1909.
export async function concordance(num, { scope = 'all', limit = 1000, onProgress } = {}) {
  const data = await loadAll('rv1909', onProgress);
  const res = []; const renderings = new Map(); const byBook = {}; let total = 0, occurrences = 0;
  for (const b of scopeBooks(scope)) {
    data[b.id].c.forEach((chap, ci) => chap.forEach((verse, vi) => {
      if (typeof verse === 'string') return;
      const segs = segments(verse);
      const ranges = []; let pos = 0;
      for (const s of segs) {
        if (s.s && s.s.split(' ').includes(num)) {
          ranges.push([pos, pos + s.t.length]); occurrences++;
          const r = norm(s.t).replace(/[^a-zñ ]/g, '').trim();
          if (r) renderings.set(r, (renderings.get(r) || 0) + 1);
        }
        pos += s.t.length;
      }
      if (!ranges.length) return;
      total++; byBook[b.id] = (byBook[b.id] || 0) + 1;
      if (res.length < limit) res.push({ key: `${b.id}.${ci + 1}.${vi + 1}`, book: b.id, ch: ci + 1, v: vi + 1, text: plain(verse), ranges });
    }));
  }
  const top = [...renderings.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  return { total, occurrences, results: res, byBook, renderings: top };
}

// Búsqueda en los datos personales
export async function searchUserData(q) {
  const n = norm(q).trim();
  if (!n) return { notes: [], studies: [], sermons: [] };
  const terms = n.split(/\s+/);
  const hit = (s) => { const t = norm(s); return terms.every(w => t.includes(w)); };
  const notes = (await all('notes')).filter(x => hit(`${x.title || ''} ${x.body || ''} ${(x.tags || []).join(' ')} ${x.refLabel || ''}`));
  const studies = (await all('studies')).filter(x => hit(`${x.title || ''} ${x.passageLabel || ''} ${(x.tags || []).join(' ')} ${Object.values(x.sections || {}).map(s => s.text || '').join(' ')}`));
  const sermons = (await all('sermons')).filter(x => hit(`${x.titulo || ''} ${x.texto || ''} ${x.serie || ''} ${x.notas || ''} ${x.ensenanza || ''}`));
  return { notes, studies, sermons };
}
