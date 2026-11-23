// Estado global de preferencias (persistido en IndexedDB → settings)
import { getSetting, setSetting } from './db.js';

export const DEFAULTS = {
  theme: 'claro',          // claro | oscuro | sepia
  fontSize: 19,            // px del texto bíblico
  showStrong: false,       // números Strong en línea
  parallel: false,         // mostrar otra versión al lado
  version: 'rv1909',       // versión principal de lectura (rv1909, bes o u:ABREV de Mis Biblias)
  parallelVer: 'bes',      // versión para comparar en paralelo
  verseBreaks: true,       // un versículo por línea (false = párrafo continuo)
  lastPos: { book: 'JHN', ch: 1 },
  doctrinalProfile: 'ipuc',
  doctrinalNotes: '',
};
export const S = { ...DEFAULTS };

export async function loadSettings() {
  for (const k of Object.keys(DEFAULTS)) S[k] = await getSetting(k, DEFAULTS[k]);
  applyTheme();
}
export async function setPref(k, v) {
  S[k] = v; await setSetting(k, v);
  if (k === 'theme' || k === 'fontSize') applyTheme();
}
export function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  document.documentElement.style.setProperty('--reader-size', `${S.fontSize}px`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = S.theme === 'oscuro' ? '#0f1726' : S.theme === 'sepia' ? '#f3ead8' : '#f7f8fb';
}

export const PROFILES = {
  ipuc: {
    name: 'Pentecostal apostólico — IPUC (unicitario)',
    summary: 'Perfil de estudio configurado por el usuario: Iglesia Pentecostal Unida de Colombia, enfoque unicitario. ' +
      'Jesucristo como Dios manifestado en carne; bautismo en agua en el nombre de Jesucristo (Hch 2:38); bautismo del Espíritu Santo. ' +
      'Se usa como marco de investigación del asistente (Fase 4): nunca altera el texto bíblico y la interpretación se distingue siempre del texto.',
  },
  ninguno: { name: 'Sin perfil (neutral)', summary: 'El asistente presentará las posiciones sin un marco doctrinal predeterminado.' },
};
