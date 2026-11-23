#!/usr/bin/env python3
"""Versiones adicionales de licencia libre (texto plano, sin Strong).
Uso: python3 tools/build_extra.py spa-pddpt.usfx.xml spa-vbl.usfx.xml   (de github.com/seven1m/open-bibles)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_data import parse_usfx, USFM_ORDER, OUT, write
EXTRA = {
    "pdt": ("Palabra de Dios para ti", "PDT", "CC BY-SA 4.0 — © 2017-2022 Asociación Bíblica Latinoamericana", "eBible.org (SPAPDT) vía github.com/seven1m/open-bibles"),
    "vbl": ("Versión Biblia Libre", "VBL", "CC BY-SA 4.0 — © 2018-2020 Jonathan Gallagher y Shelly Barrios de Avila", "eBible.org (SPNVBL) vía github.com/seven1m/open-bibles"),
}
files = dict(zip(["pdt", "vbl"], sys.argv[1:3]))
mp = os.path.join(OUT, "manifest.json"); manifest = json.load(open(mp, encoding="utf-8"))
for code, path in files.items():
    books = parse_usfx(path, False)
    missing = [b for b in USFM_ORDER if b not in books]
    assert not missing, (code, missing)
    total = size = 0; chapters = {}
    for b in USFM_ORDER:
        bk = books[b]
        bk["c"] = [[v if isinstance(v, str) else "".join(s if isinstance(s, str) else s[0] for s in v) for v in ch] for ch in bk["c"]]
        chapters[b] = [len(ch) for ch in bk["c"]]; total += sum(chapters[b])
        size += write(os.path.join(OUT, code, b + ".json"), bk)
    name, short, lic, src = EXTRA[code]
    manifest["versions"][code] = {"name": name, "short": short, "license": lic, "source": src, "strong": False, "verses": total, "bytes": size,
                                  "names": {b: books[b]["n"] for b in USFM_ORDER}, "chapters": chapters}
    print(code, total, round(size / 1e6, 2), "MB")
write(mp, manifest)
