// Pruebas: exégesis guiada, elegir versiones para comparar y centro de hermenéutica (datos ficticios).
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
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/eh-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Crear una exégesis guiada', async () => {
    await p.goto(BASE + '#/estudios'); await p.fill('.new-study input', 'Ro 6:3-4'); await p.selectOption('.new-study select', 'exegesis');
    await p.click('.new-study .btn.primary'); await p.waitForSelector('#sec-traducciones');
    const n = await p.locator('.sec').count(); if (n < 15) throw new Error(n + ' secciones');
    const tr = await p.locator('#sec-traducciones').innerText();
    for (const v of ['RV1909', 'BES', 'PDT', 'VBL']) if (!tr.includes(v)) throw new Error('falta ' + v);
    if (!(await p.locator('#sec-gramatical textarea').count())) throw new Error('falta contexto gramatical');
    return `${n} secciones; comparación con RV1909, BES, PDT y VBL`;
  });
  await t('La exégesis se guarda y se exporta', async () => {
    await p.fill('#sec-argumento textarea', 'Argumento de prueba.'); await p.waitForTimeout(900); await p.reload(); await p.waitForSelector('#sec-argumento textarea');
    if ((await p.inputValue('#sec-argumento textarea')) !== 'Argumento de prueba.') throw new Error('no persistió');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('.study-tools button', { hasText: 'Exportar texto' }).click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    if (!txt.includes('Comparación de traducciones') || !txt.includes('- PDT:') || !txt.includes('Argumento de prueba.')) throw new Error('contenido');
    return dl.suggestedFilename();
  });
  await t('La lista distingue el tipo de estudio', async () => {
    await p.goto(BASE + '#/estudios'); await p.waitForSelector('.study-list a');
    if (!(await p.locator('.study-list a span', { hasText: 'Exégesis guiada · Romanos 6:3-4' }).count())) throw new Error('sin tipo');
    return 'Exégesis guiada · Romanos 6:3-4';
  });
  await t('Elegir versiones para comparar', async () => {
    await p.goto(BASE + '#/biblia/JHN/3'); await p.waitForSelector('#v16'); await p.click('#v16');
    await p.click('#panel .tabs button[data-tab="comparar"]'); await p.waitForSelector('#panel .cmp-pick');
    await p.click('#panel .cmp-pick button'); await p.waitForSelector('.modal .switch-row');
    await p.locator('.modal .switch-row', { hasText: 'PDT' }).locator('input').uncheck(); await p.click('.modal .btn.primary');
    await p.waitForSelector('#panel .cmp-pick >> text=3 de 4 versiones');
    const vers = await p.locator('#panel .cmp-ver').allInnerTexts(); if (vers.includes('PDT')) throw new Error('PDT sigue visible');
    return vers.filter((v, i, a) => a.indexOf(v) === i).join(', ');
  });
  await t('Centro de hermenéutica', async () => {
    await p.goto(BASE + '#/estudios'); await p.click('.page-tabs a >> text=Hermenéutica'); await p.waitForSelector('.herm-acc');
    const n = await p.locator('.herm-acc').count(); if (n !== 4) throw new Error(n + ' apartados');
    await p.click('.herm-acc summary >> text=Errores y falacias frecuentes'); await p.waitForSelector('text=Falacia de la raíz');
    return 'principios, géneros, falacias y tipología';
  });
  await t('Evaluar una interpretación', async () => {
    await p.fill('input[aria-label="Pasaje a evaluar"]', 'Mt 16:18-19'); await p.fill('textarea[aria-label="Interpretación"]', 'Interpretación de prueba.');
    await p.click('form .btn.primary >> text=Evaluar'); await p.waitForSelector('.herm-q');
    const t1 = await p.locator('.sec', { has: p.locator('h2', { hasText: /^El texto$/ }) }).innerText();
    if (!t1.includes('Género: Evangelios') || !/Pasajes relacionados \(\d+\)/.test(t1)) throw new Error(t1.slice(0, 200));
    const qs = p.locator('.herm-q'); const n = await qs.count();
    for (let i = 0; i < n; i++) await qs.nth(i).locator('button', { hasText: i === 2 ? 'No' : i === 5 ? 'No sé' : 'Sí' }).first().click();
    await p.waitForSelector('.herm-sum >> text=8 criterios cumplidos · 1 no cumplidos · 1 por investigar');
    await p.waitForTimeout(600); await p.reload(); await p.waitForSelector('.herm-sum >> text=8 criterios cumplidos');
    return `${n} preguntas; resultado persistente con 2 puntos a revisar`;
  });
  await t('Las evaluaciones no se mezclan con los estudios', async () => {
    await p.goto(BASE + '#/estudios'); await p.waitForSelector('.study-list');
    if (await p.locator('.study-list a', { hasText: 'Evaluación' }).count()) throw new Error('aparece en estudios');
    await p.goto(BASE + '#/hermeneutica'); await p.waitForSelector('.list a strong >> text=Mateo 16:18-19');
    return 'solo en Hermenéutica';
  });
  await t('Errores de consola', async () => { if (errors.length) throw new Error(errors.join(' | ')); return '0 errores'; });
  await p.goto(BASE + '#/hermeneutica'); await p.waitForSelector('.list a'); await p.click('.list a'); await p.waitForSelector('.herm-sum'); await p.screenshot({ path: `/tmp/eh-${name}.png` });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape']);
await run('iPhone', devices['iPhone 13']);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de Exégesis y Hermenéutica correctas`);
fs.writeFileSync('/tmp/eh-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
