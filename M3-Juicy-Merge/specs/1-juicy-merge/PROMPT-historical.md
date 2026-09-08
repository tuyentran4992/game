# PROMPT lịch sử — giao Claude (GLM-5.3 qua CLI) lập plan build M3 "Juicy Merge: Fruit Pop"
# Nguồn: session @session:default/20260823_024234_b373ef99, 23/08/2026 ~07:16 UTC
# File gốc /tmp/m3-plan-prompt.md (đã mất vì /tmp volatile — bản này khôi phục từ transcript)
# Cách chạy hồi đó:
#   cd /data/youtube-playables && source /data/scripts/claude-env.sh glm \
#     && export ANTHROPIC_MODEL="ZHIPU/GLM-5.3" \
#     && export CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1 \
#     && claude -p "$(cat /tmp/m3-plan-prompt.md)" --max-turns 60 > /tmp/m3-plan-output.md

---

Bạn là chuyên gia Phaser 3 game dev. Lập PLAN xây game **"Juicy Merge: Fruit Pop"** (physics-merge kiểu Suika/Watermelon) cho YouTube Playables.

## Nguồn (đọc TRƯỚC)
- `M3-Juicy-Merge/SPEC.md` — cơ chế, BR M3-01..12, state §7
- `M3-Juicy-Merge/DESIGN-SPEC.md` — visual, bảng 12 trái cây §6, mockup §3
- `M3-Juicy-Merge/DATA-MODEL.md` — config yaml, physics, RNG, save
- `M3-Juicy-Merge/games/juicy-merge.yaml` — assets, chain, score, physics
- `M3-Juicy-Merge/TEST-CASES.md` — logic GC-01..14 cần PASS (vitest)
- `M3-Juicy-Merge/CLAUDE.md` — stack, lệnh, quy tắc bắt buộc
- Code khung hiện có: `src/main.ts`, `src/scenes/{Start,Gameplay}.ts`, `src/logic/merge-engine.ts`, `src/tokens.ts`, `src/ui.ts`, `src/context.ts`, `src/sdk-handler.ts`

## YÊU CẦU: LẬP PLAN CHI TIẾT, KHÔNG CODE
Chia công việc thành các **BƯỚC nhỏ**, mỗi bước PHẢI có:
1. **Mục tiêu** (1 câu rõ)
2. **File dự kiến đổi/tạo** (cụ thể)
3. **CÁCH VERIFY bước đó** mà PM chạy được độc lập — một trong: (a) test logic vitest (GC-xx), (b) `pnpm typecheck`, (c) `pnpm build`, (d) `bash ../../scripts/verify_game.sh M3-Juicy-Merge`, (e) mở browser + vision nhìn màn cụ thể.

Các bước phải phủ:
- Logic pure (merge-engine): chain 12 trái, merge 2 cùng loại → bậc kế, score bảng, combo, RNG deterministic, game-over check (settle + trên vạch), continue ≤1 lần, best-score save — + TEST vitest GC-01..14 (TDD).
- Physics: bucket, thả trái, rơi Matter.js body tròn, merge vật lý, vạch danger, game over khi settle.
- Scenes: Start / Gameplay / GameOver (+rewarded continue, interstitial lần 2+).
- Assets raw (sprite 12 trái + bucket + bg + audio), build, zip, verify cuối.

## Đầu ra
Trả về plan dạng markdown: danh sách BƯỚC có thứ tự + phụ thuộc, mỗi bước đủ 3 yếu tố trên. Ước lượng tổng số bước. KHÔNG code file nào. Trả lời tiếng Việt, cô đọng.
