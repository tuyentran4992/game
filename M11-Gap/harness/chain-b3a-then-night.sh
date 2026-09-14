#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
echo "[$(date -u '+%F %T')] FIX B3a (4 nhóm)…" >> "$LOG"
python3 harness/claude_step.py --batch B3a --step 2f-fix --prompt B3a-2f-fix.md --max-turns 110 >> "$LOG" 2>&1
(cd game && npm run gate) > logs/B3a-gate.log 2>&1 && echo "[$(date -u '+%F %T')] CỔNG B3a PASS" >> "$LOG" || echo "[$(date -u '+%F %T')] CỔNG B3a FAIL" >> "$LOG"
echo "[$(date -u '+%F %T')] review CODE (3a-code, không browser)…" >> "$LOG"
python3 harness/claude_step.py --batch B3a --step 3a-code --prompt B3a-3a-code.md --max-turns 30 --mode readonly --pack harness/packs/review-general.md >> "$LOG" 2>&1
grep -hE '^\|\s*[CAF][0-9]+\s*\|\s*FAIL' logs/B3a-3a-code.log > logs/B3a-review-conlai.txt 2>/dev/null || true
n=$(wc -l < logs/B3a-review-conlai.txt)
{ echo "# NIGHT — batch B3a"; echo "- Cổng cuối: $(grep -c 'CỔNG B3a PASS' logs/night.log >/dev/null && echo PASS || echo 'xem logs/B3a-gate.log')";
  echo "- Mục FAIL còn lại (review code): $n"; echo; cat logs/B3a-review-conlai.txt; } > logs/NIGHT-B3a.md
echo "[$(date -u '+%F %T')] B3a xong ($n mục FAIL còn lại) → chạy tiếp B3b B4 B5" >> "$LOG"
python3 harness/night_run.py B3b B4 B5 >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] chuỗi đêm (B3b B4 B5) kết thúc" >> "$LOG"
