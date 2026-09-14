#!/usr/bin/env bash
set -u
BASE=/data/youtube-playables/M11-Gap; cd "$BASE" || exit 1
chay_phien() { for p in /proc/[0-9]*; do c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null); case "$c" in *claude_step.py*) return 0;; esac; done; return 1; }
for i in $(seq 1 300); do chay_phien || break; sleep 15; done
START=$(date +%s); echo "[$(date -u '+%F %T')] BUGFIX HOẠT CẢNH (gấp/mở bung) bắt đầu…" >> logs/night.log
BEFORE=$(date +%s)
python3 harness/claude_step.py --batch B3e --step animfix --prompt BUGFIX-ANIM.md --max-turns 90 >> logs/night.log 2>&1; RC=$?
# CHỐT: phiên phải THẬT SỰ chạy (rc=0 + có stream đụng tới sau BEFORE), nếu không thì DỪNG chuỗi
STREAM=$(ls -t logs/B3e-*.stream.jsonl 2>/dev/null | head -1)
SM=0; [ -n "$STREAM" ] && SM=$(stat -c %Y "$STREAM" 2>/dev/null || echo 0)
if [ "$RC" -ne 0 ] || [ "$SM" -lt "$BEFORE" ]; then
  if [ "$SM" -lt "$BEFORE" ]; then MSG="phiên KHÔNG hề chạy (rc=$RC)"; else MSG="phiên có chạy nhưng KHÔNG hoàn tất sạch (rc=$RC — thường là hết trần lượt)"; fi
echo "[$(date -u '+%F %T')] DỪNG CHUỖI: $MSG, stream=$STREAM — không chạy cổng/build trên trạng thái dở" >> logs/night.log
  exit 1
fi
cd game
npm run gate > ../logs/B3e-gate.log 2>&1 && echo "[$(date -u '+%F %T')] cổng PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] cổng FAIL" >> ../logs/night.log
bash scripts/build-channels.sh > ../logs/B3e-build.log 2>&1 && echo "[$(date -u '+%F %T')] build-channels OK" >> ../logs/night.log || echo "[$(date -u '+%F %T')] build-channels FAIL" >> ../logs/night.log
for f in dist/index.html build/ytgame/index.html build/playgama/index.html; do
  MT=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$MT" -gt "$START" ]; then echo "    OK  $f mới" >> ../logs/night.log; else echo "    CŨ $f — không tính PASS" >> ../logs/night.log; fi
done
for m in standalone ytgame playgama; do
  [ "$m" = standalone ] && d=dist || d=build/$m
  node tools/check-bundle.mjs "$d" --channel $m > ../logs/B5-check-$m.log 2>&1 && echo "[$(date -u '+%F %T')] check $m PASS" >> ../logs/night.log || echo "[$(date -u '+%F %T')] check $m FAIL" >> ../logs/night.log
done
cd ..
bash harness/cleanup-tmp-scripts.sh >> logs/night.log 2>&1 || true
{ echo "# BUGFIX HOẠT CẢNH"; grep -E "KẾT QUẢ" logs/B3e-gate.log 2>/dev/null | tail -1; grep -E "OK |CŨ " logs/night.log | tail -3; for m in standalone ytgame playgama; do echo "- $m: $(grep -E 'KẾT QUẢ' logs/B5-check-$m.log 2>/dev/null | tail -1)"; done; } > logs/ANIMFIX.md
echo "[$(date -u '+%F %T')] BUGFIX HOẠT CẢNH xong" >> logs/night.log
