#!/usr/bin/env python3
"""Léxico Strong (Hebreo 1894 / Griego 1890, dominio público; edición JSON de Open Scriptures, CC BY-SA).
Uso: python3 tools/build_strong.py RUTA/strongs-hebrew-dictionary.js RUTA/strongs-greek-dictionary.js"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(p):
    t = open(p, encoding="utf-8").read()
    t = t[t.index("{"): t.rindex("}") + 1]
    return json.loads(t)
for prefix, path in (("H", sys.argv[1]), ("G", sys.argv[2])):
    d = load(path); out = {}
    for k, v in d.items():
        m = re.match(r"^[HG](\d+)$", k)
        if not m: continue
        out[prefix + str(int(m.group(1)))] = [v.get("lemma",""), v.get("xlit", v.get("translit","")), v.get("pron",""),
                                              v.get("derivation",""), v.get("strongs_def",""), v.get("kjv_def","")]
    p = os.path.join(ROOT, "data", "strong", prefix + ".json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(prefix, len(out), os.path.getsize(p))

# Frecuencia de cada número en la RV1909 (dato real, usado para ordenar «palabras importantes»)
from collections import Counter
cnt = Counter()
rvdir = os.path.join(ROOT, "data", "rv1909")
for f in os.listdir(rvdir):
    b = json.load(open(os.path.join(rvdir, f), encoding="utf-8"))
    for ch in b["c"]:
        for v in ch:
            if isinstance(v, list):
                for s in v:
                    if isinstance(s, list) and s[1]:
                        for n in s[1].split(): cnt[n] += 1
for prefix in ("H", "G"):
    p = os.path.join(ROOT, "data", "strong", prefix + ".json")
    d = json.load(open(p, encoding="utf-8"))
    for k in d: d[k] = d[k][:6] + [cnt.get(k, 0)]
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("frecuencias añadidas", len(cnt))
