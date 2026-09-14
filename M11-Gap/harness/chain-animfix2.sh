#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
chay_phien() { for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 300); do chay_phien || break; sleep 15; done
BEFORE=$(date +%s); echo "[$(date -u '+%F %T')] HOÀN TẤT HOẠT CẢNH (vòng nối) bắt đầu…" >> logs/night.log
python3 harness/claude_step.py --batch B3e --step animfix2 --prompt BUGFIX-ANIM-2-finish.md --max-turns 120 >> logs/night.log 2>&1; RC=$?
STREAM=$(ls -t logs/B3e-animfix2.stream.jsonl 2>/dev/null | head -1); SM=0
[ -n "$STREAM" ] && SM=$(stat -c %Y "$STREAM" 2>/dev/null || echo 0)
if [ "$RC" -ne 0 ]; then
  if [ "$SM" -lt "$BEFORE" ]; then M="phiên KHÔNG hề chạy (rc=$RC)"; else M="phiên có chạy nhưng chưa xong sạch (rc=$RC)"; fi
  echo "[$(date -u '+%F %T')] DỪNG CHUỖI: $M — không chạy cổng/build trên trạng thái dở" >> logs/night.log; exit 1
fi
cd game
npm run gate > ../logs/B3e2-gate.log 2>&1 && echo "[$(date -u '+%F %T')] cổng PASS" >> ../logs/night.log || { echo "[$(date -u '+%F %T')] cổng FAIL" >> ../logs/night.log; exit 1; }
bash scripts/build-channels.sh > ../logs/B3e2-build.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels FAIL" >> ../logs/night.log
for f in dist/index.html build/ytgame/index.html build/playgama/index.html; do
  MT=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$MT" -gt "$BEFORE" ]; then echo "    OK  $f mới" >> ../logs/night.log; else echo "    CŨ $f — không tính PASS" >> ../logs/night.log; fi
done
for m in standalone ytgame playgama; do
  [ "$m" = standalone ] && d=dist || d=build/$m
  node tools/check-bundle.mjs "$d" --channel $m > ../logs/B5-check-$m.log 2>&1 && echo "[$(date -u '+%F %T')] check $m PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] check $m FAIL" >> ../logs/night.log
done
cd ..
bash harness/cleanup-tmp-scripts.sh >> logs/night.log 2>&1 || true
{ echo "# HOÀN TẤT HOẠT CẢNH"; grep -E "Tests  |Test Files|KẾT QUẢ" logs/B3e2-gate.log 2>/dev/null | tail -3; grep -E "OK |CŨ " logs/night.log | tail -3; for m in standalone ytgame playgama; do echo "- $m: $(grep -E 'KẾT QUẢ' logs/B5-check-$m.log 2>/dev/null | tail -1)"; done; } > logs/ANIMFIX2.md
echo "[$(date -u '+%F %T')] HOÀN TẤT HOẠT CẢNH xong" >> logs/night.log
