#!/usr/bin/env bash
# Runner SWARM cho 1 batch: test (N con song song) → code (1 con) → cổng máy → review (3 con song song, 3 góc).
# Dùng: bash run-swarm.sh <BATCH> <pid_cho|0> <max_turns_code>
#   - Nếu có prompts/<BATCH>-1a-tests.md & -1b-tests.md ⇒ chạy 2 con test song song; nếu chỉ có -1-tests.md ⇒ 1 con.
#   - Bước test có thể đã chạy sẵn (pid_cho>0 ⇒ chờ nó xong, tái dùng kết quả).
set -u
BATCH="${1:-B1a}"; WAIT_PID="${2:-0}"; MAXT="${3:-80}"
BASE=/data/youtube-playables/M11-Gap; LOG="$BASE/logs"; mkdir -p "$LOG"
CHAIN="$LOG/chain-$BATCH.log"
export PATH="/data/.local/share/pnpm/bin:$PATH"
source /data/scripts/claude-env.sh
[ -z "${ANTHROPIC_BASE_URL:-}" ] && { echo "LỖI: env Claude không nạp" >> "$CHAIN"; exit 2; }

log(){ echo "[$(date -u '+%F %T')] $*" >> "$CHAIN"; }

# CHỐNG CHẠY TRÙNG: chỉ 1 chuỗi cho mỗi batch được phép sống (bài học 13/09: kill wrapper KHÔNG giết con
# → 2 chuỗi cũ mọc lại chạy song song với chuỗi mới ⇒ 3 agent cùng sửa src/).
exec 9>"$LOG/.chain-$BATCH.lock"
if ! flock -n 9; then log "ĐÃ CÓ chuỗi $BATCH đang chạy → bỏ qua lần gọi này"; exit 7; fi
run(){ # $1 prompt file, $2 logname, $3 max-turns
  local pf="$BASE/prompts/$1"
  [ -f "$pf" ] || { log "THIẾU PROMPT $pf → dừng"; return 9; }
  ( cd "$BASE/game" && claude --bare -p "$(cat "$pf")" --model qwen3.8-flash --max-turns "$3" --verbose ) > "$LOG/$BATCH-$2.log" 2>&1
  log "END $2 exit=$? (logs/$BATCH-$2.log)"
}

log "=== BẮT ĐẦU chuỗi swarm $BATCH ==="
if [ "$WAIT_PID" != "0" ]; then
  log "chờ bước test PID $WAIT_PID xong…"
  while [ -d "/proc/$WAIT_PID" ]; do sleep 20; done
  log "bước test kết thúc (dùng lại kết quả sẵn có)"
elif [ "${SKIP_TESTS:-0}" != "1" ]; then
  # Tự chạy bước test: 2 con song song nếu có 1a/1b, ngược lại 1 con
  if [ -f "$BASE/prompts/$BATCH-1a-tests.md" ]; then
    log "BƯỚC 1: 2 con test SONG SONG (chia theo file, không đụng nhau)"
    run "$BATCH-1a-tests.md" "1a-tests" 60 &
    run "$BATCH-1b-tests.md" "1b-tests" 60 &
    wait
  elif [ -f "$BASE/prompts/$BATCH-1-tests.md" ]; then
    log "BƯỚC 1: 1 con test"
    run "$BATCH-1-tests.md" "1-tests" 60
  fi
else
  log "SKIP_TESTS=1 → dùng file test sẵn có"
fi

# Cổng vào: phải có file test
n=$(ls "$BASE"/game/tests/logic/*.test.ts 2>/dev/null | wc -l)
[ "$n" -eq 0 ] && { log "DỪNG: không có file test"; exit 3; }
log "có $n file test → BƯỚC 2: code (1 con, bắt buộc 1 tác giả)"
if [ "${FIX_PROMPT:-}" != "" ]; then
  log "chế độ FIX: chạy $FIX_PROMPT (thay vì prompt code)"
  run "$FIX_PROMPT" "2b-fix" "$MAXT"
elif [ "${SKIP_CODE:-0}" = "1" ]; then
  log "SKIP_CODE=1 → bỏ qua bước code"
else
  run "$BATCH-2-code.md" "2-code" "$MAXT"
fi

log "CỔNG máy: typecheck + test:logic"
if ( cd "$BASE/game" && npm run typecheck && npm run test:logic ) > "$LOG/$BATCH-gate.log" 2>&1; then
  log "CỔNG PASS → BƯỚC 3: 3 phiên review SONG SONG (code · fuzz/purity · kiến trúc)"
  run "$BATCH-3a-review-code.md" "3a-review-code" 40 &
  run "$BATCH-3b-review-fuzz.md" "3b-review-fuzz" 45 &
  run "$BATCH-3c-review-arch.md" "3c-review-arch" 40 &
  wait
  log "3 phiên review xong → CHUỖI XONG $BATCH (chờ Hermes đọc + verify ở mốc)"
else
  log "CỔNG FAIL (logs/$BATCH-gate.log) → DỪNG, cần 1 vòng fix"
  exit 5
fi
