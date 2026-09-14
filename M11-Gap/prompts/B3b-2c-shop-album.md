Bạn là dev Phaser 3 + TypeScript. **VIỆC: `ShopScene.ts` + `AlbumScene.ts`** (+ component skin nếu test đòi).

## BỐI CẢNH (đọc trước, đừng đoán)
- Gói ngữ cảnh B3b nằm trong system prompt (mục §3 có số đo + testid của từng scene; §5 là 14 testid; §4 là nhịp animation).
- **Test là HỢP ĐỒNG** và chúng **QUÉT NGUỒN** (đọc file bằng `node:fs`, không mở browser): `game/tests/logic/view-b3b-contract.test.ts` và `game/tests/logic/view-b3b-states.test.ts`. ĐỌC 2 FILE NÀY TRƯỚC để biết chính xác chuỗi/testid/số đo mà test đòi.
- Lệnh kiểm nhanh (chạy nhiều lần tuỳ ý, KHÔNG cần mở browser):
  `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/logic/view-b3b-contract.test.ts tests/logic/view-b3b-states.test.ts`
- **CẤM mở browser/Playwright/CDP/`vite preview`/`npm run dev`.**
- **CẤM sửa**: `src/main.ts` (đã đăng ký sẵn 8 scene), các scene của B3a (`BootScene`, `TitleScene`, `PlayScene`), `src/logic/**`, `harness/**`, `specs/**`, `tools/gate-smell.mjs`.
- Mỗi file ≤ **350 dòng**; khối 6 dòng trùng lặp giữa file là vi phạm cổng ⇒ gom phần chung.
- Mọi text hiển thị qua **i18n** (không chuỗi trần) trừ khi test yêu cầu chuỗi cụ thể; mọi nút đăng ký `data-testid` + rect qua cửa hook của B3a (theo test đòi).
- KHÔNG tự cộng/trừ sao, Mực, hay tự cấp album/badge — đọc từ logic qua **session**.

## PHẠM VI FILE
- Tạo/hoàn tất: `src/render/scenes/ShopScene.ts` (đang là `// placeholder`) · `src/render/scenes/AlbumScene.ts` (đang là `// placeholder`) · component skin nếu hợp đồng test yêu cầu (kiểm tên chính xác trong pack §2/§3 và trong test).
- Shop: lưới **2×4** card **260×300** (`testid-shop-skin-{i}`) + preview hoạ tiết giấy + **giá Mực** (`testid-shop-price`); đã mua = ✓; đang dùng = viền `color.primary` 4px; **không đủ Mực ⇒ nút disabled, bấm KHÔNG trừ tiền** (TC-INC-02); giá là **DỮ LIỆU** (đọc từ economy, cấm hardcode).
- Album: lưới **4 cột** ô **200×200** (`testid-album-item-{i}`), chưa mở = silhouette xám; hàng huy hiệu **⌀96** ≤6 (`testid-badge-{i}`); **trần album 14 / badge 6 là CAPS của logic** — view không tự cấp.
## XONG KHI
`npx vitest run tests/logic/view-b3b-contract.test.ts tests/logic/view-b3b-states.test.ts` **xanh** (hoặc chỉ còn đỏ ở phần của nhóm kia — ghi rõ), và `npx tsc --noEmit` sạch.
BÁO CÁO: file:dòng · testid đã đăng ký · output vitest + tsc · việc không làm được.
