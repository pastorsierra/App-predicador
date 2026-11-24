// Taller del predicador (diseño propio): lista de bosquejos, editor, conversión a enseñanza y diapositivas.
import { h, clear, icon, toast, confirmDialog, fmtDate } from '../ui.js';
import { norm } from '../books.js';
import { label } from '../ref.js';
import { verLabel } from '../bible.js';
import { S } from '../state.js';
import { TIPOS, ROM, TEMPLATES, newOutline, newPoint, listOutlines, getOutline, saveOutline, deleteOutline, duplicateOutline, refText, parseKey, outlineToMarkdown, outlineToSlides } from '../outlines.js';
import { saveSermon, getSermon } from '../taller/store.js';

export async function tabBosquejos(body) {
  const list = await listOutlines();
  const tpls = list.filter(o => o.plantilla);
  const tsel = h('select', { 'aria-label': 'Plantilla' }, Object.entries(TEMPLATES).map(([k, t]) => h('option', { value: k }, t.name)), tpls.map(o => h('option', { value: `o:${o.id}` }, `Mi plantilla: ${o.title}`)));
  const q = h('input', { type: 'search', placeholder: 'Buscar bosquejos', 'aria-label': 'Buscar bosquejos' });
  const ul = h('ul', { class: 'list' });
  const draw = () => {
    const t = norm(q.value.trim()); clear(ul);
    const shown = list.filter(o => !t || norm(`${o.title} ${o.base} ${o.tema} ${o.serie} ${(o.tags || []).join(' ')} ${o.points.map(p => p.title).join(' ')}`).includes(t));
    shown.forEach(o => ul.append(h('li', {}, h('a', { href: `#/bosquejo/${o.id}` }, h('strong', {}, o.title || 'Sin título'),
      h('span', {}, [o.tipo, o.base, `${o.points.length} puntos`, o.serie ? `Serie: ${o.serie}` : '', o.plantilla ? 'plantilla' : '', fmtDate(o.updatedAt)].filter(Boolean).join(' · '))))));
    if (!shown.length) ul.append(h('li', { class: 'empty' }, list.length ? 'Ningún bosquejo coincide.' : 'Aún no hay bosquejos. Cree el primero con una plantilla.'));
  };
  q.addEventListener('input', draw);
  body.append(h('form', { class: 'new-study', onsubmit: async (e) => {
    e.preventDefault();
    let o;
    if (tsel.value.startsWith('o:')) { o = await duplicateOutline(await getOutline(tsel.value.slice(2))); o.plantilla = false; o.title = ''; await saveOutline(o); }
    else { o = newOutline(tsel.value); if (TEMPLATES[tsel.value].expositivo) o.expositivo = true; await saveOutline(o); }
    location.hash = `#/bosquejo/${o.id}`;
  } }, tsel, h('button', { class: 'btn primary', type: 'submit' }, icon('plus', 18), 'Nuevo bosquejo')),
  list.length ? h('div', { class: 'toolbar' }, q) : null, ul);
  draw();
}

export async function renderBosquejo(view, id) {
  const o = await getOutline(id);
  if (!o) { view.append(h('div', { class: 'empty' }, 'Bosquejo no encontrado. ', h('a', { href: '#/ensenanzas/bosquejos' }, 'Volver'))); return; }
  const ver = S.version || 'rv1909';
  const status = h('span', { class: 'save-state' }, 'Guardado'); let timer;
  const save = () => { status.textContent = 'Guardando…'; status.className = 'save-state busy'; clearTimeout(timer); timer = setTimeout(flush, 500); };
  const flush = async () => { clearTimeout(timer); timer = null; try { const r = await saveOutline(o); o.updatedAt = r.updatedAt; status.textContent = 'Guardado'; status.className = 'save-state'; } catch (e) { status.textContent = 'Error al guardar'; status.className = 'save-state err'; } };
  const onLeave = () => { if (timer) flush(); window.removeEventListener('hashchange', onLeave); };
  window.addEventListener('hashchange', onLeave);

  const field = (k, ph, type = 'text') => h('input', { type, value: o[k] ?? '', placeholder: ph, 'aria-label': ph, oninput: (e) => { o[k] = type === 'number' ? +e.target.value : e.target.value; save(); if (k === 'base') drawBase(); } });
  const area = (k, ph, rows = 4) => { const t = h('textarea', { rows, placeholder: ph, 'aria-label': ph, oninput: (e) => { o[k] = e.target.value; save(); } }); t.value = o[k] || ''; return t; };
  const tipo = h('select', { 'aria-label': 'Tipo de mensaje', onchange: (e) => { o.tipo = e.target.value; save(); } }, TIPOS.map(t => h('option', { value: t, selected: o.tipo === t }, t)));
  const baseBox = h('p', { class: 'bible base-text' });
  const drawBase = async () => { const k = parseKey(o.base); if (!k) { baseBox.textContent = o.base ? 'Escriba una referencia válida (ej.: Hechos 2:38).' : ''; return; } const vs = await refText(ver, k); clear(baseBox).append(vs.map(x => [h('sup', {}, x.v), x.t, ' ']), h('small', { class: 'hint' }, ` (${verLabel(ver)})`)); };

  const pointsBox = h('div', { class: 'points' });
  const drawPoints = () => {
    clear(pointsBox);
    o.points.forEach((p, i) => pointsBox.append(pointCard(p, i)));
    pointsBox.append(h('button', { class: 'btn', onclick: () => { o.points.push(newPoint()); save(); drawPoints(); } }, icon('plus', 18), 'Añadir punto'));
  };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= o.points.length) return; [o.points[i], o.points[j]] = [o.points[j], o.points[i]]; save(); drawPoints(); };
  function pointCard(p, i) {
    const subsBox = h('div', { class: 'subs' });
    const drawSubs = () => {
      clear(subsBox);
      p.subs.forEach((s, j) => subsBox.append(h('div', { class: 'sub-row' }, h('span', { class: 'sub-n' }, `${j + 1}.`),
        h('input', { type: 'text', value: s, placeholder: 'Subpunto', 'aria-label': `Subpunto ${j + 1}`, oninput: (e) => { p.subs[j] = e.target.value; save(); } }),
        h('button', { class: 'icon-btn small', 'aria-label': 'Quitar subpunto', onclick: () => { p.subs.splice(j, 1); save(); drawSubs(); } }, icon('close', 16)))));
      subsBox.append(h('button', { class: 'btn small ghost', onclick: () => { p.subs.push(''); save(); drawSubs(); subsBox.querySelector('.sub-row:last-of-type input')?.focus(); } }, icon('plus', 16), 'Subpunto'));
    };
    const refsBox = h('ul', { class: 'ref-list' });
    const drawRefs = () => {
      clear(refsBox);
      p.refs.forEach((k, j) => { const li = h('li', {}, h('div', { class: 'doc-ref-head' }, h('strong', {}, label(k)), h('button', { class: 'icon-btn small', 'aria-label': `Quitar ${label(k)}`, onclick: () => { p.refs.splice(j, 1); save(); drawRefs(); } }, icon('close', 16))), h('span', { class: 'ref-preview' }, '…')); refsBox.append(li); refText(ver, k).then(vs => { li.querySelector('.ref-preview').textContent = vs.map(x => `${x.v} ${x.t}`).join(' '); }); });
    };
    const refIn = h('input', { type: 'text', placeholder: 'Añadir cita (ej.: Ro 6:4)', 'aria-label': 'Añadir cita' });
    const t = (k, ph, rows = 3) => { const a = h('textarea', { rows, placeholder: ph, 'aria-label': ph, oninput: (e) => { p[k] = e.target.value; save(); } }); a.value = p[k] || ''; return a; };
    drawSubs(); drawRefs();
    return h('section', { class: 'sec point' },
      h('header', {}, h('h2', {}, h('span', { class: 'sec-n' }, ROM[i] || i + 1), h('input', { class: 'point-title', type: 'text', value: p.title, placeholder: 'Título del punto', 'aria-label': `Título del punto ${i + 1}`, oninput: (e) => { p.title = e.target.value; save(); } })),
        h('span', { class: 'point-actions' },
          h('button', { class: 'icon-btn small', 'aria-label': 'Subir punto', disabled: i === 0, onclick: () => move(i, -1) }, icon('left', 16)),
          h('button', { class: 'icon-btn small', 'aria-label': 'Bajar punto', disabled: i === o.points.length - 1, onclick: () => move(i, 1) }, icon('right', 16)),
          h('button', { class: 'icon-btn small', 'aria-label': 'Eliminar punto', onclick: async () => { if (await confirmDialog('Eliminar punto', `¿Eliminar el punto ${ROM[i] || i + 1}?`)) { o.points.splice(i, 1); save(); drawPoints(); } } }, icon('trash', 16)))),
      t('text', 'Desarrollo del punto', 4), subsBox,
      h('h4', {}, 'Citas bíblicas'), refsBox,
      h('form', { class: 'new-study', onsubmit: (e) => { e.preventDefault(); const k = parseKey(refIn.value); if (!k) { toast('Escriba una referencia válida, ej.: Romanos 6:4'); return; } p.refs.push(k); refIn.value = ''; save(); drawRefs(); } }, refIn, h('button', { class: 'btn small', type: 'submit' }, 'Añadir')),
      t('example', 'Ejemplo o personaje bíblico que lo ilustra', 3), t('phrase', 'Frase de impacto (opcional)', 1));
  }

  const frasesBox = h('div', {});
  const drawFrases = () => { clear(frasesBox); (o.frases || []).forEach((f, j) => frasesBox.append(h('div', { class: 'sub-row' }, h('input', { type: 'text', value: f, placeholder: 'Frase central', 'aria-label': `Frase ${j + 1}`, oninput: (e) => { o.frases[j] = e.target.value; save(); } }), h('button', { class: 'icon-btn small', 'aria-label': 'Quitar frase', onclick: () => { o.frases.splice(j, 1); save(); drawFrases(); } }, icon('close', 16))))); frasesBox.append(h('button', { class: 'btn small ghost', onclick: () => { o.frases = o.frases || []; o.frases.push(''); save(); drawFrases(); } }, icon('plus', 16), 'Frase')); };

  const toEnsenanza = async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    await flush();
    const md = await outlineToMarkdown(o, ver, verLabel(ver));
    const prev = o.sermonId ? await getSermon(o.sermonId) : null;
    const rec = await saveSermon({ ...(prev || { id: 'b' + Date.now().toString(36), categoria: '', culto: 'dominical', estado: 'prep', notas: '', materiales: [] }),
      titulo: o.title || 'Sin título', texto: o.base || '', fecha: o.fecha || prev?.fecha || '', enserie: !!o.serie, serie: o.serie || '', ensenanza: md, desdeBosquejo: o.id });
    o.sermonId = rec.id; await flush(); btn.disabled = false;
    toast(prev ? 'Enseñanza actualizada desde el bosquejo' : 'Enseñanza creada: ya puede descargarla en Word');
    location.hash = `#/ensenanza/${encodeURIComponent(rec.id)}`;
  };

  const plantilla = h('input', { type: 'checkbox', checked: !!o.plantilla, onchange: (e) => { o.plantilla = e.target.checked; save(); } });
  view.append(
    h('header', { class: 'study-head' }, h('a', { class: 'back', href: '#/ensenanzas/bosquejos' }, icon('left', 18), 'Bosquejos'),
      h('input', { class: 'study-title', value: o.title, placeholder: 'Título del mensaje', 'aria-label': 'Título del mensaje', oninput: (e) => { o.title = e.target.value; save(); } }),
      h('div', { class: 'study-meta' }, tipo, status),
      h('div', { class: 'study-tools' },
        h('button', { class: 'btn small primary', onclick: toEnsenanza }, icon('note', 16), o.sermonId ? 'Actualizar enseñanza (Word)' : 'Crear enseñanza (Word)'),
        h('a', { class: 'btn small', href: `#/diapositivas/${o.id}` }, icon('layers', 16), 'Diapositivas'),
        h('button', { class: 'btn small ghost', onclick: async () => { await flush(); const c = await duplicateOutline(o); toast('Bosquejo duplicado'); location.hash = `#/bosquejo/${c.id}`; } }, icon('copy', 16), 'Duplicar'),
        h('button', { class: 'btn small ghost danger', onclick: async () => { if (await confirmDialog('Eliminar bosquejo', `¿Eliminar «${o.title || 'Sin título'}»? La enseñanza creada a partir de él no se borra.`)) { clearTimeout(timer); timer = null; await deleteOutline(o.id); location.hash = '#/ensenanzas/bosquejos'; } } }, icon('trash', 16), 'Eliminar'))),
    h('div', { class: 'study-sections bosq' },
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Datos del mensaje')),
        h('div', { class: 'form' },
          h('div', { class: 'form-row' }, field('base', 'Texto base (ej.: Hechos 2:38)'), field('tema', 'Tema')),
          baseBox,
          h('div', { class: 'form-row' }, field('audiencia', 'Audiencia (ej.: toda la iglesia, jóvenes, damas)'), field('serie', 'Serie (opcional)')),
          h('div', { class: 'form-row' }, h('label', { class: 'inline' }, 'Fecha ', field('fecha', 'Fecha', 'date')), field('lugar', 'Lugar de predicación'), h('label', { class: 'inline' }, 'Minutos ', field('duracion', 'Duración aproximada (minutos)', 'number'))),
          h('label', { class: 'inline' }, plantilla, ' Usar este bosquejo como plantilla para otros'))),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Introducción')), area('intro', 'Introducción', 5)),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Contexto')), area('contexto', 'Contexto del pasaje (opcional)', 3)),
      pointsBox,
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Conclusión')), area('conclusion', 'Conclusión corta y firme', 4)),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Frases centrales')), frasesBox),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Llamado (opcional)')), area('llamado', 'Llamado', 3)),
      h('section', { class: 'sec' }, h('header', {}, h('h2', {}, 'Notas del predicador')), h('p', { class: 'hint' }, 'Solo para usted: no pasan a la enseñanza ni a las diapositivas.'), area('notas', 'Notas', 3))));
  drawBase(); drawPoints(); drawFrases();
}

// ---------- Diapositivas ----------
export async function renderDiapositivas(view, id) {
  const o = await getOutline(id);
  if (!o) { view.append(h('div', { class: 'empty' }, 'Bosquejo no encontrado.')); return; }
  const slides = await outlineToSlides(o, S.version || 'rv1909');
  let i = 0, theme = 'azul';
  const stage = h('div', { class: `slides theme-${theme}`, tabindex: '0' });
  const counter = h('span', { class: 'slide-count' });
  const render = (s) => {
    if (s.k === 'title') return h('div', { class: 'slide s-title' }, h('h1', {}, s.t), s.s ? h('p', {}, s.s) : null, h('p', { class: 'slide-sig' }, 'Pastor Antonio Sierra J.'));
    if (s.k === 'verse') return h('div', { class: 'slide s-verse' }, h('blockquote', {}, s.t), h('p', { class: 'slide-ref' }, s.ref));
    if (s.k === 'point') return h('div', { class: 'slide s-point' }, s.n ? h('span', { class: 'slide-n' }, s.n) : null, h('h2', {}, s.t), s.items.length ? h('ul', {}, s.items.map(x => h('li', {}, x))) : null);
    return h('div', { class: 'slide s-phrase' }, h('p', {}, s.t));
  };
  const show = () => { clear(stage).append(render(slides[i])); counter.textContent = `${i + 1} / ${slides.length}`; };
  const go = (d) => { i = Math.max(0, Math.min(slides.length - 1, i + d)); show(); };
  stage.addEventListener('keydown', (e) => { if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); } if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); } });
  let sx = null; stage.addEventListener('pointerdown', (e) => { sx = e.clientX; }); stage.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); else go(e.clientX > stage.clientWidth / 2 ? 1 : -1); });
  const themeSel = h('div', { class: 'seg' }, [['azul', 'Azul'], ['claro', 'Claro'], ['negro', 'Negro']].map(([k, n]) => h('button', { class: k === theme ? 'on' : '', onclick: (e) => { theme = k; stage.className = `slides theme-${k}`; themeSel.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } }, n)));
  const printAll = h('div', { class: 'slides-print' }, slides.map(s => h('div', { class: 'slides theme-claro print-page' }, render(s))));
  view.append(h('header', { class: 'slides-bar' }, h('a', { class: 'back', href: `#/bosquejo/${o.id}` }, icon('left', 18), 'Bosquejo'), h('strong', {}, o.title || 'Sin título'),
    h('span', { class: 'spacer' }), themeSel,
    h('button', { class: 'btn small', onclick: () => stage.requestFullscreen?.().catch(() => {}) }, 'Pantalla completa'),
    h('button', { class: 'btn small', onclick: () => window.print() }, icon('print', 16), 'PDF')),
    stage, h('div', { class: 'slides-nav' }, h('button', { class: 'btn', 'aria-label': 'Anterior', onclick: () => go(-1) }, icon('left', 18)), counter, h('button', { class: 'btn', 'aria-label': 'Siguiente', onclick: () => go(1) }, icon('right', 18))), printAll);
  show(); stage.focus();
}
