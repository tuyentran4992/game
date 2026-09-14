#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
echo "[$(date -u '+%F %T')] SỬA HẸP B3a (2 test đỏ + test rỗng)…" >> "$LOG"
python3 harness/claude_step.py --batch B3a --step 2h-fix-narrow --prompt B3a-2h-fix-narrow.md --max-turns 40 >> "$LOG" 2>&1
if (cd game && npm run gate) > logs/B3a-gate.log 2>&1; then
  echo "[$(date -u '+%F %T')] CỔNG B3a PASS (đã dứt 2 test đỏ)" >> "$LOG"
  sed -i 's/^- Cổng cuối: FAIL/- Cổng cuối: PASS (vá hẹp xong)/' logs/NIGHT-B3a.md
else
  echo "[$(date -u '+%F %T')] CỔNG B3a VẪN FAIL — xem logs/B3a-gate.log" >> "$LOG"
fi
echo "[$(date -u '+%F %T')] chạy tiếp B3b B4 B5" >> "$LOG"
python3 harness/night_run.py B3b B4 B5 >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] ĐÊM KẾT THÚC" >> "$LOG"
