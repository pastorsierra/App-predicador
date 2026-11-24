// Pruebas de Personajes bíblicos y Cronología. Uso: node tests/personajes.mjs URL
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };

async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext(d);
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/pe-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Lista de personajes', async () => {
    await p.goto(BASE + '#/personajes'); await p.waitForSelector('.list.compact li a strong');
    const first = await p.locator('.list.compact li a strong').first().innerText();
    const n = await p.locator('.list.compact li').count();
    if (n !== 80) throw new Error(`se esperaban 80 y hay ${n}`);
    if (/^(Dios|God)$/.test(first)) throw new Error('Dios aparece como personaje');
    return `80 personajes; el más mencionado: ${first}`;
  });

  await t('Buscar «abraham» y abrir su ficha', async () => {
    await p.fill('input[type=search]', 'abraham'); await p.waitForFunction(() => document.querySelector('.list.compact li a strong')?.innerText === 'Abraham');
    await p.locator('.list.compact li a', { hasText: 'Abraham' }).first().click();
    await p.waitForSelector('h1:text-is("Abraham")');
    const fam = await p.locator('.fam').innerText();
    for (const x of ['Thare', 'Sara', 'Isaac', 'Ismael', 'Jacob (Israel)']) if (!fam.includes(x)) throw new Error(`falta ${x} en la familia`);
    return 'familia: padre Thare, esposa Sara, hijos Isaac e Ismael, nieto Jacob';
  });

  await t('Versículos con texto real', async () => {
    await p.waitForFunction(() => { const s = document.querySelector('.ref-list li .ref-preview'); return s && s.textContent.length > 10; });
    const first = await p.locator('.ref-list li').first().innerText();
    if (!/Génesis 11:26/.test(first) || !/Abram/.test(first)) throw new Error(first);
    return first.replace(/\s+/g, ' ').slice(0, 80);
  });

  await t('Navegar por la familia (Isaac → Rebeca)', async () => {
    await p.locator('.fam a.chip', { hasText: /^Isaac$/ }).first().click(); await p.waitForSelector('h1:text-is("Isaac")');
    const fam = await p.locator('.fam').innerText(); if (!fam.includes('Rebeca') || !fam.includes('Esaú') || !fam.includes('Jacob')) throw new Error(fam);
    return 'Isaac: esposa Rebeca, hijos Esaú y Jacob';
  });

  await t('Época del personaje enlaza a la cronología', async () => {
    await p.goto(BASE + '#/personajes'); await p.fill('input[type=search]', 'moises');
    await p.locator('.list.compact li a', { hasText: 'Moisés' }).first().click(); await p.waitForSelector('h1:text-is("Moisés")');
    await p.locator('section', { hasText: 'Época' }).locator('a', { hasText: 'Éxodo y peregrinación' }).click();
    await p.waitForSelector('#exodo.flash');
    return 'Moisés → «Éxodo y peregrinación» resaltado en la cronología';
  });

  await t('Homónimos distinguidos', async () => {
    await p.goto(BASE + '#/personajes'); await p.fill('input[type=search]', 'zacarias');
    await p.waitForFunction(() => document.querySelectorAll('.list.compact li').length > 5);
    const rows = await p.locator('.list.compact li a span').allInnerTexts();
    if (!rows.some(r => /hijo de/.test(r))) throw new Error('sin parentesco para distinguir');
    return `${rows.length} Zacarías, distinguidos por su padre y primera mención`;
  });

  await t('Cronología: períodos, rangos y aclaraciones', async () => {
    await p.goto(BASE + '#/cronologia'); await p.waitForSelector('.chrono-item');
    const n = await p.locator('.chrono-item').count();
    const ex = await p.locator('#exodo').innerText();
    if (!/1446/.test(ex) || !/1270/.test(ex) || !/1 Reyes 6:1/.test(ex)) throw new Error('el éxodo no muestra las dos fechas');
    const or = await p.locator('#origenes').innerText(); if (!/Sin fecha fiable/.test(or)) throw new Error('los orígenes tienen fecha');
    const segs = await p.locator('.chrono-seg').count();
    return `${n} períodos, ${segs} en la barra; el éxodo con fecha temprana y tardía`;
  });

  await t('Cronología enlaza a versículos y personas', async () => {
    await p.locator('#reino-unido a.chip.person', { hasText: 'David' }).click(); await p.waitForSelector('h1:text-is("David")');
    await p.goto(BASE + '#/cronologia'); await p.locator('#pentecostes a.chip', { hasText: 'Hch 2:1' }).first().click();
    await p.waitForURL(/#\/biblia\/ACT\/2/);
    return 'David abre su ficha; Hechos 2:1 abre el lector';
  });

  if (full) {
    await t('Pestaña «Personas» en el panel del versículo', async () => {
      await p.goto(BASE + '#/biblia/GEN/22'); await p.waitForSelector('#v2');
      await p.locator('#v2').click(); await p.waitForSelector('#panel .tabs');
      await p.locator('#panel .tabs button[data-tab="personas"]').click();
      await p.waitForSelector('#panel .tab-body a[href^="#/personaje/"]');
      const t2 = await p.locator('#panel .tab-body').innerText();
      if (!t2.includes('Isaac') || !t2.includes('Abraham')) throw new Error(t2.slice(0, 120));
      return 'Génesis 22:2 → Abraham, Isaac';
    });
    await t('Sin conexión', async () => {
      await p.goto(BASE + '#/inicio'); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.goto(BASE + '#/personajes'); await p.waitForSelector('.list.compact li a');
      await ctx.setOffline(true);
      await p.goto(BASE + '#/cronologia'); await p.reload(); await p.waitForSelector('.chrono-item');
      await p.goto(BASE + '#/personajes'); await p.waitForSelector('.list.compact li a');
      await ctx.setOffline(false);
      return 'personajes y cronología funcionan sin internet';
    });
  }
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
console.log(`\n${results.length - fails}/${results.length} pruebas de personajes y cronología correctas`);
process.exit(fails ? 1 : 0);
