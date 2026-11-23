// Canon de 66 libros. id = código USFM (estable, usado como clave en toda la base de datos).
// g = grupo/género literario tradicional (clasificación canónica protestante habitual).
const RAW = [
  ['GEN','Génesis','Gn','AT','Pentateuco',['gen','gn','ge']],
  ['EXO','Éxodo','Éx','AT','Pentateuco',['ex','exo','exod']],
  ['LEV','Levítico','Lv','AT','Pentateuco',['lv','lev']],
  ['NUM','Números','Nm','AT','Pentateuco',['nm','num','nu']],
  ['DEU','Deuteronomio','Dt','AT','Pentateuco',['dt','deut','deu']],
  ['JOS','Josué','Jos','AT','Históricos',['jos','josue']],
  ['JDG','Jueces','Jue','AT','Históricos',['jue','jc','jueces']],
  ['RUT','Rut','Rt','AT','Históricos',['rt','rut']],
  ['1SA','1 Samuel','1 S','AT','Históricos',['1s','1sa','1sam','1samuel']],
  ['2SA','2 Samuel','2 S','AT','Históricos',['2s','2sa','2sam','2samuel']],
  ['1KI','1 Reyes','1 R','AT','Históricos',['1r','1re','1rey','1reyes']],
  ['2KI','2 Reyes','2 R','AT','Históricos',['2r','2re','2rey','2reyes']],
  ['1CH','1 Crónicas','1 Cr','AT','Históricos',['1cr','1cro','1cron','1cronicas']],
  ['2CH','2 Crónicas','2 Cr','AT','Históricos',['2cr','2cro','2cron','2cronicas']],
  ['EZR','Esdras','Esd','AT','Históricos',['esd','esdras']],
  ['NEH','Nehemías','Neh','AT','Históricos',['neh','ne','nehemias']],
  ['EST','Ester','Est','AT','Históricos',['est','ester']],
  ['JOB','Job','Job','AT','Poéticos',['job','jb']],
  ['PSA','Salmos','Sal','AT','Poéticos',['sal','salmo','salmos','sl','ps']],
  ['PRO','Proverbios','Pr','AT','Poéticos',['pr','prov','pro','proverbios']],
  ['ECC','Eclesiastés','Ec','AT','Poéticos',['ec','ecl','ecles','eclesiastes']],
  ['SNG','Cantares','Cnt','AT','Poéticos',['cnt','cant','cantares','cantar','ct']],
  ['ISA','Isaías','Is','AT','Profetas mayores',['is','isa','isaias']],
  ['JER','Jeremías','Jer','AT','Profetas mayores',['jer','jr','jeremias']],
  ['LAM','Lamentaciones','Lm','AT','Profetas mayores',['lm','lam','lamentaciones']],
  ['EZK','Ezequiel','Ez','AT','Profetas mayores',['ez','eze','ezeq','ezequiel']],
  ['DAN','Daniel','Dn','AT','Profetas mayores',['dn','dan','daniel']],
  ['HOS','Oseas','Os','AT','Profetas menores',['os','oseas']],
  ['JOL','Joel','Jl','AT','Profetas menores',['jl','joel']],
  ['AMO','Amós','Am','AT','Profetas menores',['am','amos']],
  ['OBA','Abdías','Abd','AT','Profetas menores',['abd','abdias']],
  ['JON','Jonás','Jon','AT','Profetas menores',['jon','jonas']],
  ['MIC','Miqueas','Mi','AT','Profetas menores',['mi','miq','miqueas']],
  ['NAM','Nahúm','Nah','AT','Profetas menores',['nah','nahum']],
  ['HAB','Habacuc','Hab','AT','Profetas menores',['hab','habacuc']],
  ['ZEP','Sofonías','Sof','AT','Profetas menores',['sof','sofonias']],
  ['HAG','Hageo','Hag','AT','Profetas menores',['hag','hageo']],
  ['ZEC','Zacarías','Zac','AT','Profetas menores',['zac','zacarias']],
  ['MAL','Malaquías','Mal','AT','Profetas menores',['mal','malaquias']],
  ['MAT','Mateo','Mt','NT','Evangelios',['mt','mat','mateo']],
  ['MRK','Marcos','Mr','NT','Evangelios',['mr','mc','mar','marcos']],
  ['LUK','Lucas','Lc','NT','Evangelios',['lc','luc','lucas']],
  ['JHN','Juan','Jn','NT','Evangelios',['jn','juan']],
  ['ACT','Hechos','Hch','NT','Historia',['hch','hech','hechos','hc']],
  ['ROM','Romanos','Ro','NT','Epístolas paulinas',['ro','rom','romanos']],
  ['1CO','1 Corintios','1 Co','NT','Epístolas paulinas',['1co','1cor','1corintios']],
  ['2CO','2 Corintios','2 Co','NT','Epístolas paulinas',['2co','2cor','2corintios']],
  ['GAL','Gálatas','Gá','NT','Epístolas paulinas',['ga','gal','galatas']],
  ['EPH','Efesios','Ef','NT','Epístolas paulinas',['ef','efe','efesios']],
  ['PHP','Filipenses','Fil','NT','Epístolas paulinas',['fil','flp','filipenses']],
  ['COL','Colosenses','Col','NT','Epístolas paulinas',['col','colosenses']],
  ['1TH','1 Tesalonicenses','1 Ts','NT','Epístolas paulinas',['1ts','1tes','1tesalonicenses']],
  ['2TH','2 Tesalonicenses','2 Ts','NT','Epístolas paulinas',['2ts','2tes','2tesalonicenses']],
  ['1TI','1 Timoteo','1 Ti','NT','Epístolas paulinas',['1ti','1tim','1timoteo']],
  ['2TI','2 Timoteo','2 Ti','NT','Epístolas paulinas',['2ti','2tim','2timoteo']],
  ['TIT','Tito','Tit','NT','Epístolas paulinas',['tit','tito']],
  ['PHM','Filemón','Flm','NT','Epístolas paulinas',['flm','filem','filemon']],
  ['HEB','Hebreos','He','NT','Epístolas generales',['he','heb','hebreos']],
  ['JAS','Santiago','Stg','NT','Epístolas generales',['stg','sant','santiago','sg']],
  ['1PE','1 Pedro','1 P','NT','Epístolas generales',['1p','1pe','1ped','1pedro']],
  ['2PE','2 Pedro','2 P','NT','Epístolas generales',['2p','2pe','2ped','2pedro']],
  ['1JN','1 Juan','1 Jn','NT','Epístolas generales',['1jn','1juan']],
  ['2JN','2 Juan','2 Jn','NT','Epístolas generales',['2jn','2juan']],
  ['3JN','3 Juan','3 Jn','NT','Epístolas generales',['3jn','3juan']],
  ['JUD','Judas','Jud','NT','Epístolas generales',['jud','judas']],
  ['REV','Apocalipsis','Ap','NT','Profecía',['ap','apoc','apocalipsis','rev']],
];

export const BOOKS = RAW.map(([id, name, abbr, t, group, alias], i) => ({ id, name, abbr, t, group, alias, index: i }));
export const BOOK = Object.fromEntries(BOOKS.map(b => [b.id, b]));

export function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const ALIAS = new Map();
for (const b of BOOKS) {
  for (const a of [...b.alias, norm(b.name).replace(/\s+/g, ''), norm(b.abbr).replace(/\s+/g, ''), b.id.toLowerCase()]) {
    if (!ALIAS.has(a)) ALIAS.set(a, b.id);
  }
}

// Reconoce el libro en un texto ya normalizado sin espacios. Exacto primero; luego prefijo único.
export function findBook(token) {
  let t = norm(token).replace(/[\s.]+/g, '')
    .replace(/^(iii|3ra|3a|tercera|tercer)(?=[a-z])/, '3')
    .replace(/^(ii|2da|2a|segunda|segundo)(?=[a-z])/, '2')
    .replace(/^(i|1ra|1a|primera|primer|primero)(?=[a-z])/, (m, off, s) => (/^is/.test(s) ? m : '1'));
  if (!t) return null;
  if (ALIAS.has(t)) return ALIAS.get(t);
  if (t.length < 2) return null;
  const hits = new Set();
  for (const [a, id] of ALIAS) if (a.startsWith(t)) hits.add(id);
  return hits.size === 1 ? [...hits][0] : null;
}

export const GROUPS = [...new Set(BOOKS.map(b => b.group))];
