#!/usr/bin/env python3
"""
Convierte las fuentes bíblicas legales a los JSON que usa la app.

Fuentes (ver docs/LICENCIAS.md):
  - Reina-Valera 1909 (dominio público), USFX con números Strong
    https://github.com/seven1m/open-bibles  (spa-rv1909.usfx.xml)
  - La Biblia en Español Sencillo (CC BY 4.0, AudioBiblia.org / Irma Flores)
    https://github.com/seven1m/open-bibles  (spa-bes.usfx.xml)
  - Referencias cruzadas de OpenBible.info (CC BY)
    https://www.openbible.info/labs/cross-references/

Uso:
  python3 tools/build_data.py RUTA_RV1909.usfx.xml RUTA_BES.usfx.xml RUTA_cross_references.txt

Salida:
  data/rv1909/<LIBRO>.json   versos con segmentos Strong y añadidos (cursiva)
  data/bes/<LIBRO>.json      versos en texto plano
  data/xref/<LIBRO>.json     referencias cruzadas por versículo
  data/manifest.json         inventario (libros, capítulos, versos, tamaños)
"""
import json, os, re, sys, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")

USFM_ORDER = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO "
              "ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL "
              "MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS "
              "1PE 2PE 1JN 2JN 3JN JUD REV").split()
OSIS_ORDER = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov "
              "Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal "
              "Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas "
              "1Pet 2Pet 1John 2John 3John Jude Rev").split()
OSIS2USFM = dict(zip(OSIS_ORDER, USFM_ORDER))

TOKEN = re.compile(r"<[^>]+>|[^<]+")
ATTR = re.compile(r'(\w+)="([^"]*)"')


def norm_strong(s):
    out = []
    for p in s.split():
        m = re.match(r"^([HG])0*(\d+)([a-z]?)$", p)
        if m:
            out.append(m.group(1) + m.group(2))
    return " ".join(dict.fromkeys(out))  # sin duplicados, orden estable


def clean(t):
    return re.sub(r"\s+", " ", html.unescape(t))


def parse_usfx(path, keep_strong):
    text = open(path, encoding="utf-8-sig").read()
    books = {}
    book = chap = verse = None
    segs = None
    stack = []  # pila de etiquetas abiertas relevantes: ('w', strong) | ('add',) | ('skip',)

    def flush():
        nonlocal segs
        if book and chap and verse and segs is not None:
            books[book]["c"][chap - 1].append(finish(segs))
        segs = None

    def emit(t):
        if segs is None:
            return
        if any(s[0] == "skip" for s in stack):
            return
        strong = ""
        add = 0
        for s in stack:
            if s[0] == "w" and keep_strong:
                strong = s[1]
            if s[0] == "add":
                add = 1
        segs.append([t, strong, add])

    for tok in TOKEN.findall(text):
        if tok.startswith("<"):
            tag = tok[1:].split()[0].rstrip("/>").lstrip("/")
            closing = tok.startswith("</")
            selfclose = tok.endswith("/>")
            attrs = dict(ATTR.findall(tok))
            if tag == "book" and not closing:
                flush()
                book = attrs["id"]
                books[book] = {"id": book, "n": None, "c": []}
                chap = verse = None
            elif tag == "h" and not closing:
                stack.append(("h",))
            elif tag == "h" and closing:
                stack = [s for s in stack if s[0] != "h"]
            elif tag == "c" and selfclose:
                flush()
                chap = int(attrs["id"])
                while len(books[book]["c"]) < chap:
                    books[book]["c"].append([])
                verse = None
            elif tag == "v" and selfclose:
                flush()
                verse = int(attrs["id"])
                expected = len(books[book]["c"][chap - 1]) + 1
                # Rellena huecos para que el índice del arreglo sea el número de verso
                while expected < verse:
                    books[book]["c"][chap - 1].append("")
                    expected += 1
                segs = []
            elif tag == "ve" and selfclose:
                flush()
            elif tag == "w":
                if closing:
                    for i in range(len(stack) - 1, -1, -1):
                        if stack[i][0] == "w":
                            stack.pop(i); break
                elif not selfclose:
                    stack.append(("w", norm_strong(attrs.get("s", ""))))
            elif tag == "add":
                if closing:
                    for i in range(len(stack) - 1, -1, -1):
                        if stack[i][0] == "add":
                            stack.pop(i); break
                elif not selfclose:
                    stack.append(("add",))
            elif tag in ("f", "x", "toc", "id", "s", "note"):
                if closing:
                    for i in range(len(stack) - 1, -1, -1):
                        if stack[i][0] == "skip" and stack[i][1] == tag:
                            stack.pop(i); break
                elif not selfclose:
                    stack.append(("skip", tag))
        else:
            if any(s[0] == "h" for s in stack) and book and books[book]["n"] is None:
                books[book]["n"] = tok.strip()
                continue
            emit(clean(tok))
    flush()
    return books


def finish(segs):
    """Une segmentos contiguos con mismos atributos y devuelve str o lista compacta."""
    merged = []
    for t, s, a in segs:
        if merged and merged[-1][1] == s and merged[-1][2] == a:
            merged[-1][0] += t
        else:
            merged.append([t, s, a])
    # recorta espacios externos
    if merged:
        merged[0][0] = merged[0][0].lstrip()
        merged[-1][0] = merged[-1][0].rstrip()
    merged = [m for m in merged if m[0] != ""]
    if all(not s and not a for _, s, a in merged):
        return "".join(t for t, _, _ in merged)
    out = []
    for t, s, a in merged:
        if not s and not a:
            out.append(t)
        elif a:
            out.append([t, s, 1])
        else:
            out.append([t, s])
    return out


def parse_ref(r):
    # Gen.1.1  |  Gen.1.1-Gen.1.3
    parts = r.split("-")
    def one(p):
        b, c, v = p.split(".")
        return OSIS2USFM[b], int(c), int(v)
    a = one(parts[0])
    if len(parts) == 1:
        return "%s.%d.%d" % a
    b = one(parts[1])
    if a[0] == b[0] and a[1] == b[1]:
        return "%s.%d.%d-%d" % (a[0], a[1], a[2], b[2])
    return "%s.%d.%d-%s.%d.%d" % (a + b)


def build_xref(path, min_votes=3, per_verse=15):
    data = {}
    for line in open(path, encoding="utf-8"):
        if line.startswith("From"):
            continue
        p = line.rstrip("\n").split("\t")
        if len(p) < 3:
            continue
        votes = int(p[2])
        if votes < min_votes:
            continue
        try:
            src = parse_ref(p[0]); dst = parse_ref(p[1])
        except (KeyError, ValueError):
            continue
        b, c, v = src.split(".")
        data.setdefault(b, {}).setdefault("%s.%s" % (c, v), []).append((votes, dst))
    out = {}
    for b, verses in data.items():
        out[b] = {k: [d for _, d in sorted(lst, key=lambda x: -x[0])[:per_verse]] for k, lst in verses.items()}
    return out


def write(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def main():
    rv, bes, xr = sys.argv[1:4]
    manifest = {"versions": {}, "xref": {}}
    for code, path, strong, meta in (
        ("rv1909", rv, True, {"name": "Reina-Valera 1909", "short": "RV1909",
                              "license": "Dominio público",
                              "source": "eBible.org vía github.com/seven1m/open-bibles",
                              "strong": True}),
        ("bes", bes, False, {"name": "La Biblia en Español Sencillo", "short": "BES",
                             "license": "CC BY 4.0 — © 2018 AudioBiblia.org / Irma Flores",
                             "source": "eBible.org (SPNBES) vía github.com/seven1m/open-bibles",
                             "strong": False})):
        books = parse_usfx(path, strong)
        assert list(books.keys()) == USFM_ORDER, "orden de libros inesperado"
        total_v = 0; size = 0; chapters = {}
        for b in USFM_ORDER:
            bk = books[b]
            if strong is False:
                bk["c"] = [[v if isinstance(v, str) else "".join(s if isinstance(s, str) else s[0] for s in v)
                            for v in ch] for ch in bk["c"]]
            chapters[b] = [len(ch) for ch in bk["c"]]
            total_v += sum(chapters[b])
            size += write(os.path.join(OUT, code, b + ".json"), bk)
        meta.update({"verses": total_v, "bytes": size,
                     "names": {b: books[b]["n"] for b in USFM_ORDER}, "chapters": chapters})
        manifest["versions"][code] = meta
        print(code, total_v, "versos", round(size / 1e6, 2), "MB")
    xref = build_xref(xr)
    size = 0; n = 0
    for b in USFM_ORDER:
        size += write(os.path.join(OUT, "xref", b + ".json"), xref.get(b, {}))
        n += sum(len(v) for v in xref.get(b, {}).values())
    manifest["xref"] = {"name": "Referencias cruzadas OpenBible.info", "license": "CC BY",
                        "source": "https://www.openbible.info/labs/cross-references/",
                        "filter": "votos >= 3, máximo 15 por versículo", "count": n, "bytes": size}
    print("xref", n, round(size / 1e6, 2), "MB")
    write(os.path.join(OUT, "manifest.json"), manifest)


if __name__ == "__main__":
    main()
