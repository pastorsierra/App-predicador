// Asistente de IA (Fase 4). La app reúne primero las fuentes reales (versículos, referencias, Strong, documentos
// y notas del usuario) y las envía a la función de servidor propia del usuario, que guarda la clave de Anthropic.
// Aquí NO hay ninguna clave de Anthropic: solo la dirección de la función y el código de acceso que el usuario eligió.
import { getSetting, setSetting, all } from './db.js';
import { getChapter, plain, segments, loadXref, strongEntry, verLabel } from './bible.js';
import { splitKey, splitAny, label } from './ref.js';
import { BOOK, norm } from './books.js';
import { S, PROFILES } from './state.js';

export const MODOS = [['estudio', 'Estudio personal'], ['exegeta', 'Exegeta'], ['hermeneuta', 'Hermeneuta'], ['teologo', 'Teólogo bíblico'],
  ['investigador', 'Investigador'], ['predicador', 'Ayudante del predicador'], ['preguntas', 'Preguntas de estudio'], ['biblioteca', 'Mi biblioteca']];
export const PROFUNDIDADES = [['breve', 'Breve'], ['explicativa', 'Explicativa'], ['profunda', 'Profunda'], ['investigacion', 'Investigación avanzada']];

export async function aiConfig() {
  return { url: await getSetting('aiUrl', ''), code: await getSetting('aiCode', ''), anon: await getSetting('aiAnon', ''), model: await getSetting('aiModel', ''), ready: await getSetting('aiReady', false) };
}
export async function saveAiConfig({ url, code, anon }) {
  await setSetting('aiUrl', url); await setSetting('aiCode', code); await setSetting('aiAnon', anon || '');
  await setSetting('aiReady', false); await setSetting('aiModel', '');
}
export async function forgetAi() { for (const k of ['aiUrl', 'aiCode', 'aiAnon', 'aiModel']) await setSetting(k, ''); await setSetting('aiReady', false); }

async function call(cfg, body) {
  if (!/^https:\/\//.test(cfg.url) && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(cfg.url)) throw new Error('La dirección de la función debe empezar por https://');
  const headers = { 'content-type': 'application/json', 'x-codigo': cfg.code };
  if (cfg.anon) { headers.apikey = cfg.anon; headers.authorization = `Bearer ${cfg.anon}`; }
  let r;
  try { r = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(body) }); } catch (e) { throw new Error(navigator.onLine ? 'No se pudo contactar la función de servidor. Revise la dirección.' : 'Sin conexión: el asistente necesita internet.'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || (r.status === 401 ? 'El servidor rechazó la petición (revise el código de acceso o la verificación JWT).' : `El servidor respondió con el error ${r.status}.`));
  return data;
}

// Prueba real de la conexión (no gasta consultas de IA: el servidor responde sin llamar a Anthropic)
export async function testAi(cfg) {
  const d = await call(cfg, { ping: true });
  if (!d.ok) throw new Error('Respuesta inesperada del servidor.');
  await setSetting('aiReady', true); await setSetting('aiModel', d.modelo || '');
  return d;
}

// --- Fuentes reales ---
const verseKeys = (key) => { const r = splitKey(key); if (!r) return []; if (!r.v) return null; const out = []; for (let v = r.v; v <= (r.v2 || r.v); v++) out.push([r.book, r.ch, v]); return out; };
async function passage(ver, key) {
  const r = splitKey(key); const c = await getChapter(ver, r.book, r.ch);
  const from = r.v || 1, to = r.v ? (r.v2 || r.v) : c.length;
  const lines = []; for (let v = from; v <= to; v++) if (c[v - 1] != null) lines.push(`${v} ${plain(c[v - 1])}`);
  return lines.join('\n');
}

export async function gatherSources({ key, question, refs = true, strong = true, docs = true, notes = true }) {
  const out = [];
  const add = (tipo, titulo, texto, extra = {}) => { if (texto && texto.trim()) out.push({ tipo, titulo, texto: texto.trim().slice(0, 6000), ...extra }); };
  if (key) {
    const r = splitKey(key);
    const vers = [...new Set([S.version || 'rv1909', 'rv1909', 'bes'])];
    for (const ver of vers) { try { add('biblia', `${label(key)} (${verLabel(ver)})`, await passage(ver, key), { key }); } catch (e) { /* versión no disponible en este equipo */ } }
    // Contexto: el capítulo completo en la RV1909 si el pasaje es corto
    if (r.v && ((r.v2 || r.v) - r.v) < 10) { try { add('contexto', `${BOOK[r.book].name} ${r.ch} completo (RV1909), para el contexto`, await passage('rv1909', `${r.book}.${r.ch}`), { key: `${r.book}.${r.ch}` }); } catch (e) { /* sin datos */ } }
    const vs = verseKeys(key) || [];
    if (refs && vs.length) {
      const x = await loadXref(r.book).catch(() => ({})); const seen = new Set();
      for (const [, ch, v] of vs) for (const k of (x[`${ch}.${v}`] || []).slice(0, 4)) {
        if (seen.size >= 10 || seen.has(k)) continue; seen.add(k);
        const a = splitAny(k); if (!a?.v) continue;
        try { add('referencia', `${label(k)} (RV1909) — referencia cruzada de OpenBible.info`, await passage('rv1909', `${a.book}.${a.ch}.${a.v}${a.end && a.end.ch === a.ch ? '-' + a.end.v : ''}`), { key: k }); } catch (e) { /* omitida */ }
      }
    }
    if (strong && vs.length) {
      const nums = [];
      for (const [b, ch, v] of vs.slice(0, 6)) { const c = await getChapter('rv1909', b, ch); for (const sg of segments(c[v - 1])) if (sg.s && !nums.some(n => n[0] === sg.s)) nums.push([sg.s, sg.t.trim()]); }
      const ent = [];
      for (const [n, w] of nums.slice(0, 14)) { const e = await strongEntry(n).catch(() => null); if (e) ent.push(`${n} «${w}» → ${e.lemma} (${e.xlit}): ${e.def.slice(0, 300)}${e.kjv ? ` | KJV: ${e.kjv.slice(0, 120)}` : ''} | aparece ${e.freq} veces`); }
      add('strong', `Palabras originales de ${label(key)} (léxico de Strong, en inglés)`, ent.join('\n'));
    }
    if (notes) {
      const mine = (await all('notes')).filter(n => n.ref && (n.ref === key || n.chap === `${r.book}.${r.ch}`)).slice(0, 6);
      for (const n of mine) add('nota', `Nota del usuario sobre ${n.refLabel || label(n.ref)}${n.title ? ': ' + n.title : ''}`, n.body);
    }
  }
  if (docs) {
    const { searchDocs } = await import('./library.js');
    const words = [...new Set(norm(question).split(/[^a-z0-9ñ]+/).filter(w => w.length > 5))].sort((a, b) => b.length - a.length).slice(0, 3);
    const seen = new Set();
    for (const w of words) for (const hit of await searchDocs(w, { limit: 6 })) {
      const id = `${hit.doc.id}:${hit.page}`; if (seen.has(id) || seen.size >= 6) continue; seen.add(id);
      add('documento', `${hit.doc.title}${hit.doc.author ? ' — ' + hit.doc.author : ''}, página ${hit.page} (documento del usuario)`, `${hit.snip.pre}${hit.snip.hit}${hit.snip.post}`, { doc: hit.doc.id, page: hit.page });
    }
  }
  return out;
}

export async function ask({ question, key, mode, depth, sources }) {
  const cfg = await aiConfig();
  if (!cfg.url || !cfg.code) throw new Error('El asistente no está configurado. Vaya a Ajustes → Asistente de IA.');
  const perfil = S.doctrinalProfile && S.doctrinalProfile !== 'ninguno' ? `${PROFILES[S.doctrinalProfile]?.summary || ''} ${S.doctrinalNotes || ''}`.trim() : '';
  const d = await call(cfg, { pregunta: question, modo: mode, profundidad: depth, perfil, fuentes: sources.map(s => ({ titulo: s.titulo, texto: s.texto })) });
  return { ...d, check: await verify(d.texto || '', sources) };
}

// --- Verificación de la respuesta ---
// 1) números [n] que no corresponden a ninguna fuente; 2) citas bíblicas que no estaban entre las fuentes entregadas.
export async function verify(text, sources) {
  const { findRefs } = await import('./library.js');
  const badNums = [...new Set([...text.matchAll(/\[(\d{1,3})\]/g)].map(m => +m[1]).filter(n => n < 1 || n > sources.length))];
  const covered = (k) => {
    const a = splitKey(k.replace(/-\d+$/, '')); if (!a) return false;
    return sources.some(s => { if (!s.key) return false; const b = splitAny(s.key); if (!b || b.book !== a.book || b.ch !== a.ch) return false; if (!b.v) return true; const end = b.v2 || (b.end && b.end.ch === b.ch ? b.end.v : b.v); return a.v >= b.v && a.v <= end; });
  };
  const invalid = []; const cited = [...new Set(findRefs(text, invalid))];
  return { badNums, cited, outside: cited.filter(k => !covered(k)), invalid: [...new Set(invalid)] };
}
