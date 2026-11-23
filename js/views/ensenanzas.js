// Módulo «Enseñanzas» (etapa 1 de la unión con el Taller del Predicador):
// Mis enseñanzas, archivo cifrado, series, calendario, lectura con el diseño del Word, exportar Word/PDF, editor.
import { h, clear, icon, toast, modal, confirmDialog, copyText, safeFileName } from '../ui.js';
import { norm } from '../books.js';
import { STYLES, ESTADOS, CULTOS, DUR, CATS, catName, pageHTML, libToMd, mdToPlain, fechaHoy } from '../taller/page.js';
import * as T from '../taller/store.js';

const TABS = [['mis', 'Mis enseñanzas'], ['archivo', 'Mi archivo'], ['series', 'Series'], ['calendario', 'Calendario']];
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtDia = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; } };

export async function renderEnsenanzas(view, tab = 'mis') {
  if (!TABS.some(t => t[0] === tab)) tab = 'mis';
  view.append(h('header', { class: 'page-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Taller del Predicador'), h('h1', {}, 'Enseñanzas')),
    h('a', { class: 'btn primary', href: '#/ensenanza/nueva' }, icon('plus', 18), 'Nueva')),
    h('nav', { class: 'tabs page-tabs' }, TABS.map(([id, n]) => h('a', { href: `#/ensenanzas/${id}`, 'aria-selected': id === tab ? 'true' : 'false' }, n))));
  const body = h('div', { class: 'ens-body' });
  view.append(body);
  if (tab === 'mis') await tabMis(body);
  else if (tab === 'archivo') await tabArchivo(body);
  else if (tab === 'series') await tabSeries(body);
  else await tabCalendario(body);
}

function sermonRow(s, pred) {
  const p = pred[`S${s.id}`];
  return h('li', {}, h('a', { href: `#/ensenanza/${encodeURIComponent(s.id)}` },
    h('strong', {}, s.titulo || 'Sin título'),
    h('span', {}, [s.texto, catName(s.categoria), ESTADOS[s.estado] || '', s.enserie && s.serie ? `Serie: ${s.serie}` : '', p ? `Predicada ${fmtDia(p)}` : ''].filter(Boolean).join(' · '))));
}

async function tabMis(body) {
  const [list, pred] = await Promise.all([T.listSermons(), T.getPred()]);
  if (!list.length) {
    body.append(h('section', { class: 'settings-block' }, h('h2', {}, 'Traiga sus enseñanzas del Taller'),
      h('p', {}, 'Sus enseñanzas del Taller del Predicador se pueden pasar aquí sin perder nada. El Taller sigue funcionando igual.'),
      importButtons(), h('p', { class: 'hint' }, 'También puede crear una enseñanza nueva con el botón «Nueva».')));
    return;
  }
  const q = h('input', { type: 'search', placeholder: 'Buscar en títulos, textos y contenido', 'aria-label': 'Buscar enseñanzas' });
  const est = h('select', { 'aria-label': 'Estado' }, h('option', { value: '' }, 'Todos los estados'), Object.entries(ESTADOS).map(([k, v]) => h('option', { value: k }, v)));
  const cats = [...new Set(list.map(s => s.categoria).filter(Boolean))].sort();
  const cat = h('select', { 'aria-label': 'Categoría' }, h('option', { value: '' }, 'Todas las categorías'), cats.map(c => h('option', { value: c }, catName(c) || c)));
  const ul = h('ul', { class: 'list' });
  const count = h('p', { class: 'hint' });
  const draw = () => {
    const t = norm(q.value.trim());
    const shown = list.filter(s => (!est.value || s.estado === est.value) && (!cat.value || s.categoria === cat.value)
      && (!t || norm(`${s.titulo} ${s.texto} ${s.serie} ${s.notas} ${s.ensenanza}`).includes(t)));
    clear(ul); shown.forEach(s => ul.append(sermonRow(s, pred)));
    if (!shown.length) ul.append(h('li', { class: 'empty' }, 'Ninguna enseñanza coincide.'));
    count.textContent = `${shown.length} de ${list.length} enseñanzas`;
  };
  [q, est, cat].forEach(x => x.addEventListener('input', draw));
  body.append(h('div', { class: 'toolbar' }, q, est, cat), count, ul,
    h('details', { class: 'block import-more' }, h('summary', {}, 'Importar o actualizar desde el Taller'), importButtons()));
  draw();
}

function importButtons() {
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const parsed = T.parseTallerData(JSON.parse(await f.text()));
      const r = await T.importTaller(parsed);
      toast(`Importadas: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas, ${r.iguales} sin cambios`);
      location.hash = '#/ensenanzas/mis'; window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) { toast(err.message || 'No se pudo leer el archivo', 'err'); }
    e.target.value = '';
  } });
  return h('div', { class: 'btn-row' },
    h('button', { class: 'btn primary', onclick: async (e) => {
      const btn = e.currentTarget; // currentTarget deja de existir después de un await
      btn.disabled = true;
      const r = await T.importTallerLocal();
      btn.disabled = false;
      if (!r) { toast('En este navegador no hay datos del Taller. Use «Importar copia de seguridad».', 'err'); return; }
      toast(`Del Taller: ${r.nuevas} nuevas, ${r.actualizadas} actualizadas, ${r.iguales} sin cambios${r.key ? ' · archivo desbloqueado' : ''}`);
      location.hash = '#/ensenanzas/mis'; window.dispatchEvent(new HashChangeEvent('hashchange'));
    } }, 'Traer del Taller en este equipo'),
    h('button', { class: 'btn', onclick: () => fileIn.click() }, 'Importar copia de seguridad'), fileIn,
    h('p', { class: 'hint', style: { flexBasis: '100%' } }, '«Traer del Taller en este equipo» funciona cuando el Taller y esta app se abren en el mismo lugar (los dos en Safari, o los dos desde la pantalla de inicio). Si no, en el Taller vaya a Ajustes → Descargar copia, y luego use «Importar copia de seguridad». Nada se borra: si una enseñanza ya existe, se conserva la versión más reciente.'));
}

async function keyForm(onDone) {
  const inp = h('input', { type: 'password', placeholder: 'Clave del archivo', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Clave del archivo' });
  const msg = h('p', { class: 'hint', role: 'alert' });
  const form = h('form', { class: 'settings-block key-form', onsubmit: async (e) => {
    e.preventDefault(); if (!inp.value.trim()) return;
    msg.textContent = 'Abriendo… (puede tardar unos segundos)';
    try { await T.unlock(inp.value); toast('Archivo abierto'); onDone(); }
    catch (err) { msg.textContent = err.message; }
  } }, h('h2', {}, 'Abrir su archivo de enseñanzas'),
    h('p', {}, 'Su archivo está cifrado. Escriba la misma clave que usa en el Taller. Se pide una sola vez en este equipo y nunca se guarda en GitHub ni en los respaldos.'),
    h('div', { class: 'btn-row' }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Abrir')), msg,
    h('p', { class: 'hint' }, 'Si el Taller ya está abierto en este equipo, también puede usar «Traer del Taller en este equipo» en «Mis enseñanzas»: trae la clave junto con sus enseñanzas.'));
  return form;
}

async function tabArchivo(body) {
  if (!(await T.hasKey())) { body.append(await keyForm(() => { clear(body); tabArchivo(body); })); return; }
  body.append(h('div', { class: 'loading small' }, 'Abriendo su archivo…'));
  let lib;
  try { lib = await T.loadArchive(); }
  catch (e) {
    clear(body).append(h('div', { class: 'error-box' }, e.message, navigator.onLine ? '' : ' Sin conexión: el archivo se guarda para uso sin conexión después de abrirlo una vez con internet.'));
    if (e.message === 'La clave no es correcta.' || /decrypt|operation/i.test(e.message)) body.append(h('button', { class: 'btn', onclick: async () => { await T.forgetKey(); clear(body); tabArchivo(body); } }, 'Escribir la clave otra vez'));
    return;
  }
  const pred = await T.getPred();
  clear(body);
  const q = h('input', { type: 'search', placeholder: 'Buscar en su archivo (título, texto o contenido)', 'aria-label': 'Buscar en el archivo' });
  const fsel = h('select', { 'aria-label': 'Carpeta' }, h('option', { value: '' }, 'Todas las carpetas'),
    lib.carpetas.map((c, i) => ({ c, i })).sort((a, b) => (a.c.o ?? a.i + 100) - (b.c.o ?? b.i + 100)).map(({ c, i }) => h('option', { value: i }, c.t)));
  const ul = h('ul', { class: 'list' }); const count = h('p', { class: 'hint' });
  const draw = () => {
    const t = norm(q.value.trim());
    const items = lib.items.filter(it => (fsel.value === '' || it.c === +fsel.value) && (!t || norm(`${it.t} ${it.T || ''} ${it.r || ''} ${it.S || ''}`).includes(t) || (t.length > 2 && norm(it.md || (it.p || []).map(x => x[1]).join(' ')).includes(t))));
    clear(ul);
    items.slice(0, 300).forEach(it => ul.append(h('li', {}, h('a', { href: `#/archivo/${it.i}` }, h('strong', {}, it.t),
      h('span', {}, [lib.carpetas[it.c]?.t, it.r, DUR[it.d], pred[`L${it.i}`] ? `Predicada ${fmtDia(pred[`L${it.i}`])}` : ''].filter(Boolean).join(' · '))))));
    if (!items.length) ul.append(h('li', { class: 'empty' }, 'No hay enseñanzas con ese filtro.'));
    count.textContent = items.length > 300 ? `Mostrando 300 de ${items.length}. Escriba algo más específico o elija una carpeta.` : `${items.length} enseñanzas`;
  };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 180); }); fsel.addEventListener('change', draw);
  body.append(h('div', { class: 'toolbar' }, q, fsel), count, ul,
    h('p', { class: 'hint' }, 'El archivo se lee directamente del Taller publicado, así que las enseñanzas nuevas que se agreguen allí aparecen aquí también.'));
  draw();
}

async function tabSeries(body) {
  const list = await T.listSermons();
  const groups = new Map();
  for (const s of list) if (s.enserie && s.serie) { if (!groups.has(s.serie)) groups.set(s.serie, []); groups.get(s.serie).push(s); }
  if (!groups.size) { body.append(h('p', { class: 'empty' }, 'No hay series todavía. Al editar una enseñanza, marque «Es parte de una serie» y escriba el nombre de la serie.')); return; }
  const pred = await T.getPred();
  for (const [name, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
    items.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.titulo || '').localeCompare(b.titulo || '', 'es'));
    const done = items.filter(s => pred[`S${s.id}`]).length;
    body.append(h('section', { class: 'block' }, h('h2', {}, `${name} · ${items.length} enseñanzas${done ? ` · ${done} predicadas` : ''}`),
      h('ol', { class: 'list series-list' }, items.map(s => sermonRow(s, pred)))));
  }
}

async function tabCalendario(body) {
  const [list, pred] = await Promise.all([T.listSermons(), T.getPred()]);
  const t = hoy();
  const prox = list.filter(s => s.fecha && s.fecha >= t).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasadas = list.filter(s => s.fecha && s.fecha < t && !pred[`S${s.id}`]).sort((a, b) => b.fecha.localeCompare(a.fecha));
  let lib = null; try { if (await T.hasKey()) lib = await T.loadArchive(); } catch (e) { lib = null; }
  const hist = Object.entries(pred).sort((a, b) => b[1].localeCompare(a[1])).map(([k, f]) => {
    if (k[0] === 'S') { const s = list.find(x => x.id === k.slice(1)); return { f, t: s ? s.titulo : 'Enseñanza eliminada', href: s ? `#/ensenanza/${encodeURIComponent(s.id)}` : null }; }
    const it = lib?.items[+k.slice(1)]; return { f, t: it ? it.t : 'Enseñanza del archivo (abra el archivo para ver el título)', href: `#/archivo/${k.slice(1)}` };
  });
  const sec = (title, items, empty) => h('section', { class: 'block' }, h('h2', {}, title),
    items.length ? h('ul', { class: 'list' }, items) : h('p', { class: 'hint' }, empty));
  body.append(
    sec('Próximas', prox.map(s => h('li', {}, h('a', { href: `#/ensenanza/${encodeURIComponent(s.id)}` }, h('strong', {}, `${fmtDia(s.fecha)} — ${s.titulo}`), h('span', {}, [CULTOS[s.culto], ESTADOS[s.estado]].filter(Boolean).join(' · '))))), 'No hay enseñanzas con fecha próxima. Asigne una fecha al editar una enseñanza.'),
    pasadas.length ? sec('Con fecha pasada, sin marcar como predicadas', pasadas.map(s => h('li', {}, h('a', { href: `#/ensenanza/${encodeURIComponent(s.id)}` }, h('strong', {}, `${fmtDia(s.fecha)} — ${s.titulo}`), h('span', {}, 'Ábrala y marque «Predicada» si ya la predicó')))), '') : null,
    sec('Ya predicadas', hist.map(x => h('li', {}, h('a', { href: x.href }, h('strong', {}, x.t), h('span', {}, fmtDia(x.f))))), 'Todavía no hay enseñanzas marcadas como predicadas.'));
}

// ---------- Lector ----------
let LOGO = null;
async function logo() { if (!LOGO) LOGO = (await import('../taller/logo.js')).LOGO_B64; return LOGO; }

export async function renderEnsenanza(view, id) {
  if (id === 'nueva') return renderEditor(view, null);
  const s = await T.getSermon(id);
  if (!s) { view.append(h('div', { class: 'empty' }, 'Esta enseñanza no existe o fue eliminada. ', h('a', { href: '#/ensenanzas/mis' }, 'Volver'))); return; }
  await reader(view, {
    titulo: s.titulo || 'Sin título', md: s.ensenanza || `# ${s.titulo || ''}\n\n${s.notas || ''}`, meta: s,
    sub: [s.texto, catName(s.categoria), CULTOS[s.culto], ESTADOS[s.estado], s.enserie && s.serie ? `Serie: ${s.serie}` : '', s.fecha ? `Fecha: ${fmtDia(s.fecha)}` : ''].filter(Boolean).join(' · '),
    predKey: `S${s.id}`, back: '#/ensenanzas/mis',
    extra: [
      h('a', { class: 'btn small', href: `#/ensenanza/${encodeURIComponent(s.id)}/editar` }, icon('pen', 16), 'Editar'),
      h('button', { class: 'btn small ghost danger', onclick: async () => {
        if (await confirmDialog('Eliminar enseñanza', `¿Eliminar «${s.titulo}» de esta app? No afecta al Taller. Puede recuperarla importando una copia.`)) { await T.deleteSermon(s.id); toast('Enseñanza eliminada'); location.hash = '#/ensenanzas/mis'; }
      } }, icon('trash', 16), 'Eliminar')],
    notas: s.notas,
  });
}

export async function renderArchivoItem(view, idx) {
  if (!(await T.hasKey())) { view.append(await keyForm(() => { clear(view); renderArchivoItem(view, idx); })); return; }
  let lib; try { lib = await T.loadArchive(); } catch (e) { view.append(h('div', { class: 'error-box' }, e.message)); return; }
  const it = lib.items[+idx];
  if (!it) { view.append(h('div', { class: 'empty' }, 'No se encontró la enseñanza. ', h('a', { href: '#/ensenanzas/archivo' }, 'Volver al archivo'))); return; }
  const vn = (await T.loadNuevas())[it.i];
  const orig = libToMd(it);
  let current = orig;
  const folder = lib.carpetas[it.c]?.t || '';
  const extra = [h('button', { class: 'btn small', onclick: async () => {
    const cat = (CATS.find(c => norm(c[1]) === norm(folder)) || [''])[0];
    const rec = await T.saveSermon({ id: `a${it.i}-${Date.now().toString(36)}`, titulo: it.t, texto: it.r || '', categoria: cat, culto: 'dominical', estado: 'listo', fecha: '', notas: '', enserie: false, serie: '', origen: it.i, origenTitulo: it.t, ensenanza: current, materiales: [] });
    toast('Copiada a Mis enseñanzas'); location.hash = `#/ensenanza/${encodeURIComponent(rec.id)}`;
  } }, icon('plus', 16), 'Copiar a Mis enseñanzas')];
  await reader(view, {
    titulo: it.t, md: orig, meta: { titulo: it.t }, sub: [folder, it.r, DUR[it.d]].filter(Boolean).join(' · '),
    predKey: `L${it.i}`, back: '#/ensenanzas/archivo', extra,
    versions: vn ? { orig, nueva: vn, onChange: (md) => { current = md; } } : null,
  });
}

async function reader(view, o) {
  const st0 = await T.getStyle();
  let style = st0, md = o.md;
  const pred = await T.getPred();
  const page = h('div', { class: 'ens-page' });
  const lg = await logo();
  const paint = () => { page.innerHTML = pageHTML(md, style, lg); }; // pageHTML escapa todo el texto
  const styleSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Diseño' }, Object.entries(STYLES).map(([k, n]) =>
    h('button', { class: k === style ? 'on' : '', onclick: async (e) => { const btn = e.currentTarget; style = k; paint(); styleSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); await T.setStyle(k); } }, n)));
  const verSeg = o.versions ? h('div', { class: 'seg', role: 'group', 'aria-label': 'Versión' },
    [['orig', 'Original'], ['nueva', 'Versión nueva']].map(([k, n], i) => h('button', { class: i === 0 ? 'on' : '', onclick: (e) => { md = o.versions[k]; o.versions.onChange(md); verSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); paint(); } }, n))) : null;
  const predState = h('span', { class: 'hint' });
  const drawPred = (p) => { predState.textContent = p[o.predKey] ? `Predicada el ${fmtDia(p[o.predKey])}` : ''; };
  drawPred(pred);
  const predBtn = h('button', { class: 'btn small', onclick: async () => {
    const cur = (await T.getPred())[o.predKey];
    const date = h('input', { type: 'date', value: cur || hoy(), 'aria-label': 'Fecha en que la predicó' });
    const r = await modal({ title: 'Marcar como predicada', content: h('div', { class: 'form' }, h('p', {}, o.titulo), date), actions: [
      cur ? { label: 'Quitar marca', value: 'quitar' } : { label: 'Cancelar', value: null },
      { label: 'Guardar', primary: true, onClick: () => date.value || false }] });
    if (r === 'quitar') drawPred(await T.setPred(o.predKey, null));
    else if (r) drawPred(await T.setPred(o.predKey, r));
  } }, icon('check', 16), 'Predicada');
  const actions = h('div', { class: 'study-tools' },
    h('button', { class: 'btn small primary', onclick: () => exportWord(md, style, o.titulo, o.meta) }, icon('download', 16), 'Descargar Word'),
    h('button', { class: 'btn small', onclick: () => window.print() }, icon('print', 16), 'Imprimir / PDF'),
    h('button', { class: 'btn small', onclick: async () => toast((await copyText(mdToPlain(md))) ? 'Texto copiado' : 'No se pudo copiar') }, icon('copy', 16), 'Copiar texto'),
    predBtn, ...(o.extra || []));
  view.append(h('header', { class: 'study-head ens-head' },
    h('a', { class: 'back', href: o.back }, icon('left', 18), 'Enseñanzas'),
    h('h1', { class: 'ens-title' }, o.titulo),
    o.sub ? h('p', { class: 'hint' }, o.sub) : null, predState,
    h('div', { class: 'opt-row' }, h('span', {}, 'Diseño'), styleSeg, verSeg),
    actions,
    o.notas ? h('details', { class: 'block' }, h('summary', {}, 'Notas'), h('p', { class: 'note-body' }, o.notas)) : null), page);
  paint();
}

let DOCX_P = null;
function loadDocx() {
  if (window.docx) return Promise.resolve(window.docx);
  if (!DOCX_P) DOCX_P = new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = 'vendor/docx.js';
    sc.onload = () => window.docx ? res(window.docx) : rej(new Error('No cargó el generador de Word'));
    sc.onerror = () => { DOCX_P = null; rej(new Error('No se pudo cargar el generador de Word (revise la conexión)')); };
    document.head.append(sc);
  });
  return DOCX_P;
}
async function exportWord(md, style, titulo, meta) {
  toast('Preparando el Word…');
  try {
    const [D, { WordGen }, lg] = await Promise.all([loadDocx(), import('../taller/wordgen.js'), logo()]);
    const bin = atob(lg); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const doc = WordGen.build(D, md, { style, fecha: fechaHoy(), serie: meta?.enserie && meta?.serie ? `Serie: ${meta.serie}` : '', culto: '', logo: bytes });
    const blob = await D.Packer.toBlob(doc);
    const name = safeFileName(`${titulo || 'Ensenanza'} (${STYLES[style].toLowerCase()}).docx`);
    const file = new File([blob], name, { type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: titulo }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name }); document.body.append(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 5000); // quitarlo de inmediato pierde el nombre del archivo
    toast('Word listo');
  } catch (e) { console.error(e); toast(e.message || 'No se pudo crear el Word', 'err'); }
}

// ---------- Editor ----------
export async function renderEditor(view, id) {
  const s = id ? await T.getSermon(id) : null;
  if (id && !s) { view.append(h('div', { class: 'empty' }, 'Esta enseñanza no existe.')); return; }
  const d = s || { id: 's' + Date.now(), titulo: '', texto: '', categoria: '', culto: 'dominical', estado: 'idea', fecha: '', notas: '', enserie: false, serie: '', ensenanza: '', materiales: [] };
  const f = {
    titulo: h('input', { type: 'text', value: d.titulo, placeholder: 'Título', 'aria-label': 'Título' }),
    texto: h('input', { type: 'text', value: d.texto, placeholder: 'Texto base (ej.: Hechos 2:38)', 'aria-label': 'Texto base' }),
    categoria: h('select', { 'aria-label': 'Categoría' }, h('option', { value: '' }, 'Sin categoría'), CATS.map(([k, n]) => h('option', { value: k, selected: d.categoria === k }, n))),
    culto: h('select', { 'aria-label': 'Culto' }, Object.entries(CULTOS).map(([k, n]) => h('option', { value: k, selected: d.culto === k }, n))),
    estado: h('select', { 'aria-label': 'Estado' }, Object.entries(ESTADOS).map(([k, n]) => h('option', { value: k, selected: d.estado === k }, n))),
    fecha: h('input', { type: 'date', value: d.fecha || '', 'aria-label': 'Fecha' }),
    enserie: h('input', { type: 'checkbox', checked: !!d.enserie }),
    serie: h('input', { type: 'text', value: d.serie || '', placeholder: 'Nombre de la serie', 'aria-label': 'Serie' }),
    notas: h('textarea', { rows: 3, placeholder: 'Notas personales', 'aria-label': 'Notas' }),
    md: h('textarea', { rows: 22, class: 'md-editor', placeholder: '# TÍTULO\n*Subtítulo*\n\n> Hechos 2:38 — ³⁸ Pedro les dijo: …\n\n## I. Primer punto\n- …\n\n**Frase de impacto**', 'aria-label': 'Contenido de la enseñanza' }),
  };
  f.notas.value = d.notas || ''; f.md.value = d.ensenanza || '';
  const preview = h('div', { class: 'ens-page' });
  const lg = await logo(); const style = await T.getStyle();
  const paint = () => { preview.innerHTML = pageHTML(f.md.value, style, lg); };
  let tm; f.md.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(paint, 400); });
  const save = async () => {
    if (!f.titulo.value.trim()) { toast('Escriba el título'); f.titulo.focus(); return; }
    const rec = await T.saveSermon({ ...d, titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), categoria: f.categoria.value, culto: f.culto.value, estado: f.estado.value,
      fecha: f.fecha.value, enserie: f.enserie.checked, serie: f.enserie.checked ? f.serie.value.trim() : '', notas: f.notas.value, ensenanza: f.md.value });
    toast('Enseñanza guardada'); location.hash = `#/ensenanza/${encodeURIComponent(rec.id)}`;
  };
  view.append(h('header', { class: 'study-head' },
    h('a', { class: 'back', href: s ? `#/ensenanza/${encodeURIComponent(s.id)}` : '#/ensenanzas/mis' }, icon('left', 18), s ? 'Volver sin guardar' : 'Enseñanzas'),
    h('h1', { class: 'ens-title' }, s ? 'Editar enseñanza' : 'Nueva enseñanza')),
    h('div', { class: 'form ens-form' }, f.titulo, f.texto,
      h('div', { class: 'form-row' }, f.categoria, f.culto, f.estado),
      h('div', { class: 'form-row' }, h('label', { class: 'inline' }, 'Fecha para predicar ', f.fecha), h('label', { class: 'inline' }, f.enserie, ' Es parte de una serie'), f.serie),
      f.notas,
      h('details', {}, h('summary', {}, 'Formato del contenido'), h('ul', { class: 'hint' },
        h('li', {}, '# Título (primera línea) y *Subtítulo* (segunda línea)'), h('li', {}, '## I. Punto principal · ### Subtítulo menor'),
        h('li', {}, '> Referencia — texto bíblico (cita destacada)'), h('li', {}, '- viñeta · 1. lista numerada'),
        h('li', {}, '**frase de impacto** en una línea sola · ==resaltado== · «cita» (NTV)'))),
      f.md,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: save }, 'Guardar'),
        h('button', { class: 'btn', onclick: () => { paint(); preview.scrollIntoView({ behavior: 'smooth' }); } }, 'Ver cómo queda'))),
    h('h2', { class: 'res-count' }, 'Vista previa'), preview);
  paint();
}
