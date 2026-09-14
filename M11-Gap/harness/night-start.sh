#!/usr/bin/env bash
# Chờ mọi phiên claude_step.py hiện tại kết thúc rồi chạy chuỗi đêm.
# Vì sao: không để 2 việc cùng đọc/ghi repo một lúc (batch sau tạo file test mới ⇒ gate tạm đỏ
# ⇒ review đang chạy sẽ báo FAIL oan).
set -u
BASE=/data/youtube-playables/M11-Gap
LOG=$BASE/logs/night.log
cd "$BASE" || exit 1

wait_free() {
  python3 - <<'PY'
import os, sys, time
me = os.getpid()
def busy():
    out = []
    for p in os.listdir('/proc'):
        if not p.isdigit(): continue
        pid = int(p)
        if pid in (me, os.getppid()): continue
        try:
            c = open(f'/proc/{p}/cmdline', 'rb').read().decode('utf-8', 'replace')
        except Exception:
            continue
        if 'harness/claude_step.py' in c or 'harness/orchestrate.sh' in c or 'night_run.py' in c:
            out.append((pid, c[:70]))
    return out
for i in range(540):          # tối đa ~90 phút
    b = busy()
    if not b:
        print('free after %ds' % (i * 10)); sys.exit(0)
    time.sleep(10)
print('vẫn bận sau 90 phút')
sys.exit(1)
PY
}

echo "[$(date -u '+%F %T')] watcher: chờ repo rảnh…" >> "$LOG"
wait_free >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] watcher: repo rảnh ⇒ bắt đầu NIGHT RUN" >> "$LOG"
python3 harness/night_run.py B1b B1c B2 B3a B3b B4 B5 >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] watcher: NIGHT RUN kết thúc" >> "$LOG"
