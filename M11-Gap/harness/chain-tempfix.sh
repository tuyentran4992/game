#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
chay_phien() { for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 240); do chay_phien || break; sleep 15; done
echo "[$(date -u '+%F %T')] DỌN TEST TẠM + xác nhận layout bắt đầu…" >> logs/night.log
python3 harness/claude_step.py --batch B3d --step 2b-fix-temp --prompt B3d-2b-fix-temp.md --max-turns 60 >> logs/night.log 2>&1
cd game
npx vitest run tests/logic/layout.test.ts > ../logs/B3d2-layout-test.log 2>&1 && echo "[$(date -u '+%F %T')] layout.test PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] layout.test FAIL" >> ../logs/night.log
npm run gate > ../logs/B3d2-gate.log 2>&1 && echo "[$(date -u '+%F %T')] cổng PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] cổng FAIL" >> ../logs/night.log
bash scripts/build-channels.sh > ../logs/B3d2-build-channels.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels FAIL" >> ../logs/night.log
for m in standalone ytgame playgama; do
  [ "$m" = standalone ] && d=dist || d=build/$m
  node tools/check-bundle.mjs "$d" --channel $m > ../logs/B5-check-$m.log 2>&1 && echo "[$(date -u '+%F %T')] check $m PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] check $m FAIL" >> ../logs/night.log
done
cd ..
bash harness/cleanup-tmp-scripts.sh >> logs/night.log 2>&1 || true
{ echo "# DỌN TEST TẠM + xác nhận layout"; grep -E "Tests  |Test Files" logs/B3d2-layout-test.log 2>/dev/null | tail -2; grep -E "KẾT QUẢ" logs/B3d2-gate.log 2>/dev/null | tail -1; for m in standalone ytgame playgama; do echo "- $m: $(grep -E 'KẾT QUẢ' logs/B5-check-$m.log 2>/dev/null | tail -1)"; done; } > logs/TEMPFIX.md
echo "[$(date -u '+%F %T')] DỌN TEST TẠM xong" >> logs/night.log
