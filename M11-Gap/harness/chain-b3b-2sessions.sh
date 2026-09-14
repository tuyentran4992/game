#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
echo "[$(date -u '+%F %T')] B3b: 2 phiên SONG SONG (Shop+Album | Score+End)…" >> "$LOG"
python3 harness/claude_step.py --batch B3b --step 2c-shop-album --prompt B3b-2c-shop-album.md --max-turns 110 >> "$LOG" 2>&1 &
p1=$!
python3 harness/claude_step.py --batch B3b --step 2d-score-end --prompt B3b-2d-score-end.md --max-turns 110 >> "$LOG" 2>&1 &
p2=$!
wait $p1 $p2
if (cd game && npm run gate) > logs/B3b-gate.log 2>&1; then
  echo "[$(date -u '+%F %T')] CỔNG B3b PASS" >> "$LOG"; gate=PASS
else
  echo "[$(date -u '+%F %T')] CỔNG B3b FAIL" >> "$LOG"; gate=FAIL
fi
bash harness/cleanup-tmp-scripts.sh >> "$LOG" 2>&1 || true
echo "[$(date -u '+%F %T')] review CODE B3b (không browser)…" >> "$LOG"
python3 harness/claude_step.py --batch B3b --step 3a-code --prompt B3b-3a-code.md --max-turns 30 --mode readonly --pack harness/packs/review-general.md >> "$LOG" 2>&1
grep -hE '^\|\s*[CAF][0-9]+\s*\|\s*FAIL' logs/B3b-3a-code.log > logs/B3b-review-conlai.txt 2>/dev/null || true
{ echo "# NIGHT — batch B3b (Map/Score/Shop/End + album/huy hiệu)"; echo "- Cổng cuối: $gate";
  echo "- Mục FAIL còn lại (review code): $(grep -c . logs/B3b-review-conlai.txt 2>/dev/null || echo 0)"; echo;
  cat logs/B3b-review-conlai.txt 2>/dev/null; } > logs/NIGHT-B3b.md
echo "[$(date -u '+%F %T')] B3b xong (gate=$gate) → chạy B4 B5" >> "$LOG"
python3 harness/night_run.py B4 B5 >> "$LOG" 2>&1
echo "[$(date -u '+%F %T')] ĐÊM KẾT THÚC (B4 B5)" >> "$LOG"
