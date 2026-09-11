#!/bin/bash
# Driver chạy M10 Banh Mi Master MVP bằng Claude Code + qwen3.8-flash (AI-Box) — lệnh boss 09/09
# An toàn: chỉ ghi trong /data/youtube-playables/M10-BanhMi-Master; không commit/push.
set -u
source /data/scripts/claude-code-env.sh
export ANTHROPIC_MODEL="qwen3.8-flash"
export ANTHROPIC_DEFAULT_SONNET_MODEL="qwen3.8-flash"
# giữ model phụ (title/small/haiku) = deepseek mặc định của env script
cd /data/youtube-playables/M10-BanhMi-Master
claude -p "$(cat specs/1-banh-mi-master/PROMPT.md)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Bash" \
  --max-turns 200 --output-format json \
  > run-qwen.log 2>&1
echo "CLAUDE_EXIT=$? at $(date -u +%FT%TZ)" >> run-qwen.status
tail -1 run-qwen.status
