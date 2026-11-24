// Pruebas del módulo Enseñanzas (etapa 1 de la unión con el Taller del Predicador).
// Requiere el archivo cifrado de PRUEBA en ../Assj/ (tests/fixtures/hacer-archivo.mjs). Todos los datos son ficticios.
// Uso: node tests/ensenanzas.mjs http://127.0.0.1:8766/App-predicador/
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const KEY_RAW = 'vwaxt/Zcppz6w0/L182pWVHHSzH2scTxAbidBeqaDXE=';
const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };

const S1 = { id: 'prueba1', titulo: 'PRUEBA Uno', texto: 'Juan 3:16', categoria: '03', culto: 'dominical', estado: 'listo', fecha: '2099-01-10', notas: 'nota de prueba', enserie: true, serie: 'Serie de prueba', actualizado: '2026-01-01T00:00:00.000Z', ensenanza: '# PRUEBA UNO\n*Subtítulo de prueba*\n\n> Juan 3:16 — ¹⁶ Porque de tal manera amó Dios al mundo\n\n## I. Primer punto\n- Viñeta ==clave==\n\n**¡Frase de impacto!**', materiales: [] };
const S2 = { id: 'prueba2', titulo: 'PRUEBA Dos', texto: 'Romanos 6:4', categoria: '10', culto: 'especial', estado: 'prep', fecha: '', notas: '', enserie: true, serie: 'Serie de prueba', actualizado: '2026-01-02T00:00:00.000Z', ensenanza: '# PRUEBA DOS\n\n## I. Sepultados\n- Texto', materiales: [] };

async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext({ ...d, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/ens-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Sección Enseñanzas visible en el menú', async () => {
    await p.goto(BASE + '#/ensenanzas'); await p.waitForSelector('.page-head h1');
    if (!(await p.locator('[data-route="ensenanzas"].active').count())) throw new Error('menú no marcado');
    if (!(await p.locator('text=Traiga sus enseñanzas del Taller').count())) throw new Error('falta la guía de importación');
    return 'vacía, con guía de importación';
  });

  await t('Traer del Taller automáticamente al abrir (mismo sitio)', async () => {
    await p.evaluate(async ({ S1, S2, KEY_RAW }) => {
      await new Promise((res, rej) => { const r = indexedDB.open('taller-predicador', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); const st = tx.objectStore('kv');
          st.put(JSON.stringify([S1, S2]), 'tp_sermones'); st.put(JSON.stringify({ 'Sprueba2': '2026-01-05' }), 'tp_pred'); st.put(KEY_RAW, 'tp_libkey'); st.put(JSON.stringify('editorial'), 'tp_wstyle');
          tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
    }, { S1, S2, KEY_RAW });
    await p.reload(); // la app trae sola los datos del Taller al abrir
    await p.waitForSelector('.toast.show >> text=Traído del Taller');
    await p.goto(BASE + '#/ensenanzas/mis');
    await p.waitForSelector('.list a strong >> text=PRUEBA Uno');
    const n = await p.locator('.list li a').count();
    if (n !== 2) throw new Error(`${n} enseñanzas`);
    return `${n} enseñanzas, marcas y clave del archivo traídas sin tocar nada`;
  });

  await t('Lector con el diseño del Word', async () => {
    await p.click('.list a >> text=PRUEBA Uno'); await p.waitForSelector('.ens-page .pg');
    const cls = await p.locator('.ens-page .pg').getAttribute('class');
    if (!cls.includes('pg-editorial')) throw new Error('no respetó el estilo del Taller (editorial): ' + cls);
    const txt = await p.locator('.ens-page .pg').innerText();
    if (!txt.includes('PRUEBA UNO') || !txt.includes('Pastor Antonio Sierra J.')) throw new Error(txt.slice(0, 80));
    await p.locator('.seg button', { hasText: 'Clásico' }).click(); await p.waitForSelector('.pg-clasico .pwm');
    await p.screenshot({ path: `/tmp/ens-${name}-lector.png` });
    return 'estilos Nuevo y Clásico (con marca de agua) correctos';
  });

  await t('Descargar Word', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('button', { hasText: 'Descargar Word' }).click()]);
    const buf = fs.readFileSync(await dl.path());
    if (buf.slice(0, 2).toString() !== 'PK' || buf.length < 5000) throw new Error('archivo no válido');
    if (!dl.suggestedFilename().endsWith('.docx')) throw new Error('nombre de archivo perdido: ' + dl.suggestedFilename());
    return `${dl.suggestedFilename()} (${Math.round(buf.length / 1024)} KB)`;
  });

  await t('Marcar como predicada', async () => {
    await p.locator('button', { hasText: 'Predicada' }).first().click();
    await p.fill('.modal input[type=date]', '2026-02-01'); await p.click('.modal .btn.primary');
    await p.waitForSelector('text=Predicada el');
    return await p.locator('text=Predicada el').innerText();
  });

  await t('Editar y guardar', async () => {
    await p.locator('a', { hasText: 'Editar' }).click(); await p.waitForSelector('.md-editor');
    await p.fill('.ens-form input[aria-label="Título"]', 'PRUEBA Uno editada');
    await p.fill('.md-editor', '# PRUEBA UNO EDITADA\n\n## I. Nuevo punto\n- texto nuevo');
    await p.click('.ens-form .btn.primary'); await p.waitForSelector('.ens-title >> text=PRUEBA Uno editada');
    await p.reload(); await p.waitForSelector('.ens-page .pg');
    if (!(await p.locator('.ens-page .pg', { hasText: 'PRUEBA UNO EDITADA' }).count())) throw new Error('no persistió');
    return 'persistente tras recargar';
  });

  await t('Crear enseñanza nueva', async () => {
    await p.goto(BASE + '#/ensenanza/nueva'); await p.waitForSelector('.md-editor');
    await p.fill('.ens-form input[aria-label="Título"]', 'PRUEBA Nueva');
    await p.fill('.md-editor', '# PRUEBA NUEVA\n\n**¡Creada en Escudriñad!**');
    await p.click('.ens-form .btn.primary'); await p.waitForSelector('.ens-page .pimp');
    return 'creada con frase de impacto';
  });

  await t('Importar copia de seguridad del Taller (fusión)', async () => {
    const backup = { app: 'taller-del-predicador', v: 1, fecha: '2026-03-01', sermones: [{ ...S2, titulo: 'PRUEBA Dos actualizada', actualizado: '2026-03-01T00:00:00.000Z' }, { ...S1, titulo: 'PRUEBA Uno vieja', actualizado: '2025-01-01T00:00:00.000Z' }, { id: 'prueba3', titulo: 'PRUEBA Tres', ensenanza: '# TRES', actualizado: '2026-03-01T00:00:00.000Z' }], kv: {} };
    fs.writeFileSync('/tmp/copia-taller-prueba.json', JSON.stringify(backup));
    await p.goto(BASE + '#/ensenanzas/mis'); await p.waitForSelector('details.import-more');
    await p.click('details.import-more summary');
    await p.setInputFiles('input[type=file]', '/tmp/copia-taller-prueba.json');
    await p.waitForSelector('.toast.show >> text=Importadas');
    const msg = await p.locator('.toast').innerText();
    if (!/1 nuevas, 1 actualizadas, 1 sin cambios/.test(msg)) throw new Error(msg);
    await p.waitForSelector('.list a strong >> text=PRUEBA Dos actualizada');
    if (await p.locator('text=PRUEBA Uno vieja').count()) throw new Error('sobrescribió una versión más reciente');
    return msg;
  });

  await t('Filtro y búsqueda en Mis enseñanzas', async () => {
    await p.fill('.toolbar input[type=search]', 'sepultados');
    await p.waitForFunction(() => document.querySelectorAll('.list li a').length === 1);
    return '1 resultado por contenido';
  });

  await t('Series', async () => {
    await p.goto(BASE + '#/ensenanzas/series'); await p.waitForSelector('.block h2');
    const h = await p.locator('.block h2').first().innerText();
    if (!h.includes('Serie de prueba')) throw new Error(h);
    return h;
  });

  await t('Calendario', async () => {
    await p.goto(BASE + '#/ensenanzas/calendario'); await p.waitForSelector('.block');
    const txt = await p.locator('.ens-body').innerText();
    if (!txt.includes('PRUEBA Uno editada') || !txt.includes('Ya predicadas') || !txt.includes('PRUEBA Dos actualizada')) throw new Error(txt.slice(0, 200));
    return 'próximas y predicadas';
  });

  await t('Archivo cifrado (clave traída del Taller)', async () => {
    await p.goto(BASE + '#/ensenanzas/archivo'); await p.waitForSelector('.list a strong >> text=PRUEBA: El nombre sobre todo nombre');
    const n = await p.locator('.list li a').count();
    return `${n} enseñanzas del archivo`;
  });

  await t('Abrir enseñanza del archivo y versión nueva', async () => {
    await p.click('.list a >> text=PRUEBA: El nombre sobre todo nombre'); await p.waitForSelector('.ens-page .pg');
    const t1 = await p.locator('.ens-page .pg').innerText();
    if (!t1.includes('Primer punto de prueba') || !t1.includes('¡Frase de impacto de prueba!')) throw new Error(t1.slice(0, 100));
    await p.locator('.seg button', { hasText: 'Versión nueva' }).click();
    await p.waitForSelector('.ens-page .pg >> text=VERSIÓN NUEVA');
    await p.locator('button', { hasText: 'Copiar a Mis enseñanzas' }).click();
    await p.waitForFunction(() => location.hash.startsWith('#/ensenanza/')); await p.waitForSelector('a.btn >> text=Editar');
    if (!(await p.locator('.ens-page .pg >> text=VERSIÓN NUEVA').count())) throw new Error('no copió la versión elegida');
    return 'original, nueva y copia a Mis enseñanzas';
  });

  await t('Clave incorrecta y correcta', async () => {
    await p.evaluate(async () => { const m = await import('./js/taller/store.js'); await m.forgetKey(); });
    await p.goto(BASE + '#/ensenanzas/archivo'); await p.waitForSelector('.key-form');
    await p.fill('.key-form input', 'otra clave'); await p.click('.key-form button[type=submit]');
    await p.waitForSelector('.key-form >> text=La clave no es correcta.');
    await p.fill('.key-form input', 'Clave de prueba '); await p.click('.key-form button[type=submit]');
    await p.waitForSelector('.list a strong >> text=PRUEBA: Andar en santidad');
    return 'rechaza la incorrecta, abre con la correcta (sin distinguir mayúsculas, como el Taller)';
  });

  await t('Búsqueda global encuentra enseñanzas', async () => {
    await p.goto(BASE + '#/buscar?q=sepultados&en=all'); await p.waitForSelector('.res-count', { timeout: 60000 });
    if (!(await p.locator('.mine a strong >> text=Enseñanza: PRUEBA Dos actualizada').count())) throw new Error('no aparece');
    return 'aparece en «En sus datos»';
  });

  await t('El respaldo no incluye la clave del archivo', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('.settings-block');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Exportar respaldo' }).click()]);
    const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    if (data.stores.settings.some(s => s.id === 'tallerLibKey')) throw new Error('¡la clave está en el respaldo!');
    if (!data.stores.sermons || data.stores.sermons.length < 4) throw new Error('faltan enseñanzas en el respaldo');
    return `${data.stores.sermons.length} enseñanzas respaldadas, sin clave`;
  });

  if (full) {
    await t('Enseñanzas y archivo sin conexión', async () => {
      await p.goto(BASE + '#/inicio'); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload();
      await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.goto(BASE + '#/ensenanzas/archivo'); await p.waitForSelector('.list a');
      await ctx.setOffline(true);
      await p.reload(); await p.waitForSelector('.list a strong >> text=PRUEBA: Andar en santidad');
      await p.goto(BASE + '#/ensenanzas/mis'); await p.waitForSelector('.list a');
      await p.click('.list a >> text=PRUEBA Dos actualizada'); await p.waitForSelector('.ens-page .pg');
      await ctx.setOffline(false);
      return 'archivo y enseñanzas abren sin internet';
    });
  }

  await t('Errores de consola', async () => {
    const real = errors.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(' | '));
    return '0 errores';
  });
  await p.goto(BASE + '#/ensenanzas/mis'); await p.waitForSelector('.list'); await p.screenshot({ path: `/tmp/ens-${name}-lista.png` });
  await b.close();
}

await run('iPad', devices['iPad Pro 11 landscape'], true);
await run('iPhone', devices['iPhone 13'], false);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de Enseñanzas correctas`);
fs.writeFileSync('/tmp/ensenanzas-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
