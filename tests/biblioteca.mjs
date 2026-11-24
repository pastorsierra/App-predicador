// Pruebas de la Biblioteca de documentos. Datos ficticios. Uso: node tests/biblioteca.mjs URL
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
execFileSync('node', [new URL('./fixtures/hacer-pdf.mjs', import.meta.url).pathname, '/tmp/prueba.pdf']);
fs.writeFileSync('/tmp/notas.txt', 'Notas en texto\n\nSalmo 23:1 es el texto base.\n\nOtra línea con palabraclave.\n');
fs.writeFileSync('/tmp/falso.pdf', 'esto no es un pdf');
const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };

async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext(d);
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/bi-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Biblioteca vacía', async () => {
    await p.goto(BASE + '#/biblioteca'); await p.waitForSelector('text=Su biblioteca está vacía');
    return 'mensaje de biblioteca vacía';
  });
  await t('Añadir PDF y texto', async () => {
    await p.locator('input[type=file]').setInputFiles(['/tmp/prueba.pdf', '/tmp/notas.txt']);
    await p.waitForSelector('.doc-list li a strong >> text=Apuntes de prueba sobre el bautismo');
    await p.waitForSelector('.doc-list li a strong >> text=notas');
    const info = await p.locator('.doc-list li', { hasText: 'Apuntes' }).innerText();
    if (!/3 páginas/.test(info) || !/Autor de prueba/.test(info) || !/4 citas/.test(info)) throw new Error(info);
    return info.replace(/\s+/g, ' ');
  });
  await t('Archivo que no es PDF se rechaza', async () => {
    await p.locator('input[type=file]').setInputFiles('/tmp/falso.pdf');
    await p.waitForSelector('text=no es un PDF válido');
    if (await p.locator('.doc-list li').count() !== 2) throw new Error('se añadió');
    return 'aviso: no es un PDF válido';
  });
  await t('Buscar en todos los documentos', async () => {
    await p.fill('input[type=search]', 'palabraclave');
    await p.waitForSelector('.doc-results li');
    const n = await p.locator('.doc-results li').count();
    const txt = await p.locator('.doc-results').innerText();
    if (n !== 3 || !/pág\. 1/.test(txt) || !/pág\. 3/.test(txt)) throw new Error(`${n}: ${txt.slice(0, 200)}`);
    return '3 resultados (PDF págs. 1 y 3, y el texto)';
  });
  await t('Abrir resultado en su página con la palabra resaltada', async () => {
    await p.locator('.doc-results a', { hasText: 'pág. 3' }).click();
    await p.waitForSelector('[data-page="3"] mark');
    if (!/#\/documento\/[^/]+\/3/.test(p.url())) throw new Error(p.url());
    return 'página 3, «palabraclave» resaltada';
  });
  await t('Ver el PDF (pdf.js dibuja las páginas)', async () => {
    await p.locator('button', { hasText: 'Ver el PDF' }).click();
    await p.waitForSelector('.pdf-page.ready canvas');
    const px = await p.evaluate(() => { const c = document.querySelector('.pdf-page.ready canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 100) dark++; return { w: c.width, dark }; });
    if (px.dark < 200) throw new Error('el lienzo está en blanco');
    return `página dibujada (${px.w}px de ancho, ${px.dark} puntos de texto)`;
  });
  await t('Citas bíblicas detectadas (sin falsas)', async () => {
    const txt = await p.locator('.doc-box', { hasText: 'Citas bíblicas' }).innerText();
    for (const x of ['Hechos 2:38', 'Juan 3:5', 'Romanos 6:3-4', 'Mateo 28:19']) if (!txt.includes(x)) throw new Error(`falta ${x}`);
    if (/Ester 3:1|Juan 99/.test(txt)) throw new Error('detectó una cita falsa');
    if (!/p\. 1\s*p\. 3/.test(txt.replace(/\n/g, ' '))) throw new Error('Hch 2:38 debía estar en las págs. 1 y 3');
    return '4 citas; «Esta 3:1» y «Juan 99:1» descartadas';
  });
  await t('Nota en una página', async () => {
    await p.locator('.doc-box button', { hasText: 'Nota en la página' }).click();
    await p.fill('.modal input[type=number]', '2'); await p.fill('.modal textarea', 'Revisar este capítulo');
    await p.locator('.modal button', { hasText: 'Guardar' }).click();
    await p.waitForSelector('.doc-box li >> text=Revisar este capítulo');
    return 'nota guardada en la página 2';
  });
  await t('Ficha: título y etiquetas', async () => {
    await p.locator('summary', { hasText: 'Ficha del documento' }).click();
    await p.fill('input[aria-label="Etiquetas"]', 'bautismo, apuntes');
    await p.locator('.doc-box button', { hasText: 'Guardar' }).first().click();
    await p.waitForSelector('text=Ficha guardada');
    await p.goto(BASE + '#/biblioteca'); await p.waitForSelector('.chips button >> text=bautismo');
    await p.locator('.chips button', { hasText: 'bautismo' }).click();
    if (await p.locator('.doc-list li').count() !== 1) throw new Error('el filtro no funciona');
    return 'etiquetas guardadas y filtro por etiqueta';
  });
  await t('El versículo muestra los documentos que lo citan', async () => {
    await p.goto(BASE + '#/biblia/ACT/2?v=38'); await p.waitForSelector('#v38');
    await p.locator('#v38').click(); await p.waitForSelector('#panel .tabs');
    await p.locator('#panel .tabs button[data-tab="refs"]').click();
    await p.waitForSelector('#panel h3 >> text=En su biblioteca');
    const txt = await p.locator('#panel .tab-body').innerText();
    if (!/Apuntes de prueba[\s\S]*páginas 1, 3/.test(txt)) throw new Error(txt.slice(-200));
    return 'Hechos 2:38 → «Apuntes…», páginas 1 y 3';
  });
  await t('Buscar (general) incluye la biblioteca', async () => {
    await p.goto(BASE + '#/buscar?q=palabraclave'); await p.waitForSelector('h2 >> text=En su biblioteca');
    return 'sección «En su biblioteca» con resultados';
  });
  await t('El respaldo lleva la ficha y la nota, no el archivo', async () => {
    const r = await p.evaluate(async () => { const m = await import('./js/db.js'); const d = await m.exportAll(); return { docs: d.stores.docs.length, notes: d.stores.docs[0]?.notes?.length, files: 'docfiles' in d.stores }; });
    if (r.docs !== 2 || r.notes === undefined || r.files) throw new Error(JSON.stringify(r));
    return '2 fichas en el respaldo, sin archivos';
  });
  if (full) {
    await t('Sin conexión: abrir y ver el PDF', async () => {
      await p.goto(BASE + '#/inicio'); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.goto(BASE + '#/biblioteca'); await p.locator('.doc-list a', { hasText: 'Apuntes' }).click(); await p.waitForSelector('.pdf-page.ready canvas');
      await ctx.setOffline(true);
      await p.reload(); await p.waitForSelector('.pdf-page.ready canvas');
      await ctx.setOffline(false);
      return 'el lector de PDF funciona sin internet';
    });
  }
  await t('Eliminar documento', async () => {
    await p.goto(BASE + '#/biblioteca'); await p.locator('.doc-list a', { hasText: 'notas' }).click(); await p.waitForSelector('.doc-text');
    await p.locator('summary', { hasText: 'Ficha del documento' }).click();
    await p.locator('.doc-box button', { hasText: 'Eliminar' }).click(); await p.locator('.modal button', { hasText: 'Eliminar' }).click();
    await p.waitForURL(/#\/biblioteca$/); await p.waitForSelector('.doc-list li');
    if (await p.locator('.doc-list li').count() !== 1) throw new Error('no se eliminó');
    return 'documento eliminado (con confirmación)';
  });
  await t('Errores de consola', async () => {
    const real = errors.filter(e => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(' | '));
    return '0 errores';
  });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape'], true);
await run('iPhone', devices['iPhone 13'], false);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de la Biblioteca correctas`);
process.exit(fails ? 1 : 0);
