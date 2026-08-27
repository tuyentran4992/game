# M3 Juicy Merge — CLAUDE.md (hướng dẫn agent code)

## Project
- Game **physics-merge kiểu Suika/Watermelon** cho YouTube Playables: thả trái cây, 2 cùng loại chạm → gộp bậc kế (chain 12 trái cherry→watermelon), vạch danger + game over, rewarded "Tiếp tục" ≤1 lần.
- **Nguồn sự thật:** đọc `SPEC.md` (cơ chế + BR M3-01..12 + state §7) + `DESIGN-SPEC.md` (visual, bảng 12 trái §6) + `DATA-MODEL.md` (config yaml, physics, RNG, save).
- **Nguồn config:** `games/juicy-merge.yaml` (assets, chain, score, physics).
- **Test-case cần đạt:** `TEST-CASES.md` (logic GC-01..14 phải PASS qua vitest).

## Stack & lệnh
- Phaser 3 + TS + vite. **Package manager = pnpm** (KHÔNG dùng npm).
  - install: `pnpm install`
  - typecheck: `pnpm typecheck` (= `tsc --noEmit`, PHẢI 0 lỗi)
  - test logic: `pnpm test` (= `vitest run`)
  - build: `pnpm build` (= `vite build`)
  - verify đầy đủ: `bash ../../scripts/verify_game.sh M3-Juicy-Merge` (từ repo root)

## Cấu trúc
- `src/main.ts` — boot, register scenes, sdk
- `src/scenes/{Start,Gameplay,GameOver}.ts`
- `src/logic/merge-engine.ts` — logic THUẦN testable (merge, score, RNG, game-over, continue)
- `src/sdk-handler.ts` + `sdk-instance.ts` — wrapper Playables SDK (đã có, tái dùng)
- `src/tokens.ts` + `src/ui.ts` — design token + component core (đã có)
- `src/context.ts` — chia sẻ context (engine + sdk)

## Quy tắt BẮT BUỘC (anh Tuyền chốt 2026-08-23)
1. **UI text 100% tiếng ANH** (Play/Retry/Continue/SCORE/BEST/NEW RECORD...). Tiếng Việt chỉ ở SPEC/comment.
2. **Plan trước, không code 1 lèo:** chia thành BƯỚC nhỏ. MỖI BƯỚC có CÁCH VERIFY được (test logic / `pnpm typecheck` / `pnpm build` / mở browser). Bước nào không verify được độc lập → KHÔNG bàn giao bước đó.
3. **Chất lượng THƯƠNG MẠI**, không phải demo — bản nộp phải chạy được từ zip, không lỗi, đẹp.
4. TDD: viết test logic (vitest) TRƯỚC khi code — RED→GREEN.
5. Không commit/push code khi chưa có lệnh; chỉ báo kết quả bằng số liệu (số test pass / typecheck / build).

## 📱 MOBILE-FIRST (BẮT BUỘC — anh Tuyền nhấn mạnh 2026-08-23, "M1 chơi mobile rất khó")
- **World portrait-first:** camera 720×1280 (9:16) — M1 dùng 1920×1080 ngang → chơi mobile chật/kho. Game phải tối ưu cho dọc, desktop tự pillarbox.
- **Input by touch là chính:** ghost trái theo ngón tay (không chuột), vùng chạm ≥ 44px, thả = chạm/nhả. KHÔNG dựa hover chuột.
- **Trái/ghost vừa tay:** kích thước sprite/physics (bảng §6 DESIGN-SPEC) scale theo bucket mobile.
- **HUD/nút lớn, không che gameplay:** nút Continue/Retry ≥ 96px cao, khoảng cách đủ tránh chạm nhầm.
- **Bố cục bucket chiếm chủ yếu màn dọc,** vạch danger/vùng thả dễ với tay cầm 1 tay.
- Responsive vẫn hỗ trợ desktop (Scale.FIT + pillarbox) nhưng mọi thứ đo theo chuẩn mobile trước.
- Verify mobile cụ thể ở bước 9, 15: mở browser chế độ device emulation mobile (9:16) + vision xác nhận không đè/chật.

## Rewarded/Interstitial — semantics (anh Tuyền chốt 2026-08-23)
- **THEO LƯỢT:** mỗi lần "Chơi lại" = lượt mới → Rewarded "Continue" được lại 1 lần/lượt (M3-05). Interstitial từ lượt 2+ (M3-07). KHÔNG tính theo phiên app.
- `playCount` reset mỗi lượt mới. GC-12 test theo semantics này.

## Gameplay cốt (SPEC M3 §4)
- Thả trái từ đỉnh bucket → rơi theo **Matter.js** (body tròn, có sẵn Phaser) → 2 cùng loại chạm → merge bậc kế.
- Vạch danger ~20% đỉnh bucket. Game over khi (vật lý settle) VÀ (có trái trên vạch). Không game over khi đang rơi ngang vạch.
- Score theo `score_per_tier`. Combo merge liên tiếp.
- Rewarded "Continue" ≤1 lần/lượt (M3-05). Interstitial từ lần 2+ (M3-07).
- RNG seed trước → deterministic (M3-04).
- `saveData`/`sendScore` best-score (M3-08). Cấm mạng ngoài.