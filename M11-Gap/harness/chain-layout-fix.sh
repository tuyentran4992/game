#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
LOG=$BASE/logs/night.log
# 1) chờ vòng đang chạy xong (1 người viết tại 1 thời điểm)
chay_phien() { local n=0; for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 240); do chay_phien || break; sleep 15; done
echo "[$(date -u '+%F %T')] LAYOUT-FIX bắt đầu (camera dọc 720x1420)…" >> "$LOG"
python3 harness/claude_step.py --batch B3c --step layout-fix --prompt B3c-layout-fix.md --max-turns 110 >> "$LOG" 2>&1
cd game
npx vitest run tests/logic/layout.test.ts > ../logs/B3c-layout-test.log 2>&1 && echo "[$(date -u '+%F %T')] layout.test: PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] layout.test: FAIL" >> ../logs/night.log
npm run gate > ../logs/B3c-gate.log 2>&1 && echo "[$(date -u '+%F %T')] B3c cổng: PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] B3c cổng: FAIL" >> ../logs/night.log
npm run build:standalone > ../logs/B3c-build.log 2>&1 && cp -r dist /tmp/pc-standalone && echo "[$(date -u '+%F %T')] build standalone lại: OK" >> ../logs/night.log
cd ..
bash harness/cleanup-tmp-scripts.sh >> "$LOG" 2>&1 || true
{ echo "# LAYOUT-FIX (camera dọc 720x1420)"; grep -E "Tests  |Test Files" logs/B3c-layout-test.log 2>/dev/null | tail -2
  grep -E "KẾT QUẢ|vi phạm" logs/B3c-gate.log 2>/dev/null | tail -2; } > logs/LAYOUT-FIX.md
echo "[$(date -u '+%F %T')] LAYOUT-FIX xong" >> "$LOG"
