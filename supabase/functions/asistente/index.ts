// Función de servidor del Asistente de IA de Escudriñad (Supabase Edge Function, Deno).
// La clave de Anthropic vive SOLO aquí, como secreto del servidor; nunca en la app ni en GitHub.
//
// Secretos que hay que crear en Supabase (Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  clave de la consola de Anthropic (obligatorio)
//   CODIGO_ACCESO      frase que usted inventa; la app la envía en cada pregunta (obligatorio, mínimo 12 letras)
//   MODELO             opcional; por defecto claude-sonnet-5-5
//   ORIGENES           opcional; sitios autorizados separados por comas (por defecto https://pastorsierra.github.io)
//
// Esta función no guarda las preguntas ni las respuestas. Escrita sin tipos para que también sea JavaScript válido.

const API = 'https://api.anthropic.com/v1/messages';
const MAX_ENTRADA = 120000; // letras máximas de fuentes + pregunta por consulta
const TOKENS = { breve: 700, explicativa: 1600, profunda: 3000, investigacion: 4500 };

const MODOS = {
  exegeta: 'Actúa como exegeta: analiza el pasaje en su contexto literario, histórico y gramatical, usando las palabras originales (números Strong) que se te entregan.',
  hermeneuta: 'Actúa como maestro de hermenéutica: identifica el género, los principios de interpretación que aplican y los errores que se deben evitar.',
  teologo: 'Actúa como teólogo bíblico: recorre lo que enseñan los pasajes entregados sobre el tema, distinguiendo lo que dice el texto de la formulación doctrinal.',
  investigador: 'Actúa como investigador: organiza la evidencia de las fuentes entregadas, señala lo que no se puede afirmar con ellas y lo que queda abierto.',
  predicador: 'Actúa como ayudante de un predicador: propone ideas, estructura y aplicaciones fieles al texto, sin redactar el sermón completo.',
  preguntas: 'Formula preguntas de estudio y de reflexión sobre el pasaje, de observación, de interpretación y de aplicación.',
  biblioteca: 'Responde usando sobre todo los fragmentos de los documentos del usuario que se te entregan, indicando documento y página.',
  estudio: 'Acompaña un estudio personal: explica con claridad, paso a paso, y sugiere qué observar en el texto.',
};
const PROFUNDIDAD = {
  breve: 'Responde en pocas líneas.',
  explicativa: 'Responde con una explicación clara y ordenada, de extensión media.',
  profunda: 'Responde con profundidad: contexto, análisis, posiciones y conclusiones.',
  investigacion: 'Responde como una investigación detallada, con secciones, evidencia de cada fuente y preguntas abiertas.',
};

function sistema(modo, profundidad, perfil) {
  return [
    'Eres el asistente de estudio bíblico de la app «Escudriñad». Respondes en español.',
    MODOS[modo] || MODOS.estudio,
    PROFUNDIDAD[profundidad] || PROFUNDIDAD.explicativa,
    'REGLAS OBLIGATORIAS:',
    '1. Usa solo las FUENTES numeradas que se te entregan para los textos bíblicos, los datos de palabras originales y los documentos. Cita cada afirmación con su número entre corchetes, por ejemplo [2].',
    '2. No inventes versículos, palabras hebreas o griegas, autores, libros ni citas. Si necesitas un texto que no está en las fuentes, dilo y sugiere buscarlo en la app.',
    '3. No digas que consultaste recursos que no se te entregaron.',
    '4. Distingue con claridad: lo que dice el texto, lo que se infiere, la interpretación y la aplicación.',
    '5. Si las fuentes no bastan para responder, dilo con honestidad.',
    perfil ? `MARCO DOCTRINAL DEL USUARIO (úsalo como marco de investigación; no alteres el texto bíblico ni presentes formulaciones contrarias como si fueran la doctrina del usuario; cuando haya otras posiciones, menciónalas con respeto): ${perfil}` : 'No asumas un marco doctrinal: presenta las posiciones con equidad.',
  ].join('\n');
}

function iguales(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

export async function manejar(req, env, fetcher = fetch) {
  const origenes = (env('ORIGENES') || 'https://pastorsierra.github.io').split(',').map(s => s.trim());
  const origen = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': origenes.includes(origen) ? origen : origenes[0],
    'Access-Control-Allow-Headers': 'content-type, x-codigo, authorization, apikey',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin',
  };
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return res(405, { error: 'Método no permitido.' });
  if (origen && !origenes.includes(origen)) return res(403, { error: 'Sitio no autorizado.' });

  const clave = env('ANTHROPIC_API_KEY'), codigo = env('CODIGO_ACCESO');
  if (!clave || !codigo) return res(500, { error: 'Falta configurar los secretos ANTHROPIC_API_KEY y CODIGO_ACCESO en el servidor.' });
  if (codigo.length < 12) return res(500, { error: 'El CODIGO_ACCESO del servidor debe tener al menos 12 letras.' });
  if (!iguales(req.headers.get('x-codigo') || '', codigo)) return res(401, { error: 'Código de acceso incorrecto.' });

  let p;
  try { p = await req.json(); } catch { return res(400, { error: 'Petición mal formada.' }); }
  const modelo = env('MODELO') || 'claude-sonnet-5-5';
  if (p.ping) return res(200, { ok: true, modelo });

  const pregunta = String(p.pregunta || '').trim();
  if (pregunta.length < 3) return res(400, { error: 'Escriba una pregunta.' });
  const fuentes = Array.isArray(p.fuentes) ? p.fuentes.slice(0, 80) : [];
  const bloque = fuentes.map((f, i) => `[${i + 1}] ${String(f.titulo || '').slice(0, 200)}\n${String(f.texto || '')}`).join('\n\n');
  if (bloque.length + pregunta.length > MAX_ENTRADA) return res(413, { error: 'Demasiadas fuentes para una sola consulta; quite algunas.' });

  const r = await fetcher(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: modelo, max_tokens: TOKENS[p.profundidad] || TOKENS.explicativa,
      system: sistema(p.modo, p.profundidad, String(p.perfil || '').slice(0, 2000)),
      messages: [{ role: 'user', content: `FUENTES:\n${bloque || '(ninguna)'}\n\nPREGUNTA:\n${pregunta}` }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `Error ${r.status}`;
    const aviso = r.status === 401 ? 'La clave de Anthropic del servidor no es válida.' : r.status === 429 ? 'Se alcanzó el límite de uso de Anthropic; intente más tarde.' : r.status === 400 && /credit|billing/i.test(msg) ? 'La cuenta de Anthropic no tiene saldo.' : 'El servicio de IA respondió con un error.';
    return res(502, { error: `${aviso} (${msg})` });
  }
  const texto = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  return res(200, { texto, modelo: data.model || modelo, uso: data.usage || null, cortada: data.stop_reason === 'max_tokens' });
}

// En Supabase (Deno) se sirve la función; en las pruebas se importa «manejar».
if (typeof Deno !== 'undefined' && Deno.serve) Deno.serve((req) => manejar(req, (k) => Deno.env.get(k)));
