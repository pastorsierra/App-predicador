// WordGen: tomado del Taller del Predicador (mismo formato de Word del Pastor). No modificar sin probar la exportación.
/* WordGen: convierte el Markdown de un sermón en un documento Word (docx) con dos estilos:
   "clasico"   = el formato de siempre del Pastor (marca de agua IPUC, borde, Times/Georgia, frases en rojo)
   "editorial" = estilo nuevo (encabezado con logo pequeño, títulos con numeral dorado, cita destacada, cajas de aplicación) */
(function (root) {
  function parse(md) {
    const lines = String(md).replace(/\r/g, '').split('\n');
    const out = []; let i = 0; let sawTitle = false; let pendingH2 = null;
    const push = (b) => out.push(b);
    for (; i < lines.length; i++) {
      const l = lines[i].trim(); let m;
      if (!l) continue;
      if (/^pastor antonio sierra j\.?$/i.test(l)) continue;
      if ((m = l.match(/^#\s+(.*)/)) && !sawTitle) { sawTitle = true; push({ t: 'title', s: m[1] }); let j = i + 1; while (j < lines.length && !lines[j].trim()) j++; const sm = (lines[j] || '').trim().match(/^\*([^*].*)\*$/); if (sm) { push({ t: 'subtitle', s: sm[1] }); i = j; } continue; }
      if ((m = l.match(/^#{1,2}\s+(.*)/))) { push({ t: 'h1', s: m[1] }); continue; }
      if ((m = l.match(/^#{3,6}\s+(.*)/))) { push({ t: 'h2', s: m[1] }); continue; }
      if ((m = l.match(/^>\s?(.*)/))) {
        const q = m[1]; let ref = '', text = q;
        const vv = q.match(/^\((NTV|NVI|DHH|TLA|PDT|LBLA|BLP|NBV)\)\s*(.*)$/);
        if (vv) { push({ t: 'quote', ref: '', ver: vv[1], s: vv[2].replace(/^«|»$/g, '') }); continue; }
        const d = q.match(/^(.+?)\s+[—–-]\s+(.*)$/);
        if (d && /\d/.test(d[1]) && d[1].length < 40) { ref = d[1].trim(); text = d[2].trim(); }
        push({ t: 'quote', ref, s: text.replace(/^«|»$/g, '') }); continue;
      }
      if ((m = l.match(/^[-*•]\s+(.*)/))) { push({ t: 'li', s: m[1] }); continue; }
      if ((m = l.match(/^\d+[.)]\s+(.*)/))) { push({ t: 'ol', s: m[1] }); continue; }
      if ((m = l.match(/^\*\*([^*]+)\*\*$/))) { push({ t: 'impact', s: m[1] }); continue; }
      if (/^(-{3,}|_{3,})$/.test(l)) continue;
      push({ t: 'p', s: l });
    }
    return out;
  }

  function build(docx, md, opts) {
    const D = docx; const o = Object.assign({ style: 'clasico', fecha: '', serie: '', culto: '', logo: null }, opts || {});
    const E = o.style === 'editorial'; const M = o.style === 'minimal';
    const C = M
      ? { navy: '1F1F1F', gold: '8A8A8A', green: '2F6B57', other: '7A5A00', ink: '222222', gray: '7A7A7A', soft: 'F5F5F5', warm: 'F7F3EA', hl: 'F3EBD3', body: 'Georgia', head: 'Georgia', serif: 'Georgia', bsize: 22 }
      : E
      ? { navy: '1B3A5C', gold: 'B8860B', green: '0F6B5C', ink: '24292F', gray: '6A7380', soft: 'EEF4FA', warm: 'FBF3DE', hl: 'FFF0B8', other: '7A5A00', body: 'Calibri', head: 'Calibri', serif: 'Georgia', bsize: 23 }
      : { navy: '1F4E78', gold: 'B8860B', green: '00695C', ink: '000000', gray: '6B6B6B', soft: 'EAF1F8', warm: 'FFF6E0', hl: 'FFF2B3', other: '7A5A00', red: '9C2B2B', body: 'Times New Roman', head: 'Arial', serif: 'Georgia', bsize: 22 };

    function runs(s, base) {
      base = Object.assign({ font: C.body, size: C.bsize, color: C.ink }, base || {});
      const out = []; const re = /(\*\*[^*]+\*\*|==[^=]+==|«[^»]+»(?:\s*\([^)]+\))?|\*[^*\s][^*]*\*)/g; let last = 0, m;
      while ((m = re.exec(s))) {
        if (m.index > last) out.push(new D.TextRun(Object.assign({ text: s.slice(last, m.index) }, base)));
        const t = m[0];
        if (t.startsWith('**')) out.push(new D.TextRun(Object.assign({}, base, { text: t.slice(2, -2), bold: true, color: E ? C.navy : C.navy })));
        else if (t.startsWith('==')) out.push(new D.TextRun(Object.assign({}, base, { text: t.slice(2, -2), shading: { type: D.ShadingType.CLEAR, fill: C.hl, color: 'auto' } })));
        else if (t.startsWith('«')) {
          const mm = t.match(/^«([^»]+)»(?:\s*\(([^)]+)\))?/);
          const qc = mm[2] && /\b(NTV|NVI|DHH|TLA|PDT|LBLA|BLP|NBV)\b/.test(mm[2]) ? C.other : C.green;
          out.push(new D.TextRun({ text: '“' + mm[1].trim() + '”', font: C.serif, italics: true, color: qc, size: base.size }));
          if (mm[2]) out.push(new D.TextRun({ text: ' (' + mm[2].trim() + ')', font: C.serif, color: qc, size: base.size - 3 }));
        } else out.push(new D.TextRun(Object.assign({}, base, { text: t.slice(1, -1), italics: true })));
        last = m.index + t.length;
      }
      if (last < s.length) out.push(new D.TextRun(Object.assign({ text: s.slice(last) }, base)));
      return out;
    }
    const sp = (b, a, line) => ({ before: b, after: a, line: line || (E ? 300 : 276) });
    const P = (s) => new D.Paragraph({ children: runs(s), spacing: sp(80, 100) });
    const LI = (s, ref) => new D.Paragraph({ children: runs(s), numbering: { reference: ref || 'vin', level: 0 }, spacing: sp(60, 60) });
    const kids = []; const add = (...x) => x.flat().forEach((y) => kids.push(y));
    const ROM = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\.\s+(.*)$/;
    const blocks = parse(md);
    let apoyoNext = false, inBox = false; let title = 'Sermón';

    for (let bi = 0; bi < blocks.length; bi++) {
      const b = blocks[bi];
      if (apoyoNext && (b.t === 'p' || b.t === 'li')) {
        add(new D.Paragraph({ children: runs(b.s, { italics: true, color: E || M ? C.gray : C.ink }), spacing: sp(40, 200) })); continue;
      }
      if (M) {
        const RL = { left: { style: D.BorderStyle.SINGLE, size: 4, color: 'C8C8C8', space: 12 } };
        if (b.t === 'title') { title = b.s; add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, font: C.serif, size: 30, bold: true, color: C.ink, characterSpacing: 20 })], spacing: { before: 0, after: 60 } })); continue; }
        if (b.t === 'subtitle') { add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, italics: true, color: C.gray, size: 21, font: C.serif })], spacing: { after: 160 } })); add(new D.Paragraph({ children: [], border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'D6D6D6', space: 1 } }, spacing: { after: 280 } })); continue; }
        if (b.t === 'h1') { apoyoNext = false; const m = b.s.match(ROM);
          add(new D.Paragraph({ keepNext: true, spacing: { before: 380, after: 120 }, children: m ? [new D.TextRun({ text: m[1] + '   ', font: C.serif, size: 22, color: C.gray }), new D.TextRun({ text: m[2], font: C.serif, size: 26, bold: true, color: C.ink })] : [new D.TextRun({ text: b.s, font: C.serif, size: 26, bold: true, color: C.ink })] })); continue; }
        if (b.t === 'h2') { if (/^vers[ií]culo clave$/i.test(b.s.trim())) continue; apoyoNext = /textos de apoyo/i.test(b.s);
          add(new D.Paragraph({ keepNext: true, spacing: { before: 260, after: 80 }, children: [new D.TextRun({ text: b.s, font: C.serif, size: 19, smallCaps: true, bold: true, color: C.gray, characterSpacing: 30 })] })); continue; }
        if (b.t === 'quote') { const col = b.ver ? C.other : C.green;
          add(new D.Paragraph({ indent: { left: 360, right: 360 }, border: RL, spacing: { before: 120, after: b.ref || b.ver ? 40 : 200, line: 300 }, children: runs(b.s, { font: C.serif, italics: true, color: col }) }));
          if (b.ref || b.ver) add(new D.Paragraph({ indent: { left: 360 }, spacing: { before: 0, after: 220 }, children: [new D.TextRun({ text: b.ver ? b.ver : b.ref + '  ·  RVR1960', font: C.serif, size: 18, smallCaps: true, color: C.gray, characterSpacing: 20 })] }));
          continue; }
        if (b.t === 'impact') { add(new D.Paragraph({ indent: { left: 360 }, spacing: { before: 200, after: 220, line: 300 }, children: [new D.TextRun({ text: b.s, font: C.serif, italics: true, size: 26, color: C.ink })] })); continue; }
        if (b.t === 'li' || b.t === 'ol') { add(LI(b.s, b.t === 'ol' ? 'num' : 'vin')); continue; }
        if (b.t === 'p') { add(P(b.s)); continue; }
        continue;
      }
      if (b.t !== 'li' && b.t !== 'ol') { if (inBox && b.t !== 'p') inBox = false; }
      if (b.t === 'title') {
        title = b.s;
        if (E) {
          if (o.serie) add(new D.Paragraph({ children: [new D.TextRun({ text: o.serie.toUpperCase(), font: C.head, size: 17, bold: true, color: C.gold, characterSpacing: 40 })], spacing: { before: 0, after: 80 } }));
          add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, font: C.serif, size: 36, bold: true, color: C.navy })], spacing: { before: 0, after: 80 } }));
          add(new D.Paragraph({ children: [], border: { bottom: { style: D.BorderStyle.SINGLE, size: 18, color: C.gold, space: 1 } }, indent: { right: 7600 }, spacing: { after: 140 } }));
        } else {
          add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, bold: true, color: C.navy, size: 34, font: C.body })], alignment: D.AlignmentType.CENTER, spacing: { after: 60 } }));
        }
        continue;
      }
      if (b.t === 'subtitle') {
        add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, italics: true, color: C.gray, size: E ? 25 : 22, font: E ? C.serif : C.body })], alignment: E ? D.AlignmentType.LEFT : D.AlignmentType.CENTER, spacing: { after: E ? 320 : 200 } }));
        continue;
      }
      if (b.t === 'h1') {
        apoyoNext = false; inBox = false;
        const m = b.s.match(ROM);
        if (E && m) {
          add(new D.Paragraph({ keepNext: true, spacing: { before: 380, after: 120 }, children: [
            new D.TextRun({ text: m[1] + '  ', font: C.serif, size: 40, bold: true, color: C.gold }),
            new D.TextRun({ text: m[2], font: C.head, size: 30, bold: true, color: C.navy })] }));
        } else if (E) {
          add(new D.Paragraph({ keepNext: true, spacing: { before: 340, after: 100 }, children: [new D.TextRun({ text: b.s.toUpperCase(), font: C.head, size: 21, bold: true, color: C.navy, characterSpacing: 30 })], border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'D5DCE4', space: 4 } } }));
        } else {
          add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, bold: true, color: C.navy, size: 30, font: C.head })], keepNext: true, keepLines: true, spacing: { before: 300, after: 120 } }));
        }
        continue;
      }
      if (b.t === 'h2' && /^vers[ií]culo clave$/i.test(b.s.trim())) continue;
      if (b.t === 'h2') {
        const low = b.s.toLowerCase();
        apoyoNext = /textos de apoyo/.test(low);
        const isApply = /para esta semana|aplicaci|para profundizar/.test(low);
        if (E && isApply) {
          inBox = true;
          add(new D.Paragraph({ keepNext: true, spacing: { before: 200, after: 0 }, shading: { type: D.ShadingType.CLEAR, fill: C.warm, color: 'auto' }, indent: { left: 120, right: 120 },
            border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: C.gold, space: 8 } },
            children: [new D.TextRun({ text: b.s.toUpperCase(), font: C.head, size: 18, bold: true, color: C.gold, characterSpacing: 30 })] }));
          continue;
        }
        add(new D.Paragraph({ keepNext: true, spacing: { before: E ? 240 : 200, after: 80 }, children: [new D.TextRun({ text: E ? b.s.toUpperCase() : b.s, bold: true, color: E ? C.gold : C.navy, size: E ? 18 : 24, font: C.head, characterSpacing: E ? 30 : 0 })] }));
        continue;
      }
      if (b.t === 'quote' && b.ver) {
        add(new D.Paragraph({ indent: { left: E ? 500 : 200, right: E ? 500 : 200 }, spacing: { before: 40, after: 160 }, shading: { type: D.ShadingType.CLEAR, fill: C.warm, color: 'auto' },
          border: { left: { style: D.BorderStyle.SINGLE, size: 18, space: 8, color: C.gold } },
          children: [new D.TextRun({ text: '(' + b.ver + ')  ', bold: true, italics: true, color: C.other, size: 20, font: C.serif })].concat(runs(b.s, { font: C.serif, italics: true, color: C.other })) }));
        continue;
      }
      if (b.t === 'quote') {
        if (E) {
          add(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 160, after: b.ref ? 40 : 200, line: 320 }, indent: { left: 500, right: 500 },
            border: { top: { style: D.BorderStyle.SINGLE, size: 6, color: C.gold, space: 10 }, bottom: b.ref ? undefined : { style: D.BorderStyle.SINGLE, size: 6, color: C.gold, space: 10 } },
            children: runs('“' + b.s.replace(/^“|”$/g, '') + '”', { font: C.serif, italics: true, size: 25, color: C.green }) }));
          if (b.ref) add(new D.Paragraph({ alignment: D.AlignmentType.CENTER, indent: { left: 500, right: 500 }, spacing: { before: 0, after: 220 },
            border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: C.gold, space: 10 } },
            children: [new D.TextRun({ text: b.ref.toUpperCase() + '  ·  RVR1960', font: C.head, size: 17, bold: true, color: C.gold, characterSpacing: 30 })] }));
        } else {
          if (b.ref) add(new D.Paragraph({ children: [new D.TextRun({ text: b.ref, bold: true, color: C.navy, size: 21, font: C.head })], keepNext: true, spacing: { before: 140, after: 40 } }));
          add(new D.Paragraph({ indent: { left: 200, right: 200 }, spacing: { before: 60, after: 60 }, shading: { type: D.ShadingType.CLEAR, fill: C.soft, color: 'auto' },
            border: { left: { style: D.BorderStyle.SINGLE, size: 18, space: 8, color: C.navy } },
            children: [new D.TextRun({ text: '(RVR1960)  ', bold: true, italics: true, color: C.navy, size: 20, font: C.serif })].concat(runs(b.s, { font: C.serif, italics: true, color: C.navy })) }));
        }
        continue;
      }
      if (b.t === 'impact') {
        if (E) add(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 200, after: 220, line: 300 }, indent: { left: 700, right: 700 },
          children: [new D.TextRun({ text: b.s, font: C.serif, italics: true, bold: true, size: 26, color: C.navy })] }));
        else add(new D.Paragraph({ children: [new D.TextRun({ text: b.s, bold: true, italics: true, color: C.red, size: 23, font: C.body })], indent: { left: 200 }, spacing: { before: 140, after: 160 } }));
        continue;
      }
      if (b.t === 'li' || b.t === 'ol') {
        if (E && inBox) add(new D.Paragraph({ children: runs(b.s), shading: { type: D.ShadingType.CLEAR, fill: C.warm, color: 'auto' }, indent: { left: 120, right: 120 },
          border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: C.gold, space: 8 } }, spacing: { before: 0, after: 0, line: 300 } }));
        else add(LI(b.s, b.t === 'ol' ? 'num' : 'vin'));
        continue;
      }
      if (b.t === 'p') {
        if (E && inBox) add(new D.Paragraph({ children: runs(b.s), shading: { type: D.ShadingType.CLEAR, fill: C.warm, color: 'auto' }, indent: { left: 120, right: 120 },
          border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: C.gold, space: 8 } }, spacing: { before: 0, after: 0, line: 300 } }));
        else add(P(b.s));
        continue;
      }
    }
    add(new D.Paragraph({ alignment: D.AlignmentType.RIGHT, spacing: { before: 300 }, children: [new D.TextRun({ text: 'Pastor Antonio Sierra J.', bold: !M, italics: true, color: M ? C.gray : C.navy, size: M ? 21 : 24, font: E || M ? C.serif : C.body })] }));

    const numbering = { config: [
      { reference: 'vin', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: M ? '–' : E ? '▸' : '•', alignment: D.AlignmentType.LEFT, style: { run: E || M ? { color: C.gold } : {}, paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'num', levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { run: { color: E ? C.gold : C.navy, bold: true }, paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ] };

    let headers, footers, page;
    if (M) {
      footers = { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [
        new D.TextRun({ text: 'Pastor Antonio Sierra J.' + (o.fecha ? '  ·  ' + o.fecha : '') + '  ·  ', font: C.serif, size: 16, color: C.gray }),
        new D.TextRun({ children: [D.PageNumber.CURRENT], font: C.serif, size: 16, color: C.gray })] })] }) };
      page = { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1300, left: 1500, right: 1500, footer: 600 } };
    } else if (E) {
      const hk = [];
      if (o.logo) hk.push(new D.ImageRun({ type: 'png', data: o.logo, transformation: { width: 34, height: 24 } }));
      hk.push(new D.TextRun({ text: (o.logo ? '   ' : '') + 'IGLESIA PENTECOSTAL UNIDA DE COLOMBIA', font: C.head, size: 15, bold: true, color: C.navy, characterSpacing: 30 }));
      hk.push(new D.TextRun({ text: '\t' + (o.fecha || ''), font: C.head, size: 15, color: C.gray }));
      headers = { default: new D.Header({ children: [new D.Paragraph({ children: hk, tabStops: [{ type: D.TabStopType.RIGHT, position: 9600 }], border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: C.gold, space: 6 } } })] }) };
      footers = { default: new D.Footer({ children: [new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: 9600 }], children: [
        new D.TextRun({ text: 'Pastor Antonio Sierra J.' + (o.fecha ? '  ·  ' + o.fecha : ''), font: C.head, size: 16, color: C.gray }),
        new D.TextRun({ children: ['\t', D.PageNumber.CURRENT], font: C.head, size: 16, color: C.gold, bold: true })] })] }) };
      page = { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1100, left: 1320, right: 1320, header: 560, footer: 520 } };
    } else {
      headers = o.logo ? { default: new D.Header({ children: [new D.Paragraph({ children: [new D.ImageRun({ type: 'png', data: o.logo, transformation: { width: 460, height: 320 },
        floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, align: D.HorizontalPositionAlign.CENTER }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, align: D.VerticalPositionAlign.CENTER }, wrap: { type: D.TextWrappingType.NONE }, behindDocument: true } })] })] }) } : undefined;
      footers = { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 60 }, border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'D9D9D9', space: 6 } },
        children: [new D.TextRun({ text: 'Pastor Antonio Sierra J.' + (o.fecha ? '  ·  ' + o.fecha : '') + '  ·  Página ', italics: true, color: '8A8A8A', size: 18 }), new D.TextRun({ children: [D.PageNumber.CURRENT], italics: true, color: '8A8A8A', size: 18 })] })] }) };
      page = { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 },
        borders: ['pageBorderTop', 'pageBorderBottom', 'pageBorderLeft', 'pageBorderRight'].reduce((acc, k) => (acc[k] = { style: D.BorderStyle.SINGLE, size: 4, color: 'D9D9D9', space: 24 }, acc), {}) };
    }
    return new D.Document({ creator: 'Pastor Antonio Sierra J.', title, styles: { default: { document: { run: { font: C.body, size: C.bsize } } } }, numbering,
      sections: [{ properties: { page }, headers, footers, children: kids }] });
  }
  const api = { parse, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WordGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
export const WordGen = (typeof window !== 'undefined' ? window : globalThis).WordGen;
