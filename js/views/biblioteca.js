// Biblioteca: lista de documentos, importación, búsqueda en el texto y lector (PDF con pdf.js, o texto).
import { h, clear, icon, toast, fmtDate, confirmDialog, modal } from '../ui.js';
import { libTabs } from './mensajes.js';
import { label } from '../ref.js';
import { uid, now } from '../db.js';
import { hrefFor } from './verse.js';
import { importDocument, deleteDocument, listDocs, getDoc, saveDoc, getFile, searchDocs, pdfjs, pdfOptions } from '../library.js';

const size = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
const markSnip = (s) => [s.pre, h('mark', {}, s.hit), s.post];
const tagsOf = (s) => [...new Set(s.split(',').map(t => t.trim()).filter(Boolean))];

export async function renderBiblioteca(view, params, msg = '') {
  const docs = (await listDocs()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const file = h('input', { type: 'file', accept: '.pdf,.txt,.md,application/pdf,text/plain', multiple: true, hidden: true });
  const status = h('p', { class: `hint${msg ? ' error-text' : ''}`, role: 'status' }, msg);
  file.addEventListener('change', async () => {
    const files = [...file.files]; if (!files.length) return;
    let ok = 0; const bad = [];
    for (const [n, f] of files.entries()) {
      try {
        status.textContent = `Leyendo ${f.name} (${n + 1} de ${files.length})…`;
        await importDocument(f, (i, t) => { status.textContent = `Leyendo ${f.name}: página ${i} de ${t}…`; });
        ok++;
      } catch (e) { console.warn(e); bad.push(e.message || `No se pudo leer ${f.name}`); }
    }
    file.value = '';
    if (ok) toast(`${ok} documento${ok === 1 ? '' : 's'} añadido${ok === 1 ? '' : 's'} a la biblioteca`);
    if (bad.length) { status.textContent = `No se añadieron: ${bad.join(' ')}`; status.classList.add('error-text'); if (!ok) return; }
    renderAgain(bad.length ? `No se añadieron: ${bad.join(' ')}` : '');
  });
  const renderAgain = (msg) => { clear(view); renderBiblioteca(view, params, msg); };

  const q = h('input', { type: 'search', placeholder: 'Buscar en el texto de todos sus documentos…', 'aria-label': 'Buscar en la biblioteca', value: params?.get('q') || '' });
  const tags = [...new Set(docs.flatMap(d => d.tags || []))].sort((a, b) => a.localeCompare(b, 'es'));
  let tag = '';
  const tagBar = tags.length ? h('div', { class: 'chips' }, h('button', { class: 'chip on', onclick: (e) => pick('', e.currentTarget) }, 'Todos'), tags.map(t => h('button', { class: 'chip', onclick: (e) => pick(t, e.currentTarget) }, t))) : null;
  const pick = (t, btn) => { tag = t; tagBar.querySelectorAll('.chip').forEach(b => b.classList.toggle('on', b === btn)); drawList(); };
  const list = h('ul', { class: 'list doc-list' }); const results = h('div', { class: 'doc-results' });

  const drawList = () => {
    clear(list);
    const shown = docs.filter(d => !tag || (d.tags || []).includes(tag));
    for (const d of shown) list.append(h('li', {}, h('a', { href: `#/documento/${d.id}` },
      h('strong', {}, d.title), h('span', {}, [d.author, d.kind === 'pdf' ? `PDF · ${d.pageCount} página${d.pageCount === 1 ? '' : 's'}` : 'Texto', size(d.size),
        Object.keys(d.refs || {}).length ? `${Object.keys(d.refs).length} citas bíblicas` : '', (d.tags || []).join(', ')].filter(Boolean).join(' · ')))));
    if (!docs.length) list.append(h('li', { class: 'empty' }, 'Su biblioteca está vacía. Añada sus PDF (libros, estudios, comentarios, apuntes) con el botón «Añadir documentos».'));
  };
  const search = async () => {
    const t = q.value.trim(); clear(results);
    if (t.length < 2) { list.hidden = false; return; }
    list.hidden = true;
    const hits = await searchDocs(t);
    results.append(h('p', { class: 'hint' }, hits.length ? `${hits.length}${hits.length >= 200 ? '+' : ''} resultado${hits.length === 1 ? '' : 's'} para «${t}»` : `«${t}» no aparece en sus documentos.`));
    const ul = h('ul', { class: 'list compact' });
    for (const r of hits) ul.append(h('li', {}, h('a', { href: `#/documento/${r.doc.id}/${r.page}?q=${encodeURIComponent(t)}` },
      h('strong', {}, `${r.doc.title} · pág. ${r.page}`), h('span', { class: 'snip' }, markSnip(r.snip)))));
    results.append(ul);
  };
  let tm; q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(search, 250); });

  view.append(h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Biblioteca')),
      h('div', { class: 'head-actions' }, h('button', { class: 'btn primary', onclick: () => file.click() }, icon('plus', 18), 'Añadir documentos'), file)),
    libTabs('biblioteca'), status, h('div', { class: 'toolbar' }, q), tagBar, results, list,
    h('p', { class: 'hint' }, 'Los documentos se guardan solo en este dispositivo y no se publican. Al importarlos se extrae su texto para buscar y se detectan las citas bíblicas (por ejemplo «Hch 2:38»). Los PDF escaneados como imagen no tienen texto que buscar. El respaldo guarda la ficha, las etiquetas y las notas, pero no los archivos: en otro equipo hay que volver a añadirlos.'));
  drawList(); if (q.value) search();
}

export async function renderDocumento(view, id, page, params) {
  const d = await getDoc(id);
  const f = d && await getFile(id);
  if (!d || !f) { view.append(h('div', { class: 'empty' }, 'Este documento no está en este dispositivo.'), h('a', { class: 'btn', href: '#/biblioteca' }, 'Volver a la biblioteca')); return; }
  const q0 = params?.get('q') || '';
  let mode = d.kind === 'pdf' ? 'pdf' : 'texto';
  let cur = Math.min(Math.max(1, +page || 1), d.pageCount);

  // --- Lector ---
  const pagesBox = h('div', { class: 'doc-pages' });
  const pageIn = h('input', { type: 'number', min: 1, max: d.pageCount, value: cur, 'aria-label': 'Página', class: 'page-in' });
  const goPage = (n, smooth = true) => { cur = Math.min(Math.max(1, n), d.pageCount); pageIn.value = cur; const el = pagesBox.querySelector(`[data-page="${cur}"]`); if (el) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); history.replaceState(null, '', `#/documento/${id}/${cur}${q0 ? '?q=' + encodeURIComponent(q0) : ''}`); };
  pageIn.addEventListener('change', () => goPage(+pageIn.value));
  let pdfDoc = null, pdfTask = null, scale = 1, io = null;
  const hl = (t) => { if (!q0) return t; const nt = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const nq = q0.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); const out = []; let i = 0, j; while ((j = nt.indexOf(nq, i)) >= 0) { out.push(t.slice(i, j), h('mark', {}, t.slice(j, j + nq.length))); i = j + nq.length; } out.push(t.slice(i)); return out; };

  async function drawPages() {
    clear(pagesBox); if (io) io.disconnect();
    if (mode === 'texto') {
      f.pages.forEach((t, i) => pagesBox.append(h('section', { class: 'doc-textpage', 'data-page': i + 1 }, h('p', { class: 'doc-pnum' }, `Página ${i + 1}`), h('div', { class: 'doc-text' }, t ? hl(t) : h('em', {}, 'Página sin texto (posiblemente una imagen escaneada).')))));
      requestAnimationFrame(() => goPage(cur, false));
      return;
    }
    if (!pdfDoc) {
      pagesBox.append(h('div', { class: 'loading small' }, 'Abriendo el PDF…'));
      const lib = await pdfjs();
      pdfTask = lib.getDocument({ data: new Uint8Array(await f.blob.arrayBuffer()), ...pdfOptions() }); pdfDoc = await pdfTask.promise;
      clear(pagesBox);
    }
    const first = await pdfDoc.getPage(1); const vp1 = first.getViewport({ scale: 1 });
    const width = Math.min(pagesBox.clientWidth || 800, 1100);
    scale = width / vp1.width;
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const ph = h('div', { class: 'pdf-page', 'data-page': i, style: `width:${width}px;height:${Math.round(vp1.height * scale)}px` }, h('span', { class: 'pdf-pnum' }, `${i}`));
      pagesBox.append(ph);
    }
    io = new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting && !e.target.dataset.done) { e.target.dataset.done = '1'; renderPage(e.target); } }, { root: null, rootMargin: '600px 0px' });
    pagesBox.querySelectorAll('.pdf-page').forEach(el => io.observe(el));
    requestAnimationFrame(() => goPage(cur, false));
  }
  async function renderPage(el) {
    const n = +el.dataset.page; const pg = await pdfDoc.getPage(n);
    const vp = pg.getViewport({ scale }); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = h('canvas', { width: Math.floor(vp.width * dpr), height: Math.floor(vp.height * dpr), style: `width:${Math.floor(vp.width)}px;height:${Math.floor(vp.height)}px`, 'aria-label': `Página ${n}` });
    el.style.height = `${Math.floor(vp.height)}px`;
    el.prepend(c);
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    el.classList.add('ready');
  }
  // Página visible al desplazarse
  const host = document.getElementById('view');
  const onScroll = () => { const els = pagesBox.querySelectorAll('[data-page]'); const top = host.getBoundingClientRect().top + 80; for (const el of els) { const r = el.getBoundingClientRect(); if (r.bottom > top) { if (+el.dataset.page !== cur) { cur = +el.dataset.page; pageIn.value = cur; } break; } } };
  host.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', () => { host.removeEventListener('scroll', onScroll); if (io) io.disconnect(); if (pdfTask) pdfTask.destroy(); }, { once: true });

  // --- Ficha: datos, etiquetas, notas, citas, búsqueda interna ---
  const side = h('aside', { class: 'doc-side' });
  const drawSide = () => {
    clear(side);
    const tIn = h('input', { value: d.title, 'aria-label': 'Título' }), aIn = h('input', { value: d.author || '', placeholder: 'Autor', 'aria-label': 'Autor' });
    const gIn = h('input', { value: (d.tags || []).join(', '), placeholder: 'Etiquetas separadas por comas', 'aria-label': 'Etiquetas' });
    const save = async () => { d.title = tIn.value.trim() || d.title; d.author = aIn.value.trim(); d.tags = tagsOf(gIn.value); Object.assign(d, await saveDoc(d)); toast('Ficha guardada'); title.textContent = d.title; };
    const sq = h('input', { type: 'search', placeholder: 'Buscar en este documento', 'aria-label': 'Buscar en este documento', value: q0 });
    const sres = h('ul', { class: 'list compact' });
    const doSearch = async () => { clear(sres); const t = sq.value.trim(); if (t.length < 2) return; const r = await searchDocs(t, { docId: id, limit: 100 });
      if (!r.length) sres.append(h('li', { class: 'empty' }, 'Sin resultados.'));
      for (const x of r) sres.append(h('li', {}, h('a', { href: `#/documento/${id}/${x.page}?q=${encodeURIComponent(t)}` }, h('strong', {}, `Página ${x.page}`), h('span', { class: 'snip' }, markSnip(x.snip))))); };
    let tm; sq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(doSearch, 250); });
    const notes = (d.notes || []).slice().sort((a, b) => a.page - b.page);
    const refs = Object.entries(d.refs || {}).sort((a, b) => a[1][0] - b[1][0]);
    side.append(
      h('details', { class: 'doc-box' }, h('summary', {}, 'Ficha del documento'),
        h('label', {}, 'Título', tIn), h('label', {}, 'Autor', aIn), h('label', {}, 'Etiquetas', gIn),
        h('p', { class: 'hint' }, `${d.fileName} · ${size(d.size)} · añadido ${fmtDate(d.addedAt || d.createdAt)}`),
        h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: save }, 'Guardar'),
          h('button', { class: 'btn small danger', onclick: async () => { if (await confirmDialog('Eliminar documento', `¿Eliminar «${d.title}» de la biblioteca? El archivo se borra de este dispositivo y no se puede recuperar.`)) { await deleteDocument(id); toast('Documento eliminado'); location.hash = '#/biblioteca'; } } }, icon('trash', 16), 'Eliminar'))),
      h('section', { class: 'doc-box' }, h('h3', {}, 'Buscar en el documento'), sq, sres),
      h('section', { class: 'doc-box' }, h('h3', {}, `Notas (${notes.length})`),
        h('button', { class: 'btn small', onclick: () => editNote() }, icon('plus', 16), `Nota en la página ${cur}`),
        h('ul', { class: 'list compact' }, notes.map(n => h('li', {}, h('a', { href: 'javascript:void(0)', onclick: () => goPage(n.page) }, h('strong', {}, `Página ${n.page}`), h('span', {}, n.text)),
          h('button', { class: 'icon-btn', 'aria-label': 'Editar nota', onclick: () => editNote(n) }, icon('pen', 16)))))),
      h('section', { class: 'doc-box' }, h('h3', {}, `Citas bíblicas (${refs.length})`),
        refs.length ? h('ul', { class: 'list compact' }, refs.slice(0, 150).map(([k, pp]) => h('li', { class: 'ref-row' }, h('a', { href: hrefFor(k) }, h('strong', {}, label(k))),
          h('span', { class: 'chips' }, pp.slice(0, 8).map(p => h('button', { class: 'chip small', onclick: () => goPage(p), 'aria-label': `Ir a la página ${p}` }, `p. ${p}`)))))) : h('p', { class: 'hint' }, 'No se detectaron citas con capítulo y versículo.'),
        h('p', { class: 'hint' }, 'Detectadas automáticamente en el texto; revise el contexto de cada una.')));
    if (q0) doSearch();
  };
  async function editNote(n) {
    const ta = h('textarea', { rows: 5, placeholder: 'Escriba su nota…' }, n ? n.text : '');
    const pIn = h('input', { type: 'number', min: 1, max: d.pageCount, value: n ? n.page : cur });
    const acts = [{ label: 'Cancelar', value: null }];
    if (n) acts.push({ label: 'Eliminar', danger: true, onClick: async () => { d.notes = d.notes.filter(x => x.id !== n.id); Object.assign(d, await saveDoc(d)); drawSide(); return true; } });
    acts.push({ label: 'Guardar', primary: true, onClick: async () => {
      const text = ta.value.trim(); if (!text) { toast('La nota está vacía'); return false; }
      const page = Math.min(Math.max(1, +pIn.value || 1), d.pageCount);
      if (n) Object.assign(n, { text, page, updatedAt: now() }); else (d.notes = d.notes || []).push({ id: uid(), text, page, createdAt: now(), updatedAt: now() });
      Object.assign(d, await saveDoc(d)); toast('Nota guardada'); drawSide(); return true; } });
    await modal({ title: n ? 'Editar nota' : 'Nueva nota', content: h('div', { class: 'form' }, h('label', {}, 'Página', pIn), ta), actions: acts });
  }

  const title = h('h1', {}, d.title);
  const modeBtn = d.kind === 'pdf' ? h('button', { class: 'btn small', onclick: () => { mode = mode === 'pdf' ? 'texto' : 'pdf'; modeBtn.textContent = mode === 'pdf' ? 'Ver como texto' : 'Ver el PDF'; drawPages(); } }, q0 ? 'Ver el PDF' : 'Ver como texto') : null;
  if (q0 && d.kind === 'pdf') mode = 'texto'; // con una búsqueda, el texto muestra las coincidencias resaltadas
  view.append(h('header', { class: 'page-head' }, h('div', {}, h('a', { class: 'back', href: '#/biblioteca' }, icon('left', 18), 'Biblioteca'), title, d.author ? h('p', { class: 'hint' }, d.author) : null)),
    h('div', { class: 'doc-bar' }, h('button', { class: 'icon-btn', 'aria-label': 'Página anterior', onclick: () => goPage(cur - 1) }, icon('left')),
      h('span', {}, 'Página ', pageIn, ` de ${d.pageCount}`), h('button', { class: 'icon-btn', 'aria-label': 'Página siguiente', onclick: () => goPage(cur + 1) }, icon('right')), modeBtn),
    h('div', { class: 'doc-layout' }, pagesBox, side));
  drawSide();
  await drawPages();
}
