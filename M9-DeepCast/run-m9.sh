#!/bin/bash
# Driver chạy M9 Deep Cast MVP bằng Claude Code + glm-5.3-flash (AI-Box)
# An toàn: chỉ ghi trong /data/youtube-playables/M9-DeepCast; không commit/push.
set -u
source /data/scripts/claude-code-env.sh
export ANTHROPIC_MODEL="zai-org/glm-5.3-flash"
export ANTHROPIC_DEFAULT_SONNET_MODEL="zai-org/glm-5.3-flash"
# giữ model phụ (title/small) = deepseek mặc định của env script — glm-5.3-flash bị từ chối ở query_source title
cd /data/youtube-playables/M9-DeepCast
claude -p "$(cat specs/1-deep-cast/PROMPT.md)" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Bash" \
  --max-turns 200 --output-format json \
  > run-glm.log 2>&1
echo "CLAUDE_EXIT=$? at $(date -u +%FT%TZ)" >> run-glm.status
echo "CLAUDE_EXIT=$?"
