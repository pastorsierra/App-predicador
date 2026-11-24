import { h, clear, icon, toast, download, confirmDialog } from '../ui.js';
import { S, setPref, PROFILES } from '../state.js';
import { exportAll, importAll, counts } from '../db.js';
import { PACKS, packStatus, downloadPack, removePack, storageEstimate } from '../offline.js';
import { manifest } from '../bible.js';

export async function renderSettings(view) {
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Ajustes')));

  // Apariencia
  const themes = h('div', { class: 'seg' }, ['claro', 'sepia', 'oscuro'].map(t =>
    h('button', { class: S.theme === t ? 'on' : '', onclick: async (e) => { const btn = e.currentTarget; await setPref('theme', t); themes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); } }, t[0].toUpperCase() + t.slice(1))));
  const sizeVal = h('span', { class: 'val' }, `${S.fontSize} px`);
  const size = h('input', { type: 'range', min: 14, max: 30, value: S.fontSize, 'aria-label': 'Tamaño de letra', oninput: async (e) => { await setPref('fontSize', +e.target.value); sizeVal.textContent = `${e.target.value} px`; preview.style.fontSize = `${e.target.value}px`; } });
  const preview = h('p', { class: 'bible preview', style: { fontSize: `${S.fontSize}px` } }, 'Escudriñad las Escrituras, porque á vosotros os parece que en ellas tenéis la vida eterna; y ellas son las que dan testimonio de mí. — Juan 5:39');
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Lectura y apariencia'),
    h('div', { class: 'opt-row' }, h('span', {}, 'Apariencia'), themes),
    h('div', { class: 'opt-row' }, h('span', {}, 'Tamaño de letra'), size, sizeVal), preview));

  // Mis Biblias (versiones personales, p. ej. las que cargó en el Taller)
  const B = await import('../bibles.js');
  const { clearVersionCache } = await import('../bible.js');
  const bList = h('div', { class: 'packs' });
  const bMsg = h('p', { class: 'hint', role: 'status' });
  const drawBibles = async () => {
    clear(bList);
    const list = await B.listBibles();
    if (!list.length) bList.append(h('p', { class: 'hint' }, 'Todavía no hay Biblias personales en este equipo.'));
    for (const b of list) bList.append(h('div', { class: 'pack' },
      h('div', {}, h('strong', {}, `${b.abbr} — ${b.name}`), h('small', { class: 'hint', style: { display: 'block' } }, `${b.verses.toLocaleString('es-CO')} versículos`)),
      h('button', { class: `btn small ${S.version === b.code ? 'ghost' : ''}`, disabled: S.version === b.code, onclick: async () => { await setPref('version', b.code); toast(`${b.abbr} es ahora la versión principal`); drawBibles(); } }, S.version === b.code ? 'Principal' : 'Usar como principal'),
      h('button', { class: 'btn small ghost danger', onclick: async () => {
        if (!(await confirmDialog('Quitar Biblia', `¿Quitar ${b.abbr} de este equipo? Puede volver a cargarla después.`, 'Quitar'))) return;
        await B.removeBible(b.abbr); clearVersionCache(b.code); if (S.version === b.code) await setPref('version', 'rv1909'); if (S.parallelVer === b.code) await setPref('parallelVer', 'bes'); drawBibles();
      } }, 'Quitar')));
  };
  const bFile = h('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true, onchange: async (e) => {
    const files = [...e.target.files]; e.target.value = ''; const ok = [], bad = [];
    for (const f of files) { try { bMsg.textContent = `Cargando ${f.name}…`; ok.push((await B.installBible(B.parseBibleJSON(JSON.parse(await f.text()), f.name))).abbr); } catch (err) { bad.push(f.name); } }
    bMsg.textContent = (ok.length ? `Cargadas: ${ok.join(', ')}.` : '') + (bad.length ? ` No se pudo leer: ${bad.join(', ')} (no tiene el formato de Biblia de 66 libros).` : '');
    ok.forEach(a => clearVersionCache(`u:${a}`)); drawBibles();
  } });
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Mis Biblias'),
    h('p', {}, 'Use aquí las mismas Biblias que cargó en el Taller del Predicador (por ejemplo, la Reina-Valera 1960) para leer, comparar, buscar y estudiar. Se guardan solo en este equipo: no se publican, no van en los respaldos ni en GitHub, porque varias versiones tienen derechos de autor.'),
    bList,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: async (e) => {
        const btn = e.currentTarget; btn.disabled = true; bMsg.textContent = 'Buscando las Biblias del Taller en este equipo…';
        const ok = await B.importFromTaller(); btn.disabled = false;
        bMsg.textContent = ok.length ? `Traídas del Taller: ${ok.join(', ')}.` : 'No se encontraron Biblias del Taller en este navegador. Abra esta app en el mismo lugar donde usa el Taller (Safari o pantalla de inicio), o cargue el archivo .json.';
        ok.forEach(a => clearVersionCache(`u:${a}`)); drawBibles();
      } }, 'Traer del Taller en este equipo'),
      h('button', { class: 'btn', onclick: () => bFile.click() }, 'Cargar archivo (.json)'), bFile),
    bMsg));
  drawBibles();

  // Perfil doctrinal
  const notes = h('textarea', { rows: 5, placeholder: 'Marco doctrinal personal: convicciones, énfasis y criterios que el asistente debe respetar al investigar (se usará en la Fase 4).', 'aria-label': 'Marco doctrinal personal' });
  notes.value = S.doctrinalNotes || '';
  let t; notes.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setPref('doctrinalNotes', notes.value).then(() => toast('Marco doctrinal guardado')), 700); });
  const profSel = h('select', { 'aria-label': 'Perfil doctrinal', onchange: async (e) => { await setPref('doctrinalProfile', e.target.value); profDesc.textContent = PROFILES[e.target.value].summary; } },
    Object.entries(PROFILES).map(([k, p]) => h('option', { value: k, selected: S.doctrinalProfile === k }, p.name)));
  const profDesc = h('p', { class: 'hint' }, PROFILES[S.doctrinalProfile]?.summary || '');
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Perfil doctrinal de estudio'), profSel, profDesc, notes));

  // Descargas
  const packsBox = h('div', { class: 'packs' });
  const est = h('p', { class: 'hint' });
  const drawPacks = async () => {
    clear(packsBox);
    for (const p of PACKS) {
      const st = await packStatus(p);
      const full = st.have === st.total;
      const bar = h('div', { class: 'progress small' }, h('div', { class: 'bar', style: { width: `${(st.have / st.total) * 100}%` } }), h('span', {}, `${st.have}/${st.total} archivos`));
      const btn = h('button', { class: `btn small ${full ? 'ghost' : 'primary'}`, onclick: async () => {
        if (full) { if (await confirmDialog('Quitar descarga', `¿Quitar «${p.name}» del almacenamiento sin conexión? Seguirá disponible con internet.`, 'Quitar')) { await removePack(p); drawPacks(); } return; }
        btn.disabled = true; btn.textContent = 'Descargando…';
        try {
          await downloadPack(p, (d, tot) => { bar.querySelector('.bar').style.width = `${(d / tot) * 100}%`; bar.querySelector('span').textContent = `${d}/${tot} archivos`; });
          toast(`${p.name}: disponible sin conexión`);
        } catch (e) { toast(e.message, 'err'); }
        drawPacks();
      } }, full ? 'Quitar' : 'Descargar');
      packsBox.append(h('div', { class: 'pack' }, h('div', {}, h('strong', {}, p.name), bar), btn));
    }
    const e = await storageEstimate();
    est.textContent = e ? `Espacio usado por la aplicación en este dispositivo: ${(e.usage / 1e6).toFixed(1)} MB.` : '';
  };
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Uso sin conexión'),
    h('p', {}, 'Descargue los textos para leer, buscar y consultar referencias y el léxico sin internet. Sus notas, estudios, marcadores y resaltados siempre se guardan en este dispositivo y funcionan sin conexión.'),
    packsBox, est,
    h('p', { class: 'hint' }, 'En iPhone y iPad, para que los datos se conserven, agregue la app a la pantalla de inicio (Compartir → «Agregar a inicio»). Safari puede borrar los datos de sitios web que no se usan en varias semanas si no está instalada; haga respaldos con regularidad.')));
  drawPacks();

  // Respaldo
  const c = await counts();
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = await importAll(JSON.parse(await f.text())); toast(`Respaldo importado: ${n} registros actualizados`); }
    catch (err) { toast(err.message || 'No se pudo leer el archivo', 'err'); }
    e.target.value = '';
  } });
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Respaldo y recuperación'),
    h('p', {}, `En este dispositivo: ${c.sermons} enseñanzas, ${c.notes} notas, ${c.studies} estudios, ${c.favorites} favoritos, ${c.highlights} resaltados, ${c.bookmarks} marcadores.`),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: async () => {
        const data = await exportAll();
        download(`escudrinad-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
        toast('Respaldo exportado. Guárdelo en Archivos o iCloud Drive.');
      } }, icon('download', 18), 'Exportar respaldo'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Importar respaldo'), fileIn),
    h('p', { class: 'hint' }, 'Importar fusiona: conserva la versión más reciente de cada registro y no borra lo que ya tiene.')));

  // Conexión con el Taller (GitHub, solo lectura)
  const SY = await import('../taller/sync.js');
  const own = await SY.ownGithubCfg(); const fromTaller = await SY.tallerGithubCfg();
  const gMsg = h('p', { class: 'hint', role: 'status' });
  const lastPull = await (await import('../db.js')).getSetting('githubLastPull');
  const gOwner = h('input', { type: 'text', value: own?.owner || fromTaller?.owner || 'pastorsierra', 'aria-label': 'Usuario de GitHub', autocapitalize: 'off' });
  const gRepo = h('input', { type: 'text', value: own?.repo || fromTaller?.repo || 'taller-datos', 'aria-label': 'Repositorio privado', autocapitalize: 'off' });
  const gTok = h('input', { type: 'password', value: own?.token || '', placeholder: fromTaller ? 'Se usa la clave que ya tiene el Taller en este equipo' : 'github_pat_…', 'aria-label': 'Clave (token) de GitHub', autocomplete: 'off', autocapitalize: 'off' });
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Conexión con el Taller del Predicador'),
    h('p', {}, 'Al abrir la app se traen solas sus enseñanzas, sus Biblias y la clave del archivo desde el Taller de este equipo y desde su repositorio privado de GitHub. Esta app solo lee: nunca cambia ni borra los datos del Taller.'),
    h('p', { class: 'hint' }, fromTaller ? `Conexión del Taller encontrada en este equipo (${fromTaller.owner}/${fromTaller.repo}); se usa automáticamente.` : own ? `Conectada a ${own.owner}/${own.repo}.` : 'En este equipo el Taller no tiene la conexión con GitHub. Puede escribirla aquí (la misma clave que usa en el Taller).',
      lastPull ? ` Última lectura de GitHub: ${new Date(lastPull).toLocaleString('es-CO')}.` : ''),
    h('div', { class: 'form' }, h('div', { class: 'form-row' }, gOwner, gRepo), gTok),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: async (e) => {
        const btn = e.currentTarget; btn.disabled = true; gMsg.textContent = 'Trayendo…';
        try {
          if (gTok.value.trim()) await SY.saveGithubCfg({ owner: gOwner.value.trim(), repo: gRepo.value.trim(), token: gTok.value.trim() });
          const r = await SY.autoSync({ force: true });
          gMsg.textContent = `Listo: ${r.nuevas} enseñanzas nuevas, ${r.actualizadas} actualizadas${r.biblias.length ? `, Biblias: ${r.biblias.join(', ')}` : ''}${r.clave ? ', archivo abierto' : ''}.${r.errores.length ? ' Aviso: ' + r.errores.join(' ') : ''}`;
        } catch (err) { gMsg.textContent = err.message; }
        btn.disabled = false;
      } }, 'Traer ahora'),
      own ? h('button', { class: 'btn ghost', onclick: async () => { await SY.saveGithubCfg(null); gTok.value = ''; gMsg.textContent = 'Clave quitada de este equipo.'; } }, 'Quitar la clave de este equipo') : null),
    gMsg, h('p', { class: 'hint' }, 'La clave se guarda solo en este equipo: no va en los respaldos ni en GitHub.')));

  // Enseñanzas: clave del archivo
  const { hasKey, forgetKey } = await import('../taller/store.js');
  const keyInfo = h('p', {}, (await hasKey()) ? 'El archivo cifrado de enseñanzas está abierto en este equipo.' : 'El archivo cifrado de enseñanzas todavía no se ha abierto en este equipo.');
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Archivo de enseñanzas'), keyInfo,
    h('p', { class: 'hint' }, 'La clave se guarda solo en este equipo; no va en los respaldos ni en GitHub.'),
    (await hasKey()) ? h('button', { class: 'btn small', onclick: async () => { if (await confirmDialog('Cerrar el archivo', '¿Olvidar la clave en este equipo? Tendrá que escribirla otra vez para abrir el archivo.', 'Olvidar clave')) { await forgetKey(); keyInfo.textContent = 'Clave olvidada en este equipo.'; } } }, 'Olvidar la clave en este equipo') : null));

  // Asistente de IA: conexión con la función de servidor propia (la clave de Anthropic nunca está en la app)
  const AI = await import('../ai.js');
  const ac = await AI.aiConfig();
  const aUrl = h('input', { type: 'url', value: ac.url, placeholder: 'https://xxxx.supabase.co/functions/v1/asistente', 'aria-label': 'Dirección de la función', autocapitalize: 'off', autocomplete: 'off' });
  const aCode = h('input', { type: 'password', value: ac.code, placeholder: 'Código de acceso (el mismo CODIGO_ACCESO del servidor)', 'aria-label': 'Código de acceso', autocapitalize: 'off', autocomplete: 'off' });
  const aAnon = h('input', { type: 'text', value: ac.anon, placeholder: 'Clave pública «anon» de Supabase (solo si dejó activada la verificación JWT)', 'aria-label': 'Clave pública de Supabase', autocapitalize: 'off', autocomplete: 'off' });
  const aMsg = h('p', { class: 'hint', role: 'status' }, ac.ready ? `Conectado. Modelo: ${ac.model || 'el predeterminado del servidor'}.` : 'No conectado.');
  view.append(h('section', { class: 'settings-block', id: 'ia' }, h('h2', {}, 'Asistente de IA'),
    h('p', {}, 'El asistente usa Claude (Anthropic) a través de una función de servidor suya en Supabase, donde se guarda la clave de Anthropic. La app nunca guarda esa clave. Cuando la conexión funcione, aparecerá «Asistente IA» en el menú y «Preguntar a la IA» en el panel de cada versículo.'),
    h('details', {}, h('summary', {}, 'Cómo dejarlo listo (desde el iPad, unos 15 minutos)'),
      h('ol', { class: 'steps' },
        h('li', {}, 'En console.anthropic.com cree su cuenta, añada saldo y ponga un límite de gasto mensual (Settings → Limits). Cree una clave en «API Keys».'),
        h('li', {}, 'En supabase.com cree un proyecto gratuito. Entre a Edge Functions → «Deploy a new function» → «Via Editor», nómbrela asistente y pegue el código de supabase/functions/asistente/index.ts de su repositorio App-predicador.'),
        h('li', {}, 'En los ajustes de esa función desactive «Verify JWT» (la protege su código de acceso).'),
        h('li', {}, 'En Edge Functions → Secrets cree: ANTHROPIC_API_KEY (su clave) y CODIGO_ACCESO (una frase larga que usted invente, de 12 letras o más).'),
        h('li', {}, 'Copie la dirección de la función y escríbala aquí junto con su código de acceso. Pulse «Guardar y probar».')),
      h('p', { class: 'hint' }, 'La guía completa está en docs/IA.md del repositorio.')),
    h('div', { class: 'form' }, aUrl, aCode, aAnon),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: async (e) => {
        const btn = e.currentTarget; btn.disabled = true; aMsg.textContent = 'Probando la conexión…';
        try {
          const cfg = { url: aUrl.value.trim(), code: aCode.value.trim(), anon: aAnon.value.trim() };
          if (!cfg.url || !cfg.code) throw new Error('Escriba la dirección de la función y el código de acceso.');
          await AI.saveAiConfig(cfg);
          const r = await AI.testAi(cfg);
          aMsg.textContent = `Conectado. Modelo: ${r.modelo}. Ya puede usar el asistente.`;
          (await import('../main.js')).buildNav();
        } catch (err) { aMsg.textContent = `No se pudo conectar: ${err.message}`; (await import('../main.js')).buildNav(); }
        btn.disabled = false;
      } }, 'Guardar y probar'),
      ac.url ? h('button', { class: 'btn ghost', onclick: async () => { await AI.forgetAi(); aUrl.value = ''; aCode.value = ''; aAnon.value = ''; aMsg.textContent = 'Conexión quitada de este equipo.'; (await import('../main.js')).buildNav(); } }, 'Quitar de este equipo') : null),
    aMsg, h('p', { class: 'hint' }, 'La dirección y el código se guardan solo en este equipo; no van en los respaldos ni en GitHub. La prueba no gasta consultas.')));

  // Sincronización (estado real)
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Sincronización entre dispositivos'),
    h('p', {}, 'Todavía no está activa. Requiere crear una cuenta gratuita de Supabase (base de datos y autenticación). Los datos ya se guardan con identificadores y fechas preparados para sincronizar sin pérdida. Mientras tanto, use Exportar/Importar respaldo para pasar sus datos entre el iPhone y el iPad.')));

  // Fuentes y licencias
  const m = manifest();
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Fuentes y licencias'),
    h('ul', { class: 'sources' },
      Object.values(m.versions).map(v => h('li', {}, h('strong', {}, v.name), ` — ${v.license}. ${v.verses.toLocaleString('es-CO')} versículos. Fuente: ${v.source}.`)),
      h('li', {}, h('strong', {}, m.xref.name), ` — ${m.xref.license}. ${m.xref.count.toLocaleString('es-CO')} referencias (${m.xref.filter}).`),
      h('li', {}, h('strong', {}, 'Diccionarios de Strong'), ' — hebreo (1894) y griego (1890), dominio público; edición digital de Open Scriptures (CC BY-SA).'),
      h('li', {}, h('strong', {}, 'Atlas'), ' — lugares de OpenBible.info (CC BY 4.0); mapa de Natural Earth (dominio público).'),
      h('li', {}, h('strong', {}, 'Personajes'), ' — Theographic Bible Metadata, de Robert Rouse (CC BY-SA 4.0); nombres en español tomados de la RV1909.'),
      h('li', {}, h('strong', {}, 'Lector de PDF'), ' — pdf.js de Mozilla (Apache 2.0).')),
    h('p', { class: 'hint' }, h('a', { href: 'data/LICENCIAS.txt', target: '_blank', rel: 'noopener' }, 'Texto completo de las licencias'), '. La RVR1960 y otras versiones comerciales no se incluyen porque tienen derechos de autor; solo podrían añadirse con licencia del titular.')));

  const ver = h('p', { class: 'version' }, 'Escudriñad');
  view.append(ver);
  try {
    const keys = 'caches' in window ? await caches.keys() : [];
    const shell = keys.find(k => k.startsWith('escudrinad-shell-'));
    ver.textContent = shell ? `Escudriñad · versión instalada ${shell.replace('escudrinad-shell-', '')}` : 'Escudriñad · versión sin instalar (se instala al abrir con conexión)';
  } catch (e) { /* sin acceso a la caché */ }
}
