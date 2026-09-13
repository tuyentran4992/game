#!/usr/bin/env bash
# Orchestrator M11-Gap — đọc HARNESS.yaml qua harness/claude_step.py.
# Dùng: bash harness/orchestrate.sh <batch> [<pid cần chờ>] [variant]
#   batch  vd B1b ; pid  = chờ tiến trình test đang chạy ngoài (0 = không chờ)
set -u
BATCH=${1:?thiếu batch}; WAIT_PID=${2:-0}; VARIANT=${3:-}
BASE=/data/youtube-playables/M11-Gap; LOG=$BASE/logs; CHAIN=$LOG/chain-$BATCH.log
cd "$BASE" || exit 1
mkdir -p "$LOG"

# 1 chuỗi / batch
exec 9>"$LOG/.chain-$BATCH.lock"
if ! flock -n 9; then echo "[$(date -u '+%F %T')] ĐÃ CÓ chuỗi $BATCH chạy → bỏ qua" >> "$CHAIN"; exit 7; fi
log(){ echo "[$(date -u '+%F %T')] $*" >> "$CHAIN"; }

# chạy 1 bước qua harness (có đo metrics)
step(){ # <tên> <prompt file> <max-turns> [mode]
  local name=$1 prompt=$2 max=$3 mode=${4:-edit}
  local args=(--batch "$BATCH" --step "$name" --prompt "$prompt" --max-turns "$max" --mode "$mode")
  [ -n "$VARIANT" ] && args+=(--variant "$VARIANT")
  [ -n "${PACK:-}" ] && args+=(--pack "$PACK")
  log "START $name (prompt=$prompt max-turns=$max mode=$mode variant=${VARIANT:-default})"
  if STEP_TIMEOUT=${STEP_TIMEOUT:-3600} python3 harness/claude_step.py "${args[@]}" >> "$CHAIN" 2>&1; then
    log "END $name ok"
  else
    log "END $name exit!=0 (xem $LOG/$BATCH-$name.log)"
  fi
}

log "=== BẮT ĐẦU chuỗi $BATCH (variant=${VARIANT:-default}) ==="

# ---------- BƯỚC TEST (swarm: mỗi con 1 file, không đụng nhau) ----------
if [ "${SKIP_TESTS:-0}" != "1" ]; then
  if [ -f "prompts/$BATCH-1a-tests.md" ] && [ -f "prompts/$BATCH-1b-tests.md" ]; then
    log "BƯỚC TEST: 2 con song song"
    ( step 1a-tests "$BATCH-1a-tests.md" 90 ) & p1=$!
    ( step 1b-tests "$BATCH-1b-tests.md" 90 ) & p2=$!
    wait $p1 $p2
  elif [ -f "prompts/$BATCH-1-tests.md" ]; then
    log "BƯỚC TEST: 1 con"; step 1-tests "$BATCH-1-tests.md" 90
  else
    log "BƯỚC TEST: không có prompt → bỏ qua"
  fi
fi

# ---------- BƯỚC CODE (1 tác giả) hoặc FIX ----------
if [ "${FIX_PROMPT:-}" != "" ]; then
  log "CHẾ ĐỘ FIX: $FIX_PROMPT"
  step 2b-fix "$FIX_PROMPT" "${FIX_TURNS:-70}" ${FIX_MODE:-edit}
elif [ "${SKIP_CODE:-0}" = "1" ]; then
  log "SKIP_CODE=1 → bỏ qua"
else
  step 2-code "$BATCH-2-code.md" 80
fi

# ---------- CỔNG MÁY ----------
log "CỔNG máy (HARNESS.yaml:gate)"
if ( cd game && npm run typecheck && npm run test:logic ) > "$LOG/$BATCH-gate.log" 2>&1; then
  log "CỔNG PASS"
else
  log "CỔNG FAIL ($LOG/$BATCH-gate.log) → DỪNG, cần 1 vòng fix"; exit 5
fi

# ---------- BƯỚC REVIEW (swarm 3 phiên SONG SONG) ----------
[ "${SKIP_REVIEW:-0}" = "1" ] && { log "SKIP_REVIEW=1 → xong"; exit 0; }
for s in 3a-code 3b-stress 3c-arch; do
  [ -f "prompts/$BATCH-$s.md" ] || { log "thiếu prompts/$BATCH-$s.md → bỏ qua review $s"; continue; }
done
log "REVIEW: 3 phiên song song (chỉ đọc)"
export PACK=harness/packs/review-general.md
( step 3a-code   "$BATCH-3a-code.md"   30 readonly ) & r1=$!
( step 3b-stress "$BATCH-3b-stress.md" 30 readonly ) & r2=$!
( step 3c-arch   "$BATCH-3c-arch.md"   30 readonly ) & r3=$!
wait $r1 $r2 $r3
log "CHUỖI XONG $BATCH — chờ Hermes đọc 3 báo cáo review"
