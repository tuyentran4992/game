#!/bin/bash
# Driver bugfix M10 — Claude Code + qwen3.8-flash (pattern run-m10.sh — lệnh boss 09/09)
# An toàn: chỉ ghi trong game/src, game/tests; không commit/push.
set -u
source /data/scripts/claude-code-env.sh
export ANTHROPIC_MODEL="qwen3.8-flash"
export ANTHROPIC_DEFAULT_SONNET_MODEL="qwen3.8-flash"
cd /data/youtube-playables/M10-BanhMi-Master
claude -p "$(cat specs/1-banh-mi-master/BUGFIX-PROMPT-1.md)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Bash" \
  --max-turns 80 --output-format json \
  > run-bugfix1.log 2>&1
echo "CLAUDE_EXIT=$? at $(date -u +%FT%TZ)" >> run-bugfix1.status
tail -1 run-bugfix1.status
