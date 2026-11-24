// Enseñanzas del Taller del Predicador dentro de Escudriñad:
// - Archivo cifrado (biblioteca.enc del Taller, misma clave y mismo cifrado: PBKDF2 + AES-GCM, formato "TPE1").
// - Mis enseñanzas (almacén "sermons" en IndexedDB), importadas del Taller o creadas aquí.
// - Marcas de «predicada» (fecha) y estilo de página preferido.
import { put, get, all, remove, getSetting, setSetting, now } from '../db.js';

// El archivo se lee del Taller publicado (mismo sitio pastorsierra.github.io), así siempre está actualizado.
export const ARCHIVE_URLS = { lib: '../Assj/biblioteca.enc', nueva: '../Assj/biblioteca-nueva.enc' };
// Elementos del archivo cifrado → Markdown (misma conversión que el Taller)
export function libToMd(it) {
  if (it.md) return it.md;
  const L = [`# ${it.T || it.t}`]; let i = 0; const P = it.p || [];
  if (P[0] && P[0][0] === 'p' && P[0][1] === it.S) { L.push(`*${it.S}*`); i = 1; }
  let lastLi = false;
  for (; i < P.length; i++) {
    const [k, t] = P[i];
    if (k !== 'li' && lastLi) { L.push(''); lastLi = false; }
    if (k === 'h' && /^vers[ií]culo clave$/i.test(t.replace(/:$/, ''))) continue;
    if (k === 'ref') { const nx = P[i + 1]; if (nx && nx[0] === 'q') { L.push(`> ${t} — ${nx[1].replace(/^\((RVR1960|NTV|NVI)\)\s*/, '')}`); i++; } else L.push(`> ${t}`); L.push(''); continue; }
    if (k === 'q') { L.push(`> ${t}`, ''); continue; }
    if (k === 'h') { L.push(`## ${t.replace(/:$/, '')}`); continue; }
    if (k === 'li') { L.push(`- ${t}`); lastLi = true; continue; }
    if (k === 'i') { L.push('', `**${t.replace(/\*/g, '')}**`, ''); continue; }
    L.push(t, '');
  }
  return L.join('\n');
}


const SALT_HEX = 'e6ad908c3b7d35e42e54362bea50eada', ITER = 310000;

const hex2b = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function derive(pass) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim().toLowerCase()), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hex2b(SALT_HEX), iterations: ITER, hash: 'SHA-256' }, k, 256);
}
async function decrypt(buf, raw) {
  const u = new Uint8Array(buf);
  if (u[0] !== 84 || u[1] !== 80 || u[2] !== 69 || u[3] !== 49) throw new Error('El archivo no tiene el formato esperado.');
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(5, 17) }, key, u.slice(17));
  let txt;
  if (u[4] === 1) { const s = new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip')); txt = await new Response(s).text(); }
  else txt = new TextDecoder().decode(pt);
  return JSON.parse(txt);
}

const bufCache = {};
async function fetchEnc(which) {
  if (bufCache[which]) return bufCache[which];
  const r = await fetch(ARCHIVE_URLS[which], { cache: 'no-cache' });
  if (!r.ok) throw new Error(r.status === 404 ? 'No se encontró el archivo de enseñanzas del Taller.' : 'No se pudo descargar el archivo de enseñanzas.');
  bufCache[which] = await r.arrayBuffer();
  return bufCache[which];
}

export const hasKey = async () => !!(await getSetting('tallerLibKey'));
export const forgetKey = () => setSetting('tallerLibKey', null);

// Comprueba la clave contra el archivo y la guarda en este dispositivo (nunca en respaldos ni en GitHub)
export async function unlock(pass) {
  const buf = await fetchEnc('lib');
  const raw = await derive(pass);
  try { await decrypt(buf, raw); } catch (e) { throw new Error('La clave no es correcta.'); }
  await setSetting('tallerLibKey', b64(raw));
  LIB = null;
}
export async function setRawKey(b64raw) {
  const buf = await fetchEnc('lib');
  await decrypt(buf, unb64(b64raw)); // valida
  await setSetting('tallerLibKey', b64raw);
  LIB = null;
}

let LIB = null, VN = undefined;
export async function loadArchive() {
  if (LIB) return LIB;
  const k = await getSetting('tallerLibKey');
  if (!k) { const e = new Error('Falta la clave del archivo.'); e.code = 'nokey'; throw e; }
  const d = await decrypt(await fetchEnc('lib'), unb64(k));
  d.items.forEach((it, i) => { it.i = i; });
  LIB = d;
  return d;
}
// Versiones nuevas (mapa índice → markdown). Opcional.
export async function loadNuevas() {
  if (VN !== undefined) return VN;
  try { const k = await getSetting('tallerLibKey'); const d = await decrypt(await fetchEnc('nueva'), unb64(k)); VN = d.items || {}; }
  catch (e) { VN = {}; }
  return VN;
}

// ---------- Mis enseñanzas ----------
export async function listSermons() {
  return (await all('sermons')).sort((a, b) => (b.actualizado || b.updatedAt || '').localeCompare(a.actualizado || a.updatedAt || ''));
}
export const getSermon = (id) => get('sermons', id);
export async function saveSermon(s) {
  const rec = { ...s, actualizado: now() };
  return put('sermons', rec);
}
export const deleteSermon = (id) => remove('sermons', id);

// ---------- Predicadas ----------
export async function getPred() { return (await getSetting('tallerPred', {})) || {}; }
export async function setPred(key, fecha) {
  const p = await getPred();
  if (fecha) p[key] = fecha; else delete p[key];
  await setSetting('tallerPred', p);
  return p;
}

export async function getStyle() { return (await getSetting('tallerStyle')) || 'clasico'; }
export const setStyle = (s) => setSetting('tallerStyle', s);

// ---------- Importación desde el Taller ----------
// Acepta: copia de seguridad del Taller ({app:"taller-del-predicador", sermones, kv}),
// archivo de sincronización ({v, s:{id:{t,d}}, del, kv:{k:{t,v}}}) o la lista de enseñanzas sola.
export function parseTallerData(data) {
  let sermones = [], pred = null, wstyle = null;
  const parseMaybe = (v) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return v; } } return v; };
  if (Array.isArray(data)) sermones = data;
  else if (data && data.app === 'taller-del-predicador') {
    sermones = data.sermones || [];
    pred = parseMaybe(data.kv?.tp_pred); wstyle = parseMaybe(data.kv?.tp_wstyle);
  } else if (data && data.s && typeof data.s === 'object') {
    const del = data.del || {};
    sermones = Object.entries(data.s).filter(([id]) => !del[id]).map(([, x]) => x && x.d).filter(Boolean);
    pred = parseMaybe(data.kv?.tp_pred?.v); wstyle = parseMaybe(data.kv?.tp_wstyle?.v);
  } else throw new Error('El archivo no es una copia del Taller del Predicador.');
  sermones = sermones.filter(s => s && s.id && (s.titulo || s.ensenanza));
  return { sermones, pred: pred && typeof pred === 'object' ? pred : null, wstyle: typeof wstyle === 'string' ? wstyle : null };
}

// Fusiona sin borrar nada: conserva la versión más reciente de cada enseñanza
export async function importTaller(parsed) {
  let nuevas = 0, actualizadas = 0, iguales = 0;
  for (const s of parsed.sermones) {
    const cur = await get('sermons', s.id);
    const { materiales, ...rest } = s;
    const rec = { ...rest, materiales: materiales || [], importadoDelTaller: true };
    if (!cur) { await put('sermons', { ...rec, createdAt: s.actualizado || now() }); nuevas++; }
    else if ((s.actualizado || '') > (cur.actualizado || '')) { await put('sermons', { ...cur, ...rec }); actualizadas++; }
    else iguales++;
  }
  if (parsed.pred) { const p = await getPred(); for (const [k, v] of Object.entries(parsed.pred)) if (!p[k] || v > p[k]) p[k] = v; await setSetting('tallerPred', p); }
  if (parsed.wstyle && ['clasico', 'editorial', 'minimal'].includes(parsed.wstyle) && !(await getSetting('tallerStyle'))) await setStyle(parsed.wstyle);
  return { nuevas, actualizadas, iguales };
}

// Lee los datos que el Taller guardó en ESTE navegador (mismo sitio). En iPhone/iPad, Safari y el ícono
// de inicio tienen almacenamientos separados: funciona cuando ambas apps se abren en el mismo lugar.
export function readTallerLocal() {
  return new Promise((resolve) => {
    let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => fin(null), 5000);
    try {
      const r = indexedDB.open('taller-predicador');
      r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* no existe */ } fin(null); };
      r.onerror = () => fin(null);
      r.onsuccess = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) { d.close(); return fin(null); }
        const out = {}; const q = d.transaction('kv').objectStore('kv').openCursor();
        q.onsuccess = () => { const c = q.result; if (c) { out[c.key] = c.value; c.continue(); } else { d.close(); fin(out); } };
        q.onerror = () => { d.close(); fin(null); };
      };
    } catch (e) { fin(null); }
  });
}

export async function importTallerLocal() {
  const kv = await readTallerLocal();
  if (!kv) return null;
  const pj = (v) => { if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return v; } } return v; };
  const sermones = pj(kv.tp_sermones) || [];
  const res = await importTaller({ sermones: Array.isArray(sermones) ? sermones.filter(s => s && s.id) : [], pred: pj(kv.tp_pred), wstyle: pj(kv.tp_wstyle) });
  let key = false;
  if (kv.tp_libkey && !(await hasKey())) { try { await setRawKey(String(kv.tp_libkey).replace(/^"|"$/g, '')); key = true; } catch (e) { /* clave no válida */ } }
  return { ...res, key, total: Array.isArray(sermones) ? sermones.length : 0 };
}
