// Datos del atlas: lugares de OpenBible.info (CC BY 4.0) y mapa de Natural Earth (dominio público), tomados del Taller.
import { BOOKS, norm } from './books.js';

let L = null, M = null, byVerse = null;
export async function loadAtlas() {
  if (L && M) return { L, M };
  const [a, b] = await Promise.all([fetch('data/atlas/lugares.json'), fetch('data/atlas/mapa.json')]);
  if (!a.ok || !b.ok) throw new Error('No se pudieron cargar los datos del atlas.');
  L = await a.json(); M = await b.json();
  L.forEach((p, i) => { p.i = i; p.en = String(p.e || '').replace(/\s+\d+$/, ''); p._n = norm(`${p.n} ${p.en}`); p._c = p._n.replace(/[^a-z0-9]/g, ''); });
  return { L, M };
}

// "0.12.10" (libro desde 0) -> clave interna "GEN.12.10"
export function refKey(r) { const [b, c, v] = r.split('.').map(Number); const bk = BOOKS[b]; return bk ? `${bk.id}.${c}.${v}` : null; }

export async function placesForVerse(bookId, ch, v) {
  const { L } = await loadAtlas();
  if (!byVerse) {
    byVerse = new Map();
    for (const p of L) for (const r of p.v) { const k = refKey(r); if (!k) continue; if (!byVerse.has(k)) byVerse.set(k, []); byVerse.get(k).push(p.i); }
  }
  return (byVerse.get(`${bookId}.${ch}.${v}`) || []).map(i => L[i]);
}

export const xy = (p, M) => [(p.x - M.lon0) * M.k * M.cx, (M.lat1 - p.y) * M.k];

export const TYPES = {
  settlement: 'Ciudad o poblado', region: 'Región', mountain: 'Monte', campsite: 'Campamento', river: 'Río', island: 'Isla',
  hill: 'Colina', 'body of water': 'Mar o lago', valley: 'Valle', 'natural area': 'Área natural', spring: 'Fuente', gate: 'Puerta',
  road: 'Camino', well: 'Pozo', field: 'Campo', mountain_range: 'Cordillera', canal: 'Canal', cave: 'Cueva', tower: 'Torre',
};
export const typeName = (t) => TYPES[t] || t;
