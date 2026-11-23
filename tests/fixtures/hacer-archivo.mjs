// Crea un archivo cifrado de PRUEBA con el mismo formato del Taller (TPE1 + gzip + AES-GCM, clave PBKDF2).
// Uso: node tests/fixtures/hacer-archivo.mjs CARPETA_DESTINO
// Contenido ficticio de prueba; clave de prueba: "clave de prueba".
import { webcrypto as crypto } from 'crypto';
import zlib from 'zlib'; import fs from 'fs'; import path from 'path';
const SALT = Buffer.from('e6ad908c3b7d35e42e54362bea50eada', 'hex');
const out = process.argv[2];
async function key(pass) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim().toLowerCase()), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: SALT, iterations: 310000, hash: 'SHA-256' }, k, 256);
}
async function enc(obj, raw) {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, gz));
  return Buffer.concat([Buffer.from('TPE1'), Buffer.from([1]), Buffer.from(iv), Buffer.from(ct)]);
}
const lib = {
  carpetas: [{ t: 'Doctrinales', o: 1 }, { t: 'Vida Cristiana', o: 2 }],
  items: [
    { t: 'PRUEBA: El nombre sobre todo nombre', r: 'Hechos 2:38', c: 0, d: '🟠', S: 'Enseñanza de prueba',
      p: [['p', 'Enseñanza de prueba'], ['ref', 'Hechos 2:38'], ['q', '(RVR1960) Arrepentíos, y bautícese cada uno de vosotros'], ['h', 'I. El mandato'], ['li', 'Primer punto de prueba'], ['li', 'Segundo punto'], ['i', '¡Frase de impacto de prueba!'], ['p', 'Párrafo final de prueba.']] },
    { t: 'PRUEBA: Andar en santidad', r: '1 Pedro 1:15', c: 1, md: '# ANDAR EN SANTIDAD\n*Prueba en formato markdown*\n\n> 1 Pedro 1:15 — ¹⁵ sed también vosotros santos\n\n## I. Llamados a ser santos\n- Punto ==resaltado==\n\n**¡Santidad es obediencia!**' },
  ],
};
const raw = await key('clave de prueba');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'biblioteca.enc'), await enc(lib, raw));
fs.writeFileSync(path.join(out, 'biblioteca-nueva.enc'), await enc({ items: { 0: '# EL NOMBRE SOBRE TODO NOMBRE (VERSIÓN NUEVA)\n\n## I. Versión nueva de prueba\n- Contenido nuevo' } }, raw));
console.log('archivo de prueba creado en', out, '· clave raw b64:', Buffer.from(raw).toString('base64'));
