#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
echo "[$(date -u '+%F %T')] ĐÁNH BÓNG 1: strip debug + bridge-config + luật vendor…" >> "$LOG"
python3 harness/claude_step.py --batch B5 --step 2b-fix-release --prompt B5-2b-fix-release.md --max-turns 110 >> "$LOG" 2>&1
cd game
# LUẬT (bài học 14/09): build kênh phải đi qua ĐÚNG entry point scripts/build-channels.sh
#   (nó có copy_channel_files + snapshot). Tự 'npm run build:playgama' + cp dist = THIẾU file kênh
#   (playgama-bridge-config.json) ⇒ check-bundle FAIL GIẢ.
bash scripts/build-channels.sh > ../logs/B5-build-channels.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels.sh OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels.sh FAIL" >> ../logs/night.log
rm -rf /tmp/pc-standalone; mkdir -p /tmp/pc-standalone; cp -r dist/. /tmp/pc-standalone/
for m in standalone ytgame playgama; do
  [ "$m" = standalone ] && d=/tmp/pc-standalone || d=build/$m
  node tools/check-bundle.mjs "$d" --channel $m > ../logs/B5-check-$m.log 2>&1 && echo "[$(date -u '+%F %T')] check $m PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] check $m FAIL" >> ../logs/night.log
done
cp ../logs/B5-check-standalone.log /dev/null 2>/dev/null || true
cd ..
bash harness/cleanup-tmp-scripts.sh >> "$LOG" 2>&1 || true
{ echo "# ĐÁNH BÓNG 1 — bundle nộp"; for m in standalone ytgame playgama; do
    echo "- $m: $(grep -E 'KẾT QUẢ' logs/B5-check-$m.log 2>/dev/null | tail -1)"; done; } > logs/POLISH1.md
echo "[$(date -u '+%F %T')] ĐÁNH BÓNG 1 xong" >> "$LOG"
