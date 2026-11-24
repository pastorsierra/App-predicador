// Pruebas de Biblioteca → Mis mensajes (material de estudio de solo lectura traído del Taller) y del nuevo diseño.
// Requiere el archivo cifrado de PRUEBA en ../Assj/ (tests/fixtures/hacer-archivo.mjs). Todos los datos son ficticios.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };
const BACKUP = { app: 'taller-del-predicador', sermones: [
  { id: 'm1', titulo: 'PRUEBA El nuevo nacimiento', texto: 'Juan 3:1-8', actualizado: '2026-01-01T00:00:00.000Z', ensenanza: '# PRUEBA El nuevo nacimiento\n\n> Juan 3:5 — Respondió Jesús\n\n## I. La necesidad\n\nNicodemo era **maestro de Israel**. Ver Hch 2:38 y Romanos 6:4.\n\n- Nacer del agua\n- Nacer del Espíritu', materiales: [] },
  { id: 'm2', titulo: 'PRUEBA La fe que vence', texto: '1 Juan 5:4', actualizado: '2026-01-02T00:00:00.000Z', ensenanza: '# PRUEBA La fe que vence\n\nTexto sobre la victoria.', materiales: [] }] };
fs.writeFileSync('/tmp/copia-taller-prueba.json', JSON.stringify(BACKUP));

async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext(d);
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/msg-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Ya no hay pantallas copiadas del Taller', async () => {
    await p.goto(BASE + '#/inicio'); await p.waitForSelector('.desk');
    for (const r of ['ensenanzas', 'bosquejo', 'diapositivas']) if (await p.locator(`[data-route="${r}"], a[href^="#/${r}"]`).count()) throw new Error(`queda ${r}`);
    await p.goto(BASE + '#/ensenanzas'); await p.waitForSelector('.view-inner');
    const txt = await p.locator('#view').innerText(); if (/Series|Calendario|Descargar Word/.test(txt)) throw new Error(txt.slice(0, 80));
    return 'sin enseñanzas, series, calendario, bosquejos, diapositivas ni Word';
  });
  await t('Biblioteca vacía explica cómo traer los mensajes', async () => {
    await p.goto(BASE + '#/mensajes'); await p.waitForSelector('text=Traiga sus mensajes del Taller');
    if (!(await p.locator('.tabs a[aria-selected="true"]', { hasText: 'Mis mensajes' }).count())) throw new Error('pestaña');
    return 'guía con los dos pasos';
  });
  await t('Importar la copia del Taller', async () => {
    await p.setInputFiles('.import-box input[type=file]', '/tmp/copia-taller-prueba.json');
    await p.waitForSelector('.list a strong >> text=PRUEBA El nuevo nacimiento');
    return `${await p.locator('.list li a').count()} mensajes`;
  });
  await t('Abrir el archivo cifrado con la clave', async () => {
    await p.locator('.import-more summary').click();
    await p.fill('.import-box input[type=password]', 'clave de prueba'); await p.locator('.import-box button', { hasText: 'Abrir mi archivo' }).click();
    await p.waitForSelector('.list a strong >> text=PRUEBA: El nombre sobre todo nombre', { timeout: 60000 });
    return `${await p.locator('.list li a').count()} mensajes (2 importados + 2 del archivo)`;
  });
  await t('Buscar dentro del contenido', async () => {
    await p.fill('.toolbar input[type=search]', 'nicodemo'); await p.waitForFunction(() => document.querySelectorAll('.list li a').length === 1);
    await p.locator('.list li a').first().click(); await p.waitForSelector('.msg-text mark');
    return 'encontrado por el contenido y resaltado al abrir';
  });
  await t('Lector de estudio con pasajes citados', async () => {
    const side = await p.locator('.msg-side').innerText();
    for (const x of ['Juan 3:5', 'Hechos 2:38', 'Romanos 6:4']) if (!side.includes(x)) throw new Error(`falta ${x}`);
    if ((await p.locator('.msg-text h2').count()) !== 0) throw new Error('repite el título');
    if (await p.locator('text=Descargar Word').count()) throw new Error('tiene Word');
    await p.locator('.msg-side a', { hasText: 'Hechos 2:38' }).click(); await p.waitForURL(/#\/biblia\/ACT\/2/);
    return '3 pasajes enlazados al lector; sin Word ni diseño del Taller';
  });
  await t('Mensaje del archivo usa la versión nueva', async () => {
    await p.goto(BASE + '#/mensaje/a/0'); await p.waitForSelector('.msg-text');
    const txt = await p.locator('.msg-text').innerText(); if (!/Versión nueva de prueba/.test(txt)) throw new Error(txt.slice(0, 80));
    return 'texto de la versión nueva';
  });
  await t('Doctrinas muestran los mensajes que citan sus pasajes', async () => {
    await p.goto(BASE + '#/doctrina/bautismo-agua'); await p.waitForSelector('text=Añadir pasajes sugeridos'); await p.click('text=Añadir pasajes sugeridos');
    await p.waitForSelector('#sec-ensenanzas .list a strong >> text=PRUEBA: El nombre sobre todo nombre');
    return 'mensaje del archivo que cita Hechos 2:38';
  });
  await t('Barra superior: ir a un pasaje', async () => {
    await p.goto(BASE + '#/inicio'); await p.waitForSelector('.desk');
    await p.fill('#omni-q', 'Ro 8:28'); await p.press('#omni-q', 'Enter'); await p.waitForSelector('#v28.target');
    await p.fill('#omni-q', 'gracia'); await p.press('#omni-q', 'Enter'); await p.waitForURL(/#\/buscar\?q=gracia/);
    return 'Ro 8:28 abre el lector; «gracia» abre la búsqueda';
  });
  if (full) {
    await t('Menú de herramientas', async () => {
      await p.goto(BASE + '#/inicio'); await p.waitForSelector('.desk');
      await p.click('.tools-menu summary'); await p.locator('.menu a', { hasText: 'Cronología' }).click();
      await p.waitForSelector('.chrono-item');
      if (!(await p.locator('.tools-menu.active').count())) throw new Error('no se marca la sección');
      if (await p.locator('.tools-menu[open]').count()) throw new Error('el menú quedó abierto');
      return 'abre Cronología, se cierra y queda marcado';
    });
  }
  await t('Errores de consola', async () => {
    const real = errors.filter(e => !/Failed to load resource/.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(' | ')); return '0 errores';
  });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape'], true);
await run('iPhone', devices['iPhone 13'], false);
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas de Mis mensajes correctas`);
process.exit(fails ? 1 : 0);
