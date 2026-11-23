// Prueba de actualización de versión del Service Worker.
// Uso: node tests/actualizacion.mjs URL RUTA_LOCAL_DEL_sw.js
// Simula una publicación nueva cambiando VERSION en sw.js y comprueba que el dispositivo la reciba sin perder datos.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const [BASE, SW] = process.argv.slice(2);
const original = fs.readFileSync(SW, 'utf8');
const d = { ...devices['iPad Pro 11 landscape'] }; delete d.defaultBrowserType;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
const ctx = await b.newContext(d); const p = await ctx.newPage(); p.setDefaultTimeout(20000);
const errors = []; p.on('pageerror', e => errors.push(String(e)));
const ok = (m) => console.log('OK    ' + m), fail = (m) => { console.log('FALLA ' + m); process.exitCode = 1; };
try {
  await p.goto(BASE + '#/inicio'); await p.waitForSelector('.hero-search');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  const v1 = (await p.evaluate(() => caches.keys())).filter(k => k.includes('shell'));
  await p.goto(BASE + '#/ajustes'); await p.waitForSelector('.version');
  await p.waitForFunction(() => document.querySelector('.version').textContent.includes('versión instalada'));
  ok('Versión instalada visible: ' + await p.locator('.version').innerText() + ' · caché ' + v1.join(','));
  // dato del usuario que debe sobrevivir la actualización
  await p.goto(BASE + '#/biblia/PSA/23'); await p.waitForSelector('#v1');
  await p.click('#v1'); await p.locator('#panel .action', { hasText: 'Favorito' }).click(); await p.waitForSelector('#v1.fav');
  // "Publicar" versión nueva
  fs.writeFileSync(SW, original.replace(/const VERSION = '[^']+'/, "const VERSION = 'v9.9.9-prueba'"));
  await p.goto(BASE + '#/inicio'); await p.waitForSelector('.hero-search');
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await p.waitForSelector('.toast.show >> text=versión nueva', { timeout: 20000 });
  ok('Aviso mostrado: «Se instaló una versión nueva de la aplicación»');
  await p.waitForEvent('load', { timeout: 10000 }).catch(() => {});
  await p.waitForSelector('.hero-search');
  const keys = await p.evaluate(() => caches.keys());
  if (keys.includes('escudrinad-shell-v9.9.9-prueba') && !keys.some(k => k.startsWith('escudrinad-shell-') && k !== 'escudrinad-shell-v9.9.9-prueba')) ok('Caché nueva instalada y la anterior eliminada: ' + keys.join(', '));
  else fail('Cachés: ' + keys.join(', '));
  if (keys.includes('escudrinad-datos-v1')) ok('Los textos descargados se conservan'); else fail('Se perdió la caché de datos');
  await p.goto(BASE + '#/biblia/PSA/23'); await p.waitForSelector('#v1');
  if (await p.locator('#v1.fav').count()) ok('Los datos del usuario se conservan tras la actualización'); else fail('Se perdió el favorito');
  await p.goto(BASE + '#/ajustes'); await p.waitForFunction(() => document.querySelector('.version')?.textContent.includes('v9.9.9'));
  ok('Ajustes muestra la versión nueva');
  if (errors.length) fail('Errores JS: ' + errors.join(' | ')); else ok('0 errores de JavaScript');
} catch (e) { fail(e.message.split('\n')[0]); }
finally { fs.writeFileSync(SW, original); await b.close(); }
