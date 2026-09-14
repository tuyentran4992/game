Bạn là dev Phaser 3 + TypeScript. **HOÀN TẤT 4 SCENE CÒN DỞ** của batch B3b. Bước code trước hết lượt nên 4 file chỉ còn `// placeholder`.

## Hiện trạng (đo thật)
- `src/render/scenes/` : `MapScene.ts` 336 dòng · `PlayScene.ts` 480 · `TitleScene.ts` 135 · `BootScene.ts` 60 — **đã xong**.
- **`ShopScene.ts` · `ScoreScene.ts` · `EndScene.ts` · `AlbumScene.ts` = 1 dòng `// placeholder`** ⇒ `src/main.ts:35-41` import 4 file này nên `tsc` báo **TS2306 "is not a module"**.
- View-model đã có: `src/render/viewmodel/{mapModel,gridModel,albumModel}.ts` (đọc để biết hợp đồng).

## VIỆC (làm ĐỦ, không được rút gọn)
1. Hiện thực **4 scene** theo: gói ngữ cảnh B3b (system prompt) + test đã viết trong `game/tests/**` (test là HỢP ĐỒNG — đọc để biết tên hàm/field/testid phải có) + `specs/1-paper-crease/DESIGN-SPEC.md` mục Shop/Album/End (Shop: lưới 2×4 skin 260×300, giá Mực, dấu ✓ đã mua, viền `color.primary` cho skin đang dùng; Album: lưới 4 cột mẫu 200×200, chưa mở = silhouette xám + hàng huy hiệu ⌀96; Score: sao + interstitial CHỈ trong callback sau tween sao (PC-14); End: end screen + mở Master).
2. Mỗi scene: dùng **`data-testid`** đúng theo gói + **i18n** cho mọi text (không hardcode chuỗi hiển thị) + **không tính lại nghiệp vụ** (đọc từ logic/view-model).
3. **CẤM XOÁ hoặc comment import trong `src/main.ts`** để né lỗi biên dịch — 4 scene phải trở thành **module thật** (có `export`) và được đăng ký như các scene khác.
4. Mỗi file ≤ **350 dòng**; nếu vượt thì tách phần view thuần ra `src/render/viewmodel/`.
5. Khối 6 dòng trùng lặp giữa các file là **vi phạm cổng** ⇒ gom phần chung (helper/khung) chứ đừng copy.

## RÀNG BUỘC
- Chỉ `game/src/**`, `game/tests/**`. KHÔNG sửa `harness/`, `specs/`, `tools/gate-smell.mjs`; KHÔNG commit/push.
- **CẤM mở browser/Playwright/CDP/`vite preview`/`npm run dev`** — chỉ kiểm bằng code (đọc, grep, `vitest`).
- Chạy `npm run gate` **1 lần ở cuối**; phải: typecheck sạch + test xanh + gate-smell 0 vi phạm THẬT (mục "NỢ ĐÃ KHAI" bỏ qua được).
- Sắp hết lượt ⇒ (1) typecheck xanh → (2) test xanh → (3) báo cáo.
BÁO CÁO: 4 file scene → số dòng + testid đã dùng · output `npm run gate` · việc không làm được.
