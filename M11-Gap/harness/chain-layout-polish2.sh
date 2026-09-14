#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
chay_phien() { for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 240); do chay_phien || break; sleep 15; done
echo "[$(date -u '+%F %T')] ĐÁNH BÓNG LAYOUT 2 bắt đầu…" >> "$LOG"
python3 harness/claude_step.py --batch B3d --step layout-polish2 --prompt B3c-layout-polish2.md --max-turns 90 >> "$LOG" 2>&1
cd game
npx vitest run tests/logic/layout.test.ts > ../logs/B3d-layout-test.log 2>&1 && echo "[$(date -u '+%F %T')] layout.test: PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] layout.test: FAIL" >> ../logs/night.log
npm run gate > ../logs/B3d-gate.log 2>&1 && echo "[$(date -u '+%F %T')] B3d cổng: PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] B3d cổng: FAIL" >> ../logs/night.log
bash scripts/build-channels.sh > ../logs/B3d-build-channels.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels FAIL" >> ../logs/night.log
cd ..
bash harness/cleanup-tmp-scripts.sh >> "$LOG" 2>&1 || true
{ echo "# ĐÁNH BÓNG LAYOUT 2"; grep -E "Tests  |Test Files" logs/B3d-layout-test.log 2>/dev/null | tail -2; grep -E "KẾT QUẢ" logs/B3d-gate.log 2>/dev/null | tail -1; } > logs/LAYOUT2.md
echo "[$(date -u '+%F %T')] ĐÁNH BÓNG LAYOUT 2 xong" >> "$LOG"
