# M3 "Potion Panic" (v2) — CLAUDE.md (hướng dẫn agent code)

> ⛔ **TRẠNG THÁI 27/08: v2 ĐÃ HỦY — chơi chán (fun gate fail), không code bản này.** File giữ cho lịch sử. Nếu làm hướng khác, tạo `specs/3-<tentru>/` + CLAUDE.md mới.
> **BẢN NÀY THAY CLAUDE.md v1.** v1 (trái cây Suika-style) bị Playgama reject vì clone — xem `specs/README.md`.

## Project
- Game **physics-merge volatility-management**: thả 3 nguyên tố (Fire/Water/Earth) vào **nồi đồng hình cong**, merge cùng nhánh (3x4), orb bậc cao **tích nhiệt → BURN BREW nổ dây chuyền**, **Stir** xả nhiệt, phục vụ **Orders**, **Philosopher's Stone** fusion.
- **Nguồn sự thật (đọc theo thứ tự):** `specs/2-potion-panic/SPEC.md` (BR PP-01..19, §0 anti-clone) → `DESIGN-SPEC.md` (visual + art đường A/B) → `DATA-MODEL.md` (elements graph, heat.ts, stages v2, save v3 migration) → `TEST-CASES.md` (GL2-* phải PASS).
- Codebase hiện tại (`game/`) là nền v1 — **nâng cấp tại chỗ, không fork**: giữ engine physics/settle/rng/save, đổi chain → graph, THÊM heat.ts + orders, alias rename obstacles/powerups (DATA-MODEL §5 — logic không đổi).

## Stack & lệnh (pnpm, KHÔNG npm)
- `pnpm typecheck` (0 lỗi) · `npx vitest run <file>` (TỪNG FILE một — vitest hàng loạt hay hang) · `pnpm build` · `pnpm build:playgama`
- Gate: `bash ../../scripts/verify_game.sh M3-Juicy-Merge` từ repo root.
- Anti-clone grep (BẮT BUỘC trước bàn giao): `grep -riE "cherry|watermelon|suika|juicy" game/dist/` → rỗng.

## Quy tắc BẮT BUỘC
1. UI text 100% tiếng ANH. Không còn từ/trái cây kawaii màu pastel v1 trong build.
2. Plan chia BƯỚC nhỏ, mỗi bước verify được độc lập (vitest/typecheck/build/browser). Không code 1 lèo.
3. TDD logic thuần: heat.ts, elements.ts viết test TRƯỚC (GL2-01..30).
4. Save: schema v3 + migration v2 GIỮ NGUYÊN sao/unlock (GL2-50).
5. SDK: gửi Game Ready + saveData/sendScore qua `@game/sdk` (lý do reject Playgama phổ biến — SPEC §9).
6. Mute + minimize-pause-audio + globe lang: wire đủ (PP-15).
7. Không commit/push khi chưa có lệnh. Báo kết quả bằng số liệu (test pass, typecheck, build).
8. Art: mặc định đường **A — programmatic Graphics** (pattern M4 neon) + audio synth Web Audio; đường B (WAN sprite) chỉ khi anh Tuyền duyệt.
