#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
echo "[$(date -u '+%F %T')] TIẾP TỤC sửa B3a (phiên trước bị ngắt)…" >> "$LOG"
python3 harness/claude_step.py --batch B3a --step 2g-fix-cont --prompt B3a-2g-fix-cont.md --max-turns 110 >> "$LOG" 2>&1
if (cd game && npm run gate) > logs/B3a-gate.log 2>&1; then
  echo "[$(date -u '+%F %T')] CỔNG B3a PASS" >> "$LOG"; gate=PASS
else
  echo "[$(date -u '+%F %T')] CỔNG B3a FAIL" >> "$LOG"; gate=FAIL
fi
echo "[$(date -u '+%F %T')] review CODE (3a-code, KHÔNG browser)…" >> "$LOG"
python3 harness/claude_step.py --batch B3a --step 3a-code --prompt B3a-3a-code.md --max-turns 30 --mode readonly --pack harness/packs/review-general.md >> "$LOG" 2>&1
grep -hE '^\|\s*[CAF][0-9]+\s*\|\s*FAIL' logs/B3a-3a-code.log > logs/B3a-review-conlai.txt 2>/dev/null || true
n=$(grep -c . logs/B3a-review-conlai.txt || true)
{ echo "# NIGHT — batch B3a"; echo "- Cổng cuối: $gate"; echo "- Mục FAIL còn lại (review CODE): ${n:-0}"; echo; cat logs/B3a-review-conlai.txt 2>/dev/null; } > logs/NIGHT-B3a.md
echo "[$(date -u '+%F %T')] B3a xong (gate=$gate, FAIL còn ${n:-0}) → chạy B3b B4 B5" >> "$LOG"
python3 harness/night_run.py B3b B4 B5 >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] ĐÊM KẾT THÚC (B3b B4 B5)" >> "$LOG"
