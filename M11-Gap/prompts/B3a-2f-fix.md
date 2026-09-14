Bạn là dev Phaser 3 + TypeScript. **VÒNG SỬA B3a** — 4 nhóm việc, theo thứ tự. Luật phiên + gói ngữ cảnh đã ở system prompt.

## F1 (LỖI NGƯỜI CHƠI THẤY — ưu tiên 1): ô đáp án bị CẮT LỖ ⇒ đề mơ hồ
Bằng chứng đo được (review code, không cần browser):
- `PlayScene.ts:175` truyền ĐỦ lỗ cho ô nhưng **`OptionCard.ts:41` chỉ vẽ 8 vòng tròn**, lỗ thứ 9+ bị `:52-61` **âm thầm bỏ** ⇒ **31/120 màn có ≥2 ô TRÙNG HÌNH** sau khi vẽ (PC-03/PC-04 vỡ ở tầng vẽ).
- Và **59/120 màn có `answerHoles` > `MAX_HOLES=8`** (tối đa 36 điểm) ⇒ `SheetView` không hiển thị nổi.
YÊU CẦU:
- Vẽ **TOÀN BỘ** lỗ của một ô (không cắt, không bỏ im lặng); cỡ lỗ **co giãn** theo số lỗ để vẫn nhìn được (bán kính theo hàm của số lỗ + kích thước ô, có const tên rõ).
- `MAX_HOLES` phải **suy từ trần thật** (`2^số nếp` — dùng `layerCount`/nguồn sẵn có), không hardcode 8.
- **Test bắt buộc (thuần code, KHÔNG browser)**: với **cả 120 màn** (bảng chương thật) — sinh đề rồi mô phỏng phép vẽ ở tầng dữ liệu (view-model): chứng minh **4 ô không có 2 ô nào trùng tập điểm sau chuẩn hoá** và mọi lỗ của mọi ô đều được vẽ (đếm khớp số lỗ thật). Nếu phép vẽ là hàm thuần trong `src/render` thì test trực tiếp hàm đó.

## F2: test RỖNG + rác (review C2/C10)
- `tests/logic/scene-boot.test.ts:22-27` ("probe host shape") **không có assert nào**; `:45` `expect(true).toBe(true)`; `console.log` ×4 ở `:26,39,41,43`.
- Sửa: bỏ test rỗng (hoặc làm cho nó assert thật), xoá `expect(true)`, **xoá hết `console.log`** trong test. Header `view-b3a-timing.test.ts:47-48` hứa "đo bằng runtime" nhưng không đo ⇒ hoặc đo thật (bằng code) hoặc sửa header cho đúng.

## F3: tách file theo trần dòng (cổng máy mới quét CẢ `src/render` + `src/platform`)
- `src/render/scenes/PlayScene.ts` = **477 dòng** > trần 350 ⇒ tách (ví dụ: `playView.ts` cho layout/HUD, `playFx.ts` cho hiệu ứng; scene chỉ điều phối).
- Trần hiện hành: `src/logic` 250 · `src/render` 350 · `src/platform` 250. **Cấm thêm nợ mới vào `tools/gate-allow.json`.**

## F4: khối 6 DÒNG TRÙNG (cổng máy báo 18 chỗ)
- `src/render/components/OptionCard.ts:3 ↔ src/render/components/SheetView.ts:4`
- `src/platform/index.ts:71-72 ↔ src/platform/sdkAdapter.ts:15-16`
- `src/platform/playgamaAdapter.ts:7-17 ↔ src/platform/ytgameAdapter.ts:4-14` (**11 khối liên tiếp** — boilerplate copy) và `:108 ↔ :106`
Sửa bằng cách **gom phần chung thành 1 nguồn** (helper/khung dùng lại), không copy-paste.

## RÀNG BUỘC
- Chỉ `game/src/**`, `game/tests/**`, `game/package.json` (nếu cần gộp test dir). KHÔNG sửa `harness/`, `specs/`, `tools/gate-smell.mjs`, KHÔNG commit/push.
- **CẤM mở browser / Playwright / CDP / vite preview / npm run dev** — chỉ kiểm ở tầng code (đọc, grep, vitest, script node/python trong /tmp).
- Chạy `npm run gate` **đúng 1 lần** ở cuối (phải PASS: 0 vi phạm gate-smell). Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) gate PASS → (4) báo cáo.

BÁO CÁO: mỗi mục F1..F4 → file:dòng + 1 câu · số đo test mới (120 màn) · output `npm run gate` · việc không làm được.
