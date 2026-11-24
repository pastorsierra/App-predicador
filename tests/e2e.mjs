// Pruebas de extremo a extremo en navegador real (Chromium) con tamaños de iPad y iPhone.
// Uso: node tests/e2e.mjs http://127.0.0.1:8765/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
import fs from 'fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const SHOTS = new URL('./capturas/', import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
function rec(fn, expected, ok, real, err = '') { results.push({ fn, expected, real, state: ok ? 'OK' : 'FALLA', err }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}${err ? ' | ' + err : ''}`); }

async function run(profile) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server', '--disable-features=Translate,OptimizationHints'] });
  const ctx = await browser.newContext({ ...profile.device, acceptDownloads: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const P = profile.name;
  const t = async (name, expected, fn) => {
    try { const real = await fn(); rec(`[${P}] ${name}`, expected, true, real || 'correcto'); }
    catch (e) { rec(`[${P}] ${name}`, expected, false, 'error', e.message.split('\n')[0]); await page.screenshot({ path: `${SHOTS}${P}-fallo-${results.length}.png` }).catch(() => {}); }
  };

  await t('Carga inicial', 'Se muestra Inicio sin errores', async () => {
    await page.goto(BASE + '#/inicio'); await page.waitForSelector('.desk');
    await page.screenshot({ path: `${SHOTS}${P}-inicio.png` });
    return 'Inicio visible';
  });

  await t('Ir a pasaje desde la barra superior', 'Jn 3:16 abre Juan 3 con el v. 16 señalado', async () => {
    await page.fill('#omni-q', 'Jn 3:16'); await page.press('#omni-q', 'Enter');
    await page.waitForSelector('#v16.target');
    const n = await page.locator('.verse').count();
    if (n !== 36) throw new Error(`Juan 3 debería tener 36 versículos, tiene ${n}`);
    return `Juan 3 con ${n} versículos`;
  });

  await t('Texto bíblico correcto', 'Juan 3:16 RV1909 comienza «Porque de tal manera amó Dios al mundo»', async () => {
    const txt = await page.locator('#v16').innerText();
    if (!txt.includes('Porque de tal manera amó Dios al mundo')) throw new Error(txt.slice(0, 80));
    return txt.slice(0, 60) + '…';
  });

  await t('Seleccionar versículo abre panel', 'Panel con acciones y palabras originales', async () => {
    await page.click('#v16'); await page.waitForSelector('#panel .action-grid');
    await page.waitForSelector('#panel .w');
    await page.screenshot({ path: `${SHOTS}${P}-panel-versiculo.png` });
    return `${await page.locator('#panel .w').count()} palabras con Strong`;
  });

  await t('Léxico Strong', 'Tocar «amó» abre G25 con lema griego', async () => {
    await page.locator('#panel .w', { hasText: 'amó' }).first().click();
    await page.waitForSelector('#panel .lex-entry .lemma');
    const lemma = await page.locator('#panel .lemma').first().innerText();
    const num = await page.locator('#panel .lex-num').first().innerText();
    if (num !== 'G25') throw new Error('número ' + num);
    return `${num} ${lemma}`;
  });

  await t('Resaltar y persistir', 'Juan 3:16 queda resaltado tras recargar', async () => {
    await page.goto(BASE + '#/biblia/JHN/3'); await page.waitForSelector('#v16');
    await page.click('#v16'); await page.waitForSelector('#panel .swatch.hl-oro');
    await page.click('#panel .swatch.hl-oro');
    await page.waitForSelector('#v16.hl-oro');
    await page.reload(); await page.waitForSelector('#v16');
    if (!(await page.locator('#v16.hl-oro').count())) throw new Error('no persistió');
    return 'resaltado dorado persistente';
  });

  await t('Favorito y marcador', 'Aparecen en el Cuaderno', async () => {
    await page.click('#v17'); await page.waitForSelector('#panel .action-grid');
    await page.locator('#panel .action', { hasText: 'Favorito' }).click();
    await page.waitForSelector('#v17.fav');
    await page.locator('#panel .action', { hasText: 'Marcador' }).click();
    await page.waitForTimeout(200);
    await page.goto(BASE + '#/cuaderno/favoritos'); await page.waitForSelector('.list a');
    const fav = await page.locator('.list a strong').first().innerText();
    await page.goto(BASE + '#/cuaderno/marcadores'); await page.waitForSelector('.list a');
    const bm = await page.locator('.list a strong').first().innerText();
    if (!fav.includes('Juan 3:17') || !bm.includes('Juan 3:17')) throw new Error(`${fav} / ${bm}`);
    return `favorito ${fav}; marcador ${bm}`;
  });

  await t('Nota por versículo', 'Se guarda, aparece marca en el versículo y en el Cuaderno', async () => {
    await page.goto(BASE + '#/biblia/ACT/2'); await page.waitForSelector('#v38');
    await page.click('#v38'); await page.waitForSelector('#panel .action-grid');
    await page.locator('#panel .action', { hasText: 'Nota' }).click();
    await page.waitForSelector('.modal textarea');
    await page.fill('.modal input[aria-label="Título"]', 'Bautismo en el nombre');
    await page.fill('.modal textarea', 'Observación de prueba: arrepentimiento, bautismo en el nombre de Jesucristo, don del Espíritu Santo.');
    await page.fill('.modal input[aria-label="Etiquetas"]', 'bautismo, Hechos');
    await page.click('.modal .btn.primary');
    await page.waitForSelector('#v38 .note-dot');
    await page.goto(BASE + '#/cuaderno/notas'); await page.waitForSelector('.note-card');
    const ref = await page.locator('.note-card .note-ref').first().innerText();
    if (!ref.includes('Hechos 2:38')) throw new Error(ref);
    return `nota en ${ref}`;
  });

  await t('Editar y eliminar nota', 'La edición se guarda; la eliminación pide confirmación', async () => {
    await page.locator('.note-card').first().locator('button', { hasText: 'Editar' }).click();
    await page.fill('.modal input[aria-label="Título"]', 'Bautismo en el nombre (editada)');
    await page.click('.modal .btn.primary'); await page.waitForTimeout(300);
    await page.goto(BASE + '#/cuaderno/notas'); await page.waitForSelector('.note-card h4');
    const tt = await page.locator('.note-card h4').first().innerText();
    if (!tt.includes('editada')) throw new Error(tt);
    // Nota general para eliminar
    await page.click('text=Nota general'); await page.waitForSelector('.modal textarea');
    await page.fill('.modal textarea', 'Nota temporal'); await page.click('.modal .btn.primary');
    await page.waitForTimeout(300);
    const before = await page.locator('.note-card').count();
    await page.locator('.note-card', { hasText: 'Nota temporal' }).locator('button', { hasText: 'Eliminar' }).click();
    await page.click('.modal .btn.danger'); await page.waitForTimeout(300);
    const after = await page.locator('.note-card').count();
    if (after !== before - 1) throw new Error(`${before} -> ${after}`);
    return 'editada y eliminada';
  });

  await t('Búsqueda por palabras', '«gracia fe» devuelve versículos con ambas palabras', async () => {
    await page.goto(BASE + '#/buscar?q=gracia%20fe&en=all'); await page.waitForSelector('.res-count', { timeout: 60000 });
    const c = await page.locator('.res-count').innerText();
    const n = parseInt(c, 10); if (!(n > 5)) throw new Error(c);
    const hasEph = await page.locator('.results .res-ref', { hasText: 'Efesios 2:8' }).count();
    if (!hasEph) throw new Error('falta Efesios 2:8');
    await page.screenshot({ path: `${SHOTS}${P}-busqueda.png` });
    return c;
  });

  await t('Búsqueda de frase exacta', '"nombre de Jesucristo" incluye Hechos 2:38', async () => {
    await page.goto(BASE + '#/buscar?q=%22nombre%20de%20Jesucristo%22&en=NT'); await page.waitForSelector('.res-count', { timeout: 60000 });
    if (!(await page.locator('.results .res-ref', { hasText: 'Hechos 2:38' }).count())) throw new Error('falta Hechos 2:38');
    return await page.locator('.res-count').innerText();
  });

  await t('Búsqueda en datos personales', 'La nota aparece en la búsqueda global', async () => {
    await page.goto(BASE + '#/buscar?q=arrepentimiento%20bautismo&en=all'); await page.waitForSelector('.res-count', { timeout: 60000 });
    if (!(await page.locator('.mine li').count())) throw new Error('no aparece la nota');
    return `${await page.locator('.mine li').count()} resultado(s) propios`;
  });

  await t('Concordancia Strong', 'G3686 (ὄνομα) lista apariciones y traducciones', async () => {
    await page.goto(BASE + '#/buscar?q=G3686'); await page.waitForSelector('.conc-head', { timeout: 60000 });
    const info = await page.locator('.conc-head > p').first().innerText();
    if (!/\d+ apariciones/.test(info)) throw new Error(info);
    return info;
  });

  await t('Referencias cruzadas', 'Juan 3:16 muestra referencias con vista previa', async () => {
    await page.goto(BASE + '#/biblia/JHN/3'); await page.waitForSelector('#v16');
    await page.click('#v16'); await page.waitForSelector('#panel .tabs');
    await page.click('#panel .tabs button[data-tab="refs"]'); await page.waitForSelector('#panel .ref-list li');
    await page.waitForFunction(() => [...document.querySelectorAll('#panel .ref-preview')].some(e => e.textContent.length > 5));
    return `${await page.locator('#panel .ref-list li').count()} referencias`;
  });

  await t('Comparar traducciones', 'Pestaña Comparar muestra RV1909 y BES', async () => {
    await page.click('#panel .tabs button[data-tab="comparar"]'); await page.waitForSelector('#panel .cmp-row');
    const txt = await page.locator('#panel .cmp-row').first().innerText();
    if (!txt.includes('BES') || !txt.includes('RV1909')) throw new Error(txt);
    return 'ambas versiones visibles';
  });

  await t('Opciones de lectura', 'Paralelo BES, Strong en línea y tema oscuro funcionan', async () => {
    await page.keyboard.press('Escape');
    await page.goto(BASE + '#/biblia/JHN/1'); await page.waitForSelector('#v1');
    await page.click('button[aria-label="Opciones de lectura"]'); await page.waitForSelector('.modal .switch-row');
    await page.locator('.modal .switch-row', { hasText: 'Comparar con otra versión' }).locator('input').check();
    await page.waitForSelector('.par-row');
    await page.locator('.modal .switch-row', { hasText: 'Números Strong' }).locator('input').check();
    await page.waitForSelector('.sw .sn');
    await page.locator('.modal .seg button', { hasText: 'Oscuro' }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'oscuro', null, { timeout: 3000 }).catch(() => {});
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${SHOTS}${P}-paralelo-oscuro.png` });
    // volver a valores normales
    await page.click('button[aria-label="Opciones de lectura"]');
    await page.locator('.modal .switch-row', { hasText: 'Comparar con otra versión' }).locator('input').uncheck();
    await page.locator('.modal .switch-row', { hasText: 'Números Strong' }).locator('input').uncheck();
    await page.locator('.modal .seg button', { hasText: 'Claro' }).click();
    await page.keyboard.press('Escape');
    if (theme !== 'oscuro') throw new Error(theme);
    return 'paralelo, Strong y oscuro aplicados';
  });

  await t('Navegación entre capítulos y libros', 'Malaquías 4 → Mateo 1 con «Continuar»', async () => {
    await page.goto(BASE + '#/biblia/MAL/4'); await page.waitForSelector('#v1');
    await page.click('.reader-foot .btn.primary');
    await page.waitForFunction(() => location.hash.includes('MAT/1'));
    await page.waitForSelector('.chapter-btn');
    return await page.locator('.chapter-btn').innerText();
  });

  await t('Selector de libro y capítulo', 'Abrir Salmos 23 desde el selector', async () => {
    await page.click('.chapter-btn'); await page.waitForSelector('.book-cell');
    await page.locator('.book-cell', { hasText: /^Salmos$/ }).click();
    await page.locator('.ch-cell', { hasText: /^23$/ }).click();
    await page.waitForFunction(() => location.hash.includes('PSA/23'));
    await page.waitForSelector('#v1');
    const v1 = await page.locator('#v1').innerText();
    if (!/jehová es mi pastor/i.test(v1)) throw new Error(v1);
    return v1.replace(/\s+/g, ' ').slice(0, 50);
  });

  let studyUrl = '';
  await t('Crear estudio desde pasaje', 'Hch 2:36-41 crea estudio con 22 secciones y datos automáticos', async () => {
    await page.goto(BASE + '#/estudios'); await page.waitForSelector('.new-study input');
    await page.fill('.new-study input', 'Hch 2:36-41'); await page.click('.new-study .btn.primary');
    await page.waitForSelector('.sec');
    const n = await page.locator('.sec').count();
    if (n < 22) throw new Error(`${n} secciones`);
    const words = await page.locator('#sec-palabras .words-table tbody tr').count();
    const xr = await page.locator('#sec-referencias .chip').count();
    if (!words || !xr) throw new Error(`palabras ${words}, refs ${xr}`);
    studyUrl = page.url();
    await page.screenshot({ path: `${SHOTS}${P}-estudio.png`, fullPage: false });
    return `${n} secciones, ${words} palabras Strong, ${xr} referencias`;
  });

  await t('Guardado automático del estudio', 'El texto escrito persiste tras recargar', async () => {
    await page.fill('#sec-interpretacion textarea', 'Interpretación de prueba persistente.');
    await page.fill('#sec-versiculos .vbv-row textarea >> nth=2', 'Observación del v. 38');
    await page.waitForSelector('.save-state:not(.busy)'); await page.waitForTimeout(900);
    await page.reload(); await page.waitForSelector('#sec-interpretacion textarea');
    const v = await page.inputValue('#sec-interpretacion textarea');
    const v38 = await page.inputValue('#sec-versiculos .vbv-row textarea >> nth=2');
    if (v !== 'Interpretación de prueba persistente.' || v38 !== 'Observación del v. 38') throw new Error(`${v} | ${v38}`);
    return 'persistente';
  });

  await t('Afirmación clasificada', 'Se añade una «Inferencia» a la sección', async () => {
    await page.locator('#sec-interpretacion button', { hasText: 'Afirmación clasificada' }).click();
    await page.selectOption('.modal select', 'inferencia');
    await page.fill('.modal textarea', 'Inferencia de prueba');
    await page.click('.modal .btn.primary');
    await page.waitForSelector('#sec-interpretacion .claim.c-inferencia');
    return 'añadida';
  });

  await t('Exportar estudio', 'Descarga un archivo .md con el contenido', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.study-tools button', { hasText: 'Exportar texto' }).click()]);
    const p = await dl.path(); const txt = fs.readFileSync(p, 'utf8');
    if (!txt.includes('Interpretación de prueba persistente') || !txt.includes('Arrepentíos')) throw new Error('contenido incompleto');
    if (!dl.suggestedFilename().endsWith('.md')) throw new Error('nombre de archivo perdido: ' + dl.suggestedFilename());
    return `${dl.suggestedFilename()} (${txt.length} caracteres)`;
  });

  await t('Añadir pasaje a estudio existente', 'Ro 6:4 queda vinculado al estudio', async () => {
    await page.goto(BASE + '#/biblia/ROM/6'); await page.waitForSelector('#v4');
    await page.click('#v4'); await page.waitForSelector('#panel .action-grid');
    await page.locator('#panel .action', { hasText: 'Añadir a estudio' }).click();
    await page.waitForSelector('.pick-list button'); await page.locator('.pick-list button').first().click();
    await page.waitForTimeout(300);
    await page.goto(studyUrl); await page.waitForSelector('.sec');
    if (!(await page.locator('.sec .chip', { hasText: 'Romanos 6:4' }).count())) throw new Error('no vinculado');
    return 'vinculado';
  });

  await t('Respaldo exportar/importar', 'El respaldo descarga JSON válido y se puede importar', async () => {
    await page.goto(BASE + '#/ajustes'); await page.waitForSelector('.settings-block');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Exportar respaldo' }).click()]);
    const p = await dl.path(); const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.app !== 'escudrinad' || !data.stores.notes.length || !data.stores.studies.length) throw new Error('respaldo incompleto');
    if (!dl.suggestedFilename().endsWith('.json')) throw new Error('nombre de archivo perdido: ' + dl.suggestedFilename());
    await page.locator('section', { hasText: 'Respaldo y recuperación' }).locator('input[type=file]').setInputFiles(p);
    await page.waitForSelector('.toast.show >> text=importado');
    const msg = await page.locator('.toast').innerText();
    return `${dl.suggestedFilename()} · ${msg}`;
  });

  if (profile.offline) {
    await t('Descargar textos para uso sin conexión', 'Los 4 paquetes quedan completos', async () => {
      await page.goto(BASE + '#/ajustes'); await page.waitForSelector('.pack');
      for (let i = 0; i < 10; i++) {
        const btn = page.locator('.pack .btn.primary').first();
        if (!(await btn.count())) break;
        await btn.click();
        await page.waitForFunction(() => !document.querySelector('.pack .btn[disabled]'), null, { timeout: 120000 });
        await page.waitForTimeout(300);
      }
      const labels = await page.locator('.pack .progress span').allInnerTexts();
      if (!labels.every(l => { const [a, b] = l.split(' ')[0].split('/'); return a === b; })) throw new Error(labels.join(', '));
      return labels.join(' · ');
    });

    await t('Funcionamiento sin conexión', 'Sin internet: abre la app, lee, busca, crea notas', async () => {
      await page.goto(BASE + '#/inicio'); await page.waitForSelector('.desk');
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForTimeout(500);
      await ctx.setOffline(true);
      await page.goto(BASE + '#/biblia/ISA/53'); await page.waitForSelector('#v5');
      const v5 = await page.locator('#v5').innerText();
      await page.goto(BASE + '#/buscar?q=%22por%20su%20llaga%22'); await page.waitForSelector('.res-count', { timeout: 60000 });
      const c = await page.locator('.res-count').innerText();
      await page.goto(BASE + '#/biblia/ISA/53'); await page.waitForSelector('#v5');
      await page.click('#v5'); await page.waitForSelector('#panel .action-grid');
      await page.locator('#panel .action', { hasText: 'Nota' }).click();
      await page.fill('.modal textarea', 'Nota creada sin conexión'); await page.click('.modal .btn.primary');
      await page.waitForSelector('#v5 .note-dot');
      await page.click('#v5'); // deselecciona
      await page.click('#v6'); await page.waitForSelector('#panel .w');
      await ctx.setOffline(false);
      if (!v5.includes('llaga')) throw new Error(v5);
      return `Isaías 53:5 leído; búsqueda: ${c}; nota y léxico sin conexión`;
    });
  }

  await t('Errores de consola', 'Ningún error de JavaScript durante las pruebas', async () => {
    const real = errors.filter(e => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(' || '));
    return '0 errores';
  });

  await browser.close();
}

const ipad = { name: 'iPad', offline: true, device: { ...devices['iPad Pro 11 landscape'] } };
const iphone = { name: 'iPhone', offline: false, device: { ...devices['iPhone 13'] } };
for (const p of [ipad, iphone]) {
  // Chromium no emula WebKit; se usan dimensiones, táctil y escala de pantalla del dispositivo
  delete p.device.defaultBrowserType;
  await run(p);
}
fs.writeFileSync(new URL('./resultados.json', import.meta.url), JSON.stringify(results, null, 1));
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas correctas`);
process.exit(fails ? 1 : 0);
