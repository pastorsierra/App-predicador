// Pruebas del Taller del predicador: bosquejos, conversión a enseñanza (Word) y diapositivas (datos ficticios).
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
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/pr-fallo-${name}-${results.length}.png` }).catch(() => {}); } };
  let url = '';
  await t('Nuevo bosquejo con plantilla de tres puntos', async () => {
    await p.goto(BASE + '#/ensenanzas/bosquejos'); await p.waitForSelector('.new-study select');
    await p.selectOption('.new-study select', 'tres'); await p.click('.new-study .btn.primary'); await p.waitForSelector('.point');
    url = p.url(); const n = await p.locator('.point').count(); if (n !== 3) throw new Error(n + ' puntos');
    return '3 puntos';
  });
  await t('Editar bosquejo: texto base, puntos, subpuntos, citas y frases', async () => {
    await p.fill('.study-title', 'PRUEBA El nombre sobre todo nombre');
    await p.fill('input[aria-label="Texto base (ej.: Hechos 2:38)"]', 'Hch 2:38'); await p.waitForSelector('.base-text >> text=Arrepentíos');
    const titles = p.locator('.point-title');
    await titles.nth(0).fill('El mandato'); await titles.nth(1).fill('La promesa'); await titles.nth(2).fill('Para todos');
    const p0 = p.locator('.point').nth(0);
    await p0.locator('button', { hasText: 'Subpunto' }).click(); await p0.locator('.sub-row input').first().fill('Arrepentimiento');
    await p0.locator('input[aria-label="Añadir cita"]').fill('Ro 6:4'); await p0.locator('button[type=submit]').click();
    await p0.locator('.ref-preview', { hasText: 'sepultados' }).waitFor();
    await p0.locator('textarea[aria-label="Frase de impacto (opcional)"]').fill('¡El nombre de Jesús es poder!');
    await p.locator('.point').nth(1).locator('button[aria-label="Bajar punto"]').click();
    await p.waitForFunction(() => document.querySelectorAll('.point-title')[2].value === 'La promesa');
    await p.locator('.point').nth(1).locator('button[aria-label="Eliminar punto"]').click(); await p.click('.modal .btn.danger');
    await p.waitForFunction(() => document.querySelectorAll('.point').length === 2);
    await p.fill('textarea[aria-label="Conclusión corta y firme"]', 'Conclusión de prueba.');
    await p.locator('.sec', { hasText: 'Frases centrales' }).locator('button', { hasText: 'Frase' }).click();
    await p.fill('input[aria-label="Frase 1"]', '¡Hay poder en su nombre!');
    await p.waitForTimeout(900); await p.reload(); await p.waitForSelector('.point');
    const vals = await p.locator('.point-title').evaluateAll(els => els.map(e => e.value));
    if (vals.join('|') !== 'El mandato|La promesa') throw new Error(vals.join('|'));
    return 'guardado: 2 puntos (uno movido y otro eliminado), cita con texto, frases';
  });
  await t('Crear enseñanza desde el bosquejo (formato del Word)', async () => {
    await p.click('.study-tools button >> text=Crear enseñanza (Word)'); await p.waitForSelector('.ens-page .pg');
    const txt = await p.locator('.ens-page .pg').innerText();
    for (const s of ['PRUEBA EL NOMBRE SOBRE TODO NOMBRE', 'EL MANDATO', 'Arrepentíos', 'sepultados', '¡El nombre de Jesús es poder!', 'Conclusión de prueba.', 'Pastor Antonio Sierra J.']) if (!txt.toUpperCase().includes(s.toUpperCase())) throw new Error('falta ' + s);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('button', { hasText: 'Descargar Word' }).click()]);
    const buf = fs.readFileSync(await dl.path()); if (buf.slice(0, 2).toString() !== 'PK') throw new Error('Word inválido');
    return `enseñanza creada; ${dl.suggestedFilename()}`;
  });
  await t('Actualizar la enseñanza no la duplica', async () => {
    await p.goto(url); await p.waitForSelector('.point'); await p.locator('.point-title').nth(0).fill('El mandato apostólico'); await p.waitForTimeout(700);
    await p.click('.study-tools button >> text=Actualizar enseñanza (Word)'); await p.waitForSelector('.ens-page .pg >> text=EL MANDATO APOSTÓLICO');
    await p.goto(BASE + '#/ensenanzas/mis'); await p.waitForSelector('.list');
    const n = await p.locator('.list a', { hasText: 'PRUEBA El nombre sobre todo nombre' }).count(); if (n !== 1) throw new Error(n + ' copias');
    return '1 sola enseñanza, actualizada';
  });
  await t('Diapositivas', async () => {
    await p.goto(url); await p.waitForSelector('.point'); await p.click('.study-tools a >> text=Diapositivas'); await p.waitForSelector('.slide');
    const count = await p.locator('.slide-count').innerText(); const total = +count.split('/')[1];
    if (!(await p.locator('.s-title h1', { hasText: 'PRUEBA El nombre' }).count())) throw new Error('portada');
    await p.click('.slides-nav button[aria-label="Siguiente"]'); await p.waitForSelector('.s-verse blockquote >> text=Arrepentíos');
    await p.focus('.slides'); await p.keyboard.press('ArrowRight'); await p.waitForSelector('.s-point h2 >> text=El mandato apostólico');
    await p.click('.slides-bar .seg button >> text=Claro'); if (!(await p.locator('.slides.theme-claro').first().count())) throw new Error('tema');
    await p.screenshot({ path: `/tmp/pr-${name}-slides.png` });
    return `${total} diapositivas; navegación con botones y teclado; temas`;
  });
  await t('Duplicar y usar como plantilla', async () => {
    await p.goto(url); await p.waitForSelector('.point');
    await p.locator('label', { hasText: 'Usar este bosquejo como plantilla' }).locator('input').check(); await p.waitForTimeout(700);
    const before = p.url();
    await p.click('.study-tools button >> text=Duplicar'); await p.waitForFunction((u) => location.href !== u, before);
    await p.waitForFunction(() => document.querySelector('.study-title')?.value.endsWith('(copia)'));
    await p.goto(BASE + '#/ensenanzas/bosquejos'); await p.waitForSelector('.new-study select');
    const opts = await p.locator('.new-study select option').allInnerTexts();
    if (!opts.some(o => o.startsWith('Mi plantilla: PRUEBA'))) throw new Error(opts.join(','));
    return 'copia creada; plantilla disponible';
  });
  await t('Convertir un estudio en bosquejo', async () => {
    await p.goto(BASE + '#/estudios'); await p.fill('.new-study input', 'Jn 3:16'); await p.click('.new-study .btn.primary'); await p.waitForSelector('#sec-interpretacion textarea');
    await p.fill('#sec-interpretacion textarea', 'Interpretación para el bosquejo.'); await p.waitForTimeout(800);
    await p.click('.study-tools button >> text=Convertir en bosquejo'); await p.waitForSelector('.point');
    if ((await p.inputValue('input[aria-label="Texto base (ej.: Hechos 2:38)"]')) !== 'Juan 3:16') throw new Error('texto base');
    if ((await p.locator('.point textarea').first().inputValue()) !== 'Interpretación para el bosquejo.') throw new Error('contenido');
    return 'bosquejo con el pasaje y la interpretación del estudio';
  });
  await t('Los bosquejos van en el respaldo', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('text=Exportar respaldo');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Exportar respaldo' }).click()]);
    const data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); if (!(data.stores.outlines?.length >= 3)) throw new Error('faltan');
    return `${data.stores.outlines.length} bosquejos respaldados`;
  });
  await t('Errores de consola', async () => { if (errors.length) throw new Error(errors.join(' | ')); return '0 errores'; });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape']);
await run('iPhone', devices['iPhone 13']);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas del Taller del predicador correctas`);
fs.writeFileSync('/tmp/pr-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
