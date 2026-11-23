// Pruebas de «Mis Biblias» (versiones personales del Taller) y del Atlas bíblico. Datos ficticios.
// Uso: node tests/biblias-atlas.mjs URL
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };

// Biblia ficticia con la misma estructura que las del Taller (66 libros), usando la versificación de la app
const man = JSON.parse(fs.readFileSync(new URL('../data/manifest.json', import.meta.url)));
const ids = Object.keys(man.versions.rv1909.chapters);
const books = ids.map((id, bi) => [man.versions.rv1909.names[id], id, man.versions.rv1909.chapters[id].map((n, ci) => Array.from({ length: n }, (_, vi) => `TEXTO DE PRUEBA ${id} ${ci + 1}:${vi + 1} palabraunica${bi}`))]);
fs.writeFileSync('/tmp/biblia-prueba.json', JSON.stringify({ abbr: 'PRUEBA', name: 'Biblia de prueba', books }));
const books2 = books.map(([n, a, c]) => [n, a, c.map(ch => ch.map(v => v.replace('TEXTO DE PRUEBA', 'SEGUNDA PRUEBA')))]);

async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext({ ...d, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e) + ' @ ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' @ ' + JSON.stringify(m.location())); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/ba-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Cargar Biblia personal (.json)', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('text=Mis Biblias');
    const input = p.locator('section', { hasText: 'Mis Biblias' }).locator('input[type=file]');
    await input.setInputFiles('/tmp/biblia-prueba.json');
    await p.waitForSelector('text=Cargadas: PRUEBA.');
    await p.waitForSelector('.pack strong >> text=PRUEBA — Biblia de prueba');
    return 'PRUEBA cargada (31.087 versículos)';
  });

  await t('Traer Biblias del Taller (mismo equipo)', async () => {
    await p.evaluate(async (books2) => {
      await new Promise((res, rej) => { const r = indexedDB.open('taller-predicador', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); const st = tx.objectStore('kv');
          st.put(JSON.stringify([{ abbr: 'SEGUNDA', name: 'Segunda de prueba' }]), 'tp_bv_list'); st.put(JSON.stringify({ abbr: 'SEGUNDA', name: 'Segunda de prueba', books: books2 }), 'tp_bv_SEGUNDA'); st.put(JSON.stringify('SEGUNDA'), 'tp_bv_main');
          tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); });
    }, books2);
    await p.locator('section', { hasText: 'Mis Biblias' }).locator('button', { hasText: 'Traer del Taller en este equipo' }).click();
    await p.waitForSelector('text=Traídas del Taller: SEGUNDA.');
    return 'SEGUNDA traída del Taller';
  });

  await t('Usar como versión principal en el lector', async () => {
    await p.locator('.pack', { hasText: 'PRUEBA — Biblia de prueba' }).locator('button', { hasText: 'Usar como principal' }).click();
    await p.waitForSelector('.pack', { hasText: 'PRUEBA — Biblia de prueba' });
    await p.goto(BASE + '#/biblia/JHN/3'); await p.waitForSelector('#v16');
    const txt = await p.locator('#v16').innerText();
    if (!txt.includes('TEXTO DE PRUEBA JHN 3:16')) throw new Error(txt);
    if ((await p.locator('.ver-select').inputValue()) !== 'u:PRUEBA') throw new Error('selector no marca PRUEBA');
    if (!(await p.locator('.reader-source', { hasText: 'solo en este equipo' }).count())) throw new Error('falta la nota de uso personal');
    return 'Juan 3:16 en PRUEBA';
  });

  await t('Cambiar de versión desde el lector', async () => {
    await p.selectOption('.ver-select', 'rv1909'); await p.waitForFunction(() => document.querySelector('#v16')?.innerText.includes('Porque de tal manera'));
    await p.selectOption('.ver-select', 'u:SEGUNDA'); await p.waitForFunction(() => document.querySelector('#v16')?.innerText.includes('SEGUNDA PRUEBA'));
    return 'RV1909 ↔ SEGUNDA';
  });

  await t('Comparar todas las versiones en el versículo', async () => {
    await p.click('#v16'); await p.waitForSelector('#panel .tabs');
    const cite = await p.locator('#panel .sel-text cite').innerText();
    await p.click('#panel .tabs button[data-tab="comparar"]'); await p.waitForSelector('#panel .cmp-row');
    const txt = await p.locator('#panel .cmp-row').innerText();
    for (const s of ['RV1909', 'BES', 'PRUEBA', 'SEGUNDA', 'Porque de tal manera', 'TEXTO DE PRUEBA JHN 3:16']) if (!txt.includes(s)) throw new Error('falta ' + s);
    if (cite !== 'SEGUNDA') throw new Error('cita ' + cite);
    return '4 versiones lado a lado';
  });

  await t('Lectura en paralelo con otra versión', async () => {
    await p.click('#panel button[aria-label="Cerrar panel"]'); await p.waitForSelector('#panel', { state: 'hidden' });
    await p.click('button[aria-label="Opciones de lectura"]'); await p.waitForSelector('.modal');
    await p.selectOption('.modal select[aria-label="Versión para comparar"]', 'rv1909');
    await p.locator('.modal .switch-row', { hasText: 'Comparar con otra versión' }).locator('input').check();
    await p.waitForSelector('.par-row'); await p.keyboard.press('Escape');
    const head = await p.locator('.par-head').innerText();
    if (!/segunda de prueba/i.test(head) || !/reina-valera 1909/i.test(head)) throw new Error(head);
    await p.click('button[aria-label="Opciones de lectura"]'); await p.locator('.modal .switch-row', { hasText: 'Comparar con otra versión' }).locator('input').uncheck(); await p.keyboard.press('Escape');
    return head.replace(/\n/g, ' | ');
  });

  await t('Buscar en una Biblia personal', async () => {
    await p.goto(BASE + '#/buscar?q=palabraunica42&en=all&v=u:PRUEBA'); await p.waitForSelector('.res-count', { timeout: 60000 });
    const c = await p.locator('.res-count').innerText();
    if (!/^879 versículos en la PRUEBA/.test(c)) throw new Error(c);
    return c;
  });

  await t('El estudio incluye las Biblias personales', async () => {
    await p.goto(BASE + '#/estudios'); await p.fill('.new-study input', 'Jn 3:16'); await p.click('.new-study .btn.primary');
    await p.waitForSelector('#sec-texto .cmp-ver >> text=PRUEBA');
    return 'RV1909, BES, PRUEBA y SEGUNDA en «Texto bíblico»';
  });

  await t('Las Biblias personales no van en el respaldo', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('text=Exportar respaldo');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('button', { hasText: 'Exportar respaldo' }).click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    if (txt.includes('TEXTO DE PRUEBA') || JSON.parse(txt).stores.bibles) throw new Error('¡la Biblia está en el respaldo!');
    return `respaldo de ${Math.round(txt.length / 1024)} KB sin Biblias`;
  });

  await t('Quitar una Biblia personal', async () => {
    await p.locator('.pack', { hasText: 'SEGUNDA — Segunda de prueba' }).locator('button', { hasText: 'Quitar' }).click();
    await p.click('.modal .btn.danger'); await p.waitForFunction(() => !document.body.innerText.includes('SEGUNDA — Segunda de prueba'));
    await p.goto(BASE + '#/biblia/JHN/3'); await p.waitForSelector('#v16');
    if ((await p.locator('.ver-select').inputValue()) !== 'rv1909') throw new Error('no volvió a la RV1909');
    return 'quitada; el lector volvió a la RV1909';
  });

  await t('Atlas: mapa y búsqueda', async () => {
    await p.goto(BASE + '#/atlas'); await p.waitForSelector('.atlas-map circle');
    const n = await p.locator('.atlas-map circle').count();
    await p.fill('.atlas-side input[type=search]', 'betel'); await p.waitForSelector('.atlas-list a >> text=Bet-el');
    await p.locator('.atlas-list a', { hasText: 'Bet-el' }).first().click();
    await p.waitForSelector('.atlas-detail h2 >> text=Bet-el'); await p.waitForSelector('.atlas-detail .ref-list li');
    await p.waitForFunction(() => [...document.querySelectorAll('.atlas-detail .ref-preview')].some(e => e.textContent.length > 10));
    await p.screenshot({ path: `/tmp/ba-${name}-atlas.png` });
    return `${n} lugares visibles en Tierra Santa; búsqueda «betel» encuentra Bet-el, con sus versículos`;
  });

  await t('Atlas: zoom y vista general', async () => {
    const vb1 = await p.locator('.atlas-map').getAttribute('viewBox');
    await p.click('.atlas-ctl button[aria-label="Acercar"]'); const vb2 = await p.locator('.atlas-map').getAttribute('viewBox');
    await p.click('.atlas-ctl button >> text=Todo'); const vb3 = await p.locator('.atlas-map').getAttribute('viewBox');
    if (vb1 === vb2 || vb2 === vb3) throw new Error('el mapa no cambió');
    return 'acercar y ver todo funcionan';
  });

  await t('Lugares desde el versículo (Génesis 28:19)', async () => {
    await p.goto(BASE + '#/biblia/GEN/28'); await p.waitForSelector('#v19');
    await p.click('#v19'); await p.click('#panel .tabs button[data-tab="lugares"]');
    await p.waitForSelector('#panel .list a strong >> text=Bet-el');
    await p.locator('#panel .list a', { hasText: 'Bet-el' }).first().click();
    await p.waitForSelector('.atlas-detail h2 >> text=Bet-el');
    return 'Bet-el aparece y abre el mapa';
  });

  if (full) {
    await t('Atlas y Biblia personal sin conexión', async () => {
      await p.goto(BASE + '#/inicio'); await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
      await p.goto(BASE + '#/biblia/ROM/8'); await p.waitForSelector('#v1'); // la RV1909 de Romanos queda guardada al consultarla
      await p.goto(BASE + '#/atlas'); await p.waitForSelector('.atlas-map circle');
      await ctx.setOffline(true);
      await p.reload(); await p.waitForSelector('.atlas-map circle');
      await p.goto(BASE + '#/biblia/ROM/8'); await p.waitForSelector('#v1');
      await p.selectOption('.ver-select', 'u:PRUEBA'); await p.waitForFunction(() => document.querySelector('#v1')?.innerText.includes('TEXTO DE PRUEBA ROM 8:1'));
      await ctx.setOffline(false);
      return 'el atlas y la Biblia personal funcionan sin internet';
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
console.log(`\n${results.length - fails}/${results.length} pruebas de Biblias y Atlas correctas`);
fs.writeFileSync('/tmp/ba-resultados.json', JSON.stringify(results, null, 1));
process.exit(fails ? 1 : 0);
