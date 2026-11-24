// Pruebas del Asistente de IA sin gastar dinero: se ejecuta la función de servidor real (supabase/functions/asistente)
// en Node, y en lugar de Anthropic responde un doble de prueba que verifica la petición. Uso: node tests/asistente.mjs URL
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const BASE = process.argv[2];
const ORIGIN = new URL(BASE).origin;
fs.copyFileSync(new URL('../supabase/functions/asistente/index.ts', import.meta.url), '/tmp/asistente-fn.mjs');
const { manejar } = await import('/tmp/asistente-fn.mjs');
const SECRETS = { ANTHROPIC_API_KEY: 'clave-ficticia-de-prueba', CODIGO_ACCESO: 'frase de acceso de prueba', ORIGENES: ORIGIN };
const env = (k) => SECRETS[k];
let last = null, calls = 0;
const fakeAnthropic = async (url, init) => {
  calls++; last = { url, headers: init.headers, body: JSON.parse(init.body) };
  const n = (last.body.messages[0].content.match(/^\[\d+\]/gm) || []).length;
  const text = `## Respuesta\nEl pasaje dice que Dios amó al mundo [1] (Juan 3:16).\n\n- Ver también Romanos 6:4 [${n}]\n- Y Juan 99:1 [99]\n\n**Conclusión:** basada en las fuentes.`;
  return new Response(JSON.stringify({ model: last.body.model, content: [{ type: 'text', text }], usage: { input_tokens: 1200, output_tokens: 150 }, stop_reason: 'end_turn' }), { status: 200 });
};
const srv = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = new Request(`http://127.0.0.1:8767${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await manejar(r, env, fakeAnthropic);
  res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(8767);
const FN = 'http://127.0.0.1:8767/functions/v1/asistente';

const results = [];
const rec = (fn, ok, real) => { results.push({ fn, state: ok ? 'OK' : 'FALLA', real }); console.log(`${ok ? 'OK   ' : 'FALLA'} ${fn} — ${real}`); };
const tt = async (n, fn) => { try { rec(n, true, (await fn()) || 'correcto'); } catch (e) { rec(n, false, e.message.split('\n')[0]); } };

// --- Función de servidor (sin navegador) ---
const post = (body, code = SECRETS.CODIGO_ACCESO, origin = ORIGIN) => manejar(new Request(FN, { method: 'POST', headers: { 'content-type': 'application/json', 'x-codigo': code, origin }, body: JSON.stringify(body) }), env, fakeAnthropic);
await tt('Servidor: código incorrecto se rechaza', async () => { const r = await post({ ping: true }, 'otro código cualquiera'); if (r.status !== 401) throw new Error(r.status); return '401'; });
await tt('Servidor: sitio no autorizado se rechaza', async () => { const r = await post({ ping: true }, undefined, 'https://otro-sitio.com'); if (r.status !== 403) throw new Error(r.status); return '403'; });
await tt('Servidor: sin secretos avisa', async () => { const r = await manejar(new Request(FN, { method: 'POST', body: '{}' }), () => '', fakeAnthropic); const d = await r.json(); if (r.status !== 500 || !/ANTHROPIC_API_KEY/.test(d.error)) throw new Error(d.error); return d.error; });
await tt('Servidor: la prueba de conexión no llama a Anthropic', async () => { const c0 = calls; const d = await (await post({ ping: true })).json(); if (!d.ok || calls !== c0) throw new Error(JSON.stringify(d)); return `ok, modelo ${d.modelo}`; });
await tt('Servidor: petición a Anthropic correcta', async () => {
  const d = await (await post({ pregunta: '¿Qué enseña?', modo: 'exegeta', profundidad: 'breve', perfil: 'Perfil de prueba', fuentes: [{ titulo: 'Juan 3:16', texto: '16 Porque de tal manera…' }] })).json();
  if (last.headers['x-api-key'] !== SECRETS.ANTHROPIC_API_KEY || last.headers['anthropic-version'] !== '2023-06-01') throw new Error('cabeceras');
  if (last.body.max_tokens !== 700 || !/exegeta/.test(last.body.system) || !/Perfil de prueba/.test(last.body.system) || !/\[1\] Juan 3:16/.test(last.body.messages[0].content)) throw new Error('cuerpo');
  if (JSON.stringify(d).includes(SECRETS.ANTHROPIC_API_KEY)) throw new Error('la clave salió en la respuesta');
  return `modelo ${last.body.model}, 700 tokens máx., fuentes numeradas, la clave no sale del servidor`;
});

// --- App ---
async function run(name, device, full) {
  const d = { ...device }; delete d.defaultBrowserType;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext(d);
  const p = await ctx.newPage(); p.setDefaultTimeout(30000);
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const t = async (n, fn) => { try { rec(`[${name}] ${n}`, true, (await fn()) || 'correcto'); } catch (e) { rec(`[${name}] ${n}`, false, e.message.split('\n')[0]); await p.screenshot({ path: `/tmp/ia-fallo-${name}-${results.length}.png` }).catch(() => {}); } };

  await t('Sin configurar: no hay botón de IA', async () => {
    await p.goto(BASE + '#/inicio'); await p.waitForSelector('#nav a', { state: 'attached' });
    if (await p.locator('#nav a[data-route="asistente"]').count()) throw new Error('aparece en el menú');
    await p.goto(BASE + '#/biblia/JHN/3?v=16'); await p.waitForSelector('#v16'); await p.locator('#v16').click(); await p.waitForSelector('#panel .action-grid');
    if (await p.locator('#panel .action', { hasText: 'Preguntar a la IA' }).count()) throw new Error('aparece en el panel');
    return 'ni en el menú ni en el panel';
  });
  await t('Código incorrecto: aviso y sigue oculto', async () => {
    await p.goto(BASE + '#/ajustes'); await p.waitForSelector('#ia');
    await p.fill('#ia input[type=url]', FN); await p.fill('#ia input[type=password]', 'codigo equivocado');
    await p.locator('#ia button', { hasText: 'Guardar y probar' }).click();
    await p.waitForSelector('#ia >> text=Código de acceso incorrecto');
    if (await p.locator('#nav a[data-route="asistente"]').count()) throw new Error('apareció en el menú');
    return 'rechazado y sin botón';
  });
  await t('Conectar con el código correcto', async () => {
    await p.fill('#ia input[type=password]', SECRETS.CODIGO_ACCESO);
    await p.locator('#ia button', { hasText: 'Guardar y probar' }).click();
    await p.waitForSelector('#ia >> text=Conectado. Modelo');
    await p.waitForSelector('#nav a[data-route="asistente"]', { state: 'attached' });
    return 'conectado; «Asistente IA» aparece en el menú';
  });
  await t('Preguntar desde el panel del versículo', async () => {
    await p.goto(BASE + '#/biblia/JHN/3?v=16'); await p.waitForSelector('#v16'); await p.locator('#v16').click();
    await p.locator('#panel .action', { hasText: 'Preguntar a la IA' }).click();
    await p.waitForURL(/#\/asistente\?ref=JHN\.3\.16/);
    if (await p.inputValue('.ai-form input[aria-label="Pasaje"]') !== 'Juan 3:16') throw new Error('pasaje no prellenado');
    await p.fill('.ai-form textarea', '¿Qué enseña este versículo sobre el amor de Dios?');
    await p.locator('.ai-form button[type=submit]').click();
    await p.waitForSelector('.ai-answer');
    const sent = last.body.messages[0].content;
    if (!/Porque de tal manera amó Dios al mundo/.test(sent)) throw new Error('no envió el texto real de la RV1909');
    if (!/Strong/.test(sent) || !/referencia cruzada/.test(sent)) throw new Error('faltan Strong o referencias');
    const n = (sent.match(/^\[\d+\]/gm) || []).length;
    return `${n} fuentes reales enviadas (versiones, contexto, referencias, Strong)`;
  });
  await t('Respuesta marcada como IA, con verificación de citas', async () => {
    const a = await p.locator('.ai-answer').innerText();
    if (!/Generado por IA/i.test(a)) throw new Error('sin marca de IA');
    if (!/\[99\]/.test(a) || !/fuentes que no existen/.test(a)) throw new Error('no avisó de la fuente [99]');
    if (!/Citas que no existen en la Biblia: Juan 99:1/.test(a)) throw new Error('no avisó de Juan 99:1');
    const src = await p.locator('.ai-src-box').innerText(); if (!/Juan 3:16/.test(src)) throw new Error('lista de fuentes');
    return 'avisa de [99] y de «Juan 99:1»; lista las fuentes enviadas';
  });
  await t('Guardar la respuesta en el Cuaderno', async () => {
    await p.locator('.ai-answer button', { hasText: 'Guardar en el Cuaderno' }).click(); await p.waitForSelector('text=Guardado en el Cuaderno');
    await p.goto(BASE + '#/cuaderno/notas'); await p.waitForSelector('text=IA: ¿Qué enseña este versículo');
    return 'nota con etiqueta IA';
  });
  if (full) {
    await t('La configuración no va en el respaldo', async () => {
      const data = await p.evaluate(async () => (await import('./js/db.js')).exportAll());
      const s = JSON.stringify(data); if (s.includes(SECRETS.CODIGO_ACCESO) || s.includes('aiUrl')) throw new Error('el código salió en el respaldo');
      return 'dirección y código fuera del respaldo';
    });
    await t('Pregunta sin pasaje usa la biblioteca y no inventa fuentes', async () => {
      await p.goto(BASE + '#/asistente'); await p.waitForSelector('.ai-form');
      await p.fill('.ai-form textarea', 'Resume el tema general');
      await p.locator('.ai-form button[type=submit]').click(); await p.waitForSelector('.ai-src-box');
      const box = await p.locator('.ai-src-box').innerText();
      if (!/No se envió ninguna fuente/.test(box)) throw new Error(box.slice(0, 100));
      return 'sin pasaje ni documentos: lo dice claramente';
    });
    await t('Quitar la conexión oculta el asistente', async () => {
      await p.goto(BASE + '#/ajustes'); await p.locator('#ia button', { hasText: 'Quitar de este equipo' }).click();
      await p.waitForSelector('#ia >> text=Conexión quitada');
      await p.waitForFunction(() => !document.querySelector('#nav a[data-route="asistente"]'));
      return 'desaparece del menú';
    });
  }
  await t('Errores de consola', async () => {
    const real = errors.filter(e => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e));
    if (real.length) throw new Error(real.slice(0, 3).join(' | '));
    return '0 errores';
  });
  await b.close();
}
await run('iPad', devices['iPad Pro 11 landscape'], true);
await run('iPhone', devices['iPhone 13'], false);
srv.close();
const fails = results.filter(r => r.state !== 'OK').length;
console.log(`\n${results.length - fails}/${results.length} pruebas del asistente correctas`);
process.exit(fails ? 1 : 0);
