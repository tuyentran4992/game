# CLAUDE.md — M2 Color Sort ("Neon Sort: Galaxy Pour")

Tuân thủ khi code trong repo này.

## Vai trò
- **PM/QA = Hermes** (người giao task). DEV = bạn. Anh Tuyền = chủ dự án.
- Bạn nhận SPEC từ PM, code theo đúng, tự verify.

## Nguồn sự thật (đọc trước khi làm)
1. `SPEC.md` — gameplay/luật/level/data-testid (M2-01..11).
2. `DESIGN-SPEC.md` — visual Neon Galaxy cụ thể (bắt buộc đọc trước khi code UI).
3. `DATA-MODEL.md` — board state / level generator / saved-game schema.
4. `../docs/DESIGN-SYSTEM.md` — token UI chrome chung (convention token DẤU CHẤM: `color.primary`, `type.display`, `sp.4`, `radius.md`, `shadow.btn`, `dur.pop`, `z.40`).

## Cấu trúc code
- Game Phaser 3 + TS + vite trong `game/`.
- Logic thuần (không phụ thuộc Phaser) để test dễ: `game/src/logic/` (board, move, win, generator).
- Scenes: Start → Gameplay (board ống) → Level Clear popup.
- `data-testid` theo SPEC §5: `start-btn`, `level-label`, `move-count`, `board`, `tube-<i>`, `undo-btn`, `restart-btn`, `hint-btn`, `next-level-btn`.

## Ràng buộc
- **CẤM commit/push** git. Chỉ sửa `game/`.
- KHÔNG gọi mạng ngoài, KHÔNG ads bên thứ 3 — chỉ ytgame SDK (`sdk-handler`). Game chạy local không SDK cũng không crash.
- LUẬT ĐỔ (M2-01): chỉ đổ khi đích trống hoặc (đủ chỗ VÀ đỉnh đích cùng màu). Win = mỗi ống 1 màu/trống (M2-02). Board LUÔN giải được (sinh ngược, M2-04). Không thua (M2-03).
- Undo/Restart (M2-05), Rewarded hint/extra-tube (M2-06), interstitial giữa level (M2-07), save/score qua SDK (M2-08).
- Trả lời tiếng Việt, báo SỐ LIỆU verify (test pass/build/tsc).