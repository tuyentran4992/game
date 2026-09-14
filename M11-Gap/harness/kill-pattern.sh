#!/usr/bin/env bash
# Diệt tiến trình theo pattern AN TOÀN.
# Bài học 14/09/2026: `for p in /proc/*; do case "$cmd" in *pattern*) kill;; esac; done` TỰ SÁT vì
# chính dòng lệnh của shell đang chạy cũng chứa 'pattern'. Luật: pattern để trong FILE, và
# LOẠI TRỪ chính PID + cha + mọi tổ tiên (đi ngược cây /proc) rồi mới kill.
# Dùng: bash harness/kill-pattern.sh "ms-playwright|vite preview" [--dry]
set -u
PATFILE=$(mktemp); printf '%s' "$1" > "$PATFILE"
DRY=${2:-}
python3 - "$PATFILE" "$DRY" <<'PY'
import os, re, sys, time
pat = open(sys.argv[1]).read().strip(); dry = len(sys.argv) > 2 and sys.argv[2] == '--dry'
rx = re.compile(pat)
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline','rb').read().decode('utf-8','replace').replace('\0',' ')
    except Exception: return ''
def ancestors(pid):
    seen=set()
    while pid and pid not in seen:
        seen.add(pid)
        try: st=open(f'/proc/{pid}/status').read()
        except Exception: break
        m=re.search(r'^PPid:\s+(\d+)', st, re.M)
        pid=int(m.group(1)) if m else 0
    return seen
safe = ancestors(os.getpid())
killed=[]
for p in os.listdir('/proc'):
    if not p.isdigit(): continue
    pid=int(p)
    if pid in safe: continue                      # KHÔNG bao giờ giết chính mình/tổ tiên
    c=cmdline(pid)
    if c and rx.search(c):
        if dry: print('DRY', pid, c[:70]); continue
        try: os.kill(pid, 9); killed.append((pid, c[:60]))
        except Exception: pass
# Diệt cả CÂY CON: giết wrapper thôi sẽ để lại con mồ côi (reparent về PID 1) vẫn ghi file.
def cmdline2(pid):
    return cmdline(pid)
def ppidof(pid):
    try:
        m=re.search(r'^PPid:\s+(\d+)', open(f'/proc/{pid}/status').read(), re.M)
        return int(m.group(1)) if m else 0
    except Exception: return 0
allp=[int(x) for x in os.listdir('/proc') if x.isdigit()]
fam=set()
def desc(pid):
    fam.add(pid)
    for p in allp:
        if ppidof(p)==pid: desc(p)
for pid,_ in killed: desc(pid)
for pid,_ in killed: fam.discard(pid)          # cha đã giết ở vòng trên
for pid,c in killed: print('đã diệt', pid, c)
if fam:
    for pid in sorted(fam, reverse=True):
        try: os.kill(pid, 9); print('đã diệt (con)', pid, cmdline2(pid)[:55])
        except Exception: pass
print('tổng:', len(killed))
if killed and not dry:
    try:
        import datetime
        with open('/data/youtube-playables/M11-Gap/logs/night.log','a') as fh:
            fh.write(f"[{datetime.datetime.utcnow():%Y-%m-%d %H:%M:%S}]   >>> CHUỖI ĐÃ DỪNG có chủ đích: {len(killed)} tiến trình khớp pattern ({pat[:40]})\n")
    except Exception: pass
PY
rm -f "$PATFILE"
