// Pruebas: traer automáticamente del Taller (mismo equipo y GitHub simulado) y nuevas versiones libres. Datos ficticios.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const results = []; const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };
const man = JSON.parse(fs.readFileSync(new URL('../data/manifest.json', import.meta.url)));
const ids = Object.keys(man.versions.rv1909.chapters);
const books = ids.map(id => [man.versions.rv1909.names[id], id, man.versions.rv1909.chapters[id].map((n, ci) => Array.from({ length: n }, (_, vi) => `AUTO ${id} ${ci + 1}:${vi + 1}`))]);
const S1 = { id: 'auto1', titulo: 'PRUEBA Automática', texto: 'Juan 1:1', estado: 'listo', actualizado: '2026-01-01T00:00:00.000Z', ensenanza: '# AUTOMÁTICA\n\n## I. Punto', materiales: [] };
const REMOTE = { v: 1, s: { gh1: { t: 1, d: { id: 'gh1', titulo: 'PRUEBA desde GitHub', texto: 'Hch 2:38', estado: 'listo', actualizado: '2026-02-01T00:00:00.000Z', ensenanza: '# DESDE GITHUB', materiales: [] } } }, del: {}, kv: {} };

const d = { ...devices['iPad Pro 11 landscape'] }; delete d.defaultBrowserType;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
const ctx = await b.newContext({ ...d, acceptDownloads: true });
let authSeen = null;
await ctx.route('https://api.github.com/**', (route) => { authSeen = route.request().headers()['authorization']; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REMOTE) }); });
const p = await ctx.newPage(); p.setDefaultTimeout(30000);
const errors = []; p.on('pageerror', e => errors.push(String(e)));
const t = async (n, fn) => { try { rec(n, true, (await fn()) || 'correcto'); } catch (e) { rec(n, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/cx-fallo-${results.length}.png` }).catch(() => {}); } };

await t('Traer solo al abrir (Taller en el mismo equipo + GitHub)', async () => {
  await p.goto(BASE + '#/inicio'); await p.waitForSelector('.desk');
  await p.evaluate(async ({ S1, books }) => {
    await new Promise((res, rej) => { const r = indexedDB.open('taller-predicador', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); const st = tx.objectStore('kv');
        st.put(JSON.stringify([S1]), 'tp_sermones'); st.put(JSON.stringify({ abbr: 'AUTO', name: 'Biblia automática', books }), 'tp_bv_AUTO');
        st.put(JSON.stringify({ owner: 'pastorsierra', repo: 'taller-datos', token: 'TOKEN-DE-PRUEBA' }), 'sync_cfg');
        tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
  }, { S1, books });
  await p.reload(); await p.waitForSelector('.toast.show >> text=Traído del Taller', { timeout: 40000 });
  const msg = await p.locator('.toast').innerText();
  await p.goto(BASE + '#/mensajes'); await p.waitForSelector('.list a strong >> text=PRUEBA Automática'); await p.waitForSelector('.list a strong >> text=PRUEBA desde GitHub');
  if (authSeen !== 'Bearer TOKEN-DE-PRUEBA') throw new Error('no usó la clave del Taller: ' + authSeen);
  return msg;
});

await t('Biblia del Taller disponible en el selector', async () => {
  await p.goto(BASE + '#/biblia/JHN/1'); await p.waitForSelector('.ver-select');
  const opts = await p.locator('.ver-select option').allInnerTexts();
  for (const o of ['RV1909', 'BES', 'PDT', 'VBL', 'AUTO']) if (!opts.includes(o)) throw new Error('falta ' + o + ' en ' + opts.join(','));
  return opts.join(', ');
});

await t('Versiones libres nuevas (PDT y VBL) en la comparación', async () => {
  await p.click('#v1'); await p.click('#panel .tabs button[data-tab="comparar"]'); await p.waitForSelector('#panel .cmp-row');
  const txt = await p.locator('#panel .cmp-row').innerText();
  if (!txt.includes('PDT') || !txt.includes('VBL') || !txt.includes('AUTO JHN 1:1')) throw new Error(txt.slice(0, 200));
  return 'RV1909, BES, PDT, VBL y AUTO';
});

await t('Traer ahora desde Ajustes (no duplica)', async () => {
  await p.goto(BASE + '#/ajustes'); await p.waitForSelector('text=Conexión con el Taller del Predicador');
  await p.locator('button', { hasText: 'Traer ahora' }).click();
  await p.waitForSelector('text=Listo: 0 mensajes nuevos');
  return await p.locator('section', { hasText: 'Conexión con el Taller' }).locator('p[role=status]').innerText();
});

await t('Clave escrita aquí se usa y no va en el respaldo', async () => {
  await p.fill('input[aria-label="Clave (token) de GitHub"]', 'OTRA-CLAVE');
  await p.locator('button', { hasText: 'Traer ahora' }).click(); await p.waitForSelector('text=Listo:');
  if (authSeen !== 'Bearer OTRA-CLAVE') throw new Error('no usó la clave nueva');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Exportar respaldo' }).click()]);
  const txt = fs.readFileSync(await dl.path(), 'utf8');
  if (txt.includes('OTRA-CLAVE') || txt.includes('TOKEN-DE-PRUEBA')) throw new Error('¡la clave está en el respaldo!');
  return 'clave propia usada; el respaldo no la contiene';
});

await t('Errores de consola', async () => { if (errors.length) throw new Error(errors.join(' | ')); return '0 errores'; });
await b.close();
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de conexión correctas`);
fs.writeFileSync('/tmp/cx-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
