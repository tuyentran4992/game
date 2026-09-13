#!/usr/bin/env python3
"""Cổng kiểm RETENTION: mỗi đề xuất phải có cơ chế + SỐ NEO có nguồn + cách đo + điều kiện sai.
Dùng: python3 retention/validate_ret.py --file retention/P1.json"""
import sys, json, re, argparse

REQ_P = ["id", "name", "mechanism", "metric", "benchmark", "how_measured", "what_would_falsify", "playables_ok"]
FORBIDDEN = ["realtime multiplayer", "server", "iap", "in-app purchase", "third-party ad", "own ad network"]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--file", required=True)
    a = ap.parse_args()
    errs, warns = [], []
    try:
        d = json.load(open(a.file, encoding="utf-8"))
    except Exception as e:
        print(f"FAIL: không đọc được JSON: {e}"); sys.exit(1)
    if not isinstance(d, dict) or "direction" not in d or not isinstance(d.get("proposals"), list):
        print("FAIL: cấu trúc phải là object {direction, proposals:[...], summary}"); sys.exit(1)
    props = d["proposals"]
    if len(props) < 4: errs.append(f"cần >=4 đề xuất (đang {len(props)})")
    for i, p in enumerate(props):
        for k in REQ_P:
            if k not in p: errs.append(f"[{i}] thiếu key `{k}`")
        b = p.get("benchmark") or {}
        if not isinstance(b, dict): errs.append(f"[{i}] benchmark phải là object")
        else:
            if b.get("value") in (None, "", "KHONG_CO_NGUON") and not b.get("unverified"):
                errs.append(f"[{i}] benchmark cần value + source_url, hoặc đánh dấu \"unverified\": true")
            su = str(b.get("source_url") or "")
            if su and not su.startswith("http"): errs.append(f"[{i}] benchmark.source_url phải là http")
            if not su and not b.get("unverified"): errs.append(f"[{i}] thiếu benchmark.source_url (hoặc đánh dấu unverified)")
        if not str(p.get("what_would_falsify") or "").strip(): errs.append(f"[{i}] thiếu `what_would_falsify` (điều gì khiến đề xuất này SAI)")
        if not str(p.get("how_measured") or "").strip(): errs.append(f"[{i}] thiếu `how_measured`")
        if p.get("playables_ok") is not True: errs.append(f"[{i}] playables_ok phải = true (đã đối chiếu luật)")
        blob = json.dumps(p, ensure_ascii=False).lower()
        for f in FORBIDDEN:
            if f in blob and not p.get("forbidden_flagged"):
                warns.append(f"[{i}] có cụm `{f}` — kiểm lại xem có vi phạm luật Playables không")
    if not str(d.get("summary") or "").strip(): warns.append("thiếu `summary`")
    print(f"FILE {a.file}: direction={d.get('direction')!r} · proposals={len(props)}")
    for w in warns: print("WARN:", w)
    for e in errs: print("ERROR:", e)
    print("RESULT:", "PASS" if not errs else f"FAIL ({len(errs)} lỗi)")
    sys.exit(0 if not errs else 1)

if __name__ == "__main__":
    main()
