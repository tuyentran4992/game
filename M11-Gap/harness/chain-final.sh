#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
chay_phien() { for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 240); do chay_phien || break; sleep 15; done
START=$(date +%s); echo "[$(date -u '+%F %T')] VÒNG CUỐI (G1/G3/registry/chấm) bắt đầu…" >> logs/night.log
python3 harness/claude_step.py --batch B3d --step 2c-final --prompt B3d-2c-final.md --max-turns 70 >> logs/night.log 2>&1
cd game
npx vitest run tests/logic/layout.test.ts > ../logs/B3d3-layout-test.log 2>&1 && echo "[$(date -u '+%F %T')] layout.test PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] layout.test FAIL" >> ../logs/night.log
npm run gate > ../logs/B3d3-gate.log 2>&1 && echo "[$(date -u '+%F %T')] cổng PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] cổng FAIL" >> ../logs/night.log
bash scripts/build-channels.sh > ../logs/B3d3-build-channels.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels FAIL" >> ../logs/night.log
# CHỐT ĐỘ MỚI của artifact: phải được build SAU khi phiên bắt đầu
echo "--- KIỂM ĐỘ MỚI (mtime phải > $START):" >> ../logs/night.log
for f in dist/index.html build/ytgame/index.html build/playgama/index.html; do
  MT=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$MT" -gt "$START" ]; then echo "    OK  $f mới ($(date -u -d @$MT '+%H:%M:%S'))" >> ../logs/night.log; else echo "    CŨ $f ($(date -u -d @$MT '+%H:%M:%S')) — KHÔNG tính là PASS" >> ../logs/night.log; fi
done
for m in standalone ytgame playgama; do
  [ "$m" = standalone ] && d=dist || d=build/$m
  node tools/check-bundle.mjs "$d" --channel $m > ../logs/B5-check-$m.log 2>&1 && echo "[$(date -u '+%F %T')] check $m PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] check $m FAIL" >> ../logs/night.log
done
cd ..
bash harness/cleanup-tmp-scripts.sh >> logs/night.log 2>&1 || true
{ echo "# VÒNG CUỐI"; grep -E "Tests  |Test Files" logs/B3d3-layout-test.log 2>/dev/null | tail -2
  grep -E "KẾT QUẢ|✗" logs/B3d3-gate.log 2>/dev/null | head -4
  grep -E "OK |CŨ " logs/night.log | tail -3
  for m in standalone ytgame playgama; do echo "- $m: $(grep -E 'KẾT QUẢ' logs/B5-check-$m.log 2>/dev/null | tail -1)"; done; } > logs/FINAL.md
echo "[$(date -u '+%F %T')] VÒNG CUỐI xong" >> logs/night.log
