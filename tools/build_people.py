#!/usr/bin/env python3
"""Personajes bíblicos a partir de Theographic Bible Metadata (CC BY-SA 4.0,
github.com/robertrouse/theographic-bible-metadata). Nombre en español obtenido de la RV1909:
la palabra con mayúscula más frecuente en los versículos donde aparece la persona y parecida a su nombre.
Uso: python3 tools/build_people.py RUTA/theographic/json"""
import json, os, re, sys, unicodedata, difflib, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
OSIS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev").split()
USFM = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV").split()
O2U = dict(zip(OSIS, USFM))
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
# Nombres que en español no se parecen al inglés (equivalencias estándar de la RV1909)
KNOWN = {"Peter": "Pedro", "John": "Juan", "James": "Jacobo", "Paul": "Pablo", "Matthew": "Mateo", "Mark": "Marcos", "Luke": "Lucas", "Jude": "Judas",
         "Stephen": "Esteban", "Philip": "Felipe", "Andrew": "Andrés", "Thomas": "Tomás", "Timothy": "Timoteo", "Mary": "María", "Joseph": "José",
         "Jesus": "Jesús", "God": "Dios", "Elijah": "Elías", "Elisha": "Eliseo", "Isaiah": "Isaías", "Jeremiah": "Jeremías", "Ezekiel": "Ezequiel",
         "Solomon": "Salomón", "Moses": "Moisés", "Joshua": "Josué", "Eve": "Eva", "Noah": "Noé", "Shem": "Sem", "Japheth": "Jafet", "Ham": "Cam",
         "Rebekah": "Rebeca", "Rachel": "Raquel", "Leah": "Lea", "Hezekiah": "Ezequías", "Josiah": "Josías", "Jehoshaphat": "Josafat", "Herod": "Herodes",
         "Pilate": "Pilato", "Barnabas": "Bernabé", "Silas": "Silas", "Elizabeth": "Elisabet", "Zechariah": "Zacarías", "Martha": "Marta", "Lazarus": "Lázaro",
         "Nicodemus": "Nicodemo", "Bartholomew": "Bartolomé", "Simon": "Simón", "Judas": "Judas", "Ahab": "Achâb", "Jezebel": "Jezabel", "Samuel": "Samuel",
         "Jonah": "Jonás", "Daniel": "Daniel", "Nehemiah": "Nehemías", "Ezra": "Esdras", "Esther": "Ester", "Job": "Job", "Hosea": "Oseas", "Amos": "Amós",
         "Obadiah": "Abdías", "Israel": "Jacob (Israel)", "Pontius": "Poncio Pilato", "Mordecai": "Mardochêo", "Jesse": "Isaí", "Korah": "Coré", "Zeruiah": "Sarvia", "Cyrus": "Ciro", "Portius": "Porcio Festo", "Terah": "Thare", "Ehud": "Aod", "Queen of Sheba": "Reina de Sabá", "Daughter of Pharaoh": "Hija de Faraón", "Herod Agrippa I": "Herodes Agripa I", "Lebbaeus": "Lebeo", "Achsah": "Axa", "Alphaeus": "Alfeo", "Zacchaeus": "Zaqueo", "Gaius": "Gayo", "Daughter of Lot - Younger": "Hija menor de Lot", "Daughter of Lot - Older": "Hija mayor de Lot", "the giant in Gath": "El gigante de Gath", "Micah": "Miqueas", "Habakkuk": "Habacuc", "Zephaniah": "Sofonías", "Haggai": "Hageo", "Malachi": "Malaquías", "Nahum": "Nahum"}
STOP = set(norm(w) for w in "Dios Jehová Señor Israel Y Mas Porque Entonces Pero Así Este Esta Estos El La Los Las En De Por Para Como Que Cuando Yo Tú Él Ella Nosotros Vosotros Ellos Mi Tu Su Cristo Jesús Espíritu Santo Padre Hijo Rey Altísimo Omnipotente Todopoderoso Ahora Pues Mirad He Oh Ay Sea Mira".split())
rv = {b: json.load(open(os.path.join(ROOT, 'data', 'rv1909', b + '.json')))['c'] for b in USFM}
def plain(v): return v if isinstance(v, str) else ''.join(s if isinstance(s, str) else s[0] for s in v)
P = json.load(open(os.path.join(SRC, 'people.json'))); V = json.load(open(os.path.join(SRC, 'verses.json')))
vref = {}
for v in V:
    b, c, n = v['fields']['osisRef'].split('.'); vref[v['id']] = (O2U[b], int(c), int(n))
pid = {p['id']: p['fields']['personID'] for p in P}
out = []; stats = collections.Counter()
# Personas sin nombre propio: se traducen, no se buscan en el texto
DESC = {"Concubine the Aramitess": "Concubina aramea (de Manasés)", "Daughter of Herodias": "Hija de Herodías", "Daughter of Lot - Older": "Hija mayor de Lot",
        "Daughter of Lot - Younger": "Hija menor de Lot", "Daughter of Machir": "Hija de Machir", "Daughter of Meshullam": "Hija de Mesullam", "Daughter of Pharaoh": "Hija de Faraón",
        "Daughter of Putiel": "Hija de Putiel", "Daughter of Shuah": "Hija de Súa", "man of great stature": "Hombre de gran estatura", "man of understanding": "Hombre entendido",
        "Mother of Aholah and Aholibah": "Madre de Ahola y Aholiba", "Mother of Lemuel": "Madre del rey Lemuel", "Mother of the Wife of Simon": "Suegra de Simón Pedro",
        "Mother of Zebedees children": "Madre de los hijos de Zebedeo", "Queen of Sheba": "Reina de Sabá", "Sister of Tahpenes": "Hermana de Tahpenes", "son of Abinadab": "Hijo de Abinadab",
        "son of Dekar": "Hijo de Decar", "son of Geber": "Hijo de Geber", "son of Hesed": "Hijo de Hesed", "son of Hur": "Hijo de Hur", "son of Joiada": "Hijo de Joiada",
        "sons of Jashen": "Hijos de Jassén", "the giant in Gath": "El gigante de Gath", "Wife of Ezekiel": "Esposa de Ezequiel", "Wife of Simon": "Esposa de Simón Pedro"}
BYID = {2745: 'Simón Pedro'}  # homónimos que en español se conocen con otro nombre
EXCLUDE = {'God', 'Holy Spirit'}  # no son «personajes»: Dios no se trata como un personaje más
for p in P:
    f = p['fields']; en = f['name']
    if en in EXCLUDE: continue
    refs = [vref[x] for x in f.get('verses', []) if x in vref]
    cand = collections.Counter()
    for (b, c, n) in refs[:120]:
        try: t = plain(rv[b][c - 1][n - 1])
        except IndexError: continue
        for w in set(re.findall(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñâêîôûü\-]+)", t)):
            w = w.strip('-')
            if norm(w) not in STOP: cand[w] += 1
    es = None; how = ''
    if en in DESC: es, how = DESC[en], 'equivalencia'
    elif f['personID'] in BYID: es, how = BYID[f['personID']], 'equivalencia'
    elif en in KNOWN: es, how = KNOWN[en], 'equivalencia'
    else:
        best = (0, None)
        for w, k in cand.most_common(40):
            sim = difflib.SequenceMatcher(None, norm(w), norm(en)).ratio()
            if sim >= 0.5 and k >= max(1, 0.25 * min(len(refs), 120)):
                score = sim * k
                if score > best[0]: best = (score, w)
        if best[1]: es, how = best[1], 'rv1909'
    if not es: es, how = en, 'ingles'
    stats[how] += 1
    rel = lambda k: [pid[x] for x in f.get(k, []) if x in pid]
    out.append({'id': f['personID'], 'n': es, 'en': en, 'g': 'H' if f.get('gender') == 'Male' else 'M' if f.get('gender') == 'Female' else '',
                'nm': how, 'aka': f.get('alsoCalled', ''), 'v': ['%s.%d.%d' % r for r in refs], 'k': f.get('verseCount', len(refs)),
                'fa': rel('father'), 'mo': rel('mother'), 'ch': rel('children'), 'si': rel('siblings'), 'pa': rel('partners')})
os.makedirs(os.path.join(ROOT, 'data', 'personajes'), exist_ok=True)
p = os.path.join(ROOT, 'data', 'personajes', 'personas.json')
json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), dict(stats), round(os.path.getsize(p) / 1e6, 2), 'MB')
