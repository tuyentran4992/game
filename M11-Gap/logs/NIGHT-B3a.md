# NIGHT — batch B3a (Phaser render: Boot/Title/Play + animate mở bung)

- **Test: 557/557 xanh (36 file)** — đã vá hẹp xong 2 test đỏ (`scene-boot.test.ts`) và 2 test rỗng.
- **Cổng máy**: chỉ còn 2 vi phạm ĐỘ DÀI FILE (đã khai báo nợ công khai trong `tools/gate-allow.json`):
  - `src/render/scenes/PlayScene.ts` 477 dòng > trần 350 → cần tách `playView.ts`/`playFx.ts`
  - `src/platform/sdkAdapter.ts` 251 dòng > trần 250 (vượt đúng 1 dòng)
- **Mục review code còn treo**: C1 (đã xử: test xanh), C2 (2 test xanh rỗng — đã xử trong vòng vá hẹp).
- **Thời gian batch**: 02:38 → 07:23 (~4h45') — dài hơn dự kiến; nguyên nhân gồm **2 lỗi vận hành của Hermes** (cho reviewer lái browser ~30-40'; tự-kill mất 1 phiên sửa 15') đã ghi vào skill.
- **Bài học**: batch render đắt gấp ~2× batch logic (test phải dựng view-model + hợp đồng `data-testid`); lần sau tách "view-model thuần" và "scene Phaser" thành 2 batch riêng.
