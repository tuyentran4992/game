#!/usr/bin/env python3
"""Cổng kiểm T0: schema + nguồn + dedupe. Dùng: python3 t0/validate_t0.py --file t0/R1.json
Exit 0 = PASS (0 lỗi). Exit 1 = có lỗi."""
import sys, json, re, argparse, collections

CHANNELS = {"playgama", "crazygames", "devvit", "ytplayables", "other"}
REQ = ["channel", "route", "title", "url", "mechanic_verb", "similarity", "votes", "evidence_note", "date_checked"]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--file", required=True)
    a = ap.parse_args()
    errs, warns = [], []
    try:
        data = json.load(open(a.file, encoding="utf-8"))
    except Exception as e:
        print(f"FAIL: không đọc được JSON: {e}"); sys.exit(1)
    if not isinstance(data, list):
        errs.append("file phải là JSON ARRAY các bản tìm được")
        data = []
    urls = collections.Counter()
    for i, r in enumerate(data):
        if not isinstance(r, dict):
            errs.append(f"[{i}] không phải object"); continue
        for k in REQ:
            if k not in r: errs.append(f"[{i}] thiếu key `{k}`")
        ch = r.get("channel")
        if ch not in CHANNELS: errs.append(f"[{i}] channel lạ: {ch!r}")
        u = str(r.get("url") or "")
        sim = r.get("similarity")
        if sim is None:
            if "KHONG_KIEM_CHUNG_DUOC" not in str(r.get("evidence_note") or ""):
                errs.append(f"[{i}] similarity=null thì evidence_note phải bắt đầu bằng KHONG_KIEM_CHUNG_DUOC")
        else:
            if not isinstance(sim, int) or not (0 <= sim <= 3): errs.append(f"[{i}] similarity phải là int 0-3 (đang {sim!r})")
            if not u.startswith("http"): errs.append(f"[{i}] thiếu URL http thật (đang {u!r})")
            votes = r.get("votes")
            if not isinstance(votes, list) or len(votes) < 3: errs.append(f"[{i}] votes phải là list >=3 phiếu (đang {votes!r})")
            elif len(set(votes)) > 1: warns.append(f"[{i}] votes không đồng nhất {votes} → đã lấy đa số, OK nhưng verifier sẽ soi lại")
        if u.startswith("http"): urls[u] += 1
        d = str(r.get("date_checked") or "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d): errs.append(f"[{i}] date_checked phải YYYY-MM-DD (đang {d!r})")
    dup = [u for u, c in urls.items() if c > 1]
    if dup: warns.append(f"URL trùng trong file ({len(dup)}): " + ", ".join(dup[:3]))

    sim3 = sum(1 for r in data if isinstance(r, dict) and r.get("similarity") == 3)
    blocked = sum(1 for r in data if isinstance(r, dict) and r.get("similarity") is None)
    by_ch = collections.Counter(r.get("channel") for r in data if isinstance(r, dict))
    print(f"FILE {a.file}: rows={len(data)} · mức-3={sim3} · bị chặn={blocked} · theo kênh={dict(by_ch)}")
    for w in warns: print("WARN:", w)
    for e in errs: print("ERROR:", e)
    print("RESULT:", "PASS" if not errs else f"FAIL ({len(errs)} lỗi)")
    sys.exit(0 if not errs else 1)

if __name__ == "__main__":
    main()
