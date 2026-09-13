#!/usr/bin/env python3
'''Đọc logs/metrics.jsonl → bảng A/B. Dùng: python3 harness/report.py [variant]'''
import json, sys, os, collections
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(BASE, "logs", "metrics.jsonl")
if not os.path.exists(p): sys.exit("chưa có metrics.jsonl")
rows = []
for line in open(p, encoding="utf-8"):
    line = line.strip()
    if line:
        try: rows.append(json.loads(line))
        except Exception: pass
if len(sys.argv) > 1:
    rows = [r for r in rows if r.get("variant") == sys.argv[1]]
if not rows: sys.exit("không có dòng nào khớp")
print(f"{'variant':12} {'batch':6} {'bước':10} {'lượt':>5} {'vào':>8} {'cache':>10} {'ra':>7} {'phút':>6} {'tok/ph':>8} {'$/lần':>8} {'ctx/lượt':>9} {'exit':>5}")
agg = collections.defaultdict(lambda: [0,0,0,0,0.0])
for r in rows:
    mins = (r.get("duration_s") or 0)/60
    ip = (r.get("input_tokens") or 0)+(r.get("cache_read") or 0)+(r.get("cache_creation") or 0)
    tp = (ip+(r.get("output_tokens") or 0))/max(mins, 0.05)
    print(f"{r.get('variant',''):12} {r.get('batch',''):6} {r.get('step',''):10} {r.get('turns',0):5} "
          f"{r.get('input_tokens',0):8,} {r.get('cache_read',0):10,} {r.get('output_tokens',0):7,} {mins:6.1f} "
          f"{tp:8,.0f} {r.get('cost_usd',0):8.3f} {str(r.get('ctx_per_turn_max') or '-'):>9} {r.get('exit','?'):>5}")
    a = agg[r.get('variant','')]
    a[0]+=r.get('turns',0); a[1]+=ip; a[2]+=r.get('output_tokens',0); a[3]+=1; a[4]+=mins
print("\n--- tổng theo variant ---")
for v,(turns,ip,out,n,mins) in agg.items():
    print(f"{v:12} {n} lần · {turns} lượt · vào {ip:,} · ra {out:,} · {mins:.1f} phút · {ip/max(mins,0.05):,.0f} tok/phút")
