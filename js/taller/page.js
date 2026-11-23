// Vista de página de las enseñanzas con el mismo diseño que el Word del Taller del Predicador
// (estilos: clásico, nuevo/editorial, minimalista). Funciones portadas del Taller para conservar el formato.
import { WordGen } from './wordgen.js';

export const STYLES = { clasico: 'Clásico', editorial: 'Nuevo', minimal: 'Minimalista' };
export const ESTADOS = { idea: 'Idea', prep: 'En preparación', listo: 'Listo', predicado: 'Predicado' };
export const CULTOS = { dominical: 'Dominical', semana: 'Entre semana', especial: 'Especial / campaña', oracion: 'Oración y adoración' };
export const DUR = { '🔴': 'Larga', '🟠': 'Mediana', '🟡': 'Corta', '🟢': 'Breve', '🔵': 'Muy breve' };
// Categorías del Taller (código, nombre). El ícono emoji del Taller no se usa en la interfaz.
export const CATS = [['01', 'Oración y Adoración'], ['02', 'Evangelísticas'], ['03', 'Doctrinales'], ['04', 'El Tabernáculo y el Arca'], ['05', 'El Arca'], ['06', 'Profecía y Escatología'], ['07', 'Fechas y Ocasiones Especiales'], ['08', 'Renovación'], ['09', 'Personajes Bíblicos'], ['10', 'Vida Cristiana'], ['11', 'Servicio y Ministerio'], ['12', 'Fe en la Prueba'], ['13', 'Dinámicas'], ['14', 'Enseñanzas Especiales'], ['15', 'Talleres y Dinámicas'], ['16', 'Estudios Bíblicos'], ['17', 'Mensajes Breves'], ['18', 'Avivamiento, Milagros y Campañas'], ['19', 'Mayordomía'], ['20', 'Enseñanzas para la Familia'], ['21', 'Las Dispensaciones'], ['22', 'La Pasión y la Gloria de Cristo'], ['23', 'Mensajes para el Púlpito'], ['24', 'Series para predicar'], ['25', 'El Pastor y el Rebaño'], ['26', 'Predicando las Cartas'], ['27', 'Las Parábolas de Jesús'], ['28', 'Obediencia y Carácter']];
export const catName = (c) => (CATS.find(x => x[0] === c) || [, ''])[1];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fechaHoy(d = new Date()) {
  try { return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d.toISOString().slice(0, 10); }
}

function pgInline(s) {
  const re = /(\*\*[^*]+\*\*|==[^=]+==|«[^»]+»(?:\s*\([^)]+\))?|\*[^*\s][^*]*\*)/g; let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += esc(s.slice(last, m.index)); const t = m[0];
    if (t.startsWith('**')) out += `<b class="pb">${esc(t.slice(2, -2))}</b>`;
    else if (t.startsWith('==')) out += `<span class="phl">${esc(t.slice(2, -2))}</span>`;
    else if (t.startsWith('«')) {
      const mm = t.match(/^«([^»]+)»(?:\s*\(([^)]+)\))?/); const ov = mm[2] && /\b(NTV|NVI|DHH|TLA|PDT|LBLA|BLP|NBV)\b/.test(mm[2]);
      out += `<span class="${ov ? 'pov' : 'pq'}">“${esc(mm[1].trim())}”${mm[2] ? ` <small>(${esc(mm[2].trim())})</small>` : ''}</span>`;
    } else out += `<i>${esc(t.slice(1, -1))}</i>`;
    last = m.index + t.length;
  }
  return out + esc(s.slice(last));
}

// Devuelve HTML seguro (todo el texto pasa por esc) con el diseño de página elegido.
export function pageHTML(mdText, st, logoB64, fecha) {
  const E = st === 'editorial', M = st === 'minimal', K = !E && !M;
  const ROM = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s+(.*)$/;
  const blocks = WordGen.parse(mdText || ''); let h = '', apoyo = false, box = false, list = null;
  const closeList = () => { if (list) { h += `</${list}>`; list = null; } };
  const closeBox = () => { if (box) { closeList(); h += '</div>'; box = false; } };
  const I = pgInline;
  for (const b of blocks) {
    if (b.t !== 'li' && b.t !== 'ol') closeList();
    if (apoyo && (b.t === 'p' || b.t === 'li')) { h += `<p class="papoyo">${I(b.s)}</p>`; continue; }
    if (box && b.t !== 'p' && b.t !== 'li' && b.t !== 'ol') closeBox();
    if (b.t === 'title') { h += `<h1 class="pt">${esc(b.s)}</h1>${E ? '<div class="prule"></div>' : ''}`; continue; }
    if (b.t === 'subtitle') { h += `<p class="psub">${I(b.s)}</p>${M ? '<hr class="phr">' : ''}`; continue; }
    if (b.t === 'h1') { apoyo = false; const m = b.s.match(ROM); h += (E || M) && m ? `<h2 class="ph1"><span class="pnum">${m[1]}</span>${esc(m[2])}</h2>` : `<h2 class="ph1">${esc(b.s)}</h2>`; continue; }
    if (b.t === 'h2') {
      if (/^vers[ií]culo clave$/i.test(b.s.trim())) continue; apoyo = /textos de apoyo/i.test(b.s);
      if (E && /para esta semana|aplicaci|para profundizar/i.test(b.s)) { h += `<div class="pbox"><p class="pboxh">${esc(b.s)}</p>`; box = true; continue; }
      h += `<h3 class="ph2">${esc(b.s)}</h3>`; continue;
    }
    if (b.t === 'quote') {
      if (b.ver) { h += (K || E) ? `<div class="pqv"><b>(${esc(b.ver)})</b> ${I(b.s)}</div>` : `<blockquote class="pqb pqbv">${I(b.s)}</blockquote><p class="pqref">${esc(b.ver)}</p>`; continue; }
      if (K) h += `${b.ref ? `<p class="pqr">${esc(b.ref)}</p>` : ''}<div class="pqk"><b>(RVR1960)</b> ${I(b.s)}</div>`;
      else if (E) h += `<div class="pqe"><p>“${I(b.s.replace(/^“|”$/g, ''))}”</p>${b.ref ? `<p class="pqref">${esc(b.ref.toUpperCase())} · RVR1960</p>` : ''}</div>`;
      else h += `<blockquote class="pqb">${I(b.s)}</blockquote>${b.ref ? `<p class="pqref">${esc(b.ref)} · RVR1960</p>` : ''}`;
      continue;
    }
    if (b.t === 'impact') { h += `<p class="pimp">${esc(b.s)}</p>`; continue; }
    if (b.t === 'li' || b.t === 'ol') { const tag = b.t === 'ol' ? 'ol' : 'ul'; if (list !== tag) { closeList(); h += `<${tag}>`; list = tag; } h += `<li>${I(b.s)}</li>`; continue; }
    if (b.t === 'p') { h += `<p>${I(b.s)}</p>`; continue; }
  }
  closeList(); closeBox();
  const f = esc(fecha || fechaHoy());
  const logo = logoB64 ? `data:image/png;base64,${logoB64}` : '';
  const head = E ? `<div class="phead"><span>${logo ? `<img src="${logo}" alt="">` : ''}IGLESIA PENTECOSTAL UNIDA DE COLOMBIA</span><span>${f}</span></div>` : '';
  const foot = K ? `<div class="pfoot">Pastor Antonio Sierra J. · ${f}</div>` : E ? `<div class="pfoot"><span>Pastor Antonio Sierra J. · ${f}</span></div>` : `<div class="pfoot">Pastor Antonio Sierra J. · ${f}</div>`;
  const wm = K && logo ? `<img class="pwm" src="${logo}" alt="">` : '';
  return `<div class="pgwrap"><div class="pg pg-${st}">${head}${wm}<div class="pgbody">${h}<p class="psig">Pastor Antonio Sierra J.</p></div>${foot}</div></div>`;
}

// Elementos del archivo cifrado → Markdown (misma conversión que el Taller)
export function libToMd(it) {
  if (it.md) return it.md;
  const L = [`# ${it.T || it.t}`]; let i = 0; const P = it.p || [];
  if (P[0] && P[0][0] === 'p' && P[0][1] === it.S) { L.push(`*${it.S}*`); i = 1; }
  let lastLi = false;
  for (; i < P.length; i++) {
    const [k, t] = P[i];
    if (k !== 'li' && lastLi) { L.push(''); lastLi = false; }
    if (k === 'h' && /^vers[ií]culo clave$/i.test(t.replace(/:$/, ''))) continue;
    if (k === 'ref') { const nx = P[i + 1]; if (nx && nx[0] === 'q') { L.push(`> ${t} — ${nx[1].replace(/^\((RVR1960|NTV|NVI)\)\s*/, '')}`); i++; } else L.push(`> ${t}`); L.push(''); continue; }
    if (k === 'q') { L.push(`> ${t}`, ''); continue; }
    if (k === 'h') { L.push(`## ${t.replace(/:$/, '')}`); continue; }
    if (k === 'li') { L.push(`- ${t}`); lastLi = true; continue; }
    if (k === 'i') { L.push('', `**${t.replace(/\*/g, '')}**`, ''); continue; }
    L.push(t, '');
  }
  return L.join('\n');
}

export function mdToPlain(md) {
  return String(md || '').replace(/^#+\s*/gm, '').replace(/==|\*\*/g, '').replace(/^> /gm, '');
}
