// Módulo 11 — Taller del predicador: bosquejos estructurados (almacén "outlines").
// Un bosquejo se puede convertir en enseñanza (Markdown con el formato del Pastor, para Word) y en diapositivas.
import { put, get, all, remove, uid } from './db.js';
import { parseRef, refToKey, label, splitKey } from './ref.js';
import { getChapter, plain } from './bible.js';

export const TIPOS = ['Sermón', 'Enseñanza', 'Estudio bíblico', 'Devocional', 'Mensaje breve', 'Evangelismo', 'Culto especial', 'Vigilia', 'Campamento', 'Convención', 'Funeral', 'Consejería bíblica'];
export const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const newPoint = () => ({ id: uid(), title: '', text: '', subs: [], refs: [], example: '', phrase: '' });

export const TEMPLATES = {
  blanco: { name: 'En blanco', points: 0 },
  tres: { name: 'Tres puntos', points: 3 },
  expositivo: { name: 'Expositivo (versículo por versículo)', points: 0, expositivo: true },
  tematico: { name: 'Temático (cuatro puntos)', points: 4 },
};

export function newOutline(tpl = 'tres', extra = {}) {
  const t = TEMPLATES[tpl] || TEMPLATES.blanco;
  return { id: uid(), tipo: 'Sermón', title: '', base: '', tema: '', audiencia: '', duracion: 45, fecha: '', lugar: '', serie: '', tags: [],
    intro: '', contexto: '', points: Array.from({ length: t.points }, newPoint), conclusion: '', llamado: '', frases: [], notas: '', ...extra };
}

export const listOutlines = async () => (await all('outlines')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getOutline = (id) => get('outlines', id);
export const saveOutline = (o) => put('outlines', o);
export const deleteOutline = (id) => remove('outlines', id);
export async function duplicateOutline(o) {
  const c = JSON.parse(JSON.stringify(o));
  c.id = uid(); c.title = `${o.title || 'Bosquejo'} (copia)`; c.plantilla = false; delete c.sermonId; delete c.createdAt; delete c.updatedAt;
  c.points.forEach(p => { p.id = uid(); });
  return put('outlines', c);
}

// Versículos de una referencia guardada ("JHN.3.16-18"), con números
export async function refText(ver, key) {
  const r = splitKey(key); if (!r || !r.v) return '';
  let c; try { c = await getChapter(ver, r.book, r.ch); } catch (e) { c = await getChapter('rv1909', r.book, r.ch); }
  const out = []; for (let v = r.v; v <= (r.v2 || r.v); v++) out.push({ v, t: plain(c[v - 1]) });
  return out;
}
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'; const sup = n => String(n).replace(/\d/g, d => SUP[d]);
export const parseKey = (txt) => { const r = parseRef(txt); return r && r.ch && r.v && !r.error ? refToKey(r) : null; };

// Bosquejo → Markdown en el formato del Taller (título, versículo inicial, puntos con números romanos, citas, frases)
export async function outlineToMarkdown(o, ver, verAbbr) {
  const L = [`# ${(o.title || 'Sin título').toUpperCase()}`];
  if (o.tema) L.push(`*${o.tema}*`);
  L.push('');
  const baseKey = parseKey(o.base);
  if (baseKey) { const vs = await refText(ver, baseKey); L.push(`> ${label(baseKey)} — ${vs.map(x => `${sup(x.v)} ${x.t}`).join(' ')}`, ''); }
  if (o.intro) L.push('## INTRODUCCIÓN', '', o.intro.trim(), '');
  if (o.contexto) L.push('## CONTEXTO', '', o.contexto.trim(), '');
  for (const [i, p] of o.points.entries()) {
    L.push(`## ${ROM[i] || i + 1}. ${(p.title || 'Punto').toUpperCase()}`, '');
    if (p.text) L.push(p.text.trim(), '');
    for (const k of p.refs) { const vs = await refText(ver, k); L.push(`> ${label(k)} — ${vs.map(x => `${sup(x.v)} ${x.t}`).join(' ')}`, ''); }
    for (const s of p.subs.filter(Boolean)) L.push(`- ${s}`);
    if (p.subs.some(Boolean)) L.push('');
    if (p.example) L.push(p.example.trim(), '');
    if (p.phrase) L.push(`**${p.phrase.replace(/\*/g, '').trim()}**`, '');
  }
  if (o.conclusion) L.push('## CONCLUSIÓN', '', o.conclusion.trim(), '');
  for (const f of (o.frases || []).filter(Boolean)) L.push(`**${f.replace(/\*/g, '').trim()}**`, '');
  if (o.llamado) L.push(o.llamado.trim(), '');
  if (verAbbr && verAbbr !== 'RVR1960') L.push(`*Texto bíblico: ${verAbbr}.*`);
  return L.join('\n');
}

// Diapositivas a partir del bosquejo
export async function outlineToSlides(o, ver) {
  const S = [{ k: 'title', t: o.title || 'Sin título', s: [o.tema, o.serie ? `Serie: ${o.serie}` : ''].filter(Boolean).join(' · ') }];
  const verse = async (key) => { const vs = await refText(ver, key); return { k: 'verse', ref: label(key), t: vs.map(x => `${sup(x.v)} ${x.t}`).join(' ') }; };
  const baseKey = parseKey(o.base); if (baseKey) S.push(await verse(baseKey));
  for (const [i, p] of o.points.entries()) {
    S.push({ k: 'point', n: ROM[i] || i + 1, t: p.title || 'Punto', items: p.subs.filter(Boolean) });
    for (const k of p.refs) S.push(await verse(k));
    if (p.phrase) S.push({ k: 'phrase', t: p.phrase });
  }
  for (const f of (o.frases || []).filter(Boolean)) S.push({ k: 'phrase', t: f });
  if (o.conclusion) S.push({ k: 'point', n: '', t: 'Conclusión', items: o.conclusion.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 5) });
  return S;
}

// Estudio (pasaje o exégesis) → bosquejo: título, pasaje base y un punto por cada sección con contenido
export function outlineFromStudy(st) {
  const o = newOutline('blanco', { title: st.title.replace(/^(Estudio|Exégesis) de /, ''), base: st.passageLabel, tipo: 'Enseñanza' });
  const get2 = (id) => (st.sections?.[id]?.text || '').trim();
  o.intro = get2('contexto') || get2('historico') || '';
  for (const id of ['interpretacion', 'doctrina', 'argumento', 'conclusiones', 'aplicacion', 'aplicaciones']) {
    const t = get2(id); if (t) { const p = newPoint(); p.title = { interpretacion: 'Lo que el texto enseña', doctrina: 'Enseñanza doctrinal', argumento: 'El argumento del autor', conclusiones: 'Conclusiones', aplicacion: 'Aplicación', aplicaciones: 'Aplicación' }[id]; p.text = t; o.points.push(p); }
  }
  if (!o.points.length) o.points = [newPoint(), newPoint(), newPoint()];
  return o;
}
