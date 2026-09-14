Bạn là dev TypeScript. **VÒNG TỰ SỬA** cho batch B3a (đợt rev1).

Review độc lập báo FAIL đúng các mục sau (kèm bằng chứng sẵn). Sửa ĐÚNG các mục này, giữ nguyên thứ đã PASS:

[3a-code] | C2 | FAIL | 3 file view B3a KHÔNG dựng scene nào: `grep "src/render/scenes|components|makeButton" tests/` = 0 import runtime. Oracle là quét text: view-b3a-timing.test.ts:296-303 `expect(sceneSource()).toContain('timerOn')`, contract.test.ts:178-181 chỉ kiểm tra **substring** của 20 tên testid trong source ⇒ code cảnh chết vẫn xanh |
[3a-code] | C6 | FAIL | PC-05 (PlayScene:228-236,282-286) · PC-09 (:323-332) · PC-13 (:175-176,308-316) · PC-17 (:119-125) · PC-19 (:168-172) cài đúng. NHƯNG PC-L-01/DS:120 KHÔNG cài cho toàn bộ chương 1: unfoldPlan.ts:111 `LEGAL_LAYERS=[4,8]` trong khi progression.ts:46 `layers:2` → chapters.ts:114 foldCount=1 → `2**1=2` lớp → PlayScene:256-259 nhận `plan=null` rồi `finish()` ⇒ 15/120 màn không mở bung, không pop lỗ (tờ giấy đứng yên ở trạng thái folded) |
[3a-code] | C9 | FAIL | Trần hình học của logic là MAX_CHAIN_LEN=4 (chainTable.ts:34 'DHVH' → 16 lớp) — cũng rơi khỏi LEGAL_LAYERS ⇒ cùng chế độ "không có hoạt cảnh". Số lỗ >8 bị cắt mờ ở PlayScene:253 (`Math.min(MAX_HOLES, points.length)`) + pool 8 Arc (SheetView:92, OptionCard:40) mà không báo. Hợp lệ: levelIndex ngoài dải → Title (:111-115), index ô dùng `?.` (:230) |
[3a-code] | C10 | FAIL | Code chết thật: PlayScene.ts:434-436 `natural()` 0 call site; SheetView.ts:286-289 `settle()` 0 call site — và chính việc không gọi nó gây lỗi sau: slideOut đặt `alpha:0` (SheetView:282) nhưng `relayout` (:223-234) không khôi phục ⇒ **từ màn thứ 2 tờ giấy vô hình vĩnh viễn** (PlayScene:330-331 gọi slideOut→openSpec→arrange) |
[3b-stress] | C6 | FAIL | PC-05 buffer là **code chết**: `PlayScene.ts:282-286` flush chỉ chạy khi phase==='ready' nhưng `finish()` luôn ở correct/wrong ⇒ đo `pending=null, replay=[]`; PC-17 pause handler không nối lại đúng vòng đời (`PlayScene.ts:118-125` vs `teardown:376-380`) |
[3b-stress] | C9 | FAIL | `unfoldPlan.ts` `layersOf` làm tròn xuống 2^n nhưng `PlayScene.ts:252` luôn đưa 4/8; input 2 lớp (foldCount 1) → `unfoldTimeline` null → `reveal():258-260` bỏ trống animation, vào `finish()` tức thì (không crash nhưng mất lịch DS:120) |
[3b-stress] | C10 | FAIL | code chết: `SheetView.ts:286 settle()` (0 call site), `PlayScene.ts:434 natural()` (0 call site), `testids.ts Hook` type dùng 1 lần |
[3b-stress] | F2 | FAIL | `advanceClock(st,-1)` ném `ms phải hữu hạn và không âm` (logic chặn đúng) NHƯNG `PlayScene.ts:324 nextLevel` + `:304 useUndo` không guard ⇒ input trùng lặp ném thẳng ra handler |
[3b-stress] | F8 | FAIL | test tự tính lại implementation: `view-b3a-timing.test.ts:172` `expect(plan.explainMs).toBe(DUR.sweep+DUR.blend)` và `:157` `optionEnabledByState.unfolding.alpha === TOUCH.alphaDisabled` (2 vế cùng module ⇒ luôn xanh, không phải neo DS); `view-b3a-timing.test.ts:288-303` chỉ grep chuỗi `timerOn` trong source — lint giả test behaviour |
[3b-stress] | A2 | FAIL | `view-b3a-geometry.test.ts:1` tự xưng "THỜI GIAN + TOKEN MÀU" ⇒ file tên geometry nhưng test timing/theme; `PlayScene.ts` ôm cả input gate + save commit + rect registry (463 dòng) |
[3b-stress] | A6 | FAIL | `PlayScene.ts:434 natural()` trùng `shown()`; `session.teach` dùng 1 chỗ; `Hook` type không cần |
[3b-stress] | A9 | FAIL | `hook()` copy nguyên khối ở `PlayScene.ts:458` và `TitleScene.ts:49`; 8 lỗ bị cắt ở 2 nơi khác nhau (`SheetView.ts:80`, `OptionCard.ts:41`) |
[3b-stress] | A12 | FAIL | `PlayScene.ts:163 void this.adUndoNow()` — Promise bị bỏ, rejection không ai bắt (đo được 1 unhandled rejection ở S1c) |
[3b-stress] | A14 | FAIL | contract test chạm chi tiết nội bộ (đọc source bằng `readFileSync`, đếm số file, regex chuỗi) ⇒ refactor hợp lệ vẫn đỏ |
[3b-stress] | A15 | FAIL | thêm 1 RenderPhase phải sửa ≥4 file (`unfoldPlan` bảng + `PlayScene` RENDER_BY_PHASE + HOOKS + 2 file test regex) |

LUẬT: chỉ sửa `game/src/**` + `game/tests/**` · KHÔNG đổi hợp đồng hàm công khai · KHÔNG đọc lan man (môi trường + hợp đồng đã ở system prompt) · KHÔNG commit/push · chạy `npm run gate` ĐÚNG 1 LẦN ở cuối rồi dán output thật.
THANG ƯU TIÊN khi sắp hết lượt: (1) typecheck XANH → (2) test XANH → (3) báo cáo ngắn.
BÁO CÁO: mỗi mục → file:dòng + 1 câu cách sửa · output gate · việc không làm được.
