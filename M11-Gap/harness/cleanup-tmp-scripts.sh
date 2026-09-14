#!/usr/bin/env bash
# Dọn tiến trình MỒ CÔI sinh từ script tạm /tmp (fuzz của phiên review) — bài học 14/09/2026:
# `node /tmp/fz2b.js` sống sót và đốt 43.299 giây CPU (~12h) ⇒ CPU 100%.
# An toàn: pattern từ file (không tự khớp dòng lệnh), LOẠI TRỪ chính PID + mọi tổ tiên.
# Dùng: bash harness/cleanup-tmp-scripts.sh [--dry]
set -u
PATFILE=$(mktemp); printf '%s' '/tmp/fz|/tmp/fuzz|/tmp/rev/|/tmp/a5|/tmp/.fz|/tmp/fz2b' > "$PATFILE"
python3 - "$PATFILE" "${1:-}" <<'PY'
import os, re, sys
rx = re.compile(open(sys.argv[1]).read().strip())
dry = len(sys.argv) > 2 and sys.argv[2] == '--dry'
def cmd(pid):
    try: return open(f'/proc/{pid}/cmdline','rb').read().decode('utf-8','replace').replace('\0',' ')
    except Exception: return ''
def ancestors(pid):
    seen=set()
    while pid and pid not in seen:
        seen.add(pid)
        try: st=open(f'/proc/{pid}/status').read()
        except Exception: break
        m=re.search(r'^PPid:\s+(\d+)', st, re.M); pid=int(m.group(1)) if m else 0
    return seen
safe = ancestors(os.getpid()); n=0
for d in os.listdir('/proc'):
    if not d.isdigit(): continue
    pid=int(d)
    if pid in safe: continue
    c=cmd(pid)
    if not c or not rx.search(c): continue
    if 'claude' in c or 'claude_step' in c or 'night_run' in c: continue   # không đụng phiên đang chạy
    if dry: print('DRY', pid, c[:70]); continue
    try: os.kill(pid, 9); n+=1; print('đã dọn', pid, c[:60])
    except Exception: pass
print('tổng dọn:', n)
PY
rm -f "$PATFILE"
