# HOÀN TẤT BUGFIX HOẠT CẢNH (vòng nối tiếp — phiên trước HẾT LƯỢT giữa đường, KHÔNG phải lỗi của bạn)

## Trạng thái hiện tại (đã kiểm, không cần điều tra lại)
Phiên trước (91 lượt) đã làm phần lớn và để lại:
- **File mới**: `src/ui/motion.ts` (có `__pcMotion`), `src/render/anim/foldShape.ts`, `src/render/components/FoldPaper.ts`
- **File sửa**: `src/render/anim/unfoldPlan.ts`, `src/render/layoutTable.ts`, `src/render/layout.ts`, `src/render/components/SheetView.ts`, `src/logic/cutGeometry.ts`, `src/logic/foldGeometry.ts`, `src/logic/foldRules.ts`, `tests/logic/layout.test.ts`
- **Nó đang sửa dở `SheetView.ts`** khi hết lượt (10 tool call cuối đều là SheetView).
- `npx vitest run tests/logic/layout.test.ts` → **45/45 xanh** (bảng số ổn).
- `tsc --noEmit` → **ĐANG LỖI**, lỗi đầu tiên:
  `src/logic/foldGeometry.ts(84,24): error TS2769 … Type 'readonly number[]' is not assignable to the mutable type 'number[]'`
  (kiểu `Tracked` có `crossed: readonly number[]` bị nối vào mảng kiểu `{ affine; crossed: number[] }`).

## Việc phải làm (theo thứ tự)
1. **Làm cho `npm run gate` XANH**: sửa các lỗi typecheck (bắt đầu từ `foldGeometry.ts:84`; nếu phải đổi kiểu thì đổi `readonly number[]` cho NHẤT QUÁN cả chuỗi, đừng cast `as any`/`@ts-ignore`). Giữ toàn bộ 45 case layout xanh + các test khác xanh.
2. **Chốt hoạt cảnh cho chạy được tới cuối**: 
   - Vào màn: **gấp giấy vào rồi lỗ đục hiện ra** (như `drawFoldPunch(tf, tp)` của MVP `/data/shared-board-agent-waves/game-gap-giay/prototype/gap-playtest.html`).
   - Trả lời: **mở bung từng lớp** theo `unfoldPlan` (head 140ms, so le 110ms) rồi `popHoles` (60ms/250ms) hoặc `explain` khi sai (như MVP `animateUnfold`, tổng ~900ms + 250ms/nếp).
   - KHÔNG đổi bảng số trong `unfoldPlan`/`layoutTable` (số đã đúng và đang được test khoá).
3. **Cửa QA `__pcMotion` phải chạy thật**: mỗi khung hình cập nhật `window.__pcMotion = { phase, foldProgress, layerScales: number[], holeCount }`; **chỉ tồn tại ở kênh dev/standalone** (kênh nộp vẫn 0 debug surface — `check-bundle` phải PASS).
4. Chạy và dán output THẬT: `npm run gate` · `bash scripts/build-channels.sh` · `node tools/check-bundle.mjs build/ytgame --channel ytgame` + `build/playgama` + `dist`.

## Luật phiên
- Sửa được: `src/**`, `tests/**`, `tools/**`, `index.html`. CẤM `specs/**`, `harness/**`, commit/push, browser/Playwright.
- **Ưu tiên hết lượt**: nếu sắp hết lượt, DỪNG ở mốc `npm run gate` xanh + ghi rõ còn việc gì (đừng bỏ dở file đang viết).
- Báo cáo: file:dòng cho từng việc · output 4 lệnh · việc chưa xong.
