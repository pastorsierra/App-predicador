// Pruebas del módulo Doctrinas (datos ficticios).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const results = []; const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };
async function run(name, device) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext({ ...d, acceptDownloads: true }); const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/doc-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Biblioteca doctrinal con las 20 categorías', async () => {
    await p.goto(BASE + '#/estudios'); await p.click('.page-tabs a >> text=Doctrinas'); await p.waitForSelector('.doc-card');
    const n = await p.locator('.doc-card').count(); if (n !== 20) throw new Error(n + ' categorías');
    return '20 categorías';
  });
  await t('Pasajes sugeridos con texto bíblico real', async () => {
    await p.click('.doc-card >> text=Bautismo en agua'); await p.waitForSelector('text=Añadir pasajes sugeridos');
    await p.click('text=Añadir pasajes sugeridos');
    await p.waitForFunction(() => document.querySelectorAll('#sec-principal .doc-refs li').length === 9);
    await p.waitForFunction(() => [...document.querySelectorAll('#sec-principal .ref-preview')].every(e => e.textContent.length > 10));
    const t1 = await p.locator('#sec-principal .doc-refs li').first().innerText();
    if (!t1.includes('Hechos 2:38') || !t1.includes('Arrepentíos')) throw new Error(t1.slice(0, 120));
    return '9 pasajes; Hechos 2:38 con su texto';
  });
  await t('Recorrido por la Escritura en orden canónico', async () => {
    const groups = await p.locator('#sec-recorrido .tl-group').allInnerTexts();
    const first = await p.locator('#sec-recorrido li a').first().innerText();
    if (!first.startsWith('Mateo 28:19')) throw new Error('primero: ' + first);
    return groups.join(' → ').toLowerCase();
  });
  await t('Añadir, mover y quitar pasajes', async () => {
    await p.fill('#sec-complementary input', 'Jn 3:5'); await p.click('#sec-complementary button[type=submit]');
    await p.waitForSelector('#sec-complementary .doc-refs a >> text=Juan 3:5');
    await p.locator('#sec-principal .doc-refs li', { hasText: 'Marcos 16:16' }).locator('button', { hasText: 'Pasar a complementarios' }).click();
    await p.waitForSelector('#sec-complementary .doc-refs a >> text=Marcos 16:16');
    await p.locator('#sec-principal .doc-refs li', { hasText: 'Colosenses 2:12' }).locator('button[aria-label^="Quitar"]').click();
    await p.waitForFunction(() => !document.querySelector('#sec-principal')?.innerText.includes('Colosenses 2:12'));
    await p.fill('#sec-complementary input', 'Hechos 99'); await p.click('#sec-complementary button[type=submit]');
    await p.waitForSelector('#sec-complementary >> text=Hechos tiene 28 capítulos.');
    return 'añadido Juan 3:5, movido Marcos 16:16, quitado Colosenses 2:12; referencia inválida rechazada';
  });
  await t('Guardado de las secciones', async () => {
    await p.fill('#sec-definicion textarea', 'Definición de prueba.'); await p.waitForTimeout(900);
    await p.reload(); await p.waitForSelector('#sec-definicion textarea');
    if ((await p.inputValue('#sec-definicion textarea')) !== 'Definición de prueba.') throw new Error('no persistió');
    const n = await p.locator('#sec-principal .doc-refs li').count(); if (n !== 7) throw new Error(n + ' principales');
    return 'persistente (7 principales, 2 complementarios)';
  });
  await t('Mensajes relacionados automáticamente', async () => {
    await p.evaluate(async () => { const db = await import('./js/db.js'); await db.put('sermons', { id: 'prueba-bautismo', titulo: 'PRUEBA bautismo', texto: '', ensenanza: '# PRUEBA\n\n> Hechos 2:38 — texto' }); });
    await p.goto(BASE + '#/doctrinas'); await p.waitForSelector('.doc-card');
    await p.goto(BASE + '#/doctrina/bautismo-agua'); await p.waitForSelector('#sec-ensenanzas .list a strong >> text=PRUEBA bautismo');
    return 'el mensaje que cita Hechos 2:38 aparece';
  });
  await t('Exportar doctrina', async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('.study-tools button', { hasText: 'Exportar texto' }).click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    if (!txt.includes('Definición de prueba.') || !txt.includes('Arrepentíos') || !dl.suggestedFilename().endsWith('.md')) throw new Error('contenido');
    return dl.suggestedFilename();
  });
  await t('Doctrina personal: crear y eliminar', async () => {
    await p.goto(BASE + '#/doctrinas'); await p.fill('.new-study input', 'PRUEBA El nombre de Jesús'); await p.click('.new-study button');
    await p.waitForSelector('.study-title'); if ((await p.inputValue('.study-title')) !== 'PRUEBA El nombre de Jesús') throw new Error('título');
    await p.locator('.study-tools button', { hasText: 'Eliminar' }).click(); await p.click('.modal .btn.danger');
    await p.waitForSelector('.doc-card'); if (await p.locator('.doc-card', { hasText: 'PRUEBA El nombre' }).count()) throw new Error('no se eliminó');
    return 'creada y eliminada';
  });
  await t('Las doctrinas van en el respaldo', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('text=Exportar respaldo');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Exportar respaldo' }).click()]);
    const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    if (!data.stores.doctrines?.some(x => x.id === 'bautismo-agua')) throw new Error('falta');
    return 'incluidas';
  });
  await t('Errores de consola', async () => { if (errors.length) throw new Error(errors.join(' | ')); return '0 errores'; });
  await p.goto(BASE + '#/doctrina/bautismo-agua'); await p.waitForSelector('#sec-recorrido li'); await p.screenshot({ path: `/tmp/doc-${name}.png` });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape']);
await run('iPhone', devices['iPhone 13']);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de Doctrinas correctas`);
fs.writeFileSync('/tmp/doc-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
