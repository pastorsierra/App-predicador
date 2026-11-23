// Trae automáticamente los datos del Taller del Predicador (solo lectura: nunca modifica los datos del Taller).
// 1) Del mismo equipo: enseñanzas, Biblias personales y clave del archivo que el Taller guardó en este navegador.
// 2) De GitHub: el archivo de sincronización del Taller (repositorio privado, p. ej. taller-datos), con la misma
//    conexión que ya usa el Taller o una clave (token) escrita aquí. La clave queda solo en este dispositivo.
import { getSetting, setSetting } from '../db.js';
import { parseTallerData, importTaller, importTallerLocal } from './store.js';
import { importFromTaller } from '../bibles.js';

const FILE = 'taller-datos.json';

function readTallerKV(keys) {
  return new Promise((resolve) => {
    let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => fin({}), 5000);
    try {
      const r = indexedDB.open('taller-predicador');
      r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* no existe */ } fin({}); };
      r.onerror = () => fin({});
      r.onsuccess = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) { d.close(); return fin({}); }
        const out = {}; const st = d.transaction('kv').objectStore('kv'); let n = keys.length;
        if (!n) { d.close(); return fin({}); }
        keys.forEach(k => { const q = st.get(k); q.onsuccess = () => { out[k] = q.result; if (--n === 0) { d.close(); fin(out); } }; q.onerror = () => { if (--n === 0) { d.close(); fin(out); } }; });
      };
    } catch (e) { fin({}); }
  });
}

export async function tallerGithubCfg() {
  const kv = await readTallerKV(['sync_cfg']);
  try { const c = typeof kv.sync_cfg === 'string' ? JSON.parse(kv.sync_cfg) : kv.sync_cfg; return c && c.token && c.owner && c.repo ? c : null; } catch (e) { return null; }
}
export const ownGithubCfg = () => getSetting('githubTaller');
export const saveGithubCfg = (c) => setSetting('githubTaller', c);

export async function activeGithubCfg() {
  return (await ownGithubCfg()) || (await tallerGithubCfg());
}

export async function pullGithub(cfg) {
  if (!cfg) throw new Error('No hay conexión con GitHub configurada.');
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${FILE}`;
  let r;
  try { r = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json', Authorization: `Bearer ${cfg.token}`, 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' }); }
  catch (e) { throw new Error('Sin conexión con GitHub.'); }
  if (r.status === 401) throw new Error('La clave (token) de GitHub no es válida o venció.');
  if (r.status === 404) throw new Error(`No se encontró ${FILE} en ${cfg.owner}/${cfg.repo}, o la clave no tiene permiso para leerlo.`);
  if (!r.ok) throw new Error(`GitHub respondió con un error (${r.status}).`);
  const data = await r.json();
  const res = await importTaller(parseTallerData(data));
  await setSetting('githubLastPull', new Date().toISOString());
  return res;
}

// Al abrir la app: trae lo que haya del Taller sin pedir nada. Devuelve un resumen o null si no hubo cambios.
export async function autoSync({ force = false } = {}) {
  const out = { nuevas: 0, actualizadas: 0, biblias: [], clave: false, github: null, errores: [] };
  try {
    const loc = await importTallerLocal();
    if (loc) { out.nuevas += loc.nuevas; out.actualizadas += loc.actualizadas; out.clave = loc.key; }
  } catch (e) { out.errores.push(e.message); }
  try { out.biblias = await importFromTaller({ onlyNew: true }); } catch (e) { out.errores.push(e.message); }
  try {
    const cfg = await activeGithubCfg();
    const last = await getSetting('githubLastPull');
    if (cfg && (force || !last || Date.now() - new Date(last).getTime() > 10 * 60 * 1000)) {
      const g = await pullGithub(cfg); out.github = g; out.nuevas += g.nuevas; out.actualizadas += g.actualizadas;
    }
  } catch (e) { out.errores.push(e.message); }
  return out;
}
