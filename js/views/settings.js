import { h, clear, icon, toast, download, confirmDialog } from '../ui.js';
import { S, setPref, PROFILES } from '../state.js';
import { exportAll, importAll, counts } from '../db.js';
import { PACKS, packStatus, downloadPack, removePack, storageEstimate } from '../offline.js';
import { manifest } from '../bible.js';

export async function renderSettings(view) {
  view.append(h('header', { class: 'page-head' }, h('h1', {}, 'Ajustes')));

  // Apariencia
  const themes = h('div', { class: 'seg' }, ['claro', 'sepia', 'oscuro'].map(t =>
    h('button', { class: S.theme === t ? 'on' : '', onclick: async (e) => { await setPref('theme', t); themes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, t[0].toUpperCase() + t.slice(1))));
  const sizeVal = h('span', { class: 'val' }, `${S.fontSize} px`);
  const size = h('input', { type: 'range', min: 14, max: 30, value: S.fontSize, 'aria-label': 'Tamaño de letra', oninput: async (e) => { await setPref('fontSize', +e.target.value); sizeVal.textContent = `${e.target.value} px`; preview.style.fontSize = `${e.target.value}px`; } });
  const preview = h('p', { class: 'bible preview', style: { fontSize: `${S.fontSize}px` } }, 'Escudriñad las Escrituras, porque á vosotros os parece que en ellas tenéis la vida eterna; y ellas son las que dan testimonio de mí. — Juan 5:39');
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Lectura y apariencia'),
    h('div', { class: 'opt-row' }, h('span', {}, 'Apariencia'), themes),
    h('div', { class: 'opt-row' }, h('span', {}, 'Tamaño de letra'), size, sizeVal), preview));

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
    h('p', {}, `En este dispositivo: ${c.notes} notas, ${c.studies} estudios, ${c.favorites} favoritos, ${c.highlights} resaltados, ${c.bookmarks} marcadores.`),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn primary', onclick: async () => {
        const data = await exportAll();
        download(`escudrinad-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
        toast('Respaldo exportado. Guárdelo en Archivos o iCloud Drive.');
      } }, icon('download', 18), 'Exportar respaldo'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Importar respaldo'), fileIn),
    h('p', { class: 'hint' }, 'Importar fusiona: conserva la versión más reciente de cada registro y no borra lo que ya tiene.')));

  // Sincronización (estado real)
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Sincronización entre dispositivos'),
    h('p', {}, 'Todavía no está activa. Requiere crear una cuenta gratuita de Supabase (base de datos y autenticación). Los datos ya se guardan con identificadores y fechas preparados para sincronizar sin pérdida. Mientras tanto, use Exportar/Importar respaldo para pasar sus datos entre el iPhone y el iPad.')));

  // Fuentes y licencias
  const m = manifest();
  view.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Fuentes y licencias'),
    h('ul', { class: 'sources' },
      Object.values(m.versions).map(v => h('li', {}, h('strong', {}, v.name), ` — ${v.license}. ${v.verses.toLocaleString('es-CO')} versículos. Fuente: ${v.source}.`)),
      h('li', {}, h('strong', {}, m.xref.name), ` — ${m.xref.license}. ${m.xref.count.toLocaleString('es-CO')} referencias (${m.xref.filter}).`),
      h('li', {}, h('strong', {}, 'Diccionarios de Strong'), ' — hebreo (1894) y griego (1890), dominio público; edición digital de Open Scriptures (CC BY-SA).')),
    h('p', { class: 'hint' }, h('a', { href: 'data/LICENCIAS.txt', target: '_blank', rel: 'noopener' }, 'Texto completo de las licencias'), '. La RVR1960 y otras versiones comerciales no se incluyen porque tienen derechos de autor; solo podrían añadirse con licencia del titular.')));

  const ver = h('p', { class: 'version' }, 'Escudriñad');
  view.append(ver);
  try {
    const keys = 'caches' in window ? await caches.keys() : [];
    const shell = keys.find(k => k.startsWith('escudrinad-shell-'));
    ver.textContent = shell ? `Escudriñad · versión instalada ${shell.replace('escudrinad-shell-', '')}` : 'Escudriñad · versión sin instalar (se instala al abrir con conexión)';
  } catch (e) { /* sin acceso a la caché */ }
}
