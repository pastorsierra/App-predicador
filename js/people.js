// Personajes bíblicos: datos de Theographic Bible Metadata (CC BY-SA 4.0), nombres en español tomados de la RV1909.
import { norm } from './books.js';

let P = null, byId = null, byVerse = null, byEn = null;
export async function loadPeople() {
  if (P) return P;
  const r = await fetch('data/personajes/personas.json');
  if (!r.ok) throw new Error('No se pudieron cargar los personajes.');
  P = await r.json();
  byId = new Map(); byEn = new Map();
  for (const p of P) {
    byId.set(p.id, p);
    p._n = norm(`${p.n} ${p.en} ${p.aka}`); p._c = p._n.replace(/[^a-z0-9]/g, '');
    if (!byEn.has(p.en) || byEn.get(p.en).k < p.k) byEn.set(p.en, p);
  }
  return P;
}
export const person = (id) => byId && byId.get(+id);
// Para enlazar desde la cronología: la persona más mencionada con ese nombre (en inglés, como en la fuente)
export const personByEn = (en) => typeof en === 'number' ? person(en) : byEn && byEn.get(en);
export const people = (ids) => (ids || []).map(person).filter(Boolean);

// Para distinguir homónimos (hay muchos Zacarías, Simón, Juan…)
export function who(p) {
  const f = people(p.fa)[0] || people(p.mo)[0];
  const parts = [];
  if (f) parts.push(`${p.g === 'M' ? 'hija' : 'hijo'} de ${f.n}`);
  else if (p.pa.length) parts.push(`${p.g === 'M' ? 'esposa' : 'esposo'} de ${people(p.pa)[0]?.n || ''}`);
  return parts.join(' · ');
}

export async function peopleForVerse(book, ch, v) {
  await loadPeople();
  if (!byVerse) {
    byVerse = new Map();
    for (const p of P) for (const k of p.v) { if (!byVerse.has(k)) byVerse.set(k, []); byVerse.get(k).push(p.id); }
  }
  return people(byVerse.get(`${book}.${ch}.${v}`));
}
