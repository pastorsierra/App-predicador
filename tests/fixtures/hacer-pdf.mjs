// Crea un PDF de prueba de 3 páginas con texto y citas bíblicas (contenido ficticio). Uso: node tests/fixtures/hacer-pdf.mjs SALIDA.pdf
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require('/opt/npm-tools/node_modules/pdf-lib');
const doc = await PDFDocument.create();
doc.setTitle('Apuntes de prueba sobre el bautismo'); doc.setAuthor('Autor de prueba');
const font = await doc.embedFont(StandardFonts.TimesRoman);
const pages = [
  ['Capitulo uno: el mensaje de Pedro', 'En Hch 2:38 Pedro llama al arrepentimiento.', 'Vease tambien Juan 3:5 y Romanos 6:3-4.', 'Palabraclave aparece en esta pagina.'],
  ['Capitulo dos', 'Texto sin citas biblicas en esta pagina.', 'Esta 3:1 no es una cita valida.', 'Juan 99:1 tampoco existe.'],
  ['Capitulo tres', 'Segunda mencion de Hch 2:38 en otra pagina.', 'Y la palabraclave otra vez.', 'Mateo 28:19 cierra el capitulo.'],
];
for (const lines of pages) { const p = doc.addPage([420, 595]); lines.forEach((t, i) => p.drawText(t, { x: 40, y: 540 - i * 28, size: 14, font })); }
fs.writeFileSync(process.argv[2], await doc.save());
console.log('PDF de prueba creado');
